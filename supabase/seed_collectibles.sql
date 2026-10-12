-- ------------------------------------------------------------------------------
-- SEED AUTHENTIC COLLECTIBLES FOR LIVERPOOL
-- ------------------------------------------------------------------------------

DO $$
DECLARE
  v_bot_baltic UUID;
  v_bot_city UUID;
  v_bot_anfield UUID;
  v_bot_aigburth UUID;
  v_bot_crosby UUID;
BEGIN
  -- Pick bots across Liverpool
  SELECT id INTO v_bot_baltic FROM public.profiles WHERE is_bot = true AND location_name LIKE '%Baltic%' LIMIT 1;
  SELECT id INTO v_bot_city FROM public.profiles WHERE is_bot = true AND location_name LIKE '%City Centre%' LIMIT 1;
  SELECT id INTO v_bot_anfield FROM public.profiles WHERE is_bot = true AND location_name LIKE '%Anfield%' LIMIT 1;
  SELECT id INTO v_bot_aigburth FROM public.profiles WHERE is_bot = true AND location_name LIKE '%Aigburth%' LIMIT 1;
  SELECT id INTO v_bot_crosby FROM public.profiles WHERE is_bot = true AND location_name LIKE '%Crosby%' LIMIT 1;

  -- Fallbacks if specific location not found
  IF v_bot_baltic IS NULL THEN SELECT id INTO v_bot_baltic FROM public.profiles WHERE is_bot = true LIMIT 1; END IF;
  IF v_bot_city IS NULL THEN SELECT id INTO v_bot_city FROM public.profiles WHERE is_bot = true OFFSET 1 LIMIT 1; END IF;
  IF v_bot_anfield IS NULL THEN SELECT id INTO v_bot_anfield FROM public.profiles WHERE is_bot = true OFFSET 2 LIMIT 1; END IF;
  IF v_bot_aigburth IS NULL THEN SELECT id INTO v_bot_aigburth FROM public.profiles WHERE is_bot = true OFFSET 3 LIMIT 1; END IF;
  IF v_bot_crosby IS NULL THEN SELECT id INTO v_bot_crosby FROM public.profiles WHERE is_bot = true OFFSET 4 LIMIT 1; END IF;

  -- Insert Collectibles items
  INSERT INTO public.items (
    user_id, title, description, category, condition, status, estimated_value, 
    latitude, longitude, location_name, image_url, looking_for
  )
  VALUES
  (
    v_bot_baltic,
    'Base Set Charizard Holo 1999 (PSA 7 Graded)',
    'Mad rare 1999 WOTC Base Set Charizard holographic card graded PSA 7 Near Mint. Proper collector piece, completely authentic with verification slab number. Looking to swap for a decent electric bike, MacBook, or high end mirrorless camera setup.',
    'Collectibles',
    'Like new',
    'available',
    450,
    53.3950, -2.9800, 'Baltic Triangle, Liverpool',
    'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=800&auto=format&fit=crop&q=80',
    'Electric bike, MacBook Air M1/M2, Sony mirrorless camera, or vintage guitar'
  ),
  (
    v_bot_city,
    'Vintage 1996 Pokémon Card Binder (150+ Cards incl. Holos)',
    'Original 1996 vintage Ultra Pro binder packed with over 150 first generation cards. Includes Blastoise, Venusaur, Gengar, Mewtwo and jungle holos. All kept in sleeves in clean nick. Looking to swap for a PS5 console bundle or decent audio recording gear.',
    'Collectibles',
    'Good',
    'available',
    320,
    53.4084, -2.9916, 'Liverpool City Centre',
    'PlayStation 5, synth/keyboard, decent turntable setup, or designer jacket'
  ),
  (
    v_bot_anfield,
    'Signed Steven Gerrard 2005 Istanbul Shirt (Framed + COA)',
    'Proper legendary Liverpool piece. Authentic 2005 Champions League final Istanbul shirt hand-signed by Steven Gerrard. Professionally mounted in heavy wooden display frame with Certificate of Authenticity (COA) and photo proof. Swap for a high end electric guitar, drone, or Apple tech.',
    'Collectibles',
    'Like new',
    'available',
    500,
    53.4308, -2.9608, 'Anfield, Liverpool',
    'Fender USA Strat, DJI Mini drone, iPad Pro, or iPhone 15'
  ),
  (
    v_bot_aigburth,
    'Yu-Gi-Oh 1st Edition Blue-Eyes White Dragon + Exodia Set',
    'Classic 1st Edition Legend of Blue-Eyes White Dragon plus the complete 5-card Exodia The Forbidden One set. All cards stored in magnetic UV one-touch cases. Mint condition. Wanting to swap for a Nintendo Switch OLED bundle, tools, or retro gaming console.',
    'Collectibles',
    'Like new',
    'available',
    220,
    53.3700, -2.9350, 'Aigburth, Liverpool',
    'Nintendo Switch OLED, DeWalt combo kit, or retro handhelds'
  ),
  (
    v_bot_crosby,
    'Rare 1983 Nintendo Game & Watch Mario Bros (Boxed Vintage)',
    'Authentic 1983 multi-screen Mario Bros Game & Watch in original styrofoam and box with serial number match. Fully working buttons, screens and sound. Mega retro collectible. Looking to swap for guitar pedals, analogue synth, or cycling gear.',
    'Collectibles',
    'Good',
    'available',
    180,
    53.4850, -3.0300, 'Crosby, Liverpool',
    'Guitar pedals, Korg synth, cycling computer, or power tools'
  );

END $$;
