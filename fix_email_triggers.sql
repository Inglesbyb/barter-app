-- ═══════════════════════════════════════════════════════════════
-- SwitchR: Fix Email Triggers (Non-Blocking)
-- ═══════════════════════════════════════════════════════════════
-- This script updates the email notification functions to catch
-- any errors (like pg_net not being enabled) so that they don't
-- block core actions like signing up or creating an offer.

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
     </table>',
    'Start Exploring',
    'https://switchr.app'
  );

  -- Wrap the email sending in a try/catch block so it doesn't fail the signup
  BEGIN
    PERFORM private_send_email(v_email, 'Welcome to SwitchR! 🎉 Start trading today', v_html);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Email notification failed: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$;

-- Also update the other notification triggers to be non-blocking:
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

  SELECT email INTO v_receiver_email FROM auth.users WHERE id = NEW.receiver_id;
  SELECT username INTO v_receiver_name FROM public.profiles WHERE id = NEW.receiver_id;
  SELECT username INTO v_bidder_name FROM public.profiles WHERE id = NEW.bidder_id;
  SELECT title INTO v_item_offered FROM public.items WHERE id = NEW.item_offered_id;
  SELECT title INTO v_item_wanted FROM public.items WHERE id = NEW.item_wanted_id;

  IF v_receiver_email IS NULL THEN RETURN NEW; END IF;

  v_html := email_template(
    'New Offer on SwitchR',
    'You have a new swap offer! 🤝',
    '<p>Someone wants to swap with you!</p>',
    'View Offer →',
    'https://switchr.app'
  );

  BEGIN
    PERFORM private_send_email(v_receiver_email, '🤝 ' || COALESCE(v_bidder_name, 'Someone') || ' wants to swap with you!', v_html);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Email notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_offer_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_bidder_email TEXT;
  v_subject TEXT;
  v_html TEXT;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('accepted', 'declined') THEN RETURN NEW; END IF;

  SELECT email INTO v_bidder_email FROM auth.users WHERE id = NEW.bidder_id;
  IF v_bidder_email IS NULL THEN RETURN NEW; END IF;

  v_subject := CASE WHEN NEW.status = 'accepted' THEN '🎉 Your offer was accepted!' ELSE 'Your offer was declined' END;
  v_html := email_template(v_subject, v_subject, '<p>Check your SwitchR app for details.</p>', 'Open SwitchR →', 'https://switchr.app');

  BEGIN
    PERFORM private_send_email(v_bidder_email, v_subject, v_html);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Email notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;
