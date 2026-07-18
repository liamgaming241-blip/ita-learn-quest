
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.licenses l
    JOIN auth.users u ON lower(u.email) = lower(l.email)
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

CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower((auth.jwt() ->> 'email'));
  _is_admin boolean;
  _license public.licenses%ROWTYPE;
  _sub public.subscriptions%ROWTYPE;
  _has_access boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('authenticated', false); END IF;
  _is_admin := public.has_role(_uid, 'admin');
  SELECT * INTO _license FROM public.licenses WHERE lower(email) = _email LIMIT 1;
  SELECT * INTO _sub FROM public.subscriptions WHERE license_id = _license.id ORDER BY created_at DESC LIMIT 1;
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
