import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  ShieldCheck, 
  ShieldAlert, 
  Users, 
  MessageSquare, 
  Image as ImageIcon, 
  Bot, 
  Search, 
  Trash2, 
  Ban, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink, 
  Eye, 
  Sparkles, 
  AlertTriangle, 
  X,
  MapPin,
  Calendar,
  Send,
  Zap,
  Check,
  Plus,
  Play,
  CheckCheck,
  MessageCircle,
  Filter,
  Layers,
  Package,
  Sliders,
  Clock
} from 'lucide-react';
import { 
  supabase, 
  adminGetUsers, 
  adminToggleBanUser, 
  adminDeleteUser, 
  adminGetAllMessages, 
  adminDeleteMessage, 
  adminGetAllMedia, 
  adminRemoveMedia,
  adminTriggerBotBid,
  adminGetBiddableItems,
  adminBatchBotBid,
  adminGetBotTrades,
  adminBotAcceptTrade,
  adminBotSendMessage,
  adminBotAddItem,
  adminSetAutoBotBidding,
  adminGetAutoBotBidding,
  unwrap
} from '../lib/supabase';
import { useApp, navigate, errorMessage } from '../lib/core';
import { Avatar, PageLoader, EmptyState } from '../components/ui';

export default function AdminView() {
  const { profile, showToast, adminMode, toggleAdminMode } = useApp();
  const [activeTab, setActiveTab] = useState('accounts'); // 'accounts' | 'messages' | 'media' | 'bots'

  // Verification: strictly for admins
  if (!profile?.is_admin) {
    return (
      <div className="card max-w-lg mx-auto my-12 p-8 text-center shadow-lift">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-bad-soft">
          <ShieldAlert className="text-bad" size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Restricted Area</h1>
        <p className="mt-2 text-sm text-ink-soft">
          This mission control panel is strictly restricted to platform administrators.
        </p>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="btn-primary mt-6 w-full py-2.5"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Founder Admin Control Header */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-ink via-slate-900 to-indigo-950 p-6 text-white shadow-lift">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold backdrop-blur-md border border-white/15">
              <ShieldCheck size={14} className="text-amber-400" />
              <span>Founder Moderation Suite</span>
              <span className="text-white/40">•</span>
              <span className="text-amber-300">@{profile.username}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-white">
              SwitchR Mission Control
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-white/70 max-w-xl">
              Real-time oversight over all accounts, user chat messages, uploaded media, and bot automated bidding.
            </p>
          </div>

          {/* Admin Mode Toggle Switch */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-2.5 border border-white/15 backdrop-blur-md">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-white">Admin Mode</p>
                <p className="text-[10px] text-white/60">
                  {adminMode ? 'Tools Active' : 'Normal Trader View'}
                </p>
              </div>

              <button
                type="button"
                id="admin-mode-toggle-btn"
                onClick={toggleAdminMode}
                className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  adminMode ? 'bg-amber-500' : 'bg-slate-700'
                }`}
                role="switch"
                aria-checked={adminMode}
                title="Toggle Admin Mode on/off"
              >
                <span
                  className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    adminMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {adminMode ? (
                    <Zap size={13} className="text-amber-600 fill-amber-600" />
                  ) : (
                    <Check size={13} className="text-slate-400" />
                  )}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-white/10 hover:bg-white/20 px-4 py-2.5 text-xs font-bold text-white transition border border-white/15"
            >
              🌿 View Normal App
            </button>
          </div>
        </div>

        {/* Decorative background glow */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-500/20 blur-3xl" />
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Users size={16} />
          <span>Accounts & Moderation</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'messages'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <MessageSquare size={16} />
          <span>All Messages & Chat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'media'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <ImageIcon size={16} />
          <span>Media & Images</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bots')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'bots'
              ? 'border-brand text-brand'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Bot size={16} />
          <span>Bots & Simulation</span>
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'accounts' && <AccountsModerationPanel showToast={showToast} currentUserId={profile.id} />}
      {activeTab === 'messages' && <MessagesInspectorPanel showToast={showToast} />}
      {activeTab === 'media' && <MediaGalleryPanel showToast={showToast} />}
      {activeTab === 'bots' && <BotsControlPanel showToast={showToast} currentUserId={profile.id} />}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 1. ACCOUNTS & USER MODERATION PANEL
// -----------------------------------------------------------------------------
function AccountsModerationPanel({ showToast, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'humans' | 'bots' | 'banned'
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetUsers({ search, filter });
      setUsers(data || []);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, filter, showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleBan = async (user) => {
    if (user.id === currentUserId) {
      showToast('You cannot ban your own admin account.', 'error');
      return;
    }
    const newStatus = !user.is_banned;
    setActionBusyId(user.id);
    try {
      await adminToggleBanUser(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_banned: newStatus } : u)),
      );
      showToast(
        newStatus ? `User @${user.username} has been BLOCKED.` : `User @${user.username} unblocked.`,
        newStatus ? 'info' : 'success',
      );
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteUser = async (user) => {
    if (user.id === currentUserId) {
      showToast('You cannot delete your own admin account.', 'error');
      return;
    }
    setActionBusyId(user.id);
    try {
      await adminDeleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      showToast(`User @${user.username} and all their data permanently deleted.`, 'info');
      setConfirmDeleteUser(null);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  // Aggregated quick stats
  const stats = useMemo(() => {
    const total = users.length;
    const humans = users.filter((u) => !u.is_bot).length;
    const bots = users.filter((u) => u.is_bot).length;
    const banned = users.filter((u) => u.is_banned).length;
    return { total, humans, bots, banned };
  }, [users]);

  return (
    <div className="space-y-4">
      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-muted font-medium">Total Accounts</p>
          <p className="text-xl font-bold text-ink mt-1">{stats.total}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted font-medium">Real Humans</p>
          <p className="text-xl font-bold text-brand mt-1">{stats.humans}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted font-medium">Active Bots</p>
          <p className="text-xl font-bold text-coral mt-1">{stats.bots}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-muted font-medium">Blocked / Banned</p>
          <p className="text-xl font-bold text-bad mt-1">{stats.banned}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            className="field pl-9 py-2 text-sm"
            placeholder="Search username, email, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {[
            { id: 'all', label: 'All Accounts' },
            { id: 'humans', label: 'Humans Only' },
            { id: 'bots', label: 'Bots Only' },
            { id: 'banned', label: 'Blocked' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.id
                  ? 'bg-ink text-white'
                  : 'bg-canvas text-ink-soft hover:bg-line/40'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            type="button"
            onClick={fetchUsers}
            className="btn-ghost p-2 text-muted hover:text-ink ml-auto sm:ml-2"
            title="Reload user list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Users Table / List */}
      {loading ? (
        <PageLoader />
      ) : users.length === 0 ? (
        <EmptyState icon={Users} title="No accounts found" text="Try adjusting your search or filters." />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas border-b border-line text-xs uppercase text-muted font-bold">
                <tr>
                  <th className="px-4 py-3">User & Contact</th>
                  <th className="px-4 py-3">Location & Joined</th>
                  <th className="px-4 py-3">Activity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-canvas/50 transition">
                    {/* User Profile */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={user.username} size={38} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ink">@{user.username}</span>
                            {user.is_admin && (
                              <span className="rounded bg-amber-500/15 text-amber-700 px-1.5 py-0.2 text-[10px] font-extrabold uppercase">
                                Founder
                              </span>
                            )}
                            {user.is_bot && (
                              <span className="rounded bg-sky-500/15 text-sky-700 px-1.5 py-0.2 text-[10px] font-extrabold uppercase">
                                Bot
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted truncate max-w-[200px]">
                            {user.email || 'No email registered'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Location & Joined */}
                    <td className="px-4 py-3 text-xs text-ink-soft">
                      <div className="flex items-center gap-1 text-muted">
                        <MapPin size={12} />
                        <span>{user.location_name || 'Not set'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted mt-1">
                        <Calendar size={12} />
                        <span>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString('en-GB') : 'Unknown'}
                        </span>
                      </div>
                    </td>

                    {/* Activity */}
                    <td className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="font-bold text-ink">{user.items_count}</span>{' '}
                          <span className="text-muted">items</span>
                        </div>
                        <div>
                          <span className="font-bold text-ink">{user.trades_count}</span>{' '}
                          <span className="text-muted">trades</span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3">
                      {user.is_banned ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-bad/10 text-bad px-2.5 py-1 text-xs font-bold">
                          <Ban size={12} /> Blocked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-ok/10 text-ok px-2.5 py-1 text-xs font-bold">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/profile/${user.id}`)}
                          className="btn-ghost rounded-lg p-1.5 text-muted hover:text-ink"
                          title="View public profile"
                        >
                          <ExternalLink size={15} />
                        </button>

                        {/* Ban / Block Toggle */}
                        {user.id !== currentUserId && !user.is_admin && (
                          <button
                            type="button"
                            onClick={() => handleToggleBan(user)}
                            disabled={actionBusyId === user.id}
                            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition flex items-center gap-1 ${
                              user.is_banned
                                ? 'bg-ok-soft text-ok hover:bg-ok/20'
                                : 'bg-bad-soft text-bad hover:bg-bad/20'
                            }`}
                            title={user.is_banned ? 'Unblock user' : 'Block / Ban user from site'}
                          >
                            <Ban size={13} />
                            <span>{user.is_banned ? 'Unblock' : 'Block'}</span>
                          </button>
                        )}

                        {/* Permanent Delete */}
                        {user.id !== currentUserId && !user.is_admin && (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUser(user)}
                            disabled={actionBusyId === user.id}
                            className="rounded-lg p-1.5 text-muted hover:text-bad hover:bg-bad-soft transition"
                            title="Permanently delete user account and all items"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="card max-w-md w-full p-6 space-y-4 shadow-lift animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-bad">
              <div className="rounded-2xl bg-bad-soft p-3">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-bold text-ink text-base">Permanent Account Deletion</h3>
                <p className="text-xs text-muted">Irreversible administrative action</p>
              </div>
            </div>

            <p className="text-sm text-ink-soft">
              Are you sure you want to completely delete <strong className="text-ink">@{confirmDeleteUser.username}</strong>?
            </p>
            <p className="text-xs text-muted bg-canvas p-3 rounded-xl border border-line">
              This will permanently erase their listings, all messages, trade offers, reviews, and authentication records.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteUser(null)}
                className="btn-ghost rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteUser(confirmDeleteUser)}
                disabled={actionBusyId === confirmDeleteUser.id}
                className="inline-flex items-center gap-1.5 rounded-xl bg-bad hover:bg-bad/90 px-4 py-2 text-xs font-bold text-white shadow-sm"
              >
                <Trash2 size={14} /> Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 2. MESSAGES & CHAT INSPECTOR PANEL
// -----------------------------------------------------------------------------
function MessagesInspectorPanel({ showToast }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetAllMessages({ search, limit: 150 });
      setMessages(data || []);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [search, showToast]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleDeleteMessage = async (msgId) => {
    const confirmed = window.confirm('Are you sure you want to delete this message?');
    if (!confirmed) return;

    setDeletingId(msgId);
    try {
      await adminDeleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      showToast('Message deleted successfully.', 'info');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <input
            type="text"
            className="field pl-9 py-2 text-sm"
            placeholder="Search messages or usernames..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">
            Showing {messages.length} messages
          </span>
          <button
            type="button"
            onClick={fetchMessages}
            className="btn-ghost p-2 text-muted hover:text-ink"
            title="Refresh messages"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      {loading ? (
        <PageLoader />
      ) : messages.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No messages found" text="No chat messages match your search filter." />
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => {
            const isImage =
              msg.content?.includes('item-images') ||
              /\.(jpg|jpeg|png|webp|gif)/i.test(msg.content);

            return (
              <div
                key={msg.id}
                className="card p-4 transition hover:border-line hover:shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 flex-1 min-w-0">
                  {/* Context Bar */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="font-bold text-ink flex items-center gap-1">
                      @{msg.sender_username}
                      {msg.sender_is_bot && (
                        <span className="text-[10px] bg-sky-500/10 text-sky-700 px-1 rounded font-bold">
                          BOT
                        </span>
                      )}
                    </span>
                    <span>➔</span>
                    <span className="font-bold text-ink flex items-center gap-1">
                      @{msg.receiver_username}
                      {msg.receiver_is_bot && (
                        <span className="text-[10px] bg-sky-500/10 text-sky-700 px-1 rounded font-bold">
                          BOT
                        </span>
                      )}
                    </span>
                    <span className="text-line">•</span>
                    <span className="text-[11px]">
                      Trade: {msg.offered_item_title || 'Item'} ⇄ {msg.requested_item_title || 'Item'}
                    </span>
                    <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] font-semibold border border-line">
                      {msg.trade_status}
                    </span>
                    <span className="text-line">•</span>
                    <span className="text-[11px]">
                      {msg.created_at ? new Date(msg.created_at).toLocaleString('en-GB') : ''}
                    </span>
                  </div>

                  {/* Message Content */}
                  <div className="text-sm text-ink break-words bg-canvas/60 rounded-xl p-3 border border-line/40">
                    {isImage ? (
                      <div className="space-y-1.5">
                        <span className="text-xs text-muted flex items-center gap-1 font-medium">
                          <ImageIcon size={13} /> Attached image in chat:
                        </span>
                        <a href={msg.content} target="_blank" rel="noreferrer" className="inline-block">
                          <img
                            src={msg.content}
                            alt="Chat attachment"
                            className="h-28 w-28 rounded-xl object-cover border border-line hover:opacity-90 transition"
                          />
                        </a>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>

                {/* Moderation Controls */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => navigate(`/trade/${msg.trade_id}`)}
                    className="btn-ghost rounded-xl px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink flex items-center gap-1"
                  >
                    <ExternalLink size={13} /> View Trade
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(msg.id)}
                    disabled={deletingId === msg.id}
                    className="rounded-xl bg-bad-soft text-bad hover:bg-bad/20 px-3 py-1.5 text-xs font-bold transition flex items-center gap-1"
                    title="Remove message from chat"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 3. MEDIA & IMAGES GALLERY PANEL
// -----------------------------------------------------------------------------
function MediaGalleryPanel({ showToast }) {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'item' | 'chat'
  const [previewImage, setPreviewImage] = useState(null);
  const [actionBusyId, setActionBusyId] = useState(null);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetAllMedia({ limit: 200 });
      setMedia(data || []);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleRemoveMedia = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove this ${item.media_type === 'item' ? 'item photo' : 'chat image'}?`,
    );
    if (!confirmed) return;

    setActionBusyId(item.media_id);
    try {
      await adminRemoveMedia(item.media_type, item.media_id);
      setMedia((prev) => prev.filter((m) => m.media_id !== item.media_id));
      showToast('Image successfully removed from platform.', 'info');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setActionBusyId(null);
    }
  };

  const filteredMedia = useMemo(() => {
    if (filterType === 'all') return media;
    return media.filter((m) => m.media_type === filterType);
  }, [media, filterType]);

  return (
    <div className="space-y-4">
      {/* Header & Filter */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: `All Media (${media.length})` },
            { id: 'item', label: `Item Photos (${media.filter((m) => m.media_type === 'item').length})` },
            { id: 'chat', label: `Chat Uploads (${media.filter((m) => m.media_type === 'chat').length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterType(tab.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filterType === tab.id
                  ? 'bg-ink text-white'
                  : 'bg-canvas text-ink-soft hover:bg-line/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={fetchMedia}
          className="btn-ghost p-2 text-muted hover:text-ink"
          title="Refresh media gallery"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Visual Media Grid */}
      {loading ? (
        <PageLoader />
      ) : filteredMedia.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No images found" text="No images match the selected filter." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={`${item.media_type}-${item.media_id}`}
              className="card overflow-hidden group flex flex-col justify-between hover:shadow-lift transition"
            >
              <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.title_or_context || 'Uploaded media'}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src =
                      'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=400&auto=format&fit=crop&q=60';
                  }}
                />

                {/* Type Badge */}
                <span className="absolute top-2 left-2 rounded-lg bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                  {item.media_type === 'item' ? 'Listing' : 'Chat'}
                </span>

                {/* Hover overlay preview button */}
                <button
                  type="button"
                  onClick={() => setPreviewImage(item)}
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition text-white"
                  title="Expand image"
                >
                  <Eye size={24} />
                </button>
              </div>

              {/* Media details & Moderation */}
              <div className="p-3 space-y-2">
                <p className="text-xs font-bold text-ink truncate" title={item.title_or_context}>
                  {item.title_or_context || 'Untitled'}
                </p>
                <div className="flex items-center justify-between text-[11px] text-muted">
                  <span className="truncate">@{item.owner_username}</span>
                  {item.is_bot && (
                    <span className="text-[9px] bg-sky-500/10 text-sky-700 px-1 rounded font-bold">
                      BOT
                    </span>
                  )}
                </div>

                <div className="pt-1 flex items-center justify-between border-t border-line/60">
                  <button
                    type="button"
                    onClick={() => {
                      if (item.media_type === 'item') navigate(`/item/${item.media_id}`);
                    }}
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveMedia(item)}
                    disabled={actionBusyId === item.media_id}
                    className="text-bad hover:bg-bad-soft p-1 rounded-md transition"
                    title="Remove inappropriate image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-white/80 p-2"
            >
              <X size={24} />
            </button>
            <img
              src={previewImage.image_url}
              alt={previewImage.title_or_context}
              className="max-h-[80vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl"
            />
            <div className="mt-3 text-center text-white text-xs">
              <p className="font-bold">{previewImage.title_or_context}</p>
              <p className="text-white/70">Uploaded by @{previewImage.owner_username}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// 4. ADVANCED BOTS & SIMULATION MISSION CONTROL PANEL
// -----------------------------------------------------------------------------
function BotsControlPanel({ showToast, currentUserId }) {
  const [subTab, setSubTab] = useState('target'); // 'target' | 'trades' | 'fleet'
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auto-bidding master switch
  const [autoBiddingEnabled, setAutoBiddingEnabled] = useState(true);
  const [togglingAuto, setTogglingAuto] = useState(false);

  // Sub-Tab A: Target items for bidding
  const [biddableItems, setBiddableItems] = useState([]);
  const [biddableLoading, setBiddableLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('humans'); // 'all' | 'humans' | 'mine'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [unbidOnly, setUnbidOnly] = useState(false);
  const [bidModalItem, setBidModalItem] = useState(null);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [botInventory, setBotInventory] = useState([]);
  const [selectedBotItemId, setSelectedBotItemId] = useState('');
  const [biddingBusy, setBiddingBusy] = useState(false);
  const [batchSurgeBusy, setBatchSurgeBusy] = useState(false);

  // Sub-Tab B: Bot active trades
  const [botTrades, setBotTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradeStatusFilter, setTradeStatusFilter] = useState('all');
  const [customMsgTradeId, setCustomMsgTradeId] = useState(null);
  const [customMsgText, setCustomMsgText] = useState('');
  const [tradeActionBusyId, setTradeActionBusyId] = useState(null);

  // Sub-Tab C: Bot fleet & Add inventory
  const [addInventoryModalBot, setAddInventoryModalBot] = useState(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Collectibles');
  const [newItemCondition, setNewItemCondition] = useState('Good');
  const [newItemImage, setNewItemImage] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [addItemBusy, setAddItemBusy] = useState(false);

  // Load initial bot fleet and auto-bidding state
  const loadFleetAndSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [botProfiles, autoSetting] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, location_name, created_at, is_bot')
          .eq('is_bot', true)
          .order('username', { ascending: true })
          .then(unwrap),
        adminGetAutoBotBidding().catch(() => true),
      ]);
      setBots(botProfiles || []);
      setAutoBiddingEnabled(autoSetting !== false);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadFleetAndSettings();
  }, [loadFleetAndSettings]);

  // Load biddable items when on 'target' subTab
  const fetchBiddableItems = useCallback(async () => {
    setBiddableLoading(true);
    try {
      const ownerId = ownerFilter === 'mine' ? currentUserId : null;
      const data = await adminGetBiddableItems({
        search: itemSearch,
        ownerId,
        category: categoryFilter,
        unbidOnly: unbidOnly || ownerFilter === 'humans',
        limit: 80,
      });

      let filtered = data || [];
      if (ownerFilter === 'humans') {
        filtered = filtered.filter((i) => !i.owner_is_bot);
      }
      setBiddableItems(filtered);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBiddableLoading(false);
    }
  }, [itemSearch, ownerFilter, categoryFilter, unbidOnly, currentUserId, showToast]);

  useEffect(() => {
    if (subTab === 'target') {
      fetchBiddableItems();
    }
  }, [subTab, fetchBiddableItems]);

  // Load bot trades when on 'trades' subTab
  const fetchBotTrades = useCallback(async () => {
    setTradesLoading(true);
    try {
      const data = await adminGetBotTrades({
        status: tradeStatusFilter,
        limit: 50,
      });
      setBotTrades(data || []);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setTradesLoading(false);
    }
  }, [tradeStatusFilter, showToast]);

  useEffect(() => {
    if (subTab === 'trades') {
      fetchBotTrades();
    }
  }, [subTab, fetchBotTrades]);

  // Load bot inventory when a bot is selected in Bid Modal
  useEffect(() => {
    if (!selectedBotId) {
      setBotInventory([]);
      setSelectedBotItemId('');
      return;
    }
    supabase
      .from('items')
      .select('id, title, category, condition, image_url')
      .eq('user_id', selectedBotId)
      .eq('status', 'available')
      .then(({ data }) => {
        setBotInventory(data || []);
      });
  }, [selectedBotId]);

  // Master Auto-Bidding Toggle
  const handleToggleAutoBidding = async () => {
    const nextVal = !autoBiddingEnabled;
    setTogglingAuto(true);
    try {
      await adminSetAutoBotBidding(nextVal);
      setAutoBiddingEnabled(nextVal);
      showToast(
        nextVal
          ? '🤖 Automated Bot Bidding is now ENABLED for new listings.'
          : '⏸️ Automated Bot Bidding has been PAUSED.',
        nextVal ? 'success' : 'info',
      );
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setTogglingAuto(false);
    }
  };

  // One-Click Marketplace Surge
  const handleBatchSurge = async () => {
    const confirmed = window.confirm(
      '⚡ Stimulate Market:\n\nThis will command Liverpool bots to find up to 10 active human listings that currently have NO offers, and place realistic barter offers on each one.\n\nProceed?',
    );
    if (!confirmed) return;

    setBatchSurgeBusy(true);
    try {
      const res = await adminBatchBotBid(10);
      showToast(
        `⚡ Market stimulated! Placed ${res?.bids_created || 0} new bot offers across listings.`,
        'success',
      );
      if (subTab === 'target') fetchBiddableItems();
      if (subTab === 'trades') fetchBotTrades();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBatchSurgeBusy(false);
    }
  };

  // Submit manual bot bid on an item
  const handleExecuteBotBid = async () => {
    if (!bidModalItem) return;
    setBiddingBusy(true);
    try {
      const tradeId = await adminTriggerBotBid(
        bidModalItem.id,
        selectedBotId || null,
      );
      showToast(
        `⚡ Bot offer placed on "${bidModalItem.title}"! (Owner: @${bidModalItem.owner_username})`,
        'success',
      );
      setBidModalItem(null);
      fetchBiddableItems();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBiddingBusy(false);
    }
  };

  // Bot trade actions (Accept, Send Message, Scouse Reply)
  const handleBotAcceptTrade = async (tradeId) => {
    setTradeActionBusyId(tradeId);
    try {
      await adminBotAcceptTrade(tradeId);
      showToast('✅ Trade accepted on behalf of bot! Greeting sent to chat.', 'success');
      fetchBotTrades();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setTradeActionBusyId(null);
    }
  };

  const handleSendBotMessage = async (tradeId, botId) => {
    if (!customMsgText.trim()) return;
    setTradeActionBusyId(tradeId);
    try {
      await adminBotSendMessage(tradeId, customMsgText.trim(), botId);
      showToast('💬 Message sent as bot.', 'success');
      setCustomMsgTradeId(null);
      setCustomMsgText('');
      fetchBotTrades();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setTradeActionBusyId(null);
    }
  };

  const handleTriggerScouseReply = async (tradeId) => {
    setTradeActionBusyId(tradeId);
    try {
      await supabase.rpc('bot_reply_to_trade', {
        p_trade_id: tradeId,
        p_user_message: 'where can we meet up in town?',
      });
      showToast('⚡ Triggered localized Scouse bot reply in trade chat.', 'info');
      fetchBotTrades();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setTradeActionBusyId(null);
    }
  };

  // Add inventory item to bot
  const handleCreateBotItem = async (e) => {
    e.preventDefault();
    if (!addInventoryModalBot || !newItemTitle.trim()) return;
    setAddItemBusy(true);
    try {
      await adminBotAddItem({
        botId: addInventoryModalBot.id,
        title: newItemTitle.trim(),
        description: newItemDesc.trim() || null,
        category: newItemCategory,
        condition: newItemCondition,
        imageUrl:
          newItemImage.trim() ||
          'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
      });
      showToast(`📦 Added "${newItemTitle}" to @${addInventoryModalBot.username}'s inventory!`, 'success');
      setAddInventoryModalBot(null);
      setNewItemTitle('');
      setNewItemDesc('');
      setNewItemImage('');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setAddItemBusy(false);
    }
  };

  const PRESET_TEMPLATES = [
    {
      title: 'Vintage Beatles Abbey Road Vinyl',
      category: 'Collectibles',
      condition: 'Like new',
      image: 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Sony WH-1000XM4 Noise Cancelling Headphones',
      category: 'Electronics',
      condition: 'Like new',
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Nintendo Switch Lite (Turquoise)',
      category: 'Gaming',
      condition: 'Good',
      image: 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=600&auto=format&fit=crop&q=80',
    },
    {
      title: 'Retro Polaroid Sun 660 Instant Camera',
      category: 'Collectibles',
      condition: 'Good',
      image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=600&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Master Bot Automation & Activity Header Card */}
      <div className="card p-6 bg-linear-to-br from-white via-indigo-50/20 to-amber-50/30 border-indigo-200/50 shadow-lift">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
              <Bot size={16} />
              <span>Liverpool Bot Network (20 Autonomous Agents)</span>
            </div>
            <h2 className="font-display text-2xl font-black text-ink mt-1">
              Bot Mission Control & Market Simulator
            </h2>
            <p className="text-xs text-muted mt-1 max-w-xl">
              Command bots to bid on any user’s items, simulate active trade negotiations, inject fresh items into bot inventories, or trigger marketplace surges.
            </p>
          </div>

          {/* Quick Actions & Master Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Auto-Bidding Switch */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-canvas p-2.5 border border-line">
              <div className="text-right">
                <p className="text-xs font-bold text-ink">Auto-Bid on New Items</p>
                <p className="text-[10px] text-muted">
                  {autoBiddingEnabled ? 'Active on all listings' : 'Paused (Manual only)'}
                </p>
              </div>
              <button
                type="button"
                id="bot-auto-bidding-toggle-btn"
                onClick={handleToggleAutoBidding}
                disabled={togglingAuto}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  autoBiddingEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
                title="Toggle automatic bot bidding on/off"
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    autoBiddingEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {autoBiddingEnabled ? (
                    <Zap size={11} className="text-indigo-600 fill-indigo-600" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                  )}
                </span>
              </button>
            </div>

            {/* Stimulate Market Button */}
            <button
              type="button"
              id="bot-batch-surge-btn"
              onClick={handleBatchSurge}
              disabled={batchSurgeBusy}
              className="btn-primary py-2.5 px-4 text-xs font-bold flex items-center gap-2 shadow-lift bg-linear-to-r from-indigo-600 to-brand hover:opacity-95"
              title="Command bots to bid on all active human listings with 0 offers"
            >
              {batchSurgeBusy ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} className="fill-white" />
              )}
              <span>⚡ Stimulate Market (Auto-Bid All Unbid)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Target Items | Active Trades | Fleet */}
      <div className="flex border-b border-line gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSubTab('target')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            subTab === 'target'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Zap size={15} />
          <span>🎯 Bid on Any User's Item ({biddableItems.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('trades')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            subTab === 'trades'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Layers size={15} />
          <span>🔄 Bot Active Trades & Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('fleet')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            subTab === 'fleet'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-ink-soft hover:text-ink'
          }`}
        >
          <Bot size={15} />
          <span>📦 Liverpool Bot Fleet ({bots.length})</span>
        </button>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 1: TARGET ANY USER'S ITEM FOR BOT BIDDING                */}
      {/* ----------------------------------------------------------------- */}
      {subTab === 'target' && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="card p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={15} />
              <input
                type="text"
                className="field pl-9 py-1.5 text-xs"
                placeholder="Search items, users, locations..."
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Owner Filter */}
              <div className="flex items-center rounded-xl bg-canvas p-1 border border-line text-xs font-semibold">
                {[
                  { id: 'humans', label: 'Humans Only' },
                  { id: 'all', label: 'All Items' },
                  { id: 'mine', label: 'My Listings' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOwnerFilter(f.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs transition ${
                      ownerFilter === f.id
                        ? 'bg-white text-ink shadow-2xs font-bold'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Category Dropdown */}
              <select
                className="field text-xs py-1.5 w-auto"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="Electronics">Electronics</option>
                <option value="Collectibles">Collectibles</option>
                <option value="Clothing">Clothing</option>
                <option value="Home & Garden">Home & Garden</option>
                <option value="Books">Books</option>
                <option value="Toys & Games">Toys & Games</option>
              </select>

              {/* Unbid Only Checkbox */}
              <label className="flex items-center gap-1.5 text-xs text-ink-soft cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={unbidOnly}
                  onChange={(e) => setUnbidOnly(e.target.checked)}
                  className="rounded border-line text-indigo-600 focus:ring-0"
                />
                <span>Unbid Only</span>
              </label>

              <button
                type="button"
                onClick={fetchBiddableItems}
                className="btn-ghost p-1.5 text-muted hover:text-ink ml-auto"
                title="Refresh listings"
              >
                <RefreshCw size={14} className={biddableLoading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Items Table / Cards */}
          {biddableLoading ? (
            <PageLoader />
          ) : biddableItems.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No listings found"
              text="No items match your search or filters. Try selecting 'All Items'."
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas border-b border-line text-[11px] uppercase text-muted font-bold">
                    <tr>
                      <th className="px-4 py-3">Listing</th>
                      <th className="px-4 py-3">Owner & Location</th>
                      <th className="px-4 py-3">Category & Condition</th>
                      <th className="px-4 py-3">Bot Bids</th>
                      <th className="px-4 py-3 text-right">Command Bot Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {biddableItems.map((item) => (
                      <tr key={item.id} className="hover:bg-canvas/50 transition">
                        {/* Listing */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                item.image_url ||
                                'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=200&auto=format&fit=crop&q=60'
                              }
                              alt={item.title}
                              className="h-11 w-11 rounded-xl object-cover border border-line shrink-0"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-ink truncate max-w-xs">{item.title}</p>
                              <p className="text-[11px] text-muted truncate max-w-xs">
                                {item.description || 'No description'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Owner & Location */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-ink">@{item.owner_username}</span>
                            {item.owner_is_bot && (
                              <span className="text-[9px] bg-sky-500/15 text-sky-700 px-1 rounded font-bold">
                                BOT
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                            <MapPin size={11} className="text-brand shrink-0" />
                            <span className="truncate">{item.owner_location || 'Liverpool'}</span>
                          </p>
                        </td>

                        {/* Category & Condition */}
                        <td className="px-4 py-3 text-ink-soft">
                          <span className="font-medium">{item.category}</span>
                          <span className="text-muted block text-[10px]">{item.condition}</span>
                        </td>

                        {/* Bot Bids Count */}
                        <td className="px-4 py-3">
                          {Number(item.pending_bot_offers_count) > 0 ? (
                            <span className="rounded-full bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 text-[10px] border border-indigo-200">
                              {item.pending_bot_offers_count} Bot offer{item.pending_bot_offers_count > 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-muted text-[10px]">0 bot offers</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setBidModalItem(item);
                              setSelectedBotId('');
                            }}
                            className="btn-primary py-1.5 px-3 text-xs font-bold inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700"
                          >
                            <Zap size={13} className="fill-white" />
                            <span>Command Bot Bid</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 2: BOT ACTIVE TRADES & SIMULATOR                          */}
      {/* ----------------------------------------------------------------- */}
      {subTab === 'trades' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="card p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Bot Trades' },
                { id: 'pending', label: 'Pending Offers' },
                { id: 'accepted', label: 'Accepted (In Chat)' },
                { id: 'completed', label: 'Completed' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTradeStatusFilter(f.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                    tradeStatusFilter === f.id
                      ? 'bg-ink text-white font-bold'
                      : 'bg-canvas text-ink-soft hover:bg-line/40'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={fetchBotTrades}
              className="btn-ghost p-1.5 text-muted hover:text-ink"
              title="Refresh bot trades"
            >
              <RefreshCw size={15} className={tradesLoading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Bot Trades Stream */}
          {tradesLoading ? (
            <PageLoader />
          ) : botTrades.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No bot trades found"
              text="No trades involving bots match the selected filter."
            />
          ) : (
            <div className="space-y-3">
              {botTrades.map((t) => (
                <div
                  key={t.trade_id}
                  className="card p-4 hover:shadow-xs transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  {/* Trade Details */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-extrabold text-ink flex items-center gap-1">
                        @{t.human_username}
                        <span className="text-[10px] bg-line px-1 rounded text-muted font-normal">
                          Human
                        </span>
                      </span>
                      <span className="text-muted">⇄</span>
                      <span className="font-extrabold text-indigo-700 flex items-center gap-1">
                        @{t.bot_username}
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1 rounded font-bold">
                          BOT
                        </span>
                      </span>
                      <span className="text-line">•</span>
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold uppercase border border-line">
                        {t.status}
                      </span>
                      <span className="text-line">•</span>
                      <span className="text-muted text-[11px]">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString('en-GB') : ''}
                      </span>
                    </div>

                    {/* Items Swapped */}
                    <div className="flex items-center gap-4 text-xs bg-canvas/60 p-2.5 rounded-xl border border-line/40">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <img
                          src={t.offered_item_image || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=100'}
                          alt={t.offered_item_title}
                          className="h-9 w-9 rounded-lg object-cover border border-line shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-[10px] text-muted">Offered:</p>
                          <p className="font-bold text-ink truncate">{t.offered_item_title || 'Item'}</p>
                        </div>
                      </div>

                      <span className="text-muted font-bold">⇄</span>

                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <img
                          src={t.requested_item_image || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=100'}
                          alt={t.requested_item_title}
                          className="h-9 w-9 rounded-lg object-cover border border-line shrink-0"
                        />
                        <div className="truncate">
                          <p className="text-[10px] text-muted">Requested:</p>
                          <p className="font-bold text-ink truncate">{t.requested_item_title || 'Item'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Last Chat Message Excerpt */}
                    {t.last_message && (
                      <p className="text-xs text-ink-soft italic truncate pl-1 border-l-2 border-indigo-400">
                        "{t.last_message}"
                      </p>
                    )}
                  </div>

                  {/* Bot Controls for this Trade */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-start lg:self-center">
                    {/* If pending and offer was made to the bot, show Accept as Bot */}
                    {t.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => handleBotAcceptTrade(t.trade_id)}
                        disabled={tradeActionBusyId === t.trade_id}
                        className="rounded-xl bg-ok text-white hover:bg-ok/90 px-3 py-1.5 text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                        title="Accept trade offer on behalf of the bot"
                      >
                        <CheckCheck size={14} /> Accept as Bot
                      </button>
                    )}

                    {/* Chat As Bot */}
                    {t.status === 'accepted' && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomMsgTradeId(customMsgTradeId === t.trade_id ? null : t.trade_id);
                            setCustomMsgText('');
                          }}
                          className="rounded-xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 text-xs font-bold transition flex items-center gap-1"
                          title="Speak as this bot in trade chat"
                        >
                          <MessageCircle size={14} /> Speak as Bot
                        </button>

                        <button
                          type="button"
                          onClick={() => handleTriggerScouseReply(t.trade_id)}
                          disabled={tradeActionBusyId === t.trade_id}
                          className="rounded-xl bg-canvas hover:bg-line/60 border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition flex items-center gap-1"
                          title="Trigger automatic Scouse reply from bot"
                        >
                          <Sparkles size={13} className="text-amber-500" /> Scouse Reply
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => navigate(`/trade/${t.trade_id}`)}
                      className="btn-ghost rounded-xl px-2.5 py-1.5 text-xs font-semibold text-muted hover:text-ink flex items-center gap-1"
                    >
                      <ExternalLink size={13} /> View Trade
                    </button>
                  </div>

                  {/* Inline Message Input (when Speak as Bot is expanded) */}
                  {customMsgTradeId === t.trade_id && (
                    <div className="w-full mt-2 pt-2 border-t border-line flex items-center gap-2">
                      <input
                        type="text"
                        className="field py-1.5 text-xs flex-1"
                        placeholder={`Type message to send as @${t.bot_username}...`}
                        value={customMsgText}
                        onChange={(e) => setCustomMsgText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSendBotMessage(t.trade_id, t.bot_id);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleSendBotMessage(t.trade_id, t.bot_id)}
                        disabled={tradeActionBusyId === t.trade_id || !customMsgText.trim()}
                        className="btn-primary py-1.5 px-3 text-xs font-bold flex items-center gap-1"
                      >
                        <Send size={12} /> Send as Bot
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* SUB-TAB 3: BOT FLEET & ADD INVENTORY                              */}
      {/* ----------------------------------------------------------------- */}
      {subTab === 'fleet' && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-ink text-sm">Active Merseyside Bot Agents ({bots.length})</h3>
              <p className="text-xs text-muted">Each bot has authentic local Liverpool neighborhoods and inventory.</p>
            </div>
            <button
              type="button"
              onClick={loadFleetAndSettings}
              className="btn-ghost p-1.5 text-muted hover:text-ink"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {bots.map((bot) => (
              <div
                key={bot.id}
                className="card p-4 flex flex-col justify-between hover:shadow-xs transition space-y-3"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={bot.username} size={40} />
                  <div className="min-w-0">
                    <p className="font-bold text-ink text-xs truncate">@{bot.username}</p>
                    <p className="text-[11px] text-muted flex items-center gap-1 mt-0.5">
                      <MapPin size={11} className="text-brand shrink-0" />
                      <span className="truncate">{bot.location_name}</span>
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-line/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${bot.id}`)}
                    className="text-[11px] font-semibold text-brand hover:underline"
                  >
                    View Closet
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAddInventoryModalBot(bot);
                      setNewItemTitle('');
                      setNewItemDesc('');
                      setNewItemImage('');
                    }}
                    className="rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 text-[11px] font-bold transition flex items-center gap-1"
                  >
                    <Plus size={12} /> Add Item
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 1: COMMAND BOT BID MODAL                                    */}
      {/* ----------------------------------------------------------------- */}
      {bidModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-lift animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <div className="rounded-xl bg-indigo-100 text-indigo-700 p-2">
                  <Zap size={18} className="fill-indigo-600" />
                </div>
                <div>
                  <h3 className="font-bold text-ink text-base">Command Bot Bid</h3>
                  <p className="text-xs text-muted">Place offer on another user's item</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBidModalItem(null)}
                className="text-muted hover:text-ink p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Item Preview */}
            <div className="flex items-center gap-3 bg-canvas p-3 rounded-2xl border border-line">
              <img
                src={bidModalItem.image_url || 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=200'}
                alt={bidModalItem.title}
                className="h-14 w-14 rounded-xl object-cover border border-line shrink-0"
              />
              <div className="min-w-0">
                <p className="font-bold text-ink text-sm truncate">{bidModalItem.title}</p>
                <p className="text-xs text-muted">
                  Owner: <span className="font-bold text-ink">@{bidModalItem.owner_username}</span> • {bidModalItem.owner_location}
                </p>
                <p className="text-[11px] text-muted">
                  {bidModalItem.category} • {bidModalItem.condition}
                </p>
              </div>
            </div>

            {/* Choose Bot */}
            <div className="space-y-3">
              <div>
                <label className="label">1. Choose Bidding Bot</label>
                <select
                  className="field text-xs"
                  value={selectedBotId}
                  onChange={(e) => setSelectedBotId(e.target.value)}
                >
                  <option value="">⚡ Random Liverpool Bot (Smart algorithm)</option>
                  {bots.map((bot) => (
                    <option key={bot.id} value={bot.id}>
                      @{bot.username} ({bot.location_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bot Item to Offer */}
              {selectedBotId && botInventory.length > 0 && (
                <div>
                  <label className="label">2. Bot Item to Offer (Optional)</label>
                  <select
                    className="field text-xs"
                    value={selectedBotItemId}
                    onChange={(e) => setSelectedBotItemId(e.target.value)}
                  >
                    <option value="">Auto-pick matching available item</option>
                    {botInventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title} ({item.category} • {item.condition})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => setBidModalItem(null)}
                className="btn-ghost rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBotBid}
                disabled={biddingBusy}
                className="btn-primary rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700"
              >
                {biddingBusy ? (
                  <RefreshCw size={14} className="animate-spin" />
                ) : (
                  <Zap size={14} className="fill-white" />
                )}
                <span>Send Bot Offer Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* MODAL 2: ADD ITEM TO BOT INVENTORY MODAL                         */}
      {/* ----------------------------------------------------------------- */}
      {addInventoryModalBot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="card max-w-lg w-full p-6 space-y-4 shadow-lift animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-bold text-ink text-base">Add Item to @{addInventoryModalBot.username}</h3>
                <p className="text-xs text-muted">Expand this bot’s barter wardrobe</p>
              </div>
              <button
                type="button"
                onClick={() => setAddInventoryModalBot(null)}
                className="text-muted hover:text-ink p-1"
              >
                <X size={18} />
              </button>
            </div>

            {/* Fast Presets */}
            <div>
              <p className="text-xs font-bold text-muted uppercase mb-1.5">⚡ 1-Click Fast Presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.title}
                    type="button"
                    onClick={() => {
                      setNewItemTitle(tmpl.title);
                      setNewItemCategory(tmpl.category);
                      setNewItemCondition(tmpl.condition);
                      setNewItemImage(tmpl.image);
                    }}
                    className="rounded-lg bg-canvas hover:bg-indigo-50 border border-line text-[11px] px-2.5 py-1 text-ink-soft transition"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Item Form */}
            <form onSubmit={handleCreateBotItem} className="space-y-3">
              <div>
                <label className="label">Item Title</label>
                <input
                  type="text"
                  className="field text-xs"
                  placeholder="e.g. Vintage Leather Jacket"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Category</label>
                  <select
                    className="field text-xs"
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                  >
                    <option value="Collectibles">Collectibles</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Clothing">Clothing</option>
                    <option value="Gaming">Gaming</option>
                    <option value="Home & Garden">Home & Garden</option>
                    <option value="Books">Books</option>
                    <option value="Toys & Games">Toys & Games</option>
                  </select>
                </div>

                <div>
                  <label className="label">Condition</label>
                  <select
                    className="field text-xs"
                    value={newItemCondition}
                    onChange={(e) => setNewItemCondition(e.target.value)}
                  >
                    <option value="New">New</option>
                    <option value="Like new">Like new</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Image URL</label>
                <input
                  type="url"
                  className="field text-xs"
                  placeholder="https://images.unsplash.com/..."
                  value={newItemImage}
                  onChange={(e) => setNewItemImage(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => setAddInventoryModalBot(null)}
                  className="btn-ghost rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addItemBusy || !newItemTitle.trim()}
                  className="btn-primary rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-1.5"
                >
                  {addItemBusy ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                  <span>Save Item to Bot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

