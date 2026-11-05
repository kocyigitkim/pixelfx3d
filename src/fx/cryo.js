// Cryo class: 8 tech skills with the CRYO ramp (PLAN2 B22). Built from the T-WHP, T-GND, T-HEL, T-ORB, T-BEAM and T-NOV templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, metal, addMat, DUST, CRYO } from './_skill.js';
import { bladeTable, contact } from './melee.js';

const m = meta('cryo', 'tech');
const T = [2.2, 1.35, 0.1]; // whip tip
const G = [3, 0, 0];         // ground target
/** nitrogen fog: VAPOR ramp with a cyan tint */
const VCY = [[0, '#afc0c0', 0], [0.15, '#90b7c0', 0.55], [1, '#478aa3', 0]]; // x0.75 to <= #b8c0c8 (V5 vapor exception)
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });

export default [
  SKILL('cryo/nitrogen-lash', 'Nitrogen lash', m(['water', 'cryo'], 'whip', 0.3, 6, 3, 'arc'), 1.4, {
    view: 'side', sky: 'night',
    act: { kind: 'throw', weapon: 'whip', target: [2.5, 0, 0], windup: 0.45, hits: [{ t: 0, stop: 0.07, shake: 0.12, amp: 0.025, push: 1 }] },
    // P3=222
    build(fx, o) {
      const k = kit(fx, o, CRYO), N = 28;
      const Hd = bladeTable(fx, -0.45, 0.6, 0.25);
      const pts = (t) => {
        const h = Hd(t), e = 0.3 + 0.7 * sm(-0.2, 0, t), ar = 1 - sm(-0.2, 0, t), after = sm(0.02, 0.4, t), out = [];
        for (let i = 0; i <= N; i++) {
          const u = i / N, q = u * e, s = Math.sin(Math.PI * u);
          out.push([h[0] + (T[0] - h[0]) * q - ar * s * 0.6 * (1 - u), h[1] + (T[1] - h[1]) * q + ar * s * 1.0 - after * s * 0.35 * u, h[2] + (T[2] - h[2]) * q + ar * 0.35 * Math.sin(u * 7 - t * 30) * s + after * 0.18 * Math.sin(u * 8 - t * 25) * u * (1 - after * 0.6)]);
        }
        return out;
      };
      k.ribbon({ points: (t) => pts(t), n: N, width: (u) => 0.05 * k.s * (1 - u * 0.6), head: () => 1.001, tail: 4, intensity: 1.0, t0: -0.45, dur: 1.3, fade: [0.05, 0.25] });
      k.ribbon({ points: (t) => pts(t), n: N, width: 0.02 * k.s, head: () => 1.001, tail: 4, intensity: 1.2, t0: -0.1, dur: 0.14, fade: [0.02, 0.1] });
      for (let i = 0; i < 6; i++) k.smoke({ ramp: VCY, count: 13, shape: 'point', dir: [0, 1, 0], spread: 1, speed: [0.3, 1], life: [0.6, 1.2], size: [0.2, 0.5], drag: 1.8, emit: 0.8, follow: (mm, ta, t) => mm.position.set(...pts(t)[4 * i + 4]) });
      k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 0.12, pos: T, speed: [0.2, 0.6], life: [0.2, 0.4], size: [0.15, 0.05], intensity: 2.5, emit: 0.6 });
      ct(fx, k, T, 0, 30, { lightI: 0 });
      const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.2, 8), metal('#8a929c'));
      const to = k.at('armR');
      fx.mesh(nozzle, () => to(nozzle), { t0: -0.45, dur: 1.4 });
      k.decal({ kind: 'frost', r: [0.6, 0.6], pos: [2.5, 0, 0], t0: 0.2, dur: 2.0 });
      if (k.g >= 2) k.smoke({ ramp: VCY, count: 40, shape: 'point', pos: T, dir: [1, 0.2, 0], spread: 0.8, speed: [1, 2], life: [0.8, 1.2], size: [0.3, 0.6], delay: 0.6, emit: 0.2 });
      if (k.g === 3) {
        k.decal({ kind: 'rune', r: [0.8, 0.8], pos: [2.5, 0, 0], t0: 0.4, dur: 0.8, glyphs: 6, poly: 6 });
        k.ring({ t0: 0.2, dur: 0.4, r: [0.2, 2], normal: 'cam', pos: T });
      }
      k.extras(T, 0);
    } }),

  SKILL('cryo/cryo-grenade', 'Cryo grenade', m(['water', 'cryo'], 'grenade-zone', 0.4, 14, 7, 'circle'), 2.6, {
    view: 'wide', sky: 'night',
    act: act('throw', 0.6, 3.2),
    // P3=248
    build(fx, o) {
      const k = kit(fx, o, CRYO), A = [0.6, 1.38, 0.2];
      const P = (t) => { const u = clamp(t / 0.6); return [A[0] + (G[0] - A[0]) * u, A[1] + (G[1] - A[1]) * u + 1.2 * Math.sin(Math.PI * u), A[2] + (G[2] - A[2]) * u]; };
      const can = new THREE.Group();
      can.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 8), metal('#8a929c')));
      for (const y of [-0.04, 0.04]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.008, 6, 16), addMat(k.col(1), 2)); b.rotation.x = Math.PI / 2; b.position.y = y; can.add(b); }
      fx.mesh(can, (t) => can.position.set(...P(t)), { t0: 0, dur: 0.65 });
      const cells = [];
      for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) cells.push([q, r]);
      for (const [q, r] of cells) {
        const x = 0.36 * (q + r / 2), z = (0.36 * r * Math.sqrt(3)) / 2, d = Math.hypot(x, z);
        const cell = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.2, 6), addMat(k.col(1), 2)); cell.rotation.x = -Math.PI / 2; cell.position.set(G[0] + x, 0.01, G[2] + z);
        const t1 = 0.6 + (0.6 * d) / 1.2; k.pop(cell, t1, t1 + 0.15, 2.4, 3.0);
      }
      k.smoke({ ramp: VCY, count: 100, shape: 'disc', radius: 0.4, pos: G, radial: 1, speed: [0.5, 1.5], life: [1.5, 2.5], size: [0.5, 1.0], delay: 0.6, emit: 0.2 });
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6, c = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), addMat(k.col(0), 2));
        fx.mesh(c, (t) => { const u = sm(0.6, 1.2, t); c.position.set(G[0] + Math.cos(a) * 0.6 * u, 0.15 + 0.3 * u, G[2] + Math.sin(a) * 0.6 * u); c.scale.setScalar(Math.max(1e-3, u)); }, { t0: 0.6, dur: 2.4 });
      }
      k.em({ count: 40, kind: 'flake', shape: 'disc', radius: 0.8, pos: G, dir: [0, 1, 0], spread: 0.6, speed: [0.5, 1.2], life: [1, 2], size: [0.05, 0.03], delay: 0.6, emit: 0.001 });
      if (k.g >= 2) {
        for (let i = 0; i < 12; i++) {
          const a = (i * TAU) / 12, cell = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.2, 6), addMat(k.col(1), 2));
          cell.rotation.x = -Math.PI / 2; cell.position.set(G[0] + Math.cos(a), 0.03, G[2] + Math.sin(a));
          k.pop(cell, 1.2 + 0.02 * i, 1.35 + 0.02 * i, 2.4, 3.0);
        }
      }
      if (k.g === 3) {
        k.em({ count: 30, kind: 'shard', shape: 'disc', radius: 0.6, pos: G, dir: [0, 1, 0], spread: 0.9, speed: [2, 4], life: [0.8, 1.4], size: [0.08, 0.04], gravity: [0, -9, 0], bounce: 0.3, delay: 0.6, emit: 0.001 });
        k.ring({ t0: 0.6, dur: 0.4, r: [0.2, 2.2], normal: 'cam', pos: G });
      }
      k.extras(G, 0.6);
    } }),

  SKILL('cryo/coolant-surge', 'Coolant surge', m(['water', 'cryo'], 'heal-wave', 0.6, 14, 0, 'circle'), 2.6, {
    body: true, view: 'body', sky: 'night',
    // P3=331
    build(fx, o) {
      const k = kit(fx, o, CRYO);
      fx.body.setPose(POSES.idle);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.2, 2.6, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30);
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6, node = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.12, 6), metal('#8a929c', k.col(1), 0.5));
        node.position.set(0.6 * Math.cos(a), 0.06, 0.6 * Math.sin(a));
        k.pop(node, 0.1 + 0.04 * i, 0.4 + 0.04 * i, 2.4, 2.6);
      }
      k.ring({ t0: 0.3, dur: 1.0, r: [0.2, 3], normal: 'up', fill: 0.3, pos: [0, 0.02, 0] });
      k.em({ count: 100, kind: 'drop', shape: 'ring', radius: 0.4, pos: [0, 0.2, 0], radial: 1, speed: [0.2, 0.6], gravity: [0, -2, 0], life: [1, 1.6], size: [0.05, 0.03], delay: 0.3, emit: 0.8 });
      k.smoke({ ramp: VCY, count: 50, shape: 'disc', radius: 0.5, pos: [0, 0.3, 0], dir: [0, 1, 0], speed: [0.2, 0.6], life: [1.2, 2], size: [0.4, 0.8], delay: 0.3, emit: 1.2 });
      k.decal({ kind: 'rune', r: [1.2, 1.2], pos: [0, 0, 0], t0: 0, dur: 2.4, glyphs: 6, poly: 6 });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 2.6, fade: [0.1, 0.6], flicker: 0, env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / 2.6), intensity: 40 });
      if (k.g >= 2) k.em({ count: 60, kind: 'soft', shape: 'ring', radius: 0.6, pos: [0, 0.2, 0], radial: 1, speed: [0.5, 1], life: [0.8, 1.2], delay: 1.4, emit: 0.8 });
      if (k.g === 3) k.em({ count: 50, kind: 'soft', shape: 'disc', radius: 0.6, pos: [0, 0.1, 0], dir: [0, 1, 0], speed: [0.5, 1.2], life: [1, 1.5], delay: 1.8, emit: 0.6 });
      k.extras([0, 1.1, 0], 0.3);
    } }),

  SKILL('cryo/ice-drone-swarm', 'Ice drone swarm', m(['water', 'cryo'], 'orbit-ram', 0.6, 14, 7, 'point'), 2.6, {
    view: 'wide', sky: 'night',
    act: act('cast', null, 3.6, { hits: [1.6, 1.8, 1.9].map((t) => ({ t, stop: 0.05, shake: 0.2, amp: 0.03, push: 1 })) }),
    // P3=113
    build(fx, o) {
      const k = kit(fx, o, CRYO), TG = [3.6, 1.2, 0], TF = 1.4, F = 0.4, N = k.g >= 2 ? 8 : 6;
      const orbit = (a0, t) => { const a = a0 + (TAU * t) / 1.6; return [0.5 + 1.1 * Math.cos(a), 1.2 + 0.25 * Math.sin(2 * a), 1.1 * Math.sin(a)]; };
      const path = (a0) => (t) => {
        if (t < TF) return orbit(a0, t);
        const s = orbit(a0, TF), u = clamp((t - TF) / F);
        return [s[0] + (TG[0] - s[0]) * u, s[1] + (TG[1] - s[1]) * u, s[2] + (TG[2] - s[2]) * u];
      };
      for (let i = 0; i < N; i++) {
        const P = path((i * TAU) / N), d = new THREE.Group();
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), metal('#8a929c'));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 16), addMat(k.col(1), 2)); ring.rotation.x = Math.PI / 2;
        const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.01, 0.03), metal('#5a626c')); f1.position.x = 0.09;
        const f2 = f1.clone(); f2.position.x = -0.09;
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), addMat(k.col(0), 2)); lamp.position.y = 0.08;
        d.add(core, ring, f1, f2, lamp); d.scale.setScalar(2.2);
        fx.mesh(d, (t) => d.position.set(...P(t)), { t0: -0.1, dur: TF + F + 0.15 });
        k.em({ count: 1, kind: 'glint', shape: 'point', size: [0.18, 0.1], life: [TF + F, TF + F], intensity: 1.5, delay: 0, emit: 0.001, t0: -0.1, t1: TF + F + 0.15, follow: (m) => m.position.copy(d.position) });
        k.trail({ path: P, t0: TF, dur: F + 0.05, len: 0.3, width: 0.05, intensity: 1.6 });
      }
      for (const h of [1.6, 1.8, 1.9]) {
        k.em({ count: 15, kind: 'shard', shape: 'sphere', radius: 0.15, pos: TG, radial: 1, speed: [2, 4], life: [0.4, 0.8], size: [0.08, 0.04], gravity: [0, -6, 0], delay: h, emit: 0.001 });
        k.smoke({ ramp: VCY, count: 6, shape: 'point', pos: TG, dir: [1, 0, 0], speed: [0.5, 1.5], life: [0.8, 1.2], size: [0.3, 0.6], delay: h, emit: 0.05 });
      }
      k.light({ pos: [3.6, 1.4, 0.8], t0: 1.5, dur: 1.2, fade: [0.02, 0.5], flicker: 0, intensity: 90 });
      if (k.g === 3) {
        k.decal({ kind: 'frost', r: [1.2, 1.2], pos: [3.6, 0, 0], t0: 1.9, dur: 2.0 });
        k.ring({ t0: 1.9, dur: 0.5, r: [0.2, 2], normal: 'cam', pos: TG });
      }
      k.extras(TG, 1.9, 'B');
    } }),

  SKILL('cryo/frost-rail', 'Frost rail', m(['water', 'cryo'], 'line-shot-trail', 0.5, 10, 10, 'line'), 2.4, {
    view: 'long', sky: 'night',
    act: act('cast', 0.05, 4.2),
    // P3=232
    build(fx, o) {
      const k = kit(fx, o, CRYO), to = k.at('armR'), A = [0.6, 1.38, 0.2], Tg = [3.8, 1.2, 0];
      const rails = new THREE.Group();
      for (const dz of [-0.05, 0.05]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.02), metal('#8a929c')); r.position.set(0.3, 0, dz); rails.add(r); }
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 6, 16), addMat(k.col(1), 2)); coil.rotation.y = Math.PI / 2; coil.position.x = 0.1; rails.add(coil);
      fx.mesh(rails, () => to(rails), { t0: -0.05, dur: 2.5 });
      k.beam({ from: A, to: Tg, r: [0.03, 0.03], intensity: 3, t0: 0, dur: 0.15, fade: [0.02, 0.05] });
      k.em({ count: 40, kind: 'shard', shape: 'point', pos: Tg, dir: [1, 0.2, 0], spread: 0.8, speed: [2, 5], life: [0.4, 0.8], gravity: [0, -6, 0], size: [0.06, 0.03], intensity: 1.5, delay: 0.05, emit: 0.001 });
      const out = k.g === 3 ? 1.8 : 9;
      for (let i = 0; i < 12; i++) {
        const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.1), addMat(k.col(1), 2));
        c.position.set(1.2 + 0.22 * i, 0.12, 0);
        k.pop(c, 0.05 + 0.03 * i, 0.25 + 0.03 * i, out, out + 0.2);
      }
      k.smoke({ ramp: VCY, count: 60, shape: 'line', shapeSize: [2.0, 0, 0], pos: [2.5, 1.25, 0], dir: [0, 1, 0], speed: [0.2, 0.8], life: [1, 1.6], size: [0.3, 0.7], delay: 0.05, emit: 1.2 });
      k.decal({ kind: 'frost', r: [0.6, 0.6], pos: Tg, t0: 0.1, dur: 2.2 });
      if (k.g >= 2) k.smoke({ ramp: VCY, count: 30, shape: 'point', follow: to, dir: [-1, 0.6, 0], speed: [0.5, 1.5], life: [0.6, 1], size: [0.2, 0.5], delay: 0.05, emit: 0.8 });
      if (k.g === 3) k.em({ count: 60, kind: 'shard', shape: 'sphere', radius: 0.3, pos: [3.0, 0.2, 0], radial: 1, speed: [2, 4], gravity: [0, -6, 0], life: [0.4, 0.8], size: [0.07, 0.03], delay: 1.8, emit: 0.001 });
      k.extras(A, 0.05);
    } }),

  SKILL('cryo/thermal-lock', 'Thermal lock', m(['water', 'cryo'], 'debuff-cage', 0.4, 16, 6, 'point'), 2.6, {
    view: 'wide', sky: 'night',
    act: act('cast', 0.4, 3, { hits: [{ t: 0.4, stop: 0.1, shake: 0.2, amp: 0.03, push: 0 }] }),
    // P3=172
    build(fx, o) {
      const k = kit(fx, o, CRYO), C = [3, 0, 0];
      const cage = new THREE.Group();
      for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6, bar = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.9, 0.04), metal('#9fe6ff', '#4de1ff', 0.8)); bar.position.set(0.55 * Math.cos(a), 0.95, 0.55 * Math.sin(a)); cage.add(bar); }
      for (const y of [0.1, 1.9]) { const hx = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.58, 6), addMat(k.col(1), 2)); hx.rotation.x = -Math.PI / 2; hx.position.y = y; cage.add(hx); }
      const scan = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.53, 6), addMat(k.col(0), 2)); scan.rotation.x = -Math.PI / 2; cage.add(scan);
      fx.mesh(cage, (t) => { cage.position.set(C[0], 3 * (1 - sm(0.4, 0.7, t)), C[2]); scan.position.y = 1.9 * ((2 * t) % 1); }, { t0: 0, dur: 2.6 });
      k.smoke({ ramp: VCY, count: 60, shape: 'disc', radius: 0.5, pos: [3, 0.9, 0], dir: [0, 1, 0], speed: [0.1, 0.4], life: [1.2, 2], size: [0.4, 0.8], delay: 0.4, emit: 1.6 });
      k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 0.5, pos: [3, 1, 0], speed: [0.1, 0.4], life: [0.2, 0.4], size: [0.12, 0.05], intensity: 2.5, delay: 0.4, emit: 1.6 });
      k.light({ pos: [3, 1.5, 0.6], t0: 0.4, dur: 2.0, fade: [0.1, 0.5], flicker: 0, intensity: 60 });
      if (k.g >= 2) k.ring({ t0: 0.6, dur: 1.2, r: [0.2, 0.4], normal: 'cam', pos: [3, 2.2, 0] });
      if (k.g === 3) {
        k.ring({ t0: 0.6, dur: 0.6, r: [0.3, 1.4], normal: 'cam', pos: [3, 1, 0] });
        k.em({ count: 40, kind: 'flake', shape: 'sphere', radius: 0.6, pos: [3, 1, 0], speed: [0.2, 0.5], life: [1, 1.6], size: [0.05, 0.03], delay: 0.6, emit: 0.001 });
      }
      k.extras([3, 1, 0], 0.4);
    } }),

  SKILL('cryo/cryo-pod-drop', 'Cryo pod drop', m(['water', 'cryo'], 'summon-nova', 0.8, 20, 6, 'circle'), 2.8, {
    view: 'wide', sky: 'night',
    act: act('castup', 1.0, 3),
    // P3=368
    build(fx, o) {
      const k = kit(fx, o, CRYO);
      const Y = (t) => 8 * (1 - sm(0.4, 0.9, t));
      k.decal({ kind: 'rune', r: [1.2, 1.2], pos: G, t0: 0, dur: 1.2, glyphs: 6, poly: 6 });
      const pod = new THREE.Group();
      pod.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.6, 4, 12), metal('#8a929c')));
      const panels = [];
      for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.3), metal('#5a626c')); pod.add(p); panels.push(p); }
      pod.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), addMat(k.col(1), 2)));
      fx.mesh(pod, (t) => {
        pod.position.set(G[0], Y(t) + 0.5, G[2]);
        const op = sm(1.0, 1.2, t);
        panels.forEach((p, i) => { const a = (i * TAU) / 4; p.position.set(Math.cos(a) * (0.3 + 0.15 * op), 0, Math.sin(a) * (0.3 + 0.15 * op)); p.rotation.y = -a; });
      }, { t0: -0.1, dur: 2.8 });
      k.trail({ path: (t) => [G[0], Y(t) + 0.8, 0], t0: 0.4, dur: 0.5, len: 0.6, width: 0.15 });
      k.smoke({ ramp: VCY, count: 30, shape: 'point', follow: (mm, ta, t) => mm.position.set(G[0], Y(t) + 0.9, 0), dir: [0, 1, 0], speed: [0.5, 1.5], life: [0.6, 1], size: [0.3, 0.6], delay: 0.4, emit: 0.5 });
      fx.shake(0.9, 0.3, 0.05);
      k.smoke({ ramp: DUST, count: 30, shape: 'disc', radius: 0.6, pos: G, radial: 1, speed: [0.5, 1.5], life: [1, 1.6], size: [0.5, 0.9], delay: 0.9, emit: 0.1 });
      k.smoke({ ramp: VCY, count: 100, shape: 'disc', radius: 0.5, pos: G, radial: 1, speed: [1, 3], life: [1.5, 2.5], size: [0.5, 1.0], delay: 1.2, emit: 0.3 });
      k.em({ count: 60, kind: 'flake', shape: 'disc', radius: 1.2, pos: G, dir: [0, 1, 0], spread: 0.8, speed: [1, 2.5], life: [1, 2], size: [0.05, 0.03], delay: 1.2, emit: 0.001 });
      k.em({ count: 40, kind: 'shard', shape: 'disc', radius: 0.8, pos: G, dir: [0, 1, 0], spread: 0.9, speed: [2, 4], life: [0.5, 1], gravity: [0, -8, 0], size: [0.06, 0.03], delay: 1.2, emit: 0.001 });
      k.decal({ kind: 'frost', r: [2.5, 2.5], pos: G, t0: 1.2, dur: 2.2 });
      if (k.g >= 2) {
        k.ring({ t0: 1.4, dur: 0.5, r: [0.2, 3], normal: 'up', pos: [G[0], 0.02, 0] });
        k.smoke({ ramp: VCY, count: 30, shape: 'point', pos: G, dir: [0, 1, 0], speed: [1, 2], life: [0.8, 1.2], size: [0.4, 0.8], delay: 1.4, emit: 0.2 });
      }
      if (k.g === 3) {
        for (let i = 0; i < 6; i++) {
          const a = (i * TAU) / 6, sp = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 6), addMat(k.col(1), 2)), t0 = 1.2 + 0.03 * i;
          fx.mesh(sp, (t) => { const u = sm(t0, t0 + 0.2, t); sp.position.set(G[0] + Math.cos(a) * 0.4, 0.15 * u, G[2] + Math.sin(a) * 0.4); sp.scale.setScalar(Math.max(1e-3, u)); }, { t0: 1.1, dur: 1.7 });
        }
        k.ring({ t0: 1.2, dur: 0.4, r: [0.2, 2], normal: 'cam', pos: [G[0], 1, 0] });
      }
      k.extras(G, 1.2);
    } }),

  SKILL('cryo/zero-field', 'Zero field', m(['water', 'cryo'], 'slow-field', 0.8, 20, 6, 'circle'), 3.0, {
    view: 'wide', sky: 'night',
    act: act('castup', null, 3),
    // P3=201
    build(fx, o) {
      const k = kit(fx, o, CRYO), C = [3, 0, 0], R = 1.8;
      const pylonPos = (i) => { const a = (i * TAU) / 6; return [C[0] + R * Math.cos(a), 0.6, C[2] + R * Math.sin(a)]; };
      for (let i = 0; i < 6; i++) {
        const pylon = new THREE.Group(), pos = pylonPos(i);
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), metal('#8a929c')); body.position.y = 0.3;
        const top = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.06), addMat(k.col(1), 2)); top.position.y = 0.62;
        pylon.add(body, top); pylon.position.set(pos[0], 0, pos[2]);
        k.pop(pylon, 0.1 + 0.05 * i, 0.5 + 0.05 * i, 9, 9.5);
      }
      for (let i = 0; i < 10; i++) {
        const a = (i * TAU) / 10, c = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), addMat(k.col(1), 2));
        fx.mesh(c, (t) => { c.position.set(C[0] + Math.cos(a) * 1.0, 0.8 + 0.1 * Math.sin((TAU * t) / 3 + i), C[2] + Math.sin(a) * 1.0); c.rotation.y = t; }, { t0: 0.4, dur: 2.5 });
      }
      k.decal({ kind: 'rune', r: [R, R], pos: C, t0: 0, dur: 3.0, glyphs: 6, poly: 6 });
      k.decal({ kind: 'rings', r: [0.4, R], pos: C, t0: 0, dur: 3.0 });
      k.smoke({ ramp: VCY, count: 120, shape: 'disc', radius: R, pos: [C[0], 0.1, C[2]], dir: [0, 1, 0], speed: [0.1, 0.4], life: [2, 3], size: [0.6, 1.2], emit: 2.4 });
      k.em({ count: 40, kind: 'soft', shape: 'disc', radius: R, pos: [C[0], 0.5, C[2]], dir: [0, 1, 0], speed: [0.02, 0.1], life: [1.5, 2.5], size: [0.06, 0.03], intensity: 1.2, emit: 2.8 });
      k.light({ pos: [C[0], 1.0, 0.6], t0: 0, dur: 3.0, fade: [0.2, 0.6], flicker: 0, env: (t) => 0.8 + 0.2 * Math.sin((TAU * t) / 3), intensity: 50 });
      fx.on((t) => { fx.target.position.x = C[0] + 0.2 * sm(0.5, 2.8, t); });
      if (k.g >= 2) for (let i = 0; i < 6; i++) k.beam({ from: pylonPos(i), to: pylonPos((i + 1) % 6), r: [0.012, 0.012], intensity: 1.2, t0: 0.5, dur: 2.5 });
      k.extras(C, 2.4);
    } }),
];
