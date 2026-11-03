// Swamp class: 5 water+earth+swamp derived skills (PLAN2 B19). Built from the T-WHP, T-BUF and T-GND templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, metal, rock, SWAMP, MUD } from './_skill.js';
import { bladeTable, contact } from './melee.js';

const m = meta('swamp', 'derived');
const G = [3, 0, 0];     // ground target
const T = [2.2, 1.35, 0.1]; // whip tip
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });
/** thin reed (cylinder) that pops up at (x, z) */
const reed = (fx, k, x, z, h, t0, mat = rock('#4f7a30')) => { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.4, 5), mat); r.position.set(x, 0.7 * h, z); k.pop(r, t0, t0 + 0.4, 99, 100, null); return r; };

export default [
  SKILL('swamp/mire-trap', 'Mire trap', m(['water', 'earth', 'swamp'], 'trap-sink', 0.5, 14, 6, 'circle'), 3.0, {
    view: 'wide',
    act: act('throw', 0.6, 3, { hits: [{ t: 0.6, stop: 0.06, shake: 0.2, amp: 0.03, push: 0 }] }),
    // P3=303
    build(fx, o) {
      const k = kit(fx, o, SWAMP);
      const A = [0.6, 1.38, 0.2];
      const P = (t) => { const u = clamp(t / 0.6); return [A[0] + (G[0] - A[0]) * u, A[1] + (G[1] - A[1]) * u + 1.2 * Math.sin(Math.PI * u), A[2] * (1 - u)]; };
      const fol = (mm, ta, t) => mm.position.set(...P(t));
      k.trail({ path: P, t0: 0, dur: 0.65, len: 0.3, width: 0.12 });
      k.em({ count: 20, kind: 'drop', shape: 'sphere', radius: 0.1, dir: [1, 0, 0], spread: 0.8, speed: [0.3, 1], life: [0.25, 0.45], size: [0.12, 0.03], intensity: 0.8, delay: 0, emit: 0.6, t1: 0.7, follow: fol }); // 20
      fx.water({ r: 1.2, pos: G, deep: '#1c3a14', shallow: '#4e8a2a', vortex: 0.3, ripples: [{ t: 0.6, x: 0, z: 0, amp: 0.3 }] });
      k.em({ count: 60, kind: 'bubble', shape: 'disc', radius: 1.2, pos: G, dir: [0, 1, 0], speed: [0.05, 0.25], life: [1, 2], size: [0.06, 0.1], intensity: 1.2, emit: 2.6 }); // 60
      k.em({ count: 50, kind: 'drop', shape: 'disc', radius: 0.8, pos: G, dir: [0, 1, 0], speed: [1, 3], life: [0.5, 1], size: [0.1, 0.05], gravity: [0, -9, 0], delay: 0.6, emit: 0.001 }); // 50
      k.smoke({ count: 30, ramp: MUD, shape: 'disc', radius: 1, pos: G, dir: [0, 1, 0], speed: [0.2, 0.6], life: [1.5, 2.5], size: [0.5, 1], emit: 2.4 }); // 30
      k.em({ count: 30, kind: 'soft', shape: 'disc', radius: 1.0, pos: G, dir: [0, 1, 0], speed: [0.1, 0.4], life: [1.5, 2.5], size: [0.08, 0.04], ramp: SWAMP, emit: 2.4 }); // 30
      fx.on((t) => { fx.target.position.y = -0.3 * sm(0.6, 2, t); });
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.35, 16, 1, true), rock('#2c3016'));
      skirt.position.set(...G); skirt.position.y = 0.15;
      fx.mesh(skirt, () => {}, { t0: 0.5, dur: 2.5 });
      k.light({ pos: [G[0], 1, 0.8], t0: 0, dur: 3.0, fade: [0.1, 0.6], intensity: 30 });
      k.decal({ kind: 'scorch', r: [1, 1.4], pos: G, t0: 0.6, dur: 2.4 });
      ct(fx, k, G, 0.6, 30); // 32
      if (k.g >= 2) for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; reed(fx, k, G[0] + 1.2 * Math.cos(a), G[2] + 1.2 * Math.sin(a), 1, 0.3 + 0.1 * i); }
      if (k.g === 3) k.em({ count: 40, kind: 'drop', shape: 'sphere', radius: 0.5, pos: G, dir: [0, 1, 0], spread: 1, speed: [2, 4], life: [0.4, 0.8], size: [0.12, 0.05], gravity: [0, -9, 0], delay: 0.6, emit: 0.001 }); // 40
      k.extras(G, 0.6);
    } }),

  SKILL('swamp/spore-lash', 'Spore lash', m(['water', 'earth', 'swamp'], 'whip', 0.3, 6, 3, 'arc'), 1.4, {
    view: 'side',
    act: { kind: 'throw', weapon: 'whip', target: [2.5, 0, 0], windup: 0.45, hits: [{ t: 0, stop: 0.07, shake: 0.12, amp: 0.025, push: 1 }] },
    // P3=249
    build(fx, o) {
      const k = kit(fx, o, SWAMP), N = 28;
      const Hd = bladeTable(fx, -0.45, 0.6, 0.25);
      const pts = (t) => {
        const h = Hd(t), e = 0.3 + 0.7 * sm(-0.2, 0, t), ar = 1 - sm(-0.2, 0, t), after = sm(0.02, 0.4, t), out = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N, q = u * e, s = Math.sin(Math.PI * u);
          out.push([h[0] + (T[0] - h[0]) * q - ar * s * 0.6 * (1 - u), h[1] + (T[1] - h[1]) * q + ar * s * 1.0 - after * s * 0.35 * u, h[2] + (T[2] - h[2]) * q + ar * 0.35 * Math.sin(u * 7 - t * 30) * s]);
        }
        return out;
      };
      k.ribbon({ points: (t) => pts(t), n: N, width: (u) => 0.05 * k.s * (1 - u * 0.6), head: () => 1.001, tail: 4, intensity: 1.0, t0: -0.45, dur: 1.3, fade: [0.05, 0.25] });
      k.ribbon({ points: (t) => pts(t), n: N, width: 0.02 * k.s, head: () => 1.001, tail: 4, intensity: 1.2, t0: -0.1, dur: 0.14, fade: [0.02, 0.1] });
      for (let i = 0; i < 6; i++) k.em({ count: 16, kind: 'glint', shape: 'point', dir: [0, 1, 0], spread: 1, speed: [0.3, 1], life: [0.6, 1.2], gravity: [0, -0.3, 0], turb: [0.4, 1], size: [0.06, 0.03], intensity: 1.5, emit: 0.8, follow: (mm, ta, t) => mm.position.set(...pts(t)[4 * i + 4]) }); // 96
      ct(fx, k, T, 0, 30); // 32
      k.smoke({ count: 20, ramp: SWAMP, shape: 'sphere', radius: 0.08, pos: T, dir: [0.3, 0.6, 0], spread: 1.4, speed: [0.3, 1.4], life: [0.6, 1.2], size: [0.2, 0.7], drag: 1.8, emit: 0.05 }); // 20
      k.light({ pos: T, t0: 0, dur: 0.6, fade: [0.02, 0.3], flicker: 0.3, intensity: 30 });
      fx.flash(0, 0.08, '#fff', 0.07);
      if (k.g >= 2) k.ribbon({ points: (t) => pts(t).map(([x, y, z]) => [x, y, -z]), n: N, width: (u) => 0.05 * k.s * (1 - u * 0.6), head: () => 1.001, tail: 4, t0: 0.45, dur: 0.9, fade: [0.05, 0.25] });
      if (k.g === 3) { k.em({ count: 60, kind: 'soft', shape: 'sphere', radius: 0.3, pos: [3, 0.5, 0], dir: [0, 1, 0], spread: 1, speed: [1, 3], life: [0.5, 1], size: [0.1, 0.05], intensity: 1.2, delay: 0.5, emit: 0.001 }); } // 60
      k.extras(T, 0);
    } }),

  SKILL('swamp/bog-tide', 'Bog tide', m(['water', 'earth', 'swamp'], 'slow-wave', 0.8, 16, 6, 'line'), 3.2, {
    view: 'long',
    act: act('sideslash', 1.4, 4),
    // P3=423
    build(fx, o) {
      const k = kit(fx, o, SWAMP);
      const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 3, 16, 1, false, 0, Math.PI), metal('#2c3016'));
      mound.material.roughness = 0.9; mound.material.metalness = 0; mound.rotation.x = Math.PI / 2;
      fx.mesh(mound, (t) => { const u = sm(0, 1.6, t); mound.position.set(0.8 + 3.2 * u, 0.5, 0); mound.visible = u > 0.01; }, { t0: 0, dur: 3.2 });
      const CR = (t) => [0.8 + 3.2 * sm(0, 1.6, t), 0.1, 0];
      k.em({ count: 80, kind: 'drop', shape: 'sphere', radius: 0.3, dir: [1, 0.4, 0], spread: 0.4, speed: [1, 3], life: [0.5, 1], size: [0.12, 0.05], gravity: [0, -9, 0], blend: 'normal', lit: 1, emit: 1.6, follow: (mm, ta, t) => mm.position.set(...CR(t)) }); // 80
      k.em({ count: 40, kind: 'bubble', shape: 'disc', radius: 1.5, pos: [2.5, 0.2, 0], dir: [0, 1, 0], speed: [0.05, 0.25], life: [1, 2], size: [0.06, 0.1], intensity: 1.2, emit: 3 }); // 40
      k.em({ count: 30, kind: 'petal', shape: 'disc', radius: 2, pos: [2.5, 0.3, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.2, 0.8], life: [1.5, 2.5], size: [0.12, 0.06], intensity: 0.8, emit: 3 }); // 30
      k.smoke({ count: 80, ramp: MUD.map((s, i) => (i === 1 ? [s[0], s[1], 0.6] : s)), shape: 'disc', radius: 1.6, pos: [2.5, 0.3, 0], dir: [0, 1, 0], speed: [0.2, 0.6], life: [1.5, 2.5], size: [0.6, 1.4], emit: 3 }); // 80
      k.decal({ kind: 'scorch', r: [0.6, 1], pos: [2.5, 0, 0], t0: 0, dur: 3.2 });
      k.em({ count: 40, kind: 'drop', shape: 'sphere', radius: 0.3, pos: [4, 0.4, 0], dir: [1, 0.2, 0], spread: 0.6, speed: [1, 3], life: [0.4, 0.8], size: [0.1, 0.05], gravity: [0, -9, 0], delay: 1.2, emit: 0.001 }); // 40
      ct(fx, k, [4, 1.2, 0], 1.4, 30); // 32
      k.ribbon({ points: (t) => { const x = CR(t)[0]; return [[x - 0.3, 0.15, 0], [x, 0.7, 0], [x + 0.3, 0.15, 0]]; }, n: 2, width: 0.35, intensity: 1.2, head: () => 1.001, fade: [0.05, 0.3], t0: 0, dur: 3.2 });
      k.em({ count: 50, kind: 'glint', shape: 'box', shapeSize: [0.4, 0.4, 2.2], dir: [0, 1, 0], speed: [0.3, 0.8], life: [0.6, 1.0], size: [0.08, 0.03], intensity: 2.2, delay: 0, emit: 1.6, t0: -0.02, follow: (m, a, t) => m.position.set(CR(t)[0], 0.4, 0) });
      k.light({ pos: [2.5, 1, 0.8], t0: 0, dur: 3.2, fade: [0.1, 0.6], intensity: 40 });
      if (k.g >= 2) { const m2 = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2, 16, 1, false, 0, Math.PI), metal('#2c3016')); m2.rotation.x = Math.PI / 2; m2.material.roughness = 0.9; m2.material.metalness = 0; fx.mesh(m2, (t) => { const u = sm(0.8, 2.4, t); m2.position.set(0.4 + 3.6 * u, 0.4, -0.5); m2.visible = u > 0.01; }, { t0: 0.8, dur: 2.4 }); }
      if (k.g === 3) k.em({ count: 30, kind: 'glint', shape: 'disc', radius: 1.5, pos: [3, 0.5, 0], dir: [0, 1, 0], speed: [0.2, 0.8], life: [0.4, 0.8], size: [0.12, 0.04], intensity: 2.5, delay: 1.4, emit: 1.5 }); // 30
      k.extras([4, 1.2, 0], 1.4);
    } }),

  SKILL('swamp/reed-snare', 'Reed snare', m(['water', 'earth', 'swamp'], 'bind', 0.5, 12, 6, 'point'), 2.8, {
    view: 'wide',
    act: act('cast', 0.5, 3),
    // P3=141
    build(fx, o) {
      const k = kit(fx, o, SWAMP);
      const TG = G;
      for (let i = 0; i < 14; i++) { const a = (i * TAU) / 14; reed(fx, k, TG[0] + 0.35 * Math.cos(a), TG[2] + 0.35 * Math.sin(a), 1, 0.3 + 0.03 * i); } // mesh only
      for (let i = 0; i < 3; i++) {
        const y = [0.5, 0.9, 1.3][i];
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 6, 24), rock('#4f7a30'));
        ring.rotation.x = Math.PI / 2; ring.position.set(TG[0], y, TG[2]);
        fx.mesh(ring, (t) => { const u = sm(0.3, 1.2, t); ring.scale.setScalar((1.4 - 0.4 * u)); ring.visible = u > 0.01; }, { t0: 0.3, dur: 2.5 });
      }
      k.em({ count: 30, kind: 'drop', shape: 'disc', radius: 0.5, pos: TG, dir: [0, 1, 0], spread: 0.6, speed: [0.5, 2], life: [0.4, 0.8], size: [0.1, 0.05], gravity: [0, -9, 0], delay: 0.5, emit: 0.001 }); // 30
      k.em({ count: 30, kind: 'soft', shape: 'sphere', radius: 0.6, pos: [TG[0], 0.8, 0], dir: [0, 1, 0], spread: 1, speed: [0.1, 0.5], life: [1, 2], size: [0.08, 0.04], ramp: SWAMP, turb: [0.3, 1], emit: 2.3 }); // 30
      k.decal({ kind: 'scorch', r: [0.8, 1.2], pos: TG, t0: 0.5, dur: 2.3 });
      k.em({ count: 20, kind: 'petal', shape: 'disc', radius: 0.5, pos: TG, dir: [0, 1, 0], spread: 1, speed: [0.5, 1.5], life: [1, 1.8], size: [0.12, 0.06], intensity: 0.8, delay: 0.3, emit: 1.5 }); // 20
      if (k.g >= 2) k.em({ count: 20, kind: 'glint', shape: 'sphere', radius: 0.4, pos: [TG[0], 1.2, 0], dir: [0, 1, 0], spread: 1, speed: [0.1, 0.4], life: [0.6, 1], size: [0.06, 0.03], intensity: 2, delay: 0.5, emit: 2 }); // 20
      if (k.g === 3) for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8 + 0.2; reed(fx, k, TG[0] + 0.9 * Math.cos(a), TG[2] + 0.9 * Math.sin(a), 1.2, 0.6 + 0.04 * i); }
      k.light({ pos: [TG[0], 1, 0.8], t0: 0.5, dur: 2.3, fade: [0.1, 0.5], intensity: 30 });
      k.extras(TG, 0.5);
    } }),

  SKILL('swamp/moss-regrowth', 'Moss regrowth', m(['water', 'earth', 'swamp'], 'heal-zone-bloom', 1.0, 25, 0, 'circle'), 3.4, {
    view: 'wide',
    act: act('castup', null, false),
    // P3=191
    build(fx, o) {
      const k = kit(fx, o, SWAMP), C = [1.5, 0, 0];
      k.decal({ kind: 'glow', r: [1.2, 2], pos: C, t0: 0, dur: 3.4 });
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12, x = C[0] + 1.3 * Math.cos(a), z = 1.3 * Math.sin(a), t0 = 0.3 + i * 0.18;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 5), rock('#3f6a25'));
        stem.position.set(x, 0.25, z); k.pop(stem, t0, t0 + 0.3, 99, 100, null);
        for (let j = 0; j < 5; j++) {
          const pa = (j * TAU) / 5, pet = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.12), metal('#7fc84a', '#7fc84a', 0.8));
          pet.material.side = THREE.DoubleSide; pet.position.set(x + 0.1 * Math.cos(pa), 0.5, z + 0.1 * Math.sin(pa)); pet.rotation.y = -pa; k.pop(pet, t0 + 0.1, t0 + 0.4, 99, 100, null);
        }
      }
      k.em({ count: 80, kind: 'soft', shape: 'disc', radius: 1.8, pos: [C[0], 0.2, 0], dir: [0, 1, 0], speed: [0.3, 1], life: [1.5, 2.5], size: [0.08, 0.04], intensity: 0.8, turb: [0.3, 1], delay: 0.2, emit: 2.6 }); // 80
      k.em({ count: 40, kind: 'petal', shape: 'disc', radius: 1.5, pos: [C[0], 0.3, 0], dir: [0, 1, 0], spread: 0.4, speed: [0.5, 1.5], life: [1.5, 2.5], size: [0.12, 0.06], intensity: 0.8, delay: 0.3, emit: 2.5 }); // 40
      for (let i = 0; i < 3; i++) k.ring({ t0: 0.2 + 0.6 * i, dur: 0.8, r: [0.2, 2.2], normal: 'up', pos: [C[0], 0.02, 0] });
      k.light({ pos: [C[0], 1.2, 0.8], t0: 0, dur: 3.4, fade: [0.2, 0.8], intensity: 40 });
      if (k.g >= 2) k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 1.6, pos: [C[0], 0.8, 0], dir: [0, 1, 0], spread: 1, speed: [0.05, 0.3], life: [1.5, 2.5], size: [0.06, 0.03], intensity: 2.5, delay: 0.5, emit: 2.5 }); // 30 fireflies
      if (k.g === 3) k.ring({ t0: 0.6, dur: 0.6, r: [0.2, 2.5], normal: 'cam', pos: [C[0], 1.2, 0] });
      k.extras([C[0], 1.2, 0], 0.4);
    } }),
];
