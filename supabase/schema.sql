-- ==============================================================================
-- SwitchR — Clean MVP schema
-- ==============================================================================
-- Run ONCE in a fresh Supabase project: Dashboard -> SQL Editor -> New query -> Run.
--
-- Core loop: list item -> browse -> offer (1:1) -> accept/decline -> chat
--            -> both confirm complete -> rate each other
--
-- Design rules:
--   * Emails: NONE handled here. Sign-up confirmation & password reset use
--     Supabase Auth's built-in emails (Dashboard -> Authentication -> Emails).
--   * Trade status changes happen ONLY through the RPC functions below
--     (accept_trade, decline_trade, cancel_trade, confirm_trade). There is no
--     direct UPDATE policy on trades, so nobody can forge a status.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 0. CLEAN RESET: Drop legacy tables and triggers if resetting an existing project
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.trades CASCADE;
DROP TABLE IF EXISTS public.bids CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.chain_proposals CASCADE;
DROP TABLE IF EXISTS public.email_config CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- ------------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT NOT NULL UNIQUE CHECK (char_length(username) BETWEEN 3 AND 30),
  bio           TEXT CHECK (char_length(bio) <= 300),
  location_name TEXT CHECK (char_length(location_name) <= 80),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: anyone can read"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "profiles: owner can update"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Auto-create a profile on sign-up. Username comes from sign-up metadata;
-- if missing or taken, a unique fallback is generated so sign-up never fails.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  base_name TEXT;
  final_name TEXT;
BEGIN
  base_name := lower(regexp_replace(
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1)),
    '[^a-zA-Z0-9_]', '', 'g'));
  IF char_length(base_name) < 3 THEN
    base_name := 'trader';
  END IF;
  base_name := left(base_name, 24);
  final_name := base_name;

  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_name) LOOP
    final_name := base_name || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  INSERT INTO public.profiles (id, username) VALUES (NEW.id, final_name);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ------------------------------------------------------------------------------
-- 2. ITEMS
-- ------------------------------------------------------------------------------
-- status: available -> in_trade (offer accepted) -> traded (trade completed)
--         in_trade -> available (if accepted trade is cancelled)
CREATE TABLE public.items (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL CHECK (char_length(title) BETWEEN 2 AND 80),
  description TEXT CHECK (char_length(description) <= 1000),
  category    TEXT NOT NULL,
  condition   TEXT NOT NULL CHECK (condition IN ('New', 'Like new', 'Good', 'Fair')),
  image_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'available'
                CHECK (status IN ('available', 'in_trade', 'traded')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX items_status_created_idx ON public.items (status, created_at DESC);
CREATE INDEX items_user_idx ON public.items (user_id);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "items: anyone can read"
  ON public.items FOR SELECT USING (true);

CREATE POLICY "items: owner can create (always starts available)"
  ON public.items FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'available');

-- Owners may edit details of an available item, but cannot change its status
-- (status is driven by the trade functions).
CREATE POLICY "items: owner can edit available items"
  ON public.items FOR UPDATE
  USING (auth.uid() = user_id AND status = 'available')
  WITH CHECK (auth.uid() = user_id AND status = 'available');

CREATE POLICY "items: owner can delete available items"
  ON public.items FOR DELETE
  USING (auth.uid() = user_id AND status = 'available');


-- ------------------------------------------------------------------------------
-- 3. TRADES (1:1 offers)
-- ------------------------------------------------------------------------------
-- status: pending -> accepted -> completed
--         pending -> declined | cancelled
--         accepted -> cancelled
CREATE TABLE public.trades (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offered_item_id     UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  requested_item_id   UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'cancelled')),
  initiator_confirmed BOOLEAN NOT NULL DEFAULT false,
  receiver_confirmed  BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (initiator_id <> receiver_id),
  CHECK (offered_item_id <> requested_item_id)
);

-- One live offer per item pair.
CREATE UNIQUE INDEX trades_one_pending_per_pair
  ON public.trades (offered_item_id, requested_item_id)
  WHERE status = 'pending';
CREATE INDEX trades_initiator_idx ON public.trades (initiator_id, status);
CREATE INDEX trades_receiver_idx  ON public.trades (receiver_id, status);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trades: participants can read"
  ON public.trades FOR SELECT
  USING (auth.uid() IN (initiator_id, receiver_id));

-- Making an offer: you must own the offered item, the receiver must own the
-- requested item, and both items must still be available.
CREATE POLICY "trades: make an offer"
  ON public.trades FOR INSERT
  WITH CHECK (
    auth.uid() = initiator_id
    AND status = 'pending'
    AND initiator_confirmed = false
    AND receiver_confirmed = false
    AND EXISTS (SELECT 1 FROM public.items i
                WHERE i.id = offered_item_id AND i.user_id = initiator_id AND i.status = 'available')
    AND EXISTS (SELECT 1 FROM public.items i
                WHERE i.id = requested_item_id AND i.user_id = receiver_id AND i.status = 'available')
  );
-- NOTE: no UPDATE / DELETE policies — use the functions below.


-- ------------------------------------------------------------------------------
-- 4. MESSAGES (chat inside an accepted trade)
-- ------------------------------------------------------------------------------
CREATE TABLE public.messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id   UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  sender_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 2000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX messages_trade_idx ON public.messages (trade_id, created_at);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "messages: participants can read"
  ON public.messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.trades t
    WHERE t.id = trade_id AND auth.uid() IN (t.initiator_id, t.receiver_id)
  ));

-- Chat is open only while the trade is accepted (finished trades are read-only).
CREATE POLICY "messages: participants can send while trade is accepted"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id
        AND t.status = 'accepted'
        AND auth.uid() IN (t.initiator_id, t.receiver_id)
    )
  );


-- ------------------------------------------------------------------------------
-- 5. REVIEWS (one per person per completed trade)
-- ------------------------------------------------------------------------------
CREATE TABLE public.reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id   UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  rater_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score      INT  NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment    TEXT CHECK (char_length(comment) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (trade_id, rater_id),
  CHECK (rater_id <> ratee_id)
);

CREATE INDEX reviews_ratee_idx ON public.reviews (ratee_id, created_at DESC);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews: anyone can read"
  ON public.reviews FOR SELECT USING (true);

-- You can only review the OTHER person in a trade you were part of, once it's completed.
CREATE POLICY "reviews: rate your trading partner after completion"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM public.trades t
      WHERE t.id = trade_id
        AND t.status = 'completed'
        AND (
          (t.initiator_id = auth.uid() AND t.receiver_id = ratee_id) OR
          (t.receiver_id = auth.uid() AND t.initiator_id = ratee_id)
        )
    )
  );


-- ------------------------------------------------------------------------------
-- 5.5 SWIPES (Explore feed swipes: save / skip)
-- ------------------------------------------------------------------------------
CREATE TABLE public.swipes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id    UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  action     TEXT NOT NULL CHECK (action IN ('save', 'skip')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX swipes_user_idx ON public.swipes (user_id, action);

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "swipes: user can read own"
  ON public.swipes FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "swipes: user can insert own"
  ON public.swipes FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "swipes: user can update own"
  ON public.swipes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "swipes: user can delete own"
  ON public.swipes FOR DELETE USING (auth.uid() = user_id);



-- ------------------------------------------------------------------------------
-- 6. TRADE FUNCTIONS (the only way trade status changes)
-- ------------------------------------------------------------------------------

-- Receiver accepts a pending offer. Both items become in_trade, and every other
-- pending offer involving either item is automatically declined.
CREATE OR REPLACE FUNCTION public.accept_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t public.trades;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = p_trade_id FOR UPDATE;
  IF t IS NULL OR t.receiver_id <> auth.uid() THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;
  IF t.status <> 'pending' THEN
    RAISE EXCEPTION 'This offer is no longer pending';
  END IF;

  -- Lock both items and make sure they're still available.
  PERFORM 1 FROM public.items
    WHERE id IN (t.offered_item_id, t.requested_item_id) AND status = 'available'
    FOR UPDATE;
  IF (SELECT count(*) FROM public.items
      WHERE id IN (t.offered_item_id, t.requested_item_id) AND status = 'available') <> 2 THEN
    RAISE EXCEPTION 'One of the items is no longer available';
  END IF;

  UPDATE public.trades SET status = 'accepted', updated_at = now() WHERE id = t.id;

  UPDATE public.items SET status = 'in_trade'
    WHERE id IN (t.offered_item_id, t.requested_item_id);

  UPDATE public.trades SET status = 'declined', updated_at = now()
    WHERE status = 'pending'
      AND id <> t.id
      AND (offered_item_id   IN (t.offered_item_id, t.requested_item_id)
        OR requested_item_id IN (t.offered_item_id, t.requested_item_id));
END;
$$;

-- Receiver declines a pending offer.
CREATE OR REPLACE FUNCTION public.decline_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.trades SET status = 'declined', updated_at = now()
    WHERE id = p_trade_id AND receiver_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Offer not found or no longer pending';
  END IF;
END;
$$;

-- Initiator withdraws a pending offer, OR either party backs out of an
-- accepted trade (items go back to available).
CREATE OR REPLACE FUNCTION public.cancel_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t public.trades;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = p_trade_id FOR UPDATE;
  IF t IS NULL OR auth.uid() NOT IN (t.initiator_id, t.receiver_id) THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;

  IF t.status = 'pending' AND t.initiator_id = auth.uid() THEN
    UPDATE public.trades SET status = 'cancelled', updated_at = now() WHERE id = t.id;
  ELSIF t.status = 'accepted' THEN
    UPDATE public.trades SET status = 'cancelled', updated_at = now() WHERE id = t.id;
    UPDATE public.items SET status = 'available'
      WHERE id IN (t.offered_item_id, t.requested_item_id);
  ELSE
    RAISE EXCEPTION 'This trade cannot be cancelled';
  END IF;
END;
$$;

-- Each party confirms the swap happened. When both have confirmed, the trade
-- is completed and both items are marked traded.
CREATE OR REPLACE FUNCTION public.confirm_trade(p_trade_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t public.trades;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = p_trade_id FOR UPDATE;
  IF t IS NULL OR auth.uid() NOT IN (t.initiator_id, t.receiver_id) THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;
  IF t.status <> 'accepted' THEN
    RAISE EXCEPTION 'Only accepted trades can be completed';
  END IF;

  IF auth.uid() = t.initiator_id THEN
    t.initiator_confirmed := true;
  ELSE
    t.receiver_confirmed := true;
  END IF;

  IF t.initiator_confirmed AND t.receiver_confirmed THEN
    UPDATE public.trades
      SET initiator_confirmed = true, receiver_confirmed = true,
          status = 'completed', updated_at = now()
      WHERE id = t.id;
    UPDATE public.items SET status = 'traded'
      WHERE id IN (t.offered_item_id, t.requested_item_id);
    RETURN 'completed';
  END IF;

  UPDATE public.trades
    SET initiator_confirmed = t.initiator_confirmed,
        receiver_confirmed  = t.receiver_confirmed,
        updated_at = now()
    WHERE id = t.id;
  RETURN 'waiting';
END;
$$;

-- Public trust stats for a profile (trades are private, so this is exposed via a function).
CREATE OR REPLACE FUNCTION public.get_profile_stats(p_user_id UUID)
RETURNS TABLE (avg_rating NUMERIC, review_count BIGINT, trades_completed BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    (SELECT round(avg(score)::numeric, 1) FROM public.reviews WHERE ratee_id = p_user_id),
    (SELECT count(*) FROM public.reviews WHERE ratee_id = p_user_id),
    (SELECT count(*) FROM public.trades
      WHERE status = 'completed' AND p_user_id IN (initiator_id, receiver_id));
$$;

REVOKE EXECUTE ON FUNCTION public.accept_trade(UUID), public.decline_trade(UUID),
  public.cancel_trade(UUID), public.confirm_trade(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_trade(UUID), public.decline_trade(UUID),
  public.cancel_trade(UUID), public.confirm_trade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_stats(UUID) TO anon, authenticated;


-- ------------------------------------------------------------------------------
-- 7. REALTIME (live chat + live offer status)
-- ------------------------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages, public.trades;


-- ------------------------------------------------------------------------------
-- 8. STORAGE: item photos
-- ------------------------------------------------------------------------------
-- Files are stored as  item-images/{user_id}/{filename}
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('item-images', 'item-images', true, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "item-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

CREATE POLICY "item-images: upload to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "item-images: delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);
