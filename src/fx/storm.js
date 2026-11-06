// Storm class: 5 derived skills (fire + air + storm), PLAN2 B17. Built from the T-DSH, T-BUF and ground-area layouts.
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, STORM, DUST } from './_skill.js';
import { contact } from './melee.js';

const m = meta('storm', 'derived');
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });
const N = (a, b, c) => [[0, a, 0], [0.15, b, 0.55], [1, c, 0]];
const hits = (ts, o = {}) => ts.map((t) => ({ t, stop: 0.03, shake: 0.2, amp: 0.03, push: 0.4, ...o }));

export default [
  SKILL('storm/thunder-step', 'Thunder step', m(['fire', 'air', 'storm'], 'dash', 0.2, 8, 6, 'line'), 1.4, {
    view: 'side', sky: 'storm',
    act: { kind: 'none', target: [3.3, 0, 0], windup: 0.5, keys: [[-0.5, 'guard'], [-0.15, 'dashLow'], [0, 'lunge', 'snap'], [0.3, 'lunge'], [0.9, 'guard']], hits: hits([0.02]) },
    // P3=204
    build(fx, o) {
      const k = kit(fx, o, STORM), T0 = -0.15, X0 = 0, X1 = 3.0, C = fx.anchor('handR', 0.02); C[0] += X1; // lunge hand + dash offset
      const X = (t) => (t < T0 ? X0 : t < 0 ? X0 + (X1 - X0) * sm(T0, 0, t) : X1);
      fx.on((t) => { fx.body.position.x = X(t); });
      for (const y of [0.5, 0.8, 1.1, 1.4]) k.ribbon({ points: (t) => { const x = X(clamp(t, T0, 0)); return [[x - 1.4, y, 0], [x - 0.6, y, 0], [x, y, 0]]; }, n: 2, head: () => 1.001, width: 0.025, fade: [0.03, 0.12], t0: T0, dur: 1.3 });
      k.smoke({ kind: 'dust', ramp: DUST, count: 30, shape: 'line', shapeSize: [1.5, 0, 0], pos: [1.5, 0.05, 0], dir: [-1, 0.2, 0], spread: 0.6, speed: [0.5, 1.5], life: [0.5, 0.9], size: [0.15, 0.4], delay: T0, emit: 0.3 });
      k.ghost('dashLow', [1.0, 0, 0], -0.1, 0.45, 0.5);
      k.ghost('dashLow', [2.0, 0, 0], 0.0, 0.4, 0.4);
      k.bolt({ t0: -0.05, dur: 0.4, from: [0, 1, 0], to: [3, 1, 0], jag: 0.15, branches: 4, branchLen: 0.3, width: 0.04, rate: 20, flicker: 0.4, intensity: 3 }); // anchor-ok
      k.em({ count: 50, kind: 'spark', shape: 'line', shapeSize: [1.5, 0, 0], pos: [1.5, 0.9, 0], dir: [0, 1, 0], spread: 1.2, speed: [1, 3], life: [0.2, 0.5], gravity: [0, -6, 0], size: [0.06, 0.02], stretch: 1.5, intensity: 3, delay: 0, emit: 0.4 });
      for (const x of [0.8, 1.6, 2.4]) k.decal({ kind: 'glow', r: [0.6, 0.6], pos: [x, 0, 0], t0: 0, dur: 1.2 });
      ct(fx, k, C, 0.02, 40, { lightI: 0 });
      k.ring({ t0: 0, dur: 0.5, r: [0.2, 2.2], normal: 'cam', pos: C });
      if (k.g >= 2) k.bolt({ t0: 0, dur: 0.5, from: [0, 0.2, 0], to: [3, 0.2, 0], jag: 0.2, branches: 2, branchLen: 0.3, width: 0.035, rate: 20, flicker: 0.4, intensity: 2.5 });
      if (k.g === 3) {
        k.em({ count: 40, kind: 'spark', shape: 'line', shapeSize: [1.5, 0, 0], pos: [1.5, 0.2, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.2, 1], life: [0.2, 0.4], size: [0.05, 0.02], stretch: 1.2, intensity: 3, delay: 0.1, emit: 0.3 });
        k.ring({ t0: 0.1, dur: 0.5, r: [0.2, 1.6], normal: 'up', pos: [1.5, 0.05, 0] });
      }
      k.extras(C, 0);
    } }),

  SKILL('storm/static-field', 'Static field', m(['fire', 'air', 'storm'], 'ground-area', 0.6, 14, 6, 'circle'), 3.0, {
    view: 'wide', sky: 'storm',
    act: act('castup', 0.5, 3, { hits: hits([0.5, 1, 1.5, 2, 2.5], { stop: 0.02, shake: 0.1, amp: 0.02, push: 0.3 }) }),
    // P3=172
    build(fx, o) {
      const k = kit(fx, o, STORM);
      k.decal({ kind: 'rings', r: [2, 2.2], t0: 0, dur: 3 });
      for (let i = 0; i < 6; i++) {
        const a = fx.rng() * TAU, b = fx.rng() * TAU, r1 = 0.3 + 1.4 * fx.rng(), r2 = 0.3 + 1.4 * fx.rng();
        k.bolt({ t0: i * 0.4, dur: 2.2, from: [r1 * Math.cos(a), 0.25, r1 * Math.sin(a)], to: [r2 * Math.cos(b), 0.25, r2 * Math.sin(b)], jag: 0.2, branches: 1, branchLen: 0.25, width: 0.03, rate: 12, flicker: 0.5, intensity: 2.5 });
      }
      k.em({ count: 60, kind: 'spark', shape: 'disc', radius: 1.2, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 1, speed: [0.5, 2], life: [0.1, 0.25], size: [0.05, 0.02], stretch: 1.5, intensity: 3, emit: 2.4 });
      k.em({ count: 40, kind: 'glint', shape: 'disc', radius: 1.2, pos: [0, 0.2, 0], size: [0.12, 0.04], life: [0.15, 0.3], intensity: 3, emit: 2.4 });
      k.light({ pos: [0, 1.4, 0.6], t0: 0, dur: 3, fade: [0.1, 0.6], flicker: 0.5, intensity: 60 });
      k.ring({ t0: 0, dur: 0.6, r: [0.2, 2], normal: 'up', pos: [0, 0.03, 0] });
      k.gather([0, 1, 0], 0, 0.8, 1.4, 30); // anchor-ok
      if (k.g >= 2) for (let i = 0; i < 3; i++) k.bolt({ t0: 0.6 + 0.4 * i, dur: 1.8, from: [0.5 * i - 0.5, 0.25, 0.4 * (i - 1)], to: fx.anchor('tgt', 0, [0, -0.1, 0]), jag: 0.2, branches: 1, branchLen: 0.25, width: 0.03, rate: 14, flicker: 0.5, intensity: 2.5 });
      if (k.g === 3) {
        k.bolt({ t0: 2.6, dur: 0.4, from: [0, 8, 0], to: [0, 0.2, 0], jag: 0.25, branches: 3, branchLen: 0.5, width: 0.1, rate: 25, flicker: 0.3, intensity: 4 });
        k.ring({ t0: 2.6, dur: 0.5, r: [0.2, 3], normal: 'cam', pos: [0, 1, 0] }); // anchor-ok
      }
      k.extras([0, 1, 0], 0.5); // anchor-ok
    } }),

  SKILL('storm/skybolt-call', 'Skybolt call', m(['fire', 'air', 'storm'], 'delayed-strikes', 0.6, 16, 8, 'circle'), 3.0, {
    view: 'sky', sky: 'storm',
    act: act('castup', 1.0, 3.2, { hits: hits([1.0, 1.3, 1.6], { stop: 0.03, shake: 0.2, amp: 0.03, push: 0.4 }) }),
    // P3=322
    build(fx, o) {
      const k = kit(fx, o, STORM);
      const MARK = [[3.2, 0, 0], [1.2, 0, 1.0], [2.2, 0, -1.0]], STRIKE = [1.0, 1.3, 1.6];
      MARK.forEach((M, i) => k.decal({ kind: 'rune', r: [0.6, 0.6], pos: M, t0: 0.1 * i, dur: 1.8, reveal: 0.3, glyphs: 6, poly: 6, spin: 0.4 }));
      MARK.forEach((M, i) => k.ring({ t0: 0.1 * i, dur: 0.8, r: [1.0, 0.2], normal: 'up', pos: [M[0], 0.03, M[2]] }));
      STRIKE.forEach((t, i) => {
        const M = MARK[i];
        k.bolt({ t0: t - 0.4, dur: 0.5, from: [M[0], 8, M[2]], to: [M[0], 0.2, M[2]], jag: 0.2, branches: 2, branchLen: 0.3, width: i < 2 ? 0.12 : 0.25, rate: 18, flicker: 0.4, intensity: 3 });
        k.sparks([M[0], 0.2, M[2]], t, 40);
        k.decal({ kind: 'scorch', r: [0.5, 0.9], pos: M, t0: t, dur: 2 });
        k.glint(M, t, 1);
        if (i === 0) return; // K1-K3: extras at 1.0 owns ring/light/flash; act hits own the shake
        k.ring({ t0: t, dur: 0.4, r: [0.2, 1.4], normal: 'up', pos: M });
        k.light({ pos: [M[0], 1.2, M[2] + 0.6], t0: t, dur: 0.6, fade: [0.01, 0.35], intensity: 70 });
        fx.flash(t, 0.15, k.col(1), 0.15);
      });
      k.smoke({ count: 40, shape: 'disc', radius: 1.5, pos: [2.2, 7, 0], dir: [0, -1, 0], speed: [0.2, 0.6], life: [2, 3], size: [1, 1.8], ramp: N('#2a2e36', '#3a3f48', '#101216'), emit: 1.5 });
      if (k.g >= 2) {
        const M = [-0.6, 0, -0.4];
        k.decal({ kind: 'rune', r: [0.6, 0.6], pos: M, t0: 0.3, dur: 1.8, reveal: 0.3, glyphs: 6, poly: 6, spin: 0.4 });
        k.bolt({ t0: 1.5, dur: 0.5, from: [M[0], 8, M[2]], to: [M[0], 0.2, M[2]], jag: 0.2, branches: 2, branchLen: 0.3, width: 0.12, rate: 18, flicker: 0.4, intensity: 3 });
        k.sparks([M[0], 0.2, M[2]], 1.9, 40);
        k.glint(M, 1.9, 1);
      }
      if (k.g === 3) {
        for (const M of MARK) k.bolt({ t0: 2.0, dur: 0.4, from: [M[0] + 0.3, 8, M[2]], to: [M[0], 0.2, M[2]], jag: 0.2, branches: 2, branchLen: 0.3, width: 0.08, rate: 22, flicker: 0.4, intensity: 4 });
        k.sparks(MARK[0], 2.0, 40);
        k.ring({ t0: 2.0, dur: 0.5, r: [0.2, 2.4], normal: 'cam', pos: [1.5, 1, 0] });
      }
      k.extras(MARK[0], 1.0);
    } }),

  SKILL('storm/ball-surge', 'Ball surge', m(['fire', 'air', 'storm'], 'rolling-orb', 0.5, 10, 7, 'line'), 2.4, {
    view: 'long', sky: 'storm',
    act: act('cast', 1.2, 4.2),
    // P3=202
    build(fx, o) {
      const k = kit(fx, o, STORM);
      const P = (t) => { const u = clamp(t / 1.2); return [0.8 + 3.2 * u, 0.4, 0]; };
      const IMP = [4, 0.4, 0];
      k.orb({ kind: 'plasma', r: [0.35, 0.35], t0: 0, dur: 1.4, fade: [0.05, 0.35], follow: (o2, a, t) => o2.position.set(...P(t)) });
      k.orb({ kind: 'energy', r: [0.5, 0.5], intensity: 0.6, t0: 0, dur: 1.4, fade: [0.05, 0.35], follow: (o2, a, t) => o2.position.set(...P(t)) });
      const G = k.decal({ kind: 'glow', r: [0.6, 0.6], t0: 0, dur: 1.4 });
      fx.on((t) => { const p = P(t); G.obj.position.x = p[0]; G.obj.position.z = p[2]; });
      k.em({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.2, speed: [1, 3], life: [0.3, 0.6], gravity: [0, -9, 0], bounce: 0.4, size: [0.06, 0.02], stretch: 1.5, intensity: 3, emit: 1.2, follow: (mm, a, t) => mm.position.set(...P(t)) });
      k.bolt({ t0: 0.1, dur: 1.2, from: () => P(fx.t), to: () => [P(fx.t)[0] + 0.5, 0.02, 0.3], jag: 0.2, branches: 2, branchLen: 0.3, width: 0.03, rate: 18, flicker: 0.4, intensity: 2.5 });
      k.bolt({ t0: 0.1, dur: 1.2, from: () => P(fx.t), to: () => [P(fx.t)[0] - 0.5, 0.02, -0.3], jag: 0.2, branches: 2, branchLen: 0.3, width: 0.03, rate: 18, flicker: 0.4, intensity: 2.5 });
      k.ring({ t0: 1.2, dur: 0.5, r: [0.2, 2], normal: 'cam', pos: IMP });
      k.sparks(IMP, 1.2, 60);
      for (const to of [[4.5, 0.02, 0.4], [3.6, 0.02, -0.5], [4.2, 0.02, -0.7]]) k.bolt({ t0: 1.2, dur: 0.4, from: IMP, to, jag: 0.2, branches: 1, branchLen: 0.3, width: 0.03, rate: 20, flicker: 0.5, intensity: 3 });
      if (k.g >= 2) for (let i = 0; i < 2; i++) k.em({ count: 20, kind: 'soft', shape: 'sphere', radius: 0.25, dir: [0, 1, 0], speed: [0.2, 0.6], life: [0.3, 0.6], size: [0.12, 0.05], intensity: 1.2, emit: 1.2, follow: (mm, a, t) => { const an = TAU * t * 2 + i * Math.PI, p = P(t); mm.position.set(p[0] + 0.45 * Math.cos(an), p[1] + 0.45 * Math.sin(an), p[2] + 0.2); } });
      if (k.g === 3) k.shell({ r: [0.3, 2], t0: 1.2, dur: 0.6, pos: IMP });
      k.extras(IMP, 1.2, 'B');
    } }),

  SKILL('storm/tempest-crown', 'Tempest crown', m(['fire', 'air', 'storm'], 'buff-crown', 0.4, 25, 0, 'self'), 3.0, {
    body: true, view: 'body', sky: 'storm',
    // P3=231
    build(fx, o) {
      const k = kit(fx, o, STORM), D = 3.0;
      fx.body.setPose(POSES.idle);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(D - 0.6, D, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      k.gather([0, 1, 0], 0, 0.3, 1.2, 30); // anchor-ok
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up' });
      k.smoke({ count: 60, shape: 'ring', radius: 0.35, pos: [0, 2.15, 0], dir: [0, 1, 0], radial: 0.3, speed: [0.2, 0.6], swirl: 2, life: [1.5, 2.5], size: [0.5, 0.9], ramp: N('#7a8290', '#646c7a', '#2a2e36'), emit: 2.6 });
      for (let i = 0; i < 3; i++) { const a = (i * TAU) / 3 + 0.5; k.bolt({ t0: 0, dur: D, from: [0, 2.25, 0], to: [0.4 * Math.cos(a), 1.7, 0.4 * Math.sin(a)], jag: 0.15, branches: 1, branchLen: 0.2, width: 0.025, rate: 8, flicker: 0.5, intensity: 2.5 }); }
      k.em({ count: 40, kind: 'spark', shape: 'ring', radius: 0.45, pos: [0, 1.9, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.3, 1], life: [0.3, 0.6], size: [0.05, 0.02], stretch: 1.5, intensity: 3, emit: 2.6 }); // anchor-ok
      k.ring({ t0: 0, dur: 1.4, r: [0.4, 1.2], normal: 'up', pos: [0, 2.1, 0] });
      k.em({ count: 20, kind: 'glint', shape: 'ring', radius: 0.4, pos: [0, 2.0, 0], size: [0.12, 0.04], life: [0.15, 0.3], intensity: 3, emit: 2.6 }); // anchor-ok
      k.light({ pos: [0, 2.1, 0.4], t0: 0, dur: D, fade: [0.1, 0.5], flicker: 0.3, intensity: 50 });
      if (k.g >= 2) k.em({ count: 40, kind: 'drop', shape: 'disc', radius: 0.4, pos: [0, 2.0, 0], dir: [0, -1, 0], spread: 0.1, speed: [0.5, 1.2], gravity: [0, -6, 0], life: [0.6, 1], size: [0.05, 0.03], intensity: 1, emit: 2.6 }); // anchor-ok
      if (k.g === 3) {
        k.bolt({ t0: 2.3, dur: 0.4, from: [0, 2.3, 0], to: [0, 0.1, 0], jag: 0.25, branches: 2, branchLen: 0.4, width: 0.08, rate: 20, flicker: 0.4, intensity: 4 });
        k.ring({ t0: 2.4, dur: 0.5, r: [0.2, 2.4], normal: 'up', pos: [0, 0.03, 0] });
      }
      k.extras(fx.anchor('chest', 0, [0, -0.15, 0]), 0.3);
    } }),
];
