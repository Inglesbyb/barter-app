import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Bell, Check, CheckCircle2, Clock, Image as ImageIcon, Lock, PartyPopper, Send, ShieldCheck, Sparkles, Volume2, VolumeX, X, XCircle } from 'lucide-react';
import { supabase, unwrap, uploadChatImage, TRADE_SELECT } from '../lib/supabase';
import { errorMessage, navigate, timeAgo, useApp, useQuery } from '../lib/core';
import { playMessageSound, showBrowserNotification, markTradeAsRead, getNotificationPermission, requestNotificationPermission, isSoundMuted, toggleSoundMuted } from '../lib/notifications';
import ReviewModal from '../components/ReviewModal';
import { Avatar, BackButton, ErrorBox, ItemImage, PageLoader, Spinner, Stars, StatusBadge } from '../components/ui';

export default function TradeDetailView({ tradeId }) {
  const { session, showToast } = useApp();
  const [showSafetyTip, setShowSafetyTip] = useState(true);

  const { data, loading, error, reload } = useQuery(async () => {
    const [trade, messages, myReview] = await Promise.all([
      supabase.from('trades').select(TRADE_SELECT).eq('id', tradeId).maybeSingle().then(unwrap),
      supabase.from('messages').select('*').eq('trade_id', tradeId).order('created_at').then(unwrap),
      supabase
        .from('reviews')
        .select('score')
        .eq('trade_id', tradeId)
        .eq('rater_id', session.user.id)
        .maybeSingle()
        .then(unwrap),
    ]);
    if (!trade) throw new Error('Trade not found.');
    return { trade, messages, myReview };
  }, [tradeId]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorBox error={error} onRetry={reload} />;
  return <TradeRoom initial={data} reload={reload} />;
}

function TradeRoom({ initial, reload }) {
  const { session, showToast } = useApp();
  const me = session.user.id;
  const [trade, setTrade] = useState(initial.trade);
  const [messages, setMessages] = useState(initial.messages);
  const [myScore, setMyScore] = useState(initial.myReview?.score ?? null);
  const [reviewOpen, setReviewOpen] = useState(initial.trade.status === 'completed' && !initial.myReview);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  const iAmInitiator = trade.initiator_id === me;
  const partner = iAmInitiator ? trade.receiver : trade.initiator;
  const give = iAmInitiator ? trade.offered : trade.requested;
  const get = iAmInitiator ? trade.requested : trade.offered;
  const iConfirmed = iAmInitiator ? trade.initiator_confirmed : trade.receiver_confirmed;
  const theyConfirmed = iAmInitiator ? trade.receiver_confirmed : trade.initiator_confirmed;
  const chatOpen = trade.status === 'accepted';

  const [muted, setMuted] = useState(isSoundMuted());
  const [notifPerm, setNotifPerm] = useState(getNotificationPermission());

  // Live updates: new messages + trade status changes.
  useEffect(() => {
    markTradeAsRead(trade.id);

    const channel = supabase
      .channel(`trade-${trade.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `trade_id=eq.${trade.id}` },
        ({ new: msg }) => {
          setMessages((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));
          if (msg.sender_id !== me) {
            playMessageSound();
            markTradeAsRead(trade.id);
            if (typeof document !== 'undefined' && document.hidden) {
              showBrowserNotification(
                `@${partner.username} on SwitchR`,
                msg.content || (msg.image_url ? '📷 Sent a photo' : 'New message'),
                () => window.focus(),
              );
            }
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'trades', filter: `id=eq.${trade.id}` },
        ({ new: row }) => {
          setTrade((t) => ({ ...t, ...row }));
          if (row.status === 'completed') setReviewOpen(true);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [trade.id, me, partner?.username]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, partnerTyping]);

  const handleToggleSound = () => {
    const isNowMuted = toggleSoundMuted();
    setMuted(isNowMuted);
    showToast(isNowMuted ? 'Sound chime muted' : 'Sound chime enabled', 'info');
    if (!isNowMuted) playMessageSound();
  };

  const handleEnableDesktopNotifs = async () => {
    const perm = await requestNotificationPermission();
    setNotifPerm(perm);
    if (perm === 'granted') {
      showToast('Desktop notifications enabled!', 'success');
      showBrowserNotification(
        'SwitchR notifications active',
        'You will receive alerts when traders message you.',
      );
    } else if (perm === 'denied') {
      showToast('Notifications are blocked by browser settings', 'error');
    }
  };

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      const result = await fn();
      if (successMsg) showToast(successMsg);
      return result;
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const rpc = (name) => supabase.rpc(name, { p_trade_id: trade.id }).then(unwrap);

  const accept = () => run(() => rpc('accept_trade'), 'Offer accepted! The chat is open.').then(reload);
  const acceptBot = () => run(() => rpc('bot_auto_accept_trade'), 'Offer accepted! The chat is open.').then(reload);
  const decline = () => run(() => rpc('decline_trade'), 'Offer declined').then(() => navigate('/trades'));
  const cancel = () => {
    const msg =
      trade.status === 'pending'
        ? 'Withdraw this offer?'
        : 'Cancel this trade? Both items will go back to being available.';
    if (!window.confirm(msg)) return;
    run(() => rpc('cancel_trade'), trade.status === 'pending' ? 'Offer withdrawn' : 'Trade cancelled').then(reload);
  };
  const confirm = async () => {
    const result = await run(() => rpc('confirm_trade'));
    if (result === 'completed') {
      showToast('Trade complete!');
      setReviewOpen(true);
    } else if (result === 'waiting') {
      showToast(`Confirmed. Waiting for @${partner.username}.`);
    }
    reload();
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('Image must be under 8MB', 'error');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const send = async (e) => {
    e.preventDefault();
    const content = draft.trim();
    if ((!content && !imageFile) || !chatOpen || uploadingImage) return;

    let imageUrl = null;
    const currentFile = imageFile;
    const currentText = content;

    setDraft('');
    clearImage();

    try {
      if (currentFile) {
        setUploadingImage(true);
        imageUrl = await uploadChatImage(me, currentFile);
      }

      const msg = unwrap(
        await supabase
          .from('messages')
          .insert({
            trade_id: trade.id,
            sender_id: me,
            content: currentText || (imageUrl ? 'Sent a photo' : ''),
            image_url: imageUrl,
          })
          .select()
          .single(),
      );
      setMessages((list) => (list.some((m) => m.id === msg.id) ? list : [...list, msg]));

      // If partner is a live Liverpool bot, simulate typing and reply in real time
      if (partner?.is_bot) {
        setPartnerTyping(true);
        setTimeout(async () => {
          try {
            await supabase.rpc('bot_reply_to_trade', {
              p_trade_id: trade.id,
              p_user_message: currentText || (imageUrl ? 'photo' : ''),
            });
          } catch (botErr) {
            console.error('Bot reply error:', botErr);
          } finally {
            setPartnerTyping(false);
          }
        }, 1400);
      }
    } catch (err) {
      if (currentText) setDraft(currentText);
      showToast(errorMessage(err), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <div>
      <BackButton onClick={() => navigate('/trades')} />

      <div className="mt-2 grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* ---------------- Summary ---------------- */}
        <section className="space-y-4">
          <div className="card p-5">
            <div className="mb-4 flex items-center justify-between">
              <button type="button" onClick={() => navigate(`/profile/${partner.id}`)} className="flex items-center gap-2.5 text-left">
                <Avatar name={partner.username} size={38} />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-muted">Trading with</p>
                    {partner?.is_bot && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                        Live Liverpool Bot
                      </span>
                    )}
                  </div>
                  <p className="font-semibold hover:text-brand">@{partner.username}</p>
                  {partner?.location_name && (
                    <p className="text-[11px] text-muted">📍 {partner.location_name}</p>
                  )}
                </div>
              </button>
              <StatusBadge status={trade.status} />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <SwapItem label="You give" item={give} />
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white shadow-lift">
                <ArrowRightLeft size={16} />
              </span>
              <SwapItem label="You get" item={get} />
            </div>
          </div>

          <StatusPanel
            trade={trade}
            iAmInitiator={iAmInitiator}
            partner={partner}
            iConfirmed={iConfirmed}
            theyConfirmed={theyConfirmed}
            myScore={myScore}
            busy={busy}
            onAccept={accept}
            onAcceptBot={acceptBot}
            onDecline={decline}
            onCancel={cancel}
            onConfirm={confirm}
            onRate={() => setReviewOpen(true)}
          />
        </section>

        {/* ---------------- Chat ---------------- */}
        <section className="card flex h-[65dvh] min-h-[420px] flex-col overflow-hidden lg:h-[calc(100dvh-10rem)]">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <div>
              <h2 className="font-display font-semibold">Trade chat</h2>
              <p className="text-xs text-muted">Agree where, when and how to swap.</p>
            </div>
            {/* Notification and Audio Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="trade-toggle-sound-btn"
                onClick={handleToggleSound}
                className="btn-ghost rounded-xl p-2 text-muted transition hover:bg-canvas hover:text-ink"
                title={muted ? 'Notification chime muted (click to unmute)' : 'Notification chime enabled (click to mute)'}
                aria-label={muted ? 'Unmute chime' : 'Mute chime'}
              >
                {muted ? (
                  <VolumeX size={17} className="text-muted" />
                ) : (
                  <Volume2 size={17} className="text-brand" />
                )}
              </button>

              {notifPerm !== 'granted' && notifPerm !== 'unsupported' && (
                <button
                  type="button"
                  id="trade-enable-desktop-notif-btn"
                  onClick={handleEnableDesktopNotifs}
                  className="flex items-center gap-1.5 rounded-xl border border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition hover:border-brand/40 hover:text-brand"
                  title="Enable desktop notifications"
                >
                  <Bell size={13} className="text-brand" />
                  <span className="hidden sm:inline">Desktop alerts</span>
                </button>
              )}
            </div>
          </div>

          {/* Liverpool Swap Meetup Safety Tip */}
          {showSafetyTip && chatOpen && (
            <div className="flex items-center justify-between gap-3 border-b border-amber-200/60 bg-amber-50/80 px-4 py-2 text-xs text-amber-900">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="shrink-0 text-amber-600" />
                <span>
                  <strong>Safe Swap Tip:</strong> Meet in a busy public place (e.g. Liverpool ONE, Baltic Triangle, or coffee shop) & inspect items before confirming.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSafetyTip(false)}
                className="rounded-lg p-0.5 text-amber-700/70 hover:bg-amber-100 hover:text-amber-950 transition"
                aria-label="Dismiss tip"
              >
                <X size={13} />
              </button>
            </div>
          )}

          <div className="flex-1 space-y-2 overflow-y-auto bg-canvas/60 px-4 py-4">
            {messages.length === 0 && (
              <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted">
                {chatOpen ? (
                  <>
                    <PartyPopper className="mb-2 text-brand" size={28} />
                    Offer accepted! Say hello to @{partner.username}.
                  </>
                ) : (
                  <>
                    <Lock className="mb-2" size={24} />
                    {trade.status === 'pending' ? 'The chat opens once the offer is accepted.' : 'No messages in this trade.'}
                  </>
                )}
              </div>
            )}
            {messages.map((m) => {
              const mine = m.sender_id === me;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                      mine ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md border border-line bg-white text-ink'
                    }`}
                  >
                    {m.image_url && (
                      <a
                        href={m.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mb-1.5 block overflow-hidden rounded-xl transition hover:opacity-95"
                      >
                        <img
                          src={m.image_url}
                          alt="Attachment"
                          className="max-h-60 w-full rounded-xl object-cover"
                          loading="lazy"
                        />
                      </a>
                    )}
                    {m.content && (!m.image_url || m.content !== 'Sent a photo') && (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                    <p className={`mt-0.5 text-[10px] ${mine ? 'text-white/60' : 'text-muted'}`}>{timeAgo(m.created_at)}</p>
                  </div>
                </motion.div>
              );
            })}
            {partnerTyping && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 py-1"
              >
                <Avatar name={partner.username} size={24} />
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2 text-xs text-muted shadow-xs">
                  <span className="font-medium text-ink-soft">@{partner.username} is typing</span>
                  <span className="flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {chatOpen && (
            <div className="flex flex-wrap items-center gap-1.5 border-t border-line/60 bg-canvas/40 px-3 py-2 text-xs">
              <span className="text-[11px] font-medium text-muted">Quick test:</span>
              <button
                type="button"
                onClick={() => setDraft('Where can we meet in Liverpool?')}
                className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft transition hover:border-brand hover:text-brand"
              >
                📍 Where can we meet?
              </button>
              <button
                type="button"
                onClick={() => setDraft('What condition is it in?')}
                className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft transition hover:border-brand hover:text-brand"
              >
                ✨ What condition?
              </button>
              <button
                type="button"
                onClick={() => setDraft('When are you free to swap?')}
                className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft transition hover:border-brand hover:text-brand"
              >
                🕒 When are you free?
              </button>
              <button
                type="button"
                onClick={() => setDraft('Sounds boss mate!')}
                className="rounded-full border border-line bg-white px-2.5 py-1 text-xs text-ink-soft transition hover:border-brand hover:text-brand"
              >
                🤝 Sounds boss mate!
              </button>
            </div>
          )}

          {imagePreview && (
            <div className="flex items-center justify-between border-t border-line/60 bg-canvas/60 px-4 py-2">
              <div className="flex items-center gap-2.5">
                <img src={imagePreview} alt="Preview" className="h-12 w-12 rounded-lg border border-line object-cover" />
                <div className="text-xs">
                  <p className="max-w-[200px] truncate font-medium text-ink">{imageFile?.name}</p>
                  <p className="text-[10px] text-muted">{uploadingImage ? 'Uploading photo...' : 'Photo attached'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={clearImage}
                disabled={uploadingImage}
                className="rounded-full p-1 text-muted hover:bg-white hover:text-bad"
                title="Remove photo"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <form onSubmit={send} className="flex items-center gap-2 border-t border-line bg-white p-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={!chatOpen || uploadingImage}
            />
            <button
              id="chat-attach-photo"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line text-ink-soft transition hover:border-brand hover:text-brand disabled:opacity-50"
              disabled={!chatOpen || uploadingImage}
              title="Attach a photo"
              aria-label="Attach photo"
            >
              <ImageIcon size={19} />
            </button>
            <input
              id="chat-input"
              className="field flex-1"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={chatOpen ? (imageFile ? 'Add a message or send photo…' : 'Write a message…') : 'Chat is closed'}
              disabled={!chatOpen || uploadingImage}
              maxLength={2000}
              autoComplete="off"
            />
            <button
              id="chat-send"
              type="submit"
              className="btn-primary px-3.5"
              disabled={!chatOpen || (!draft.trim() && !imageFile) || uploadingImage}
              aria-label="Send"
            >
              {uploadingImage ? <Spinner className="h-4 w-4 text-white" /> : <Send size={17} />}
            </button>
          </form>
        </section>
      </div>

      {trade.status === 'completed' && myScore === null && (
        <ReviewModal
          open={reviewOpen}
          onClose={() => setReviewOpen(false)}
          trade={trade}
          partner={partner}
          onDone={(score) => {
            setMyScore(score);
            setReviewOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SwapItem({ label, item }) {
  return (
    <button
      type="button"
      onClick={() => item?.id && navigate(`/item/${item.id}`)}
      className="group min-w-0 text-left"
      disabled={!item?.id}
    >
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <ItemImage
        src={item?.image_url}
        alt={item?.title || 'Item'}
        className="aspect-square w-full rounded-xl transition group-hover:opacity-90"
      />
      <p className="mt-1.5 truncate text-sm font-semibold">{item?.title || 'Item'}</p>
      <p className="text-xs text-muted">{item?.condition || ''}</p>
    </button>
  );
}

function StatusPanel({ trade, iAmInitiator, partner, iConfirmed, theyConfirmed, myScore, busy, onAccept, onAcceptBot, onDecline, onCancel, onConfirm, onRate }) {
  const box = 'card p-5';

  if (trade.status === 'pending') {
    return iAmInitiator ? (
      <div className={box}>
        <p className="flex items-center gap-2 font-semibold">
          <Clock size={18} className="text-brand" /> Waiting for @{partner.username}
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          {partner?.is_bot
            ? `@${partner.username} is a live Liverpool bot. Trigger auto-accept to open the chat.`
            : "You'll be able to chat as soon as they accept."}
        </p>
        {partner?.is_bot && (
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={onAcceptBot}
            disabled={busy}
          >
            ⚡ Auto-accept offer as @{partner.username}
          </button>
        )}
        <button id="trade-withdraw" type="button" className="btn-ghost mt-3 px-0 text-bad" onClick={onCancel} disabled={busy}>
          Withdraw offer
        </button>
      </div>
    ) : (
      <div className={box}>
        <p className="font-semibold">@{partner.username} wants to swap with you</p>
        <p className="mt-1 text-sm text-ink-soft">Accepting opens the chat and declines other offers on these items.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button id="trade-decline" type="button" className="btn-secondary" onClick={onDecline} disabled={busy}>
            <X size={16} /> Decline
          </button>
          <button id="trade-accept" type="button" className="btn-primary" onClick={onAccept} disabled={busy}>
            <Check size={16} /> Accept
          </button>
        </div>
      </div>
    );
  }

  if (trade.status === 'accepted') {
    return (
      <div className={box}>
        {iConfirmed ? (
          <>
            <p className="flex items-center gap-2 font-semibold">
              <Clock size={18} className="text-brand" /> Waiting for @{partner.username} to confirm
            </p>
            <p className="mt-1 text-sm text-ink-soft">The trade completes when you've both confirmed.</p>
          </>
        ) : (
          <>
            <p className="font-semibold">
              {theyConfirmed ? `@${partner.username} has confirmed the swap` : 'Swapped your items?'}
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              {theyConfirmed
                ? "Confirm once you've got your item to finish the trade."
                : "Once you've both handed over your items, confirm here."}
            </p>
            <button id="trade-confirm" type="button" className="btn-primary mt-4 w-full py-3" onClick={onConfirm} disabled={busy}>
              {busy ? <Spinner className="h-4 w-4 text-white" /> : <><CheckCircle2 size={17} /> We've swapped</>}
            </button>
          </>
        )}
        <button id="trade-cancel" type="button" className="btn-ghost mt-2 w-full text-xs text-bad" onClick={onCancel} disabled={busy}>
          Cancel trade
        </button>
      </div>
    );
  }

  if (trade.status === 'completed') {
    return (
      <div className={`${box} bg-linear-to-br from-ok-soft to-white`}>
        <p className="flex items-center gap-2 font-semibold text-ok">
          <PartyPopper size={18} /> Trade complete
        </p>
        {myScore ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
            You rated @{partner.username} <Stars value={myScore} />
          </p>
        ) : (
          <button id="trade-rate" type="button" className="btn-primary mt-4 w-full" onClick={onRate}>
            Rate @{partner.username}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={box}>
      <p className="flex items-center gap-2 font-semibold text-ink-soft">
        <XCircle size={18} /> {trade.status === 'declined' ? 'This offer was declined' : 'This trade was cancelled'}
      </p>
    </div>
  );
}
