import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, Tag, BadgeCheck, CheckCircle2, ChevronRight, Settings, HelpCircle, LogOut, PackageOpen, Search, Leaf, User, Crown, Zap, Shield, X, Flame } from 'lucide-react';
import { supabase } from '../supabase';
import ProfileSettingsModal from './ProfileSettingsModal';

// ── SwitchR Pro Upgrade Modal ────────────────────────────────
const ProUpgradeModal = ({ onClose, onActivate, isPro }) => {
  const [activating, setActivating] = useState(false);
  const [done, setDone] = useState(false);

  const handleActivate = async () => {
    setActivating(true);
    // Simulated 1-second "payment" processing (mock — wire up Stripe here)
    await new Promise(r => setTimeout(r, 1200));
    await onActivate();
    setDone(true);
    setActivating(false);
  };

  const benefits = [
    { icon: <Zap size={16} className="text-amber-400 fill-amber-400" />, title: 'Priority Chain Matching', desc: '3× faster circular loop discovery' },
    { icon: <Crown size={16} className="text-amber-400" />, title: 'Gold Profile Badge', desc: 'Glowing aura in the swipe deck & profile' },
    { icon: <Shield size={16} className="text-emerald-400" />, title: 'ID & Address Verified', desc: 'Unlocks Fully Verified Trader badge' },
    { icon: <Leaf size={16} className="text-emerald-400 fill-emerald-400" />, title: '2× Carbon Offset Certified', desc: 'Pro trades count double in CO₂ stats' },
    { icon: <PackageOpen size={16} className="text-cyan-400" />, title: 'Unlimited Listings', desc: 'No cap on active inventory items' },
    { icon: <Flame size={16} className="text-rose-400 fill-rose-400" />, title: 'Swap Safe Priority', desc: 'Instant escrow with £500 cover per trade' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-end justify-center p-0"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="w-full max-w-md bg-stone-950 rounded-t-[2.5rem] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative overflow-hidden px-6 pt-8 pb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent" />
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-500/10 blur-3xl" />
          <button onClick={onClose} className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 transition-all">
            <X size={16} />
          </button>
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40">
                <Crown size={24} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">Membership</p>
                <h2 className="text-2xl font-black text-white leading-none">SwitchR Pro</h2>
              </div>
            </div>
            <p className="text-stone-400 text-sm font-medium">Supercharge every swap. Get priority matching, gold status, and verified trader badge instantly.</p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="px-6 pb-4 space-y-3">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/5 rounded-2xl px-4 py-3">
              <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">{b.icon}</div>
              <div>
                <p className="text-white text-xs font-black leading-tight">{b.title}</p>
                <p className="text-stone-500 text-[10px] font-medium">{b.desc}</p>
              </div>
              <CheckCircle2 size={14} className="text-emerald-400 ml-auto shrink-0" />
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-6 pb-8 pt-2">
          {done || isPro ? (
            <div className="w-full py-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-black text-sm text-center flex items-center justify-center gap-2">
              <Crown size={16} className="fill-emerald-400" /> You're a SwitchR Pro member!
            </div>
          ) : (
            <button
              onClick={handleActivate}
              disabled={activating}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-black text-sm shadow-xl shadow-amber-500/30 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {activating ? (
                <><div className="w-4 h-4 border-2 border-stone-900/40 border-t-stone-900 rounded-full animate-spin" /> Processing...</>
              ) : (
                <><Crown size={16} /> Activate Pro · £9.99/mo</>
              )}
            </button>
          )}
          <p className="text-center text-stone-600 text-[10px] font-medium mt-3">Cancel anytime · Instant activation · Powered by Stripe</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

const ProfileView = ({ user, onSignOut, setCurrentView, showToast }) => {
  const [profile, setProfile]     = useState(null);
  const [items, setItems]         = useState([]);
  const [reviews, setReviews]     = useState([]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading]     = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [isPro, setIsPro]         = useState(false);

  const load = async () => {
    const [{ data: p }, { data: it }, { data: rv }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      supabase.from('items').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, reviewer:reviewer_id(username, avatar_url)').eq('profile_id', user.id).order('created_at', { ascending: false }),
    ]);
    setProfile(p);
    setIsPro(p?.is_pro || false);
    setItems(it || []);
    setReviews(rv || []);
    setLoading(false);
  };

  const handleActivatePro = async () => {
    await supabase.from('profiles').update({ is_pro: true, pro_since: new Date().toISOString() }).eq('id', user.id);
    setIsPro(true);
    setProfile(prev => ({ ...prev, is_pro: true }));
  };

  useEffect(() => {
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
  const vLevel        = isPro ? Math.max(profile?.verification_level || 0, 1) : (profile?.verification_level || 0);
  const rawCo2        = Number(profile?.total_carbon_saved || 0);
  const co2           = (isPro ? rawCo2 * 2 : rawCo2).toFixed(1);
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
            onClick={() => setShowSettings(true)}
            className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
          >
            <Settings size={18} />
          </button>
        </div>

        {/* Overlapping avatar */}
        <div className="px-6 pb-4">
          <div className="flex items-end justify-between -mt-14 mb-3">
            <div className="relative">
              {/* Pro glow ring */}
              {isPro && (
                <div className="absolute -inset-2 rounded-full bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-300 animate-pulse opacity-80 blur-sm" />
              )}
              <div className={`relative w-28 h-28 rounded-full shadow-2xl overflow-hidden bg-stone-200 ${
                isPro ? 'border-4 border-amber-400' : 'border-4 border-stone-50'
              }`}>
                <img src={avatarUrl} className="w-full h-full object-cover" alt={username} />
              </div>
              {vLevel >= 1 && (
                <div className={`absolute bottom-1 right-1 w-7 h-7 rounded-full flex items-center justify-center border-2 border-stone-50 shadow-md ${
                  isPro ? 'bg-amber-400' : 'bg-cyan-500'
                }`}>
                  {isPro ? <Crown size={12} className="text-white" /> : <BadgeCheck size={14} className="text-white fill-white" />}
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
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black text-stone-900 tracking-tight leading-none">{username}</h2>
                {isPro && <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-600 border border-amber-400/30"><Crown size={9} />PRO</span>}
                {vLevel >= 1 && !isPro && <BadgeCheck size={18} className="text-cyan-500 fill-cyan-500 shrink-0" />}
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
            {profile?.bio || 'No bio yet \u2014 tap the gear icon to edit your profile.'}
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

      {/* ── SwitchR Pro Membership block ───────────────────── */}
      <button
        onClick={() => setShowProModal(true)}
        className={`mx-4 mb-4 rounded-2xl p-5 flex items-center gap-4 w-[calc(100%-2rem)] transition-all active:scale-[0.98] ${
          isPro
            ? 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30'
            : 'bg-stone-900 hover:bg-stone-800'
        }`}
      >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
          isPro ? 'bg-white/20' : 'bg-amber-500/20'
        }`}>
          <Crown size={22} className={isPro ? 'text-white' : 'text-amber-400'} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: isPro ? 'rgba(255,255,255,0.7)' : '#92400e' }}>Membership</p>
          <p className="text-lg font-black leading-none" style={{ color: 'white' }}>
            {isPro ? 'SwitchR Pro ✓' : 'Upgrade to Pro'}
          </p>
          <p className="text-[10px] font-medium mt-0.5" style={{ color: isPro ? 'rgba(255,255,255,0.65)' : '#d97706' }}>
            {isPro ? 'Priority matching · Gold badge · 2× Carbon' : '£9.99/mo · Priority matching · Unlimited listings'}
          </p>
        </div>
        <ChevronRight size={18} className="shrink-0" style={{ color: isPro ? 'rgba(255,255,255,0.6)' : '#d97706' }} />
      </button>

      {/* ── Eco-Impact card ───────────────────────────── */}
      <div className="mx-4 mb-4 bg-stone-900 rounded-2xl p-5 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Leaf size={22} className="text-emerald-400 fill-emerald-400" />
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-500 mb-0.5">🌿 Green Impact</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-black text-white leading-none">{co2}<span className="text-base text-stone-400 font-bold ml-1">kg CO₂</span></p>
            {isPro && (
              <span className="text-[9px] font-black bg-emerald-400/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/20">2× PRO</span>
            )}
          </div>
          <p className="text-[10px] text-stone-500 font-medium mt-0.5">saved vs buying new across {swaps} swaps</p>
        </div>
      </div>

      {/* ── Trust Score ───────────────────────────────── */}
      <div className="mx-4 mb-4 bg-white border border-stone-100 rounded-2xl p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-stone-400 mb-3">Trust Score</p>
        <div className="space-y-2.5">
          {[
            { label: 'Email Verified',  done: profile?.email_verified  ?? (vLevel >= 1), icon: <CheckCircle2 size={14} /> },
            { label: 'Phone Verified',  done: profile?.phone_verified  ?? (vLevel >= 2), icon: <CheckCircle2 size={14} /> },
            { label: 'ID Verified',     done: profile?.id_verified     ?? (vLevel >= 3), icon: <CheckCircle2 size={14} /> },
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
        <button onClick={() => setShowSettings(true)} className="w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-stone-100 shadow-sm hover:border-cyan-200 transition-all group">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-500 flex items-center justify-center"><Settings size={20} /></div>
            <div className="text-left">
              <span className="font-black text-stone-900 text-sm block">Edit Profile</span>
              <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Change photo, name & bio</span>
            </div>
          </div>
          <ChevronRight size={18} className="text-stone-300 group-hover:text-cyan-500 group-hover:translate-x-1 transition-all" />
        </button>
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

      <AnimatePresence>
        {showSettings && (
          <ProfileSettingsModal
            user={user}
            profile={profile}
            onClose={() => setShowSettings(false)}
            onSaved={load}
            showToast={showToast || (() => {})}
          />
        )}
        {showProModal && (
          <ProUpgradeModal
            isPro={isPro}
            onClose={() => setShowProModal(false)}
            onActivate={handleActivatePro}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(ProfileView);
