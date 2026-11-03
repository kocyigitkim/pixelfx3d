// Deterministic seeded RNG (mulberry32). Every random number in an effect comes from here.
export function makeRng(seed = 1) {
  let a = (seed >>> 0) || 1;
  const r = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.range = (lo, hi) => lo + (hi - lo) * r();
  r.pick = (arr) => arr[Math.floor(r() * arr.length) % arr.length];
  r.sign = () => (r() < 0.5 ? -1 : 1);
  return r;
}
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a || 1e-6)); return t * t * (3 - 2 * t); };
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeInOut = (t) => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
// 0..1 window with fade in / out (seconds). Returns 0 outside [t0, t0+dur].
export const win = (t, t0, dur, fi = 0, fo = 0) => {
  const u = t - t0; if (u < 0 || u > dur) return 0;
  return Math.min(fi > 0 ? u / fi : 1, fo > 0 ? (dur - u) / fo : 1, 1);
};
