
-- Extend questions
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS institution text,
  ADD COLUMN IF NOT EXISTS year int,
  ADD COLUMN IF NOT EXISTS phase text,
  ADD COLUMN IF NOT EXISTS exam_code text,
  ADD COLUMN IF NOT EXISTS question_number int,
  ADD COLUMN IF NOT EXISTS estimated_time_seconds int,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS official_answer text,
  ADD COLUMN IF NOT EXISTS answer_key_url text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS import_batch_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS search_tsv tsvector;

CREATE OR REPLACE FUNCTION public.questions_tsv_refresh() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_tsv := to_tsvector('portuguese',
    coalesce(NEW.title,'') || ' ' ||
    coalesce(NEW.question_text,'') || ' ' ||
    coalesce(NEW.source,'') || ' ' ||
    coalesce(NEW.institution,'') || ' ' ||
    coalesce(array_to_string(NEW.tags,' '),'')
  );
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS questions_tsv_trg ON public.questions;
CREATE TRIGGER questions_tsv_trg BEFORE INSERT OR UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.questions_tsv_refresh();

UPDATE public.questions SET search_tsv = to_tsvector('portuguese',
  coalesce(title,'')||' '||coalesce(question_text,'')||' '||coalesce(source,'')||' '||coalesce(institution,'')||' '||coalesce(array_to_string(tags,' '),''));

CREATE INDEX IF NOT EXISTS questions_search_tsv_idx ON public.questions USING gin(search_tsv);
CREATE INDEX IF NOT EXISTS questions_institution_year_idx ON public.questions(institution, year);
CREATE INDEX IF NOT EXISTS questions_subject_idx ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS questions_topic_idx ON public.questions(topic_id);
CREATE INDEX IF NOT EXISTS questions_subtopic_idx ON public.questions(subtopic_id);
CREATE INDEX IF NOT EXISTS questions_tags_idx ON public.questions USING gin(tags);
CREATE INDEX IF NOT EXISTS questions_status_idx ON public.questions(status);

DROP TRIGGER IF EXISTS update_questions_updated_at ON public.questions;
CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Reset questions policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Questions viewable by everyone" ON public.questions;
  DROP POLICY IF EXISTS "Questions readable" ON public.questions;
  DROP POLICY IF EXISTS "Questions admin manage" ON public.questions;
  DROP POLICY IF EXISTS "Questions readable to subscribers and admins" ON public.questions;
  DROP POLICY IF EXISTS "Questions admin write" ON public.questions;
END $$;
CREATE POLICY "Questions readable to subscribers and admins" ON public.questions
  FOR SELECT TO authenticated
  USING (status='published' AND (public.has_role(auth.uid(),'admin') OR public.has_active_subscription(auth.uid())));
CREATE POLICY "Questions admin write" ON public.questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- question_attempts
CREATE TABLE IF NOT EXISTS public.question_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  selected_option text,
  is_correct boolean NOT NULL DEFAULT false,
  time_spent_seconds int NOT NULL DEFAULT 0,
  mode text NOT NULL DEFAULT 'learning',
  exam_session_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS question_attempts_user_idx ON public.question_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS question_attempts_question_idx ON public.question_attempts(question_id);
CREATE INDEX IF NOT EXISTS question_attempts_session_idx ON public.question_attempts(exam_session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_attempts TO authenticated;
GRANT ALL ON public.question_attempts TO service_role;
ALTER TABLE public.question_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own attempts read" ON public.question_attempts FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Own attempts insert" ON public.question_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Own attempts update" ON public.question_attempts FOR UPDATE TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Own attempts delete" ON public.question_attempts FOR DELETE TO authenticated USING (auth.uid()=user_id);

-- question_user_state
CREATE TABLE IF NOT EXISTS public.question_user_state (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started',
  is_favorite boolean NOT NULL DEFAULT false,
  is_bookmarked boolean NOT NULL DEFAULT false,
  mark_for_review boolean NOT NULL DEFAULT false,
  notes text,
  confidence smallint NOT NULL DEFAULT 0,
  attempts int NOT NULL DEFAULT 0,
  correct int NOT NULL DEFAULT 0,
  avg_time_seconds int NOT NULL DEFAULT 0,
  last_attempt_at timestamptz,
  next_review_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX IF NOT EXISTS qus_user_idx ON public.question_user_state(user_id);
CREATE INDEX IF NOT EXISTS qus_status_idx ON public.question_user_state(user_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_user_state TO authenticated;
GRANT ALL ON public.question_user_state TO service_role;
ALTER TABLE public.question_user_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own state all" ON public.question_user_state FOR ALL TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP TRIGGER IF EXISTS update_qus_updated_at ON public.question_user_state;
CREATE TRIGGER update_qus_updated_at BEFORE UPDATE ON public.question_user_state
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- question_reports
CREATE TABLE IF NOT EXISTS public.question_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_reports TO authenticated;
GRANT ALL ON public.question_reports TO service_role;
ALTER TABLE public.question_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports insert" ON public.question_reports FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "Reports read" ON public.question_reports FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Reports admin update" ON public.question_reports FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
DROP TRIGGER IF EXISTS update_reports_updated_at ON public.question_reports;
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON public.question_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- exam_sessions
CREATE TABLE IF NOT EXISTS public.exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution text,
  year int,
  phase text,
  mode text NOT NULL DEFAULT 'exam',
  status text NOT NULL DEFAULT 'in_progress',
  question_ids uuid[] NOT NULL DEFAULT '{}',
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  duration_seconds int,
  total int NOT NULL DEFAULT 0,
  correct int NOT NULL DEFAULT 0,
  score numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS exam_sessions_user_idx ON public.exam_sessions(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exam_sessions TO authenticated;
GRANT ALL ON public.exam_sessions TO service_role;
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own sessions all" ON public.exam_sessions FOR ALL TO authenticated
  USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
DROP TRIGGER IF EXISTS update_sessions_updated_at ON public.exam_sessions;
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON public.exam_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- question_tags
CREATE TABLE IF NOT EXISTS public.question_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.question_tags TO authenticated;
GRANT ALL ON public.question_tags TO service_role;
ALTER TABLE public.question_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tags readable" ON public.question_tags FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tags admin write" ON public.question_tags FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- RPCs
CREATE OR REPLACE FUNCTION public.record_question_attempt(
  _question_id uuid, _selected text, _time_spent int DEFAULT 0,
  _mode text DEFAULT 'learning', _exam_session_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid := auth.uid();
  _correct_option text; _is_correct boolean;
  _new_status text; _next_review timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT correct_option INTO _correct_option FROM public.questions WHERE id=_question_id;
  IF _correct_option IS NULL THEN RAISE EXCEPTION 'question not found'; END IF;
  _is_correct := (_selected IS NOT NULL AND lower(_selected)=lower(_correct_option));
  INSERT INTO public.question_attempts (user_id,question_id,selected_option,is_correct,time_spent_seconds,mode,exam_session_id)
  VALUES (_uid,_question_id,_selected,_is_correct,GREATEST(_time_spent,0),_mode,_exam_session_id);
  IF _is_correct THEN _new_status:='learning'; _next_review:=now()+interval '7 days';
  ELSE _new_status:='incorrect_recent'; _next_review:=now()+interval '1 day'; END IF;
  INSERT INTO public.question_user_state (user_id,question_id,status,attempts,correct,avg_time_seconds,last_attempt_at,next_review_at)
  VALUES (_uid,_question_id,_new_status,1,CASE WHEN _is_correct THEN 1 ELSE 0 END,GREATEST(_time_spent,0),now(),_next_review)
  ON CONFLICT (user_id,question_id) DO UPDATE SET
    status = CASE WHEN _is_correct AND public.question_user_state.correct+1 >= 2 THEN 'mastered' ELSE _new_status END,
    attempts = public.question_user_state.attempts+1,
    correct = public.question_user_state.correct + CASE WHEN _is_correct THEN 1 ELSE 0 END,
    avg_time_seconds = ((public.question_user_state.avg_time_seconds*public.question_user_state.attempts)+GREATEST(_time_spent,0))/(public.question_user_state.attempts+1),
    last_attempt_at = now(),
    next_review_at = _next_review;
  RETURN jsonb_build_object('is_correct',_is_correct,'correct_option',_correct_option,'status',_new_status);
END $$;

CREATE OR REPLACE FUNCTION public.toggle_question_flag(_question_id uuid, _flag text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _row public.question_user_state%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _flag NOT IN ('favorite','bookmark','review') THEN RAISE EXCEPTION 'invalid flag'; END IF;
  INSERT INTO public.question_user_state (user_id,question_id) VALUES (_uid,_question_id)
  ON CONFLICT DO NOTHING;
  IF _flag='favorite' THEN
    UPDATE public.question_user_state SET is_favorite=NOT is_favorite WHERE user_id=_uid AND question_id=_question_id RETURNING * INTO _row;
  ELSIF _flag='bookmark' THEN
    UPDATE public.question_user_state SET is_bookmarked=NOT is_bookmarked WHERE user_id=_uid AND question_id=_question_id RETURNING * INTO _row;
  ELSE
    UPDATE public.question_user_state SET mark_for_review=NOT mark_for_review WHERE user_id=_uid AND question_id=_question_id RETURNING * INTO _row;
  END IF;
  RETURN jsonb_build_object('is_favorite',_row.is_favorite,'is_bookmarked',_row.is_bookmarked,'mark_for_review',_row.mark_for_review);
END $$;

CREATE OR REPLACE FUNCTION public.start_exam_session(_institution text,_year int,_phase text DEFAULT NULL,_mode text DEFAULT 'exam')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid:=auth.uid(); _ids uuid[]; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT array_agg(id ORDER BY question_number NULLS LAST, created_at) INTO _ids
  FROM public.questions
  WHERE status='published' AND institution=_institution AND year=_year AND (_phase IS NULL OR phase=_phase);
  IF _ids IS NULL OR array_length(_ids,1)=0 THEN RAISE EXCEPTION 'no questions found'; END IF;
  INSERT INTO public.exam_sessions (user_id,institution,year,phase,mode,question_ids,total)
  VALUES (_uid,_institution,_year,_phase,_mode,_ids,array_length(_ids,1)) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.submit_exam_session(_session_id uuid, _answers jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid:=auth.uid(); _s public.exam_sessions%ROWTYPE; _qid uuid; _ans text; _co text; _nc int:=0; _tot int; _corr boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _s FROM public.exam_sessions WHERE id=_session_id AND user_id=_uid;
  IF _s.id IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;
  IF _s.status='submitted' THEN RETURN jsonb_build_object('already_submitted',true); END IF;
  _tot := array_length(_s.question_ids,1);
  FOREACH _qid IN ARRAY _s.question_ids LOOP
    _ans := _answers->>(_qid::text);
    SELECT correct_option INTO _co FROM public.questions WHERE id=_qid;
    _corr := (_ans IS NOT NULL AND _co IS NOT NULL AND lower(_ans)=lower(_co));
    IF _corr THEN _nc:=_nc+1; END IF;
    INSERT INTO public.question_attempts (user_id,question_id,selected_option,is_correct,time_spent_seconds,mode,exam_session_id)
    VALUES (_uid,_qid,_ans,_corr,0,'exam',_session_id);
  END LOOP;
  UPDATE public.exam_sessions SET status='submitted', submitted_at=now(),
    duration_seconds=EXTRACT(EPOCH FROM (now()-started_at))::int,
    answers=_answers, correct=_nc, total=_tot,
    score=CASE WHEN _tot>0 THEN (_nc::numeric/_tot)*100 ELSE 0 END
  WHERE id=_session_id;
  RETURN jsonb_build_object('correct',_nc,'total',_tot,'score',CASE WHEN _tot>0 THEN (_nc::numeric/_tot)*100 ELSE 0 END);
END $$;

CREATE OR REPLACE FUNCTION public.admin_import_questions(_rows jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _uid uuid:=auth.uid(); _batch uuid:=gen_random_uuid(); _row jsonb;
  _inserted int:=0; _updated int:=0; _failed int:=0; _errors jsonb:='[]'::jsonb;
  _subject_id uuid; _topic_id uuid; _subtopic_id uuid; _q_id uuid;
BEGIN
  IF _uid IS NULL OR NOT public.has_role(_uid,'admin') THEN RAISE EXCEPTION 'not authorized'; END IF;
  FOR _row IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    BEGIN
      _subject_id:=NULL; _topic_id:=NULL; _subtopic_id:=NULL;
      IF _row ? 'subject' AND coalesce(_row->>'subject','')<>'' THEN
        SELECT id INTO _subject_id FROM public.subjects WHERE lower(name)=lower(_row->>'subject') LIMIT 1;
        IF _subject_id IS NULL THEN INSERT INTO public.subjects (name) VALUES (_row->>'subject') RETURNING id INTO _subject_id; END IF;
      END IF;
      IF _row ? 'topic' AND coalesce(_row->>'topic','')<>'' AND _subject_id IS NOT NULL THEN
        SELECT id INTO _topic_id FROM public.topics WHERE subject_id=_subject_id AND lower(name)=lower(_row->>'topic') LIMIT 1;
        IF _topic_id IS NULL THEN INSERT INTO public.topics (subject_id,name) VALUES (_subject_id,_row->>'topic') RETURNING id INTO _topic_id; END IF;
      END IF;
      IF _row ? 'subtopic' AND coalesce(_row->>'subtopic','')<>'' AND _topic_id IS NOT NULL THEN
        SELECT id INTO _subtopic_id FROM public.subtopics WHERE topic_id=_topic_id AND lower(name)=lower(_row->>'subtopic') LIMIT 1;
        IF _subtopic_id IS NULL THEN INSERT INTO public.subtopics (topic_id,name) VALUES (_topic_id,_row->>'subtopic') RETURNING id INTO _subtopic_id; END IF;
      END IF;
      _q_id:=NULL;
      IF (_row->>'institution') IS NOT NULL AND (_row->>'year') IS NOT NULL AND (_row->>'question_number') IS NOT NULL THEN
        SELECT id INTO _q_id FROM public.questions
          WHERE institution=_row->>'institution'
            AND year=NULLIF(_row->>'year','')::int
            AND question_number=NULLIF(_row->>'question_number','')::int
          LIMIT 1;
      END IF;
      IF _q_id IS NULL THEN
        INSERT INTO public.questions (
          title,institution,year,phase,exam_code,question_number,
          subject_id,topic_id,subtopic_id,
          question_text,options,correct_option,official_answer,answer_key_url,
          explanation,difficulty,estimated_time_seconds,tags,source,
          images,attachments,status,import_batch_id
        ) VALUES (
          _row->>'title',_row->>'institution',NULLIF(_row->>'year','')::int,_row->>'phase',_row->>'exam_code',
          NULLIF(_row->>'question_number','')::int,
          _subject_id,_topic_id,_subtopic_id,
          COALESCE(_row->>'statement',_row->>'question_text'),
          COALESCE(_row->'alternatives',_row->'options','[]'::jsonb),
          _row->>'correct_answer',
          COALESCE(_row->>'official_answer',_row->>'correct_answer'),
          _row->>'answer_key_url',
          _row->>'explanation',
          COALESCE(_row->>'difficulty','medium'),
          NULLIF(_row->>'estimated_time_seconds','')::int,
          CASE WHEN _row ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(_row->'tags')) ELSE '{}'::text[] END,
          _row->>'source',
          COALESCE(_row->'images','[]'::jsonb),
          COALESCE(_row->'attachments','[]'::jsonb),
          COALESCE(_row->>'status','published'),
          _batch
        );
        _inserted:=_inserted+1;
      ELSE
        UPDATE public.questions SET
          title=COALESCE(_row->>'title',title),
          phase=COALESCE(_row->>'phase',phase),
          exam_code=COALESCE(_row->>'exam_code',exam_code),
          subject_id=COALESCE(_subject_id,subject_id),
          topic_id=COALESCE(_topic_id,topic_id),
          subtopic_id=COALESCE(_subtopic_id,subtopic_id),
          question_text=COALESCE(_row->>'statement',_row->>'question_text',question_text),
          options=COALESCE(_row->'alternatives',_row->'options',options),
          correct_option=COALESCE(_row->>'correct_answer',correct_option),
          official_answer=COALESCE(_row->>'official_answer',_row->>'correct_answer',official_answer),
          answer_key_url=COALESCE(_row->>'answer_key_url',answer_key_url),
          explanation=COALESCE(_row->>'explanation',explanation),
          difficulty=COALESCE(_row->>'difficulty',difficulty),
          estimated_time_seconds=COALESCE(NULLIF(_row->>'estimated_time_seconds','')::int,estimated_time_seconds),
          tags=CASE WHEN _row ? 'tags' THEN ARRAY(SELECT jsonb_array_elements_text(_row->'tags')) ELSE tags END,
          source=COALESCE(_row->>'source',source),
          images=COALESCE(_row->'images',images),
          attachments=COALESCE(_row->'attachments',attachments),
          status=COALESCE(_row->>'status',status),
          import_batch_id=_batch
        WHERE id=_q_id;
        _updated:=_updated+1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      _failed:=_failed+1;
      _errors := _errors || jsonb_build_object('error',SQLERRM);
    END;
  END LOOP;
  RETURN jsonb_build_object('batch_id',_batch,'inserted',_inserted,'updated',_updated,'failed',_failed,'errors',_errors);
END $$;

REVOKE ALL ON FUNCTION public.admin_import_questions(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_import_questions(jsonb) TO authenticated;
