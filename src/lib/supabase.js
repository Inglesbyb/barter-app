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

export async function uploadChatImage(userId, file) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/chat-${crypto.randomUUID()}.${ext}`;
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

export async function deleteMyAccount() {
  unwrap(await supabase.rpc('delete_user_account'));
  await supabase.auth.signOut();
}

// -----------------------------------------------------------------------------
// Admin & Moderation Helpers (Restricted to Founder / Admin Role)
// -----------------------------------------------------------------------------
export async function adminGetUsers({ search = '', filter = 'all', limit = 100, offset = 0 } = {}) {
  return unwrap(
    await supabase.rpc('admin_get_users', {
      p_search: search,
      p_filter: filter,
      p_limit: limit,
      p_offset: offset,
    }),
  );
}

export async function adminToggleBanUser(userId, banned) {
  return unwrap(
    await supabase.rpc('admin_toggle_ban_user', {
      p_user_id: userId,
      p_banned: banned,
    }),
  );
}

export async function adminDeleteUser(userId) {
  return unwrap(
    await supabase.rpc('admin_delete_user', {
      p_user_id: userId,
    }),
  );
}

export async function adminGetAllMessages({ search = '', limit = 100, offset = 0 } = {}) {
  return unwrap(
    await supabase.rpc('admin_get_all_messages', {
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    }),
  );
}

export async function adminDeleteMessage(messageId) {
  return unwrap(
    await supabase.rpc('admin_delete_message', {
      p_message_id: messageId,
    }),
  );
}

export async function adminGetAllMedia({ limit = 150, offset = 0 } = {}) {
  return unwrap(
    await supabase.rpc('admin_get_all_media', {
      p_limit: limit,
      p_offset: offset,
    }),
  );
}

export async function adminRemoveMedia(mediaType, mediaId) {
  return unwrap(
    await supabase.rpc('admin_remove_media', {
      p_media_type: mediaType,
      p_media_id: mediaId,
    }),
  );
}

export async function adminTriggerBotBid(targetItemId, botId = null) {
  return unwrap(
    await supabase.rpc('bot_bid_on_item', {
      p_target_item_id: targetItemId,
      p_bot_id: botId,
    }),
  );
}

export async function adminGetBiddableItems({
  search = '',
  ownerId = null,
  category = 'all',
  unbidOnly = false,
  limit = 50,
  offset = 0,
} = {}) {
  return unwrap(
    await supabase.rpc('admin_get_biddable_items', {
      p_search: search,
      p_owner_id: ownerId,
      p_category: category,
      p_unbid_only: unbidOnly,
      p_limit: limit,
      p_offset: offset,
    }),
  );
}

export async function adminBatchBotBid(limit = 10) {
  return unwrap(
    await supabase.rpc('admin_batch_bot_bid', {
      p_limit: limit,
    }),
  );
}

export async function adminGetBotTrades({ status = 'all', limit = 50, offset = 0 } = {}) {
  return unwrap(
    await supabase.rpc('admin_get_bot_trades', {
      p_status: status,
      p_limit: limit,
      p_offset: offset,
    }),
  );
}

export async function adminBotAcceptTrade(tradeId) {
  return unwrap(
    await supabase.rpc('admin_bot_accept_trade', {
      p_trade_id: tradeId,
    }),
  );
}

export async function adminBotSendMessage(tradeId, content, botId = null) {
  return unwrap(
    await supabase.rpc('admin_bot_send_message', {
      p_trade_id: tradeId,
      p_content: content,
      p_bot_id: botId,
    }),
  );
}

export async function adminBotAddItem({
  botId,
  title,
  description = null,
  category,
  condition,
  imageUrl,
}) {
  return unwrap(
    await supabase.rpc('admin_bot_add_item', {
      p_bot_id: botId,
      p_title: title,
      p_description: description,
      p_category: category,
      p_condition: condition,
      p_image_url: imageUrl,
    }),
  );
}

export async function adminSetAutoBotBidding(enabled) {
  return unwrap(
    await supabase.rpc('admin_set_auto_bot_bidding', {
      p_enabled: enabled,
    }),
  );
}

export async function adminGetAutoBotBidding() {
  return unwrap(await supabase.rpc('admin_get_auto_bot_bidding'));
}



