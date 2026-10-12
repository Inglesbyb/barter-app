-- ==============================================================================
-- LIVE LIVERPOOL BOTS: REAL-TIME CHAT, AUTO-ACCEPT & AUTO-CONFIRM
-- ==============================================================================

-- 1. Ensure is_bot column exists on profiles and existing bots are flagged
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bot BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles
SET is_bot = true
WHERE username IN (
  'brixton_3', 'beeston_5', 'didsbury_7', 'headingley_9', 'shoreditch_11',
  'finnieston_13', 'balgownie_20', 'jesmond_19', 'leith_18', 'stockbridge_17',
  'kelvinbridge_16', 'allerton_14', 'chorlton_12', 'camden_10', 'clifton_8',
  'saltaire_6', 'heaton_4', 'hackney_2', 'totterdown_1', 'ancoats_15'
);

-- 2. Update locations to iconic Liverpool & Merseyside neighborhoods so all test bots are localized
UPDATE public.profiles SET location_name = 'Baltic Triangle, Liverpool' WHERE username = 'balgownie_20';
UPDATE public.profiles SET location_name = 'Lark Lane, Liverpool' WHERE username = 'jesmond_19';
UPDATE public.profiles SET location_name = 'Crosby Beach, Liverpool' WHERE username = 'leith_18';
UPDATE public.profiles SET location_name = 'Allerton, Liverpool' WHERE username = 'allerton_14';
UPDATE public.profiles SET location_name = 'Anfield, Liverpool' WHERE username = 'brixton_3';
UPDATE public.profiles SET location_name = 'Woolton Village, Liverpool' WHERE username = 'kelvinbridge_16';
UPDATE public.profiles SET location_name = 'Birkenhead, Wirral' WHERE username = 'stockbridge_17';
UPDATE public.profiles SET location_name = 'Liverpool ONE / City Centre' WHERE username = 'didsbury_7';
UPDATE public.profiles SET location_name = 'Georgian Quarter, Liverpool' WHERE username = 'headingley_9';
UPDATE public.profiles SET location_name = 'Aigburth / Sefton Park' WHERE username = 'camden_10';
UPDATE public.profiles SET location_name = 'Waterloo, Liverpool' WHERE username = 'finnieston_13';
UPDATE public.profiles SET location_name = 'Bold Street, Liverpool' WHERE username = 'shoreditch_11';
UPDATE public.profiles SET location_name = 'Everton, Liverpool' WHERE username = 'beeston_5';
UPDATE public.profiles SET location_name = 'Otterspool, Liverpool' WHERE username = 'chorlton_12';
UPDATE public.profiles SET location_name = 'Mossley Hill, Liverpool' WHERE username = 'clifton_8';
UPDATE public.profiles SET location_name = 'Penny Lane, Liverpool' WHERE username = 'saltaire_6';
UPDATE public.profiles SET location_name = 'Kirkdale, Liverpool' WHERE username = 'heaton_4';
UPDATE public.profiles SET location_name = 'Bootle, Liverpool' WHERE username = 'hackney_2';
UPDATE public.profiles SET location_name = 'West Derby, Liverpool' WHERE username = 'totterdown_1';
UPDATE public.profiles SET location_name = 'Ropewalks, Liverpool' WHERE username = 'ancoats_15';

-- 3. Function: bot_auto_accept_trade
CREATE OR REPLACE FUNCTION public.bot_auto_accept_trade(p_trade_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t public.trades;
  bot_user public.profiles;
  loc TEXT;
  greeting TEXT;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = p_trade_id FOR UPDATE;
  IF t IS NULL OR t.status <> 'pending' THEN
    RETURN;
  END IF;

  SELECT * INTO bot_user FROM public.profiles WHERE id = t.receiver_id AND is_bot = true;
  IF bot_user IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.trades SET status = 'accepted', updated_at = now() WHERE id = t.id;
  UPDATE public.items SET status = 'in_trade'
    WHERE id IN (t.offered_item_id, t.requested_item_id);

  UPDATE public.trades SET status = 'declined', updated_at = now()
    WHERE status = 'pending'
      AND id <> t.id
      AND (offered_item_id IN (t.offered_item_id, t.requested_item_id)
        OR requested_item_id IN (t.offered_item_id, t.requested_item_id));

  loc := COALESCE(bot_user.location_name, 'Liverpool');
  IF loc ILIKE '%Baltic%' THEN
    greeting := 'Alright mate! Deal looks boss to me, happy to swap! I am down around Baltic Triangle by the Baltic Market most days. When are you free to meet up?';
  ELSIF loc ILIKE '%Lark Lane%' OR loc ILIKE '%Sefton%' OR loc ILIKE '%Aigburth%' THEN
    greeting := 'Sound mate! Proper good swap, offer accepted! I am based near Lark Lane / Sefton Park. Free most afternoons to meet outside Keiths or by the park gates.';
  ELSIF loc ILIKE '%Crosby%' OR loc ILIKE '%Waterloo%' THEN
    greeting := 'Nice one! Happy to swap this. I am out in Crosby near the beach and Waterloo station. Let me know when suits you to meet!';
  ELSIF loc ILIKE '%Anfield%' OR loc ILIKE '%Everton%' THEN
    greeting := 'Sound mate! Offer accepted, buzzing for this swap! I am round Anfield / Stanley Park, or can nip into town. What days work for you?';
  ELSIF loc ILIKE '%Allerton%' OR loc ILIKE '%Woolton%' THEN
    greeting := 'Spot on! Accepted the swap. I am based south Liverpool way around Allerton / Woolton. Happy to meet locally or in town around Liverpool ONE!';
  ELSIF loc ILIKE '%Bold Street%' OR loc ILIKE '%City Centre%' OR loc ILIKE '%ONE%' THEN
    greeting := 'Boss swap! Offer accepted mate. I am right by town / Bold Street, so Liverpool ONE or Central Station is dead easy for me. When suits?';
  ELSE
    greeting := 'Alright mate! That looks like a boss swap, happy to do it! I am based in ' || loc || '. Whereabouts are you, or do you want to meet in town?';
  END IF;

  INSERT INTO public.messages (trade_id, sender_id, content)
  VALUES (t.id, bot_user.id, greeting);
END;
$$;

-- 4. Function: bot_reply_to_trade
CREATE OR REPLACE FUNCTION public.bot_reply_to_trade(p_trade_id UUID, p_user_message TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t public.trades;
  bot_user public.profiles;
  loc TEXT;
  msg TEXT;
  reply TEXT;
BEGIN
  SELECT * INTO t FROM public.trades WHERE id = p_trade_id;
  IF t IS NULL THEN
    RAISE EXCEPTION 'Trade not found';
  END IF;

  -- Determine which participant is the bot
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = t.receiver_id AND is_bot = true) THEN
    SELECT * INTO bot_user FROM public.profiles WHERE id = t.receiver_id;
  ELSIF EXISTS (SELECT 1 FROM public.profiles WHERE id = t.initiator_id AND is_bot = true) THEN
    SELECT * INTO bot_user FROM public.profiles WHERE id = t.initiator_id;
  ELSE
    RETURN NULL;
  END IF;

  loc := COALESCE(bot_user.location_name, 'Liverpool');
  msg := lower(trim(COALESCE(p_user_message, '')));

  -- Matching intent & Liverpool localized replies
  IF msg ~* '(where|meet|place|spot|location|town|baltic|lark|lane|crosby|one|bold|central|station|market|park|waterloo|anfield|sefton|woolton|allerton)' THEN
    IF loc ILIKE '%Baltic%' THEN
      reply := 'Sound! How about Baltic Market or outside Camp and Furnace on Jamaica Street? Or I can easily walk up to Liverpool ONE if you are coming into town.';
    ELSIF loc ILIKE '%Lark Lane%' OR loc ILIKE '%Sefton%' OR loc ILIKE '%Aigburth%' THEN
      reply := 'Boss! Keiths Wine Bar on Lark Lane is perfect, or right outside the Albert Pub. Or if you prefer Sefton Park palm house gates, that is sound too.';
    ELSIF loc ILIKE '%Crosby%' OR loc ILIKE '%Waterloo%' THEN
      reply := 'Sound mate! Waterloo Station or anywhere along South Road works a treat. Or outside The Plaza cinema if you know it.';
    ELSIF loc ILIKE '%Anfield%' OR loc ILIKE '%Everton%' THEN
      reply := 'Spot on! Outside Stanley Park gates or near Anfield Road is easy for me, or I can jump on the bus into Queen Square bus station in town.';
    ELSIF loc ILIKE '%Allerton%' OR loc ILIKE '%Woolton%' THEN
      reply := 'Sound! Allerton Road outside Costa / The Three Pigeons, or Woolton Village outside Elephant Coffee works great for me.';
    ELSIF loc ILIKE '%Bold Street%' OR loc ILIKE '%City Centre%' OR loc ILIKE '%ONE%' THEN
      reply := 'Liverpool ONE outside John Lewis or Bold Street by St Lukes (the Bombed Out Church) is super easy for me to meet!';
    ELSE
      reply := 'Sound! Can meet locally around ' || loc || ', or outside Central Station / Liverpool ONE if meeting in town is easier for you.';
    END IF;

  ELSIF msg ~* '(when|time|today|tomorrow|tonight|weekend|saturday|sunday|monday|tuesday|wednesday|thursday|friday|hour|pm|am|now|soon|free|afternoon|morning)' THEN
    reply := 'Proper sound. I can do today after 5:30pm or anytime tomorrow afternoon. What time works best for you?';

  ELSIF msg ~* '(condition|working|work|photo|picture|damage|scratch|mark|box|charger|cable|size|clean|state|good)' THEN
    reply := 'It is in top condition mate, exactly like shown in the listing! Kept it in clean nick, fully working with no issues. Happy for you to check it over when we meet!';

  ELSIF msg ~* '(confirm|swapped|traded|received|got it|done|finished|thanks|thank you|cheers|ta|nice one|boss)' THEN
    reply := 'Nice one mate! Proper boss swap, made up with it. Thanks a lot! Have a great one.';

  ELSIF msg ~* '^(hi|hello|hiya|hey|alright|yo|good morning|good afternoon|good evening)' THEN
    reply := 'Alright mate! How is it going? Looking forward to this swap. What area are you travelling from, or do you fancy meeting in town?';

  ELSE
    reply := 'Sounds boss to me mate! Let me know what time and spot suits you and we will get it sorted.';
  END IF;

  -- Insert the bot message
  INSERT INTO public.messages (trade_id, sender_id, content)
  VALUES (t.id, bot_user.id, reply);

  RETURN reply;
END;
$$;

-- 5. Update confirm_trade to auto-complete when the other party is a bot, and auto-submit 5-star review
CREATE OR REPLACE FUNCTION public.confirm_trade(p_trade_id UUID)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  t public.trades;
  bot_partner_id UUID;
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
    -- check if receiver is bot
    SELECT id INTO bot_partner_id FROM public.profiles WHERE id = t.receiver_id AND is_bot = true;
    IF bot_partner_id IS NOT NULL THEN
      t.receiver_confirmed := true;
    END IF;
  ELSE
    t.receiver_confirmed := true;
    -- check if initiator is bot
    SELECT id INTO bot_partner_id FROM public.profiles WHERE id = t.initiator_id AND is_bot = true;
    IF bot_partner_id IS NOT NULL THEN
      t.initiator_confirmed := true;
    END IF;
  END IF;

  IF t.initiator_confirmed AND t.receiver_confirmed THEN
    UPDATE public.trades
      SET initiator_confirmed = true, receiver_confirmed = true,
          status = 'completed', updated_at = now()
      WHERE id = t.id;
    UPDATE public.items SET status = 'traded'
      WHERE id IN (t.offered_item_id, t.requested_item_id);

    -- If partner is a bot, bot leaves 5-star review for the user automatically!
    IF bot_partner_id IS NOT NULL THEN
      INSERT INTO public.reviews (trade_id, rater_id, ratee_id, score, comment)
      VALUES (
        t.id,
        bot_partner_id,
        auth.uid(),
        5,
        'Top trader, boss swap! Sound communication and quick meetup in Liverpool.'
      )
      ON CONFLICT (trade_id, rater_id) DO NOTHING;
    END IF;

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

-- 6. Permissions
REVOKE EXECUTE ON FUNCTION public.bot_auto_accept_trade(UUID), public.bot_reply_to_trade(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bot_auto_accept_trade(UUID), public.bot_reply_to_trade(UUID, TEXT) TO authenticated;
