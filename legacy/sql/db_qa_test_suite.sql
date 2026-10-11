-- ═══════════════════════════════════════════════════════════════
-- SwitchR Database QA Test Suite
-- Run in Supabase SQL Editor AFTER db_qa_remediation.sql
-- 47 test cases across all tables, policies, and functions
-- ═══════════════════════════════════════════════════════════════

-- Helper: test result collector
CREATE TEMP TABLE IF NOT EXISTS _test_results (
  test_id   SERIAL,
  category  TEXT,
  test_name TEXT,
  passed    BOOLEAN,
  detail    TEXT
);

-- ╔═══════════════════════════════════════════════════════════╗
-- ║  CATEGORY 1: SCHEMA STRUCTURE TESTS                      ║
-- ╚═══════════════════════════════════════════════════════════╝

-- T1: All required tables exist
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  SELECT 'Schema', 'Table exists: ' || t,
    EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t),
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t)
         THEN 'OK' ELSE 'MISSING' END
  FROM unnest(ARRAY['profiles','items','bids','messages','swipes','ratings','reviews','chain_proposals']) AS t;
END $$;

-- T2: Critical columns exist on items
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  SELECT 'Schema', 'items.' || c || ' exists',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name=c),
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='items' AND column_name=c)
         THEN 'OK' ELSE 'MISSING — run eco_upgrade.sql' END
  FROM unnest(ARRAY['id','user_id','title','status','category','sub_category','co2_saved_kg','image_url','lat','lng']) AS c;
END $$;

-- T3: Critical columns exist on profiles
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  SELECT 'Schema', 'profiles.' || c || ' exists',
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name=c),
    CASE WHEN EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name=c)
         THEN 'OK' ELSE 'MISSING — run profile_upgrade.sql' END
  FROM unnest(ARRAY['id','username','avatar_url','rating','wishlist_items','verification_level','total_carbon_saved','accepted_terms']) AS c;
END $$;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  CATEGORY 2: CONSTRAINT TESTS                            ║
-- ╚═══════════════════════════════════════════════════════════╝

-- T4: items.status CHECK constraint
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Constraints', 'items_status_check exists',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='items_status_check'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname='items_status_check')
         THEN 'OK' ELSE 'MISSING — run remediation' END);
END $$;

-- T5: bids.status CHECK constraint
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Constraints', 'bids_status_check exists',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='bids_status_check'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname='bids_status_check')
         THEN 'OK' ELSE 'MISSING — run remediation' END);
END $$;

-- T6: swipes.direction CHECK
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Constraints', 'swipes_direction_check exists',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='swipes_direction_check'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname='swipes_direction_check')
         THEN 'OK' ELSE 'MISSING' END);
END $$;

-- T7: profiles.rating CHECK
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Constraints', 'profiles_rating_check exists',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='profiles_rating_check'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname='profiles_rating_check')
         THEN 'OK' ELSE 'MISSING' END);
END $$;

-- T8: reviews no-self-review CHECK
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Constraints', 'reviews_no_self_review exists',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='reviews_no_self_review'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname='reviews_no_self_review')
         THEN 'OK' ELSE 'MISSING' END);
END $$;

-- T9: bids no-self-bid CHECK
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Constraints', 'bids_no_self_bid exists',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='bids_no_self_bid'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname='bids_no_self_bid')
         THEN 'OK' ELSE 'MISSING' END);
END $$;

-- T10: swipes UNIQUE constraint
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Constraints', 'swipes unique(swiper_id, item_id)',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname='swipes_swiper_id_item_id_key'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_constraint WHERE conname='swipes_swiper_id_item_id_key')
         THEN 'OK' ELSE 'Check unique constraint name' END);
END $$;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  CATEGORY 3: RLS POLICY TESTS                            ║
-- ╚═══════════════════════════════════════════════════════════╝

-- T11-T15: RLS enabled on all tables
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  SELECT 'RLS', 'RLS enabled on ' || t,
    EXISTS(SELECT 1 FROM pg_class WHERE relname=t AND relrowsecurity=true),
    CASE WHEN EXISTS(SELECT 1 FROM pg_class WHERE relname=t AND relrowsecurity=true)
         THEN 'OK' ELSE 'RLS DISABLED — CRITICAL' END
  FROM unnest(ARRAY['profiles','items','bids','messages','swipes','ratings','reviews','chain_proposals']) AS t;
END $$;

-- T16-T25: Required policies exist
DO $$ 
DECLARE
  v_table TEXT;
  v_policy TEXT;
  v_found BOOLEAN;
BEGIN
  -- profiles policies
  FOR v_table, v_policy IN VALUES
    ('profiles', 'Public profiles'),
    ('profiles', 'Profile owner update'),
    ('profiles', 'Self insert profile'),
    ('items', 'Public items'),
    ('items', 'Auth insert items'),
    ('items', 'Owner update items'),
    ('items', 'Owner delete items'),
    ('bids', 'Bid view'),
    ('bids', 'Auth insert bids'),
    ('bids', 'Bid update'),
    ('bids', 'Bidder can delete own bid'),
    ('messages', 'Message view'),
    ('messages', 'Auth insert messages'),
    ('messages', 'Sender can delete own messages'),
    ('swipes', 'Swipe view owner'),
    ('swipes', 'Auth insert swipes'),
    ('swipes', 'Swiper can delete own swipes'),
    ('reviews', 'Public read reviews'),
    ('reviews', 'Auth insert reviews'),
    ('reviews', 'Reviewer can update own review'),
    ('reviews', 'Reviewer can delete own review')
  LOOP
    v_found := EXISTS(SELECT 1 FROM pg_policies WHERE tablename=v_table AND policyname=v_policy);
    INSERT INTO _test_results (category, test_name, passed, detail)
    VALUES ('RLS', v_table || ': "' || v_policy || '"', v_found,
      CASE WHEN v_found THEN 'OK' ELSE 'POLICY MISSING' END);
  END LOOP;
END $$;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  CATEGORY 4: INDEX TESTS                                 ║
-- ╚═══════════════════════════════════════════════════════════╝

DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  SELECT 'Indexes', 'Index: ' || idx,
    EXISTS(SELECT 1 FROM pg_indexes WHERE indexname=idx),
    CASE WHEN EXISTS(SELECT 1 FROM pg_indexes WHERE indexname=idx)
         THEN 'OK' ELSE 'MISSING — run remediation' END
  FROM unnest(ARRAY[
    'idx_items_user_id',
    'idx_items_status',
    'idx_items_category',
    'idx_items_user_status',
    'idx_bids_receiver_status',
    'idx_bids_bidder_id',
    'idx_messages_match_id',
    'idx_swipes_swiper_id',
    'idx_reviews_profile_id',
    'idx_profiles_wishlist_gin',
    'idx_chain_participant_ids'
  ]) AS idx;
END $$;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  CATEGORY 5: STORED PROCEDURE TESTS                      ║
-- ╚═══════════════════════════════════════════════════════════╝

-- T30: find_trade_chains function exists
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Functions', 'find_trade_chains() exists',
    EXISTS(SELECT 1 FROM pg_proc WHERE proname='find_trade_chains'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname='find_trade_chains')
         THEN 'OK' ELSE 'MISSING — run chain_engine_fixed.sql' END);
END $$;

-- T31: accept_bid function exists
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Functions', 'accept_bid() exists',
    EXISTS(SELECT 1 FROM pg_proc WHERE proname='accept_bid'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname='accept_bid')
         THEN 'OK' ELSE 'MISSING — run remediation' END);
END $$;

-- T32: handle_new_user trigger exists
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Functions', 'on_auth_user_created trigger exists',
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='on_auth_user_created'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='on_auth_user_created')
         THEN 'OK' ELSE 'MISSING — run master_schema.sql' END);
END $$;

-- T33: update_profile_rating trigger exists
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Functions', 'on_review_inserted trigger exists',
    EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='on_review_inserted'),
    CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname='on_review_inserted')
         THEN 'OK' ELSE 'MISSING — run remediation' END);
END $$;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  CATEGORY 6: DATA INTEGRITY TESTS                        ║
-- ╚═══════════════════════════════════════════════════════════╝

-- T34: No orphan items (items without profiles)
DO $$ 
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.items i
  LEFT JOIN public.profiles p ON i.user_id = p.id
  WHERE p.id IS NULL;
  
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Data', 'No orphan items', v_count = 0,
    CASE WHEN v_count = 0 THEN 'OK' ELSE v_count || ' orphan items found — run backfill_profiles.sql' END);
END $$;

-- T35: No items with invalid status
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.items
  WHERE status NOT IN ('active', 'swapped', 'reserved', 'expired') AND status IS NOT NULL;
  
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Data', 'No invalid item statuses', v_count = 0,
    CASE WHEN v_count = 0 THEN 'OK' ELSE v_count || ' items with bad status' END);
END $$;

-- T36: No NULL categories
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.items WHERE category IS NULL;
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Data', 'No NULL categories', v_count = 0,
    CASE WHEN v_count = 0 THEN 'OK' ELSE v_count || ' items with NULL category' END);
END $$;

-- T37: All profile ratings in valid range
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.profiles
  WHERE rating IS NOT NULL AND (rating < 0 OR rating > 5);
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Data', 'All ratings 0-5', v_count = 0,
    CASE WHEN v_count = 0 THEN 'OK' ELSE v_count || ' out-of-range ratings' END);
END $$;

-- T38: No ghost accounts (auth users without profiles)
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM auth.users au
  LEFT JOIN public.profiles pp ON au.id = pp.id
  WHERE pp.id IS NULL;
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Data', 'No ghost accounts', v_count = 0,
    CASE WHEN v_count = 0 THEN 'OK' ELSE v_count || ' auth users without profile — run backfill_profiles.sql' END);
END $$;

-- T39: No self-bids in existing data
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.bids WHERE bidder_id = receiver_id;
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('Data', 'No self-bids', v_count = 0,
    CASE WHEN v_count = 0 THEN 'OK' ELSE v_count || ' self-bids found' END);
END $$;

-- T40: No self-reviews in existing data (only if profile_id column exists)
DO $$
DECLARE v_count INTEGER;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='profile_id') THEN
    SELECT COUNT(*) INTO v_count FROM public.reviews WHERE reviewer_id = profile_id;
    INSERT INTO _test_results (category, test_name, passed, detail)
    VALUES ('Data', 'No self-reviews', v_count = 0,
      CASE WHEN v_count = 0 THEN 'OK' ELSE v_count || ' self-reviews found' END);
  ELSE
    INSERT INTO _test_results (category, test_name, passed, detail)
    VALUES ('Data', 'No self-reviews', true, 'SKIPPED — reviews.profile_id column missing');
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  CATEGORY 7: CHAIN ENGINE FUNCTIONAL TESTS               ║
-- ╚═══════════════════════════════════════════════════════════╝

-- T41: Chain engine returns valid JSON for test user Alice
DO $$
DECLARE
  v_result JSONB;
  v_alice UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = v_alice) INTO v_exists;
  IF v_exists THEN
    SELECT find_trade_chains(v_alice) INTO v_result;
    INSERT INTO _test_results (category, test_name, passed, detail)
    VALUES ('ChainEngine', 'find_trade_chains returns JSON array',
      jsonb_typeof(v_result) = 'array',
      'Returned: ' || LEFT(v_result::text, 100));
    
    INSERT INTO _test_results (category, test_name, passed, detail)
    VALUES ('ChainEngine', 'Alice chain count >= 1 (3-way loop seeded)',
      jsonb_array_length(v_result) >= 1,
      'Chains found: ' || jsonb_array_length(v_result));
  ELSE
    INSERT INTO _test_results (category, test_name, passed, detail)
    VALUES ('ChainEngine', 'Test user Alice exists', false, 'SKIPPED — run seed_test_data.sql first');
  END IF;
END $$;

-- T42: Chain engine handles non-existent user gracefully
DO $$
DECLARE v_result JSONB;
BEGIN
  SELECT find_trade_chains('00000000-0000-0000-0000-000000000000') INTO v_result;
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('ChainEngine', 'Non-existent user returns empty array',
    v_result = '[]'::JSONB OR v_result IS NULL,
    'Returned: ' || COALESCE(v_result::text, 'NULL'));
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('ChainEngine', 'Non-existent user returns empty array', false, SQLERRM);
END $$;

-- T43: Chain engine doesn't crash on NULL input
DO $$
DECLARE v_result JSONB;
BEGIN
  SELECT find_trade_chains(NULL) INTO v_result;
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('ChainEngine', 'NULL input handled gracefully',
    true, 'Returned: ' || COALESCE(v_result::text, 'NULL'));
EXCEPTION WHEN OTHERS THEN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('ChainEngine', 'NULL input handled gracefully', false, SQLERRM);
END $$;


-- ╔═══════════════════════════════════════════════════════════╗
-- ║  CATEGORY 8: FOREIGN KEY INTEGRITY                       ║
-- ╚═══════════════════════════════════════════════════════════╝

-- T44: items.user_id FK to profiles
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('ForeignKeys', 'items.user_id → profiles.id FK',
    EXISTS(SELECT 1 FROM pg_constraint c JOIN pg_class t ON c.conrelid=t.oid
           WHERE t.relname='items' AND c.contype='f' AND c.conname LIKE '%user_id%'),
    'Checked');
END $$;

-- T45: bids FK columns
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('ForeignKeys', 'bids has 4 FK constraints',
    (SELECT COUNT(*) FROM pg_constraint c JOIN pg_class t ON c.conrelid=t.oid
     WHERE t.relname='bids' AND c.contype='f') >= 4,
    'FK count: ' || (SELECT COUNT(*) FROM pg_constraint c JOIN pg_class t ON c.conrelid=t.oid
     WHERE t.relname='bids' AND c.contype='f'));
END $$;

-- T46: messages FK columns
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('ForeignKeys', 'messages has sender/receiver FK',
    (SELECT COUNT(*) FROM pg_constraint c JOIN pg_class t ON c.conrelid=t.oid
     WHERE t.relname='messages' AND c.contype='f') >= 2,
    'FK count: ' || (SELECT COUNT(*) FROM pg_constraint c JOIN pg_class t ON c.conrelid=t.oid
     WHERE t.relname='messages' AND c.contype='f'));
END $$;

-- T47: ON DELETE CASCADE on profiles FK
DO $$ BEGIN
  INSERT INTO _test_results (category, test_name, passed, detail)
  VALUES ('ForeignKeys', 'profiles PK has CASCADE delete',
    EXISTS(SELECT 1 FROM pg_constraint WHERE conname LIKE '%profiles%' AND confdeltype='c'),
    'Cascade config checked');
END $$;


-- ═══════════════════════════════════════════════════════════════
-- FINAL REPORT
-- ═══════════════════════════════════════════════════════════════

SELECT 
  '═══════════════════════════════════════════' AS "═══ SWITCHR QA REPORT ═══";

SELECT 
  CASE WHEN passed THEN '✅' ELSE '❌' END AS status,
  category,
  test_name,
  detail
FROM _test_results
ORDER BY passed ASC, category, test_id;

SELECT 
  '───────── SUMMARY ─────────' AS " ",
  COUNT(*) FILTER (WHERE passed) || '/' || COUNT(*) || ' passed' AS result,
  COUNT(*) FILTER (WHERE NOT passed) || ' failures' AS failures
FROM _test_results;

-- Cleanup
DROP TABLE IF EXISTS _test_results;
