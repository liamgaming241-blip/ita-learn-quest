
-- 1. subtopics table
CREATE TABLE public.subtopics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  slug text,
  drive_folder_id text UNIQUE,
  folder_path text,
  sort_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.subtopics TO authenticated;
GRANT ALL ON public.subtopics TO service_role;

ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subscribers and admins read subtopics" ON public.subtopics
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_active_subscription(auth.uid()));
CREATE POLICY "Admins write subtopics" ON public.subtopics
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_subtopics_updated_at BEFORE UPDATE ON public.subtopics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_subtopics_topic ON public.subtopics(topic_id);

-- 2. add subtopic_id to dependent tables
ALTER TABLE public.lessons ADD COLUMN subtopic_id uuid REFERENCES public.subtopics(id) ON DELETE CASCADE;
ALTER TABLE public.questions ADD COLUMN subtopic_id uuid REFERENCES public.subtopics(id) ON DELETE SET NULL;
ALTER TABLE public.weak_topics ADD COLUMN subtopic_id uuid REFERENCES public.subtopics(id) ON DELETE CASCADE;
ALTER TABLE public.user_progress ADD COLUMN subtopic_id uuid REFERENCES public.subtopics(id) ON DELETE CASCADE;

CREATE INDEX idx_lessons_subtopic ON public.lessons(subtopic_id);
CREATE INDEX idx_questions_subtopic ON public.questions(subtopic_id);

-- 3. backfill: for every topic that has lessons, create a "Geral" subtopic and reassign
DO $$
DECLARE
  t RECORD;
  new_id uuid;
BEGIN
  FOR t IN SELECT DISTINCT l.topic_id FROM public.lessons l WHERE l.topic_id IS NOT NULL LOOP
    INSERT INTO public.subtopics (topic_id, name, slug, sort_order)
    VALUES (t.topic_id, 'Geral', 'geral', 0)
    RETURNING id INTO new_id;
    UPDATE public.lessons SET subtopic_id = new_id WHERE topic_id = t.topic_id AND subtopic_id IS NULL;
    UPDATE public.questions SET subtopic_id = new_id WHERE topic_id = t.topic_id AND subtopic_id IS NULL;
    UPDATE public.weak_topics SET subtopic_id = new_id WHERE topic_id = t.topic_id AND subtopic_id IS NULL;
  END LOOP;
END $$;

-- 4. admin RPCs
CREATE OR REPLACE FUNCTION public.admin_create_subtopic(_topic_id uuid, _name text, _description text DEFAULT NULL, _sort_order int DEFAULT 0)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  INSERT INTO public.subtopics (topic_id, name, description, sort_order)
  VALUES (_topic_id, _name, _description, _sort_order)
  RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_subtopic(_id uuid, _name text, _description text DEFAULT NULL, _sort_order int DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  UPDATE public.subtopics SET
    name = COALESCE(_name, name),
    description = COALESCE(_description, description),
    sort_order = COALESCE(_sort_order, sort_order)
  WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_subtopic(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  DELETE FROM public.subtopics WHERE id = _id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_move_lesson(_lesson_id uuid, _subtopic_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _topic uuid;
BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  SELECT topic_id INTO _topic FROM public.subtopics WHERE id = _subtopic_id;
  UPDATE public.lessons SET subtopic_id = _subtopic_id, topic_id = COALESCE(_topic, topic_id) WHERE id = _lesson_id;
END $$;
