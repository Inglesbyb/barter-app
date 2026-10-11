-- ═══════════════════════════════════════════════════════════════
-- SwitchR Chain Engine — FIXED Stored Procedure
-- Run this AFTER chain_engine.sql to replace the function
-- ═══════════════════════════════════════════════════════════════
-- BUG FIX: Line 106 previously checked a_item.sub_category for
-- the b_prof join condition (always true/meaningless).
-- Corrected to check b_item.sub_category (what A wants from B).
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.find_trade_chains(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_chain_3 JSONB;
  v_chain_4 JSONB;
BEGIN

  -- ── 3-way chains ──────────────────────────────────────────────
  -- A has item X  →  B wants X (B's wishlist ∋ X)
  -- B has item Y  →  A wants Y (A's wishlist ∋ Y)   [A's side of the deal]
  -- B has item Y  →  C wants Y (C's wishlist ∋ Y)
  -- C has item Z  →  A wants Z (A's wishlist ∋ Z)   closes the loop
  -- Simpler reading:
  --   A's wishlist ∋ b_item.sub_category  (A wants what B has)
  --   B's wishlist ∋ c_item.sub_category  (B wants what C has)
  --   C's wishlist ∋ a_item.sub_category  (C wants what A has)
  SELECT jsonb_agg(chain) INTO v_chain_3
  FROM (
    SELECT jsonb_build_object(
      'type',  '3-way',
      'chain', jsonb_build_array(
        jsonb_build_object(
          'user_id',    a_prof.id,
          'username',   a_prof.username,
          'avatar_url', a_prof.avatar_url,
          'gives_item', jsonb_build_object(
            'id', a_item.id, 'title', a_item.title,
            'image_url', a_item.image_url, 'sub_category', a_item.sub_category),
          'gives_to', b_prof.username
        ),
        jsonb_build_object(
          'user_id',    b_prof.id,
          'username',   b_prof.username,
          'avatar_url', b_prof.avatar_url,
          'gives_item', jsonb_build_object(
            'id', b_item.id, 'title', b_item.title,
            'image_url', b_item.image_url, 'sub_category', b_item.sub_category),
          'gives_to', c_prof.username
        ),
        jsonb_build_object(
          'user_id',    c_prof.id,
          'username',   c_prof.username,
          'avatar_url', c_prof.avatar_url,
          'gives_item', jsonb_build_object(
            'id', c_item.id, 'title', c_item.title,
            'image_url', c_item.image_url, 'sub_category', c_item.sub_category),
          'gives_to', a_prof.username
        )
      ),
      'participant_ids', ARRAY[a_prof.id, b_prof.id, c_prof.id]
    ) AS chain
    FROM
      public.profiles  a_prof
      JOIN public.items a_item
        ON  a_item.user_id = a_prof.id
        AND a_item.status  = 'active'

      -- B: has an item A wants
      JOIN public.items b_item
        ON  b_item.status = 'active'
        AND a_prof.wishlist_items @> jsonb_build_array(
              jsonb_build_object('label', b_item.sub_category))  -- ← FIXED (was a_item)
      JOIN public.profiles b_prof
        ON  b_prof.id = b_item.user_id
        AND b_prof.id <> a_prof.id

      -- C: has an item B wants, and wants what A has
      JOIN public.items c_item
        ON  c_item.status = 'active'
        AND b_prof.wishlist_items @> jsonb_build_array(
              jsonb_build_object('label', c_item.sub_category))
      JOIN public.profiles c_prof
        ON  c_prof.id = c_item.user_id
        AND c_prof.id <> a_prof.id
        AND c_prof.id <> b_prof.id

    WHERE
      -- Close the loop: C wants what A has
      c_prof.wishlist_items @> jsonb_build_array(
        jsonb_build_object('label', a_item.sub_category))
      AND a_prof.id = p_user_id

    LIMIT 10
  ) chains_3;

  -- ── 4-way chains ──────────────────────────────────────────────
  SELECT jsonb_agg(chain) INTO v_chain_4
  FROM (
    SELECT jsonb_build_object(
      'type',  '4-way',
      'chain', jsonb_build_array(
        jsonb_build_object(
          'user_id', a_prof.id, 'username', a_prof.username, 'avatar_url', a_prof.avatar_url,
          'gives_item', jsonb_build_object('id', a_item.id, 'title', a_item.title,
                          'image_url', a_item.image_url, 'sub_category', a_item.sub_category),
          'gives_to', b_prof.username),
        jsonb_build_object(
          'user_id', b_prof.id, 'username', b_prof.username, 'avatar_url', b_prof.avatar_url,
          'gives_item', jsonb_build_object('id', b_item.id, 'title', b_item.title,
                          'image_url', b_item.image_url, 'sub_category', b_item.sub_category),
          'gives_to', c_prof.username),
        jsonb_build_object(
          'user_id', c_prof.id, 'username', c_prof.username, 'avatar_url', c_prof.avatar_url,
          'gives_item', jsonb_build_object('id', c_item.id, 'title', c_item.title,
                          'image_url', c_item.image_url, 'sub_category', c_item.sub_category),
          'gives_to', d_prof.username),
        jsonb_build_object(
          'user_id', d_prof.id, 'username', d_prof.username, 'avatar_url', d_prof.avatar_url,
          'gives_item', jsonb_build_object('id', d_item.id, 'title', d_item.title,
                          'image_url', d_item.image_url, 'sub_category', d_item.sub_category),
          'gives_to', a_prof.username)
      ),
      'participant_ids', ARRAY[a_prof.id, b_prof.id, c_prof.id, d_prof.id]
    ) AS chain
    FROM
      public.profiles a_prof
      JOIN public.items a_item ON a_item.user_id = a_prof.id AND a_item.status = 'active'

      JOIN public.items b_item
        ON b_item.status = 'active'
        AND a_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', b_item.sub_category))
      JOIN public.profiles b_prof ON b_prof.id = b_item.user_id AND b_prof.id <> a_prof.id

      JOIN public.items c_item
        ON c_item.status = 'active'
        AND b_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', c_item.sub_category))
      JOIN public.profiles c_prof
        ON c_prof.id = c_item.user_id AND c_prof.id <> a_prof.id AND c_prof.id <> b_prof.id

      JOIN public.items d_item
        ON d_item.status = 'active'
        AND c_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', d_item.sub_category))
      JOIN public.profiles d_prof
        ON d_prof.id = d_item.user_id
        AND d_prof.id <> a_prof.id AND d_prof.id <> b_prof.id AND d_prof.id <> c_prof.id

    WHERE
      d_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', a_item.sub_category))
      AND a_prof.id = p_user_id
    LIMIT 5
  ) chains_4;

  RETURN COALESCE(v_chain_3, '[]'::JSONB) || COALESCE(v_chain_4, '[]'::JSONB);
END;
$$;
