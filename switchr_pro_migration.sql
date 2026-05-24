-- SwitchR Pro Migration — Adds missing columns flagged in VC analysis
-- Run this in your Supabase SQL editor to fix the gap between schema and frontend code.

-- 1. Add co2_saved_kg to items (used by Card.jsx, ProfileView.jsx, InventoryView.jsx)
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS co2_saved_kg DECIMAL DEFAULT NULL;

-- 2. Add total_carbon_saved to profiles (used by ProfileView.jsx)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_carbon_saved DECIMAL DEFAULT 0;

-- 3. Add sub_category to items (used by chain engine + taxonomy lookups)
ALTER TABLE public.items
  ADD COLUMN IF NOT EXISTS sub_category TEXT DEFAULT NULL;

-- 4. Add is_pro to profiles (SwitchR Pro subscription flag)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT FALSE;

-- 5. Add pro_since to profiles (track when user subscribed)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pro_since TIMESTAMPTZ DEFAULT NULL;

-- Rebuild the update_profile_rating trigger to also sum total_carbon_saved
-- from completed swaps when a review is inserted.
-- This is idempotent — safe to re-run.
CREATE OR REPLACE FUNCTION public.update_profile_carbon_on_swap()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET total_carbon_saved = COALESCE((
    SELECT SUM(i.co2_saved_kg)
    FROM public.bids b
    JOIN public.items i ON i.id = b.item_offered_id
    WHERE b.receiver_id = NEW.profile_id AND b.status = 'accepted'
      AND i.co2_saved_kg IS NOT NULL
  ), 0)
  WHERE id = NEW.profile_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_update_carbon ON public.reviews;
CREATE TRIGGER on_review_update_carbon
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_profile_carbon_on_swap();
