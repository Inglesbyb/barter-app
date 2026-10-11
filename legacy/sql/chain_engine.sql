-- ═══════════════════════════════════════════════════════════════
-- SwitchR Chain Engine — Database Layer
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════

-- 1. Chain Proposals Table
-- ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chain_proposals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_data    JSONB NOT NULL,         -- [{user_id, username, item_id, item_title, item_image, gives_to}]
  participant_ids UUID[] NOT NULL,      -- quick lookup array
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','failed','completed')),
  acceptances   UUID[] NOT NULL DEFAULT '{}',  -- user_ids who accepted
  created_at    TIMESTAMPTZ DEFAULT now(),
  expires_at    TIMESTAMPTZ DEFAULT now() + INTERVAL '72 hours'
);

ALTER TABLE public.chain_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read their chains"
  ON public.chain_proposals FOR SELECT
  USING (auth.uid() = ANY(participant_ids));

CREATE POLICY "Auth users can insert chains"
  ON public.chain_proposals FOR INSERT
  WITH CHECK (auth.uid() = ANY(participant_ids));

CREATE POLICY "Participants can update their chains"
  ON public.chain_proposals FOR UPDATE
  USING (auth.uid() = ANY(participant_ids));

-- Index for fast participant lookup
CREATE INDEX IF NOT EXISTS idx_chain_participant_ids
  ON public.chain_proposals USING GIN (participant_ids);


-- 2. find_trade_chains(p_user_id) — PostgreSQL Stored Procedure
-- ────────────────────────────────────────────────────────────────
-- Strategy:
--   A 3-way chain exists when:
--     User A (has X, wants Y)
--     User B (has Y, wants Z)
--     User C (has Z, wants X)
--
--   A 4-way chain adds User D between B and C.
--
--   We use recursive CTEs capped at depth 4 for performance.
-- ────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_trade_chains(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_chains JSONB := '[]'::JSONB;
  v_user_item RECORD;
  v_chain_3 JSONB;
  v_chain_4 JSONB;
BEGIN

  -- ── 3-way chains ──────────────────────────────────────────────
  -- A has item_A (sub_category=X), wants W
  -- B has item_B (sub_category=W), wants V
  -- C has item_C (sub_category=V), wants X
  -- → A→B→C→A
  SELECT jsonb_agg(chain) INTO v_chain_3
  FROM (
    SELECT jsonb_build_object(
      'type',  '3-way',
      'chain', jsonb_build_array(
        jsonb_build_object(
          'user_id',    a_prof.id,
          'username',   a_prof.username,
          'avatar_url', a_prof.avatar_url,
          'gives_item', jsonb_build_object('id', a_item.id, 'title', a_item.title,
                          'image_url', a_item.image_url, 'sub_category', a_item.sub_category),
          'gives_to',   b_prof.username
        ),
        jsonb_build_object(
          'user_id',    b_prof.id,
          'username',   b_prof.username,
          'avatar_url', b_prof.avatar_url,
          'gives_item', jsonb_build_object('id', b_item.id, 'title', b_item.title,
                          'image_url', b_item.image_url, 'sub_category', b_item.sub_category),
          'gives_to',   c_prof.username
        ),
        jsonb_build_object(
          'user_id',    c_prof.id,
          'username',   c_prof.username,
          'avatar_url', c_prof.avatar_url,
          'gives_item', jsonb_build_object('id', c_item.id, 'title', c_item.title,
                          'image_url', c_item.image_url, 'sub_category', c_item.sub_category),
          'gives_to',   a_prof.username
        )
      ),
      'participant_ids', ARRAY[a_prof.id, b_prof.id, c_prof.id]
    ) AS chain
    FROM
      -- A = requesting user
      public.profiles a_prof
      JOIN public.items a_item
        ON a_item.user_id = a_prof.id AND a_item.status = 'active'

      -- B has what A wants (A's wishlist ∋ B's sub_category)
      JOIN public.profiles b_prof
        ON b_prof.id <> a_prof.id
        AND a_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', a_item.sub_category))
      JOIN public.items b_item
        ON b_item.user_id = b_prof.id AND b_item.status = 'active'
        AND a_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', b_item.sub_category))

      -- C has what B wants AND wants what A has
      JOIN public.profiles c_prof
        ON c_prof.id <> a_prof.id AND c_prof.id <> b_prof.id
        AND b_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', b_item.sub_category))
      JOIN public.items c_item
        ON c_item.user_id = c_prof.id AND c_item.status = 'active'
        AND b_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', c_item.sub_category))

      -- Close the loop: C wants what A has
      WHERE c_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', a_item.sub_category))
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
          'gives_to', b_prof.username
        ),
        jsonb_build_object(
          'user_id', b_prof.id, 'username', b_prof.username, 'avatar_url', b_prof.avatar_url,
          'gives_item', jsonb_build_object('id', b_item.id, 'title', b_item.title,
                          'image_url', b_item.image_url, 'sub_category', b_item.sub_category),
          'gives_to', c_prof.username
        ),
        jsonb_build_object(
          'user_id', c_prof.id, 'username', c_prof.username, 'avatar_url', c_prof.avatar_url,
          'gives_item', jsonb_build_object('id', c_item.id, 'title', c_item.title,
                          'image_url', c_item.image_url, 'sub_category', c_item.sub_category),
          'gives_to', d_prof.username
        ),
        jsonb_build_object(
          'user_id', d_prof.id, 'username', d_prof.username, 'avatar_url', d_prof.avatar_url,
          'gives_item', jsonb_build_object('id', d_item.id, 'title', d_item.title,
                          'image_url', d_item.image_url, 'sub_category', d_item.sub_category),
          'gives_to', a_prof.username
        )
      ),
      'participant_ids', ARRAY[a_prof.id, b_prof.id, c_prof.id, d_prof.id]
    ) AS chain
    FROM
      public.profiles a_prof
      JOIN public.items a_item ON a_item.user_id = a_prof.id AND a_item.status = 'active'
      JOIN public.profiles b_prof ON b_prof.id <> a_prof.id
        AND a_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', a_item.sub_category))
      JOIN public.items b_item ON b_item.user_id = b_prof.id AND b_item.status = 'active'
        AND a_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', b_item.sub_category))
      JOIN public.profiles c_prof ON c_prof.id <> a_prof.id AND c_prof.id <> b_prof.id
        AND b_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', b_item.sub_category))
      JOIN public.items c_item ON c_item.user_id = c_prof.id AND c_item.status = 'active'
        AND b_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', c_item.sub_category))
      JOIN public.profiles d_prof ON d_prof.id <> a_prof.id AND d_prof.id <> b_prof.id AND d_prof.id <> c_prof.id
        AND c_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', c_item.sub_category))
      JOIN public.items d_item ON d_item.user_id = d_prof.id AND d_item.status = 'active'
        AND c_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', d_item.sub_category))
      WHERE d_prof.wishlist_items @> jsonb_build_array(jsonb_build_object('label', a_item.sub_category))
        AND a_prof.id = p_user_id
    LIMIT 5
  ) chains_4;

  -- Merge results
  v_chains := COALESCE(v_chain_3, '[]'::JSONB) || COALESCE(v_chain_4, '[]'::JSONB);
  RETURN v_chains;
END;
$$;
