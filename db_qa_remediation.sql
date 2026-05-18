-- ═══════════════════════════════════════════════════════════════
-- SwitchR Database QA Remediation Script
-- Generated: 2026-05-17
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════
-- This script is IDEMPOTENT — safe to run multiple times.
-- All changes use IF NOT EXISTS / DO blocks to avoid errors.
-- ═══════════════════════════════════════════════════════════════


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  SECTION 1: CHECK CONSTRAINTS (Data Integrity)               ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- 1a. items.status — restrict to known values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'items_status_check'
  ) THEN
    -- Backfill any bad data first
    UPDATE public.items SET status = 'active' 
    WHERE status IS NULL OR status NOT IN ('active', 'swapped', 'reserved', 'expired');
    
    ALTER TABLE public.items 
      ADD CONSTRAINT items_status_check 
      CHECK (status IN ('active', 'swapped', 'reserved', 'expired'));
  END IF;
END $$;

-- 1b. bids.status — restrict to known values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bids_status_check'
  ) THEN
    UPDATE public.bids SET status = 'pending'
    WHERE status IS NULL OR status NOT IN ('pending', 'accepted', 'declined', 'cancelled', 'expired');
    
    ALTER TABLE public.bids 
      ADD CONSTRAINT bids_status_check 
      CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired'));
  END IF;
END $$;

-- 1c. swipes.direction — restrict to known values
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'swipes_direction_check'
  ) THEN
    ALTER TABLE public.swipes 
      ADD CONSTRAINT swipes_direction_check 
      CHECK (direction IN ('left', 'right'));
  END IF;
END $$;

-- 1d. profiles.rating — bound to 0-5 range
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_rating_check'
  ) THEN
    -- Clamp any out-of-range ratings
    UPDATE public.profiles SET rating = GREATEST(0, LEAST(5, rating))
    WHERE rating < 0 OR rating > 5;
    
    ALTER TABLE public.profiles 
      ADD CONSTRAINT profiles_rating_check 
      CHECK (rating >= 0 AND rating <= 5);
  END IF;
END $$;

-- 1e. items.estimated_value — must be non-negative if set
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'items_estimated_value_check'
  ) THEN
    UPDATE public.items SET estimated_value = 0
    WHERE estimated_value IS NOT NULL AND estimated_value < 0;
    
    ALTER TABLE public.items 
      ADD CONSTRAINT items_estimated_value_check 
      CHECK (estimated_value IS NULL OR estimated_value >= 0);
  END IF;
END $$;

-- 1f. reviews — prevent self-reviews (only if reviews table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reviews' AND column_name='profile_id')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_no_self_review')
  THEN
    ALTER TABLE public.reviews 
      ADD CONSTRAINT reviews_no_self_review 
      CHECK (reviewer_id <> profile_id);
  END IF;
END $$;

-- 1g. bids — prevent bidding on your own item
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bids_no_self_bid'
  ) THEN
    ALTER TABLE public.bids 
      ADD CONSTRAINT bids_no_self_bid 
      CHECK (bidder_id <> receiver_id);
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  SECTION 2: UNIQUE CONSTRAINTS (Duplicate Prevention)        ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- 2a. Prevent duplicate bids (same person, same item pair)
CREATE UNIQUE INDEX IF NOT EXISTS idx_bids_unique_pending
  ON public.bids (bidder_id, item_offered_id, item_wanted_id)
  WHERE status = 'pending';

-- 2b. Prevent duplicate reviews (only if reviews table has expected columns)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='profile_id') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_per_swap
      ON public.reviews (reviewer_id, profile_id)
      WHERE swap_id IS NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_per_swap_id
      ON public.reviews (reviewer_id, profile_id, swap_id)
      WHERE swap_id IS NOT NULL;
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  SECTION 3: NOT NULL CONSTRAINTS (where safe)                ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- 3a. Backfill items.category then add NOT NULL
UPDATE public.items SET category = 'Other' WHERE category IS NULL;
-- Note: ALTER TABLE ... SET NOT NULL only if you're confident no new NULL inserts will occur
-- ALTER TABLE public.items ALTER COLUMN category SET NOT NULL;

-- 3b. Backfill bids.status 
UPDATE public.bids SET status = 'pending' WHERE status IS NULL;

-- 3c. Backfill profiles.username
UPDATE public.profiles SET username = 'Trader' WHERE username IS NULL;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  SECTION 4: ROW LEVEL SECURITY — Missing Policies            ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- ── 4a. profiles: Add INSERT policy ──────────────────────────────
-- The handle_new_user() trigger uses SECURITY DEFINER and bypasses RLS.
-- But the fallback profile creation in the frontend needs this policy.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Self insert profile' AND tablename = 'profiles'
  ) THEN
    CREATE POLICY "Self insert profile" ON public.profiles 
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- ── 4b. items: Fix INSERT to validate user_id ────────────────────
-- Drop the unsafe policy and replace with a secure one
DROP POLICY IF EXISTS "Auth insert items" ON public.items;
CREATE POLICY "Auth insert items" ON public.items 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ── 4c. bids: Fix INSERT to validate bidder_id ──────────────────
DROP POLICY IF EXISTS "Auth insert bids" ON public.bids;
CREATE POLICY "Auth insert bids" ON public.bids 
  FOR INSERT WITH CHECK (auth.uid() = bidder_id);

-- ── 4d. bids: Add DELETE policy ──────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Bidder can delete own bid' AND tablename = 'bids'
  ) THEN
    CREATE POLICY "Bidder can delete own bid" ON public.bids 
      FOR DELETE USING (auth.uid() = bidder_id);
  END IF;
END $$;

-- ── 4e. messages: Fix INSERT to validate sender_id ──────────────
DROP POLICY IF EXISTS "Auth insert messages" ON public.messages;
CREATE POLICY "Auth insert messages" ON public.messages 
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ── 4f. messages: Add DELETE policy ──────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Sender can delete own messages' AND tablename = 'messages'
  ) THEN
    CREATE POLICY "Sender can delete own messages" ON public.messages 
      FOR DELETE USING (auth.uid() = sender_id);
  END IF;
END $$;

-- ── 4g. swipes: Fix INSERT to validate swiper_id ────────────────
DROP POLICY IF EXISTS "Auth insert swipes" ON public.swipes;
CREATE POLICY "Auth insert swipes" ON public.swipes 
  FOR INSERT WITH CHECK (auth.uid() = swiper_id);

-- ── 4h. swipes: Add DELETE policy (reset swipes) ────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Swiper can delete own swipes' AND tablename = 'swipes'
  ) THEN
    CREATE POLICY "Swiper can delete own swipes" ON public.swipes 
      FOR DELETE USING (auth.uid() = swiper_id);
  END IF;
END $$;

-- ── 4i. ratings: Add UPDATE and DELETE policies ─────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Rater can update own rating' AND tablename = 'ratings'
  ) THEN
    CREATE POLICY "Rater can update own rating" ON public.ratings 
      FOR UPDATE USING (auth.uid() = rater_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Rater can delete own rating' AND tablename = 'ratings'
  ) THEN
    CREATE POLICY "Rater can delete own rating" ON public.ratings 
      FOR DELETE USING (auth.uid() = rater_id);
  END IF;
END $$;

-- ── 4j. reviews: Add UPDATE and DELETE policies (only if table exists) ──
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='reviews') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'Reviewer can update own review' AND tablename = 'reviews'
    ) THEN
      CREATE POLICY "Reviewer can update own review" ON public.reviews 
        FOR UPDATE USING (auth.uid() = reviewer_id);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE policyname = 'Reviewer can delete own review' AND tablename = 'reviews'
    ) THEN
      CREATE POLICY "Reviewer can delete own review" ON public.reviews 
        FOR DELETE USING (auth.uid() = reviewer_id);
    END IF;
  END IF;
END $$;

-- ── 4k. chain_proposals: Restrict UPDATE to acceptances only ────
-- The current policy lets participants modify any field.
-- We replace it with a function-based approach.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chain_proposals') THEN
    DROP POLICY IF EXISTS "Participants can update their chains" ON public.chain_proposals;

    -- Create a secure function that only allows adding self to acceptances
    CREATE OR REPLACE FUNCTION public.accept_chain_proposal(p_chain_id UUID)
    RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER
    AS $fn$
    DECLARE
      v_proposal RECORD;
    BEGIN
      SELECT * INTO v_proposal 
      FROM public.chain_proposals 
      WHERE id = p_chain_id 
        AND auth.uid() = ANY(participant_ids)
        AND status = 'pending';

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Chain proposal not found or you are not a participant';
      END IF;

      UPDATE public.chain_proposals
      SET acceptances = array_append(
            CASE WHEN auth.uid() = ANY(acceptances) THEN acceptances
                 ELSE acceptances
            END,
            auth.uid()
          ),
          status = CASE 
            WHEN array_length(array_append(acceptances, auth.uid()), 1) >= array_length(participant_ids, 1)
            THEN 'active'
            ELSE 'pending'
          END
      WHERE id = p_chain_id
        AND NOT (auth.uid() = ANY(acceptances));
    END;
    $fn$;
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  SECTION 5: INDEXES (Performance)                            ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Items: hot queries
CREATE INDEX IF NOT EXISTS idx_items_user_id ON public.items (user_id);
CREATE INDEX IF NOT EXISTS idx_items_status ON public.items (status);
CREATE INDEX IF NOT EXISTS idx_items_category ON public.items (category);
CREATE INDEX IF NOT EXISTS idx_items_user_status ON public.items (user_id, status);
CREATE INDEX IF NOT EXISTS idx_items_created_at ON public.items (created_at DESC);

-- Bids: offer queries
CREATE INDEX IF NOT EXISTS idx_bids_receiver_status ON public.bids (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids (bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON public.bids (created_at DESC);

-- Messages: chat queries
CREATE INDEX IF NOT EXISTS idx_messages_match_id ON public.messages (match_id);
CREATE INDEX IF NOT EXISTS idx_messages_match_created ON public.messages (match_id, created_at);

-- Swipes: feed exclusion
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_id ON public.swipes (swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiper_item ON public.swipes (swiper_id, item_id);

-- Reviews: profile view (only if table has profile_id column)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='profile_id') THEN
    CREATE INDEX IF NOT EXISTS idx_reviews_profile_id ON public.reviews (profile_id);
    CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (profile_id, created_at DESC);
  END IF;
END $$;

-- Profiles: chain engine wishlist matching (GIN for JSONB containment)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='wishlist_items') THEN
    CREATE INDEX IF NOT EXISTS idx_profiles_wishlist_gin ON public.profiles USING GIN (wishlist_items);
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  SECTION 6: ATOMIC BID ACCEPTANCE (Replace Race Condition)   ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Server-side function for atomic bid acceptance
CREATE OR REPLACE FUNCTION public.accept_bid(p_bid_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_bid RECORD;
  v_result JSONB;
BEGIN
  -- Lock the bid row for update
  SELECT * INTO v_bid 
  FROM public.bids 
  WHERE id = p_bid_id 
    AND receiver_id = p_user_id
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Bid not found, already accepted, or unauthorized');
  END IF;

  -- Lock both items
  PERFORM id FROM public.items WHERE id = v_bid.item_offered_id FOR UPDATE;
  PERFORM id FROM public.items WHERE id = v_bid.item_wanted_id FOR UPDATE;

  -- Check both items are still active
  IF NOT EXISTS (SELECT 1 FROM public.items WHERE id = v_bid.item_offered_id AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Offered item is no longer available');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.items WHERE id = v_bid.item_wanted_id AND status = 'active') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Your item is no longer available');
  END IF;

  -- Atomically: accept bid + swap both items + cancel conflicting bids
  UPDATE public.bids SET status = 'accepted' WHERE id = p_bid_id;
  UPDATE public.items SET status = 'swapped' WHERE id IN (v_bid.item_offered_id, v_bid.item_wanted_id);
  
  -- Cancel all other pending bids that involve these items
  UPDATE public.bids SET status = 'cancelled' 
  WHERE status = 'pending' 
    AND id <> p_bid_id
    AND (item_offered_id IN (v_bid.item_offered_id, v_bid.item_wanted_id)
         OR item_wanted_id IN (v_bid.item_offered_id, v_bid.item_wanted_id));

  RETURN jsonb_build_object(
    'success', true, 
    'bidder_id', v_bid.bidder_id,
    'item_offered_id', v_bid.item_offered_id,
    'item_wanted_id', v_bid.item_wanted_id
  );
END;
$$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  SECTION 7: SERVER-SIDE RATING (Prevent Manipulation)        ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Trigger to auto-recalculate profile rating when a review is inserted
-- (only if reviews table has profile_id column)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='reviews' AND column_name='profile_id') THEN
    CREATE OR REPLACE FUNCTION public.update_profile_rating()
    RETURNS TRIGGER
    LANGUAGE plpgsql SECURITY DEFINER
    AS $fn$
    DECLARE
      v_avg DECIMAL;
      v_count INTEGER;
    BEGIN
      SELECT AVG(rating), COUNT(*) INTO v_avg, v_count
      FROM public.reviews
      WHERE profile_id = NEW.profile_id;

      UPDATE public.profiles
      SET rating = ROUND(v_avg, 1),
          trades_completed = v_count
      WHERE id = NEW.profile_id;

      RETURN NEW;
    END;
    $fn$;

    DROP TRIGGER IF EXISTS on_review_inserted ON public.reviews;
    CREATE TRIGGER on_review_inserted
      AFTER INSERT OR UPDATE ON public.reviews
      FOR EACH ROW EXECUTE FUNCTION public.update_profile_rating();
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  SECTION 8: HARDENED CHAIN ENGINE (Timeout + Dedup)          ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Add a timeout guard to prevent runaway chain queries
CREATE OR REPLACE FUNCTION public.find_trade_chains(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_chain_3 JSONB;
  v_chain_4 JSONB;
BEGIN
  -- Set a 10-second timeout for this function
  SET LOCAL statement_timeout = '10s';

  -- ── 3-way chains ──────────────────────────────────────────────
  SELECT jsonb_agg(DISTINCT chain) INTO v_chain_3
  FROM (
    SELECT jsonb_build_object(
      'type',  '3-way',
      'chain', jsonb_build_array(
        jsonb_build_object(
          'user_id',    a_prof.id,
          'username',   a_prof.username,
          'avatar_url', a_prof.avatar_url,
          'gives_item', jsonb_build_object(
            'id', a_item.id, 'title', a_item.title,
            'image_url', a_item.image_url, 'sub_category', a_item.sub_category),
          'gives_to', b_prof.username
        ),
        jsonb_build_object(
          'user_id',    b_prof.id,
          'username',   b_prof.username,
          'avatar_url', b_prof.avatar_url,
          'gives_item', jsonb_build_object(
            'id', b_item.id, 'title', b_item.title,
            'image_url', b_item.image_url, 'sub_category', b_item.sub_category),
          'gives_to', c_prof.username
        ),
        jsonb_build_object(
          'user_id',    c_prof.id,
          'username',   c_prof.username,
          'avatar_url', c_prof.avatar_url,
          'gives_item', jsonb_build_object(
            'id', c_item.id, 'title', c_item.title,
            'image_url', c_item.image_url, 'sub_category', c_item.sub_category),
          'gives_to', a_prof.username
        )
      ),
      'participant_ids', ARRAY[a_prof.id, b_prof.id, c_prof.id]
    ) AS chain
    FROM
      public.profiles  a_prof
      JOIN public.items a_item
        ON  a_item.user_id = a_prof.id
        AND a_item.status  = 'active'

      -- B: has an item A wants
      JOIN public.items b_item
        ON  b_item.status = 'active'
        AND a_prof.wishlist_items @> jsonb_build_array(
              jsonb_build_object('label', b_item.sub_category))
      JOIN public.profiles b_prof
        ON  b_prof.id = b_item.user_id
        AND b_prof.id <> a_prof.id

      -- C: has an item B wants, and wants what A has
      JOIN public.items c_item
        ON  c_item.status = 'active'
        AND b_prof.wishlist_items @> jsonb_build_array(
              jsonb_build_object('label', c_item.sub_category))
      JOIN public.profiles c_prof
        ON  c_prof.id = c_item.user_id
        AND c_prof.id <> a_prof.id
        AND c_prof.id <> b_prof.id

    WHERE
      c_prof.wishlist_items @> jsonb_build_array(
        jsonb_build_object('label', a_item.sub_category))
      AND a_prof.id = p_user_id

    LIMIT 10
  ) chains_3;

  -- ── 4-way chains ──────────────────────────────────────────────
  SELECT jsonb_agg(DISTINCT chain) INTO v_chain_4
  FROM (
    SELECT jsonb_build_object(
      'type',  '4-way',
      'chain', jsonb_build_array(
        jsonb_build_object(
          'user_id', a_prof.id, 'username', a_prof.username, 'avatar_url', a_prof.avatar_url,
          'gives_item', jsonb_build_object('id', a_item.id, 'title', a_item.title,
                          'image_url', a_item.image_url, 'sub_category', a_item.sub_category),
          'gives_to', b_prof.username),
        jsonb_build_object(
          'user_id', b_prof.id, 'username', b_prof.username, 'avatar_url', b_prof.avatar_url,
          'gives_item', jsonb_build_object('id', b_item.id, 'title', b_item.title,
                          'image_url', b_item.image_url, 'sub_category', b_item.sub_category),
          'gives_to', c_prof.username),
        jsonb_build_object(
          'user_id', c_prof.id, 'username', c_prof.username, 'avatar_url', c_prof.avatar_url,
          'gives_item', jsonb_build_object('id', c_item.id, 'title', c_item.title,
                          'image_url', c_item.image_url, 'sub_category', c_item.sub_category),
          'gives_to', d_prof.username),
        jsonb_build_object(
          'user_id', d_prof.id, 'username', d_prof.username, 'avatar_url', d_prof.avatar_url,
          'gives_item', jsonb_build_object('id', d_item.id, 'title', d_item.title,
                          'image_url', d_item.image_url, 'sub_category', d_item.sub_category),
          'gives_to', a_prof.username)
      ),
      'participant_ids', ARRAY[a_prof.id, b_prof.id, c_prof.id, d_prof.id]
    ) AS chain
    FROM
      public.profiles a_prof
      JOIN public.items a_item ON a_item.user_id = a_prof.id AND a_item.status = 'active'

      JOIN public.items b_item
        ON b_item.status = 'active'
        AND a_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', b_item.sub_category))
      JOIN public.profiles b_prof ON b_prof.id = b_item.user_id AND b_prof.id <> a_prof.id

      JOIN public.items c_item
        ON c_item.status = 'active'
        AND b_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', c_item.sub_category))
      JOIN public.profiles c_prof
        ON c_prof.id = c_item.user_id AND c_prof.id <> a_prof.id AND c_prof.id <> b_prof.id

      JOIN public.items d_item
        ON d_item.status = 'active'
        AND c_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', d_item.sub_category))
      JOIN public.profiles d_prof
        ON d_prof.id = d_item.user_id
        AND d_prof.id <> a_prof.id AND d_prof.id <> b_prof.id AND d_prof.id <> c_prof.id

    WHERE
      d_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', a_item.sub_category))
      AND a_prof.id = p_user_id
    LIMIT 5
  ) chains_4;

  RETURN COALESCE(v_chain_3, '[]'::JSONB) || COALESCE(v_chain_4, '[]'::JSONB);
END;
$$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  VERIFICATION: Print summary                                  ║
-- ╚═══════════════════════════════════════════════════════════════╝

DO $$
DECLARE
  v_constraints INTEGER;
  v_indexes INTEGER;
  v_policies INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_constraints FROM pg_constraint WHERE conrelid IN (
    SELECT oid FROM pg_class WHERE relname IN ('items','bids','swipes','profiles','reviews')
  );
  
  SELECT COUNT(*) INTO v_indexes FROM pg_indexes WHERE tablename IN (
    'items','bids','messages','swipes','profiles','reviews','chain_proposals'
  );
  
  SELECT COUNT(*) INTO v_policies FROM pg_policies WHERE tablename IN (
    'items','bids','messages','swipes','profiles','reviews','ratings','chain_proposals'
  );
  
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '  ✅ REMEDIATION COMPLETE';
  RAISE NOTICE '  Constraints: %', v_constraints;
  RAISE NOTICE '  Indexes: %', v_indexes;
  RAISE NOTICE '  RLS Policies: %', v_policies;
  RAISE NOTICE '═══════════════════════════════════════════';
END $$;
