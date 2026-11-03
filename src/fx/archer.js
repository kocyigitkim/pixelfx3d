// Archer class: 6 bow and projectile skills (PLAN2 B5). Built from the T-PRJ, T-GND, T-BUF and T-VOL templates.
import * as THREE from 'three';
import { kit, SKILL, meta, sm, clamp, TAU, POSES, metal, DUST, VAPOR, STEEL, AIR, FROST, HOLY, FIRE } from './_skill.js';

const m = meta('archer', 'class');
const O = [0, 0, 0], A = [0.6, 1.38, 0.2]; // default cast point
const lerp3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
const X = new THREE.Vector3(1, 0, 0), D = new THREE.Vector3();

/** bow held in the left hand, follows armL */
const bowOf = (fx, k) => { const g = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.017, 8, 40, 1.9), new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.6 })); g.rotation.z = -0.95; const h = new THREE.Group(); h.add(g); g.position.x = -0.5; const to = k.at('armL'); fx.mesh(h, () => to(h), { t0: -3, dur: 99 }); return h; };
/** bow act: draw, release at hit time T */
const ACT_BOW = (T, wind = 0.7) => ({ kind: 'cast', target: [4.2, 0, 0], windup: wind, keys: [[-wind, 'guard'], [-wind + 0.3, 'bowDraw'], [0, 'bowDraw'], [0.05, 'bowRelease', 'snap'], [0.6, 'bowRelease'], [1.2, 'guard']], hits: [{ t: T, stop: 0.05, shake: 0.2, amp: 0.03, push: 1.2 }] });
/** arrow mesh, shaft and head along +x */
const arrow = () => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.78, 8), new THREE.MeshStandardMaterial({ color: '#b8935a', roughness: 0.6 })); s.rotation.z = Math.PI / 2; g.add(s); const h = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 8), metal('#c9d1da')); h.rotation.z = -Math.PI / 2; h.position.x = 0.42; g.add(h); return g; };
/** arrow flying along path(t) (absolute effect time) from t0 for dur; the nose follows the path */
const fly = (fx, path, t0, dur) => { const a = arrow(); fx.mesh(a, (t) => { const p = path(t), q = path(t + 0.01); a.position.set(...p); D.set(q[0] - p[0], q[1] - p[1], q[2] - p[2]); if (D.lengthSq() > 1e-9) a.quaternion.setFromUnitVectors(X, D.normalize()); }, { t0, dur }); };

export default [
  // 1. three arrows in a fan, one hit each
  SKILL('archer/triple-volley', 'Triple volley', m(['steel', 'air'], 'volley', 0.7, 6, 9, 'cone'), 1.5, {
    view: 'long',
    act: ACT_BOW(0.25),
    // P3=221
    build(fx, o) {
      const k = kit(fx, o, STEEL), A1 = [0.75, 1.45, 0], T = 0.25;
      // one arrow aimed at fan angle a, launched at s: trail, then sparks and dust at its end
      const shot = (a, s) => {
        const to = [4, 1.3, 3.25 * Math.tan(a)], path = (t) => lerp3(A1, to, clamp((t - s) / T));
        fly(fx, path, s, T + 0.05);
        k.trail({ path, t0: s, dur: T + 0.05, len: 0.3, width: 0.03 });
        k.sparks(to, s + T, 20);
        k.smoke({ count: 10, shape: 'disc', radius: 0.2, pos: to, ramp: DUST, delay: s + T, emit: 0.001, t0: s + T });
      };
      k.ring({ r: [0.05, 0.5], normal: [1, 0, 0], pos: A1, t0: 0, dur: 0.22 });
      k.light({ pos: [2.5, 1.6, 0.8], t0: 0, dur: 0.8, intensity: 30 });
      shot(-0.12, 0); shot(0, 0.03); shot(0.12, 0.06);
      fx.flash(T, 0.1, k.col(0), 0.12);
      if (k.g >= 2) k.sparks(A1, 0, 30);
      if (k.g === 3) { shot(-0.24, 0.03); shot(0.24, 0.03); }
      k.extras([4, 1.3, 0], T);
    } }),

  // 2. arrow up, rain of arrows onto a rune circle
  SKILL('archer/needle-rain', 'Needle rain', m(['steel'], 'ground-rain', 0.7, 14, 8, 'circle'), 2.6, {
    view: 'wide',
    act: { ...ACT_BOW(0.85), target: [3.2, 0, 0] },
    // P3=401
    build(fx, o) {
      const k = kit(fx, o, STEEL), G = [3.2, 0, 0], T = 0.85, GS = [G[0], 0.05, 0];
      // T-GND: rune circle, ring closes in, then the strike
      k.decal({ kind: 'rune', r: [1.6, 1.6], pos: G, t0: T - 0.4, dur: T + 0.6, reveal: 0.5, glyphs: 14, poly: 6, spin: 0.4 });
      k.ring({ r: [1.6, 0.3], normal: 'up', pos: G, t0: T - 0.3, dur: 0.3, decay: 0.2 });
      k.trail({ path: (t) => lerp3(A, [1.5, 5, 0], clamp(t / 0.2)), t0: 0, dur: 0.25, len: 0.3, width: 0.05 });
      k.em({ count: 160, kind: 'streak', shape: 'disc', radius: 1.5, pos: [G[0], 6, 0], dir: [0, -1, 0], spread: 0.05, speed: [14, 16], life: [0.38, 0.4], size: [0.6, 0.3], stretch: 2, delay: 0.5, emit: 1.1 });
      k.em({ count: 120, kind: 'spark', shape: 'disc', radius: 1.5, pos: GS, life: [0.2, 0.4], speed: [1, 3], delay: T, emit: 1.1 });
      k.smoke({ count: 50, shape: 'disc', radius: 1.5, pos: GS, ramp: DUST, delay: T, emit: 1.1 });
      // stuck arrows in the ground
      for (let i = 0; i < 14; i++) {
        const a = arrow(), r = 1.5 * Math.sqrt(fx.rng()), ang = fx.rng() * TAU;
        a.position.set(G[0] + r * Math.cos(ang), 0.12, r * Math.sin(ang));
        a.rotation.set(0, ang, 1.1);
        k.pop(a, T + 0.07 * i, T + 0.07 * i + 0.1, 2.5, 2.6);
      }
      fx.shake(T, 1.1, 0.015);
      fx.flash(T, 0.12, k.col(0), 0.15);
      k.light({ pos: [G[0], 1.2, 0.8], t0: T, dur: 1.1, flicker: 0.2, intensity: 60 });
      if (k.g >= 2) for (const t of [0.9, 1.2, 1.5]) k.ring({ r: [0.2, 1.8], normal: 'up', pos: G, t0: t, dur: 0.3 });
      if (k.g === 3) {
        for (let i = 0; i < 6; i++) { const a = arrow(), ang = (i * TAU) / 6; a.position.set(G[0] + 1.2 * Math.cos(ang), 0.15, 1.2 * Math.sin(ang)); a.rotation.set(0, ang, 1.1); k.pop(a, 1.7, 1.8, 2.5, 2.6); }
        k.sparks(G, 1.7, 30);
      }
      k.extras(G, T);
    } }),

  // 3. charged piercing shot in a straight line
  SKILL('archer/lance-shot', 'Lance shot', m(['air', 'steel'], 'charged-pierce', 1.0, 12, 12, 'line'), 1.8, {
    view: 'long',
    act: ACT_BOW(0.12, 1.0),
    // P3=191
    build(fx, o) {
      const k = kit(fx, o, AIR), E = [6.5, 1.35, 0], HIT = [4.2, 1.3, 0], T = 0.12;
      const path = (t) => lerp3(A, E, clamp((t - T) / 0.2));
      // charge gathers at the hand, then the beam and the arrow leave
      k.gather(O, -0.8, 0.75, 0.6, 60, k.at());
      k.em({ count: 10, kind: 'soft', shape: 'point', size: [0.25, 0.1], follow: k.at(), delay: -0.8, emit: 0.8, t0: -0.82 });
      k.beam({ from: A, to: [6, 1.4, 0], r: [0.04, 0.04], t0: 0, dur: 0.12 });
      fly(fx, path, T, 0.25);
      k.trail({ path, t0: T, dur: 0.25, len: 0.6, width: 0.1 });
      k.ring({ r: [0.2, 1.2], normal: [1, 0, 0], pos: A, t0: 0, dur: 0.3 });
      k.ring({ r: [0.2, 1.2], normal: [1, 0, 0], pos: HIT, t0: T, dur: 0.3 });
      k.sparks(HIT, T, 50, { dir: [1, 0.2, 0] });
      k.smoke({ count: 30, shape: 'line', shapeSize: [1.8, 0, 0], pos: [2.6, 1.4, 0], ramp: DUST, delay: T, emit: 0.001, t0: T });
      fx.flash(T, 0.1, k.col(0), 0.15);
      if (k.g >= 2) for (let i = 0; i < 3; i++) {
        const pts = Array.from({ length: 24 }, (_, j) => { const u = j / 23, p = lerp3(A, E, u), a = 3 * TAU * u + (i * TAU) / 3; return [p[0], p[1] + 0.15 * Math.cos(a), p[2] + 0.15 * Math.sin(a)]; });
        k.ribbon({ points: pts, n: 23, width: 0.03, sweep: [0, 1.5], t0: 0.02, dur: 0.3 });
      }
      if (k.g === 3) {
        k.ring({ r: [0.2, 1.2], normal: [1, 0, 0], pos: HIT, t0: T + 0.1, dur: 0.4 });
        k.beam({ from: A, to: [6, 1.4, 0], r: [0.04, 0.04], t0: T, dur: 0.6, intensity: 0.3 });
      }
      k.extras(HIT, T);
    } }),

  // 4. parabolic arrow that plants a frost trap on the ground
  SKILL('archer/frost-trap-arrow', 'Frost trap arrow', m(['frost'], 'trap-zone', 0.6, 15, 8, 'circle'), 2.6, {
    view: 'wide',
    act: ACT_BOW(0.3),
    // P3=191
    build(fx, o) {
      const k = kit(fx, o, FROST), G = [3, 0, 0], T = 0.3;
      const P = (t) => { const u = clamp(t / T); return [A[0] + (G[0] - A[0]) * u, A[1] + (G[1] - A[1]) * u + 0.7 * Math.sin(Math.PI * u), A[2] * (1 - u)]; };
      fly(fx, P, 0, T + 0.05);
      k.decal({ kind: 'frost', r: [0.3, 1.8], pos: G, t0: T, reveal: 0.5, cells: 6 });
      // 9 ice cones pop up on a ring of radius 1
      for (let i = 0; i < 9; i++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 6), new THREE.MeshStandardMaterial({ color: '#bfe8ff', roughness: 0.1, emissive: '#2a6fb5', emissiveIntensity: 0.3 }));
        const a = (i * TAU) / 9; c.position.set(G[0] + Math.cos(a), 0.17, Math.sin(a));
        k.pop(c, 0.35 + 0.03 * i, 0.5 + 0.03 * i, 2.2, 2.6);
      }
      k.smoke({ count: 50, shape: 'disc', radius: 1.2, pos: G, ramp: VAPOR, delay: T, emit: 1.5 });
      k.em({ count: 60, kind: 'flake', shape: 'disc', radius: 1.5, pos: G, gravity: [0, 0.3, 0], delay: T, emit: 1.5 });
      k.ring({ r: [0.2, 2], normal: 'up', pos: G, t0: T, dur: 0.6 });
      k.light({ pos: [G[0], 1.5, 0.8], t0: T, dur: 1.5, intensity: 60 });
      fx.flash(T, 0.1, k.col(1), 0.15);
      if (k.g >= 2) k.em({ count: 40, kind: 'shard', shape: 'point', pos: G, delay: T, emit: 0.001, t0: T, speed: [2, 6], gravity: [0, -9, 0] });
      if (k.g === 3) {
        // 5 larger spikes at 0.9, plus a ring
        for (let i = 0; i < 5; i++) {
          const c = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.6, 6), new THREE.MeshStandardMaterial({ color: '#bfe8ff', roughness: 0.1, emissive: '#2a6fb5', emissiveIntensity: 0.3 }));
          const a = (i * TAU) / 5; c.position.set(G[0] + 0.9 * Math.cos(a), 0.3, 0.9 * Math.sin(a));
          k.pop(c, 0.9 + 0.03 * i, 1.0 + 0.03 * i, 2.2, 2.6);
        }
        k.ring({ r: [0.2, 2.2], normal: 'up', pos: G, t0: 0.9, dur: 0.5 });
      }
      k.extras(G, T);
    } }),

  // 5. body buff while drawing the bow: eye glint, bow rings and a focus swirl
  SKILL('archer/hawk-focus', 'Hawk focus', m(['holy', 'air'], 'buff-aura', 0.5, 25, 0, 'self'), 2.6, {
    body: true, view: 'body',
    // P3=171
    build(fx, o) {
      const k = kit(fx, o, HOLY), E = [0.1, 1.55, 0.2], D0 = 2.6;
      fx.body.setPose(POSES.bowDraw);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(D0 - 0.6, D0, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30);
      const bow = bowOf(fx, k);
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: D0, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / D0), intensity: 40 });
      fx.flash(0.3, 0.1, k.col(0), 0.12);
      k.em({ count: 30, kind: 'glint', shape: 'point', pos: E, size: [0.3, 0.1], life: [0.3, 0.3], delay: 0.3, emit: 2.2 });
      k.ring({ r: [0.55, 0.55], width: [0.03, 0.03], normal: [1, 0, 0], pos: A, t0: 0.3, dur: 2.1, decay: 0 });
      k.ring({ r: [0.55, 0.55], width: [0.03, 0.03], normal: [0, 0, 1], pos: A, t0: 0.3, dur: 2.1, decay: 0 });
      k.em({ count: 40, kind: 'soft', shape: 'ring', radius: 0.55, rot3: [0, 0, Math.PI / 2], swirl: 3, follow: (mm) => mm.position.copy(bow.position), delay: 0.3, emit: 2.1 });
      // 6 ribbons converge from 2 m out onto the eye
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6, S = [E[0] + 2 * Math.cos(a), E[1] + 2 * Math.sin(a), E[2]];
        k.ribbon({ points: Array.from({ length: 8 }, (_, j) => lerp3(S, E, j / 7)), n: 7, width: 0.02, sweep: [0, 1.5], t0: 0, dur: 0.3 });
      }
      if (k.g >= 2) { k.decal({ kind: 'rune', r: [0.4, 0.4], pos: [4, 0, 0], t0: 0.3 }); k.ring({ r: [0.2, 0.8], normal: 'cam', pos: [4, 1.2, 0], t0: 0.3, dur: 0.6 }); }
      if (k.g === 3) k.em({ count: 30, kind: 'petal', shape: 'ring', radius: 0.6, pos: E, swirl: 3, blend: 'normal', lit: 1, delay: 0.3, emit: 2.2 });
      k.extras([0, 1.1, 0], 0.3);
    } }),

  // 6. flaming arrow that explodes on impact
  SKILL('archer/blast-bolt', 'Blast bolt', m(['fire', 'steel'], 'projectile-explode', 0.7, 10, 9, 'point'), 2.2, {
    view: 'long',
    act: ACT_BOW(0.3),
    // P3=421
    build(fx, o) {
      const k = kit(fx, o, FIRE), B = [4, 1.2, 0], T = 0.3;
      const P = (t) => { const u = clamp(t / T); return [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u + 0.2 * Math.sin(Math.PI * u), A[2] * (1 - u)]; };
      // flight: arrow mesh with a flame tail
      fly(fx, P, 0, T + 0.05);
      k.em({ count: 40, kind: 'flame', shape: 'point', aspect: 1.6, intensity: 0.5, follow: (mm, ta, t) => mm.position.set(...P(t)), delay: 0, emit: T, t0: 0, t1: T + 0.3 });
      // impact at B
      k.orb({ kind: 'fire', r: [0.3, 1.5], pos: B, t0: T, dur: 0.7, fade: [0, 0.5], noise: 1.8 });
      k.em({ count: 80, kind: 'flame', shape: 'sphere', radius: 0.5, pos: B, delay: T, emit: 0.05, t0: T - 0.02, intensity: 0.45 });
      k.smoke({ count: 60, shape: 'sphere', radius: 0.6, pos: B, delay: 0.4, emit: 0.5 });
      k.sparks(B, T, 80);
      k.ring({ r: [0.2, 4], normal: 'up', pos: B, t0: T, dur: 0.6 });
      k.decal({ kind: 'scorch', r: [2, 2.6], pos: [B[0], 0, 0], t0: T });
      k.light({ pos: [B[0], 1.6, 0.8], t0: T, dur: 1.2, intensity: 200 });
      fx.flash(T, 0.2, '#fff', 0.25);
      if (k.g >= 2) for (const [dx, t] of [[-0.5, 0.45], [0, 0.5], [0.5, 0.55]]) k.em({ count: 20, kind: 'soft', shape: 'point', pos: [B[0] + dx, B[1], 0], delay: t, emit: 0.001, t0: t - 0.02 });
      if (k.g === 3) {
        k.shell({ r: [0.2, 2], hemi: true, t0: T, dur: 0.4 });
        k.em({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.4, pos: B, gravity: [0, 2, 0], speed: [0.5, 1.5], delay: T, emit: 1.2, t0: T });
      }
      k.extras(B, T);
    } }),
];
