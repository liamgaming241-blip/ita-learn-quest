
-- 1. Canonical email helper
CREATE OR REPLACE FUNCTION public.canonical_email(_email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  e text;
  local_part text;
  domain_part text;
  at_pos int;
BEGIN
  IF _email IS NULL THEN RETURN NULL; END IF;
  -- lowercase, trim, strip zero-width / control chars
  e := lower(trim(_email));
  e := regexp_replace(e, '[\u0000-\u001f\u007f\u200b-\u200f\ufeff]', '', 'g');
  at_pos := position('@' in e);
  IF at_pos = 0 THEN RETURN e; END IF;
  local_part := substring(e from 1 for at_pos - 1);
  domain_part := substring(e from at_pos + 1);
  -- strip +tag on all providers
  local_part := split_part(local_part, '+', 1);
  -- gmail/googlemail: remove dots, canonicalize domain
  IF domain_part IN ('gmail.com', 'googlemail.com') THEN
    local_part := replace(local_part, '.', '');
    domain_part := 'gmail.com';
  END IF;
  RETURN local_part || '@' || domain_part;
END $$;

-- 2. Add canonical_email column to licenses
ALTER TABLE public.licenses ADD COLUMN IF NOT EXISTS canonical_email text;
UPDATE public.licenses SET canonical_email = public.canonical_email(email) WHERE canonical_email IS NULL;
CREATE INDEX IF NOT EXISTS licenses_canonical_email_idx ON public.licenses (canonical_email);

-- 3. Update normalize trigger to also fill canonical_email
CREATE OR REPLACE FUNCTION public.normalize_license_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
    NEW.canonical_email := public.canonical_email(NEW.email);
  END IF;
  RETURN NEW;
END $$;

-- 4. Aliases table
CREATE TABLE IF NOT EXISTS public.license_email_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  email text NOT NULL,
  canonical_email text NOT NULL,
  added_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (canonical_email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.license_email_aliases TO authenticated;
GRANT ALL ON public.license_email_aliases TO service_role;
ALTER TABLE public.license_email_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage aliases"
  ON public.license_email_aliases FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "owners read own aliases"
  ON public.license_email_aliases FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.licenses l
      WHERE l.id = license_email_aliases.license_id
        AND l.canonical_email = public.canonical_email((auth.jwt() ->> 'email'))
    )
  );

CREATE INDEX IF NOT EXISTS license_email_aliases_license_idx ON public.license_email_aliases (license_id);

-- Normalize trigger for aliases
CREATE OR REPLACE FUNCTION public.normalize_license_alias_email()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    NEW.email := lower(trim(NEW.email));
    NEW.canonical_email := public.canonical_email(NEW.email);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_normalize_alias_email ON public.license_email_aliases;
CREATE TRIGGER trg_normalize_alias_email BEFORE INSERT OR UPDATE ON public.license_email_aliases
  FOR EACH ROW EXECUTE FUNCTION public.normalize_license_alias_email();

REVOKE EXECUTE ON FUNCTION public.normalize_license_alias_email() FROM PUBLIC, anon, authenticated;

-- 5. Update email_has_active_license to use canonical + aliases
CREATE OR REPLACE FUNCTION public.email_has_active_license(_email text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.licenses l
    WHERE l.status = 'active'
      AND (
        l.canonical_email = public.canonical_email(_email)
        OR EXISTS (
          SELECT 1 FROM public.license_email_aliases a
          WHERE a.license_id = l.id AND a.canonical_email = public.canonical_email(_email)
        )
      )
  );
$$;

-- 6. Update has_active_subscription similarly
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.licenses l
    JOIN auth.users u ON (
      l.canonical_email = public.canonical_email(u.email)
      OR EXISTS (SELECT 1 FROM public.license_email_aliases a WHERE a.license_id = l.id AND a.canonical_email = public.canonical_email(u.email))
    )
    WHERE u.id = _user_id
      AND l.status = 'active'
      AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions s
        WHERE s.license_id = l.id
          AND s.status <> 'active'
          AND (s.current_period_end IS NOT NULL AND s.current_period_end <= now())
      )
  );
$$;

-- 7. Update get_my_access to use canonical + aliases
CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower((auth.jwt() ->> 'email'));
  _canon text := public.canonical_email(_email);
  _is_admin boolean;
  _license public.licenses%ROWTYPE;
  _sub public.subscriptions%ROWTYPE;
  _has_access boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('authenticated', false); END IF;
  _is_admin := public.has_role(_uid, 'admin');

  SELECT l.* INTO _license FROM public.licenses l
  WHERE l.canonical_email = _canon
     OR EXISTS (SELECT 1 FROM public.license_email_aliases a WHERE a.license_id = l.id AND a.canonical_email = _canon)
  LIMIT 1;

  IF _license.id IS NOT NULL THEN
    SELECT * INTO _sub FROM public.subscriptions WHERE license_id = _license.id ORDER BY created_at DESC LIMIT 1;
  END IF;

  _has_access := _is_admin OR (
    _license.id IS NOT NULL
    AND _license.status = 'active'
    AND (_sub.id IS NULL OR _sub.status = 'active' OR _sub.current_period_end IS NULL OR _sub.current_period_end > now())
  );
  RETURN jsonb_build_object(
    'authenticated', true,
    'is_admin', _is_admin,
    'has_access', _has_access,
    'license_status', _license.status,
    'subscription_status', _sub.status,
    'current_period_end', _sub.current_period_end
  );
END $$;

-- 8. Update admin_lookup_access
CREATE OR REPLACE FUNCTION public.admin_lookup_access(_email text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _norm text := lower(trim(_email));
  _canon text := public.canonical_email(_email);
  _user_id uuid;
  _role text;
  _license public.licenses%ROWTYPE;
  _sub public.subscriptions%ROWTYPE;
  _aliases jsonb;
  _has_access boolean;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT u.id INTO _user_id FROM auth.users u
    WHERE public.canonical_email(u.email) = _canon LIMIT 1;

  IF _user_id IS NOT NULL THEN
    SELECT role::text INTO _role FROM public.user_roles WHERE user_id = _user_id ORDER BY role LIMIT 1;
  END IF;

  SELECT l.* INTO _license FROM public.licenses l
    WHERE l.canonical_email = _canon
       OR EXISTS (SELECT 1 FROM public.license_email_aliases a WHERE a.license_id = l.id AND a.canonical_email = _canon)
    LIMIT 1;

  IF _license.id IS NOT NULL THEN
    SELECT * INTO _sub FROM public.subscriptions WHERE license_id = _license.id ORDER BY created_at DESC LIMIT 1;
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', a.id, 'email', a.email, 'canonical_email', a.canonical_email)), '[]'::jsonb)
      INTO _aliases FROM public.license_email_aliases a WHERE a.license_id = _license.id;
  ELSE
    _aliases := '[]'::jsonb;
  END IF;

  _has_access := (_role = 'admin') OR (
    _license.id IS NOT NULL AND _license.status = 'active'
    AND (_sub.id IS NULL OR _sub.status = 'active' OR _sub.current_period_end IS NULL OR _sub.current_period_end > now())
  );

  RETURN jsonb_build_object(
    'email', _norm,
    'canonical_email', _canon,
    'account_exists', _user_id IS NOT NULL,
    'user_id', _user_id,
    'role', _role,
    'license', to_jsonb(_license),
    'subscription', to_jsonb(_sub),
    'aliases', _aliases,
    'has_access', _has_access
  );
END $$;

-- 9. Admin RPC to add alias
CREATE OR REPLACE FUNCTION public.admin_add_license_alias(_license_id uuid, _email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _id uuid;
BEGIN
  IF _caller IS NULL OR NOT public.has_role(_caller, 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  INSERT INTO public.license_email_aliases (license_id, email, canonical_email, added_by)
  VALUES (_license_id, lower(trim(_email)), public.canonical_email(_email), _caller)
  ON CONFLICT (canonical_email) DO UPDATE SET license_id = EXCLUDED.license_id
  RETURNING id INTO _id;
  RETURN _id;
END $$;

REVOKE EXECUTE ON FUNCTION public.canonical_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.canonical_email(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_add_license_alias(uuid, text) TO authenticated;
