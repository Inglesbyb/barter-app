import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Tag, Leaf, Search, Zap } from 'lucide-react';

const ItemDetailSheet = ({ item, onClose, onSwap }) => {
  if (!item) return null;
  const ownerAvatar = item.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user_id}`;
  const ownerName = item.profiles?.username || 'Trader';
  return (
    <div className="absolute inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }} className="w-full max-w-md bg-white rounded-t-[2.5rem] max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-2 shrink-0" />
        <div className="relative w-full aspect-[4/3] shrink-0">
          <img src={item.image_url} className="w-full h-full object-cover" alt={item.title} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 flex-wrap">
            <span className="bg-cyan-500 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">{item.category}</span>
            {item.sub_category && <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/20">{item.sub_category}</span>}
            <span className="bg-white/20 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full border border-white/20">{item.condition}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6 pb-32">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">{item.title}</h2>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {item.estimated_value > 0 && <span className="flex items-center gap-1 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full"><Tag size={11} />{` ~\u00a3${item.estimated_value}`}</span>}
            {item.co2_saved_kg > 0 && <span className="flex items-center gap-1 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full"><Leaf size={11} /> ~{item.co2_saved_kg}kg saved</span>}
            <span className="flex items-center gap-1 text-xs font-bold text-gray-500"><MapPin size={11} /> {item.calculatedDistance ? `${item.calculatedDistance.toFixed(1)} km away` : 'Nearby'}</span>
          </div>
          <div className="mt-5"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Description</p><p className="text-sm text-gray-700 font-medium leading-relaxed">{item.description || 'No description provided.'}</p></div>
          {item.looking_for && <div className="mt-5 bg-violet-50 border border-violet-200 rounded-2xl p-4"><p className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">Looking For</p><p className="text-sm font-bold text-violet-800">{item.looking_for}</p></div>}
          <div className="mt-5 flex items-center gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <div className="w-12 h-12 rounded-full border-2 border-white shadow-md overflow-hidden shrink-0"><img src={ownerAvatar} className="w-full h-full object-cover" alt={ownerName} /></div>
            <div className="flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Listed by</p><p className="font-black text-gray-900">{ownerName}</p></div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-white via-white to-transparent">
          <button onClick={() => { onSwap(item); onClose(); }} className="w-full py-4 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-2xl font-black text-base shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"><Zap size={18} className="fill-white" /> Make an Offer</button>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(ItemDetailSheet);
