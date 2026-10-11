import { useEffect, useState } from 'react';
import { Search, PackageSearch, Plus, X } from 'lucide-react';
import { supabase, unwrap, ITEM_SELECT } from '../lib/supabase';
import { CATEGORIES, navigate, useApp, useQuery } from '../lib/core';
import ItemCard from '../components/ItemCard';
import { EmptyState, ErrorBox, PageLoader } from '../components/ui';

export default function FeedView() {
  const { session } = useApp();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: items, loading, error, reload } = useQuery(async () => {
    let q = supabase
      .from('items')
      .select(ITEM_SELECT)
      .eq('status', 'available')
      .neq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(60);
    if (category !== 'All') q = q.eq('category', category);
    if (debounced) {
      const term = debounced.replace(/[%,()"\\]/g, ' ');
      q = q.or(`title.ilike."%${term}%",description.ilike."%${term}%"`);
    }
    return unwrap(await q);
  }, [debounced, category]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Find something to <span className="text-gradient">swap</span>
        </h1>
        <p className="mt-1 text-sm text-ink-soft">Browse what people are offering and make a trade.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          id="feed-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items…"
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

      {/* Categories */}
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {['All', ...CATEGORIES].map((c) => (
          <button
            key={c}
            type="button"
            id={`feed-cat-${c.replace(/\W+/g, '-').toLowerCase()}`}
            onClick={() => setCategory(c)}
            className={category === c ? 'chip-on' : 'chip-off'}
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <PageLoader />
      ) : error ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title={debounced || category !== 'All' ? 'No matches' : 'Nothing listed yet'}
          text={
            debounced || category !== 'All'
              ? 'Try a different search or category.'
              : 'Be the first! List an item and others can start offering.'
          }
          action={
            <button type="button" className="btn-primary" onClick={() => navigate('/new')}>
              <Plus size={16} /> List an item
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {items.map((item, i) => (
            <ItemCard key={item.id} item={item} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
