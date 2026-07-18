
-- Drop old per-user content policies first
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname='public' AND tablename IN ('subjects','topics','lessons','questions','summaries','transcriptions','indexing_jobs')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- Purge old content
TRUNCATE TABLE public.summaries, public.questions, public.transcriptions, public.lessons, public.topics, public.subjects, public.indexing_jobs RESTART IDENTITY CASCADE;

ALTER TABLE public.subjects DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.topics DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.lessons DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.questions DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.summaries DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.transcriptions DROP COLUMN IF EXISTS user_id;

-- Enums
DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','student'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.license_status AS ENUM ('active','inactive','refunded'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.subscription_status AS ENUM ('active','canceled','expired','past_due'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.plan_interval AS ENUM ('monthly','annual','lifetime'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.sync_run_status AS ENUM ('running','succeeded','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.queue_status AS ENUM ('pending','running','succeeded','failed','canceled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role); $$;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- plans
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text NOT NULL UNIQUE,
  name text NOT NULL,
  interval public.plan_interval NOT NULL DEFAULT 'monthly',
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plans TO authenticated, anon;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.plans FOR SELECT USING (is_active OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage plans" ON public.plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- licenses
CREATE TABLE IF NOT EXISTS public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  kwify_customer_id text,
  product_code text,
  status public.license_status NOT NULL DEFAULT 'inactive',
  affiliate_code text,
  coupon_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS licenses_email_idx ON public.licenses (lower(email));
GRANT SELECT ON public.licenses TO authenticated;
GRANT ALL ON public.licenses TO service_role;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own license" ON public.licenses FOR SELECT TO authenticated USING (lower(email) = lower((auth.jwt() ->> 'email')) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage licenses" ON public.licenses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  kwify_subscription_id text UNIQUE,
  status public.subscription_status NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  renewed_at timestamptz,
  canceled_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscriptions_license_idx ON public.subscriptions(license_id);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.licenses l WHERE l.id = license_id AND lower(l.email) = lower((auth.jwt() ->> 'email')))
  OR public.has_role(auth.uid(),'admin')
);
CREATE POLICY "Admins manage subscriptions" ON public.subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid REFERENCES public.licenses(id) ON DELETE SET NULL,
  kwify_order_id text UNIQUE,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'unknown',
  paid_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view payments" ON public.payments FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- access functions
CREATE OR REPLACE FUNCTION public.has_active_subscription(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.licenses l ON l.id = s.license_id
    JOIN auth.users u ON lower(u.email) = lower(l.email)
    WHERE u.id = _user_id
      AND l.status = 'active'
      AND s.status = 'active'
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_access()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text := lower((auth.jwt() ->> 'email'));
  _is_admin boolean;
  _license public.licenses%ROWTYPE;
  _sub public.subscriptions%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('authenticated', false); END IF;
  _is_admin := public.has_role(_uid, 'admin');
  SELECT * INTO _license FROM public.licenses WHERE lower(email) = _email LIMIT 1;
  SELECT * INTO _sub FROM public.subscriptions WHERE license_id = _license.id ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object(
    'authenticated', true,
    'is_admin', _is_admin,
    'has_access', (_is_admin OR public.has_active_subscription(_uid)),
    'license_status', _license.status,
    'subscription_status', _sub.status,
    'current_period_end', _sub.current_period_end
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.get_my_access() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_access() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.email_has_active_license(_email text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.licenses WHERE lower(email) = lower(_email) AND status = 'active'); $$;
REVOKE EXECUTE ON FUNCTION public.email_has_active_license(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_has_active_license(text) TO service_role;

-- app_settings
CREATE TABLE IF NOT EXISTS public.app_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  content_root_folder_id text,
  google_sheets_id text,
  last_sync_started_at timestamptz,
  last_sync_completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.app_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone auth can read settings" ON public.app_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.app_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- drive_files
CREATE TABLE IF NOT EXISTS public.drive_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id text NOT NULL UNIQUE,
  name text NOT NULL,
  mime_type text NOT NULL,
  parent_id text,
  path text,
  md5_checksum text,
  size bigint,
  modified_time timestamptz,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.drive_files TO authenticated;
GRANT ALL ON public.drive_files TO service_role;
ALTER TABLE public.drive_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view drive files" ON public.drive_files FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage drive files" ON public.drive_files FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- file_versions
CREATE TABLE IF NOT EXISTS public.file_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id text NOT NULL,
  previous_md5 text,
  previous_size bigint,
  previous_modified_time timestamptz,
  changed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.file_versions TO authenticated;
GRANT ALL ON public.file_versions TO service_role;
ALTER TABLE public.file_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view file versions" ON public.file_versions FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- sync_runs
CREATE TABLE IF NOT EXISTS public.sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger text NOT NULL DEFAULT 'manual',
  status public.sync_run_status NOT NULL DEFAULT 'running',
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  files_added integer NOT NULL DEFAULT 0,
  files_modified integer NOT NULL DEFAULT 0,
  files_removed integer NOT NULL DEFAULT 0,
  errors_count integer NOT NULL DEFAULT 0,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT ON public.sync_runs TO authenticated;
GRANT ALL ON public.sync_runs TO service_role;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view sync runs" ON public.sync_runs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- sync_logs
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_run_id uuid NOT NULL REFERENCES public.sync_runs(id) ON DELETE CASCADE,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  drive_file_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sync_logs_run_idx ON public.sync_logs(sync_run_id);
GRANT SELECT ON public.sync_logs TO authenticated;
GRANT ALL ON public.sync_logs TO service_role;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view sync logs" ON public.sync_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- processing_queue
CREATE TABLE IF NOT EXISTS public.processing_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_file_id text NOT NULL,
  job_type text NOT NULL,
  status public.queue_status NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS processing_queue_status_idx ON public.processing_queue(status, next_run_at);
GRANT SELECT ON public.processing_queue TO authenticated;
GRANT ALL ON public.processing_queue TO service_role;
ALTER TABLE public.processing_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view queue" ON public.processing_queue FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admins manage queue" ON public.processing_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Content: add link + policies
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS drive_file_uuid uuid REFERENCES public.drive_files(id) ON DELETE SET NULL;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['subjects','topics','lessons','questions','summaries','transcriptions'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "Subscribers and admins read %1$s" ON public.%1$I FOR SELECT TO authenticated USING (public.has_role(auth.uid(),''admin'') OR public.has_active_subscription(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "Admins write %1$s" ON public.%1$I FOR ALL TO authenticated USING (public.has_role(auth.uid(),''admin'')) WITH CHECK (public.has_role(auth.uid(),''admin''))', t);
  END LOOP;
END $$;

-- indexing_jobs: admin-only now (legacy retention)
CREATE POLICY "Admins view legacy indexing jobs" ON public.indexing_jobs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- Seed admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role FROM auth.users u
WHERE lower(u.email) = lower('pepeumeirelesnovais@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO public.licenses (email, status, product_code)
VALUES ('pepeumeirelesnovais@gmail.com', 'active', 'VANGUARD_PREMIUM')
ON CONFLICT (email) DO UPDATE SET status='active';

-- Update handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email))
  ON CONFLICT DO NOTHING;
  IF lower(NEW.email) = lower('pepeumeirelesnovais@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'student'::public.app_role FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
  AND lower(u.email) <> lower('pepeumeirelesnovais@gmail.com')
ON CONFLICT DO NOTHING;

INSERT INTO public.plans (product_code, name, interval, price_cents, currency, is_active)
VALUES ('VANGUARD_PREMIUM', 'Vanguard Premium', 'monthly', 0, 'BRL', true)
ON CONFLICT (product_code) DO NOTHING;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['plans','licenses','subscriptions','drive_files','processing_queue','app_settings'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;
