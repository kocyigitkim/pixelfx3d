// Ion class: 8 tech skills with the ION ramp (PLAN2 B24). Built from T-WHP, T-PRJ, T-BUF, T-DSH and T-NOV templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, metal, addMat, DUST, ION } from './_skill.js';
import { contact } from './melee.js';

const m = meta('ion', 'tech');

/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });
const VAPOR = [[0, '#b7bcbf', 0], [0.15, '#b0b6b9', 0.55], [1, '#7a848b', 0]]; // kit VAPOR darkened to <= #b8c0c8 (V5 vapor exception)

export default [
  // 1. ion-lash: a straight-segment whip with glowing coil rings, ends in an arc
  SKILL('ion/ion-lash', 'Ion lash', m(['air', 'ion'], 'whip', 0.3, 6, 3, 'arc'), 1.4, {
    view: 'side', sky: 'dark',
    act: act('throw', 0.0, 2.45, { weapon: 'whip' }),
    // P3=132
    build(fx, o) {
      const k = kit(fx, o, ION), to = k.at('armR'), H = fx.anchor('handR', 0), TIP = fx.anchor('tgt', 0, [-0.25, 0, 0.1]); // whip from release hand, tip lands on target chest
      const pts = (t) => { const u = sm(0, 0.5, t), out = []; for (let i = 0; i <= 5; i++) { const f = i / 5, bump = 0.2 * Math.sin(f * Math.PI) * (1 - sm(0.4, 0.8, t)) * u; out.push([H[0] + (TIP[0] - H[0]) * f * u, H[1] + (TIP[1] - H[1]) * f * u + bump, H[2] + (TIP[2] - H[2]) * f * u]); } return out; };
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 8), metal('#5a626c'));
      const coil = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 12), addMat(k.col(1), 2)); coil.rotation.x = Math.PI / 2; handle.add(coil);
      fx.mesh(handle, () => to(handle), { t0: -0.1, dur: 1.4 });
      for (let i = 1; i <= 5; i++) {
        const g = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.008, 6, 12), addMat(k.col(1), 2));
        fx.mesh(g, (t) => g.position.set(...pts(t)[i]), { t0: 0, dur: 1.0 });
      }
      k.ribbon({ points: (t) => pts(t), width: 0.03, fade: [0.02, 0.2], intensity: 1.5, t0: 0, dur: 0.8 });
      k.em({ count: 60, kind: 'spark', shape: 'line', shapeSize: [0.6, 0, 0], pos: [1.4, 1.3, 0.1], dir: [1, 0, 0], spread: 0.5, speed: [1, 3], life: [0.2, 0.5], size: [0.06, 0.02], stretch: 1.5, intensity: 2, emit: 0.8 });
      ct(fx, k, TIP, 0.0, 28, { lightI: 0 });
      k.bolt({ from: TIP, to: [2.45, 0.3, 0], jag: 0.04, width: 0.02, rate: 10, t0: 0, dur: 0.2 });
      if (k.g >= 2) k.decal({ kind: 'cracks', r: [0.8, 0.8], pos: [2.45, 0, 0], t0: 0, dur: 1.4 });
      if (k.g === 3) {
        k.ring({ t0: 0, dur: 0.35, r: [0.1, 1.1], normal: 'cam', pos: TIP });
        k.bolt({ from: TIP, to: [2.2, 0, 0.1], jag: 0.05, width: 0.02, rate: 10, t0: 0.1, dur: 0.5 });
      }
      k.extras(TIP, 0.0);
    } }),

  // 2. sonic-lance: horn fires a cone of sonic rings and a streak
  SKILL('ion/sonic-lance', 'Sonic lance', m(['air', 'ion'], 'shot-cone', 0.4, 8, 9, 'cone'), 1.6, {
    view: 'long', sky: 'dark',
    act: act('cast', 0.15, 4),
    // P3=262
    build(fx, o) {
      const k = kit(fx, o, ION), to = k.at('armR'), MZ = fx.anchor('handR', 0.15, [0.2, 0, 0]), T = fx.anchor('tgt'), y = (x) => MZ[1] + ((T[1] - MZ[1]) * (x - MZ[0])) / (T[0] - MZ[0]); // horn muzzle at the shot; y(): cone line muzzle -> target chest
      const horn = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 16, 1, true), metal('#8a929c')); cone.rotation.z = -Math.PI / 2; cone.position.x = 0.2; horn.add(cone);
      fx.mesh(horn, () => to(horn), { t0: -0.3, dur: 2.0 });
      for (let i = 0; i < 6; i++) k.ring({ t0: 0.15 + 0.03 * i, dur: 0.5, r: [0.2, 0.5 + 0.2 * i], normal: [1, 0, 0], pos: [1 + 0.5 * i, y(1 + 0.5 * i), 0] });
      k.em({ count: 80, kind: 'streak', shape: 'point', pos: MZ, dir: [1, 0, 0], spread: 0.05, speed: [12, 18], life: [0.15, 0.25], size: [0.05, 0.02], intensity: 1.5, delay: 0.15, emit: 0.001 });
      k.smoke({ ramp: VAPOR, count: 40, shape: 'disc', radius: 0.15, pos: MZ, dir: [1, 0, 0], radial: 1, speed: [2, 4], life: [0.4, 0.8], size: [0.15, 0.35], delay: 0.15, emit: 0.001 });
      ct(fx, k, T, 0.15, 38, { lightI: 0 });
      if (k.g >= 2) { k.ring({ t0: 0.6, dur: 0.5, r: [0.2, 2.0], normal: 'cam', pos: T }); k.sparks(T, 0.6, 20); fx.flash(0.6, 0.1, k.col(1), 0.15); }
      if (k.g === 3) {
        k.smoke({ ramp: DUST, count: 40, shape: 'line', shapeSize: [0.8, 0, 0], pos: [3.8, 0.1, 0], dir: [1, 0, 0], radial: 0.5, speed: [0.5, 1.5], life: [1, 1.6], size: [0.3, 0.7], delay: 0.6, emit: 0.1 });
        k.ring({ t0: 0.6, dur: 0.6, r: [0.2, 3], normal: 'up', pos: [3.8, 0.02, 0] });
      }
      k.extras(T, 0.15, 'B');
    } }),

  // 3. static-drone: a hex drone flies in and chains three bolts through the target area
  SKILL('ion/static-drone', 'Static drone', m(['air', 'ion'], 'drone-chain', 0.6, 14, 8, 'chain'), 2.6, {
    view: 'wide', sky: 'dark',
    act: act('cast', 0.8, 3.4, { hits: [1.2, 1.6].map((t) => ({ t, stop: 0.04, shake: 0.2, amp: 0.03, push: 1 })) }),
    // P3=119
    build(fx, o) {
      const k = kit(fx, o, ION), H = fx.anchor('handR', 0), T = fx.anchor('tgt'), DH = [2.2, 2, 0.6], P2 = [3.8, 0.1, 1.2], P3 = [4.2, 0.1, -1];
      const drone = (hov, t0) => {
        const g = new THREE.Group(); g.scale.setScalar(2.5);
        g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.06, 6), metal('#5a626c', k.col(1), 0.3)));
        const rotor = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.01, 6, 16), addMat(k.col(1), 2)); rotor.rotation.x = Math.PI / 2; rotor.position.y = 0.05; g.add(rotor);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), addMat(k.col(1), 2)); lamp.position.set(0.15, 0, 0); g.add(lamp);
        fx.mesh(g, (t) => { const u = sm(t0, t0 + 0.8, t), bob = 0.05 * Math.sin((TAU * t) / 1.2); g.position.set(H[0] + (hov[0] - H[0]) * u, H[1] + (hov[1] - H[1]) * u + bob, H[2] + (hov[2] - H[2]) * u); rotor.rotation.z = t * 30; }, { t0: t0 - 0.3, dur: 2.6 });
        k.em({ count: 1, kind: 'soft', shape: 'point', size: [0.5, 0.5], intensity: 1.4, life: [2.6, 2.6], delay: t0 - 0.3, emit: 0.001, t0: t0 - 0.3, t1: t0 + 2.3, follow: (m) => m.position.copy(g.position) });
      };
      drone(DH, 0);
      for (const ta of [0.8, 0.9, 1.0]) k.bolt({ from: DH, to: T, jag: 0.05, width: 0.05, rate: 30, intensity: 2.6, t0: ta, dur: 0.4 });
      k.bolt({ from: T, to: P2, jag: 0.05, width: 0.02, rate: 12, t0: 1.2, dur: 0.4 });
      k.bolt({ from: P2, to: P3, jag: 0.05, width: 0.02, rate: 12, t0: 1.6, dur: 0.4 });
      k.sparks(T, 0.8, 25);
      k.sparks(P2, 1.2, 25);
      k.sparks(P3, 1.6, 25);
      k.light({ pos: DH, t0: 0, dur: 2.6, fade: [0.05, 0.4], flicker: 0, intensity: 70 });
      if (k.g >= 2) drone([2.6, 1.6, -0.6], 0.2);
      if (k.g === 3) {
        k.ring({ t0: 1.9, dur: 0.4, r: [0.2, 1.6], normal: 'cam', pos: T });
        k.bolt({ from: DH, to: T, jag: 0.05, width: 0.02, rate: 12, t0: 2.0, dur: 0.3 });
        k.extras(T, 1.6);
      }
    } }),

  // 4. vacuum-grenade: grenade lands, sucks in air with a streak implosion, then a shock blast
  SKILL('ion/vacuum-grenade', 'Vacuum grenade', m(['air', 'ion'], 'implode-shock', 0.4, 14, 7, 'circle'), 2.2, {
    view: 'wide', sky: 'dark',
    act: act('throw', 1.0, 3.2),
    // P3=442
    build(fx, o) {
      const k = kit(fx, o, ION), A = fx.anchor('handR', 0), G = [3, 0, 0], BP = [3, 0.4, 0];
      const P = (t) => { const u = clamp(t / 0.5), h = 1.0 * Math.sin(Math.PI * u); return [A[0] + (G[0] - A[0]) * u, A[1] + (G[1] - A[1]) * u + h, A[2] + (G[2] - A[2]) * u]; };
      const gren = new THREE.Group();
      gren.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), metal('#5a626c')));
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 6, 16), addMat(k.col(1), 2)); band.rotation.x = Math.PI / 2; gren.add(band);
      fx.mesh(gren, (t) => { gren.position.set(...P(Math.min(t, 0.5))); gren.visible = t < 1.0; }, { t0: -0.1, dur: 1.1 });
      for (let i = 0; i < 4; i++) {
        const a = (i * TAU) / 4, c = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), metal('#8a929c'));
        fx.mesh(c, (t) => { const u = Math.max(0, t - 1.0); c.position.set(G[0] + 0.8 * Math.cos(a) * u, 0.1 + 1.2 * u - 3 * u * u, G[2] + 0.8 * Math.sin(a) * u); c.rotation.y = t * 8; c.visible = t >= 1.0 && t < 2.0; }, { t0: 0, dur: 2.2 });
      }
      k.decal({ kind: 'rune', r: [1.2, 1.2], pos: G, t0: 0.5, dur: 1.6, glyphs: 6, poly: 6 });
      k.em({ count: 120, kind: 'streak', shape: 'sphere', radius: 0.95, radiusIn: 0.5, pos: G, radial: 1, speed: [-4, -3], life: [0.3, 0.5], size: [0.04, 0.02], intensity: 1.5, delay: 0.5, emit: 0.45 });
      k.ring({ t0: 0.5, dur: 0.45, r: [1.5, 0.2], normal: 'cam', pos: [3, 0.8, 0] });
      k.em({ count: 120, kind: 'streak', shape: 'sphere', radius: 1.6, radial: 1, pos: G, speed: [-4, -2.5], life: [0.3, 0.45], stretch: 2, intensity: 1.5, delay: 0.5, emit: 0.45 });
      k.ring({ t0: 0.5, dur: 0.3, r: [2.4, 0.2], normal: 'cam', pos: [3, 0.8, 0] });
      k.shell({ r: [1.6, 0.1], cells: 6, pos: G, t0: 0.5, dur: 0.5, fade: [0.05, 0.3], intensity: 0.8 });
      k.orb({ kind: 'energy', r: [0.1, 0.8], pos: [3, 0.5, 0], t0: 0.5, dur: 0.5, fade: [0.05, 0.3] });
      k.ring({ t0: 1.0, dur: 0.6, r: [0.2, 5], normal: 'up', pos: [3, 0.02, 0] });
      k.shell({ r: [0.2, 2.2], cells: 6, pos: G, t0: 1.0, dur: 0.5, fade: [0.05, 0.3], intensity: 0.8 });
      k.ring({ t0: 1.0, dur: 0.6, r: [0.2, 4], normal: 'up', pos: [3, 0.02, 0] });
      k.sparks(BP, 1.0, 60);
      k.ring({ t0: 1.0, dur: 0.4, r: [0.2, 2], normal: 'cam', pos: BP });
      k.sparks(BP, 1.0, 60);
      k.smoke({ ramp: DUST, count: 40, shape: 'disc', radius: 0.4, pos: BP, radial: 1, speed: [0.5, 1.5], life: [1, 1.6], size: [0.4, 0.8], delay: 1.0, emit: 0.2 });
      if (k.g >= 2) k.ring({ t0: 1.3, dur: 0.5, r: [0.2, 3], normal: 'up', pos: [3, 0.02, 0] });
      k.extras(BP, 1.0);
    } }),

  // 5. jet-dash: jetpack nozzles blast blue flames while the body dashes forward
  SKILL('ion/jet-dash', 'Jet dash', m(['air', 'ion'], 'dash-thruster', 0.2, 8, 6, 'line'), 1.5, {
    body: false, view: 'side', sky: 'dark',
    act: act('none', null, 3.3, { keys: [[-0.8, 'guard'], [-0.5, 'dashLow'], [0, 'lunge', 'snap'], [0.3, 'lunge'], [0.9, 'guard']] }),
    // P3=237
    build(fx, o) {
      const k = kit(fx, o, ION), t0 = -0.5, x0 = 0, x1 = 3, C = fx.anchor('handR', 0.02), NY = fx.anchor('chest', 0)[1]; C[0] += x1; // lunge hand + dash offset; thrusters at chest height
      const X = (t) => (t < t0 ? x0 : t < 0 ? x0 + (x1 - x0) * sm(t0, 0, t) : x1);
      fx.on((t) => { fx.body.position.x = X(t); });
      for (const y of [0.5, 0.8, 1.1, 1.4]) k.ribbon({ points: (t) => { const x = X(clamp(t, t0, 0)); return [[x - 1.4, y, 0], [x - 0.6, y, 0], [x, y, 0]]; }, head: () => 1.001, width: 0.025, fade: [0.03, 0.12], t0, dur: 1.0 });
      for (const z of [0.15, -0.15]) {
        const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 8), metal('#5a626c'));
        noz.rotation.z = Math.PI / 2;
        fx.mesh(noz, (t) => noz.position.set(X(t) - 0.25, NY, z), { t0, dur: 1.0 });
        k.em({ count: 60, kind: 'flame', shape: 'point', dir: [-1, 0, 0], spread: 0.25, speed: [2, 4], life: [0.2, 0.4], size: [0.15, 0.05], aspect: 1.8, emit: 1.0, t0, follow: (mm, ta, t) => mm.position.set(X(t) - 0.25, NY, z) });
      }
      k.ring({ t0, dur: 0.3, r: [0.2, 1.2], normal: [1, 0, 0], pos: [0, 1.2, 0] }); // anchor-ok
      k.ring({ t0: -0.25, dur: 0.3, r: [0.2, 1.2], normal: [1, 0, 0], pos: [1.5, 1.2, 0] });
      k.trail({ path: (t) => [X(t) - 0.2, 1.1, 0], t0, dur: 0.6, len: 0.4, width: 0.04 });
      k.em({ count: 5, kind: 'shard', shape: 'point', size: [0.2, 0.1], life: [0.3, 0.4], emit: 0.5, t0, follow: (mm, ta, t) => mm.position.set(X(t) - 0.4, 1.0, 0) });
      ct(fx, k, C, 0.02, 38, { lightI: 0 });
      k.ring({ t0: 0, dur: 0.4, r: [0.2, 2], normal: [1, 0, 0], pos: C });
      k.sparks(C, 0, 30);
      k.extras(C, 0);
    } }),

  // 6. pulse-ring: three hex EMP rings expand from the target, a radial spark burst follows
  SKILL('ion/pulse-ring', 'Pulse ring', m(['air', 'ion'], 'nova-emp', 0.4, 16, 5, 'circle'), 1.8, {
    view: 'wide', sky: 'dark',
    act: act('castup', 0.05, 2.6),
    // P3=138
    build(fx, o) {
      const k = kit(fx, o, ION), P = [2.6, 0, 0];
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.04, 6), metal('#5a626c', k.col(1), 0.3)); base.position.set(P[0], 0.02, 0);
      fx.mesh(base, () => {}, { t0: 0, dur: 1.0 });
      for (let i = 0; i < 3; i++) {
        const r = 0.3 + 0.2 * i, hr = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.08, 6), addMat(k.col(1), 2));
        hr.rotation.x = -Math.PI / 2; hr.position.set(P[0], 0.05, 0);
        fx.mesh(hr, (t) => { const u = sm(0.1 * i, 0.6 + 0.1 * i, t); hr.scale.setScalar(1 + 5 * u); hr.material.opacity = 1 - u; }, { t0: 0, dur: 1.0 });
      }
      k.bolt({ from: [2.6, 1.2, 0.2], to: [2.6, 0.3, -0.1], jag: 0.04, width: 0.02, rate: 10, t0: 0.05, dur: 0.3 }); // anchor-ok
      k.bolt({ from: [2.8, 1.4, -0.2], to: [2.5, 0.4, 0.1], jag: 0.04, width: 0.02, rate: 10, t0: 0.05, dur: 0.3 });
      k.em({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.2, pos: [2.6, 0.6, 0], radial: 1, speed: [4, 8], life: [0.3, 0.6], size: [0.07, 0.02], stretch: 1.5, intensity: 3, delay: 0.05, emit: 0.001 });
      fx.on((t) => { if (fx.target && fx.target.set) fx.target.set({ rim: k.col(1), rimAmt: (Math.floor(t * 6) % 2 ? 1.2 : 0.2) * (1 - sm(0.6, 1.2, t)) }); });
      k.decal({ kind: 'rune', r: [1.4, 1.4], pos: P, t0: 0, dur: 1.6, glyphs: 6, poly: 6 });
      if (k.g < 3) { k.ring({ t0: 0.05, dur: 0.7, r: [0.2, 3], normal: 'up', pos: [2.6, 0.02, 0] }); k.light({ pos: [2.6, 1.0, 0.6], t0: 0.05, dur: 1.0, fade: [0.02, 0.4], flicker: 0, intensity: 120 }); fx.flash(0.05, 0.1, k.col(0), 0.15); } // K2/K3: g3 extras owns ring/light/flash
      if (k.g >= 2) {
        for (let i = 0; i < 12; i++) {
          const a = (i * TAU) / 12, sp = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), addMat(k.col(1), 2));
          fx.mesh(sp, (t) => { const u = sm(0.05, 0.6, t); sp.position.set(P[0] + 2 * u * Math.cos(a), 0.05, 2 * u * Math.sin(a)); sp.scale.setScalar(Math.max(1e-3, 1 - u)); }, { t0: 0, dur: 1.0 });
        }
      }
      if (k.g === 3) { k.ring({ t0: 0.9, dur: 0.6, r: [0.2, 2.5], normal: 'up', pos: [2.6, 0.02, 0] }); fx.flash(0.9, 0.12, k.col(1), 0.15); k.extras(P, 0.05); }
    } }),

  // 7. orbital-beam: three sky lasers mark the target, then an ion beam drops from the sky
  SKILL('ion/orbital-beam', 'Orbital beam', m(['air', 'ion'], 'sky-strike', 0.8, 20, 8, 'point'), 2.4, {
    view: 'sky', sky: 'dark',
    act: act('castup', 0.9, 2.6, { hits: [{ t: 0.9, stop: 0.1, shake: 0.5, amp: 0.07, push: 2 }] }),
    // P3=268
    build(fx, o) {
      const k = kit(fx, o, ION), P = [2.6, 0, 0];
      for (let i = 0; i < 3; i++) {
        const a = (i * TAU) / 3, mk = [P[0] + 0.6 * Math.cos(a), 0.01, 0.6 * Math.sin(a)];
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 6), metal('#5a626c', k.col(1), 0.4)); plate.position.set(...mk);
        fx.mesh(plate, () => {}, { t0: -0.3, dur: 2.2 });
        k.beam({ from: [P[0] + (i - 1) * 0.8, 6, -2], to: mk, r: [0.01, 0.01], intensity: 1.5, t0: -0.3, dur: 0.9, fade: [0.05, 0.2] });
      }
      k.beam({ pos: P, height: 15, r: [0.35, 0.45], intensity: 1.5, t0: 0.9, dur: 0.8, fade: [0.05, 0.3] });
      k.beam({ pos: P, height: 15, r: [0.12, 0.14], intensity: 2.5, t0: 0.9, dur: 0.8, fade: [0.05, 0.3] });
      k.ring({ t0: 0.9, dur: 0.5, r: [0.3, 3], normal: 'cam', pos: P, intensity: 1.8 });
      k.decal({ kind: 'glow', r: [2.2, 2.2], pos: P, t0: 0.9, dur: 1.2 });
      k.sparks(P, 0.9, 60);
      k.sparks(P, 0.9, 60);
      k.smoke({ ramp: VAPOR, count: 40, shape: 'disc', radius: 0.3, pos: P, radial: 1, speed: [0.5, 1.5], life: [1, 1.6], size: [0.4, 0.9], delay: 0.9, emit: 0.1 });
      k.decal({ kind: 'scorch', r: [1, 1], pos: P, t0: 0.9, dur: 2.0 });
      if (k.g < 3) { k.ring({ t0: 0.9, dur: 0.6, r: [0.2, 4], normal: 'up', pos: [2.6, 0.02, 0] }); k.light({ pos: [2.6, 1.0, 0.5], t0: 0.9, dur: 1.2, fade: [0.01, 0.4], flicker: 0, intensity: 140 }); fx.flash(0.9, 0.12, k.col(1), 0.15); } // K2/K3: g3 extras owns ring/light/flash
      if (k.g >= 2) for (let j = 0; j < 3; j++) k.ring({ t0: 1.0 + 0.2 * j, dur: 0.4, r: [0.2, 1.2], normal: 'cam', pos: [2.6, 1 + j, 0] }); // anchor-ok
      if (k.g === 3) {
        k.ring({ t0: 1.4, dur: 0.6, r: [0.2, 2.5], normal: 'cam', pos: P });
        k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 1.5, pos: P, size: [0.25, 0.08], life: [0.2, 0.3], intensity: 3, delay: 1.4, emit: 0.001 });
        k.extras(P, 0.9);
      }
    } }),

  // 8. blade-turbine: a spinning ring of blades shields the body and deflects two bolts
  SKILL('ion/blade-turbine', 'Blade turbine', m(['air', 'ion'], 'buff-shield', 0.4, 20, 0, 'self'), 3.0, {
    body: true, view: 'body', sky: 'dark',
    // P3=141
    build(fx, o) {
      const k = kit(fx, o, ION), CEN = [0, 1.1, 0]; // anchor-ok
      fx.body.setPose(POSES.guard);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.6, 3.0, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      const turbine = (y) => {
        const grp = new THREE.Group(); grp.position.set(0, y, 0);
        const hub = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 16), metal('#8a929c', k.col(1), 0.5)); hub.rotation.x = Math.PI / 2; grp.add(hub);
        for (let i = 0; i < 8; i++) {
          const a = (i * TAU) / 8, b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.08), metal('#5a626c', k.col(1), 0.3));
          b.position.set(0.8 * Math.cos(a), 0, 0.8 * Math.sin(a)); b.rotation.y = -a;
          const edge = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.01), addMat(k.col(1), 2)); edge.position.z = 0.045; b.add(edge);
          grp.add(b);
        }
        fx.mesh(grp, (t) => { grp.rotation.y = (TAU * 4 * t) / 3; }, { t0: -0.1, dur: 3.0 });
      };
      turbine(CEN[1]);
      k.em({ count: 60, kind: 'spark', shape: 'ring', radius: 0.8, pos: CEN, dir: [0, 1, 0], spread: 0.3, swirl: 8, speed: [0.5, 1.5], life: [0.3, 0.6], size: [0.05, 0.02], stretch: 1.2, intensity: 2, emit: 3.0 });
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 0.8], normal: 'up', pos: [0, 0.02, 0] });
      k.bolt({ from: [2.0, 1.1, 0.4], to: [0.8, 1.1, 0], jag: 0.04, width: 0.02, rate: 10, t0: 1.1, dur: 0.2 });
      k.bolt({ from: [2.0, 1.1, -0.4], to: [0.8, 1.1, 0], jag: 0.04, width: 0.02, rate: 10, t0: 1.9, dur: 0.2 });
      k.sparks([0.8, 1.1, 0], 1.2, 20);
      k.sparks([0.8, 1.1, 0], 2.0, 20);
      fx.hit(1.2, { stop: 0.03, shake: 0.12, amp: 0.02, push: 0 });
      fx.hit(2.0, { stop: 0.03, shake: 0.12, amp: 0.02, push: 0 });
      k.light({ pos: [0.6, 1.2, 0.6], t0: 0.2, dur: 2.6, fade: [0.05, 0.4], flicker: 0, intensity: 60 });
      if (k.g >= 2) turbine(0.5);
      if (k.g === 3) {
        for (let i = 0; i < 8; i++) {
          k.trail({ path: (t) => { const a = (TAU * 4 * t) / 3 + (i * TAU) / 8, R = 0.8 + 3 * sm(2.6, 3.0, t); return [R * Math.cos(a), CEN[1], R * Math.sin(a)]; }, t0: 2.6, dur: 0.5, len: 0.3, width: 0.03 });
        }
        k.extras(CEN, 0.3);
      }
    } }),
];
