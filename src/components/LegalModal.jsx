import { useState } from 'react';
import { ShieldCheck, FileText, Cookie, Check } from 'lucide-react';
import Modal from './Modal';

export default function LegalModal({ open, onClose, initialTab = 'privacy' }) {
  const [tab, setTab] = useState(initialTab);
  const [consent, setConsent] = useState(() => localStorage.getItem('switchr_cookie_consent') || 'all');
  const [savedFeedback, setSavedFeedback] = useState(false);

  const handleUpdateConsent = (val) => {
    setConsent(val);
    localStorage.setItem('switchr_cookie_consent', val);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2500);
  };

  return (
    <Modal open={open} onClose={onClose} title="Legal, Privacy & Cookies">
      {/* Tabs */}
      <div className="flex border-b border-line mb-4 -mt-1">
        <button
          type="button"
          onClick={() => setTab('privacy')}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition ${
            tab === 'privacy' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <ShieldCheck size={14} /> Privacy Policy
        </button>
        <button
          type="button"
          onClick={() => setTab('terms')}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition ${
            tab === 'terms' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <FileText size={14} /> Terms of Service
        </button>
        <button
          type="button"
          onClick={() => setTab('cookies')}
          className={`flex flex-1 items-center justify-center gap-1.5 border-b-2 py-2.5 text-xs font-semibold transition ${
            tab === 'cookies' ? 'border-brand text-brand' : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Cookie size={14} /> Cookie Settings
        </button>
      </div>

      <div className="text-xs text-ink-soft leading-relaxed space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
        {tab === 'privacy' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-ink text-sm">SwitchR Privacy Policy</h3>
              <p className="text-[11px] text-muted">Last updated: October 2026 · Compliant with UK GDPR & DPA 2018</p>
            </div>

            <p>
              Welcome to <strong>SwitchR</strong>. We respect your privacy and are committed to protecting your personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>

            <h4 className="font-semibold text-ink">1. Information We Collect</h4>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Account Credentials:</strong> Email address and username when registering.</li>
              <li><strong>Item Listings:</strong> Titles, descriptions, photos, conditions, and categories of items you offer for swap.</li>
              <li><strong>Communications:</strong> Messages exchanged with trading partners inside accepted trade rooms.</li>
              <li><strong>Location:</strong> General area name (e.g. city or postal district) to facilitate local nearby swaps. We do not store precise GPS tracking histories.</li>
            </ul>

            <h4 className="font-semibold text-ink">2. How Your Data Is Secured</h4>
            <p>
              Your data is housed in enterprise PostgreSQL infrastructure with Row-Level Security (RLS). All traffic is encrypted in transit using TLS 1.3 and at rest with AES-256 encryption. Private trades and messages are shielded so that only participating parties can view them.
            </p>

            <div className="rounded-xl border border-brand/20 bg-brand-soft/50 p-3 text-ink">
              <h4 className="font-semibold text-brand text-xs mb-1">3. Aggregated & Anonymized Market Research</h4>
              <p className="text-[11px] leading-relaxed">
                SwitchR is 100% free with zero fees for everyday swappers. To sustain our platform, SwitchR may aggregate, de-identify, and anonymize platform transaction data (such as item categories, barter exchange ratios, item trade velocity, and regional demand trends).
              </p>
              <p className="text-[11px] leading-relaxed font-semibold mt-1">
                We DO NOT sell, rent, or monetize your Personally Identifiable Information (such as names, emails, addresses, or private chat messages) to any third party. Any data shared with market research or enterprise partners is strictly stripped of all personal identity and grouped into macro statistical benchmarks.
              </p>
            </div>

            <h4 className="font-semibold text-ink">4. Your Rights (Right to Erasure)</h4>
            <p>
              Under UK GDPR, you have the right to access, rectify, and delete your data at any time. You can permanently erase your entire account, profile, active listings, and message history by clicking <strong>“Delete account & erase all data”</strong> inside your Profile Settings.
            </p>
          </div>
        )}

        {tab === 'terms' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-ink text-sm">Terms of Service</h3>
              <p className="text-[11px] text-muted">Effective Date: October 2026</p>
            </div>

            <p>
              By accessing or using SwitchR, you agree to be bound by these Terms of Service. SwitchR provides a peer-to-peer technology platform that enables users to connect and barter goods.
            </p>

            <h4 className="font-semibold text-ink">1. Peer-to-Peer Swaps</h4>
            <p>
              SwitchR is a facilitation platform. The actual barter agreement is formed solely between the two participating users. Both parties are responsible for inspecting items in person before finalizing any trade.
            </p>

            <h4 className="font-semibold text-ink">2. Prohibited Items</h4>
            <p>You agree not to list, offer, or swap any of the following:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Illegal substances, narcotics, or prescription drugs</li>
              <li>Weapons, firearms, knives, ammunition, or explosives</li>
              <li>Counterfeit, pirated, or stolen goods</li>
              <li>Live animals or endangered wildlife products</li>
              <li>Hazardous materials or adult content</li>
            </ul>

            <h4 className="font-semibold text-ink">3. Safety Guidelines</h4>
            <p>
              Always meet in a well-lit, busy public space (such as a shopping center, transit hub, or cafe) during daylight hours. Never invite strangers to private residences or go alone to unfamiliar areas.
            </p>

            <h4 className="font-semibold text-ink">4. Limitation of Liability</h4>
            <p>
              To the fullest extent permitted by law, SwitchR and its operators shall not be liable for any indirect, incidental, or consequential damages resulting from user trades or interactions.
            </p>
          </div>
        )}

        {tab === 'cookies' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-ink text-sm">Cookie & Local Storage Policy</h3>
              <p className="text-[11px] text-muted">Compliant with UK PECR and ICO Regulations</p>
            </div>

            <p>
              SwitchR uses modern browser storage (<code>localStorage</code>) to deliver a seamless swapping experience. <strong>We do not use any third-party cross-site advertising cookies or tracking pixels.</strong>
            </p>

            <div className="space-y-2">
              <div className="rounded-xl border border-line bg-canvas p-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink text-xs">Strictly Necessary Storage</p>
                  <span className="text-[10px] font-bold text-brand bg-brand-soft px-2 py-0.5 rounded-full">Always Active</span>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Required to authenticate your session, keep you logged in safely via Supabase JWT, and calculate unread trade messages.
                </p>
              </div>

              <div className="rounded-xl border border-line bg-canvas p-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-ink text-xs">Preferences & Functional Storage</p>
                  <span className="text-[10px] text-muted font-medium">Configurable</span>
                </div>
                <p className="text-[11px] text-muted mt-1">
                  Stores your chosen search radius, selected postal city, and audio notification preferences so you don't have to re-enter them every visit.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <p className="font-semibold text-ink mb-1.5">Manage Your Preferences:</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateConsent('all')}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                    consent === 'all'
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-white text-ink hover:border-brand/40'
                  }`}
                >
                  Accept All
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateConsent('essential')}
                  className={`flex-1 rounded-xl border py-2 text-xs font-semibold transition ${
                    consent === 'essential'
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-white text-ink hover:border-brand/40'
                  }`}
                >
                  Essential Only
                </button>
              </div>
              {savedFeedback && (
                <p className="mt-2 text-center text-xs text-ok font-medium flex items-center justify-center gap-1">
                  <Check size={13} /> Preferences saved
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-line flex justify-end">
        <button type="button" onClick={onClose} className="btn-primary py-2 px-5 text-xs">
          Close
        </button>
      </div>
    </Modal>
  );
}
