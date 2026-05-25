import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, X, MapPin, Search, MessageCircle, PackageOpen, User, ChevronDown, RefreshCw } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { supabase } from './supabase';

// ── Extracted components (memoised) ──────────────────────────
import Card from './components/Card';
import ItemDetailSheet from './components/ItemDetailSheet';
import BiddingDrawer from './components/BiddingDrawer';
import IncomingOffersView from './components/IncomingOffersView';
import ProfileSettingsModal from './components/ProfileSettingsModal';
import ProfileView from './components/ProfileView';
import InfoView from './components/InfoView';
import InventoryView from './components/InventoryView';
import ChatView from './components/ChatView';
import AuthView from './components/AuthView';
import TermsModal from './components/TermsModal';
import ChainsView from './components/ChainsView';
import DiagnosticOverlay from './components/DiagnosticOverlay';
import ResetPasswordModal from './components/ResetPasswordModal';

// ── Utilities kept in App scope ──────────────────────────────
const googleMapsLibraries = ['places', 'geometry'];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Fisher-Yates shuffle
const shuffleArray = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ── Maximum cards rendered in the DOM at once ────────────────
const MAX_VISIBLE_CARDS = 3;

export default function App() {
  const [cards, setCards] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [currentView, setCurrentView] = useState('swipe');
  const [matchData, setMatchData] = useState(null);
  const [biddingOnItem, setBiddingOnItem] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [radius, setRadius] = useState(50);
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [isDiscoveryMode, setIsDiscoveryMode] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [isLocationPickerExpanded, setIsLocationPickerExpanded] = useState(false);
  const [showDiag, setShowDiag] = useState(false);
  const [detailItem, setDetailItem] = useState(null);
  const [pendingOfferCount, setPendingOfferCount] = useState(0);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

  // ── Stable callback refs (prevent child re-renders) ────────
  const removeCard = useCallback(async (id, direction) => {
    setCards(prev => prev.filter(card => card.id !== id));
    setLastAction({ id, direction });
    if (user) {
      await supabase.from('swipes').insert([{
        swiper_id: user.id,
        item_id: id,
        direction: direction
      }]);
    }
  }, [user]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView('swipe');
  }, []);

  // ── Deck slicing: only render top N cards ──────────────────
  const visibleCards = useMemo(
    () => cards.slice(0, MAX_VISIBLE_CARDS),
    [cards]
  );

  // ── Google Maps ────────────────────────────────────────────
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: googleMapsLibraries
  });

  // ── Auth + terms + geolocation ─────────────────────────────
  useEffect(() => {
    const controller = new AbortController();

    const checkTerms = async (userId) => {
      const { data, error } = await supabase.from('profiles').select('accepted_terms').eq('id', userId).maybeSingle();
      if (controller.signal.aborted) return;
      if (error) {
        console.warn('[TERMS CHECK] Could not load profile:', error.message);
        return;
      }
      if (data && data.accepted_terms === false) {
        setShowTermsModal(true);
        setHasAcceptedTerms(false);
      } else {
        setHasAcceptedTerms(true);
        setShowTermsModal(false);
      }
    };

    // ── Detect expired/invalid reset links from URL hash ──────
    const hash = window.location.hash;
    if (hash && hash.includes('error=access_denied')) {
      const params = new URLSearchParams(hash.replace('#', ''));
      const errorCode = params.get('error_code');
      if (errorCode === 'otp_expired') {
        setTimeout(() => showToast('That reset link has expired. Please request a new one.', 'error'), 500);
      } else {
        setTimeout(() => showToast('Invalid link. Please request a new password reset.', 'error'), 500);
      }
      // Clean the URL so the error hash doesn't persist
      window.history.replaceState(null, '', window.location.pathname);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (controller.signal.aborted) return;
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) checkTerms(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (controller.signal.aborted) return;
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setShowResetPasswordModal(true);
      }
      if (session?.user) checkTerms(session.user.id);
    });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (controller.signal.aborted) return;
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationName('Your Location (GPS)');
        },
        () => console.log("Location access denied")
      );
    }

    return () => {
      controller.abort();
      subscription.unsubscribe();
    };
  }, []);

  // ── Debounce search ────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Fetch items (with AbortController) ─────────────────────
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();

    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const { data: swipes, error: swipeError } = await supabase
          .from('swipes')
          .select('item_id')
          .eq('swiper_id', user.id);

        if (controller.signal.aborted) return;
        if (swipeError) console.warn("[DISCOVERY] swipes fetch error:", swipeError.message);

        const swipedIds = swipes?.map(s => s.item_id) || [];

        let query = supabase
          .from('items')
          .select(`*, profiles (*)`)
          .neq('user_id', user.id)
          .or('status.eq.active,status.is.null');

        if (swipedIds.length > 0) {
          query = query.not('id', 'in', `(${swipedIds.join(',')})`);
        }
        if (activeCategory !== 'All') query = query.eq('category', activeCategory);
        if (debouncedSearchQuery) {
          query = query.or(
            `title.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%,sub_category.ilike.%${debouncedSearchQuery}%`
          );
        }

        const { data, error: itemError } = await query.limit(100);
        if (controller.signal.aborted) return;
        if (itemError) throw itemError;

        setAllItems(data || []);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("[DISCOVERY] Critical:", err);
          showToast("Discovery error. Check database schema.", "error");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingItems(false);
      }
    };

    if (currentView === 'swipe') fetchItems();
    return () => controller.abort();
  }, [user, currentView, debouncedSearchQuery, activeCategory, radius, showToast]);

  // ── Distance filter + card assembly ────────────────────────
  useEffect(() => {
    if (allItems.length > 0) {
      const itemsWithDistance = allItems.map(item => {
        if (!userLocation || item.lat == null || item.lng == null) {
          return { ...item, calculatedDistance: null };
        }
        return { ...item, calculatedDistance: calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng) };
      });

      let filtered;
      if (userLocation) {
        const geoItems = itemsWithDistance.filter(i => i.calculatedDistance !== null);
        const withinRadius = geoItems.filter(i => i.calculatedDistance <= radius);

        if (withinRadius.length > 0) filtered = withinRadius;
        else if (geoItems.length > 0) filtered = geoItems;
        else filtered = itemsWithDistance;
      } else {
        filtered = itemsWithDistance;
      }

      setCards(isDiscoveryMode ? shuffleArray(filtered) : filtered);
    } else {
      setCards([]);
    }
  }, [allItems, radius, userLocation, isDiscoveryMode]);

  // ── Geocode helper ─────────────────────────────────────────
  const geocodeLocation = async (query) => {
    if (!query.trim() || !window.google) return;
    setIsGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      setIsGeocoding(false);
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        setUserLocation({ lat: loc.lat(), lng: loc.lng() });
        setLocationName(results[0].formatted_address);
        setLocationQuery('');
        showToast(`Location set: ${results[0].formatted_address}`, 'success');
      } else {
        showToast('Location not found.', 'error');
      }
    });
  };

  // ── Render gates ───────────────────────────────────────────
  if (authLoading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center"><div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <AuthView />;

  return (
    <div className="min-h-[100dvh] bg-black flex flex-col items-center font-sans overflow-hidden w-full relative">
      <div className="w-full max-w-md bg-white min-h-[100dvh] flex flex-col relative overflow-hidden shadow-2xl">
        <header className="w-full px-6 py-4 flex flex-col z-40 bg-white shadow-sm border-b border-gray-100 sticky top-0 transition-all duration-500">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('swipe')}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
                <Zap size={16} className="text-white fill-white" />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Switch<span className="text-cyan-500">R</span></h1>
            </div>
            
            <button 
              onClick={() => setIsLocationPickerExpanded(!isLocationPickerExpanded)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${isLocationPickerExpanded ? 'bg-cyan-50 border-cyan-200 text-cyan-600 shadow-sm' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
            >
              <MapPin size={14} className={isLocationPickerExpanded ? 'text-cyan-500' : 'text-gray-400'} />
              <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[100px]">
                {locationName ? locationName.split(',')[0] : 'Set Location'}
              </span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isLocationPickerExpanded ? 'rotate-180' : ''}`} />
            </button>
          </div>

          <AnimatePresence>
            {isLocationPickerExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-6 pb-2 space-y-4">
                  <div className="relative">
                    <input 
                      type="text" 
                      value={locationQuery}
                      onChange={e => setLocationQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && geocodeLocation(locationQuery)}
                      placeholder="Search city or zip code..." 
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
                    />
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>

                  {isLoaded && userLocation && (
                    <div className="rounded-[2rem] overflow-hidden border border-gray-100 shadow-inner bg-gray-50">
                      <GoogleMap
                        mapContainerStyle={{ width: '100%', height: '180px' }}
                        center={userLocation}
                        zoom={12}
                        options={{ 
                          disableDefaultUI: true,
                          styles: [
                            { featureType: "all", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                            { featureType: "all", elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] }
                          ]
                        }}
                      >
                        <Marker position={userLocation} />
                        <Circle 
                          center={userLocation} 
                          radius={radius * 1000} 
                          options={{ 
                            fillColor: '#06b6d4', 
                            fillOpacity: 0.05, 
                            strokeColor: '#06b6d4', 
                            strokeWeight: 1 
                          }} 
                        />
                      </GoogleMap>
                    </div>
                  )}

                  <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex-1 flex flex-col gap-2">
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Radius</span>
                          <span className="text-xs font-black text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-md">{radius}km</span>
                       </div>
                       <input 
                         type="range" 
                         min="5" 
                         max="100" 
                         step="5" 
                         value={radius} 
                         onChange={(e) => setRadius(Number(e.target.value))} 
                         className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                       />
                    </div>
                    <button 
                      onClick={() => setIsLocationPickerExpanded(false)}
                      className="bg-gray-900 text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        <main className="flex-1 w-full flex flex-col items-center relative min-h-0 bg-slate-50/50">
          <AnimatePresence mode="wait">
            {currentView === 'swipe' && (
              <motion.div key="swipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex flex-col relative">
                {/* ── Search bar + Discovery toggle ── */}
                <div className="absolute top-3 left-0 right-0 z-30 px-4 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setIsDiscoveryMode(false); }}
                        placeholder="Search anything..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-400 shadow-sm transition-all"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setIsDiscoveryMode(d => !d);
                        setSearchQuery('');
                        setActiveCategory('All');
                      }}
                      className={`flex items-center gap-1.5 px-3 py-2.5 rounded-full text-xs font-black uppercase tracking-widest border-2 transition-all shrink-0 ${
                        isDiscoveryMode
                          ? 'bg-violet-500 text-white border-violet-500 shadow-lg shadow-violet-500/30'
                          : 'bg-white text-gray-400 border-gray-200 hover:border-violet-300 hover:text-violet-500'
                      }`}
                    >
                      <Zap size={12} className={isDiscoveryMode ? 'fill-white' : ''} />
                      {isDiscoveryMode ? 'Random' : 'Discover'}
                    </button>
                  </div>

                  {/* Category chips */}
                  {!searchQuery && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pointer-events-auto pb-0.5">
                      {['All', 'Electronics', 'Fashion', 'Home', 'Hobbies', 'Appliances', 'Sports', 'Music'].map(cat => (
                        <button
                          key={cat}
                          onClick={() => { setActiveCategory(cat); setIsDiscoveryMode(false); }}
                          className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${
                            activeCategory === cat && !isDiscoveryMode
                              ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg shadow-cyan-500/20'
                              : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* ── Card stack (SLICED to top 3) ── */}
                <div className="flex-1 w-full relative flex items-center justify-center" style={{ minHeight: '500px' }}>
                  {loadingItems ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finding matches...</p>
                    </div>
                  ) : cards.length > 0 ? (
                    <div className="absolute inset-0">
                      <AnimatePresence>
                        {visibleCards.map((item, index) => (
                          <Card 
                            key={item.id} 
                            item={item} 
                            active={index === 0}
                            removeCard={removeCard}
                            onSwap={setBiddingOnItem}
                          />
                        )).reverse()}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-center p-12 z-0">
                      <div className="w-24 h-24 rounded-full bg-white shadow-xl flex items-center justify-center mb-6 relative">
                        <Zap size={40} className="text-gray-200 fill-gray-50" />
                        <div className="absolute inset-0 rounded-full border-2 border-dashed border-gray-100 animate-spin-slow" />
                      </div>
                      <h2 className="text-2xl font-black text-gray-900 mb-2">No more items!</h2>
                      <p className="text-sm text-gray-400 max-w-[200px] font-medium">Expand your radius or check back later for new matches.</p>
                      <button 
                        onClick={() => setRadius(100)}
                        className="mt-8 px-8 py-3.5 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                      >
                        Expand Radius
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
            {currentView === 'offers' && <motion.div key="offers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full flex flex-col"><IncomingOffersView user={user} showToast={showToast} setCurrentView={setCurrentView} setMatchData={setMatchData} /></motion.div>}
            {currentView === 'chains' && <motion.div key="chains" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full flex flex-col"><ChainsView user={user} showToast={showToast} /></motion.div>}
            {currentView === 'inventory' && <InventoryView key="inventory" user={user} showToast={showToast} onSignOut={handleSignOut} />}
            {currentView === 'chat' && <ChatView key="chat" user={user} matchData={matchData} setCurrentView={setCurrentView} showToast={showToast} />}
            {currentView === 'profile' && <ProfileView key="profile" user={user} onSignOut={handleSignOut} setCurrentView={setCurrentView} showToast={showToast} />}
            {currentView === 'info' && <InfoView key="info" onBack={() => setCurrentView('profile')} user={user} showToast={showToast} />}
          </AnimatePresence>
        </main>

        {(!['chat', 'info'].includes(currentView)) && (
          <nav 
            className="bg-white border-t border-gray-100 flex items-start justify-around px-2 z-50 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]"
            style={{ 
              height: 'auto',
              paddingTop: '16px',
              paddingBottom: 'max(32px, env(safe-area-inset-bottom, 32px))' 
            }}
          >
            <button onClick={() => setCurrentView('swipe')} className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'swipe' ? 'bg-cyan-50 text-cyan-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><Zap size={20} className={currentView === 'swipe' ? 'fill-cyan-600' : ''} /><span className="text-[9px] font-black uppercase tracking-tighter">Explore</span></button>
            <button onClick={() => setCurrentView('offers')} className={`relative flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'offers' ? 'bg-cyan-50 text-cyan-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><MessageCircle size={20} className={currentView === 'offers' ? 'fill-cyan-600' : ''} />{pendingOfferCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg animate-pulse">{pendingOfferCount > 9 ? '9+' : pendingOfferCount}</span>}<span className="text-[9px] font-black uppercase tracking-tighter">Offers</span></button>
            <button onClick={() => setCurrentView('chains')} className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'chains' ? 'bg-violet-50 text-violet-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><RefreshCw size={20} className={currentView === 'chains' ? 'text-violet-600' : ''} /><span className="text-[9px] font-black uppercase tracking-tighter">Chains</span></button>
            <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'inventory' ? 'bg-cyan-50 text-cyan-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><PackageOpen size={20} className={currentView === 'inventory' ? 'fill-cyan-600' : ''} /><span className="text-[9px] font-black uppercase tracking-tighter">Items</span></button>
            <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'profile' ? 'bg-cyan-50 text-cyan-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><User size={20} className={currentView === 'profile' ? 'fill-cyan-600' : ''} /><span className="text-[9px] font-black uppercase tracking-tighter">Profile</span></button>
          </nav>
        )}

        <AnimatePresence>
          {detailItem && <ItemDetailSheet item={detailItem} onClose={() => setDetailItem(null)} onSwap={setBiddingOnItem} />}
          {biddingOnItem && <BiddingDrawer user={user} targetItem={biddingOnItem} onClose={() => setBiddingOnItem(null)} showToast={showToast} />}
          {toast && (
            <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
              <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}`}>{toast.message}</div>
            </motion.div>
          )}
          {showTermsModal && <TermsModal onAccept={async () => { await supabase.from('profiles').update({ accepted_terms: true }).eq('id', user.id); setShowTermsModal(false); }} />}
          {showResetPasswordModal && <ResetPasswordModal onClose={() => setShowResetPasswordModal(false)} showToast={showToast} />}
          {showDiag && <DiagnosticOverlay onClose={() => setShowDiag(false)} />}
        </AnimatePresence>

        {/* Dev-only diagnostic trigger button */}
        {isDev && (
          <button
            onClick={() => setShowDiag(d => !d)}
            className="fixed bottom-32 right-4 z-[998] w-10 h-10 bg-violet-600 rounded-full shadow-xl flex items-center justify-center text-white hover:bg-violet-700 transition-all active:scale-95"
            title="Chain Engine Diagnostic"
          >
            <span className="text-sm font-black">🔬</span>
          </button>
        )}
      </div>
    </div>
  );
}
