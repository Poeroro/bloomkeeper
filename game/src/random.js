// A tiny seeded random source (mulberry32). The game takes its randomness from one of these so
// a screenshot scene with a fixed seed always grows the same garden, while a real game seeds
// it from the clock.

export function makeRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A random float in [min, max). */
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

/** A random whole number in [min, max], both ends included. */
export function intRange(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

/** One element of `items`, chosen by the rng. */
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
