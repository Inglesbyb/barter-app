import { forwardRef, useEffect, useImperativeHandle, useRef, useState, useCallback } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import {
  Flame,
  Heart,
  X,
  RotateCcw,
  ArrowRightLeft,
  MapPin,
  SlidersHorizontal,
  Bookmark,
  Sparkles,
  Star,
  Check,
  Trash2,
  PackageSearch,
  ExternalLink,
} from 'lucide-react';
import { supabase, unwrap, ITEM_SELECT, getProfileStats } from '../lib/supabase';
import { CATEGORIES, errorMessage, navigate, useApp } from '../lib/core';
import { calculateDistance, formatDistance } from '../lib/geo';
import { Avatar, ItemImage, PageLoader, EmptyState } from '../components/ui';
import DistanceFilterModal from '../components/DistanceFilterModal';
import TradeOfferModal from '../components/TradeOfferModal';

const SWIPE_THRESHOLD = 110;

/**
 * Explore View — Tinder-style swipe deck for discovering nearby items
 * Option A:
 * - Swipe right / Heart: Save to shortlist
 * - Swipe left / X: Skip / Pass
 * - Offer Swap: Directly make an offer using TradeOfferModal
 * - Saved Shortlist drawer/tab: Review saved items & offer trades later
 * - Undo / Rewind: Revert last swipe
 */
export default function ExploreView() {
  const { session, profile, showToast } = useApp();
  const userId = session?.user?.id;

  // Location & Radius state
  const [userLocation, setUserLocation] = useState(() => {
    if (profile?.lat != null) {
      return { name: profile.location_name || 'My location', lat: profile.lat, lng: profile.lng };
    }
    try {
      const saved = localStorage.getItem('switchr_location');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: 'London', lat: 51.5074, lng: -0.1278 };
  });

  const [radius, setRadius] = useState(() => {
    try {
      const saved = localStorage.getItem('switchr_radius');
      return saved !== null && saved !== 'null' ? Number(saved) : 25; // default 25km for explore
    } catch {
      return 25;
    }
  });

  const [distanceModalOpen, setDistanceModalOpen] = useState(false);
  const [category, setCategory] = useState('All');
  const [savedDrawerOpen, setSavedDrawerOpen] = useState(false);

  // Trade offer modal state
  const [tradeTargetItem, setTradeTargetItem] = useState(null);

  // Deck, swipes and history
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [swipes, setSwipes] = useState({ saved: new Set(), skipped: new Set() });
  const [savedItems, setSavedItems] = useState([]);
  const [history, setHistory] = useState([]); // for undo: [{ item, action }]
  const [busy, setBusy] = useState(false);
  const [statsMap, setStatsMap] = useState({});

  const cardHandles = useRef({});

  // Sync profile location if loaded
  useEffect(() => {
    if (profile?.lat != null) {
      setUserLocation((curr) => {
        if (curr?.lat === profile.lat && curr?.lng === profile.lng) return curr;
        return { name: profile.location_name || 'My location', lat: profile.lat, lng: profile.lng };
      });
    }
  }, [profile?.lat, profile?.lng, profile?.location_name]);

  const handleLocationChange = (loc) => {
    setUserLocation(loc);
    try {
      localStorage.setItem('switchr_location', JSON.stringify(loc));
    } catch {}
  };

  const handleRadiusChange = (rad) => {
    setRadius(rad);
    try {
      localStorage.setItem('switchr_radius', rad == null ? 'null' : String(rad));
    } catch {}
  };

  // Helper for localStorage fallback
  const getLocalSwipesKey = useCallback(() => `switchr_swipes_${userId || 'anon'}`, [userId]);

  // Load existing user swipes (from Supabase, falling back to localStorage)
  const loadSwipes = useCallback(async () => {
    const savedSet = new Set();
    const skippedSet = new Set();

    // 1. Try reading from Supabase
    if (userId && supabase) {
      try {
        const { data, error } = await supabase
          .from('swipes')
          .select('item_id, action')
          .eq('user_id', userId);

        if (!error && data) {
          data.forEach((row) => {
            if (row.action === 'save') savedSet.add(row.item_id);
            else if (row.action === 'skip') skippedSet.add(row.item_id);
          });
        }
      } catch {
        // Fallback to local storage if table doesn't exist
      }
    }

    // 2. Merge local storage
    try {
      const raw = localStorage.getItem(getLocalSwipesKey());
      if (raw) {
        const parsed = JSON.parse(raw);
        (parsed.saved || []).forEach((id) => savedSet.add(id));
        (parsed.skipped || []).forEach((id) => skippedSet.add(id));
      }
    } catch {}

    setSwipes({ saved: savedSet, skipped: skippedSet });
    return { saved: savedSet, skipped: skippedSet };
  }, [userId, getLocalSwipesKey]);

  // Record a swipe (Supabase + localStorage fallback)
  const recordSwipe = async (itemId, action) => {
    // Local storage
    try {
      const key = getLocalSwipesKey();
      const current = JSON.parse(localStorage.getItem(key) || '{"saved":[],"skipped":[]}');
      if (action === 'save') {
        if (!current.saved.includes(itemId)) current.saved.push(itemId);
        current.skipped = current.skipped.filter((id) => id !== itemId);
      } else {
        if (!current.skipped.includes(itemId)) current.skipped.push(itemId);
        current.saved = current.saved.filter((id) => id !== itemId);
      }
      localStorage.setItem(key, JSON.stringify(current));
    } catch {}

    // Supabase
    if (userId && supabase) {
      try {
        await supabase
          .from('swipes')
          .upsert(
            { user_id: userId, item_id: itemId, action },
            { onConflict: 'user_id,item_id' }
          );
      } catch {
        // Ignored if table not created
      }
    }
  };

  // Remove a swipe (for Undo or Unsave)
  const removeSwipe = async (itemId) => {
    try {
      const key = getLocalSwipesKey();
      const current = JSON.parse(localStorage.getItem(key) || '{"saved":[],"skipped":[]}');
      current.saved = current.saved.filter((id) => id !== itemId);
      current.skipped = current.skipped.filter((id) => id !== itemId);
      localStorage.setItem(key, JSON.stringify(current));
    } catch {}

    if (userId && supabase) {
      try {
        await supabase
          .from('swipes')
          .delete()
          .eq('user_id', userId)
          .eq('item_id', itemId);
      } catch {}
    }
  };

  // Fetch items feed and saved items
  const fetchExploreFeed = useCallback(async () => {
    setLoading(true);
    try {
      const currentSwipes = await loadSwipes();

      // Query all available items
      let query = supabase
        .from('items')
        .select(ITEM_SELECT)
        .eq('status', 'available')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.neq('user_id', userId);
      }

      if (category !== 'All') {
        query = query.eq('category', category);
      }

      const allItems = unwrap(await query.limit(200)) || [];

      // Fetch saved items details
      const savedItemsList = allItems.filter((it) => currentSwipes.saved.has(it.id));
      setSavedItems(savedItemsList);

      // Filter available deck:
      // Exclude items already saved or skipped
      const unswiped = allItems.filter(
        (it) => !currentSwipes.saved.has(it.id) && !currentSwipes.skipped.has(it.id)
      );

      // Compute distances
      const deckWithDist = unswiped
        .map((it) => {
          const dist = calculateDistance(
            userLocation?.lat,
            userLocation?.lng,
            it.owner?.lat,
            it.owner?.lng
          );
          return { ...it, distance: dist };
        })
        .filter((it) => {
          if (radius != null && userLocation?.lat != null) {
            return it.distance == null || it.distance <= radius;
          }
          return true;
        });

      // Sort closest first
      deckWithDist.sort((a, b) => {
        if (a.distance == null && b.distance == null) return 0;
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });

      setItems(deckWithDist);

      // Fetch profile stats for top cards
      const topOwners = [...new Set(deckWithDist.slice(0, 10).map((it) => it.user_id))];
      if (topOwners.length > 0) {
        const statsResults = await Promise.all(topOwners.map((id) => getProfileStats(id).catch(() => null)));
        const map = {};
        topOwners.forEach((id, idx) => {
          if (statsResults[idx]) map[id] = statsResults[idx];
        });
        setStatsMap((prev) => ({ ...prev, ...map }));
      }
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }, [category, userId, userLocation, radius, loadSwipes, showToast]);

  useEffect(() => {
    fetchExploreFeed();
  }, [fetchExploreFeed]);

  // Handle Swipe Decision
  const handleDecide = async (item, action) => {
    setBusy(true);
    try {
      await recordSwipe(item.id, action);

      // Update state
      setSwipes((prev) => {
        const nextSaved = new Set(prev.saved);
        const nextSkipped = new Set(prev.skipped);
        if (action === 'save') {
          nextSaved.add(item.id);
          setSavedItems((s) => [item, ...s.filter((x) => x.id !== item.id)]);
          showToast(`Saved "${item.title}" to your shortlist! ♥`, 'success');
        } else {
          nextSkipped.add(item.id);
        }
        return { saved: nextSaved, skipped: nextSkipped };
      });

      // Record in history for undo
      setHistory((prev) => [{ item, action }, ...prev]);

      // Remove from active deck
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  // Handle Undo / Rewind
  const handleUndo = async () => {
    if (history.length === 0 || busy) return;
    const [lastAction, ...restHistory] = history;
    const { item, action } = lastAction;

    setBusy(true);
    try {
      await removeSwipe(item.id);

      setSwipes((prev) => {
        const nextSaved = new Set(prev.saved);
        const nextSkipped = new Set(prev.skipped);
        nextSaved.delete(item.id);
        nextSkipped.delete(item.id);
        return { saved: nextSaved, skipped: nextSkipped };
      });

      if (action === 'save') {
        setSavedItems((prev) => prev.filter((i) => i.id !== item.id));
      }

      // Add item back to front of deck
      setItems((prev) => [item, ...prev]);
      setHistory(restHistory);
      showToast(`Rewound "${item.title}"`, 'info');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  // Reset Skips (Start over with skipped items)
  const handleResetSkips = async () => {
    try {
      const key = getLocalSwipesKey();
      const current = JSON.parse(localStorage.getItem(key) || '{"saved":[],"skipped":[]}');
      current.skipped = [];
      localStorage.setItem(key, JSON.stringify(current));

      if (userId && supabase) {
        await supabase.from('swipes').delete().eq('user_id', userId).eq('action', 'skip');
      }

      showToast('Reset skipped items! Reloading nearby feed...', 'info');
      fetchExploreFeed();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  // Remove single saved item from Shortlist
  const handleRemoveSaved = async (item) => {
    try {
      await removeSwipe(item.id);
      setSavedItems((prev) => prev.filter((i) => i.id !== item.id));
      setSwipes((prev) => {
        const nextSaved = new Set(prev.saved);
        nextSaved.delete(item.id);
        return { ...prev, saved: nextSaved };
      });
      showToast(`Removed "${item.title}" from saved`, 'info');
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (savedDrawerOpen || distanceModalOpen || tradeTargetItem) return;

      const current = items[0];
      if (!current) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        cardHandles.current[current.id]?.swipe('right');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cardHandles.current[current.id]?.swipe('left');
      } else if (e.key === ' ' || e.key === 'ArrowUp') {
        e.preventDefault();
        setTradeTargetItem(current);
      } else if (e.key === 'z' || e.key === 'Backspace') {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [items, savedDrawerOpen, distanceModalOpen, tradeTargetItem, history, handleUndo]);

  const currentItem = items[0];
  const nextItem = items[1];

  return (
    <div className="mx-auto max-w-lg">
      {/* Top Header & Location Pill */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-amber-500 to-coral text-white shadow-lift">
              <Flame size={22} className="fill-white" />
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">Explore</h1>
              <p className="text-xs text-ink-soft">Swipe nearby items in your area</p>
            </div>
          </div>

          {/* Saved Items Shortlist Trigger */}
          <button
            type="button"
            id="explore-saved-drawer-btn"
            onClick={() => setSavedDrawerOpen(true)}
            className="btn-secondary relative flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold shadow-card transition hover:border-brand/40"
          >
            <Bookmark size={15} className="text-coral" />
            <span>Saved</span>
            {savedItems.length > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-[11px] font-bold text-white shadow-xs">
                {savedItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Location & Radius Control Bar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="explore-location-btn"
            onClick={() => setDistanceModalOpen(true)}
            className="flex flex-1 items-center justify-between gap-2 rounded-2xl border border-line/80 bg-white px-3.5 py-2.5 text-left text-xs font-medium shadow-card transition hover:border-brand/40"
          >
            <div className="flex items-center gap-2 min-w-0">
              <MapPin size={15} className="shrink-0 text-brand" />
              <span className="truncate font-semibold text-ink">
                {userLocation?.name || 'Set area'}
              </span>
              <span className="text-muted">·</span>
              <span className="text-ink-soft">
                {radius == null ? 'Any distance' : `Within ${radius} km`}
              </span>
            </div>
            <SlidersHorizontal size={14} className="shrink-0 text-muted" />
          </button>
        </div>

        {/* Category Filter Pills */}
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
          {['All', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap transition ${
                category === cat
                  ? 'bg-ink text-white shadow-xs'
                  : 'bg-white border border-line text-ink-soft hover:bg-surface-tint'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex aspect-[3/4] w-full items-center justify-center rounded-3xl border border-dashed border-line bg-surface/50">
          <PageLoader />
        </div>
      ) : currentItem ? (
        <>
          {/* Swipe Card Deck */}
          <div className="relative aspect-[3/4] w-full select-none">
            {nextItem && (
              <div className="absolute inset-0 scale-[0.95] translate-y-3.5 opacity-60 pointer-events-none">
                <ExploreCardFace
                  item={nextItem}
                  stats={statsMap[nextItem.user_id]}
                  userLocation={userLocation}
                />
              </div>
            )}

            <AnimatePresence initial={false}>
              <ExploreSwipeCard
                key={currentItem.id}
                ref={(h) => {
                  if (h) cardHandles.current[currentItem.id] = h;
                  else delete cardHandles.current[currentItem.id];
                }}
                item={currentItem}
                stats={statsMap[currentItem.user_id]}
                userLocation={userLocation}
                disabled={busy}
                onDecide={handleDecide}
                onOffer={() => setTradeTargetItem(currentItem)}
              />
            </AnimatePresence>
          </div>

          {/* Action Bar (Tinder-style buttons) */}
          <div className="mt-5 flex items-center justify-center gap-4">
            {/* Rewind / Undo */}
            <button
              type="button"
              id="explore-undo-btn"
              title="Undo last swipe (Z)"
              disabled={history.length === 0 || busy}
              onClick={handleUndo}
              className="flex h-13 w-13 items-center justify-center rounded-full border border-line bg-white text-warn shadow-card transition hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              <RotateCcw size={20} strokeWidth={2.4} />
            </button>

            {/* Skip / Pass */}
            <button
              type="button"
              id="explore-skip-btn"
              title="Pass / Skip (Left Arrow)"
              disabled={busy}
              onClick={() => cardHandles.current[currentItem.id]?.swipe('left')}
              className="flex h-15 w-15 items-center justify-center rounded-full border border-line bg-white text-bad shadow-lift transition hover:scale-105 hover:bg-bad hover:text-white active:scale-95 disabled:opacity-40"
            >
              <X size={28} strokeWidth={2.8} />
            </button>

            {/* Instant Offer Swap */}
            <button
              type="button"
              id="explore-offer-btn"
              title="Offer Swap (Space or Up Arrow)"
              disabled={busy}
              onClick={() => setTradeTargetItem(currentItem)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-linear-to-br from-brand to-coral text-white shadow-lift transition hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              <ArrowRightLeft size={28} strokeWidth={2.6} />
            </button>

            {/* Save / Shortlist */}
            <button
              type="button"
              id="explore-save-btn"
              title="Save to shortlist (Right Arrow)"
              disabled={busy}
              onClick={() => cardHandles.current[currentItem.id]?.swipe('right')}
              className="flex h-15 w-15 items-center justify-center rounded-full bg-linear-to-br from-ok to-[#0ca678] text-white shadow-lift transition hover:scale-105 active:scale-95 disabled:opacity-40"
            >
              <Heart size={26} strokeWidth={2.6} className="fill-white" />
            </button>
          </div>

          {/* Quick Keyboard Hint */}
          <div className="mt-4 flex items-center justify-center gap-3 text-center text-[11px] text-muted">
            <span>← Left to skip</span>
            <span>·</span>
            <span>Right to save ♥</span>
            <span>·</span>
            <span>Space to offer</span>
          </div>
        </>
      ) : (
        /* Empty Deck State */
        <div className="rounded-3xl border border-line bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft text-brand shadow-inner">
            <Sparkles size={32} />
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold">You're all caught up!</h2>
          <p className="mt-2 text-sm text-ink-soft">
            There are no more items within {radius == null ? 'any distance' : `${radius} km`} of{' '}
            <strong className="text-ink">{userLocation?.name || 'your area'}</strong>.
          </p>

          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={() => {
                handleRadiusChange(radius == null ? 50 : Math.min(radius + 25, 100));
              }}
              className="btn-primary rounded-xl py-2.5 text-sm"
            >
              Widen search radius
            </button>
            <button
              type="button"
              onClick={handleResetSkips}
              className="btn-secondary rounded-xl py-2.5 text-sm"
            >
              Reset skipped items
            </button>
          </div>

          {savedItems.length > 0 && (
            <div className="mt-6 border-t border-line/60 pt-5">
              <button
                type="button"
                onClick={() => setSavedDrawerOpen(true)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
              >
                <Bookmark size={15} />
                View your {savedItems.length} saved item{savedItems.length > 1 ? 's' : ''}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Saved Shortlist Drawer Modal */}
      {savedDrawerOpen && (
        <SavedShortlistDrawer
          open={savedDrawerOpen}
          onClose={() => setSavedDrawerOpen(false)}
          savedItems={savedItems}
          onOfferSwap={(it) => {
            setSavedDrawerOpen(false);
            setTradeTargetItem(it);
          }}
          onRemoveSaved={handleRemoveSaved}
        />
      )}

      {/* Distance & Radius Settings Modal */}
      <DistanceFilterModal
        open={distanceModalOpen}
        onClose={() => setDistanceModalOpen(false)}
        userLocation={userLocation}
        onChangeLocation={handleLocationChange}
        radius={radius}
        onChangeRadius={handleRadiusChange}
        sortBy="closest"
        onChangeSortBy={() => {}}
      />

      {/* Trade Proposal Modal */}
      {tradeTargetItem && (
        <TradeOfferModal
          open={Boolean(tradeTargetItem)}
          onClose={() => setTradeTargetItem(null)}
          wantedItem={tradeTargetItem}
          onSent={() => {
            showToast(`Offer sent for ${tradeTargetItem.title}!`);
            setTradeTargetItem(null);
            // Auto advance or save card
            handleDecide(tradeTargetItem, 'save');
          }}
        />
      )}
    </div>
  );
}

/**
 * Swipe Card Component with Framer Motion Drag Gestures & Stamps
 */
const ExploreSwipeCard = forwardRef(function ExploreSwipeCard(
  { item, stats, userLocation, disabled, onDecide, onOffer },
  ref,
) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-13, 0, 13]);
  const saveOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1]);
  const skipOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0]);

  const springBack = () => animate(x, 0, { type: 'spring', stiffness: 450, damping: 32 });

  const fling = async (direction) => {
    if (disabled) return;
    await animate(x, direction === 'right' ? 600 : -600, { duration: 0.26, ease: 'easeIn' });
    const ok = await onDecide(item, direction === 'right' ? 'save' : 'skip');
    if (!ok) springBack();
  };

  useImperativeHandle(ref, () => ({ swipe: fling }));

  return (
    <motion.div
      className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
      style={{ x, rotate }}
      drag={disabled ? false : 'x'}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (info.offset.x > SWIPE_THRESHOLD) fling('right');
        else if (info.offset.x < -SWIPE_THRESHOLD) fling('left');
        else springBack();
      }}
      initial={{ scale: 0.95, y: 14, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
    >
      <ExploreCardFace item={item} stats={stats} userLocation={userLocation} onOffer={onOffer} />

      {/* Visual Stamps */}
      <motion.div
        style={{ opacity: saveOpacity }}
        className="pointer-events-none absolute left-6 top-6 -rotate-12 rounded-2xl border-4 border-ok bg-white/90 px-4 py-1.5 font-display text-2xl font-black text-ok shadow-lift backdrop-blur-xs"
      >
        SAVE ♥
      </motion.div>

      <motion.div
        style={{ opacity: skipOpacity }}
        className="pointer-events-none absolute right-6 top-6 rotate-12 rounded-2xl border-4 border-bad bg-white/90 px-4 py-1.5 font-display text-2xl font-black text-bad shadow-lift backdrop-blur-xs"
      >
        SKIP ✕
      </motion.div>
    </motion.div>
  );
});

/**
 * Card Face Rendering (Photo, Badges, Distance, Owner info, Offer button)
 */
function ExploreCardFace({ item, stats, userLocation, onOffer }) {
  if (!item) return null;
  const owner = item.owner || {};

  const dist =
    item.distance ??
    calculateDistance(userLocation?.lat, userLocation?.lng, owner?.lat, owner?.lng);

  return (
    <div className="relative h-full w-full select-none overflow-hidden rounded-3xl bg-ink shadow-lift">
      <ItemImage
        src={item.image_url}
        alt={item.title}
        className="pointer-events-none h-full w-full object-cover"
      />

      {/* Dark gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink via-ink/80 to-transparent p-5 pt-28 text-white">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="badge bg-white/20 text-white backdrop-blur-md">{item.condition}</span>
          <span className="badge bg-white/20 text-white backdrop-blur-md">{item.category}</span>
          {owner.location_name && (
            <span className="badge flex items-center gap-1 bg-emerald-500/85 text-white font-medium backdrop-blur-md">
              <MapPin size={11} />
              {dist != null ? `${formatDistance(dist)} · ` : ''}
              <span className="max-w-[130px] truncate">{owner.location_name}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h2 className="mt-2.5 font-display text-2xl font-bold leading-tight">{item.title}</h2>

        {/* Description */}
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs text-white/80">{item.description}</p>
        )}

        {/* Owner Details & Offer Button */}
        <div className="mt-4 flex items-center justify-between border-t border-white/15 pt-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={owner.username || 'trader'} size={32} />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold">@{owner.username || 'trader'}</p>
              {stats ? (
                <p className="flex items-center gap-1 text-[11px] text-white/70">
                  {stats.reviewCount ? (
                    <>
                      <Star size={11} className="fill-warn text-warn" />{' '}
                      {stats.avgRating?.toFixed(1)} ({stats.reviewCount}) ·{' '}
                    </>
                  ) : null}
                  {stats.tradesCompleted} swaps
                </p>
              ) : null}
            </div>
          </div>

          {onOffer && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOffer();
              }}
              className="flex items-center gap-1.5 rounded-xl bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-lift transition hover:bg-brand/90 active:scale-95"
            >
              <ArrowRightLeft size={13} />
              Offer swap
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Saved Shortlist Drawer Component
 */
function SavedShortlistDrawer({ open, onClose, savedItems, onOfferSwap, onRemoveSaved }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-ink/50 backdrop-blur-xs">
      <div className="flex h-full w-full max-w-md flex-col bg-white shadow-lift">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2">
            <Bookmark size={18} className="text-coral" />
            <h2 className="font-display text-lg font-bold">Saved Shortlist</h2>
            <span className="badge bg-coral/10 font-bold text-coral">{savedItems.length}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4">
          {savedItems.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No saved items yet"
              text="Swipe right on items in Explore to save them here for later."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {savedItems.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface/40 p-2.5 transition hover:border-brand/30"
                >
                  <ItemImage
                    src={it.image_url}
                    alt={it.title}
                    className="h-16 w-16 shrink-0 rounded-xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{it.title}</p>
                    <p className="text-xs text-ink-soft">
                      {it.condition} · @{it.owner?.username || 'trader'}
                    </p>
                    {it.owner?.location_name && (
                      <p className="flex items-center gap-1 text-[11px] text-muted">
                        <MapPin size={10} />
                        <span className="truncate">{it.owner.location_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOfferSwap(it)}
                      className="btn-primary rounded-xl px-2.5 py-1 text-xs"
                    >
                      Swap
                    </button>
                    <button
                      type="button"
                      onClick={() => onRemoveSaved(it)}
                      title="Remove from saved"
                      className="flex h-6 w-6 items-center justify-center self-end rounded-lg text-muted hover:bg-bad/10 hover:text-bad"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
