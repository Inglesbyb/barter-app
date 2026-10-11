-- ==============================================================================
-- SwitchR Barter App — Clean MVP Database Schema (Consolidated)
-- ==============================================================================
-- Paste this script into your fresh Supabase project's SQL Editor and run it once.
-- Includes:
--   1. Clean 5 core tables (profiles, items, trades, messages, reviews)
--   2. Auto-profile creation trigger on user signup
--   3. Row Level Security (RLS) policies for privacy and integrity
--   4. Storage bucket initialization for item images
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  location_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" 
  ON public.profiles FOR SELECT 
  USING (true);

CREATE POLICY "Users can update their own profile" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Trigger to automatically create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. ITEMS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  condition TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_trade', 'traded', 'hidden')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active items are viewable by everyone" 
  ON public.items FOR SELECT 
  USING (status != 'hidden' OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own items" 
  ON public.items FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" 
  ON public.items FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" 
  ON public.items FOR DELETE 
  USING (auth.uid() = user_id);

-- ------------------------------------------------------------------------------
-- 3. TRADES TABLE (1-to-1 Barter Offers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  initiator_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  offered_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  requested_item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trade participants can view their trades" 
  ON public.trades FOR SELECT 
  USING (auth.uid() IN (initiator_id, receiver_id));

CREATE POLICY "Authenticated users can create trade proposals" 
  ON public.trades FOR INSERT 
  WITH CHECK (auth.uid() = initiator_id);

CREATE POLICY "Trade participants can update their trade status" 
  ON public.trades FOR UPDATE 
  USING (auth.uid() IN (initiator_id, receiver_id));

-- ------------------------------------------------------------------------------
-- 4. MESSAGES TABLE (In-Trade Chat)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants in a trade can view its messages" 
  ON public.messages FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.trades 
      WHERE trades.id = messages.trade_id 
        AND auth.uid() IN (trades.initiator_id, trades.receiver_id)
    )
  );

CREATE POLICY "Participants in a trade can send messages" 
  ON public.messages FOR INSERT 
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.trades 
      WHERE trades.id = messages.trade_id 
        AND auth.uid() IN (trades.initiator_id, trades.receiver_id)
    )
  );

-- ------------------------------------------------------------------------------
-- 5. REVIEWS TABLE (Post-Trade Ratings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  score INT NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT unique_review_per_party_per_trade UNIQUE (trade_id, rater_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews are viewable by everyone" 
  ON public.reviews FOR SELECT 
  USING (true);

CREATE POLICY "Participants of completed trades can leave one review" 
  ON public.reviews FOR INSERT 
  WITH CHECK (
    auth.uid() = rater_id AND
    EXISTS (
      SELECT 1 FROM public.trades 
      WHERE trades.id = reviews.trade_id 
        AND trades.status = 'completed'
        AND auth.uid() IN (trades.initiator_id, trades.receiver_id)
    )
  );

-- ------------------------------------------------------------------------------
-- 6. STORAGE BUCKET CONFIGURATION (Item Images)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public view policy for item images
CREATE POLICY "Public item image access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'item-images');

-- Authenticated upload policy
CREATE POLICY "Authenticated users can upload item images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'item-images');
