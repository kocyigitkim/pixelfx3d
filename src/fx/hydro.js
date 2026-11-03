// Hydro (water element) category: 8 base-tier skills (PLAN2 B12). Built from the T-WHP, T-BUF/T-HEL, T-PUL, T-ORB and T-NOV-style layers.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, TAU, POSES, rock, addMat, WATER, VAPOR } from './_skill.js';
import { contact, bladeTable } from './melee.js';

const m = meta('hydro', 'base');
const G = [3, 0, 0];
const MIST = [[0, '#cfe6f5', 0], [0.15, '#bcd8ea', 0.55], [1, '#6a8aa0', 0]];
const lerp3 = (p, q, u) => p.map((v, i) => v + (q[i] - v) * u);
/** T-MEL-style contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });
/** T-BUF body glow pulse over the buff duration D */
const buffGlow = (fx, k, D) => fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(D - 0.6, D, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
/** T-BUF / T-HEL base: body glow, gather (30), ring, light, flash, extras (41 at grade 3) */
const buffBase = (fx, k, D, pose) => {
  fx.body.setPose(pose);
  buffGlow(fx, k, D);
  k.gather([0, 1, 0], 0, 0.3, 1.2, 30);
  k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
  k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: D, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / D), intensity: 40 });
  fx.flash(0.3, 0.1, k.col(0), 0.12);
  k.extras([0, 1.1, 0], 0.3);
};

export default [
  SKILL('hydro/tidal-lash', 'Tidal lash', m(['water'], 'whip', 0.3, 6, 3, 'arc'), 1.4, {
    view: 'side',
    act: { kind: 'throw', weapon: 'whip', target: [2.45, 0, 0], windup: 0.45, hits: [{ t: 0, stop: 0.07, shake: 0.12, amp: 0.025, push: 1.0 }] },
    // P3=203
    build(fx, o) {
      const k = kit(fx, o, WATER);
      const Hd = bladeTable(fx, -0.45, 0.6, 0.25), T = [2.2, 1.35, 0.1], N = 28;
      const ss = (a, b, x) => { const q = Math.min(1, Math.max(0, (x - a) / (b - a))); return q * q * (3 - 2 * q); };
      const pts = (t) => {
        const h = Hd(t), e = 0.3 + 0.7 * ss(-0.2, 0.0, t), ar = 1 - ss(-0.2, 0.0, t), after = ss(0.02, 0.4, t), out = [];
        for (let i = 0; i <= N; i++) { const u = i / N, q = u * e, s = Math.sin(Math.PI * u);
          out.push([h[0] + (T[0] - h[0]) * q - ar * s * 0.6 * (1 - u), h[1] + (T[1] - h[1]) * q + ar * s * 1.0 - after * s * 0.35 * u, h[2] + (T[2] - h[2]) * q + ar * 0.35 * Math.sin(u * 7 - t * 30) * s + after * 0.18 * Math.sin(u * 8 - t * 25) * u * (1 - after * 0.6)]); }
        return out;
      };
      k.ribbon({ points: pts, n: N, width: (u) => 0.05 * k.s * (1 - u * 0.6), head: () => 1.001, tail: 4, intensity: 1.0, t0: -0.45, dur: 1.3, fade: [0.05, 0.25] });
      k.ribbon({ points: pts, n: N, width: 0.02 * k.s, head: () => 1.001, tail: 4, intensity: 1.2, t0: -0.1, dur: 0.14, fade: [0.02, 0.1] });
      for (let i = 0; i < 6; i++) k.em({ count: 10, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 1, speed: [0.4, 1.2], gravity: [0, -9, 0], life: [0.3, 0.5], size: [0.03, 0.012], delay: 0, emit: 1.0, follow: (mm, a, t) => mm.position.set(...pts(t)[4 * i + 4]) });
      k.em({ count: 50, kind: 'drop', shape: 'sphere', radius: 0.1, pos: T, dir: [-1, 0.3, 0], spread: 1.2, speed: [1, 4], gravity: [0, -9, 0], bounce: 0.3, life: [0.4, 0.7], size: [0.03, 0.015], delay: 0, emit: 0.001 });
      k.smoke({ count: 20, shape: 'sphere', radius: 0.1, pos: T, ramp: MIST, dir: [0.3, 0.6, 0], spread: 1.4, speed: [0.3, 1.4], life: [0.6, 1.2], size: [0.2, 0.7], drag: 1.8, delay: 0, emit: 0.05 });
      k.ring({ t0: 0, dur: 0.3, r: [0.05, 0.9], width: [0.1, 0.015], normal: 'cam', pos: T, intensity: 1.4 });
      fx.water({ r: 0.8, pos: [2.4, 0, 0], ripples: [{ t: 0, x: 0, z: 0, amp: 1 }], deep: '#0b4f9c', shallow: '#4fb3ff' });
      ct(fx, k, T, 0, 30);
      k.light({ pos: [2.2, 1.4, 0.8], t0: 0, dur: 0.9, env: (t) => Math.exp(-4 * t) });
      fx.flash(0, 0.08, k.col(0), 0.1);
      if (k.g >= 2) k.ribbon({ points: (t) => pts(t).map((p) => [p[0], p[1] + 0.06, p[2] + 0.12]), n: N, width: 0.015 * k.s, head: () => 1.001, tail: 4, intensity: 0.8, t0: -0.3, dur: 0.9, fade: [0.05, 0.2] });
      if (k.g === 3) k.ring({ t0: 0.2, dur: 0.6, r: [0.2, 2.2], normal: 'up', pos: [2.45, 0, 0] });
      k.extras(T, 0);
    } }),

  SKILL('hydro/bubble-ward', 'Bubble ward', m(['water'], 'shield', 0.4, 20, 0, 'self'), 3.0, {
    body: true, view: 'body',
    // P3=371
    build(fx, o) {
      const k = kit(fx, o, WATER);
      buffBase(fx, k, 3.0, POSES.castCharge);
      const DIR = [[0.9, 0.4, 0.35], [-0.8, 0.4, 0.4], [0.1, -0.5, -1.0]], HIT = DIR.map((d) => [d[0], 1.2 + d[1], d[2]]);
      const SRC = [[1.8, 1.6, 0.4], [-1.6, 2.0, 0.6], [0.2, 0.2, -1.9]], TI = [1.0, 1.6, 2.2];
      k.shell({ r: [1.1, 1.1], power: 3, t0: 0.3, dur: 2.2, impacts: TI.map((t, i) => ({ t, dir: DIR[i] })) });
      k.em({ count: 150, kind: 'bubble', shape: 'sphere', radius: 1.0, radiusIn: 0.95, pos: [0, 1.2, 0], speed: [0.05, 0.2], life: [1.5, 2.5], size: [0.03, 0.06], delay: 0.3, emit: 2.1, t0: 0.3, t1: 2.6 });
      TI.forEach((ti, i) => {
        k.trail({ path: (t) => lerp3(SRC[i], HIT[i], sm(ti - 0.4, ti, t)), len: 0.3, width: 0.04, t0: ti - 0.4, dur: 0.45 });
        k.em({ count: 20, kind: 'drop', shape: 'sphere', radius: 0.05, pos: HIT[i], dir: DIR[i], spread: 1, speed: [0.8, 2.4], gravity: [0, -9, 0], life: [0.3, 0.6], size: [0.03, 0.015], delay: ti, emit: 0.001, t0: ti - 0.02 });
        k.ring({ t0: ti, dur: 0.35, r: [0.05, 0.5], normal: 'cam', pos: HIT[i] });
      });
      if (k.g >= 2) fx.water({ r: 1.2, ripples: [{ t: 1.0, x: 0, z: 0, amp: 0.05 }, { t: 1.6, x: 0, z: 0, amp: 0.05 }, { t: 2.2, x: 0, z: 0, amp: 0.05 }], deep: '#0b4f9c', shallow: '#4fb3ff' });
      if (k.g === 3) {
        k.em({ count: 60, kind: 'drop', shape: 'sphere', radius: 0.9, pos: [0, 1.2, 0], dir: [0, 1, 0], spread: 3, speed: [1.5, 3.5], gravity: [0, -9, 0], life: [0.5, 0.9], size: [0.03, 0.015], delay: 2.6, emit: 0.001, t0: 2.58 });
        k.smoke({ count: 30, shape: 'sphere', radius: 0.6, pos: [0, 1.2, 0], radial: 1, speed: [0.6, 1.6], life: [0.8, 1.4], size: [0.3, 0.7], ramp: VAPOR, delay: 2.6, emit: 0.001, t0: 2.58 });
        fx.flash(2.6, 0.1, k.col(0), 0.15);
      }
    } }),

  SKILL('hydro/riptide-pull', 'Riptide pull', m(['water'], 'pull', 0.6, 16, 6, 'circle'), 3.0, {
    view: 'wide',
    act: act('cast', null, 3, { target: [3.4, 0, 0] }),
    // P3=361
    build(fx, o) {
      const k = kit(fx, o, WATER);
      fx.water({ r: 2.2, pos: G, vortex: 1, waves: 0.4, speed: 1.2, k: 16, deep: '#0b4f9c', shallow: '#4fb3ff' });
      fx.on((t) => { fx.target.position.x = 3.4 - 0.4 * sm(0.2, 1.2, t); });
      k.em({ count: 120, kind: 'drop', shape: 'ring', radius: 2, pos: G, radial: 1, speed: [-2, -1], swirl: 4, size: [0.04, 0.02], life: [0.6, 1.0], delay: 0.2, emit: 2.0, t0: 0.2 });
      k.em({ count: 60, kind: 'bubble', shape: 'disc', radius: 2, pos: G, dir: [0, 1, 0], speed: [0.3, 0.8], life: [1, 1.6], delay: 0.2, emit: 2.0, t0: 0.2 });
      k.smoke({ count: 30, shape: 'disc', radius: 1.5, pos: G, ramp: VAPOR, speed: [0.3, 0.8], delay: 0.2, emit: 2.0, t0: 0.2 });
      for (let i = 0; i < 4; i++) {
        const plank = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.1), rock('#7a5a3a'));
        fx.mesh(plank, (t) => { const u = sm(0.2, 2.2, t), R = 2.2 * (1 - u) + 0.3 * u, a = (i * TAU) / 4 + 3 * TAU * u; plank.position.set(G[0] + R * Math.cos(a), 0.2, R * Math.sin(a)); plank.rotation.y = -a; }, { t0: 0, dur: 2.4 });
      }
      k.ring({ t0: 0.2, dur: 2.0, r: [2, 0.3], normal: 'up', pos: G });
      k.ring({ t0: 0.6, dur: 1.6, r: [2, 0.3], normal: 'up', pos: G });
      k.light({ pos: [3, 1.2, 1], t0: 0.2, dur: 2.4, env: (t) => 0.8 + 0.2 * Math.sin((TAU * 2 * t) / 2.4) });
      k.em({ count: 80, kind: 'drop', shape: 'disc', radius: 0.4, pos: G, dir: [0, 1, 0], spread: 0.6, speed: [3, 6], gravity: [0, -9, 0], bounce: 0.3, size: [0.04, 0.02], life: [0.6, 1.0], delay: 2.4, emit: 0.001, t0: 2.38 });
      fx.shake(2.4, 0.3, 0.03);
      fx.flash(2.4, 0.1, k.col(0), 0.1);
      if (k.g >= 2) k.beam({ pos: G, height: 1.5, r: [0.6, 0.1], t0: 2.4, dur: 0.5, fade: [0.05, 0.3] });
      if (k.g === 3) {
        k.em({ count: 30, kind: 'drop', shape: 'disc', radius: 0.3, pos: G, dir: [0, 1, 0], spread: 0.2, speed: [5, 7], gravity: [0, -9, 0], life: [0.8, 1.2], size: [0.04, 0.02], delay: 2.4, emit: 0.5, t0: 2.4 });
        k.ring({ t0: 2.4, dur: 0.5, r: [0.2, 2.2], normal: 'cam', pos: [3, 0.8, 0] });
      }
      k.extras(G, 2.4);
    } }),

  SKILL('hydro/mist-veil', 'Mist veil', m(['water', 'air'], 'buff-stealth', 0.4, 25, 0, 'self'), 3.0, {
    body: true, view: 'body',
    // P3=241
    build(fx, o) {
      const k = kit(fx, o, WATER);
      buffBase(fx, k, 3.0, POSES.idle);
      fx.on((t) => { const u = sm(0.2, 0.6, t) * (1 - sm(2.6, 3.0, t)); fx.body.set({ alpha: 1 - 0.55 * u }); });
      k.smoke({ count: 90, shape: 'ring', radius: 0.6, pos: [0, 1.0, 0], swirl: 1, ramp: MIST, speed: [0.1, 0.4], life: [1, 1.8], size: [0.3, 0.8], delay: 0.3, emit: 2.1, t0: 0.3 });
      k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 0.7, pos: [0, 1.1, 0], size: [0.05, 0.015], life: [0.3, 0.6], intensity: 1.5, delay: 0.3, emit: 2.1, t0: 0.3 });
      if (k.g >= 2) k.smoke({ count: 50, shape: 'disc', radius: 0.8, pos: [0, 0.05, 0], ramp: MIST, speed: [0.2, 0.5], delay: 0.3, emit: 2.1, t0: 0.3 });
      if (k.g === 3) { k.ghost('idle', [0, 0, 0.8], 0.3, 2.1, 0.35); k.ghost('idle', [0, 0, -0.8], 0.3, 2.1, 0.35); }
    } }),

  SKILL('hydro/geyser-line', 'Geyser line', m(['water'], 'line-eruption', 0.5, 10, 6, 'line'), 2.6, {
    view: 'wide',
    act: act('stomp', 0.5, 3.6),
    // P3=421
    build(fx, o) {
      const k = kit(fx, o, WATER);
      const L = k.light({ pos: [1, 1.2, 0.8], t0: 0, dur: 2.6, intensity: 60 });
      fx.on((t) => { L.l.position.x = 1 + 2.6 * sm(0.1, 0.9, t); });
      [1.0, 1.6, 2.2, 2.8, 3.4].forEach((x, i) => {
        const ti = 0.1 + 0.12 * i;
        k.em({ count: 40, kind: 'drop', shape: 'disc', radius: 0.2, pos: [x, 0.05, 0], dir: [0, 1, 0], speed: [5, 8], gravity: [0, -9, 0], life: [0.8, 1.2], bounce: 0.2, size: [0.04, 0.02], delay: ti, emit: 0.001, t0: ti - 0.02 });
        k.smoke({ count: 10, shape: 'disc', radius: 0.2, pos: [x, 0.05, 0], ramp: VAPOR, speed: [0.5, 1.5], life: [0.6, 1.0], delay: ti, emit: 0.001, t0: ti });
        k.ring({ t0: ti, dur: 0.4, r: [0.1, 0.7], normal: 'up', pos: [x, 0, 0] });
        k.decal({ kind: 'glow', r: [0.5, 0.5], pos: [x, 0, 0], t0: ti, dur: 1.2, fade: [0.05, 1] });
        if (k.g >= 2) k.em({ count: 10, kind: 'bubble', shape: 'point', pos: [x, 0.1, 0], dir: [0, 1, 0], speed: [0.5, 1.2], life: [0.6, 1.0], size: [0.04, 0.06], delay: ti, emit: 0.001, t0: ti });
      });
      fx.flash(0.5, 0.1, k.col(0), 0.12);
      if (k.g === 3) {
        k.em({ count: 80, kind: 'drop', shape: 'disc', radius: 0.3, pos: [3.6, 0.05, 0], dir: [0, 1, 0], speed: [6, 9], gravity: [0, -9, 0], bounce: 0.2, life: [1, 1.4], size: [0.05, 0.025], delay: 0.6, emit: 0.001, t0: 0.58 });
        k.beam({ pos: [3.6, 0, 0], height: 3, r: [0.3, 0.15], t0: 0.6, dur: 1.2, fade: [0.05, 0.5] });
      }
      k.extras([3.6, 0.6, 0], 0.6);
    } }),

  SKILL('hydro/rain-mend', 'Rain mend', m(['water'], 'heal', 0.8, 8, 0, 'self'), 3.0, {
    body: true, view: 'body',
    // P3=351
    build(fx, o) {
      const k = kit(fx, o, WATER);
      buffBase(fx, k, 3.0, POSES.idle);
      k.smoke({ count: 40, shape: 'disc', radius: 0.7, pos: [0, 2.8, 0], ramp: VAPOR, speed: [0.1, 0.3], life: [1.5, 2.5], delay: 0, emit: 2.4 });
      k.em({ count: 120, kind: 'drop', shape: 'disc', radius: 0.6, pos: [0, 2.6, 0], dir: [0, -1, 0], spread: 0.1, speed: [3, 4], life: [0.5, 0.7], size: [0.03, 0.015], delay: 0.3, emit: 2.1, t0: 0.3 });
      k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 0.9, pos: [0, 1.2, 0], size: [0.05, 0.015], life: [0.25, 0.4], delay: 0.3, emit: 2.1, t0: 0.3 });
      fx.water({ r: 0.9, ripples: [0.6, 1.1, 1.6, 2.1].map((t, i) => ({ t, x: 0.2 * Math.cos(i * 2), z: 0.2 * Math.sin(i * 2), amp: 0.05 })), waves: 0.2, speed: 1, decay: 1.2, k: 16, deep: '#0b4f9c', shallow: '#4fb3ff' });
      k.em({ count: 60, kind: 'soft', shape: 'disc', radius: 0.7, pos: [0, 0.2, 0], dir: [0, 1, 0], speed: [0.5, 1.0], life: [1.2, 1.8], delay: 0.3, emit: 2.1, t0: 0.3 });
      k.ring({ t0: 1.5, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.beam({ from: [0, 3.2, 0], to: [0, 0, 0], r: [0.3, 0.5], intensity: 0.4, t0: 0.3, dur: 2.1 });
      k.em({ count: 30, kind: 'petal', shape: 'disc', radius: 0.8, pos: [0, 2.4, 0], dir: [0, -1, 0], spread: 0.3, speed: [0.4, 0.8], life: [1.5, 2.2], blend: 'normal', lit: 1, delay: 0.3, emit: 2.1, t0: 0.3 });
    } }),

  SKILL('hydro/orb-cascade', 'Orb cascade', m(['water'], 'orbit-shoot', 0.6, 10, 8, 'point'), 2.6, {
    view: 'wide',
    act: act('cast', 1.5, 4, { hits: [{ t: 1.6, stop: 0.05, shake: 0.2, amp: 0.03, push: 0.8 }, { t: 1.7, stop: 0.05, shake: 0.2, amp: 0.03, push: 0.8 }, { t: 1.8, stop: 0.05, shake: 0.25, amp: 0.03, push: 0.8 }] }),
    // P3=273
    build(fx, o) {
      const k = kit(fx, o, WATER);
      const TGT = [3.8, 1.2, 0];
      // orb i orbits the caster until Tf, then flies to the target; splash on arrival
      const shot = (i) => {
        const Tf = 1.2 + 0.15 * i, a0 = i * 1.3;
        const P = (t) => lerp3([0.8 * Math.cos(a0 + 5 * t), 1.3, 0.8 * Math.sin(a0 + 5 * t)], TGT, sm(Tf, Tf + 0.3, t));
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshStandardMaterial({ color: '#6fc6ff', roughness: 0.05, transparent: true, opacity: 0.7, emissive: '#1b5fa0', emissiveIntensity: 0.4 }));
        fx.mesh(orb, (t) => { orb.position.set(...P(t)); orb.visible = t < Tf + 0.3; }, { t0: -0.2, dur: Tf + 0.35 });
        k.trail({ path: P, len: 0.3, width: 0.04, t0: Tf, dur: 0.35 });
        k.em({ count: 20, kind: 'drop', shape: 'sphere', radius: 0.1, pos: TGT, dir: [0, 1, 0], spread: 3, speed: [1, 3], gravity: [0, -9, 0], life: [0.3, 0.5], size: [0.03, 0.015], delay: Tf + 0.3, emit: 0.001, t0: Tf + 0.28 });
        k.smoke({ count: 6, shape: 'sphere', radius: 0.2, pos: TGT, ramp: VAPOR, speed: [0.3, 0.8], life: [0.5, 0.9], size: [0.2, 0.5], delay: Tf + 0.3, emit: 0.001, t0: Tf + 0.28 });
      };
      for (let i = 0; i < 5; i++) shot(i);
      k.em({ count: 20, kind: 'drop', shape: 'ring', radius: 0.8, pos: [0, 1.3, 0], dir: [0, -1, 0], speed: [0.2, 0.5], gravity: [0, -9, 0], life: [0.3, 0.5], size: [0.03, 0.015], delay: 0.2, emit: 1.5, t0: 0.2 });
      k.gather([0, 1.1, 0], 0.6, 0.6, 0.7, 30);
      k.light({ pos: [3.8, 1.6, 0.8], t0: 1.5, dur: 1.1, env: (t) => Math.exp(-3 * Math.max(0, t - 1.5)) });
      fx.flash(1.6, 0.1, k.col(0), 0.1);
      if (k.g >= 2) for (let i = 5; i < 7; i++) shot(i);
      if (k.g === 3) {
        k.ring({ t0: 1.6, dur: 0.5, r: [0.2, 2.2], normal: 'cam', pos: TGT });
        fx.water({ r: 0.8, pos: [3.8, 0, 0], ripples: [{ t: 1.6, x: 0, z: 0, amp: 0.1 }], deep: '#0b4f9c', shallow: '#4fb3ff' });
      }
      k.extras(TGT, 1.6);
    } }),

  SKILL('hydro/tsunami-arc', 'Tsunami arc', m(['water'], 'wave', 0.8, 18, 7, 'arc'), 2.6, {
    view: 'long',
    act: act('sideslash', 0.6, 4),
    // P3=571
    build(fx, o) {
      const k = kit(fx, o, WATER);
      // one wave sheet: front travels x .8 -> 4.5 over [d, d+1.2], height scales in and out, crest curls forward
      const sheet = (H, d) => {
        const X = (t) => 0.8 + 3.7 * sm(d, d + 1.2, t), S = (t) => Math.max(1e-3, sm(d, d + 0.4, t) * (1 - sm(d + 0.9, d + 1.2, t)));
        // open crescent (concave side faces -x); scale.x = arc height because the arc lies in the xy plane after the rotations
        const geo = new THREE.CylinderGeometry(1.2, 1.2, 2.8, 24, 1, true, Math.PI * 0.55, Math.PI * 0.9);
        const wave = new THREE.Mesh(geo, addMat(k.col(1), 1.1, 0.75)); wave.rotation.set(0, -Math.PI / 2, Math.PI / 2);
        fx.mesh(wave, (t) => { wave.position.set(X(t), H / 2, 0); wave.scale.x = S(t); wave.visible = S(t) > 0.01; }, { t0: 0, dur: d + 1.3 });
        k.ribbon({ points: (t) => Array.from({ length: 17 }, (_, j) => { const z = -2 + 0.25 * j; return [X(t) + 0.5 * (z / 2) ** 2, H / 2 + (H / 2) * S(t), z]; }), n: 16, width: 0.08, intensity: 1.2, t0: d, dur: 1.3 });
        return { X, S, H };
      };
      const W = sheet(1.8, 0);
      k.em({ count: 140, kind: 'drop', shape: 'box', shapeSize: [0.2, 0.2, 2.6], dir: [1, 1.2, 0], spread: 0.5, speed: [1.5, 3], life: [0.4, 0.7], size: [0.06, 0.02], gravity: [0, -9, 0], intensity: 1.5, delay: 0, emit: 1.2, t0: -0.02, follow: (mm, a, t) => mm.position.set(W.X(t), 1.9, 0) });
      k.smoke({ ramp: VAPOR, count: 60, shape: 'box', shapeSize: [0.3, 0.2, 2.6], size: [0.5, 1.1], life: [0.6, 1.0], delay: 0, emit: 1.2, follow: (mm, a, t) => mm.position.set(W.X(t) - 0.3, 0.5, 0) });
      k.em({ count: 120, kind: 'drop', shape: 'sphere', radius: 0.15, dir: [1, 0.6, 0], spread: 0.6, speed: [0.5, 1.5], gravity: [0, -9, 0], life: [0.5, 0.9], size: [0.03, 0.015], delay: 0, emit: 1.2, follow: (mm, a, t) => mm.position.set(W.X(t), W.H / 2 + (W.H / 2) * W.S(t), 0) });
      k.em({ count: 60, kind: 'bubble', shape: 'box', shapeSize: [1, 0.4, 2], pos: [2.2, 0.5, 0], dir: [1, 0, 0], speed: [0.5, 1.5], life: [0.8, 1.4], size: [0.03, 0.05], delay: 0.1, emit: 1.0, t0: 0.1 });
      k.smoke({ count: 40, shape: 'disc', radius: 0.8, pos: [2.0, 0.3, 0], dir: [1, 0.2, 0], speed: [0.3, 1.0], life: [0.8, 1.4], size: [0.3, 0.7], ramp: VAPOR, delay: 0.2, emit: 1.2, t0: 0.2 });
      // crash at the far end
      k.em({ count: 80, kind: 'drop', shape: 'disc', radius: 0.2, pos: [4.5, 0.2, 0], dir: [0, 1, 0], spread: 1, speed: [2, 5], gravity: [0, -9, 0], bounce: 0.2, life: [0.6, 1.0], size: [0.04, 0.02], delay: 1.2, emit: 0.001, t0: 1.18 });
      k.ring({ t0: 1.2, dur: 0.6, r: [0.3, 2.5], normal: 'up', pos: [4.5, 0, 0] });
      k.light({ pos: [4.5, 1.2, 0.8], t0: 1.2, dur: 1.4, env: (t) => Math.exp(-3 * Math.max(0, t - 1.2)) });
      fx.water({ r: 2, pos: [4, 0, 0], ripples: [{ t: 1.2, x: 0, z: 0, amp: 0.1 }], deep: '#0b4f9c', shallow: '#4fb3ff' });
      fx.flash(1.2, 0.08, k.col(0), 0.1);
      if (k.g >= 2) sheet(1.3, 0.3);
      if (k.g === 3) {
        k.beam({ pos: [4.5, 0, 0], height: 2.5, r: [0.3, 0.1], t0: 1.2, dur: 1.0, fade: [0.05, 0.5] });
        k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 0.4, pos: [4.5, 1, 0], size: [0.1, 0.03], life: [0.2, 0.4], delay: 1.2, emit: 0.001, t0: 1.2 });
      }
      k.extras([4.5, 0.8, 0], 1.2);
    } }),
];
