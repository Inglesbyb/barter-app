-- ═══════════════════════════════════════════════════════════════
-- SwitchR Email Notification System
-- Uses pg_net extension + Resend API
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════
-- 
-- SETUP REQUIRED:
-- 1. Sign up at https://resend.com (free: 100 emails/day)
-- 2. Get your API key from Resend dashboard
-- 3. Replace 'YOUR_RESEND_API_KEY' below with your actual key
-- 4. Replace 'noreply@yourdomain.com' with your verified sender
--    (or use 'onboarding@resend.dev' for testing)
-- ═══════════════════════════════════════════════════════════════

-- Step 1: Enable pg_net extension (async HTTP from PostgreSQL)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Store configuration in a secure table
CREATE TABLE IF NOT EXISTS public.email_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert your Resend API key and sender email
-- ⚠️ REPLACE THESE VALUES before running!
INSERT INTO public.email_config (key, value) VALUES
  ('resend_api_key', 're_b2naQRQ9_BEwRVnG7sej291Qz6tNMkLm8'),
  ('sender_email', 'onboarding@resend.dev'),
  ('app_name', 'SwitchR'),
  ('app_url', 'https://switchr.app')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Restrict access to config table
ALTER TABLE public.email_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "No public access to email config" ON public.email_config;
CREATE POLICY "No public access to email config" ON public.email_config
  FOR ALL USING (false);


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  CORE: Email sending function                                 ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION private_send_email(
  p_to TEXT,
  p_subject TEXT,
  p_html TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_api_key TEXT;
  v_sender TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get config
  SELECT value INTO v_api_key FROM public.email_config WHERE key = 'resend_api_key';
  SELECT value INTO v_sender FROM public.email_config WHERE key = 'sender_email';
  
  IF v_api_key IS NULL OR v_api_key = 'YOUR_RESEND_API_KEY' THEN
    RAISE NOTICE 'Email skipped: Resend API key not configured';
    RETURN;
  END IF;

  -- Send via Resend API (async, non-blocking)
  SELECT net.http_post(
    url := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_api_key
    ),
    body := jsonb_build_object(
      'from', v_sender,
      'to', p_to,
      'subject', p_subject,
      'html', p_html
    )
  ) INTO v_request_id;
  
  RAISE NOTICE 'Email queued: % → % (request_id: %)', p_subject, p_to, v_request_id;
END;
$$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  HTML EMAIL TEMPLATES                                         ║
-- ╚═══════════════════════════════════════════════════════════════╝

-- Base wrapper function for consistent email styling
CREATE OR REPLACE FUNCTION email_template(
  p_title TEXT,
  p_heading TEXT,
  p_body TEXT,
  p_cta_text TEXT DEFAULT NULL,
  p_cta_url TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_cta_block TEXT := '';
BEGIN
  IF p_cta_text IS NOT NULL AND p_cta_url IS NOT NULL THEN
    v_cta_block := '<tr><td style="padding:30px 0 0;">
      <a href="' || p_cta_url || '" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;letter-spacing:0.5px;">
        ' || p_cta_text || '
      </a>
    </td></tr>';
  END IF;

  RETURN '<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>' || p_title || '</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 36px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr>
        <td style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);border-radius:10px;text-align:center;vertical-align:middle;">
          <span style="color:#fff;font-size:18px;">⚡</span>
        </td>
        <td style="padding-left:10px;color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
          Switch<span style="color:#06b6d4;">R</span>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="font-size:22px;font-weight:800;color:#0f172a;padding-bottom:16px;">' || p_heading || '</td></tr>
      <tr><td style="font-size:15px;color:#475569;line-height:1.7;">' || p_body || '</td></tr>
      ' || v_cta_block || '
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:24px 36px;border-top:1px solid #e2e8f0;">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="font-size:11px;color:#94a3b8;line-height:1.5;">
          You''re receiving this because you have a SwitchR account.<br>
          <a href="#" style="color:#06b6d4;text-decoration:none;">Unsubscribe</a> · 
          <a href="#" style="color:#06b6d4;text-decoration:none;">Email Preferences</a>
        </td>
        <td style="text-align:right;font-size:11px;color:#94a3b8;">
          🌱 Trade. Don''t buy.
        </td>
      </tr>
    </table>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>';
END;
$$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  TRIGGER 1: Welcome Email (on new user signup)                ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION notify_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_username TEXT;
  v_email TEXT;
  v_html TEXT;
BEGIN
  v_email := NEW.email;
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  v_html := email_template(
    'Welcome to SwitchR!',
    'Welcome to SwitchR, ' || v_username || '! 🎉',
    '<p>You''re now part of a community that believes in trading, not buying.</p>
     <p style="margin-top:16px;">Here''s how to get started:</p>
     <table cellpadding="0" cellspacing="0" style="margin:16px 0;">
       <tr><td style="padding:8px 0;color:#0f172a;">
         <span style="display:inline-block;width:28px;height:28px;background:#06b6d4;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-weight:800;font-size:13px;margin-right:10px;">1</span>
         <strong>List your items</strong> — snap a photo and post in seconds
       </td></tr>
       <tr><td style="padding:8px 0;color:#0f172a;">
         <span style="display:inline-block;width:28px;height:28px;background:#8b5cf6;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-weight:800;font-size:13px;margin-right:10px;">2</span>
         <strong>Swipe to discover</strong> — find items you want from others
       </td></tr>
       <tr><td style="padding:8px 0;color:#0f172a;">
         <span style="display:inline-block;width:28px;height:28px;background:#10b981;color:#fff;border-radius:50%;text-align:center;line-height:28px;font-weight:800;font-size:13px;margin-right:10px;">3</span>
         <strong>Make offers & trade</strong> — swap directly or via chain trades
       </td></tr>
     </table>
     <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;font-size:13px;color:#166534;margin-top:16px;">
       🌱 Every swap saves an average of <strong>50kg of CO₂</strong> from entering the atmosphere.
     </p>',
    'Start Exploring',
    'https://switchr.app'
  );

  PERFORM private_send_email(v_email, 'Welcome to SwitchR! 🎉 Start trading today', v_html);
  RETURN NEW;
END;
$$;

-- Attach to auth.users (fires on signup)
DROP TRIGGER IF EXISTS on_user_signup_welcome ON auth.users;
CREATE TRIGGER on_user_signup_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION notify_welcome_email();


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  TRIGGER 2: New Offer Received                                ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION notify_new_offer()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_receiver_email TEXT;
  v_receiver_name TEXT;
  v_bidder_name TEXT;
  v_item_offered TEXT;
  v_item_wanted TEXT;
  v_html TEXT;
BEGIN
  -- Only notify on new pending bids
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  -- Get receiver email
  SELECT email INTO v_receiver_email FROM auth.users WHERE id = NEW.receiver_id;
  SELECT username INTO v_receiver_name FROM public.profiles WHERE id = NEW.receiver_id;
  SELECT username INTO v_bidder_name FROM public.profiles WHERE id = NEW.bidder_id;
  SELECT title INTO v_item_offered FROM public.items WHERE id = NEW.item_offered_id;
  SELECT title INTO v_item_wanted FROM public.items WHERE id = NEW.item_wanted_id;

  IF v_receiver_email IS NULL THEN RETURN NEW; END IF;

  v_html := email_template(
    'New Offer on SwitchR',
    'You have a new swap offer! 🤝',
    '<p>Hey ' || COALESCE(v_receiver_name, 'there') || ',</p>
     <p><strong>' || COALESCE(v_bidder_name, 'Someone') || '</strong> wants to swap with you!</p>
     
     <table cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
       <tr>
         <td style="background:#f0fdfa;padding:16px 20px;border-bottom:1px solid #e2e8f0;">
           <span style="font-size:10px;font-weight:800;color:#0d9488;text-transform:uppercase;letter-spacing:1px;">They''re offering</span><br>
           <span style="font-size:16px;font-weight:700;color:#0f172a;">' || COALESCE(v_item_offered, 'An item') || '</span>
         </td>
       </tr>
       <tr>
         <td style="background:#faf5ff;padding:16px 20px;">
           <span style="font-size:10px;font-weight:800;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">For your</span><br>
           <span style="font-size:16px;font-weight:700;color:#0f172a;">' || COALESCE(v_item_wanted, 'item') || '</span>
         </td>
       </tr>
     </table>
     
     <p style="color:#64748b;font-size:14px;">Open SwitchR to accept, decline, or start a conversation.</p>',
    'View Offer →',
    'https://switchr.app'
  );

  PERFORM private_send_email(v_receiver_email, '🤝 ' || COALESCE(v_bidder_name, 'Someone') || ' wants to swap with you!', v_html);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_bid_notify ON public.bids;
CREATE TRIGGER on_new_bid_notify
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION notify_new_offer();


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  TRIGGER 3: Offer Accepted / Declined                         ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION notify_offer_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_bidder_email TEXT;
  v_bidder_name TEXT;
  v_receiver_name TEXT;
  v_item_offered TEXT;
  v_item_wanted TEXT;
  v_html TEXT;
  v_subject TEXT;
  v_heading TEXT;
  v_body TEXT;
BEGIN
  -- Only fire when status actually changes to accepted or declined
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('accepted', 'declined') THEN RETURN NEW; END IF;

  SELECT email INTO v_bidder_email FROM auth.users WHERE id = NEW.bidder_id;
  SELECT username INTO v_bidder_name FROM public.profiles WHERE id = NEW.bidder_id;
  SELECT username INTO v_receiver_name FROM public.profiles WHERE id = NEW.receiver_id;
  SELECT title INTO v_item_offered FROM public.items WHERE id = NEW.item_offered_id;
  SELECT title INTO v_item_wanted FROM public.items WHERE id = NEW.item_wanted_id;

  IF v_bidder_email IS NULL THEN RETURN NEW; END IF;

  IF NEW.status = 'accepted' THEN
    v_subject := '🎉 Your offer was accepted!';
    v_heading := 'Your swap was accepted! 🎉';
    v_body := '<p>Great news, ' || COALESCE(v_bidder_name, 'there') || '!</p>
      <p><strong>' || COALESCE(v_receiver_name, 'The owner') || '</strong> accepted your offer to swap <strong>' || COALESCE(v_item_offered, 'your item') || '</strong> for their <strong>' || COALESCE(v_item_wanted, 'item') || '</strong>.</p>
      <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;font-size:14px;color:#166534;margin-top:16px;">
        💬 You can now message each other to arrange the swap!
      </p>';
  ELSE
    v_subject := 'Your offer was declined';
    v_heading := 'Offer update';
    v_body := '<p>Hey ' || COALESCE(v_bidder_name, 'there') || ',</p>
      <p>Unfortunately, <strong>' || COALESCE(v_receiver_name, 'the owner') || '</strong> declined your offer for <strong>' || COALESCE(v_item_wanted, 'their item') || '</strong>.</p>
      <p style="color:#64748b;margin-top:16px;">Don''t worry — there are plenty more items to discover! Keep swiping and you''ll find the perfect swap. 💪</p>';
  END IF;

  v_html := email_template(
    v_subject, v_heading, v_body,
    CASE WHEN NEW.status = 'accepted' THEN 'Open Chat →' ELSE 'Keep Exploring →' END,
    'https://switchr.app'
  );

  PERFORM private_send_email(v_bidder_email, v_subject, v_html);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_bid_status_change_notify ON public.bids;
CREATE TRIGGER on_bid_status_change_notify
  AFTER UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION notify_offer_status_change();


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  TRIGGER 4: New Message Received                              ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_receiver_email TEXT;
  v_receiver_name TEXT;
  v_sender_name TEXT;
  v_preview TEXT;
  v_html TEXT;
BEGIN
  -- Get receiver email & names
  SELECT email INTO v_receiver_email FROM auth.users WHERE id = NEW.receiver_id;
  SELECT username INTO v_receiver_name FROM public.profiles WHERE id = NEW.receiver_id;
  SELECT username INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

  IF v_receiver_email IS NULL THEN RETURN NEW; END IF;

  -- Truncate message preview
  v_preview := LEFT(NEW.content, 100);
  IF LENGTH(NEW.content) > 100 THEN v_preview := v_preview || '...'; END IF;

  v_html := email_template(
    'New Message on SwitchR',
    'New message from ' || COALESCE(v_sender_name, 'someone') || ' 💬',
    '<p>Hey ' || COALESCE(v_receiver_name, 'there') || ',</p>
     <p><strong>' || COALESCE(v_sender_name, 'Someone') || '</strong> sent you a message:</p>
     <div style="background:#f8fafc;border-left:4px solid #06b6d4;padding:16px 20px;border-radius:0 12px 12px 0;margin:16px 0;font-style:italic;color:#334155;">
       "' || v_preview || '"
     </div>
     <p style="color:#64748b;font-size:13px;">Reply in the app to keep the conversation going.</p>',
    'Reply Now →',
    'https://switchr.app'
  );

  PERFORM private_send_email(v_receiver_email, '💬 New message from ' || COALESCE(v_sender_name, 'someone'), v_html);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  TRIGGER 5: Chain Match Discovered                            ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION notify_chain_proposal()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_participant_id UUID;
  v_email TEXT;
  v_username TEXT;
  v_chain_size INTEGER;
  v_html TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;
  
  v_chain_size := array_length(NEW.participant_ids, 1);

  FOREACH v_participant_id IN ARRAY NEW.participant_ids LOOP
    SELECT email INTO v_email FROM auth.users WHERE id = v_participant_id;
    SELECT username INTO v_username FROM public.profiles WHERE id = v_participant_id;

    IF v_email IS NULL THEN CONTINUE; END IF;

    v_html := email_template(
      'Chain Match Found!',
      'A ' || v_chain_size || '-way trade chain was found! 🔗',
      '<p>Hey ' || COALESCE(v_username, 'there') || ',</p>
       <p>Our Chain Engine just discovered a <strong>' || v_chain_size || '-way circular trade</strong> that includes you!</p>
       <div style="background:linear-gradient(135deg,#faf5ff,#f0fdfa);border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:16px 0;text-align:center;">
         <span style="font-size:32px;">🔄</span>
         <p style="font-size:14px;font-weight:700;color:#0f172a;margin:8px 0 0;">
           ' || v_chain_size || ' traders, ' || v_chain_size || ' items — everyone gets what they want!
         </p>
       </div>
       <p style="color:#64748b;font-size:14px;">Open SwitchR to review the chain and accept your part of the trade.</p>',
      'View Chain →',
      'https://switchr.app'
    );

    PERFORM private_send_email(v_email, '🔗 ' || v_chain_size || '-way chain trade found!', v_html);
  END LOOP;

  RETURN NEW;
END;
$$;

-- Only create if chain_proposals table exists
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chain_proposals') THEN
    DROP TRIGGER IF EXISTS on_chain_proposal_notify ON public.chain_proposals;
    CREATE TRIGGER on_chain_proposal_notify
      AFTER INSERT ON public.chain_proposals
      FOR EACH ROW EXECUTE FUNCTION notify_chain_proposal();
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  TRIGGER 6: Chain Fully Accepted (all participants agreed)    ║
-- ╚═══════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION notify_chain_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_participant_id UUID;
  v_email TEXT;
  v_username TEXT;
  v_chain_size INTEGER;
  v_html TEXT;
BEGIN
  -- Only fire when status changes to 'active' (all accepted)
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  
  v_chain_size := array_length(NEW.participant_ids, 1);

  FOREACH v_participant_id IN ARRAY NEW.participant_ids LOOP
    SELECT email INTO v_email FROM auth.users WHERE id = v_participant_id;
    SELECT username INTO v_username FROM public.profiles WHERE id = v_participant_id;

    IF v_email IS NULL THEN CONTINUE; END IF;

    v_html := email_template(
      'Chain Trade Confirmed!',
      'All traders accepted — it''s a go! 🎉',
      '<p>Hey ' || COALESCE(v_username, 'there') || ',</p>
       <p>All <strong>' || v_chain_size || ' participants</strong> in your chain trade have accepted!</p>
       <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:16px;padding:20px;margin:16px 0;text-align:center;">
         <span style="font-size:40px;">🎉</span>
         <p style="font-size:16px;font-weight:800;color:#166534;margin:8px 0 0;">Chain Trade Confirmed!</p>
         <p style="font-size:13px;color:#15803d;margin:4px 0 0;">' || v_chain_size || '-way swap is now active</p>
       </div>
       <p style="color:#64748b;font-size:14px;">Open the app to coordinate with your trade partners and arrange the exchange.</p>',
      'Open SwitchR →',
      'https://switchr.app'
    );

    PERFORM private_send_email(v_email, '🎉 Chain trade confirmed — all ' || v_chain_size || ' traders are in!', v_html);
  END LOOP;

  RETURN NEW;
END;
$$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chain_proposals') THEN
    DROP TRIGGER IF EXISTS on_chain_accepted_notify ON public.chain_proposals;
    CREATE TRIGGER on_chain_accepted_notify
      AFTER UPDATE ON public.chain_proposals
      FOR EACH ROW EXECUTE FUNCTION notify_chain_accepted();
  END IF;
END $$;


-- ╔═══════════════════════════════════════════════════════════════╗
-- ║  VERIFICATION                                                 ║
-- ╚═══════════════════════════════════════════════════════════════╝

DO $$
DECLARE
  v_triggers INTEGER;
  v_functions INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_triggers FROM pg_trigger WHERE tgname LIKE '%_notify%' OR tgname LIKE '%welcome%';
  SELECT COUNT(*) INTO v_functions FROM pg_proc WHERE proname LIKE 'notify_%' OR proname = 'private_send_email' OR proname = 'email_template';

  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '  ✅ EMAIL SYSTEM INSTALLED';
  RAISE NOTICE '  Triggers: %', v_triggers;
  RAISE NOTICE '  Functions: %', v_functions;
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '  NEXT: Replace YOUR_RESEND_API_KEY in email_config';
  RAISE NOTICE '  Run: UPDATE email_config SET value = ''re_xxxxx'' WHERE key = ''resend_api_key'';';
  RAISE NOTICE '═══════════════════════════════════════════';
END $$;
