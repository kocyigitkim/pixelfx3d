// Pyro class: 8 fire-element base skills (PLAN2 B11). Built from the T-WHP, T-BUF, T-GND, T-PRJ and T-LEP templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, metal, FIRE } from './_skill.js';
import { bladeTable, contact } from './melee.js';

const m = meta('pyro', 'base');
const G = [3, 0, 0];         // ground target
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });

export default [
  SKILL('pyro/ember-lash', 'Ember lash', m(['fire'], 'whip', 0.3, 6, 3, 'arc'), 1.4, {
    view: 'side',
    act: { kind: 'throw', weapon: 'whip', target: [2.5, 0, 0], windup: 0.45, hits: [{ t: 0, stop: 0.07, shake: 0.12, amp: 0.025, push: 1 }] },
    // P3=231
    build(fx, o) {
      const k = kit(fx, o, FIRE), N = 28, T = fx.anchor('tgt', 0, [-0.3, 0, 0.1]); // whip tip lands on target chest
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
      for (let i = 0; i < 6; i++) k.em({ count: 10, kind: 'spark', shape: 'point', dir: [0, 1, 0], spread: 1, speed: [0.5, 1.5], life: [0.3, 0.6], gravity: [0, -3, 0], size: [0.05, 0.02], stretch: 1, intensity: 2.5, emit: 0.8, follow: (mm, ta, t) => mm.position.set(...pts(t)[4 * i + 4]) });
      ct(fx, k, T, 0, 30, { lightI: 0 });
      k.em({ count: 30, kind: 'flame', shape: 'sphere', radius: 0.1, pos: T, dir: [0, 1, 0], speed: [0.5, 2], life: [0.3, 0.6], size: [0.2, 0.08], aspect: 1.8, intensity: 0.4, emit: 0.001 });
      k.smoke({ count: 15, shape: 'sphere', radius: 0.08, pos: T, dir: [0.3, 0.6, 0], spread: 1.4, speed: [0.3, 1.4], life: [0.6, 1.2], size: [0.2, 0.7], drag: 1.8, emit: 0.05 });
      if (k.g >= 2) k.em({ count: 30, kind: 'spark', shape: 'point', dir: [0, -1, 0], spread: 0.3, speed: [0.2, 0.8], life: [0.5, 0.9], gravity: [0, -4, 0], size: [0.05, 0.02], stretch: 1, intensity: 2.5, delay: 0.1, emit: 0.6, follow: (mm, ta, t) => mm.position.set(...pts(t)[14]) });
      if (k.g === 3) {
        k.ribbon({ points: (t) => pts(t).map(([x, y, z]) => [x, y, -z]), n: N, width: (u) => 0.05 * k.s * (1 - u * 0.6), head: () => 1.001, tail: 4, t0: 0.45, dur: 0.9, fade: [0.05, 0.25] });
        ct(fx, k, T, 0.45, 20);
      }
      k.extras(T, 0);
    } }),

  SKILL('pyro/inferno-wheel', 'Inferno wheel', m(['fire'], 'spin-ring', 0.4, 12, 2, 'ring'), 2.2, {
    view: 'high',
    act: { kind: 'slash', weapon: 'sword', target: [1.47, 0, 0], windup: 0.4, keys: [[-0.3, 'guard'], [0, 'sideBack'], [0.2, 'sideCut', 'snap'], [0.6, 'sideBack', 'snap'], [1.0, 'sideCut', 'snap'], [1.6, 'sideBack'], [2.2, 'guard']], hits: [{ t: 0.2, stop: 0.05, shake: 0.2, amp: 0.03, push: 1 }, { t: 0.6, stop: 0.05, shake: 0.2, amp: 0.03, push: 1 }, { t: 1.0, stop: 0.07, shake: 0.3, amp: 0.04, push: 1.5 }] },
    // P3=352
    build(fx, o) {
      const k = kit(fx, o, FIRE);
      k.em({ count: 140, kind: 'flame', shape: 'ring', radius: 1.4, radiusIn: 1.3, pos: [0, 1, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1.2], life: [0.4, 0.8], size: [0.25, 0.1], aspect: 1.8, swirl: 5, intensity: 0.45, emit: 1.6 }); // anchor-ok
      for (let i = 0; i < 4; i++) k.slash({ center: [0, 1, 0], radius: 1.4, a0: 0, a1: 1.6, tilt: Math.PI / 2, t0: 0.25 * i, dur: 0.5 }); // anchor-ok
      k.ring({ t0: 0, dur: 0.8, r: [0.2, 1.4], normal: 'up', pos: [0, 1, 0] }); // anchor-ok
      k.decal({ kind: 'scorch', r: [1.6, 1.6], t0: 0, dur: 2.2 });
      const L = k.light({ pos: [0, 1, 0], t0: 0, dur: 2.2, fade: [0.05, 0.3], flicker: 0.3, intensity: 50 }); // anchor-ok
      fx.on((t) => { const a = (TAU * 3 * t) / 2.2; L.obj.position.set(1.2 * Math.cos(a), 1, 1.2 * Math.sin(a)); });
      k.smoke({ count: 30, shape: 'ring', radius: 1.4, pos: [0, 1, 0], radial: 1, speed: [0.5, 1.5], life: [1, 1.6], size: [0.4, 0.9], delay: 0.3, emit: 1.5 }); // anchor-ok
      if (k.g >= 2) k.em({ count: 80, kind: 'flame', shape: 'ring', radius: 1.0, pos: [0, 1.6, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1.2], life: [0.4, 0.8], size: [0.2, 0.1], aspect: 1.8, swirl: -5, intensity: 0.4, delay: 0.3, emit: 1.5 }); // anchor-ok
      if (k.g === 3) {
        k.ring({ t0: 0, dur: 1.8, r: [1.4, 4], normal: 'up', pos: [0, 1, 0], intensity: 1.8 }); // anchor-ok
        k.sparks([0, 1, 0], 0.2, 60, { speed: [3, 6] }); // anchor-ok
      }
      k.extras([0, 1, 0], 1.0); // anchor-ok
    } }),

  SKILL('pyro/cinder-burst', 'Cinder burst', m(['fire'], 'nova-short', 0.2, 8, 4, 'circle'), 1.4, {
    view: 'wide',
    act: act('cast', 0, 2.4, { windup: 0.3 }),
    // P3=309
    build(fx, o) {
      const k = kit(fx, o, FIRE);
      k.gather([0, 0.3, 0], -0.3, 0.3, 1, 30);
      k.em({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.2, pos: [0, 0.3, 0], radial: 1, speed: [6, 12], drag: 2, life: [0.4, 0.7], size: [0.07, 0.02], stretch: 1.5, intensity: 3, emit: 0.001 });
      k.em({ count: 60, kind: 'flame', shape: 'sphere', radius: 0.3, pos: [0, 0.3, 0], radial: 1, speed: [2, 5], life: [0.3, 0.6], size: [0.4, 0.15], aspect: 1.8, intensity: 0.4, emit: 0.001 });
      k.ring({ t0: 0, dur: 0.35, r: [0.2, 2.2], normal: 'cam', pos: [0, 1, 0] }); // anchor-ok
      k.decal({ kind: 'scorch', r: [1.2, 1.8] });
      k.smoke({ count: 40, shape: 'disc', radius: 0.6, pos: [0, 0.1, 0], radial: 1, speed: [1, 2.5], life: [1, 1.6], size: [0.6, 1.2], emit: 0.2 });
      if (k.g >= 2) k.em({ count: 40, kind: 'shard', shape: 'point', pos: [0, 0.3, 0], radial: 1, speed: [3, 6], gravity: [0, -9, 0], bounce: 0.3, life: [0.6, 1.2], size: [0.1, 0.05], emit: 0.001 });
      if (k.g === 3) {
        k.ring({ t0: 0.15, dur: 0.25, r: [0.1, 0.8], normal: 'cam', pos: [0, 1, 0] }); // anchor-ok
        k.glint([0, 1, 0], 0.15, 1); // anchor-ok
      }
      k.extras([0, 0.3, 0], 0);
    } }),

  SKILL('pyro/flare-lance', 'Flare lance', m(['fire'], 'projectile-pierce', 0.4, 8, 10, 'line'), 1.8, {
    view: 'long',
    act: act('throw', 0.2, 3.8, { weapon: 'spear' }),
    // P3=382
    build(fx, o) {
      const k = kit(fx, o, FIRE);
      const A = fx.anchor('handR', 0), E = fx.anchor('tgt', 0, [1.7, 0, 0]); // release hand -> through target chest
      const P = (t) => { const u = clamp(t / 0.3); return [A[0] + (E[0] - A[0]) * u, A[1] + (E[1] - A[1]) * u, A[2] + (E[2] - A[2]) * u]; };
      const spear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 1.0, 6), metal('#3a2a1a', '#ff9a30', 1.5));
      spear.rotation.z = -Math.PI / 2;
      fx.mesh(spear, (t) => spear.position.set(...P(t)), { t0: -0.1, dur: 0.6 });
      k.em({ count: 60, kind: 'flame', shape: 'point', dir: [1, 0, 0], spread: 0.1, speed: [0.5, 1.2], life: [0.3, 0.5], size: [0.4, 0.16], aspect: 1.6, intensity: 0.4, emit: 0.3, follow: (mm, ta, t) => mm.position.set(...P(t)) });
      k.em({ count: 120, kind: 'flame', shape: 'point', dir: [-1, 0, 0], spread: 0.25, speed: [0.5, 1.2], life: [0.25, 0.4], size: [0.45, 0.15], aspect: 1.6, intensity: 0.5, delay: 0, emit: 0.3, t0: -0.02, follow: (mm, ta, t) => mm.position.set(...P(t)) });
      k.trail({ path: P, t0: 0, dur: 0.3, len: 0.5, width: 0.06 });
      k.gather(A, 0, 0.3, 0.7, 30);
      k.ring({ t0: 0.2, dur: 0.4, r: [0.1, 1.2], normal: [1, 0, 0], pos: fx.anchor('tgt', 0, [0, 0.1, 0]) });
      k.sparks(fx.anchor('tgt', 0, [0, 0.1, 0]), 0.2, 50, { dir: [1, 0.2, 0] });
      k.em({ count: 40, kind: 'flame', shape: 'point', pos: fx.anchor('tgt', 0, [0, 0.1, 0]), dir: [0, 1, 0], spread: 0.4, speed: [0.3, 1], life: [0.4, 0.8], size: [0.3, 0.12], aspect: 1.6, intensity: 0.4, delay: 0.2, emit: 0.8 });
      if (k.g >= 2) for (const dy of [-0.12, -0.04, 0.04, 0.12]) k.ribbon({ points: (t) => { const p = P(t); return [[p[0] - 1.2, p[1] + dy, p[2]], [p[0], p[1] + dy, p[2]]]; }, n: 1, width: 0.03, head: () => 1.001, fade: [0.05, 0.2], t0: 0, dur: 0.5 });
      if (k.g === 3) {
        k.em({ count: 40, kind: 'flame', shape: 'sphere', radius: 0.3, pos: E, dir: [0, 1, 0], spread: 0.8, speed: [1, 3], life: [0.3, 0.6], size: [0.3, 0.12], aspect: 1.8, intensity: 0.4, delay: 0.3, emit: 0.001 });
        k.ring({ t0: 0.3, dur: 0.5, r: [0.2, 1.6], normal: 'up', pos: [E[0], 0.05, 0] });
      }
      k.extras(fx.anchor('tgt', 0, [0, 0.1, 0]), 0.2, 'B');
    } }),

  SKILL('pyro/heat-haze-veil', 'Heat haze veil', m(['fire'], 'buff-aura', 0.5, 20, 0, 'self'), 2.8, {
    body: true, view: 'body',
    // P3=211
    build(fx, o) {
      const k = kit(fx, o, FIRE);
      fx.body.setPose(POSES.guard);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.4, 2.8, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30); // anchor-ok
      k.em({ count: 60, kind: 'soft', shape: 'sphere', radius: 0.45, pos: [0, 0.3, 0], dir: [0, 1, 0], speed: [0.2, 0.5], life: [1.5, 2.5], size: [0.8, 1.2], intensity: 0.15, emit: 2.8 });
      k.em({ count: 40, kind: 'flame', shape: 'ring', radius: 0.4, pos: [0, 0.2, 0], dir: [0, 1, 0], speed: [0.3, 0.6], life: [0.6, 1], size: [0.15, 0.08], aspect: 1.8, intensity: 0.4, emit: 2.8 });
      for (let i = 0; i < 5; i++) {
        const a = (i * TAU) / 5;
        k.ribbon({ points: (t) => Array.from({ length: 9 }, (_, j) => { const r = 0.45 + 0.05 * Math.sin((TAU * 2 * t) / 2.8 + i); return [r * Math.cos(a), 0.2 + (1.8 * j) / 8, r * Math.sin(a)]; }), n: 8, width: 0.03, intensity: 0.4, t0: 0, dur: 2.8 });
      }
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 2.8, fade: [0.1, 0.6], flicker: 0.3, env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / 2.8), intensity: 40 });
      if (k.g >= 2) k.em({ count: 40, kind: 'spark', shape: 'ring', radius: 0.5, pos: [0, 0.6, 0], dir: [0, 1, 0], speed: [0.4, 1], life: [0.5, 0.7], swirl: 2, size: [0.05, 0.02], stretch: 1, intensity: 2.5, emit: 2.8 });
      if (k.g === 3) {
        k.decal({ kind: 'glow', r: [1, 1] });
        k.ring({ t0: 0.3, dur: 0.4, r: [0.2, 1.4], normal: 'cam', pos: fx.anchor('chest', 0, [0.02, -0.12, 0]) });
      }
      k.extras(fx.anchor('chest', 0, [0.02, -0.12, 0]), 0.3);
    } }),

  SKILL('pyro/pyre-sigil', 'Pyre sigil', m(['fire'], 'delayed-column', 0.6, 12, 6, 'circle'), 2.8, {
    view: 'wide',
    act: act('cast', 1.2, 3),
    // P3=738
    build(fx, o) {
      const k = kit(fx, o, FIRE);
      k.decal({ kind: 'rune', r: [1.4, 1.4], pos: G, t0: -0.4, dur: 1.8, reveal: 0.5, glyphs: 14, poly: 6, spin: 0.4 });
      k.ring({ t0: 0.9, dur: 0.3, r: [1.4, 0.3], normal: 'up', pos: G, decay: 0.2 });
      k.em({ count: 60, kind: 'flame', shape: 'ring', radius: 1.3, radiusIn: 1.2, pos: G, dir: [0, 1, 0], speed: [0.5, 1], life: [0.5, 1], size: [0.2, 0.08], aspect: 1.8, intensity: 0.4, delay: 0.3, emit: 0.9 });
      k.em({ count: 200, kind: 'flame', shape: 'disc', radius: 0.7, pos: G, dir: [0, 1, 0], speed: [3, 6], life: [0.5, 1], size: [0.4, 0.2], aspect: 2, intensity: 0.45, delay: 1.2, emit: 0.8 });
      k.em({ count: 200, kind: 'flame', shape: 'disc', radius: 0.5, pos: [G[0], 0.05, 0], dir: [0, 1, 0], spread: 0.08, speed: [4, 6.5], life: [0.5, 0.8], size: [0.7, 0.3], aspect: 2.2, intensity: 0.45, turb: [0.4, 1.6], delay: 1.2, emit: 0.6, t0: 1.18 });
      k.ring({ r: [0.3, 2.6], normal: 'cam', pos: [G[0], 1.2, 0], t0: 1.2, dur: 0.4, intensity: 1.6 });
      k.beam({ pos: G, height: 6, r: [0.8, 0.5], intensity: 0.3, t0: 1.2, dur: 1.4, fade: [0.1, 0.5] });
      k.smoke({ count: 60, shape: 'disc', radius: 0.7, pos: G, dir: [0, 1, 0], speed: [1, 2], life: [1.5, 2.5], size: [0.8, 1.4], delay: 1.2, emit: 1.2 });
      k.sparks(G, 1.2, 60);
      if (k.g >= 2) k.em({ count: 40, kind: 'spark', shape: 'ring', radius: 0.6, pos: G, dir: [0, 1, 0], swirl: 4, speed: [1, 2], life: [0.5, 0.7], size: [0.05, 0.02], stretch: 1, intensity: 2.5, delay: 1.2, emit: 1.2 });
      if (k.g === 3) {
        k.em({ count: 40, kind: 'flame', shape: 'sphere', radius: 0.4, pos: [3, 5, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.5, 1.5], life: [0.5, 0.9], size: [0.4, 0.2], aspect: 1.8, intensity: 0.4, delay: 2.0, emit: 0.001 });
        k.ring({ t0: 2.0, dur: 0.5, r: [0.2, 2], normal: 'cam', pos: [3, 5, 0] });
      }
      k.extras(G, 1.2);
    } }),

  SKILL('pyro/ashfall', 'Ashfall', m(['fire'], 'ground-dot', 0.8, 16, 6, 'circle'), 3.2, {
    view: 'wide',
    act: { kind: 'castup', target: [3, 0, 0], windup: 0.6, hits: [{ t: 0.6, stop: 0.06, shake: 0.3, amp: 0.04, push: 1.6 }, { t: 1.2, stop: 0, shake: 0.05, amp: 0.02, push: 0 }, { t: 1.8, stop: 0, shake: 0.05, amp: 0.02, push: 0 }, { t: 2.4, stop: 0, shake: 0.05, amp: 0.02, push: 0 }] },
    // P3=678
    build(fx, o) {
      const k = kit(fx, o, FIRE);
      const TOP = [3, 4, 0];
      k.smoke({ count: 50, shape: 'disc', radius: 1.6, pos: TOP, dir: [0, -1, 0], speed: [0.2, 0.5], life: [3, 4], size: [0.8, 1.6], emit: 3 });
      k.em({ count: 120, kind: 'dust', blend: 'normal', lit: 1, shape: 'disc', radius: 1.6, pos: TOP, dir: [0, -1, 0], speed: [1, 1.5], life: [1.5, 2.5], size: [0.1, 0.25], ramp: [[0, '#7a7a78', 0], [0.15, '#6a6a68', 0.55], [1, '#2a2a28', 0]], delay: 0.2, emit: 2.6 });
      k.em({ count: 100, kind: 'spark', shape: 'disc', radius: 1.8, pos: [3, 3, 0], dir: [0, -1, 0], spread: 0.4, speed: [0.2, 0.6], life: [1.5, 2.5], gravity: [0, -0.5, 0], size: [0.05, 0.02], stretch: 0.6, intensity: 1.5, delay: 0.2, emit: 2.6 });
      k.em({ count: 60, kind: 'spark', shape: 'disc', radius: 1.2, pos: [3, 0.05, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.5, 1.5], life: [0.5, 1], gravity: [0, -4, 0], size: [0.06, 0.02], stretch: 0.8, intensity: 1.5, emit: 2.4 });
      k.decal({ kind: 'scorch', r: [0.5, 1.8], heat: [0, 1], pos: G, t0: 0, dur: 3.2 });
      k.light({ pos: [3, 1, 0.8], t0: 0, dur: 3.2, fade: [0.1, 0.8], flicker: 0.3, intensity: 40 });
      k.em({ count: 120, kind: 'flake', shape: 'disc', radius: 1.6, pos: [3, 3.2, 0], dir: [0, -1, 0], spread: 0.3, speed: [0.6, 1.1], life: [2.2, 3.0], size: [0.05, 0.03], ramp: [[0, '#8a8078', 0], [0.2, '#6a625a', 0.8], [1, '#2a2622', 0]], blend: 'normal', lit: 1, turb: [0.3, 1.2], delay: 0.2, emit: 2.6, t0: 0.18 });
      k.em({ count: 70, kind: 'spark', shape: 'disc', radius: 1.6, pos: [3, 3.0, 0], dir: [0, -1, 0], spread: 0.3, speed: [0.8, 1.4], life: [1.6, 2.4], size: [0.04, 0.015], intensity: 1.5, ramp: [[0, '#fff0b0'], [0.5, '#ff8a20'], [1, '#400', 0]], delay: 0.2, emit: 2.6, t0: 0.18 });
      if (k.g >= 2) k.em({ count: 40, kind: 'flame', shape: 'disc', radius: 1.2, pos: [3, 0.05, 0], dir: [0, 1, 0], speed: [0.2, 0.6], life: [0.5, 1], size: [0.2, 0.1], aspect: 1.8, intensity: 0.4, delay: 0.2, emit: 2.6 });
      if (k.g === 3) k.em({ count: 40, kind: 'streak', shape: 'disc', radius: 1.6, pos: TOP, dir: [0, -1, 0], speed: [4, 6], life: [0.5, 0.8], size: [0.1, 0.04], stretch: 1.5, intensity: 1.5, delay: 0.5, emit: 2.2 });
      k.extras(G, 0.6);
    } }),

  SKILL('pyro/phoenix-dive', 'Phoenix dive', m(['fire'], 'leap-dive', 0.6, 16, 6, 'point'), 2.2, {
    view: 'wide',
    act: act('stomp', 0, 3, { windup: 0.7, hits: [{ t: 0, stop: 0.12, shake: 0.55, amp: 0.08, push: 2 }] }),
    // P3=498
    build(fx, o) {
      const k = kit(fx, o, FIRE);
      const BX = (t) => 2 * sm(-0.35, 0, t), BY = (t) => 0.8 * Math.sin(Math.PI * clamp((t + 0.35) / 0.35));
      fx.on((t) => { fx.body.position.x = BX(t); fx.body.position.y = BY(t); });
      const wing = (sd) => (t) => { const bx = BX(t), by = BY(t), u = clamp((t + 0.35) / 0.35); return [[bx, by + 1.3, 0], [bx - 0.5 * u, by + 1.2, sd * 0.6], [bx - 0.9 * u, by + 1.0, sd * 1.2]]; };
      k.ribbon({ points: wing(1), n: 2, width: 0.05, head: () => 1.001, fade: [0.05, 0.3], t0: -0.35, dur: 1.2 });
      k.ribbon({ points: wing(-1), n: 2, width: 0.05, head: () => 1.001, fade: [0.05, 0.3], t0: -0.35, dur: 1.2 });
      k.trail({ path: (t) => [BX(t), BY(t) + 1.0, 0], len: 0.6, width: 0.1, t0: -0.35, dur: 0.35 });
      k.em({ count: 80, kind: 'flame', shape: 'sphere', radius: 0.2, dir: [-1, -0.3, 0], spread: 0.6, speed: [0.5, 1.5], life: [0.4, 0.8], size: [0.25, 0.1], aspect: 1.8, intensity: 0.4, delay: -0.35, emit: 0.35, t0: -0.35, follow: (mm, ta, t) => mm.position.set(BX(t), BY(t) + 1.0, 0) });
      k.em({ count: 160, kind: 'flame', shape: 'sphere', radius: 0.25, dir: [0, 1, 0], spread: 0.5, speed: [0.4, 1.0], life: [0.3, 0.5], size: [0.5, 0.2], aspect: 1.5, intensity: 0.5, delay: -0.35, emit: 0.35, t0: -0.37, follow: (m, a, t) => m.position.set(fx.body.position.x, fx.body.position.y + 1.0, 0) });
      k.trail({ path: (t) => [fx.body.position.x - 0.3, fx.body.position.y + 1.2, 0.6], t0: -0.35, dur: 0.35, len: 0.5, width: 0.18, intensity: 1.6 });
      k.trail({ path: (t) => [fx.body.position.x - 0.3, fx.body.position.y + 1.2, -0.6], t0: -0.35, dur: 0.35, len: 0.5, width: 0.18, intensity: 1.6 });
      k.em({ count: 80, kind: 'flame', shape: 'sphere', radius: 0.3, pos: [2, 0.2, 0], dir: [0, 1, 0], spread: 0.8, speed: [1, 3], life: [0.4, 0.8], size: [0.3, 0.1], aspect: 1.8, intensity: 0.4, emit: 0.001 });
      k.decal({ kind: 'scorch', r: [1, 1.4], pos: [2, 0, 0], t0: 0, dur: 2.0 });
      k.sparks([2, 0.2, 0], 0, 60);
      if (k.g >= 2) k.em({ count: 40, kind: 'petal', shape: 'sphere', radius: 0.6, pos: [2, 1.2, 0], dir: [0, 1, 0], spread: 1, speed: [0.5, 2], life: [0.6, 1], size: [0.12, 0.06], intensity: 0.8, emit: 0.6 });
      if (k.g === 3) {
        k.beam({ pos: [2, 0, 0], height: 4, r: [0.4, 0.3], t0: 0, dur: 0.5, fade: [0.05, 0.3] });
        k.ring({ t0: 0, dur: 0.5, r: [0.2, 2.5], normal: 'cam', pos: [2, 1.2, 0] });
      }
      k.extras([2, 0.2, 0], 0);
    } }),
];
