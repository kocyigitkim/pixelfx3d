// Priest class: 8 holy heal, buff, nova, beam and projectile skills (PLAN2 B8). Built from the T-HEL/T-BUF, T-NOV and T-PRJ templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, addMat, DUST, HOLY } from './_skill.js';

const m = meta('priest', 'class');
const RAMP = HOLY;
const O = [0, 0, 0];

/** T-HEL / T-BUF base: body glow, gather, ring, light, flash, extras */
const bodyBase = (fx, k, D, pose) => {
  fx.body.setPose(pose);
  fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(D - 0.6, D, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
  k.gather([0, 1, 0], 0, 0.3, 1.2, 30);
  k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
  k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: D, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / D), intensity: 40 });
  fx.flash(0.3, 0.1, k.col(0), 0.12);
  k.extras([0, 1.1, 0], 0.3);
};
/** ally figure: grey capsule body and head, feet on y = 0 */
const figure = () => {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: '#9aa0a8' });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.9, 4, 8), mat); body.position.y = 0.65;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), mat); head.position.y = 1.5;
  g.add(body, head); return g;
};
/** chain arc from p to q (12 points, sin bulge) */
const arc = (p, q) => Array.from({ length: 12 }, (_, j) => { const u = j / 11, s = Math.sin(Math.PI * u) * 0.3; return [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u + s, p[2] + (q[2] - p[2]) * u]; });

export default [
  SKILL('priest/radiant-mend', 'Radiant mend', m(['holy'], 'heal', 1.0, 4, 0, 'self'), 2.4, {
    body: true, view: 'body',
    // P3=231
    build(fx, o) {
      const k = kit(fx, o, RAMP);
      bodyBase(fx, k, 2.4, POSES.castCharge);
      k.em({ count: 100, kind: 'soft', shape: 'disc', radius: 0.5, pos: [0, 0.05, 0], dir: [0, 1, 0], speed: [0.6, 1.2], swirl: 1.2, delay: 0.3, emit: 1.8, t0: 0.3 });
      k.em({ count: 30, kind: 'glint', shape: 'disc', radius: 0.5, pos: [0, 0.05, 0], dir: [0, 1, 0], speed: [0.5, 1.0], delay: 0.3, emit: 1.8, t0: 0.3 });
      k.beam({ pos: [0, 0, 0], height: 2.4, r: [0.6, 0.3], intensity: 0.25, grow: [0.2, 1.8], t0: 0, dur: 2.4 });
      for (const t of [0.8, 1.3]) k.ring({ t0: t, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      // 4 plus signs (2 boxes each) rising from y 1 to 2.2 and fading
      for (let i = 0; i < 4; i++) {
        const ang = (i * TAU) / 4, mat = addMat(k.col(1), 2, 0.9), plus = new THREE.Group();
        const h = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.06), mat), v = new THREE.Mesh(h.geometry, mat);
        v.rotation.z = Math.PI / 2; plus.add(h, v);
        fx.mesh(plus, (t) => { const p = sm(0.3, 2.4, t); plus.visible = t > 0.3; plus.position.set(0.35 * Math.cos(ang), 1 + 1.2 * p, 0.35 * Math.sin(ang)); mat.opacity = 0.9 * (1 - p); }, { t0: 0, dur: 2.4 });
      }
      if (k.g >= 2) k.em({ count: 30, kind: 'petal', shape: 'disc', radius: 0.8, pos: [0, 2.2, 0], dir: [0, -1, 0], speed: [0.2, 0.5], life: [1.2, 2], delay: 0.3, emit: 1.8, t0: 0.3 });
      if (k.g === 3) {
        k.ring({ t0: 0, dur: 2.4, r: [0.25, 0.25], normal: 'cam', pos: [0, 2.1, 0], decay: 0 });
        fx.flash(1.2, 0.15, k.col(0), 0.3);
      }
    } }),

  SKILL('priest/sanctuary-circle', 'Sanctuary circle', m(['holy'], 'heal-zone', 1.2, 20, 0, 'circle'), 3.0, {
    body: true, view: 'wide',
    // P3=201
    build(fx, o) {
      const k = kit(fx, o, RAMP), Z = [1.6, 0, 0];
      fx.body.setPose(POSES.castUp);
      k.decal({ kind: 'rune', r: [2.2, 2.2], glyphs: 16, poly: 8, reveal: 0.5, pos: Z, t0: 0, dur: 3.0 });
      k.decal({ kind: 'glow', r: [2.2, 2.2], pos: Z, t0: 0, dur: 3.0 });
      k.beam({ pos: Z, height: 2, r: [2, 2], intensity: 0.08, edge: 2.4, t0: 0, dur: 3.0 });
      k.em({ count: 120, kind: 'soft', shape: 'disc', radius: 2, pos: [Z[0], 0.05, 0], dir: [0, 1, 0], speed: [0.2, 0.5], delay: 0.2, emit: 2.4, t0: 0.2 });
      for (const t of [1.0, 1.8, 2.6]) k.ring({ t0: t, dur: 0.6, r: [0.2, 2.2], normal: 'up', pos: Z });
      k.light({ pos: [Z[0], 1.2, 0], t0: 0, dur: 3.0, intensity: 60 });
      if (k.g >= 2) for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; k.beam({ pos: [Z[0] + 2 * Math.cos(a), 0, 2 * Math.sin(a)], height: 1.5, r: [0.1, 0.1], intensity: 0.3, t0: 0, dur: 3.0 }); }
      if (k.g === 3) {
        k.em({ count: 40, kind: 'petal', shape: 'disc', radius: 2, pos: [Z[0], 0.05, 0], dir: [0, 1, 0], speed: [0.3, 0.8], life: [1.5, 2.5], delay: 0.2, emit: 2.4, t0: 0.2 });
        k.shell({ r: [2.2, 2.2], hemi: true, alpha: 0.3, pos: Z, t0: 0, dur: 3.0 });
      }
      k.extras([Z[0], 1, 0], 0);
    } }),

  SKILL('priest/purifying-wave', 'Purifying wave', m(['holy'], 'nova-cleanse', 0.4, 12, 5, 'circle'), 2.0, {
    view: 'wide',
    act: act('castup', 0.05, 2.4, { hits: [{ t: 0.05, stop: 0.05, shake: 0.3, amp: 0.04, push: 1.2 }] }),
    // P3=301
    build(fx, o) {
      const k = kit(fx, o, RAMP);
      // T-NOV base
      k.gather([0, 1, 0], -0.45, 0.4, 1.4, 60);
      k.ring({ t0: 0, dur: 0.7, r: [0.2, 4.5], normal: 'up', width: [0.4, 0.08], fill: 0.08 });
      k.ring({ t0: 0.02, dur: 0.45, r: [0.2, 2.6], normal: 'cam', pos: [0, 1, 0] });
      k.shell({ r: [0.3, 2.4], hemi: true, power: 2, t0: 0, dur: 0.45, fade: [0, 0.35] });
      k.em({ count: 120, kind: 'soft', shape: 'ring', radius: 0.5, pos: [0, 0.6, 0], radial: 1, speed: [4, 8], life: [0.4, 0.9], delay: 0, emit: 0.001, t0: 0 });
      k.decal({ kind: 'glow', r: [1.5, 2.5], t0: 0, dur: 1.9, fade: [0.05, 1] });
      k.light({ pos: [0, 1.4, 0.8], t0: -0.4, dur: 1.4, env: (t) => (t < 0 ? 0.3 : Math.exp(-2.5 * t)), intensity: 120 });
      fx.flash(0, 0.12, k.col(0), 0.2);
      // row layers: radial petals and dark violet smoke at the target
      k.em({ count: 50, kind: 'petal', shape: 'ring', radius: 0.5, pos: [0, 0.8, 0], radial: 1, speed: [2, 5], life: [0.6, 1.2], delay: 0, emit: 0.3, t0: 0 });
      k.smoke({ count: 30, shape: 'disc', radius: 0.3, pos: [2.4, 0.3, 0], radial: 1, speed: [0.5, 1.5], ramp: [[0, '#3a1a4a', 0], [0.15, '#2a1038', 0.55], [1, '#0a040e', 0]], delay: 0.05, emit: 0.5, t0: 0.05 });
      if (k.g >= 2) k.ring({ t0: 0.2, dur: 0.7, r: [0.2, 6], normal: 'up', ramp: [[0, '#ffffff', 1], [1, '#ffffff', 0]] });
      if (k.g === 3) for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8, c = Math.cos(a), s = Math.sin(a); k.beam({ from: [c * 0.5, 0.1, s * 0.5], to: [c * 3, 4, s * 3], r: [0.1, 0.4], intensity: 0.08, t0: 0, dur: 2.0 }); }
      k.extras([0, 1, 0], 0.05);
    } }),

  SKILL('priest/guardian-wings', 'Guardian wings', m(['holy'], 'buff', 0.5, 30, 0, 'self'), 2.8, {
    body: true, view: 'body',
    // P3=243
    build(fx, o) {
      const k = kit(fx, o, RAMP);
      bodyBase(fx, k, 2.8, POSES.armsWide);
      // 2 wings x 7 gold feathers, fanning open over [0.2, 0.7] and folding over [2.3, 2.8]
      const wings = new THREE.Group(), feathers = [], geo = new THREE.SphereGeometry(1, 8, 6), mat = addMat('#ffc040', 2, 0.8);
      geo.scale(0.05, 0.38, 0.012); geo.translate(0, 0.38, 0);
      for (const side of [-1, 1]) for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(geo, mat); f.position.set(-0.15, 1.45, side * 0.12); wings.add(f); feathers.push({ f, side, i }); }
      fx.mesh(wings, () => {}, { t0: 0, dur: 2.8 });
      let flap = () => 0;
      if (k.g === 3) flap = (t) => 0.3 * (sm(1.5, 1.6, t) - sm(1.9, 2.1, t));
      fx.on((t) => {
        const open = sm(0.2, 0.7, t) * (1 - sm(2.3, 2.8, t)) + flap(t);
        for (const { f, side, i } of feathers) { f.rotation.set(side * (0.2 + 0.4 * open), 0, -(0.25 + 0.2 * i) * open); }
      });
      k.em({ count: 40, kind: 'petal', shape: 'sphere', radius: 0.8, pos: [0, 1.6, 0], dir: [0, -1, 0], speed: [0.2, 0.5], life: [1.5, 2.5], delay: 0.2, emit: 2.2, t0: 0.2 });
      k.em({ count: 60, kind: 'soft', shape: 'ring', radius: 0.6, pos: [0, 1.2, 0], swirl: 1.5, delay: 0.2, emit: 2.2, t0: 0.2 });
      if (k.g >= 2) {
        k.glint([-0.3, 2.3, 0.3], 0.6, 1);
        k.glint([-0.3, 2.3, -0.3], 0.6, 1);
        k.em({ count: 30, kind: 'soft', shape: 'sphere', radius: 0.5, pos: [-0.15, 1.5, 0], delay: 0.3, emit: 2, t0: 0.3 });
      }
      if (k.g === 3) {
        k.ring({ t0: 1.6, dur: 0.6, r: [0.2, 1.5], normal: 'cam', pos: [0, 1.4, 0] });
        k.em({ count: 40, kind: 'petal', shape: 'sphere', radius: 0.9, pos: [0, 1.8, 0], dir: [0, -1, 0], speed: [0.1, 0.3], delay: 1.6, emit: 1, t0: 1.6 });
      }
    } }),

  SKILL('priest/judgment-beam', 'Judgment beam', m(['holy'], 'sky-beam', 0.6, 14, 8, 'point'), 2.2, {
    view: 'sky',
    act: act('castup', 0.3, 2.6, { hits: [{ t: 0.3, stop: 0.08, shake: 0.35, amp: 0.05, push: 1.4 }] }),
    // P3=202
    build(fx, o) {
      const k = kit(fx, o, RAMP), G = [2.6, 0, 0];
      // ground cross: two crossed boxes, popped in and out
      const cross = new THREE.Group(), bar1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.01, 0.12), addMat(k.col(1), 1.6, 0.7)), bar2 = new THREE.Mesh(bar1.geometry, bar1.material);
      bar2.rotation.y = Math.PI / 2; cross.add(bar1, bar2); cross.position.set(G[0], 0.01, 0);
      k.pop(cross, -0.4, 0.3, 2.0, 2.2);
      k.ring({ t0: 0, dur: 2.2, r: [0.6, 0.6], normal: 'up', pos: [G[0], 6, 0] });
      k.beam({ pos: G, height: 14, r: [0.35, 0.35], intensity: 1.4, t0: 0.3, dur: 0.9 });
      k.beam({ pos: G, height: 14, r: [0.8, 0.8], intensity: 0.3, t0: 0.3, dur: 0.9 });
      k.ring({ t0: 0.3, dur: 0.7, r: [0.2, 3.5], normal: 'up', pos: G });
      k.em({ count: 80, kind: 'spark', shape: 'point', pos: G, dir: [0, 1, 0], spread: 0.2, speed: [4, 8], life: [0.4, 0.8], stretch: 1.5, size: [0.07, 0.02], delay: 0.3, emit: 0.001, t0: 0.28 });
      k.glint([G[0], 2.4, 0], 0.3, 1);
      k.smoke({ count: 20, shape: 'disc', radius: 0.5, pos: [G[0], 0.05, 0], ramp: DUST, delay: 0.3, emit: 0.3, t0: 0.3 });
      k.decal({ kind: 'scorch', r: [0.8, 1.2], pos: G, t0: 0.3, dur: 1.5 });
      k.light({ pos: [G[0], 1.5, 0.8], t0: 0, dur: 2.2, fade: [0.05, 0.6], intensity: 160 });
      fx.flash(0.3, 0.12, k.col(0), 0.25);
      if (k.g >= 2) {
        k.beam({ pos: G, height: 14, r: [0.1, 0.1], intensity: 1, t0: 0.8, dur: 0.6 });
        k.sparks(G, 0.8, 60);
      }
      if (k.g === 3) for (const [y, t] of [[3, 0.3], [2, 0.4], [1, 0.5]]) k.ring({ t0: t, dur: 0.6, r: [0.2, 2], normal: 'up', pos: [G[0], y, 0] });
      k.extras([G[0], 1, 0], 0.3);
    } }),

  SKILL('priest/divine-chain', 'Divine chain', m(['holy'], 'chain-heal', 0.6, 10, 8, 'chain'), 2.2, {
    body: true, view: 'wide',
    // P3=181
    build(fx, o) {
      const k = kit(fx, o, RAMP);
      fx.body.setPose(POSES.castRelease);
      const A = [0.6, 1.38, 0.2], C = [0, 1.2, 0], L1 = [2.2, 0, 1.2], L2 = [3.4, 0, -1];
      const chest1 = [L1[0], 1.2, L1[2]], chest2 = [L2[0], 1.2, L2[2]];
      for (const L of [L1, L2]) {
        const f = figure(); f.position.set(...L); fx.mesh(f, () => {}, { t0: 0, dur: 2.2 });
        k.em({ count: 40, kind: 'soft', shape: 'disc', radius: 0.3, pos: [L[0], 0.05, L[2]], dir: [0, 1, 0], speed: [0.4, 0.9], delay: 0.3, emit: 0.6, t0: 0.3 });
        k.em({ count: 10, kind: 'glint', shape: 'disc', radius: 0.4, pos: [L[0], 1.2, L[2]], delay: 0.3, emit: 0.6, t0: 0.3 });
        k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.2], normal: 'up', pos: [L[0], 0.02, L[2]] });
        k.light({ pos: [L[0], 1.2, L[2]], t0: 0.3, dur: 1.2, intensity: 40 });
      }
      k.ribbon({ points: arc(A, chest1), n: 11, width: 0.04, t0: 0.1, dur: 0.15 });
      k.ribbon({ points: arc(chest1, chest2), n: 11, width: 0.04, t0: 0.3, dur: 0.15 });
      if (k.g >= 2) {
        // second pulse along the chain
        k.ribbon({ points: arc(A, chest1), n: 11, width: 0.04, t0: 0.9, dur: 0.15 });
        k.ribbon({ points: arc(chest1, chest2), n: 11, width: 0.04, t0: 0.9, dur: 0.15 });
      }
      if (k.g === 3) {
        k.ribbon({ points: arc(chest2, [C[0], 1.2, C[2]]), n: 11, width: 0.04, t0: 1.2, dur: 0.15 });
        k.em({ count: 40, kind: 'soft', shape: 'disc', radius: 0.4, pos: [0, 0.05, 0], dir: [0, 1, 0], speed: [0.3, 0.8], delay: 1.2, emit: 0.6, t0: 1.2 });
      }
      k.extras([0, 1.1, 0], 1.2);
    } }),

  SKILL('priest/sun-lance', 'Sun lance', m(['holy'], 'projectile', 0.5, 6, 9, 'point'), 1.8, {
    view: 'long',
    act: act('throw', 0.35, 4),
    // P3=322
    build(fx, o) {
      const k = kit(fx, o, RAMP), A = [0.6, 1.38, 0.2], B = [3.8, 1.2, 0], T = 0.35, H = 0.05;
      // T-PRJ path: arc from A to B over [0, T]
      const P = (t) => { const u = clamp(t / T); return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + H * Math.sin(Math.PI * u), A[2] * (1 - u)]; };
      const fol = (mm, ta, t) => mm.position.set(...P(t));
      const lg = new THREE.OctahedronGeometry(1); lg.scale(0.6, 0.08, 0.08);
      const lance = new THREE.Mesh(lg, addMat('#ffc040', 2));
      fx.mesh(lance, (t) => { lance.position.set(...P(t)); lance.visible = t <= T; }, { t0: -0.1, dur: T + 0.2 });
      k.gather(O, -0.45, 0.4, 0.7, 40, k.at());
      k.trail({ path: P, t0: 0, dur: T + 0.05, len: 0.3, width: 0.12 });
      k.em({ count: 60, kind: 'soft', shape: 'sphere', radius: 0.1, dir: [-1, 0, 0], spread: 0.8, speed: [0.3, 1], life: [0.25, 0.45], size: [0.12, 0.03], intensity: 0.8, delay: 0, emit: T, t0: 0, t1: T + 0.5, follow: fol });
      k.impact(B, T, 60, 1.6);
      k.extras(B, T);
      // 12 radial rays out from the impact point
      for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12, c = Math.cos(a), s = Math.sin(a); k.ribbon({ points: [[B[0], B[1], 0], [B[0] + 0.8 * c, B[1] + 0.8 * s, 0]], n: 1, width: 0.02, sweep: [0, 1], t0: 0.35, dur: 0.3 }); }
      k.decal({ kind: 'glow', r: [0.8, 0.8], pos: [3.8, 0, 0], t0: 0.35, dur: 1.4 });
      k.light({ pos: [B[0], 1.2, 0.8], t0: 0.35, dur: 1.2, fade: [0.05, 0.5], intensity: 160 });
      if (k.g >= 2) for (let i = 0; i < 6; i++) {
        k.em({ count: 20, kind: 'soft', shape: 'sphere', radius: 0.05, pos: A, speed: [0.05, 0.15], life: [0.3, 0.5], size: [0.08, 0.02], delay: 0, emit: T + 0.5, t0: 0,
          follow: (mm, ta, t) => { const p = P(t), a = (TAU * t) / 0.6 + i; mm.position.set(p[0], p[1] + 0.15 * Math.cos(a), p[2] + 0.15 * Math.sin(a)); } });
      }
      if (k.g === 3) {
        k.orb({ kind: 'energy', r: [0.2, 1], pos: B, t0: 0.35, dur: 0.4 });
        k.ring({ t0: 0.35, dur: 0.5, r: [0.2, 1.8], normal: 'up', pos: B });
      }
    } }),

  SKILL('priest/bless-banner', 'Bless banner', m(['holy'], 'totem-buff', 0.8, 25, 0, 'circle'), 3.2, {
    body: true, view: 'wide',
    // P3=171
    build(fx, o) {
      const k = kit(fx, o, RAMP), B = [0.9, 0, 0.3];
      fx.body.setPose(POSES.guard);
      // banner: wooden pole with a glowing cloth, popped up from the ground
      const banner = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.8, 8), new THREE.MeshStandardMaterial({ color: '#6a4a2a', roughness: 0.8 }));
      pole.position.y = 0.9;
      const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshStandardMaterial({ color: '#f6e2a0', emissive: '#ffc040', emissiveIntensity: 0.5, side: THREE.DoubleSide }));
      cloth.position.set(0.25, 1.55, 0);
      banner.add(pole, cloth); banner.position.set(...B);
      k.pop(banner, 0, 0.15, 3.1, 3.2, (t) => { cloth.rotation.y = 0.3 * Math.sin((TAU * 3 * t) / 3.2); });
      for (const t of [0.3, 1.1, 1.9, 2.7]) k.ring({ t0: t, dur: 0.6, r: [0.2, 2.4], normal: 'up', pos: B });
      k.decal({ kind: 'rune', r: [1.2, 1.2], spin: 0.3, pos: B, t0: 0, dur: 3.2 });
      k.em({ count: 80, kind: 'soft', shape: 'disc', radius: 0.6, pos: [B[0], 0.1, B[2]], dir: [0, 1, 0], speed: [0.4, 0.9], delay: 0.3, emit: 2.6, t0: 0.3 });
      k.smoke({ count: 20, shape: 'disc', radius: 0.5, pos: [B[0], 0.05, B[2]], ramp: DUST, delay: 0, emit: 0.3, t0: 0 });
      k.light({ pos: [B[0], 1.2, B[2]], t0: 0, dur: 3.2, env: (t) => 0.5 + 0.5 * Math.sin((Math.PI * t) / 3.2), intensity: 40 });
      fx.shake(0, 0.2, 0.03);
      if (k.g >= 2) k.em({ count: 30, kind: 'soft', shape: 'point', pos: [B[0], 1.8, B[2]], dir: [0, -1, 0], spread: 0.1, speed: [0.4, 0.8], life: [0.8, 1.2], delay: 0.3, emit: 2.6, t0: 0.3 });
      if (k.g === 3) k.beam({ pos: [B[0], 1.8, B[2]], height: 3, r: [0.3, 0.1], intensity: 0.3, t0: 0.3, dur: 2.6 });
      k.extras([B[0], 1.2, B[2]], 0.3);
    } }),
];
