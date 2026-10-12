-- ------------------------------------------------------------------------------
-- SWITCHR NOTIFICATIONS SYSTEM
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type       TEXT NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT,
  link       TEXT,
  read       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON public.notifications (user_id) WHERE read = false;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications: user can read own" ON public.notifications;
CREATE POLICY "notifications: user can read own"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications: user can update own" ON public.notifications;
CREATE POLICY "notifications: user can update own"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications: user can delete own" ON public.notifications;
CREATE POLICY "notifications: user can delete own"
  ON public.notifications FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications: anyone authenticated can insert" ON public.notifications;
CREATE POLICY "notifications: anyone authenticated can insert"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Realtime publication for instant delivery
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- RPC: Mark all notifications read for current user
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true
  WHERE user_id = auth.uid() AND read = false;
END;
$$;

-- ------------------------------------------------------------------------------
-- TRIGGER 1: New Trade Offer Received
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_new_trade()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_username TEXT;
  v_offered_title TEXT;
  v_requested_title TEXT;
BEGIN
  SELECT username INTO v_actor_username FROM public.profiles WHERE id = NEW.initiator_id;
  SELECT title INTO v_offered_title FROM public.items WHERE id = NEW.offered_item_id;
  SELECT title INTO v_requested_title FROM public.items WHERE id = NEW.requested_item_id;

  INSERT INTO public.notifications (user_id, actor_id, type, title, content, link)
  VALUES (
    NEW.receiver_id,
    NEW.initiator_id,
    'offer_received',
    'New trade offer from @' || COALESCE(v_actor_username, 'trader'),
    'Offered "' || COALESCE(v_offered_title, 'an item') || '" for your "' || COALESCE(v_requested_title, 'item') || '"',
    '/offers/' || NEW.requested_item_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_trade ON public.trades;
CREATE TRIGGER trg_notify_new_trade
  AFTER INSERT ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_trade();

-- ------------------------------------------------------------------------------
-- TRIGGER 2: Trade Status Updates (Accepted, Confirmed, Cancelled, Completed)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_trade_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_init_username TEXT;
  v_recv_username TEXT;
BEGIN
  SELECT username INTO v_init_username FROM public.profiles WHERE id = NEW.initiator_id;
  SELECT username INTO v_recv_username FROM public.profiles WHERE id = NEW.receiver_id;

  -- 1. Offer Accepted
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, link)
    VALUES (
      NEW.initiator_id,
      NEW.receiver_id,
      'offer_accepted',
      'Offer accepted! 🎉',
      '@' || COALESCE(v_recv_username, 'trader') || ' accepted your swap. The trade chat is now open!',
      '/trade/' || NEW.id
    );
  END IF;

  -- 2. Partner Confirmed Swap
  IF NEW.initiator_confirmed = true AND OLD.initiator_confirmed = false AND NEW.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, link)
    VALUES (
      NEW.receiver_id,
      NEW.initiator_id,
      'trade_confirmed',
      'Swap confirmed 🤝',
      '@' || COALESCE(v_init_username, 'trader') || ' confirmed they completed the swap.',
      '/trade/' || NEW.id
    );
  END IF;

  IF NEW.receiver_confirmed = true AND OLD.receiver_confirmed = false AND NEW.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, link)
    VALUES (
      NEW.initiator_id,
      NEW.receiver_id,
      'trade_confirmed',
      'Swap confirmed 🤝',
      '@' || COALESCE(v_recv_username, 'trader') || ' confirmed they completed the swap.',
      '/trade/' || NEW.id
    );
  END IF;

  -- 3. Trade Completed (Review Reminders for Both)
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, link)
    VALUES
    (
      NEW.initiator_id,
      NEW.receiver_id,
      'trade_completed',
      'Trade completed! ⭐',
      'You finished swapping with @' || COALESCE(v_recv_username, 'trader') || '. Don''t forget to leave a review!',
      '/trade/' || NEW.id
    ),
    (
      NEW.receiver_id,
      NEW.initiator_id,
      'trade_completed',
      'Trade completed! ⭐',
      'You finished swapping with @' || COALESCE(v_init_username, 'trader') || '. Don''t forget to leave a review!',
      '/trade/' || NEW.id
    );
  END IF;

  -- 4. Trade Cancelled
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Notify whichever user did not cancel if detectable, or notify both
    INSERT INTO public.notifications (user_id, actor_id, type, title, content, link)
    VALUES
    (
      NEW.initiator_id,
      NEW.receiver_id,
      'trade_cancelled',
      'Trade cancelled',
      'The trade was cancelled and items returned to available.',
      '/trades?tab=history'
    ),
    (
      NEW.receiver_id,
      NEW.initiator_id,
      'trade_cancelled',
      'Trade cancelled',
      'The trade was cancelled and items returned to available.',
      '/trades?tab=history'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_trade_update ON public.trades;
CREATE TRIGGER trg_notify_trade_update
  AFTER UPDATE ON public.trades
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_trade_update();

-- ------------------------------------------------------------------------------
-- TRIGGER 3: New Review Left
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rater_username TEXT;
BEGIN
  SELECT username INTO v_rater_username FROM public.profiles WHERE id = NEW.rater_id;

  INSERT INTO public.notifications (user_id, actor_id, type, title, content, link)
  VALUES (
    NEW.ratee_id,
    NEW.rater_id,
    'review',
    'New review from @' || COALESCE(v_rater_username, 'trader') || ' ⭐',
    'Left you a ' || NEW.score || '-star rating' || CASE WHEN NEW.comment IS NOT NULL AND NEW.comment != '' THEN ': "' || left(NEW.comment, 80) || '"' ELSE '!' END,
    '/me'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_review ON public.reviews;
CREATE TRIGGER trg_notify_review
  AFTER INSERT ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_review();

-- ------------------------------------------------------------------------------
-- TRIGGER 4: Item Shortlisted
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_shortlist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_item_title TEXT;
  v_swiper_username TEXT;
BEGIN
  IF NEW.action = 'save' THEN
    SELECT user_id, title INTO v_owner_id, v_item_title FROM public.items WHERE id = NEW.item_id;
    SELECT username INTO v_swiper_username FROM public.profiles WHERE id = NEW.user_id;

    IF v_owner_id IS NOT NULL AND v_owner_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, actor_id, type, title, content, link)
      VALUES (
        v_owner_id,
        NEW.user_id,
        'shortlist',
        'Item shortlisted! ❤️',
        '@' || COALESCE(v_swiper_username, 'Someone') || ' saved your "' || COALESCE(v_item_title, 'item') || '" to their shortlist.',
        '/me'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_shortlist ON public.swipes;
CREATE TRIGGER trg_notify_shortlist
  AFTER INSERT ON public.swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_shortlist();
