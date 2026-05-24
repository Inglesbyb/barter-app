import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { MapPin, Star, Tag, BadgeCheck, CheckCircle2, ChevronRight, Settings, HelpCircle, LogOut, PackageOpen, Search, Leaf, User } from 'lucide-react';
import { supabase } from '../supabase';
import ProfileSettingsModal from './ProfileSettingsModal';

const ProfileView = ({ user, onSignOut, setCurrentView, showToast }) => {
  const [profile, setProfile]     = useState(null);
  const [items, setItems]         = useState([]);
  const [reviews, setReviews]     = useState([]);
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading]     = useState(true);
  const [showSettings, setShowSettings] = useState(false);

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
      </AnimatePresence>
    </div>
  );
};

export default React.memo(ProfileView);
