import { useEffect, useState } from 'react';
import { Search, PackageSearch, Plus, X, MapPin, SlidersHorizontal, LayoutGrid, Sparkles } from 'lucide-react';
import { supabase, unwrap, ITEM_SELECT } from '../lib/supabase';
import { CATEGORIES, navigate, useApp, useQuery } from '../lib/core';
import { getCategoryIcon } from '../lib/categories';
import { calculateDistance, extractPostcode, lookupLocationOrPostcode } from '../lib/geo';
import ItemCard from '../components/ItemCard';
import DistanceFilterModal from '../components/DistanceFilterModal';
import { EmptyState, ErrorBox, PageLoader, Spinner } from '../components/ui';

export default function FeedView() {
  const { session, profile } = useApp();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('All');

  // Location & Distance state
  const [userLocation, setUserLocation] = useState(() => {
    if (profile?.lat != null) {
      return { name: profile.location_name || 'My location', lat: profile.lat, lng: profile.lng };
    }
    try {
      const saved = localStorage.getItem('switchr_location');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { name: 'Liverpool', lat: 53.4084, lng: -2.9916 };
  });

  const [radius, setRadius] = useState(() => {
    try {
      const saved = localStorage.getItem('switchr_radius');
      return saved !== null && saved !== 'null' ? Number(saved) : null;
    } catch {
      return null;
    }
  });

  const [sortBy, setSortBy] = useState(() => {
    try {
      return localStorage.getItem('switchr_sort') || 'newest';
    } catch {
      return 'newest';
    }
  });

  const [distanceModalOpen, setDistanceModalOpen] = useState(false);

  // Smart Postcode Detection state
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [detectedCandidate, setDetectedCandidate] = useState(null);
  const [postcodeLoading, setPostcodeLoading] = useState(false);

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

  const handleSortChange = (sort) => {
    setSortBy(sort);
    try {
      localStorage.setItem('switchr_sort', sort);
    } catch {}
  };

  // Check if search contains a UK postcode or outcode
  useEffect(() => {
    const candidate = extractPostcode(search);
    if (!candidate) {
      setDetectedLocation(null);
      setDetectedCandidate(null);
      return;
    }

    setDetectedCandidate(candidate);
    let active = true;
    setPostcodeLoading(true);

    const timer = setTimeout(async () => {
      try {
        const resolved = await lookupLocationOrPostcode(candidate.postcode);
        if (active && resolved) {
          setDetectedLocation(resolved);
        } else if (active) {
          setDetectedLocation(null);
        }
      } catch {
        if (active) setDetectedLocation(null);
      } finally {
        if (active) setPostcodeLoading(false);
      }
    }, 200);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search]);

  const handleApplyDetectedPostcode = () => {
    if (!detectedLocation) return;
    handleLocationChange({
      name: detectedLocation.name,
      lat: detectedLocation.lat,
      lng: detectedLocation.lng,
    });
    if (radius == null) {
      handleRadiusChange(15);
    }
    handleSortChange('closest');

    if (detectedCandidate?.query) {
      setSearch(detectedCandidate.query);
    } else {
      setSearch('');
    }
    setDetectedLocation(null);
    setDetectedCandidate(null);
  };

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: allItems, loading, error, reload } = useQuery(async () => {
    let q = supabase
      .from('items')
      .select(ITEM_SELECT)
      .eq('status', 'available')
      .neq('user_id', session?.user?.id || '')
      .order('created_at', { ascending: false });

    if (category !== 'All') {
      q = q.eq('category', category);
    }

    return unwrap(await q.limit(200));
  }, [category, session?.user?.id]);

  // Compute distance and filter
  const items = (allItems || [])
    .map((item) => {
      const dist = calculateDistance(
        userLocation?.lat,
        userLocation?.lng,
        item.owner?.lat,
        item.owner?.lng,
      );
      return { ...item, distance: dist };
    })
    .filter((item) => {
      // Radius filter
      if (radius != null && userLocation?.lat != null) {
        if (item.distance != null && item.distance > radius) return false;
      }
      // Text search
      if (!debounced) return true;
      const term = debounced.toLowerCase();
      const titleMatch = item.title?.toLowerCase().includes(term);
      const descMatch = item.description?.toLowerCase().includes(term);
      const locMatch = item.owner?.location_name?.toLowerCase().includes(term);
      const userMatch = item.owner?.username?.toLowerCase().includes(term);
      return titleMatch || descMatch || locMatch || userMatch;
    });

  // Sort: Closest first or Newest first
  if (sortBy === 'closest') {
    items.sort((a, b) => {
      if (a.distance == null && b.distance == null) return 0;
      if (a.distance == null) return 1;
      if (b.distance == null) return -1;
      return a.distance - b.distance;
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Find something to <span className="text-gradient">swap</span>
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Browse what people are offering and make a trade.</p>
      </div>

      {/* Search Bar & Distance Filter Trigger */}
      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            id="feed-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && detectedLocation) {
                e.preventDefault();
                handleApplyDetectedPostcode();
              }
            }}
            placeholder="Search items, or type a UK postcode (e.g. M1, SW1A, BS1)…"
            className="field rounded-2xl py-3.5 pl-11 pr-10 text-base shadow-card"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted hover:bg-ink/5"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Location / Radius Pill Button */}
        <button
          type="button"
          id="feed-distance-pill"
          onClick={() => setDistanceModalOpen(true)}
          className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition shadow-card ${
            radius != null
              ? 'border-brand bg-brand-soft text-brand ring-1 ring-brand/30'
              : 'border-line bg-white text-ink-soft hover:border-brand/40'
          }`}
          title="Set location and distance radius"
        >
          <MapPin size={16} className="text-brand shrink-0" />
          <span className="truncate max-w-[120px]">{userLocation?.name || 'Location'}</span>
          <span className="text-muted">·</span>
          <span className="whitespace-nowrap font-medium text-xs">
            {radius != null ? `Within ${radius} km` : 'Any distance'}
          </span>
          <SlidersHorizontal size={14} className="text-muted ml-0.5" />
        </button>
      </div>

      {/* Smart Postcode Suggestion Banner */}
      {detectedLocation && (
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-brand/30 bg-emerald-50/80 p-3 sm:px-4 sm:py-3 shadow-sm text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-sm">
              <MapPin size={15} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink">
                Postcode detected: <span className="text-brand font-bold">{detectedLocation.name}</span>
              </p>
              <p className="text-muted text-[11px]">
                {detectedCandidate?.query
                  ? `Center search here and find "${detectedCandidate.query}" within ${radius || 15} km`
                  : `Show items within ${radius || 15} km of this postcode, sorted closest first`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              id="apply-detected-postcode-btn"
              onClick={handleApplyDetectedPostcode}
              className="btn-primary rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-sm"
            >
              <Sparkles size={13} /> Apply location
            </button>
            <button
              type="button"
              onClick={() => {
                setDetectedLocation(null);
                setDetectedCandidate(null);
              }}
              className="rounded-lg p-1.5 text-muted hover:text-ink hover:bg-black/5"
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          id="feed-cat-all"
          onClick={() => setCategory('All')}
          className={`flex items-center gap-1.5 whitespace-nowrap ${category === 'All' ? 'chip-on' : 'chip-off'}`}
        >
          <LayoutGrid size={14} className="shrink-0" />
          <span>All</span>
        </button>
        {CATEGORIES.map((c) => {
          const Icon = getCategoryIcon(c);
          return (
            <button
              key={c}
              type="button"
              id={`feed-cat-${c.replace(/\W+/g, '-').toLowerCase()}`}
              onClick={() => setCategory(c)}
              className={`flex items-center gap-1.5 whitespace-nowrap ${category === c ? 'chip-on' : 'chip-off'}`}
            >
              <Icon size={14} className="shrink-0" />
              <span>{c}</span>
            </button>
          );
        })}
      </div>

      {/* Filter status indicator */}
      {!loading && !error && (debounced || category !== 'All' || radius != null || sortBy === 'closest') && (
        <div className="mb-5 flex items-center justify-between text-xs text-muted">
          <span>
            Found <strong className="text-ink">{items.length}</strong> {items.length === 1 ? 'item' : 'items'}
            {debounced ? ` for "${debounced}"` : ''}
            {category !== 'All' ? ` in ${category}` : ''}
            {radius != null ? ` within ${radius} km of ${userLocation?.name}` : ''}
            {sortBy === 'closest' ? ' (closest first)' : ''}
          </span>
          <button
            type="button"
            id="feed-clear-filters"
            onClick={() => {
              setSearch('');
              setCategory('All');
              handleRadiusChange(null);
              handleSortChange('newest');
            }}
            className="font-medium text-brand hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={debounced || category !== 'All' || radius != null ? 'No matches within range' : 'Nothing listed yet'}
          text={
            debounced || category !== 'All' || radius != null
              ? 'Try widening your distance radius, changing location, or clearing search.'
              : 'Be the first! List an item and others can start offering.'
          }
          action={
            <div className="flex gap-2">
              {radius != null && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => handleRadiusChange(null)}
                >
                  Show all distances
                </button>
              )}
              <button type="button" className="btn-primary" onClick={() => navigate('/new')}>
                <Plus size={16} /> List an item
              </button>
            </div>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}

      <DistanceFilterModal
        open={distanceModalOpen}
        onClose={() => setDistanceModalOpen(false)}
        userLocation={userLocation}
        onChangeLocation={handleLocationChange}
        radius={radius}
        onChangeRadius={handleRadiusChange}
        sortBy={sortBy}
        onChangeSortBy={handleSortChange}
      />
    </div>
  );
}
