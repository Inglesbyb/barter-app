-- ==============================================================================
-- 1. CHAT IMAGE SUPPORT IN MESSAGES
-- ==============================================================================
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

-- Allow messages that have either content text OR an image_url
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_content_or_image'
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_content_or_image CHECK (
        (content IS NOT NULL AND char_length(content) >= 1) OR image_url IS NOT NULL
      );
  END IF;
END $$;

-- ==============================================================================
-- 2. SEED MULTIPLE REALISTIC ITEMS FOR ALL 20 LIVERPOOL BOTS
-- ==============================================================================

-- Baltic Triangle (balgownie_20)
INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Fujifilm X-T20 Mirrorless Camera', 'Classic silver Fujifilm with 18-55mm f2.8-4 lens. Crisp photos, barely used around Baltic Market. Includes 2 batteries and strap.', 'Electronics', 'Like new', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'balgownie_20'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Barbour Bedale Wax Jacket (Medium)', 'Classic olive Barbour wax jacket with corduroy collar. Clean tartan lining, freshly rewaxed. Perfect for Liverpool coastal weather.', 'Clothing', 'Good', 'https://images.unsplash.com/photo-1548883354-7622d03aca27?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'balgownie_20'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Vintage Vinyl Record Bundle (Beatles & Oasis)', '6 original pressing vinyl records including Rubber Soul, Revolver, Definitely Maybe, and The La''s. All sleeves in great condition.', 'Books & Media', 'Good', 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'balgownie_20'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Audio-Technica LP60X USB Turntable', 'Fully automatic belt-drive turntable in matte black. Plays 33/45 RPM, built-in phono preamp. Sounds fantastic.', 'Electronics', 'Like new', 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'balgownie_20'
ON CONFLICT DO NOTHING;

-- Birkenhead / Wirral (stockbridge_17)
INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Nintendo Switch OLED White with Zelda', 'OLED model in pristine condition with dock, cables, and Zelda Tears of the Kingdom physical cartridge. Screen protector applied from day 1.', 'Electronics', 'Like new', 'https://images.unsplash.com/photo-1578303512597-8be9abb94d76?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'stockbridge_17'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Specialized Sirrus Hybrid Road Bike', 'Fast and comfortable lightweight aluminium frame, Shimano 24-speed gears, puncture resistant tyres. Great for commuting into town.', 'Sports & Fitness', 'Good', 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'stockbridge_17'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Marshall Stanmore II Bluetooth Speaker', 'Iconic retro Marshall speaker with brass details and warm analogue sound. Fills any living room with crystal clear sound.', 'Electronics', 'Like new', 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'stockbridge_17'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'DeWalt 18V XR Cordless Combi Drill Kit', 'Includes brushless drill, 2x 4.0Ah XR batteries, multi-voltage charger, and heavy-duty TSTAK carry case. Works a treat.', 'Tools & DIY', 'Good', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'stockbridge_17'
ON CONFLICT DO NOTHING;

-- Lark Lane / Sefton (jesmond_19)
INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Taylor GS Mini Acoustic Guitar', 'Top quality acoustic guitar with rich tone and comfortable playability. Comes with original Taylor padded travel gig bag.', 'Books & Media', 'Like new', 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'jesmond_19'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Sage Barista Touch Espresso Machine', 'Brushed stainless steel with intuitive touchscreen, integrated conical burr grinder, and automatic micro-foam steam wand. Proper cafe coffee.', 'Home & Garden', 'Like new', 'https://images.unsplash.com/photo-1517668808822-9ebd02f2a888?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'jesmond_19'
ON CONFLICT DO NOTHING;

-- Anfield (brixton_3)
INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Retro 1989 Liverpool Candy Away Shirt (L)', 'Official licensed retro grey Liverpool FC shirt with embroidered crest and Candy sponsor. Worn once, mint condition.', 'Clothing', 'Like new', 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'brixton_3'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Sony WH-1000XM5 Wireless Headphones', 'Industry-leading noise cancelling, crystal clear audio, silver finish. With magnetic case, 3.5mm jack, and USB-C cable.', 'Electronics', 'Like new', 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'brixton_3'
ON CONFLICT DO NOTHING;

-- Crosby Beach (leith_18)
INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Body Glove Inflatable Stand-Up Paddleboard', '10ft 6in all-around SUP with adjustable carbon paddle, dual-action pump, fin, leash, and heavy-duty backpack. Used twice at Crosby.', 'Sports & Fitness', 'Like new', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'leith_18'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Patagonia Torrentshell 3L Waterproof Jacket', 'Navy blue waterproof breathable mountain jacket. Underarm pit zips, adjustable hood, packs into pocket. Size Large.', 'Clothing', 'Good', 'https://images.unsplash.com/photo-1544441893-675973e31985?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'leith_18'
ON CONFLICT DO NOTHING;

-- Allerton & Woolton (allerton_14 & kelvinbridge_16)
INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Apple iPad 10th Gen 64GB Blue with Folio', 'Flawless 10.9-inch Liquid Retina display, A14 Bionic chip, smart magnetic folio stand case. Original box included.', 'Electronics', 'Like new', 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'allerton_14'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Cast Iron Le Creuset Round Casserole 24cm', 'Iconic Cerise cherry red enamel cast iron dutch oven. Even heat distribution, perfect for stews and sourdough bread.', 'Home & Garden', 'Like new', 'https://images.unsplash.com/photo-1584990347449-3997237e1933?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'allerton_14'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Bose SoundLink Revolve+ II Bluetooth Speaker', 'Triple black 360-degree wireless speaker with flexible fabric handle, water and dust resistant. 17-hour battery life.', 'Electronics', 'Like new', 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'kelvinbridge_16'
ON CONFLICT DO NOTHING;

-- Chester & Merseyside (stratford_10, didsbury_12, elena_style)
INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Dyson V11 Cordless Vacuum Cleaner', 'Powerful suction with torque drive head, mini motorized tool, and docking station. Clean filters, battery lasts 60 mins.', 'Home & Garden', 'Good', 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'stratford_10'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Sony PlayStation 5 DualSense Controller (Midnight Black)', 'Clean PS5 controller with haptic feedback and adaptive triggers. Zero stick drift, barely used.', 'Electronics', 'Like new', 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'didsbury_12'
ON CONFLICT DO NOTHING;

INSERT INTO public.items (user_id, title, description, category, condition, image_url, status)
SELECT id, 'Ganni Recycled Wool Rib Beanie & Scarf Set', 'Soft warm ribbed knit in beige oatmeal. 100% genuine Ganni with woven logo tab. Unworn with tags.', 'Clothing', 'New', 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=700&auto=format&fit=crop', 'available'
FROM public.profiles WHERE username = 'elena_style'
ON CONFLICT DO NOTHING;

-- Verification counts
SELECT p.username, p.location_name, count(i.id) AS item_count
FROM public.profiles p
LEFT JOIN public.items i ON i.user_id = p.id AND i.status = 'available'
WHERE p.is_bot = true
GROUP BY p.username, p.location_name
ORDER BY item_count DESC;
