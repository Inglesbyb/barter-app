import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Package, Star, Edit3, LogOut, PackageSearch, Plus, Navigation, Bookmark, Trash2, ArrowRightLeft, ShieldAlert } from 'lucide-react';
import { supabase, unwrap, getProfileStats, deleteMyAccount } from '../lib/supabase';
import { errorMessage, navigate, timeAgo, useApp, useQuery } from '../lib/core';
import { getCurrentPosition, POPULAR_LOCATIONS } from '../lib/geo';
import ItemCard from '../components/ItemCard';
import Modal from '../components/Modal';
import TradeOfferModal from '../components/TradeOfferModal';
import { Avatar, BackButton, EmptyState, ErrorBox, ItemImage, PageLoader, Spinner, Stars } from '../components/ui';

export default function ProfileView({ userId }) {
  const { session, showToast, setProfile } = useApp();
  const currentUserId = session.user.id;
  const targetId = userId || currentUserId;
  const isMine = targetId === currentUserId;

  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'reviews' | 'shortlist'
  const [itemFilter, setItemFilter] = useState('all'); // 'all' | 'listed' | 'offered' | 'traded'
  const [editOpen, setEditOpen] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [tradeTargetItem, setTradeTargetItem] = useState(null);

  const { data, loading, error, reload } = useQuery(async () => {
    const fetchSaved = async () => {
      if (!isMine) return [];
      try {
        const { data: swipeRows } = await supabase
          .from('swipes')
          .select('item_id')
          .eq('user_id', targetId)
          .eq('action', 'save');
        const savedIds = new Set((swipeRows || []).map((r) => r.item_id));
        try {
          const local = JSON.parse(localStorage.getItem(`switchr_swipes_${targetId}`) || '{}');
          (local.saved || []).forEach((id) => savedIds.add(id));
        } catch {}

        if (savedIds.size > 0) {
          const { data: itms } = await supabase
            .from('items')
            .select('*, owner:profiles(id, username, location_name)')
            .in('id', Array.from(savedIds));
          return itms || [];
        }
      } catch {}
      return [];
    };

    const [profile, stats, items, reviews, savedList, activeTrades] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', targetId).maybeSingle().then(unwrap),
      getProfileStats(targetId),
      supabase
        .from('items')
        .select('*, owner:profiles(id, username, location_name)')
        .eq('user_id', targetId)
        .order('created_at', { ascending: false })
        .then(unwrap),
      supabase
        .from('reviews')
        .select('*, rater:profiles!reviews_rater_id_fkey(id, username)')
        .eq('ratee_id', targetId)
        .order('created_at', { ascending: false })
        .then(unwrap),
      fetchSaved(),
      supabase
        .from('trades')
        .select('id, status, offered_item_id, requested_item_id, initiator_id, receiver_id')
        .in('status', ['pending', 'accepted'])
        .or(`initiator_id.eq.${targetId},receiver_id.eq.${targetId}`)
        .then(unwrap)
        .catch(() => []),
    ]);

    if (!profile) throw new Error('Profile not found.');
    setSavedItems(savedList || []);
    return { profile, stats, items, reviews, savedList: savedList || [], activeTrades: activeTrades || [] };
  }, [targetId]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const { profile, stats, items, reviews, activeTrades } = data;

  const pendingOfferedIds = new Set(
    (activeTrades || [])
      .filter((t) => t.initiator_id === targetId && t.status === 'pending')
      .map((t) => t.offered_item_id),
  );
  const inTradeIds = new Set(
    (activeTrades || [])
      .filter((t) => t.status === 'accepted')
      .flatMap((t) => [t.offered_item_id, t.requested_item_id]),
  );

  const availableItems = items.filter(
    (i) => i.status === 'available' && !pendingOfferedIds.has(i.id) && !inTradeIds.has(i.id),
  );
  const offeredItems = items.filter(
    (i) => i.status === 'in_trade' || pendingOfferedIds.has(i.id) || inTradeIds.has(i.id),
  );
  const tradedItems = items.filter((i) => i.status === 'traded');

  let currentItems = isMine ? items : availableItems;
  if (itemFilter === 'listed') currentItems = availableItems;
  else if (itemFilter === 'offered') currentItems = offeredItems;
  else if (itemFilter === 'traded') currentItems = tradedItems;

  const handleRemoveSaved = async (item) => {
    try {
      await supabase.from('swipes').delete().eq('item_id', item.id);
    } catch {}
    try {
      const key = `switchr_swipes_${targetId}`;
      const cur = JSON.parse(localStorage.getItem(key) || '{}');
      cur.saved = (cur.saved || []).filter((id) => id !== item.id);
      localStorage.setItem(key, JSON.stringify(cur));
    } catch {}
    setSavedItems((prev) => prev.filter((i) => i.id !== item.id));
    showToast(`Removed "${item.title}" from shortlist`, 'info');
  };

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    await supabase.auth.signOut();
  };

  return (
    <div className="mx-auto max-w-3xl">
      {!isMine && <BackButton />}

      {/* Header Profile Card */}
      <div className="card relative mt-2 overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <Avatar name={profile.username} size={64} className="ring-4 ring-white shadow-lift" />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                @{profile.username}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                {profile.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} className="shrink-0 text-brand" /> {profile.location_name}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar size={13} className="shrink-0" /> Joined {timeAgo(profile.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isMine && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="profile-edit-btn"
                onClick={() => setEditOpen(true)}
                className="btn-secondary text-xs sm:text-sm"
              >
                <Edit3 size={15} /> Edit profile
              </button>
              <button
                type="button"
                id="profile-signout-btn"
                onClick={handleSignOut}
                className="btn-ghost p-2 text-bad hover:bg-bad-soft"
                title="Sign out"
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>

        {profile.bio && (
          <p className="mt-4 whitespace-pre-line text-sm text-ink-soft">{profile.bio}</p>
        )}

        {/* Stats Row with interactive quick-filter clicks */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-2xl bg-canvas p-4 text-center">
          <button
            type="button"
            onClick={() => {
              setActiveTab('items');
              setItemFilter('traded');
            }}
            className="group cursor-pointer transition hover:opacity-85 text-center"
            title="View traded items"
          >
            <p className="font-display text-xl font-bold text-ink sm:text-2xl group-hover:text-brand">
              {stats.tradesCompleted}
            </p>
            <p className="text-xs text-muted group-hover:text-brand">Trades done</p>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className="group cursor-pointer transition hover:opacity-85 text-center"
            title="View reviews"
          >
            <div className="flex items-center justify-center gap-1 font-display text-xl font-bold text-ink sm:text-2xl group-hover:text-brand">
              <Star size={18} className="fill-warn text-warn" />
              {stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
            </div>
            <p className="text-xs text-muted group-hover:text-brand">{stats.reviewCount} rating{stats.reviewCount !== 1 ? 's' : ''}</p>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('items');
              setItemFilter('listed');
            }}
            className="group cursor-pointer transition hover:opacity-85 text-center"
            title="View listed items"
          >
            <p className="font-display text-xl font-bold text-ink sm:text-2xl group-hover:text-brand">
              {availableItems.length}
            </p>
            <p className="text-xs text-muted group-hover:text-brand">Available</p>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-8 flex border-b border-line">
        <button
          type="button"
          id="profile-tab-items"
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'items'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Package size={17} /> Items ({isMine ? items.length : availableItems.length})
        </button>
        <button
          type="button"
          id="profile-tab-reviews"
          onClick={() => setActiveTab('reviews')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
            activeTab === 'reviews'
              ? 'border-brand text-brand'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Star size={17} /> Reviews ({reviews.length})
        </button>
        {isMine && (
          <button
            type="button"
            id="profile-tab-shortlist"
            onClick={() => setActiveTab('shortlist')}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition ${
              activeTab === 'shortlist'
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Bookmark size={17} /> Shortlist ({savedItems.length})
          </button>
        )}
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {activeTab === 'items' ? (
          <div>
            {/* Segmented Filter Pills separating Listed, Offered, and Traded */}
            {isMine && items.length > 0 && (
              <div className="mb-6 flex flex-wrap items-center gap-1.5 rounded-2xl bg-canvas p-1.5 sm:gap-2">
                <button
                  type="button"
                  id="profile-filter-all"
                  onClick={() => setItemFilter('all')}
                  className={`cursor-pointer rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    itemFilter === 'all'
                      ? 'bg-white text-ink shadow-xs ring-1 ring-line/50'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  id="profile-filter-listed"
                  onClick={() => setItemFilter('listed')}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    itemFilter === 'listed'
                      ? 'bg-white text-emerald-700 shadow-xs ring-1 ring-emerald-600/20'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Listed ({availableItems.length})
                </button>
                <button
                  type="button"
                  id="profile-filter-offered"
                  onClick={() => setItemFilter('offered')}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    itemFilter === 'offered'
                      ? 'bg-white text-amber-700 shadow-xs ring-1 ring-amber-500/20'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  Offered ({offeredItems.length})
                </button>
                <button
                  type="button"
                  id="profile-filter-traded"
                  onClick={() => setItemFilter('traded')}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition ${
                    itemFilter === 'traded'
                      ? 'bg-white text-ink shadow-xs ring-1 ring-line/50'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Traded ({tradedItems.length})
                </button>
              </div>
            )}

            {currentItems.length === 0 ? (
              <EmptyState
                icon={PackageSearch}
                title={
                  itemFilter === 'listed'
                    ? 'No listed items available'
                    : itemFilter === 'offered'
                    ? 'No items currently offered or in trade'
                    : itemFilter === 'traded'
                    ? 'No completed trades yet'
                    : isMine
                    ? "You haven't listed anything yet"
                    : 'No available items'
                }
                text={
                  itemFilter === 'listed'
                    ? 'All your items have either been offered or completed in swaps.'
                    : itemFilter === 'offered'
                    ? 'Items you make offers on or agree to swap with others will appear here.'
                    : itemFilter === 'traded'
                    ? 'Completed swaps will be archived here once both traders confirm.'
                    : isMine
                    ? 'List something you would like to swap with the community.'
                    : `@${profile.username} has no items available right now.`
                }
                action={
                  isMine && itemFilter === 'listed' ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => navigate('/new')}
                    >
                      <Plus size={16} /> List an item
                    </button>
                  ) : isMine && itemFilter === 'offered' ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => navigate('/explore')}
                    >
                      Explore items to swap
                    </button>
                  ) : isMine && itemFilter === 'all' ? (
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={() => navigate('/new')}
                    >
                      <Plus size={16} /> List an item
                    </button>
                  ) : null
                }
              />
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                  {currentItems.map((item, i) => {
                    const isOffered = offeredItems.some((o) => o.id === item.id) && item.status !== 'traded';
                    const decorated = isOffered
                      ? { ...item, status: inTradeIds.has(item.id) ? 'in_trade' : 'pending' }
                      : item;
                    return <ItemCard key={item.id} item={decorated} showStatus={isMine} index={i} />;
                  })}
                </div>
                {isMine && (
                  <p className="mt-4 text-center text-xs text-muted">
                    {itemFilter === 'all'
                      ? `Showing all ${items.length} items (${availableItems.length} listed, ${offeredItems.length} offered, ${tradedItems.length} traded).`
                      : itemFilter === 'listed'
                      ? `Showing ${availableItems.length} listed item${availableItems.length !== 1 ? 's' : ''} available to swap.`
                      : itemFilter === 'offered'
                      ? `Showing ${offeredItems.length} item${offeredItems.length !== 1 ? 's' : ''} currently in trade or pending offer.`
                      : `Showing ${tradedItems.length} completed traded item${tradedItems.length !== 1 ? 's' : ''}.`}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'reviews' ? (
          reviews.length === 0 ? (
            <EmptyState
              icon={Star}
              title="No reviews yet"
              text={
                isMine
                  ? 'Complete swaps to get reviews and build trust.'
                  : `@${profile.username} hasn't received any reviews yet.`
              }
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => (
                <motion.div
                  key={rev.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card p-4"
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => navigate(`/profile/${rev.rater.id}`)}
                      className="flex items-center gap-2 text-left hover:text-brand"
                    >
                      <Avatar name={rev.rater.username} size={30} />
                      <span className="text-sm font-semibold">@{rev.rater.username}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <Stars value={rev.score} size={15} />
                      <span className="text-xs text-muted">{timeAgo(rev.created_at)}</span>
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="mt-2.5 text-sm text-ink-soft">{rev.comment}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* Shortlist Tab */
          savedItems.length === 0 ? (
            <EmptyState
              icon={Bookmark}
              title="Your shortlist is empty"
              text="Swipe right on items in Explore to save them to your shortlist."
              action={
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => navigate('/explore')}
                >
                  Explore nearby items
                </button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {savedItems.map((it) => (
                <div
                  key={it.id}
                  className="card flex items-center justify-between gap-3 p-3 transition hover:shadow-lift"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/item/${it.id}`)}
                    className="flex flex-1 items-center gap-3 text-left min-w-0"
                  >
                    <ItemImage
                      src={it.image_url}
                      alt={it.title}
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">{it.title}</p>
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
                  </button>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setTradeTargetItem(it)}
                      className="btn-primary rounded-xl px-3 py-1.5 text-xs"
                    >
                      Offer swap
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveSaved(it)}
                      title="Remove from shortlist"
                      className="flex h-6 w-6 items-center justify-center self-end rounded-lg text-muted hover:bg-bad/10 hover:text-bad"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {tradeTargetItem && (
        <TradeOfferModal
          open={Boolean(tradeTargetItem)}
          onClose={() => setTradeTargetItem(null)}
          wantedItem={tradeTargetItem}
          onSent={() => {
            showToast(`Offer sent for ${tradeTargetItem.title}!`);
            setTradeTargetItem(null);
          }}
        />
      )}

      {isMine && (
        <EditProfileModal
          open={editOpen}
          onClose={() => setEditOpen(false)}
          profile={profile}
          onSaved={(updated) => {
            setEditOpen(false);
            if (updated) setProfile((prev) => ({ ...prev, ...updated }));
            showToast('Profile updated!');
            reload();
          }}
        />
      )}
    </div>
  );
}

function EditProfileModal({ open, onClose, profile, onSaved }) {
  const [username, setUsername] = useState(profile.username || '');
  const [locationName, setLocationName] = useState(profile.location_name || '');
  const [lat, setLat] = useState(profile.lat || null);
  const [lng, setLng] = useState(profile.lng || null);
  const [bio, setBio] = useState(profile.bio || '');
  const [busy, setBusy] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGps = async () => {
    setGpsLoading(true);
    setError('');
    try {
      const coords = await getCurrentPosition();
      setLat(coords.lat);
      setLng(coords.lng);
      // Auto-assign nearest city name if currently blank
      if (!locationName) {
        let nearest = 'My location';
        let minDist = Infinity;
        POPULAR_LOCATIONS.forEach((c) => {
          const d = Math.hypot(c.lat - coords.lat, c.lng - coords.lng);
          if (d < minDist) {
            minDist = d;
            nearest = c.name;
          }
        });
        setLocationName(minDist < 0.2 ? nearest : 'My location');
      }
    } catch (err) {
      setError(err.message || 'Could not fetch GPS location.');
    } finally {
      setGpsLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    // If user typed a known city and didn't use GPS, link known coordinates
    let finalLat = lat;
    let finalLng = lng;
    if (locationName) {
      const matched = POPULAR_LOCATIONS.find((c) =>
        locationName.toLowerCase().includes(c.name.toLowerCase()),
      );
      if (matched && !finalLat) {
        finalLat = matched.lat;
        finalLng = matched.lng;
      }
    }

    try {
      const payload = {
        username: username.trim(),
        location_name: locationName.trim() || null,
        bio: bio.trim() || null,
        lat: finalLat,
        lng: finalLng,
      };
      unwrap(
        await supabase
          .from('profiles')
          .update(payload)
          .eq('id', profile.id),
      );
      onSaved(payload);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit profile">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="edit-username" className="label">
            Username
          </label>
          <input
            id="edit-username"
            className="field"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={30}
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="edit-location" className="label mb-0">
              Location <span className="normal-case tracking-normal text-muted">(e.g. Manchester, UK)</span>
            </label>
            <button
              type="button"
              id="edit-gps-btn"
              onClick={handleGps}
              disabled={gpsLoading}
              className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
            >
              <Navigation size={12} /> {gpsLoading ? 'Locating...' : 'Use GPS'}
            </button>
          </div>
          <input
            id="edit-location"
            className="field"
            value={locationName}
            onChange={(e) => {
              setLocationName(e.target.value);
              // Clear manual coords if user changes city
              setLat(null);
              setLng(null);
            }}
            placeholder="e.g. Liverpool City Centre"
            maxLength={80}
          />
          {lat != null && (
            <p className="mt-1 text-[11px] text-muted flex items-center gap-1">
              <MapPin size={11} className="text-brand" /> Coordinates linked: {lat.toFixed(2)}, {lng.toFixed(2)}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="edit-bio" className="label">
            Bio
          </label>
          <textarea
            id="edit-bio"
            className="field min-h-24 resize-none"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell traders about yourself and what you love swapping..."
            maxLength={300}
          />
        </div>

        {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

        <button id="edit-profile-save" type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4 text-white" /> : 'Save changes'}
        </button>

        {/* GDPR & SOC 2 Self-Serve Account & Data Erasure */}
        <div className="mt-6 border-t border-line/70 pt-4">
          <p className="text-xs font-semibold text-ink">Privacy & Account Security</p>
          <p className="mt-0.5 text-[11px] text-muted">
            Permanently delete your account, listings, messages, reviews, and personal data (GDPR / SOC 2 Right to Erasure).
          </p>
          <button
            type="button"
            id="delete-account-btn"
            onClick={async () => {
              const confirmed = window.confirm(
                'Are you sure you want to permanently delete your account?\n\nThis will permanently erase your profile, all listings, chats, and trade history. This action cannot be undone.'
              );
              if (!confirmed) return;
              try {
                setBusy(true);
                await deleteMyAccount();
                showToast('Your account and personal data have been completely deleted.', 'info');
                navigate('/auth');
              } catch (err) {
                setError(errorMessage(err));
                setBusy(false);
              }
            }}
            disabled={busy}
            className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-bad/30 bg-bad-soft/40 px-3 py-2 text-xs font-semibold text-bad transition hover:bg-bad-soft"
          >
            <ShieldAlert size={14} /> Delete account & erase all data
          </button>
        </div>
      </form>
    </Modal>
  );
}
