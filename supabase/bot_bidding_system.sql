-- ==============================================================================
-- BOT BIDDING & OFFER INITIATION SYSTEM
-- Enables bots to automatically or on-demand make trade offers ("bids") on user items
-- ==============================================================================

-- 1. Core function: Bot makes a pending trade offer on a specified item
CREATE OR REPLACE FUNCTION public.bot_bid_on_item(p_target_item_id UUID, p_bot_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_item public.items;
  v_bot_id UUID;
  v_bot_item public.items;
  v_trade_id UUID;
BEGIN
  -- 1. Find target item
  SELECT * INTO v_target_item 
  FROM public.items 
  WHERE id = p_target_item_id AND status = 'available';

  IF v_target_item IS NULL THEN
    RAISE EXCEPTION 'Target item not found or not currently available';
  END IF;

  -- 2. Select a bot who is not the item owner
  IF p_bot_id IS NOT NULL THEN
    v_bot_id := p_bot_id;
  ELSE
    SELECT id INTO v_bot_id 
    FROM public.profiles 
    WHERE is_bot = true AND id <> v_target_item.user_id 
    ORDER BY random() 
    LIMIT 1;
  END IF;

  IF v_bot_id IS NULL THEN
    RAISE EXCEPTION 'No eligible bot found';
  END IF;

  -- 3. Pick an available item owned by this bot
  SELECT * INTO v_bot_item 
  FROM public.items 
  WHERE user_id = v_bot_id AND status = 'available'
  ORDER BY random() 
  LIMIT 1;

  -- If this bot has no available items, pick any bot that does
  IF v_bot_item IS NULL THEN
    SELECT i.* INTO v_bot_item 
    FROM public.items i
    JOIN public.profiles p ON p.id = i.user_id
    WHERE p.is_bot = true AND i.user_id <> v_target_item.user_id AND i.status = 'available'
    ORDER BY random() 
    LIMIT 1;

    IF v_bot_item IS NOT NULL THEN
      v_bot_id := v_bot_item.user_id;
    ELSE
      RAISE EXCEPTION 'No available bot items to offer';
    END IF;
  END IF;

  -- 4. Check if a pending trade already exists between these two items
  SELECT id INTO v_trade_id 
  FROM public.trades 
  WHERE offered_item_id = v_bot_item.id 
    AND requested_item_id = v_target_item.id 
    AND status = 'pending';

  IF v_trade_id IS NOT NULL THEN
    RETURN v_trade_id;
  END IF;

  -- 5. Insert pending trade offer (triggers notify_on_new_trade automatically)
  INSERT INTO public.trades (initiator_id, receiver_id, offered_item_id, requested_item_id, status)
  VALUES (v_bot_id, v_target_item.user_id, v_bot_item.id, v_target_item.id, 'pending')
  RETURNING id INTO v_trade_id;

  RETURN v_trade_id;
END;
$$;

-- Allow frontend client (authenticated or anon) to call this RPC
GRANT EXECUTE ON FUNCTION public.bot_bid_on_item(UUID, UUID) TO authenticated, anon;


-- 2. Auto-bid on newly listed items trigger (Optional / Configurable)
-- Automatically triggers a bot offer whenever a real user lists a new available item
CREATE OR REPLACE FUNCTION public.trigger_bot_bid_on_new_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_bot BOOLEAN;
BEGIN
  -- Only trigger for non-bot users
  SELECT is_bot INTO v_is_bot FROM public.profiles WHERE id = NEW.user_id;
  IF v_is_bot IS NOT TRUE AND NEW.status = 'available' THEN
    -- Attempt to submit an offer from a local bot
    BEGIN
      PERFORM public.bot_bid_on_item(NEW.id);
    EXCEPTION WHEN OTHERS THEN
      -- Silently ignore if no bot items available
      NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bot_bid_on_new_item ON public.items;
CREATE TRIGGER trg_bot_bid_on_new_item
  AFTER INSERT ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_bot_bid_on_new_item();


-- 3. Execute immediate bot bids on bentest's existing available items right now!
DO $$
DECLARE
  r RECORD;
  v_new_trade_id UUID;
BEGIN
  FOR r IN (
    SELECT id, title 
    FROM public.items 
    WHERE user_id = '651cc925-10e0-4da6-84d2-b09a961b1362' -- bentest
      AND status = 'available'
  ) LOOP
    BEGIN
      v_new_trade_id := public.bot_bid_on_item(r.id);
      RAISE NOTICE 'Bot placed offer on % (trade: %)', r.title, v_new_trade_id;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not place offer on %: %', r.title, SQLERRM;
    END;
  END LOOP;
END;
$$;
