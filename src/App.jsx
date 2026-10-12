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

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);
  const [toasts, setToasts] = useState([]);

  const { path, parts } = useRoute();

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
    return <AuthView />;
  }

  // Active route renderer
  const renderRoute = () => {
    const root = parts[0];
    const id = parts[1];

    if (root === 'item' && id) {
      return <ItemDetailView itemId={id} />;
    }
    if (root === 'new') {
      return <ListItemView />;
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
    return <FeedView />;
  };

  return (
    <AppContext.Provider value={{ session, profile, setProfile, showToast }}>
      <div className="min-h-dvh flex flex-col">
        <Navbar currentPath={path} />

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 pb-28 sm:pb-14">
          <ErrorBoundary key={path}>
            {renderRoute()}
          </ErrorBoundary>
        </main>

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
