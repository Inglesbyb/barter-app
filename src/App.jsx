import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, KeyRound, Database, RefreshCw } from 'lucide-react';
import { supabase, isSupabaseConfigured, unwrap } from './lib/supabase';
import { AppContext, useRoute } from './lib/core';
import Navbar from './components/Navbar';
import { PageLoader } from './components/ui';
import ErrorBoundary from './components/ErrorBoundary';

// Views
import AuthView, { ResetPasswordView, Logo } from './views/AuthView';
import FeedView from './views/FeedView';
import ItemDetailView from './views/ItemDetailView';
import ListItemView from './views/ListItemView';
import TradesView from './views/TradesView';
import OfferSwipeView from './views/OfferSwipeView';
import TradeDetailView from './views/TradeDetailView';
import ProfileView from './views/ProfileView';
import ExploreView from './views/ExploreView';
import AdminView from './views/AdminView';
import NotificationBanner from './components/NotificationBanner';
import CookieBanner from './components/CookieBanner';
import LegalModal from './components/LegalModal';
import { playMessageSound, playTradeAlertSound, showBrowserNotification, markTradeAsRead } from './lib/notifications';
import { navigate } from './lib/core';

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [incomingNotifs, setIncomingNotifs] = useState([]);
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('privacy');
  // Toast notification helper
  const showToast = useCallback((message, type = 'success') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const [adminMode, setAdminMode] = useState(() => {
    try {
      return localStorage.getItem('switchr_admin_mode') === 'true';
    } catch {
      return false;
    }
  });

  const toggleAdminMode = useCallback(() => {
    setAdminMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('switchr_admin_mode', String(next));
      } catch {}
      showToast(next ? '⚡ Admin Mode activated' : '🌿 Switched to Normal View', 'info');
      return next;
    });
  }, [showToast]);

  const openLegal = useCallback((tab = 'privacy') => {
    setLegalTab(tab);
    setLegalOpen(true);
  }, []);

  const { path, parts } = useRoute();

  // Fetch current user's profile
  const fetchProfile = useCallback(async (userId) => {
    try {
      const data = unwrap(
        await supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      );
      setProfile(data);
    } catch {
      // Profile trigger might be executing in background
    }
  }, []);

  // Check URL hash for Supabase auth errors (e.g. expired reset link)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('error=')) {
      const rawHash = window.location.hash.replace(/^#/, '');
      const params = new URLSearchParams(rawHash);
      const errCode = params.get('error_code');
      const errDesc = params.get('error_description') || params.get('error');

      if (errCode === 'otp_expired' || errDesc?.includes('expired')) {
        showToast('This reset link has expired or has already been used. Please request a fresh one.', 'error');
      } else if (errDesc) {
        showToast(decodeURIComponent(errDesc).replace(/\+/g, ' '), 'error');
      }
      window.history.replaceState(null, '', '#/auth');
    }
  }, [showToast]);

  // Supabase Auth listener
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) fetchProfile(s.user.id);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setIsRecovery(false);
      } else if (s?.user) {
        fetchProfile(s.user.id);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  // Global Realtime listener for incoming messages and trade updates
  useEffect(() => {
    if (!session?.user?.id || !supabase) return;
    const myId = session.user.id;

    const channel = supabase
      .channel('switchr-global-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async ({ new: msg }) => {
          if (!msg || msg.sender_id === myId) return;

          const currentHash = window.location.hash || '';
          const isViewingThisTrade = currentHash === `#/trade/${msg.trade_id}`;
          const isVisible = typeof document !== 'undefined' && !document.hidden;

          // If the user has this trade chat open right now and tab is focused, let TradeDetailView handle it
          if (isViewingThisTrade && isVisible) {
            return;
          }

          // Fetch sender username for the alert
          const { data: sender } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', msg.sender_id)
            .maybeSingle();

          const senderUsername = sender?.username || 'Trader';

          // Play synthesized incoming message sound chime
          playMessageSound();

          // Trigger in-app notification banner
          const notifId = crypto.randomUUID();
          setIncomingNotifs((prev) => [
            {
              id: notifId,
              tradeId: msg.trade_id,
              senderUsername,
              content: msg.content,
              hasImage: !!msg.image_url,
            },
            ...prev.filter((n) => n.tradeId !== msg.trade_id).slice(0, 2),
          ]);

          // Auto-dismiss after 6.5 seconds
          setTimeout(() => {
            setIncomingNotifs((prev) => prev.filter((n) => n.id !== notifId));
          }, 6500);

          // Browser OS / Desktop Push Notification
          showBrowserNotification(
            `@${senderUsername} on SwitchR`,
            msg.content || (msg.image_url ? '📷 Sent a photo' : 'Sent you a message'),
            () => {
              markTradeAsRead(msg.trade_id);
              navigate(`/trade/${msg.trade_id}`);
            },
          );

          // Dispatch event to update unread badge on Navbar and TradesView
          window.dispatchEvent(
            new CustomEvent('switchr:unread-change', { detail: { tradeId: msg.trade_id } }),
          );
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trades' },
        async ({ new: trade, old: prevTrade }) => {
          if (!trade || (trade.initiator_id !== myId && trade.receiver_id !== myId)) return;
          const partnerId = trade.initiator_id === myId ? trade.receiver_id : trade.initiator_id;

          // Offer accepted notification
          if (trade.status === 'accepted' && prevTrade?.status === 'pending') {
            playTradeAlertSound();
            const { data: partner } = await supabase
              .from('profiles')
              .select('username')
              .eq('id', partnerId)
              .maybeSingle();
            showToast(
              `🎉 Offer accepted by @${partner?.username || 'trader'}! Trade chat is open.`,
              'success',
            );
            window.dispatchEvent(
              new CustomEvent('switchr:unread-change', { detail: { tradeId: trade.id } }),
            );
          }

          // Trade completed notification
          if (trade.status === 'completed' && prevTrade?.status !== 'completed') {
            playTradeAlertSound();
            showToast('🏆 Swap completed! Don\'t forget to leave a rating.', 'success');
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${myId}` },
        async ({ new: n }) => {
          if (!n) return;

          // Play appropriate chime
          if (['offer_accepted', 'trade_completed', 'review'].includes(n.type)) {
            playTradeAlertSound();
          } else {
            playMessageSound();
          }

          // Trigger floating in-app banner
          const notifId = crypto.randomUUID();
          setIncomingNotifs((prev) => [
            {
              id: notifId,
              title: n.title,
              content: n.content,
              link: n.link,
            },
            ...prev.slice(0, 2),
          ]);

          setTimeout(() => {
            setIncomingNotifs((prev) => prev.filter((item) => item.id !== notifId));
          }, 6500);

          // Trigger Desktop Push Notification
          showBrowserNotification(
            `SwitchR: ${n.title}`,
            n.content || 'Tap to view details',
            () => {
              if (n.link) navigate(n.link);
            },
          );

          // Dispatch event to update navbar bell counter
          window.dispatchEvent(new CustomEvent('switchr:unread-change'));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, showToast]);

  // If Supabase credentials are missing or still placeholder
  if (!isSupabaseConfigured) {
    return <SetupInstructionsView />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (isRecovery) {
    return <ResetPasswordView onDone={() => setIsRecovery(false)} />;
  }

  if (!session) {
    return (
      <>
        <AuthView onOpenLegal={openLegal} />
        <CookieBanner onOpenLegal={openLegal} />
        <LegalModal
          open={legalOpen}
          initialTab={legalTab}
          onClose={() => setLegalOpen(false)}
        />
      </>
    );
  }

  // Active route renderer
  const renderRoute = () => {
    const root = parts[0];
    const id = parts[1];

    if (root === 'item' && id) {
      return <ItemDetailView itemId={id} />;
    }
    if (root === 'explore') {
      return <ExploreView />;
    }
    if (root === 'new') {
      return <ListItemView key={path} />;
    }
    if (root === 'trades') {
      const searchParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const tab = searchParams.get('tab') || 'received';
      return <TradesView initialTab={tab} />;
    }
    if (root === 'offers' && id) {
      return <OfferSwipeView itemId={id} />;
    }
    if (root === 'trade' && id) {
      return <TradeDetailView tradeId={id} />;
    }
    if (root === 'profile' && id) {
      return <ProfileView userId={id} />;
    }
    if (root === 'me') {
      return <ProfileView userId={session.user.id} />;
    }
    if (root === 'admin') {
      return <AdminView />;
    }
    return <FeedView />;
  };

  const isAdmin = Boolean(profile?.is_admin);
  const isEffectiveAdminMode = Boolean(isAdmin && adminMode);

  return (
    <AppContext.Provider
      value={{
        session,
        profile,
        setProfile,
        showToast,
        openLegal,
        adminMode: isEffectiveAdminMode,
        toggleAdminMode,
        isAdmin,
      }}
    >
      <div className="min-h-dvh flex flex-col">
        {/* Top Sticky Admin Indicator Bar (Only visible when Admin Mode is ON) */}
        {isEffectiveAdminMode && (
          <div className="bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 text-ink px-4 py-1.5 text-xs font-bold shadow-xs sticky top-0 z-50 border-b border-amber-600/20">
            <div className="mx-auto max-w-6xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-600 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
                </span>
                <span className="tracking-wide">
                  ⚡ ADMIN MODE ACTIVE — Founder Moderation Suite Enabled
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate('/admin')}
                  className="rounded-lg bg-black/10 hover:bg-black/20 px-2.5 py-1 text-[11px] font-bold text-ink transition inline-flex items-center gap-1"
                >
                  Mission Control ➔
                </button>
                <button
                  type="button"
                  onClick={toggleAdminMode}
                  className="rounded-lg bg-black text-white hover:bg-slate-800 px-2.5 py-1 text-[11px] font-bold transition shadow-xs"
                >
                  🌿 Switch to Normal View
                </button>
              </div>
            </div>
          </div>
        )}

        <Navbar currentPath={path} />

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 pb-28 sm:pb-14">
          <ErrorBoundary key={path}>
            {renderRoute()}
          </ErrorBoundary>
        </main>

        {/* Global Footer with Persistent Legal & Cookie Links */}
        <footer className="mt-auto border-t border-line/60 bg-white/40 py-6 text-center text-xs text-muted">
          <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p>© {new Date().getFullYear()} SwitchR. Peer-to-peer barter marketplace.</p>
            <div className="flex items-center gap-4 text-[11px] font-medium">
              <button
                type="button"
                onClick={() => openLegal('privacy')}
                className="hover:text-brand hover:underline"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => openLegal('terms')}
                className="hover:text-brand hover:underline"
              >
                Terms of Service
              </button>
              <button
                type="button"
                onClick={() => openLegal('cookies')}
                className="hover:text-brand hover:underline"
              >
                Cookie Settings
              </button>
            </div>
          </div>
        </footer>

        {/* Interactive Floating Incoming Message Notification Banner */}
        <NotificationBanner
          notifications={incomingNotifs}
          onDismiss={(id) => setIncomingNotifs((prev) => prev.filter((n) => n.id !== id))}
        />

        {/* Floating Cookie Consent Banner */}
        <CookieBanner onOpenLegal={openLegal} />

        {/* Legal, Privacy & Cookie Policy Modal */}
        <LegalModal
          open={legalOpen}
          initialTab={legalTab}
          onClose={() => setLegalOpen(false)}
        />

        {/* Global Toast Container */}
        <div className="fixed bottom-20 left-1/2 z-50 flex -translate-x-1/2 flex-col gap-2 pointer-events-none sm:bottom-6">
          <AnimatePresence>
            {toasts.map(({ id, message, type }) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className={`pointer-events-auto flex items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium shadow-lift ${
                  type === 'error'
                    ? 'bg-bad text-white'
                    : type === 'info'
                    ? 'bg-ink text-white'
                    : 'bg-ink text-white'
                }`}
              >
                {type === 'error' ? (
                  <AlertCircle size={17} className="text-white shrink-0" />
                ) : type === 'info' ? (
                  <Info size={17} className="text-brand-soft shrink-0" />
                ) : (
                  <CheckCircle2 size={17} className="text-ok shrink-0" />
                )}
                <span>{message}</span>
                <button
                  type="button"
                  onClick={() => removeToast(id)}
                  className="ml-2 rounded-lg p-0.5 opacity-70 hover:opacity-100"
                  aria-label="Dismiss toast"
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </AppContext.Provider>
  );
}

function SetupInstructionsView() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-5 text-center">
      <div className="card max-w-lg p-8 shadow-lift">
        <Logo className="justify-center mb-6" />
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
          <Database className="text-brand" size={28} />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Connect your Supabase Project</h1>
        <p className="mt-2 text-sm text-ink-soft">
          SwitchR is ready! To start trading, plug in your new Supabase keys.
        </p>

        <div className="mt-6 space-y-3 rounded-2xl bg-canvas p-4 text-left text-xs">
          <p className="font-semibold text-ink">3 Quick Steps:</p>
          <p className="text-ink-soft">
            1. Open your fresh Supabase project and run <code className="rounded bg-white px-1.5 py-0.5 text-brand border border-line">supabase/schema.sql</code> in the SQL Editor.
          </p>
          <p className="text-ink-soft">
            2. Go to <strong>Project Settings → API</strong> and copy your <strong>URL</strong> and <strong>anon key</strong>.
          </p>
          <p className="text-ink-soft">
            3. Paste them into <code className="rounded bg-white px-1.5 py-0.5 text-brand border border-line">.env.local</code>:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl bg-ink p-3 text-white">
{`VITE_SUPABASE_URL="https://xyz.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-key"`}
          </pre>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-primary mt-6 w-full py-3"
        >
          <RefreshCw size={16} /> I've updated .env.local — Reload
        </button>
      </div>
    </main>
  );
}
