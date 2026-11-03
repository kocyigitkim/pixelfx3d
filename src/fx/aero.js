// Aero (air) base category: 8 wind, dash, lift, buff and teleport skills (PLAN2 B14). Built from the T-DSH, T-BUF, T-TEL and T-VOL templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, addMat, DUST, AIR } from './_skill.js';
import { contact } from './melee.js';

const m = meta('aero', 'base');
const lerp3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
const vArc = (cx, cy, R, a0, a1, n) => Array.from({ length: n + 1 }, (_, j) => { const a = a0 + ((a1 - a0) * j) / n; return [cx + R * Math.cos(a), cy + R * Math.sin(a), 0]; });
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });
const HIT = (t) => ({ t, stop: 0.05, shake: 0.15, amp: 0.02, push: 0.6 });

export default [
  SKILL('aero/gale-slash', 'Gale slash', m(['air'], 'wave-blade', 0.3, 6, 8, 'arc'), 1.3, {
    view: 'long',
    act: act('sideslash', 0.25, 3.4),
    // P3=192
    build(fx, o) {
      const k = kit(fx, o, AIR);
      const crest = (d) => (t) => vArc(0.8 + 3 * clamp((t - d) / 0.3), 1.2, 0.8, -1, 1, 12);
      k.ribbon({ points: crest(0), n: 12, width: 0.12, intensity: 0.8, head: () => 1.001, t0: 0, dur: 0.5 });
      k.em({ count: 60, kind: 'streak', shape: 'point', pos: [0.8, 1.2, 0], follow: (mm, a, t) => mm.position.set(0.8 + 3 * clamp(t / 0.3), 1.2, 0), dir: [1, 0, 0], spread: 0.3, speed: [1, 2], life: [0.15, 0.3], size: [0.15, 0.03], stretch: 2, intensity: 0.8, delay: 0, emit: 0.3, t0: 0 });
      k.em({ count: 20, kind: 'petal', shape: 'sphere', radius: 0.6, pos: [1.6, 1.2, 0], dir: [1, 0, 0], speed: [1, 2], life: [0.6, 1], size: [0.1, 0.06], blend: 'normal', lit: 1, intensity: 0.4, delay: 0, emit: 0.5, t0: 0 });
      k.smoke({ count: 30, shape: 'line', shapeSize: [1.6, 0, 0], pos: [2.4, 0.05, 0], ramp: DUST, delay: 0, emit: 0.4, t0: 0 });
      k.impact([3.8, 1.2, 0], 0.25, 40);
      fx.flash(0.25, 0.1, k.col(1), 0.12);
      k.light({ pos: [2, 1.6, 0.8], t0: 0, dur: 1.2, fade: [0.1, 0.5], intensity: 30 });
      if (k.g >= 2) k.ribbon({ points: crest(0.08), n: 12, width: 0.1, intensity: 0.6, head: () => 1.001, t0: 0.08, dur: 0.5 });
      if (k.g === 3) {
        // third blade: vertical plane (YZ)
        k.ribbon({ points: (t) => Array.from({ length: 13 }, (_, j) => { const a = -1 + (2 * j) / 12, x = 0.8 + 3 * clamp((t - 0.16) / 0.3); return [x, 1.2 + 0.8 * Math.sin(a), 0.8 * Math.cos(a)]; }), n: 12, width: 0.14, intensity: 0.6, head: () => 1.001, t0: 0.16, dur: 0.5 });
        k.ring({ t0: 0.2, dur: 0.4, r: [0.2, 2.4], normal: 'cam', pos: [2.8, 1.2, 0], width: [0.2, 0.04], intensity: 0.8 });
      }
      k.extras([3.8, 1.2, 0], 0.25);
    } }),

  SKILL('aero/cyclone-step', 'Cyclone step', m(['air'], 'dash-spiral', 0.2, 8, 5, 'line'), 1.4, {
    view: 'side',
    act: { kind: 'thrust', weapon: 'sword', target: [3.1, 0, 0], windup: 0.5, keys: [[-0.5, 'guard'], [-0.25, 'dashLow'], [0, 'lunge', 'snap'], [0.3, 'lunge'], [0.9, 'guard']], hits: [{ t: 0.02, stop: 0.12, shake: 0.3, amp: 0.04, push: 1.6 }] },
    // P3=233
    build(fx, o) {
      const k = kit(fx, o, AIR);
      const x0 = 0, x1 = 2.6, t0 = -0.25;
      const X = (t) => (t < t0 ? x0 : t < 0 ? x0 + (x1 - x0) * sm(t0, 0, t) : x1);
      fx.on((t) => { fx.body.position.x = X(t); });
      // 3 helix ribbons wound around the dash path
      for (let i = 0; i < 3; i++) {
        k.ribbon({ points: (t) => { const xc = X(clamp(t, t0, 0)); return Array.from({ length: 12 }, (_, j) => { const u = j / 11, a = TAU * 3 * u + (i * TAU) / 3; return [x0 + (xc - x0) * u, 1 + 0.4 * Math.cos(a), 0.4 * Math.sin(a)]; }); }, n: 11, width: 0.03, intensity: 0.8, head: () => 1.001, fade: [0.03, 0.12], t0, dur: 0.55 });
      }
      k.em({ count: 60, kind: 'streak', shape: 'line', shapeSize: [1.3, 0, 0], pos: [1.3, 1, 0], swirl: 4, dir: [1, 0, 0], speed: [0.5, 1.5], life: [0.3, 0.6], size: [0.2, 0.03], stretch: 2, intensity: 0.8, delay: t0, emit: 0.55, t0 });
      k.em({ count: 30, kind: 'dust', blend: 'normal', lit: 1, ramp: DUST, shape: 'line', shapeSize: [1.3, 0, 0], pos: [1.3, 0.05, 0], dir: [-1, 0.2, 0], speed: [0.5, 1.5], life: [0.6, 1], size: [0.3, 0.2], intensity: 0.5, delay: t0, emit: 0.3, t0 });
      k.smoke({ count: 15, shape: 'point', pos: [x0, 0.05, 0], ramp: DUST, delay: t0, emit: 0.1, t0 });
      k.smoke({ count: 15, shape: 'point', pos: [x1, 0.05, 0], ramp: DUST, delay: 0, emit: 0.2, t0: 0 });
      k.ring({ t0: 0, dur: 0.5, r: [0.2, 1.8], normal: 'up', pos: [x1, 0.05, 0] });
      ct(fx, k, [x1 + 0.4, 1.2, 0.1], 0.02, 40);
      fx.flash(0.02, 0.08, k.col(1), 0.12);
      k.light({ pos: [1.3, 1.6, 0.8], t0, dur: 1.4, fade: [0.1, 0.5], intensity: 30 });
      if (k.g >= 2) k.em({ count: 30, kind: 'petal', shape: 'ring', radius: 0.5, pos: [1.3, 1, 0], swirl: 3, blend: 'normal', lit: 1, speed: [0.3, 0.8], life: [0.6, 1], size: [0.1, 0.06], intensity: 0.4, delay: t0, emit: 0.6, t0 });
      if (k.g === 3) {
        k.ring({ t0: 0, dur: 0.4, r: [0.2, 2], normal: [1, 0, 0], pos: [x1, 1, 0], intensity: 0.8 });
        k.ring({ t0: 0.05, dur: 0.4, r: [0.1, 1.4], normal: [1, 0, 0], pos: [x1, 1, 0], width: [0.1, 0.02], intensity: 0.6 });
      }
      k.extras([x1, 1, 0], 0);
    } }),

  SKILL('aero/updraft-launch', 'Updraft launch', m(['air'], 'lift-area', 0.5, 12, 6, 'circle'), 2.6, {
    view: 'wide',
    act: act('castup', 0.3, 2.8),
    // P3=291
    build(fx, o) {
      const k = kit(fx, o, AIR);
      const P = [2.8, 0.05, 0];
      const lift = (t) => 0.5 * sm(0.3, 0.8, t) * (1 - sm(1.8, 2.3, t));
      fx.on((t) => { fx.target.position.y = lift(t); });
      k.smoke({ count: 80, shape: 'disc', radius: 1.2, pos: P, swirl: 3, dir: [0, 1, 0], speed: [3, 5], life: [0.8, 1.2], ramp: DUST, delay: 0.3, emit: 0.5, t0: 0.3 });
      k.em({ count: 60, kind: 'petal', shape: 'disc', radius: 1.2, pos: P, swirl: 3, dir: [0, 1, 0], speed: [1.5, 3], life: [1, 1.6], size: [0.1, 0.06], blend: 'normal', lit: 1, intensity: 0.4, delay: 0.3, emit: 1.2, t0: 0.3 });
      k.em({ count: 60, kind: 'streak', shape: 'disc', radius: 0.9, pos: P, dir: [0, 1, 0], speed: [2, 4], life: [0.5, 0.9], size: [0.12, 0.03], stretch: 2, intensity: 0.8, delay: 0.3, emit: 1.2, t0: 0.3 });
      k.beam({ from: [2.8, 0, 0], to: [2.8, 4, 0], r: [1, 1], intensity: 0.08, t0: 0.3, dur: 1.8, fade: [0.1, 0.4], noise: 0.6, edge: 1.4 });
      k.light({ pos: [2.8, 1.2, 0.8], t0: 0.3, dur: 1.8, fade: [0.1, 0.5], intensity: 30 });
      fx.flash(0.3, 0.1, k.col(1), 0.12);
      if (k.g >= 2) k.em({ count: 20, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 1, pos: P, dir: [0, 1, 0], speed: [1, 2], gravity: [0, -2, 0], size: [0.12, 0.06], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], delay: 0.3, emit: 0.5, t0: 0.3 });
      if (k.g === 3) {
        k.ring({ t0: 0.8, dur: 0.6, r: [0.3, 2.2], normal: 'cam', pos: [2.8, 3, 0], intensity: 0.8 });
        k.em({ count: 30, kind: 'petal', shape: 'disc', radius: 1, pos: [2.8, 0.5, 0], dir: [0, 1, 0], speed: [1, 2], life: [1, 1.5], blend: 'normal', lit: 1, size: [0.1, 0.06], intensity: 0.4, delay: 0.5, emit: 1.2, t0: 0.5, swirl: 2 });
      }
      k.extras([2.8, 1.2, 0], 0.3);
    } }),

  SKILL('aero/zephyr-guard', 'Zephyr guard', m(['air'], 'buff-rings', 0.3, 20, 0, 'self'), 3.0, {
    body: true, view: 'body',
    // P3=251
    build(fx, o) {
      const k = kit(fx, o, AIR), D = 3.0;
      fx.body.setPose(POSES.idle);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(D - 0.6, D, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30);
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      for (const n of [[0.3, 1, 0], [-0.3, 1, 0.3], [0, 1, -0.3]]) k.ring({ t0: 0, dur: D, r: [0.8, 0.8], normal: n, pos: [0, 1, 0], width: [0.03, 0.03], intensity: 0.5, breakup: 0.7, decay: 0 });
      for (const y of [0.6, 1.1, 1.6]) k.em({ count: 40, kind: 'streak', shape: 'ring', radius: 0.8, pos: [0, y, 0], swirl: 6, speed: [0.1, 0.3], life: [0.5, 0.8], size: [0.12, 0.03], stretch: 2, intensity: 0.8, delay: 0, emit: D, t0: 0 });
      k.em({ count: 30, kind: 'petal', shape: 'sphere', radius: 0.9, pos: [0, 1.1, 0], speed: [0.2, 0.5], life: [1, 1.8], size: [0.1, 0.06], blend: 'normal', lit: 1, intensity: 0.4, delay: 0, emit: D, t0: 0 });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: D, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / D), intensity: 40 });
      fx.flash(0.3, 0.1, k.col(0), 0.12);
      if (k.g >= 2) k.ring({ t0: 0.4, dur: 2.4, r: [0.6, 1.2], normal: [1, 0, 0], pos: [0, 1, 0], width: [0.03, 0.03], intensity: 0.5, breakup: 0.7, decay: 0 });
      if (k.g === 3) {
        k.ring({ t0: 2.6, dur: 0.5, r: [0.3, 3], normal: 'up', pos: [0, 0.05, 0] });
        k.smoke({ count: 30, shape: 'ring', radius: 0.8, pos: [0, 0.1, 0], radial: 1, speed: [1, 2.5], ramp: DUST, delay: 2.6, emit: 0.3, t0: 2.6 });
      }
      k.extras([0, 1.1, 0], 0.3);
    } }),

  SKILL('aero/vacuum-snap', 'Vacuum snap', m(['air'], 'implode-burst', 0.4, 12, 5, 'circle'), 2.0, {
    view: 'wide',
    act: act('cast', 0.9, 3),
    // P3=321
    build(fx, o) {
      const k = kit(fx, o, AIR), C = [0, 1.1, 0], T = 0.9;
      k.em({ count: 120, kind: 'streak', shape: 'sphere', radius: 2.2, pos: C, radial: 1, speed: [-5, -4], life: [0.3, 0.6], size: [0.12, 0.03], stretch: 2, intensity: 0.8, delay: 0, emit: 0.8, t0: 0 });
      k.smoke({ count: 40, shape: 'sphere', radius: 2, pos: C, radial: 1, speed: [-3, -2], ramp: DUST, delay: 0, emit: 0.8, t0: 0 });
      k.ring({ t0: 0.5, dur: 0.4, r: [2.4, 0.1], normal: 'cam', pos: C });
      k.shell({ r: [1.5, 0.1], t0: 0.3, dur: 0.6, intensity: 0.6 });
      k.ring({ t0: T, dur: 0.5, r: [0.1, 3], normal: 'cam', pos: C });
      k.ring({ t0: T, dur: 0.6, r: [0.2, 2.5], normal: 'up', pos: [0, 0.05, 0] });
      k.em({ count: 80, kind: 'streak', shape: 'sphere', radius: 0.2, pos: C, radial: 1, speed: [4, 7], life: [0.3, 0.6], size: [0.12, 0.03], stretch: 2, intensity: 0.8, delay: T, emit: 0.05, t0: T });
      k.smoke({ count: 40, shape: 'sphere', radius: 0.3, pos: C, radial: 1, speed: [1.5, 3], ramp: DUST, delay: T, emit: 0.1, t0: T });
      k.light({ pos: [0, 1.6, 0.8], t0: 0, dur: 1.5, fade: [0.1, 0.5], intensity: 40 });
      fx.flash(T, 0.2, k.col(0), 0.2);
      fx.shake(T, 0.3, 0.03);
      if (k.g >= 2) k.ring({ t0: 0.25, dur: 0.4, r: [2, 0.1], normal: 'cam', pos: C, intensity: 0.8 });
      if (k.g === 3) {
        k.shell({ r: [0.1, 2], t0: T, dur: 0.6, intensity: 0.6 });
        k.extras(C, T);
      }
    } }),

  SKILL('aero/feather-storm', 'Feather storm', m(['air'], 'volley', 0.4, 9, 8, 'cone'), 2.0, {
    view: 'long',
    act: act('throw', 0.35, 4, { hits: [HIT(0.35), HIT(0.45), HIT(0.55)] }),
    // P3=109
    build(fx, o) {
      const k = kit(fx, o, AIR), A = [0.6, 1.38, 0.2], B0 = [3.8, 1.2, 0];
      const nb = k.g >= 2 ? 18 : 14;
      for (let i = 0; i < nb; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), addMat(k.col(1), 0.8));
        b.scale.set(0.03, 0.18, 0.005);
        const B = [B0[0], B0[1] + (i - nb / 2) * 0.12, (i - nb / 2) * 0.1];
        const P = (t) => lerp3(A, B, sm(0, 0.9, t));
        fx.mesh(b, (t) => { b.position.set(...P(t)); b.rotation.set(0, 0, t * 9 + i); }, { t0: 0, dur: 1.4 });
        k.trail({ path: P, t0: 0.02, dur: 1.1, len: 0.3, width: 0.03, intensity: 0.8 });
      }
      k.em({ count: 8, kind: 'streak', shape: 'point', pos: B0, dir: [0, 1, 0], spread: 1.4, speed: [1, 3], life: [0.2, 0.4], size: [0.1, 0.02], stretch: 2, intensity: 0.8, delay: 0.55, emit: 0.001, t0: 0.53 });
      k.em({ count: 60, kind: 'petal', shape: 'sphere', radius: 0.8, pos: [2, 1.4, 0], dir: [1, -0.2, 0], spread: 0.6, speed: [0.5, 1.2], life: [1, 1.6], size: [0.1, 0.06], blend: 'normal', lit: 1, intensity: 0.4, delay: 0.3, emit: 1.2, t0: 0.3 });
      k.light({ pos: [2, 1.8, 0.8], t0: 0.3, dur: 1.4, fade: [0.1, 0.5], intensity: 30 });
      fx.flash(0.55, 0.1, k.col(1), 0.12);
      if (k.g === 3) k.ring({ t0: 0.55, dur: 0.5, r: [0.2, 1.6], normal: 'cam', pos: B0 });
      k.extras(B0, 0.55);
    } }),

  SKILL('aero/sky-pillar', 'Sky pillar', m(['air'], 'tornado', 0.8, 18, 6, 'circle'), 3.0, {
    view: 'wide',
    act: act('castup', 0.5, 3, { hits: [HIT(0.5), HIT(1), HIT(1.5), HIT(2)] }),
    // P3=381
    build(fx, o) {
      const k = kit(fx, o, AIR);
      k.em({ count: 200, kind: 'streak', shape: 'disc', radius: 0.4, pos: [3, 0, 0], swirl: 6, dir: [0, 1, 0], radial: 0.3, speed: [2, 4], life: [0.6, 1], size: [0.12, 0.03], stretch: 2, intensity: 0.8, delay: 0, emit: 2.4, t0: 0 });
      k.smoke({ count: 80, shape: 'disc', radius: 0.6, pos: [3, 0.05, 0], swirl: 4, dir: [0, 1, 0], speed: [0.5, 1.5], ramp: DUST, delay: 0, emit: 2.4, t0: 0 });
      // 3 helix ribbons, height 5, rotating
      for (let i = 0; i < 3; i++) {
        k.ribbon({ points: (t) => Array.from({ length: 21 }, (_, j) => { const u = j / 20, a = TAU * 3 * u + (i * TAU) / 3 + TAU * t; return [3 + 0.8 * Math.cos(a), 5 * u, 0.8 * Math.sin(a)]; }), n: 20, width: 0.05, intensity: 0.8, t0: 0, dur: 3 });
      }
      k.beam({ from: [3, 0, 0], to: [3, 5, 0], r: [0.4, 1.4], intensity: 0.1, t0: 0, dur: 3, fade: [0.1, 0.5], noise: 0.6, edge: 1.4 });
      k.em({ count: 40, kind: 'petal', shape: 'ring', radius: 1.2, pos: [3, 1.5, 0], swirl: 3, speed: [0.2, 0.6], life: [1, 1.6], size: [0.1, 0.06], blend: 'normal', lit: 1, intensity: 0.4, delay: 0, emit: 2.4, t0: 0 });
      k.light({ pos: [3, 1.5, 0.8], t0: 0, dur: 3, fade: [0.1, 0.5], intensity: 40 });
      for (const t of [0.5, 1, 1.5, 2]) fx.flash(t, 0.1, k.col(1), 0.12);
      if (k.g >= 2) k.em({ count: 20, kind: 'rock', blend: 'normal', lit: 1, shape: 'ring', radius: 1.4, pos: [3, 0.3, 0], swirl: 4, speed: [0.5, 1.5], size: [0.12, 0.06], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], delay: 0.5, emit: 2, t0: 0.5 });
      if (k.g === 3) {
        k.ring({ t0: 0.2, dur: 1.5, r: [0.3, 3], normal: 'up', pos: [3, 5, 0] });
        k.ring({ t0: 0.5, dur: 1, r: [0.4, 2.2], normal: 'cam', pos: [3, 2.5, 0] });
      }
      k.extras([3, 1, 0], 2);
    } }),

  SKILL('aero/whisper-step', 'Whisper step', m(['air'], 'teleport-wind', 0.2, 10, 6, 'point'), 1.8, {
    view: 'side',
    act: { kind: 'none', target: false, windup: 0.2, keys: [[-0.2, 'vanish'], [0, 'behind'], [0.2, 'guard']], hits: [] },
    // P3=141
    build(fx, o) {
      const k = kit(fx, o, AIR), A = 0, B = 2.6, TS = 0;
      // body fades out at A, reappears at B
      fx.on((t) => { const b = fx.body; if (t < TS) { b.position.x = A; b.set({ alpha: 1 - sm(-0.2, 0, t) }); } else { b.position.x = B; b.set({ alpha: sm(0, 0.2, t) }); } });
      for (let i = 0; i < 5; i++) {
        const oy = (i - 2) * 0.25;
        k.ribbon({ points: Array.from({ length: 11 }, (_, j) => { const u = j / 10; return [B * u, 1.2 + oy + 0.3 * Math.sin(Math.PI * u), 0]; }), n: 10, width: 0.03, intensity: 0.8, head: () => 1.001, t0: 0, dur: 0.25 });
      }
      k.em({ count: 40, kind: 'streak', shape: 'line', shapeSize: [1.3, 0, 0], pos: [1.3, 1.2, 0], dir: [1, 0, 0], speed: [3, 6], life: [0.2, 0.35], size: [0.12, 0.03], stretch: 2, intensity: 0.8, delay: 0, emit: 0.25, t0: 0 });
      for (const x of [A, B]) k.em({ count: 20, kind: 'petal', shape: 'sphere', radius: 0.3, pos: [x, 1.2, 0], speed: [0.2, 0.6], life: [0.6, 1], size: [0.1, 0.06], blend: 'normal', lit: 1, intensity: 0.4, delay: 0, emit: 1, t0: 0 });
      k.ring({ t0: 0, dur: 0.5, r: [0.2, 1.2], normal: 'up', pos: [A, 0.05, 0] });
      k.ring({ t0: 0.2, dur: 0.5, r: [0.2, 1.2], normal: 'up', pos: [B, 0.05, 0] });
      k.light({ pos: [1.3, 1.6, 0.8], t0: 0, dur: 1.8, fade: [0.1, 0.5], intensity: 30 });
      if (k.g >= 2) k.ghost('idle', [A, 0, 0], 0, 0.8, 0.5);
      if (k.g === 3) {
        k.ring({ t0: 0.2, dur: 0.5, r: [0.2, 1.4], normal: 'cam', pos: [B, 1.2, 0] });
        k.smoke({ count: 20, shape: 'disc', radius: 0.3, pos: [B, 0.05, 0], ramp: DUST, delay: 0.2, emit: 0.2, t0: 0.2 });
        k.extras([B, 1.2, 0], 0.2);
      }
    } }),
];
