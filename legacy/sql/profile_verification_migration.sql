-- ═══════════════════════════════════════════════════════════════
-- SwitchR: Profile Infrastructure Migration
-- Run in Supabase SQL Editor
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ═══════════════════════════════════════════════════════════════

-- 1. Add boolean verification columns to profiles
--    (falls back to verification_level in frontend if not present)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS id_verified    BOOLEAN DEFAULT FALSE;

-- 2. Backfill from verification_level for existing users
UPDATE public.profiles SET email_verified = TRUE WHERE verification_level >= 1 AND email_verified = FALSE;
UPDATE public.profiles SET phone_verified = TRUE WHERE verification_level >= 2 AND phone_verified = FALSE;
UPDATE public.profiles SET id_verified    = TRUE WHERE verification_level >= 3 AND id_verified    = FALSE;

-- 3. Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
  AND column_name IN ('email_verified', 'phone_verified', 'id_verified');
