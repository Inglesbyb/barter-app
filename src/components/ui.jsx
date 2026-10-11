import { useState } from 'react';
import { Loader2, Star, ImageOff, AlertTriangle, ArrowLeft } from 'lucide-react';

export function Spinner({ className = '' }) {
  return <Loader2 className={`animate-spin text-brand ${className}`} size={22} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

const AVATAR_GRADIENTS = [
  'from-brand to-coral',
  'from-[#00b4d8] to-brand',
  'from-coral to-warn',
  'from-ok to-[#00b4d8]',
  'from-[#9b5de5] to-[#f15bb5]',
];

export function Avatar({ name = '?', size = 40, className = '' }) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  const gradient = AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-display font-bold uppercase text-white ${gradient} ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {name.charAt(0)}
    </div>
  );
}

export function Stars({ value = 0, size = 14, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          className={n <= Math.round(value) ? 'fill-warn text-warn' : 'fill-line text-line'}
        />
      ))}
    </span>
  );
}

export function RatingInline({ stats }) {
  if (!stats) return null;
  if (!stats.reviewCount) return <span className="text-xs text-muted">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-soft">
      <Star size={13} className="fill-warn text-warn" />
      {stats.avgRating?.toFixed(1)} <span className="text-muted">({stats.reviewCount})</span>
    </span>
  );
}

export function ItemImage({ src, alt, className = '' }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-linear-to-br from-brand-soft to-coral-soft ${className}`}>
        <ImageOff className="text-brand/40" size={28} />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}

const STATUS_STYLES = {
  available: 'bg-ok-soft text-ok',
  in_trade: 'bg-warn-soft text-warn',
  traded: 'bg-ink/5 text-ink-soft',
  pending: 'bg-brand-soft text-brand',
  accepted: 'bg-ok-soft text-ok',
  completed: 'bg-ink/5 text-ink-soft',
  declined: 'bg-bad-soft text-bad',
  cancelled: 'bg-ink/5 text-muted',
};

const STATUS_LABELS = {
  available: 'Available',
  in_trade: 'In a trade',
  traded: 'Traded',
  pending: 'Pending',
  accepted: 'In progress',
  completed: 'Completed',
  declined: 'Declined',
  cancelled: 'Cancelled',
};

export function StatusBadge({ status }) {
  return <span className={`badge ${STATUS_STYLES[status] ?? ''}`}>{STATUS_LABELS[status] ?? status}</span>;
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
        <Icon className="text-brand" size={26} />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-soft">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      <AlertTriangle className="text-bad" size={28} />
      <p className="text-sm text-ink-soft">{error?.message || 'Something went wrong.'}</p>
      {onRetry && (
        <button type="button" className="btn-secondary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function BackButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick ?? (() => window.history.back())}
      className="btn-ghost -ml-2 px-2"
      aria-label="Go back"
    >
      <ArrowLeft size={18} /> Back
    </button>
  );
}

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
