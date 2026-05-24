import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';

const ChatView = ({ user, matchData, setCurrentView, showToast }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const matchId = [user.id, matchData?.user_id].sort().join('_');

  useEffect(() => {
    if (!matchData) return;
    
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages').select('*').eq('match_id', matchId).order('created_at', { ascending: true });
      if (data) {
        const systemMsgs = [];
        // Eco-impact planet-win bubble
        const myItemCO2 = Number(matchData?.my_item_co2 || 0);
        const theirItemCO2 = Number(matchData?.their_item_co2 || 0);
        const totalCO2 = myItemCO2 + theirItemCO2;
        if (totalCO2 > 0) {
          systemMsgs.push({ id: 'eco', sender_id: 'system', content: `🌱 Planet Win! Swapping these items will save approximately ${totalCO2}kg of CO₂ compared to buying new.` });
        } else {
          systemMsgs.push({ id: 'system', sender_id: 'system', content: "You both liked each other's items! Start the conversation." });
        }
        setMessages(data.length === 0 ? systemMsgs : data);
      }
      setLoading(false);
    };
    
    fetchMessages();

    const channel = supabase.channel(`messages_${matchId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` }, (payload) => {
        setMessages(prev => [...prev.filter(m => m.id !== 'system'), payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchData, user.id]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msg = newMessage.trim();
    setNewMessage('');
    
    await supabase.from('messages').insert([{
      match_id: matchId,
      sender_id: user.id,
      receiver_id: matchData.user_id,
      content: msg
    }]);
  };

  const markAsSwapped = async () => {
    if (!window.confirm("Are you sure? This will mark the item as swapped and prompt for ratings.")) return;
    
    // Fetch both items involved in this match to calculate combined CO2
    const { data: myItems } = await supabase.from('items').select('id, co2_saved_kg').eq('user_id', user.id);
    let myCO2 = 0;
    let theirItemId = null;

    if (myItems && myItems.length > 0) {
      const myItemIds = myItems.map(i => i.id);
      const { data: theirSwipes } = await supabase.from('swipes').select('item_id').eq('swiper_id', matchData.user_id).in('item_id', myItemIds).eq('direction', 'right').limit(1);
      if (theirSwipes && theirSwipes.length > 0) {
        theirItemId = theirSwipes[0].item_id;
        await supabase.from('items').update({ status: 'swapped' }).eq('id', theirItemId).eq('user_id', user.id);
        const matchedItem = myItems.find(i => i.id === theirItemId);
        myCO2 = Number(matchedItem?.co2_saved_kg || 0);
      }
    }

    // Fetch their item's CO2
    let theirCO2 = 0;
    if (matchData.item_offered_id) {
      const { data: theirItem } = await supabase.from('items').select('co2_saved_kg').eq('id', matchData.item_offered_id).maybeSingle();
      theirCO2 = Number(theirItem?.co2_saved_kg || 0);
    }
    const combinedCO2 = myCO2 + theirCO2;

    showToast("Your item was marked as swapped!", "success");
    
    const score = window.prompt("Rate this user from 1 to 5 stars:");
    if (score && !isNaN(score) && score >= 1 && score <= 5) {
      const parsedScore = parseInt(score);
      await supabase.from('ratings').insert([{
        rater_id: user.id,
        ratee_id: matchData.user_id,
        match_id: matchId,
        score: parsedScore
      }]);

      // Update recipient's profile stats + CO2
      const { data: theirProfile } = await supabase.from('profiles').select('trades_completed, rating, total_carbon_saved').eq('id', matchData.user_id).single();
      if (theirProfile) {
        const newTotal = (theirProfile.trades_completed || 0) + 1;
        const newRating = theirProfile.rating ? ((Number(theirProfile.rating) * (newTotal - 1)) + parsedScore) / newTotal : parsedScore;
        await supabase.from('profiles').update({ 
          trades_completed: newTotal, 
          rating: Number(newRating.toFixed(1)),
          total_carbon_saved: Number(theirProfile.total_carbon_saved || 0) + combinedCO2
        }).eq('id', matchData.user_id);
      }

      // Update current user's CO2 too
      const { data: myProfile } = await supabase.from('profiles').select('total_carbon_saved').eq('id', user.id).single();
      if (myProfile) {
        await supabase.from('profiles').update({
          total_carbon_saved: Number(myProfile.total_carbon_saved || 0) + combinedCO2
        }).eq('id', user.id);
      }

      if (combinedCO2 > 0) showToast(`🌱 Together you saved ${combinedCO2}kg of CO₂!`, 'success');
      showToast("Rating submitted! Thank you.", "success");
    }
    
    setCurrentView('swipe');
  };

  if (!matchData) return null;

  return (
    <div className="w-full h-full flex flex-col bg-gray-50 absolute inset-0 z-50">
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('swipe')} className="p-2 text-gray-400 hover:text-cyan-600 rounded-full hover:bg-cyan-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
            <img src={matchData.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${matchData.user_id}`} alt="User" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm truncate max-w-[120px]">{matchData.profiles?.username || 'Trader'}</h3>
            <p className="text-xs text-cyan-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={12} /> Trading
            </p>
          </div>
        </div>
        <button onClick={markAsSwapped} className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-50 text-emerald-600 px-3 py-2 rounded-full hover:bg-emerald-100 transition-colors border border-emerald-200">
          Mark Swapped
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={msg.id || idx} className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.sender_id === 'system' ? 'bg-yellow-50 text-yellow-800 border border-yellow-200 mx-auto text-center font-semibold' : msg.sender_id === user.id ? 'bg-cyan-500 text-white ml-auto' : 'bg-white border border-gray-100 text-gray-800 mr-auto'}`}>
              {msg.content}
            </div>
          ))
        )}
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-100 flex items-center gap-2 shrink-0">
        <input 
          type="text" 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..." 
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm font-medium"
        />
        <button type="submit" disabled={!newMessage.trim()} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${newMessage.trim() ? 'bg-cyan-500 text-white hover:bg-cyan-600 shadow-md shadow-cyan-500/30' : 'bg-gray-100 text-gray-400'}`}>
          <Send size={18} className="ml-0.5" />
        </button>
      </form>
    </div>
  );
};

export default React.memo(ChatView);
