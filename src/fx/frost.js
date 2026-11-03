// Frost class: 5 derived skills (water + air + frost), PLAN2 B18. Built from the T-DSH, T-BUF, T-HEL and projectile layouts.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, FROST, DUST, VAPOR, addMat } from './_skill.js';
import { contact } from './melee.js';

const m = meta('frost', 'derived');
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });
const iceMat = () => new THREE.MeshPhysicalMaterial({ color: '#a9ddff', roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.84, emissive: '#2a78cc', emissiveIntensity: 0.55, flatShading: true, side: THREE.DoubleSide });
const hits = (ts, o = {}) => ts.map((t) => ({ t, stop: 0.03, shake: 0.2, amp: 0.03, push: 0.4, ...o }));
const SNOW = [[0, '#f4f8fb', 0], [0.15, '#e8eef4', 0.55], [1, '#9aa7b0', 0]];

export default [
  SKILL('frost/rime-lance-ii', 'Rime lance II', m(['water', 'air', 'frost'], 'projectile-pierce', 0.4, 7, 9, 'line'), 1.8, {
    view: 'long', sky: 'night',
    act: act('throw', 0.35, 4),
    // P3=261
    build(fx, o) {
      const k = kit(fx, o, FROST);
      const A = [0.6, 1.38, 0.2], IP = [4, 1.25, 0];
      const P = (t) => { const u = clamp(t / 0.35); return [A[0] + (IP[0] - A[0]) * u, A[1] + (IP[1] - A[1]) * u, A[2] + (IP[2] - A[2]) * u]; };
      const spear = new THREE.Group();
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 1.0, 6), iceMat()); tip.rotation.z = -Math.PI / 2;
      const back = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 6), iceMat()); back.rotation.z = Math.PI / 2; back.position.x = -0.7;
      spear.add(tip, back);
      fx.mesh(spear, (t) => spear.position.set(...P(t)), { t0: -0.1, dur: 0.6 });
      k.trail({ path: P, t0: 0, dur: 0.4, len: 0.6, width: 0.05 });
      for (let i = 0; i < 4; i++) k.ribbon({ points: (t) => { const p = P(t), a = t * 12 + (i * Math.PI) / 2, b = a + 0.6; return [[p[0] - 0.8, p[1] + 0.15 * Math.cos(a), p[2] + 0.15 * Math.sin(a)], [p[0], p[1] + 0.15 * Math.cos(b), p[2] + 0.15 * Math.sin(b)]]; }, n: 1, width: 0.02, head: () => 1.001, fade: [0.03, 0.15], t0: 0, dur: 0.8 });
      k.em({ count: 60, kind: 'flake', shape: 'sphere', radius: 0.12, dir: [-1, 0, 0], spread: 0.5, speed: [0.5, 1.5], life: [0.4, 0.7], size: [0.07, 0.03], rot: 4, intensity: 1.4, emit: 0.35, follow: (mm, a, t) => mm.position.set(...P(t)) });
      k.gather(A, -0.2, 0.3, 0.7, 30);
      k.em({ count: 60, kind: 'shard', shape: 'sphere', radius: 0.2, pos: IP, dir: [0, 1, 0], spread: 1.6, radial: 1, speed: [1, 3], life: [0.4, 0.9], gravity: [0, -9, 0], size: [0.07, 0.03], rot: 6, intensity: 1.2, delay: 0.35, t0: 0.33, emit: 0.001 });
      k.decal({ kind: 'frost', r: [1, 1], cells: 6, pos: [4, 0, 0], t0: 0.35, dur: 1.4, reveal: 0.8, intensity: 1 });
      k.smoke({ count: 30, shape: 'disc', radius: 0.6, pos: [4, 0.6, 0], dir: [0, 1, 0], speed: [0.3, 0.8], life: [1, 1.6], size: [0.4, 0.8], ramp: VAPOR, delay: 0.35, t0: 0.33, emit: 0.6 });
      k.ring({ t0: 0.35, dur: 0.45, r: [0.2, 1.6], normal: 'cam', pos: IP });
      const cl = new THREE.Group();
      [[0, 0, 0], [0.12, 0.1, 0.05], [-0.1, 0.12, -0.04]].forEach(([x, y, z]) => { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), iceMat()); c.position.set(x, y, z); cl.add(c); });
      cl.position.set(...IP);
      k.pop(cl, 0.35, 0.6, 1.5, 1.8);
      k.light({ pos: [4, 1.2, 0.8], t0: 0.35, dur: 0.8, fade: [0.01, 0.4], intensity: 60 });
      if (k.g >= 2) k.em({ count: 40, kind: 'streak', shape: 'sphere', radius: 0.5, pos: [2, 1.3, 0], dir: [1, 0, 0], spread: 0.3, speed: [3, 5], life: [0.2, 0.4], size: [0.2, 0.05], stretch: 2, swirl: 4, intensity: 1.2, emit: 0.35 });
      if (k.g === 3) {
        const sp = new THREE.Group();
        for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 5), iceMat()); const a = (i * TAU) / 5; s.position.set(0.25 * Math.cos(a), 0.3, 0.25 * Math.sin(a)); s.rotation.set(0.3 * Math.sin(a), 0, 0.3 * Math.cos(a)); sp.add(s); }
        sp.position.set(4, 0, 0);
        k.pop(sp, 0.3, 0.5, 1.7, 1.9);
      }
      k.extras(IP, 0.35);
    } }),

  SKILL('frost/snowfall-zone', 'Snowfall zone', m(['water', 'air', 'frost'], 'ground-slow', 0.6, 18, 6, 'circle'), 3.2, {
    view: 'wide', sky: 'night',
    act: act('castup', null, 3),
    // P3=431
    build(fx, o) {
      const k = kit(fx, o, FROST);
      k.em({ count: 220, kind: 'flake', shape: 'disc', radius: 1.8, pos: [3, 3.5, 0], dir: [0, -1, 0], spread: 0.2, speed: [0.5, 1], turb: [0.3, 1], life: [2, 2.6], size: [0.05, 0.03], rot: 3, intensity: 1.2, delay: 0.2, t0: 0.2, emit: 2.6 });
      k.smoke({ count: 40, shape: 'disc', radius: 1.6, pos: [3, 3.6, 0], dir: [0, -1, 0], speed: [0.2, 0.5], life: [2.5, 3.2], size: [0.8, 1.4], ramp: SNOW, delay: 0.2, t0: 0.2, emit: 2.6 });
      k.decal({ kind: 'frost', r: [2, 2], cells: 6, pos: [3, 0, 0], t0: 0, dur: 3.2, reveal: 1.5, intensity: 1 });
      k.ring({ t0: 0, dur: 0.8, r: [0.2, 4], normal: 'up', pos: [3, 0.03, 0] });
      k.smoke({ count: 40, shape: 'disc', radius: 2, pos: [3, 0.1, 0], dir: [0, 1, 0], speed: [0.1, 0.4], life: [1.5, 2.5], size: [0.6, 1.2], ramp: VAPOR, delay: 0.2, t0: 0.2, emit: 2.6 });
      k.light({ pos: [3, 2, 0.8], t0: 0, dur: 3.2, fade: [0.1, 0.8], flicker: 0.2, intensity: 30 });
      if (k.g >= 2) k.em({ count: 60, kind: 'flake', shape: 'ring', radius: 1.2, radiusIn: 0.8, pos: [3, 1.5, 0], dir: [0, 0.5, 0], spread: 0.6, speed: [0.5, 1.5], swirl: 2, life: [1.2, 2], size: [0.07, 0.04], rot: 3, intensity: 1.3, delay: 0.4, t0: 0.4, emit: 2.2 });
      if (k.g === 3) {
        k.ring({ t0: 1.0, dur: 0.6, r: [0.2, 2.5], normal: 'cam', pos: [3, 1.6, 0] });
        k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 1.5, pos: [3, 1.5, 0], size: [0.12, 0.04], life: [0.2, 0.4], intensity: 3, delay: 0.5, t0: 0.5, emit: 2.4 });
      }
      k.extras([3, 1, 0], 0.5);
    } }),

  SKILL('frost/hoarfrost-armor', 'Hoarfrost armor', m(['water', 'air', 'frost'], 'buff-armor', 0.5, 30, 0, 'self'), 2.8, {
    body: true, view: 'body', sky: 'night',
    // P3=241
    build(fx, o) {
      const k = kit(fx, o, FROST), D = 2.8;
      fx.body.setPose(POSES.guard);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(D - 0.6, D, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      fx.on((t) => fx.body.set({ frost: sm(0.2, 1, t) * (1 - sm(D - 0.4, D, t)) }));
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30);
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: D, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / D), intensity: 40 });
      fx.flash(0.3, 0.1, k.col(0), 0.12);
      const plateMat = addMat(k.col(1), 0.6, 0.55);
      for (let i = 0; i < 10; i++) {
        const a = (i * TAU) / 10, plate = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 6), plateMat);
        const s = [1.6 * Math.cos(a), 2.2, 1.6 * Math.sin(a)], e = [0.3 * Math.cos(a), 0.9 + 0.3 * (i % 3), 0.3 * Math.sin(a)], d0 = 0.2 + 0.04 * i;
        fx.mesh(plate, (t) => { const u = sm(d0, 0.9, t); plate.position.set(s[0] + (e[0] - s[0]) * u, s[1] + (e[1] - s[1]) * u, s[2] + (e[2] - s[2]) * u); }, { t0: 0, dur: D });
      }
      k.em({ count: 60, kind: 'flake', shape: 'ring', radius: 0.8, radiusIn: 0.5, pos: [0, 1, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.5, 1.2], swirl: 2.5, life: [1, 1.6], size: [0.06, 0.03], rot: 3, intensity: 1.2, delay: 0.3, t0: 0.3, emit: 2.2 });
      k.smoke({ count: 40, shape: 'disc', radius: 0.5, pos: [0, 0.05, 0], dir: [0, 1, 0], speed: [0.2, 0.6], life: [1, 1.6], size: [0.5, 0.9], ramp: VAPOR, emit: 2.2 });
      k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 0.6, pos: [0, 1.1, 0.2], size: [0.1, 0.04], life: [0.2, 0.4], intensity: 3, delay: 0.2, t0: 0.2, emit: 2.4 });
      if (k.g >= 2) k.decal({ kind: 'frost', r: [1.2, 1.2], cells: 6, pos: [0, 0, 0], t0: 0.1, dur: 2.6, reveal: 0.9, intensity: 1 });
      if (k.g === 3) {
        k.em({ count: 40, kind: 'shard', shape: 'sphere', radius: 0.5, pos: [0, 1.1, 0], dir: [0, 1, 0], spread: 1.6, radial: 0.8, speed: [1, 3], life: [0.5, 1], gravity: [0, -6, 0], size: [0.06, 0.03], rot: 5, intensity: 1.2, delay: 0.3, t0: 0.28, emit: 0.001 });
        k.ring({ t0: 0.3, dur: 0.5, r: [0.2, 2], normal: 'cam', pos: [0, 1.1, 0] });
      }
      k.extras([0, 1.1, 0], 0.3);
    } }),

  SKILL('frost/shatter-step', 'Shatter step', m(['water', 'air', 'frost'], 'dash-shards', 0.2, 10, 5, 'line'), 1.6, {
    view: 'side', sky: 'night',
    act: { kind: 'none', target: [3.1, 0, 0], windup: 0.5, keys: [[-0.5, 'guard'], [-0.15, 'dashLow'], [0, 'lunge', 'snap'], [0.3, 'lunge'], [0.9, 'guard']], hits: hits([0.02], { stop: 0.05, shake: 0.25, amp: 0.03, push: 1.2 }) },
    // P3=339
    build(fx, o) {
      const k = kit(fx, o, FROST), T0 = -0.15, X0 = 0, X1 = 2.8;
      const X = (t) => (t < T0 ? X0 : t < 0 ? X0 + (X1 - X0) * sm(T0, 0, t) : X1);
      fx.on((t) => { fx.body.position.x = X(t); });
      k.ribbon({ points: (t) => { const x = X(clamp(t, T0, 0)); return [[x - 1.2, 0.9, 0.3], [x, 0.9, 0.3]]; }, n: 1, width: 0.05, head: () => 1.001, fade: [0.03, 0.2], t0: T0, dur: 1.2 });
      k.smoke({ kind: 'dust', ramp: DUST, count: 30, shape: 'line', shapeSize: [1.4, 0, 0], pos: [1.4, 0.05, 0], dir: [-1, 0.2, 0], spread: 0.6, speed: [0.5, 1.5], life: [0.5, 0.9], size: [0.15, 0.4], delay: T0, emit: 0.3 });
      for (let i = 0; i < 6; i++) {
        const b = 0.5 + 0.08 * i, x = 0.4 + 0.4 * i, c = new THREE.Mesh(new THREE.OctahedronGeometry(0.15), iceMat());
        c.position.set(x, 0.6, 0.6);
        k.pop(c, b - 0.1, b + 0.05, 1.0, 1.3);
        k.em({ count: 20, kind: 'shard', shape: 'sphere', radius: 0.1, pos: [x, 0.6, 0.6], dir: [0, 1, 0], spread: 1.4, radial: 1, speed: [1, 3], life: [0.4, 0.8], gravity: [0, -8, 0], size: [0.06, 0.03], rot: 5, intensity: 1.2, delay: b, t0: b - 0.02, emit: 0.001 });
        k.smoke({ count: 6, shape: 'sphere', radius: 0.2, pos: [x, 0.4, 0.6], dir: [0, 1, 0], spread: 1, speed: [0.2, 0.6], life: [0.6, 1], size: [0.3, 0.6], ramp: VAPOR, delay: b, t0: b - 0.02, emit: 0.001 });
      }
      k.smoke({ count: 30, shape: 'line', shapeSize: [1.4, 0, 0], pos: [1.4, 0.1, 0], dir: [0, 1, 0], speed: [0.2, 0.6], life: [0.8, 1.4], size: [0.3, 0.6], ramp: VAPOR, delay: T0, emit: 0.6 });
      ct(fx, k, [X1 + 0.4, 1.2, 0.1], 0.02, 40);
      fx.flash(0.02, 0.1, k.col(0), 0.15);
      fx.shake(0.02, 0.2, 0.03);
      if (k.g >= 2) k.decal({ kind: 'frost', r: [0.8, 0.8], cells: 6, pos: [0, 0, 0], t0: 0, dur: 1.2, reveal: 0.5, intensity: 1 });
      if (k.g === 3) {
        k.ring({ t0: 0.5, dur: 0.5, r: [0.2, 2], normal: 'cam', pos: [3.1, 1.2, 0] });
        k.em({ count: 40, kind: 'shard', shape: 'sphere', radius: 0.2, pos: [3.1, 1.2, 0], dir: [0, 1, 0], spread: 1.6, radial: 1, speed: [2, 5], life: [0.4, 0.8], gravity: [0, -8, 0], size: [0.07, 0.03], rot: 5, intensity: 1.2, delay: 0.5, t0: 0.48, emit: 0.001 });
      }
      k.extras([X1 + 0.4, 1.2, 0], 0.02);
    } }),

  SKILL('frost/aurora-veil', 'Aurora veil', m(['water', 'air', 'frost'], 'heal-buff', 0.8, 30, 0, 'self'), 3.2, {
    body: true, view: 'body', sky: 'night',
    // P3=221
    build(fx, o) {
      const k = kit(fx, o, FROST), D = 3.2;
      fx.body.setPose(POSES.castUp);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(D - 0.6, D, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30);
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: D, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / D), intensity: 40 });
      fx.flash(0.3, 0.1, k.col(0), 0.12);
      const curtains = (R) => {
        for (let i = 0; i < 5; i++) {
          const ramp = i % 2 ? k.ramp.map(([u, c, a]) => [u, '#7fffd0', a]) : k.ramp;
          k.ribbon({ points: (t) => Array.from({ length: 9 }, (_, j) => { const th = (i - 2) * 0.25 + (j / 8 - 0.5) * 0.6, x = R * Math.sin(th) + 0.15 * Math.sin((TAU * 2 * t) / D + i); return [x, 1.6 + j / 8, R * Math.cos(th)]; }), n: 8, width: 0.25, intensity: 0.6, ramp, t0: 0, dur: D });
        }
      };
      curtains(1.2);
      k.em({ count: 80, kind: 'soft', shape: 'ring', radius: 1.2, radiusIn: 1.0, pos: [0, 1.6, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.4, 0.9], life: [1.5, 2.4], size: [0.12, 0.06], turb: [0.1, 1], intensity: 0.8, emit: 3.0 });
      k.em({ count: 30, kind: 'flake', shape: 'sphere', radius: 1.0, pos: [0, 1.6, 0], dir: [0, -1, 0], speed: [0.2, 0.5], life: [1.5, 2.5], size: [0.05, 0.03], rot: 3, intensity: 1.2, emit: 3.0 });
      if (k.g >= 2) curtains(1.5);
      if (k.g === 3) {
        k.em({ count: 40, kind: 'glint', shape: 'ring', radius: 1.4, pos: [0, 2.2, 0], size: [0.12, 0.04], life: [0.2, 0.4], intensity: 3, emit: 3.0 });
        k.beam({ pos: [0, 0, 0], height: 3, r: [0.5, 0.8], intensity: 0.25, t0: 0.3, dur: 2.4, fade: [0.2, 0.6] });
      }
      k.extras([0, 1.1, 0], 0.3);
    } }),
];
