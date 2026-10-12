-- ==============================================================================
-- CLEANUP SCRIPT: KEEP ONLY USER, LEWIS CUNNINGHAM, AND 20 LIVERPOOL BOTS
-- ==============================================================================

DO $$
DECLARE
  v_kept_ids UUID[];
  v_deleted_auth INT;
  v_deleted_profiles INT;
  v_deleted_items INT;
  v_deleted_trades INT;
BEGIN
  -- 1. Gather all IDs to KEEP:
  --    - You: 651cc925-10e0-4da6-84d2-b09a961b1362 (bentest)
  --    - Lewis Cunningham: 2dc831de-f9bc-4555-9826-305bd75e7708 (lewc1993)
  --    - 20 Liverpool Bots: profiles where is_bot = true
  SELECT array_agg(id) INTO v_kept_ids
  FROM (
    SELECT '651cc925-10e0-4da6-84d2-b09a961b1362'::uuid AS id
    UNION
    SELECT '2dc831de-f9bc-4555-9826-305bd75e7708'::uuid AS id
    UNION
    SELECT id FROM public.profiles WHERE is_bot = true
  ) sub;

  RAISE NOTICE 'Total accounts preserved: %', array_length(v_kept_ids, 1);

  -- 2. Delete trades involving any account not in v_kept_ids
  DELETE FROM public.trades
  WHERE initiator_id != ALL(v_kept_ids)
     OR receiver_id  != ALL(v_kept_ids);

  -- 3. Delete messages sent by or belonging to removed accounts
  DELETE FROM public.messages
  WHERE sender_id != ALL(v_kept_ids)
     OR trade_id NOT IN (SELECT id FROM public.trades);

  -- 4. Delete reviews involving removed accounts
  DELETE FROM public.reviews
  WHERE rater_id != ALL(v_kept_ids)
     OR ratee_id != ALL(v_kept_ids)
     OR trade_id NOT IN (SELECT id FROM public.trades);

  -- 5. Delete swipes made by or for removed accounts/items
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'swipes') THEN
    DELETE FROM public.swipes
    WHERE user_id != ALL(v_kept_ids);
  END IF;

  -- 6. Delete items belonging to removed accounts
  DELETE FROM public.items
  WHERE user_id != ALL(v_kept_ids);

  -- 7. Delete profiles of removed accounts
  DELETE FROM public.profiles
  WHERE id != ALL(v_kept_ids);

  -- 8. Delete auth.users of removed accounts
  DELETE FROM auth.users
  WHERE id != ALL(v_kept_ids);

  RAISE NOTICE 'Cleanup complete successfully.';
END $$;

-- Verification counts
SELECT
  (SELECT count(*) FROM auth.users) AS remaining_auth_users,
  (SELECT count(*) FROM public.profiles) AS remaining_profiles,
  (SELECT count(*) FROM public.profiles WHERE is_bot = true) AS remaining_bots,
  (SELECT count(*) FROM public.profiles WHERE is_bot = false) AS remaining_humans,
  (SELECT count(*) FROM public.items) AS remaining_items,
  (SELECT count(*) FROM public.trades) AS remaining_trades;
