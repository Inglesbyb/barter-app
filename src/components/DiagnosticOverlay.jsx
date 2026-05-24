import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { supabase } from '../supabase';

const TEST_USERS = [
  { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', name: 'Alice_Test', color: 'bg-cyan-500',   desc: 'Has Guitar, wants Coffee Machine' },
  { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', name: 'Bob_Test',   color: 'bg-violet-500', desc: 'Has Coffee Machine, wants Smart TV' },
  { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', name: 'Carol_Test', color: 'bg-emerald-500',desc: 'Has Smart TV, wants Guitar' },
];

const DiagnosticOverlay = ({ onClose }) => {
  const [running, setRunning]   = useState(false);
  const [results, setResults]   = useState(null);
  const [targetId, setTargetId] = useState(TEST_USERS[0].id);
  const [error, setError]       = useState(null);

  const runCheck = async () => {
    setRunning(true); setError(null); setResults(null);
    console.group('%c🔗 Chain Engine Diagnostic', 'color: violet; font-weight: bold; font-size: 14px');
    console.log('Calling find_trade_chains for user:', targetId);
    try {
      const { data, error: rpcErr } = await supabase.rpc('find_trade_chains', { p_user_id: targetId });
      if (rpcErr) throw rpcErr;
      console.log('✅ Raw RPC result:', data);
      console.log('Chain count:', Array.isArray(data) ? data.length : 'unexpected type');
      if (Array.isArray(data) && data.length > 0) {
        data.forEach((c, i) => {
          console.group(`Chain ${i + 1} (${c.type})`);
          c.chain.forEach(step => console.log(`  ${step.username} gives ${step.gives_item?.title} → ${step.gives_to}`));
          console.groupEnd();
        });
      }
      setResults(data);
    } catch (e) {
      console.error('❌ RPC failed:', e.message);
      setError(e.message);
    } finally {
      setRunning(false);
      console.groupEnd();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999] flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-stone-950 rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">Dev Tool</p>
            <h3 className="text-white font-black text-lg">Chain Engine Diagnostic</h3>
          </div>
          <button onClick={onClose} className="p-2 text-stone-500 hover:text-white transition-colors"><X size={18}/></button>
        </div>

        {/* Target user selector */}
        <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">Run as test user</p>
        <div className="flex flex-col gap-2 mb-5">
          {TEST_USERS.map(u => (
            <button
              key={u.id}
              onClick={() => setTargetId(u.id)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                targetId === u.id ? 'border-violet-500 bg-violet-500/10' : 'border-stone-800 hover:border-stone-600'
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${u.color} flex items-center justify-center text-white text-xs font-black shrink-0`}>
                {u.name[0]}
              </div>
              <div>
                <p className="text-white font-black text-sm leading-none">{u.name}</p>
                <p className="text-stone-500 text-[10px] font-medium mt-0.5">{u.desc}</p>
                <p className="text-stone-700 text-[9px] font-mono mt-0.5 truncate">{u.id}</p>
              </div>
              {targetId === u.id && <span className="ml-auto text-violet-400 text-xs font-black">▶ Active</span>}
            </button>
          ))}
        </div>

        {/* Run button */}
        <button
          onClick={runCheck}
          disabled={running}
          className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black text-sm mb-4 disabled:opacity-50 transition-all active:scale-[0.98]"
        >
          {running ? '⏳ Running RPC...' : '🔬 Run Algorithm Check'}
        </button>

        {/* Results */}
        {error && (
          <div className="bg-rose-950 border border-rose-700 rounded-xl p-4 mb-3">
            <p className="text-rose-400 font-black text-xs">❌ Error</p>
            <p className="text-rose-300 text-xs font-mono mt-1 break-all">{error}</p>
            <p className="text-rose-500 text-[10px] mt-2">Did you run chain_engine_fixed.sql and seed_test_data.sql?</p>
          </div>
        )}

        {results !== null && (
          <div>
            <p className="text-[10px] font-black text-stone-500 uppercase tracking-widest mb-2">
              Result: {Array.isArray(results) ? results.length : '?'} chain(s) found
            </p>
            {Array.isArray(results) && results.length === 0 && (
              <div className="bg-amber-950 border border-amber-800 rounded-xl p-4 mb-3">
                <p className="text-amber-400 font-black text-xs">⚠ No chains returned</p>
                <p className="text-amber-300 text-[10px] mt-1">Verify seed data ran and wishlist_items JSON matches item sub_category exactly.</p>
              </div>
            )}
            {Array.isArray(results) && results.map((chain, i) => (
              <div key={i} className="bg-stone-900 border border-stone-700 rounded-xl p-4 mb-3">
                <p className="text-violet-400 font-black text-xs mb-2">✅ Chain {i+1} — {chain.type}</p>
                {chain.chain?.map((step, j) => (
                  <div key={j} className="flex items-center gap-2 mb-1">
                    <span className="text-stone-400 text-[10px] w-4">{j+1}.</span>
                    <span className="text-white text-xs font-bold">{step.username}</span>
                    <span className="text-stone-500 text-[10px]">gives</span>
                    <span className="text-cyan-400 text-xs font-bold">{step.gives_item?.title}</span>
                    <span className="text-stone-500 text-[10px]">→ {step.gives_to}</span>
                  </div>
                ))}
              </div>
            ))}
            {/* Raw JSON toggle */}
            <details className="mt-2">
              <summary className="text-[10px] font-black text-stone-600 uppercase tracking-widest cursor-pointer hover:text-stone-400">Raw JSON output</summary>
              <pre className="mt-2 text-[9px] text-stone-400 bg-stone-900 p-3 rounded-xl overflow-x-auto font-mono leading-relaxed">{JSON.stringify(results, null, 2)}</pre>
            </details>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default React.memo(DiagnosticOverlay);
