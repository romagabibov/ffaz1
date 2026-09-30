// Web Audio API based sound synthesizer for crisp, instant, zero-latency UI sounds
// No external assets required, 100% reliable across browsers and offline

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
 if (typeof window === 'undefined') return null;
 try {
 const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
 if (!AudioContextClass) return null;
 if (!audioCtx || audioCtx.state === 'closed') {
 audioCtx = new AudioContextClass();
 }
 if (audioCtx.state === 'suspended') {
 audioCtx.resume().catch(() => {});
 }
 return audioCtx;
 } catch (e) {
 console.warn('AudioContext not supported or failed to initialize:', e);
 return null;
 }
}

// User preference for sound
const SOUND_STORAGE_KEY = 'azfshn_sound_enabled';

export function isSoundEnabled(): boolean {
 if (typeof window === 'undefined') return true;
 const stored = localStorage.getItem(SOUND_STORAGE_KEY);
 return stored !== 'false'; // default true
}

export function setSoundEnabled(enabled: boolean): void {
 if (typeof window === 'undefined') return;
 localStorage.setItem(SOUND_STORAGE_KEY, enabled ? 'true' : 'false');
}

/**
 * Sound for outgoing / sent messages (Snappy, crisp, subtle upward ding)
 */
export function playMessageSentSound(): void {
 if (!isSoundEnabled()) return;
 const ctx = getAudioContext();
 if (!ctx) return;

 try {
 const now = ctx.currentTime;

 // Master gain
 const masterGain = ctx.createGain();
 masterGain.gain.setValueAtTime(0.12, now);
 masterGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
 masterGain.connect(ctx.destination);

 // Primary tone (Quick melodic sweep 520Hz -> 880Hz)
 const osc1 = ctx.createOscillator();
 osc1.type = 'sine';
 osc1.frequency.setValueAtTime(520, now);
 osc1.frequency.exponentialRampToValueAtTime(880, now + 0.08);

 // Secondary subtle sparkle harmonic (1046Hz)
 const osc2 = ctx.createOscillator();
 const osc2Gain = ctx.createGain();
 osc2.type = 'triangle';
 osc2.frequency.setValueAtTime(1046, now);
 osc2Gain.gain.setValueAtTime(0.04, now);
 osc2Gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

 osc1.connect(masterGain);
 osc2.connect(osc2Gain);
 osc2Gain.connect(ctx.destination);

 osc1.start(now);
 osc1.stop(now + 0.18);
 osc2.start(now);
 osc2.stop(now + 0.12);
 } catch (err) {
 console.warn('Error playing message sent sound:', err);
 }
}

/**
 * Sound for incoming / received message (Two-tone warm bell chime: E5 -> A5)
 */
export function playMessageReceivedSound(): void {
 if (!isSoundEnabled()) return;
 const ctx = getAudioContext();
 if (!ctx) return;

 try {
 const now = ctx.currentTime;

 // Note 1: 659.25 Hz (E5)
 const osc1 = ctx.createOscillator();
 const gain1 = ctx.createGain();
 osc1.type = 'sine';
 osc1.frequency.setValueAtTime(659.25, now);

 gain1.gain.setValueAtTime(0.001, now);
 gain1.gain.linearRampToValueAtTime(0.15, now + 0.015);
 gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

 osc1.connect(gain1);
 gain1.connect(ctx.destination);

 osc1.start(now);
 osc1.stop(now + 0.22);

 // Note 2: 880 Hz (A5) slightly delayed
 const note2Start = now + 0.09;
 const osc2 = ctx.createOscillator();
 const gain2 = ctx.createGain();
 osc2.type = 'sine';
 osc2.frequency.setValueAtTime(880, note2Start);

 gain2.gain.setValueAtTime(0.001, note2Start);
 gain2.gain.linearRampToValueAtTime(0.18, note2Start + 0.015);
 gain2.gain.exponentialRampToValueAtTime(0.001, note2Start + 0.35);

 // Subtle harmonic for crisp glass feel
 const oscHarmonic = ctx.createOscillator();
 const harmonicGain = ctx.createGain();
 oscHarmonic.type = 'triangle';
 oscHarmonic.frequency.setValueAtTime(1760, note2Start);
 harmonicGain.gain.setValueAtTime(0.03, note2Start);
 harmonicGain.gain.exponentialRampToValueAtTime(0.001, note2Start + 0.15);

 osc2.connect(gain2);
 gain2.connect(ctx.destination);
 oscHarmonic.connect(harmonicGain);
 harmonicGain.connect(ctx.destination);

 osc2.start(note2Start);
 osc2.stop(note2Start + 0.35);
 oscHarmonic.start(note2Start);
 oscHarmonic.stop(note2Start + 0.15);
 } catch (err) {
 console.warn('Error playing message received sound:', err);
 }
}

/**
 * Sound for general notifications & alerts (Tri-tone elegant chime: C5 -> E5 -> C6)
 */
export function playNotificationSound(): void {
 if (!isSoundEnabled()) return;
 const ctx = getAudioContext();
 if (!ctx) return;

 try {
 const now = ctx.currentTime;
 const notes = [
 { freq: 523.25, time: 0.0, dur: 0.16, vol: 0.12 }, // C5
 { freq: 659.25, time: 0.08, dur: 0.18, vol: 0.14 }, // E5
 { freq: 1046.5, time: 0.16, dur: 0.40, vol: 0.18 }, // C6
 ];

 notes.forEach(({ freq, time, dur, vol }) => {
 const noteStart = now + time;
 const osc = ctx.createOscillator();
 const gain = ctx.createGain();

 osc.type = 'sine';
 osc.frequency.setValueAtTime(freq, noteStart);

 gain.gain.setValueAtTime(0.001, noteStart);
 gain.gain.linearRampToValueAtTime(vol, noteStart + 0.015);
 gain.gain.exponentialRampToValueAtTime(0.001, noteStart + dur);

 osc.connect(gain);
 gain.connect(ctx.destination);

 osc.start(noteStart);
 osc.stop(noteStart + dur);
 });
 } catch (err) {
 console.warn('Error playing notification sound:', err);
 }
}
