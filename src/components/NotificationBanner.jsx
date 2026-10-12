import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, ArrowRight, X, Image as ImageIcon, Bell, Sparkles, Star, Inbox, Heart } from 'lucide-react';
import { Avatar } from './ui';
import { navigate } from '../lib/core';
import { markTradeAsRead } from '../lib/notifications';

export default function NotificationBanner({ notifications = [], onDismiss }) {
  if (!notifications.length) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 pointer-events-none sm:top-20 sm:right-6">
      <AnimatePresence>
        {notifications.map((notif) => {
          const targetLink = notif.link || (notif.tradeId ? `/trade/${notif.tradeId}` : null);
          const title = notif.title || (notif.senderUsername ? `@${notif.senderUsername}` : 'Notification');
          const isMsg = !!notif.tradeId;

          return (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="pointer-events-auto group relative flex cursor-pointer items-start gap-3 rounded-2xl border border-line/80 bg-white/95 p-3.5 shadow-lift backdrop-blur-md transition hover:border-brand/40 hover:shadow-xl"
              onClick={() => {
                if (notif.tradeId) markTradeAsRead(notif.tradeId);
                onDismiss(notif.id);
                if (targetLink) navigate(targetLink);
              }}
            >
              {/* Avatar or Icon */}
              <div className="relative shrink-0">
                {notif.senderUsername ? (
                  <>
                    <Avatar name={notif.senderUsername} size={40} />
                    <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-brand text-white shadow-xs">
                      <MessageSquare size={10} />
                    </span>
                  </>
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand shadow-xs">
                    <Bell size={18} />
                  </div>
                )}
              </div>

              {/* Message Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="truncate text-xs font-bold text-ink">
                    {title}
                  </p>
                  <span className="text-[10px] font-medium text-muted">just now</span>
                </div>

                <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                  {notif.hasImage && !notif.content ? (
                    <span className="flex items-center gap-1 font-medium text-brand">
                      <ImageIcon size={12} /> Sent a photo
                    </span>
                  ) : (
                    notif.content || 'New update'
                  )}
                </p>

                {targetLink && (
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-brand transition group-hover:translate-x-0.5">
                    <span>{isMsg ? 'Open chat' : 'View details'}</span>
                    <ArrowRight size={12} />
                  </div>
                )}
              </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(notif.id);
              }}
              className="shrink-0 rounded-lg p-1 text-muted transition hover:bg-canvas hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X size={15} />
            </button>
          </motion.div>
        );
      })}
    </AnimatePresence>
    </div>
  );
}
