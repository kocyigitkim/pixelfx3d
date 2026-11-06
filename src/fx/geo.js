// Earth (geo) category, tier base: 8 skills from PLAN2 B13. Built from the T-NOV, T-BUF, T-LEP and T-MEL templates used in warrior.js.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, TAU, POSES, rock, addMat, DUST, EARTH } from './_skill.js';
import { contact } from './melee.js';

const m = meta('geo', 'base');
const ROCK = [[0, '#7a6a58'], [1, '#6c5a48', 1]];
const cl = (x) => Math.min(1, Math.max(0, x));
const lerp3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
const HIT = (t) => ({ t, stop: 0.06, shake: 0.3, amp: 0.04, push: 1.6 });
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });
/** rock chips thrown from a point at time t (n particles) */
const rockBurst = (k, pos, n, t, p = {}) => k.em({ count: n, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.3, pos, dir: [0, 1, 0], spread: 0.9, speed: [3, 7.5], gravity: [0, -10, 0], bounce: 0.35, size: [0.16, 0.09], ramp: ROCK, delay: t, t0: t - 0.02, emit: 0.001, ...p });
/** dust puff at time t (n particles) */
const dustBurst = (k, pos, n, t, p = {}) => k.smoke({ count: n, shape: 'ring', radius: 0.4, pos, radial: 0.9, speed: [1.5, 4.5], ramp: DUST, delay: t, t0: t - 0.02, emit: 0.001, ...p });
/** small irregular boulder: icosahedron with position-keyed jitter (same vertex, same offset) */
const jitGeo = (r, seed) => { const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), j = 1 + 0.12 * Math.sin(x * 12.9898 + y * 78.233 + seed); p.setXYZ(i, x * j, y * j, z * j); } g.computeVertexNormals(); return g; };

export default [
  SKILL('geo/stone-fist', 'Stone fist', m(['earth'], 'summon-punch', 0.6, 10, 4, 'point'), 2.4, {
    view: 'wide',
    act: act('cast', 0.5, 3.4, { keys: [[-0.5, 'castCharge'], [0.35, 'castRelease', 'snap']] }),
    // P3=294
    build(fx, o) {
      const k = kit(fx, o, EARTH), rm = rock();
      const fist = new THREE.Group(), body = new THREE.Group(), core = new THREE.Mesh(new THREE.DodecahedronGeometry(0.45), rm);
      body.scale.setScalar(1.7); body.add(core); fist.add(body); // inner group: pop() owns fist.scale
      for (let i = 0; i < 4; i++) { const kn = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.16), rm); kn.position.set(0.36, 0.2 - 0.13 * i, 0); body.add(kn); }
      fist.position.set(1.6, 0.3, 0);
      k.pop(fist, 0, 0.3, 1.6, 2.1, (t) => { fist.position.x = 1.6 + 1.4 * sm(0.35, 0.5, t); });
      dustBurst(k, [1.6, 0.05, 0], 40, 0);
      rockBurst(k, [1.6, 0.2, 0], 20, 0);
      ct(fx, k, fx.anchor('tgt', 0, [-0.2, 0.1, 0]), 0.5, 50, { lightI: 0 });
      dustBurst(k, [3.4, 0.1, 0], 40, 0.5);
      rockBurst(k, [3.4, 0.2, 0], 20, 0.5);
      rockBurst(k, [3.4, 0.2, 0], 40, 0.5);
      k.decal({ kind: 'cracks', r: [1.2, 1.6], pos: [3.4, 0, 0], t0: 0.5, dur: 1.5, reveal: 0.3, cells: 4 });
      rockBurst(k, [3.0, 0.3, 0], 20, 1.6); // crumble
      k.light({ pos: [2.6, 1.2, 0.8], t0: 0, dur: 2.4, fade: [0.05, 0.6], intensity: 60 });
      if (k.g >= 2) k.em({ count: 20, kind: 'rock', blend: 'normal', lit: 1, shape: 'ring', radius: 0.5, pos: [3.0, 0.4, 0], swirl: 3, speed: [0.2, 0.6], life: [0.6, 1], size: [0.1, 0.06], ramp: ROCK, delay: 0.5, t0: 0.5, emit: 1.0 });
      if (k.g === 3) {
        k.ring({ t0: 0.5, dur: 0.45, r: [0.2, 2.4], normal: 'cam', pos: fx.anchor('tgt', 0, [0, -0.1, 0]) });
        k.ring({ t0: 0.5, dur: 0.6, r: [0.2, 3], normal: 'up', pos: [3.4, 0, 0] });
      }
      k.extras(fx.anchor('tgt', 0, [0, 0.1, 0]), 0.5);
    } }),

  SKILL('geo/rubble-orbit', 'Rubble orbit', m(['earth'], 'orbit-release', 0.6, 12, 7, 'ring'), 2.6, {
    view: 'wide',
    act: act('cast', 1.7, 4),
    // P3=282
    build(fx, o) {
      const k = kit(fx, o, EARTH), rm = rock(), TF = 1.4, TGT = fx.anchor('tgt', 0, [0, -0.1, 0]);
      // rise from the ground at the caster, orbit at radius 1 (angular speed 4), then fly to the target
      const orbit = (a0, t) => {
        const tt = Math.min(t, TF), u = sm(0, 0.6, tt), a = a0 + 4 * tt;
        return lerp3([u * Math.cos(a), 0.3 + 0.9 * u, u * Math.sin(a)], TGT, sm(TF, TF + 0.3, t));
      };
      for (let i = 0; i < 8; i++) {
        const a0 = (i * TAU) / 8, P = (t) => orbit(a0, t), rk = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + (0.06 * (i % 4)) / 3), rm);
        fx.mesh(rk, (t) => { rk.position.set(...P(t)); rk.rotation.x = 3 * t; }, { t0: 0, dur: 2.0 });
        k.trail({ path: P, t0: 0, dur: TF + 0.3, len: 0.3, width: 0.05, blend: 'normal' });
        k.smoke({ count: 10, shape: 'sphere', radius: 0.15, size: 0.3, ramp: DUST, delay: 0, emit: TF + 0.3, t0: 0, follow: (mm, a, t) => mm.position.set(...P(t)) });
        dustBurst(k, TGT, 15, TF + 0.3);
      }
      k.light({ pos: [2, 1.4, 0.8], t0: 0, dur: 2.6, fade: [0.1, 0.6], intensity: 50 });
      if (k.g >= 2) k.em({ count: 40, kind: 'rock', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.5, pos: [0, 0.92, 0], swirl: 2, speed: [0.1, 0.3], life: [0.8, 1.2], size: [0.06, 0.03], ramp: ROCK, delay: 0.3, t0: 0.3, emit: 1.3 }); // anchor-ok
      if (k.g === 3) {
        k.ring({ t0: TF + 0.3, dur: 0.6, r: [0.2, 2.6], normal: 'up', pos: TGT });
        k.decal({ kind: 'cracks', r: [1.2, 1.6], pos: [0, 0, 0], t0: 0.3, dur: 2.2, reveal: 0.4, cells: 4 });
      }
      k.extras(TGT, TF + 0.3);
    } }),

  SKILL('geo/fault-line', 'Fault line', m(['earth'], 'line-crack', 0.5, 10, 6, 'line'), 2.4, {
    view: 'wide',
    act: act('stomp', 0.3, 3.6),
    // P3=204
    build(fx, o) {
      const k = kit(fx, o, EARTH), rm = rock();
      // flat strip from x 0.5 to 3.5 that grows along x over [0, 0.3]
      const strip = (w, mat, y, t0 = 0, dur = 2.4) => { const g = new THREE.PlaneGeometry(3, w); g.translate(1.5, 0, 0); g.rotateX(-Math.PI / 2); const mesh = new THREE.Mesh(g, mat); mesh.position.set(0.5, y, 0); fx.mesh(mesh, (t) => { mesh.scale.x = Math.max(1e-3, sm(t0, t0 + 0.3, t)); }, { t0, dur }); return mesh; };
      strip(0.12, addMat(k.col(1), 1.2), 0.01);
      strip(0.2, rm, 0.005);
      for (let i = 0; i < 10; i++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.6, 5), rm); sp.position.set(0.8 + 0.27 * i, 0.3, 0); k.pop(sp, 0.03 + 0.03 * i, 0.2 + 0.03 * i, 2.0, 2.4); }
      dustBurst(k, [2, 0.05, 0], 60, 0.3, { shape: 'line', shapeSize: [1.5, 0, 0] });
      rockBurst(k, [2, 0.2, 0], 30, 0.3, { shape: 'line', shapeSize: [1.5, 0, 0] });
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 2.2], normal: 'up', pos: [3.6, 0, 0] });
      k.sparks([3.6, 0.4, 0], 0.3, 30);
      ct(fx, k, [3.6, 0.6, 0], 0.3, 40, { lightI: 0 });
      k.light({ pos: [2, 1.2, 0.8], t0: 0, dur: 2.4, fade: [0.05, 0.6], intensity: 60 });
      if (k.g >= 2) for (const [x, a] of [[1.0, 0.7], [1.6, -0.6], [2.2, 0.6], [2.8, -0.7]]) { const g = new THREE.PlaneGeometry(0.8, 0.05); g.translate(0.4, 0, 0); g.rotateX(-Math.PI / 2); const br = new THREE.Mesh(g, addMat(k.col(1), 1.0)); br.position.set(x, 0.01, 0); br.rotation.y = a; fx.mesh(br, (t) => { br.scale.x = Math.max(1e-3, sm(0.3, 0.6, t)); }, { t0: 0, dur: 2.4 }); }
      if (k.g === 3) { const big = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.6, 7), rm); big.position.set(3.6, 0.8, 0); k.pop(big, 0.3, 0.55, 2.0, 2.4); }
      k.extras([3.6, 0.6, 0], 0.3);
    } }),

  SKILL('geo/bedrock-armor', 'Bedrock armor', m(['earth'], 'buff-armor', 0.6, 30, 0, 'self'), 2.8, {
    body: true, view: 'body',
    // P3=151
    build(fx, o) {
      const k = kit(fx, o, EARTH), rm = rock(), D = 2.8;
      fx.body.setPose(POSES.guard);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(D - 0.6, D, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u, stone: 0.8 * sm(0.2, 1, t) * (1 - sm(2.3, 2.8, t)) }); });
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30); // anchor-ok
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: D, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / D), intensity: 40 });
      // 8 plates fly from the ground onto the torso, then fall off after 2.3 s
      const plateG = new THREE.BoxGeometry(0.16, 0.22, 0.06), CY = fx.anchor('chest')[1]; // plates land on the torso
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8, S0 = [1.2 * Math.cos(a), 0.1, 1.2 * Math.sin(a)], E = [0.22 * Math.cos(a), CY - 0.3 + 0.2 * (i % 4), 0.22 * Math.sin(a)], pl = new THREE.Mesh(plateG, rm);
        pl.rotation.y = -a;
        fx.mesh(pl, (t) => { const p = lerp3(S0, E, sm(0.1, 0.6, t)), f = Math.max(0, t - 2.3); pl.position.set(p[0], Math.max(0.05, p[1] - 4 * f * f), p[2]); }, { t0: 0, dur: D });
      }
      k.smoke({ count: 40, shape: 'ring', radius: 0.5, pos: [0, 0.1, 0], radial: 0.6, speed: [0.5, 1.5], ramp: DUST, delay: 0.1, emit: 0.5, t0: 0.1 });
      k.em({ count: 20, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.4, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1.5], life: [0.8, 1.4], size: [0.1, 0.06], ramp: ROCK, delay: 0.1, t0: 0.1, emit: 0.8 });
      if (k.g >= 2) k.em({ count: 20, kind: 'glint', shape: 'sphere', radius: 0.7, pos: fx.anchor('chest', 0, [0.02, -0.12, 0]), delay: 0.3, t0: 0.3, emit: 1.9, size: [0.1, 0.03], life: [0.2, 0.3] });
      if (k.g === 3) {
        k.decal({ kind: 'cracks', r: [1.4, 1.4], pos: [0, 0, 0], t0: 0.1, dur: 2.7, reveal: 0.4, cells: 4 });
        k.ring({ t0: 0.2, dur: 0.5, r: [0.2, 1.6], normal: 'cam', pos: fx.anchor('chest', 0, [0.02, -0.12, 0]) });
      }
      k.extras(fx.anchor('chest', 0, [0.02, -0.12, 0]), 0.3);
    } }),

  SKILL('geo/quake-ring', 'Quake ring', m(['earth'], 'pulse', 0.4, 14, 0, 'ring'), 2.8, {
    view: 'wide',
    act: act('stomp', 0, 2.6, { hits: [HIT(0), HIT(0.6), HIT(1.2)] }),
    // P3=250
    build(fx, o) {
      const k = kit(fx, o, EARTH), rm = rock();
      const pulse = (t) => { k.ring({ t0: t, dur: 0.6, r: [0.2, 4.5], normal: 'up' }); dustBurst(k, [0, 0.05, 0], 40, t); rockBurst(k, [0, 0.1, 0], 12, t); }; // K1: act hits own the shake
      pulse(0); pulse(0.6); pulse(1.2);
      k.decal({ kind: 'cracks', r: [1, 4], pos: [0, 0, 0], t0: 0, dur: 2.8, reveal: 1.2, cells: 5 });
      // 12 slabs pop up in sequence, outward from the center
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12, r = 1.0 + 0.3 * (i % 4), slab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.3), rm);
        slab.position.set(r * Math.cos(a), 0.05, r * Math.sin(a)); slab.rotation.y = -a;
        k.pop(slab, 0.05 * i, 0.05 * i + 0.2, 2.2, 2.6);
      }
      k.light({ pos: [0, 1, 0.8], t0: 0, dur: 2.4, env: (t) => Math.exp(-2 * t), intensity: 40 });
      if (k.g >= 2) { pulse(1.8); fx.shake(1.8, 0.4, 0.03); }
      if (k.g === 3) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.2, 6), rm); sp.position.y = 0.6; k.pop(sp, 0.2, 0.5, 2.0, 2.5); fx.flash(0.6, 0.12, k.col(0), 0.15); }
      k.extras([0, 0.52, 0], 1.2); // anchor-ok
    } }),

  SKILL('geo/boulder-roll', 'Boulder roll', m(['earth'], 'rolling-projectile', 0.6, 12, 6, 'line'), 2.8, {
    view: 'long',
    act: act('thrust', 1.2, 4.5),
    // P3=304
    build(fx, o) {
      const k = kit(fx, o, EARTH), rm = rock();
      const bx = (t) => 0.9 + 4.1 * cl(t / 1.4); // rolls from x 0.9 to 5 over [0, 1.4]
      const boulder = new THREE.Mesh(jitGeo(0.6, 1), rm);
      k.pop(boulder, -0.2, 0, 1.6, 1.7, (t) => { const x = bx(t); boulder.position.set(x, 0.6, 0); boulder.rotation.z = -x / 0.6; });
      k.smoke({ count: 80, shape: 'disc', radius: 0.3, size: 0.4, ramp: DUST, speed: [0.2, 0.6], delay: 0, emit: 1.4, t0: 0, follow: (mm, a, t) => mm.position.set(bx(t), 0.1, 0) });
      k.em({ count: 30, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.25, dir: [0, 1, 0], spread: 1, speed: [1, 3], gravity: [0, -10, 0], bounce: 0.35, size: [0.12, 0.07], ramp: ROCK, delay: 0, emit: 1.4, t0: 0, follow: (mm, a, t) => mm.position.set(bx(t), 0.2, 0) });
      ct(fx, k, [4.5, 0.8, 0], 1.2, 40, { lightI: 0 });
      dustBurst(k, [4.5, 0.2, 0], 30, 1.2);
      k.light({ pos: [2.5, 1.2, 0.8], t0: 0, dur: 1.6, fade: [0.1, 0.4], intensity: 50 });
      if (k.g >= 2) { const small = new THREE.Mesh(jitGeo(0.35, 2), rm); fx.mesh(small, (t) => { const x = bx(t - 0.3); small.position.set(x, 0.35, 0); small.rotation.z = -x / 0.35; }, { t0: 0, dur: 1.6 }); }
      if (k.g === 3) { rockBurst(k, [5, 0.6, 0], 40, 1.6); dustBurst(k, [5, 0.4, 0], 40, 1.6); }
      k.extras([4.5, 0.8, 0], 1.2, 'B');
    } }),

  SKILL('geo/crystal-spire', 'Crystal spire', m(['earth'], 'summon-pulse', 0.8, 20, 7, 'point'), 3.0, {
    view: 'wide',
    act: act('castup', 0.9, 3, { hits: [HIT(1.6), HIT(2.3)] }),
    // P3=136
    build(fx, o) {
      const k = kit(fx, o, EARTH), P = [1.6, 0, 0];
      const cm = new THREE.MeshStandardMaterial({ color: '#e8d8a8', roughness: 0.1, emissive: k.col(1), emissiveIntensity: 0.4 });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(1).scale(0.35, 1.6, 0.35), cm);
      crystal.position.set(P[0], 1.6, P[2]);
      k.pop(crystal, 0, 0.6, 9, 10);
      for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4 + 0.4, c = new THREE.Mesh(new THREE.OctahedronGeometry(0.15).scale(0.6, 1.4, 0.6), cm); c.position.set(P[0] + 0.45 * Math.cos(a), 0.6, 0.45 * Math.sin(a)); k.pop(c, 0.2 + 0.1 * i, 0.5 + 0.1 * i, 9, 10); }
      for (const p of [0.9, 1.6, 2.3]) {
        k.ring({ t0: p, dur: 0.6, r: [0.2, 2.4], normal: 'up', pos: P });
        k.glint([P[0], 1.5, 0], p, 1.2);
        if (p !== 2.3) k.light({ pos: [P[0], 1.5, 0.6], t0: p - 0.05, dur: 0.5, fade: [0.01, 0.4], intensity: 50 }); // K2: extras owns the 2.3 light
        k.beam({ from: [P[0], 1.5, 0], to: fx.anchor('tgt', 0, [0, -0.1, 0]), r: [0.15, 0.04], t0: p, dur: 0.25, fade: [0.03, 0.15] });
      }
      k.decal({ kind: 'cracks', r: [1, 1], pos: P, t0: 0, dur: 3.0, reveal: 0.4, cells: 4 });
      dustBurst(k, [P[0], 0.05, 0], 30, 0.1);
      k.em({ count: 40, kind: 'shard', blend: 'normal', lit: 1, shape: 'point', pos: [P[0], 0.3, 0], delay: 0.9, t0: 0.88, emit: 0.001, speed: [2, 6], gravity: [0, -9, 0], bounce: 0.3, size: [0.1, 0.06], ramp: ROCK });
      if (k.g >= 2) k.em({ count: 20, kind: 'soft', shape: 'ring', radius: 0.9, pos: [P[0], 0.8, 0], swirl: 3, speed: [0, 0.2], life: [0.6, 1], size: [0.08, 0.04], delay: 0.9, t0: 0.9, emit: 1.5 });
      if (k.g === 3) { k.glint([P[0], 1.6, 0], 1.6, 2.2); k.ring({ t0: 2.3, dur: 0.7, r: [0.3, 3], normal: 'up', pos: P }); }
      fx.flash(1.6, 0.1, k.col(0), 0.08);
      k.light({ pos: [P[0], 1.2, 0.8], t0: 0, dur: 3, fade: [0.2, 0.6], intensity: 30 });
      k.extras([P[0], 1.4, 0], 2.3);
    } }),

  SKILL('geo/stone-wall', 'Stone wall', m(['earth'], 'wall', 0.5, 18, 0, 'line'), 3.2, {
    view: 'high',
    act: act('stomp', null, false),
    // P3=223
    build(fx, o) {
      const k = kit(fx, o, EARTH), rm = rock(), X = 1.6, D = 3.2;
      const wall = new THREE.Group(), blockG = new THREE.BoxGeometry(0.25, 0.22, 0.3);
      // 5 tilted slabs along z in one group: all rise together (group scale.y) and sink at the end
      for (let i = 0; i < 5; i++) {
        const h = 1.6 + 0.35 * Math.sin(i * 2.1), slab = new THREE.Mesh(new THREE.BoxGeometry(0.42, h, 0.5), rm);
        slab.position.set(0, h / 2, (i - 2) * 0.46);
        slab.rotation.set(0, i % 2 ? 0.08 : -0.08, 0.04 * Math.sin(i * 1.7));
        wall.add(slab);
        if (k.g >= 2) { const blk = new THREE.Mesh(blockG, rm); blk.position.set(0, h / 2 + 0.11, 0); slab.add(blk); }
      }
      wall.position.set(X, 0, 0);
      fx.mesh(wall, (t) => { const u = sm(0, 0.5, t); wall.visible = u > 0.01; wall.scale.y = Math.max(1e-3, u); wall.position.y = -1.8 * sm(2.8, D, t); }, { t0: -5, dur: 99 });
      rockBurst(k, [X, 0.3, 0], 12, 0.04);
      k.smoke({ count: 80, shape: 'line', shapeSize: [1.5, 0, 0], rot3: [0, Math.PI / 2, 0], pos: [X, 0.1, 0], size: 0.5, ramp: DUST, delay: 0.04, emit: 0.6, t0: 0.04 });
      rockBurst(k, [X, 0.3, 0], 30, 0.1, { shape: 'line', shapeSize: [1.5, 0, 0], rot3: [0, Math.PI / 2, 0] });
      k.decal({ kind: 'cracks', r: [1.8, 1.8], pos: [X, 0, 0], t0: 0.1, dur: 3.0, reveal: 0.5, cells: 5 });
      k.ring({ t0: 0.1, dur: 0.6, r: [0.2, 3], normal: 'up', pos: [X, 0, 0] });
      fx.shake(0, 0.4, 0.04);
      k.light({ pos: [X, 1.2, 1.2], t0: 0, dur: D, fade: [0.1, 0.8], intensity: 40 });
      if (k.g === 3) { k.sparks([X, 1.8, 0], 2.8, 30); dustBurst(k, [X, 0.2, 0], 30, 2.8); }
      k.extras([X, 1.0, 0], 2.8);
    } }),
];
