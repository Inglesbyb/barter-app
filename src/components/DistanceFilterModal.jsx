import { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass, Check, ArrowDownUp, Search, X, Sparkles } from 'lucide-react';
import Modal from './Modal';
import { Spinner } from './ui';
import { POPULAR_LOCATIONS, RADIUS_PRESETS, getCurrentPosition, lookupLocationOrPostcode } from '../lib/geo';

export default function DistanceFilterModal({
  open,
  onClose,
  userLocation,
  onChangeLocation,
  radius,
  onChangeRadius,
  sortBy,
  onChangeSortBy,
}) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState('');
  const [postcodeInput, setPostcodeInput] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupError, setLookupError] = useState('');

  // Clear transient search state when modal reopens
  useEffect(() => {
    if (open) {
      setGpsError('');
      setLookupError('');
      setLookupResult(null);
    }
  }, [open]);

  const handleLookup = async (override) => {
    const text = (override !== undefined ? override : postcodeInput).trim();
    if (!text || text.length < 2) return;
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);
    try {
      const result = await lookupLocationOrPostcode(text);
      if (result) {
        setLookupResult(result);
        onChangeLocation({
          name: result.name,
          lat: result.lat,
          lng: result.lng,
        });
      } else {
        setLookupError(`Could not find "${text}". Try a UK postcode (e.g. M1, SW1A 1AA, BS1) or city.`);
      }
    } catch {
      setLookupError('Error looking up location. Please try again.');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleUseGps = async () => {
    setGpsLoading(true);
    setGpsError('');
    setLookupError('');
    try {
      const coords = await getCurrentPosition();
      // Find closest known city or use Current Location
      let closestCity = 'My location';
      let minDist = Infinity;
      POPULAR_LOCATIONS.forEach((c) => {
        const d = Math.hypot(c.lat - coords.lat, c.lng - coords.lng);
        if (d < minDist) {
          minDist = d;
          closestCity = c.name;
        }
      });
      onChangeLocation({
        name: minDist < 0.2 ? closestCity : 'My Location',
        lat: coords.lat,
        lng: coords.lng,
      });
    } catch (err) {
      setGpsError(err.message || 'Could not fetch GPS location.');
    } finally {
      setGpsLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Location & Distance">
      <div className="space-y-5">
        {/* Current Location Box */}
        <div>
          <span className="label">Active search center</span>
          <div className="flex items-center justify-between rounded-2xl border border-line bg-canvas p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                <MapPin size={17} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">
                  {userLocation?.name || 'No location set'}
                </p>
                <p className="text-[11px] text-muted">
                  {userLocation?.lat != null
                    ? `${userLocation.lat.toFixed(3)}, ${userLocation.lng.toFixed(3)}`
                    : 'Set a location to filter and sort listings by distance'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="gps-location-btn"
              onClick={handleUseGps}
              disabled={gpsLoading}
              className="btn-secondary rounded-xl px-3 py-1.5 text-xs shrink-0"
            >
              {gpsLoading ? (
                <Spinner className="h-3.5 w-3.5" />
              ) : (
                <>
                  <Navigation size={13} className="text-brand" /> GPS
                </>
              )}
            </button>
          </div>
          {gpsError && <p className="mt-1.5 text-xs text-bad">{gpsError}</p>}
        </div>

        {/* Postcode & Town Search Input */}
        <div>
          <span className="label">Type a postcode or town</span>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup();
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
              <input
                id="modal-postcode-input"
                type="text"
                value={postcodeInput}
                onChange={(e) => {
                  setPostcodeInput(e.target.value);
                  setLookupError('');
                }}
                placeholder="e.g. M1, SW1A 1AA, BS1, Brighton…"
                className="field rounded-xl py-2 pl-9 pr-8 text-xs font-medium"
              />
              {postcodeInput && (
                <button
                  type="button"
                  onClick={() => {
                    setPostcodeInput('');
                    setLookupResult(null);
                    setLookupError('');
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                  aria-label="Clear postcode"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              type="submit"
              id="modal-postcode-btn"
              disabled={lookupLoading || !postcodeInput.trim()}
              className="btn-primary rounded-xl px-3.5 py-2 text-xs font-semibold shrink-0"
            >
              {lookupLoading ? <Spinner className="h-3.5 w-3.5" /> : 'Find'}
            </button>
          </form>

          {/* Inline Feedback */}
          {lookupResult && (
            <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 border border-emerald-200">
              <Sparkles size={13} className="text-emerald-600 shrink-0" />
              <span className="truncate">Set location to <strong>{lookupResult.name}</strong></span>
            </div>
          )}
          {lookupError && <p className="mt-1.5 text-xs text-bad">{lookupError}</p>}
        </div>

        {/* Quick Popular Cities */}
        <div>
          <span className="label">Or select a city</span>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto no-scrollbar">
            {POPULAR_LOCATIONS.map((loc) => {
              const active = userLocation?.name === loc.name;
              return (
                <button
                  key={loc.name}
                  type="button"
                  id={`city-pick-${loc.name.toLowerCase()}`}
                  onClick={() => onChangeLocation({ name: loc.name, lat: loc.lat, lng: loc.lng })}
                  className={`rounded-xl border px-2.5 py-1 text-xs font-medium transition ${
                    active
                      ? 'border-brand bg-brand text-white shadow-sm'
                      : 'border-line bg-white text-ink-soft hover:border-brand/40'
                  }`}
                >
                  {loc.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Radius Selector */}
        <div>
          <span className="label">Maximum distance</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {RADIUS_PRESETS.map((p) => {
              const active = radius === p.value;
              return (
                <button
                  key={p.label}
                  type="button"
                  id={`radius-${p.value ?? 'any'}`}
                  onClick={() => onChangeRadius(p.value)}
                  className={`flex flex-col items-center justify-center rounded-xl border py-2.5 text-xs font-semibold transition ${
                    active
                      ? 'border-brand bg-brand-soft text-brand shadow-sm ring-1 ring-brand'
                      : 'border-line bg-white text-ink-soft hover:border-brand/40'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sorting */}
        <div>
          <span className="label">Sort order</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              id="sort-closest"
              onClick={() => onChangeSortBy('closest')}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
                sortBy === 'closest'
                  ? 'border-brand bg-brand-soft text-brand ring-1 ring-brand'
                  : 'border-line bg-white text-ink-soft hover:border-brand/40'
              }`}
            >
              <Compass size={14} /> Closest first
            </button>
            <button
              type="button"
              id="sort-newest"
              onClick={() => onChangeSortBy('newest')}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition ${
                sortBy === 'newest'
                  ? 'border-brand bg-brand-soft text-brand ring-1 ring-brand'
                  : 'border-line bg-white text-ink-soft hover:border-brand/40'
              }`}
            >
              <ArrowDownUp size={14} /> Newest first
            </button>
          </div>
        </div>

        <button
          type="button"
          id="distance-modal-apply"
          onClick={onClose}
          className="btn-primary w-full py-3 text-sm"
        >
          <Check size={16} /> Apply distance filter
        </button>
      </div>
    </Modal>
  );
}
