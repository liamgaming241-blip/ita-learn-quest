# Subtopics: full-stack rollout

Introduce a `subtopics` layer between `topics` and `lessons` and thread it through sync, UI, admin, questions, and analytics without losing existing data.

## 1. Database migration

- Create `public.subtopics` (`id`, `topic_id` FK, `drive_folder_id` unique, `name`, `description`, `slug`, `folder_path`, `sort_order`, `created_at`, `updated_at`) with RLS mirroring `topics` (read for authenticated, write for admin), GRANTs, and `updated_at` trigger.
- Add nullable `subtopic_id` to `lessons`, `questions`, `weak_topics`, `user_progress` (FK on cascade rules matching existing columns).
- Backfill: for every topic that currently has lessons, create a default subtopic `Geral` (slug `geral`) and set each lesson's `subtopic_id` to it. Same treatment for `questions`/`weak_topics` where a `topic_id` exists.
- Keep `topic_id` on lessons/questions for backward compatibility (denormalized), populated from the subtopic's parent.

## 2. Drive sync (`sync-drive`)

Update the materializer to walk one more level:

```text
root / Subject / Topic / Subtopic / lesson-files
```

- Top-level folders → `subjects` (unchanged).
- Second-level folders → `topics`.
- Third-level folders → `subtopics` (new upsert on `drive_folder_id`).
- Files directly under a topic (no third-level folder) fall into a synthetic `Geral` subtopic for that topic.
- Files directly under a subject (no topic) keep today's synthetic `Geral` topic and get a `Geral` subtopic under it.
- Lessons upsert with both `topic_id` and `subtopic_id` populated.
- Lesson pruning still uses drive file IDs.

## 3. Frontend navigation

`src/pages/Subjects.tsx` becomes a 4-level drill-down: Subject → Topic → Subtopic → Lesson list → Lesson viewer, with a breadcrumb header (`Matéria › Tópico › Subtópico › Aula`). New `useSubtopics(topicId)` hook, and `useLessons` gains a `subtopicId` filter.

## 4. Admin panel

Add a "Estrutura de Conteúdo" section: tree of subjects/topics/subtopics with actions to create/rename/reorder/delete subtopics and move lessons between subtopics (client calls parameterized RPCs — no raw SQL from client). Deleting a subtopic cascades to its lessons via FK.

## 5. Questions & simulations

- `questions` gets `subtopic_id`; filters on Questions page and simulation generator accept subject/topic/subtopic.
- Simulation scoring aggregates weak areas at all three levels.

## 6. Analytics / dashboard

- `weak_topics` gains `subtopic_id`; WeakTopics page groups by subject → topic → subtopic.
- Dashboard progress rings compute per-subject, per-topic, per-subtopic completion from `user_progress`.

## Technical notes

- Column additions are nullable to keep existing rows valid; backfill runs in the same migration.
- All new RPCs (`admin_create_subtopic`, `admin_update_subtopic`, `admin_delete_subtopic`, `admin_move_lesson`) are `security definer` with `has_role(auth.uid(),'admin')` checks.
- Frontend types regenerate after the migration approval; UI + edge-function code lands in the follow-up turn.

Reply "go" to run the migration; I'll ship the edge function and UI changes right after it's approved.
