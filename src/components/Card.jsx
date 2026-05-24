import React from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { Zap, X, MapPin, ChevronDown, Tag, Leaf, Search } from 'lucide-react';

const Card = ({ item, active, removeCard, onSwap, onTap }) => {
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
      onTap={() => { if (Math.abs(x.get()) < 5) onTap?.(item); }}
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

        <div className="absolute bottom-10 left-8 right-8 text-white z-10">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
             <span className="bg-cyan-500 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                {item.category}
             </span>
             <span className="bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/20">
                {item.condition}
             </span>
             {item.estimated_value > 0 && (
                <span className="bg-amber-500/80 backdrop-blur-md text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-amber-400/30">
                  <Tag size={9} />{`~\u00a3${item.estimated_value}`}
                </span>
              )}
             {item.co2_saved_kg && (
                <span className="bg-emerald-500/80 backdrop-blur-md text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 border border-emerald-400/30">
                  <Leaf size={9} className="fill-white" />~{item.co2_saved_kg}kg
                </span>
              )}
          </div>
          <h2 className="text-3xl font-black mb-1 tracking-tight leading-none drop-shadow-2xl">{item.title}</h2>
          <p className="text-xs text-gray-300 font-medium line-clamp-2 mb-2 opacity-90">{item.description}</p>
          {item.looking_for && (
            <div className="mb-4">
              <span className="bg-violet-500/80 backdrop-blur-md text-[10px] font-black px-3 py-1 rounded-full inline-flex items-center gap-1 border border-violet-400/30">
                <Search size={9} />Wants: {item.looking_for}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between mt-auto">
             <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                <MapPin size={14} className="text-cyan-400" />
                <span className="text-sm font-bold">{item.calculatedDistance ? `${item.calculatedDistance.toFixed(1)} km` : 'Nearby'}</span>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={(e) => { e.stopPropagation(); onTap?.(item); }} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/20 active:scale-90 transition-all pointer-events-auto" title="View details">
                 <ChevronDown size={16} className="rotate-180" />
                </button>
                <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-xl">
                   <img src={item.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user_id}`} alt="avatar" />
                </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default React.memo(Card);
