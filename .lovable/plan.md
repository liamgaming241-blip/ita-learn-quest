# Question Bank — full rollout

Turns the current `questions` table into a first-class practice hub inspired by Cosseno, tuned for ITA/IME with room for AFA, EsPCEx, EPCAR, ENEM, Fuvest, Unicamp.

Given the size, this ships in **4 phases**. Each phase is production-ready on its own; nothing is mocked.

## Phase 1 — Data model & security (migration)

Extend `questions` and add the supporting tables. All new tables get GRANTs + RLS + `updated_at` triggers.

- `questions` (extend): `title`, `institution` (enum-like text: ITA/IME/AFA/EsPCEx/EPCAR/ENEM/FUVEST/UNICAMP/OTHER), `year int`, `phase text`, `exam_code text`, `estimated_time_seconds int`, `tags text[]`, `source text`, `images jsonb`, `attachments jsonb`, `official_answer text`, `answer_key_url text`, `search_tsv tsvector` (generated) + GIN index, `status text default 'published'`, `import_batch_id uuid`. Keep existing `subject_id/topic_id/subtopic_id/difficulty/question_text/options/correct_option/explanation`.
- `question_attempts`: user_id, question_id, selected_option, is_correct, time_spent_seconds, mode (`learning`|`exam`), exam_session_id nullable, created_at. Unique index on (user_id, question_id, created_at).
- `question_user_state`: user_id, question_id, status (`not_started`|`learning`|`review`|`mastered`|`incorrect_recent`), is_favorite bool, is_bookmarked bool, notes text, confidence smallint, attempts int, correct int, avg_time_seconds int, last_attempt_at, updated_at. PK (user_id, question_id).
- `question_reports`: user_id, question_id, reason text, details text, status (`open`|`resolved`), created_at.
- `exam_sessions`: user_id, institution, year, phase nullable, mode (`exam`|`learning`), status (`in_progress`|`submitted`|`abandoned`), started_at, submitted_at, duration_seconds, score numeric, total int, correct int, question_ids uuid[], answers jsonb (question_id → {option, time}), created_at.
- `question_tags` (optional catalog): name unique, slug, created_by.
- RPCs (SECURITY DEFINER, admin-gated where relevant):
  - `record_question_attempt(_question_id, _selected, _time_spent, _mode, _exam_session_id)` — writes attempt, upserts `question_user_state`, updates streak stats.
  - `toggle_question_flag(_question_id, _flag)` — favorite / bookmark.
  - `start_exam_session(_institution, _year, _phase, _mode)` and `submit_exam_session(_id, _answers)`.
  - `admin_import_questions(_rows jsonb)` — bulk upsert with auto-classification hooks; returns per-row status.

## Phase 2 — Admin importer & content ops

New Admin tab **"Banco de Questões"**:

- Importer: paste JSON / upload CSV / upload XLSX (`xlsx` lib on client, parsed to normalized JSON, then `admin_import_questions`). Column mapping UI, dry-run preview, dedupe by `(institution, year, phase, number)` or hash of statement.
- Editor: search, filter, inline edit statement/alternatives/explanation/tags, upload images to a new `question-assets` public storage bucket, merge duplicates, bulk delete/tag/publish.
- Reports queue: list `question_reports`, mark resolved.
- PDF ingestion is scaffolded (upload → stored in bucket → placeholder task row) but full OCR is out of scope for this phase; the shape is ready for a future edge function.

## Phase 3 — Solving experience (student side)

Replaces the current single-flow `/questions` page with a real hub:

```
/questions                → filters + list + stats sidebar
/questions/solve          → distraction-free solver (learning or exam mode)
/questions/exams          → past exams catalog (ITA 2024, IME 2023, …)
/questions/exams/:id      → exam intro + start/resume
/questions/history        → attempts & exam sessions history
```

Solver features:

- Large statement, KaTeX rendering (`react-katex`), zoomable images (`react-medium-image-zoom`), attachments panel.
- Keyboard shortcuts: 1–5 select, Enter confirm, N next, P prev, F favorite, B bookmark, M mark-for-review, R report, Esc exit fullscreen.
- Question navigator sidebar with status chips.
- Auto-save every answer via `record_question_attempt`.
- Learning mode: instant correction + explanation, common mistakes, related concepts, recommended lessons/questions.
- Exam mode: timer, no correction until submit, pause/resume via `exam_sessions.status`, full performance report on submit.
- Mobile-optimized layout with bottom action bar.

Advanced filters panel (combinable, URL-synced):

Institution, year, subject, topic, subtopic, difficulty, tags, status (favorites/bookmarks/answered/incorrect/correct/never), estimated time range, free-text keyword (uses `search_tsv`).

## Phase 4 — Analytics, recommendations, integrations

- Personal dashboard tab on `/questions`: accuracy by subject/topic/subtopic/year, average time, consistency (rolling 7d), weekly & monthly evolution, heatmap (calendar), weak/strong topics, streak, daily solved.
- Recommendation engine (SQL views + a light edge function `recommend-questions`):
  - Review queue (spaced repetition: due if `status='review'` and `last_attempt_at < now() - interval`).
  - Similar-to-mistakes (same subtopic + difficulty ≥ last-wrong).
  - Weak-subtopic drills.
  - Progressive difficulty ladder.
  - Daily practice list (10 questions mixing review + new).
- Cross-feature hooks:
  - Lesson viewer → "Praticar questões deste subtópico" button.
  - Weak Topics page → deep-link into filtered solver.
  - Simulados → reuse `exam_sessions` for consistency; old `simulados` table stays for legacy.
  - Dashboard → streak & daily list card.

## Technical notes

- `search_tsv` = `to_tsvector('portuguese', coalesce(title,'')||' '||question_text||' '||coalesce(source,'')||' '||array_to_string(tags,' '))` with GIN index for sub-100ms search on tens of thousands of rows.
- All new tables: `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated; GRANT ALL ... TO service_role;` and RLS scoped to `auth.uid()` for user-owned rows, admin-only for catalog writes, `has_active_subscription` for reads.
- Storage: new `question-assets` bucket (public read) for images/attachments; admin-only writes.
- Client: React Query keys namespaced `["qb", …]`; solver state in a Zustand slice to survive route transitions without prop drilling.
- No mocked data — the importer is the only path to populate questions; ships with a small ITA/IME seed JSON the admin can import in one click (real questions from public sources, sourced field populated).

## Rollout order in this thread

1. Migration + RPCs (Phase 1) — one `supabase--migration` call, awaits your approval.
2. Types regenerate → Admin importer + storage bucket (Phase 2).
3. Solver + filters + exam mode (Phase 3).
4. Analytics + recommendations + integrations (Phase 4).

Reply "go" to run Phase 1's migration; I'll continue with Phases 2–4 right after it's approved.
