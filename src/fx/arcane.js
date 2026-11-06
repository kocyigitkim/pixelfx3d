import * as THREE from 'three';
import { POSES } from '../core/dummy.js';
import { NOISE } from '../core/glsl.js';
import { clamp, smooth as sm, lerp } from '../core/rng.js';
import { burst } from './_aaa.js';

const TAU = Math.PI * 2;
const VIO = [[0, '#f0e8ff'], [0.25, '#e3c8ff'], [0.6, '#9a50ff'], [1, '#3a10a0']]; // bright -> dark
const VIO_A = (a = 0) => [[0, '#f0e8ff', 1], [0.25, '#e0c0ff', 0.9], [0.6, '#8a40f0', 0.6], [1, '#2a0a80', a]];
const handAt = (fx, pose) => { fx.body.setPose(pose); return fx.anchor('handR'); }; // body-only: hand of a held pose
const liveHand = (fx) => { const v = new THREE.Vector3(); return () => { fx.body.armR.hand.getWorldPosition(v); fx.worldToLocal(v); return [v.x, v.y, v.z]; }; };
const bez = (a, b, c, u) => { const k = 1 - u; return [k * k * a[0] + 2 * k * u * b[0] + u * u * c[0], k * k * a[1] + 2 * k * u * b[1] + u * u * c[1], k * k * a[2] + 2 * k * u * b[2] + u * u * c[2]]; };

const clockTexture = () => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d');
  const g = x.createRadialGradient(256, 256, 20, 256, 256, 256); g.addColorStop(0, '#2a3350'); g.addColorStop(1, '#10162a'); x.fillStyle = g; x.beginPath(); x.arc(256, 256, 256, 0, 7); x.fill();
  x.strokeStyle = '#d8c080'; x.lineWidth = 6; x.beginPath(); x.arc(256, 256, 236, 0, 7); x.stroke();
  x.fillStyle = '#e8d8a0'; x.font = 'bold 54px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const rom = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU - Math.PI / 2; x.save(); x.translate(256 + Math.cos(a) * 190, 256 + Math.sin(a) * 190); x.rotate(a + Math.PI / 2); x.font = i % 3 ? 'bold 38px serif' : 'bold 48px serif'; x.fillText(rom[i], 0, 0); x.restore(); }
  for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; x.lineWidth = i % 5 ? 2 : 4; x.beginPath(); x.moveTo(256 + Math.cos(a) * 228, 256 + Math.sin(a) * 228); x.lineTo(256 + Math.cos(a) * (i % 5 ? 220 : 212), 256 + Math.sin(a) * (i % 5 ? 220 : 212)); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
};

const portalMat = (U) => new THREE.ShaderMaterial({
  uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 vUv; void main(){ vUv=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
  fragmentShader: `${NOISE} uniform float uPh, uA; varying vec2 vUv;
    void main(){ float r=length(vUv); if(r>1.) discard; float a=atan(vUv.y,vUv.x);
      float sp=sin(a*3.+log(r+.04)*7.-uPh*2.)*.5+.5; float sp2=sin(a*5.-r*14.+uPh*3.)*.5+.5;
      float n=fbm3(vec3(vUv*2.5,0.)+vec3(cos(uPh)*.5,sin(uPh)*.5,0.));
      float edge=smoothstep(.74,.93,r)*smoothstep(1.,.93,r); float rim=smoothstep(.88,.95,r)*smoothstep(1.,.95,r);
      float swirl=sp*.55+sp2*.3+n*.5; float inner=smoothstep(.0,.75,r);
      vec3 col=mix(vec3(.45,.12,.95),vec3(.85,.6,1.),swirl)*swirl*inner*1.6;
      col+=vec3(.7,.35,1.)*edge*(1.2+n)+vec3(1.,.9,1.)*rim*2.2;
      col*=.55*mix(.06,1.,smoothstep(.0,.55,r)); float al=uA*smoothstep(1.,.9,r); gl_FragColor=vec4(col*al,1.); }` });

export default [
  /* ------------------------------------------------------------------ arcane beam */
  { id: 'arcane/arcane-beam', name: 'Arcane beam', category: 'arcane', loop: true, duration: 1.2, body: true, stage: { sky: 'night', view: { pos: [2.3, 1.5, 5.6], target: [2.3, 1.15, 0], fov: 42 }, bloom: 0.6 },
    build(fx) {
      fx.body.setPose(POSES.castRelease); const H = handAt(fx, POSES.castRelease), E = [5.4, H[1], 0];
      const heli = (ph, R) => (t) => { const pts = [], n = 40; for (let i = 0; i <= n; i++) { const u = i / n, a = u * TAU * 2.5 - (t / 1.2) * TAU * 2 + ph, rr = R * Math.sin(Math.PI * Math.min(1, u * 6)) * (0.6 + 0.4 * u); pts.push([lerp(H[0], E[0], u), lerp(H[1], E[1], u) + Math.cos(a) * rr, lerp(H[2], E[2], u) + Math.sin(a) * rr]); } return pts; };
      fx.beam({ from: H, to: E, r: [0.035, 0.07], intensity: 0.6, noise: 0.5, freq: 3, speed: 4, pulse: 0.15, ramp: [[0, '#8a40f0'], [0.5, '#d8b8ff'], [1, '#ffffff']] });
      fx.beam({ from: H, to: E, r: [0.015, 0.025], intensity: 1.5, noise: 0.2, speed: 6, ramp: [[0, '#f0e8ff'], [1, '#fff']] });
      for (let k = 0; k < 3; k++) fx.ribbon({ points: heli(k * TAU / 3, 0.11), n: 40, width: 0.025, head: () => 1.001, tail: 1.0, intensity: 1.5, core: 6, ramp: VIO });
      fx.orb({ kind: 'plasma', r: 0.1, pos: H, intensity: 1.2, noise: 3, scroll: 3, ramp: [[0, '#4a10b0'], [0.5, '#b070ff'], [1, '#fff']], pulse: [0.12, TAU / 1.2 * 3] });
      fx.orb({ kind: 'plasma', r: [0.16, 0.22], pos: E, intensity: 1.2, noise: 3, scroll: 4, alpha: 0.9, ramp: [[0, '#4a10b0'], [0.5, '#b070ff'], [1, '#fff']], pulse: [0.2, TAU / 1.2 * 4] });
      fx.emitter({ count: 50, kind: 'spark', shape: 'point', pos: E, dir: [-1, 0, 0], spread: 1.3, speed: [1.5, 5], life: [0.25, 0.6], size: [0.06, 0.015], stretch: 1.5, gravity: [0, -5, 0], ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#40c', 0]], intensity: 3, loop: true, emit: 1.2, bounce: 0.3 });
      fx.emitter({ count: 24, kind: 'soft', shape: 'line', shapeSize: [2.5, 0.05, 0.05], pos: [(H[0] + E[0]) / 2, H[1], 0], dir: [0, 0.2, 0], spread: 1, speed: [0.1, 0.5], life: [0.5, 1], size: [0.06, 0.01], ramp: [[0, '#f0e8ff'], [1, '#a060ff', 0]], intensity: 1.5, turb: [0.3, 2] });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: E, size: [0.5, 0.5], life: [1.2, 1.2], ramp: [[0, '#fff'], [1, '#d8b8ff']], intensity: 1.5, rot: 0.5 });
      fx.light({ color: '#9a50ff', intensity: 25, pos: H, range: 8, flicker: 0.15 }); fx.light({ color: '#b070ff', intensity: 25, pos: [E[0] - 0.4, E[1], 0.4], range: 8, flicker: 0.2, main: false });
      fx.decal({ kind: 'glow', pos: [E[0], 0.01, 0], r: [1.2, 1.2], ramp: [[0, '#000'], [0.5, '#4a1a90'], [1, '#c090ff']], intensity: 0.8, alpha: 0.6 });
    } },

  /* ------------------------------------------------------------------ arcane missiles */
  { id: 'arcane/arcane-missiles', name: 'Arcane missiles', category: 'arcane', tier: 1, loop: false, duration: 1.75, stage: { sky: 'night', view: { pos: [2.2, 1.7, 6.2], target: [2.0, 1.1, 0], fov: 42 }, bloom: 0.6 },
    act: { kind: 'cast', target: [4.4, 0, 0], windup: 0.4 },
    build(fx) {
      const H = fx.anchor('handR', 0), E = fx.anchor('tgt', 0, [-0.1, 0, 0]); const N = 5, hits = []; // release hand -> target chest
      for (let i = 0; i < N; i++) {
        const t0 = 0.08 + i * 0.13, fl = 0.55, side = i % 2 ? 1 : -1, c1 = [1.5 + i * 0.1, 2.3 + (i % 3) * 0.45, side * (0.9 + 0.2 * i)];
        const path = (t) => { const u = clamp((t - t0) / fl); const e = u * u * (3 - 2 * u) * 0.5 + u * 0.5; const p = bez(H, c1, E, e); p[1] += Math.sin(u * Math.PI * 3) * 0.1 * side; p[2] += Math.cos(u * Math.PI * 3) * 0.1; return p; };
        fx.trail({ path, len: 0.28, width: 0.05, n: 28, t0, dur: fl + 0.04, fade: [0.0, 0.03], intensity: 1.2, ramp: VIO });
        fx.emitter({ count: 1, kind: 'soft', shape: 'point', size: [0.22, 0.22], life: [fl, fl], delay: t0, ramp: [[0, '#f0e8ff'], [1, '#fff']], intensity: 2.5, follow: (m, tAbs, t) => m.position.set(...path(t)) });
        const ti = t0 + fl;
        fx.emitter({ count: 26, kind: 'spark', shape: 'point', pos: E, dir: [-0.6, 0.3, 0.3], spread: 1.6, speed: [1.5, 5], life: [0.2, 0.5], size: [0.06, 0.015], stretch: 1.4, gravity: [0, -6, 0], ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#40c', 0]], intensity: 3.5, delay: ti });
        fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: E, size: [0.7, 0.2], life: [0.22, 0.22], ramp: [[0, '#fff'], [1, '#c8f', 0]], intensity: 4, delay: ti });
        fx.ring({ t0: ti, dur: 0.3, r: [0.05, 0.6], width: [0.1, 0.02], normal: 'cam', pos: E, intensity: 1.0, ramp: [[0, '#f0e8ff'], [1, '#a060ff']] });
        fx.hit(ti, { push: 0.25 }); hits.push(ti);
      }
      fx.light({ color: '#9a50ff', intensity: 25, pos: H, range: 6, t0: 0, dur: 0.9, fade: [0.05, 0.5] });
      fx.emitter({ count: 20, kind: 'soft', shape: 'sphere', radius: 0.08, pos: H, speed: [0.4, 1.5], life: [0.4, 0.8], size: [0.05, 0.01], ramp: [[0, '#f0e8ff'], [1, '#90f', 0]], intensity: 1.5, delay: 0.0, emit: 0.7 });
      hits.forEach((ti, i) => burst(fx, E, ti, { ramp: [[0, '#f0e8ff'], [0.5, '#c090ff'], [1, '#40c']], col: '#b070ff', dir: [1, 0, 0], light: i % 2 === 0 })); // V8: 3 burst lights + hand
    } },

  /* ------------------------------------------------------------------ arcane orb */
  { id: 'arcane/arcane-orb', name: 'Arcane orb', category: 'arcane', loop: true, duration: 2.4, stage: { sky: 'dark', view: { pos: [1.6, 1.3, 2.6], target: [0, 1.05, 0], fov: 38 }, bloom: 0.6 },
    build(fx) {
      const C = [0, 1.05, 0], D = 2.4;
      fx.orb({ kind: 'glass', r: 0.4, pos: C, intensity: 1.4, power: 2.2, noise: 1.5, disp: 0.04, ramp: [[0, '#2a0a60'], [0.5, '#8a40f0'], [1, '#e8d0ff']], pulse: [0.03, TAU / D] });
      fx.orb({ kind: 'plasma', r: 0.22, pos: C, intensity: 2.2, noise: 3, scroll: 2, disp: 0.3, ramp: [[0, '#4a10b0'], [0.5, '#b070ff'], [1, '#fff']], pulse: [0.1, TAU / D * 2] });
      const ring = (tilt, roll, R, ph, dir) => (t) => { const pts = [], n = 56, cT = Math.cos(tilt), sT = Math.sin(tilt); for (let i = 0; i <= n; i++) { const a = (i / n) * TAU * 0.999 + dir * (t / D) * TAU + ph; const x = Math.cos(a) * R, z = Math.sin(a) * R; const y1 = -z * sT, z1 = z * cT; const cr = Math.cos(roll), sr = Math.sin(roll); pts.push([C[0] + x * cr - y1 * sr, C[1] + x * sr + y1 * cr, C[2] + z1]); } return pts; };
      fx.ribbon({ points: ring(0.5, 0.3, 0.62, 0, 1), n: 56, width: 0.02, head: () => 1.001, tail: 0.9, intensity: 1.5, ramp: VIO });
      fx.ribbon({ points: ring(-0.9, -0.5, 0.7, 2, -1), n: 56, width: 0.016, head: () => 1.001, tail: 0.9, intensity: 1.5, ramp: VIO });
      fx.ribbon({ points: ring(1.4, 0.9, 0.56, 4, 2), n: 56, width: 0.014, head: () => 1.001, tail: 0.8, intensity: 1.5, ramp: VIO });
      fx.emitter({ count: 24, kind: 'glint', shape: 'sphere', radius: 0.62, radiusIn: 0.5, pos: C, size: [0.12, 0.03], life: [0.6, 1.2], ramp: [[0, '#fff'], [1, '#a060ff', 0]], intensity: 1.5, speed: [0, 0.1] });
      fx.emitter({ count: 40, kind: 'soft', shape: 'sphere', radius: 0.5, pos: C, speed: [0.05, 0.3], life: [1, 2], size: [0.03, 0.008], ramp: [[0, '#e0c0ff'], [1, '#70f', 0]], intensity: 1.5, turb: [0.4, 1.5], swirl: TAU / D });
      fx.light({ color: '#9a50ff', intensity: 25, pos: [0, 1.05, 0], range: 7, flicker: 0.08, rate: TAU / D * 3 });
      fx.decal({ kind: 'glow', r: [1.3, 1.3], ramp: [[0, '#000'], [0.5, '#3a1580'], [1, '#a070ff']], intensity: 0.7, alpha: 0.6 });
    } },

  /* ------------------------------------------------------------------ blink in */
  { id: 'arcane/blink-in', name: 'Blink in', category: 'arcane', loop: false, duration: 1.4, body: true, stage: { sky: 'dark', view: { pos: [2.4, 1.4, 3.5], target: [0, 0.95, 0], fov: 40 }, bloom: 0.6 },
    build(fx) {
      fx.on((t) => { const d = 1 - sm(0.35, 1.0, t); fx.body.set({ dissolve: t < 0.1 ? 1 : d, dDir: -1, edge: '#d8b0ff', edgeW: 0.08, edgeInt: 1.5, tint: '#c090ff', tintAmt: (1 - sm(0.9, 1.3, t)) * 0.6, glow: Math.exp(-Math.max(0, t - 1.0) * 6) * sm(0.85, 1.0, t), rim: '#a060ff', rimAmt: 0.7 * (1 - sm(1.0, 1.4, t)) }); });
      for (let k = 0; k < 5; k++) { const a0 = k * TAU / 5; fx.ribbon({ points: (t) => { const pts = [], n = 32, pr = clamp(t / 0.95); for (let i = 0; i <= n; i++) { const u = i / n; const rr = (1.5 * (1 - u * u)) * (1 - 0.0 * pr), a = a0 + u * 6 - pr * 1; pts.push([Math.cos(a) * rr, 0.15 + u * 1.5 + Math.sin(u * 3 + a0) * 0.1, Math.sin(a) * rr]); } return pts; }, n: 32, width: 0.03, sweep: [0.0, 1.1], tail: 0.5, t0: 0, dur: 1.0, fade: [0.05, 0.25], intensity: 1.5, ramp: VIO }); }
      fx.emitter({ count: 120, kind: 'soft', shape: 'sphere', radius: 1.7, pos: [0, 0.95, 0], radial: 1, speed: [-3.2, -1.6], life: [0.5, 0.8], size: [0.05, 0.012], ramp: [[0, '#f0e8ff'], [0.5, '#c090ff'], [1, '#60f', 0]], intensity: 1.5, emit: 0.6, swirl: 3 }); // anchor-ok
      fx.emitter({ count: 50, kind: 'glint', shape: 'box', shapeSize: [0.2, 0.85, 0.15], pos: [0, 0.95, 0], size: [0.18, 0.04], life: [0.3, 0.6], ramp: [[0, '#fff'], [1, '#a8f', 0]], intensity: 3.5, delay: 0.7, emit: 0.5, speed: [0, 0.3] }); // anchor-ok
      fx.emitter({ count: 40, kind: 'spark', shape: 'sphere', radius: 0.2, pos: [0, 0.95, 0], radial: 1, speed: [1.5, 4], life: [0.3, 0.7], size: [0.05, 0.015], stretch: 1.2, ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#40c', 0]], intensity: 3, delay: 1.0, gravity: [0, -2, 0] }); // anchor-ok
      fx.ring({ t0: 0.95, dur: 0.45, r: [0.2, 1.8], width: [0.2, 0.03], normal: 'up', intensity: 1.2, ramp: [[0, '#f0e8ff'], [1, '#a060ff']] });
      fx.light({ color: '#a060ff', intensity: 21, pos: [0.5, 1.2, 0.5], range: 8, env: (t) => 0.4 + sm(0.6, 1.0, t) * 1.2 * Math.exp(-Math.max(0, t - 1.0) * 5), t0: 0, dur: 1.4, fade: [0.1, 0.3] });
      fx.decal({ kind: 'glow', r: [1.0, 1.0], t0: 0.1, dur: 1.2, fade: [0.3, 0.5], ramp: [[0, '#000'], [0.5, '#4a1a90'], [1, '#c090ff']], intensity: 0.8, alpha: 0.6 });
    } },

  /* ------------------------------------------------------------------ blink out */
  { id: 'arcane/blink-out', name: 'Blink out', category: 'arcane', loop: false, duration: 1.6, body: true, stage: { sky: 'dark', view: { pos: [2.4, 1.4, 3.5], target: [0, 0.95, 0], fov: 40 }, bloom: 0.6 },
    build(fx) {
      fx.on((t) => { const d = sm(0.18, 0.7, t); fx.body.set({ dissolve: t < 0.15 ? -1 : d, dDir: 1, edge: '#e0c8ff', edgeW: 0.08, edgeInt: 1.5, tint: '#d0a8ff', tintAmt: Math.exp(-Math.max(0, t - 0.15) * 5) * sm(0.05, 0.15, t) * 0.9, rim: '#a060ff', rimAmt: 0.8 * (1 - d), glow: sm(0.0, 0.15, t) * (1 - d) }); });
      fx.light({ color: '#b070ff', intensity: 19, pos: [0.4, 1.2, 0.5], range: 8, t0: 0.05, dur: 1.4, fade: [0.05, 0.6], env: (t) => 0.4 + 1.4 * Math.exp(-Math.max(0, t - 0.15) * 4) }); // anchor-ok
      fx.ring({ t0: 0.15, dur: 0.5, r: [0.2, 2.4], width: [0.3, 0.04], normal: 'up', intensity: 1.2, ramp: [[0, '#f0e8ff'], [1, '#a060ff']] });
      fx.ring({ t0: 0.17, dur: 0.4, r: [0.2, 1.5], width: [0.2, 0.03], normal: 'cam', pos: [0, 1, 0], intensity: 1.0, ramp: [[0, '#f0e8ff'], [1, '#c090ff']] }); // anchor-ok
      fx.emitter({ count: 150, kind: 'spark', shape: 'box', shapeSize: [0.22, 0.85, 0.16], pos: [0, 0.95, 0], radial: 1, speed: [0.5, 3.4], life: [0.5, 1.2], size: [0.05, 0.015], stretch: 1.1, gravity: [0, 0.8, 0], drag: 1.2, ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#40c', 0]], intensity: 1.5, delay: 0.17, emit: 0.4, turb: [0.5, 2] }); // anchor-ok
      fx.emitter({ count: 70, kind: 'soft', shape: 'box', shapeSize: [0.22, 0.85, 0.16], pos: [0, 0.95, 0], radial: 1, speed: [0.2, 1], life: [0.8, 1.4], size: [0.04, 0.01], gravity: [0, 0.9, 0], ramp: [[0, '#f0e8ff'], [1, '#80f', 0]], intensity: 1.5, delay: 0.2, emit: 0.5, swirl: 4, drag: 0.8 }); // anchor-ok
      fx.emitter({ count: 12, kind: 'glint', shape: 'box', shapeSize: [0.2, 0.8, 0.15], pos: [0, 0.95, 0], size: [0.3, 0.06], life: [0.3, 0.6], ramp: [[0, '#fff'], [1, '#a8f', 0]], intensity: 4, delay: 0.15, emit: 0.3, speed: [0, 0.2] }); // anchor-ok
      fx.decal({ kind: 'glow', r: [1.1, 1.1], t0: 0.1, dur: 1.4, fade: [0.05, 0.9], ramp: [[0, '#000'], [0.5, '#4a1a90'], [1, '#c090ff']], intensity: 0.9, alpha: 0.7 });
    } },

  /* ------------------------------------------------------------------ magic circle cast */
  { id: 'arcane/magic-circle-cast', name: 'Magic circle cast', category: 'arcane', loop: false, duration: 3.9, stage: { sky: 'dark', view: { pos: [3.2, 1.9, 4.6], target: [0, 1.3, 0], fov: 42 }, bloom: 0.65 },
    act: { kind: 'castup', target: false, windup: 0.6 },
    build(fx) {
      const R = [[0, '#3a1080'], [0.5, '#a060ff'], [1, '#f0e0ff']];
      fx.decal({ kind: 'rune', r: [1.9, 1.9], glyphs: 16, poly: 6, spin: 0.3, reveal: 1.6, t0: 0.2, dur: 3.7, fade: [0.1, 0.8], ramp: R, intensity: 1.2 });
      fx.decal({ kind: 'rune', r: [1.1, 1.1], glyphs: 8, poly: 5, spin: -0.5, reveal: 1.4, t0: 0.5, dur: 3.4, fade: [0.1, 0.8], ramp: R, intensity: 1.2 });
      fx.decal({ kind: 'glow', r: [2.0, 2.0], t0: 1.0, dur: 2.9, fade: [0.6, 0.9], ramp: [[0, '#000'], [0.5, '#3a1580'], [1, '#a070ff']], intensity: 0.8, alpha: 0.6 });
      const T = 2.0;
      fx.beam({ pos: [0, 0, 0], height: 7, r: [0.8, 0.8], intensity: 0.7, t0: T, dur: 1.5, fade: [0.04, 0.9], ramp: [[0, '#8a40f0'], [0.5, '#d0a8ff'], [1, '#fff']], noise: 0.5, extend: 4 });
      fx.beam({ pos: [0, 0, 0], height: 7, r: [0.3, 0.3], intensity: 1.6, t0: T, dur: 1.3, fade: [0.04, 0.8], ramp: [[0, '#f0e8ff'], [1, '#fff']], noise: 0.2, extend: 4 });
      fx.ring({ t0: T, dur: 0.8, r: [0.4, 4.2], width: [0.4, 0.06], normal: 'up', intensity: 1.3, ramp: [[0, '#f0e8ff'], [1, '#9a50ff']] });
      fx.shake(T, 0.5, 0.025);
      fx.light({ color: '#9a50ff', intensity: 18, pos: [0, 0.6, 0.5], range: 9, env: (t) => sm(0.2, 1.8, t) * 0.7 + (t > T ? 1.2 * Math.exp(-(t - T) * 1.5) : 0), t0: 0, dur: 3.9, fade: [0.1, 0.8] });
      fx.emitter({ count: 110, kind: 'soft', shape: 'ring', radius: 1.8, radiusIn: 0.3, pos: [0, 0, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.6, 1.8], life: [1, 2], size: [0.04, 0.01], ramp: [[0, '#f0e8ff'], [0.4, '#c090ff'], [1, '#50e', 0]], intensity: 1.5, delay: 0.8, emit: 2.6, swirl: 0.8 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'disc', radius: 0.5, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.2, speed: [3, 8], life: [0.5, 0.7], size: [0.05, 0.015], stretch: 1.4, gravity: [0, -2, 0], ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#50e', 0]], intensity: 3.5, delay: T, emit: 0.5 });
      fx.emitter({ count: 14, kind: 'glint', shape: 'disc', radius: 1.5, pos: [0, 0.1, 0], size: [0.3, 0.05], life: [0.3, 0.7], ramp: [[0, '#fff'], [1, '#a8f', 0]], intensity: 3.5, delay: 0.8, emit: 2.5, speed: [0, 0.3], dir: [0, 1, 0] });
    } },

  /* ------------------------------------------------------------------ mana burst */
  { id: 'arcane/mana-burst', name: 'Mana burst', category: 'arcane', tier: 2, loop: false, duration: 1.8, stage: { sky: 'dark', view: { pos: [3.0, 1.6, 4.2], target: [0, 1.1, 0], fov: 42 }, bloom: 0.7 },
    build(fx) {
      const C = [0, 1.1, 0];
      fx.flash(0.0, 0.25, '#e8d4ff', 0.08);
      fx.orb({ kind: 'energy', r: [0.1, 1.2], ease: 'out', pos: C, dur: 0.5, fade: [0, 0.45], intensity: 0.9, alpha: 0.7, noise: 2, disp: 0.4, ramp: [[0, '#4a10b0'], [0.5, '#b070ff'], [1, '#fff']] });
      fx.ring({ t0: 0, dur: 0.7, r: [0.2, 4.5], width: [0.2, 0.03], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#f0e8ff'], [1, '#9a50ff']] });
      fx.ring({ t0: 0.02, dur: 0.6, r: [0.2, 3.2], width: [0.3, 0.05], normal: 'cam', pos: C, intensity: 1.5, ramp: [[0, '#f0e8ff'], [1, '#c090ff']] });
      fx.ring({ t0: 0.08, dur: 0.8, r: [0.2, 2.2], width: [0.2, 0.04], normal: [0.6, 0.5, 0.2], pos: C, intensity: 1.0, ramp: [[0, '#f0e8ff'], [1, '#b070ff']] });
      fx.emitter({ count: 22, kind: 'ring', shape: 'sphere', radius: 0.2, pos: C, radial: 1, speed: [2, 5.5], life: [0.7, 1.4], size: [0.22, 0.12], rot: 5, drag: 1.8, ramp: [[0, '#f0e8ff'], [0.2, '#e0c8ff'], [0.6, '#9a50ff'], [1, '#40c', 0]], intensity: 1.5 });
      fx.emitter({ count: 22, kind: 'glint', shape: 'sphere', radius: 0.3, pos: C, radial: 1, speed: [2, 6], life: [0.5, 0.7], size: [0.3, 0.1], rot: 3, drag: 1.5, ramp: [[0, '#fff'], [1, '#b080ff', 0]], intensity: 3.5 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.1, pos: C, radial: 1, speed: [3, 11], life: [0.4, 0.7], size: [0.06, 0.015], stretch: 1.5, drag: 1.2, gravity: [0, -3, 0], ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#40c', 0]], intensity: 3.5, bounce: 0.3 });
      fx.emitter({ count: 60, kind: 'soft', shape: 'sphere', radius: 0.3, pos: C, radial: 1, speed: [0.3, 2], life: [0.9, 1.6], size: [0.05, 0.012], drag: 1, gravity: [0, 0.4, 0], ramp: [[0, '#e0c8ff'], [1, '#70f', 0]], intensity: 1.5, turb: [0.4, 1.4], delay: 0.1, emit: 0.2 });
      fx.decal({ kind: 'rune', r: [1.4, 2.2], glyphs: 12, poly: 6, spin: 1.2, t0: 0, dur: 1.4, fade: [0.02, 1.1], ramp: [[0, '#4a10b0'], [0.5, '#b070ff'], [1, '#fff']], intensity: 1.2 });
      burst(fx, C, 0, { ramp: [[0, '#f0e8ff'], [0.5, '#b070ff'], [1, '#4a10b0']], col: '#b070ff' });
    } },

  /* ------------------------------------------------------------------ portal */
  { id: 'arcane/portal', name: 'Portal', category: 'arcane', loop: true, duration: 2.4, stage: { sky: 'dark', view: { pos: [1.2, 1.35, 4.2], target: [0, 1.15, 0], fov: 40 }, bloom: 0.65 },
    build(fx) {
      const D = 2.4, U = { uPh: { value: 0 }, uA: { value: 1 } };
      const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), portalMat(U)); disc.scale.set(0.95, 1.2, 1); disc.position.y = 1.2; disc.renderOrder = 20;
      fx.mesh(disc, (t) => { U.uPh.value = (t / D) * TAU; }, { dur: 99 });
      const frame = (ph) => (t) => { const pts = [], n = 64; for (let i = 0; i <= n; i++) { const a = (i / n) * TAU * 0.999 + (t / D) * TAU * 1; pts.push([Math.cos(a) * 0.98, 1.2 + Math.sin(a) * 1.25, 0.02]); } return pts; };
      fx.ribbon({ points: frame(0), n: 64, width: 0.035, head: () => 1.001, tail: 1.0, intensity: 1.5, ramp: VIO });
      fx.emitter({ count: 90, kind: 'soft', shape: 'ring', radius: 1.7, radiusIn: 0.8, pos: [0, 1.2, 0], rot3: [Math.PI / 2, 0, 0], radial: 1, speed: [-1.8, -0.8], life: [0.9, 1.5], size: [0.04, 0.008], ramp: [[0, '#e0c8ff'], [0.7, '#9a50ff'], [1, '#fff', 0]], intensity: 1.5, swirl: -2, turb: [0.2, 1] });
      fx.emitter({ count: 24, kind: 'glint', shape: 'ring', radius: 1.0, radiusIn: 0.9, pos: [0, 1.2, 0], rot3: [Math.PI / 2, 0, 0], size: [0.18, 0.04], life: [0.4, 0.7], ramp: [[0, '#fff'], [1, '#a8f', 0]], intensity: 3.4, speed: [0, 0.1] });
      fx.emitter({ count: 30, kind: 'spark', shape: 'ring', radius: 1.0, radiusIn: 0.9, pos: [0, 1.2, 0], rot3: [Math.PI / 2, 0, 0], radial: 1, speed: [0.4, 1.4], life: [0.4, 0.7], size: [0.05, 0.015], stretch: 1, gravity: [0, -1.5, 0], ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#40c', 0]], intensity: 3 });
      fx.light({ color: '#9a50ff', intensity: 25, pos: [0.1, 1.2, 0.9], range: 8, flicker: 0.1, rate: TAU / D * 4 });
      fx.decal({ kind: 'glow', r: [2.0, 2.0], ramp: [[0, '#000'], [0.5, '#3a1580'], [1, '#a070ff']], intensity: 0.7, alpha: 0.6, y: 0.01 });
    } },

  /* ------------------------------------------------------------------ rune circle */
  { id: 'arcane/rune-circle', name: 'Rune circle', category: 'arcane', loop: true, duration: 4, stage: { sky: 'dark', view: { pos: [2.4, 2.3, 3.6], target: [0, 0.5, 0], fov: 42 }, bloom: 0.6 },
    build(fx) {
      const R = [[0, '#3a1080'], [0.5, '#a060ff'], [1, '#f0e0ff']];
      fx.decal({ kind: 'rune', r: [1.7, 1.7], glyphs: 12, poly: 6, spin: TAU / 4, ramp: R, intensity: 1.2 });
      fx.decal({ kind: 'rune', r: [1.05, 1.05], glyphs: 12, poly: 6, spin: -TAU / 4, ramp: R, intensity: 1.2, y: 0.006 });
      fx.decal({ kind: 'glow', r: [1.9, 1.9], ramp: [[0, '#000'], [0.5, '#3a1580'], [1, '#a070ff']], intensity: 0.8, alpha: 0.55, y: 0.002 });
      fx.beam({ pos: [0, 0, 0], height: 2.2, r: [1.5, 1.5], intensity: 0.12, ramp: [[0, '#8a40f0'], [1, '#c090ff']], noise: 0.8, edge: 2.5, speed: 1.2 });
      fx.emitter({ count: 90, kind: 'soft', shape: 'disc', radius: 1.6, pos: [0, 0.02, 0], dir: [0, 1, 0], spread: 0.15, speed: [0.3, 0.9], life: [1.5, 2.8], size: [0.04, 0.01], ramp: [[0, '#f0e8ff'], [0.4, '#c090ff'], [1, '#50e', 0]], intensity: 1.5, swirl: TAU / 4, turb: [0.2, 1], floorFade: 1 });
      fx.emitter({ count: 16, kind: 'glint', shape: 'ring', radius: 1.7, radiusIn: 1.4, pos: [0, 0.05, 0], size: [0.2, 0.04], life: [0.4, 0.7], ramp: [[0, '#fff'], [1, '#a8f', 0]], intensity: 3.5, speed: [0, 0.3], dir: [0, 1, 0] });
      fx.light({ color: '#9a50ff', intensity: 25, pos: [0, 0.7, 0], range: 7, flicker: 0.08, rate: TAU / 4 * 3 });
    } },

  /* ------------------------------------------------------------------ spell charge */
  { id: 'arcane/spell-charge', name: 'Spell charge', category: 'arcane', loop: true, duration: 1.6, body: true, stage: { sky: 'night', view: { pos: [1.6, 1.3, 2.6], target: [0.5, 1.15, 0], fov: 40 }, bloom: 0.65 },
    build(fx) {
      fx.body.setPose(POSES.castCharge); const H = handAt(fx, POSES.castCharge), D = 1.6; H[0] += 0.12;
      fx.orb({ kind: 'plasma', r: 0.14, pos: H, intensity: 2.2, noise: 3, scroll: 3, disp: 0.3, ramp: [[0, '#4a10b0'], [0.5, '#b070ff'], [1, '#fff']], pulse: [0.15, TAU / D * 3] });
      fx.orb({ kind: 'glass', r: 0.22, pos: H, intensity: 1.2, power: 2.5, alpha: 0.8, ramp: [[0, '#2a0a60'], [0.5, '#8a40f0'], [1, '#e8d0ff']], pulse: [0.1, TAU / D * 2] });
      fx.emitter({ count: 70, kind: 'soft', shape: 'sphere', radius: 0.8, radiusIn: 0.6, pos: H, radial: 1, speed: [-0.9, -0.5], life: [0.8, 0.8], size: [0.04, 0.01], ramp: [[0, '#c090ff', 0.3], [0.5, '#e0c8ff', 1], [1, '#fff', 0]], intensity: 1.5, swirl: 3, loop: true });
      fx.emitter({ count: 20, kind: 'spark', shape: 'sphere', radius: 0.2, pos: H, radial: 1, speed: [0.8, 2.4], life: [0.3, 0.7], size: [0.04, 0.012], stretch: 1.3, gravity: [0, -2, 0], ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#40c', 0]], intensity: 3.4 });
      fx.bolt({ from: H, to: (s) => [H[0] + Math.cos(s * 2.4) * 0.35, H[1] + Math.sin(s * 3.7) * 0.3, H[2] + Math.sin(s * 1.3) * 0.3], jag: 0.1, branches: 1, width: 0.012, rate: 10, flicker: 0.4, ramp: VIO });
      fx.bolt({ from: H, to: (s) => [H[0] + Math.sin(s * 5.1) * 0.3, H[1] + Math.cos(s * 1.9) * 0.35, H[2] + Math.cos(s * 4.3) * 0.3], jag: 0.1, branches: 1, width: 0.012, rate: 10, flicker: 0.4, ramp: VIO });
      fx.light({ color: '#9a50ff', intensity: 25, pos: [H[0], H[1], H[2] + 0.3], range: 6, flicker: 0.2, rate: TAU / D * 4 });
    } },

  /* ------------------------------------------------------------------ star fall */
  { id: 'arcane/star-fall', name: 'Star fall', category: 'arcane', tier: 2, loop: false, duration: 2.5, stage: { sky: 'night', view: { pos: [2.2, 1.6, 5.2], target: [0, 1.4, 0], fov: 46 }, bloom: 0.7 },
    build(fx) {
      const N = 8, hits = []; const sites = [[-0.9, 0.4], [0.7, -0.5], [0.1, 0.9], [-0.3, -0.8], [1.2, 0.3], [-1.3, -0.2], [0.5, 0.4], [0.0, 0.0]];
      for (let i = 0; i < N; i++) {
        const [gx, gz] = sites[i], t0 = 0.1 + i * 0.22, fl = 0.5, sx = gx - 2.2, sy = 6 + (i % 3) * 0.5, sz = gz - 1.5;
        const path = (t) => { const u = clamp((t - t0) / fl); const e = u * u; return [lerp(sx, gx, e), lerp(sy, 0.12, e), lerp(sz, gz, e)]; };
        fx.trail({ path, len: 0.22, width: 0.09, n: 30, t0, dur: fl + 0.02, intensity: 1.2, fade: [0, 0.02], ramp: [[0, '#fff2dc'], [0.3, '#fff0c0'], [0.7, '#ffc040'], [1, '#c05000']] });
        fx.emitter({ count: 1, kind: 'glint', shape: 'point', size: [0.5, 0.5], life: [fl, fl], delay: t0, ramp: [[0, '#fff'], [1, '#ffe8a0']], intensity: 3, rot: 3, follow: (m, a, t) => m.position.set(...path(t)) });
        const ti = t0 + fl;
        fx.ring({ t0: ti, dur: 0.5, r: [0.1, 1.2], width: [0.075, 0.015], normal: 'up', pos: [gx, 0.02, gz], intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [1, '#ffc060']] });
        fx.emitter({ count: 28, kind: 'spark', shape: 'point', pos: [gx, 0.1, gz], dir: [0, 1, 0], spread: 1.3, speed: [1.5, 4.5], life: [0.3, 0.7], size: [0.05, 0.015], stretch: 1.3, gravity: [0, -8, 0], ramp: [[0, '#fff'], [0.4, '#ffd060'], [1, '#a40', 0]], intensity: 3.5, delay: ti, bounce: 0.35 });
        fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [gx, 0.3, gz], size: [1.0, 0.3], life: [0.3, 0.3], ramp: [[0, '#fff'], [1, '#ffd070', 0]], intensity: 4, delay: ti });
        fx.emitter({ count: 4, kind: 'smoke', blend: 'normal', lit: 1, shape: 'point', pos: [gx, 0.1, gz], dir: [0, 1, 0], spread: 0.8, speed: [0.2, 0.6], life: [0.6, 1.0], size: [0.3, 0.7], ramp: [[0, '#5d4f3f', 0.5], [1, '#251f1c', 0]], delay: ti, order: -1 });
        fx.decal({ kind: 'scorch', pos: [gx, 0.004, gz], r: [0.4, 0.5], t0: ti, dur: 2.5 - ti, fade: [0.05, 0.6], heat: [1, 0.1], ramp: [[0, '#1a1410'], [0.5, '#f90'], [1, '#ffe090']] });
        hits.push([gx, 0, gz, ti]);
      }
      fx.light({ color: '#aab8ff', intensity: 14, pos: [-1.5, 3.5, 1], range: 12, t0: 0, dur: 2.5, fade: [0.2, 0.6], main: false });
      const SR = [[0, '#fff2dc'], [0.5, '#ffd060'], [1, '#a04000']];
      hits.forEach(([x, y, z, ti], i) => burst(fx, [x, y, z], ti, i === N - 1 ? { ramp: SR, col: '#ffc870' } : { tier: 1, ramp: SR, col: '#ffc870', light: i >= N - 3, dust: false, debris: false, marks: false })); // V8: 3 burst lights + sky
    } },

  /* ------------------------------------------------------------------ time stop */
  { id: 'arcane/time-stop', name: 'Time stop', category: 'arcane', loop: false, duration: 3.6, body: true, stage: { sky: 'dusk', view: { pos: [2.2, 1.5, 5.0], target: [0, 1.25, 0], fov: 44 }, bloom: 0.45 },
    screen: { glsl: `vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
      float g=smoothstep(.27,.34,p)*(1.-smoothstep(.62,.72,p)); float l=dot(c,vec3(.3,.55,.15)); vec3 gray=vec3(l)*vec3(.9,.95,1.15);
      vec3 o=mix(c,gray,g*.92); float fl=exp(-sq((p-.28)*30.)); o=mix(o,vec3(1.)-o,fl*.25); float sh=exp(-sq((p-.66)*22.)); o+=vec3(.7,.8,1.)*sh*.35;
      float v=smoothstep(.9,.2,length((uv-.5)*vec2(a,1.))); o*=mix(1.,v,g*.5); return o; }` },
    build(fx) {
      const TF = 1.0, TC = 1.7, TS = 2.3; const crack = { value: 0 }, tex = clockTexture();
      const grp = new THREE.Group(); grp.position.set(0, 1.45, -1.0);
      const dialMat = new THREE.ShaderMaterial({ uniforms: { uTex: { value: tex }, uCrack: crack }, transparent: true, side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `${NOISE} uniform sampler2D uTex; uniform float uCrack; varying vec2 vUv;
          void main(){ vec4 c=texture2D(uTex,vUv); vec2 q=vUv*2.-1.; float w=fbm3(vec3(q*3.,1.))*.5; vec2 vo=voronoi(vec3(q*3.2+w,0.)); float line=smoothstep(.07,.0,vo.y); float rv=smoothstep(uCrack*1.4,uCrack*1.4-.25,length(q)+fbm3(vec3(q*4.,2.))*.4);
          float cr=line*rv*step(.001,uCrack); vec3 col=c.rgb*(1.-cr*.6)+vec3(.6,.8,1.)*cr*1.4; gl_FragColor=vec4(col,c.a); }` });
      const dial = new THREE.Mesh(new THREE.CircleGeometry(1.05, 64), dialMat); grp.add(dial);
      const gold = new THREE.MeshStandardMaterial({ color: '#d8b050', metalness: 1, roughness: 0.3 });
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.05, 12, 64), gold); grp.add(rim);
      const hH = new THREE.Group(), mH = new THREE.Group(); const hb = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.55, 0.03), gold); hb.position.y = 0.2; hH.add(hb);
      const mb = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.85, 0.03), gold); mb.position.y = 0.32; mH.add(mb); hH.position.z = 0.03; mH.position.z = 0.05; grp.add(hH, mH);
      const hub = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), gold); hub.position.z = 0.05; grp.add(hub);
      const glow = new THREE.PointLight('#9fc0ff', 0, 8, 2); glow.position.set(0, 0, 0.6); grp.add(glow);
            fx.mesh(grp, (t) => {
        const appear = sm(0, 0.3, t); grp.scale.setScalar(0.6 + 0.4 * appear);
        const tt = Math.min(t, TF), q = Math.max(0, tt - 0.6), k = tt < 0.6 ? tt : 0.6 + q * (1 - 0.5 * q / (TF - 0.6)); mH.rotation.z = -(k * 14); hH.rotation.z = -(k * 14) / 12;
        const vib = t > TF && t < TC ? Math.sin(t * 90) * 0.01 * (1 - sm(TF, TC, t)) : 0; mH.rotation.z += vib; grp.visible = t < TS && appear > 0.001;
        crack.value = t > TC ? sm(TC, TS, t) * 1.0 + 0.01 : 0;
        glow.intensity = (t > TF ? 3 : 1) * (1 - sm(TS - 0.1, TS + 0.2, t)); 
      }, { dur: 99 });
      fx.on((t) => { const s = sm(TF - 0.05, TF + 0.4, t); fx.body.set({ tint: '#9fb8ff', tintAmt: s * 0.45 * (1 - sm(3.0, 3.6, t)), rim: '#9fc0ff', rimAmt: s * 0.8 * (1 - sm(3.0, 3.6, t)), scanCol: '#9fc0ff' }); });
      fx.flash(TF, 0.25, '#fff2dc', 0.15); fx.shake(TF, 0.25, 0.03); fx.flash(TS, 0.3, '#dfe8ff', 0.15); fx.shake(TS, 0.5, 0.05);
      fx.ring({ t0: TF, dur: 0.9, r: [0.3, 6], width: [0.5, 0.05], normal: 'cam', pos: [0, 1.45, -1.0], intensity: 1.0, ramp: [[0, '#fff'], [1, '#7aa0ff']] });
      fx.ring({ t0: TF, dur: 0.8, r: [0.3, 5], width: [0.4, 0.05], normal: 'up', intensity: 1.0, ramp: [[0, '#fff'], [1, '#7aa0ff']] });
      fx.ring({ t0: TS, dur: 0.8, r: [0.5, 5.5], width: [0.4, 0.05], normal: 'cam', pos: [0, 1.45, -1.0], intensity: 1.2, ramp: [[0, '#fff'], [1, '#9fc0ff']] });
      fx.emitter({ count: 120, kind: 'shard', blend: 'normal', lit: 1, shape: 'disc', radius: 1.0, pos: [0, 1.45, -1.0], rot3: [Math.PI / 2, 0, 0], dir: [0, 0, 1], spread: 1.1, radial: 0.6, speed: [0.6, 3.6], life: [1.0, 1.4], size: [0.16, 0.1], gravity: [0, -6, 0], bounce: 0.3, rot: 6, ramp: [[0, '#a8c4ff'], [1, '#7a9cd8', 1]], delay: TS });
      fx.emitter({ count: 70, kind: 'glint', shape: 'disc', radius: 1.0, pos: [0, 1.45, -1.0], rot3: [Math.PI / 2, 0, 0], size: [0.25, 0.05], life: [0.3, 0.9], ramp: [[0, '#fff'], [1, '#8ab0ff', 0]], intensity: 2.2, delay: TS, emit: 0.3, speed: [0, 0.4] });
      fx.emitter({ count: 120, kind: 'soft', shape: 'ring', radius: 1.0, radiusIn: 0.4, pos: [0, 1.45, -1.0], rot3: [Math.PI / 2, 0, 0], radial: 1, speed: [0.3, 1.2], life: [1.0, 1.8], size: [0.04, 0.01], ramp: [[0, '#fff'], [1, '#7aa0ff', 0]], intensity: 1.6, delay: TS, emit: 0.2, drag: 1, gravity: [0, -0.4, 0] });
      fx.emitter({ count: 50, kind: 'soft', shape: 'sphere', radius: 0.8, pos: [0, 1.2, 0], speed: [0, 0.1], life: [1.2, 1.8], size: [0.03, 0.008], ramp: [[0, '#cfe0ff'], [1, '#7aa0ff', 0]], intensity: 2, delay: TF, emit: 1.2, turb: [0.1, 1], drag: 2 }); // anchor-ok
      fx.light({ color: '#9fc0ff', intensity: 50, pos: [0.5, 1.4, 0.8], range: 9, env: (t) => (t > TF ? 1 : 0.2) * (t > TS ? 1.5 : 1), t0: 0.1, dur: 3.5, fade: [0.2, 0.6] });
    } },
];
