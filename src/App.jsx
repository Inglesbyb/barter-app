import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion';
import { Heart, X, MapPin, Undo2, Zap, Upload, PackageOpen, MessageCircle, ArrowLeft, Send, Search, Trash2, Edit2, Star, Tag, BadgeCheck, CheckCircle2 } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, Circle } from '@react-google-maps/api';
import { supabase } from './supabase';

const mapContainerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '16px'
};

const googleMapsLibraries = ['places', 'geometry'];

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c;
};

const ReelItem = ({ item, onSwap }) => {
  return (
    <div className="snap-start w-full h-full relative shrink-0 flex flex-col bg-black">
      <div className="flex-1 relative w-full overflow-hidden">
        <img 
          src={item.image_url || "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=800&q=80"} 
          className="w-full h-full object-cover" 
          alt={item.title} 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />
        
        {/* Item Info Overlay */}
        <div className="absolute bottom-8 left-4 right-16 text-white z-10 pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-cyan-500 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm">
              {item.category || 'Item'}
            </span>
            <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold">
              <MapPin size={10} />
              {item.calculatedDistance?.toFixed(1) || 'Nearby'} km
            </div>
          </div>
          <h2 className="text-2xl font-black mb-1 drop-shadow-lg tracking-tight leading-none">{item.title}</h2>
          <p className="text-xs text-gray-300 line-clamp-2 font-medium drop-shadow-md mb-4">{item.description}</p>
          
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/10 w-fit">
            <span className="text-[10px] text-cyan-400 font-black uppercase tracking-tighter">Looking For:</span>
            <span className="text-[10px] font-bold text-white truncate max-w-[150px]">{item.looking_for || 'Open to offers'}</span>
          </div>
        </div>

        {/* Vertical Action Bar */}
        <div className="absolute right-4 bottom-10 flex flex-col gap-6 items-center z-20">
          <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden shadow-lg">
            <img src={item.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user_id}`} alt="avatar" />
          </div>
          
          <button onClick={() => onSwap(item)} className="w-14 h-14 rounded-full bg-cyan-500 flex items-center justify-center shadow-xl shadow-cyan-500/40 hover:scale-110 active:scale-95 transition-all text-white group">
            <Zap size={28} className="fill-white animate-pulse" />
          </button>
          
          <div className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
              <Heart size={24} />
            </div>
            <span className="text-[10px] text-white font-bold">Save</span>
          </div>
        </div>
      </div>
    </div>
  );
};

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

const IncomingOffersView = ({ user, showToast, setCurrentView, setMatchData }) => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOffers = async () => {
    const { data } = await supabase
      .from('bids')
      .select(`
        *,
        bidder:bidder_id(username, avatar_url),
        item_offered:item_offered_id(*),
        item_wanted:item_wanted_id(*)
      `)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setOffers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOffers();
  }, [user]);

  const handleAccept = async (offer) => {
    const { error } = await supabase.from('bids').update({ status: 'accepted' }).eq('id', offer.id);
    if (!error) {
      showToast("Offer Accepted! 🎉", "success");
      setMatchData({ 
        user_id: offer.bidder_id, 
        title: offer.item_wanted.title,
        profiles: offer.bidder
      });
      setCurrentView('chat');
    }
  };

  const handleDecline = async (offerId) => {
    await supabase.from('bids').update({ status: 'declined' }).eq('id', offerId);
    showToast("Offer declined", "error");
    fetchOffers();
  };

  return (
    <div className="w-full h-full flex flex-col bg-slate-50">
      <div className="px-6 py-6 border-b bg-white sticky top-0 z-10">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Incoming Offers</h2>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Pending approval</p>
      </div>
      
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-10">
          {offers.map(offer => (
            <div key={offer.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-gray-100 overflow-hidden shrink-0">
                  <img src={offer.bidder.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                </div>
                <div>
                  <span className="text-xs text-gray-400 font-bold block leading-none mb-1">OFFER FROM</span>
                  <span className="font-black text-gray-900">{offer.bidder.username}</span>
                </div>
              </div>

              <div className="bg-cyan-50/50 rounded-2xl p-4 flex flex-col gap-2 border border-cyan-100">
                <p className="text-[10px] font-black text-cyan-600 uppercase tracking-widest">FOR YOUR ITEM</p>
                <div className="flex items-center gap-3">
                  <img src={offer.item_wanted.image_url} className="w-12 h-12 rounded-lg object-cover border border-cyan-100 shadow-sm" alt="wanted" />
                  <p className="font-bold text-gray-800">{offer.item_wanted.title}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-2 border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">OFFERING THEIR</p>
                <div className="flex items-center gap-3">
                  <img src={offer.item_offered.image_url} className="w-20 h-20 rounded-xl object-cover border border-white shadow-sm" alt="offered" />
                  <div className="flex-1">
                    <p className="font-black text-gray-900 text-lg leading-tight">{offer.item_offered.title}</p>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">{offer.item_offered.description}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button 
                  onClick={() => handleAccept(offer)} 
                  className="flex-1 py-3.5 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-2xl font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
                >
                  Accept
                </button>
                <button 
                  onClick={() => handleDecline(offer.id)}
                  className="flex-1 py-3.5 bg-white text-gray-400 border border-gray-200 rounded-2xl font-black hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 active:scale-95 transition-all"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
          {offers.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-20 opacity-50">
              <Zap size={64} className="text-gray-200 mb-6" />
              <p className="text-gray-900 font-black text-xl">No offers yet</p>
              <p className="text-sm text-gray-500 mt-2 max-w-[200px]">Keep your items active in the reel to attract potential traders!</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const UserProfileModal = ({ profileId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', profileId).single();
      const { data: i } = await supabase.from('items').select('*').eq('user_id', profileId).eq('status', 'active');
      setProfile(p);
      setItems(i || []);
      setLoading(false);
    };
    load();
  }, [profileId]);

  return (
    <div className="absolute inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="w-full max-w-md bg-white rounded-t-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4 shrink-0" />
        {loading ? (
          <div className="flex-1 flex items-center justify-center pb-10">
            <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : profile ? (
          <div className="overflow-y-auto flex-1 pb-8">
            <div className="px-6 pb-5 flex items-center gap-4 border-b border-gray-100">
              <img src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} className="w-16 h-16 rounded-full border-2 border-cyan-200 shadow-md" alt="avatar" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-gray-900">{profile.username || 'Anonymous'}</h2>
                  {profile.accepted_terms && <BadgeCheck size={18} className="text-cyan-500" />}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={13} className={s <= Math.round(profile.average_rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{profile.total_swaps || 0} swaps completed</span>
                </div>
              </div>
            </div>
            <div className="px-6 pt-4">
              <h3 className="text-sm font-extrabold text-gray-700 uppercase tracking-wider mb-3">Active Listings ({items.length})</h3>
              {items.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-6">No active listings</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {items.map(item => (
                    <div key={item.id} className="aspect-square rounded-xl overflow-hidden bg-gray-100 relative group">
                      <img src={item.image_url || 'https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=200&q=80'} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-1.5">
                        <span className="text-white text-[10px] font-bold leading-tight truncate">{item.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : <p className="p-8 text-center text-gray-400">Profile not found</p>}
      </motion.div>
    </div>
  );
};

const InventoryView = ({ user, showToast, onSignOut }) => {
  const [title, setTitle] = useState('');
  const [condition, setCondition] = useState('Brand New');
  const [category, setCategory] = useState('Electronics');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [description, setDescription] = useState('');
  const [postSuccess, setPostSuccess] = useState(false);
  const myItemsRef = React.useRef(null);
  const [lookingFor, setLookingFor] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [location, setLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  
  const [myItems, setMyItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [editingItemId, setEditingItemId] = useState(null);

  const handleEdit = (item) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setCondition(item.condition);
    setCategory(item.category);
    setEstimatedValue(item.estimated_value || '');
    setDescription(item.description || '');
    setLookingFor(item.looking_for || '');
    setImagePreview(item.image_url);
    setImageFile(null);
    if (item.lat && item.lng) {
      setLocation({ lat: item.lat, lng: item.lng });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchMyItems = async () => {
    setLoadingItems(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setMyItems(data);
    }
    setLoadingItems(false);
  };

  useEffect(() => {
    fetchMyItems();
  }, [user]);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Auto-location failed", err)
      );
    }
  }, []);

  const handleGetLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setIsLocating(false);
        },
        (err) => {
          console.error(err);
          showToast("Failed to get location. Enable location services.", 'error');
          setIsLocating(false);
        }
      );
    } else {
      showToast("Geolocation not supported.", 'error');
      setIsLocating(false);
    }
  };

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            setImageFile(compressedFile);
            setImagePreview(URL.createObjectURL(compressedFile));
          }, 'image/jpeg', 0.8);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !user.id) return showToast('Authentication error.', 'error');
    if (!title) return showToast('Please enter a title', 'error');

    setIsSubmitting(true);

    try {
      let image_url = null;
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, imageFile);
          
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('item-images').getPublicUrl(fileName);
        image_url = publicUrlData.publicUrl;
      }

      const parsedEstimatedValue = estimatedValue ? estimatedValue.toString().replace(/[^0-9.]/g, '') : null;
      
      const itemData = {
        title, 
        condition, 
        category, 
        estimated_value: parsedEstimatedValue, 
        description, 
        looking_for: lookingFor, 
        user_id: user.id, 
        image_url: image_url || imagePreview, 
        lat: location?.lat || null, 
        lng: location?.lng || null, 
        status: 'active'
      };

      if (editingItemId) {
        const { error } = await supabase.from('items').update(itemData).eq('id', editingItemId);
        if (error) throw error;
        showToast('Item updated! ✨', 'success');
        setEditingItemId(null);
      } else {
        const { error } = await supabase.from('items').insert([itemData]);
        if (error) throw error;
        showToast('Item successfully posted! 🎉', 'success');
      }

      setTitle(''); setCondition('Brand New'); setCategory('Electronics'); setEstimatedValue(''); setDescription(''); setLookingFor(''); setImageFile(null); setImagePreview(null); setEditingItemId(null);
      setPostSuccess(true);
      fetchMyItems();
      setTimeout(() => {
        myItemsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setPostSuccess(false);
      }, 400);
    } catch (error) {
      console.error("Item creation error:", error);
      showToast('Failed to add item: ' + (error?.message || 'Unknown error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      if (item.image_url) {
        const fileName = item.image_url.split('/').pop();
        await supabase.storage.from('item-images').remove([fileName]);
      }
      await supabase.from('items').delete().eq('id', item.id).eq('user_id', user.id);
      showToast('Item deleted successfully!', 'success');
      fetchMyItems();
    } catch (err) {
      showToast('Failed to delete item.', 'error');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full h-full flex flex-col gap-6 overflow-y-auto pb-8 pt-2 scrollbar-hide"
    >
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-extrabold text-gray-900 mb-5 flex items-center gap-2">
          <PackageOpen className="text-cyan-500" size={24} />
          Add New Item
        </h2>
        
        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Nintendo Switch" 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Category</label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-gray-700 appearance-none"
              >
                <option>Electronics</option>
                <option>Fashion</option>
                <option>Home</option>
                <option>Hobbies</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Condition</label>
              <select 
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-gray-700 appearance-none"
              >
                <option>Brand New</option>
                <option>Like New</option>
                <option>Good</option>
                <option>Fair</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Est. Value (Optional)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm pointer-events-none">£</span>
              <input 
              type="number" 
              min="0"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
              placeholder="0" 
              className="w-full pl-8 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium" 
            />
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item..." 
              rows={3} 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none font-medium"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Looking For</label>
            <textarea 
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              placeholder="What do you want in exchange?" 
              rows={2} 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all resize-none font-medium"
            ></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Location</label>
            {location ? (
              <div className="flex items-center gap-2 p-3.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200 font-medium">
                <MapPin size={20} /> Coordinates Captured
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGetLocation}
                disabled={isLocating}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
              >
                <MapPin size={20} />
                {isLocating ? 'Locating...' : 'Set Current Location'}
              </button>
            )}
          </div>
          <div className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Photo</label>
            <label className="border-2 border-dashed border-cyan-200 rounded-xl p-8 flex flex-col items-center justify-center bg-cyan-50/30 cursor-pointer hover:bg-cyan-50/80 transition-all group overflow-hidden relative min-h-[200px]">
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/webp" 
                onChange={handleImageChange}
                className="hidden" 
              />
              {imagePreview ? (
                <div className="absolute inset-0 w-full h-full">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white font-bold bg-black/50 px-4 py-2 rounded-full flex items-center gap-2">
                      <Upload size={16} /> Change Photo
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 bg-white shadow-sm text-cyan-600 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={24} strokeWidth={2.5} />
                  </div>
                  <span className="text-sm font-bold text-cyan-700">Upload Photo</span>
                  <span className="text-xs text-cyan-600/60 mt-1 font-medium">Any size — auto-optimised</span>
                </>
              )}
            </label>
          </div>
          <div className="flex gap-3 mt-2">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`flex-1 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(6,182,212,0.5)] active:scale-[0.98] transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-[0_12px_25px_-6px_rgba(6,182,212,0.6)]'}`}
            >
              {isSubmitting ? 'Processing...' : (editingItemId ? 'Update Item' : 'Post Item')}
            </button>
            {editingItemId && (
              <button 
                type="button"
                onClick={() => {
                  setEditingItemId(null);
                  setTitle(''); setCondition('Brand New'); setCategory('Electronics'); setEstimatedValue(''); setDescription(''); setLookingFor(''); setImageFile(null); setImagePreview(null);
                }}
                className="px-6 py-4 rounded-xl bg-gray-100 text-gray-600 font-bold hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div ref={myItemsRef} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all duration-500 ${postSuccess ? 'border-cyan-300 shadow-cyan-100 shadow-lg' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-gray-900">My Items</h2>
          {postSuccess && <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full animate-pulse">✓ Just posted!</span>}
        </div>
        {loadingItems ? (
          <div className="flex-col gap-4 flex">
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-4 p-3 border border-gray-100 rounded-2xl items-center animate-pulse">
                <div className="w-16 h-16 rounded-xl bg-gray-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : myItems.length === 0 ? (
          <motion.div
            className="w-full flex flex-col items-center justify-center py-10 text-center gap-4" key="empty-state">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <PackageOpen size={28} className="text-gray-300" />
            </div>
            <p className="text-gray-500 font-bold text-sm">No items yet</p>
            <p className="text-gray-400 text-xs mt-1">Use the form above to post your first item!</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {myItems.map(item => (
              <div key={item.id} className="flex gap-4 p-3 border border-gray-100 rounded-2xl items-center hover:border-cyan-200 hover:bg-cyan-50/30 hover:shadow-sm transition-all duration-200 group relative pr-24">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 shrink-0">
                  <img src={item.image_url || "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?auto=format&fit=crop&w=200&q=80"} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <h3 className="font-bold text-gray-900 text-sm truncate">{item.title}</h3>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{item.condition || 'No condition set'}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                      item.status === 'swapped' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-cyan-100 text-cyan-700'
                    }`}>{item.status === 'swapped' ? '✅ Swapped' : '🟢 Active'}</span>
                    {item.category && <span className="text-[10px] text-gray-500 font-bold bg-gray-100 px-2 py-0.5 rounded-full">{item.category}</span>}
                  </div>
                </div>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                  <button onClick={() => handleEdit(item)} className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors">
                    <Edit2 size={15} />
                  </button>
                  <button onClick={() => handleDelete(item)} className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-8 pt-4 border-t border-gray-100 flex items-center justify-between">
          <button onClick={() => alert("SwitchR is a matching platform only. All meetups are the sole responsibility of the users. Meet in public, tell a friend, and stay safe.")} className="text-xs font-bold text-gray-400 hover:text-cyan-600 transition-colors underline">View Safety Terms & Conditions</button>
          <button onClick={onSignOut} className="text-xs font-bold text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1">
            Sign Out
          </button>
        </div>
      </div>
    </motion.div>
  );
};

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
        if (data.length === 0) {
          setMessages([{ id: 'system', sender_id: 'system', content: "You both liked each other's items! Start the conversation." }]);
        } else {
          setMessages(data);
        }
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
    
    const { data: myItems } = await supabase.from('items').select('id').eq('user_id', user.id);
    if (myItems && myItems.length > 0) {
      const myItemIds = myItems.map(i => i.id);
      const { data: theirSwipes } = await supabase.from('swipes').select('item_id').eq('swiper_id', matchData.user_id).in('item_id', myItemIds).eq('direction', 'right').limit(1);
      if (theirSwipes && theirSwipes.length > 0) {
        await supabase.from('items').update({ status: 'swapped' }).eq('id', theirSwipes[0].item_id).eq('user_id', user.id);
      }
    }
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

      const { data: profile } = await supabase.from('profiles').select('total_swaps, average_rating').eq('id', matchData.user_id).single();
      if (profile) {
        const newTotal = (profile.total_swaps || 0) + 1;
        const newAvg = profile.average_rating ? ((profile.average_rating * profile.total_swaps) + parsedScore) / newTotal : parsedScore;
        await supabase.from('profiles').update({ total_swaps: newTotal, average_rating: Number(newAvg.toFixed(1)) }).eq('id', matchData.user_id);
      }

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

const AuthView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = isLogin 
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.15),transparent_70%)]" />
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-xl shadow-cyan-500/30 mb-6">
            <Zap size={32} className="text-white fill-white" />
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Switch<span className="text-cyan-500">R</span></h1>
          <p className="text-gray-500 font-medium text-center">The premier barter network for the modern age.</p>
        </div>
        
        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
          />
          <input 
            type="password" 
            placeholder="Password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
          />
          {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg hover:bg-gray-800 transition-all active:scale-[0.98] mt-2 shadow-xl"
          >
            {loading ? 'Processing...' : (isLogin ? 'Login' : 'Join SwitchR')}
          </button>
        </form>
        
        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-8 text-sm font-bold text-gray-400 hover:text-cyan-600 transition-colors uppercase tracking-widest"
        >
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
        </button>
      </motion.div>
    </div>
  );
};

const TermsModal = ({ onAccept }) => {
  return (
    <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[3rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-600" />
        <h2 className="text-3xl font-black text-gray-900 mb-6 tracking-tight">Safety First! 🛡️</h2>
        <div className="space-y-4 text-gray-600 font-medium mb-10">
          <p>SwitchR is a matching platform only. To ensure your safety while bartering:</p>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">1</span></div>
              <span>Always meet in a <b>well-lit public place</b> (coffee shops, police station lobbies).</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">2</span></div>
              <span><b>Tell a friend</b> where you're going and share your location.</span>
            </li>
            <li className="flex items-start gap-3">
              <div className="mt-1 w-5 h-5 rounded-full bg-cyan-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-cyan-600 font-black">3</span></div>
              <span><b>Never</b> share personal financial details or home address.</span>
            </li>
          </ul>
        </div>
        <button 
          onClick={onAccept}
          className="w-full py-5 bg-cyan-500 text-white rounded-2xl font-black text-lg hover:bg-cyan-600 shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition-all"
        >
          I Understand & Agree
        </button>
      </motion.div>
    </div>
  );
};

export default function App() {
  const [cards, setCards] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [currentView, setCurrentView] = useState('swipe'); // 'swipe' | 'inventory' | 'chat' | 'offers'
  const [matchData, setMatchData] = useState(null);
  const [biddingOnItem, setBiddingOnItem] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [radius, setRadius] = useState(50);
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: googleMapsLibraries
  });

  useEffect(() => {
    const checkTerms = async (userId) => {
      const { data } = await supabase.from('profiles').select('accepted_terms').eq('id', userId).single();
      if (data && !data.accepted_terms) {
        setShowTermsModal(true);
        setHasAcceptedTerms(false);
      } else {
        setHasAcceptedTerms(true);
        setShowTermsModal(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) checkTerms(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) checkTerms(session.user.id);
    });

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLocationName('Your Location (GPS)');
        },
        (err) => console.log("Location access denied")
      );
    }

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!user) return;
    const fetchItems = async () => {
      setLoadingItems(true);
      let query = supabase
        .from('items')
        .select('*, profiles:user_id(id, username, avatar_url, average_rating, total_swaps, accepted_terms)')
        .or('status.eq.active,status.is.null')
        .neq('user_id', user.id)
        .limit(100);

      if (activeCategory !== 'All') query = query.eq('category', activeCategory);
      if (debouncedSearchQuery) query = query.or(`title.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);

      const { data, error } = await query;
      if (!error) setAllItems(data || []);
      setLoadingItems(false);
    };
    
    if (currentView === 'swipe') fetchItems();
  }, [user, currentView, debouncedSearchQuery, activeCategory]);

  const geocodeLocation = async (query) => {
    if (!query.trim() || !window.google) return;
    setIsGeocoding(true);
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      setIsGeocoding(false);
      if (status === 'OK' && results[0]) {
        const loc = results[0].geometry.location;
        setUserLocation({ lat: loc.lat(), lng: loc.lng() });
        setLocationName(results[0].formatted_address);
        setLocationQuery('');
        showToast(`Location set: ${results[0].formatted_address}`, 'success');
      } else {
        showToast('Location not found.', 'error');
      }
    });
  };

  useEffect(() => {
    if (userLocation && allItems.length > 0) {
      const filtered = allItems.map(item => {
        if (!item.lat || !item.lng) return { ...item, calculatedDistance: null };
        const dist = calculateDistance(userLocation.lat, userLocation.lng, item.lat, item.lng);
        return { ...item, calculatedDistance: dist };
      }).filter(item => item.calculatedDistance !== null && item.calculatedDistance <= radius);
      setCards(filtered);
    } else {
      setCards(allItems);
    }
  }, [allItems, radius, userLocation]);

  if (authLoading) return <div className="min-h-screen bg-neutral-900 flex items-center justify-center"><div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;
  if (!user) return <AuthView />;

  return (
    <div className="h-screen bg-black flex flex-col items-center font-sans overflow-hidden w-full relative">
      <div className="w-full max-w-md bg-white h-screen flex flex-col relative overflow-hidden shadow-2xl">
        <header className="w-full px-6 py-4 flex items-center justify-between z-20 bg-white shadow-sm border-b border-gray-100 sticky top-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('swipe')}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <h1 className="text-2xl font-black text-gray-900">Switch<span className="text-cyan-500">R</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        <main className="flex-1 w-full flex flex-col items-center relative min-h-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {currentView === 'swipe' && (
              <motion.div key="swipe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full h-full flex flex-col">
                <div className="flex-1 w-full bg-black relative snap-y snap-mandatory overflow-y-scroll scrollbar-hide">
                  {cards.length > 0 ? cards.map(item => <ReelItem key={item.id} item={item} onSwap={setBiddingOnItem} />) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white p-10 text-center">
                      <Zap size={64} className="text-cyan-500 mb-6 animate-pulse" />
                      <h2 className="text-2xl font-black mb-2">No items nearby</h2>
                      <p className="text-sm text-gray-400">Expand your radius or search manually.</p>
                      <button onClick={() => setRadius(100)} className="mt-6 px-8 py-3 bg-white text-black rounded-full font-black text-sm">Expand Radius</button>
                    </div>
                  )}
                </div>
                <div className="absolute top-4 left-4 right-4 z-50 flex gap-2 overflow-x-auto scrollbar-hide pointer-events-auto">
                  {['All', 'Electronics', 'Fashion', 'Home', 'Hobbies'].map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)} className={`whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all ${activeCategory === cat ? 'bg-cyan-500 text-white border-cyan-500 shadow-lg' : 'bg-black/40 text-white/70 border-white/10 backdrop-blur-md'}`}>{cat}</button>
                  ))}
                </div>
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-black/50 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-2xl">
                   <MapPin size={12} className="text-cyan-400" />
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">{radius}km</span>
                   <input type="range" min="5" max="100" step="5" value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-cyan-500" />
                </div>
              </motion.div>
            )}
            {currentView === 'offers' && <motion.div key="offers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full flex flex-col"><IncomingOffersView user={user} showToast={showToast} setCurrentView={setCurrentView} setMatchData={setMatchData} /></motion.div>}
            {currentView === 'inventory' && <InventoryView key="inventory" user={user} showToast={showToast} onSignOut={handleSignOut} />}
            {currentView === 'chat' && <ChatView key="chat" user={user} matchData={matchData} setCurrentView={setCurrentView} showToast={showToast} />}
          </AnimatePresence>
        </main>

        {currentView !== 'chat' && (
          <nav className="h-20 bg-white border-t border-gray-100 flex items-center justify-around px-2 z-30 shrink-0">
            <button onClick={() => setCurrentView('swipe')} className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-16 h-16 rounded-2xl ${currentView === 'swipe' ? 'bg-cyan-50 text-cyan-600' : 'text-gray-400 hover:bg-gray-50'}`}><Zap size={22} /><span className="text-[10px] font-black uppercase tracking-tighter">Explore</span></button>
            <button onClick={() => setCurrentView('offers')} className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-16 h-16 rounded-2xl ${currentView === 'offers' ? 'bg-cyan-50 text-cyan-600' : 'text-gray-400 hover:bg-gray-50'}`}><MessageCircle size={22} /><span className="text-[10px] font-black uppercase tracking-tighter">Offers</span></button>
            <button onClick={() => setCurrentView('inventory')} className={`flex flex-col items-center justify-center gap-1.5 transition-all duration-300 w-16 h-16 rounded-2xl ${currentView === 'inventory' ? 'bg-cyan-50 text-cyan-600' : 'text-gray-400 hover:bg-gray-50'}`}><PackageOpen size={22} /><span className="text-[10px] font-black uppercase tracking-tighter">My Items</span></button>
          </nav>
        )}

        <AnimatePresence>
          {biddingOnItem && <BiddingDrawer user={user} targetItem={biddingOnItem} onClose={() => setBiddingOnItem(null)} showToast={showToast} />}
          {viewingProfile && <UserProfileModal profileId={viewingProfile} onClose={() => setViewingProfile(null)} />}
          {toast && (
            <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -50 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
              <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}`}>{toast.message}</div>
            </motion.div>
          )}
          {showTermsModal && <TermsModal onAccept={async () => { await supabase.from('profiles').update({ accepted_terms: true }).eq('id', user.id); setShowTermsModal(false); }} />}
        </AnimatePresence>
      </div>
    </div>
  );
}
