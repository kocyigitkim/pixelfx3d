// Quantum class: 8 skills with the QUANTUM ramp (PLAN2 B25). Built from the T-MEL, T-BEAM, T-PUL, T-NOV and T-GND patterns, plus local glitch helpers.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, metal, addMat, DUST, QUANTUM } from './_skill.js';
import { Dummy, evalKeys, Target } from '../core/dummy.js';
import { contact } from './melee.js';

const m = meta('quantum', 'quantum');
const A = [0.6, 1.38, 0.2], C = [1.62, 1.2, 0.1];
const lerp3 = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });
/** after-image body: holo dummy in a pose, scan colour c, fades out over its window */
const ghost = (fx, pose, pos, t0, dur, a, c) => { const d = new Dummy(); d.setPose(POSES[pose] || POSES.idle); d.position.set(...pos); d.set({ holo: 1, scanCol: c, alpha: a }); return fx.mesh(d, (t, pr) => d.set({ alpha: a * (1 - pr) }), { t0, dur }); };
/** n glitch bars that blink on in fx.rng-seeded windows around pos */
const glitchBars = (fx, k, n, pos, span, t1) => {
  for (let i = 0; i < n; i++) {
    const s = fx.rng.range(0, t1 - 0.2), w = fx.rng.range(0.04, 0.18), bar = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.04), addMat(k.col(i % 2), 2, 0.8));
    bar.position.set(pos[0] + fx.rng.range(-span, span), pos[1] + fx.rng.range(0.2, 1.7), pos[2] + fx.rng.range(-0.2, 0.2));
    fx.mesh(bar, (t) => { bar.visible = t >= s && t < s + w; }, { t0: 0, dur: t1 });
  }
};
/** rift surface: jagged cyan/magenta edge, dark interior; uOpen = opening, uPulse = colour pulse (g2) */
const RIFT_F = `uniform float uTime, uOpen, uPulse; varying vec2 vUv;
float h1(float x){ return fract(sin(x * 91.3) * 437.5); }
void main(){
  vec2 p = vUv * 2.0 - 1.0;
  float jag = (h1(floor(p.y * 14.0) + floor(uTime * 10.0) * 7.0) - 0.5) * 0.35;
  float w = (0.5 + jag) * uOpen;
  float d = abs(p.x) - w;
  float edge = smoothstep(0.1, 0.0, abs(d)) * uOpen;
  vec3 cyan = vec3(0.0, 0.94, 1.0), mag = vec3(1.0, 0.24, 0.94), vio = vec3(0.02, 0.01, 0.05);
  vec3 side = mix(cyan, mag, step(0.0, p.x));
  vec3 col = side * (2.5 + 3.0 * uPulse) * edge + vio * step(d, 0.0) * uOpen;
  float a = max(edge, step(d, 0.0) * 0.92 * uOpen);
  gl_FragColor = vec4(col, a);
}`;

export default [
  SKILL('quantum/phase-shift', 'Phase shift', m(['quantum'], 'teleport-glitch', 0.2, 10, 6, 'point'), 1.8, {
    view: 'side', sky: 'dark',
    act: act('none', null, false, { windup: 0.3, keys: [[-0.3, 'vanish'], [0.2, 'behind'], [1.8, 'behind']] }),
    // P3=40
    build(fx, o) {
      const k = kit(fx, o, QUANTUM), B = [2.8, 0, 0], J = Array.from({ length: 60 }, () => fx.rng.range(-0.3, 0.1));
      fx.on((t) => { fx.body.position.x = t < 0 ? J[clamp(Math.floor((t + 0.3) * 30), 0, 59)] : B[0]; fx.body.set({ scan: ((t * 1.2) % 1) * 2, scanCol: k.col(0) }); });
      ghost(fx, 'behind', [B[0], 0, -0.06], 0, 1.8, 0.45, k.col(0));
      ghost(fx, 'behind', [B[0], 0, 0.06], 0, 1.8, 0.45, k.col(1));
      glitchBars(fx, k, 12, B, 0.4, 1.8);
      k.ring({ t0: -0.1, dur: 0.5, r: [0.2, 1.4], normal: 'up', pos: [0, 0.02, 0] });
      k.ring({ t0: 0, dur: 0.5, r: [0.2, 1.4], normal: 'up', pos: [B[0], 0.02, 0] });
      k.light({ pos: [1.4, 1.2, 0.8], t0: 0, dur: 1.8, fade: [0.05, 0.5], flicker: 0.3, intensity: 60 });
      if (k.g >= 2) k.em({ count: 40, kind: 'soft', shape: 'box', shapeSize: [0.25, 0.5, 0.1], pos: [B[0], 1, 0], dir: [0, 1, 0], spread: 0.5, speed: [0, 0.4], life: [0.3, 0.6], size: [0.08, 0.02], intensity: 1.2, emit: 1.8, t0: 0 });
      if (k.g === 3) for (let i = 1; i <= 3; i++) ghost(fx, 'idle', lerp3(A, B, i / 4), 0.1 * i, 1.2, 0.3 * (1 - i / 4), k.col(i % 2));
    } }),

  SKILL('quantum/singularity-seed', 'Singularity seed', m(['quantum'], 'black-hole', 0.6, 18, 7, 'point'), 2.4, {
    view: 'wide', sky: 'void',
    act: act('cast', 1.6, 3),
    // P3=322
    build(fx, o) {
      const k = kit(fx, o, QUANTUM), S = [1.8, 1.2, 0];
      k.trail({ path: (t) => lerp3(A, S, clamp(t / 0.6)), t0: 0, dur: 0.6, len: 0.4, width: 0.06 });
      k.orb({ kind: 'void', r: [0.05, 0.35], pos: S, t0: 0.3, dur: 1.3, fade: [0.2, 0.3] });
      k.ring({ t0: 0.3, dur: 1.3, r: [0.7, 0.7], width: [0.25, 0.25], normal: [0.2, 1, 0.3], pos: S });
      k.em({ count: 120, kind: 'soft', shape: 'disc', radius: 0.8, pos: S, dir: [0, 1, 0], speed: [0.1, 0.5], life: [0.6, 1.0], size: [0.06, 0.02], swirl: 8, intensity: 1.0, delay: 0.3, emit: 1.3, t0: 0.3 });
      k.shell({ r: [0.6, 0.6], power: 6, pos: S, t0: 0.3, dur: 1.3, fade: [0.2, 0.3], intensity: 0.3 });
      k.em({ count: 80, kind: 'streak', shape: 'sphere', radius: 1.6, radiusIn: 1.2, pos: S, radial: 1, speed: [-3, -2], life: [0.4, 0.7], size: [0.05, 0.01], intensity: 1.5, delay: 0.3, emit: 1.3, t0: 0.3 });
      fx.on((t) => { fx.target.position.x = 3 - 0.8 * sm(0.3, 1.3, t); });
      k.light({ pos: S, t0: 0.3, dur: 2.2, fade: [0.2, 0.4], flicker: 0.3, intensity: 90 });
      k.impact(S, 1.6, 60, 4);
      fx.flash(1.6, 0.12, k.col(1), 0.15);
      if (k.g >= 2) k.ring({ t0: 0.3, dur: 1.3, r: [1.1, 1.1], width: [0.12, 0.12], normal: [1, 0.2, -0.3], pos: S });
      if (k.g === 3) k.em({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.4, pos: S, radial: 1, speed: [2, 5], life: [0.2, 0.5], size: [0.05, 0.02], stretch: 1.5, intensity: 2, delay: 1.6, emit: 0.001, t0: 1.55 });
    } }),

  SKILL('quantum/time-fold', 'Time fold', m(['quantum'], 'rewind-area', 0.8, 20, 6, 'circle'), 2.8, {
    view: 'wide', sky: 'dark',
    act: act('castup', null, 3),
    // P3=70
    build(fx, o) {
      const k = kit(fx, o, QUANTUM), Cc = [1.6, 0, 0];
      const tf = (t) => (t < 1 ? t : Math.max(0, 2 - t));
      k.decal({ kind: 'rings', r: [1.2, 2.4], pos: Cc, t0: 0, dur: 2.8 });
      k.decal({ kind: 'rune', r: [2, 2], pos: Cc, t0: 0, dur: 2.8, glyphs: 12, poly: 6, spin: 0.3 });
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6 + fx.rng.range(-0.2, 0.2), E = [Cc[0] + 1.4 * Math.cos(a), 0.6 + fx.rng.range(0, 0.4), Cc[2] + 1.4 * Math.sin(a)];
        const P = (s) => { const u = clamp((s - 0.2) / 0.8), h = Math.sin(Math.PI * u); return [Cc[0] + (E[0] - Cc[0]) * u, 0.2 + (E[1] - 0.2) * u + h, Cc[2] + (E[2] - Cc[2]) * u]; };
        const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), metal('#2a1f4a', k.col(0), 0.5));
        fx.mesh(d, (t) => d.position.set(...P(tf(t))), { t0: 0, dur: 2.8 });
        const past = new THREE.Mesh(new THREE.OctahedronGeometry(0.12), addMat(k.col(0), 1.5, 0.4));
        fx.mesh(past, (t) => { past.position.set(...P(tf(t - 0.3))); past.material.opacity = 0.4 * (1 - sm(0.8, 2.2, t)); }, { t0: 0.3, dur: 2.5 });
        k.trail({ path: (t) => P(t), t0: 0.2, dur: 0.8, len: 0.5, width: 0.04, ramp: [[0, k.col(0), 1], [1, k.col(2), 0]] });
        k.trail({ path: (t) => P(2 - t), t0: 1.0, dur: 0.8, len: 0.5, width: 0.04, ramp: [[0, k.col(1), 1], [1, k.col(2), 0]] });
      }
      k.em({ count: 40, kind: 'soft', shape: 'sphere', radius: 0.3, pos: [Cc[0], 0.6, Cc[2]], radial: 1, speed: [1, 3], life: [0.4, 0.7], size: [0.08, 0.02], intensity: 1.2, delay: 0.15, emit: 0.001, t0: 0.15 });
      k.ring({ t0: 1.0, dur: 0.8, r: [2.2, 0.2], normal: 'up', pos: [Cc[0], 0.02, Cc[2]], width: [0.25, 0.05] });
      k.light({ pos: [Cc[0], 1.2, 0.8], t0: 0, dur: 2.8, fade: [0.1, 0.6], intensity: 70 });
      if (k.g >= 2) k.em({ count: 30, kind: 'glint', shape: 'sphere', radius: 1.4, pos: [Cc[0], 1, Cc[2]], dir: [0, 1, 0], speed: [0.2, 0.8], life: [0.3, 0.5], size: [0.12, 0.05], intensity: 2, delay: 1.0, emit: 0.6, t0: 1.0 });
      if (k.g === 3) { k.ring({ t0: 1.8, dur: 0.5, r: [0.2, 2.4], normal: 'cam', pos: [Cc[0], 1, Cc[2]] }); fx.flash(1.8, 0.12, k.col(1), 0.15); }
    } }),

  SKILL('quantum/echo-clone', 'Echo clone', m(['quantum'], 'clone-attack', 0.4, 14, 3, 'point'), 2.0, {
    view: 'side', sky: 'dark',
    act: act('slash', 0, 2, { weapon: 'sword' }),
    // P3=166
    build(fx, o) {
      const k = kit(fx, o, QUANTUM), KEYS = [[0, 'guard'], [0.3, 'windupHigh'], [0.5, 'cut', 'snap'], [0.7, 'follow']];
      const clone = (z) => {
        const d = new Dummy({ weapon: 'sword' }); d.position.set(1, 0, z); d.set({ holo: 1, scanCol: k.col(0), alpha: 0.8 });
        fx.mesh(d, (t) => { d.setPose(evalKeys(KEYS, t)); d.set({ alpha: 0.8 * sm(0, 0.3, t) * (1 - sm(1.0, 1.2, t)) }); }, { t0: 0, dur: 1.2 });
        for (let i = 1; i <= 3; i++) ghost(fx, 'guard', [1 - 0.25 * i, 0, z], 0.1 * i, 1.0, 0.25, k.col(i % 2));
        k.slash({ center: [1.5, 1.25, z], radius: 1.1, a0: -0.7, a1: 0.9, t0: 0.45, dur: 0.35 });
        ct(fx, k, [1.6, 1.2, z], 0.5, 40);
        k.em({ count: 30, kind: 'soft', shape: 'sphere', radius: 0.5, pos: [1, 1, z], radial: 1, speed: [0.5, 1.5], life: [0.4, 0.8], size: [0.08, 0.02], intensity: 1.2, delay: 1.2, emit: 0.2, t0: 1.15 });
      };
      ct(fx, k, C, 0, 20);
      clone(0.8);
      fx.flash(0.5, 0.12, k.col(1), 0.15);
      k.light({ pos: [1.4, 1.3, 0.4], t0: 0.4, dur: 1.4, fade: [0.02, 0.5], intensity: 70 });
      if (k.g >= 2) clone(-0.8);
      if (k.g === 3) k.ring({ t0: 0.45, dur: 0.45, r: [0.2, 2], normal: 'cam', pos: [1.6, 1.2, 0] });
    } }),

  SKILL('quantum/entangle-link', 'Entangle link', m(['quantum'], 'link-beam', 0.5, 16, 6, 'chain'), 2.4, {
    view: 'wide', sky: 'dark',
    act: act('cast', null, 3, { hits: [0.9, 1.5].map((t) => ({ t, stop: 0.04, shake: 0.2, amp: 0.03, push: 0.5 })) }),
    // P3=170
    build(fx, o) {
      const k = kit(fx, o, QUANTUM), H = [0.9, 1.5], P0 = [0.1, 1.2, 0], P1 = [3.4, 1.2, 1.6];
      const T2 = new Target(); T2.position.set(3.4, 0, 1.6);
      fx.mesh(T2, (t) => { let r = 0; for (const h of H) if (t >= h) r += -0.15 * Math.exp(-(t - h) * 6) * Math.sin(40 * (t - h)); T2.rotation.z = r; }, { t0: -0.5, dur: 3 });
      const helix = (ph) => (t) => { const pts = []; for (let i = 0; i <= 16; i++) { const s = i / 16, a = s * TAU * 3 + ph + 6 * t, r = 0.12 * Math.sin(Math.PI * s), b = lerp3(P0, P1, s); pts.push([b[0], b[1] + r * Math.cos(a), b[2] + r * Math.sin(a)]); } return pts; };
      k.ribbon({ points: helix(0), width: 0.035, t0: 0.1, dur: 2.2, ramp: [[0, k.col(0), 1], [1, k.col(0), 0.2]] });
      k.ribbon({ points: helix(Math.PI), width: 0.035, t0: 0.1, dur: 2.2, ramp: [[0, k.col(1), 1], [1, k.col(2), 0]] });
      k.beam({ from: A, to: P1, r: [0.04, 0.04], t0: 0.3, dur: 0.5, fade: [0.05, 0.2] });
      k.em({ count: 30, kind: 'soft', shape: 'point', size: [0.1, 0.03], life: [0.3, 0.5], speed: [0, 0.2], intensity: 1.5, delay: 0.2, emit: 2.0, t0: 0.1, follow: (mm, ta, t) => mm.position.set(...lerp3(P0, P1, (t * 0.8) % 1)) });
      for (const h of H) { k.sparks(P0, h, 20); k.sparks(P1, h, 20); }
      k.light({ pos: [1.8, 1.3, 0.8], t0: 0.2, dur: 2.2, fade: [0.1, 0.5], flicker: 0.3, intensity: 60 });
      fx.flash(0.9, 0.12, k.col(1), 0.15);
      if (k.g >= 2) k.em({ count: 60, kind: 'soft', shape: 'box', shapeSize: [1.8, 0.6, 0.8], pos: [1.8, 1.2, 0.8], dir: [0, 1, 0], speed: [0, 0.4], life: [0.6, 1.2], size: [0.06, 0.02], intensity: 0.8, emit: 2.2, t0: 0.1 });
      if (k.g === 3) for (const h of H) for (const p of [P0, P1]) k.ring({ t0: h, dur: 0.4, r: [0.1, 1.4], normal: 'cam', pos: p });
    } }),

  SKILL('quantum/gravity-crush', 'Gravity crush', m(['quantum'], 'press-crater', 0.6, 16, 4, 'point'), 2.2, {
    view: 'wide', sky: 'dark',
    act: act('smash', null, 3, { hits: [{ t: 0.5, stop: 0.14, shake: 0.6, amp: 0.08, push: 0 }] }),
    // P3=124
    build(fx, o) {
      const k = kit(fx, o, QUANTUM), P = [3, 0, 0];
      const press = (t0) => {
        const g = new THREE.Group(), disc = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.05, 6), metal('#2a1640', k.col(1), 0.3));
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.03, 6, 24), addMat(k.col(1), 2)); rim.rotation.x = Math.PI / 2; g.add(disc, rim);
        fx.mesh(g, (t) => { const u = t - t0; g.visible = u > -0.5 && u < 0.6; g.position.set(P[0], 1.9 + 2.1 * (1 - sm(-0.5, 0, u)), P[2]); }, { t0: -1, dur: 99 });
      };
      press(0.5);
      fx.on((t) => { fx.target.scale.y = 1 - 0.35 * sm(0.45, 0.55, t) * (1 - sm(1.2, 1.8, t)); });
      k.decal({ kind: 'cracks', r: [3, 3.6], pos: P, t0: 0.5, dur: 1.6, reveal: 0.3, heat: [1, 0.1], cells: 4 });
      k.decal({ kind: 'scorch', r: [1, 1.4], pos: P, t0: 0.5, dur: 2.0 });
      k.decal({ kind: 'rings', r: [0.5, 2.5], pos: P, t0: 0.5, dur: 1.6 });
      k.ring({ t0: 0.5, dur: 0.8, r: [0.2, 4], normal: 'up', pos: [P[0], 0.02, P[2]] });
      k.smoke({ ramp: DUST, count: 60, shape: 'ring', radius: 0.4, pos: P, radial: 1, speed: [1.5, 4], life: [1, 1.5], size: [0.3, 0.7], delay: 0.5, emit: 0.001 });
      k.em({ count: 24, kind: 'rock', shape: 'disc', radius: 0.3, pos: P, dir: [0, 1, 0], spread: 1, speed: [3, 7.5], gravity: [0, -10, 0], bounce: 0.35, blend: 'normal', lit: 1, ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], size: [0.1, 0.05], life: [1.2, 1.8], delay: 0.5, emit: 0.001, t0: 0.48 });
      k.light({ pos: [P[0], 1, 0.8], t0: 0.5, dur: 1.2, fade: [0.02, 0.5], intensity: 120 });
      fx.flash(0.5, 0.12, k.col(1), 0.15);
      if (k.g >= 2) press(1.0);
      if (k.g === 3) { k.ring({ t0: 0.6, dur: 0.5, r: [0.2, 2.4], normal: 'cam', pos: [P[0], 1, P[2]] }); k.sparks(P, 0.55, 40); }
    } }),

  SKILL('quantum/warp-rift', 'Warp rift', m(['quantum'], 'rift-slash', 0.5, 14, 4, 'arc'), 2.0, {
    view: 'side', sky: 'dark',
    act: act('sideslash', 0.5, 2.4, { weapon: 'sword', hits: [0.5, 0.7, 0.9].map((t) => ({ t, stop: 0.05, shake: 0.2, amp: 0.03, push: 1.2 })) }),
    // P3=176
    build(fx, o) {
      const k = kit(fx, o, QUANTUM), R = [1.6, 1.1, 0];
      const rift = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 2), new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uOpen: { value: 0 }, uPulse: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: RIFT_F, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      rift.position.set(...R);
      fx.mesh(rift, (t) => { const u = rift.material.uniforms; u.uTime.value = t; u.uOpen.value = sm(0, 0.4, t) * (1 - sm(1.4, 1.8, t)); u.uPulse.value = k.g >= 2 ? sm(0.6, 0.8, t) * (1 - sm(0.9, 1.2, t)) : 0; }, { t0: -0.2, dur: 2.2 });
      for (const h of [0.45, 0.65, 0.85]) { k.slash({ center: [2.2, 1.2, 0], radius: 0.9, a0: -0.8, a1: 0.8, t0: h - 0.1, dur: 0.3, width: 0.12 }); ct(fx, k, [2.2, 1.2, 0.1], h, 30); }
      k.sparks([R[0], 2.0, 0], 0.3, 20);
      k.sparks([R[0], 0.2, 0], 0.3, 20);
      glitchBars(fx, k, 8, R, 0.3, 2.0);
      k.light({ pos: [R[0], R[1], 0.8], t0: 0.3, dur: 1.6, fade: [0.02, 0.4], intensity: 90 });
      fx.flash(0.45, 0.12, k.col(1), 0.15);
      if (k.g >= 2) k.em({ count: 40, kind: 'soft', shape: 'box', shapeSize: [0.1, 1, 0.05], pos: R, dir: [0, 1, 0], speed: [0.1, 0.6], life: [0.3, 0.6], size: [0.06, 0.02], intensity: 1.2, delay: 0.6, emit: 0.5, t0: 0.55 });
      if (k.g === 3) {
        k.ring({ t0: 0.5, dur: 0.5, r: [0.2, 2.2], normal: 'cam', pos: R });
        k.slash({ center: [2.2, 1.2, 0], radius: 0.8, a0: 0.8, a1: -0.8, t0: 0.95, dur: 0.3 });
        k.slash({ center: [2.2, 1.2, 0], radius: 0.8, a0: -0.8, a1: 0.8, t0: 1.05, dur: 0.3 });
      }
    } }),

  SKILL('quantum/probability-storm', 'Probability storm', m(['quantum'], 'random-volley', 0.6, 18, 8, 'cone'), 2.4, {
    view: 'long', sky: 'storm',
    act: act('cast', null, 4, { hits: [0.9, 1.2, 1.5].map((t) => ({ t, stop: 0.04, shake: 0.2, amp: 0.03, push: 0.8 })) }),
    // P3=322 (worst case: 26 volleys, each hit or split at 10 sparks max, plus impact 61 + burst core 1)
    build(fx, o) {
      const k = kit(fx, o, QUANTUM), SRC = [0.6, 1.5, 0.2];
      const RAMPS = [[[0, k.col(0), 1], [1, k.col(2), 0]], [[0, k.col(1), 1], [1, k.col(2), 0]]];
      const volley = (t0) => {
        const fate = fx.rng.pick(['hit', 'miss', 'split']), c = fx.rng.pick([0, 1]);
        const end = fate === 'miss' ? [6, 1.2 + fx.rng.range(-0.8, 0.8), fx.rng.range(-0.6, 0.6)] : [3.8 + fx.rng.range(-0.2, 0.2), 1.2 + fx.rng.range(-0.3, 0.3), fx.rng.range(-0.3, 0.3)];
        k.trail({ path: (s) => lerp3(SRC, end, clamp((s - t0) / 0.4)), t0, dur: 0.45, len: 0.15, width: 0.05, ramp: RAMPS[c] });
        if (fate === 'hit') k.sparks(end, t0 + 0.4, 10);
        if (fate === 'split') {
          for (const e of [[end[0] + 0.4, end[1] + 0.4, end[2] + 0.2], [end[0] + 0.4, end[1] - 0.4, end[2] - 0.2]]) k.trail({ path: (s) => lerp3(end, e, clamp((s - t0 - 0.4) / 0.25)), t0: t0 + 0.4, dur: 0.3, len: 0.12, width: 0.04, ramp: RAMPS[c] });
          k.sparks(end, t0 + 0.4, 5);
        }
      };
      for (let i = 0; i < 20; i++) volley(0.03 * i);
      k.light({ pos: [2, 1.4, 1.0], t0: 0, dur: 2.4, fade: [0.1, 0.4], flicker: 0.3, intensity: 60 });
      fx.flash(0.9, 0.1, k.col(1), 0.12);
      if (k.g >= 2) for (let i = 0; i < 6; i++) volley(0.9 + 0.03 * i);
      if (k.g === 3) { k.impact([4, 1.2, 0], 1.8, 60, 1.4); fx.hit(1.8, { stop: 0.05, push: 1 }); fx.flash(1.8, 0.12, k.col(1), 0.15); } // K1: burst impact owns the shake
    } }),
];
