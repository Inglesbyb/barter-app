import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, KeyRound, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabase';

const ResetPasswordModal = ({ onClose, showToast }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      if (showToast) {
        showToast('Password updated successfully! 🎉', 'success');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while updating your password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/80 backdrop-blur-md flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-2xl relative border border-gray-100 dark:border-neutral-800"
      >
        {!success && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-400"
          >
            <X size={18} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {success ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center text-center py-6"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-6">
                <Check size={32} className="text-emerald-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
                Password Updated!
              </h3>
              <p className="text-gray-500 dark:text-neutral-400 font-medium text-sm max-w-[280px] leading-relaxed mb-8">
                Your SwitchR password has been updated securely. You are now logged in and ready to trade!
              </p>
              <button
                onClick={onClose}
                className="w-full py-4 bg-black dark:bg-white dark:text-black text-white rounded-2xl font-black text-sm hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
              >
                Start Swapping
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
                  <KeyRound size={22} className="text-white" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
                  Create New Password
                </h3>
                <p className="text-gray-500 dark:text-neutral-400 font-medium text-xs max-w-[260px]">
                  Please choose a strong, secure new password for your SwitchR account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="New Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-5 py-4 pr-12 rounded-2xl bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-gray-900 dark:text-white font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-neutral-200"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border border-gray-100 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 text-gray-900 dark:text-white font-bold"
                />

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4.5 bg-black dark:bg-white dark:text-black text-white rounded-2xl font-black text-md hover:bg-gray-800 dark:hover:bg-neutral-200 transition-all active:scale-[0.98] shadow-xl disabled:opacity-60"
                >
                  {loading ? 'Updating Password...' : 'Save New Password'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default React.memo(ResetPasswordModal);
