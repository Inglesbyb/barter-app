import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Upload, PackageOpen, Shield, ChevronDown, Info, Minus, Plus } from 'lucide-react';
import { supabase } from '../supabase';

const BiddingDrawer = ({ user, targetItem, onClose, showToast }) => {
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [fuelAmount, setFuelAmount] = useState(0);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState(false);

  useEffect(() => {
    const fetchMyItems = async () => {
      const { data } = await supabase.from('items').select('*').eq('user_id', user.id).eq('status', 'active');
      setMyItems(data || []);
      setLoading(false);
    };
    fetchMyItems();
  }, [user]);

  // ── Fee Calculations ──────────────────────────────────────
  const fees = useMemo(() => {
    const myVal  = selectedItem?.estimated_value || 0;
    const theirVal = targetItem?.estimated_value || 0;
    const valueDiff = theirVal - myVal; // positive = their item costs more
    const escrowBase = 0.99;
    const escrowPct  = ((myVal + theirVal) / 2) * 0.025; // 2.5% of avg value
    const totalSwapSafe = escrowBase + escrowPct;
    const fuelCommission = fuelAmount * 0.05;
    const totalPlatformFee = totalSwapSafe + fuelCommission;
    return { escrowBase, escrowPct, totalSwapSafe, fuelCommission, totalPlatformFee, valueDiff };
  }, [selectedItem, targetItem, fuelAmount]);

  // ── Suggest fuel if their item is worth more ──────────────
  useEffect(() => {
    if (fees.valueDiff > 5 && fuelAmount === 0) {
      setFuelAmount(Math.min(Math.round(fees.valueDiff), 100));
    }
  }, [fees.valueDiff]);

  const placeBid = async () => {
    if (!selectedItem) return;
    const { error } = await supabase.from('bids').insert([{
      bidder_id:       user.id,
      receiver_id:     targetItem.user_id,
      item_offered_id: selectedItem.id,
      item_wanted_id:  targetItem.id,
      status:          'pending'
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
        transition={{ type: 'spring', damping: 32, stiffness: 420 }}
        className="w-full max-w-md bg-white rounded-t-[2.5rem] max-h-[92vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-5 shrink-0" />

        {/* Header */}
        <div className="px-6 pt-4 pb-4 shrink-0">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Make an Offer</h2>
          <p className="text-sm text-gray-500 font-medium mt-1">
            Trade for <span className="text-cyan-600 font-bold">{targetItem.title}</span>
            {targetItem.estimated_value > 0 && (
              <span className="ml-2 text-[11px] bg-amber-50 text-amber-700 font-black px-2 py-0.5 rounded-full border border-amber-100">
                ~£{targetItem.estimated_value}
              </span>
            )}
          </p>
        </div>

        {/* Item Selector */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myItems.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10 px-6">
            <PackageOpen size={48} className="text-gray-200 mb-4" />
            <p className="text-gray-500 font-bold">Nothing to offer!</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">List an item in your inventory first.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 pb-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Select your item to offer:</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {myItems.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`group cursor-pointer rounded-2xl overflow-hidden transition-all duration-200 border-2 ${
                    selectedItem?.id === item.id
                      ? 'border-cyan-500 shadow-xl shadow-cyan-500/20 scale-[1.02]'
                      : 'border-transparent bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <div className="aspect-square relative overflow-hidden">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    {selectedItem?.id === item.id && (
                      <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                        <Zap size={28} className="text-white fill-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                  <div className="p-3 bg-white">
                    <p className="text-xs font-black text-gray-900 truncate leading-tight">{item.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{item.category}</p>
                      {item.estimated_value > 0 && (
                        <p className="text-[10px] font-black text-amber-600">£{item.estimated_value}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div
                onClick={() => onClose()}
                className="aspect-[1/1.25] border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-cyan-500 hover:border-cyan-300 hover:bg-cyan-50 transition-all cursor-pointer"
              >
                <Upload size={20} className="mb-1.5" />
                <span className="text-[10px] font-black uppercase tracking-wider">New Item</span>
              </div>
            </div>

            {/* ── SwitchR Fuel Value Balancer ────────────────── */}
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <Zap size={14} className="text-violet-600 fill-violet-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">SwitchR Fuel</p>
                    <p className="text-xs font-bold text-stone-600">Add cash to balance the trade value</p>
                  </div>
                </div>

                {/* Value comparison bar */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-white rounded-xl p-2.5 text-center border border-violet-100">
                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Your Item</p>
                    <p className="text-sm font-black text-gray-900">£{selectedItem.estimated_value || '?'}</p>
                  </div>
                  <span className="text-gray-300 font-black">↔</span>
                  <div className="flex-1 bg-white rounded-xl p-2.5 text-center border border-violet-100">
                    <p className="text-[9px] font-black uppercase tracking-wider text-gray-400">Their Item</p>
                    <p className="text-sm font-black text-gray-900">£{targetItem.estimated_value || '?'}</p>
                  </div>
                </div>

                {/* Fuel slider */}
                <div className="flex items-center gap-3 mb-2">
                  <button
                    onClick={() => setFuelAmount(a => Math.max(0, a - 5))}
                    className="w-8 h-8 rounded-full bg-white border border-violet-200 flex items-center justify-center text-violet-600 active:scale-90 transition-all shrink-0"
                  >
                    <Minus size={14} />
                  </button>
                  <div className="flex-1">
                    <input
                      type="range" min={0} max={100} step={5}
                      value={fuelAmount}
                      onChange={e => setFuelAmount(Number(e.target.value))}
                      className="w-full accent-violet-500"
                    />
                    <div className="flex justify-between text-[9px] font-black text-gray-400 mt-0.5 px-0.5">
                      <span>£0</span><span>£100</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setFuelAmount(a => Math.min(100, a + 5))}
                    className="w-8 h-8 rounded-full bg-white border border-violet-200 flex items-center justify-center text-violet-600 active:scale-90 transition-all shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <div className="bg-white rounded-xl px-3 py-2 flex items-center justify-between border border-violet-100">
                  <span className="text-[10px] font-black text-violet-600">⚡ Fuel Added</span>
                  <span className="text-sm font-black text-violet-700">£{fuelAmount}</span>
                </div>
                {fuelAmount > 0 && (
                  <p className="text-[9px] text-violet-400 font-medium mt-1.5 text-center">
                    5% handling fee on fuel = <span className="font-black">£{fees.fuelCommission.toFixed(2)}</span> platform cut
                  </p>
                )}
              </motion.div>
            )}

            {/* ── Swap Safe Fee Estimator ────────────────────── */}
            {selectedItem && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className="mb-5 bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-100 rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setShowFeeBreakdown(f => !f)}
                  className="w-full flex items-center gap-3 p-4"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <Shield size={15} className="text-emerald-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Swap Safe Guarantee</p>
                    <p className="text-xs font-bold text-stone-600">Both parties covered up to £300</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-emerald-700">£{fees.totalSwapSafe.toFixed(2)}</span>
                    <ChevronDown
                      size={14}
                      className={`text-emerald-600 transition-transform ${showFeeBreakdown ? 'rotate-180' : ''}`}
                    />
                  </div>
                </button>

                {showFeeBreakdown && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2 border-t border-emerald-100 pt-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Base Trust Fee</span>
                        <span className="font-black text-gray-900">£{fees.escrowBase.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-500 font-medium">Valuation Escrow (2.5% avg value)</span>
                        <span className="font-black text-gray-900">£{fees.escrowPct.toFixed(2)}</span>
                      </div>
                      {fuelAmount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500 font-medium">Fuel Handling (5% × £{fuelAmount})</span>
                          <span className="font-black text-gray-900">£{fees.fuelCommission.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs border-t border-emerald-100 pt-2 mt-2">
                        <span className="font-black text-emerald-700">Total Platform Fee</span>
                        <span className="font-black text-emerald-700">£{fees.totalPlatformFee.toFixed(2)}</span>
                      </div>
                      <div className="flex items-start gap-1.5 mt-2 bg-emerald-100/60 rounded-xl p-2.5">
                        <Info size={11} className="text-emerald-600 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-emerald-600 font-medium leading-relaxed">
                          Fee is split equally between both traders. Includes package tracking, identity verification check & £300 damage/loss protection.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>
        )}

        {/* ── Send Offer CTA ─────────────────────────────────── */}
        {myItems.length > 0 && (
          <div className="px-6 pb-8 pt-2 shrink-0 border-t border-gray-100 bg-white">
            <button
              onClick={placeBid}
              disabled={!selectedItem}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-cyan-500/25 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Zap size={16} className="fill-white" />
              {selectedItem
                ? `Send Offer${fuelAmount > 0 ? ` + £${fuelAmount} Fuel` : ''}`
                : 'Select an item to offer'}
            </button>
            {selectedItem && (
              <p className="text-center text-gray-400 text-[10px] font-medium mt-2">
                Swap Safe fee of <span className="font-black text-gray-600">£{fees.totalSwapSafe.toFixed(2)}</span> split between both traders
              </p>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default React.memo(BiddingDrawer);
