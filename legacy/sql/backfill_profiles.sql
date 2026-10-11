-- SwitchR: Profile Backfill Script
-- Run this in the Supabase SQL Editor to fix any "Ghost Accounts"

-- This script finds any user in the 'auth.users' table that DOES NOT have a 
-- corresponding row in the 'public.profiles' table and inserts them.
-- This resolves the "violates foreign key constraint items_user_id_fkey" error for old test accounts.

INSERT INTO public.profiles (id, username, avatar_url)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1), 'Trader'),
  COALESCE(au.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || au.id)
FROM auth.users au
LEFT JOIN public.profiles pp ON au.id = pp.id
WHERE pp.id IS NULL;
