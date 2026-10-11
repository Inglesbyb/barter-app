import { useState } from 'react';
import { Star } from 'lucide-react';
import { supabase, unwrap } from '../lib/supabase';
import { errorMessage, useApp } from '../lib/core';
import Modal from './Modal';
import { Avatar, Spinner } from './ui';

const LABELS = ['', 'Poor', 'Not great', 'OK', 'Good', 'Excellent'];

export default function ReviewModal({ open, onClose, trade, partner, onDone }) {
  const { session, showToast } = useApp();
  const [score, setScore] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!score) return;
    setBusy(true);
    try {
      unwrap(
        await supabase.from('reviews').insert({
          trade_id: trade.id,
          rater_id: session.user.id,
          ratee_id: partner.id,
          score,
          comment: comment.trim() || null,
        }),
      );
      showToast('Thanks for rating!');
      onDone(score);
    } catch (err) {
      showToast(err.code === '23505' ? "You've already rated this trade." : errorMessage(err), 'error');
      setBusy(false);
    }
  };

  const shown = hover || score;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rate your trader"
      footer={
        <button id="review-submit" type="button" className="btn-primary w-full py-3" disabled={!score || busy} onClick={submit}>
          {busy ? <Spinner className="h-4 w-4 text-white" /> : 'Submit rating'}
        </button>
      }
    >
      <div className="flex flex-col items-center text-center">
        <Avatar name={partner.username} size={56} />
        <p className="mt-3 font-semibold">How was trading with @{partner.username}?</p>
        <div className="mt-4 flex gap-1.5" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              id={`review-star-${n}`}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setScore(n)}
              className="rounded-lg p-1 transition hover:scale-110 active:scale-95"
            >
              <Star size={36} className={n <= shown ? 'fill-warn text-warn' : 'fill-line text-line'} />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-sm font-medium text-ink-soft">{LABELS[shown]}</p>
        <textarea
          id="review-comment"
          className="field mt-4 min-h-24 resize-none text-left"
          placeholder="Optional: how did the swap go?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
        />
      </div>
    </Modal>
  );
}
