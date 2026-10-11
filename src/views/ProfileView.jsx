import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Package, Star, Edit3, LogOut, PackageSearch, Plus } from 'lucide-react';
import { supabase, unwrap, getProfileStats } from '../lib/supabase';
import { errorMessage, navigate, timeAgo, useApp, useQuery } from '../lib/core';
import ItemCard from '../components/ItemCard';
import Modal from '../components/Modal';
import { Avatar, BackButton, EmptyState, ErrorBox, PageLoader, Spinner, Stars } from '../components/ui';

export default function ProfileView({ userId }) {
  const { session, showToast, setProfile } = useApp();
  const currentUserId = session.user.id;
  const targetId = userId || currentUserId;
  const isMine = targetId === currentUserId;

  const [activeTab, setActiveTab] = useState('items'); // 'items' | 'reviews'
  const [editOpen, setEditOpen] = useState(false);

  const { data, loading, error, reload } = useQuery(async () => {
    const [profile, stats, items, reviews] = await Promise.all([
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
    ]);

    if (!profile) throw new Error('Profile not found.');
    return { profile, stats, items, reviews };
  }, [targetId]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const { profile, stats, items, reviews } = data;
  const availableItems = items.filter((i) => i.status === 'available');
  const tradedItems = items.filter((i) => i.status === 'traded');
  const displayItems = isMine ? items : availableItems;

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

        {/* Stats Row */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-line rounded-2xl bg-canvas p-4 text-center">
          <div>
            <p className="font-display text-xl font-bold text-ink sm:text-2xl">
              {stats.tradesCompleted}
            </p>
            <p className="text-xs text-muted">Trades done</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 font-display text-xl font-bold text-ink sm:text-2xl">
              <Star size={18} className="fill-warn text-warn" />
              {stats.avgRating ? stats.avgRating.toFixed(1) : '—'}
            </div>
            <p className="text-xs text-muted">{stats.reviewCount} rating{stats.reviewCount !== 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="font-display text-xl font-bold text-ink sm:text-2xl">
              {availableItems.length}
            </p>
            <p className="text-xs text-muted">Available</p>
          </div>
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
          <Package size={17} /> Items ({displayItems.length})
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
      </div>

      {/* Tab Contents */}
      <div className="mt-6">
        {activeTab === 'items' ? (
          displayItems.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title={isMine ? "You haven't listed anything yet" : 'No available items'}
              text={
                isMine
                  ? 'List something you would like to swap with the community.'
                  : `@${profile.username} has no items available right now.`
              }
              action={
                isMine && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => navigate('/new')}
                  >
                    <Plus size={16} /> List an item
                  </button>
                )
              }
            />
          ) : (
            <div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                {displayItems.map((item, i) => (
                  <ItemCard key={item.id} item={item} showStatus={isMine} index={i} />
                ))}
              </div>
              {isMine && tradedItems.length > 0 && (
                <p className="mt-4 text-center text-xs text-muted">
                  Showing {availableItems.length} available &amp; {tradedItems.length} completed trade{tradedItems.length !== 1 ? 's' : ''}.
                </p>
              )}
            </div>
          )
        ) : reviews.length === 0 ? (
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
        )}
      </div>

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
  const [bio, setBio] = useState(profile.bio || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const payload = {
        username: username.trim(),
        location_name: locationName.trim() || null,
        bio: bio.trim() || null,
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
          <label htmlFor="edit-location" className="label">
            Location <span className="normal-case tracking-normal text-muted">(e.g. Manchester, UK)</span>
          </label>
          <input
            id="edit-location"
            className="field"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            placeholder="e.g. Liverpool City Centre"
            maxLength={80}
          />
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
      </form>
    </Modal>
  );
}
