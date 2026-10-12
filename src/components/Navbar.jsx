import { useState, useEffect } from 'react';
import { Compass, Flame, ArrowRightLeft, Plus, User, Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { navigate, useApp } from '../lib/core';
import { 
  getUnreadTradeCount, 
  subscribeToUnreadChanges,
  fetchNotifications,
  fetchUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead
} from '../lib/notifications';
import NotificationCenterModal from './NotificationCenterModal';
import { Avatar } from './ui';
import { Logo } from '../views/AuthView';

export default function Navbar({ currentPath }) {
  const { session, profile } = useApp();
  const userId = session?.user?.id;
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  // Live count of pending offers waiting for the current user and unread messages
  useEffect(() => {
    if (!userId || !supabase) return;

    const fetchPending = async () => {
      const { count } = await supabase
        .from('trades')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', userId)
        .eq('status', 'pending');
      setPendingCount(count || 0);
    };

    const fetchUnreadMessages = async () => {
      const count = await getUnreadTradeCount(userId);
      setUnreadMsgCount(count);
    };

    const loadNotifs = async () => {
      const list = await fetchNotifications(userId);
      const count = await fetchUnreadNotificationsCount(userId);
      setNotifications(list);
      setUnreadNotifCount(count);
    };

    fetchPending();
    fetchUnreadMessages();
    loadNotifs();

    // Listen for new trades targeting current user
    const channel = supabase
      .channel('navbar-trades-count')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trades' },
        () => {
          fetchPending();
          fetchUnreadMessages();
          loadNotifs();
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          fetchUnreadMessages();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        () => {
          loadNotifs();
        },
      )
      .subscribe();

    // Also listen to internal read/unread state changes
    const unsubUnread = subscribeToUnreadChanges(() => {
      fetchUnreadMessages();
      loadNotifs();
    });

    return () => {
      supabase.removeChannel(channel);
      unsubUnread();
    };
  }, [userId]);

  const totalBadge = pendingCount + unreadMsgCount;

  const handleMarkAllRead = async () => {
    if (!userId) return;
    await markAllNotificationsAsRead(userId);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadNotifCount(0);
  };

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n)),
      );
      setUnreadNotifCount((c) => Math.max(0, c - 1));
    }
  };

  const navItems = [
    { label: 'Browse', path: '/', icon: Compass, id: 'nav-browse' },
    { label: 'Explore', path: '/explore', icon: Flame, id: 'nav-explore' },
    {
      label: 'Trades',
      path: '/trades',
      icon: ArrowRightLeft,
      badge: totalBadge,
      id: 'nav-trades',
    },
    { label: 'List Item', path: '/new', icon: Plus, isAction: true, id: 'nav-list' },
    { label: 'Profile', path: '/me', icon: User, id: 'nav-profile' },
  ];

  const isCurrent = (p) => {
    if (p === '/') return currentPath === '/' || currentPath === '';
    return currentPath.startsWith(p);
  };

  return (
    <>
      {/* Desktop Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-line/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center text-left transition hover:opacity-90"
          >
            <Logo />
          </button>

          {/* Right Controls: Desktop Nav + Mobile Notification Bell */}
          <div className="flex items-center gap-2">
            <nav className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                id="nav-desktop-browse"
                onClick={() => navigate('/')}
                className={`btn-ghost rounded-xl px-3.5 py-2 text-sm font-semibold ${
                  isCurrent('/') ? 'bg-ink/5 text-ink' : 'text-ink-soft'
                }`}
              >
                <Compass size={17} /> Browse
              </button>

              <button
                type="button"
                id="nav-desktop-explore"
                onClick={() => navigate('/explore')}
                className={`btn-ghost rounded-xl px-3.5 py-2 text-sm font-semibold ${
                  isCurrent('/explore') ? 'bg-ink/5 text-ink' : 'text-ink-soft'
                }`}
              >
                <Flame size={17} className={isCurrent('/explore') ? 'text-coral fill-coral' : 'text-coral'} /> Explore
              </button>

              <button
                type="button"
                id="nav-desktop-trades"
                onClick={() => navigate('/trades')}
                className={`btn-ghost relative rounded-xl px-3.5 py-2 text-sm font-semibold ${
                  isCurrent('/trades') ? 'bg-ink/5 text-ink' : 'text-ink-soft'
                }`}
              >
                <ArrowRightLeft size={17} /> Trades
                {totalBadge > 0 && (
                  <span
                    className={`flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-white shadow-sm ${
                      unreadMsgCount > 0 ? 'animate-pulse' : ''
                    }`}
                    title={`${pendingCount} pending offers, ${unreadMsgCount} unread messages`}
                  >
                    {totalBadge}
                  </span>
                )}
              </button>

              <button
                type="button"
                id="nav-desktop-list"
                onClick={() => navigate('/new')}
                className="btn-primary ml-1 rounded-xl px-4 py-2 text-sm"
              >
                <Plus size={16} strokeWidth={2.5} /> List item
              </button>
            </nav>

            {/* Notification Bell (Both Desktop & Mobile) */}
            <button
              type="button"
              id="nav-notifications-btn"
              onClick={() => setNotifModalOpen(true)}
              className="btn-ghost relative rounded-xl p-2 text-ink-soft transition hover:bg-canvas hover:text-ink"
              title="Notifications"
              aria-label="View notifications"
            >
              <Bell size={19} />
              {unreadNotifCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* Profile Avatar (Desktop) */}
            <button
              type="button"
              id="nav-desktop-profile"
              onClick={() => navigate('/me')}
              className={`btn-ghost hidden sm:flex items-center gap-2 rounded-xl p-1.5 transition ${
                isCurrent('/me') ? 'bg-brand-soft ring-2 ring-brand/30' : ''
              }`}
            >
              <Avatar name={profile?.username || session?.user?.email || 'me'} size={32} />
            </button>
          </div>
        </div>
      </header>

      {/* Notification Center Popover */}
      <NotificationCenterModal
        isOpen={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
        notifications={notifications}
        unreadCount={unreadNotifCount}
        onMarkAllRead={handleMarkAllRead}
        onNotificationClick={handleNotificationClick}
      />

      {/* Mobile Bottom Navigation Bar */}
      <nav aria-label="Mobile Navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-safe backdrop-blur-md sm:hidden">
        <div className="flex h-16 items-center justify-around px-2">
          {navItems.map(({ label, path, icon: Icon, badge, isAction, id }) => {
            const active = isCurrent(path);
            if (isAction) {
              return (
                <button
                  key={path}
                  type="button"
                  id={id}
                  onClick={() => navigate(path)}
                  className="flex -translate-y-2 flex-col items-center justify-center"
                  aria-label={label}
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-brand to-coral text-white shadow-lift transition active:scale-95">
                    <Plus size={24} strokeWidth={2.8} />
                  </span>
                  <span className="mt-0.5 text-[10px] font-semibold text-ink-soft">{label}</span>
                </button>
              );
            }

            return (
              <button
                key={path}
                type="button"
                id={id}
                onClick={() => navigate(path)}
                className={`relative flex flex-col items-center justify-center py-1 transition ${
                  active ? 'text-brand' : 'text-muted hover:text-ink'
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                  {badge > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="mt-1 text-[11px] font-medium">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
