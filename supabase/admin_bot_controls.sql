-- ==============================================================================
-- SwitchR — Advanced Admin Bot Mission Control Migration
-- ==============================================================================
-- Powers expanded bot controls:
-- 1. App settings table (with dynamic auto_bot_bidding toggle).
-- 2. admin_get_biddable_items: Search & select ANY user's items for bot bidding.
-- 3. admin_batch_bot_bid: One-click market stimulation (bot bids on unbid listings).
-- 4. admin_get_bot_trades: Inspect all trades involving bots.
-- 5. admin_bot_accept_trade / admin_bot_decline_trade: Manage bot trades on demand.
-- 6. admin_bot_send_message: Speak as any bot in a trade chat.
-- 7. admin_bot_add_item: Quick inventory injection for bots.
-- 8. admin_set_auto_bot_bidding: Master toggle for background automated bot bids.
-- ==============================================================================

-- 1. App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings: anyone can read" ON public.app_settings;
CREATE POLICY "app_settings: anyone can read"
  ON public.app_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "app_settings: admin can update" ON public.app_settings;
CREATE POLICY "app_settings: admin can update"
  ON public.app_settings FOR ALL USING (public.is_admin());

INSERT INTO public.app_settings (key, value)
VALUES 
  ('auto_bot_bidding', 'true'::jsonb),
  ('auto_bot_chat', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. Update trigger to respect auto_bot_bidding setting
CREATE OR REPLACE FUNCTION public.trigger_bot_bid_on_new_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_bot BOOLEAN;
  v_auto_enabled BOOLEAN;
BEGIN
  -- Check master switch
  SELECT COALESCE((value)::boolean, true) INTO v_auto_enabled 
  FROM public.app_settings 
  WHERE key = 'auto_bot_bidding';

  IF v_auto_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Only trigger for human items
  SELECT is_bot INTO v_is_bot FROM public.profiles WHERE id = NEW.user_id;
  IF v_is_bot IS NOT TRUE AND NEW.status = 'available' THEN
    BEGIN
      PERFORM public.bot_bid_on_item(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

-- 3. RPC: admin_get_biddable_items
-- Returns all available items (human and other users) with current bot bid counts
CREATE OR REPLACE FUNCTION public.admin_get_biddable_items(
  p_search TEXT DEFAULT '',
  p_owner_id UUID DEFAULT NULL,
  p_category TEXT DEFAULT 'all',
  p_unbid_only BOOLEAN DEFAULT false,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  condition TEXT,
  image_url TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  user_id UUID,
  owner_username TEXT,
  owner_location TEXT,
  owner_is_bot BOOLEAN,
  pending_bot_offers_count BIGINT,
  total_offers_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    i.id,
    i.title,
    i.description,
    i.category,
    i.condition,
    i.image_url,
    i.status,
    i.created_at,
    i.user_id,
    p.username AS owner_username,
    p.location_name AS owner_location,
    COALESCE(p.is_bot, false) AS owner_is_bot,
    (
      SELECT COUNT(*)
      FROM public.trades t
      JOIN public.profiles bot_p ON bot_p.id = t.initiator_id
      WHERE t.requested_item_id = i.id
        AND t.status = 'pending'
        AND bot_p.is_bot = true
    ) AS pending_bot_offers_count,
    (
      SELECT COUNT(*)
      FROM public.trades t
      WHERE t.requested_item_id = i.id
        AND t.status = 'pending'
    ) AS total_offers_count
  FROM public.items i
  JOIN public.profiles p ON p.id = i.user_id
  WHERE i.status = 'available'
    AND (p_owner_id IS NULL OR i.user_id = p_owner_id)
    AND (p_category = 'all' OR i.category ILIKE p_category)
    AND (
      p_search = '' 
      OR i.title ILIKE '%' || p_search || '%'
      OR p.username ILIKE '%' || p_search || '%'
      OR p.location_name ILIKE '%' || p_search || '%'
    )
    AND (
      p_unbid_only IS NOT TRUE 
      OR NOT EXISTS (
        SELECT 1 FROM public.trades t 
        JOIN public.profiles bot_p ON bot_p.id = t.initiator_id
        WHERE t.requested_item_id = i.id AND t.status = 'pending' AND bot_p.is_bot = true
      )
    )
  ORDER BY i.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_biddable_items(TEXT, UUID, TEXT, BOOLEAN, INT, INT) TO authenticated;

-- 4. RPC: admin_batch_bot_bid
-- One-click market stimulation: automatically commands bots to bid on up to N unbid human items
CREATE OR REPLACE FUNCTION public.admin_batch_bot_bid(
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_trade_id UUID;
  v_count INT := 0;
  v_created_trades JSONB := '[]'::jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  FOR r IN (
    SELECT i.id, i.title, p.username AS owner_name
    FROM public.items i
    JOIN public.profiles p ON p.id = i.user_id
    WHERE i.status = 'available'
      AND COALESCE(p.is_bot, false) = false
      AND NOT EXISTS (
        SELECT 1 FROM public.trades t
        JOIN public.profiles bot_p ON bot_p.id = t.initiator_id
        WHERE t.requested_item_id = i.id AND t.status = 'pending' AND bot_p.is_bot = true
      )
    ORDER BY i.created_at DESC
    LIMIT p_limit
  ) LOOP
    BEGIN
      v_trade_id := public.bot_bid_on_item(r.id);
      IF v_trade_id IS NOT NULL THEN
        v_count := v_count + 1;
        v_created_trades := v_created_trades || jsonb_build_object(
          'item_id', r.id,
          'item_title', r.title,
          'owner', r.owner_name,
          'trade_id', v_trade_id
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'bids_created', v_count,
    'trades', v_created_trades
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_batch_bot_bid(INT) TO authenticated;

-- 5. RPC: admin_get_bot_trades
-- Inspects all active, pending, accepted, or completed trades where a bot is a party
CREATE OR REPLACE FUNCTION public.admin_get_bot_trades(
  p_status TEXT DEFAULT 'all',
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  trade_id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  bot_id UUID,
  bot_username TEXT,
  bot_location TEXT,
  human_id UUID,
  human_username TEXT,
  offered_item_id UUID,
  offered_item_title TEXT,
  offered_item_image TEXT,
  requested_item_id UUID,
  requested_item_title TEXT,
  requested_item_image TEXT,
  bot_is_initiator BOOLEAN,
  last_message TEXT,
  last_message_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    t.id AS trade_id,
    t.status,
    t.created_at,
    t.updated_at,
    CASE WHEN p_init.is_bot THEN p_init.id ELSE p_recv.id END AS bot_id,
    CASE WHEN p_init.is_bot THEN p_init.username ELSE p_recv.username END AS bot_username,
    CASE WHEN p_init.is_bot THEN p_init.location_name ELSE p_recv.location_name END AS bot_location,
    CASE WHEN p_init.is_bot THEN p_recv.id ELSE p_init.id END AS human_id,
    CASE WHEN p_init.is_bot THEN p_recv.username ELSE p_init.username END AS human_username,
    off_item.id AS offered_item_id,
    off_item.title AS offered_item_title,
    off_item.image_url AS offered_item_image,
    req_item.id AS requested_item_id,
    req_item.title AS requested_item_title,
    req_item.image_url AS requested_item_image,
    p_init.is_bot AS bot_is_initiator,
    (
      SELECT m.content 
      FROM public.messages m 
      WHERE m.trade_id = t.id 
      ORDER BY m.created_at DESC 
      LIMIT 1
    ) AS last_message,
    (
      SELECT m.created_at 
      FROM public.messages m 
      WHERE m.trade_id = t.id 
      ORDER BY m.created_at DESC 
      LIMIT 1
    ) AS last_message_at
  FROM public.trades t
  JOIN public.profiles p_init ON p_init.id = t.initiator_id
  JOIN public.profiles p_recv ON p_recv.id = t.receiver_id
  LEFT JOIN public.items off_item ON off_item.id = t.offered_item_id
  LEFT JOIN public.items req_item ON req_item.id = t.requested_item_id
  WHERE (p_init.is_bot = true OR p_recv.is_bot = true)
    AND (p_status = 'all' OR t.status = p_status)
  ORDER BY t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_bot_trades(TEXT, INT, INT) TO authenticated;

-- 6. RPC: admin_bot_accept_trade
CREATE OR REPLACE FUNCTION public.admin_bot_accept_trade(p_trade_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  PERFORM public.bot_auto_accept_trade(p_trade_id);

  RETURN jsonb_build_object('success', true, 'trade_id', p_trade_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bot_accept_trade(UUID) TO authenticated;

-- 7. RPC: admin_bot_send_message
-- Enables founder admin to send a message on behalf of a bot in a trade chat
CREATE OR REPLACE FUNCTION public.admin_bot_send_message(
  p_trade_id UUID,
  p_content TEXT,
  p_bot_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trade public.trades;
  v_bot_id UUID := p_bot_id;
  v_msg_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT * INTO v_trade FROM public.trades WHERE id = p_trade_id;
  IF v_trade IS NULL THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;

  IF v_bot_id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_trade.receiver_id AND is_bot = true) THEN
      v_bot_id := v_trade.receiver_id;
    ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_trade.initiator_id AND is_bot = true) THEN
      v_bot_id := v_trade.initiator_id;
    ELSE
      RAISE EXCEPTION 'No bot participant in this trade';
    END IF;
  END IF;

  INSERT INTO public.messages (trade_id, sender_id, content)
  VALUES (p_trade_id, v_bot_id, p_content)
  RETURNING id INTO v_msg_id;

  RETURN jsonb_build_object(
    'success', true,
    'message_id', v_msg_id,
    'bot_id', v_bot_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bot_send_message(UUID, TEXT, UUID) TO authenticated;

-- 8. RPC: admin_bot_add_item
-- Allows admin to quickly create inventory for any bot
CREATE OR REPLACE FUNCTION public.admin_bot_add_item(
  p_bot_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_condition TEXT,
  p_image_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot public.profiles;
  v_item_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT * INTO v_bot FROM public.profiles WHERE id = p_bot_id AND is_bot = true;
  IF v_bot IS NULL THEN
    RAISE EXCEPTION 'Bot not found';
  END IF;

  INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
  VALUES (
    p_bot_id,
    p_title,
    COALESCE(p_description, 'Offered by ' || v_bot.username || ' in ' || COALESCE(v_bot.location_name, 'Liverpool')),
    p_category,
    p_condition,
    p_image_url,
    'available'
  )
  RETURNING id INTO v_item_id;

  RETURN jsonb_build_object(
    'success', true,
    'item_id', v_item_id,
    'bot_id', p_bot_id,
    'title', p_title
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_bot_add_item(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 9. RPC: admin_set_auto_bot_bidding
CREATE OR REPLACE FUNCTION public.admin_set_auto_bot_bidding(p_enabled BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  INSERT INTO public.app_settings (key, value, updated_at)
  VALUES ('auto_bot_bidding', to_jsonb(p_enabled), now())
  ON CONFLICT (key) DO UPDATE 
  SET value = to_jsonb(p_enabled), updated_at = now();

  RETURN jsonb_build_object('success', true, 'auto_bot_bidding', p_enabled);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_auto_bot_bidding(BOOLEAN) TO authenticated;

-- 10. RPC: admin_get_auto_bot_bidding
CREATE OR REPLACE FUNCTION public.admin_get_auto_bot_bidding()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((value)::boolean, true)
  FROM public.app_settings
  WHERE key = 'auto_bot_bidding';
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_auto_bot_bidding() TO authenticated;

NOTIFY pgrst, 'reload schema';
