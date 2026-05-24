-- ═══════════════════════════════════════════════════════════════
-- SwitchR: DEFINITIVE Email Trigger Fix
-- ═══════════════════════════════════════════════════════════════
-- PROBLEM: The email notification triggers fire AFTER INSERT on 
-- auth.users. If pg_net or Resend fails, the error propagates 
-- up and ROLLS BACK the entire signup transaction → 500 error 
-- → new accounts cannot be created.
--
-- FIX: Wrap ALL email-sending calls in EXCEPTION handlers so
-- failures are logged as warnings but never block the core 
-- database operation (signup, bid, message, etc.).
-- ═══════════════════════════════════════════════════════════════

-- ┌─────────────────────────────────────────────────────────────┐
-- │  1. Fix private_send_email to be fully non-blocking         │
-- └─────────────────────────────────────────────────────────────┘
-- The root function itself should never throw — catch at source
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
  -- Get config (safely)
  BEGIN
    SELECT value INTO v_api_key FROM public.email_config WHERE key = 'resend_api_key';
    SELECT value INTO v_sender FROM public.email_config WHERE key = 'sender_email';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[SwitchR Email] Config table missing: %', SQLERRM;
    RETURN;
  END;
  
  IF v_api_key IS NULL OR v_api_key = 'YOUR_RESEND_API_KEY' THEN
    RAISE NOTICE 'Email skipped: Resend API key not configured';
    RETURN;
  END IF;

  -- Send via Resend API (async, non-blocking) — wrapped in exception handler
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    -- Log the failure but NEVER let it propagate
    RAISE WARNING '[SwitchR Email] Failed to queue email to %: %', p_to, SQLERRM;
  END;
END;
$$;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  2. Fix Welcome Email trigger (the signup blocker)          │
-- └─────────────────────────────────────────────────────────────┘
CREATE OR REPLACE FUNCTION notify_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_username TEXT;
  v_email TEXT;
  v_html TEXT;
BEGIN
  -- Always return NEW first — signup must never be blocked
  v_email := NEW.email;
  v_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1));
  
  BEGIN
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
           <strong>Make offers &amp; trade</strong> — swap directly or via chain trades
         </td></tr>
       </table>
       <p style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:14px 16px;font-size:13px;color:#166534;margin-top:16px;">
         🌱 Every swap saves an average of <strong>50kg of CO₂</strong> from entering the atmosphere.
       </p>',
      'Start Exploring',
      'https://switchr.app'
    );

    PERFORM private_send_email(v_email, 'Welcome to SwitchR! 🎉 Start trading today', v_html);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[SwitchR Email] Welcome email failed for %: %', v_email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  3. Fix New Offer trigger                                   │
-- └─────────────────────────────────────────────────────────────┘
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
  IF NEW.status <> 'pending' THEN RETURN NEW; END IF;

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[SwitchR Email] Offer notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  4. Fix Offer Status Change trigger                         │
-- └─────────────────────────────────────────────────────────────┘
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
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('accepted', 'declined') THEN RETURN NEW; END IF;

  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[SwitchR Email] Status change notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  5. Fix New Message trigger                                 │
-- └─────────────────────────────────────────────────────────────┘
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
  BEGIN
    SELECT email INTO v_receiver_email FROM auth.users WHERE id = NEW.receiver_id;
    SELECT username INTO v_receiver_name FROM public.profiles WHERE id = NEW.receiver_id;
    SELECT username INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;

    IF v_receiver_email IS NULL THEN RETURN NEW; END IF;

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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[SwitchR Email] Message notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  6. Fix Chain Proposal trigger                              │
-- └─────────────────────────────────────────────────────────────┘
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
  
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[SwitchR Email] Chain proposal notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  7. Fix Chain Accepted trigger                              │
-- └─────────────────────────────────────────────────────────────┘
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
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'active' THEN RETURN NEW; END IF;
  
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[SwitchR Email] Chain accepted notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;


-- ┌─────────────────────────────────────────────────────────────┐
-- │  8. VERIFY the triggers still exist and are attached        │
-- └─────────────────────────────────────────────────────────────┘
-- Re-create the welcome trigger (it should already exist, but ensure it)
DROP TRIGGER IF EXISTS on_user_signup_welcome ON auth.users;
CREATE TRIGGER on_user_signup_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION notify_welcome_email();

-- Re-create bid triggers
DROP TRIGGER IF EXISTS on_new_bid_notify ON public.bids;
CREATE TRIGGER on_new_bid_notify
  AFTER INSERT ON public.bids
  FOR EACH ROW EXECUTE FUNCTION notify_new_offer();

DROP TRIGGER IF EXISTS on_bid_status_change_notify ON public.bids;
CREATE TRIGGER on_bid_status_change_notify
  AFTER UPDATE ON public.bids
  FOR EACH ROW EXECUTE FUNCTION notify_offer_status_change();

-- Re-create message trigger
DROP TRIGGER IF EXISTS on_new_message_notify ON public.messages;
CREATE TRIGGER on_new_message_notify
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION notify_new_message();

-- Re-create chain triggers (only if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='chain_proposals') THEN
    DROP TRIGGER IF EXISTS on_chain_proposal_notify ON public.chain_proposals;
    CREATE TRIGGER on_chain_proposal_notify
      AFTER INSERT ON public.chain_proposals
      FOR EACH ROW EXECUTE FUNCTION notify_chain_proposal();
      
    DROP TRIGGER IF EXISTS on_chain_accepted_notify ON public.chain_proposals;
    CREATE TRIGGER on_chain_accepted_notify
      AFTER UPDATE ON public.chain_proposals
      FOR EACH ROW EXECUTE FUNCTION notify_chain_accepted();
  END IF;
END $$;

-- Also make sure the profile creation trigger still exists
-- (this is CRITICAL — without it, signups create auth.users but no profile row)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ┌─────────────────────────────────────────────────────────────┐
-- │  9. VERIFICATION                                            │
-- └─────────────────────────────────────────────────────────────┘
DO $$
DECLARE
  v_welcome_trigger BOOLEAN;
  v_profile_trigger BOOLEAN;
  v_bid_triggers INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_user_signup_welcome') INTO v_welcome_trigger;
  SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created') INTO v_profile_trigger;
  SELECT COUNT(*) INTO v_bid_triggers FROM pg_trigger WHERE tgname IN ('on_new_bid_notify', 'on_bid_status_change_notify');

  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '  ✅ EMAIL TRIGGERS FIXED (NON-BLOCKING)';
  RAISE NOTICE '  Welcome email trigger: %', CASE WHEN v_welcome_trigger THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  Profile creation trigger: %', CASE WHEN v_profile_trigger THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  Bid notification triggers: %/2', v_bid_triggers;
  RAISE NOTICE '═══════════════════════════════════════════════';
  RAISE NOTICE '  All email functions now use EXCEPTION handlers';
  RAISE NOTICE '  Signups will NEVER be blocked by email failures';
  RAISE NOTICE '═══════════════════════════════════════════════';
END $$;
