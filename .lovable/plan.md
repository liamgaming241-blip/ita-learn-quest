# Plan — Fix Subscription Email Matching

## Problem
Signup rejects paying users because the email on their Kiwify purchase doesn't literally equal the one they type. Failure modes seen / likely:
- Gmail dot/plus aliases (`joao.silva+kwify@gmail.com` vs `joaosilva@gmail.com`)
- Whitespace, invisible unicode, or trailing punctuation from Kiwify payload
- Two different emails: purchase email vs preferred signup email
- Webhook occasionally stores an alt email (buyer vs student vs member)
- No visibility to the user about what email the license is under

Current gate only does `lower(email) = lower(email)` exact match.

## Approach — canonical email + alias table + smarter gate

### 1. Canonical email helper (DB)
New `public.canonical_email(text)` immutable function:
- lowercase + trim
- strip zero-width / control chars
- split local/domain
- for gmail/googlemail: remove dots in local part, drop `+tag`, force `@gmail.com`
- for other providers: only drop `+tag`

Store canonical form alongside raw email on licenses.

### 2. Schema changes (single migration)
- `ALTER TABLE public.licenses ADD COLUMN canonical_email text`
- Backfill via `UPDATE ... SET canonical_email = public.canonical_email(email)`
- Index: `CREATE INDEX ON public.licenses (canonical_email)`
- Update `normalize_license_email` trigger to also set `canonical_email`
- New table `public.license_email_aliases (license_id, email, canonical_email, added_by, created_at)` with GRANTs + RLS (admins manage, licence-owner can read own)
- Rewrite `email_has_active_license(_email)`:
  ```
  active if EXISTS license where canonical_email = canonical(_email)
                        or exists alias with canonical match
  ```
- Same update inside `get_my_access` and `admin_lookup_access` so admin diagnostics and access gate use the same rule.

### 3. Kiwify webhook
- Compute canonical on write; upsert license `ON CONFLICT (canonical_email)` (or fallback to email) so buyer/customer/student variants collapse to one row.
- When payload contains multiple emails (buyer + student), insert the extras as aliases automatically.

### 4. Signup edge function
- Use new canonical matcher.
- On rejection, return structured info: `{ error, hint: "Sua compra pode estar sob outro email — contate o suporte" }`.
- Accept optional `purchase_email` field: if provided and different from signup email, verify it has active license, then create the account under the signup email AND add signup email as alias.

### 5. Auth UI (`src/pages/Auth.tsx`)
- On 403 signup failure, show a secondary field "Email usado na compra (se diferente)" and retry with `purchase_email`.
- Client-side canonical preview isn't needed; server is source of truth.

### 6. Admin panel (`src/pages/Admin.tsx`)
- In Access Diagnostics: show canonical form + linked aliases.
- New "Add email alias" action on a license row (calls new RPC `admin_add_license_alias(license_id, email)`).
- Bulk import already exists — pipe through canonical normalization.

## Technical notes
- All matching goes through `canonical_email()` — one source of truth.
- Aliases keep original emails for audit; matching is on canonical form.
- Backward compatible: existing exact-match rows keep working because canonical of themselves = themselves.

## Out of scope
- Changing Kiwify product config
- Auth provider changes (still email/password)
- Frontend redesign
