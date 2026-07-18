# Redesign: Central Content Repo + Kwify Payment Gating

Two large, connected changes. Before I build, please confirm scope and answer a few blocking questions at the end.

## Part 1 — Vanguard Content Repository (centralized Drive)

Move from per-user Drive folders to a single admin-managed Drive that syncs into the database. The frontend only reads from the database.

### Data model (new/changed tables)
- `app_settings` — singleton row storing `content_root_folder_id`, `google_sheets_id`, last sync timestamps.
- `drive_files` — canonical file registry: `drive_file_id` (unique), `name`, `mime_type`, `parent_id`, `path`, `md5_checksum`, `size`, `modified_time`, `version` (int, bumped on hash change), `status` (`active`/`removed`), `last_seen_at`.
- `file_versions` — history rows per `drive_file_id` with previous `md5_checksum`, `size`, `modified_time`, `changed_at`.
- `sync_runs` — one row per sync: `trigger` (`scheduled`/`manual`), `status`, `started_at`, `finished_at`, `files_added`, `files_modified`, `files_removed`, `errors_count`.
- `sync_logs` — structured log lines per run (`level`, `message`, `context`, `drive_file_id?`).
- `processing_queue` — queued work per file: `drive_file_id`, `job_type` (`transcribe`/`summarize`/`generate_questions`/`fetch_sheet`), `status` (`pending`/`running`/`succeeded`/`failed`), `attempts`, `max_attempts` (default 5), `next_run_at`, `last_error`, exponential backoff.

Existing tables (`subjects`, `topics`, `lessons`, `summaries`, `questions`) become **global** (admin-owned): drop `user_id` scoping, add optional `drive_file_id` link on `lessons`. `user_progress`, `simulados`, `weak_topics` stay per-user.

### Sync engine (edge functions)
- `sync-drive` — full incremental sync. Walks the admin folder, compares `md5Checksum` + `modifiedTime` against `drive_files`:
  - new id → insert + enqueue processing
  - hash changed → bump `version`, write `file_versions` row, re-enqueue
  - missing on this pass → mark `status='removed'`, cascade soft-delete derived rows
  - writes `sync_runs` + `sync_logs`
- `process-queue` — pulls `pending` jobs, runs them, retries with backoff, updates status. Invoked at end of `sync-drive` and by cron.
- `admin-reindex` — force-reindex one file or the whole tree (clears hashes so next sync re-processes).

### Scheduling
- `pg_cron` + `pg_net` job invoking `sync-drive` daily at 03:00 UTC.
- Second cron every 5 min invoking `process-queue` to drain retries.

### Auth for admin functions
All admin edge functions require the caller to have the `admin` role (see Part 2 roles).

### Admin UI (`/admin`, admin-only route)
- **Overview**: last sync run, next scheduled run, counts (active/removed files, pending jobs, failed jobs).
- **Sync runs**: table of recent runs with logs drawer.
- **Processing queue**: filter by status, retry / cancel actions.
- **Content stats**: subjects / topics / lessons / questions counts, storage size.
- **Manual actions**: "Run sync now", "Reindex all", "Reindex file".

### Frontend cleanup
- Remove per-user Drive setup: delete `src/pages/DriveSetup.tsx`, its route, and the "Drive" nav item.
- `useSubjects/useTopics/useLessons` stop filtering by `user_id` (content is global). `user_progress`, etc. stay per-user.

---

## Part 2 — Kwify licenses, subscriptions, JWT-gated access

### Tables
- `licenses` — `email` (unique), `kwify_customer_id`, `status` (`active`/`inactive`), `product_code`, `created_at`.
- `subscriptions` — `license_id`, `kwify_subscription_id`, `status` (`active`/`canceled`/`expired`), `current_period_end`, `renewed_at`, `canceled_at`.
- `payments` — `license_id`, `kwify_order_id`, `amount_cents`, `currency`, `status`, `paid_at`, raw `payload jsonb`.
- `user_roles` — separate table with `app_role` enum (`admin`, `student`) and `has_role(uuid, app_role)` security-definer function (per project rules).

### Kwify webhook (`kwify-webhook` edge function, `verify_jwt=false`)
- Verifies Kwify signature using `KWIFY_WEBHOOK_SECRET` (I'll request via `add_secret`).
- Event handling:
  - `purchase.approved` / `order.approved` → upsert `licenses` (active), insert `payments`, create/refresh `subscriptions` with `current_period_end`.
  - `subscription.renewed` → extend `current_period_end`, mark active.
  - `subscription.canceled` / `refund.approved` → set subscription `canceled`, license `inactive`.
- Every event appended to `payments.payload` for audit.

### Signup gate
- Custom edge function `signup-with-license` (used by the Auth page) that checks `licenses.status='active'` for the email before calling `supabase.auth.admin.createUser`. Sign-up UI shows a clear "no active license for this email" error otherwise. Also disables anonymous sign-ups.
- On first login, assign `student` role automatically. Admins are seeded manually via SQL.

### Route/API protection
- **Frontend**: `ProtectedRoute` extended to check active subscription (via a `useAccess` hook querying a `get_my_access()` SQL function). Expired → redirected to a `/subscription-required` page with renewal CTA.
- **RLS**: all content-read policies require `has_active_subscription(auth.uid())` OR `has_role(auth.uid(),'admin')`. Admin write policies require `has_role='admin'`.
- **Edge functions**: middleware helper `requireActiveSubscription(req)` verifies the Supabase JWT + subscription state before executing.

### JWT
Supabase Auth already issues JWTs; the middleware validates them via `supabase.auth.getUser(token)`. No custom JWT stack — that would duplicate Supabase Auth.

---

## Technical notes
- Google Drive access uses the existing `GOOGLE_DRIVE_API_KEY` for a public admin folder; if the admin folder is private we'll need a service-account JSON secret instead (see question 2 below).
- Soft-delete on removed Drive files preserves user_progress history.
- All new public tables get `GRANT`s + RLS + policies in the same migration.

---

## Blocking questions before I build

1. **Existing data**: OK to drop existing per-user `subjects/topics/lessons/questions/summaries` rows during migration to global content? (User progress rows will be kept.)
2. **Drive access**: Is the central content folder public-readable (API key is enough) or private (need a Google **service account** JSON — I'll request it as a secret)?
3. **Admin seeding**: Which email should get the initial `admin` role?
4. **Kwify product**: Single product/plan, or multiple tiers to distinguish? (Affects `product_code` handling.)

Reply with answers (or "go with defaults: drop data, public folder, my email = admin, single product") and I'll implement end-to-end.
