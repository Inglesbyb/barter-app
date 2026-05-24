import React, { useState, useEffect } from 'react';
import { Zap } from 'lucide-react';
import { supabase } from '../supabase';

const IncomingOffersView = ({ user, showToast, setCurrentView, setMatchData }) => {
  const [offers, setOffers] = useState([]);
  const [sentOffers, setSentOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  const fetchOffers = async () => {
    setLoading(true);
    const [{ data: received }, { data: sent }] = await Promise.all([
      supabase.from('bids').select(`*, bidder:bidder_id(username, avatar_url), item_offered:item_offered_id(*), item_wanted:item_wanted_id(*)`).eq('receiver_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
      supabase.from('bids').select(`*, receiver:receiver_id(username, avatar_url), item_offered:item_offered_id(*), item_wanted:item_wanted_id(*)`).eq('bidder_id', user.id).in('status', ['pending', 'accepted', 'declined']).order('created_at', { ascending: false })
    ]);
    setOffers(received || []);
    setSentOffers(sent || []);
    setLoading(false);
  };

  useEffect(() => { fetchOffers(); }, [user]);

  const handleAccept = async (offer) => {
    const { error } = await supabase.from('bids').update({ status: 'accepted' }).eq('id', offer.id);
    if (!error) {
      await Promise.all([
        supabase.from('items').update({ status: 'swapped' }).eq('id', offer.item_offered_id),
        supabase.from('items').update({ status: 'swapped' }).eq('id', offer.item_wanted_id),
      ]);
      showToast("Offer Accepted!", "success");
      setMatchData({ user_id: offer.bidder_id, title: offer.item_wanted.title, profiles: offer.bidder });
      setCurrentView('chat');
    }
  };

  const handleDecline = async (offerId) => {
    await supabase.from('bids').update({ status: 'declined' }).eq('id', offerId);
    showToast("Offer declined", "error");
    fetchOffers();
  };

  const getTimeBadge = (createdAt) => {
    const hrs = Math.floor((Date.now() - new Date(createdAt).getTime()) / 3600000);
    const remaining = 48 - hrs;
    if (remaining <= 0) return { text: 'Expired', color: 'text-gray-400 bg-gray-100 border-gray-200' };
    if (remaining <= 6) return { text: remaining + 'h left', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    if (remaining <= 24) return { text: remaining + 'h left', color: 'text-amber-600 bg-amber-50 border-amber-200' };
    return { text: hrs + 'h ago', color: 'text-gray-500 bg-gray-50 border-gray-200' };
  };

  const getStatusBadge = (status) => {
    if (status === 'accepted') return { text: 'Accepted', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    if (status === 'declined') return { text: 'Declined', color: 'text-rose-600 bg-rose-50 border-rose-200' };
    return { text: 'Pending', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  };

  const currentList = activeTab === 'received' ? offers : sentOffers;

  return (
    <div className="w-full h-full flex flex-col bg-slate-50 scroll-container safe-area-bottom pb-32">
      <div className="px-6 py-5 border-b bg-white sticky top-0 z-10">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Offers</h2>
        <div className="flex gap-2 mt-3">
          {[{ id: 'received', label: 'Received (' + offers.length + ')' }, { id: 'sent', label: 'Sent (' + sentOffers.length + ')' }].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === t.id ? 'bg-gray-900 text-white shadow-lg' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
            >{t.label}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-10">
          {currentList.map(offer => {
            const isReceived = activeTab === 'received';
            const otherUser = isReceived ? offer.bidder : offer.receiver;
            const timeBadge = isReceived ? getTimeBadge(offer.created_at) : getStatusBadge(offer.status);
            return (
            <div key={offer.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-gray-100 overflow-hidden shrink-0">
                  <img src={otherUser?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (isReceived ? offer.bidder_id : offer.receiver_id)} className="w-full h-full object-cover" alt="avatar" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-400 font-bold block leading-none mb-1">{isReceived ? 'OFFER FROM' : 'SENT TO'}</span>
                  <span className="font-black text-gray-900">{otherUser?.username || 'Trader'}</span>
                </div>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full border ${timeBadge.color}`}>{timeBadge.text}</span>
              </div>
              <div className="bg-cyan-50/50 rounded-2xl p-4 flex flex-col gap-2 border border-cyan-100">
                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">{isReceived ? 'FOR YOUR ITEM' : 'YOU WANT'}</p>
                <div className="flex items-center gap-3">
                  <img src={offer.item_wanted?.image_url} className="w-12 h-12 rounded-lg object-cover border border-cyan-100 shadow-sm" alt="wanted" />
                  <p className="font-bold text-gray-800">{offer.item_wanted?.title}</p>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{isReceived ? 'OFFERING THEIR' : 'YOU OFFERED'}</p>
                <div className="flex items-center gap-3">
                  <img src={offer.item_offered?.image_url} className="w-20 h-20 rounded-xl object-cover border border-white shadow-sm" alt="offered" />
                  <div className="flex-1">
                    <p className="font-black text-gray-900 text-lg leading-tight">{offer.item_offered?.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{offer.item_offered?.description}</p>
                  </div>
                </div>
              </div>
              {isReceived && (
                <div className="flex gap-3 mt-2">
                  <button onClick={() => handleAccept(offer)} className="flex-1 py-3.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-2xl font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-all">Accept</button>
                  <button onClick={() => handleDecline(offer.id)} className="flex-1 py-3.5 bg-white text-gray-400 border border-gray-200 rounded-2xl font-black hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 active:scale-95 transition-all">Decline</button>
                </div>
              )}
            </div>
            );
          })}
          {currentList.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-50">
              <Zap size={64} className="text-gray-200 mb-6" />
              <p className="text-gray-900 font-black text-xl">{activeTab === 'received' ? 'No offers yet' : 'No sent offers'}</p>
              <p className="text-sm text-gray-500 mt-2 max-w-[200px]">{activeTab === 'received' ? 'Keep your items active to attract traders!' : 'Swipe right on items you like to send offers!'}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(IncomingOffersView);
