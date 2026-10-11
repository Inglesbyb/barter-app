import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, MapPin, Trash2, Inbox, Clock } from 'lucide-react';
import { supabase, unwrap, ITEM_SELECT, getProfileStats } from '../lib/supabase';
import { errorMessage, navigate, timeAgo, useApp, useQuery } from '../lib/core';
import TradeOfferModal from '../components/TradeOfferModal';
import { Avatar, BackButton, ErrorBox, ItemImage, PageLoader, RatingInline, StatusBadge } from '../components/ui';

export default function ItemDetailView({ itemId }) {
  const { session, showToast } = useApp();
  const me = session.user.id;
  const [offerOpen, setOfferOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload } = useQuery(async () => {
    const item = unwrap(await supabase.from('items').select(ITEM_SELECT).eq('id', itemId).maybeSingle());
    if (!item) throw new Error('This item no longer exists.');
    const isMine = item.user_id === me;

    const [stats, myOffer, pendingCount] = await Promise.all([
      getProfileStats(item.user_id),
      isMine
        ? null
        : supabase
            .from('trades')
            .select('id, offered:items!trades_offered_item_id_fkey(title)')
            .eq('initiator_id', me)
            .eq('requested_item_id', itemId)
            .eq('status', 'pending')
            .maybeSingle()
            .then(unwrap),
      isMine
        ? supabase
            .from('trades')
            .select('id', { count: 'exact', head: true })
            .eq('requested_item_id', itemId)
            .eq('status', 'pending')
            .then((r) => r.count ?? 0)
        : 0,
    ]);
    return { item, isMine, stats, myOffer, pendingCount };
  }, [itemId]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const { item, isMine, stats, myOffer, pendingCount } = data;

  const handleDelete = async () => {
    if (!window.confirm('Delete this listing? Any pending offers on it will be removed.')) return;
    setDeleting(true);
    try {
      unwrap(await supabase.from('items').delete().eq('id', item.id));
      showToast('Listing deleted');
      navigate('/me');
    } catch (err) {
      showToast(errorMessage(err), 'error');
      setDeleting(false);
    }
  };

  return (
    <div>
      <BackButton />
      <div className="mt-2 grid gap-6 md:grid-cols-2 md:gap-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card overflow-hidden"
        >
          <ItemImage src={item.image_url} alt={item.title} className="aspect-square w-full" />
        </motion.div>

        <div className="flex flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-brand-soft text-brand">{item.category}</span>
            <span className="badge bg-ink/5 text-ink-soft">{item.condition}</span>
            {item.status !== 'available' && <StatusBadge status={item.status} />}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight">{item.title}</h1>
          <p className="mt-1 text-xs text-muted">Listed {timeAgo(item.created_at)}</p>

          {item.description && (
            <p className="mt-5 whitespace-pre-line leading-relaxed text-ink-soft">{item.description}</p>
          )}

          {/* Owner */}
          <button
            type="button"
            id="item-owner-link"
            onClick={() => navigate(`/profile/${item.owner.id}`)}
            className="card mt-6 flex items-center gap-3 p-4 text-left transition hover:shadow-lift"
          >
            <Avatar name={item.owner.username} size={44} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{isMine ? 'You' : `@${item.owner.username}`}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <RatingInline stats={stats} />
                <span className="text-xs text-muted">{stats.tradesCompleted} trades</span>
                {item.owner.location_name && (
                  <span className="flex items-center gap-0.5 text-xs text-muted">
                    <MapPin size={11} /> {item.owner.location_name}
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Actions */}
          <div className="mt-6 space-y-3">
            {isMine ? (
              <>
                {pendingCount > 0 && (
                  <button
                    type="button"
                    id="item-review-offers"
                    className="btn-primary w-full py-3"
                    onClick={() => navigate(`/offers/${item.id}`)}
                  >
                    <Inbox size={18} /> Review {pendingCount} offer{pendingCount > 1 ? 's' : ''}
                  </button>
                )}
                {item.status === 'available' && (
                  <button type="button" id="item-delete" className="btn-danger w-full" onClick={handleDelete} disabled={deleting}>
                    <Trash2 size={16} /> Delete listing
                  </button>
                )}
              </>
            ) : item.status !== 'available' ? (
              <p className="rounded-xl bg-ink/5 p-4 text-center text-sm text-ink-soft">
                This item is no longer available.
              </p>
            ) : myOffer ? (
              <div className="flex items-center gap-3 rounded-xl border border-brand/20 bg-brand-soft p-4 text-sm">
                <Clock size={18} className="shrink-0 text-brand" />
                <span>
                  You offered <strong>{myOffer.offered?.title}</strong>. Waiting for a response.
                </span>
              </div>
            ) : (
              <button
                type="button"
                id="item-make-offer"
                className="btn-primary w-full py-3.5 text-base"
                onClick={() => setOfferOpen(true)}
              >
                <ArrowRightLeft size={18} /> Make an offer
              </button>
            )}
          </div>
        </div>
      </div>

      {!isMine && (
        <TradeOfferModal
          open={offerOpen}
          onClose={() => setOfferOpen(false)}
          wantedItem={item}
          onSent={() => {
            setOfferOpen(false);
            showToast('Offer sent!');
            reload();
          }}
        />
      )}
    </div>
  );
}
