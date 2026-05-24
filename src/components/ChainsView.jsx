import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { supabase } from '../supabase';
import ChainDiscoveryCard from './ChainDiscoveryCard';

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

export default React.memo(ChainsView);
