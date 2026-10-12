import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronRight, Inbox, Send, MessagesSquare, History, Star, MessageSquare } from 'lucide-react';
import { supabase, unwrap, TRADE_SELECT } from '../lib/supabase';
import { errorMessage, navigate, timeAgo, useApp, useQuery } from '../lib/core';
import { getTradeLastRead, subscribeToUnreadChanges } from '../lib/notifications';
import { EmptyState, ErrorBox, ItemImage, PageLoader, PageTitle, StatusBadge } from '../components/ui';

const TABS = [
  { id: 'received', label: 'Offers received', icon: Inbox },
  { id: 'sent', label: 'Offers sent', icon: Send },
  { id: 'active', label: 'Active trades', icon: MessagesSquare },
  { id: 'history', label: 'History', icon: History },
];

export default function TradesView({ initialTab = 'received' }) {
  const { session, showToast } = useApp();
  const me = session.user.id;
  const [tab, setTab] = useState(TABS.some((t) => t.id === initialTab) ? initialTab : 'received');

  const { data, loading, error, reload } = useQuery(async () => {
    const [trades, myReviews] = await Promise.all([
      supabase
        .from('trades')
        .select(TRADE_SELECT)
        .or(`initiator_id.eq.${me},receiver_id.eq.${me}`)
        .order('updated_at', { ascending: false })
        .then(unwrap),
      supabase.from('reviews').select('trade_id').eq('rater_id', me).then(unwrap),
    ]);

    const activeTrades = (trades || []).filter((t) => t.status === 'accepted');
    const unreadTradeIds = new Set();
    if (activeTrades.length > 0) {
      await Promise.all(
        activeTrades.map(async (t) => {
          const lastRead = getTradeLastRead(t.id);
          let q = supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('trade_id', t.id)
            .neq('sender_id', me);
          if (lastRead) {
            q = q.gt('created_at', lastRead);
          }
          const { count } = await q;
          if (count && count > 0) {
            unreadTradeIds.add(t.id);
          }
        }),
      );
    }

    return { trades, reviewed: new Set(myReviews.map((r) => r.trade_id)), unreadTradeIds };
  });

  useEffect(() => {
    return subscribeToUnreadChanges(() => {
      reload();
    });
  }, [reload]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;

  const { trades, reviewed } = data;
  const received = trades.filter((t) => t.status === 'pending' && t.receiver_id === me);
  const sent = trades.filter((t) => t.status === 'pending' && t.initiator_id === me);
  const active = trades.filter((t) => t.status === 'accepted');
  const history = trades.filter((t) => ['completed', 'declined', 'cancelled'].includes(t.status));
  const counts = { received: received.length, sent: sent.length, active: active.length, history: history.length };

  // Group incoming offers by which of MY items they're for.
  const groups = Object.values(
    received.reduce((acc, t) => {
      if (!t.requested) return acc;
      const key = t.requested_item_id;
      acc[key] ??= { item: t.requested, offers: [] };
      acc[key].offers.push(t);
      return acc;
    }, {}),
  );

  const cancel = async (tradeId) => {
    try {
      unwrap(await supabase.rpc('cancel_trade', { p_trade_id: tradeId }));
      showToast('Offer withdrawn');
      reload();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    }
  };

  const changeTab = (id) => {
    setTab(id);
    window.history.replaceState(null, '', `#/trades?tab=${id}`);
  };

  return (
    <div>
      <PageTitle title="Trades" subtitle="Your offers, active swaps and history." />

      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isUnreadTab = id === 'active' && data?.unreadTradeIds?.size > 0;
          return (
            <button key={id} type="button" id={`trades-tab-${id}`} onClick={() => changeTab(id)} className={tab === id ? 'chip-on' : 'chip-off'}>
              <Icon size={15} /> {label}
              {counts[id] > 0 && (
                <span
                  className={`ml-0.5 rounded-full px-1.5 text-xs ${
                    tab === id
                      ? 'bg-white/25'
                      : isUnreadTab
                      ? 'bg-emerald-600 text-white font-bold animate-pulse'
                      : 'bg-brand-soft text-brand'
                  }`}
                >
                  {counts[id]}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        {tab === 'received' &&
          (groups.length === 0 ? (
            <EmptyState icon={Inbox} title="No offers yet" text="When someone offers you a swap for one of your items, it shows up here." />
          ) : (
            groups.map(({ item, offers }) => (
              <button
                key={item.id}
                type="button"
                id={`received-group-${item.id}`}
                onClick={() => navigate(`/offers/${item.id}`)}
                className="card flex w-full items-center gap-4 p-3 text-left transition hover:shadow-lift"
              >
                <ItemImage src={item.image_url} alt={item.title} className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.title}</p>
                  <p className="text-sm text-ink-soft">
                    <span className="font-semibold text-brand">
                      {offers.length} offer{offers.length > 1 ? 's' : ''}
                    </span>{' '}
                    · latest {timeAgo(offers[0].created_at)}
                  </p>
                </div>
                <span className="hidden text-sm font-semibold text-brand sm:inline">Review</span>
                <ChevronRight className="text-muted" size={20} />
              </button>
            ))
          ))}

        {tab === 'sent' &&
          (sent.length === 0 ? (
            <EmptyState icon={Send} title="No pending offers" text="Find something you like and make an offer." />
          ) : (
            sent.map((t) => (
              <TradeRow key={t.id} trade={t} me={me}>
                <button
                  type="button"
                  id={`sent-cancel-${t.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    cancel(t.id);
                  }}
                  className="btn-ghost px-3 py-1.5 text-xs text-bad"
                >
                  Withdraw
                </button>
              </TradeRow>
            ))
          ))}

        {tab === 'active' &&
          (active.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="No active trades" text="Accepted offers appear here so you can chat and arrange the swap." />
          ) : (
            active.map((t) => {
              const iConfirmed = t.initiator_id === me ? t.initiator_confirmed : t.receiver_confirmed;
              const theyConfirmed = t.initiator_id === me ? t.receiver_confirmed : t.initiator_confirmed;
              const hasUnread = data?.unreadTradeIds?.has(t.id);
              return (
                <TradeRow key={t.id} trade={t} me={me}>
                  <div className="flex items-center gap-1.5">
                    {hasUnread && (
                      <span className="badge flex items-center gap-1 bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/30 text-xs font-semibold animate-pulse">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                        New message
                      </span>
                    )}
                    {theyConfirmed && !iConfirmed ? (
                      <span className="badge bg-coral-soft text-coral">Confirm swap</span>
                    ) : iConfirmed ? (
                      <span className="badge bg-ink/5 text-ink-soft">Waiting</span>
                    ) : (
                      <span className="badge bg-ok-soft text-ok">Chat</span>
                    )}
                  </div>
                </TradeRow>
              );
            })
          ))}

        {tab === 'history' &&
          (history.length === 0 ? (
            <EmptyState icon={History} title="No history yet" text="Completed, declined and cancelled trades will be listed here." />
          ) : (
            history.map((t) => (
              <TradeRow key={t.id} trade={t} me={me}>
                {t.status === 'completed' && !reviewed.has(t.id) ? (
                  <span className="badge bg-warn-soft text-warn">
                    <Star size={12} className="fill-warn" /> Rate
                  </span>
                ) : (
                  <StatusBadge status={t.status} />
                )}
              </TradeRow>
            ))
          ))}
      </motion.div>
    </div>
  );
}

function TradeRow({ trade, me, children }) {
  const iAmInitiator = trade.initiator_id === me;
  const give = iAmInitiator ? trade.offered : trade.requested;
  const get = iAmInitiator ? trade.requested : trade.offered;
  const partner = iAmInitiator ? trade.receiver : trade.initiator;

  return (
    <div
      role="button"
      tabIndex={0}
      id={`trade-row-${trade.id}`}
      onClick={() => navigate(`/trade/${trade.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/trade/${trade.id}`)}
      className="card flex cursor-pointer items-center gap-3 p-3 transition hover:shadow-lift"
    >
      <div className="flex shrink-0 items-center">
        <ItemImage src={give?.image_url} alt={give?.title} className="h-14 w-14 rounded-xl" />
        <span className="z-10 -mx-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-brand text-white">
          <ArrowRight size={12} strokeWidth={3} />
        </span>
        <ItemImage src={get?.image_url} alt={get?.title} className="h-14 w-14 rounded-xl" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {give?.title} <span className="font-normal text-muted">for</span> {get?.title}
        </p>
        <p className="truncate text-xs text-muted">
          with @{partner?.username} · {timeAgo(trade.updated_at)}
        </p>
      </div>
      {children}
    </div>
  );
}
