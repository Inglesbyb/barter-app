import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, MapPin, Undo2, Zap, Upload, PackageOpen, MessageCircle, ArrowLeft, Send, Search, Trash2, Edit2, Star, Tag, BadgeCheck, CheckCircle2, ChevronDown, Settings, HelpCircle, LogOut, ChevronRight, Shield, Users, User, Leaf, RefreshCw, Link2 } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { supabase } from './supabase';
import { TAXONOMY, CATEGORY_FALLBACK_CO2, searchTaxonomy } from './taxonomy';

// getCO2 uses the imported taxonomy
const getCO2 = (category, subCategory) => {
  const entry = TAXONOMY.find(t => t.category === category && t.label === subCategory);
  if (entry) return entry.co2;
  return CATEGORY_FALLBACK_CO2[category] || null;
};

// Quick-select chips
const QUICK_CHIPS = [
  { label: 'Smartphone',     category: 'Electronics', co2: 70  },
  { label: 'Laptop',         category: 'Electronics', co2: 340 },
  { label: 'Sneakers',       category: 'Fashion',     co2: 14  },
  { label: 'Road Bike',      category: 'Sports',      co2: 190 },
  { label: 'Ergonomic Chair',category: 'Home',        co2: 120 },
];

const mapContainerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '16px'
};

const googleMapsLibraries = ['places', 'geometry'];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
};

const Card = ({ item, active, removeCard, onSwap }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const heartScale = useTransform(x, [0, 150], [0, 1.2]);
  const xIconScale = useTransform(x, [0, -150], [0, 1.2]);

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 120) {
      removeCard(item.id, 'right');
      onSwap(item);
    } else if (info.offset.x < -120) {
      removeCard(item.id, 'left');
    }
  };

  return (
    <motion.div
      style={{ x, rotate, opacity, zIndex: active ? 10 : 0 }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.9, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ 
        x: x.get() === 0 ? 0 : (x.get() < 0 ? -600 : 600), 
        opacity: 0, 
        scale: 0.5, 
        rotate: x.get() < 0 ? -45 : 45,
        transition: { duration: 0.4, ease: "easeOut" } 
      }}
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing swipe-card-container px-4 py-6"
    >
      <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 bg-white">
        <img src={item.image_url} className="w-full h-full object-cover select-none pointer-events-none" alt={item.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent pointer-events-none" />
        
        {/* Indicators */}
        <motion.div style={{ scale: heartScale }} className="absolute top-10 right-10 z-20 bg-cyan-500 p-4 rounded-full text-white shadow-xl pointer-events-none">
           <Zap size={40} className="fill-white" />
        </motion.div>
        <motion.div style={{ scale: xIconScale }} className="absolute top-10 left-10 z-20 bg-rose-500 p-4 rounded-full text-white shadow-xl pointer-events-none">
           <X size={40} strokeWidth={3} />
        </motion.div>

        <div className="absolute bottom-10 left-8 right-8 text-white z-10 pointer-events-none">
          <div className="flex items-center gap-2 mb-3">
             <span className="bg-cyan-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                {item.category}
             </span>
             <span className="bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
                {item.condition}
             </span>
             {item.co2_saved_kg && (
               <span className="bg-emerald-500/80 backdrop-blur-md text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-emerald-400/30">
                 <Leaf size={9} className="fill-white" />~{item.co2_saved_kg}kg CO₂
               </span>
             )}
          </div>
          <h2 className="text-3xl font-black mb-1 tracking-tight leading-none drop-shadow-2xl">{item.title}</h2>
          <p className="text-xs text-gray-300 font-medium line-clamp-2 mb-6 opacity-90">{item.description}</p>
          
          <div className="flex items-center justify-between mt-auto">
             <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <MapPin size={14} className="text-cyan-400" />
                <span className="text-sm font-bold">{item.calculatedDistance?.toFixed(1) || '?'} km</span>
             </div>
             <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-xl">
                <img src={item.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user_id}`} alt="avatar" />
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const BiddingDrawer = ({ user, targetItem, onClose, showToast }) => {
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyItems = async () => {
      const { data } = await supabase.from('items').select('*').eq('user_id', user.id).eq('status', 'active');
      setMyItems(data || []);
      setLoading(false);
    };
    fetchMyItems();
  }, [user]);

  const placeBid = async (offeredItem) => {
    const { error } = await supabase.from('bids').insert([{
      bidder_id: user.id,
      receiver_id: targetItem.user_id,
      item_offered_id: offeredItem.id,
      item_wanted_id: targetItem.id,
      status: 'pending'
    }]);

    if (error) {
      showToast("Error placing bid.", "error");
    } else {
      showToast("Offer Sent! 🚀 Wait for them to accept.", "success");
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <motion.div 
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        className="w-full max-w-md bg-white rounded-t-[2.5rem] p-8 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-8 shrink-0" />
        <div className="mb-6">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Make an Offer</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">Select one of your items to trade for <span className="text-cyan-600 font-bold">{targetItem.title}</span></p>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="grid grid-cols-2 gap-4 pb-6">
              {myItems.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => placeBid(item)} 
                  className="group cursor-pointer bg-gray-50 border-2 border-transparent rounded-2xl overflow-hidden hover:border-cyan-500 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Zap size={24} className="text-white fill-white" />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-gray-900 truncate leading-none">{item.title}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{item.category}</p>
                  </div>
                </div>
              ))}
              <div 
                onClick={() => onClose()}
                className="aspect-square border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-cyan-500 hover:border-cyan-500 hover:bg-cyan-50 transition-all"
              >
                <Upload size={24} className="mb-2" />
                <span className="text-xs font-bold">New Item</span>
              </div>
            </div>
          </div>
        )}
        {myItems.length === 0 && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <PackageOpen size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-500 font-bold">Nothing to offer!</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">You need to list an item in your inventory before you can bid.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

const IncomingOffersView = ({ user, showToast, setCurrentView, setMatchData }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = async () => {
    const { data } = await supabase
      .from('bids')
      .select(`
        *,
        bidder:bidder_id(username, avatar_url),
        item_offered:item_offered_id(*),
        item_wanted:item_wanted_id(*)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setOffers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOffers();
  }, [user]);

  const handleAccept = async (offer) => {
    const { error } = await supabase.from('bids').update({ status: 'accepted' }).eq('id', offer.id);
    if (!error) {
      showToast("Offer Accepted! 🎉", "success");
      setMatchData({ 
        user_id: offer.bidder_id, 
        title: offer.item_wanted.title,
        profiles: offer.bidder
      });
      setCurrentView('chat');
    }
  };

  const handleDecline = async (offerId) => {
    await supabase.from('bids').update({ status: 'declined' }).eq('id', offerId);
    showToast("Offer declined", "error");
    fetchOffers();
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 scroll-container safe-area-bottom pb-32">
      <div className="px-6 py-6 border-b bg-white sticky top-0 z-10">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Incoming Offers</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pending approval</p>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-10">
          {offers.map(offer => (
            <div key={offer.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-gray-100 overflow-hidden shrink-0">
                  <img src={offer.bidder.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold block leading-none mb-1">OFFER FROM</span>
                  <span className="font-black text-gray-900">{offer.bidder.username}</span>
                </div>
              </div>

              <div className="bg-cyan-50/50 rounded-2xl p-4 flex flex-col gap-2 border border-cyan-100">
                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">FOR YOUR ITEM</p>
                <div className="flex items-center gap-3">
                  <img src={offer.item_wanted.image_url} className="w-12 h-12 rounded-lg object-cover border border-cyan-100 shadow-sm" alt="wanted" />
                  <p className="font-bold text-gray-800">{offer.item_wanted.title}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OFFERING THEIR</p>
                <div className="flex items-center gap-3">
                  <img src={offer.item_offered.image_url} className="w-20 h-20 rounded-xl object-cover border border-white shadow-sm" alt="offered" />
                  <div className="flex-1">
                    <p className="font-black text-gray-900 text-lg leading-tight">{offer.item_offered.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{offer.item_offered.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => handleAccept(offer)} 
                  className="flex-1 py-3.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-2xl font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleDecline(offer.id)}
                  className="flex-1 py-3.5 bg-white text-gray-400 border border-gray-200 rounded-2xl font-black hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 active:scale-95 transition-all"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
          {offers.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-50">
              <Zap size={64} className="text-gray-200 mb-6" />
              <p className="text-gray-900 font-black text-xl">No offers yet</p>
              <p className="text-sm text-gray-500 mt-2 max-w-[200px]">Keep your items active in the reel to attract potential traders!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ProfileView = ({ user, onSignOut, setCurrentView }) => {
  const [profile, setProfile]     = useState(null);
  const [items, setItems]         = useState([]);
  const [reviews, setReviews]     = useState([]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: p }, { data: it }, { data: rv }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('reviews').select('*, reviewer:reviewer_id(username, avatar_url)').eq('profile_id', user.id).order('created_at', { ascending: false }),
      ]);
      setProfile(p);
      setItems(it || []);
      setReviews(rv || []);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-stone-50">
      <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const username      = profile?.username || user?.email?.split('@')[0] || 'Trader';
  const avatarUrl     = profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
  const memberSince   = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : 'Recently';
  const vLevel        = profile?.verification_level || 0;
  const co2           = Number(profile?.total_carbon_saved || 0).toFixed(1);
  const swaps         = profile?.trades_completed || 0;
  const activeItems   = items.filter(i => i.status === 'active');
  const wishlist      = profile?.wishlist_items || [];
  const avgRating     = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : (profile?.rating ? Number(profile.rating).toFixed(1) : '—');

  const TABS = [
    { id: 'inventory', label: `Items (${activeItems.length})` },
    { id: 'wishlist',  label: `Wishlist (${wishlist.length})` },
    { id: 'reviews',   label: `Reviews (${reviews.length})` },
  ];

  const StarRow = ({ n }) => (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} className={i <= n ? 'fill-amber-400 text-amber-400' : 'text-stone-200 fill-stone-200'} />
      ))}
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col bg-stone-50 scroll-container safe-area-bottom pb-32 overflow-y-auto">

      {/* ── Hero Banner ───────────────────────────────── */}
      <div className="relative w-full">
        {/* Header image / gradient */}
        <div className="w-full h-36 bg-gradient-to-br from-stone-800 via-stone-700 to-cyan-900 relative overflow-hidden">
          {profile?.header_url && (
            <img src={profile.header_url} className="w-full h-full object-cover opacity-60" alt="header" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          <button
            onClick={() => setCurrentView('info')}
            className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Overlapping avatar */}
        <div className="px-6 pb-4">
          <div className="flex items-end justify-between -mt-14 mb-3">
            <div className="relative">
              <div className="w-28 h-28 rounded-full border-4 border-stone-50 shadow-2xl overflow-hidden bg-stone-200">
                <img src={avatarUrl} className="w-full h-full object-cover" alt={username} />
              </div>
              {vLevel >= 1 && (
                <div className="absolute bottom-1 right-1 w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center border-2 border-stone-50 shadow-md">
                  <BadgeCheck size={14} className="text-white fill-white" />
                </div>
              )}
            </div>
            <button
              onClick={onSignOut}
              className="mb-1 flex items-center gap-1.5 px-3 py-2 bg-white border border-stone-200 rounded-xl text-xs font-black text-stone-500 hover:border-rose-300 hover:text-rose-500 transition-all"
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>

          {/* Name + meta */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-black text-stone-900 tracking-tight leading-none">{username}</h2>
                {vLevel >= 1 && <BadgeCheck size={18} className="text-cyan-500 fill-cyan-500 shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                  <Star size={9} className="fill-amber-500" /> {avgRating}
                </span>
                {profile?.location_name && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-stone-500">
                    <MapPin size={9} /> {profile.location_name}
                  </span>
                )}
                <span className="text-[10px] text-stone-400 font-medium">Member since {memberSince}</span>
              </div>
            </div>
          </div>

          {/* Bio */}
          <p className="mt-3 text-sm text-stone-600 font-medium leading-relaxed">
            {profile?.bio || 'No bio yet — tap Settings to tell the community what you trade.'}
          </p>
        </div>
      </div>

      {/* ── Stats strip ───────────────────────────────── */}
      <div className="mx-4 grid grid-cols-3 gap-3 mb-4">
        {[
          { val: swaps,            label: 'Swaps' },
          { val: activeItems.length, label: 'Listed' },
          { val: avgRating,        label: 'Rating' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-stone-100 rounded-2xl p-4 flex flex-col items-center shadow-sm">
            <span className="text-2xl font-black text-stone-900 tracking-tighter leading-none">{s.val}</span>
            <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] mt-1">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── Eco-Impact card ───────────────────────────── */}
      <div className="mx-4 mb-4 bg-stone-900 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Leaf size={22} className="text-emerald-400 fill-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-0.5">🌿 Green Impact</p>
          <p className="text-2xl font-black text-white leading-none">{co2}<span className="text-base text-stone-400 font-bold ml-1">kg CO₂</span></p>
          <p className="text-[10px] text-stone-500 font-medium mt-0.5">saved vs buying new across {swaps} swaps</p>
        </div>
      </div>

      {/* ── Trust Score ───────────────────────────────── */}
      <div className="mx-4 mb-4 bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Trust Score</p>
        <div className="space-y-2.5">
          {[
            { label: 'Email Verified',  done: vLevel >= 1, icon: <CheckCircle2 size={14} /> },
            { label: 'Phone Verified',  done: vLevel >= 2, icon: <CheckCircle2 size={14} /> },
            { label: 'ID Verified',     done: vLevel >= 3, icon: <CheckCircle2 size={14} /> },
          ].map(t => (
            <div key={t.label} className="flex items-center gap-3">
              <span className={`shrink-0 ${t.done ? 'text-emerald-500' : 'text-stone-200'}`}>{t.icon}</span>
              <span className={`text-sm font-bold ${t.done ? 'text-stone-800' : 'text-stone-400 line-through'}`}>{t.label}</span>
              {t.done && <span className="ml-auto text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Done</span>}
            </div>
          ))}
        </div>
        {profile?.avg_response_time && profile.avg_response_time !== 'Unknown' && (
          <p className="text-[10px] text-stone-400 font-medium mt-3 pt-3 border-t border-stone-100">
            ⚡ Avg response time: <span className="font-black text-stone-600">{profile.avg_response_time}</span>
          </p>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────── */}
      <div className="mx-4 mb-3 flex gap-1 bg-stone-100 p-1 rounded-2xl">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === t.id ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ───────────────────────────────── */}
      <div className="px-4 pb-4">

        {/* Inventory */}
        {activeTab === 'inventory' && (
          activeItems.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <PackageOpen size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-black text-sm">No active listings</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activeItems.map(item => (
                <div key={item.id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden shadow-sm">
                  <div className="aspect-square overflow-hidden bg-stone-100">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-3">
                    <p className="font-black text-stone-900 text-xs truncate leading-tight">{item.title}</p>
                    <p className="text-[10px] text-stone-400 font-bold mt-0.5">{item.condition}</p>
                    {item.co2_saved_kg && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                        <Leaf size={8} className="fill-emerald-600" />~{item.co2_saved_kg}kg
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Wishlist */}
        {activeTab === 'wishlist' && (
          wishlist.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Tag size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-black text-sm">No wishlist items yet</p>
              <p className="text-xs mt-1 opacity-60">Items you're looking to trade for will appear here</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {wishlist.map((w, i) => (
                <div key={i} className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm flex flex-col items-center text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center">
                    <Search size={16} className="text-cyan-500" />
                  </div>
                  <p className="font-black text-stone-800 text-xs">{w.label || w}</p>
                </div>
              ))}
            </div>
          )
        )}

        {/* Reviews */}
        {activeTab === 'reviews' && (
          reviews.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Star size={36} className="mx-auto mb-3 opacity-30" />
              <p className="font-black text-sm">No reviews yet</p>
              <p className="text-xs mt-1 opacity-60">Complete swaps to earn your first review</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map(r => (
                <div key={r.id} className="bg-white rounded-2xl border border-stone-100 p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <img
                      src={r.reviewer?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.reviewer_id}`}
                      className="w-8 h-8 rounded-full border border-stone-100"
                      alt=""
                    />
                    <div className="flex-1">
                      <p className="font-black text-stone-900 text-xs leading-none">{r.reviewer?.username || 'Trader'}</p>
                      <StarRow n={r.rating} />
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  {r.comment && <p className="text-xs text-stone-600 font-medium leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Footer actions ────────────────────────────── */}
      <div className="px-4 pb-6 space-y-3 mt-2">
        <button onClick={() => setCurrentView('info')} className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-stone-100 shadow-sm hover:border-cyan-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-500 flex items-center justify-center"><HelpCircle size={20} /></div>
            <div className="text-left">
              <span className="font-black text-stone-900 text-sm block">Information Hub</span>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Help & Guidelines</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-stone-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
        </button>
      </div>
    </div>
  );
};


const InfoView = ({ onBack }) => {
  const [expanded, setExpanded] = useState('swap');

  const sections = [
    {
      id: 'swap',
      title: 'How to Swap',
      icon: <Zap size={20} />,
      content: '1. Browse items in the Explore feed.\n2. Swipe right to make an offer.\n3. Select one of your items to bid.\n4. If they accept, the chat unlocks!'
    },
    {
      id: 'safety',
      title: 'Safety Tips',
      icon: <Shield size={20} />,
      content: '• Meet in public, well-lit places.\n• Bring a friend if possible.\n• Inspect items thoroughly before trading.\n• Never share personal financial details.'
    },
    {
      id: 'guidelines',
      title: 'Community Guidelines',
      icon: <Users size={20} />,
      content: '• Be respectful and honest.\n• No illegal or prohibited items.\n• Honor your accepted trades.\n• Keep communication within the app.'
    }
  ];

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 scroll-container safe-area-bottom pb-32">
      <div className="px-6 py-8 flex items-center gap-4 bg-white border-b border-gray-100 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Information Hub</h2>
      </div>

      <div className="p-6 space-y-5">
        {sections.map(s => (
          <div key={s.id} className="border border-gray-100 rounded-[2.5rem] overflow-hidden bg-white shadow-sm transition-all hover:shadow-md">
            <button 
              onClick={() => setExpanded(expanded === s.id ? '' : s.id)}
              className="w-full flex items-center justify-between p-7 bg-white"
            >
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-cyan-500 flex items-center justify-center">{s.icon}</div>
                <span className="font-black text-gray-900 tracking-tight text-lg">{s.title}</span>
              </div>
              <ChevronDown size={22} className={`text-gray-300 transition-transform duration-500 ${expanded === s.id ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {expanded === s.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="p-8 pt-0 text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-line border-t border-gray-50 bg-slate-50/50">
                    {s.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
      
      <div className="p-6 text-center">
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">SwitchR v1.0.4</p>
      </div>
    </div>
  );
};

const InventoryView = ({ user, showToast, onSignOut }) => {
  const [title, setTitle] = useState('');
  const [condition, setCondition] = useState('Brand New');
  // Taxonomy search state
  const [taxSearch, setTaxSearch] = useState('');       // what user types
  const [taxResults, setTaxResults] = useState([]);     // filtered suggestions
  const [selectedTax, setSelectedTax] = useState(null); // locked selection { label, category, co2 }
  const [taxOpen, setTaxOpen] = useState(false);
  const taxRef = React.useRef(null);

  // Derived values written to DB
  const category    = selectedTax?.category || 'Other';
  const subCategory = selectedTax?.label    || '';
  const ecoImpactKg = selectedTax?.co2      || null;

  const [estimatedValue, setEstimatedValue] = useState('');
  const [description, setDescription] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);
  const myItemsRef = React.useRef(null);
  const [lookingFor, setLookingFor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [myItems, setMyItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editingItemId, setEditingItemId] = useState(null);

  // Fuzzy search using taxonomy.js searchTaxonomy function
  useEffect(() => {
    if (!taxSearch.trim()) { setTaxResults([]); return; }
    setTaxResults(searchTaxonomy(taxSearch, 8));
  }, [taxSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (taxRef.current && !taxRef.current.contains(e.target)) setTaxOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectTaxItem = (item) => {
    setSelectedTax(item);
    setTaxSearch('');
    setTaxResults([]);
    setTaxOpen(false);
  };

  const handleEdit = (item) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setCondition(item.condition);
    // Restore taxonomy selection from stored fields
    const stored = TAXONOMY.find(t => t.label === item.sub_category && t.category === item.category);
    if (stored) { setSelectedTax(stored); } else if (item.category) {
      setSelectedTax({ label: item.sub_category || '', category: item.category, co2: item.co2_saved_kg || null });
    }
    setEstimatedValue(item.estimated_value || '');
    setDescription(item.description || '');
    setLookingFor(item.looking_for || '');
    setImagePreview(item.image_url);
    setImageFile(null);
    if (item.lat && item.lng) setLocation({ lat: item.lat, lng: item.lng });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchMyItems = async () => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMyItems(data);
    }
    setLoadingItems(false);
  };

  useEffect(() => {
    fetchMyItems();
  }, [user]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Auto-location failed", err)
      );
    }
  }, []);

  const handleGetLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLocating(false);
        },
        (err) => {
          console.error(err);
          showToast("Failed to get location. Enable location services.", 'error');
          setIsLocating(false);
        }
      );
    } else {
      showToast("Geolocation not supported.", 'error');
      setIsLocating(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            setImageFile(compressedFile);
            setImagePreview(URL.createObjectURL(compressedFile));
          }, 'image/jpeg', 0.8);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !user.id) return showToast('Authentication error.', 'error');
    if (!title) return showToast('Please enter a title', 'error');

    setIsSubmitting(true);

    try {
      // 1. Bulletproof Profile Check: Ensure a profile exists to satisfy the foreign key constraint
      const { data: profileCheck, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to avoid throwing a 406 error if zero rows are returned

      if (!profileCheck) {
        console.log("⚠️ Profile missing for user. Creating fallback profile...");
        const defaultUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'Trader';
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert([{ 
            id: user.id, 
            username: defaultUsername,
            avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
          }]);
        
        if (profileCreateError) {
          throw new Error("Foreign Key Resolution Failed: Could not create fallback profile - " + profileCreateError.message);
        }
        console.log("✅ Fallback profile created successfully.");
      }

      let image_url = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, imageFile);
          
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('item-images').getPublicUrl(fileName);
        image_url = publicUrlData.publicUrl;
      }

      const parsedEstimatedValue = estimatedValue ? estimatedValue.toString().replace(/[^0-9.]/g, '') : null;
      
      const itemData = {
        title, 
        condition, 
        category,
        sub_category: subCategory,
        estimated_value: parsedEstimatedValue, 
        description, 
        looking_for: lookingFor, 
        user_id: user.id, 
        image_url: image_url || imagePreview, 
        lat: location?.lat || null, 
        lng: location?.lng || null, 
        status: 'active',
        co2_saved_kg: getCO2(category, subCategory)
      };

      if (editingItemId) {
        const { error } = await supabase.from('items').update(itemData).eq('id', editingItemId);
        if (error) throw error;
        showToast('Item updated! ✨', 'success');
        setEditingItemId(null);
      } else {
        const { error } = await supabase.from('items').insert([itemData]);
        if (error) throw error;
        showToast('Item successfully posted! 🎉', 'success');
      }

      setTitle(''); setCondition('Brand New'); setSelectedTax(null); setTaxSearch(''); setEstimatedValue(''); setDescription(''); setLookingFor(''); setImageFile(null); setImagePreview(null); setEditingItemId(null);
      setPostSuccess(true);
      fetchMyItems();
      setTimeout(() => {
        myItemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPostSuccess(false);
      }, 400);
    } catch (error) {
      console.error("Item creation error:", error);
      showToast('Failed to add item: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      if (item.image_url) {
        const fileName = item.image_url.split('/').pop();
        await supabase.storage.from('item-images').remove([fileName]);
      }
      await supabase.from('items').delete().eq('id', item.id).eq('user_id', user.id);
      showToast('Item deleted successfully!', 'success');
      fetchMyItems();
    } catch (err) {
      showToast('Failed to delete item.', 'error');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 scroll-container safe-area-bottom pb-32">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6"
    >
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-extrabold text-gray-900 mb-5 flex items-center gap-2">
          <PackageOpen className="text-cyan-500" size={24} />
          Add New Item
        </h2>
        
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Nintendo Switch" 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium" 
            />
          </div>

          {/* ─── Taxonomy Search-to-Select ─────────────────────────────── */}
          <div ref={taxRef} className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">What are you listing?</label>

            {/* Locked selection badge */}
            {selectedTax ? (
              <div className="flex items-center gap-3 p-3.5 bg-cyan-50 border-2 border-cyan-400 rounded-xl">
                <div className="flex-1">
                  <p className="font-black text-gray-900 text-sm leading-none">{selectedTax.label}</p>
                  <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-widest mt-0.5">{selectedTax.category}</p>
                </div>
                {selectedTax.co2 && (
                  <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                    <Leaf size={9} className="fill-emerald-700" />~{selectedTax.co2}kg CO₂
                  </span>
                )}
                <button type="button" onClick={() => setSelectedTax(null)} className="p-1 text-gray-400 hover:text-rose-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={taxSearch}
                  onChange={e => { setTaxSearch(e.target.value); setTaxOpen(true); }}
                  onFocus={() => setTaxOpen(true)}
                  placeholder="Search: Laptop, Sneakers, Road Bike..."
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium"
                />
              </div>
            )}

            {/* Floating suggestion list */}
            <AnimatePresence>
              {taxOpen && taxResults.length > 0 && !selectedTax && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
                >
                  {taxResults.map(item => (
                    <button
                      key={`${item.category}-${item.label}`}
                      type="button"
                      onClick={() => selectTaxItem(item)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-cyan-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.category}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                        <Leaf size={8} />~{item.co2}kg
                      </span>
                    </button>
                  ))}
                  {/* Custom/Other fallback */}
                  <button
                    type="button"
                    onClick={() => selectTaxItem({ label: taxSearch, category: 'Other', co2: null })}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Tag size={12} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-600">List as “{taxSearch}” (Custom)</p>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick-select chips */}
            {!selectedTax && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => selectTaxItem(chip)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all active:scale-95"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Eco-Impact Badge */}
          {ecoImpactKg && (
            <motion.div
              key={ecoImpactKg}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Leaf size={18} className="text-emerald-600 fill-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">🍃 Eco-Impact Estimate</p>
                <p className="text-sm font-bold text-emerald-800">Swapping saves ~<span className="text-lg font-black">{ecoImpactKg}kg</span> of CO₂</p>
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Condition</label>
            <select 
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-gray-700 appearance-none"
            >
              <option>Brand New</option>
              <option>Like New</option>
              <option>Good</option>
              <option>Fair</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Est. Value (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none">£</span>
              <input 
              type="number" 
              min="0"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="0" 
              className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium" 
            />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item..." 
              rows={3} 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none font-medium"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Looking For</label>
            <textarea 
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              placeholder="What do you want in exchange?" 
              rows={2} 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none font-medium"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Location</label>
            {location ? (
              <div className="flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 font-medium">
                <MapPin size={20} /> Coordinates Captured
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
              >
                <MapPin size={20} />
                {isLocating ? 'Locating...' : 'Set Current Location'}
              </button>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Photo</label>
            <label className="border-2 border-dashed border-cyan-200 rounded-xl p-8 flex flex-col items-center justify-center bg-cyan-50/30 cursor-pointer hover:bg-cyan-50/80 transition-all group overflow-hidden relative min-h-[200px]">
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleImageChange}
                className="hidden" 
              />
              {imagePreview ? (
                <div className="absolute inset-0 w-full h-full">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full flex items-center gap-2">
                      <Upload size={16} /> Change Photo
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 bg-white shadow-sm text-cyan-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={24} strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold text-cyan-700">Upload Photo</span>
                  <span className="text-xs text-cyan-600/60 mt-1 font-medium">Any size — auto-optimised</span>
                </>
              )}
            </label>
          </div>
          <div className="flex gap-3 mt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(6,182,212,0.5)] active:scale-[0.98] transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-[0_12px_25px_-6px_rgba(6,182,212,0.6)]'}`}
            >
              {isSubmitting ? 'Processing...' : (editingItemId ? 'Update Item' : 'Post Item')}
            </button>
            {editingItemId && (
              <button 
                type="button"
                onClick={() => {
                  setEditingItemId(null);
                  setTitle(''); setCondition('Brand New'); setCategory('Electronics'); setEstimatedValue(''); setDescription(''); setLookingFor(''); setImageFile(null); setImagePreview(null);
                }}
                className="px-6 py-4 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div ref={myItemsRef} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all duration-500 ${postSuccess ? 'border-cyan-300 shadow-cyan-100 shadow-lg' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-gray-900">My Items</h2>
          {postSuccess && <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full animate-pulse">✓ Just posted!</span>}
        </div>
        {loadingItems ? (
          <div className="flex-col gap-4 flex">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-4 p-3 border border-gray-100 rounded-2xl items-center animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : myItems.length === 0 ? (
          <motion.div
            className="w-full flex flex-col items-center justify-center py-16 text-center gap-6" key="empty-state">
            <div className="w-24 h-24 rounded-full bg-cyan-50 flex items-center justify-center relative">
              <PackageOpen size={40} className="text-cyan-500" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-200 animate-spin-slow" />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900">Your inventory is empty</p>
              <p className="text-sm text-gray-400 mt-2 max-w-[240px] mx-auto font-medium">You need to list an item before you can start trading with others!</p>
            </div>
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Post Your First Item
            </button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {myItems.map(item => (
              <div key={item.id} className="flex gap-4 p-3 border border-gray-100 rounded-2xl items-center hover:border-cyan-200 hover:bg-cyan-50/30 hover:shadow-sm transition-all duration-200 group relative pr-24">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img src={item.image_url || "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=200&q=80"} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{item.condition || 'No condition set'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      item.status === 'swapped' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-cyan-100 text-cyan-700'
                    }`}>{item.status === 'swapped' ? '✅ Swapped' : '🟢 Active'}</span>
                    {item.category && <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>}
                  </div>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(item)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
          <button onClick={() => alert("SwitchR is a matching platform only. All meetups are the sole responsibility of the users. Meet in public, tell a friend, and stay safe.")} className="text-xs font-bold text-gray-400 hover:text-cyan-600 transition-colors underline">View Safety Terms & Conditions</button>
          <button onClick={onSignOut} className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1">
            Sign Out
          </button>
        </div>
      </div>
    </motion.div>
    </div>
  );
};

const ChatView = ({ user, matchData, setCurrentView, showToast }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const matchId = [user.id, matchData?.user_id].sort().join('_');

  useEffect(() => {
    if (!matchData) return;
    
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true });
      if (data) {
        const systemMsgs = [];
        // Eco-impact planet-win bubble
        const myItemCO2 = Number(matchData?.my_item_co2 || 0);
        const theirItemCO2 = Number(matchData?.their_item_co2 || 0);
        const totalCO2 = myItemCO2 + theirItemCO2;
        if (totalCO2 > 0) {
          systemMsgs.push({ id: 'eco', sender_id: 'system', content: `🌱 Planet Win! Swapping these items will save approximately ${totalCO2}kg of CO₂ compared to buying new.` });
        } else {
          systemMsgs.push({ id: 'system', sender_id: 'system', content: "You both liked each other's items! Start the conversation." });
        }
        setMessages(data.length === 0 ? systemMsgs : data);
      }
      setLoading(false);
    };
    
    fetchMessages();

    const channel = supabase.channel(`messages_${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
        setMessages(prev => [...prev.filter(m => m.id !== 'system'), payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchData, user.id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage.trim();
    setNewMessage('');
    
    await supabase.from('messages').insert([{
      match_id: matchId,
      sender_id: user.id,
      receiver_id: matchData.user_id,
      content: msg
    }]);
  };

  const markAsSwapped = async () => {
    if (!window.confirm("Are you sure? This will mark the item as swapped and prompt for ratings.")) return;
    
    // Fetch both items involved in this match to calculate combined CO2
    const { data: myItems } = await supabase.from('items').select('id, co2_saved_kg').eq('user_id', user.id);
    let myCO2 = 0;
    let theirItemId = null;

    if (myItems && myItems.length > 0) {
      const myItemIds = myItems.map(i => i.id);
      const { data: theirSwipes } = await supabase.from('swipes').select('item_id').eq('swiper_id', matchData.user_id).in('item_id', myItemIds).eq('direction', 'right').limit(1);
      if (theirSwipes && theirSwipes.length > 0) {
        theirItemId = theirSwipes[0].item_id;
        await supabase.from('items').update({ status: 'swapped' }).eq('id', theirItemId).eq('user_id', user.id);
        const matchedItem = myItems.find(i => i.id === theirItemId);
        myCO2 = Number(matchedItem?.co2_saved_kg || 0);
      }
    }

    // Fetch their item's CO2
    let theirCO2 = 0;
    if (matchData.item_offered_id) {
      const { data: theirItem } = await supabase.from('items').select('co2_saved_kg').eq('id', matchData.item_offered_id).maybeSingle();
      theirCO2 = Number(theirItem?.co2_saved_kg || 0);
    }
    const combinedCO2 = myCO2 + theirCO2;

    showToast("Your item was marked as swapped!", "success");
    
    const score = window.prompt("Rate this user from 1 to 5 stars:");
    if (score && !isNaN(score) && score >= 1 && score <= 5) {
      const parsedScore = parseInt(score);
      await supabase.from('ratings').insert([{
        rater_id: user.id,
        ratee_id: matchData.user_id,
        match_id: matchId,
        score: parsedScore
      }]);

      // Update recipient's profile stats + CO2
      const { data: theirProfile } = await supabase.from('profiles').select('trades_completed, rating, total_carbon_saved').eq('id', matchData.user_id).single();
      if (theirProfile) {
        const newTotal = (theirProfile.trades_completed || 0) + 1;
        const newRating = theirProfile.rating ? ((Number(theirProfile.rating) * (newTotal - 1)) + parsedScore) / newTotal : parsedScore;
        await supabase.from('profiles').update({ 
          trades_completed: newTotal, 
          rating: Number(newRating.toFixed(1)),
          total_carbon_saved: Number(theirProfile.total_carbon_saved || 0) + combinedCO2
        }).eq('id', matchData.user_id);
      }

      // Update current user's CO2 too
      const { data: myProfile } = await supabase.from('profiles').select('total_carbon_saved').eq('id', user.id).single();
      if (myProfile) {
        await supabase.from('profiles').update({
          total_carbon_saved: Number(myProfile.total_carbon_saved || 0) + combinedCO2
        }).eq('id', user.id);
      }

      if (combinedCO2 > 0) showToast(`🌱 Together you saved ${combinedCO2}kg of CO₂!`, 'success');
      showToast("Rating submitted! Thank you.", "success");
    }
    
    setCurrentView('swipe');
  };

  if (!matchData) return null;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 absolute inset-0 z-50">
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('swipe')} className="p-2 text-gray-400 hover:text-cyan-600 rounded-full hover:bg-cyan-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
            <img src={matchData.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${matchData.user_id}`} alt="User" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm truncate max-w-[120px]">{matchData.profiles?.username || 'Trader'}</h3>
            <p className="text-xs text-cyan-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={12} /> Trading
            </p>
          </div>
        </div>
        <button onClick={markAsSwapped} className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-50 text-emerald-600 px-3 py-2 rounded-full hover:bg-emerald-100 transition-colors border border-emerald-200">
          Mark Swapped
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.sender_id === 'system' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200 mx-auto text-center font-semibold' : msg.sender_id === user.id ? 'bg-cyan-500 text-white ml-auto' : 'bg-white border border-gray-100 text-gray-800 mr-auto'}`}>
              {msg.content}
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
        <input 
          type="text" 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..." 
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm font-medium"
        />
        <button type="submit" disabled={!newMessage.trim()} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${newMessage.trim() ? 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-md shadow-cyan-500/30' : 'bg-gray-100 text-gray-400'}`}>
          <Send size={18} className="ml-0.5" />
        </button>
      </form>
    </div>
  );
};

const AuthView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.15),transparent_70%)]" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 mb-6">
            <Zap size={32} className="text-white fill-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Switch<span className="text-cyan-500">R</span></h1>
          <p className="text-gray-500 font-medium text-center">The premier barter network for the modern age.</p>
        </div>
        
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
          />
          {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg hover:bg-gray-800 transition-all active:scale-[0.98] mt-2 shadow-xl"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Join SwitchR')}
          </button>
        </form>
        
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-8 text-sm font-bold text-gray-400 hover:text-cyan-600 transition-colors uppercase tracking-widest"
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
        </button>
      </motion.div>
    </div>
  );
};

const TermsModal = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-600" />
        <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Safety First! 🛡️</h2>
        <div className="space-y-4 text-gray-600 font-medium mb-10">
          <p>SwitchR is a matching platform only. To ensure your safety while bartering:</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">1</span></div>
              <span>Always meet in a <b>well-lit public place</b> (coffee shops, police station lobbies).</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">2</span></div>
              <span><b>Tell a friend</b> where you're going and share your location.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">3</span></div>
              <span><b>Never</b> share personal financial details or home address.</span>
            </li>
          </ul>
        </div>
        <button 
          onClick={onAccept}
          className="w-full py-5 bg-cyan-500 text-white rounded-2xl font-black text-lg hover:bg-cyan-600 shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all"
        >
          I Understand & Agree
        </button>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════
// Chain Discovery Card
// ═══════════════════════════════════════════════════════════
const ChainDiscoveryCard = ({ chain, userId, onAccepted, showToast }) => {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted]   = useState(false);

  const steps = chain.chain;
  const myStep = steps.find(s => s.user_id === userId);
  const totalParts = steps.length;
  const co2Total = steps.reduce((sum, s) =>
    sum + (getCO2(null, s.gives_item?.sub_category) || 0), 0);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      // Upsert a chain_proposal row and add self to acceptances
      const participantIds = steps.map(s => s.user_id);
      // Check if proposal exists already
      const { data: existing } = await supabase
        .from('chain_proposals')
        .select('id, acceptances, participant_ids')
        .contains('participant_ids', participantIds)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        const newAcceptances = [...new Set([...existing.acceptances, userId])];
        const allAccepted = participantIds.every(id => newAcceptances.includes(id));
        await supabase.from('chain_proposals').update({
          acceptances: newAcceptances,
          status: allAccepted ? 'active' : 'pending'
        }).eq('id', existing.id);
        if (allAccepted) showToast('🔗 Chain Activated! All parties agreed!', 'success');
        else showToast('✓ You joined the chain. Waiting for others…', 'success');
      } else {
        await supabase.from('chain_proposals').insert([{
          chain_data: chain,
          participant_ids: participantIds,
          acceptances: [userId]
        }]);
        showToast('✓ You joined the chain. Waiting for others…', 'success');
      }
      setAccepted(true);
      onAccepted?.();
    } catch (e) {
      showToast('Failed to accept chain.', 'error');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border border-violet-100 shadow-lg shadow-violet-500/5 overflow-hidden mb-4"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <RefreshCw size={18} className="text-white animate-spin" style={{ animationDuration: '3s' }} />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-violet-200">Chain Match — {totalParts}-Way Swap</p>
          <p className="text-white font-black text-sm leading-tight">Circular Trade Opportunity</p>
        </div>
        {co2Total > 0 && (
          <span className="flex items-center gap-1 bg-emerald-400/20 text-emerald-200 text-[10px] font-black px-2 py-1 rounded-full">
            <Leaf size={9} />~{co2Total}kg CO₂
          </span>
        )}
      </div>

      {/* Chain visualization */}
      <div className="px-5 py-4">
        {steps.map((step, idx) => (
          <div key={step.user_id}>
            <div className={`flex items-center gap-3 py-2 px-3 rounded-2xl ${
              step.user_id === userId ? 'bg-violet-50 border border-violet-200' : 'bg-stone-50'
            }`}>
              <img
                src={step.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${step.user_id}`}
                className="w-9 h-9 rounded-full border-2 border-white shadow-sm shrink-0"
                alt={step.username}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-stone-900 truncate">
                  {step.user_id === userId ? 'You' : step.username}
                </p>
                <p className="text-[10px] text-stone-400 font-bold truncate">
                  gives <span className="text-stone-700">{step.gives_item?.title}</span>
                </p>
              </div>
              {step.gives_item?.image_url && (
                <img
                  src={step.gives_item.image_url}
                  className="w-10 h-10 rounded-xl object-cover border border-stone-100 shrink-0"
                  alt={step.gives_item.title}
                />
              )}
            </div>
            {idx < steps.length - 1 && (
              <div className="flex items-center gap-2 pl-7 py-1">
                <div className="flex flex-col items-center gap-0.5">
                  <div className="w-0.5 h-2 bg-violet-200 rounded" />
                  <div className="w-0.5 h-2 bg-violet-200 rounded" />
                </div>
                <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
                  → to {steps[idx + 1]?.user_id === userId ? 'you' : steps[idx + 1]?.username}
                </span>
              </div>
            )}
          </div>
        ))}
        {/* Close the loop arrow */}
        <div className="flex items-center gap-2 pl-7 pt-1">
          <Link2 size={12} className="text-violet-400" />
          <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
            → back to {myStep?.user_id === userId ? 'you' : myStep?.username} · loop complete
          </span>
        </div>
      </div>

      {/* Accept button */}
      <div className="px-5 pb-5">
        {accepted ? (
          <div className="w-full py-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center text-xs font-black text-emerald-600">
            ✓ You accepted — waiting for others
          </div>
        ) : (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-violet-500/20 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {accepting ? 'Accepting…' : '🔗 Accept Chain'}
          </button>
        )}
      </div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════
// Chains View
// ═══════════════════════════════════════════════════════════
const ChainsView = ({ user, showToast }) => {
  const [chains, setChains]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchChains = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('find_trade_chains', { p_user_id: user.id });
      if (rpcErr) throw rpcErr;
      setChains(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[CHAINS]', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChains(); }, [user]);

  return (
    <div className="w-full h-full flex flex-col bg-stone-50 overflow-y-auto scroll-container safe-area-bottom pb-32">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">Chain Matches</h2>
          <p className="text-xs text-stone-400 font-medium mt-0.5">Multi-party circular swaps</p>
        </div>
        <button
          onClick={fetchChains}
          className="p-2.5 bg-white border border-stone-200 rounded-xl text-stone-500 hover:border-violet-300 hover:text-violet-500 transition-all"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-violet-500/20" />
              <div className="absolute inset-0 rounded-full border-4 border-t-violet-500 animate-spin" />
              <RefreshCw size={20} className="absolute inset-0 m-auto text-violet-500" />
            </div>
            <p className="text-xs font-black text-stone-400 uppercase tracking-widest">Scanning for chains…</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold text-rose-500 mb-2">{error}</p>
            <p className="text-xs text-stone-400">Run chain_engine.sql in Supabase first</p>
          </div>
        ) : chains.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-violet-50 flex items-center justify-center mb-5 relative">
              <RefreshCw size={32} className="text-violet-300" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-violet-200 animate-spin" style={{ animationDuration: '4s' }} />
            </div>
            <h3 className="text-lg font-black text-stone-900 mb-2">No chains found yet</h3>
            <p className="text-sm text-stone-400 max-w-[220px] font-medium">
              Add items to your Wishlist on your profile so the engine can match circular trades.
            </p>
          </div>
        ) : (
          chains.map((chain, idx) => (
            <ChainDiscoveryCard
              key={idx}
              chain={chain}
              userId={user.id}
              showToast={showToast}
              onAccepted={fetchChains}
            />
          ))
        )}
      </div>
    </div>
  );
};


export default function App() {
  const [cards, setCards] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [currentView, setCurrentView] = useState('swipe'); // 'swipe' | 'inventory' | 'chat' | 'offers'
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

  // Fisher-Yates shuffle for Discovery Mode
  const shuffleArray = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const removeCard = async (id, direction) => {
    setCards(prev => prev.filter(card => card.id !== id));
    setLastAction({ id, direction });
    
    // Persist swipe to database
    if (user) {
      await supabase.from('swipes').insert([{
        swiper_id: user.id,
        item_id: id,
        direction: direction
      }]);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: googleMapsLibraries
  });

  useEffect(() => {
    const checkTerms = async (userId) => {
      // Use maybeSingle() to avoid 406 errors when profile row doesn't exist yet
      const { data, error } = await supabase.from('profiles').select('accepted_terms').eq('id', userId).maybeSingle();
      if (error) {
        console.warn('[TERMS CHECK] Could not load profile:', error.message);
        return; // Non-blocking — don't block app load
      }
      if (data && data.accepted_terms === false) {
        setShowTermsModal(true);
        setHasAcceptedTerms(false);
      } else {
        setHasAcceptedTerms(true);
        setShowTermsModal(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) checkTerms(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkTerms(session.user.id);
    });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationName('Your Location (GPS)');
        },
        (err) => console.log("Location access denied")
      );
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        console.log("🛠️ [DISCOVERY DIAGNOSTIC] Starting fetch for user:", user.id);
        
        // 1. Get already swiped items
        const { data: swipes, error: swipeError } = await supabase
          .from('swipes')
          .select('item_id')
          .eq('swiper_id', user.id);
        
        if (swipeError) {
          console.warn("⚠️ [DISCOVERY] Could not fetch swipes (Table might be missing or RLS issue):", swipeError.message);
        }
        
        const swipedIds = swipes?.map(s => s.item_id) || [];
        console.log(`🚫 [DISCOVERY] Excluding ${swipedIds.length} swiped items:`, swipedIds);

        // 2. Query items
        console.log("📡 [DISCOVERY] Querying Supabase 'items' table...");
        let query = supabase
          .from('items')
          .select(`
            *,
            profiles (*)
          `)
          .neq('user_id', user.id)
          .or('status.eq.active,status.is.null');

        if (swipedIds.length > 0) {
          query = query.not('id', 'in', `(${swipedIds.join(',')})`);
        }

        if (activeCategory !== 'All') query = query.eq('category', activeCategory);
        if (debouncedSearchQuery) {
          // Search title, description AND sub_category so 'bike' finds 'Road Bike'
          query = query.or(
            `title.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%,sub_category.ilike.%${debouncedSearchQuery}%`
          );
        }

        const { data, error: itemError } = await query.limit(100);
        
        if (itemError) {
          console.error("❌ [DISCOVERY] Supabase Query Error:", itemError.message);
          console.error("Detail:", itemError.details);
          console.error("Hint:", itemError.hint);
          throw itemError;
        }
        
        console.log(`📦 [DISCOVERY] Successfully fetched ${data?.length || 0} raw items from DB.`);
        setAllItems(data || []);
      } catch (err) {
        console.error("🚨 [DISCOVERY] Critical Failure:", err);
        showToast("Discovery error. Check database schema.", "error");
      } finally {
        setLoadingItems(false);
      }
    };
    
    if (currentView === 'swipe') fetchItems();
  }, [user, currentView, debouncedSearchQuery, activeCategory, radius]);

  useEffect(() => {
    if (allItems.length > 0) {
      console.log("🧪 [DISCOVERY] Running distance filter on", allItems.length, "items...");
      
      const itemsWithDistance = allItems.map(item => {
        if (!userLocation || item.lat === null || item.lng === null) {
          return { ...item, calculatedDistance: null };
        }
        const dist = calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng);
        return { ...item, calculatedDistance: dist };
      });

      let filtered = itemsWithDistance.filter(item => {
        if (!userLocation || item.calculatedDistance === null) return true;
        return item.calculatedDistance <= radius;
      });

      console.log(`📊 [DISCOVERY] Found ${filtered.length} items within ${radius}km.`);

      // Fallback: If no items found in radius, show all available items
      if (filtered.length === 0 && allItems.length > 0) {
        console.log("💡 [DISCOVERY] No items in radius. Activating Fallback Mode.");
        filtered = itemsWithDistance;
      }

      // Discovery Mode: shuffle the final set so every session feels fresh
      setCards(isDiscoveryMode ? shuffleArray(filtered) : filtered);
    } else {
      console.log("📭 [DISCOVERY] No items found in database (excluding yours and swiped).");
      setCards([]);
    }
  }, [allItems, radius, userLocation, isDiscoveryMode]);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentView('swipe');
  };

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

                  {/* Category chips — hidden when searching */}
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

                <div className="flex-1 w-full relative flex items-center justify-center" style={{ minHeight: '500px' }}>
                  {loadingItems ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Finding matches...</p>
                    </div>
                  ) : cards.length > 0 ? (
                    <div className="absolute inset-0">
                      <AnimatePresence>
                        {cards.map((item, index) => (
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
            {currentView === 'profile' && <ProfileView key="profile" user={user} onSignOut={handleSignOut} setCurrentView={setCurrentView} />}
            {currentView === 'info' && <InfoView key="info" onBack={() => setCurrentView('profile')} />}
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
            <button onClick={() => setCurrentView('offers')} className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'offers' ? 'bg-cyan-50 text-cyan-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><MessageCircle size={20} className={currentView === 'offers' ? 'fill-cyan-600' : ''} /><span className="text-[9px] font-black uppercase tracking-tighter">Offers</span></button>
            <button onClick={() => setCurrentView('chains')} className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'chains' ? 'bg-violet-50 text-violet-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><RefreshCw size={20} className={currentView === 'chains' ? 'text-violet-600' : ''} /><span className="text-[9px] font-black uppercase tracking-tighter">Chains</span></button>
            <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'inventory' ? 'bg-cyan-50 text-cyan-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><PackageOpen size={20} className={currentView === 'inventory' ? 'fill-cyan-600' : ''} /><span className="text-[9px] font-black uppercase tracking-tighter">Items</span></button>
            <button onClick={() => setCurrentView('profile')} className={`flex flex-col items-center justify-center gap-1 transition-all duration-500 w-14 h-14 rounded-3xl ${currentView === 'profile' ? 'bg-cyan-50 text-cyan-600 shadow-inner' : 'text-gray-300 hover:text-gray-500'}`}><User size={20} className={currentView === 'profile' ? 'fill-cyan-600' : ''} /><span className="text-[9px] font-black uppercase tracking-tighter">Profile</span></button>
          </nav>
        )}

        <AnimatePresence>
          {biddingOnItem && <BiddingDrawer user={user} targetItem={biddingOnItem} onClose={() => setBiddingOnItem(null)} showToast={showToast} />}
          {viewingProfile && <UserProfileModal profileId={viewingProfile} onClose={() => setViewingProfile(null)} />}
          {toast && (
            <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
              <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}`}>{toast.message}</div>
            </motion.div>
          )}
          {showTermsModal && <TermsModal onAccept={async () => { await supabase.from('profiles').update({ accepted_terms: true }).eq('id', user.id); setShowTermsModal(false); }} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
