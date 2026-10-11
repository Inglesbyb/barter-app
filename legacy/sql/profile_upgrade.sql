-- SwitchR: Profile Storefront Upgrade
-- Run in Supabase SQL Editor

-- Extend profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio               TEXT,
  ADD COLUMN IF NOT EXISTS location_name     TEXT,
  ADD COLUMN IF NOT EXISTS header_url        TEXT,
  ADD COLUMN IF NOT EXISTS verification_level INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_response_time TEXT DEFAULT 'Unknown',
  ADD COLUMN IF NOT EXISTS wishlist_items    JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMPTZ DEFAULT now();

-- Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  swap_id     TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read reviews"  ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Auth insert reviews"  ON public.reviews FOR INSERT WITH CHECK (auth.uid() = reviewer_id);
