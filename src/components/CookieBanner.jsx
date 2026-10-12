import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X } from 'lucide-react';

export default function CookieBanner({ onOpenLegal }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('switchr_cookie_consent');
    if (!consent) {
      // Gentle appearance delay for smooth page load UX
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (level) => {
    localStorage.setItem('switchr_cookie_consent', level);
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.aside
          role="dialog"
          aria-label="Cookie and storage consent banner"
          initial={{ y: 90, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 90, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl rounded-2xl border border-line/90 bg-white/95 p-4 shadow-lift backdrop-blur-md sm:bottom-6"
        >
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Cookie size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink">Cookies & Local Storage</p>
                <button
                  type="button"
                  onClick={() => handleConsent('essential')}
                  className="rounded-lg p-1 text-muted transition hover:bg-canvas hover:text-ink -mr-1"
                  aria-label="Dismiss banner with essential cookies only"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                SwitchR uses essential storage to keep you securely signed in, remember your search area, and alert you to trade messages. We do not use third-party advertising cookies or trackers.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConsent('all')}
                  className="btn-primary py-1.5 px-3.5 text-xs font-semibold"
                >
                  Accept all
                </button>
                <button
                  type="button"
                  onClick={() => handleConsent('essential')}
                  className="btn-secondary py-1.5 px-3.5 text-xs font-semibold"
                >
                  Essential only
                </button>
                <button
                  type="button"
                  onClick={() => onOpenLegal?.('cookies')}
                  className="ml-1 text-xs font-semibold text-brand hover:underline"
                >
                  Customize / Policies
                </button>
              </div>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
