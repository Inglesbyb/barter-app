/**
 * Geolocation and Distance utilities for SwitchR
 */

export const RADIUS_PRESETS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: null, label: 'Any distance' },
];

export const POPULAR_LOCATIONS = [
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Manchester', lat: 53.4808, lng: -2.2426 },
  { name: 'Birmingham', lat: 52.4862, lng: -1.8904 },
  { name: 'Leeds', lat: 53.8008, lng: -1.5491 },
  { name: 'Glasgow', lat: 55.8642, lng: -4.2518 },
  { name: 'Edinburgh', lat: 55.9533, lng: -3.1883 },
  { name: 'Liverpool', lat: 53.4084, lng: -2.9916 },
  { name: 'Bristol', lat: 51.4545, lng: -2.5879 },
  { name: 'Newcastle', lat: 54.9783, lng: -1.6178 },
  { name: 'Sheffield', lat: 53.3811, lng: -1.4701 },
  { name: 'Cardiff', lat: 51.4816, lng: -3.1791 },
  { name: 'Belfast', lat: 54.5973, lng: -5.9301 },
  { name: 'Brighton', lat: 50.8225, lng: -0.1372 },
  { name: 'Aberdeen', lat: 57.1497, lng: -2.0943 },
];

/**
 * Calculates distance in kilometers between two lat/lng coordinates (Haversine formula).
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance in a human-friendly way:
 * e.g. "< 1 km", "3.2 km", "45 km"
 */
export function formatDistance(km) {
  if (km == null || isNaN(km)) return null;
  if (km < 1) return '< 1 km away';
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km)} km away`;
}

/**
 * Gets user's current GPS position via browser geolocation
 */
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        reject(err);
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  });
}

// In-memory geocode cache to avoid redundant network calls
const geocodeCache = new Map();

/**
 * Checks whether a string matches a UK full postcode or outward district code (outcode).
 */
export function isUkPostcode(input) {
  if (!input || typeof input !== 'string') return false;
  const clean = input.trim().replace(/\s+/g, '').toUpperCase();
  const isFull = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/i.test(clean);
  const isOut = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/i.test(clean) && /\d/.test(clean);
  return isFull || isOut;
}

/**
 * Extracts a postcode and clean search terms from a query string.
 * Supports:
 *  - Pure postcode: "SW1A 1AA", "M1"
 *  - Compound preposition: "drill in M1", "bike near SW1A 1AA", "sofa around BS1"
 *  - Trailing postcode: "mountain bike BS1 4DJ"
 */
export function extractPostcode(query) {
  if (!query || typeof query !== 'string') return null;
  const trimmed = query.trim();
  if (!trimmed) return null;

  // 1. Pure full postcode (e.g. "SW1A 1AA")
  const fullPure = /^([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})$/i.exec(trimmed);
  if (fullPure) {
    return {
      postcode: `${fullPure[1]} ${fullPure[2]}`.toUpperCase(),
      query: '',
      isPure: true,
    };
  }

  // 2. Pure outcode (e.g. "M1", "SW1A", "BS1", "EH1") - must have a digit to exclude words like "IN", "IS"
  const outPure = /^([A-Z]{1,2}[0-9][A-Z0-9]?)$/i.exec(trimmed);
  if (outPure && /\d/.test(outPure[1])) {
    return {
      postcode: outPure[1].toUpperCase(),
      query: '',
      isPure: true,
    };
  }

  // 3. Preposition phrase: e.g. "drill in M1", "bike near SW1A 1AA", "camera around BS1"
  const prepMatch = /(?:^|\s)(?:in|near|around|at)\s+([A-Z]{1,2}[0-9][A-Z0-9]?(?:\s*[0-9][A-Z]{2})?)\s*$/i.exec(trimmed);
  if (prepMatch && /\d/.test(prepMatch[1])) {
    const pc = prepMatch[1].trim().toUpperCase();
    const cleanQuery = trimmed.slice(0, prepMatch.index).trim();
    return {
      postcode: pc,
      query: cleanQuery,
      isPure: false,
    };
  }

  // 4. Trailing full postcode: "laptop SW1A 1AA"
  const fullTrail = /\b([A-Z]{1,2}[0-9][A-Z0-9]?)\s*([0-9][A-Z]{2})\b/i.exec(trimmed);
  if (fullTrail) {
    const pc = `${fullTrail[1]} ${fullTrail[2]}`.toUpperCase();
    const cleanQuery = trimmed.replace(fullTrail[0], '').replace(/\s+/g, ' ').trim();
    return {
      postcode: pc,
      query: cleanQuery,
      isPure: false,
    };
  }

  return null;
}

/**
 * Geocodes a UK postcode, outcode, or town name to (lat, lng).
 * Uses local presets first, then api.postcodes.io, and falls back to Google Geocoding if needed.
 */
export async function lookupLocationOrPostcode(input) {
  if (!input || typeof input !== 'string') return null;
  const raw = input.trim();
  if (raw.length < 2) return null;

  const cacheKey = raw.toLowerCase();
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey);
  }

  // 1. Match local popular UK cities immediately (0ms latency)
  const localMatch = POPULAR_LOCATIONS.find(
    (c) => c.name.toLowerCase() === raw.toLowerCase()
  );
  if (localMatch) {
    const res = {
      name: localMatch.name,
      shortName: localMatch.name,
      lat: localMatch.lat,
      lng: localMatch.lng,
      type: 'city',
    };
    geocodeCache.set(cacheKey, res);
    return res;
  }

  const clean = raw.replace(/\s+/g, '').toUpperCase();
  const isFull = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/i.test(clean);
  const isOut = /^[A-Z]{1,2}[0-9][A-Z0-9]?$/i.test(clean) && /\d/.test(clean);

  // 2. Query api.postcodes.io for full postcodes
  if (isFull) {
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.status === 200 && data.result) {
        const r = data.result;
        const district = r.admin_district || r.parish || r.region || 'UK';
        const formatted = {
          name: `${district} (${r.postcode})`,
          shortName: r.postcode,
          lat: r.latitude,
          lng: r.longitude,
          type: 'postcode',
        };
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    } catch {
      // Network error or fallback
    }
  }

  // 3. Query api.postcodes.io for outward codes (e.g. M1, SW1A, BS1)
  if (isOut) {
    try {
      const res = await fetch(`https://api.postcodes.io/outcodes/${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.status === 200 && data.result) {
        const r = data.result;
        const district = Array.isArray(r.admin_district)
          ? r.admin_district.join(', ')
          : r.admin_district || 'UK';
        const formatted = {
          name: `${district} (${clean})`,
          shortName: clean,
          lat: r.latitude,
          lng: r.longitude,
          type: 'outcode',
        };
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    } catch {
      // Network error or fallback
    }
  }

  // 4. Query api.postcodes.io places for UK town/city names
  try {
    const res = await fetch(`https://api.postcodes.io/places?q=${encodeURIComponent(raw)}`);
    const data = await res.json();
    if (data.status === 200 && Array.isArray(data.result) && data.result.length > 0) {
      const place = data.result[0];
      const area = place.county_unitary ? `, ${place.county_unitary}` : '';
      const formatted = {
        name: `${place.name_1}${area}`,
        shortName: place.name_1,
        lat: place.latitude,
        lng: place.longitude,
        type: 'place',
      };
      geocodeCache.set(cacheKey, formatted);
      return formatted;
    }
  } catch {
    // Network error or fallback
  }

  // 5. Fallback: Google Geocoding API if key is present
  const googleKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(raw)}&key=${googleKey}`;
      const res = await fetch(gUrl);
      const data = await res.json();
      if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
        const loc = data.results[0].geometry.location;
        const formatted = {
          name: data.results[0].formatted_address,
          shortName: raw,
          lat: loc.lat,
          lng: loc.lng,
          type: 'geocode',
        };
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    } catch {
      // Google geocode fallback failure
    }
  }

  return null;
}
