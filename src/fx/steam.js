// Steam class: 5 fire+water+steam derived skills (PLAN2 B15). Visible vapor is normal-blend VAPOR smoke; STEAM is glow only; FIRE is the orange inner glow.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, metal, FIRE, STEAM, VAPOR, DUST } from './_skill.js';
import { contact } from './melee.js';

const m = meta('steam', 'derived');
const ELEM = ['fire', 'water', 'steam'];
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });

export default [
  SKILL('steam/scald-burst', 'Scald burst', m(ELEM, 'nova', 0.3, 10, 4, 'circle'), 1.8, {
    view: 'wide',
    act: act('castup', 0.05, 2.4),
    // P3=381
    build(fx, o) {
      const k = kit(fx, o, STEAM), kf = kit(fx, o, FIRE), C = [0, 0.3, 0];
      k.smoke({ ramp: VAPOR, count: 120, shape: 'sphere', radius: 0.3, pos: C, radial: 1, speed: [3, 6], drag: 1.5, life: [1.5, 2.5], size: [0.6, 2], delay: 0.05, emit: 0.001 });
      kf.em({ count: 40, kind: 'soft', shape: 'point', pos: C, radial: 1, speed: [0.5, 1.5], life: [0.4, 0.7], size: [0.5, 0.3], intensity: 0.6, delay: 0.05, emit: 0.001 });
      k.ring({ t0: 0.05, dur: 0.4, r: [0.2, 3.5], normal: 'up', pos: [0, 0.05, 0] });
      k.ring({ t0: 0.05, dur: 0.35, r: [0.2, 2.2], normal: 'cam', pos: [0, 1, 0] });
      kf.decal({ kind: 'glow', r: [1.5, 1.5], pos: [0, 0.02, 0], t0: 0, dur: 1.7, intensity: 0.5 });
      k.em({ count: 40, kind: 'drop', shape: 'sphere', radius: 0.2, pos: C, radial: 1, speed: [2, 4], gravity: [0, -9, 0], life: [0.6, 1], size: [0.06, 0.03], intensity: 1.5, delay: 0.05, emit: 0.001 });
      k.light({ color: '#ff9a30', pos: [0, 1.2, 0.6], t0: 0.05, dur: 1.2, fade: [0.02, 0.6], intensity: 120 });
      fx.flash(0.05, 0.15, '#ffb060', 0.15);
      k.gather(C, 0, 0.3, 1, 30);
      if (k.g >= 2) k.smoke({ ramp: VAPOR, count: 50, shape: 'ring', radius: 0.8, pos: [0, 0.1, 0], radial: 1, speed: [1, 2], life: [1.2, 2], size: [0.5, 1.2], delay: 0.1, emit: 0.001 });
      if (k.g === 3) for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; k.em({ count: 10, kind: 'streak', shape: 'point', pos: C, dir: [Math.cos(a), 0.3, Math.sin(a)], spread: 0.1, speed: [4, 7], life: [0.4, 0.7], size: [0.05, 0.02], stretch: 2, intensity: 1.2, delay: 0.05, emit: 0.001 }); }
      k.extras(C, 0.05);
    } }),

  SKILL('steam/boiler-geyser', 'Boiler geyser', m(ELEM, 'ground-jets', 0.5, 12, 6, 'circle'), 2.8, {
    view: 'wide',
    act: act('stomp', 0.4, 3),
    // P3=701
    build(fx, o) {
      const k = kit(fx, o, STEAM), kf = kit(fx, o, FIRE), G = [3, 0, 0];
      const vent = (i) => { const a = (i * TAU) / 3; return [3 + 0.8 * Math.cos(a), 0.05, 0.8 * Math.sin(a)]; };
      const burst = (p, t) => {
        k.smoke({ ramp: VAPOR, count: 60, shape: 'disc', radius: 0.12, pos: p, dir: [0, 1, 0], speed: [4, 7], life: [1.2, 2], size: [0.4, 0.9], delay: t, emit: 0.001 });
        kf.em({ count: 15, kind: 'soft', shape: 'point', pos: p, dir: [0, 1, 0], speed: [1, 3], life: [0.4, 0.7], size: [0.4, 0.2], intensity: 0.6, delay: t, emit: 0.001 });
        k.em({ count: 15, kind: 'drop', shape: 'point', pos: p, dir: [0, 1, 0], spread: 0.8, speed: [2, 5], gravity: [0, -9, 0], life: [0.5, 0.9], size: [0.06, 0.03], intensity: 1.5, delay: t, emit: 0.001 });
        k.em({ count: 10, kind: 'streak', shape: 'point', pos: p, dir: [0, 1, 0], spread: 0.2, speed: [4, 7], life: [0.3, 0.6], size: [0.04, 0.02], stretch: 2, intensity: 1.2, delay: t, emit: 0.001 });
        k.ring({ t0: t, dur: 0.35, r: [0.1, 0.8], normal: 'up', pos: [p[0], 0.05, p[2]] });
      };
      const times = [0.3, 0.45, 0.6];
      for (let i = 0; i < 3; i++) {
        const p = vent(i), v = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.1, 10), metal('#7a4a2a'));
        v.position.set(...p); fx.mesh(v, null, { t0: -0.5, dur: 4 });
        burst(p, times[i]); burst(p, 1.4);
      }
      k.light({ color: '#ff9a30', pos: [3, 1.2, 0.8], t0: 0.4, dur: 2.4, fade: [0.05, 0.5], intensity: 80 });
      if (k.g >= 2) k.smoke({ ramp: VAPOR, count: 60, shape: 'disc', radius: 0.3, pos: [G[0], 0.05, 0], dir: [0, 1, 0], speed: [5, 8], life: [1.2, 2], size: [0.5, 1.2], delay: 1.0, emit: 0.001 });
      if (k.g === 3) { k.ring({ t0: 1.0, dur: 0.5, r: [0.2, 2.5], normal: 'up', pos: [G[0], 0.05, 0] }); fx.flash(1.0, 0.12, '#ffb060', 0.15); }
      k.extras([G[0], 0.05, 0], 0.4);
    } }),

  SKILL('steam/fog-brand', 'Fog brand', m(ELEM, 'debuff', 0.4, 12, 7, 'point'), 3.0, {
    view: 'side',
    act: act('cast', 0.3, 3),
    // P3=241
    build(fx, o) {
      const k = kit(fx, o, STEAM), kf = kit(fx, o, FIRE);
      const A = [0.6, 1.38, 0.2], CH = [3, 1.2, 0];
      const P = (t) => { const u = clamp(t / 0.3); return [A[0] + (CH[0] - A[0]) * u, A[1] + (CH[1] - A[1]) * u, A[2] + (CH[2] - A[2]) * u]; };
      k.trail({ path: P, t0: 0, dur: 0.3, len: 0.3, width: 0.05 });
      k.em({ count: 20, kind: 'soft', shape: 'point', dir: [1, 0, 0], spread: 0.2, speed: [0.5, 1], life: [0.3, 0.5], size: [0.2, 0.1], intensity: 0.6, emit: 0.3, follow: (mm, ta, t) => mm.position.set(...P(t)) });
      k.ring({ t0: 0.3, dur: 0.4, r: [0.2, 1.2], normal: 'cam', pos: CH });
      k.sparks(CH, 0.3, 20);
      kf.decal({ kind: 'rune', r: [0.25, 0.25], pos: [3, 1.2, 0.25], t0: 0.3, dur: 2.5, intensity: 2, glyphs: 6, poly: 6 });
      k.smoke({ ramp: VAPOR, count: 60, shape: 'sphere', radius: 0.6, pos: [3, 1.0, 0], dir: [0, 1, 0], speed: [0.2, 0.6], life: [1.2, 2], size: [0.5, 1], delay: 0.3, emit: 2.4 });
      kf.em({ count: 30, kind: 'soft', shape: 'sphere', radius: 0.5, pos: [3, 1.0, 0], dir: [0, 1, 0], speed: [0.3, 0.8], life: [0.8, 1.4], size: [0.15, 0.06], intensity: 0.8, delay: 0.3, emit: 2.4 });
      k.light({ color: '#ff9a30', pos: [3, 1.2, 0.8], t0: 0.3, dur: 2.4, fade: [0.05, 0.5], intensity: 30 });
      if (k.g >= 2) k.smoke({ ramp: VAPOR, count: 40, shape: 'ring', radius: 0.5, pos: [3, 0.05, 0], dir: [0, 1, 0], speed: [0.3, 0.6], life: [1, 1.6], size: [0.4, 0.8], delay: 0.6, emit: 2.0 });
      if (k.g === 3) {
        k.ring({ t0: 1.5, dur: 0.4, r: [0.2, 1.4], normal: 'cam', pos: CH });
        k.smoke({ ramp: VAPOR, count: 30, shape: 'sphere', radius: 0.3, pos: CH, radial: 1, speed: [2, 3], life: [0.8, 1.2], size: [0.4, 0.8], delay: 1.5, emit: 0.001 });
      }
      k.extras(CH, 0.3);
    } }),

  SKILL('steam/kettle-rush', 'Kettle rush', m(ELEM, 'dash', 0.2, 8, 5, 'line'), 1.6, {
    view: 'side',
    act: act('none', 0.02, 3, { keys: [[-0.5, 'guard'], [-0.3, 'dashLow'], [0, 'lunge', 'snap'], [0.3, 'lunge'], [0.9, 'guard']] }),
    // P3=333
    build(fx, o) {
      const k = kit(fx, o, STEAM), kf = kit(fx, o, FIRE);
      const x0 = -1.2, x1 = 2.6, t0 = -0.3, X = (t) => (t < t0 ? x0 : t < 0 ? x0 + (x1 - x0) * sm(t0, 0, t) : x1);
      fx.on((t) => { fx.body.position.x = X(t); });
      k.smoke({ ramp: VAPOR, count: 100, shape: 'sphere', radius: 0.2, dir: [-1, 0.2, 0], spread: 0.6, speed: [0.5, 1.5], life: [0.8, 1.4], size: [0.4, 0.9], delay: t0, emit: 0.5, follow: (mm, ta, t) => mm.position.set(X(t), 0.9, 0) });
      kf.em({ count: 30, kind: 'soft', shape: 'point', dir: [-1, 0, 0], speed: [0.5, 1], life: [0.3, 0.5], size: [0.5, 0.2], intensity: 0.8, delay: t0, emit: 0.3, follow: (mm, ta, t) => mm.position.set(X(t), 1.0, 0) });
      k.em({ count: 20, kind: 'dust', blend: 'normal', lit: 1, ramp: DUST, shape: 'line', shapeSize: [1.9, 0, 0], pos: [0.7, 0.05, 0], dir: [-1, 0.2, 0], speed: [0.5, 1.2], life: [0.6, 1], size: [0.2, 0.5], delay: t0, emit: 0.3 });
      ct(fx, k, [3, 1.1, 0], 0.02, 40);
      k.ring({ t0: 0, dur: 0.4, r: [0.2, 1.4], normal: 'cam', pos: [3, 1.1, 0] });
      k.light({ color: '#ff9a30', pos: [1, 1.2, 0.8], t0: t0, dur: 1.6, fade: [0.05, 0.5], intensity: 90 });
      if (k.g >= 2) k.em({ count: 40, kind: 'streak', shape: 'point', pos: [3, 1.1, 0], dir: [1, 0, 0], spread: 0.2, speed: [3, 6], life: [0.2, 0.35], size: [0.04, 0.02], stretch: 2, intensity: 1.2, delay: 0.02, emit: 0.001 });
      if (k.g === 3) k.smoke({ ramp: VAPOR, count: 60, shape: 'sphere', radius: 0.3, pos: [3, 1.1, 0], radial: 1, speed: [2, 4], life: [0.6, 1], size: [0.4, 0.8], delay: 0.02, emit: 0.001 });
      k.extras([3, 1.1, 0], 0);
    } }),

  SKILL('steam/cloud-hammer', 'Cloud hammer', m(ELEM, 'overhead-slam', 0.5, 10, 3, 'circle'), 2.0, {
    view: 'wide',
    act: act('smash', 0, 2.2, { weapon: 'hammer', windup: 0.6, hits: [{ t: 0, stop: 0.14, shake: 0.55, amp: 0.08 }] }),
    // P3=341
    build(fx, o) {
      const k = kit(fx, o, STEAM), kf = kit(fx, o, FIRE), I = [1.15, 0, 0];
      k.smoke({ ramp: VAPOR, count: 120, shape: 'ring', radius: 0.4, pos: I, dir: [0, 0.15, 0], radial: 1, speed: [3, 6], drag: 1.5, life: [1.5, 2.5], size: [0.6, 1.6], emit: 0.001 });
      kf.ring({ t0: 0, dur: 0.4, r: [0.2, 1.6], normal: 'up', pos: [I[0], 0.03, 0] });
      k.ring({ t0: 0, dur: 0.5, r: [0.3, 2.5], normal: 'up', pos: [I[0], 0.03, 0] });
      k.em({ count: 40, kind: 'drop', shape: 'sphere', radius: 0.3, pos: I, radial: 1, speed: [2, 4], gravity: [0, -9, 0], life: [0.6, 1], size: [0.06, 0.03], intensity: 1.5, emit: 0.001 });
      k.decal({ kind: 'glow', r: [1.2, 1.2], pos: [I[0], 0.02, 0], t0: 0, dur: 1.6 });
      k.sparks(I, 0, 40);
      k.light({ color: '#ff9a30', pos: [I[0], 1.2, 0.8], t0: 0, dur: 1.2, fade: [0.02, 0.5], intensity: 120 });
      fx.flash(0, 0.12, '#ffb060', 0.15);
      if (k.g >= 2) k.smoke({ ramp: VAPOR, count: 50, shape: 'ring', radius: 0.6, pos: [I[0], 0.6, 0], dir: [0, 0.15, 0], radial: 1, speed: [2, 4], life: [1.2, 2], size: [0.5, 1.2], delay: 0.05, emit: 0.001 });
      if (k.g === 3) k.smoke({ ramp: VAPOR, count: 50, shape: 'disc', radius: 0.3, pos: I, dir: [0, 1, 0], speed: [2, 4], life: [1.2, 2], size: [0.5, 1.2], delay: 0.1, emit: 0.5 });
      k.extras(I, 0);
    } }),
];
