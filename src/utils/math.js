// Small, dependency-free math helpers reused across systems.

export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

export const lerp = (a, b, t) => a + (b - a) * t;

export const randRange = (min, max) => min + Math.random() * (max - min);

export const randInt = (min, max) => Math.floor(randRange(min, max + 1));

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const chance = (p) => Math.random() < p;

// Approach `current` toward `target` by at most `maxDelta` (frame-rate friendly).
export const approach = (current, target, maxDelta) => {
  if (current < target) return Math.min(current + maxDelta, target);
  if (current > target) return Math.max(current - maxDelta, target);
  return target;
};

export const sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
