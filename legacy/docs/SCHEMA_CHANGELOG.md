# SwitchR — Schema Changelog

> **Purpose:** Every database change MUST be logged here before or immediately after it is run in Supabase.
> This file is the contract between the backend (Supabase) and the frontend (App.jsx).
> If it's not in this file, the frontend should not reference it.

---

## How to Log a Change

Copy this template and fill it in:

```
### [YYYY-MM-DD] — Short description
**Type:** ADD COLUMN | DROP COLUMN | RENAME COLUMN | NEW TABLE | DROP TABLE | NEW FUNCTION | DROP FUNCTION | NEW TRIGGER | DROP TRIGGER | NEW POLICY | NEW INDEX | DATA MIGRATION
**Table/Object:** public.table_name
**Change:** Describe exactly what changed
**Frontend impact:** Which file(s) / variable(s) in the frontend need to match this
**SQL run:**
\`\`\`sql
-- paste the SQL here
\`\`\`
```

---

## Baseline (2026-05-24) — All 11 Supabase tabs

The following represents the **full live schema** as of initial audit. All future changes are logged below the baseline.

### Tables
| Table | Key Columns | Notes |
|-------|-------------|-------|
| `profiles` | id, username, avatar_url, bio, rating, trades_completed, accepted_terms, created_at, location_name, header_url, verification_level, wishlist_items, avg_response_time | `wishlist_items` is JSONB array of `{"label": "CategoryName"}` |
| `items` | id, user_id, title, condition, category, sub_category, estimated_value, description, looking_for, image_url, lat, lng, status, created_at | `sub_category` exists in live DB (confirmed by seed data); `co2_saved_kg` may exist |
| `bids` | id, bidder_id, receiver_id, item_offered_id, item_wanted_id, status, created_at | status: 'pending','accepted','declined','cancelled','expired' |
| `messages` | id, match_id, sender_id, receiver_id, content, created_at | — |
| `swipes` | id, swiper_id, item_id, direction, created_at | direction: 'left','right'; UNIQUE(swiper_id, item_id) |
| `ratings` | id, rater_id, ratee_id, match_id, score, comment, created_at | score: 1-5 |
| `reviews` | id, reviewer_id, profile_id, swap_id, rating, comment, created_at | column is `profile_id` (NOT receiver_id — renamed in 8/11) |
| `chain_proposals` | id, chain_data, participant_ids, acceptances, status, created_at, expires_at | status: 'pending','active' |
| `email_config` | key, value | Stores Resend API key + sender email |

### Known Missing Columns (not yet created by any script)
| Column | Table | Status |
|--------|-------|--------|
| `total_carbon_saved` | profiles | ❌ Not in any script — do NOT reference in frontend |
| `co2_saved_kg` | items | ⚠️ Unclear — may exist from separate deploy |

---

## Changelog

<!-- ════════════════════════════════════════════════════════════
     ADD NEW ENTRIES AT THE TOP (newest first)
     ════════════════════════════════════════════════════════════ -->

### [2026-05-24] — Profile verification boolean columns added
**Type:** ADD COLUMN × 3
**Table/Object:** public.profiles
**Change:** Added `email_verified BOOLEAN DEFAULT FALSE`, `phone_verified BOOLEAN DEFAULT FALSE`, `id_verified BOOLEAN DEFAULT FALSE`. Backfilled from `verification_level`.
**Frontend impact:** `ProfileView` trust score now reads these columns first, falls back to `verification_level` if null.
**SQL:** See `profile_verification_migration.sql`
```sql
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS id_verified    BOOLEAN DEFAULT FALSE;
```

---

### [2026-05-24] — Supabase Storage bucket: avatars
**Type:** STORAGE BUCKET (required)
**Table/Object:** storage.buckets
**Change:** The `ProfileSettingsModal` uploads avatar images to a bucket named `'avatars'` with path `{user_id}/avatar.{ext}` (upsert: true). **This bucket must be public.**
**Frontend impact:** `profiles.avatar_url` is set to the public URL + cache-busting timestamp.
**Action required:** In Supabase Dashboard → Storage → New bucket → Name: `avatars` → Public: ✅

---

### [2026-05-24] — Gear icon fixed; ProfileSettingsModal added
**Type:** ROUTING FIX + NEW COMPONENT
**Table/Object:** App.jsx
**Change:**
- Gear icon in profile header now opens `ProfileSettingsModal` (was incorrectly routing to `InfoView`)
- Added "Edit Profile" button to footer actions list
- `ProfileSettingsModal` allows editing: avatar (uploaded to `avatars` storage bucket), username, bio
- Saves to `profiles.avatar_url`, `profiles.username`, `profiles.bio`
**Frontend impact:** `ProfileView` now accepts `showToast` prop (passed from main App)

---



### [2026-05-24] — Non-blocking email triggers deployed
**Type:** NEW TRIGGER × 8, REPLACE FUNCTION × 8
**Table/Object:** auth.users, public.bids, public.messages, public.chain_proposals, public.reviews
**Change:** All email notification functions wrapped in `EXCEPTION` handlers. Welcome email trigger re-created after being dropped in tab 10/11.
**Frontend impact:** None — email is fire-and-forget. Signup now works even if Resend is down.
**Triggers active after this:**
- `on_auth_user_created` → `handle_new_user()` on auth.users
- `on_user_signup_welcome` → `notify_welcome_email()` on auth.users
- `on_new_bid_notify` → `notify_new_offer()` on bids
- `on_bid_status_change_notify` → `notify_offer_status_change()` on bids
- `on_new_message_notify` → `notify_new_message()` on messages
- `on_chain_proposal_notify` → `notify_chain_proposal()` on chain_proposals
- `on_chain_accepted_notify` → `notify_chain_accepted()` on chain_proposals
- `on_review_inserted` → `update_profile_rating()` on reviews

---

### [2026-05-24] — reviews.receiver_id renamed to profile_id
**Type:** RENAME COLUMN
**Table/Object:** public.reviews
**Change:** `receiver_id` → `profile_id`
**Frontend impact:** Any query to `reviews` must use `profile_id`, NOT `receiver_id`
```sql
ALTER TABLE public.reviews RENAME COLUMN receiver_id TO profile_id;
```

---

### [2026-05-24] — QA Remediation: constraints, indexes, policies, functions
**Type:** NEW INDEX × 15, NEW POLICY × 12, NEW FUNCTION × 4
**Table/Object:** All core tables
**Change:** Added CHECK constraints, performance indexes, tightened RLS (INSERT policies now validate user ownership, not just role). Added `accept_bid()` atomic function.
**Frontend impact:**
- Items INSERT must set `user_id = auth.uid()` (not just be authenticated)
- Bids INSERT must set `bidder_id = auth.uid()`
- Messages INSERT must set `sender_id = auth.uid()`
- Swipes INSERT must set `swiper_id = auth.uid()`

---

### [2026-05-24] — Profiles enhanced; reviews table created
**Type:** ADD COLUMN × 5, NEW TABLE
**Table/Object:** public.profiles, public.reviews
**Change:** Added `location_name`, `header_url`, `verification_level`, `wishlist_items`, `avg_response_time` to profiles. Created `reviews` table.
**Frontend impact:**
- `profiles.wishlist_items` is JSONB: `[{"label": "CategoryName"}]`
- `reviews` table uses `profile_id` (after 8/11 rename)

