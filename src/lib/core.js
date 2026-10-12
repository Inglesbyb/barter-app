import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export { CATEGORY_NAMES as CATEGORIES } from './categories';

export const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'];

// ---------------------------------------------------------------------------
// App-wide context: session, profile, toast
// ---------------------------------------------------------------------------
export const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppContext');
  return ctx;
}

// ---------------------------------------------------------------------------
// Tiny hash router:  #/item/123  ->  { path: '/item/123', parts: ['item', '123'] }
// ---------------------------------------------------------------------------
function subscribeHash(cb) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}
const getHash = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute() {
  const path = useSyncExternalStore(subscribeHash, getHash);
  const parts = path.split('?')[0].split('/').filter(Boolean);
  return { path, parts };
}

export function navigate(to) {
  window.location.hash = to;
  window.scrollTo({ top: 0 });
}

// ---------------------------------------------------------------------------
// Data loading hook. Views are keyed by route, so a fresh mount = fresh load.
// ---------------------------------------------------------------------------
export function useQuery(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((prev) => ({ ...prev, loading: true }));
    fetcher()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error) => !cancelled && setState({ data: null, error, loading: false }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------
export function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function errorMessage(err) {
  if (!err) return 'Something went wrong';
  if (err.message === 'Failed to fetch') return "Can't reach the server. Check your connection or Supabase settings.";
  return err.message || String(err);
}
