import { useImperativeHandle, useState } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { Check, X, Inbox, ArrowRightLeft, Hand, Star } from 'lucide-react';
import { supabase, unwrap, TRADE_SELECT, getProfileStats } from '../lib/supabase';
import { errorMessage, navigate, useApp, useQuery } from '../lib/core';
import { Avatar, BackButton, EmptyState, ErrorBox, ItemImage, PageLoader } from '../components/ui';

const SWIPE_THRESHOLD = 120;

/**
 * Swipe through the offers people have made for ONE of your items.
 * Right = accept (opens the trade chat, auto-declines the rest). Left = decline.
 */
export default function OfferSwipeView({ itemId }) {
  const { session, showToast } = useApp();
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [cardRef, setCardRef] = useState(null);

  const { data, loading, error, reload } = useQuery(async () => {
    const [item, offers] = await Promise.all([
      supabase.from('items').select('*').eq('id', itemId).eq('user_id', session.user.id).maybeSingle().then(unwrap),
      supabase
        .from('trades')
        .select(TRADE_SELECT)
        .eq('requested_item_id', itemId)
        .eq('receiver_id', session.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .then(unwrap),
    ]);
    if (!item) throw new Error('Item not found.');
    const ids = [...new Set(offers.map((o) => o.initiator_id))];
    const statsList = await Promise.all(ids.map(getProfileStats));
    const stats = Object.fromEntries(ids.map((id, i) => [id, statsList[i]]));
    return { item, offers, stats };
  }, [itemId]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const { item, offers, stats } = data;
  const current = offers[index];
  const next = offers[index + 1];

  /** Returns true on success; on failure the card springs back. */
  const decide = async (trade, direction) => {
    setBusy(true);
    try {
      if (direction === 'right') {
        unwrap(await supabase.rpc('accept_trade', { p_trade_id: trade.id }));
        showToast('Offer accepted! Say hi and arrange the swap.');
        navigate(`/trade/${trade.id}`);
        return true;
      }
      unwrap(await supabase.rpc('decline_trade', { p_trade_id: trade.id }));
      setIndex((i) => i + 1);
      return true;
    } catch (err) {
      showToast(errorMessage(err), 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md">
      <BackButton onClick={() => navigate('/trades')} />

      <div className="mb-5 mt-2 flex items-center gap-3">
        <ItemImage src={item.image_url} alt={item.title} className="h-12 w-12 rounded-xl" />
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Offers for your</p>
          <h1 className="truncate font-display text-xl font-bold">{item.title}</h1>
        </div>
        {current && (
          <span className="badge ml-auto bg-brand-soft text-brand">
            {index + 1} / {offers.length}
          </span>
        )}
      </div>

      {!current ? (
        <EmptyState
          icon={Inbox}
          title={offers.length ? "That's every offer" : 'No pending offers'}
          text={offers.length ? 'New offers for this item will appear here.' : 'Nobody has offered for this item yet.'}
          action={
            <button type="button" className="btn-secondary" onClick={() => navigate('/trades')}>
              Back to trades
            </button>
          }
        />
      ) : (
        <>
          <div className="relative aspect-[3/4] w-full">
            {next && (
              <div className="absolute inset-0 scale-[0.94] translate-y-4 opacity-60">
                <OfferCardFace trade={next} stats={stats[next.initiator_id]} />
              </div>
            )}
            <AnimatePresence initial={false}>
              <SwipeCard
                key={current.id}
                ref={setCardRef}
                trade={current}
                stats={stats[current.initiator_id]}
                disabled={busy}
                onDecide={decide}
              />
            </AnimatePresence>
          </div>

          <div className="mt-6 flex items-center justify-center gap-6">
            <button
              type="button"
              id="swipe-decline"
              aria-label="Decline offer"
              disabled={busy}
              onClick={() => cardRef?.swipe('left')}
              className="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-white text-bad shadow-card transition hover:scale-105 hover:bg-bad hover:text-white active:scale-95 disabled:opacity-50"
            >
              <X size={28} strokeWidth={2.6} />
            </button>
            <button
              type="button"
              id="swipe-accept"
              aria-label="Accept offer"
              disabled={busy}
              onClick={() => cardRef?.swipe('right')}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-linear-to-br from-ok to-[#0ca678] text-white shadow-lift transition hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Check size={34} strokeWidth={2.8} />
            </button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
            <Hand size={13} /> Swipe right to accept, left to decline. Accepting declines the other offers.
          </p>
        </>
      )}
    </div>
  );
}

function SwipeCard({ ref, trade, stats, disabled, onDecide }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-14, 0, 14]);
  const acceptOpacity = useTransform(x, [30, SWIPE_THRESHOLD], [0, 1]);
  const declineOpacity = useTransform(x, [-SWIPE_THRESHOLD, -30], [1, 0]);

  const springBack = () => animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });

  const fling = async (direction) => {
    if (disabled) return;
    await animate(x, direction === 'right' ? 600 : -600, { duration: 0.28, ease: 'easeIn' });
    const ok = await onDecide(trade, direction);
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
      initial={{ scale: 0.94, y: 16, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
    >
      <OfferCardFace trade={trade} stats={stats} />
      <motion.div
        style={{ opacity: acceptOpacity }}
        className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-xl border-4 border-ok bg-white/80 px-3 py-1 font-display text-2xl font-extrabold text-ok"
      >
        SWAP
      </motion.div>
      <motion.div
        style={{ opacity: declineOpacity }}
        className="pointer-events-none absolute right-5 top-6 rotate-12 rounded-xl border-4 border-bad bg-white/80 px-3 py-1 font-display text-2xl font-extrabold text-bad"
      >
        PASS
      </motion.div>
    </motion.div>
  );
}

function OfferCardFace({ trade, stats }) {
  const offered = trade.offered;
  return (
    <div className="relative h-full w-full select-none overflow-hidden rounded-3xl bg-ink shadow-lift">
      <ItemImage src={offered.image_url} alt={offered.title} className="pointer-events-none h-full w-full" />
      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink via-ink/85 to-transparent p-5 pt-24 text-white">
        <div className="flex flex-wrap gap-1.5">
          <span className="badge bg-white/15 text-white backdrop-blur">{offered.condition}</span>
          <span className="badge bg-white/15 text-white backdrop-blur">{offered.category}</span>
        </div>
        <h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold leading-tight">
          <ArrowRightLeft size={20} className="shrink-0 text-coral" />
          {offered.title}
        </h2>
        {offered.description && <p className="mt-1.5 line-clamp-2 text-sm text-white/75">{offered.description}</p>}
        <div className="mt-4 flex items-center gap-2.5 border-t border-white/15 pt-3">
          <Avatar name={trade.initiator.username} size={32} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">@{trade.initiator.username}</p>
            {stats && (
              <p className="flex items-center gap-1 text-xs text-white/70">
                {stats.reviewCount ? (
                  <>
                    <Star size={12} className="fill-warn text-warn" /> {stats.avgRating?.toFixed(1)} ({stats.reviewCount}) ·
                  </>
                ) : (
                  'No ratings yet ·'
                )}{' '}
                {stats.tradesCompleted} trades
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
