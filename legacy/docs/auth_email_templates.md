# SwitchR — Supabase Auth Email Templates

Paste these into your Supabase Dashboard:
**Authentication → Email Templates**

---

## 1. Confirm Signup

**Subject:** `Verify your SwitchR account ✓`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 36px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);border-radius:10px;text-align:center;vertical-align:middle;"><span style="color:#fff;font-size:18px;">⚡</span></td>
      <td style="padding-left:10px;color:#fff;font-size:22px;font-weight:900;">Switch<span style="color:#06b6d4;">R</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px;">
    <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px;">Verify your email ✓</h1>
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 24px;">
      Welcome to SwitchR! Click the button below to verify your email address and start trading.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;letter-spacing:0.5px;">
      Verify My Email
    </a>
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;">If you didn't create an account, you can safely ignore this email.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">🌱 Trade. Don't buy. — SwitchR</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>
```

---

## 2. Magic Link

**Subject:** `Your SwitchR login link 🔐`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 36px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);border-radius:10px;text-align:center;vertical-align:middle;"><span style="color:#fff;font-size:18px;">⚡</span></td>
      <td style="padding-left:10px;color:#fff;font-size:22px;font-weight:900;">Switch<span style="color:#06b6d4;">R</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px;">
    <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px;">Your login link 🔐</h1>
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 24px;">
      Click the button below to securely sign in to your SwitchR account. This link expires in 1 hour.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;">
      Sign In to SwitchR
    </a>
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;">If you didn't request this, ignore this email.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">🌱 Trade. Don't buy. — SwitchR</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>
```

---

## 3. Reset Password

**Subject:** `Reset your SwitchR password`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 36px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);border-radius:10px;text-align:center;vertical-align:middle;"><span style="color:#fff;font-size:18px;">⚡</span></td>
      <td style="padding-left:10px;color:#fff;font-size:22px;font-weight:900;">Switch<span style="color:#06b6d4;">R</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px;">
    <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px;">Reset your password 🔑</h1>
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 24px;">
      We received a request to reset your password. Click the button below to choose a new one.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;">
      Reset Password
    </a>
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;">If you didn't request a password reset, your account is safe — just ignore this.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">🌱 Trade. Don't buy. — SwitchR</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>
```

---

## 4. Change Email Address

**Subject:** `Confirm your new email address`

```html
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 20px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
  <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 36px;text-align:center;">
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;"><tr>
      <td style="width:36px;height:36px;background:linear-gradient(135deg,#06b6d4,#8b5cf6);border-radius:10px;text-align:center;vertical-align:middle;"><span style="color:#fff;font-size:18px;">⚡</span></td>
      <td style="padding-left:10px;color:#fff;font-size:22px;font-weight:900;">Switch<span style="color:#06b6d4;">R</span></td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:36px;">
    <h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 16px;">Confirm your new email ✉️</h1>
    <p style="font-size:15px;color:#475569;line-height:1.7;margin:0 0 24px;">
      Click below to confirm changing your email address for your SwitchR account.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:linear-gradient(135deg,#06b6d4,#8b5cf6);color:#fff;text-decoration:none;padding:14px 32px;border-radius:50px;font-weight:800;font-size:14px;">
      Confirm Email Change
    </a>
    <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;">If you didn't request this change, contact support immediately.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:20px 36px;border-top:1px solid #e2e8f0;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">🌱 Trade. Don't buy. — SwitchR</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>
```
