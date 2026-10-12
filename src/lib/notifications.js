import { supabase } from './supabase';
import { navigate } from './core';

// --- AUDIO NOTIFICATIONS (Web Audio API Synthesizer) ---
// Generates pleasant, latency-free notification chimes without external MP3 dependencies
let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a gentle, modern two-tone message chime (D5 -> A5)
 */
export function playMessageSound() {
  try {
    const isMuted = localStorage.getItem('switchr_sound_muted') === 'true';
    if (isMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // First note: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.28);

    // Second note: 880 Hz (A5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.09);
    gain2.gain.setValueAtTime(0, now + 0.09);
    gain2.gain.linearRampToValueAtTime(0.24, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.09);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.debug('Message audio chime could not be played:', err);
  }
}

/**
 * Play an upbeat success/celebration chime (for trade accepted or completed)
 */
export function playTradeAlertSound() {
  try {
    const isMuted = localStorage.getItem('switchr_sound_muted') === 'true';
    if (isMuted) return;

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 arpeggio

    notes.forEach((freq, idx) => {
      const start = now + idx * 0.07;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.15, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch (err) {
    console.debug('Trade alert chime could not be played:', err);
  }
}

// --- BROWSER / OS PUSH NOTIFICATIONS ---

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return 'denied';
  }
}

export function showBrowserNotification(title, body, onClick) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      silent: false,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }
  } catch (err) {
    console.debug('Browser notification failed:', err);
  }
}

// --- UNREAD MESSAGE TRACKING ---

const UNREAD_CHANGE_EVENT = 'switchr:unread-change';

export function markTradeAsRead(tradeId) {
  if (!tradeId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`switchr_last_read_${tradeId}`, new Date().toISOString());
    window.dispatchEvent(new CustomEvent(UNREAD_CHANGE_EVENT, { detail: { tradeId } }));
  } catch {}
}

export function getTradeLastRead(tradeId) {
  if (!tradeId || typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`switchr_last_read_${tradeId}`);
  } catch {
    return null;
  }
}

export function subscribeToUnreadChanges(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e) => callback(e?.detail);
  window.addEventListener(UNREAD_CHANGE_EVENT, handler);
  return () => window.removeEventListener(UNREAD_CHANGE_EVENT, handler);
}

// Sound preferences
export function isSoundMuted() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('switchr_sound_muted') === 'true';
}

export function toggleSoundMuted() {
  if (typeof window === 'undefined') return false;
  const current = isSoundMuted();
  localStorage.setItem('switchr_sound_muted', (!current).toString());
  return !current;
}

/**
 * Calculates how many active accepted trades have unread messages from trading partner
 */
export async function getUnreadTradeCount(userId) {
  if (!userId || !supabase) return 0;
  try {
    const { data: activeTrades } = await supabase
      .from('trades')
      .select('id, updated_at')
      .eq('status', 'accepted')
      .or(`initiator_id.eq.${userId},receiver_id.eq.${userId}`);

    if (!activeTrades || activeTrades.length === 0) return 0;

    let unreadCount = 0;
    await Promise.all(
      activeTrades.map(async (trade) => {
        const lastRead = getTradeLastRead(trade.id);
        let query = supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('trade_id', trade.id)
          .neq('sender_id', userId);

        if (lastRead) {
          query = query.gt('created_at', lastRead);
        }

        const { count } = await query;
        if (count && count > 0) {
          unreadCount += 1;
        }
      }),
    );

    return unreadCount;
  } catch {
    return 0;
  }
}

