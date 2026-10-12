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
  Check
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
// 4. BOTS & SIMULATION PANEL
// -----------------------------------------------------------------------------
function BotsControlPanel({ showToast, currentUserId }) {
  const [bots, setBots] = useState([]);
  const [userItems, setUserItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState('');
  const [selectedBot, setSelectedBot] = useState('');
  const [biddingBusy, setBiddingBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadBotData = useCallback(async () => {
    setLoading(true);
    try {
      const [botProfiles, myItems] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, location_name, created_at, is_bot')
          .eq('is_bot', true)
          .order('username', { ascending: true })
          .then(unwrap),
        supabase
          .from('items')
          .select('id, title, category, condition, image_url')
          .eq('user_id', currentUserId)
          .eq('status', 'available')
          .order('created_at', { ascending: false })
          .then(unwrap),
      ]);

      setBots(botProfiles || []);
      setUserItems(myItems || []);
      if (myItems && myItems.length > 0) {
        setSelectedItem(myItems[0].id);
      }
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, showToast]);

  useEffect(() => {
    loadBotData();
  }, [loadBotData]);

  const handleTriggerBotBid = async () => {
    if (!selectedItem) {
      showToast('Please select one of your items to receive an offer.', 'error');
      return;
    }

    setBiddingBusy(true);
    try {
      const tradeId = await adminTriggerBotBid(selectedItem, selectedBot || null);
      showToast('⚡ Bot trade offer placed! Check your Trades inbox.', 'success');
      navigate(`/trades?tab=received`);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBiddingBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Bot Bid Simulator Card */}
      <div className="card p-6 bg-linear-to-br from-white to-amber-50/40 border-amber-200/60 shadow-lift">
        <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
          <Sparkles size={18} className="text-amber-500" />
          <span>Automated Bid Trigger</span>
        </div>
        <h2 className="font-display text-xl font-extrabold text-ink mt-1">
          Make a Bot Place an Offer on Your Item
        </h2>
        <p className="text-xs text-muted mt-1 max-w-xl">
          Instantly tests the trade offer lifecycle, sound alerts, realtime push notifications, and chat messaging.
        </p>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Target Item (Your Available Listings)</label>
            {userItems.length === 0 ? (
              <p className="text-xs text-muted italic p-2 bg-canvas rounded-xl">
                You have no available items. List an item first to receive a bot bid!
              </p>
            ) : (
              <select
                className="field text-sm"
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
              >
                {userItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title} ({item.category} • {item.condition})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="label">Select Specific Bot (Or Random)</label>
            <select
              className="field text-sm"
              value={selectedBot}
              onChange={(e) => setSelectedBot(e.target.value)}
            >
              <option value="">Random Liverpool Bot</option>
              {bots.map((bot) => (
                <option key={bot.id} value={bot.id}>
                  @{bot.username} ({bot.location_name})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTriggerBotBid}
          disabled={biddingBusy || userItems.length === 0}
          className="btn-primary mt-5 py-3 px-6 text-sm flex items-center gap-2"
        >
          {biddingBusy ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Zap size={16} className="fill-white" />
          )}
          <span>Trigger Instant Bot Offer Now</span>
        </button>
      </div>

      {/* Registered Bots Directory */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-ink text-base">Liverpool Bot Network ({bots.length})</h3>
            <p className="text-xs text-muted">Automated trading peers across Merseyside</p>
          </div>
          <button
            type="button"
            onClick={loadBotData}
            className="btn-ghost p-2 text-muted hover:text-ink"
            title="Refresh bot list"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {bots.map((bot) => (
            <div key={bot.id} className="p-3 rounded-2xl bg-canvas border border-line flex items-center gap-3">
              <Avatar name={bot.username} size={34} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-ink truncate">@{bot.username}</p>
                <p className="text-[11px] text-muted truncate">{bot.location_name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
