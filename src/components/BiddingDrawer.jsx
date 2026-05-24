import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Upload, PackageOpen } from 'lucide-react';
import { supabase } from '../supabase';

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

export default React.memo(BiddingDrawer);
