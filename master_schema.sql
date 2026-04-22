-- Master Database Rewrite for SwitchR (v2 - Complete Audit)
-- Run this in the Supabase SQL Editor

-- 1. CLEANUP
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.ratings CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.swipes CASCADE;
DROP TABLE IF EXISTS public.bids CASCADE;
DROP TABLE IF EXISTS public.items CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  rating DECIMAL DEFAULT 5.0,
  trades_completed INTEGER DEFAULT 0,
  accepted_terms BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ITEMS TABLE
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  condition TEXT,
  category TEXT,
  estimated_value DECIMAL,
  description TEXT,
  looking_for TEXT,
  image_url TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  status TEXT DEFAULT 'active', -- 'active', 'swapped'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BIDS TABLE (Offers)
CREATE TABLE public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bidder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_offered_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  item_wanted_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. MESSAGES TABLE
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id TEXT NOT NULL, -- composite of user IDs
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SWIPES TABLE (For the Tinder Deck)
CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  swiper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  direction TEXT NOT NULL, -- 'left', 'right'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, item_id)
);

-- 7. RATINGS TABLE
CREATE TABLE public.ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rater_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id TEXT,
  score INTEGER CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. ROW LEVEL SECURITY (RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Profile owner update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public items" ON public.items FOR SELECT USING (true);
CREATE POLICY "Auth insert items" ON public.items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Owner update items" ON public.items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete items" ON public.items FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bid view" ON public.bids FOR SELECT USING (auth.uid() = bidder_id OR auth.uid() = receiver_id);
CREATE POLICY "Auth insert bids" ON public.bids FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Bid update" ON public.bids FOR UPDATE USING (auth.uid() = bidder_id OR auth.uid() = receiver_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Message view" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Auth insert messages" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Swipe view owner" ON public.swipes FOR SELECT USING (auth.uid() = swiper_id);
CREATE POLICY "Auth insert swipes" ON public.swipes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rating view" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Auth insert ratings" ON public.ratings FOR INSERT WITH CHECK (auth.role() = 'authenticated');
