-- ==============================================================================
-- SOC 2 & PRIVACY HARDENING MIGRATION
-- ==============================================================================

-- 1. Self-Serve GDPR / SOC 2 Account & Data Erasure
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete all user swipes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'swipes') THEN
    DELETE FROM public.swipes WHERE user_id = v_user_id;
  END IF;

  -- Delete user reviews
  DELETE FROM public.reviews WHERE rater_id = v_user_id OR ratee_id = v_user_id;

  -- Delete user messages
  DELETE FROM public.messages WHERE sender_id = v_user_id;

  -- Delete user trades
  DELETE FROM public.trades WHERE initiator_id = v_user_id OR receiver_id = v_user_id;

  -- Delete user items
  DELETE FROM public.items WHERE user_id = v_user_id;

  -- Delete user profile
  DELETE FROM public.profiles WHERE id = v_user_id;

  -- Delete user from auth.users
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_user_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- 2. Guard against non-admin modification of is_bot column
CREATE OR REPLACE FUNCTION public.protect_profile_bot_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If is_bot is being changed by a regular user, force it to keep its old value
  IF NEW.is_bot IS DISTINCT FROM OLD.is_bot AND auth.role() <> 'service_role' THEN
    NEW.is_bot := OLD.is_bot;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_bot_flag ON public.profiles;
CREATE TRIGGER trg_protect_profile_bot_flag
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_bot_flag();
