import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload, User } from 'lucide-react';
import { supabase } from '../supabase';

const ProfileSettingsModal = ({ user, profile, onClose, onSaved, showToast }) => {
  const [username, setUsername]   = useState(profile?.username || '');
  const [bio, setBio]             = useState(profile?.bio || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(profile?.avatar_url || null);
  const [saving, setSaving]       = useState(false);

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let avatar_url = profile?.avatar_url || null;

      if (avatarFile) {
        const ext  = avatarFile.name.split('.').pop();
        const path = `${user.id}/avatar.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        avatar_url = urlData.publicUrl + '?t=' + Date.now(); // cache-bust
      }

      const { error } = await supabase.from('profiles').update({
        username: username.trim() || profile?.username,
        bio:      bio.trim(),
        avatar_url,
      }).eq('id', user.id);

      if (error) throw error;
      showToast('Profile saved! ✨', 'success');
      onSaved();
      onClose();
    } catch (err) {
      showToast('Failed to save: ' + err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="w-full max-w-md bg-white rounded-t-[2.5rem] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mt-4 mb-1 shrink-0" />
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Edit Profile</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-8">
          {/* Avatar upload */}
          <div className="flex flex-col items-center gap-3">
            <label className="relative cursor-pointer group">
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-gray-100 shadow-lg bg-gray-200">
                {avatarPreview ? (
                  <img src={avatarPreview} className="w-full h-full object-cover" alt="avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-cyan-400 to-blue-500">
                    <User size={32} className="text-white" />
                  </div>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload size={20} className="text-white" />
              </div>
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </label>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tap to change photo</span>
          </div>

          {/* Username */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Your display name"
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 font-bold text-gray-900"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell traders a bit about yourself..."
              rows={3}
              className="w-full px-4 py-3.5 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 resize-none font-medium text-gray-700"
            />
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black rounded-2xl shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition-all disabled:opacity-70"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default React.memo(ProfileSettingsModal);
