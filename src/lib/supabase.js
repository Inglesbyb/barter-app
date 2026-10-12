import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl && supabaseAnonKey) && !supabaseUrl.includes('your-project-ref');

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

/** Throws the Supabase error (if any) so callers can use try/catch. */
export function unwrap({ data, error }) {
  if (error) throw error;
  return data;
}

export const TRADE_SELECT = `
  *,
  offered:items!trades_offered_item_id_fkey(*),
  requested:items!trades_requested_item_id_fkey(*),
  initiator:profiles!trades_initiator_id_fkey(id, username, location_name, lat, lng, is_bot),
  receiver:profiles!trades_receiver_id_fkey(id, username, location_name, lat, lng, is_bot)
`;

export const ITEM_SELECT = '*, owner:profiles(id, username, location_name, lat, lng, is_bot)';

export async function uploadItemImage(userId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  unwrap(await supabase.storage.from('item-images').upload(path, file, { contentType: file.type }));
  return supabase.storage.from('item-images').getPublicUrl(path).data.publicUrl;
}

export async function getProfileStats(userId) {
  const rows = unwrap(await supabase.rpc('get_profile_stats', { p_user_id: userId }));
  const row = rows?.[0] ?? {};
  return {
    avgRating: row.avg_rating !== null && row.avg_rating !== undefined ? Number(row.avg_rating) : null,
    reviewCount: Number(row.review_count ?? 0),
    tradesCompleted: Number(row.trades_completed ?? 0),
  };
}
