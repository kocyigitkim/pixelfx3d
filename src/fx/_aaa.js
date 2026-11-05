// PLAN5 recipe layers: impact burst (flash sprite, capped light, erode shock, ring, dust crown, debris, ground marks).
import { ringSheet } from '../core/meshes.js'; import { ENV } from '../core/feel.js'; import { Decal } from '../core/prims.js';
export const LCAP = [0, 25, 70, 140], LK = [0, 12, 9, 6];
export const SHOCK = [[0, '#ffd9a0'], [0.5, '#ff9a40'], [1, '#7a2a08']], SCORCH = [[0, '#1a1410'], [0.5, '#f60'], [1, '#fc8']];
export const DUSTC = [[0, '#5a4a3a', 0], [0.12, '#3a3028', 0.35], [1, '#2a2420', 0]];
export const tierOf = (fx, o = {}) => Math.min(3, Math.max(1, Math.round(o.tier ?? fx.tier ?? 2)));
export const capL = (fx, i, o) => Math.min(i, LCAP[tierOf(fx, o)]);
export function burst(fx, pos, t, o = {}) {
  const b = (fx._bt ||= []); if (b.some((x) => Math.abs(x - t) < 0.05)) return; b.push(t); // one burst per hit time
  const T = tierOf(fx, o), L = fx.loop, gnd = o.ground ?? pos[1] < 0.35, r = o.r ?? [0, 2.5, 4, 5][T], ramp = o.ramp ?? SHOCK, G = [pos[0], 0.02, pos[2]];
  const cd = (d) => (L ? Math.min(d, Math.max(0.05, fx.duration - t - 0.02)) : d); // loops: every layer ends before the wrap
  if (o.impact !== false && !L && !(fx.actor?.hits || []).some((h) => Math.abs(h.t - t) < 0.05)) fx.impact({ t, strength: [0, 0.4, 0.7, 1][T], dir: o.dir ?? [0, -1, 0], pos });
  if (o.flash !== false) fx.emitter({ count: 1, kind: 'soft', blend: 'add', shape: 'point', pos, speed: 0, life: [0.05, 0.05], size: [0.3 + 0.13 * T, 0.3 + 0.13 * T], ramp: [[0, '#fff6e0', 1], [1, ramp[1][1], 0.6]], intensity: 8, delay: t, emit: 0.001 });
  if (o.light !== false) fx.light({ color: o.col ?? ramp[1][1], intensity: LCAP[T], pos: [pos[0] + 0.2, pos[1] + 0.8, pos[2] + 0.8], range: 8, t0: t - 0.02, dur: cd(1.2), env: (u) => ENV.impact(u - t, LK[T]) });
  if (!gnd) { fx.ring({ t0: t, dur: cd(0.4), r: [0.1, r * 0.4], width: [0.1, 0.02], normal: 'cam', pos, intensity: 0.3, fill: 0, ramp }); return; }
  const sh = fx.erode({ geo: ringSheet({ r0: 0.55, r1: 1 }), erode: [0.25, 1], tile: [6, 1], scroll: [1.5, 0], blend: 'add', intensity: 0.4, ramp, pos: G, t0: t, dur: cd(0.5) });
  fx.on((u) => { const s = 0.3 + (r - 0.3) * Math.min(1, Math.max(0, (u - t) / cd(0.5))); sh.obj.scale.set(s, 1, s); });
  fx.ring({ refract: 0.02, dark: 0.3, t0: t, dur: cd(0.8), r: [0.2, r * 1.1], width: [0.12, 0.03], normal: 'up', pos: G, intensity: 0.3, fill: 0, ramp });
  if (o.dust !== false) fx.emitter({ count: [0, 16, 26, 36][T], kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 1, radiusIn: 0.6, pos: [pos[0], 0.1, pos[2]], dir: [0, 0.3, 0], spread: 0.3, radial: 1, speed: [1.5, 3], life: [cd(1.2), cd(1.8)], size: [1.12, 1.96], ramp: DUSTC, intensity: 0.6, drag: 1.6, order: -1, delay: t, emit: 0.1 });
  if (L) return; // loops: no debris / marks (seam)
  if (o.debris !== false) fx.debris({ count: [0, 8, 18, 30][T], pos: [pos[0], 0.1, pos[2]], speed: [3, 7], spread: 0.8, size: [0.04, 0.1], life: 2.2, color: '#4a4038', t0: t });
  const nd = fx.parts.filter((p) => p instanceof Decal).length, D = Math.max(0.3, fx.duration - t - 0.05);
  if (o.marks !== false && nd < 2 && T >= 2) fx.decal({ kind: 'cracks', t0: t, dur: D, r: [r * 0.6, r * 0.7], fade: [0.05, D * 0.7], heat: [1, 0.1], reveal: 0.4, cells: 4, ramp: o.crackRamp, pos: G });
  if (o.marks !== false && nd < 1 && o.scorch !== false) fx.decal({ kind: 'scorch', t0: t, dur: D, r: [r * 0.3, r * 0.4], fade: [0.05, D * 0.7], heat: [1, 0], ramp: o.scorchRamp ?? SCORCH, pos: G });
}
