// lib/feedback.ts
// Web Audio API helpers for synthesized click/pop sounds (no audio files).
// Web Vibration API with visual shake/glow fallback for iOS.

/** Create or resume an AudioContext lazily (must be called from a user gesture) */
let _ctx: AudioContext | null = null;
export function getAudioContext(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (_ctx.state === 'suspended') {
    _ctx.resume();
  }
  return _ctx;
}

/** Short square-wave blip for the capsule split drag threshold */
export function playClickSound(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  } catch {/* Safari may deny in some contexts */}
}

/** Sine sweep 400 → 1300 Hz pop for the capsule completion */
export function playPopSound(): void {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.18);
  } catch {/* Safari may deny */}
}

/** Haptic feedback with visual fallback for iOS (no Vibration API) */
export function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
  // iOS fallback: apply a CSS class that triggers shake/glow animation
  // Components listen for custom event 'cc:shake' and apply the class
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cc:shake', { detail: { pattern } }));
  }
}

/** Speak text using SpeechSynthesis in the given language */
export function speak(text: string, lang: string = 'en-IN', rate: number = 0.9): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = lang;
  utter.rate = rate;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

/** Speak text sentence-by-sentence as streaming chunks arrive */
export function speakChunk(chunk: string, lang: string = 'en-IN'): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(chunk);
  utter.lang = lang;
  utter.rate = 0.9;
  window.speechSynthesis.speak(utter);
}

