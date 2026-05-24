import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Leaf, Link2, Shield, Crown, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';
import { getCO2 } from '../taxonomy';

const ChainDiscoveryCard = ({ chain, userId, onAccepted, showToast }) => {
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted]   = useState(false);

  const steps     = chain.chain;
  const myStep    = steps.find(s => s.user_id === userId);
  const totalParts = steps.length;

  const co2Total  = steps.reduce((sum, s) =>
    sum + (getCO2(null, s.gives_item?.sub_category) || 0), 0);

  // ── Swap Safe compounded fee for full chain ──────────────
  const avgValue      = steps.reduce((s, p) => s + (p.gives_item?.estimated_value || 0), 0) / totalParts;
  const perPersonFee  = 0.99 + avgValue * 0.025;
  const totalChainFee = perPersonFee * totalParts;

  const handleAccept = async () => {
    setAccepting(true);
    try {
      const participantIds = steps.map(s => s.user_id);
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
          chain_data:      chain,
          participant_ids: participantIds,
          acceptances:     [userId]
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
      {/* ── Header ── */}
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

      {/* ── Chain visualization ── */}
      <div className="px-5 py-4">
        {steps.map((step, idx) => {
          const isMe  = step.user_id === userId;
          const isPro = step.is_pro; // set on participants who have SwitchR Pro

          return (
            <div key={step.user_id}>
              <div className={`flex items-center gap-3 py-2 px-3 rounded-2xl relative ${
                isMe ? 'bg-violet-50 border border-violet-200' : 'bg-stone-50'
              }`}>
                {/* Pro gold ring on avatar */}
                <div className="relative shrink-0">
                  {isPro && (
                    <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 opacity-70 blur-[2px]" />
                  )}
                  <img
                    src={step.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${step.user_id}`}
                    className={`relative w-9 h-9 rounded-full border-2 shadow-sm ${
                      isPro ? 'border-amber-400' : 'border-white'
                    }`}
                    alt={step.username}
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs font-black text-stone-900 truncate">
                      {isMe ? 'You' : step.username}
                    </p>
                    {isPro && (
                      <span className="inline-flex items-center gap-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                        <Crown size={7} />PRO
                      </span>
                    )}
                  </div>
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
          );
        })}
        {/* Close the loop arrow */}
        <div className="flex items-center gap-2 pl-7 pt-1">
          <Link2 size={12} className="text-violet-400" />
          <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
            → back to {myStep?.user_id === userId ? 'you' : myStep?.username} · loop complete
          </span>
        </div>
      </div>

      {/* ── Swap Safe Guarantee Banner ── */}
      <div className="mx-5 mb-4 bg-gradient-to-r from-emerald-50 to-cyan-50 border border-emerald-100 rounded-2xl p-3.5 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <Shield size={15} className="text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Swap Safe Certified</p>
            <CheckCircle2 size={10} className="text-emerald-600 shrink-0" />
          </div>
          <p className="text-[10px] text-emerald-600 font-medium leading-tight">
            All {totalParts} traders covered up to £300 each · Shipping tracked
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider">Total Fee</p>
          <p className="text-sm font-black text-emerald-700">£{totalChainFee.toFixed(2)}</p>
        </div>
      </div>

      {/* ── Fee compound detail ── */}
      <div className="mx-5 mb-4 bg-stone-50 rounded-2xl p-3 flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-stone-400">Platform Revenue this Chain</p>
          <p className="text-[10px] text-stone-500 font-medium">£{perPersonFee.toFixed(2)} × {totalParts} traders</p>
        </div>
        <p className="text-base font-black text-stone-800">£{totalChainFee.toFixed(2)}</p>
      </div>

      {/* ── Accept button ── */}
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

export default React.memo(ChainDiscoveryCard);
