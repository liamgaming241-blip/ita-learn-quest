
CREATE OR REPLACE FUNCTION public.link_signup_email_to_license(_signup_email text, _purchase_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _canon_purchase text := public.canonical_email(_purchase_email);
  _canon_signup text := public.canonical_email(_signup_email);
  _license_id uuid;
  _alias_id uuid;
BEGIN
  IF _canon_signup = _canon_purchase THEN RETURN NULL; END IF;
  SELECT l.id INTO _license_id FROM public.licenses l
    WHERE l.canonical_email = _canon_purchase
       OR EXISTS (SELECT 1 FROM public.license_email_aliases a WHERE a.license_id = l.id AND a.canonical_email = _canon_purchase)
    LIMIT 1;
  IF _license_id IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.license_email_aliases (license_id, email, canonical_email)
  VALUES (_license_id, lower(trim(_signup_email)), _canon_signup)
  ON CONFLICT (canonical_email) DO UPDATE SET license_id = EXCLUDED.license_id
  RETURNING id INTO _alias_id;
  RETURN _alias_id;
END $$;

REVOKE EXECUTE ON FUNCTION public.link_signup_email_to_license(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.link_signup_email_to_license(text, text) TO service_role;
