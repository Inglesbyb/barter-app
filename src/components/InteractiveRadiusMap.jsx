import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function InteractiveRadiusMap({
  lat = 53.4082,
  lng = -2.9916,
  radiusKm = 15,
  locationName = 'Liverpool',
  onCenterChange,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const circleRef = useRef(null);
  const markerRef = useRef(null);

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current) return;

    // Avoid duplicate initialization
    if (!mapRef.current) {
      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 11,
        zoomControl: false,
        attributionControl: false,
      });

      // OpenStreetMap tiles (100% free, zero watermark, zero API key required)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      // Add top-right minimalist zoom control
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Custom pulsing center pin
      const pinIcon = L.divIcon({
        className: 'switchr-map-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; inset: 0; border-radius: 9999px; background-color: rgba(91, 61, 245, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 16px; height: 16px; border-radius: 9999px; background-color: #5b3df5; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.35);"></div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([lat, lng], {
        icon: pinIcon,
        draggable: Boolean(onCenterChange),
      }).addTo(map);

      if (onCenterChange) {
        marker.on('dragend', (e) => {
          const newPos = e.target.getLatLng();
          onCenterChange({ lat: newPos.lat, lng: newPos.lng });
        });
      }

      // Facebook Marketplace style coverage circle
      const initialRadius = (radiusKm || 15) * 1000;
      const circle = L.circle([lat, lng], {
        radius: initialRadius,
        color: '#5b3df5',
        fillColor: '#5b3df5',
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '5, 5',
      }).addTo(map);

      mapRef.current = map;
      markerRef.current = marker;
      circleRef.current = circle;

      // Invalidate size and fit bounds after modal transitions
      setTimeout(() => {
        map.invalidateSize();
        if (radiusKm != null) {
          map.fitBounds(circle.getBounds(), { padding: [25, 25], maxZoom: 14, animate: false });
        }
      }, 250);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update center position when lat/lng props change
  useEffect(() => {
    if (!mapRef.current || lat == null || lng == null) return;

    const newLatLng = [lat, lng];
    if (markerRef.current) {
      markerRef.current.setLatLng(newLatLng);
    }
    if (circleRef.current) {
      circleRef.current.setLatLng(newLatLng);
    }

    mapRef.current.setView(newLatLng, mapRef.current.getZoom(), { animate: true });

    if (circleRef.current && radiusKm != null) {
      mapRef.current.fitBounds(circleRef.current.getBounds(), {
        padding: [25, 25],
        maxZoom: 14,
        animate: true,
      });
    }
  }, [lat, lng, radiusKm]);

  // Update radius circle dynamically as user drags slider
  useEffect(() => {
    if (!circleRef.current || !mapRef.current) return;

    if (radiusKm == null) {
      circleRef.current.setStyle({ fillOpacity: 0, opacity: 0 });
    } else {
      const radiusMeters = radiusKm * 1000;
      circleRef.current.setStyle({ fillOpacity: 0.12, opacity: 1 });
      circleRef.current.setRadius(radiusMeters);

      // Smoothly adjust zoom to keep the entire coverage circle visible
      mapRef.current.fitBounds(circleRef.current.getBounds(), {
        padding: [25, 25],
        maxZoom: 14,
        animate: true,
      });
    }
  }, [radiusKm]);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-line shadow-inner bg-canvas">
      <div ref={containerRef} className="h-56 w-full" />
      {/* Floating map location tag */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-xl border border-line/80 bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-ink shadow-xs backdrop-blur-xs">
        <span className="h-2 w-2 rounded-full bg-brand" />
        <span className="truncate max-w-[180px]">{locationName}</span>
        <span className="text-muted">·</span>
        <span className="text-brand font-bold">
          {radiusKm != null ? `${radiusKm} km radius` : 'Any distance'}
        </span>
      </div>
    </div>
  );
}
