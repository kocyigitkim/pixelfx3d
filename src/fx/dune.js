// Dune class: 5 earth+air+dune derived skills (PLAN2 B20). Built from the T-DSH, T-TEL and T-VOL templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, DUNE } from './_skill.js';
import { Dummy } from '../core/dummy.js';
import { contact } from './melee.js';

const m = meta('dune', 'derived');
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });
const SAND = [[0, '#5a4b34', 0], [0.15, '#4d402c', 0.55], [1, '#221a10', 0]]; // kit SAND x0.82 to <= #5a5048 (V5)

export default [
  SKILL('dune/sandspout', 'Sandspout', m(['earth', 'air', 'dune'], 'tornado-moving', 0.6, 16, 6, 'circle'), 3.0, {
    view: 'wide',
    act: act('castup', 0.8, 3.2, { hits: [{ t: 0.8, stop: 0.06, shake: 0.3, amp: 0.04, push: 1.6 }, { t: 1.4, stop: 0.04, shake: 0.2, amp: 0.03, push: 0 }, { t: 2.0, stop: 0.04, shake: 0.2, amp: 0.03, push: 0 }] }),
    // P3=762
    build(fx, o) {
      const k = kit(fx, o, DUNE);
      const X = (t) => 2 + 1.2 * sm(0, 2.4, t);
      const fol = (mm, ta, t) => mm.position.set(X(t), 0, 0);
      [[0.15, 0.25], [0.7, 0.4], [1.3, 0.6], [1.9, 0.85], [2.5, 1.15]].forEach(([y, r], i) => k.em({ count: 60, kind: 'dust', shape: 'ring', radius: r, radiusIn: r * 0.8, pos: [2, y, 0], dir: [0, 1, 0], spread: 0.15, speed: [0.5, 1.0], life: [0.5, 0.9], size: [0.3 - i * 0.02, 0.12], ramp: SAND, blend: 'normal', lit: 1, swirl: 7 - i * 0.6, turb: [0.3, 2], delay: 0, emit: 2.4, t0: -0.02, follow: fol })); // 300
      k.smoke({ ramp: SAND, count: 150, shape: 'ring', radius: 0.25, radiusIn: 0.15, pos: [2, 0.1, 0], dir: [0, 1, 0], spread: 0.1, speed: [1.4, 2.0], life: [1.3, 1.8], size: [0.35, 1.1], swirl: 7, radial: 0.35, turb: [0.2, 1.2], delay: 0, emit: 2.4, follow: fol }); // 150 funnel body
      k.em({ count: 60, kind: 'streak', shape: 'disc', radius: 0.5, pos: [2, 0.5, 0], dir: [0, 1, 0], speed: [2, 4], life: [0.5, 1], size: [0.04, 0.02], stretch: 1.5, intensity: 0.5, emit: 2.4, follow: fol }); // 60
      k.smoke({ count: 50, ramp: SAND, shape: 'ring', radius: 0.6, pos: [2, 0, 0], dir: [0, 1, 0], radial: 1, speed: [0.5, 1.5], life: [1.5, 2.5], size: [0.8, 1.4], emit: 2.4 }); // 50
      k.em({ count: 20, kind: 'rock', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.4, pos: [2, 0.2, 0], dir: [0, 1, 0], spread: 1.2, speed: [2, 5], life: [1.2, 1.9], gravity: [0, -10, 0], size: [0.2, 0.12], bounce: 0.35, rot: 6, emit: 0.8 }); // 20
      k.ring({ t0: 0, dur: 0.8, r: [0.2, 3], normal: 'up', pos: [2, 0.02, 0] });
      k.light({ pos: [2, 1, 0.8], t0: 0, dur: 2.4, fade: [0.1, 0.6], intensity: 30 });
      if (k.g >= 2) k.em({ count: 100, kind: 'dust', blend: 'normal', lit: 1, ramp: SAND, shape: 'disc', radius: 0.2, pos: [3.2, 0, 0], dir: [0, 1, 0], radial: 0.5, swirl: 5, speed: [2, 3.5], life: [1.5, 2.5], size: [0.2, 0.4], emit: 2.4 }); // 100
      if (k.g === 3) {
        k.em({ count: 40, kind: 'dust', blend: 'normal', lit: 1, ramp: SAND, shape: 'sphere', radius: 0.8, pos: [2, 0.5, 0], dir: [0, 1, 0], radial: 1, speed: [3, 6], life: [0.8, 1.4], size: [0.4, 0.8], delay: 2.4, emit: 0.001 }); // 40
        k.ring({ t0: 2.4, dur: 0.5, r: [0.2, 2.4], normal: 'cam', pos: [2, 1, 0] });
      }
      k.extras([2, 1, 0], 0.8);
    } }),

  SKILL('dune/mirage-split', 'Mirage split', m(['earth', 'air', 'dune'], 'decoy', 0.3, 20, 0, 'self'), 2.6, {
    view: 'side',
    act: act('cast', null, false),
    // P3=161
    build(fx, o) {
      const k = kit(fx, o, DUNE);
      const pose = k.g >= 2 ? POSES.cut : POSES.idle;
      for (const z of [-1.6, -0.8, 0.8, 1.6]) {
        const d = new Dummy(); d.setPose(pose); d.set({ holo: 1, scanCol: k.col(1), alpha: 0.6 });
        fx.mesh(d, (t) => { d.position.set(0, 0, z * sm(0.1, 0.5, t)); d.set({ alpha: 0.6 * (1 - sm(1.6, 2.4, t)) }); }, { t0: 0, dur: 2.6 });
        k.em({ count: 15, kind: 'dust', blend: 'normal', lit: 1, ramp: SAND, shape: 'sphere', radius: 0.3, pos: [0, 1, z], dir: [0, 1, 0], speed: [0.5, 1.2], life: [1, 1.6], size: [0.15, 0.3], delay: 1.6, emit: 0.4 }); // 15 x4
      }
      for (let i = 0; i < 4; i++) {
        const z = [-1.6, -0.8, 0.8, 1.6][i];
        k.ribbon({ points: (t) => Array.from({ length: 9 }, (_, j) => [0.6 + 0.08 * Math.sin((TAU * 1.5 * j) / 8 + 4 * t), 0.2 + (1.8 * j) / 8, z]), n: 8, width: 0.03, intensity: 0.4, t0: 0, dur: 2.6 });
      }
      k.smoke({ count: 40, ramp: SAND, shape: 'disc', radius: 1.2, pos: [0, 0.1, 0], dir: [0, 1, 0], radial: 1, speed: [0.2, 0.6], life: [1.5, 2.5], size: [0.6, 1.2], emit: 2.6 }); // 40
      k.em({ count: 20, kind: 'glint', shape: 'sphere', radius: 1.2, pos: [0, 1, 0], dir: [0, 1, 0], spread: 1, speed: [0.1, 0.4], life: [0.3, 0.6], size: [0.1, 0.05], intensity: 2.5, emit: 2.6 }); // 20
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 2.6, fade: [0.1, 0.6], intensity: 30 });
      if (k.g === 3) fx.on((t) => { const b = fx.body; const q = t < 1.0 ? sm(0.6, 1.0, t) : 1 - sm(1.2, 1.6, t); b.position.z = t < 1.1 ? 0 : 1.6; b.set({ dissolve: q < 0.002 ? -1 : q, dDir: -1, edge: k.col(1), edgeW: 0.09, edgeInt: 4 }); });
      k.extras([0, 1.1, 0], 0.3);
    } }),

  SKILL('dune/dust-veil', 'Dust veil', m(['earth', 'air', 'dune'], 'cloud-block', 0.4, 18, 6, 'circle'), 3.2, {
    view: 'wide',
    act: act('throw', 0.4, 3),
    // P3=431
    build(fx, o) {
      const k = kit(fx, o, DUNE);
      const A = [0.6, 1.38, 0.2], G = [3, 0, 0];
      const P = (t) => { const u = clamp(t / 0.4); return [A[0] + (G[0] - A[0]) * u, A[1] + (G[1] - A[1]) * u + 1.0 * Math.sin(Math.PI * u), A[2] * (1 - u)]; };
      k.trail({ path: P, t0: 0, dur: 0.45, len: 0.3, width: 0.14 });
      k.smoke({ count: 200, ramp: SAND, shape: 'sphere', radius: 1.6, pos: [3, 1, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.05, 0.2], life: [2, 3], size: [1, 3], emit: 1 }); // 200
      k.smoke({ count: 60, ramp: SAND, shape: 'ring', radius: 1, pos: [3, 0.05, 0], dir: [0, 1, 0], radial: 0.5, speed: [0.5, 1.5], life: [2, 3], size: [1, 2], emit: 1.5 }); // 60
      k.em({ count: 40, kind: 'streak', shape: 'sphere', radius: 1.6, pos: [3, 1, 0], dir: [1, 0, 0], spread: 0.5, speed: [1, 2], life: [0.8, 1.4], size: [0.05, 0.02], stretch: 1.5, intensity: 0.8, emit: 1.2 }); // 40
      k.light({ pos: [3, 1.2, 0.8], t0: 0, dur: 3.2, fade: [0.1, 0.8], intensity: 30 });
      if (k.g >= 2) k.em({ count: 60, kind: 'dust', blend: 'normal', lit: 1, ramp: SAND, shape: 'sphere', radius: 1.4, pos: [3, 1, 0], dir: [0, 1, 0], swirl: 3, turb: [0.5, 0.5], speed: [0.3, 1], life: [1.5, 2.5], size: [0.2, 0.4], emit: 1.5 }); // 60
      if (k.g === 3) k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 1.8, pos: [3, 1.2, 0], dir: [0, 1, 0], spread: 1, speed: [0.1, 0.6], life: [0.4, 0.8], size: [0.1, 0.05], intensity: 1.5, delay: 0.5, emit: 2 }); // 30
      k.extras([3, 1, 0], 0.4);
    } }),

  SKILL('dune/glass-storm', 'Glass storm', m(['earth', 'air', 'dune'], 'transform-volley', 0.6, 14, 7, 'cone'), 2.8, {
    view: 'long',
    act: act('cast', 0.8, 3.6, { hits: [{ t: 0.8, stop: 0.06, shake: 0.3, amp: 0.04, push: 1.6 }, { t: 1.2, stop: 0.04, shake: 0.2, amp: 0.03, push: 0 }, { t: 1.6, stop: 0.04, shake: 0.2, amp: 0.03, push: 0 }] }),
    // P3=422
    build(fx, o) {
      const k = kit(fx, o, DUNE);
      const TG = [3.6, 1.2, 0];
      k.em({ count: 120, kind: 'dust', blend: 'normal', lit: 1, ramp: SAND, shape: 'point', pos: [1, 1, 0], dir: [1, 0, 0], spread: 0.2, speed: [3, 5], life: [0.6, 1.2], size: [0.2, 0.4], emit: 1.2 }); // 120
      k.em({ count: 120, kind: 'shard', shape: 'point', pos: [1.5, 1.2, 0], dir: [1, 0, 0], spread: 0.2, speed: [3, 5], life: [0.5, 1], size: [0.08, 0.04], intensity: 1.5, delay: 0.4, emit: 0.8 }); // 120
      k.em({ count: 40, kind: 'glint', shape: 'sphere', radius: 0.4, pos: [2, 1.2, 0], dir: [1, 0, 0], speed: [1, 3], life: [0.3, 0.6], size: [0.1, 0.05], intensity: 2.5, delay: 0.2, emit: 1.2 }); // 40
      k.sparks(TG, 0.8, 40, { emit: 1 }); // 40
      for (let i = 0; i < 4; i++) { const y = 0.6 + 0.3 * i, z = (i - 1.5) * 0.3; k.ribbon({ points: () => [[0.5, y, z], [2.5, y, z], [4.5, y, z]], n: 2, width: 0.025, head: () => 1.001, fade: [0.03, 0.12], t0: 0, dur: 1.2 }); }
      k.light({ pos: [2.5, 1.2, 0.8], t0: 0, dur: 2.8, fade: [0.1, 0.6], intensity: 30 });
      if (k.g >= 2) for (let i = 0; i < 10; i++) {
        const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), new THREE.MeshStandardMaterial({ color: '#cfeaff', roughness: 0.1, metalness: 0, transparent: true, opacity: 0.6 }));
        const a = [1.6, 1.2, (i - 4.5) * 0.2], b = [TG[0] - 0.3 + 0.1 * (i % 3), TG[1] + 0.2 * ((i % 4) - 1.5), (i - 4.5) * 0.15];
        fx.mesh(g, (t) => { const u = sm(0.8, 1.6, t); g.position.set(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u); g.visible = t > 0.8; g.rotation.y = t * 2; }, { t0: 0, dur: 2.8 });
      }
      if (k.g === 3) k.em({ count: 60, kind: 'shard', shape: 'sphere', radius: 0.3, pos: TG, dir: [0, 1, 0], radial: 1, speed: [2, 5], life: [0.5, 1], size: [0.1, 0.05], gravity: [0, -9, 0], delay: 1.6, emit: 0.001 }); // 60
      k.extras(TG, 1.6, 'B');
    } }),

  SKILL('dune/dune-wave', 'Dune wave', m(['earth', 'air', 'dune'], 'sand-wave', 0.6, 14, 7, 'line'), 3.0, {
    view: 'long',
    act: act('sideslash', 1.0, 4),
    // P3=754
    build(fx, o) {
      const k = kit(fx, o, DUNE);
      const X = (t) => 0.8 + 3.7 * sm(0, 1.4, t), fol = (mm, ta, t) => mm.position.set(X(t), 0.6, 0);
      k.em({ count: 220, kind: 'dust', blend: 'normal', lit: 1, ramp: SAND, shape: 'line', shapeSize: [1.6, 0, 0], rot3: [0, Math.PI / 2, 0], pos: [0.8, 0.6, 0], dir: [0.5, 1, 0], speed: [1.5, 3], life: [1, 1.8], size: [0.3, 0.6], emit: 1.4, follow: fol }); // 220
      k.em({ count: 60, kind: 'streak', shape: 'line', shapeSize: [1.6, 0, 0], rot3: [0, Math.PI / 2, 0], pos: [0.8, 0.6, 0], dir: [1, 0.3, 0], speed: [3, 6], life: [0.4, 0.8], size: [0.05, 0.02], stretch: 1.5, intensity: 0.6, emit: 1.4, follow: fol }); // 60
      k.smoke({ count: 120, ramp: SAND, shape: 'box', shapeSize: [1.6, 0, 2.6], pos: [0.8, 0.6, 0], dir: [0.5, 1, 0], speed: [0.5, 1.5], life: [1.5, 2.5], size: [0.8, 2.0], emit: 1.4, follow: fol }); // 120
      k.em({ count: 90, kind: 'dust', shape: 'box', shapeSize: [0.3, 0.3, 2.4], dir: [1, 0.6, 0], spread: 0.4, speed: [1.5, 3], gravity: [0, -4, 0], life: [0.5, 0.9], size: [0.15, 0.05], ramp: SAND, blend: 'normal', lit: 1, intensity: 0.9, delay: 0, emit: 1.4, t0: -0.02, follow: fol }); // 90
      k.ribbon({ points: (t) => { const x = X(t); return [[x - 1, 0.2, 0], [x, 0.9, 0], [x + 0.4, 0.3, 0]]; }, n: 2, width: 0.4, intensity: 0.9, head: () => 1.001, fade: [0.05, 0.3], t0: 0, dur: 1.4 });
      k.em({ count: 30, kind: 'rock', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.3, pos: [3, 0.2, 0], dir: [0, 1, 0], spread: 1, speed: [2, 4], life: [1, 1.6], gravity: [0, -10, 0], size: [0.15, 0.1], bounce: 0.3, rot: 4, delay: 0.3, emit: 0.8 }); // 30
      k.ribbon({ points: (t) => { const x = X(t); return [[x - 1, 0.2, 0], [x, 0.9, 0], [x + 0.4, 0.3, 0]]; }, n: 2, width: 0.12, head: () => 1.001, fade: [0.05, 0.3], t0: 0, dur: 1.4 });
      k.ring({ t0: 0.9, dur: 0.6, r: [0.2, 2.5], normal: 'up', pos: [4, 0.02, 0] });
      ct(fx, k, [4, 1.2, 0], 1.0, 30, { lightI: 0 }); // 32
      k.light({ pos: [2.5, 1, 0.8], t0: 0, dur: 3, fade: [0.1, 0.6], intensity: 30 });
      if (k.g >= 2) k.em({ count: 100, kind: 'dust', blend: 'normal', lit: 1, ramp: SAND, shape: 'line', shapeSize: [1.6, 0, 0], rot3: [0, Math.PI / 2, 0], pos: [0.5, 0.3, 0], dir: [0.5, 1, 0], speed: [1.5, 3], life: [1, 1.8], size: [0.3, 0.6], delay: 0.2, emit: 1.4, follow: (mm, ta, t) => mm.position.set(X(t) - 0.3, 0.3, 0) }); // 100
      if (k.g === 3) {
        k.em({ count: 60, kind: 'dust', blend: 'normal', lit: 1, ramp: SAND, shape: 'sphere', radius: 0.6, pos: [4, 0.3, 0], dir: [1, 1, 0], speed: [2, 4], life: [1, 1.8], size: [0.4, 0.8], delay: 1.0, emit: 0.001 }); // 60
      }
      k.extras([4, 1, 0], 1.0);
    } }),
];
