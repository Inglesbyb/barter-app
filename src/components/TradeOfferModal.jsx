import { useState } from 'react';
import { Check, PackagePlus } from 'lucide-react';
import { supabase, unwrap } from '../lib/supabase';
import { errorMessage, navigate, useApp, useQuery } from '../lib/core';
import Modal from './Modal';
import { ItemImage, Spinner } from './ui';

/** "Which of your items do you want to offer for this one?" */
export default function TradeOfferModal({ open, onClose, wantedItem, onSent }) {
  return (
    <Modal open={open} onClose={onClose} title="Choose an item to offer">
      {/* Mounted only while open, so it always loads fresh */}
      <OfferPicker wantedItem={wantedItem} onSent={onSent} />
    </Modal>
  );
}

function OfferPicker({ wantedItem, onSent }) {
  const { session, showToast } = useApp();
  const [selected, setSelected] = useState(null);
  const [sending, setSending] = useState(false);

  const { data: myItems, loading, error } = useQuery(async () =>
    unwrap(
      await supabase
        .from('items')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'available')
        .order('created_at', { ascending: false }),
    ),
  );

  const send = async () => {
    if (!selected) return;
    setSending(true);
    try {
      const inserted = unwrap(
        await supabase
          .from('trades')
          .insert({
            initiator_id: session.user.id,
            receiver_id: wantedItem.user_id,
            offered_item_id: selected,
            requested_item_id: wantedItem.id,
          })
          .select('id')
          .single(),
      );

      // Check if item owner is a live Liverpool bot
      let isBot = wantedItem.owner?.is_bot;
      if (isBot === undefined) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('is_bot')
          .eq('id', wantedItem.user_id)
          .maybeSingle();
        isBot = Boolean(prof?.is_bot);
      }

      if (isBot) {
        try {
          await supabase.rpc('bot_auto_accept_trade', { p_trade_id: inserted.id });
          showToast(`Offer accepted by @${wantedItem.owner?.username || 'Liverpool trader'}! The chat is open.`);
          onSent?.(inserted.id);
          navigate(`/trade/${inserted.id}`);
          return;
        } catch (botErr) {
          console.error('Bot auto-accept error:', botErr);
        }
      }

      onSent?.(inserted.id);
    } catch (err) {
      showToast(err.code === '23505' ? "You've already offered that item for this one." : errorMessage(err), 'error');
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (error) return <p className="py-8 text-center text-sm text-bad">{errorMessage(error)}</p>;

  if (myItems.length === 0) {
    return (
      <div className="py-8 text-center">
        <PackagePlus className="mx-auto text-brand" size={32} />
        <p className="mt-3 font-semibold">You have nothing to offer yet</p>
        <p className="mt-1 text-sm text-ink-soft">List an item first, then come back to make an offer.</p>
        <button type="button" className="btn-primary mt-5" onClick={() => navigate('/new')}>
          List an item
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">
        You're offering a swap for <strong className="text-ink">{wantedItem.title}</strong>. Pick one of your items:
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {myItems.map((it) => {
          const active = selected === it.id;
          return (
            <button
              key={it.id}
              type="button"
              id={`offer-pick-${it.id}`}
              onClick={() => setSelected(it.id)}
              className={`relative overflow-hidden rounded-xl border-2 bg-white text-left transition ${
                active ? 'border-brand shadow-lift' : 'border-line/60 hover:border-brand/40'
              }`}
            >
              <ItemImage src={it.image_url} alt={it.title} className="aspect-square w-full" />
              <p className="truncate px-2 py-1.5 text-xs font-semibold">{it.title}</p>
              {active && (
                <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white">
                  <Check size={14} strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button
        id="offer-send"
        type="button"
        className="btn-primary sticky bottom-0 mt-5 w-full py-3"
        disabled={!selected || sending}
        onClick={send}
      >
        {sending ? <Spinner className="h-4 w-4 text-white" /> : 'Send offer'}
      </button>
    </div>
  );
}
