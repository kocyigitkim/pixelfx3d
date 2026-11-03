// Mage class: 12 staff skills (PLAN2 B6/B7). Built from the T-PRJ, T-GND, T-BEAM, T-BUF, T-TEL and T-PUL templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, rock, addMat, DUST, VAPOR, FIRE, FROST, STORM, ARCANE, VOID } from './_skill.js';

const m = meta('mage', 'class');
const O = [0, 0, 0], A = [0.6, 1.38, 0.2]; // cast hand
const lerp3 = (p, q, u) => p.map((v, i) => v + (q[i] - v) * u);
const bez = (p, c, q, u) => { const k = 1 - u; return [0, 1, 2].map((i) => k * k * p[i] + 2 * k * u * c[i] + u * u * q[i]); };
const place = (R, i, n) => { const a = (i * TAU) / n; return [R * Math.cos(a), R * Math.sin(a)]; };
const ice = () => new THREE.MeshStandardMaterial({ color: '#bfe9ff', roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.85, emissive: '#2a78cc', emissiveIntensity: 0.4, flatShading: true });
const hits = (ts, push) => ts.map((t) => ({ t, stop: 0.02, shake: 0.1, amp: 0.02, push }));

export default [
  SKILL('mage/comet-lance', 'Comet lance', m(['fire'], 'projectile', 0.8, 6, 10, 'point'), 2.0, {
    view: 'long',
    act: act('cast', 0.4, 4.4, { weapon: 'staff' }),
    // P3=432
    build(fx, o) {
      const k = kit(fx, o, FIRE), T = 0.4, H = 0.15, B = [3.8, 1.2, 0];
      const P = (t) => { const u = clamp(t / T); return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + H * Math.sin(Math.PI * u), A[2] * (1 - u)]; };
      const fol = (mm, ta, t) => mm.position.set(...P(t));
      k.gather(O, -0.45, 0.4, 0.7, 40, k.at());
      k.orb({ kind: 'fire', r: [0.22, 0.22], pos: A, follow: fol, t0: -0.1, dur: T + 0.1 });
      k.orb({ kind: 'plasma', r: 0.1, pos: A, follow: fol, t0: -0.1, dur: T + 0.1 });
      k.trail({ path: P, t0: 0, dur: T + 0.05, len: 0.8, width: 0.3 });
      k.trail({ path: P, t0: 0, dur: T + 0.05, len: 0.5, width: 0.12, intensity: 4 });
      k.em({ count: 60, kind: 'flame', shape: 'sphere', radius: 0.1, dir: [-1, 0, 0], spread: 0.8, speed: [0.3, 1], life: [0.25, 0.45], size: [0.2, 0.05], aspect: 1.8, intensity: 0.8, delay: 0, emit: T, t0: 0, t1: T + 0.5, follow: fol });
      k.em({ count: 40, kind: 'spark', shape: 'point', dir: [-1, 0, 0], spread: 1, speed: [0.5, 2], life: [0.2, 0.4], size: [0.05, 0.02], stretch: 1.5, intensity: 3, delay: 0, emit: T, t0: 0, t1: T + 0.3, follow: fol });
      k.impact(B, T, 60, 1.6);
      k.orb({ kind: 'fire', r: [0.3, 1.2], pos: B, t0: T, dur: 0.6 });
      k.em({ count: 60, kind: 'flame', shape: 'sphere', radius: 0.3, aspect: 1.8, pos: B, speed: [0.5, 2.5], life: [0.4, 0.8], size: [0.3, 0.1], intensity: 0.7, delay: T, emit: 0.001, t0: T - 0.02 });
      k.smoke({ count: 50, shape: 'disc', radius: 0.5, pos: B, radial: 0.8, speed: [0.5, 2], delay: T, emit: 0.3, t0: T });
      k.ring({ t0: T, dur: 0.6, r: [0.2, 3], normal: 'up', pos: B });
      k.decal({ kind: 'scorch', r: [1, 1.4], pos: B, t0: T, dur: 2 });
      if (k.g >= 2) k.em({ count: 50, kind: 'soft', shape: 'sphere', radius: 0.12, speed: [0.2, 0.8], life: [0.6, 1], size: [0.05, 0.02], gravity: [0, -2, 0], intensity: 1.5, delay: 0, emit: 0.4, t0: 0, follow: fol });
      if (k.g === 3) { k.ring({ t0: T, dur: 0.5, r: [0.2, 2.4], normal: 'cam', pos: B }); k.smoke({ count: 30, shape: 'ring', radius: 0.3, pos: B, dir: [0, 1, 0], speed: [1, 2.5], delay: T, emit: 0.4, t0: T }); }
      k.extras(B, T);
    } }),

  SKILL('mage/glacier-prison', 'Glacier prison', m(['frost'], 'cage', 0.6, 18, 7, 'point'), 2.6, {
    view: 'wide', sky: 'night',
    act: act('cast', 0.2, 3, { weapon: 'staff', hits: [{ t: 0.2, stop: 0.1, shake: 0.3, amp: 0.04, push: 0 }] }),
    // P3=241
    build(fx, o) {
      const k = kit(fx, o, FROST), G = [3, 0, 0];
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8, g = new THREE.Group(), pr = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 2.2, 6), ice());
        pr.position.y = 1.1; g.add(pr); g.position.set(G[0] + 0.55 * Math.cos(a), 0, G[2] + 0.55 * Math.sin(a)); g.rotation.set(-0.12 * Math.sin(a), 0, 0.12 * Math.cos(a));
        k.pop(g, 0.2 + 0.04 * i, 0.35 + 0.04 * i, 2.1, 2.4);
      }
      const lid = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.5, 6), ice()); lid.position.set(G[0], 2.3, G[2]);
      k.pop(lid, 0.5, 0.8, 2.1, 2.4);
      k.decal({ kind: 'frost', r: [1.4, 1.4], pos: G, t0: 0.2, dur: 2.4, cells: 6 });
      k.em({ count: 60, kind: 'flake', shape: 'disc', radius: 1, pos: [G[0], 1.1, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.2, 0.6], life: [1, 1.6], size: [0.1, 0.05], intensity: 1.2, delay: 0.2, emit: 1.9, t0: 0.2 });
      k.smoke({ count: 40, shape: 'ring', radius: 0.8, pos: [G[0], 0.2, 0], radial: 0.5, speed: [0.5, 1.2], ramp: VAPOR, delay: 0.2, emit: 1.5, t0: 0.2 });
      k.em({ count: 40, kind: 'shard', shape: 'sphere', radius: 0.6, pos: [G[0], 1, 0], speed: [0.5, 2], gravity: [0, -4, 0], delay: 0.2, emit: 0.001, t0: 0.2 });
      k.em({ count: 60, kind: 'shard', shape: 'sphere', radius: 0.5, pos: [G[0], 1, 0], speed: [2, 5], gravity: [0, -9, 0], bounce: 0.3, size: [0.12, 0.04], delay: 2.1, emit: 0.001, t0: 2.1 });
      k.ring({ t0: 2.1, dur: 0.5, r: [0.2, 2.5], normal: 'up', pos: G });
      k.light({ pos: [G[0], 1.2, 0.8], t0: 2.1, dur: 0.6, fade: [0.01, 0.45], intensity: 70 });
      k.extras(G, 2.1);
      if (k.g >= 2) k.shell({ r: [0.7, 0.7], cells: 6, alpha: 0.4, pos: [G[0], 1.1, 0], t0: 0.3, dur: 1.5 });
      if (k.g === 3) {
        for (let i = 0; i < 6; i++) { const [x, z] = place(1, i, 6), sp = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.4, 6), ice()); sp.position.set(G[0] + x, 0.2, z); k.pop(sp, 0.3, 0.5, 2.1, 2.4); }
      }
    } }),

  SKILL('mage/storm-orb', 'Storm orb', m(['storm'], 'orbit-burst', 0.5, 12, 6, 'point'), 2.6, {
    view: 'wide', sky: 'storm',
    act: act('cast', 1.8, 3.6, { weapon: 'staff' }),
    // P3=161
    build(fx, o) {
      const k = kit(fx, o, STORM), E = [3.5, 1.2, 0];
      const J = Array.from({ length: 64 }, () => [0, 1, 2].map(() => (fx.rng() - 0.5) * 1.2));
      const ORB = (t, ph = 0) => { const a = (TAU * 2 * Math.min(t, 1.4)) / 1.4 + ph; return lerp3([0.6 + 0.9 * Math.cos(a), 1.3, 0.2 + 0.9 * Math.sin(a)], E, sm(1.4, 1.8, t)); };
      const fol = (mm, ta, t) => mm.position.set(...ORB(t));
      k.orb({ kind: 'plasma', r: 0.22, pos: ORB(0), follow: fol, t0: 0, dur: 1.8 });
      k.orb({ kind: 'energy', r: 0.34, alpha: 0.7, pos: ORB(0), follow: fol, t0: 0, dur: 1.8 });
      k.trail({ path: (t) => ORB(t), t0: 0, dur: 1.8, len: 0.5, width: 0.1 });
      for (let i = 0; i < 2; i++) k.bolt({ from: (s) => ORB(s / 24), to: (s) => { const j = J[(s + 32 * i) % 64], p = ORB(s / 24); return p.map((v, c) => v + j[c]); }, rate: 24, t0: 0, dur: 1.8 });
      k.ring({ t0: 1.8, dur: 0.5, r: [0.2, 2.5], normal: 'cam', pos: E });
      k.sparks(E, 1.8, 80);
      k.glint(E, 1.8, 1);
      for (let i = 0; i < 3; i++) k.bolt({ from: [E[0] + (i - 1) * 0.4, 3, 0], to: [E[0] + (i - 1) * 0.4, 0, 0], rate: 24, t0: 1.8, dur: 0.3 });
      k.decal({ kind: 'scorch', r: [0.8, 0.8], pos: [E[0], 0, 0], t0: 1.8, dur: 0.8 });
      k.light({ pos: [E[0], 1.2, 0.8], t0: 1.8, dur: 0.8, fade: [0.01, 0.5], intensity: 90 });
      if (k.g >= 2) {
        k.em({ count: 20, kind: 'soft', shape: 'sphere', radius: 0.1, speed: [0.1, 0.4], life: [0.3, 0.5], size: [0.12, 0.04], intensity: 1.5, delay: 0, emit: 1.8, t0: 0, t1: 1.8, follow: fol });
        k.orb({ kind: 'plasma', r: 0.12, pos: ORB(0, Math.PI), follow: (mm, ta, t) => mm.position.set(...ORB(t, Math.PI)), t0: 0, dur: 1.8 });
      }
      if (k.g === 3) {
        k.ring({ t0: 1.8, dur: 0.6, r: [0.2, 3], normal: 'up', pos: [E[0], 0.02, 0] });
        k.em({ count: 60, kind: 'spark', shape: 'disc', radius: 0.6, pos: [E[0], 0.05, 0], dir: [0, 1, 0], spread: 1.2, speed: [1, 4], life: [0.2, 0.5], stretch: 1.5, intensity: 3, delay: 1.8, emit: 0.5, t0: 1.8 });
      }
    } }),

  SKILL('mage/arcane-barrage', 'Arcane barrage', m(['arcane'], 'volley-homing', 0.4, 8, 9, 'point'), 2.0, {
    view: 'long', sky: 'night',
    act: act('cast', 0.5, 4, { weapon: 'staff', hits: hits([0.62, 0.74, 0.86, 0.98], 0.4) }),
    // P3=188
    build(fx, o) {
      const k = kit(fx, o, ARCANE), B = [3.9, 1.2, 0];
      const ctrl = (i) => [1.8, 1.38 + 0.6 * (i % 2 ? -1 : 1), 0.8 * ((i % 3) - 1)];
      const missile = (i) => {
        k.trail({ path: (t) => bez(A, ctrl(i), B, clamp((t - 0.12 * i) / 0.45)), t0: 0.12 * i, dur: 0.5, len: 0.25, width: 0.07 });
        k.ring({ t0: 0.12 * i, dur: 0.25, r: [0.05, 0.35], normal: 'cam', pos: A });
      };
      for (let i = 0; i < 6; i++) missile(i);
      if (k.g >= 2) for (let i = 6; i < 8; i++) missile(i);
      k.gather(A, 0, 0.5, 0.6, 30, k.at());
      for (const h of [0.62, 0.74, 0.86, 0.98]) k.sparks(B, h, 14);
      if (k.g === 3) {
        k.trail({ path: (t) => bez(A, [1.8, 1.38, 0], B, clamp((t - 1.1) / 0.45)), t0: 1.1, dur: 0.5, len: 0.6, width: 0.2 });
        k.impact(B, 1.55, 60, 1.2);
      }
      k.extras(B, 0.98);
    } }),

  SKILL('mage/meteor-rain', 'Meteor rain', m(['fire', 'earth'], 'ground-rain', 1.0, 20, 9, 'circle'), 3.0, {
    view: 'wide',
    act: act('castup', 0.8, 3.2, { weapon: 'staff' }),
    // P3=651
    build(fx, o) {
      const k = kit(fx, o, FIRE), G = [3.2, 0, 0], T = 2.3;
      const rnd = () => (fx.rng() * 2 - 1) * 1.5;
      const meteor = (ox, oz, s) => {
        const P = (t) => lerp3([G[0] + ox - 2, 7, oz], [G[0] + ox, 0, oz], clamp((t - s) / 0.35)), L = [G[0] + ox, 0, oz], e = s + 0.35;
        k.trail({ path: P, t0: s, dur: 0.4, len: 0.4, width: 0.18 });
        k.em({ count: 25, kind: 'flame', shape: 'sphere', radius: 0.15, aspect: 1.8, speed: [0.2, 1], life: [0.3, 0.5], size: [0.3, 0.1], intensity: 0.8, delay: s, emit: 0.35, t0: s, t1: e, follow: (mm, ta, t) => mm.position.set(...P(t)) });
        k.sparks(L, e, 20);
        k.smoke({ count: 10, shape: 'disc', radius: 0.3, pos: L, ramp: DUST, delay: e, emit: 0.2, t0: e });
        k.ring({ t0: e, dur: 0.5, r: [0.1, 1.2], normal: 'up', pos: L });
        k.decal({ kind: 'scorch', r: [0.5, 0.5], pos: L, t0: e, dur: 2.5 });
        fx.shake(e, 0.25, 0.04);
      };
      for (let i = 0; i < 6; i++) meteor(rnd(), rnd(), 0.5 + 0.25 * i);
      if (k.g >= 2) for (let i = 6; i < 8; i++) meteor(rnd(), rnd(), 0.5 + 0.25 * i);
      k.decal({ kind: 'rune', r: [1.6, 1.6], pos: G, t0: -0.4, dur: 3, reveal: 0.5, glyphs: 14, poly: 6, spin: 0.4 });
      k.ring({ t0: T - 0.3, dur: 0.3, r: [2, 0.3], normal: 'up', pos: G, decay: 0.2 });
      const BP = (t) => lerp3([G[0], 7, 0], G, clamp((t - 1.95) / 0.35));
      k.orb({ kind: 'fire', r: [0.3, 0.3], pos: [G[0], 7, 0], follow: (mm, ta, t) => mm.position.set(...BP(t)), t0: 1.95, dur: 0.35 });
      k.light({ pos: [G[0], 1, 0.8], t0: T, dur: 1.2, fade: [0.01, 0.5], intensity: 120 });
      fx.shake(T, 0.5, 0.06);
      k.smoke({ count: 60, shape: 'disc', radius: 1.5, pos: G, radial: 0.5, speed: [0.3, 1.2], delay: T, emit: 0.8, t0: T });
      k.em({ count: 50, kind: 'soft', shape: 'disc', radius: 1.5, pos: G, dir: [0, 1, 0], speed: [0.5, 2], gravity: [0, -1, 0], life: [1, 2], size: [0.08, 0.03], intensity: 1, delay: T, emit: 0.8, t0: T });
      if (k.g === 3) { k.sparks(G, T, 60); k.ring({ t0: T, dur: 0.6, r: [0.2, 4], normal: 'up', pos: G }); }
      k.extras(G, T);
    } }),

  SKILL('mage/rime-pillars', 'Rime pillars', m(['frost'], 'ring-wall', 0.6, 16, 0, 'ring'), 2.6, {
    view: 'high', sky: 'night',
    act: act('stomp', 0, 2.2, { weapon: 'staff' }),
    // P3=187
    build(fx, o) {
      const k = kit(fx, o, FROST);
      for (let i = 0; i < 8; i++) {
        const [x, z] = place(1.6, i, 8), p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.6, 6), ice());
        p.position.set(x, 0.8, z);
        k.pop(p, 0.04 * i, 0.04 * i + 0.12, 2.0, 2.5);
        k.em({ count: 6, kind: 'shard', shape: 'disc', radius: 0.2, pos: [x, 0.1, z], dir: [0, 1, 0], spread: 1, speed: [1, 3], gravity: [0, -9, 0], bounce: 0.3, delay: 0.04 * i, emit: 0.001, t0: 0.04 * i });
      }
      k.decal({ kind: 'frost', r: [2.2, 2.2], pos: O, t0: 0, dur: 2.6, cells: 6 });
      k.smoke({ count: 50, shape: 'ring', radius: 1.6, pos: [0, 0.1, 0], radial: 0.2, speed: [0.3, 1], ramp: VAPOR, delay: 0, emit: 1.2, t0: 0 });
      k.ring({ t0: 0, dur: 0.8, r: [0.2, 2], normal: 'up', pos: O });
      k.em({ count: 40, kind: 'flake', shape: 'ring', radius: 1.6, pos: [0, 1, 0], speed: [0.1, 0.5], life: [1, 1.6], size: [0.1, 0.05], delay: 0.2, emit: 1.5, t0: 0.2 });
      k.light({ pos: [0, 1.2, 0.8], t0: 0, dur: 2.6, fade: [0.1, 0.6], intensity: 70 });
      k.extras([0, 0.2, 0], 0);
      if (k.g >= 2) for (let i = 0; i < 6; i++) { const [x, z] = place(0.9, i, 6), p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.6, 6), ice()); p.position.set(x, 0.8, z); k.pop(p, 0.25, 0.37, 2.0, 2.5); }
      if (k.g === 3) {
        for (let i = 0; i < 8; i++) { const [x, z] = place(1.6, i, 8); k.glint([x, 1.6, z], 0.3, 1); }
        k.ring({ t0: 0.3, dur: 0.5, r: [0.2, 2.4], normal: 'cam', pos: [0, 1.2, 0] });
      }
    } }),

  SKILL('mage/forked-thunder', 'Forked thunder', m(['storm'], 'chain-split', 0.4, 8, 9, 'cone'), 1.6, {
    view: 'long', sky: 'storm',
    act: act('cast', 0.1, 4, { weapon: 'staff' }),
    // P3=264
    build(fx, o) {
      const k = kit(fx, o, STORM), S = [2.2, 1.4, 0], E = [[4, 1.2, 0], [3.6, 1.3, 1.2], [3.6, 1.3, -1.2]], br = k.g >= 2 ? 5 : 3;
      k.bolt({ from: A, to: S, width: 0.06, rate: 24, t0: 0, dur: 0.35, branches: br });
      for (const p of E) {
        k.bolt({ from: S, to: p, width: 0.06, rate: 24, t0: 0, dur: 0.35, branches: br });
        k.sparks(p, 0.35, 30);
        k.glint(p, 0.35, 1);
        k.decal({ kind: 'scorch', r: [0.4, 0.4], pos: [p[0], 0, p[2]], t0: 0.35, dur: 1.2 });
        if (k.g === 3) k.em({ count: 30, kind: 'spark', shape: 'point', pos: p, dir: [0, 1, 0], spread: 1.2, speed: [1, 4], life: [0.2, 0.5], stretch: 1.5, intensity: 3, delay: 0.35, emit: 0.001, t0: 0.35 });
      }
      k.light({ pos: [2.2, 1.4, 0.6], t0: 0, dur: 1.6, intensity: 150, flicker: 0.3 });
      fx.flash(0.1, 0.12, '#fff', 0.2);
      k.gather(A, 0, 0.3, 0.6, 40, k.at());
      if (k.g === 3) k.ring({ t0: 0.35, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: [3.8, 0.02, 0] });
      k.extras(E[0], 0.35);
    } }),

  SKILL('mage/blink-gate', 'Blink gate', m(['arcane'], 'teleport-portal', 0.3, 10, 8, 'point'), 1.8, {
    view: 'wide', sky: 'night',
    act: act('cast', null, false, { weapon: 'staff', keys: [[-0.4, 'guard'], [-0.2, 'castRelease'], [1.8, 'guard']] }),
    // P3=100
    build(fx, o) {
      const k = kit(fx, o, ARCANE), TS = -0.05, PA = [0.3, 1, 0], PB = [3.2, 1, 0];
      fx.on((t) => {
        const b = fx.body;
        if (t < TS) { b.position.x = 0; const q = sm(TS - 0.35, TS, t); b.set({ dissolve: q < 0.002 ? -1 : q, dDir: -1, edge: k.col(1), edgeW: 0.09, edgeInt: 4 }); }
        else { b.position.x = 3.4; b.rotation.y = 0; const q = 1 - sm(TS, TS + 0.25, t); b.set({ dissolve: q < 0.002 ? -1 : q, dDir: 1, edge: k.col(1), edgeW: 0.09, edgeInt: 4 }); }
      });
      for (const p of [PA, PB]) {
        const portal = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.04, 8, 48), addMat(k.col(1), 2));
        portal.position.set(...p); portal.rotation.y = Math.PI / 2;
        k.pop(portal, -0.3, 0, 1.2, 1.5);
        k.ring({ t0: -0.3, dur: 1.8, r: [0.55, 0.55], normal: [1, 0, 0], pos: p, fill: 0.5 });
        k.em({ count: 50, kind: 'soft', shape: 'ring', radius: 0.6, rot3: [0, 0, Math.PI / 2], swirl: 3, pos: p, delay: 0, emit: 1.5, t0: -0.3 });
        k.light({ pos: [p[0], p[1], 0.5], t0: -0.3, dur: 1.8, intensity: 60 });
      }
      k.ring({ t0: TS - 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: [PA[0], 0.02, 0] });
      k.ring({ t0: TS, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: [PB[0], 0.02, 0] });
      if (k.g >= 2) for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6, y = 1 + 0.25 * Math.cos(a), z = 0.25 * Math.sin(a); k.ribbon({ points: [[PA[0], y, z], [PB[0], y, z]], n: 1, width: 0.04, head: () => 1.001, t0: -0.05, dur: 0.25 }); }
      if (k.g === 3) {
        k.ghost('castRelease', [0, 0, 0], -0.05, 0.6);
        k.ring({ t0: 0, dur: 0.4, r: [0.2, 1.2], normal: 'cam', pos: PA });
        k.ring({ t0: TS, dur: 0.4, r: [0.2, 1.2], normal: 'cam', pos: PB });
      }
    } }),

  SKILL('mage/mana-sphere', 'Mana sphere', m(['arcane'], 'shield', 0.3, 20, 0, 'self'), 2.6, {
    body: true, view: 'body', sky: 'night',
    // P3=230
    build(fx, o) {
      const k = kit(fx, o, ARCANE), C = [0, 1.1, 0], IMP = [{ t: 0.8, dir: [1, 0.3, 0] }, { t: 1.3, dir: [0.5, 0.5, 0.6] }, { t: 1.8, dir: [1, 0, -0.5] }];
      fx.body.setPose(POSES.castCharge);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.3, 2.6, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30);
      k.shell({ r: [0.2, 1.15], cells: 6, pos: C, t0: 0.3, dur: 1.9, impacts: IMP });
      for (const { t, dir } of IMP) {
        const n = Math.hypot(...dir), u = dir.map((v) => v / n), P = u.map((v, i) => C[i] + v * 1.15), S = u.map((v, i) => C[i] + v * 2.6);
        k.trail({ path: (x) => lerp3(S, P, clamp((x - t + 0.3) / 0.3)), t0: t - 0.3, dur: 0.35, len: 0.3, width: 0.04 });
        k.sparks(P, t, 25);
        k.glint(P, t, 1);
        k.ring({ t0: t, dur: 0.3, r: [0.1, 0.6], normal: 'cam', pos: P });
      }
      k.em({ count: 40, kind: 'soft', shape: 'sphere', radius: 1.1, pos: C, swirl: 2, speed: [0.05, 0.2], life: [1, 1.5], size: [0.05, 0.02], delay: 0.3, emit: 1.9, t0: 0.3 });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 2.6, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / 2.6), intensity: 40 });
      fx.flash(0.3, 0.1, k.col(0), 0.12);
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.extras([0, 1.1, 0], 0.3);
      if (k.g >= 2) k.shell({ r: [1, 1], power: 4, intensity: 0.4, pos: C, t0: 0.3, dur: 1.9 });
      if (k.g === 3) {
        k.decal({ kind: 'rune', r: [1.4, 1.4], t0: 0.3, dur: 2 });
        k.sparks(C, 2.3, 40);
        k.glint(C, 2.3, 1);
      }
    } }),

  SKILL('mage/gravity-well', 'Gravity well', m(['arcane', 'void'], 'pull', 0.6, 18, 6, 'circle'), 3.0, {
    view: 'wide', sky: 'void',
    act: act('cast', null, 3, { weapon: 'staff', target: [3.6, 0, 0] }),
    // P3=301
    build(fx, o) {
      const k = kit(fx, o, VOID), G = [3, 1, 0], R = 2.5, BURST = [3.2, 1, 0];
      fx.on((t) => { fx.target.position.x = 3.6 - 0.4 * sm(0.2, 2.5, t); });
      k.orb({ kind: 'void', r: [0.05, 0.5], pos: G, t0: 0.2, dur: 2.1 });
      k.decal({ kind: 'rings', r: [2, 2], pos: [3, 0, 0] });
      k.em({ count: 150, kind: 'soft', shape: 'sphere', radius: R, radial: 1, speed: [-5, -3.5], swirl: 3, life: [0.4, 0.6], pos: G, delay: 0.2, emit: 2, t0: 0.2 });
      k.em({ count: 30, kind: 'rock', blend: 'normal', lit: 1, shape: 'sphere', radius: 2, radial: 1, speed: [-2, -1.2], pos: G, delay: 0.2, emit: 2.1, t0: 0.2 });
      for (const t of [0.4, 1.1, 1.8]) k.ring({ t0: t, dur: 0.7, r: [2.6, 0.3], normal: 'up', pos: [3, 0.02, 0] });
      k.ring({ t0: 2.5, dur: 0.5, r: [0.2, 3], normal: 'cam', pos: BURST });
      k.sparks(BURST, 2.5, 80);
      fx.flash(2.5, 0.15, k.col(0), 0.2);
      k.extras(BURST, 2.5);
      if (k.g >= 2) k.shell({ r: [0.8, 0.8], power: 3, intensity: 0.3, pos: G, t0: 0.2, dur: 2.3 });
      if (k.g === 3) {
        for (let i = 0; i < 6; i++) {
          const st = new THREE.Mesh(new THREE.IcosahedronGeometry(0.08, 0), rock());
          fx.mesh(st, (t) => { const u = clamp((t - 0.2) / 2.2), a = (i * TAU) / 6 + 2 * TAU * u, Rr = 2.5 * (1 - u) + 0.2; st.position.set(G[0] + Rr * Math.cos(a), G[1], Rr * Math.sin(a)); }, { t0: 0.2, dur: 2.2 });
        }
      }
    } }),

  SKILL('mage/searing-ray', 'Searing ray', m(['fire', 'holy'], 'beam', 0.5, 10, 7, 'line'), 2.6, {
    view: 'long',
    act: act('cast', null, 4, { weapon: 'staff', keys: [[-0.5, 'guard'], [-0.25, 'castCharge'], [0, 'castRelease', 'snap'], [2, 'castRelease'], [2.5, 'guard']], hits: hits([0.1, 0.5, 0.9, 1.3, 1.7], 0.5) }),
    // P3=321
    build(fx, o) {
      const k = kit(fx, o, FIRE), D = 2, B = [4, 1.2, 0];
      k.beam({ from: A, to: B, r: [0.12, 0.16], t0: 0, dur: D, fade: [0.03, 0.2], noise: 0.6, edge: 1.4 });
      k.beam({ from: A, to: B, r: [0.05, 0.05], intensity: 2.5, t0: 0, dur: D, fade: [0.03, 0.2] });
      k.em({ count: 30, kind: 'soft', shape: 'point', pos: A, speed: [0.2, 0.8], life: [0.3, 0.6], size: [0.1, 0.03], delay: 0, emit: D, t0: 0, t1: D });
      k.sparks(B, 0, 80, { emit: D, speed: [1, 4] });
      k.decal({ kind: 'scorch', r: [0.4, 1], pos: [B[0], 0, 0] });
      k.light({ pos: [B[0], 1.2, 0.6], t0: 0, dur: D, env: (t) => 0.8 + 0.2 * Math.sin((TAU * 8 * t) / D), intensity: 80 });
      k.em({ count: 60, kind: 'flame', shape: 'sphere', radius: 0.2, aspect: 1.8, pos: B, speed: [0.5, 1.5], life: [0.3, 0.6], size: [0.2, 0.06], delay: 0, emit: D, t0: 0, t1: D });
      k.smoke({ count: 40, shape: 'sphere', radius: 0.3, pos: B, radial: 0.5, speed: [0.5, 1.5], delay: 0, emit: D, t0: 0 });
      for (const x of [1.2, 2.2, 3.2, 4]) k.decal({ kind: 'glow', r: [0.3, 0.3], pos: [x, 0, 0] });
      k.gather(A, 0, 0.4, 0.6, 30, k.at());
      if (k.g >= 2) {
        const helix = Array.from({ length: 25 }, (_, j) => { const u = j / 24, a = TAU * 3 * u; return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + 0.15 * Math.cos(a), 0.15 * Math.sin(a)]; });
        k.ribbon({ points: helix, n: 24, width: 0.03, head: () => 1.001, t0: 0, dur: D });
      }
      if (k.g === 3) {
        k.orb({ kind: 'fire', r: [0.2, 0.8], pos: B, t0: 1.8, dur: 0.8 });
        k.ring({ t0: 1.8, dur: 0.5, r: [0.2, 1.5], normal: 'cam', pos: B });
        k.sparks(B, 1.8, 40);
      }
      k.extras(B, 1.8);
    } }),

  SKILL('mage/time-ripple', 'Time ripple', m(['arcane'], 'slow-field', 0.8, 20, 6, 'circle'), 3.0, {
    view: 'wide', sky: 'night',
    act: act('castup', null, 3, { weapon: 'staff' }),
    // P3=201
    build(fx, o) {
      const k = kit(fx, o, ARCANE), G = [3, 0, 0];
      k.decal({ kind: 'rings', r: [2.2, 2.2], cells: 4, pos: G, t0: 0, dur: 2.8 });
      k.decal({ kind: 'rune', r: [2.4, 2.4], pos: G, spin: 0.3, reveal: 0.5 });
      k.em({ count: 100, kind: 'soft', shape: 'disc', radius: 2, pos: G, speed: [0.02, 0.05], drag: 2, life: [2, 2.8], delay: 0.2, emit: 0.5, t0: 0.2 });
      for (let i = 0; i < 4; i++) k.ring({ t0: 0.2 + 0.4 * i, dur: 1.4, r: [0.5, 2.2], normal: 'up', pos: [3, 0.02, 0], decay: 0.2, breakup: 0.9 });
      k.shell({ r: [2.2, 2.2], hemi: true, alpha: 0.3, power: 4, pos: G, t0: 0, dur: 3 });
      k.gather(G, 0, 0.4, 2, 30);
      k.light({ pos: [3, 1.2, 0.8], t0: 0, dur: 3, fade: [0.1, 0.6], intensity: 60 });
      k.extras(G, 0.2);
      if (k.g >= 2) k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 2, pos: G, speed: [0, 0], life: [2, 2], size: [0.08, 0.03], delay: 0, emit: 0.001, t0: 0 });
      if (k.g === 3) {
        const h1 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.03, 0.03), addMat(k.col(1), 2)), h2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.03, 0.03), addMat(k.col(1), 2));
        h1.position.set(G[0], 0.03, 0); h2.position.set(G[0], 0.03, 0);
        fx.mesh(h1, (t) => { h1.rotation.y = (TAU * t) / 12; }, { t0: 0, dur: 3 });
        fx.mesh(h2, (t) => { h2.rotation.y = (-TAU * t) / 8; }, { t0: 0, dur: 3 });
      }
    } }),
];
