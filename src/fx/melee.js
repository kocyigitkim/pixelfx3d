// Melee: blade-following swept-surface trails (sampled from the mannequin's own pose keys), sparks, dust, hit-stop.
import * as THREE from 'three';
import { evalKeys } from '../core/dummy.js';
import { SU } from '../core/glsl.js';
import { slash } from '../core/meshes.js';
import { ENV } from '../core/feel.js';
import { burst, capL } from './_aaa.js';

const _v = new THREE.Vector3();
/** sample a point on the held weapon (len m from the hand, along the blade) over [t0,t1] -> fn(t) -> [x,y,z] (fx-local). rotY(t) optional body spin. */
export function bladeTable(fx, t0, t1, len, rotY, step = 1 / 90) {
  fx.updateWorldMatrix(true, false); const b = fx.body, n = Math.max(1, Math.ceil((t1 - t0) / step)), arr = [];
  for (let i = 0; i <= n; i++) { const t = t0 + i * step; b.setPose(evalKeys(fx.keys, t)); b.rotation.y = rotY ? rotY(t) : 0; b.updateMatrixWorld(true); b.tip(len, _v); fx.worldToLocal(_v); arr.push([_v.x, _v.y, _v.z]); }
  b.rotation.y = 0; b.setPose(evalKeys(fx.keys, fx.time));
  return (t) => { const f = Math.min(n, Math.max(0, (t - t0) / step)), i = Math.min(n - 1, Math.floor(f)), k = f - i, a = arr[i], c = arr[i + 1]; return [a[0] + (c[0] - a[0]) * k, a[1] + (c[1] - a[1]) * k, a[2] + (c[2] - a[2]) * k]; };
}
const SW_V = `attribute float aAge, aV; varying float vAge, vV; void main(){ vAge=aAge; vV=aV; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const SW_F = `float sq(float x){return x*x;} float cube(float x){return x*x*x;} uniform vec3 uC0, uC1, uC2; uniform float uInt, uA, uEdge, uNorm; varying float vAge, vV; uniform sampler2D tNoise;
void main(){ float a=clamp(vAge,0.,1.); float fall=pow(max(1.-a,0.),1.7); float e=pow(max(vV,0.),uEdge)*.9+.12*vV; float fin=smoothstep(0.,.05,a)*.6+.4; float b=fall*e*uA*uInt; float en=texture2D(tNoise, vec2(vAge*2., vV)).a; float ea=vAge*.6-.15; float ero=smoothstep(ea,ea+.35,en)*(1.+2.*exp(-vAge*12.)); b*=ero;
  vec3 c=a<.35?mix(uC0,uC1,a/.35):mix(uC1,uC2,(a-.35)/.65); c=mix(c,uC0,cube(sq(max(vV,0.)))*.6); if(uNorm>.5){ float na=clamp(fall*smoothstep(0.,.35,vV)*uA*uInt*ero,0.,1.); gl_FragColor=vec4(c*na,na); } else gl_FragColor=vec4(c*b,1.); }`;
/** swept blade surface between two points on the weapon (inner/outer len). Fades by itself after t1. */
export function sweepSurface(fx, A, B, o) {
  const N = o.n ?? 30, len = o.len ?? 0.14, t0 = o.t0, t1 = o.t1, pos = new Float32Array((N + 1) * 2 * 3), age = new Float32Array((N + 1) * 2), vv = new Float32Array((N + 1) * 2), idx = [];
  for (let i = 0; i <= N; i++) { vv[i * 2] = 0; vv[i * 2 + 1] = 1; if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  const g = new THREE.BufferGeometry(); g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aAge', new THREE.BufferAttribute(age, 1)); g.setAttribute('aV', new THREE.BufferAttribute(vv, 1));
  const u = { uC0: { value: new THREE.Color(o.c0 || '#ffffff') }, uC1: { value: new THREE.Color(o.c1 || '#9cf') }, uC2: { value: new THREE.Color(o.c2 || '#126') }, uInt: { value: o.intensity ?? 2.2 }, uA: { value: 1 }, uEdge: { value: o.edge ?? 2.2 }, uNorm: { value: o.normal ? 1 : 0 }, tNoise: SU.tNoise };
  const m = new THREE.ShaderMaterial({ vertexShader: SW_V, fragmentShader: SW_F, uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: o.normal ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor, blendSrcAlpha: o.normal ? THREE.OneFactor : THREE.ZeroFactor, blendDstAlpha: o.normal ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 26;
  fx.mesh(mesh, (t, pr, f, w) => {
    u.uA.value = w;
    for (let i = 0; i <= N; i++) { const ts = Math.min(t1, Math.max(t0, t - (i / N) * len)); const a = A(ts), b = B(ts); const k = i * 6; pos[k] = a[0]; pos[k + 1] = a[1]; pos[k + 2] = a[2]; pos[k + 3] = b[0]; pos[k + 4] = b[1]; pos[k + 5] = b[2]; age[i * 2] = age[i * 2 + 1] = (t - ts) / len; }
    g.attributes.position.needsUpdate = g.attributes.aAge.needsUpdate = true;
  }, { t0, dur: t1 - t0 + len + 0.05, fade: [0.0, 0.05] });
  return mesh;
}
/** full blade swing: swept surface + hot edge trail. */
export function swing(fx, o) {
  const A = bladeTable(fx, o.t0, o.t1, o.inner ?? 0.4, o.rotY), B = bladeTable(fx, o.t0, o.t1, o.outer ?? 1.05, o.rotY);
  sweepSurface(fx, A, B, o);
  fx.trail({ path: B, len: (o.len ?? 0.14) * 0.8, n: 26, width: o.edgeW ?? 0.035, t0: o.t0, dur: o.t1 - o.t0 + (o.len ?? 0.14) + 0.05, fade: [0, 0.05], intensity: o.edgeInt ?? 3.5, ramp: [[0, o.c0 || '#fff'], [0.4, o.c1 || '#9cf'], [1, o.c2 || '#126']] });
  return { A, B };
}
/** contact burst: sparks + glint + flash light + optional dust / chips. */
export function contact(fx, p, t, o = {}) {
  const hot = o.hot || '#fff2dc', mid = o.mid || '#ffd070', cold = o.cold || '#a40';
  fx.emitter({ count: o.sparks ?? 50, kind: 'spark', shape: 'point', pos: p, dir: o.dir || [0.5, 0.35, 0.8], spread: o.spread ?? 1.2, speed: [2, o.speed ?? 8], life: [0.25, 0.7], gravity: [0, -9, 0], size: [0.07, 0.02], stretch: 1.6, ramp: [[0, hot], [0.4, mid], [1, cold, 0]], intensity: 4, bounce: p[1] < 0.5 ? 0.3 : -1, delay: t, t0: t - 0.02, emit: 0.001 });
  fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: p, size: [o.glint ?? 0.9, 0.3], life: [0.2, 0.2], ramp: [[0, '#fff'], [1, o.glintCol || mid, 0]], intensity: 4, delay: t, t0: t - 0.02, emit: 0.001 });
  fx.emitter({ count: 1, kind: 'soft', shape: 'point', pos: p, size: [0.2, o.flare ?? 1.1], life: [0.22, 0.22], ramp: [[0, hot], [1, mid, 0]], intensity: 1.5, delay: t, t0: t - 0.02, emit: 0.001 });
  if (o.lightI !== 0) fx.light({ color: o.light || mid, intensity: capL(fx, o.lightI ?? 70), pos: [p[0] - 0.3, p[1] + 0.2, p[2] + 0.6], range: 8, t0: t - 0.02, dur: 0.5, env: (u) => ENV.impact(u - t, 9), norm: 40 }); // lightI 0: burst() owns the light
  if (o.dust) fx.emitter({ count: o.dust, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.2, pos: [p[0], Math.max(0.1, p[1] * (o.ground ? 0 : 1)), p[2]], dir: [0.3, 1, 0.2], spread: 1.2, speed: [0.4, 1.8], life: [0.6, 1.4], size: [0.3, 0.9], ramp: [[0, '#595047', 0], [0.15, '#4c443c', 0.55], [1, '#2a2622', 0]], lit: 1, drag: 1.5, gravity: [0, 0.3, 0], turb: [0.3, 1], delay: t, t0: t - 0.02, emit: 0.1, order: -1 });
}
const VIEW = { pos: [1.3, 1.75, 6.6], target: [1.1, 1.15, 0] };
const HIGH = { pos: [1.2, 3.8, 6.6], target: [1.0, 0.9, 0] };
const WIDE = { pos: [1.6, 1.9, 8.2], target: [1.2, 1.0, 0] };
const arc = (fx, o) => fx.slash({ width: 0.2, tail: 0.8, sweep: [0, 1.4], intensity: 2.6, ...o });
const cams = (fx, t, ramp) => fx.ring({ t0: t, dur: 0.35, r: [0.1, 1.1], width: [0.14, 0.02], normal: 'cam', pos: ramp.pos, intensity: 1.2, ramp: ramp.c });
const dust = (fx, p, t, n = 30, size = [0.4, 1.4], speed = [0.6, 2.6]) => fx.emitter({ count: n, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.3, pos: p, dir: [0, 0.4, 0], spread: 1.5, radial: 0.9, speed, life: [0.8, 1.8], size, ramp: [[0, '#595147', 0], [0.12, '#4c443c', 0.6], [1, '#23201d', 0]], lit: 1, drag: 1.6, gravity: [0, 0.35, 0], turb: [0.3, 0.9], delay: t, t0: t - 0.02, emit: 0.15, order: -1 });
const feet = (fx, F, t) => fx.emitter({ count: 8, kind: 'dust', blend: 'normal', shape: 'disc', radius: 0.3, pos: F, dir: [0, 0.4, 0], spread: 1.5, radial: 0.9, speed: [0.6, 2.6], life: [0.6, 0.9], size: [0.4, 1.0], ramp: [[0, '#595147', 0], [0.12, '#4c443c', 0.6], [1, '#23201d', 0]], lit: 1, drag: 1.6, gravity: [0, 0.35, 0], turb: [0.3, 0.9], delay: t, t0: t - 0.02, emit: 0.1, order: -1 }); // target-feet puffs (sword-slash pattern)

export default [
  { id: 'melee/sword-slash', name: 'Sword slash', category: 'melee', loop: false, duration: 0.75, tier: 2, stage: { sky: 'night', view: VIEW },
    act: { kind: 'slash', weapon: 'sword', target: [1.85, 0, 0], windup: 0.45, hits: [{ t: 0.07, stop: 0.09, shake: 0.2, amp: 0.03, push: 1.4 }] },
    build(fx) {
      const T = 0.07, C = [1.62, 1.2, 0.1], H = [0.57, 1.2, 0.1], F = [1.85, 0.05, 0]; // T = hit, C = contact, H = hand pivot (outer blade 1.05 reaches C), F = target feet
      const { B } = swing(fx, { t0: -0.07, t1: 0.2, len: 0.25, inner: 0.65, outer: 1.05, c0: '#ffffff', c1: '#a9d6ff', c2: '#1b3fa8', intensity: 1.2, edge: 3 }); // len .25: tail erodes to 1 in .25 s
      // anticipation: faint glint at the blade tip, 0.1 s before the hit
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: B(T - 0.1), size: [0.5, 0.3], life: [0.12, 0.12], ramp: [[0, '#fff'], [1, '#9cf', 0]], intensity: 1.5, delay: T - 0.1, t0: T - 0.12, emit: 0.001 });
      // secondary volume: crescent in the swing plane (rotated x 90 deg, so arc angle a = -theta), dark steel rim
      fx.erode({ geo: slash({ R: 1.05, a0: -0.9, a1: 0.2, w: 0.4, curl: 0.3 }), rotate: [Math.PI / 2, 0, 0], pos: H, blend: 'normal', ramp: ['#1a1c22', '#3a3f4a', '#000000'], intensity: 0.8, erode: [0.05, 0.9], tile: [2, 1], channel: 'a', soft: 0.3, t0: T, dur: 0.3, fade: [0, 0.1] });
      // contact: sparks, 2-frame glint, light spike (ENV.impact, peak 4x of 30 = 120 = TIER 2 light)
      fx.emitter({ count: 30, kind: 'spark', shape: 'point', pos: C, dir: [0.5, 0.35, 0.8], spread: 1.2, speed: [2, 9], life: [0.25, 0.6], gravity: [0, -9, 0], size: [0.07, 0.02], stretch: 1.6, ramp: [[0, '#fff'], [0.4, '#ffd070'], [1, '#a40', 0]], intensity: 4, bounce: C[1] < 0.5 ? 0.3 : -1, delay: T, t0: T - 0.02, emit: 0.001 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: C, size: [0.3, 0.3], life: [0.05, 0.05], ramp: [[0, '#fff'], [1, '#9cf', 0]], intensity: 6, delay: T, t0: T - 0.02, emit: 0.001 });
      fx.light({ color: '#8fc0ff', intensity: 30, pos: C, range: 4, t0: T - 0.02, dur: 0.5, env: (t) => 4 * ENV.impact(t - T, 6) });
      // dissipation: small dust puffs at the target's feet
      fx.emitter({ count: 8, kind: 'dust', blend: 'normal', shape: 'disc', radius: 0.3, pos: F, dir: [0, 0.4, 0], spread: 1.5, radial: 0.9, speed: [0.6, 2.6], life: [0.6, 0.9], size: [0.4, 1.0], ramp: [[0, '#6a6055', 0], [0.12, '#5a5148', 0.6], [1, '#2a2622', 0]], lit: 1, drag: 1.6, gravity: [0, 0.35, 0], turb: [0.3, 0.9], delay: T, t0: T - 0.02, emit: 0.1, order: -1 });
    } },

  { id: 'melee/claw-swipe', name: 'Claw swipe', category: 'melee', loop: false, duration: 0.9, stage: { sky: 'dusk', view: VIEW },
    act: { kind: 'sideslash', target: [1.6, 0, 0], windup: 0.4, hits: [{ t: 0.05, stop: 0.07, shake: 0.2, amp: 0.035, push: 1.6 }] },
    build(fx) {
      const hot = [[0, '#ffe0c0'], [0.3, '#ff8a40'], [1, '#a01008']];
      for (let k = -1; k <= 1; k++) {
        const pts = []; for (let i = 0; i <= 20; i++) { const u = i / 20; pts.push([1.15 + 0.2 * k + 0.62 * u, 1.9 - 0.08 * k - 1.3 * u + 0.1 * Math.sin(Math.PI * u), 0.32 + 0.1 * k]); }
        const w = (u) => 0.06 * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.02)), 0.6);
        fx.ribbon({ points: pts, n: 20, width: w, t0: 0.0 + 0.025 * (k + 1), dur: 0.2, sweep: [0, 1.5], ease: 'out', tail: 0.9, intensity: 1.5, ramp: hot });
        fx.ribbon({ points: pts, n: 20, width: (u) => w(u) * 0.55, head: () => 1.2, tail: 3.5, t0: 0.05 + 0.025 * (k + 1), dur: 0.75, fade: [0.03, 0.6], intensity: 0.8, ramp: [[0, '#ff7a30'], [0.5, '#d01808'], [1, '#500']] });
      }
      swing(fx, { t0: -0.08, t1: 0.14, len: 0.1, inner: 0.0, outer: 0.28, c0: '#ffe0c0', c1: '#ff7040', c2: '#600', intensity: 1.2, edgeW: 0.03, edgeInt: 2.6 });
      contact(fx, [1.5, 1.2, 0.4], 0.05, { light: '#ff6a3a', mid: '#ff9050', cold: '#800', sparks: 40, glintCol: '#f84', glint: 0.7 });
      feet(fx, [1.6, 0.05, 0], 0.05);
      fx.emitter({ count: 22, kind: 'drop', shape: 'box', shapeSize: [0.3, 0.55, 0.02], pos: [1.5, 1.3, 0.3], dir: [0.1, -0.2, 0], spread: 0.6, speed: [0.1, 1.0], life: [0.4, 0.9], gravity: [0, -6, 0], size: [0.035, 0.02], ramp: [[0, '#ff7030'], [0.6, '#c01008'], [1, '#400', 0]], intensity: 1.5, delay: 0.1, emit: 0.35, bounce: 0.2 });
    } },

  { id: 'melee/dagger-flurry', name: 'Dagger flurry', category: 'melee', loop: false, duration: 0.95, stage: { sky: 'night', view: VIEW },
    act: { weapon: 'dagger', target: [1.75, 0, 0], windup: 0.3,
      keys: [[-0.3, 'guard'], [-0.1, 'daggerA'], [0, 'daggerB', 'snap'], [0.12, 'daggerA'], [0.2, 'daggerB', 'snap'], [0.32, 'sideBack'], [0.4, 'sideCut', 'snap'], [0.52, 'windupHigh'], [0.62, 'cut', 'snap'], [0.72, 'follow'], [0.95, 'guard']],
      hits: [{ t: 0.0, stop: 0.03, shake: 0.08, amp: 0.012, push: 0.4 }, { t: 0.2, stop: 0.03, shake: 0.08, amp: 0.012, push: 0.4 }, { t: 0.4, stop: 0.03, shake: 0.1, amp: 0.015, push: 0.5 }, { t: 0.62, stop: 0.12, shake: 0.3, amp: 0.04, push: 1.8 }] },
    build(fx) {
      const cols = { c0: '#e8f2ff', c1: '#bfe6ff', c2: '#2a5ab0' };
      const C = [1.55, 1.2, 0.2];
      arc(fx, { center: C, radius: 0.7, a0: 2.5, a1: 0.1, tilt: 0.3, t0: -0.04, dur: 0.14, ...cols, width: 0.1, intensity: 1.5 });
      arc(fx, { center: [C[0], C[1] - 0.1, 0.2], radius: 0.75, a0: -0.5, a1: 2.6, tilt: -0.3, t0: 0.14, dur: 0.14, ...cols, width: 0.1, intensity: 1.5 });
      arc(fx, { center: C, radius: 0.7, a0: 3.0, a1: 0.5, tilt: 0.1, t0: 0.34, dur: 0.14, ...cols, width: 0.1, intensity: 1.5 });
      arc(fx, { center: [1.0, 1.0, 0.2], radius: 1.3, a0: 2.1, a1: -0.45, tilt: 0.12, t0: 0.57, dur: 0.22, ramp: [[0, '#fff2dc'], [0.3, '#ffe9a0'], [1, '#c06010']], width: 0.26, intensity: 2.6 });
      [0.0, 0.2, 0.4].forEach((t) => contact(fx, [1.5 + fx.rng() * 0.15, 1.1 + fx.rng() * 0.3, 0.2], t + 0.03, { sparks: 14, speed: 5, lightI: 25, glint: 0.5, light: '#b0d8ff' }));
      contact(fx, [1.65, 1.15, 0.2], 0.65, { sparks: 60, speed: 10, lightI: 70, glint: 1.2, light: '#ffd890' });
      feet(fx, [1.75, 0.05, 0], 0.62);
    } },

  { id: 'melee/double-slash', name: 'Double slash', category: 'melee', loop: false, duration: 0.8, stage: { sky: 'night', view: VIEW },
    act: { weapon: 'sword', target: [1.85, 0, 0], windup: 0.4,
      keys: [[-0.4, 'guard'], [-0.15, 'windupHigh'], [0, 'cut', 'snap'], [0.1, 'upLow'], [0.22, 'upHigh', 'snap'], [0.4, 'follow'], [0.8, 'guard']],
      hits: [{ t: 0.04, stop: 0.05, shake: 0.12, amp: 0.02, push: 0.8 }, { t: 0.23, stop: 0.1, shake: 0.25, amp: 0.04, push: 1.6, flash: 0.25 }] },
    build(fx) {
      swing(fx, { t0: -0.07, t1: 0.12, len: 0.12, inner: 0.65, outer: 1.05, c0: '#e8f2ff', c1: '#9fe0ff', c2: '#1a50b0', intensity: 1.4, edge: 3, edgeInt: 1.5 });
      swing(fx, { t0: 0.15, t1: 0.3, len: 0.2, inner: 0.65, outer: 1.05, c0: '#fff2dc', c1: '#ffd890', c2: '#b05010', intensity: 1.4, edge: 3, edgeInt: 2.6 });
      contact(fx, [1.62, 1.35, 0.1], 0.04, { sparks: 24, lightI: 35, light: '#8fd0ff' });
      contact(fx, [1.65, 1.3, 0.1], 0.23, { sparks: 60, speed: 10, lightI: 70, glint: 1.6, light: '#ffe0a0', glintCol: '#fc8' });
      fx.ring({ t0: 0.23, dur: 0.4, r: [0.1, 1.2], width: [0.12, 0.02], normal: 'cam', pos: [1.65, 1.3, 0.1], intensity: 1.2, ramp: [[0, '#fff2dc'], [1, '#fc8']] });
      feet(fx, [1.85, 0.05, 0], 0.23);
    } },

  { id: 'melee/hammer-smash', name: 'Hammer smash', category: 'melee', tier: 3, loop: false, duration: 2.0, stage: { sky: 'dusk', bloom: 0.4, view: WIDE },
    act: { weapon: 'hammer', target: false, windup: 0.6, keys: [[-0.6, 'guard'], [-0.3, 'overheadUp'], [0, 'smashGround', 'snap'], [0.35, 'smashGround'], [1.1, 'guard']], hits: [{ t: 0.0, stop: 0.14, shake: 0.55, amp: 0.1 }] },
    build(fx) {
      const H = bladeTable(fx, 0, 0.1, 0.92)(0.02), P = [H[0], 0, H[2]];
      swing(fx, { t0: -0.07, t1: 0.02, len: 0.2, inner: 0.7, outer: 1.0, c0: '#fff2dc', c1: '#ffcf90', c2: '#a04010', intensity: 1.1, edge: 3, edgeInt: 2.6 });
      fx.flash(0, 0.15, '#ffe8c8', 0.15);
      fx.ring({ t0: 0, dur: 0.8, r: [0.3, 5.5], width: [0.2, 0.04], normal: 'up', pos: P, intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#fdb'], [1, '#a64']] });
      fx.shell({ t0: 0, dur: 0.4, r: [0.2, 1.9], hemi: true, power: 2, noise: 1, intensity: 1.2, pos: P, ramp: [[0, '#fff2dc'], [0.5, '#fc9'], [1, '#a50']], fade: [0, 0.4] });
      fx.decal({ kind: 'cracks', t0: 0, dur: 1.9, r: [2.4, 2.8], pos: P, fade: [0.05, 1.2], heat: [1, 0.1], reveal: 0.25, cells: 4, y: 0.005 });
      fx.decal({ kind: 'scorch', t0: 0, dur: 1.95, r: [0.6, 1.2], pos: P, fade: [0.05, 1.4], heat: [1, 0], ramp: [[0, '#1a1410'], [0.5, '#f60'], [1, '#fc8']] });
      fx.emitter({ count: 26, kind: 'rock', blend: 'normal', shape: 'disc', radius: 0.3, pos: [P[0], 0.1, P[2]], dir: [0, 1, 0], spread: 0.9, speed: [3, 7.5], life: [1.0, 1.8], gravity: [0, -10, 0], size: [0.16, 0.09], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], lit: 1, bounce: 0.35, rot: 6 });
      dust(fx, [P[0], 0.1, P[2]], 0, 55, [0.8, 2.2], [1.5, 4.5]);
      fx.emitter({ count: 60, kind: 'spark', shape: 'disc', radius: 0.2, pos: [P[0], 0.1, P[2]], dir: [0, 1, 0], spread: 1.3, speed: [3, 9], life: [0.4, 0.7], gravity: [0, -9, 0], size: [0.09, 0.03], stretch: 1.4, ramp: [[0, '#fff'], [0.3, '#ffc060'], [1, '#800', 0]], intensity: 4, bounce: 0.3 });
      burst(fx, P, 0, { ramp: [[0, '#fff2dc'], [0.5, '#ffb060'], [1, '#a04010']], col: '#ffa860' });
    } },

  { id: 'melee/heavy-cleave', name: 'Heavy cleave', category: 'melee', tier: 3, loop: false, duration: 1.9, stage: { sky: 'dusk', bloom: 0.45, view: WIDE },
    act: { weapon: 'sword', target: false, windup: 0.7, keys: [[-0.7, 'guard'], [-0.35, 'overheadUp'], [0, 'smashGround', 'snap'], [0.4, 'smashGround'], [1.2, 'guard']], hits: [{ t: 0.0, stop: 0.12, shake: 0.5, amp: 0.09 }] },
    build(fx) {
      const H = bladeTable(fx, 0, 0.1, 1.05)(0.02), P = [H[0], 0, H[2]];
      swing(fx, { t0: -0.07, t1: 0.02, len: 0.22, inner: 0.35, outer: 1.05, c0: '#fff2dc', c1: '#ffb050', c2: '#b02000', intensity: 1.5, edge: 2.4, edgeW: 0.05, edgeInt: 2.6 });
      fx.flash(0, 0.15, '#ffd8a0', 0.15);
      fx.ring({ t0: 0, dur: 0.6, r: [0.2, 4.2], width: [0.15, 0.03], normal: 'up', pos: P, intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#fb8'], [1, '#a40']] });
      fx.decal({ kind: 'cracks', t0: 0, dur: 1.85, r: [2.0, 2.6], pos: P, fade: [0.05, 1.2], heat: [1, 0.15], reveal: 0.3, cells: 4, y: 0.005, ramp: [[0, '#1a1410'], [0.4, '#f40'], [1, '#fc6']] });
      fx.decal({ kind: 'glow', t0: 0, dur: 1.5, r: [1.0, 1.8], pos: P, fade: [0.02, 1.2], intensity: 1.2 });
      dust(fx, [P[0], 0.1, P[2]], 0, 50, [0.7, 2.0], [1.2, 4]);
      fx.emitter({ count: 70, kind: 'soft', shape: 'disc', radius: 0.9, pos: [P[0], 0.1, P[2]], dir: [0, 1, 0], spread: 0.5, speed: [0.5, 2.2], life: [1.0, 2.0], gravity: [0, 0.8, 0], size: [0.05, 0.02], ramp: [[0, '#ffd080'], [0.5, '#ff6a20'], [1, '#600', 0]], intensity: 1.5, delay: 0.05, emit: 0.4, turb: [0.5, 1.2] });
      fx.emitter({ count: 60, kind: 'spark', shape: 'disc', radius: 0.15, pos: [P[0], 0.1, P[2]], dir: [0, 1, 0], spread: 1.2, speed: [3, 9], life: [0.4, 0.7], gravity: [0, -9, 0], size: [0.08, 0.025], stretch: 1.4, ramp: [[0, '#fff'], [0.3, '#ffb040'], [1, '#800', 0]], intensity: 4, bounce: 0.3 });
      fx.emitter({ count: 14, kind: 'rock', blend: 'normal', shape: 'disc', radius: 0.2, pos: [P[0], 0.1, P[2]], dir: [0, 1, 0], spread: 0.8, speed: [2.5, 6], life: [1.0, 1.6], gravity: [0, -10, 0], size: [0.12, 0.08], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], lit: 1, bounce: 0.3, rot: 5 });
      burst(fx, P, 0, { ramp: [[0, '#fff2dc'], [0.5, '#ff8a40'], [1, '#b02000']], col: '#ff8a40' });
    } },

  { id: 'melee/scythe-reap', name: 'Scythe reap', category: 'melee', loop: false, duration: 2.1, stage: { sky: 'dusk', bloom: 0.4, view: HIGH },
    act: { weapon: 'scythe', target: [1.9, 0, 0], windup: 0.7,
      keys: [[-0.7, 'guard'], [-0.35, 'sideBack'], [0.25, 'sideCut'], [0.9, 'sideCut'], [1.6, 'guard']],
      hits: [{ t: 0.16, stop: 0.12, shake: 0.3, amp: 0.04, push: 1.2 }] },
    build(fx) {
      const O = bladeTable(fx, -0.35, 0.4, 1.4);
      sweepSurface(fx, bladeTable(fx, -0.35, 0.4, 1.0), bladeTable(fx, -0.35, 0.4, 1.7), { t0: -0.35, t1: 0.4, len: 0.45, n: 40, normal: true, c0: '#7a48d0', c1: '#4a2898', c2: '#1a0840', intensity: 0.9, edge: 0.8 });
      sweepSurface(fx, bladeTable(fx, -0.35, 0.4, 1.0), bladeTable(fx, -0.35, 0.4, 1.7), { t0: -0.35, t1: 0.4, len: 0.45, n: 40, c0: '#e8f4ff', c1: '#9a70e0', c2: '#2a1060', intensity: 0.8, edge: 6 });
      fx.trail({ path: bladeTable(fx, -0.35, 0.4, 1.7), len: 0.4, n: 40, width: 0.03, t0: -0.35, dur: 1.3, fade: [0, 0.6], intensity: 1.5, ramp: [[0, '#e8e0ff'], [0.5, '#a888ff'], [1, '#4020a0']] });
      for (let i = 0; i < 7; i++) {
        const ts = -0.1 + i * 0.07, p = O(ts);
        fx.emitter({ count: 12, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.12, pos: p, dir: [0.2, 0.6, -0.2], spread: 1.3, speed: [0.2, 0.8], life: [1.0, 1.9], size: [0.3, 0.9], ramp: [[0, '#2a1048', 0], [0.2, '#1a0a2e', 0.55], [1, '#0a0412', 0]], lit: 1, drag: 1.2, turb: [0.5, 1.0], delay: ts + 0.35, t0: ts + 0.34, emit: 0.1, order: -1 });
        fx.emitter({ count: 8, kind: 'soft', shape: 'sphere', radius: 0.1, pos: p, dir: [0.2, 1, 0], spread: 1.2, speed: [0.2, 1.0], life: [0.8, 1.6], size: [0.1, 0.02], ramp: [[0, '#d8e8ff'], [0.4, '#8a60e0'], [1, '#201050', 0]], intensity: 1.2, drag: 1.0, turb: [0.8, 1.4], gravity: [0, 0.5, 0], delay: ts + 0.35, t0: ts + 0.34, emit: 0.1 });
      }
      contact(fx, [1.7, 1.2, 0.15], 0.16, { hot: '#eef', mid: '#a080ff', cold: '#204', light: '#9070ff', sparks: 30, speed: 5, glintCol: '#a8f', lightI: 50 });
      feet(fx, [1.9, 0.05, 0], 0.16);
    } },

  { id: 'melee/spear-sweep', name: 'Spear sweep', category: 'melee', loop: false, duration: 1.5, stage: { sky: 'dusk', view: HIGH },
    act: { weapon: 'spear', target: [1.95, 0, 0], windup: 0.5,
      keys: [[-0.5, 'guard'], [-0.2, 'sweepBack'], [0, 'sweepCut', 'snap'], [0.4, 'sweepCut'], [1.1, 'guard']],
      hits: [{ t: -0.03, stop: 0.08, shake: 0.25, amp: 0.04, push: 1.3 }] },
    build(fx) {
      const B = bladeTable(fx, -0.2, 0.2, 1.8), A = bladeTable(fx, -0.2, 0.2, 1.0);
      sweepSurface(fx, A, B, { t0: -0.2, t1: 0.1, len: 0.2, n: 36, c0: '#fff2dc', c1: '#ffe0b0', c2: '#905020', intensity: 1.1, edge: 2.5 });
      fx.trail({ path: B, len: 0.15, n: 30, width: 0.04, t0: -0.2, dur: 0.5, fade: [0, 0.2], intensity: 2.6, ramp: [[0, '#fff2dc'], [0.5, '#ffd8a0'], [1, '#a05010']] });
      for (let i = 0; i < 9; i++) { const ts = -0.1 + i * 0.025, p = B(ts); dust(fx, [p[0], 0.1, p[2]], ts, 8, [0.3, 0.9], [0.5, 1.8]); }
      contact(fx, [1.85, 0.45, 0.1], -0.03, { sparks: 30, lightI: 40, light: '#ffd090', glint: 0.7, dust: 18, ground: true });
    } },

  { id: 'melee/spin-slash', name: 'Spin slash', category: 'melee', loop: false, duration: 0.8, stage: { sky: 'night', view: HIGH },
    act: { weapon: 'sword', target: [1.55, 0, 0], windup: 0.35,
      keys: [[-0.35, 'guard'], [-0.1, 'sideBack'], [0, 'sideCut', 'snap'], [0.45, 'sideCut'], [0.8, 'guard']],
      hits: [{ t: 0.3, stop: 0.08, shake: 0.3, amp: 0.05, push: 1.4 }] },
    build(fx) {
      const rotY = (t) => { const u = Math.min(1, Math.max(0, (t + 0.02) / 0.34)); return -Math.PI * 2 * (u * u * (3 - 2 * u)); };
      fx.on((t) => { fx.body.rotation.y = rotY(t); });
      const A = bladeTable(fx, -0.05, 0.4, 0.5, rotY), B = bladeTable(fx, -0.05, 0.4, 1.05, rotY);
      sweepSurface(fx, A, B, { t0: -0.05, t1: 0.36, len: 0.3, n: 44, c0: '#e8f2ff', c1: '#a8e0ff', c2: '#2060c0', intensity: 1.0, edge: 2.4 });
      fx.trail({ path: B, len: 0.22, n: 44, width: 0.04, t0: -0.05, dur: 0.6, fade: [0, 0.2], intensity: 2.6, ramp: [[0, '#e8f2ff'], [0.5, '#bfe8ff'], [1, '#2060c0']] });
      fx.ring({ t0: 0.0, dur: 0.5, r: [1.4, 2.2], width: [0.1, 0.02], normal: 'up', pos: [0, 1.2, 0], intensity: 1.0, ramp: [[0, '#e8f2ff'], [1, '#6ac']], fade: [0.05, 0.4] });
      fx.emitter({ count: 60, kind: 'spark', shape: 'ring', radius: 1.5, radiusIn: 1.3, pos: [0, 1.25, 0], dir: [0, 0.2, 0], radial: 1, spread: 0.5, speed: [1.5, 5], life: [0.3, 0.7], gravity: [0, -6, 0], size: [0.06, 0.02], stretch: 1.5, ramp: [[0, '#fff'], [0.4, '#9cf'], [1, '#124', 0]], intensity: 4, delay: 0.3, emit: 0.05 });
      contact(fx, [1.5, 1.25, 0.1], 0.3, { light: '#8fc0ff', glintCol: '#9cf', sparks: 40 });
      feet(fx, [1.55, 0.05, 0], 0.3);
      fx.light({ color: '#8fc0ff', intensity: 50, pos: [0, 1.4, 0.8], range: 8, t0: -0.05, dur: 0.6, fade: [0.05, 0.4], norm: 40 });
    } },

  { id: 'melee/thrust', name: 'Thrust', category: 'melee', loop: false, duration: 0.75, stage: { sky: 'night', view: { pos: [1.6, 1.7, 7.4], target: [1.5, 1.15, 0] } },
    act: { weapon: 'spear', target: [2.75, 0, 0], windup: 0.4, keys: [[-0.4, 'guard'], [-0.14, 'thrustBack'], [0, 'lunge', 'snap'], [0.25, 'lunge'], [0.7, 'guard']], hits: [{ t: 0.04, stop: 0.1, shake: 0.22, amp: 0.035, push: 1.6 }] },
    build(fx) {
      const T = bladeTable(fx, -0.07, 0.1, 1.85), tip = T(0.04);
      sweepSurface(fx, bladeTable(fx, -0.07, 0.1, 1.2), T, { t0: -0.07, t1: 0.06, len: 0.14, n: 24, c0: '#e8f2ff', c1: '#bfe0ff', c2: '#2850a0', intensity: 1.0, edge: 3 });
      fx.trail({ path: T, len: 0.12, n: 24, width: 0.03, t0: -0.07, dur: 0.35, fade: [0, 0.15], intensity: 2.6, ramp: [[0, '#e8f2ff'], [0.5, '#bfe0ff'], [1, '#2850a0']] });
      for (let k = 0; k < 7; k++) { const y = tip[1] + (fx.rng() - 0.5) * 0.9, z = 0.1 + (fx.rng() - 0.5) * 0.8, x0 = tip[0] - 1.6 - fx.rng() * 0.8, L = 0.9 + fx.rng() * 0.8; fx.ribbon({ points: [[x0, y, z], [x0 + L, y, z]], n: 8, width: (u) => 0.012 * Math.sin(Math.PI * u), sweep: [0, 1.5], ease: 'out', tail: 0.7, t0: -0.08 + k * 0.01, dur: 0.14, fade: [0, 0.06], intensity: 1.5, ramp: [[0, '#e8f2ff'], [1, '#6a9ae0']] }); }
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: tip, size: [1.6, 0.4], life: [0.3, 0.3], ramp: [[0, '#fff'], [1, '#9cf', 0]], intensity: 4, delay: 0.04, emit: 0.001 });
      contact(fx, [tip[0] + 0.1, tip[1], 0.1], 0.04, { dir: [0.9, 0.2, 0.5], sparks: 45, speed: 9, light: '#8fc0ff', glintCol: '#9cf', glint: 0.5 });
      fx.ring({ t0: 0.04, dur: 0.35, r: [0.1, 1.0], width: [0.12, 0.02], normal: [1, 0, 0], pos: [tip[0], tip[1], 0.1], intensity: 1.2, ramp: [[0, '#e8f2ff'], [1, '#8cf']] });
      feet(fx, [2.75, 0.05, 0], 0.04);
    } },

  { id: 'melee/uppercut', name: 'Uppercut', category: 'melee', tier: 2, loop: false, duration: 0.85, stage: { sky: 'dusk', view: VIEW },
    act: { target: [1.55, 0, 0], windup: 0.4,
      keys: [[-0.4, 'guard'], [-0.12, 'upLow'], [0.04, 'upHigh', 'snap'], [0.3, 'upHigh'], [0.8, 'guard']],
      hits: [{ t: 0.04, stop: 0.14, shake: 0.4, amp: 0.07, push: 2.2 }] },
    build(fx) {
      const H = bladeTable(fx, -0.04, 0.12, 0.15), T = bladeTable(fx, -0.04, 0.12, 0.45);
      sweepSurface(fx, H, T, { t0: -0.04, t1: 0.1, len: 0.14, n: 24, c0: '#fff2dc', c1: '#ffd890', c2: '#c05010', intensity: 1.3, edge: 2.5 });
      fx.trail({ path: H, len: 0.12, n: 24, width: 0.07, t0: -0.04, dur: 0.4, fade: [0, 0.2], intensity: 1.5, ramp: [[0, '#fff2dc'], [0.4, '#ffd070'], [1, '#c05010']] });
      arc(fx, { center: [0.9, 0.55, 0.25], radius: 1.1, a0: -0.8, a1: 1.1, tilt: 0.1, t0: -0.04, dur: 0.18, ramp: [[0, '#fff2dc'], [0.3, '#ffd890'], [1, '#c06010']], width: 0.22, intensity: 2.4 });
      const C = [1.4, 1.45, 0.3];
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: C, size: [1.8, 0.6], life: [0.3, 0.3], ramp: [[0, '#fff'], [0.5, '#ffe090'], [1, '#f80', 0]], intensity: 2, delay: 0.04, emit: 0.001 });
      fx.emitter({ count: 22, kind: 'streak', shape: 'point', pos: C, dir: [0, 1, 0], spread: 3.14, speed: [4, 9], size: [0.5, 0.2], life: [0.18, 0.3], ramp: [[0, '#fff'], [0.4, '#ffd070'], [1, '#f60', 0]], intensity: 1.8, stretch: 2, delay: 0.04, emit: 0.001 });
      fx.ring({ t0: 0.04, dur: 0.4, r: [0.1, 1.6], width: [0.2, 0.03], normal: 'cam', pos: C, intensity: 1.5, ramp: [[0, '#fff2dc'], [0.5, '#ffd890'], [1, '#f80']] });
      contact(fx, C, 0.04, { dir: [0.4, 1, 0.4], sparks: 50, speed: 9, light: '#ffc070', lightI: 0, glint: 0.001, flare: 0.5, dust: 12 });
      feet(fx, [1.55, 0.05, 0], 0.04);
      burst(fx, C, 0.04, { ramp: [[0, '#fff2dc'], [0.5, '#ffd890'], [1, '#c06010']], col: '#ffc070', dir: [0.4, 1, 0.4], debris: false, marks: false });
    } },

  { id: 'melee/whip-crack', name: 'Whip crack', category: 'melee', tier: 1, loop: false, duration: 0.85, stage: { sky: 'dusk', view: { pos: [1.5, 1.7, 7.0], target: [1.4, 1.2, 0] } },
    act: { kind: 'throw', weapon: 'whip', target: [2.45, 0, 0], windup: 0.45, hits: [{ t: 0.0, stop: 0.07, shake: 0.12, amp: 0.025, push: 1.0 }] },
    build(fx) {
      const Hd = bladeTable(fx, -0.45, 0.6, 0.25), T = [2.2, 1.35, 0.1], N = 28;
      const ss = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
      const pts = (t) => {
        const h = Hd(t), e = 0.3 + 0.7 * ss(-0.2, 0.0, t), ar = (1 - ss(-0.2, 0.0, t)), after = ss(0.02, 0.4, t), out = [];
        for (let i = 0; i <= N; i++) { const u = i / N, k = u * e, s = Math.sin(Math.PI * u);
          out.push([h[0] + (T[0] - h[0]) * k - ar * s * 0.6 * (1 - u), h[1] + (T[1] - h[1]) * k + ar * s * 1.0 - after * s * 0.35 * u, h[2] + (T[2] - h[2]) * k + ar * 0.35 * Math.sin(u * 7 - t * 30) * s + after * 0.18 * Math.sin(u * 8 - t * 25) * u * (1 - after * 0.6)]); }
        return out;
      };
      fx.ribbon({ points: (t) => pts(t), n: N, width: (u) => 0.05 * (1 - u * 0.6), head: () => 1.001, tail: 4, blend: 'normal', intensity: 1.0, t0: -0.45, dur: 1.3, fade: [0.05, 0.25], ramp: [[0, '#c9b9a0'], [1, '#3a281c']] });
      fx.ribbon({ points: (t) => pts(t).slice(), n: N, width: 0.02, head: () => 1.001, tail: 4, intensity: 1.2, t0: -0.1, dur: 0.14, fade: [0.02, 0.1], ramp: [[0, '#fff2dc'], [1, '#ffd8a0']] });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: T, size: [0.9, 0.3], life: [0.2, 0.2], ramp: [[0, '#fff'], [1, '#ffe0b0', 0]], intensity: 3, delay: 0.0, emit: 0.001 });
      fx.emitter({ count: 1, kind: 'soft', shape: 'point', pos: T, size: [0.2, 0.8], life: [0.18, 0.18], ramp: [[0, '#fff2dc'], [1, '#fc9', 0]], intensity: 1.2, delay: 0.0, emit: 0.001 });
      fx.ring({ t0: 0, dur: 0.3, r: [0.05, 0.9], width: [0.1, 0.015], normal: 'cam', pos: T, intensity: 1.4, ramp: [[0, '#fff2dc'], [1, '#fc9']] });
      fx.emitter({ count: 14, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.08, pos: T, dir: [0.3, 0.6, 0], spread: 1.4, speed: [0.3, 1.4], life: [0.6, 1.2], size: [0.2, 0.7], ramp: [[0, '#564f48', 0], [0.15, '#423d37', 0.5], [1, '#1a1815', 0]], lit: 1, drag: 1.8, delay: 0.0, emit: 0.05, order: -1 });
      contact(fx, T, 0.0, { sparks: 22, speed: 6, lightI: 40, light: '#ffd8a0', glint: 0.001, flare: 0.001 });
      feet(fx, [2.45, 0.05, 0], 0);
    } },
];
