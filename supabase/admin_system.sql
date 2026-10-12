-- ==============================================================================
-- SwitchR — Admin Mode & Moderation System Migration
-- ==============================================================================
-- 1. Adds `is_admin` and `is_banned` columns to `public.profiles`.
-- 2. Sets founder `@bentest` (651cc925-10e0-4da6-84d2-b09a961b1362) as is_admin = true.
-- 3. Hardens profile update trigger so regular users cannot tamper with admin/bot/ban flags.
-- 4. Creates helper function `public.is_admin()`.
-- 5. Enables RLS policies for Admins to view/delete all messages and view trades.
-- 6. Creates secure Admin RPCs:
--    - admin_get_users (inspect all users, bots, emails, items, trades, ban status)
--    - admin_toggle_ban_user (block/unblock users)
--    - admin_delete_user (permanently delete account and cascade all data)
--    - admin_get_all_messages (inspect all chat messages across trades)
--    - admin_delete_message (moderate/delete individual messages)
--    - admin_get_all_media (inspect all item images and chat photos)
--    - admin_delete_media (remove flagged images)
-- ==============================================================================

-- 1. Schema Extensions on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;

-- 2. Promote Founder to Admin
UPDATE public.profiles
SET is_admin = true
WHERE id = '651cc925-10e0-4da6-84d2-b09a961b1362'
   OR username = 'bentest';

-- 3. Security Helper Function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 4. Guard against non-admin modification of is_admin, is_bot, and is_banned columns
CREATE OR REPLACE FUNCTION public.protect_profile_security_flags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If not admin and not service role, forbid changing is_bot, is_admin, is_banned
  IF auth.role() <> 'service_role' AND NOT public.is_admin() THEN
    IF NEW.is_bot IS DISTINCT FROM OLD.is_bot THEN
      NEW.is_bot := OLD.is_bot;
    END IF;
    IF NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
      NEW.is_admin := OLD.is_admin;
    END IF;
    IF NEW.is_banned IS DISTINCT FROM OLD.is_banned THEN
      NEW.is_banned := OLD.is_banned;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_bot_flag ON public.profiles;
DROP TRIGGER IF EXISTS trg_protect_profile_security_flags ON public.profiles;

CREATE TRIGGER trg_protect_profile_security_flags
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_security_flags();

-- 5. Admin RLS Policies for Messages & Trades
DROP POLICY IF EXISTS "messages: admin can view all messages" ON public.messages;
CREATE POLICY "messages: admin can view all messages"
  ON public.messages FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "messages: admin can delete any message" ON public.messages;
CREATE POLICY "messages: admin can delete any message"
  ON public.messages FOR DELETE
  USING (public.is_admin());

DROP POLICY IF EXISTS "trades: admin can view all trades" ON public.trades;
CREATE POLICY "trades: admin can view all trades"
  ON public.trades FOR SELECT
  USING (public.is_admin());

-- 6. RPC: admin_get_users
-- Returns all registered users with emails from auth.users and activity counts
CREATE OR REPLACE FUNCTION public.admin_get_users(
  p_search TEXT DEFAULT '',
  p_filter TEXT DEFAULT 'all',
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  bio TEXT,
  location_name TEXT,
  created_at TIMESTAMPTZ,
  is_bot BOOLEAN,
  is_admin BOOLEAN,
  is_banned BOOLEAN,
  email TEXT,
  items_count BIGINT,
  trades_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.username,
    p.bio,
    p.location_name,
    p.created_at,
    COALESCE(p.is_bot, false) AS is_bot,
    COALESCE(p.is_admin, false) AS is_admin,
    COALESCE(p.is_banned, false) AS is_banned,
    COALESCE(u.email, 'bot@switchr.local') AS email,
    (SELECT COUNT(*) FROM public.items i WHERE i.user_id = p.id) AS items_count,
    (SELECT COUNT(*) FROM public.trades t WHERE t.initiator_id = p.id OR t.receiver_id = p.id) AS trades_count
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE (
    p_search = '' 
    OR p.username ILIKE '%' || p_search || '%' 
    OR u.email ILIKE '%' || p_search || '%'
    OR p.location_name ILIKE '%' || p_search || '%'
  )
  AND (
    p_filter = 'all'
    OR (p_filter = 'humans' AND COALESCE(p.is_bot, false) = false)
    OR (p_filter = 'bots' AND COALESCE(p.is_bot, false) = true)
    OR (p_filter = 'banned' AND COALESCE(p.is_banned, false) = true)
  )
  ORDER BY 
    CASE WHEN p.is_admin THEN 0 ELSE 1 END,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users(TEXT, TEXT, INT, INT) TO authenticated;

-- 7. RPC: admin_toggle_ban_user
CREATE OR REPLACE FUNCTION public.admin_toggle_ban_user(
  p_user_id UUID,
  p_banned BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_target_user public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot ban your own admin account';
  END IF;

  SELECT * INTO v_target_user FROM public.profiles WHERE id = p_user_id;
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_target_user.is_admin THEN
    RAISE EXCEPTION 'Cannot ban an admin user';
  END IF;

  UPDATE public.profiles
  SET is_banned = p_banned
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'is_banned', p_banned
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_toggle_ban_user(UUID, BOOLEAN) TO authenticated;

-- 8. RPC: admin_delete_user
CREATE OR REPLACE FUNCTION public.admin_delete_user(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_target_user public.profiles;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own admin account';
  END IF;

  SELECT * INTO v_target_user FROM public.profiles WHERE id = p_user_id;
  IF v_target_user IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF v_target_user.is_admin THEN
    RAISE EXCEPTION 'Cannot delete an admin user';
  END IF;

  -- 1. Delete notifications
  DELETE FROM public.notifications WHERE user_id = p_user_id;

  -- 2. Delete reviews
  DELETE FROM public.reviews WHERE rater_id = p_user_id OR ratee_id = p_user_id;

  -- 3. Delete messages
  DELETE FROM public.messages WHERE sender_id = p_user_id;

  -- 4. Delete trades
  DELETE FROM public.trades WHERE initiator_id = p_user_id OR receiver_id = p_user_id;

  -- 5. Delete items
  DELETE FROM public.items WHERE user_id = p_user_id;

  -- 6. Delete profile
  DELETE FROM public.profiles WHERE id = p_user_id;

  -- 7. Delete auth user record if exists
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_user_id', p_user_id,
    'username', v_target_user.username
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- 9. RPC: admin_get_all_messages
CREATE OR REPLACE FUNCTION public.admin_get_all_messages(
  p_search TEXT DEFAULT '',
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  trade_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  sender_id UUID,
  sender_username TEXT,
  sender_is_bot BOOLEAN,
  receiver_id UUID,
  receiver_username TEXT,
  receiver_is_bot BOOLEAN,
  offered_item_title TEXT,
  requested_item_title TEXT,
  trade_status TEXT
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
    m.id,
    m.trade_id,
    m.content,
    m.created_at,
    m.sender_id,
    sender.username AS sender_username,
    COALESCE(sender.is_bot, false) AS sender_is_bot,
    CASE WHEN t.initiator_id = m.sender_id THEN t.receiver_id ELSE t.initiator_id END AS receiver_id,
    receiver.username AS receiver_username,
    COALESCE(receiver.is_bot, false) AS receiver_is_bot,
    offered_item.title AS offered_item_title,
    requested_item.title AS requested_item_title,
    t.status AS trade_status
  FROM public.messages m
  JOIN public.trades t ON t.id = m.trade_id
  JOIN public.profiles sender ON sender.id = m.sender_id
  JOIN public.profiles receiver ON receiver.id = (CASE WHEN t.initiator_id = m.sender_id THEN t.receiver_id ELSE t.initiator_id END)
  LEFT JOIN public.items offered_item ON offered_item.id = t.offered_item_id
  LEFT JOIN public.items requested_item ON requested_item.id = t.requested_item_id
  WHERE (
    p_search = ''
    OR m.content ILIKE '%' || p_search || '%'
    OR sender.username ILIKE '%' || p_search || '%'
    OR receiver.username ILIKE '%' || p_search || '%'
  )
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_messages(TEXT, INT, INT) TO authenticated;

-- 10. RPC: admin_delete_message
CREATE OR REPLACE FUNCTION public.admin_delete_message(
  p_message_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  DELETE FROM public.messages WHERE id = p_message_id;

  RETURN jsonb_build_object(
    'success', true,
    'deleted_message_id', p_message_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_message(UUID) TO authenticated;

-- 11. RPC: admin_get_all_media
CREATE OR REPLACE FUNCTION public.admin_get_all_media(
  p_limit INT DEFAULT 100,
  p_offset INT DEFAULT 0
)
RETURNS TABLE (
  media_id UUID,
  media_type TEXT,
  image_url TEXT,
  title_or_context TEXT,
  owner_id UUID,
  owner_username TEXT,
  is_bot BOOLEAN,
  created_at TIMESTAMPTZ
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
  -- Item photos
  SELECT 
    i.id AS media_id,
    'item'::TEXT AS media_type,
    i.image_url,
    i.title AS title_or_context,
    i.user_id AS owner_id,
    p.username AS owner_username,
    COALESCE(p.is_bot, false) AS is_bot,
    i.created_at
  FROM public.items i
  JOIN public.profiles p ON p.id = i.user_id
  WHERE i.image_url IS NOT NULL AND i.image_url <> ''

  UNION ALL

  -- Chat message photos (where content contains http and common image extensions or item-images storage path)
  SELECT 
    m.id AS media_id,
    'chat'::TEXT AS media_type,
    m.content AS image_url,
    ('Chat in trade ' || left(m.trade_id::TEXT, 8)) AS title_or_context,
    m.sender_id AS owner_id,
    p.username AS owner_username,
    COALESCE(p.is_bot, false) AS is_bot,
    m.created_at
  FROM public.messages m
  JOIN public.profiles p ON p.id = m.sender_id
  WHERE m.content ILIKE 'http%item-images%'
     OR m.content ILIKE '%.jpg%'
     OR m.content ILIKE '%.jpeg%'
     OR m.content ILIKE '%.png%'
     OR m.content ILIKE '%.webp%'
     OR m.content ILIKE '%.gif%'

  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_all_media(INT, INT) TO authenticated;

-- 12. RPC: admin_remove_media
CREATE OR REPLACE FUNCTION public.admin_remove_media(
  p_media_type TEXT,
  p_media_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  IF p_media_type = 'item' THEN
    UPDATE public.items
    SET image_url = NULL
    WHERE id = p_media_id;
  ELSIF p_media_type = 'chat' THEN
    UPDATE public.messages
    SET content = '[Image removed by moderator]'
    WHERE id = p_media_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'media_type', p_media_type,
    'media_id', p_media_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_remove_media(TEXT, UUID) TO authenticated;

-- 13. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
