-- ═══════════════════════════════════════════════════════════════
-- SwitchR Chain Engine — Seed Test Data
-- Run in Supabase SQL Editor AFTER chain_engine_fixed.sql
-- ═══════════════════════════════════════════════════════════════
--
-- 3-way loop we are seeding:
--
--   Alice  has [Acoustic Guitar]  → wants [Coffee Machine]
--   Bob    has [Coffee Machine]   → wants [Smart TV]
--   Carol  has [Smart TV]         → wants [Acoustic Guitar]
--
--   ∴ find_trade_chains(alice_id) should return 1 chain.
--
-- NOTE: These profiles bypass auth.users FK using a DO block.
--       They are TEST ONLY — never use these IDs in production.
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  alice_id UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  bob_id   UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  carol_id UUID := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
BEGIN

  -- ── Step 1: Insert into auth.users (required for FK) ──────────
  INSERT INTO auth.users (id, email, role, aud, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, encrypted_password)
  VALUES
    (alice_id, 'alice_test@switchr.dev', 'authenticated', 'authenticated', now(), now(), '{}', '{}', false, ''),
    (bob_id,   'bob_test@switchr.dev',   'authenticated', 'authenticated', now(), now(), '{}', '{}', false, ''),
    (carol_id, 'carol_test@switchr.dev', 'authenticated', 'authenticated', now(), now(), '{}', '{}', false, '')
  ON CONFLICT (id) DO NOTHING;

  -- ── Step 2: Profiles ──────────────────────────────────────────
  -- Alice: has Guitar, wants Coffee Machine
  INSERT INTO public.profiles (id, username, avatar_url, wishlist_items, verification_level)
  VALUES (
    alice_id,
    'Alice_Test',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
    '[{"label": "Coffee Machine"}]'::jsonb,
    1
  ) ON CONFLICT (id) DO UPDATE
      SET username = EXCLUDED.username,
          wishlist_items = EXCLUDED.wishlist_items;

  -- Bob: has Coffee Machine, wants Smart TV
  INSERT INTO public.profiles (id, username, avatar_url, wishlist_items, verification_level)
  VALUES (
    bob_id,
    'Bob_Test',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
    '[{"label": "Smart TV"}]'::jsonb,
    1
  ) ON CONFLICT (id) DO UPDATE
      SET username = EXCLUDED.username,
          wishlist_items = EXCLUDED.wishlist_items;

  -- Carol: has Smart TV, wants Acoustic Guitar
  INSERT INTO public.profiles (id, username, avatar_url, wishlist_items, verification_level)
  VALUES (
    carol_id,
    'Carol_Test',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=carol',
    '[{"label": "Acoustic Guitar"}]'::jsonb,
    1
  ) ON CONFLICT (id) DO UPDATE
      SET username = EXCLUDED.username,
          wishlist_items = EXCLUDED.wishlist_items;

  -- ── Step 3: Items ─────────────────────────────────────────────
  -- Delete any old test items first
  DELETE FROM public.items WHERE user_id IN (alice_id, bob_id, carol_id);

  -- Alice's item: Acoustic Guitar
  INSERT INTO public.items (title, sub_category, category, condition, status, user_id, image_url, co2_saved_kg)
  VALUES (
    'Gibson J-45 Acoustic Guitar',
    'Acoustic Guitar',
    'Music',
    'Good',
    'active',
    alice_id,
    'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400',
    55
  );

  -- Bob's item: Coffee Machine
  INSERT INTO public.items (title, sub_category, category, condition, status, user_id, image_url, co2_saved_kg)
  VALUES (
    'Smeg 50s Style Espresso Machine',
    'Coffee Machine',
    'Appliances',
    'Like New',
    'active',
    bob_id,
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400',
    70
  );

  -- Carol's item: Smart TV
  INSERT INTO public.items (title, sub_category, category, condition, status, user_id, image_url, co2_saved_kg)
  VALUES (
    'Samsung 55" 4K OLED Smart TV',
    'Smart TV',
    'Electronics',
    'Like New',
    'active',
    carol_id,
    'https://images.unsplash.com/photo-1593359677879-a4bb92f4834d?w=400',
    450
  );

  RAISE NOTICE '✅ Test data seeded. Chain should appear for alice_id: %', alice_id;
END;
$$;

-- ── Quick verification query ─────────────────────────────────────
-- Run this separately to confirm the chain is found:
-- SELECT find_trade_chains('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
