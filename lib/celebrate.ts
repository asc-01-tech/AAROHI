// lib/celebrate.ts
// Thin dynamic import wrapper for canvas-confetti.
// Loaded only when first used to keep the elder home bundle minimal.

let _confetti: ((opts?: unknown) => Promise<null>) | null = null;

export async function launchConfetti(): Promise<void> {
  if (!_confetti) {
    const mod = await import('canvas-confetti');
    _confetti = mod.default as (opts?: unknown) => Promise<null>;
  }
  _confetti({
    particleCount: 150,
    spread: 90,
    origin: { y: 0.6 },
    colors: ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b'],
  });
}

