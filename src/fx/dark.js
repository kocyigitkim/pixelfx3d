// Dark class: 6 void and blood skills (PLAN2 B10). Built from the T-NOV, T-GND, T-LEP and T-MEL-style templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, metal, addMat, VOID, BLOOD } from './_skill.js';

const m = meta('dark', 'class');
const A = [0.6, 1.38, 0.2]; // caster cast hand
const lerp3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
const VDARK = [[0, '#2a1a40', 0], [0.15, '#140a22', 0.55], [1, '#05030a', 0]]; // normal-blend violet-black smoke
const BLOODMIST = [[0, '#7a0010', 0], [0.15, '#4a0008', 0.55], [1, '#200004', 0]];

export default [
  SKILL('dark/soul-rend', 'Soul rend', m(['void'], 'curse-beam', 0.5, 12, 7, 'line'), 2.4, {
    view: 'side', sky: 'dark',
    act: act('cast', 0.3, 3.4, { hits: [{ t: 0.7, stop: 0.02, shake: 0.15, amp: 0.04, push: 0 }, { t: 1.1, stop: 0.02, shake: 0.15, amp: 0.04, push: 0 }, { t: 1.5, stop: 0.02, shake: 0.15, amp: 0.04, push: 0 }] }),
    // P3=201
    build(fx, o) {
      const k = kit(fx, o, VOID);
      const T = [3.4, 1.2, 0];
      k.beam({ from: T, to: A, r: [0.08, 0.08], noise: 1.2, intensity: 1.2, t0: 0.1, dur: 1.5 });
      const helix = (ph) => (t) => Array.from({ length: 21 }, (_, j) => { const u = j / 20, a = ph + TAU * (2 * u + t); return [T[0] + (A[0] - T[0]) * u, T[1] + (A[1] - T[1]) * u + 0.12 * Math.cos(a), T[2] + (A[2] - T[2]) * u + 0.12 * Math.sin(a)]; });
      k.ribbon({ points: helix(0), n: 20, width: 0.03, t0: 0.1, dur: 1.5 });
      k.ribbon({ points: helix(Math.PI), n: 20, width: 0.03, t0: 0.1, dur: 1.5 });
      fx.on((t) => { fx.target.position.z = t >= 0.1 && t <= 1.7 ? 0.03 * Math.sin((TAU * 12 * t) / 2.4) : 0; });
      k.em({ count: 60, kind: 'soft', shape: 'sphere', radius: 0.1, pos: T, dir: [-1, 0, 0], spread: 0.8, speed: [1.5, 3], life: [0.3, 0.5], size: [0.12, 0.03], intensity: 0.8, delay: 0.1, emit: 1.5, t0: 0.1 });
      k.smoke({ count: 30, shape: 'sphere', radius: 0.3, pos: T, dir: [0, 1, 0], speed: [0.3, 0.8], delay: 0.1, emit: 1.5, t0: 0.1 });
      k.ring({ t0: 0.1, dur: 0.5, r: [0.2, 1.2], normal: 'cam', pos: T });
      k.gather(A, 0.1, 1.2, 0.8, 30);
      k.light({ pos: [1.5, 1.4, 0.6], t0: 0, dur: 2.4, flicker: 0.2 });
      if (k.g >= 2) {
        const face = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), addMat(k.col(1), 1.2, 0.5));
        fx.mesh(face, (t) => { face.position.set(T[0], 1.6, 0); face.scale.setScalar(1 + 0.06 * Math.sin((TAU * 2 * t) / 2.4)); }, { t0: 0.1, dur: 1.6 });
      }
      if (k.g === 3) {
        k.em({ count: 40, kind: 'shard', shape: 'point', pos: T, delay: 1.6, t0: 1.58, speed: [2, 6], gravity: [0, -9, 0], bounce: 0.3 });
        fx.flash(1.7, 0.1, k.col(0), 0.15);
      }
      k.extras(T, 1.5);
    } }),

  SKILL('dark/shadow-spears', 'Shadow spears', m(['void'], 'line-eruption', 0.5, 10, 6, 'line'), 2.2, {
    view: 'side', sky: 'dark',
    act: act('smash', 0.45, 3.4),
    // P3=205
    build(fx, o) {
      const k = kit(fx, o, VOID);
      const T = [3.4, 1.2, 0];
      const spearMat = new THREE.MeshStandardMaterial({ color: '#120818', emissive: '#5a20a0', emissiveIntensity: 0.6 });
      const geo = new THREE.ConeGeometry(0.1, 1.4, 4);
      for (let i = 0; i < 7; i++) {
        const x = 0.8 + (2.6 * i) / 6, t0 = 0.05 + 0.06 * i;
        const sp = new THREE.Mesh(geo, spearMat);
        sp.position.set(x, 0.7, 0);
        sp.rotation.z = (fx.rng() * 2 - 1) * 0.2;
        k.pop(sp, t0, t0 + 0.12, 1.4, 1.9);
        k.decal({ kind: 'glow', r: [0.4, 0.4], pos: [x, 0, 0], t0, dur: 1.6 });
        k.smoke({ count: 12, shape: 'disc', radius: 0.2, pos: [x, 0.05, 0], delay: t0, emit: 0.001, t0 });
        k.ring({ t0, dur: 0.4, r: [0.1, 0.5], normal: 'up', pos: [x, 0.02, 0] });
      }
      k.sparks(T, 0.45, 40);
      const L = k.light({ pos: [0.8, 1.2, 0.6], t0: 0, dur: 2.2, fade: [0.1, 0.5] });
      fx.on((t) => { L.l.position.x = 0.8 + 2.6 * sm(0, 1.2, t); });
      if (k.g >= 2) k.em({ count: 40, kind: 'shard', shape: 'point', pos: [3.4, 1.4, 0], delay: 0.45, t0: 0.43, speed: [2, 6], gravity: [0, -9, 0], emit: 0.001 });
      if (k.g === 3) {
        const big = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.68, 4), spearMat);
        big.position.set(3.4, 0.84, 0);
        k.pop(big, 0.45, 0.6, 1.9, 2.2);
        k.ring({ t0: 0.45, dur: 0.5, r: [0.2, 2.4], normal: 'cam', pos: T });
      }
      k.extras(T, 0.45);
    } }),

  SKILL('dark/dread-howl', 'Dread howl', m(['void'], 'nova-fear', 0.4, 18, 5, 'circle'), 2.2, {
    view: 'wide', sky: 'dark',
    act: act('none', null, 2.6, { keys: [[-0.5, 'guard'], [-0.25, 'crouch'], [0, 'roar', 'snap'], [0.8, 'roar'], [1.4, 'guard']], hits: [{ t: 0.1, stop: 0.06, shake: 0.2, amp: 0.03, push: 1.5 }] }),
    // P3=261
    build(fx, o) {
      const k = kit(fx, o, VOID);
      k.gather([0, 1, 0], -0.45, 0.4, 1.4, 60);
      k.ring({ t0: 0, dur: 0.7, r: [0.2, 4.5], normal: 'up', width: [0.4, 0.08], fill: 0.08 });
      k.ring({ t0: 0.02, dur: 0.45, r: [0.2, 2.6], normal: 'cam', pos: [0, 1, 0] });
      k.shell({ r: [0.3, 2.4], hemi: true, power: 2, t0: 0, dur: 0.45, fade: [0, 0.35], ramp: [[0, '#0a0218', 1], [1, '#3a1080', 0.6]] });
      k.smoke({ count: 80, shape: 'sphere', radius: 0.3, pos: [0, 1, 0], radial: 1, speed: [1.5, 3], ramp: VDARK, delay: 0, emit: 0.5 });
      k.em({ count: 80, kind: 'soft', shape: 'sphere', radius: 0.3, pos: [0, 1, 0], radial: 1, speed: [2, 4], delay: 0, emit: 0.5 });
      k.light({ pos: [0, 1.4, 0.8], t0: -0.4, dur: 1.4, env: (t) => (t < 0 ? 0.3 : Math.exp(-2.5 * t)), intensity: 120 });
      fx.flash(0, 0.15, '#2a0040', 0.2);
      // 6 fear faces radiating out from head height and fading
      const FEAR = new THREE.MeshStandardMaterial({ color: '#15101c', roughness: 0.9 }), EYE = new THREE.MeshBasicMaterial({ color: '#000000' });
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6, g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), FEAR));
        for (const x of [-0.09, 0.09]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), EYE); e.position.set(x, 0.05, 0.22); g.add(e); }
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.03), EYE); mouth.position.set(0, -0.08, 0.23); g.add(mouth);
        g.rotation.y = Math.PI / 2 - a;
        fx.mesh(g, (t) => { const r = 0.3 + 2.2 * sm(0, 0.8, t); g.position.set(r * Math.cos(a), 1.4, r * Math.sin(a)); g.scale.setScalar(Math.max(1e-3, 1 - sm(0.8, 1.6, t))); }, { t0: 0, dur: 1.6 });
      }
      k.extras([0, 1, 0], 0.1);
      if (k.g >= 2) k.ring({ t0: 0.3, dur: 0.5, r: [0.2, 2.2], normal: 'cam', pos: [0, 1.2, 0] });
      if (k.g === 3) {
        k.decal({ kind: 'cracks', r: [2.5, 2.5], t0: 0.1, dur: 1.9, reveal: 0.3, heat: [1, 0.1], cells: 4, y: 0.005 });
        fx.shake(0.1, 0.3, 0.05);
      }
    } }),

  SKILL('dark/blood-pact', 'Blood pact', m(['blood'], 'life-steal', 0.4, 15, 6, 'point'), 2.4, {
    view: 'side', sky: 'dark',
    act: act('cast', 0.2, 3),
    // P3=191
    build(fx, o) {
      const k = kit(fx, o, BLOOD);
      const S = [3, 1.2, 0], CP = [1.5, 2.2, 0], E = [0.1, 1.3, 0];
      const q = (u) => [0, 1, 2].map((j) => (1 - u) * (1 - u) * S[j] + 2 * (1 - u) * u * CP[j] + u * u * E[j]);
      k.ring({ t0: 0.2, dur: 0.6, r: [0.2, 1.2], normal: 'cam', pos: S });
      k.sparks(S, 0.2, 30);
      const arrive = (t) => { let v = 0; for (let i = 0; i < 7; i++) { const dt = t - (1 + 0.07 * i); if (dt >= 0 && dt < 0.3) v = Math.max(v, 1 - dt / 0.3); } return v; };
      for (let i = 0; i < 7; i++) {
        const d = 0.3 + 0.07 * i, a = 1 + 0.07 * i, u = (t) => clamp((t - d) / (a - d));
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), addMat('#ff3a3a', 2));
        fx.mesh(orb, (t) => orb.position.set(...q(u(t))), { t0: d, dur: a - d });
        k.trail({ path: (t) => q(u(t)), t0: d, dur: a - d, len: 0.3, width: 0.05 });
      }
      fx.on((t) => fx.body.set({ tint: k.col(1), tintAmt: 0.15 * arrive(t) }));
      k.ring({ t0: 0.9, dur: 0.6, r: [0.2, 1.4], normal: 'up', pos: [0, 0.02, 0] });
      k.em({ count: 30, kind: 'drop', shape: 'sphere', radius: 0.25, pos: S, dir: [-1, 0, 0], speed: [1, 2], gravity: [0, -6, 0], life: [0.4, 0.8], delay: 0.2, emit: 0.6, t0: 0.2 });
      k.light({ pos: [0.5, 1.3, 0.6], t0: 0, dur: 2.4, fade: [0.1, 0.6] });
      if (k.g >= 2) k.smoke({ count: 30, shape: 'sphere', radius: 0.3, pos: S, ramp: BLOODMIST, delay: 0.2, emit: 0.6, t0: 0.2 });
      if (k.g === 3) {
        k.em({ count: 60, kind: 'soft', shape: 'sphere', radius: 0.3, pos: [0, 1, 0], dir: [0, 1, 0], speed: [0.5, 1.2], life: [0.5, 0.9], delay: 1, emit: 1, t0: 1 });
        k.ring({ t0: 1.0, dur: 0.5, r: [0.2, 1.6], normal: 'cam', pos: [0, 1.2, 0] });
      }
      k.extras([0, 1.2, 0], 1.0);
    } }),

  SKILL('dark/void-chains', 'Void chains', m(['void'], 'bind', 0.4, 14, 6, 'point'), 2.6, {
    view: 'wide', sky: 'dark',
    act: act('throw', 0.35, 3, { hits: [{ t: 0.35, stop: 0.1, shake: 0.3, amp: 0.04, push: 0 }] }),
    // P3=131
    build(fx, o) {
      const k = kit(fx, o, VOID);
      const CH = [3, 1.2, 0];
      const cm = metal('#2a2030', '#7a30d0', 0.6);
      // 3 rune points around the target; each chain runs from its rune to the chest
      const RUNES = [0, 1, 2].map((i) => { const a = 0.5 + (i * TAU) / 3; return [3 + Math.cos(a), 0, Math.sin(a)]; });
      const chain = (from) => {
        for (let j = 0; j < 14; j++) {
          const L = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 10), cm);
          L.position.set(...lerp3(from, CH, (j + 0.5) / 14));
          L.rotation.y = j % 2 ? Math.PI / 2 : 0;
          // links appear from the rune end, then retract toward the rune over [2.1, 2.5]
          fx.mesh(L, (t) => { L.visible = j < Math.floor(14 * sm(0.2, 0.45, t) * (1 - sm(2.1, 2.5, t))); }, { t0: 0, dur: 2.6 });
        }
      };
      for (const R of RUNES) {
        k.decal({ kind: 'rune', r: [0.3, 0.3], pos: R, t0: 0, dur: 2.6 });
        chain([R[0], 0.3, R[2]]);
      }
      const bind = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 8, 24), addMat(k.col(0), 2, 0.9));
      bind.position.set(3, 1.1, 0);
      bind.rotation.x = Math.PI / 2;
      k.pop(bind, 0.45, 0.6, 2.2, 2.6);
      k.smoke({ count: 30, shape: 'sphere', radius: 0.6, pos: [3, 0.4, 0], dir: [0, 1, 0], speed: [0.2, 0.6], delay: 0.35, emit: 1, t0: 0.35 });
      k.sparks(CH, 0.35, 30);
      k.gather(CH, 0, 0.35, 1.2, 30);
      k.light({ pos: [3, 1.4, 0.8], t0: 0.3, dur: 2.2, fade: [0.1, 0.6] });
      if (k.g >= 2) chain([3, 3.2, 0]); // 4th chain from above (no particles)
      if (k.g === 3) {
        for (const R of RUNES) k.bolt({ from: [R[0], 0.3, R[2]], to: CH, t0: 0.5, dur: 0.7 });
      }
      k.extras(CH, 0.35);
    } }),

  SKILL('dark/bane-sigil', 'Bane sigil', m(['void', 'blood'], 'delayed-blast', 0.6, 16, 6, 'circle'), 2.8, {
    view: 'wide', sky: 'dark',
    act: act('cast', 1.5, 3),
    // P3=329
    build(fx, o) {
      const k = kit(fx, o, VOID);
      const G = [3, 0, 0];
      const PENT = [0, 1, 2, 3, 4].map((i) => { const a = (i * TAU) / 5; return [3 + 1.8 * Math.cos(a), 0, 1.8 * Math.sin(a)]; });
      k.decal({ kind: 'rune', r: [1.8, 1.8], glyphs: 12, poly: 5, reveal: 0.6, t0: 0, dur: 1.5 });
      for (const t0 of [1.0, 1.2, 1.35]) k.ring({ t0, dur: 0.4, r: [2, 0.2], normal: 'up', pos: [3, 0.02, 0] });
      k.gather([3, 0.3, 0], 0, 1.5, 1.8, 80);
      // blast at 1.5
      k.beam({ pos: G, height: 5, r: [1.2, 0.6], intensity: 0.5, t0: 1.5, dur: 1.3 });
      k.orb({ kind: 'void', r: [0.3, 1.4], pos: [3, 1, 0], intensity: 0.5, t0: 1.5, dur: 1.3 });
      k.ring({ t0: 1.5, dur: 0.8, r: [0.2, 5], normal: 'up', pos: [3, 0.02, 0] });
      k.sparks([3, 0.5, 0], 1.5, 80);
      k.smoke({ count: 50, shape: 'disc', radius: 1, pos: [3, 0.05, 0], radial: 1, speed: [1, 3], delay: 1.5, emit: 0.001, t0: 1.5 });
      k.light({ pos: [3, 1.2, 0.8], t0: 1.5, dur: 1.3, env: (t) => Math.exp(-2.4 * t), intensity: 90 });
      fx.shake(1.5, 0.5, 0.06);
      fx.flash(1.5, 0.15, k.col(0), 0.2);
      k.decal({ kind: 'scorch', r: [1.2, 1.6], pos: G, t0: 1.5, dur: 1.3 });
      if (k.g >= 2) for (const p of PENT) k.beam({ pos: p, height: 1.5, r: [0.1, 0.1], t0: 1.3, dur: 1.5 });
      if (k.g === 3) {
        // second blast at 1.9 at 0.6 strength
        k.sparks([3, 0.5, 0], 1.9, 48);
        k.smoke({ count: 30, shape: 'disc', radius: 1, pos: [3, 0.05, 0], radial: 1, speed: [1, 3], delay: 1.9, emit: 0.001, t0: 1.9 });
        k.ring({ t0: 1.9, dur: 0.5, r: [0.2, 3], normal: 'cam', pos: [3, 1, 0] });
      }
      k.extras([3, 1, 0], 1.5);
    } }),
];
