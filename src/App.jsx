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

const Card = ({ item, active, removeCard, setCurrentView, setMatchData }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);
  
  // Indicators
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 100) {
      removeCard(item.id, 'right');
    } else if (info.offset.x < -100) {
      removeCard(item.id, 'left');
    }
  };

  const handleInstantMatch = () => {
    if (setMatchData && setCurrentView) {
      setMatchData(item);
      setCurrentView('chat');
    }
  };

  return (
    <motion.div
      className="absolute top-0 w-full h-full rounded-3xl bg-white shadow-2xl overflow-hidden origin-bottom cursor-grab active:cursor-grabbing border border-gray-100/50"
      style={{ x, rotate, opacity }}
      drag={active ? "x" : false}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, y: 20, opacity: 0 }}
      animate={{ scale: active ? 1 : 0.95, y: active ? 0 : 20, opacity: 1 }}
      exit={{ x: x.get() > 0 ? 300 : -300, opacity: 0, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="relative w-full h-[65%]">
        <img 
          src={item.image_url || "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} 
          alt={item.title}
          className="w-full h-full object-cover select-none pointer-events-none"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/70" />
        
        {/* Seller Info Header */}
        {item.profiles && (
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
            <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md rounded-full pr-3 p-1">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-white/50">
                <img src={item.profiles.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.profiles.id}`} alt="Seller" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1">
                  <span className="text-white text-xs font-bold leading-none">{item.profiles.username || 'Anonymous'}</span>
                  {item.profiles.accepted_terms && <BadgeCheck size={12} className="text-cyan-400" />}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-white/80 text-[10px] font-medium leading-none">{item.profiles.average_rating || '0.0'} ({item.profiles.total_swaps || 0} swaps)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Like/Nope indicators on drag */}
        <motion.div 
          style={{ opacity: likeOpacity }} 
          className="absolute top-8 left-8 border-[4px] border-emerald-400 rounded-lg px-4 py-2 text-emerald-400 font-extrabold text-4xl transform -rotate-12 uppercase tracking-wider bg-black/20 backdrop-blur-sm"
        >
          Want
        </motion.div>
        <motion.div 
          style={{ opacity: nopeOpacity }} 
          className="absolute top-8 right-8 border-[4px] border-rose-500 rounded-lg px-4 py-2 text-rose-500 font-extrabold text-4xl transform rotate-12 uppercase tracking-wider bg-black/20 backdrop-blur-sm"
        >
          Pass
        </motion.div>
      </div>

      <div className="p-6 h-[35%] flex flex-col justify-between select-none bg-white relative">
        <div className="absolute -top-12 left-6 bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full flex items-center shadow-lg text-gray-800 text-sm font-semibold">
          <MapPin size={16} className="mr-1 text-cyan-500" />
          {item.calculatedDistance !== undefined && item.calculatedDistance !== null ? `${item.calculatedDistance.toFixed(1)} km away` : "Nearby"}
        </div>
        
        <div className="mt-2 flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight tracking-tight">{item.title}</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            {item.category && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold">{item.category}</span>}
            {item.condition && <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs font-bold">{item.condition}</span>}
            {item.estimated_value && <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-bold">Est: {item.estimated_value}</span>}
          </div>
          <p className="text-gray-600 text-xs line-clamp-2 font-medium leading-relaxed mb-2">{item.description}</p>
          {item.looking_for && (
            <div className="mt-auto bg-cyan-50/50 border border-cyan-100 rounded-lg p-2.5 flex items-start shadow-sm">
              <span className="text-cyan-500 mr-2 mt-0.5 text-base leading-none">🔍</span>
              <p className="text-xs font-bold text-gray-700 leading-snug">
                <span className="text-cyan-600 block mb-0.5 uppercase tracking-wide text-[10px]">Looking For</span> 
                {item.looking_for}
              </p>
            </div>
          )}
        </div>

        {/* 🧪 DEV ONLY: Instant Match Cheat Code */}
        <button
          onClick={handleInstantMatch}
          className="absolute bottom-3 right-3 text-[9px] font-black uppercase tracking-widest text-purple-500 bg-purple-50 border border-purple-200 px-2 py-1 rounded-full hover:bg-purple-100 transition-colors opacity-60 hover:opacity-100"
        >
          ⚡ Test Chat
        </button>
      </div>
    </motion.div>
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
      const { error } = await supabase.from('items').insert([{
        title, condition, category, estimated_value: parsedEstimatedValue, description, looking_for: lookingFor, user_id: user.id, image_url, lat: location?.lat || null, lng: location?.lng || null, status: 'active'
      }]);

      if (error) throw error;

      showToast('Item successfully posted! 🎉', 'success');
      setTitle(''); setCondition('Brand New'); setCategory('Electronics'); setEstimatedValue(''); setDescription(''); setLookingFor(''); setImageFile(null); setImagePreview(null);
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
      {/* Add New Item Section */}
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
          <button 
            type="submit" 
            disabled={isSubmitting}
            className={`w-full py-4 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(6,182,212,0.5)] active:scale-[0.98] transition-all ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-[0_12px_25px_-6px_rgba(6,182,212,0.6)]'}`}
          >
            {isSubmitting ? 'Posting...' : 'Post Item'}
          </button>
        </form>
      </div>

      {/* My Items Section */}
      <div ref={myItemsRef} className={`bg-white p-6 rounded-3xl shadow-sm border transition-all duration-500 ${postSuccess ? 'border-cyan-300 shadow-cyan-100 shadow-lg' : 'border-gray-100'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-extrabold text-gray-900">My Items</h2>
          {postSuccess && <span className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full animate-pulse">✓ Just posted!</span>}
        </div>
        {loadingItems ? (
          <div className="flex flex-col gap-4">
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
                  <button onClick={() => showToast('Edit feature coming soon!', 'success')} className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition-colors">
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
      {/* Chat Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentView('matches')} className="p-2 text-gray-400 hover:text-cyan-600 rounded-full hover:bg-cyan-50 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
            <img src={matchData.image_url} alt="Item" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm truncate max-w-[120px]">{matchData.title}</h3>
            <p className="text-xs text-cyan-600 font-bold flex items-center gap-1">
              <CheckCircle2 size={12} /> Matched
            </p>
          </div>
        </div>
        <button onClick={markAsSwapped} className="text-[10px] uppercase tracking-wider font-extrabold bg-emerald-50 text-emerald-600 px-3 py-2 rounded-full hover:bg-emerald-100 transition-colors border border-emerald-200">
          Mark Swapped
        </button>
      </div>

      {/* Messages */}
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

      {/* Input */}
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


const MatchesView = ({ user, setCurrentView, setMatchData }) => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMatches = async () => {
      // Find items I liked
      const { data: mySwipes } = await supabase
        .from('swipes')
        .select('item_id')
        .eq('swiper_id', user.id)
        .eq('direction', 'right');

      if (!mySwipes || mySwipes.length === 0) {
        setLoading(false);
        return;
      }
      
      const myLikedItemIds = mySwipes.map(s => s.item_id);

      // Now find my items
      const { data: myItems } = await supabase
        .from('items')
        .select('id')
        .eq('user_id', user.id);

      if (!myItems || myItems.length === 0) {
        setLoading(false);
        return;
      }

      const myItemIds = myItems.map(i => i.id);

      // Check who swiped right on my items
      const { data: theirSwipes } = await supabase
        .from('swipes')
        .select('swiper_id')
        .in('item_id', myItemIds)
        .eq('direction', 'right');

      if (!theirSwipes || theirSwipes.length === 0) {
        setLoading(false);
        return;
      }

      const swiperIds = theirSwipes.map(s => s.swiper_id);

      // The matched items are items in myLikedItemIds where the owner is in swiperIds
      const { data: matchedItems } = await supabase
        .from('items')
        .select('*, profiles:user_id(id, username, avatar_url, average_rating, total_swaps, accepted_terms)')
        .in('id', myLikedItemIds)
        .in('user_id', swiperIds);

      setMatches(matchedItems || []);
      setLoading(false);
    };

    fetchMatches();
  }, [user]);

  if (loading) return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full h-full bg-slate-50 flex flex-col p-6"
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
        <div className="h-6 bg-gray-200 rounded w-32 animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 animate-pulse">
            <div className="aspect-square w-full bg-gray-200" />
            <div className="p-3 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="w-full h-full bg-slate-50 flex flex-col p-6 overflow-y-auto"
    >
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => setCurrentView('swipe')} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Your Matches</h2>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 mt-10">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Heart size={32} className="text-gray-300" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">No matches yet</h3>
          <p className="text-gray-500 text-sm">Keep swiping right on items you like. When the owner likes your item too, it will appear here!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {matches.map(item => (
            <div 
              key={item.id} 
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow group"
              onClick={() => {
                setMatchData(item);
                setCurrentView('chat');
              }}
            >
              <div className="aspect-square w-full relative overflow-hidden">
                <img src={item.image_url || "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-2 left-2 right-2">
                  <h3 className="text-white font-bold text-sm truncate">{item.title}</h3>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

const TermsModal = ({ onAccept }) => {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="absolute inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm flex flex-col"
      >
        <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4 mx-auto">
          <Zap size={32} className="text-cyan-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 text-center mb-2">Safety First!</h2>
        <p className="text-gray-600 text-sm mb-6 text-center leading-relaxed">
          SwitchR is a platform for finding bartering opportunities. By using this app, you acknowledge that all physical meetups and trades are conducted entirely at your own risk. Always meet in public places and prioritize your personal safety.
        </p>

        <label className="flex items-start gap-3 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
          <input 
            type="checkbox" 
            checked={agreed} 
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm font-semibold text-gray-700 leading-snug">
            I agree that all meetups are at my own risk and I will prioritize my safety.
          </span>
        </label>

        <button 
          onClick={onAccept}
          disabled={!agreed}
          className={`w-full py-4 rounded-full font-bold transition-all shadow-md active:scale-[0.98] ${agreed ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-500/30' : 'bg-gray-200 text-gray-400 shadow-none cursor-not-allowed'}`}
        >
          Enter SwitchR
        </button>
      </motion.div>
    </div>
  );
};

const MatchOverlay = ({ item, onSendMessage, onKeepSwiping }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center"
    >
      <motion.div
        initial={{ scale: 0.5, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
        className="w-full max-w-sm"
      >
        <h2 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 italic tracking-tight drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
          It's a Match!
        </h2>
        <p className="text-gray-300 font-medium mb-12 text-lg">You and the owner want to trade.</p>

        <div className="flex items-center justify-center gap-0 mb-14 relative">
          {/* My Item */}
          <motion.div 
            initial={{ x: -100, rotate: -20 }}
            animate={{ x: 20, rotate: -10 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="w-32 h-32 rounded-full overflow-hidden border-[6px] border-black shadow-[0_0_40px_rgba(6,182,212,0.6)] z-10 relative"
          >
            <div className="absolute inset-0 border-4 border-cyan-500 rounded-full z-20"></div>
            <img src="https://images.unsplash.com/photo-1605901309584-818e25960b8f?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80" alt="My Item" className="w-full h-full object-cover" />
          </motion.div>
          {/* Matched Item */}
          <motion.div 
            initial={{ x: 100, rotate: 20 }}
            animate={{ x: -20, rotate: 10 }}
            transition={{ type: "spring", delay: 0.3 }}
            className="w-32 h-32 rounded-full overflow-hidden border-[6px] border-black shadow-[0_0_40px_rgba(59,130,246,0.6)] z-20 relative"
          >
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full z-20"></div>
            <img src={item.image_url || "https://images.unsplash.com/photo-1555664424-778a1e5e1b48?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80"} alt="Matched Item" className="w-full h-full object-cover" />
          </motion.div>
        </div>

        <button 
          onClick={onSendMessage}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-2xl shadow-[0_8px_30px_-6px_rgba(6,182,212,0.6)] hover:shadow-[0_12px_40px_-6px_rgba(6,182,212,0.8)] active:scale-[0.98] transition-all mb-4 flex items-center justify-center gap-3"
        >
          <MessageCircle size={22} fill="currentColor" className="fill-white/20" />
          Send Message
        </button>

        <button 
          onClick={onKeepSwiping}
          className="w-full py-4 bg-transparent border-2 border-gray-700 text-gray-300 font-bold text-lg rounded-2xl hover:bg-white/5 hover:border-gray-500 active:scale-[0.98] transition-all"
        >
          Keep Swiping
        </button>
      </motion.div>
    </motion.div>
  );
};



const AuthView = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        if (data.user) {
          const { error: profileError } = await supabase.from('profiles').insert([
            { id: data.user.id, username: username || email.split('@')[0] }
          ]);
          if (profileError) console.error("Profile creation error:", profileError);
        }
        
        if (data.user && !data.session) {
          setMessage({ text: 'Please check your email for a confirmation link!', type: 'success' });
        }
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center font-sans p-4 w-full">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white p-8 rounded-3xl shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 to-blue-600"></div>
        <div className="flex flex-col items-center gap-2 justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30">
              <Zap size={20} className="text-white fill-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 tracking-tight">
              Switch<span className="text-gray-900">R</span>
            </h1>
          </div>
          <p className="text-gray-500 text-sm font-medium text-center">Swipe. Match. Trade. Barter locally, effortlessly.</p>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>

        {message.text && (
          <div className={`mb-6 p-4 rounded-xl text-sm font-bold text-center ${message.type === 'error' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          {!isLogin && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="CoolTrader99" 
                className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium" 
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-4 mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-lg rounded-xl shadow-[0_8px_20px_-6px_rgba(6,182,212,0.5)] active:scale-[0.98] transition-all ${loading ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-[0_12px_25px_-6px_rgba(6,182,212,0.6)]'}`}
          >
            {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600 font-medium">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            onClick={() => { setIsLogin(!isLogin); setMessage({ text: '', type: '' }); }}
            className="text-cyan-600 font-bold hover:underline focus:outline-none"
          >
            {isLogin ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

const UserProfileModal = ({ profileId, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profileId) return;
    const load = async () => {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', profileId).single();
      const { data: i } = await supabase.from('items').select('*').eq('user_id', profileId).eq('status', 'active').order('created_at', { ascending: false }).limit(9);
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
            {/* Profile Header */}
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
            {/* Active Listings */}
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

export default function App() {
  const [cards, setCards] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [lastAction, setLastAction] = useState(null);
  const [currentView, setCurrentView] = useState('swipe'); // 'swipe' | 'inventory' | 'match' | 'chat'
  const [matchData, setMatchData] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [radius, setRadius] = useState(50);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(true);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [toast, setToast] = useState(null);

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
    if (loadError) {
      console.error("Google Maps API Load Error:", loadError);
    }
  }, [loadError]);

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

    // Request location silently on load
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.log("Location access denied or unavailable.")
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
        .limit(100);

      if (activeCategory !== 'All') {
        query = query.eq('category', activeCategory);
      }

      if (debouncedSearchQuery) {
        query = query.or(`title.ilike.%${debouncedSearchQuery}%,description.ilike.%${debouncedSearchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("Error fetching feed items:", error);
      } else {
        setAllItems(data || []);
      }
      setLoadingItems(false);
    };
    
    if (currentView === 'swipe') {
      fetchItems();
    }
  }, [user, currentView, debouncedSearchQuery, activeCategory]);

  useEffect(() => {
    // TEMPORARY DEBUG: Bypass coordinate math and radius filtering to show all top items
    setCards(allItems);
    /*
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
    */
  }, [allItems, radius, userLocation]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const removeCard = async (id, direction) => {
    const cardMatched = cards.find(c => c.id === id);
    setLastAction({ card: cardMatched, direction });
    setCards((prev) => prev.filter((card) => card.id !== id));
    
    // Record swipe in Supabase
    try {
      if (user) {
        await supabase.from('swipes').insert([{
          swiper_id: user.id,
          item_id: id,
          direction: direction
        }]);

        if (direction === 'right' && cardMatched) {
          // Real Match Logic: Did this item's owner swipe right on any of MY items?
          const { data: matchCheck, error } = await supabase
            .from('swipes')
            .select(`
              id,
              items!inner(user_id)
            `)
            .eq('swiper_id', cardMatched.user_id)
            .eq('direction', 'right')
            .eq('items.user_id', user.id);

          if (!error && matchCheck && matchCheck.length > 0) {
            // It's a real match!
            setMatchData(cardMatched);
            showToast("It's a Match! 🎉", 'success');
            setCurrentView('match');
          }
        }
      }
    } catch (err) {
      console.error('Error recording swipe:', err);
    }
  };

  const handleButtonClick = (direction) => {
    if (cards.length === 0) return;
    const currentCard = cards[0];
    removeCard(currentCard.id, direction);
  };

  const undo = () => {
    if (!lastAction || !lastAction.card) return;
    setCards(prev => [lastAction.card, ...prev]);
    setLastAction(null);
  };

  if (authLoading) {
    return <div className="min-h-screen bg-neutral-900 flex items-center justify-center"><div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-neutral-900 to-black flex flex-col items-center font-sans overflow-hidden w-full relative">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2000&auto=format&fit=crop')] opacity-[0.03] mix-blend-overlay bg-cover bg-center"></div>
      <div className="w-full max-w-md bg-slate-50 h-screen flex flex-col relative overflow-hidden shadow-2xl">
        {/* Header - logo only */}
        <header className="w-full px-6 py-4 flex items-center justify-between z-20 bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => setCurrentView('swipe')}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/30 group-hover:scale-105 transition-transform">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600 tracking-tight">
              Switch<span className="text-gray-900">R</span>
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white shadow-md">
              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full flex flex-col items-center p-4 relative min-h-0 overflow-y-auto h-[calc(100vh-130px)]">
          <AnimatePresence mode="wait">
            {currentView === 'swipe' && (
              <motion.div 
                key="swipe"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full h-full flex flex-col"
              >
                <div className="w-full px-2 mb-4 z-10 flex flex-col gap-3">
                  {/* Search Bar */}
                  <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={18} className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search for items (e.g. Nintendo Switch)..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-gray-700 placeholder:text-gray-400"
                    />
                  </div>

                  {/* Filter Chips */}
                  <div className="flex w-full gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x">
                    {['All', 'Electronics', 'Fashion', 'Home', 'Hobbies', 'Other'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`snap-start whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${activeCategory === cat ? 'bg-cyan-500 text-white border-cyan-500 shadow-md shadow-cyan-500/20' : 'bg-white text-gray-600 border-gray-200 hover:border-cyan-300'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {userLocation && (
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-sm font-bold text-gray-700">
                        <span>Search Radius</span>
                      <span className="text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full">{radius} km</span>
                    </div>
                    <input 
                      type="range" 
                      min="5" max="100" step="5"
                      value={radius}
                      onChange={(e) => setRadius(Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-cyan-500 mb-4"
                    />
                    
                    {loadError ? (
                      <div className="w-full h-[250px] rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center p-4 text-center text-rose-600 font-bold shadow-sm">
                        Failed to load Google Maps.<br/>Check the console for detailed error messages.
                      </div>
                    ) : isLoaded && (
                      <div className="relative w-full rounded-2xl overflow-hidden shadow-[0_4px_20px_-5px_rgba(0,0,0,0.1)] border border-gray-100">
                        {cards.length === 0 && !debouncedSearchQuery && (
                          <div className="absolute top-4 left-0 right-0 flex justify-center z-[5] pointer-events-none">
                            <div className="bg-white px-5 py-2.5 rounded-full font-bold text-sm text-cyan-600 shadow-xl border border-cyan-100 flex items-center gap-2">
                              <MapPin size={16} /> Be the first to post in this area!
                            </div>
                          </div>
                        )}
                        <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={userLocation}
                          zoom={Math.round(14 - Math.log2(radius))}
                          options={{
                            disableDefaultUI: true,
                            zoomControl: true,
                            gestureHandling: 'greedy'
                          }}
                          onLoad={(map) => console.log("Google Map successfully loaded:", map)}
                        >
                          <Marker position={userLocation} />
                          <Circle 
                            center={userLocation} 
                            radius={radius * 1000} 
                            options={{
                              fillColor: '#06b6d4',
                              fillOpacity: 0.15,
                              strokeColor: '#06b6d4',
                              strokeOpacity: 0.8,
                              strokeWeight: 2,
                            }}
                          />
                        </GoogleMap>
                      </div>
                    )}
                    </div>
                  )}
                </div>
                <div className="relative w-full aspect-[4/5] max-h-[650px] mb-8 mt-4 flex-1">

                  
                  {cards.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl shadow-xl border border-gray-100"
                    >
                      <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner relative">
                        <div className="absolute inset-0 border-4 border-dashed border-gray-200 rounded-full animate-[spin_10s_linear_infinite]"></div>
                        {debouncedSearchQuery ? <Search size={40} className="text-gray-300" /> : <Zap size={40} className="text-gray-300 fill-gray-200" />}
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 mb-3">
                        {debouncedSearchQuery ? "No items found" : "No more items!"}
                      </h2>
                      <p className="text-gray-500 mb-8 font-medium">
                        {debouncedSearchQuery ? `We couldn't find anything matching "${debouncedSearchQuery}". Try a different keyword or expand your radius.` : "Check back later for new bartering opportunities in your area."}
                      </p>
                      <button 
                        className="px-8 py-3.5 bg-gray-900 text-white rounded-full font-bold shadow-[0_8px_20px_-6px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_25px_-6px_rgba(0,0,0,0.4)] hover:-translate-y-0.5 transition-all active:scale-95 active:translate-y-0"
                      >
                        Reload Items
                      </button>
                    </motion.div>
                  ) : (
                    <AnimatePresence>
                      {cards.map((card, index) => (
                        <Card 
                          key={card.id} 
                          item={card} 
                          active={index === 0}
                          removeCard={removeCard}
                          setCurrentView={setCurrentView}
                          setMatchData={setMatchData}
                        />
                      )).reverse()}
                    </AnimatePresence>
                  )}
                </div>

                {/* Action Buttons */}
                {cards.length > 0 && (
                  <div className="flex items-center justify-center gap-6 w-full max-w-xs mx-auto z-10 mb-8 pb-4">
                    <button
                      onClick={undo}
                      disabled={!lastAction}
                      className={`w-14 h-14 rounded-full flex items-center justify-center bg-white shadow-xl transition-all active:scale-90 ${!lastAction ? 'opacity-50 cursor-not-allowed shadow-none' : 'hover:bg-yellow-50 hover:shadow-yellow-500/20 shadow-[0_10px_20px_-5px_rgba(0,0,0,0.1)]'}`}
                    >
                      <Undo2 size={24} className="text-yellow-500" strokeWidth={2.5} />
                    </button>
                    
                    <button
                      onClick={() => handleButtonClick('left')}
                      className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(244,63,94,0.3)] hover:bg-rose-50 hover:shadow-[0_15px_25px_-5px_rgba(244,63,94,0.4)] hover:-translate-y-1 transition-all active:scale-90 active:translate-y-0 text-rose-500 group"
                    >
                      <X size={36} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
                    </button>

                    <button
                      onClick={() => handleButtonClick('right')}
                      className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-[0_10px_20px_-5px_rgba(16,185,129,0.3)] hover:bg-emerald-50 hover:shadow-[0_15px_25px_-5px_rgba(16,185,129,0.4)] hover:-translate-y-1 transition-all active:scale-90 active:translate-y-0 text-emerald-500 group"
                    >
                      <Heart size={36} strokeWidth={3} className="group-hover:scale-110 transition-transform fill-transparent group-hover:fill-emerald-100" />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {currentView === 'inventory' && <InventoryView key="inventory" user={user} showToast={showToast} onSignOut={handleSignOut} />}
            {currentView === 'matches' && <MatchesView key="matches" user={user} setCurrentView={setCurrentView} setMatchData={setMatchData} />}
            {currentView === 'chat' && <ChatView key="chat" user={user} matchData={matchData} setCurrentView={setCurrentView} showToast={showToast} />}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation Bar */}
        {currentView !== 'chat' && (
          <nav className="w-full bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] flex items-center justify-around px-2 py-2 z-[60] shrink-0">
            <button
              onClick={() => setCurrentView('swipe')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all ${
                currentView === 'swipe' ? 'text-cyan-600 bg-cyan-50' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Zap size={22} className={currentView === 'swipe' ? 'fill-cyan-100' : ''} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Discover</span>
            </button>
            <button
              onClick={() => setCurrentView('inventory')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all ${
                currentView === 'inventory' ? 'text-cyan-600 bg-cyan-50' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <PackageOpen size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wider">My Items</span>
            </button>
            <button
              onClick={() => setCurrentView('matches')}
              className={`flex flex-col items-center gap-1 px-5 py-2 rounded-2xl transition-all ${
                currentView === 'matches' ? 'text-cyan-600 bg-cyan-50' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <MessageCircle size={22} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Matches</span>
            </button>
          </nav>
        )}

        {/* Toast Notification */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none"
            >
              <div className={`p-4 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-sm ${toast.type === 'error' ? 'bg-rose-500 text-white' : 'bg-gray-900 text-white'}`}>
                {toast.type === 'success' ? <Zap size={18} className="text-cyan-400" /> : <X size={18} />}
                {toast.message}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlays */}
        <AnimatePresence>
          {showTermsModal && (
            <TermsModal 
              key="terms" 
              onAccept={async () => {
                await supabase.from('profiles').update({ accepted_terms: true }).eq('id', user.id);
                setHasAcceptedTerms(true);
                setShowTermsModal(false);
              }} 
            />
          )}
          {currentView === 'match' && matchData && (
            <MatchOverlay 
              key="matchOverlay"
              item={matchData} 
              onSendMessage={() => setCurrentView('chat')} 
              onKeepSwiping={() => {
                setCurrentView('swipe');
                setMatchData(null);
              }} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
