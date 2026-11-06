// Warrior class: 10 melee, buff and displacement skills (PLAN2 B1/B2). Built from the T-MEL, T-SPIN, T-LEP, T-NOV, T-DSH, T-BUF templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, TAU, POSES, metal, rock, addMat, DUST, STEEL, AIR, FIRE, BLOOD, EARTH } from './_skill.js';
import { swing, contact, bladeTable, sweepSurface } from './melee.js';

const m = meta('warrior', 'class');
const COMBO3 = [[-0.45, 'guard'], [-0.2, 'windupHigh'], [0, 'cut', 'snap'], [0.14, 'follow'], [0.34, 'sideBack'], [0.47, 'sideCut', 'snap'], [0.62, 'follow'], [0.84, 'overheadUp'], [0.98, 'smashDown', 'snap'], [1.5, 'smashDown'], [2.0, 'guard']];
const lerp3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
const arcPts = (cx, cy, R, a0, a1, n) => Array.from({ length: n + 1 }, (_, j) => { const a = a0 + ((a1 - a0) * j) / n; return [cx + R * Math.cos(a), cy + R * Math.sin(a), 0]; });
/** T-MEL swing for one hit: blade surface + hot edge trail */
const swingS = (fx, k, h) => swing(fx, { t0: h - 0.07, t1: h + 0.13, len: 0.12, inner: 0.6, outer: 1.05, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: Math.min(1.5, 1.4 * k.b), edge: 3 });
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });

export default [
  SKILL('warrior/crescent-chain', 'Crescent chain', m(['steel'], 'melee-combo', 0.4, 6, 2.5, 'arc'), 1.9, {
    view: 'side',
    act: { kind: 'slash', weapon: 'sword', target: [1.49, 0, 0], windup: 0.45, keys: COMBO3, hits: [{ t: 0.02, stop: 0.06, shake: 0.15, amp: 0.025, push: 0.9 }, { t: 0.49, stop: 0.07, shake: 0.2, amp: 0.03, push: 1.2 }, { t: 1.0, stop: 0.13, shake: 0.5, amp: 0.07, push: 2.4, flash: 0.25 }] },
    // P3=234
    build(fx, o) {
      const k = kit(fx, o, STEEL), C = fx.anchor('tip', 1.0), G = [C[0], 0, C[2]]; // finisher blade tip / ground under it
      for (const [h, n] of [[0.02, 30], [0.49, 30], [1.0, 60]]) { swingS(fx, k, h); ct(fx, k, fx.anchor('tip', h), h, n, h === 1.0 ? { lightI: 0 } : {}); }
      k.slash({ ...fx.bladeArc(-0.08, 0.12), width: 0.2, t0: 0, dur: 0.3, intensity: 1.5 / k.b });
      k.slash({ ...fx.bladeArc(0.4, 0.56), width: 0.22, t0: 0.45, dur: 0.3, intensity: 1.5 / k.b });
      k.slash({ ...fx.bladeArc(0.9, 1.04), width: 0.3, t0: 0.96, dur: 0.34, intensity: 4.5 });
      k.ring({ t0: 1.0, dur: 0.6, r: [0.2, 3], normal: 'up', pos: G });
      k.smoke({ count: 26, shape: 'disc', radius: 0.3, pos: [G[0], 0.05, G[2]], ramp: DUST, delay: 1, emit: 0.15, t0: 0.98 });
      if (k.g >= 2) k.em({ count: 40, kind: 'shard', shape: 'point', pos: C, delay: 1, t0: 0.98, speed: [2, 6], gravity: [0, -9, 0], bounce: 0.3 });
      if (k.g === 3) k.slash({ ...fx.bladeArc(0.9, 1.04), radius: 2.2, width: 0.4, t0: 1.02, dur: 0.35, intensity: 1.5 / k.b });
      k.extras(C, 1.0);
    } }),

  SKILL('warrior/tempest-spin', 'Tempest spin', m(['steel', 'air'], 'spin', 0.3, 8, 2, 'ring'), 1.4, {
    view: 'high',
    act: { kind: 'slash', weapon: 'sword', target: [1.47, 0, 0], windup: 0.35, keys: [[-0.35, 'guard'], [-0.1, 'sideBack'], [0, 'sideCut', 'snap'], [0.7, 'sideCut'], [1.1, 'guard']], hits: [{ t: 0.15, stop: 0.05, shake: 0.2, amp: 0.03, push: 1.0 }, { t: 0.45, stop: 0.05, shake: 0.2, amp: 0.03, push: 1.0 }] },
    // P3=274
    build(fx, o) {
      const k = kit(fx, o, STEEL), kw = kit(fx, o, AIR);
      const rotY = (t) => -TAU * 2 * sm(-0.02, 0.6, t);
      fx.on((t) => { fx.body.rotation.y = rotY(t); });
      const A = bladeTable(fx, -0.02, 0.6, 0.5, rotY), B = bladeTable(fx, -0.02, 0.6, 1.3, rotY);
      sweepSurface(fx, A, B, { t0: -0.02, t1: 0.6, len: 0.3, n: 40, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 2.2, edge: 2.5 });
      k.trail({ path: B, len: 0.25, n: 40, width: 0.04, t0: -0.02, dur: 0.7 });
      k.ring({ t0: 0, dur: 0.6, r: [0.3, 2.8], normal: 'up', pos: fx.anchor('chest', -0.175) });
      kw.ring({ t0: 0.1, dur: 0.5, r: [1.2, 2.4], normal: 'up', pos: fx.anchor('chest', -0.175, [0, -0.1, 0]) });
      kw.ring({ t0: 0.4, dur: 0.5, r: [1.2, 2.4], normal: 'up', pos: fx.anchor('chest', -0.175, [0, -0.1, 0]) });
      const circ = Array.from({ length: 24 }, (_, j) => { const a = (j / 23) * TAU; return [1.6 * Math.cos(a), 0.4 + (1.2 * j) / 23, 1.6 * Math.sin(a)]; });
      for (let i = 0; i < 6; i++) kw.ribbon({ points: circ, n: 23, width: 0.04, sweep: [0, 1.5], t0: 0.05 * i, dur: 0.35, intensity: 0.8 });
      k.smoke({ count: 60, shape: 'ring', radius: 1.2, pos: fx.anchor('hips', -0.35, [0, 0.08, 0]), radial: 1, speed: [1, 3], ramp: DUST, delay: 0.05, emit: 0.5 });
      kw.em({ count: 60, kind: 'streak', shape: 'ring', radius: 1.5, pos: fx.anchor('hips', -0.35, [0, 0.08, 0]), swirl: 4, life: [0.3, 0.6], delay: 0, emit: 0.6 });
      ct(fx, k, fx.anchor('tgt', 0, [0, 0.1, 0.1]), 0.15, 14);
      ct(fx, k, fx.anchor('tgt', 0, [0, 0.1, 0.1]), 0.45, 14, { lightI: 0 });
      if (k.g >= 2) k.smoke({ count: 40, shape: 'ring', radius: 1.8, pos: fx.anchor('hips', -0.35, [0, 0.08, 0]), ramp: DUST, delay: 0.45, emit: 0.2 });
      if (k.g === 3) {
        kw.ring({ t0: 0.5, dur: 0.5, r: [0.5, 4], normal: 'up', pos: fx.anchor('hips', -0.35, [0, 0.08, 0]) });
        kw.em({ count: 40, kind: 'petal', shape: 'ring', radius: 1, swirl: 3, pos: fx.anchor('hips', -0.35, [0, 0.08, 0]), blend: 'normal', lit: 1, delay: 0.6, emit: 0.6 });
      }
      k.extras(fx.anchor('tgt', 0, [0, 0.1, 0.1]), 0.45);
    } }),

  SKILL('warrior/breaker-leap', 'Breaker leap', m(['earth', 'steel'], 'leap-slam', 0.5, 10, 5, 'circle'), 2.0, {
    view: 'wide',
    act: { kind: 'stomp', weapon: 'hammer', target: [2.6, 0, 0], windup: 0.65, hits: [{ t: 0, stop: 0.1, shake: 0.55, amp: 0.08, push: 2 }] },
    // P3=212
    build(fx, o) {
      const k = kit(fx, o, EARTH);
      const Lx = 1.0, P = [Lx + 0.1, 0, 0];
      fx.on((t) => { fx.body.position.x = Lx * sm(-0.3, 0, t); });
      swing(fx, { t0: -0.07, t1: 0.02, len: 0.2, inner: 0.7, outer: 1.0, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 1.1, edge: 3 });
      k.decal({ kind: 'cracks', r: [3, 3.6], pos: P, t0: 0, dur: 1.9, reveal: 0.3, heat: [1, 0.1], cells: 4, y: 0.005 });
      k.decal({ kind: 'scorch', r: [1, 1.4], pos: P, t0: 0, dur: 2.0 });
      k.em({ count: 24, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.3, pos: [P[0], 0.1, P[2]], dir: [0, 1, 0], spread: 0.9, speed: [3, 7.5], gravity: [0, -10, 0], bounce: 0.35, size: [0.16, 0.09], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], delay: 0, emit: 0.001, t0: 0 });
      k.smoke({ count: 50, shape: 'ring', radius: 0.4, pos: P, radial: 0.9, speed: [1.5, 4.5], ramp: DUST, delay: 0, emit: 0.001 });
      k.sparks(P, 0, 40);
      // spikes
      if (k.g >= 2) {
        k.ring({ t0: 0.1, dur: 0.4, r: [0.2, 2.4], normal: 'cam', pos: [1.1, 0.6, 0], width: [0.25, 0.04] });
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6, spike = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 7), rock());
          spike.position.set(P[0] + 1.4 * Math.cos(a), 0.3, 1.4 * Math.sin(a));
          k.pop(spike, 0.04, 0.16, 1.2, 1.7);
        }
      }
      if (k.g === 3) {
        k.ring({ t0: 0.35, dur: 0.6, r: [0.2, 3.5], normal: 'up', pos: P });
        k.em({ count: 20, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.3, pos: [P[0], 0.1, P[2]], dir: [0, 1, 0], spread: 0.9, speed: [3, 7.5], gravity: [0, -10, 0], size: [0.16, 0.09], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], delay: 0.35, emit: 0.001, t0: 0.35 });
      }
      k.extras(P, 0);
    } }),

  SKILL('warrior/iron-bulwark', 'Iron bulwark', m(['steel'], 'buff-aura', 0.5, 20, 0, 'self'), 2.6, {
    body: true, view: 'body',
    // P3=91
    build(fx, o) {
      const k = kit(fx, o, STEEL);
      fx.body.setPose(POSES.guard);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.3, 2.6, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather(fx.anchor('hips', 0, [0, 0.08, 0]), 0, 0.3, 1.2, 30);
      // 6 light plates orbiting the body, facing outward
      const plates = new THREE.Group(), pl = [], py = fx.anchor('hips', 0)[1] + 0.08, py2 = fx.anchor('head', 0)[1] - 0.02; // plate rings at hip / head height
      for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.5), addMat(k.col(1), 1.6, 0.7)); plates.add(p); pl.push(p); }
      k.pop(plates, 0.2, 0.45, 2.0, 2.5, (t) => pl.forEach((p, i) => { const a = (i * TAU) / 6 + 0.4 * t; p.position.set(0.7 * Math.cos(a), py, 0.7 * Math.sin(a)); p.rotation.y = Math.PI / 2 - a; }));
      k.shell({ r: [0.9, 0.9], cells: 6, hemi: false, t0: 0.3, dur: 1.8, intensity: 0.6, alpha: 0.5 });
      k.em({ count: 20, kind: 'glint', shape: 'ring', radius: 0.8, pos: fx.anchor('hips', 0, [0, 0.08, 0]), delay: 0.3, emit: 1.7, t0: 0.3, life: [0.2, 0.3] });
      if (k.g >= 2) {
        const inner = new THREE.Group(), ip = [];
        for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.35), addMat(k.col(1), 1.6, 0.7)); inner.add(p); ip.push(p); }
        k.pop(inner, 0.3, 0.55, 2.2, 2.6, (t) => ip.forEach((p, i) => { const a = (i * TAU) / 4 + 0.4 * t; p.position.set(0.55 * Math.cos(a), py2, 0.55 * Math.sin(a)); p.rotation.y = Math.PI / 2 - a; }));
      }
      if (k.g === 3) {
        k.decal({ kind: 'rune', r: [1.4, 1.4], t0: 0.3, dur: 1.9 });
        k.ring({ t0: 1.2, dur: 0.6, r: [0.2, 2], normal: 'up' });
      }
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 2.6, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / 2.6), intensity: 40 });
      k.extras(fx.anchor('chest', 0, [0.02, -0.12, 0]), 0.3);
    } }),

  SKILL('warrior/warcry-surge', 'Warcry surge', m(['steel', 'fire'], 'nova', 0.2, 15, 4, 'circle'), 1.8, {
    view: 'wide',
    act: { kind: 'stomp', weapon: 'sword', target: [2.6, 0, 0], windup: 0.5, keys: [[-0.5, 'guard'], [-0.25, 'crouch'], [0, 'roar', 'snap'], [0.7, 'roar'], [1.3, 'guard']], hits: [{ t: 0.05, stop: 0.05, shake: 0.3, amp: 0.04, push: 2 }] },
    // P3=252
    build(fx, o) {
      const k = kit(fx, o, BLOOD);
      k.gather(fx.anchor('hips', -0.5, [0, 0.08, 0]), -0.45, 0.4, 1.4, 60);
      k.ring({ t0: 0, dur: 0.7, r: [0.2, 4.5], normal: 'up', width: [0.4, 0.08], fill: 0.08 });
      k.ring({ t0: 0.02, dur: 0.45, r: [0.2, 2.6], normal: 'cam', pos: fx.anchor('hips', -0.5, [0, 0.08, 0]) });
      k.shell({ r: [0.3, 2.4], hemi: true, power: 2, t0: 0, dur: 0.45, fade: [0, 0.35] });
      k.em({ count: 120, kind: 'streak', shape: 'ring', radius: 0.5, pos: fx.anchor('hips', -0.25), radial: 1, speed: [4, 8], life: [0.4, 0.9], size: [0.5, 0.2], stretch: 2, delay: 0, emit: 0.001, t0: 0 });
      k.decal({ kind: 'glow', r: [1.5, 2.5], t0: 0, dur: 1.7, fade: [0.05, 1] });
      // speed lines radiating from chest height
      const cy = fx.anchor('chest', 0.05)[1];
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12, pts = Array.from({ length: 9 }, (_, j) => { const r = 0.4 + (2.6 * j) / 8; return [r * Math.cos(a), cy, r * Math.sin(a)]; });
        k.ribbon({ points: pts, n: 8, width: 0.03, sweep: [0, 1.5], t0: 0.02, dur: 0.25 });
      }
      if (k.g >= 2) k.ring({ t0: 0.15, dur: 0.6, r: [0.2, 6], normal: 'up', width: [0.15, 0.15] });
      if (k.g === 3) k.em({ count: 30, kind: 'ring', shape: 'sphere', radius: 0.3, pos: fx.anchor('chest', -0.5), radial: 1, speed: [2, 4], delay: 0.1, emit: 0.001, t0: 0.1 });
      k.extras(fx.anchor('chest', -0.5), 0.05);
    } }),

  SKILL('warrior/chain-hook', 'Chain hook', m(['steel'], 'pull', 0.3, 12, 6, 'line'), 2.0, {
    view: 'side',
    act: { kind: 'throw', weapon: 'sword', target: [4, 0, 0], windup: 0.4, keys: [[-0.4, 'guard'], [-0.15, 'throwBack'], [0, 'throwFwd', 'snap'], [0.35, 'throwFwd'], [0.55, 'pullback'], [1.2, 'guard']], hits: [{ t: 0.3, stop: 0.08, shake: 0.2, amp: 0.03, push: 0 }, { t: 0.7, stop: 0.1, shake: 0.3, amp: 0.04, push: -2 }] },
    // P3=104
    build(fx, o) {
      const k = kit(fx, o, STEEL);
      const A = fx.anchor('handR', 0), G = fx.anchor('tgt'), Gp = [G[0] - 2.8, G[1] + 0.1, 0]; // throw hand; target chest before / after the pull (fx.on moves it 2.4 m)
      // hook: out to the target over [0,.3], back toward the caster over [.4,.7]
      const HOOK = (t) => lerp3(lerp3(A, [G[0] - 0.2, G[1] + 0.1, 0], sm(0, 0.3, t)), Gp, sm(0.4, 0.7, t));
      const hook = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), metal());
      hook.rotation.z = -Math.PI / 2;
      fx.mesh(hook, (t) => hook.position.set(...HOOK(t)), { t0: -0.4, dur: 2.2 });
      const hand = new THREE.Object3D(), readHand = k.at();
      for (let i = 0; i < 16; i++) {
        const link = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.01, 6, 10), metal());
        link.rotation.x = i % 2 ? Math.PI / 2 : 0;
        fx.mesh(link, (t) => { readHand(hand); link.position.set(...lerp3([hand.position.x, hand.position.y, hand.position.z], HOOK(t), i / 16)); }, { t0: -0.4, dur: 2.2 });
      }
      fx.on((t) => { fx.target.position.x = 4 - 2.4 * sm(0.4, 0.75, t); });
      ct(fx, k, [G[0] - 0.2, G[1] + 0.1, 0], 0.3, 30);
      ct(fx, k, [Gp[0] + 0.3, Gp[1], 0], 0.72, 40);
      k.trail({ path: HOOK, len: 0.4, width: 0.04, t0: 0, dur: 1.2 });
      if (k.g >= 2) k.em({ count: 30, kind: 'spark', shape: 'line', shapeSize: [1.2, 0, 0], pos: [G[0] - 1.6, G[1] + 0.15, 0], delay: 0.45, emit: 0.001, t0: 0.43 });
      if (k.g === 3) k.ring({ t0: 0.72, dur: 0.4, r: [0.1, 1.2], normal: 'cam', pos: [Gp[0] + 0.3, Gp[1], 0.1] });
    } }),

  SKILL('warrior/rending-wave', 'Rending wave', m(['steel'], 'ground-wave', 0.4, 9, 6, 'line'), 1.8, {
    view: 'long',
    act: act('smash', 0.4, 4, { weapon: 'sword', windup: 0.55 }),
    // P3=253
    build(fx, o) {
      const k = kit(fx, o, STEEL), I = fx.anchor('tgt', 0, [-0.2, -0.3, 0]); // wave hits the target (ranged: act target stays at 4)
      // crescent wave that travels along x
      const wave = (y, d) => (t) => arcPts(0.8 + 3.2 * sm(d, d + 0.45, t), y, 0.7, -0.2, 2.6, 23);
      k.ribbon({ points: wave(0.6, 0), n: 23, width: 0.32, intensity: 2.2, head: () => 1.001, t0: 0, dur: 0.5 });
      k.em({ count: 40, kind: 'spark', shape: 'line', shapeSize: [1.6, 0, 0], pos: [2.4, 0.05, 0], dir: [0, 1, 0], speed: [1, 3], delay: 0, emit: 0.45, t0: 0 });
      k.em({ count: 40, kind: 'soft', shape: 'point', size: [0.5, 0.2], life: [0.15, 0.25], intensity: 0.8, delay: 0, emit: 0.45, t0: 0, follow: (m, a, t) => { m.position.set(0.8 + 3.2 * sm(0, 0.45, t), 0.6, 0); } });
      k.smoke({ count: 40, shape: 'line', shapeSize: [1.6, 0, 0], pos: [2.4, 0.05, 0], ramp: DUST, delay: 0, emit: 0.45 });
      k.impact(I, 0.4, 50);
      for (const x of [1, 1.8, 2.6, 3.4]) k.decal({ kind: 'scorch', r: [0.3, 0.6], pos: [x, 0, 0] });
      if (k.g >= 2) k.ribbon({ points: wave(0.3, 0.08), n: 23, width: 0.1, head: () => 1.001, t0: 0.08, dur: 0.5 });
      if (k.g === 3) {
        k.ring({ t0: 0.2, dur: 1.8, r: [0.2, 2], normal: 'cam', pos: I });
        k.em({ count: 40, kind: 'shard', shape: 'point', pos: I, delay: 0.4, emit: 0.001, t0: 0.4, speed: [2, 6], gravity: [0, -9, 0] });
      }
      k.extras(I, 0.4);
    } }),

  SKILL('warrior/blood-oath', 'Blood oath', m(['blood'], 'buff-aura', 0.6, 30, 0, 'self'), 2.8, {
    body: true, view: 'body',
    // P3=191
    build(fx, o) {
      const k = kit(fx, o, BLOOD);
      fx.body.setPose(POSES.castCharge);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.4, 2.8, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather(fx.anchor('hips', 0, [0, 0.06, 0]), 0, 0.3, 1.2, 30);
      k.ring({ t0: 0.3, dur: 1.9, r: [0.5, 0.5], normal: 'up', pos: fx.anchor('hips', 0, [0, -0.04, 0]), width: [0.05, 0.05], decay: 0 });
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.decal({ kind: 'glow', r: [1, 1] });
      k.em({ count: 60, kind: 'drop', shape: 'sphere', radius: 0.6, pos: fx.anchor('chest', 0, [-0.03, -0.14, 0]), gravity: [0, 1.2, 0], speed: [0.1, 0.3], life: [1, 1.6], delay: 0.3, emit: 1.9, t0: 0.3 });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 2.8, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / 2.8), intensity: 40 });
      k.extras(fx.anchor('chest', 0, [-0.03, -0.14, 0]), 0.3);
      if (k.g >= 2) k.em({ count: 40, kind: 'soft', shape: 'ring', radius: 0.5, swirl: 2, pos: fx.anchor('chest', 0, [-0.03, -0.14, 0]), delay: 0.3, emit: 1.9, t0: 0.3 });
      if (k.g === 3) {
        k.ring({ t0: 0.2, dur: 1.3, r: [0.2, 1.6], normal: 'cam', pos: fx.anchor('chest', 0, [-0.03, -0.14, 0]) });
        k.em({ count: 20, kind: 'ring', shape: 'ring', radius: 0.5, pos: fx.anchor('chest', 0, [-0.03, -0.14, 0]), delay: 0.3, emit: 1.9, t0: 0.3 });
      }
    } }),

  SKILL('warrior/shield-rush', 'Shield rush', m(['steel'], 'dash-stun', 0.2, 10, 5, 'line'), 1.5, {
    view: 'side',
    act: { kind: 'thrust', weapon: 'sword', target: [1.8, 0, 0], windup: 0.5, keys: [[-0.5, 'guard'], [-0.3, 'dashLow'], [0, 'lunge', 'snap'], [0.3, 'lunge'], [0.9, 'guard']], hits: [{ t: 0.02, stop: 0.12, shake: 0.3, amp: 0.04, push: 2.2 }] },
    // P3=148
    build(fx, o) {
      const k = kit(fx, o, STEEL);
      const x0 = -1.5, x1 = 1.2, t0 = -0.3;
      const X = (t) => (t < t0 ? x0 : t < 0 ? x0 + (x1 - x0) * sm(t0, 0, t) : x1);
      fx.on((t) => { fx.body.position.x = X(t); });
      const C = fx.anchor('chest', 0.02, [x1 + 0.3, 0, 0.1]); // shield bash point in front of the dashed body (+x1)
      for (const y of [0.5, 0.8, 1.1, 1.4]) {
        k.ribbon({ points: (t) => { const x = X(Math.min(0, Math.max(t0, t))); return [[x - 1.4, y, 0], [x - 0.6, y, 0], [x, y, 0]]; }, n: 2, width: 0.025, head: () => 1.001, fade: [0.03, 0.12], t0, dur: 0.6 });
      }
      k.smoke({ count: 60, shape: 'line', shapeSize: [1.35, 0, 0], pos: [-0.15, 0.05, 0], dir: [-1, 0.2, 0], size: 0.45, ramp: DUST, delay: t0, emit: 0.3, t0 });
      k.em({ count: 1, kind: 'soft', shape: 'point', size: [0.9, 0.9], life: [0.5, 0.5], intensity: 1.2, delay: -0.3, t0: -0.3, emit: 0.001, follow: (m, a, t) => m.position.set(fx.body.position.x + 0.45, C[1], 0.15) });
      // shield on the left arm, with a glow shell that follows it
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.05, 24), metal());
      shield.rotation.z = Math.PI / 2;
      const readL = k.at('armL');
      fx.mesh(shield, () => readL(shield), { t0: -3, dur: 99 });
      const glow = k.shell({ r: [0.45, 0.45], power: 3, intensity: 0.8, t0: -0.3, dur: 0.9 });
      fx.on(() => readL(glow.obj));
      ct(fx, k, C, 0.02, 40);
      k.em({ count: 5, kind: 'glint', shape: 'ring', radius: 0.3, pos: fx.anchor('tgtHead', 0, [0, 0.43, 0]), swirl: 4, delay: 0.05, emit: 1, t0: 0.05 });
      k.ring({ t0: 0.02, dur: 0.5, r: [0.2, 2], normal: [1, 0, 0], pos: C });
      k.ring({ r: [0.2, 2.2], normal: 'cam', pos: C, t0: 0.02, dur: 0.4, intensity: 1.4 });
      if (k.g >= 2) k.em({ count: 40, kind: 'spark', shape: 'ring', radius: 0.5, pos: fx.anchor('tgtHead', 0, [0, 0.28, 0]), delay: 0.03, emit: 0.001, t0: 0.03 });
    } }),

  SKILL('warrior/last-stand', 'Last stand', m(['fire', 'steel'], 'buff-aura', 0.5, 60, 0, 'self'), 3.0, {
    body: true, view: 'body',
    // P3=281
    build(fx, o) {
      const k = kit(fx, o, FIRE);
      fx.body.setPose(POSES.roar);
      fx.on((t) => { const u = sm(0.3, 0.6, t) * (1 - sm(2.4, 3.0, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.5 * u }); });
      k.gather(fx.anchor('hips', 0, [0, 0.1, 0]), 0, 0.3, 1.2, 30);
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.em({ count: 90, kind: 'flame', shape: 'disc', radius: 0.45, pos: [0, 0.05, 0], aspect: 1.8, speed: [0.5, 1.2], life: [0.6, 1], intensity: 0.5, delay: 0.3, emit: 2.1, t0: 0.3 });
      k.em({ count: 80, kind: 'soft', shape: 'disc', radius: 0.6, pos: [0, 0.05, 0], gravity: [0, 1, 0], intensity: 2, delay: 0.3, emit: 2.1, t0: 0.3 });
      k.decal({ kind: 'scorch', r: [1, 1], heat: [1, 0.2] });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 3, intensity: 80 });
      k.extras(fx.anchor('chest', 0, [-0.07, -0.09, 0]), 0.3);
      if (k.g >= 2) k.em({ count: 40, kind: 'flame', shape: 'ring', radius: 0.8, pos: [0, 0.05, 0], delay: 0.3, emit: 2.1, t0: 0.3 });
      if (k.g === 3) {
        k.beam({ pos: [0, 0, 0], height: 3, r: [0.6, 0.3], intensity: 0.25, t0: 0.3, dur: 1.9 });
        k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 2.2], normal: 'cam', pos: [0, 1.5, 0.5] });
      }
    } }),
];
