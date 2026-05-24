import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PackageOpen, Upload, MapPin, Search, Edit2, Trash2, X, Leaf, Tag } from 'lucide-react';
import { supabase } from '../supabase';
import { TAXONOMY, searchTaxonomy, getCO2 } from '../taxonomy';

// Quick-select chips
const QUICK_CHIPS = [
  { label: 'Smartphone',     category: 'Electronics', co2: 70  },
  { label: 'Laptop',         category: 'Electronics', co2: 340 },
  { label: 'Sneakers',       category: 'Fashion',     co2: 14  },
  { label: 'Road Bike',      category: 'Sports',      co2: 190 },
  { label: 'Ergonomic Chair',category: 'Home',        co2: 120 },
];

const InventoryView = ({ user, showToast, onSignOut }) => {
  const [title, setTitle] = useState('');
  const [condition, setCondition] = useState('Brand New');
  // Taxonomy search state
  const [taxSearch, setTaxSearch] = useState('');       // what user types
  const [taxResults, setTaxResults] = useState([]);     // filtered suggestions
  const [selectedTax, setSelectedTax] = useState(null); // locked selection { label, category, co2 }
  const [taxOpen, setTaxOpen] = useState(false);
  const taxRef = React.useRef(null);

  // Derived values written to DB
  const category    = selectedTax?.category || 'Other';
  const subCategory = selectedTax?.label    || '';
  const ecoImpactKg = selectedTax?.co2      || null;

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

  // Fuzzy search using taxonomy.js searchTaxonomy function
  useEffect(() => {
    if (!taxSearch.trim()) { setTaxResults([]); return; }
    setTaxResults(searchTaxonomy(taxSearch, 8));
  }, [taxSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => { if (taxRef.current && !taxRef.current.contains(e.target)) setTaxOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectTaxItem = (item) => {
    setSelectedTax(item);
    setTaxSearch('');
    setTaxResults([]);
    setTaxOpen(false);
  };

  const handleEdit = (item) => {
    setEditingItemId(item.id);
    setTitle(item.title);
    setCondition(item.condition);
    // Restore taxonomy selection from stored fields
    const stored = TAXONOMY.find(t => t.label === item.sub_category && t.category === item.category);
    if (stored) { setSelectedTax(stored); } else if (item.category) {
      setSelectedTax({ label: item.sub_category || '', category: item.category, co2: item.co2_saved_kg || null });
    }
    setEstimatedValue(item.estimated_value || '');
    setDescription(item.description || '');
    setLookingFor(item.looking_for || '');
    setImagePreview(item.image_url);
    setImageFile(null);
    if (item.lat && item.lng) setLocation({ lat: item.lat, lng: item.lng });
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
      // 1. Bulletproof Profile Check
      const { data: profileCheck, error: profileCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!profileCheck) {
        console.log("⚠️ Profile missing for user. Creating fallback profile...");
        const defaultUsername = user.user_metadata?.username || user.email?.split('@')[0] || 'Trader';
        const { error: profileCreateError } = await supabase
          .from('profiles')
          .insert([{ 
            id: user.id, 
            username: defaultUsername,
            avatar_url: user.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`
          }]);
        
        if (profileCreateError) {
          throw new Error("Foreign Key Resolution Failed: Could not create fallback profile - " + profileCreateError.message);
        }
        console.log("✅ Fallback profile created successfully.");
      }

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
        sub_category: subCategory,
        estimated_value: parsedEstimatedValue, 
        description, 
        looking_for: lookingFor, 
        user_id: user.id, 
        image_url: image_url || imagePreview, 
        lat: location?.lat || null, 
        lng: location?.lng || null, 
        status: 'active',
        co2_saved_kg: getCO2(category, subCategory)
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

      setTitle(''); setCondition('Brand New'); setSelectedTax(null); setTaxSearch(''); setEstimatedValue(''); setDescription(''); setLookingFor(''); setImageFile(null); setImagePreview(null); setEditingItemId(null);
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
    <div className="w-full h-full flex flex-col bg-slate-50 scroll-container safe-area-bottom pb-32">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6"
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

          {/* ─── Taxonomy Search-to-Select ─────────────────────────────── */}
          <div ref={taxRef} className="relative">
            <label className="block text-sm font-bold text-gray-700 mb-1.5">What are you listing?</label>

            {/* Locked selection badge */}
            {selectedTax ? (
              <div className="flex items-center gap-3 p-3.5 bg-cyan-50 border-2 border-cyan-400 rounded-xl">
                <div className="flex-1">
                  <p className="font-black text-gray-900 text-sm leading-none">{selectedTax.label}</p>
                  <p className="text-[10px] text-cyan-600 font-bold uppercase tracking-widest mt-0.5">{selectedTax.category}</p>
                </div>
                {selectedTax.co2 && (
                  <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-1 rounded-full">
                    <Leaf size={9} className="fill-emerald-700" />~{selectedTax.co2}kg CO₂
                  </span>
                )}
                <button type="button" onClick={() => setSelectedTax(null)} className="p-1 text-gray-400 hover:text-rose-500 transition-colors">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={taxSearch}
                  onChange={e => { setTaxSearch(e.target.value); setTaxOpen(true); }}
                  onFocus={() => setTaxOpen(true)}
                  placeholder="Search: Laptop, Sneakers, Road Bike..."
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium"
                />
              </div>
            )}

            {/* Floating suggestion list */}
            <AnimatePresence>
              {taxOpen && taxResults.length > 0 && !selectedTax && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-gray-100 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden"
                >
                  {taxResults.map(item => (
                    <button
                      key={`${item.category}-${item.label}`}
                      type="button"
                      onClick={() => selectTaxItem(item)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-cyan-50 transition-colors text-left border-b border-gray-50 last:border-0"
                    >
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{item.label}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.category}</p>
                      </div>
                      <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                        <Leaf size={8} />~{item.co2}kg
                      </span>
                    </button>
                  ))}
                  {/* Custom/Other fallback */}
                  <button
                    type="button"
                    onClick={() => selectTaxItem({ label: taxSearch, category: 'Other', co2: null })}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <Tag size={12} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-gray-600">List as &ldquo;{taxSearch}&rdquo; (Custom)</p>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Quick-select chips */}
            {!selectedTax && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {QUICK_CHIPS.map(chip => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => selectTaxItem(chip)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-cyan-400 hover:text-cyan-600 hover:bg-cyan-50 transition-all active:scale-95"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Eco-Impact Badge */}
          {ecoImpactKg && (
            <motion.div
              key={ecoImpactKg}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <Leaf size={18} className="text-emerald-600 fill-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">🍃 Eco-Impact Estimate</p>
                <p className="text-sm font-bold text-emerald-800">Swapping saves ~<span className="text-lg font-black">{ecoImpactKg}kg</span> of CO₂</p>
              </div>
            </motion.div>
          )}

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
                  setTitle(''); setCondition('Brand New'); setSelectedTax(null); setEstimatedValue(''); setDescription(''); setLookingFor(''); setImageFile(null); setImagePreview(null);
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
            className="w-full flex flex-col items-center justify-center py-16 text-center gap-6" key="empty-state">
            <div className="w-24 h-24 rounded-full bg-cyan-50 flex items-center justify-center relative">
              <PackageOpen size={40} className="text-cyan-500" />
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-200 animate-spin-slow" />
            </div>
            <div>
              <p className="text-xl font-black text-gray-900">Your inventory is empty</p>
              <p className="text-sm text-gray-400 mt-2 max-w-[240px] mx-auto font-medium">You need to list an item before you can start trading with others!</p>
            </div>
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
            >
              Post Your First Item
            </button>
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
    </div>
  );
};

export default React.memo(InventoryView);
