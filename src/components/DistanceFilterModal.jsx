import { useState, useEffect } from 'react';
import { MapPin, Navigation, Compass, Check, ArrowDownUp, Search, X, Sparkles, Sliders } from 'lucide-react';
import Modal from './Modal';
import { Spinner } from './ui';
import InteractiveRadiusMap from './InteractiveRadiusMap';
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

  // Default coordinates to Liverpool center if not set
  const currentLat = userLocation?.lat ?? 53.4082;
  const currentLng = userLocation?.lng ?? -2.9916;
  const currentLocationName = userLocation?.name || 'Liverpool, UK';

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
        setLookupError(`Could not find "${text}". Try a UK postcode (e.g. L1, M1, SW1A 1AA) or city.`);
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

  // Convert distance for helper label
  const milesDisplay = radius != null ? Math.round(radius * 0.621371) : null;

  return (
    <Modal open={open} onClose={onClose} title="Location & Radius">
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        
        {/* 1. Location Input & GPS Trigger */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-ink">Search location</span>
            <button
              type="button"
              id="gps-location-btn"
              onClick={handleUseGps}
              disabled={gpsLoading}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
            >
              <Navigation size={12} className="text-brand" />
              {gpsLoading ? 'Locating...' : 'Use current location'}
            </button>
          </div>

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
                placeholder="Type a postcode or city (e.g. L1, M1 1AE, Liverpool, Chester)…"
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
                  aria-label="Clear input"
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
              {lookupLoading ? <Spinner className="h-3.5 w-3.5" /> : 'Set'}
            </button>
          </form>

          {lookupResult && (
            <div className="mt-2 flex items-center gap-1.5 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-800 border border-emerald-200">
              <Sparkles size={13} className="text-emerald-600 shrink-0" />
              <span className="truncate">Centered on <strong>{lookupResult.name}</strong></span>
            </div>
          )}
          {lookupError && <p className="mt-1.5 text-xs text-bad">{lookupError}</p>}
          {gpsError && <p className="mt-1.5 text-xs text-bad">{gpsError}</p>}
        </div>

        {/* Quick Popular Cities */}
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_LOCATIONS.slice(0, 6).map((loc) => {
            const active = userLocation?.name?.toLowerCase().includes(loc.name.toLowerCase());
            return (
              <button
                key={loc.name}
                type="button"
                id={`city-pick-${loc.name.toLowerCase()}`}
                onClick={() => onChangeLocation({ name: loc.name, lat: loc.lat, lng: loc.lng })}
                className={`rounded-xl border px-2.5 py-1 text-[11px] font-medium transition ${
                  active
                    ? 'border-brand bg-brand-soft text-brand font-semibold ring-1 ring-brand/30'
                    : 'border-line bg-white text-ink-soft hover:border-brand/40'
                }`}
              >
                {loc.name}
              </button>
            );
          })}
        </div>

        {/* 2. Interactive Map with Real-Time Radius Circle (Facebook Marketplace Style) */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-ink">Search zone preview</span>
            <span className="text-[11px] text-muted flex items-center gap-1">
              <MapPin size={11} className="text-brand" /> {currentLocationName}
            </span>
          </div>

          <InteractiveRadiusMap
            lat={currentLat}
            lng={currentLng}
            radiusKm={radius}
            locationName={currentLocationName}
            onCenterChange={({ lat, lng }) => {
              onChangeLocation({
                name: userLocation?.name || 'Selected point',
                lat,
                lng,
              });
            }}
          />
        </div>

        {/* 3. Facebook Marketplace Sliding Scale */}
        <div className="rounded-2xl border border-line bg-canvas p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sliders size={14} className="text-brand" />
              <span className="text-xs font-semibold text-ink">Search distance</span>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center rounded-lg bg-brand-soft px-2.5 py-0.5 text-xs font-bold text-brand shadow-xs">
                {radius != null ? `${radius} km` : 'All UK (Any distance)'}
              </span>
              {radius != null && (
                <span className="block text-[10px] text-muted">
                  ~{milesDisplay} miles radius
                </span>
              )}
            </div>
          </div>

          {/* Continuous Range Slider */}
          <div className="space-y-1">
            <input
              type="range"
              id="distance-range-slider"
              min="1"
              max="100"
              step="1"
              value={radius ?? 100}
              onChange={(e) => {
                const val = Number(e.target.value);
                onChangeRadius(val >= 100 ? null : val);
              }}
              className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-line accent-brand"
              aria-label="Distance radius slider"
            />
            <div className="flex justify-between text-[10px] font-medium text-muted px-0.5">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
              <span>75 km</span>
              <span>100+ km</span>
            </div>
          </div>

          {/* Quick Snap Preset Chips */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {RADIUS_PRESETS.map((p) => {
              const active = radius === p.value;
              return (
                <button
                  key={p.label}
                  type="button"
                  id={`radius-${p.value ?? 'any'}`}
                  onClick={() => onChangeRadius(p.value)}
                  className={`flex-1 min-w-[50px] rounded-xl border py-1.5 text-[11px] font-semibold transition text-center ${
                    active
                      ? 'border-brand bg-brand text-white shadow-xs'
                      : 'border-line bg-white text-ink-soft hover:border-brand/40'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Sort Order */}
        {onChangeSortBy && (
          <div>
            <span className="text-xs font-semibold text-ink mb-1.5 block">Sort order</span>
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
        )}

        {/* 5. Apply Button */}
        <button
          type="button"
          id="distance-modal-apply"
          onClick={onClose}
          className="btn-primary w-full py-3 text-xs font-semibold shadow-lift"
        >
          <Check size={16} /> Apply distance filter ({radius != null ? `${radius} km of ${currentLocationName}` : 'All UK'})
        </button>
      </div>
    </Modal>
  );
}
