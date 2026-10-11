import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Camera, MessageCircle, Star, Mail, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { errorMessage } from '../lib/core';
import { Spinner } from '../components/ui';

export function Logo({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-xl font-extrabold tracking-tight ${className}`}>
      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-linear-to-br from-brand to-coral shadow-lift">
        <ArrowRightLeft size={17} className="text-white" strokeWidth={2.6} />
      </span>
      Switch<span className="text-gradient">R</span>
    </span>
  );
}

const STEPS = [
  { icon: Camera, title: 'List', text: 'Snap a photo of something you no longer need.' },
  { icon: ArrowRightLeft, title: 'Offer', text: 'Offer one of your items for something you want.' },
  { icon: MessageCircle, title: 'Chat', text: 'Agree the swap details in a private trade chat.' },
  { icon: Star, title: 'Rate', text: 'Confirm the swap and rate your trader.' },
];

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;

export default function AuthView() {
  const [mode, setMode] = useState('signin'); // signin | signup | forgot
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setNotice('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setNotice('');

    if (mode === 'signup' && !USERNAME_RE.test(username)) {
      setError('Username must be 3–30 characters: letters, numbers or underscores.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else if (mode === 'signup') {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username }, emailRedirectTo: window.location.origin },
        });
        if (err) throw err;
        if (!data.session) {
          setNotice(`We've sent a confirmation link to ${email}. Click it to activate your account, then sign in.`);
          setMode('signin');
        }
      } else {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (err) throw err;
        setNotice(`If an account exists for ${email}, a password reset link is on its way.`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    signin: ['Welcome back', 'Sign in to keep swapping.'],
    signup: ['Create your account', 'It takes less than a minute.'],
    forgot: ['Reset your password', "We'll email you a reset link."],
  };

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Hero */}
      <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-coral/30 blur-3xl" />
        <Logo className="relative text-white" />
        <div className="relative">
          <h2 className="font-display text-5xl font-bold leading-[1.05] tracking-tight">
            Swap what you have
            <br />
            for what you <span className="text-gradient">want.</span>
          </h2>
          <p className="mt-4 max-w-md text-white/70">
            No money, no fuss. Trade your unused things directly with people nearby.
          </p>
          <div className="mt-10 grid max-w-lg grid-cols-2 gap-3">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur"
              >
                <Icon size={20} className="text-coral" />
                <p className="mt-2 font-semibold">
                  {i + 1}. {title}
                </p>
                <p className="mt-0.5 text-sm text-white/60">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-white/40">© {new Date().getFullYear()} SwitchR</p>
      </section>

      {/* Form */}
      <section className="flex items-center justify-center px-5 py-12">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          <Logo className="mb-10 lg:hidden" />
          <h1 className="font-display text-3xl font-bold tracking-tight">{titles[mode][0]}</h1>
          <p className="mt-1 text-sm text-ink-soft">{titles[mode][1]}</p>

          {notice && (
            <div className="mt-6 flex gap-2.5 rounded-xl border border-ok/20 bg-ok-soft p-3 text-sm text-ink">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-ok" />
              {notice}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="auth-username" className="label">
                  Username
                </label>
                <input
                  id="auth-username"
                  className="field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.trim())}
                  placeholder="e.g. vinyl_hunter"
                  autoComplete="username"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="auth-email" className="label">
                Email
              </label>
              <input
                id="auth-email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="auth-password" className="label">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      id="auth-forgot-link"
                      onClick={() => switchMode('forgot')}
                      className="mb-1.5 text-xs font-semibold text-brand hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  className="field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : '••••••••'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                />
              </div>
            )}

            {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

            <button id="auth-submit" type="submit" className="btn-primary w-full py-3" disabled={busy}>
              {busy ? (
                <Spinner className="h-4 w-4 text-white" />
              ) : mode === 'signin' ? (
                'Sign in'
              ) : mode === 'signup' ? (
                'Create account'
              ) : (
                <>
                  <Mail size={16} /> Send reset link
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            {mode === 'signin' ? (
              <>
                New to SwitchR?{' '}
                <button type="button" id="auth-to-signup" onClick={() => switchMode('signup')} className="font-semibold text-brand hover:underline">
                  Create an account
                </button>
              </>
            ) : (
              <>
                {mode === 'signup' ? 'Already have an account?' : 'Remembered it?'}{' '}
                <button type="button" id="auth-to-signin" onClick={() => switchMode('signin')} className="font-semibold text-brand hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </motion.div>
      </section>
    </main>
  );
}

/** Shown after the user clicks the password-reset link in their email. */
export function ResetPasswordView({ onDone }) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(errorMessage(err));
    else onDone();
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-5">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6">
        <Logo />
        <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
        <input
          id="reset-password"
          type="password"
          className="field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 6 characters"
          autoComplete="new-password"
          minLength={6}
          required
        />
        {error && <p className="rounded-xl bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}
        <button id="reset-submit" type="submit" className="btn-primary w-full py-3" disabled={busy}>
          {busy ? <Spinner className="h-4 w-4 text-white" /> : 'Save password'}
        </button>
      </form>
    </main>
  );
}
