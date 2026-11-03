// Rogue class: 10 dagger, stealth and trap skills (PLAN2 B3/B4). Built from the T-TEL, T-VOL, T-DSH, T-ORB and T-MEL templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, metal, DUST, VOID, POISON, BLOOD, STEEL, AIR } from './_skill.js';
import { swing, contact } from './melee.js';

const m = meta('rogue', 'class');
const C = [1.62, 1.2, 0.1]; // melee contact point
const O = [0, 0, 0];
const lerp3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
const VSM = [[0, '#4a4058', 0], [0.15, '#3a3048', 0.55], [1, '#141018', 0]]; // dark violet smoke
const PSM = [[0, '#3a6a20', 0], [0.15, '#2a4a18', 0.55], [1, '#0a1406', 0]]; // green poison smoke
/** T-DSH x(t): x0 until t0, slides to x1 at time 0 */
const dashX = (x0, x1, t0) => (t) => (t < t0 ? x0 : t < 0 ? x0 + (x1 - x0) * sm(t0, 0, t) : x1);
/** T-DSH speed ribbons: thin lines trailing the body at heights ys */
const speedLines = (k, X, t0, ys) => ys.forEach((y) => k.ribbon({ points: (t) => { const x = X(clamp(t, t0, 0)); return [[x - 1.4, y, 0], [x - 0.6, y, 0], [x, y, 0]]; }, n: 2, width: 0.025, head: () => 1.001, fade: [0.03, 0.12], t0, dur: 0.6 }));
/** T-MEL swing for one hit */
const swingS = (fx, k, h) => swing(fx, { t0: h - 0.07, t1: h + 0.13, len: 0.12, inner: 0.6, outer: 1.05, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 1.4 * k.b, edge: 3 });
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });

export default [
  SKILL('rogue/shadow-strike', 'Shadow strike', m(['void'], 'teleport-strike', 0.3, 12, 6, 'point'), 1.6, {
    view: 'side',
    act: act('slash', 0.02, 1.9, { weapon: 'dagger', windup: 0.6, keys: [[-0.6, 'guard'], [-0.45, 'vanish'], [-0.1, 'behind'], [0, 'daggerB', 'snap'], [0.3, 'daggerA'], [1, 'guard']], hits: [{ t: 0.02, stop: 0.1, shake: 0.3, amp: 0.04, push: 1.8 }] }),
    // P3=174
    build(fx, o) {
      const k = kit(fx, o, VOID), P = [2.1, 1.2, 0.1];
      // T-TEL: vanish at TS in place, reappear behind the target at Bx facing -X
      const TS = -0.2, Ax = 0, Bx = 2.6, ROT = Math.PI;
      fx.on((t) => { const b = fx.body; if (t < TS) { b.position.x = Ax; const q = sm(TS - 0.35, TS, t); b.set({ dissolve: q < 0.002 ? -1 : q, dDir: -1, edge: k.col(1), edgeW: 0.09, edgeInt: 4 }); } else { b.position.x = Bx; b.rotation.y = ROT; const q = 1 - sm(TS, TS + 0.25, t); b.set({ dissolve: q < 0.002 ? -1 : q, dDir: 1, edge: k.col(1), edgeW: 0.09, edgeInt: 4 }); } });
      k.ring({ t0: TS - 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: [Ax, 0, 0] });
      k.ring({ t0: TS, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: [Bx, 0, 0] });
      k.smoke({ count: 40, shape: 'sphere', radius: 0.3, pos: [0, 1, 0], delay: -0.3, emit: 0.1, t0: -0.3 });
      k.smoke({ count: 30, shape: 'sphere', radius: 0.3, pos: [2.6, 1, 0], delay: -0.2, emit: 0.1, t0: -0.2 });
      k.ribbon({ points: [[2.6, 1.25, 0], [1.7, 1.15, 0]], n: 1, width: 0.05, sweep: [0, 1.5], t0: -0.02, dur: 0.12 });
      ct(fx, k, P, 0.02, 40);
      fx.flash(0.02, 0.1, k.col(0), 0.12);
      k.light({ pos: [2.1, 1.2, 0.6], t0: 0.02, dur: 0.6, fade: [0.01, 0.35], intensity: 60 });
      if (k.g >= 2) { k.em({ count: 20, kind: 'streak', shape: 'point', pos: P, speed: [3, 6], life: [0.2, 0.4], delay: 0.02, emit: 0.001, t0: 0 }); k.glint(P, 0.02, 1.6); }
      if (k.g === 3) { k.ghost('vanish', O, -0.3, 0.6); k.ring({ t0: 0.02, dur: 0.4, r: [0.1, 1.2], normal: 'cam', pos: P }); }
      k.extras(P, 0.02);
    } }),

  SKILL('rogue/venom-fan', 'Venom fan', m(['poison'], 'volley', 0.3, 8, 7, 'cone'), 1.4, {
    view: 'side',
    act: act('throw', 0.3, 3.6, { weapon: 'dagger', windup: 0.4 }),
    // P3=247
    build(fx, o) {
      const k = kit(fx, o, POISON), A = [0.6, 1.38, 0.2], T = 0.3;
      const mat = metal('#c9d1da', '#2a8a20', 0.6), geo = new THREE.BoxGeometry(0.03, 0.25, 0.01);
      // T-VOL: daggers fan out from A; 7 with grade 2+
      const angles = k.g >= 2 ? [-0.55, -0.4, -0.2, 0, 0.2, 0.4, 0.55] : [-0.4, -0.2, 0, 0.2, 0.4];
      for (const a of angles) {
        const E = [A[0] + 3.2 * Math.cos(a), A[1] - 0.16, A[2] + 3.2 * Math.sin(a)];
        const P = (t) => lerp3(A, E, clamp(t / T));
        const d = new THREE.Mesh(geo, mat);
        d.rotation.set(0, -a, -Math.PI / 2);
        fx.mesh(d, (t) => d.position.set(...P(t)), { t0: 0, dur: T + 0.05 });
        k.trail({ path: P, t0: 0, dur: T + 0.05, len: 0.15, width: 0.03 });
        k.sparks(E, T, 10);
        k.smoke({ count: 8, shape: 'sphere', radius: 0.1, pos: E, delay: T, emit: 0.3, t0: T - 0.02, ramp: PSM });
      }
      k.em({ count: 30, kind: 'drop', shape: 'sphere', radius: 0.15, pos: [3.3, 1.2, 0], speed: [0.5, 1.5], life: [0.3, 0.6], gravity: [0, -6, 0], delay: T, emit: 0.3, t0: T - 0.02 });
      k.decal({ kind: 'glow', r: [0.6, 0.6], pos: [3.3, 0, 0], t0: T, dur: 1.1 });
      k.light({ pos: [3.3, 0.8, 0], t0: T, dur: 0.6, fade: [0.02, 0.3], intensity: 40 });
      fx.flash(T, 0.1, k.col(0), 0.12);
      if (k.g === 3) k.smoke({ count: 50, shape: 'sphere', radius: 0.6, pos: [3.3, 0.6, 0], delay: 0.35, emit: 0.25, t0: 0.33, ramp: PSM });
      k.extras([3.3, 1.2, 0], T);
    } }),

  SKILL('rogue/smoke-vanish', 'Smoke vanish', m(['void'], 'teleport', 0.1, 15, 0, 'self'), 1.8, {
    view: 'side',
    act: act('none', null, false, { weapon: 'dagger', windup: 0.4, keys: [[-0.3, 'guard'], [-0.1, 'crouch'], [0.05, 'vanish'], [1.8, 'vanish']] }),
    // P3=213
    build(fx, o) {
      const k = kit(fx, o, VOID);
      // body dissolves in place, reappears at x -2.2 (dissolve back in over .9..1.2)
      fx.on((t) => { const b = fx.body; if (t < 0.9) { b.position.x = 0; const q = sm(0, 0.35, t); b.set({ dissolve: q < 0.002 ? -1 : q, dDir: -1, edge: k.col(1), edgeW: 0.09, edgeInt: 4 }); } else { b.position.x = -2.2; const q = 1 - sm(0.9, 1.2, t); b.set({ dissolve: q < 0.002 ? -1 : q, dDir: 1, edge: k.col(1), edgeW: 0.09, edgeInt: 4 }); } });
      k.smoke({ count: 90, shape: 'sphere', radius: 0.4, pos: [0, 0.6, 0], delay: 0, emit: 0.25, t0: 0, speed: [1, 3], life: [1.5, 2.5], size: [0.6, 1.8], ramp: VSM });
      k.em({ count: 1, kind: 'soft', shape: 'point', pos: [0, 1, 0], size: [1.5, 1.5], life: [0.3, 0.3], intensity: 3, delay: 0.05, emit: 0.001, t0: 0.03 });
      k.glint([0, 1, 0], 0.05, 1.5);
      k.ring({ t0: 0, dur: 0.6, r: [0.2, 2.2], normal: 'up' });
      k.smoke({ count: 40, shape: 'sphere', radius: 0.4, pos: [-2.2, 0.6, 0], delay: 0.85, emit: 0.15, t0: 0.85, ramp: VSM });
      k.ring({ t0: 0.9, dur: 0.6, r: [0.2, 2.2], normal: 'up', pos: [-2.2, 0, 0] });
      fx.flash(0, 0.1, '#cbb6ff', 0.15);
      fx.shake(0, 0.2, 0.02);
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 1.2, fade: [0.1, 0.4], intensity: 40 });
      if (k.g >= 2) k.sparks([0, 1, 0], 0.05, 40);
      if (k.g === 3) { k.ghost('vanish', O, 0, 0.5); k.decal({ kind: 'scorch', r: [0.8, 0.8], pos: O, t0: 0, dur: 1.8 }); }
      k.extras([0, 1, 0], 0.05);
    } }),

  SKILL('rogue/bleed-flurry', 'Bleed flurry', m(['blood'], 'melee-combo', 0.2, 9, 2, 'point'), 1.5, {
    view: 'side',
    act: { kind: 'slash', weapon: 'dagger', target: [1.85, 0, 0], windup: 0.3, keys: [[-0.2, 'guard'], [0, 'daggerA', 'snap'], [0.18, 'daggerB', 'snap'], [0.36, 'daggerA', 'snap'], [0.54, 'daggerB', 'snap'], [0.72, 'daggerA', 'snap'], [1.1, 'guard']],
      hits: [0, 0.18, 0.36, 0.54].map((t) => ({ t, stop: 0.03, shake: 0.1, amp: 0.015, push: 0.4 })).concat([{ t: 0.72, stop: 0.1, shake: 0.3, amp: 0.04, push: 1.6 }]) },
    // P3=171
    build(fx, o) {
      const k = kit(fx, o, BLOOD);
      // five stabs: jab ribbons + contact each
      for (const h of [0, 0.18, 0.36, 0.54, 0.72]) {
        for (let j = -2; j <= 2; j++) k.ribbon({ points: [[1.0, 1.2 + 0.08 * j, 0.2], [1.75, 1.15 + 0.08 * j, 0.1]], n: 1, width: 0.04, sweep: [0, 1.5], t0: h - 0.02, dur: 0.08 });
        ct(fx, k, [1.8, 1.15, 0.1], h, 12);
      }
      // bleed DoT and red glow on the target
      k.em({ count: 40, kind: 'drop', shape: 'box', shapeSize: [0.15, 0.4, 0.1], pos: [1.85, 1.1, 0], gravity: [0, -6, 0], bounce: 0.2, delay: 0.2, emit: 0.8, t0: 0.2 });
      k.decal({ kind: 'glow', r: [0.5, 0.5], pos: [1.85, 0, 0], t0: 0, dur: 1.5 });
      const EM = k.g === 3 ? 1.4 : 0.8;
      fx.on((t) => { fx.target.mat.emissive.set('#ff1a1a'); fx.target.mat.emissiveIntensity = EM * sm(0, 0.3, t) * (1 - sm(1.2, 1.5, t)) * Math.sin((Math.PI * t) / 0.6) ** 2; });
      k.light({ pos: [1.85, 1.2, 0.8], t0: 0.02, dur: 1.2, fade: [0.02, 0.5], intensity: 40 });
      fx.flash(0.72, 0.1, k.col(0), 0.12);
      if (k.g >= 2) k.em({ count: 20, kind: 'ring', shape: 'ring', radius: 0.5, pos: [1.85, 0.2, 0], dir: [0, 1, 0], speed: [0.5, 1.2], delay: 0.3, emit: 1, t0: 0.3 });
      if (k.g === 3) k.slash({ center: [1.8, 1.2, 0], radius: 1.3, a0: 2.2, a1: -0.6, tilt: 0.2, width: 0.25, t0: 0.72, dur: 0.3, intensity: 3.5 });
      k.extras([1.85, 1.2, 0], 0.72);
    } }),

  SKILL('rogue/caltrop-field', 'Caltrop field', m(['steel'], 'trap', 0.3, 14, 5, 'circle'), 2.4, {
    view: 'wide',
    act: act('throw', 0.9, 3, { weapon: 'dagger' }),
    // P3=186
    build(fx, o) {
      const k = kit(fx, o, STEEL), A = [0.6, 1.38, 0.2], T = 0.35, TRIG = 0.9;
      const mat = metal(), geo = new THREE.TetrahedronGeometry(0.05), spikeGeo = new THREE.ConeGeometry(0.1, 0.75, 6);
      // 12 caltrops on parabolas from A onto a disc r 0.9 at [2.6,0,0]
      const L = Array.from({ length: 12 }, () => { const a = fx.rng() * TAU, r = 0.9 * Math.sqrt(fx.rng()); return [2.6 + r * Math.cos(a), 0.02, r * Math.sin(a)]; });
      L.forEach((E) => {
        const P = (t) => { const u = clamp(t / T); return [A[0] + (E[0] - A[0]) * u, A[1] + (E[1] - A[1]) * u + 0.8 * Math.sin(Math.PI * u), A[2] + (E[2] - A[2]) * u]; };
        const c = new THREE.Mesh(geo, mat);
        fx.mesh(c, (t) => c.position.set(...P(t)), { t0: 0, dur: 2.4 });
        k.glint(E, T, 0.8);
      });
      k.ring({ t0: T, dur: 0.35, r: [0.2, 1.2], normal: 'up', pos: [2.6, 0, 0] });
      // trigger: 8 spikes pop up under the caltrops
      for (const E of L.slice(0, 8)) { const s = new THREE.Mesh(spikeGeo, mat); s.position.set(E[0], 0.375, E[2]); k.pop(s, TRIG, TRIG + 0.05, 2.3, 2.4); }
      k.sparks([2.9, 0.3, 0], TRIG, 40);
      ct(fx, k, [2.9, 0.4, 0], TRIG, 40);
      k.smoke({ count: 20, shape: 'disc', radius: 0.4, pos: [2.6, 0.05, 0], ramp: DUST, delay: TRIG, emit: 0.3, t0: TRIG - 0.02 });
      k.decal({ kind: 'rings', r: [1.1, 1.1], pos: [2.6, 0, 0], t0: 0.4, dur: 2 });
      k.decal({ kind: 'rune', r: [1.1, 1.1], pos: [2.6, 0, 0], t0: 0.1, dur: 2.2, glyphs: 8, poly: 4, intensity: 1.2 });
      k.glint([2.6, 0.05, 0], T, 1.2);
      k.light({ pos: [2.9, 0.8, 0.6], t0: TRIG, dur: 0.8, fade: [0.02, 0.4], intensity: 50 });
      fx.flash(TRIG, 0.1, k.col(0), 0.12);
      if (k.g === 3) k.sparks([2.9, 0.3, 0], 1.4, 30);
      k.extras([2.9, 0.3, 0], TRIG);
    } }),

  SKILL('rogue/twin-fang-dash', 'Twin fang dash', m(['steel', 'void'], 'dash-through', 0.2, 10, 6, 'line'), 1.3, {
    view: 'side',
    act: act('thrust', -0.05, 1.9, { weapon: 'dagger', windup: 0.5, keys: [[-0.5, 'guard'], [-0.25, 'dashLow'], [0, 'lunge', 'snap'], [0.3, 'lunge'], [0.9, 'guard']] }),
    // P3=153
    build(fx, o) {
      const k = kit(fx, o, STEEL), x0 = -1.2, x1 = 3.2, t0 = -0.25, X = dashX(x0, x1, t0);
      // T-DSH
      fx.on((t) => { fx.body.position.x = X(t); });
      speedLines(k, X, t0, [0.5, 0.8, 1.1, 1.4]);
      k.smoke({ count: 30, shape: 'line', shapeSize: [(x1 - x0) / 2, 0, 0], pos: [(x0 + x1) / 2, 0.05, 0], dir: [-1, 0.2, 0], ramp: DUST, delay: t0, emit: 0.3, t0: t0 - 0.02 });
      ct(fx, k, [x1 + 0.4, 1.2, 0.1], 0.02, 40);
      // two fang slashes along the path, then an X-cross at the target
      for (const y of [1.0, 1.3]) k.ribbon({ points: [[-1, y, 0], [1, y, 0], [3, y, 0]], n: 2, width: 0.05, sweep: [0, 1.5], t0: 0.05, dur: 0.15, intensity: 3 });
      k.slash({ center: [1.9, 1.15, 0], radius: 0.5, a0: 2.4, a1: 0.7, t0: 0.15, dur: 0.2 });
      k.slash({ center: [1.9, 1.15, 0], radius: 0.5, a0: 0.7, a1: -1.0, t0: 0.15, dur: 0.2 });
      fx.flash(-0.05, 0.1, k.col(0), 0.12);
      k.light({ pos: [1.9, 1.2, 0.6], t0: 0.1, dur: 0.8, fade: [0.02, 0.4], intensity: 50 });
      if (k.g >= 2) { k.ghost('dashLow', [0.2, 0, 0], -0.15, 0.4); k.ghost('dashLow', [1.2, 0, 0], -0.15, 0.4); }
      if (k.g === 3) { k.em({ count: 40, kind: 'spark', shape: 'line', shapeSize: [1.6, 0, 0], pos: [1, 1.1, 0], delay: 0.3, emit: 0.001, t0: 0.28 }); k.ring({ t0: 0.15, dur: 0.4, r: [0.1, 1.2], normal: 'cam', pos: [1.9, 1.15, 0.1] }); }
      k.extras([1.9, 1.15, 0], -0.05);
    } }),

  SKILL('rogue/death-mark', 'Death mark', m(['void'], 'debuff-execute', 0.4, 20, 3, 'point'), 2.6, {
    view: 'side',
    act: act('slash', 1.52, 1.9, { weapon: 'dagger', windup: 0.4, keys: [[-0.4, 'guard'], [-0.2, 'castCharge'], [0, 'castRelease', 'snap'], [0.8, 'guard'], [1.3, 'windupHigh'], [1.5, 'cut', 'snap'], [1.7, 'follow'], [2.4, 'guard']], hits: [{ t: 1.52, stop: 0.12, shake: 0.3, amp: 0.05, push: 2 }] }),
    // P3=183
    build(fx, o) {
      const k = kit(fx, o, VOID), M = [1.9, 2.05, 0];
      // the mark: rune above the target head, beam to the head, soft motes
      k.decal({ kind: 'rune', r: [0.35, 0.35], pos: [1.9, 0, 0], y: 2.05, t0: 0, dur: 1.6, reveal: 0.3, spin: 1, glyphs: 8 });
      k.beam({ from: M, to: [1.9, 1.6, 0], r: [0.02, 0.02], intensity: 0.5, t0: 0, dur: 1.6 });
      k.em({ count: 20, kind: 'soft', shape: 'point', pos: M, delay: 0, emit: 1.5, t0: 0 });
      k.smoke({ count: 30, shape: 'sphere', radius: 0.4, pos: [1.9, 0.1, 0], delay: 0, emit: 1.4, t0: 0 });
      // finisher: big slash, contact, shatter of the mark
      k.slash({ center: [1.9, 1.2, 0], radius: 1.4, a0: 2.2, a1: -0.7, width: 0.3, t0: 1.48, dur: 0.3, intensity: 3.5 });
      ct(fx, k, C, 1.52, 60);
      k.em({ count: 30, kind: 'shard', shape: 'point', pos: M, delay: 1.52, emit: 0.001, t0: 1.5, speed: [2, 6], gravity: [0, -9, 0] });
      k.ring({ t0: 1.3, dur: 0.2, r: [1, 0.1], normal: 'cam', pos: M });
      fx.flash(1.52, 0.1, k.col(0), 0.2);
      k.light({ pos: [1.9, 2.05, 0.6], t0: 1.5, dur: 0.8, fade: [0.02, 0.4], intensity: 60 });
      k.extras(C, 1.52);
    } }),

  SKILL('rogue/echo-step', 'Echo step', m(['air'], 'dash-afterimage', 0, 6, 5, 'line'), 1.4, {
    view: 'side',
    act: act('none', null, false, { weapon: 'dagger', windup: 0.4, keys: [[-0.4, 'guard'], [-0.2, 'runA'], [-0.1, 'runB'], [0, 'dashLow', 'snap'], [0.4, 'guard']] }),
    // P3=151
    build(fx, o) {
      const k = kit(fx, o, AIR), X = dashX(0, 2.4, -0.2);
      fx.on((t) => { fx.body.position.x = X(t); });
      // afterimages at 0, .6, 1.2, 1.8 (2 more with grade 2+)
      for (let i = 0; i < 4; i++) k.ghost(i % 2 ? 'runA' : 'runB', [0.6 * i, 0, 0], -0.2 + 0.05 * i, 0.6);
      speedLines(k, X, -0.2, [0.5, 0.8, 1.1, 1.4]);
      k.smoke({ count: 25, shape: 'disc', radius: 0.3, pos: [0, 0.05, 0], ramp: DUST, delay: -0.2, emit: 0.2, t0: -0.22 });
      k.smoke({ count: 25, shape: 'disc', radius: 0.3, pos: [2.4, 0.05, 0], ramp: DUST, delay: 0, emit: 0.2, t0: -0.02 });
      k.ring({ t0: 0, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: [2.4, 0, 0] });
      k.light({ pos: [1.2, 1.2, 0.6], t0: -0.2, dur: 1.0, fade: [0.1, 0.6], intensity: 30 });
      if (k.g >= 2) { k.ghost('runA', [0.3, 0, 0], -0.15, 0.6); k.ghost('runB', [0.9, 0, 0], -0.1, 0.6); }
      if (k.g === 3) for (let i = 0; i < 4; i++) k.em({ count: 15, kind: 'soft', shape: 'box', shapeSize: [0.2, 0.6, 0.1], pos: [0.6 * i, 1, 0], delay: 0.2 + 0.05 * i, emit: 0.3, t0: 0.18 + 0.05 * i });
      k.extras([1.2, 1.2, 0], 0);
    } }),

  SKILL('rogue/razor-cyclone', 'Razor cyclone', m(['steel'], 'orbit-release', 0.5, 12, 5, 'ring'), 2.2, {
    view: 'high',
    act: act('slash', 1.25, 3.8, { weapon: 'dagger', windup: 0.4, keys: [[-0.4, 'guard'], [-0.2, 'castCharge'], [0, 'castRelease'], [0.9, 'castRelease'], [1, 'throwFwd', 'snap'], [1.6, 'guard']] }),
    // P3=185
    build(fx, o) {
      const k = kit(fx, o, STEEL), TF = 1.0, FLY = 0.25, mat = metal(), geo = new THREE.BoxGeometry(0.035, 0.3, 0.01);
      // T-ORB: a dagger orbits the caster until TF, then flies to [3.7,1.1,z]
      const fire = (a0, R, w, z) => {
        const P = (t) => { const a = a0 + w * Math.min(t, TF), o2 = [R * Math.cos(a), 1.1, R * Math.sin(a)]; return lerp3(o2, [3.7, 1.1, z], sm(TF, TF + FLY, t)); };
        const d = new THREE.Mesh(geo, mat);
        d.scale.setScalar(2.2);
        fx.mesh(d, (t) => d.position.set(...P(t)), { t0: -0.2, dur: TF + FLY + 0.05 });
        k.trail({ path: P, t0: 0, dur: TF + FLY, len: 0.35, width: 0.06, intensity: 2 });
        k.sparks([3.7, 1.1, z], TF + FLY, 12);
      };
      for (let i = 0; i < 6; i++) fire((i * TAU) / 6, 0.9, 9, (i - 2.5) * 0.15);
      if (k.g >= 2) for (let i = 0; i < 2; i++) fire((i * TAU) / 6 + TAU / 12, 0.9, 9, i ? 0.45 : -0.45);
      if (k.g === 3) for (let i = 0; i < 4; i++) fire((i * TAU) / 4, 0.5, -11, (i - 1.5) * 0.15);
      k.ring({ t0: 0, dur: 1, r: [0.9, 0.9], normal: 'up', pos: [0, 1.1, 0], width: [0.03, 0.03], decay: 0, intensity: 0.5 });
      k.light({ pos: [0, 1.4, 0.8], t0: 0, dur: 1.5, fade: [0.1, 0.5], intensity: 50 });
      fx.flash(1.25, 0.1, k.col(0), 0.12);
      k.extras([3.7, 1.1, 0], 1.25);
    } }),

  SKILL('rogue/night-ambush', 'Night ambush', m(['void'], 'critical-strike', 0.6, 15, 2, 'point'), 1.6, {
    view: 'side', sky: 'night',
    act: act('slash', 0.07, 1.85, { weapon: 'dagger', windup: 0.6, hits: [{ t: 0.07, stop: 0.16, shake: 0.45, amp: 0.07, push: 2.4 }] }),
    // P3=175
    build(fx, o) {
      const k = kit(fx, o, VOID);
      // dark flash, then a T-MEL swing and critical contact
      k.em({ count: 1, kind: 'soft', blend: 'normal', shape: 'point', pos: [1.2, 1.2, 0], size: [3, 6], ramp: [[0, '#000', 0], [0.2, '#000', 0.7], [1, '#000', 0]], life: [0.3, 0.3], delay: 0.05, emit: 0.001, t0: 0.03 });
      swingS(fx, k, 0.07);
      k.slash({ center: [1.5, 1.2, 0], radius: 1.3, a0: 2.4, a1: -0.7, tilt: 0.1, width: 0.35, t0: 0, dur: 0.2, intensity: 4 });
      ct(fx, k, C, 0.07, 70);
      k.em({ count: 30, kind: 'shard', shape: 'point', pos: C, delay: 0.07, emit: 0.001, t0: 0.05, speed: [2, 6], gravity: [0, -9, 0] });
      k.smoke({ count: 30, shape: 'disc', radius: 0.3, pos: C, delay: 0.07, emit: 0.2, t0: 0.05 });
      if (k.g >= 2) { k.ring({ t0: 0.07, dur: 0.4, r: [0.1, 1.6], normal: 'cam', pos: C }); k.glint(C, 0.07, 1.6); }
      if (k.g === 3) for (const t of [0.2, 0.28, 0.36]) k.slash({ center: [1.5, 1.2, 0], radius: 1.04, a0: 2.4, a1: -0.7, tilt: 0.1, width: 0.35, t0: t, dur: 0.2, intensity: 3 });
      k.extras(C, 0.07);
    } }),
];
