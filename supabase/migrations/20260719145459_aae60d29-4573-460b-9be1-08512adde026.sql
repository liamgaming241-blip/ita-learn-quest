
-- 1) Normalize email on licenses insert/update
CREATE OR REPLACE FUNCTION public.normalize_license_email()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_license_email ON public.licenses;
CREATE TRIGGER trg_normalize_license_email
BEFORE INSERT OR UPDATE ON public.licenses
FOR EACH ROW EXECUTE FUNCTION public.normalize_license_email();

-- Normalize existing rows
UPDATE public.licenses SET email = lower(trim(email)) WHERE email <> lower(trim(email));

-- 2) Admin diagnostics RPC: look up any email's access state
CREATE OR REPLACE FUNCTION public.admin_lookup_access(_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _norm text := lower(trim(_email));
  _user_id uuid;
  _role text;
  _license public.licenses%ROWTYPE;
  _sub public.subscriptions%ROWTYPE;
  _has_access boolean;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT u.id INTO _user_id FROM auth.users u WHERE lower(u.email) = _norm LIMIT 1;

  IF _user_id IS NOT NULL THEN
    SELECT role::text INTO _role FROM public.user_roles WHERE user_id = _user_id ORDER BY role LIMIT 1;
  END IF;

  SELECT * INTO _license FROM public.licenses WHERE email = _norm LIMIT 1;
  IF _license.id IS NOT NULL THEN
    SELECT * INTO _sub FROM public.subscriptions WHERE license_id = _license.id ORDER BY created_at DESC LIMIT 1;
  END IF;

  _has_access := (_role = 'admin') OR (
    _license.id IS NOT NULL AND _license.status = 'active'
    AND (_sub.id IS NULL OR _sub.status = 'active' OR _sub.current_period_end IS NULL OR _sub.current_period_end > now())
  );

  RETURN jsonb_build_object(
    'email', _norm,
    'account_exists', _user_id IS NOT NULL,
    'user_id', _user_id,
    'role', _role,
    'license', to_jsonb(_license),
    'subscription', to_jsonb(_sub),
    'has_access', _has_access
  );
END $$;

REVOKE ALL ON FUNCTION public.admin_lookup_access(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_lookup_access(text) TO authenticated;

-- 3) Bulk license grant RPC (admin-only)
CREATE OR REPLACE FUNCTION public.admin_grant_licenses(_emails text[], _product_code text DEFAULT 'VANGUARD_PREMIUM')
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _count int := 0;
  _e text;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  FOREACH _e IN ARRAY _emails LOOP
    IF _e IS NULL OR trim(_e) = '' THEN CONTINUE; END IF;
    INSERT INTO public.licenses (email, status, product_code)
    VALUES (lower(trim(_e)), 'active', _product_code)
    ON CONFLICT (email) DO UPDATE SET status = 'active', product_code = EXCLUDED.product_code;
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END $$;

REVOKE ALL ON FUNCTION public.admin_grant_licenses(text[], text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_licenses(text[], text) TO authenticated;
