import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, CheckCheck, Inbox, ArrowRightLeft, Star, Heart, 
  ShieldAlert, X, ExternalLink, Sparkles, CheckCircle2, Clock
} from 'lucide-react';
import { supabase, unwrap } from '../lib/supabase';
import { navigate, timeAgo } from '../lib/core';

export default function NotificationCenterModal({
  isOpen,
  onClose,
  notifications = [],
  unreadCount = 0,
  onMarkAllRead,
  onNotificationClick,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | 'trades'

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'unread') return !n.read;
    if (filter === 'trades') {
      return ['offer_received', 'offer_accepted', 'trade_confirmed', 'trade_completed', 'trade_cancelled'].includes(n.type);
    }
    return true;
  });

  const getIcon = (type) => {
    switch (type) {
      case 'offer_received':
        return <Inbox className="text-brand" size={17} />;
      case 'offer_accepted':
        return <Sparkles className="text-emerald-500" size={17} />;
      case 'trade_confirmed':
        return <CheckCircle2 className="text-blue-500" size={17} />;
      case 'trade_completed':
        return <Star className="fill-amber-400 text-amber-500" size={17} />;
      case 'trade_cancelled':
        return <ArrowRightLeft className="text-rose-500" size={17} />;
      case 'review':
        return <Star className="fill-amber-400 text-amber-500" size={17} />;
      case 'shortlist':
        return <Heart className="fill-rose-500 text-rose-500" size={17} />;
      default:
        return <Bell className="text-brand" size={17} />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end p-3 sm:p-6 sm:pt-20">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-ink/25 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Popover Card */}
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Bell size={17} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-ink">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-coral px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
                    {unreadCount} new
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                id="notif-mark-all-read-btn"
                onClick={onMarkAllRead}
                className="btn-ghost flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
                title="Mark all as read"
              >
                <CheckCheck size={14} />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-1.5 text-muted hover:bg-canvas hover:text-ink"
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-line/60 bg-canvas/50 px-4 py-2 gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-xl px-3 py-1.5 transition ${
              filter === 'all'
                ? 'bg-white text-ink shadow-xs ring-1 ring-line/50'
                : 'text-muted hover:text-ink'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`rounded-xl px-3 py-1.5 transition ${
              filter === 'unread'
                ? 'bg-white text-brand shadow-xs ring-1 ring-brand/20'
                : 'text-muted hover:text-ink'
            }`}
          >
            Unread ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('trades')}
            className={`rounded-xl px-3 py-1.5 transition ${
              filter === 'trades'
                ? 'bg-white text-ink shadow-xs ring-1 ring-line/50'
                : 'text-muted hover:text-ink'
            }`}
          >
            Trades
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 divide-y divide-line/60 overflow-y-auto">
          {filteredNotifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-muted">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-canvas">
                <Bell size={22} className="text-muted/60" />
              </span>
              <p className="font-semibold text-ink">No notifications</p>
              <p className="mt-1 text-xs text-muted">
                {filter === 'unread'
                  ? 'You are all caught up!'
                  : 'New trade offers, messages and reviews will show up here.'}
              </p>
            </div>
          ) : (
            filteredNotifs.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  onNotificationClick(item);
                  if (item.link) {
                    onClose();
                    navigate(item.link);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onNotificationClick(item);
                    if (item.link) {
                      onClose();
                      navigate(item.link);
                    }
                  }
                }}
                className={`group flex cursor-pointer items-start gap-3.5 p-4 text-left transition ${
                  item.read
                    ? 'hover:bg-canvas/50'
                    : 'bg-brand-soft/20 hover:bg-brand-soft/30'
                }`}
              >
                {/* Icon Container */}
                <div className="relative mt-0.5 shrink-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-xs ring-1 ring-line/70">
                    {getIcon(item.type)}
                  </div>
                  {!item.read && (
                    <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-coral ring-2 ring-white" />
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`text-xs ${item.read ? 'font-semibold text-ink' : 'font-bold text-ink'}`}>
                      {item.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                  {item.content && (
                    <p className="mt-1 text-xs text-ink-soft line-clamp-2">
                      {item.content}
                    </p>
                  )}
                  {item.link && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-brand transition group-hover:translate-x-0.5">
                      <span>View details</span>
                      <ExternalLink size={11} />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line/60 bg-canvas/40 px-5 py-3 text-center text-[11px] text-muted">
          <span>SwitchR Instant Notifications · Liverpool Community</span>
        </div>
      </motion.div>
    </div>
  );
}
