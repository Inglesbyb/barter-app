# SwitchR — Live Supabase Schema (Ground Truth)

> **Last Updated:** 2026-05-24
> **Source:** Manually captured from Supabase Dashboard
> **Purpose:** Definitive record of what ACTUALLY exists in the database — no assumptions.

---

---

## 1/11 — SwitchR Core Tables & RLS Setup

**SQL Tab Name:** "SwitchR core tables & RLS set up"

### Table: `public.profiles`
| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | — | PK, FK → `auth.users(id)` ON DELETE CASCADE |
| `username` | TEXT | — | — |
| `avatar_url` | TEXT | — | — |
| `bio` | TEXT | — | — |
| `rating` | DECIMAL | 5.0 | — |
| `trades_completed` | INTEGER | 0 | — |
| `accepted_terms` | BOOLEAN | FALSE | — |
| `created_at` | TIMESTAMPTZ | NOW() | — |

### Table: `public.items`
| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `user_id` | UUID | — | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `title` | TEXT | — | NOT NULL |
| `condition` | TEXT | — | — |
| `category` | TEXT | — | — |
| `estimated_value` | DECIMAL | — | — |
| `description` | TEXT | — | — |
| `looking_for` | TEXT | — | — |
| `image_url` | TEXT | — | — |
| `lat` | DOUBLE PRECISION | — | — |
| `lng` | DOUBLE PRECISION | — | — |
| `status` | TEXT | 'active' | — (values: 'active', 'swapped') |
| `created_at` | TIMESTAMPTZ | NOW() | — |

### Table: `public.bids`
| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `bidder_id` | UUID | — | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `receiver_id` | UUID | — | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `item_offered_id` | UUID | — | NOT NULL, FK → `items(id)` ON DELETE CASCADE |
| `item_wanted_id` | UUID | — | NOT NULL, FK → `items(id)` ON DELETE CASCADE |
| `status` | TEXT | 'pending' | — (values: 'pending', 'accepted', 'declined') |
| `created_at` | TIMESTAMPTZ | NOW() | — |

### Table: `public.messages`
| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `match_id` | TEXT | — | NOT NULL |
| `sender_id` | UUID | — | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `receiver_id` | UUID | — | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `content` | TEXT | — | NOT NULL |
| `created_at` | TIMESTAMPTZ | NOW() | — |

### Table: `public.swipes`
| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `swiper_id` | UUID | — | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `item_id` | UUID | — | NOT NULL, FK → `items(id)` ON DELETE CASCADE |
| `direction` | TEXT | — | NOT NULL (values: 'left', 'right') |
| `created_at` | TIMESTAMPTZ | NOW() | — |
| — | — | — | UNIQUE(`swiper_id`, `item_id`) |

### Table: `public.ratings`
| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | gen_random_uuid() | PK |
| `rater_id` | UUID | — | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `ratee_id` | UUID | — | NOT NULL, FK → `profiles(id)` ON DELETE CASCADE |
| `match_id` | TEXT | — | — |
| `score` | INTEGER | — | CHECK (score >= 1 AND score <= 5) |
| `comment` | TEXT | — | — |
| `created_at` | TIMESTAMPTZ | NOW() | — |

### Trigger: `on_auth_user_created`
- **Fires:** AFTER INSERT ON `auth.users`
- **Function:** `public.handle_new_user()` — inserts a `profiles` row with `id`, `username`, `avatar_url`

### RLS Policies
| Table | Policy | Operation | Rule |
|-------|--------|-----------|------|
| profiles | Public profiles | SELECT | true |
| profiles | Profile owner update | UPDATE | auth.uid() = id |
| items | Public items | SELECT | true |
| items | Auth insert items | INSERT | auth.role() = 'authenticated' |
| items | Owner update items | UPDATE | auth.uid() = user_id |
| items | Owner delete items | DELETE | auth.uid() = user_id |
| bids | Bid view | SELECT | auth.uid() = bidder_id OR receiver_id |
| bids | Auth insert bids | INSERT | auth.role() = 'authenticated' |
| bids | Bid update | UPDATE | auth.uid() = bidder_id OR receiver_id |
| messages | Message view | SELECT | auth.uid() = sender_id OR receiver_id |
| messages | Auth insert messages | INSERT | auth.role() = 'authenticated' |
| swipes | Swipe view owner | SELECT | auth.uid() = swiper_id |
| swipes | Auth insert swipes | INSERT | auth.role() = 'authenticated' |
| ratings | Rating view | SELECT | true |
| ratings | Auth insert ratings | INSERT | auth.role() = 'authenticated' |

---

## 2/11 — Backfill Missing User Profiles

**SQL Tab Name:** "Backfill missing user profiles"

**Purpose:** One-time repair script. Finds any `auth.users` row that has no corresponding `public.profiles` row and inserts one. Fixes "ghost accounts" that cause FK constraint errors when posting items.

**Type:** Data migration (not a table/trigger — just an INSERT...SELECT)

```sql
INSERT INTO public.profiles (id, username, avatar_url)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1), 'Trader'),
  COALESCE(au.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.id)
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE pp.id IS NULL;
```

---

## 3/11 — Profiles Enhancements and Reviews Storage

**SQL Tab Name:** "Profiles Enhancements and Reviews Storage"

### Columns added to `public.profiles`
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `bio` | TEXT | — | ⚠️ Already exists from 1/11 — this is a re-add via `IF NOT EXISTS` |
| `location_name` | TEXT | — | New |
| `header_url` | TEXT | — | New |
| `verification_level` | INTEGER | 0 | New |
| `wishlist_items` | JSONB | '[]' | New |
| `avg_response_time` | TEXT | — | New |

### Table: `public.reviews`
| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | uuid_generate_v4() | PK |
| `reviewer_id` | UUID | — | FK → `profiles(id)` ON DELETE CASCADE |
| `receiver_id` | UUID | — | FK → `profiles(id)` ON DELETE CASCADE |
| `swap_id` | UUID | — | Optional link to a swap |
| `rating` | INTEGER | — | CHECK (rating >= 1 AND rating <= 5) |
| `comment` | TEXT | — | — |
| `created_at` | TIMESTAMPTZ | timezone('utc', now()) | NOT NULL |

> [!IMPORTANT]
> The column is `receiver_id` here, but in a previous conversation it was renamed to `profile_id`. Check which actually exists in live DB.

### RLS Policies (reviews)
| Policy | Operation | Rule |
|--------|-----------|------|
| Public reviews are viewable by everyone | SELECT | true |
| Users can insert their own reviews | INSERT | auth.uid() = reviewer_id |

---

## 4/11 — Trade Chain Proposal Storage

**SQL Tab Name:** "Trade Chain Proposal Storage"

### Table: `public.chain_proposals`
| Column | Type | Default | Constraints |
|--------|------|---------|-------------|
| `id` | UUID | uuid_generate_v4() | PK |
| `chain_data` | JSONB | — | NOT NULL |
| `participant_ids` | UUID[] | — | NOT NULL |
| `acceptances` | UUID[] | '{}' | — |
| `status` | TEXT | 'pending' | — |
| `created_at` | TIMESTAMPTZ | timezone('utc', now()) | NOT NULL |
| `expires_at` | TIMESTAMPTZ | now() + 72 hours | — |

### RLS Policies (chain_proposals)
| Policy | Operation | Rule |
|--------|-----------|------|
| Participants can view their chains | SELECT | auth.uid() = ANY(participant_ids) |

### Function: `find_trade_chains(p_user_id UUID)` → JSONB
- Finds 3-way circular trade chains involving the given user
- Returns up to 10 matches as a JSONB array

> [!WARNING]
> This function references `a_item.owner_id` but the `items` table (from 1/11) uses `user_id`. Also references `a_item.sub_category` which isn't in the base items table — it was added by a later migration (5/11). These mismatches may cause the function to fail at runtime.

---

## 5/11 — Seed Perfect Loop Test Personas

**SQL Tab Name:** "Seed Perfect Loop Test Personas"

**Purpose:** Test data — 3 fake users (Alice, Bob, Carol) with items forming a perfect 3-way chain loop.

**Type:** Seed data (INSERT statements, no schema changes)

**Key observations:**
- Uses `sub_category` column on `items` — confirms this column exists in live DB
- `wishlist_items` format is `[{"label": "Kitchen"}]` — array of objects with `label` key
- Inserts directly into `auth.users` (test only)

**Test users:**
| User | Wants (wishlist) | Has (item) |
|------|-----------------|------------|
| Alice | Kitchen | Gibson Guitar (Musical Instruments) |
| Bob | Electronics | Smeg Toaster (Kitchen) |
| Carol | Musical Instruments | 4K OLED TV (Electronics) |

---

## 6/11 — QA Remediation (Constraints, Indexes, Policies, Functions)

**SQL Tab Name:** "Non-Blocking Email Triggers for Signup & Trade Events"
**Actual content:** Database QA Remediation Script (2026-05-17). Idempotent.

### CHECK Constraints Added
| Constraint | Table | Rule |
|-----------|-------|------|
| `items_status_check` | items | status IN ('active', 'swapped', 'reserved', 'expired') |
| `bids_status_check` | bids | status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired') |
| `swipes_direction_check` | swipes | direction IN ('left', 'right') |
| `profiles_rating_check` | profiles | rating >= 0 AND rating <= 5 |
| `items_estimated_value_check` | items | estimated_value IS NULL OR >= 0 |
| `reviews_no_self_review` | reviews | reviewer_id <> profile_id (only if `profile_id` column exists) |
| `bids_no_self_bid` | bids | bidder_id <> receiver_id |

### Unique Indexes Added
| Index | Table | Columns | Condition |
|-------|-------|---------|-----------|
| `idx_bids_unique_pending` | bids | (bidder_id, item_offered_id, item_wanted_id) | WHERE status = 'pending' |
| `idx_reviews_unique_per_swap` | reviews | (reviewer_id, profile_id) | WHERE swap_id IS NULL |
| `idx_reviews_unique_per_swap_id` | reviews | (reviewer_id, profile_id, swap_id) | WHERE swap_id IS NOT NULL |

### Additional RLS Policies Added/Replaced
| Table | Policy | Operation | Rule |
|-------|--------|-----------|------|
| profiles | Self insert profile | INSERT | auth.uid() = id |
| items | Auth insert items | INSERT | auth.uid() = user_id *(replaced)* |
| bids | Auth insert bids | INSERT | auth.uid() = bidder_id *(replaced)* |
| bids | Bidder can delete own bid | DELETE | auth.uid() = bidder_id |
| messages | Auth insert messages | INSERT | auth.uid() = sender_id *(replaced)* |
| messages | Sender can delete own messages | DELETE | auth.uid() = sender_id |
| swipes | Auth insert swipes | INSERT | auth.uid() = swiper_id *(replaced)* |
| swipes | Swiper can delete own swipes | DELETE | auth.uid() = swiper_id |
| ratings | Rater can update own rating | UPDATE | auth.uid() = rater_id |
| ratings | Rater can delete own rating | DELETE | auth.uid() = rater_id |
| reviews | Reviewer can update own review | UPDATE | auth.uid() = reviewer_id |
| reviews | Reviewer can delete own review | DELETE | auth.uid() = reviewer_id |

### Performance Indexes Added
| Index | Table | Columns |
|-------|-------|---------|
| `idx_items_user_id` | items | (user_id) |
| `idx_items_status` | items | (status) |
| `idx_items_category` | items | (category) |
| `idx_items_user_status` | items | (user_id, status) |
| `idx_items_created_at` | items | (created_at DESC) |
| `idx_bids_receiver_status` | bids | (receiver_id, status) |
| `idx_bids_bidder_id` | bids | (bidder_id) |
| `idx_bids_created_at` | bids | (created_at DESC) |
| `idx_messages_match_id` | messages | (match_id) |
| `idx_messages_match_created` | messages | (match_id, created_at) |
| `idx_swipes_swiper_id` | swipes | (swiper_id) |
| `idx_swipes_swiper_item` | swipes | (swiper_id, item_id) |
| `idx_reviews_profile_id` | reviews | (profile_id) — if column exists |
| `idx_reviews_created_at` | reviews | (profile_id, created_at DESC) — if column exists |
| `idx_profiles_wishlist_gin` | profiles | GIN(wishlist_items) — if column exists |

### Functions Added/Replaced
| Function | Purpose |
|----------|---------|
| `accept_chain_proposal(UUID)` | Secure chain acceptance (SECURITY DEFINER) |
| `accept_bid(UUID, UUID)` → JSONB | Atomic bid acceptance with row locking, item status check, conflicting bid cancellation |
| `update_profile_rating()` | Trigger fn: recalculates profile rating on review insert/update (if `profile_id` exists) |
| `find_trade_chains(UUID)` → JSONB | **Hardened version** with 10s timeout, 3-way + 4-way chains, uses `user_id` (not `owner_id`), dedup via DISTINCT |

> [!NOTE]
> This script **replaces** the broken `find_trade_chains` from 4/11 with a corrected version that uses `user_id` instead of `owner_id`.

---

## 7/11 — QA Test Suite

**SQL Tab Name:** "QA Schema, RLS, Constraints, Indexes, and Chain Engine Checks"

**Purpose:** 47-test validation suite. No schema changes — read-only checks. Uses a temp table `_test_results`.

**Type:** Test/validation only (no schema modifications)

**Key columns it expects to exist (reveals schema expectations):**
- `items`: `sub_category`, `co2_saved_kg` (from eco_upgrade)
- `profiles`: `total_carbon_saved`, `wishlist_items`, `verification_level`
- `reviews`: `profile_id` (checks conditionally)

**Test categories:** Schema structure, Constraints, RLS policies, Indexes, Stored procedures, Data integrity, Chain engine, Foreign keys

---

## 8/11 — Reviews Column Rename

**SQL Tab Name:** "Inspect Reviews Table Schema"

**Purpose:** Renames `reviews.receiver_id` → `reviews.profile_id` to match frontend code.

```sql
ALTER TABLE public.reviews RENAME COLUMN receiver_id TO profile_id;
```

> [!IMPORTANT]
> This resolves the ambiguity flagged in 3/11. The **live column name** on `reviews` is `profile_id` (not `receiver_id`). All scripts referencing `reviews.receiver_id` are outdated.

---

## 9/11 — Diagnostic Query (Failing Tests)

**SQL Tab Name:** "Temporary Test Results Staging"

**Purpose:** One-off diagnostic SELECT to pinpoint which QA checks are failing. Returns only rows with ❌.

**Type:** Read-only diagnostic (no schema changes)

**Columns checked:**
- `profiles.wishlist_items`, `profiles.total_carbon_saved`, `profiles.verification_level`
- `items.sub_category`, `items.co2_saved_kg`
- RLS on `ratings` and `chain_proposals`
- Ghost accounts, bids FK count, cascade delete

---

## 10/11 — Drop Welcome Email Trigger

**SQL Tab Name:** "Resend Email Notifications via DB Triggers"

**Purpose:** Drops the `on_user_signup_welcome` trigger from `auth.users`.

```sql
DROP TRIGGER IF EXISTS on_user_signup_welcome ON auth.users;
```

> [!WARNING]
> If this was the **last thing run** in this tab, the welcome email trigger is currently **disabled** in live. The `fix_email_triggers.sql` re-creates it with proper exception handling.

---

## 11/11 — Definitive Email Trigger Fix

**SQL Tab Name:** "Non-Blocking Email Triggers for Signup & Trade Events"

**Purpose:** Complete non-blocking email trigger system. This is the `fix_email_triggers.sql` content.

**Dependencies:** Requires `email_config` table and `email_template()` function (from original email_notifications.sql deployment)

### Functions Created/Replaced
| Function | Trigger | Fires On |
|----------|---------|----------|
| `private_send_email(TEXT, TEXT, TEXT)` | — | Called by other functions |
| `notify_welcome_email()` | `on_user_signup_welcome` | AFTER INSERT on `auth.users` |
| `notify_new_offer()` | `on_new_bid_notify` | AFTER INSERT on `bids` |
| `notify_offer_status_change()` | `on_bid_status_change_notify` | AFTER UPDATE on `bids` |
| `notify_new_message()` | `on_new_message_notify` | AFTER INSERT on `messages` |
| `notify_chain_proposal()` | `on_chain_proposal_notify` | AFTER INSERT on `chain_proposals` |
| `notify_chain_accepted()` | `on_chain_accepted_notify` | AFTER UPDATE on `chain_proposals` |
| `handle_new_user()` | `on_auth_user_created` | AFTER INSERT on `auth.users` |

### Implicit Table: `public.email_config`
| Column | Type | Notes |
|--------|------|-------|
| `key` | TEXT | e.g. 'resend_api_key', 'sender_email' |
| `value` | TEXT | The config value |

> [!NOTE]
> The `email_config` table and `email_template()` function are defined in the original `email_notifications.sql` but not in any of the 11 Supabase tabs sent. They must have been deployed separately.

---
---

# CONSOLIDATED LIVE SCHEMA

> Everything below is the **merged, deduplicated** view of what should exist in the live Supabase database after all 11 scripts have been run in order.

## Final Table: `public.profiles`
| Column | Type | Default | Source |
|--------|------|---------|--------|
| `id` | UUID | — | 1/11 |
| `username` | TEXT | — | 1/11 |
| `avatar_url` | TEXT | — | 1/11 |
| `bio` | TEXT | — | 1/11 + 3/11 |
| `rating` | DECIMAL | 5.0 | 1/11 |
| `trades_completed` | INTEGER | 0 | 1/11 |
| `accepted_terms` | BOOLEAN | FALSE | 1/11 |
| `created_at` | TIMESTAMPTZ | NOW() | 1/11 |
| `location_name` | TEXT | — | 3/11 |
| `header_url` | TEXT | — | 3/11 |
| `verification_level` | INTEGER | 0 | 3/11 |
| `wishlist_items` | JSONB | '[]' | 3/11 |
| `avg_response_time` | TEXT | — | 3/11 |
| `total_carbon_saved` | ? | ? | ⚠️ Expected by 7/11 tests but **not created by any of the 11 scripts** |

## Final Table: `public.items`
| Column | Type | Default | Source |
|--------|------|---------|--------|
| `id` | UUID | gen_random_uuid() | 1/11 |
| `user_id` | UUID | — | 1/11 (NOT NULL, FK → profiles) |
| `title` | TEXT | — | 1/11 (NOT NULL) |
| `condition` | TEXT | — | 1/11 |
| `category` | TEXT | — | 1/11 |
| `estimated_value` | DECIMAL | — | 1/11 |
| `description` | TEXT | — | 1/11 |
| `looking_for` | TEXT | — | 1/11 |
| `image_url` | TEXT | — | 1/11 |
| `lat` | DOUBLE PRECISION | — | 1/11 |
| `lng` | DOUBLE PRECISION | — | 1/11 |
| `status` | TEXT | 'active' | 1/11 |
| `created_at` | TIMESTAMPTZ | NOW() | 1/11 |
| `sub_category` | TEXT | — | ⚠️ Used by 5/11 seed data + chain engine but **not created by any of the 11 scripts** |
| `co2_saved_kg` | ? | ? | ⚠️ Expected by 7/11 tests but **not created by any of the 11 scripts** |

## Final Table: `public.bids`
(Unchanged from 1/11)

## Final Table: `public.messages`
(Unchanged from 1/11)

## Final Table: `public.swipes`
(Unchanged from 1/11)

## Final Table: `public.ratings`
(Unchanged from 1/11)

## Final Table: `public.reviews`
| Column | Type | Default | Source |
|--------|------|---------|--------|
| `id` | UUID | uuid_generate_v4() | 3/11 |
| `reviewer_id` | UUID | — | 3/11 (FK → profiles) |
| `profile_id` | UUID | — | 3/11 created as `receiver_id`, **renamed in 8/11** |
| `swap_id` | UUID | — | 3/11 |
| `rating` | INTEGER | — | 3/11 (CHECK 1-5) |
| `comment` | TEXT | — | 3/11 |
| `created_at` | TIMESTAMPTZ | timezone('utc', now()) | 3/11 |

## Final Table: `public.chain_proposals`
(Unchanged from 4/11)

## Final Table: `public.email_config`
(Implicit from 11/11 — stores Resend API key and sender email)

## All Triggers (auth.users)
| Trigger | Function | Status |
|---------|----------|--------|
| `on_auth_user_created` | `handle_new_user()` | ✅ Active (11/11) |
| `on_user_signup_welcome` | `notify_welcome_email()` | ✅ Active (11/11 re-creates after 10/11 drop) |

## All Triggers (public tables)
| Trigger | Table | Function |
|---------|-------|----------|
| `on_new_bid_notify` | bids | `notify_new_offer()` |
| `on_bid_status_change_notify` | bids | `notify_offer_status_change()` |
| `on_new_message_notify` | messages | `notify_new_message()` |
| `on_chain_proposal_notify` | chain_proposals | `notify_chain_proposal()` |
| `on_chain_accepted_notify` | chain_proposals | `notify_chain_accepted()` |
| `on_review_inserted` | reviews | `update_profile_rating()` |

## ⚠️ Missing Columns (Gap Analysis)
| Column | Table | Expected By | Status |
|--------|-------|-------------|--------|
| `total_carbon_saved` | profiles | 7/11 QA tests | **NOT CREATED by any script** |
| `sub_category` | items | 5/11 seed, 6/11 chain engine | **NOT CREATED by any script** (but used successfully in seed → may exist from a separate deployment) |
| `co2_saved_kg` | items | 7/11 QA tests | **NOT CREATED by any script** |

