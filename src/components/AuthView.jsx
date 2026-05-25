import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ArrowLeft, MailCheck } from 'lucide-react';
import { supabase } from '../supabase';

const AuthView = () => {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode]       = useState('login'); // 'login' | 'signup' | 'reset'
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email address.'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) {
      setError(error.message);
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  const goBack = () => {
    setMode('login');
    setError('');
    setResetSent(false);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-black p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,_rgba(6,182,212,0.15),transparent_70%)]" />

      <AnimatePresence mode="wait">

        {/* ── Reset Password Screen ── */}
        {mode === 'reset' && (
          <motion.div
            key="reset"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl relative z-10"
          >
            <button
              onClick={goBack}
              className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-gray-700 uppercase tracking-widest mb-8 transition-colors"
            >
              <ArrowLeft size={14} /> Back to Login
            </button>

            {resetSent ? (
              /* ── Confirmation state ── */
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="w-16 h-16 rounded-full bg-cyan-50 flex items-center justify-center">
                  <MailCheck size={30} className="text-cyan-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Check your inbox</h2>
                <p className="text-gray-500 font-medium text-sm leading-relaxed">
                  We sent a password reset link to <span className="font-black text-gray-800">{email}</span>. Click the link in the email to set a new password.
                </p>
                <p className="text-[11px] text-gray-400 font-medium">Didn't receive it? Check your spam folder.</p>
                <button
                  onClick={goBack}
                  className="w-full mt-4 py-4 bg-black text-white rounded-2xl font-black text-sm hover:bg-gray-800 transition-all active:scale-[0.98]"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              /* ── Reset email form ── */
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">Reset Password</h2>
                  <p className="text-gray-500 font-medium text-sm">Enter your email and we'll send you a link to set a new password.</p>
                </div>
                <form onSubmit={handleReset} className="flex flex-col gap-4">
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
                  />
                  {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg hover:bg-gray-800 transition-all active:scale-[0.98] mt-2 shadow-xl disabled:opacity-60"
                  >
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </form>
              </>
            )}
          </motion.div>
        )}

        {/* ── Login / Sign Up Screen ── */}
        {mode !== 'reset' && (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
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
              <div className="flex flex-col gap-1">
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all font-medium"
                />
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setError(''); }}
                    className="self-end text-[11px] font-black text-cyan-500 hover:text-cyan-700 uppercase tracking-widest transition-colors mt-1"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              {error && <p className="text-rose-500 text-xs font-bold text-center">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-black text-white rounded-2xl font-black text-lg hover:bg-gray-800 transition-all active:scale-[0.98] mt-2 shadow-xl disabled:opacity-60"
              >
                {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Join SwitchR')}
              </button>
            </form>

            <button
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}
              className="w-full mt-8 text-sm font-bold text-gray-400 hover:text-cyan-600 transition-colors uppercase tracking-widest"
            >
              {mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default React.memo(AuthView);
