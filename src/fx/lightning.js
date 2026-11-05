import * as THREE from 'three';
import { ENV } from '../core/feel.js';
import { burst } from './_aaa.js';

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const hs = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const win = (t, a, d, fi = 0.03, fo = 0.1) => sm(a, a + fi + 1e-4, t) * (1 - sm(a + d - fo, a + d, t));
const pulses = (list) => (t) => { let m = 0; for (const [a, d] of list) m = Math.max(m, win(t, a, d, 0.015, d * 0.7)); return m; };

const BOLT = [[0, '#e8f2ff'], [0.35, '#c4d4ff'], [1, '#6a5cff']];
const BOLT_P = [[0, '#f0e8ff'], [0.3, '#f0b8ff'], [1, '#8a3cff']];
const sparkRamp = [[0, '#e8f2ff'], [0.35, '#bcd0ff'], [1, '#4c3cd0', 0]];
const glintRamp = [[0, '#ffffff', 0], [0.2, '#ffffff', 1], [1, '#a8b8ff', 0]];
const grayCloud = [[0, '#8a93a2', 0], [0.2, '#9aa3b2', 0.9], [0.7, '#737c8c', 0.8], [1, '#4a5160', 0]];

const metal = (c = '#8a919c', r = 0.35, m = 0.9) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const dummyFig = (mat) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 4, 12), mat); b.position.y = 0.65; g.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), mat); h.position.y = 1.3; g.add(h); return g; };

export default [
  /* ------------------------------------------------ ball lightning */
  { id: 'lightning/ball-lightning', name: 'Ball lightning', category: 'lightning', loop: true, duration: 4, stage: { sky: 'storm', bloom: 0.5, view: { pos: [2.8, 1.7, 3.8], target: [0, 0.8, 0], fov: 42 } },
    build(fx) {
      const P = (t) => [0.95 * Math.sin(TAU * t / 4), 1.0 + 0.12 * Math.sin(TAU * t / 2), 0.75 * Math.sin(TAU * t / 2 + 1)];
      fx.orb({ kind: 'plasma', r: [0.2, 0.2], intensity: 1.3, noise: 3, scroll: 2.2, disp: 0.35, power: 2, ramp: [[0, '#2a1a9a'], [0.4, '#6a7cff'], [0.8, '#d0e0ff'], [1, '#ffffff']], pulse: [0.1, TAU / 4 * 6], follow: (o, a, t) => o.position.set(...P(t)) });
      fx.orb({ kind: 'energy', r: [0.34, 0.34], intensity: 0.5, noise: 3, scroll: 1.5, disp: 0.5, alpha: 0.7, power: 1.5, ramp: [[0, '#101060'], [0.5, '#5a6cff'], [1, '#b8c8ff']], follow: (o, a, t) => o.position.set(...P(t)) });
      const dec = fx.decal({ kind: 'glow', r: [1.3, 1.3], ramp: [[0, '#000'], [0.4, '#101a70'], [1, '#6a86ff']], intensity: 0.9, alpha: 0.8, y: 0.01 });
      const L = fx.light({ color: '#8aa0ff', intensity: 25, pos: [0, 1, 0], range: 12, flicker: 0.25, rate: 17 });
      fx.on((t) => { const p = P(t); L.l.position.set(p[0], p[1] + 0.1, p[2]); dec.obj.position.set(p[0], 0.01, p[2]); });
      // wandering sparks that ride with the ball
      fx.emitter({ count: 50, kind: 'spark', shape: 'sphere', radius: 0.22, dir: [0, 1, 0], spread: 1.5, radial: 1, speed: [0.8, 2.4], life: [0.15, 0.4], size: [0.07, 0.02], stretch: 1.2, ramp: sparkRamp, intensity: 3.5, follow: (m, a, t) => m.position.set(...P(t)) });
      // continuous short arcs
      for (let k = 0; k < 3; k++) fx.bolt({ from: () => P(fx.t), to: (s) => { const p = P(fx.t), a = hs(s + k * 7.3) * TAU, e = (hs(s * 1.7 + k) - 0.4) * 1.4; return [p[0] + Math.cos(a) * 0.55, p[1] + e * 0.5, p[2] + Math.sin(a) * 0.55]; }, jag: 0.3, branches: 1, branchLen: 0.3, width: 0.016, rate: 16 + k * 3, flicker: 0.5, ramp: BOLT, intensity: 1.5 });
      // zaps to the floor
      [0.3, 1.2, 2.2, 3.1].forEach((t0, i) => {
        fx.bolt({ t0, dur: 0.5, fade: [0.02, 0.15], from: () => P(fx.t), to: (s) => { const p = P(fx.t); return [p[0] + (hs(s * 3.1 + i) - 0.5) * 1.2, 0.02, p[2] + (hs(s * 1.3 + i * 5) - 0.5) * 1.2]; }, jag: 0.25, branches: 2, branchLen: 0.3, width: 0.03, rate: 22, flicker: 0.4, ramp: BOLT, intensity: 3 });
        fx.emitter({ count: 26, kind: 'spark', shape: 'point', dir: [0, 1, 0], spread: 1.3, speed: [1.5, 4.5], life: [0.25, 0.6], gravity: [0, -9, 0], size: [0.06, 0.02], stretch: 1.2, ramp: sparkRamp, intensity: 4, delay: t0, emit: 0.4, bounce: 0.3, follow: (m, a, t) => { const p = P(Math.min(t, t0 + 0.2)); m.position.set(p[0] + (hs(i) - 0.5) * 0.6, 0.02, p[2] + (hs(i + 4) - 0.5) * 0.6); } });
      });
      fx.emitter({ count: 14, kind: 'glint', shape: 'point', dir: [0, 1, 0], speed: [0, 0.1], life: [0.2, 0.4], size: [0.5, 0.1], ramp: glintRamp, intensity: 3, follow: (m, a, t) => m.position.set(...P(t)) });
    } },

  /* ------------------------------------------------ chain lightning */
  { id: 'lightning/chain-lightning', name: 'Chain lightning', category: 'lightning', tier: 2, loop: false, duration: 1.8, stage: { sky: 'night', bloom: 0.5, view: { pos: [1.6, 1.8, 6.2], target: [0.7, 1.0, 0], fov: 46 } },
    build(fx) {
      const S = [-1.7, 1.35, 0.2], T = [[0.4, 1.0, 0.7], [1.8, 1.05, -0.5], [3.0, 1.0, 0.5]], hits = [0.12, 0.34, 0.56];
      const mats = T.map(() => new THREE.MeshStandardMaterial({ color: '#4a4f58', roughness: 0.7, metalness: 0.3, emissive: '#6a8cff', emissiveIntensity: 0 }));
      T.forEach((p, i) => { const g = dummyFig(mats[i]); g.position.set(p[0], 0, p[2]); g.scale.setScalar(p[1] * 0.95); fx.mesh(g, () => { mats[i].emissiveIntensity = 1.4 * Math.max(0, Math.exp(-(fx.t - hits[i]) * 3.5)) * (fx.t > hits[i] ? 1 : 0) * (0.6 + 0.4 * hs(Math.floor(fx.t * 40) + i)); }, { dur: 99 }); });
      fx.orb({ t0: 0, dur: 0.4, kind: 'plasma', r: [0.05, 0.2], pos: S, fade: [0.05, 0.2], intensity: 1.3, ramp: [[0, '#2a1a9a'], [0.5, '#7a8cff'], [1, '#ffffff']], noise: 3, scroll: 3 });
      const seg = [[S, T[0], 0.1, 0.5], [T[0], T[1], 0.32, 0.5], [T[1], T[2], 0.54, 0.6]];
      seg.forEach(([a, b, t0, d]) => fx.bolt({ t0, dur: d, fade: [0.02, 0.3], from: a, to: b, jag: 0.2, branches: 3, branchLen: 0.3, width: 0.032, rate: 30, flicker: 0.5, ramp: BOLT, intensity: 2.4 }));
      fx.bolt({ t0: 0.1, dur: 0.5, fade: [0.02, 0.3], from: S, to: [T[0][0] + 0.2, 1.4, T[0][2]], jag: 0.3, branches: 0, width: 0.015, rate: 21, flicker: 0.4, ramp: BOLT, intensity: 1.5 });
      fx.light({ color: '#9ab0ff', intensity: 40, pos: [-1.2, 1.4, 0.6], range: 9, env: pulses([[0.1, 0.5]]) });
      T.forEach((p, i) => {
        const h = hits[i];
        fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [p[0], p[1], p[2] + 0.1], size: [0.7, 0.3], life: [0.25, 0.25], ramp: glintRamp, intensity: 2, delay: h, emit: 0.001 });
        fx.emitter({ count: 40, kind: 'spark', shape: 'sphere', radius: 0.1, pos: [p[0], p[1], p[2]], dir: [0, 1, 0], spread: 1.6, radial: 1, speed: [1.5, 5], life: [0.25, 0.7], gravity: [0, -8, 0], size: [0.06, 0.02], stretch: 1.2, ramp: sparkRamp, intensity: 2.8, delay: h, bounce: 0.3 });
        fx.emitter({ count: 8, kind: 'smoke', blend: 'normal', shape: 'point', pos: [p[0], p[1] + 0.5, p[2]], dir: [0, 1, 0], spread: 0.5, speed: [0.3, 0.8], life: [0.8, 1.2], size: [0.2, 0.7], ramp: [[0, '#4d525d', 0], [0.2, '#434850', 0.4], [1, '#1f1f1f', 0]], lit: 1, delay: h + 0.1, emit: 0.2, order: -1 });
        fx.ring({ t0: h, dur: 0.35, r: [0.1, 0.9], width: [0.075, 0.02], normal: 'up', pos: [p[0], 0.02, p[2]], intensity: 0.3, fill: 0, ramp: [[0, '#e8f2ff'], [1, '#6a7cff']] });
      });
      fx.emitter({ count: 24, kind: 'spark', shape: 'point', pos: S, dir: [1, 0, 0], spread: 1.3, speed: [1, 3.5], life: [0.2, 0.5], size: [0.06, 0.02], stretch: 1.2, ramp: sparkRamp, intensity: 2.8, delay: 0.1, emit: 0.2 });
      T.forEach((p, i) => { const a = i ? T[i - 1] : S, d = p.map((v, j) => v - a[j]), n = Math.hypot(...d); burst(fx, p, hits[i], i === 2 ? { ramp: BOLT, col: '#a8b8ff', dir: d.map((v) => v / n) } : { tier: 1, ramp: BOLT, col: '#a8b8ff', dir: d.map((v) => v / n), dust: false, debris: false, marks: false }); });
    } },

  /* ------------------------------------------------ charge up */
  { id: 'lightning/charge-up', name: 'Charge up', category: 'lightning', loop: false, duration: 2.7, body: true, stage: { sky: 'night', bloom: 0.55, view: { pos: [2.6, 1.6, 3.8], target: [0.3, 1.1, 0], fov: 42 } },
    build(fx) {
      const C = [0.62, 1.22, 0.05], TB = 2.1;
      const g = (t) => (t < TB ? sm(0, 2.0, t) : 0);
      fx.orb({ t0: 0.1, dur: TB - 0.1, kind: 'plasma', r: [0.03, 0.26], ease: 'in', pos: C, fade: [0.2, 0.0], intensity: 1.4, noise: 3, scroll: 3, disp: 0.4, ramp: [[0, '#2a1a9a'], [0.4, '#6a7cff'], [0.8, '#d0e0ff'], [1, '#fff']] });
      fx.orb({ t0: TB, dur: 0.5, kind: 'energy', r: [0.25, 1.0], ease: 'out', pos: C, fade: [0.0, 0.35], intensity: 1.0, noise: 2.5, scroll: 3, disp: 0.5, power: 1.6, ramp: [[0, '#2a2aaa'], [0.5, '#8aa0ff'], [1, '#ffffff']] });
      fx.light({ color: '#8aa0ff', intensity: 35, pos: [C[0], C[1], C[2] + 0.5], range: 12, flicker: 0.2, rate: 25, env: (t) => (t < TB ? 0.05 + 0.5 * sm(0, 2.0, t) * sm(0, 2.0, t) : 1.0 * Math.exp(-(t - TB) * 3.5)), norm: 70 });
      // gathering
      fx.emitter({ count: 60, kind: 'spark', shape: 'sphere', radius: 1.1, radiusIn: 0.8, pos: C, radial: 1, dir: [0, 1, 0], spread: 1.6, speed: [-2.4, -3.4], life: [0.32, 0.4], size: [0.08, 0.02], stretch: 1.6, ramp: [[0, '#4c3cd0', 0], [0.5, '#bcd0ff'], [1, '#ffffff']], intensity: 3.2, emit: TB - 0.2, delay: 0.3 });
      fx.emitter({ count: 40, kind: 'soft', shape: 'sphere', radius: 0.9, radiusIn: 0.6, pos: C, radial: 1, dir: [0, 1, 0], spread: 1.6, speed: [-1.6, -2.2], life: [0.4, 0.5], size: [0.12, 0.03], ramp: [[0, '#2a2aaa', 0], [0.6, '#9ab0ff', 0.7], [1, '#fff', 0]], intensity: 1.5, emit: TB - 0.3, delay: 0.4 });
      for (let k = 0; k < 4; k++) fx.bolt({ t0: 0.5 + k * 0.1, dur: TB - 0.5 - k * 0.1, fade: [0.2, 0.0], from: (s) => { const a = hs(s * 1.3 + k * 9) * TAU, e = (hs(s * 0.7 + k) - 0.5) * 1.4; const r = 0.55 + 0.3 * hs(s + k * 3); return [C[0] + Math.cos(a) * r, C[1] + e * r, C[2] + Math.sin(a) * r]; }, to: C, jag: 0.35, branches: 0, width: 0.014, rate: 14 + k * 4, flicker: 0.6, ramp: BOLT, intensity: 1.5 });
      fx.decal({ kind: 'glow', t0: 0.2, dur: 2.5, fade: [1.5, 0.5], r: [1.4, 1.4], ramp: [[0, '#000'], [0.5, '#1a2a90'], [1, '#7a96ff']], intensity: 0.9, alpha: 0.8, y: 0.01 });
      // release
      fx.shake(TB, 0.5, 0.08);
      fx.ring({ t0: TB, dur: 0.8, r: [0.2, 5], width: [0.5, 0.1], normal: 'up', intensity: 1.0, fill: 0.2, ramp: [[0, '#e8f2ff'], [0.4, '#aab8ff'], [1, '#3a2cc0']] });
      fx.ring({ t0: TB, dur: 0.55, r: [0.2, 2.8], width: [0.3, 0.06], normal: 'cam', pos: C, intensity: 1.0, ramp: [[0, '#e8f2ff'], [1, '#8a9cff']] });
      for (let k = 0; k < 7; k++) { const a = (k / 7) * TAU + 0.3, e = (hs(k * 3.3) - 0.3) * 1.2; fx.bolt({ t0: TB, dur: 0.35, fade: [0.01, 0.25], from: C, to: [C[0] + Math.cos(a) * 2.2, Math.max(0.05, C[1] + e), C[2] + Math.sin(a) * 2.2], jag: 0.22, branches: 2, branchLen: 0.3, width: 0.035, rate: 28, flicker: 0.4, ramp: BOLT, intensity: 3 }); }
      fx.emitter({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.15, pos: C, dir: [0, 1, 0], spread: 1.6, radial: 1, speed: [3, 9], life: [0.4, 0.7], gravity: [0, -7, 0], size: [0.07, 0.02], stretch: 1.4, ramp: sparkRamp, intensity: 4, delay: TB, bounce: 0.3 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: C, size: [2.0, 0.5], life: [0.3, 0.3], ramp: glintRamp, intensity: 4, delay: TB });
      fx.decal({ kind: 'scorch', t0: TB, dur: 0.6, fade: [0.05, 0.2], r: [1.6, 1.8], heat: [1, 0.3], ramp: [[0, '#1a1410'], [0.5, '#46f'], [1, '#bdf']], alpha: 0.7 });
      fx.on((t) => { const k = g(t) + Math.exp(-Math.max(0, t - TB) * 4) * (t >= TB ? 1 : 0); fx.body.set({ rim: '#8aa0ff', rimAmt: k * 1.5, emit: new THREE.Color(0.04, 0.06, 0.2).multiplyScalar(k * (0.7 + 0.3 * hs(Math.floor(t * 30)))) }); });
    } },

  /* ------------------------------------------------ electrified */
  { id: 'lightning/electrified', name: 'Electrified', category: 'lightning', loop: true, duration: 2, body: true, stage: { sky: 'night', bloom: 0.5, view: { pos: [2.6, 1.3, 3.4], target: [0, 0.9, 0], fov: 40 } },
    build(fx) {
      const surf = (k, s) => { const y = 0.15 + hs(s * 0.31 + k * 11.1) * 1.55, a = hs(s * 0.73 + k * 5.7) * TAU; const r = y > 1.3 ? 0.13 : (y < 0.9 ? 0.1 : 0.22); return [Math.cos(a) * r, y, Math.sin(a) * r]; };
      for (let k = 0; k < 8; k++) {
        fx.bolt({ from: (s) => surf(k, s), to: (s) => { const a = surf(k, s); return [a[0] * 1.9 + (hs(s + k) - 0.5) * 0.3, a[1] + (hs(s * 1.9 + k) - 0.5) * 0.7, a[2] * 1.9 + (hs(s * 2.3 + k) - 0.5) * 0.3]; }, jag: 0.3, branches: 0, width: 0.013, rate: 12 + k, flicker: 0.5, ramp: BOLT, intensity: 1.5 });
      }
      for (let k = 0; k < 2; k++) fx.bolt({ from: (s) => surf(k + 20, s), to: (s) => { const a = surf(k + 20, s + 1.5); a[0] *= 1.6; a[2] *= 1.6; return a; }, jag: 0.3, branches: 1, branchLen: 0.3, width: 0.02, rate: 10 + k * 3, flicker: 0.5, ramp: BOLT, intensity: 3 });
      fx.light({ color: '#8aa0ff', intensity: 12, pos: [0.5, 1.2, 0.8], range: 8, flicker: 0.6, rate: 33 });
      fx.decal({ kind: 'glow', r: [1.1, 1.1], ramp: [[0, '#000'], [0.4, '#101a70'], [1, '#6a86ff']], intensity: 0.7, alpha: 0.7, y: 0.01 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'box', shapeSize: [0.3, 0.9, 0.3], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 1.6, radial: 0.4, speed: [0.3, 1.6], life: [0.15, 0.45], gravity: [0, -3, 0], size: [0.05, 0.015], stretch: 1.1, ramp: sparkRamp, intensity: 3.5, bounce: 0.2 });
      fx.emitter({ count: 14, kind: 'glint', shape: 'box', shapeSize: [0.25, 0.85, 0.25], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 1.6, speed: [0, 0.1], life: [0.12, 0.3], size: [0.3, 0.06], ramp: glintRamp, intensity: 3 });
      fx.on((t) => { const st = Math.floor(t * 24), f = 0.35 + 0.65 * hs(st * 1.7); fx.body.set({ rim: '#9db4ff', rimAmt: 0.5 + f * 1.0, tint: '#a0b4ff', tintAmt: 0.12 * f, emit: new THREE.Color(0.03, 0.05, 0.16).multiplyScalar(f) }); });
    } },

  /* ------------------------------------------------ lightning strike */
  { id: 'lightning/lightning-strike', name: 'Lightning strike', category: 'lightning', loop: false, duration: 3, tier: 3, stage: { sky: 'storm', bloom: 0.4, view: { pos: [3.4, 2.4, 6.4], target: [0, 2.3, 0], fov: 50 } },
    build(fx) {
      const TS = 1.0, G = [0, 0.02, 0]; // strike time and strike point
      fx.light({ color: '#8aa0ff', intensity: 40, pos: [0, 0.8, 0], range: 9, env: (t) => (t < TS ? 0.1 + 0.5 * sm(0, TS, t) : 0.1), flicker: 0.2, norm: 70 });
      [TS - 0.2, TS - 0.1].forEach((t0, i) => fx.bolt({ t0, dur: 0.08, fade: [0, 0.02], from: [0.4 - 0.5 * i, 7.5, -0.2], to: G, jag: 0.2, branches: 2, branchLen: 0.2, width: 0.02, rate: 30, flicker: 0.4, ramp: BOLT, intensity: 0.6 })); // pre-leaders
      fx.bolt({ t0: TS, dur: 0.035, fade: [0, 0], from: [0.3, 7.5, -0.3], to: G, jag: 0.16, branches: 6, branchLen: 0.22, width: 0.06, rate: 40, flicker: 0.3, ramp: BOLT, intensity: 8 });
      [[0.06, 4], [0.12, 3], [0.18, 2]].forEach(([dt, I], i) => fx.bolt({ t0: TS + dt, dur: 0.03, fade: [0, 0], from: [-0.2 + 0.1 * i, 7.5, 0.2], to: G, jag: 0.18, branches: 4, branchLen: 0.22, width: 0.05, rate: 35, flicker: 0.4, ramp: BOLT, intensity: I })); // restrikes
      fx.light({ color: '#dfe8ff', intensity: 80, pos: [0, 2.2, 0.8], range: 12, t0: TS - 0.02, dur: 1.2, env: (t) => ENV.impact(t - TS, 12) });
      fx.flash(TS, 0.2, '#e6ecff', 0.15); fx.shake(TS, 0.6, 0.09);
      fx.impact({ t: TS, strength: 1, dir: [0, -1, 0], pos: G });
      fx.ring({ t0: TS, dur: 0.9, r: [0.2, 3.5], width: [0.25, 0.06], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#dfe8ff'], [1, '#3a4a8a']] });
      fx.decal({ kind: 'cracks', t0: TS, dur: 2.0, r: [2.6, 3.0], fade: [0.05, 1.0], heat: [1, 0], reveal: 0.3, cells: 4, ramp: [[0, '#001'], [0.5, '#8ab4ff'], [1, '#f0f6ff']] });
      fx.emitter({ count: 40, kind: 'spark', shape: 'sphere', radius: 0.15, pos: [0, 0.2, 0], dir: [0, 1, 0], spread: 1.5, speed: [4, 11], life: [0.4, 1.2], gravity: [0, -9, 0], size: [0.09, 0.03], stretch: 1.4, ramp: sparkRamp, intensity: 3, delay: TS, bounce: 0.35 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 0.3, 0], size: [1.4, 0.4], life: [0.35, 0.35], ramp: glintRamp, intensity: 2, delay: TS });
      fx.emitter({ count: 30, kind: 'dust', blend: 'normal', shape: 'ring', radius: 1.2, radiusIn: 0.8, pos: [0, 0.1, 0], dir: [0, 0.3, 0], spread: 0.3, radial: 1, speed: [2, 4], drag: 1.2, life: [1.2, 2.2], size: [0.7, 2.2], ramp: [[0, '#8a909c', 0], [0.15, '#747a86', 0.55], [1, '#444952', 0]], lit: 1, delay: TS, emit: 0.1, order: -1 });
      fx.emitter({ count: 16, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.3, pos: [0, 0.3, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.4, 1.0], life: [0.8, 1.4], size: [0.3, 1.1], ramp: [[0, '#333', 0], [0.2, '#3a3d44', 0.35], [1, '#1a1b1f', 0]], lit: 1, delay: TS, emit: 0.2, order: -1 });
    } },

  /* ------------------------------------------------ plasma ball */
  { id: 'lightning/plasma-ball', name: 'Plasma ball', category: 'lightning', loop: true, duration: 3, stage: { sky: 'dark', bloom: 0.55, view: { pos: [1.8, 1.5, 3.0], target: [0, 1.0, 0], fov: 38 } },
    build(fx) {
      const C = [0, 1.1, 0], R = 0.46;
      const base = new THREE.Group(); const m = metal('#2c3038', 0.4, 0.8);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.14, 32), m); foot.position.y = 0.07; base.add(foot);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.25, 0.3, 32), m); neck.position.y = 0.28; base.add(neck);
      const tbl = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.3), new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.5, metalness: 0.1 })); tbl.position.y = -0.03; base.add(tbl);
      fx.mesh(base, null, { dur: 99 });
      fx.orb({ kind: 'glass', r: [R, R], pos: C, power: 2.0, noise: 1.2, scroll: 0.2, disp: 0, intensity: 1.2, ramp: [[0, '#4a2a90'], [0.5, '#9a7cff'], [1, '#e8d8ff']], alpha: 0.9 });
      fx.orb({ kind: 'plasma', r: [0.07, 0.07], pos: C, intensity: 1.5, noise: 3, scroll: 3, ramp: [[0, '#4a1aa0'], [0.4, '#c070ff'], [0.8, '#f0d0ff'], [1, '#fff']], pulse: [0.12, TAU / 3 * 3] });
      fx.orb({ kind: 'energy', r: [0.34, 0.34], pos: C, intensity: 0.35, noise: 2.5, scroll: 1.2, disp: 0.5, alpha: 0.5, power: 1.4, ramp: [[0, '#200a60'], [0.6, '#8a4cff'], [1, '#e8c8ff']] });
      for (let k = 0; k < 7; k++) {
        const b = (k / 7) * TAU, ph = hs(k) * TAU;
        fx.bolt({ from: C, to: (s) => { const a = b + 0.9 * Math.sin(TAU * fx.t / 3 + ph) + 0.12 * (hs(s + k) - 0.5); const e = 0.9 * Math.sin(TAU * fx.t / 3 * 2 + ph * 1.3) + 0.25 * (hs(s * 1.7 + k) - 0.5); const c = Math.cos(e); return [C[0] + Math.cos(a) * c * R * 0.97, C[1] + Math.sin(e) * R * 0.97, C[2] + Math.sin(a) * c * R * 0.97]; }, jag: 0.28, branches: 1, branchLen: 0.25, width: 0.014, rate: 14 + k, flicker: 0.45, ramp: BOLT_P, intensity: 2.8 });
      }
      fx.light({ color: '#a070ff', intensity: 25, pos: [0.3, 1.2, 0.6], range: 8, flicker: 0.12, rate: 13 });
      fx.light({ color: '#a070ff', intensity: 25, pos: [0, 0.2, 0.3], range: 4 });
      fx.emitter({ count: 12, kind: 'glint', shape: 'sphere', radius: R * 0.9, radiusIn: R * 0.8, pos: C, dir: [0, 1, 0], spread: 1, speed: [0, 0.05], life: [0.3, 0.7], size: [0.2, 0.04], ramp: [[0, '#fff', 0], [0.3, '#e8c8ff', 1], [1, '#a070ff', 0]], intensity: 2.5, swirl: 1.3 });
    } },

  /* ------------------------------------------------ spark arc */
  { id: 'lightning/spark-arc', name: 'Spark arc', category: 'lightning', loop: true, duration: 2, stage: { sky: 'dark', bloom: 0.5, view: { pos: [0.8, 1.45, 3.4], target: [0, 1.0, 0], fov: 38 } },
    build(fx) {
      const A = [-0.55, 1.4, 0], B = [0.55, 1.4, 0];
      const g = new THREE.Group(); const m = metal('#aab0ba', 0.3, 1.0);
      [[-0.65, 0], [0.65, 0]].forEach(([x]) => { const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.04, 1.5, 16), m); rod.position.set(x, 0.75, 0); rod.rotation.z = x < 0 ? -0.1 : 0.1; g.add(rod); const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), m); tip.position.set(x + (x < 0 ? 0.075 : -0.075), 1.49, 0); g.add(tip); });
      const bs = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.5), new THREE.MeshStandardMaterial({ color: '#23262c', roughness: 0.6, metalness: 0.5 })); bs.position.y = 0.02; g.add(bs);
      fx.mesh(g, null, { dur: 99 });
      const W = [[0.0, 0.28], [0.45, 0.2], [0.85, 0.38], [1.4, 0.22], [1.75, 0.2]];
      const A1 = [-0.575, 1.49, 0], B1 = [0.575, 1.49, 0];
      W.forEach(([t0, d], i) => {
        fx.bolt({ t0, dur: d, fade: [0.005, d * 0.5], from: A1, to: B1, jag: 0.28, branches: 2, branchLen: 0.25, width: 0.022 + 0.01 * (i % 2), rate: 34, flicker: 0.4, ramp: BOLT, intensity: 3 });
        fx.emitter({ count: 22, kind: 'spark', shape: 'point', pos: i % 2 ? B1 : A1, dir: [0, 1, 0], spread: 1.5, speed: [0.8, 3], life: [0.2, 0.5], gravity: [0, -7, 0], size: [0.05, 0.015], stretch: 1.1, ramp: sparkRamp, intensity: 4, delay: t0, emit: 0.08, bounce: 0.3 });
      });
      fx.emitter({ count: 2, kind: 'glint', shape: 'point', pos: A1, size: [0.35, 0.1], life: [0.5, 0.5], ramp: [[0, '#fff', 0.5], [1, '#8aa0ff', 0.1]], intensity: 1.5 });
      fx.emitter({ count: 2, kind: 'glint', shape: 'point', pos: B1, size: [0.35, 0.1], life: [0.5, 0.5], ramp: [[0, '#fff', 0.5], [1, '#8aa0ff', 0.1]], intensity: 1.5 });
      fx.light({ color: '#8aa0ff', intensity: 25, pos: [0, 1.4, 0.7], range: 8, env: (t) => 0.06 + 0.94 * Math.max(...W.map(([a, d]) => win(t, a, d, 0.01, d * 0.6))) * (0.7 + 0.3 * hs(Math.floor(t * 34))), norm: 40 });
    } },

  /* ------------------------------------------------ storm cloud */
  { id: 'lightning/storm-cloud', name: 'Storm cloud', category: 'lightning', loop: true, duration: 3, stage: { sky: 'storm', bloom: 0.45, view: { pos: [2.8, 2.2, 4.6], target: [0, 2.0, 0], fov: 46 } },
    build(fx) {
      const CY = 3.2, W = [[0.8, 0.36], [1.05, 0.22], [2.2, 0.3]];
      const flash = (t) => Math.max(...W.map(([a, d]) => win(t, a, d, 0.01, d * 0.7)));
      fx.light({ color: '#aab8ff', intensity: 68, pos: [0, CY - 0.3, 0.8], range: 12, env: (t) => 0.03 + flash(t) * (0.7 + 0.3 * hs(Math.floor(t * 40))), norm: 70 });
      fx.light({ color: '#6a7a98', intensity: 25, pos: [0, 2.2, 2.2], range: 12 });
      fx.emitter({ count: 46, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [1.25, 0.2, 0.8], pos: [0, CY + 0.15, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.03, 0.12], life: [2.5, 3], size: [1.1, 1.9], ramp: grayCloud, lit: 1, turb: [0.2, 0.4], swirl: 0.12, floorFade: 0 });
      fx.emitter({ count: 34, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [1.0, 0.15, 0.6], pos: [0, CY - 0.3, 0.1], dir: [0, -1, 0], spread: 0.6, speed: [0.03, 0.12], life: [2.5, 3], size: [0.8, 1.5], ramp: [[0, '#6a7280', 0], [0.2, '#7a8390', 0.85], [0.7, '#58606e', 0.7], [1, '#343a46', 0]], lit: 1, turb: [0.2, 0.4] });
      fx.emitter({ count: 12, kind: 'soft', shape: 'box', shapeSize: [0.8, 0.2, 0.5], pos: [0, CY - 0.1, 0.1], dir: [0, 1, 0], spread: 1, speed: [0, 0.05], life: [0.3, 0.6], size: [1.2, 1.8], ramp: [[0, '#8aa0ff', 0], [0.4, '#8aa0ff', 0.12], [1, '#8aa0ff', 0]], intensity: 0.6 });
      fx.emitter({ count: 480, kind: 'spark', shape: 'box', shapeSize: [1.3, 0.02, 0.8], pos: [0, CY - 0.5, 0], dir: [-0.12, -1, 0], spread: 0.05, speed: [5.5, 6.5], life: [0.45, 0.5], size: [0.5, 0.5], stretch: 0.6, ramp: [[0, '#cfd8e8', 0.0], [0.15, '#cfd8e8', 0.8], [1, '#9fb0c8', 0.6]], intensity: 1.5 });
      fx.emitter({ count: 70, kind: 'ring', shape: 'disc', radius: 1.3, pos: [0, 0.02, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.01, 0.02], life: [0.3, 0.45], size: [0.03, 0.22], ramp: [[0, '#cfe0ff', 0.6], [1, '#8aa0ff', 0]], intensity: 0.8 });
      [[0.8, 0.36, 0.2, -0.1], [2.2, 0.3, -0.3, 0.2]].forEach(([t0, d, bx, bz]) => {
        fx.bolt({ t0, dur: d, fade: [0.0, 0.15], from: [bx * 0.3, CY - 0.4, bz * 0.3], to: [bx, 0.02, bz], jag: 0.2, branches: 4, branchLen: 0.22, width: 0.06, rate: 38, flicker: 0.35, ramp: BOLT, intensity: 3 });
        fx.emitter({ count: 30, kind: 'spark', shape: 'point', pos: [bx, 0.05, bz], dir: [0, 1, 0], spread: 1.4, speed: [1.5, 5], life: [0.3, 0.7], gravity: [0, -8, 0], size: [0.06, 0.02], stretch: 1.2, ramp: sparkRamp, intensity: 4, delay: t0, emit: 0.05, bounce: 0.3 });
      });
      fx.bolt({ t0: 1.05, dur: 0.22, fade: [0, 0.1], from: [-0.7, CY - 0.4, 0.2], to: [0.9, CY - 0.5, 0.3], jag: 0.3, branches: 2, width: 0.03, rate: 30, flicker: 0.4, ramp: BOLT, intensity: 1.5 });
      fx.decal({ kind: 'glow', r: [2.2, 2.2], ramp: [[0, '#000'], [0.5, '#0e1a40'], [1, '#6a86d0']], intensity: 0.45, alpha: 0.7, y: 0.01 });
    } },

  /* ------------------------------------------------ tesla coil */
  { id: 'lightning/tesla-coil', name: 'Tesla coil', category: 'lightning', loop: true, duration: 2.4, stage: { sky: 'dark', bloom: 0.55, view: { pos: [3.2, 1.8, 4.4], target: [0, 1.15, 0], fov: 44 } },
    build(fx) {
      const g = new THREE.Group(); const m = metal('#7c828d', 0.35, 0.9);
      const cu = new THREE.MeshStandardMaterial({ color: '#b86a38', roughness: 0.35, metalness: 1.0 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.25, 32), new THREE.MeshStandardMaterial({ color: '#2a2d33', roughness: 0.5, metalness: 0.6 })); base.position.y = 0.125; g.add(base);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.3, 24), m); col.position.y = 0.4; g.add(col);
      const wind = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.27, 1.05, 32, 12), cu); wind.position.y = 1.07; wind.material.roughnessMap = null; g.add(wind);
      for (let i = 0; i < 18; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.17 + (0.27 - 0.17) * (1 - i / 17) + 0.004, 0.012, 6, 28), cu); r.rotation.x = Math.PI / 2; r.position.y = 0.56 + i * 0.058; g.add(r); }
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.12, 24, 48), metal('#c9ced6', 0.2, 1.0)); tor.rotation.x = Math.PI / 2; tor.position.y = 1.72; g.add(tor);
      fx.mesh(g, null, { dur: 99 });
      const T = [0, 1.76, 0], N = 9;
      for (let k = 0; k < N; k++) {
        const a0 = (k / N) * TAU, ground = k % 3 !== 0;
        fx.bolt({ from: (s) => [Math.cos(a0 + s * 0.31) * 0.3, 1.76 + 0.05 * hs(s + k), Math.sin(a0 + s * 0.31) * 0.3],
          to: (s) => { const a = a0 + 1.3 * Math.sin(TAU * fx.t / 2.4 + k * 1.7) + 0.2 * hs(s + k * 3); if (ground) { const r = 1.5 + 0.5 * hs(s * 1.3 + k); return [Math.cos(a) * r, 0.03, Math.sin(a) * r]; } const r = 0.9 + 0.5 * hs(s * 1.3 + k), e = 1.9 + 0.7 * hs(s * 2.1 + k); return [Math.cos(a) * r, e, Math.sin(a) * r]; },
          jag: 0.26, branches: 3, branchLen: 0.28, width: ground ? 0.026 : 0.018, rate: 11 + (k % 4) * 3, flicker: 0.5, ramp: BOLT_P, intensity: 3 });
      }
      fx.orb({ kind: 'energy', r: [0.42, 0.42], pos: T, intensity: 0.55, noise: 3, scroll: 2.5, disp: 0.6, alpha: 0.6, power: 1.4, ramp: [[0, '#200a60'], [0.6, '#8a4cff'], [1, '#f0d8ff']], pulse: [0.1, TAU / 2.4 * 5] });
      fx.light({ color: '#a89cff', intensity: 25, pos: [0.4, 1.9, 0.8], range: 10, flicker: 0.4, rate: 21 });
      fx.decal({ kind: 'glow', r: [1.7, 1.7], ramp: [[0, '#000'], [0.5, '#1a1070'], [1, '#8a70ff']], intensity: 0.7, alpha: 0.75, y: 0.01 });
      fx.emitter({ count: 50, kind: 'spark', shape: 'ring', radius: 1.9, radiusIn: 1.4, pos: [0, 0.03, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.5, 2.5], life: [0.2, 0.5], gravity: [0, -7, 0], size: [0.05, 0.015], stretch: 1.1, ramp: sparkRamp, intensity: 3.5, bounce: 0.3 });
      fx.emitter({ count: 20, kind: 'glint', shape: 'ring', radius: 0.3, pos: [0, 1.76, 0], dir: [0, 1, 0], spread: 1, speed: [0, 0.2], life: [0.12, 0.3], size: [0.4, 0.08], ramp: glintRamp, intensity: 3 });
    } },

  /* ------------------------------------------------ thunderclap */
  { id: 'lightning/thunderclap', name: 'Thunderclap', category: 'lightning', tier: 3, loop: false, duration: 1.9, stage: { sky: 'storm', bloom: 0.5, view: { pos: [3.2, 2.2, 6.6], target: [0.2, 2.1, 0], fov: 52 } },
    build(fx) {
      fx.flash(0, 0.3, '#eef2ff', 0.15); fx.flash(0.3, 0.2, '#e6ecff', 0.08);
      const S = [[-1.1, 0.5, 0.0, 0.07], [0.35, -0.3, 0.0, 0.1], [1.7, 0.2, 0.05, 0.06]];
      S.forEach(([x, z, d0, w], i) => {
        fx.bolt({ t0: d0, dur: 0.3, fade: [0.0, 0.2], from: [x + 0.8, 7.6, z - 0.4], to: [x, 0.02, z], jag: 0.2, branches: 5, branchLen: 0.28, width: w, rate: 40, flicker: 0.3, ramp: BOLT, intensity: 3 });
        fx.bolt({ t0: 0.3 + i * 0.03, dur: 0.18, fade: [0.0, 0.12], from: [x + 0.7, 7.6, z - 0.4], to: [x + 0.03, 0.02, z], jag: 0.2, branches: 3, width: w * 0.55, rate: 34, flicker: 0.4, ramp: BOLT, intensity: 1.5 });
        fx.emitter({ count: 36, kind: 'spark', shape: 'point', pos: [x, 0.05, z], dir: [0, 1, 0], spread: 1.5, speed: [2, 8], life: [0.3, 0.7], gravity: [0, -9, 0], size: [0.07, 0.02], stretch: 1.3, ramp: sparkRamp, intensity: 4, delay: d0, bounce: 0.3 });
        fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [x, 0.25, z], size: [1.4, 0.4], life: [0.3, 0.3], ramp: glintRamp, intensity: 4, delay: d0 });
      });
      fx.ring({ t0: 0.04, dur: 1.1, r: [0.2, 7.5], width: [0.35, 0.08], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#e8f2ff'], [0.4, '#aab8ff'], [1, '#3a2cc0']] });
      fx.ring({ t0: 0.04, dur: 0.9, r: [0.2, 4.5], width: [0.4, 0.1], normal: 'cam', pos: [0.2, 1.0, 0], intensity: 1.0, ramp: [[0, '#e8f2ff'], [1, '#8a9cff']] });
      fx.ring({ t0: 0.2, dur: 1.2, r: [0.2, 5.5], width: [0.35, 0.1], normal: 'up', y: 0.03, intensity: 0.9, ramp: [[0, '#dfe6ff'], [1, '#5a4cff']] });
      fx.decal({ kind: 'scorch', t0: 0.05, dur: 1.85, r: [3, 3.6], fade: [0.05, 0.9], heat: [1, 0], ramp: [[0, '#1a1410'], [0.5, '#46f'], [1, '#bdf']], alpha: 0.85 });
      fx.emitter({ count: 50, kind: 'dust', blend: 'normal', shape: 'ring', radius: 0.6, pos: [0.2, 0.1, 0], dir: [0, 0.2, 0], spread: 0.5, radial: 1, speed: [3, 7], drag: 1.5, life: [1.0, 1.8], size: [0.8, 2.4], ramp: [[0, '#4e525a', 0], [0.12, '#3e434b', 0.5], [1, '#1d1f24', 0]], lit: 1, delay: 0.05, emit: 0.1, order: -1 });
      burst(fx, [0.2, 0, 0], 0.04, { ramp: BOLT, col: '#cfd8ff' });
      burst(fx, [0.35, 0, -0.3], 0.3, { tier: 1, ramp: BOLT, col: '#cfd8ff', dust: false, debris: false, marks: false });
    } },

  /* ------------------------------------------------ zap hit */
  { id: 'lightning/zap-hit', name: 'Zap hit', category: 'lightning', tier: 1, loop: false, duration: 0.9, body: true, stage: { sky: 'night', bloom: 0.5, view: { pos: [1.8, 1.45, 3.0], target: [0.1, 1.15, 0], fov: 38 } },
    build(fx) {
      const H = [0.17, 1.28, 0.2];
      fx.bolt({ t0: 0, dur: 0.22, fade: [0, 0.12], from: [1.5, 1.9, 1.3], to: H, jag: 0.22, branches: 1, branchLen: 0.25, width: 0.035, rate: 36, flicker: 0.3, ramp: BOLT, intensity: 2.6 });
      for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + 0.5; fx.bolt({ t0: 0.02, dur: 0.3, fade: [0, 0.2], from: H, to: [H[0] + Math.cos(a) * 0.1 * 0 + Math.sin(a) * 0.1, H[1] + Math.cos(a) * 0.45, H[2] + 0.05], jag: 0.3, branches: 0, width: 0.016, rate: 26 + k * 2, flicker: 0.5, ramp: BOLT, intensity: 1.5 }); }
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: H, size: [0.6, 0.2], life: [0.2, 0.2], ramp: glintRamp, intensity: 2.2, delay: 0 });
      fx.emitter({ count: 36, kind: 'spark', shape: 'point', pos: H, dir: [0.4, 0.4, 1], spread: 1.5, speed: [1.5, 5], life: [0.2, 0.6], gravity: [0, -8, 0], size: [0.05, 0.015], stretch: 1.2, ramp: sparkRamp, intensity: 2.8, bounce: 0.3 });
      fx.emitter({ count: 10, kind: 'smoke', blend: 'normal', shape: 'point', pos: H, dir: [0, 1, 0.3], spread: 0.5, speed: [0.3, 0.7], life: [0.6, 0.9], size: [0.12, 0.5], ramp: [[0, '#4d525d', 0], [0.2, '#434850', 0.4], [1, '#1f1f1f', 0]], lit: 1, delay: 0.1, emit: 0.3, order: -1 });
      fx.decal({ kind: 'scorch', pos: [H[0], H[1], H[2] + 0.03], rotate: [0, 0, 0], t0: 0.02, dur: 0.88, r: [0.2, 0.26], fade: [0.03, 0.4], heat: [1, 0], ramp: [[0, '#1a1410'], [0.5, '#46f'], [1, '#bdf']], y: 0.01, alpha: 0.9 });
      fx.on((t) => { const k = Math.exp(-Math.max(0, t) * 5) * (0.5 + 0.5 * hs(Math.floor(t * 40))); fx.body.set({ rim: '#9ab0ff', rimAmt: k * 1.5, tint: '#222', tintAmt: 0.28 * sm(0.05, 0.2, t) * (1 - sm(0.5, 0.9, t)), emit: new THREE.Color(0.05, 0.07, 0.2).multiplyScalar(k) }); });
      burst(fx, H, 0, { ramp: BOLT, col: '#9ab0ff', dir: [-0.73, -0.34, -0.6] });
    } },
];
