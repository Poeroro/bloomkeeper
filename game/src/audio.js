// Bloomkeeper's sounds: small WebAudio blips drawn from oscillators, no audio files. The
// context is created lazily on the first user gesture (browsers refuse it sooner), every call
// is wrapped so a silent machine or a blocked context never breaks the game, and the busy
// sounds (shots, bites) are throttled so a swarm does not turn into noise.

let context = null;
const lastPlayed = {};

function ensureContext() {
  if (context) {
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
    return context;
  } catch {
    return null;
  }
}

/** Call from any pointer or key handler so the context unlocks on a real gesture. */
export function unlockAudio() {
  ensureContext();
}

function blip(name, options) {
  const { freq, end, dur, type, gain, gap } = Object.assign(
    { freq: 440, end: null, dur: 0.12, type: 'sine', gain: 0.07, gap: 0 },
    options || {},
  );
  const now = performance.now();
  if (gap > 0 && lastPlayed[name] && now - lastPlayed[name] < gap) return;
  lastPlayed[name] = now;
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    const t = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (end !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), t + dur);
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  } catch {
    // Sound is garnish; the game plays on without it.
  }
}

/** A soft sprout pop when a flower is planted. */
export function plantSound() {
  blip('plant', { freq: 280, end: 560, dur: 0.14, type: 'triangle', gain: 0.09 });
}

/** A denied buzz when a planting cannot be afforded or the plot is taken. */
export function deniedSound() {
  blip('denied', { freq: 160, end: 110, dur: 0.12, type: 'square', gain: 0.04 });
}

/** A tiny pip each time a flower looses a pollen shot. */
export function shootSound() {
  blip('shoot', { freq: 880, end: 660, dur: 0.05, type: 'sine', gain: 0.025, gap: 70 });
}

/** A round pop when a beetle bursts. */
export function popSound() {
  blip('pop', { freq: 520, end: 180, dur: 0.1, type: 'triangle', gain: 0.08, gap: 50 });
}

/** A low crunch while a beetle chews the garden, kept sparse. */
export function chewSound() {
  blip('chew', { freq: 120, end: 80, dur: 0.09, type: 'sawtooth', gain: 0.03, gap: 450 });
}

/** A rising three-note chime for holding the garden through the last wave. */
export function winSound() {
  blip('win1', { freq: 523, dur: 0.16, type: 'triangle', gain: 0.09 });
  setTimeout(() => blip('win2', { freq: 659, dur: 0.16, type: 'triangle', gain: 0.09 }), 130);
  setTimeout(() => blip('win3', { freq: 784, dur: 0.3, type: 'triangle', gain: 0.1 }), 260);
}

/** A falling two-note sigh for a garden eaten bare. */
export function loseSound() {
  blip('lose1', { freq: 392, end: 330, dur: 0.25, type: 'triangle', gain: 0.09 });
  setTimeout(() => blip('lose2', { freq: 262, end: 196, dur: 0.4, type: 'triangle', gain: 0.09 }), 200);
}
