import * as THREE from 'three';
import { cone, ringSheet } from '../core/meshes.js';
import { ENV } from '../core/feel.js';

/* ---------- shared helpers ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const back = (k) => { const c = 2.2; k = clamp(k) - 1; return 1 + (c + 1) * k * k * k + c * k * k; }; // ease-out-back
const TAU = Math.PI * 2;

const iceMat = (o = {}) => new THREE.MeshPhysicalMaterial({
  color: '#a9ddff', roughness: 0.08, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.04, transparent: true, opacity: 0.84,
  emissive: '#2a78cc', emissiveIntensity: 0.55, flatShading: true, envMapIntensity: 1.8, side: THREE.DoubleSide, ...o,
});
/** hexagonal crystal: lathe profile with 6 segments => flat facets. base at y=0, tip at y=h */
const crystalGeo = (r, h, tipFrac = 0.28) => {
  const pts = [[0, -r * 0.05], [r * 0.78, 0], [r, h * (1 - tipFrac) * 0.15], [r * 0.92, h * (1 - tipFrac)], [0, h]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 6);
};
/** double-terminated gem */
const gemGeo = (r, h) => new THREE.LatheGeometry([[0, -h * 0.5], [r * 0.9, -h * 0.18], [r, h * 0.12], [r * 0.75, h * 0.3], [0, h * 0.5]].map(([x, y]) => new THREE.Vector2(x, y)), 6);
const spikeGeo = (r, h) => new THREE.LatheGeometry([[0, -0.04], [r, 0], [r * 0.62, h * 0.4], [r * 0.26, h * 0.75], [0, h]].map(([x, y]) => new THREE.Vector2(x, y)), 5);
const chunkGeo = (s, rng) => { const g = new THREE.IcosahedronGeometry(s, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * (0.7 + rng() * 0.6), p.getY(i) * (0.5 + rng() * 0.8), p.getZ(i) * (0.7 + rng() * 0.6)); g.computeVertexNormals(); return g; };

const COLD = '#8fcfff';
const mistRamp = [[0, '#dff2ff', 0], [0.2, '#b7d8f0', 0.34], [0.65, '#7fa6c8', 0.2], [1, '#4a6a8c', 0]];
const flakeRamp = [[0, '#ffffff', 0], [0.12, '#eaf6ff', 1], [0.8, '#a8d4ff', 0.8], [1, '#5a9ae0', 0]];
const glintRamp = [[0, '#ffffff', 0], [0.2, '#ffffff', 1], [1, '#9ad2ff', 0]];
const iceBurstRamp = [[0, '#f4fbff', 1], [0.4, '#b4dcff', 0.9], [1, '#4c8ee0', 0]];

/* ================================================================= */
export default [
  /* ------------------------------------------------ blizzard vortex */
  { id: 'ice/blizzard-vortex', name: 'Blizzard vortex', category: 'ice', loop: true, duration: 2, stage: { sky: 'night', bloom: 0.4, view: { pos: [3.4, 2.2, 4.4], target: [0, 1.3, 0], fov: 42 } },
    build(fx) {
      fx.decal({ kind: 'frost', r: [1.9, 1.9], cells: 6, intensity: 1.0, alpha: 0.85 });
      fx.decal({ kind: 'glow', r: [1.6, 1.6], ramp: [[0, '#000'], [0.5, '#143a70'], [1, '#6fb0ff']], intensity: 0.6, alpha: 0.7, y: 0.01 });
      fx.light({ color: '#86c4ff', intensity: 26, pos: [0, 1.5, 0], range: 11, flicker: 0.12 });
      fx.emitter({ count: 30, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.4, dir: [0, 1, 0], spread: 0.55, radial: 0.55, speed: [0.9, 1.7], life: [1.5, 2], size: [0.7, 1.9], swirl: 2.4, ramp: mistRamp, lit: 1, turb: [0.25, 0.8], pos: [0, 0.1, 0], order: -1 });
      fx.emitter({ count: 120, kind: 'flake', shape: 'disc', radius: 0.45, dir: [0, 1, 0], spread: 0.5, radial: 0.55, speed: [1.2, 2.8], life: [1.4, 2], size: [0.09, 0.06], swirl: 3.1, ramp: flakeRamp, intensity: 1.4, turb: [0.25, 1.2], rot: 3, pos: [0, 0.05, 0] });
      fx.emitter({ count: 50, kind: 'spark', shape: 'ring', radius: 0.9, radiusIn: 0.35, dir: [0, 1, 0], spread: 0.35, radial: 0.4, speed: [1, 2.6], life: [1.0, 1.7], size: [0.5, 0.25], stretch: 0.6, swirl: 4, ramp: [[0, '#ffffff', 0], [0.3, '#d6eeff', 1], [1, '#7ab8ff', 0]], intensity: 0.9, pos: [0, 0.1, 0] });
      fx.emitter({ count: 14, kind: 'glint', shape: 'sphere', radius: 0.9, dir: [0, 1, 0], spread: 1, speed: [0.1, 0.4], life: [0.6, 1.2], size: [0.2, 0.05], ramp: glintRamp, intensity: 2.5, swirl: 2, pos: [0, 1.4, 0] });
    } },

  /* ------------------------------------------------ freeze */
  { id: 'ice/freeze', name: 'Freeze', category: 'ice', loop: false, duration: 4, body: true, stage: { sky: 'night', bloom: 0.35, view: { pos: [3.4, 1.4, 3.8], target: [0, 0.9, 0], fov: 40 } },
    build(fx) {
      const mat = iceMat(); const g = new THREE.Group();
      const seeds = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + fx.rng() * 0.4, r = 0.4 + fx.rng() * 0.25, h = 0.6 + fx.rng() * 0.8; const c = new THREE.Mesh(crystalGeo(0.08 + fx.rng() * 0.05, h), mat); c.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); c.rotation.set(Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35); g.add(c); seeds.push(0.15 + fx.rng() * 0.5); }
      for (let i = 0; i < 4; i++) { const a = fx.rng() * TAU; const c = new THREE.Mesh(crystalGeo(0.05, 0.4), mat); c.position.set(Math.cos(a) * 0.3, 1.2 + fx.rng() * 0.4, Math.sin(a) * 0.3); c.rotation.set(Math.sin(a) * 1.0, 0, -Math.cos(a) * 1.0); g.add(c); seeds.push(0.4 + fx.rng() * 0.4); }
      fx.mesh(g, (t, pr, f, w, obj) => { obj.children.forEach((c, i) => { const s = seeds[i]; const k = back((t - s) / 0.45) * (1 - sm(2.9 + (i % 4) * 0.1, 3.6, t)); c.scale.setScalar(Math.max(1e-3, k)); }); });
      fx.decal({ kind: 'frost', t0: 0.1, dur: 3.9, r: [1.8, 1.8], cells: 6, reveal: 0.9, fade: [0.2, 1.0], intensity: 1.1, alpha: 0.9 });
      fx.light({ color: '#7fc2ff', intensity: 30, pos: [0.6, 1.4, 1.0], range: 9, env: (t) => 0.4 + 0.6 * sm(0.1, 0.9, t) * (1 - 0.6 * sm(2.9, 3.8, t)) });
      fx.flash(0.85, 0.3, '#cfeaff', 0.35);
      fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.6, dir: [0, 1, 0], spread: 0.7, radial: 0.7, speed: [0.3, 0.9], life: [1.2, 2], size: [0.6, 1.5], ramp: mistRamp, lit: 1, delay: 0.1, emit: 0.8, pos: [0, 0.1, 0], order: -1 });
      fx.emitter({ count: 70, kind: 'shard', shape: 'sphere', radius: 0.35, dir: [0, 1, 0], spread: 1.6, radial: 0.8, speed: [1.2, 3.5], life: [0.6, 1.3], size: [0.07, 0.03], gravity: [0, -6, 0], ramp: iceBurstRamp, intensity: 1.2, delay: 0.8, pos: [0, 0.9, 0], rot: 6 });
      fx.emitter({ count: 22, kind: 'glint', shape: 'sphere', radius: 0.5, dir: [0, 1, 0], spread: 1, speed: [0, 0.2], life: [0.5, 1.0], size: [0.22, 0.05], ramp: glintRamp, intensity: 3, delay: 0.9, emit: 1.9, pos: [0, 0.95, 0] });
      fx.emitter({ count: 30, kind: 'drop', shape: 'sphere', radius: 0.3, dir: [0, -1, 0], spread: 0.6, speed: [0.2, 1], life: [0.5, 0.9], gravity: [0, -9.8, 0], size: [0.035, 0.02], ramp: [[0, '#cfeaff', 0.9], [1, '#7ab6ff', 0]], intensity: 1.2, delay: 2.9, emit: 0.8, pos: [0, 1.1, 0], bounce: 0.1 });
      fx.emitter({ count: 14, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.3, dir: [0, 1, 0], spread: 0.5, speed: [0.4, 0.9], life: [1, 1.6], size: [0.5, 1.2], ramp: mistRamp, lit: 1, delay: 2.9, emit: 0.7, pos: [0, 0.5, 0], order: -1 });
      fx.on((t) => {
        const fr = sm(0.05, 0.95, t) * (1 - sm(2.9, 3.8, t));
        fx.body.set({ frost: fr, tint: '#7fc4ff', tintAmt: fr * 0.55, rim: '#bfe8ff', rimAmt: fr * 1.1, emit: new THREE.Color(0.02, 0.07, 0.14).multiplyScalar(fr) });
      });
    } },

  /* ------------------------------------------------ frost breath */
  { id: 'ice/frost-breath', name: 'Frost breath', category: 'ice', loop: true, duration: 1.2, body: true, stage: { sky: 'night', bloom: 0.4, view: { pos: [1.6, 1.4, 3.6], target: [1.3, 1.2, 0], fov: 40 } },
    build(fx) {
      const mouth = [0.14, 1.52, 0];
      fx.light({ color: '#8fd0ff', intensity: 20, pos: [1.4, 1.3, 0.4], range: 8, flicker: 0.15 });
      fx.decal({ kind: 'frost', pos: [2.4, 0.004, 0], r: [1.4, 1.4], cells: 6, intensity: 0.9, alpha: 0.65 });
      fx.emitter({ count: 46, kind: 'smoke', blend: 'normal', shape: 'point', pos: mouth, dir: [1, -0.04, 0], spread: 0.2, speed: [1.8, 3.4], drag: 0.7, life: [0.8, 1.2], size: [0.2, 1.3], ramp: [[0, '#eef8ff', 0], [0.12, '#d3ebff', 0.4], [0.6, '#9cc2e6', 0.22], [1, '#6a8fb5', 0]], lit: 1, turb: [0.25, 1.4], gravity: [0, -0.15, 0], order: -1 });
      fx.emitter({ count: 28, kind: 'soft', shape: 'point', pos: mouth, dir: [1, -0.03, 0], spread: 0.16, speed: [2, 3.6], drag: 0.7, life: [0.5, 1.0], size: [0.3, 0.9], ramp: [[0, '#ffffff', 0.5], [0.4, '#8cd0ff', 0.5], [1, '#2a68c0', 0]], intensity: 0.35, turb: [0.2, 1.4] });
      fx.emitter({ count: 70, kind: 'flake', shape: 'point', pos: mouth, dir: [1, 0, 0], spread: 0.3, speed: [2, 4.5], drag: 0.6, life: [0.6, 1.2], size: [0.06, 0.04], ramp: flakeRamp, intensity: 1.5, rot: 5, turb: [0.15, 2], gravity: [0, -0.4, 0] });
      fx.emitter({ count: 14, kind: 'glint', shape: 'point', pos: [0.5, 1.5, 0], dir: [1, 0, 0], spread: 0.3, speed: [1.5, 3.2], drag: 0.5, life: [0.4, 0.9], size: [0.18, 0.04], ramp: glintRamp, intensity: 3, turb: [0.15, 2] });
    } },

  /* ------------------------------------------------ frost nova */
  { id: 'ice/frost-nova', name: 'Frost nova', category: 'ice', loop: false, duration: 3.4, body: true, stage: { sky: 'night', bloom: 0.45, view: { pos: [4.2, 3.0, 5.2], target: [0, 0.7, 0], fov: 44 } },
    build(fx) {
      const IMP = 0.35, SPK = 8, spikeMat = () => new THREE.MeshStandardMaterial({ color: '#cfe6ff', roughness: 0.15, metalness: 0, emissive: '#3a6a9a', emissiveIntensity: 0.4 });
      // anticipation: cold mist gathers, frost decal starts
      fx.emitter({ count: 30, kind: 'smoke', blend: 'normal', lit: 1, shape: 'ring', radius: 1.4, radiusIn: 0.4, pos: [0, 0.15, 0], dir: [0, 0.3, 0], spread: 0.4, radial: -0.5, speed: [0.8, 2], life: [1.6, 2.2], size: [0.6, 1.4], drag: 0.9, ramp: [[0, '#b8d0e0', 0], [0.2, '#b8d0e0', 0.34], [1, '#4a6a8c', 0]], emit: 0.3, order: -1, turb: [0.3, 0.7] });
      fx.decal({ kind: 'frost', t0: 0, dur: 3.0, r: [3.2, 3.2], cells: 7, reveal: 0.3, fade: [0.15, 1.1], intensity: 1.0, ramp: [[0, '#0a1a2a'], [0.5, '#8fcfff'], [1, '#eaf6ff']] });
      // impact at IMP: directional push, shock ring, spikes, cold flash
      fx.impact({ t: IMP, strength: 0.7, dir: [0, -1, 0], pos: [0, 0, 0] });
      const sh = fx.erode({ geo: ringSheet({ r0: 0.6, r1: 1 }), erode: [0, 1], scroll: [1, 0], blend: 'add', intensity: 1, ramp: [[0, '#cfe6ff'], [1, '#ffffff']], t0: IMP, dur: 0.6 });
      fx.on((t) => { const k = Math.max(0, (t - IMP) / 0.6), s = 0.3 + 4 * (1 - Math.exp(-k * 6)); sh.obj.scale.set(s, 1, s); }); // fast -> slow expansion
      for (let i = 0; i < SPK; i++) {
        const a = (i / SPK) * Math.PI * 2, th = 0.35, sp = new THREE.Mesh(cone({ r0: 0.18, r1: 0, h: 0.9 }), spikeMat());
        sp.position.set(Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1); sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(Math.cos(a) * Math.sin(th), Math.cos(th), Math.sin(a) * Math.sin(th)));
        fx.mesh(sp, (t, pr, f, w, obj) => { obj.scale.set(1, Math.max(1e-3, sm(IMP, IMP + 0.2, t)), 1); }, { t0: IMP, dur: 1.4 }); // erupt 0.2 s; hidden at 1.75 (shatter)
      }
      fx.light({ color: '#cfe6ff', intensity: 30, pos: [0, 0.6, 0], range: 6, t0: IMP, dur: 0.4, fade: [0, 0.2], env: (t) => 4 * ENV.impact(t - IMP, 6) }); // 2-frame cold flash, peak 120
      fx.debris({ count: 24, t0: 1.75, pos: [0, 0.5, 0], color: '#d8ecff', speed: [2, 4], spread: 1, size: [0.04, 0.09], life: 1.2, bounce: 0.2 }); // spike shards
      fx.on((t) => fx.body.set({ rim: '#9fdcff', rimAmt: Math.exp(-Math.max(0, t - IMP) * 1.6) * sm(0, 0.3, t) * 0.8 }));
    } },

  /* ------------------------------------------------ ice crystal */
  { id: 'ice/ice-crystal', name: 'Ice crystal', category: 'ice', loop: true, duration: 3, stage: { sky: 'night', bloom: 0.45, view: { pos: [2.6, 1.7, 3.4], target: [0, 1.2, 0], fov: 38 } },
    build(fx) {
      const mat = iceMat({ opacity: 0.88 }), g = new THREE.Group(), core = new THREE.Group();
      core.add(new THREE.Mesh(gemGeo(0.3, 1.5), mat));
      const sat = [[0.5, 0.2, 0.2, 0.7], [-0.45, -0.1, 0.3, 0.55], [0.15, -0.3, -0.5, 0.6], [-0.25, 0.3, -0.45, 0.45]];
      sat.forEach(([x, y, z, h], i) => { const c = new THREE.Mesh(gemGeo(0.11, h), mat); c.position.set(x * 0.9, y, z * 0.9); c.rotation.set(z * 1.2, 0, -x * 1.4); c.userData.ph = i; g.add(c); });
      g.add(core); g.rotation.z = 0.18;
      const inner = new THREE.PointLight('#6fc0ff', 1.2, 4, 2); g.add(inner);
      fx.mesh(g, (t, pr, f, w, obj, tAbs) => { const a = TAU * t / 3; obj.rotation.y = a; obj.position.y = 1.25 + 0.08 * Math.sin(a); inner.intensity = 1.2 + 0.5 * Math.sin(a * 2); obj.children.forEach((c) => { if (c.userData.ph !== undefined) c.rotation.y = a * -2; }); }, { dur: 99 });
      fx.orb({ kind: 'energy', r: [0.28, 0.28], pos: [0, 1.25, 0], intensity: 0.55, noise: 2, scroll: 0.8, disp: 0.3, ramp: [[0, '#0a3a8a'], [0.6, '#6fc4ff'], [1, '#ffffff']], pulse: [0.12, TAU / 3 * 2], alpha: 0.7 });
      fx.decal({ kind: 'glow', r: [1.5, 1.5], ramp: [[0, '#000'], [0.4, '#103a80'], [1, '#6fc0ff']], intensity: 0.8, alpha: 0.7, y: 0.01 });
      fx.decal({ kind: 'frost', r: [1.2, 1.2], cells: 5, intensity: 0.9, alpha: 0.7 });
      fx.light({ color: '#7cc4ff', intensity: 28, pos: [0, 1.4, 0.2], range: 9, env: (t) => 0.85 + 0.15 * Math.sin(TAU * t / 3 * 2) });
      fx.emitter({ count: 22, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.7, dir: [0, 1, 0], spread: 0.3, radial: 0.4, speed: [0.05, 0.25], life: [2.2, 3], size: [0.5, 1.2], swirl: 0.3, ramp: mistRamp, lit: 1, pos: [0, 0.05, 0], order: -1, floorFade: 0.1 });
      fx.emitter({ count: 24, kind: 'glint', shape: 'sphere', radius: 0.55, dir: [0, 1, 0], spread: 1.2, speed: [0, 0.15], life: [0.8, 1.5], size: [0.2, 0.05], ramp: glintRamp, intensity: 3, pos: [0, 1.25, 0] });
      fx.emitter({ count: 40, kind: 'flake', shape: 'sphere', radius: 1.1, radiusIn: 0.6, dir: [0, -1, 0], spread: 0.8, speed: [0.1, 0.4], life: [2, 3], size: [0.05, 0.04], swirl: 0.8, ramp: flakeRamp, intensity: 1.2, rot: 2, pos: [0, 1.4, 0], turb: [0.2, 0.5] });
    } },

  /* ------------------------------------------------ ice lance */
  { id: 'ice/ice-lance', name: 'Ice lance', category: 'ice', loop: true, duration: 0.8, stage: { sky: 'night', bloom: 0.45, view: { pos: [0.3, 1.5, 4.6], target: [0, 1.15, 0], fov: 42 } },
    build(fx) {
      const X = (t) => -2.4 + 4.8 * t / 0.8, Y = 1.15;
      const mat = iceMat({ opacity: 0.92, emissiveIntensity: 0.9 }); const lance = new THREE.Group();
      const body = new THREE.Mesh(new THREE.LatheGeometry([[0, -0.3], [0.05, -0.2], [0.1, 0.0], [0.11, 0.35], [0.0, 1.1]].map(([x, y]) => new THREE.Vector2(x, y)), 6), mat); body.rotation.z = -Math.PI / 2; lance.add(body);
      for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.4, 4), mat); f.position.set(-0.2 - i * 0.04, 0, 0); f.rotation.z = Math.PI / 2; f.rotation.x = i * 1.05; f.position.y = Math.sin(i * 2.1) * 0.12; f.position.z = Math.cos(i * 2.1) * 0.12; lance.add(f); }
      const pl = new THREE.PointLight('#8fd8ff', 1.5, 3, 2); lance.add(pl);
      fx.mesh(lance, (t, pr, f, w, obj, tAbs) => { obj.position.set(X(t), Y, 0); obj.rotation.x = tAbs * 6; const k = sm(0, 0.08, t) * (1 - sm(0.7, 0.8, t)); obj.scale.setScalar(Math.max(1e-3, k)); }, { dur: 99 });
      fx.trail({ path: (t) => [X(t), Y, 0], len: 0.25, width: 0.06, n: 24, intensity: 1.1, tail: 1, ramp: [[0, '#ffffff'], [0.35, '#9fdcff'], [1, '#2a68d0']] });
      fx.light({ color: '#8fd0ff', intensity: 18, pos: [0, 1.3, 0.4], range: 8 });
      fx.on((t) => { const L = fx.parts.find((p) => p.l); if (L) L.l.position.set(X(t), 1.4, 0.5); });
      fx.emitter({ count: 70, kind: 'flake', shape: 'line', shapeSize: [2.4, 0, 0], pos: [0, Y, 0], dir: [0, 1, 0], spread: 1.5, speed: [0.1, 0.8], life: [0.3, 0.6], size: [0.06, 0.03], ramp: flakeRamp, intensity: 1.5, gravity: [0, -1.5, 0], rot: 4 });
      fx.emitter({ count: 50, kind: 'shard', shape: 'line', shapeSize: [2.4, 0, 0], pos: [0, Y, 0], dir: [0, 1, 0], spread: 1.6, speed: [0.3, 1.2], life: [0.25, 0.55], size: [0.05, 0.02], ramp: iceBurstRamp, intensity: 1.3, gravity: [0, -3, 0], rot: 6 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, Y, 0], dir: [0, 1, 0], speed: [0, 0], life: [0.8, 0.8], size: [0.4, 0.4], ramp: [[0, '#ffffff', 0.6], [1, '#ffffff', 0.6]], intensity: 1.2, follow: (m, tAbs, t) => m.position.set(X(t) + 0.55, Y, 0.05) });
      fx.emitter({ count: 20, kind: 'smoke', blend: 'normal', shape: 'line', shapeSize: [2.4, 0, 0], pos: [0, Y, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.05, 0.3], life: [0.5, 0.8], size: [0.3, 0.7], ramp: mistRamp, lit: 1, order: -1 });
    } },

  /* ------------------------------------------------ ice shatter */
  { id: 'ice/ice-shatter', name: 'Ice shatter', category: 'ice', loop: false, duration: 2.8, stage: { sky: 'dusk', bloom: 0.4, view: { pos: [3.6, 1.7, 4.4], target: [0, 0.8, 0], fov: 42 } },
    build(fx) {
      const T = 1.15; const mat = iceMat({ opacity: 0.9 });
      const blk = new THREE.Group(); const box = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.95), mat); box.position.y = 0.675; blk.add(box);
      const pts = []; for (let i = 0; i < 16; i++) { let x = (fx.rng() - 0.5) * 0.8, y = 0.2 + fx.rng() * 0.95, z = (fx.rng() - 0.5) * 0.8; for (let k = 0; k < 3; k++) { const nx = x + (fx.rng() - 0.5) * 0.35, ny = y + (fx.rng() - 0.5) * 0.35, nz = z + (fx.rng() - 0.5) * 0.35; pts.push(x, y, z, nx, ny, nz); x = nx; y = ny; z = nz; } }
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); const lm = new THREE.LineBasicMaterial({ color: '#e8f6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }); const lines = new THREE.LineSegments(lg, lm); blk.add(lines);
      const ig = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.5, 0.3), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.06, depthWrite: false })); ig.position.y = 0.7; blk.add(ig);
      fx.mesh(blk, (t, pr, f, w, obj) => { const pre = t < T; obj.visible = pre; const cr = sm(0.1, T - 0.05, t); lm.opacity = cr * 0.9; const j = pre ? cr * cr * 0.012 : 0; obj.position.set(Math.sin(t * 91) * j, 0, Math.cos(t * 77) * j); mat.emissiveIntensity = 0.55 + cr * 0.5; }, { dur: 99 });
      const ch = new THREE.Group(); const C = []; for (let i = 0; i < 16; i++) { const s = 0.07 + fx.rng() * 0.12; const m = new THREE.Mesh(chunkGeo(s, fx.rng), mat); const a = fx.rng() * TAU; const sp = 1.2 + fx.rng() * 3; C.push({ m, s, p0: [Math.cos(a) * 0.3 * fx.rng(), 0.3 + fx.rng() * 1.0, Math.sin(a) * 0.3 * fx.rng()], v: [Math.cos(a) * sp, 1.5 + fx.rng() * 3, Math.sin(a) * sp], w: [(fx.rng() - 0.5) * 12, (fx.rng() - 0.5) * 12, (fx.rng() - 0.5) * 12], life: 2.0 + fx.rng() * 0.4, p: [0, 0, 0], vv: [0, 0, 0] }); ch.add(m); }
      fx.mesh(ch, (t) => { const tt = t - T; for (const c of C) { if (tt < 0) { c.m.visible = false; continue; } c.m.visible = true; let [x, y, z] = c.p0, [vx, vy, vz] = c.v; const n = Math.min(240, Math.floor(tt * 60)); for (let i = 0; i < n; i++) { vy -= 9.8 / 60; x += vx / 60; y += vy / 60; z += vz / 60; if (y < c.s * 0.6) { y = c.s * 0.6; vy = Math.abs(vy) * 0.3; vx *= 0.75; vz *= 0.75; if (vy < 0.3) vy = 0; } } c.m.position.set(x, y, z); const damp = Math.exp(-tt * 1.5); c.m.rotation.set(c.w[0] * (1 - damp) / 1.5, c.w[1] * (1 - damp) / 1.5, c.w[2] * (1 - damp) / 1.5); c.m.scale.setScalar(Math.max(1e-3, 1 - sm(1.2, 1.65, tt) * (c.life - 1.9) * 0 - sm(1.2, 1.65, tt))); } }, { dur: 99 });
      fx.flash(T, 0.25, '#e8f6ff', 0.6); fx.shake(T, 0.5, 0.07);
      fx.light({ color: '#9ad4ff', intensity: 160, pos: [0, 1.0, 0.4], range: 14, env: (t) => (t < T ? 0.15 + 0.2 * sm(0.1, T, t) : 0.2 + 0.8 * Math.exp(-(t - T) * 3)), norm: 60 });
      fx.ring({ t0: T, dur: 0.7, r: [0.3, 3.2], width: [0.3, 0.07], normal: 'up', intensity: 1.2, ramp: [[0, '#fff'], [1, '#6fb4ff']] });
      fx.decal({ kind: 'frost', t0: T, dur: 1.65, r: [1.9, 1.9], cells: 6, reveal: 0.35, fade: [0.1, 1.0], intensity: 1.1, alpha: 0.9 });
      fx.emitter({ count: 14, kind: 'glint', shape: 'box', shapeSize: [0.4, 0.6, 0.4], dir: [0, 1, 0], spread: 1.5, speed: [0, 0.1], life: [0.2, 0.5], size: [0.25, 0.05], ramp: glintRamp, intensity: 3, delay: 0.5, emit: 0.6, pos: [0, 0.7, 0] });
      fx.emitter({ count: 120, kind: 'shard', shape: 'box', shapeSize: [0.4, 0.6, 0.4], dir: [0, 1, 0], spread: 1.4, radial: 0.7, speed: [2, 7], life: [0.7, 1.5], size: [0.08, 0.03], gravity: [0, -9, 0], bounce: 0.3, ramp: iceBurstRamp, intensity: 1.4, delay: T, rot: 7, pos: [0, 0.65, 0] });
      fx.emitter({ count: 50, kind: 'glint', shape: 'sphere', radius: 0.5, dir: [0, 1, 0], spread: 1.5, radial: 1, speed: [1, 4], life: [0.3, 0.8], size: [0.2, 0.04], ramp: glintRamp, intensity: 3.5, delay: T, pos: [0, 0.65, 0] });
      fx.emitter({ count: 50, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.4, dir: [0, 1, 0], spread: 1.2, radial: 0.8, speed: [0.8, 2.6], drag: 1, life: [1.2, 2.2], size: [0.6, 1.8], ramp: mistRamp, lit: 1, delay: T, emit: 0.25, pos: [0, 0.6, 0], order: -1, turb: [0.3, 0.7] });
      fx.emitter({ count: 24, kind: 'drop', shape: 'disc', radius: 0.9, dir: [0, 0.2, 0], spread: 0.4, speed: [0, 0.3], life: [0.5, 0.9], gravity: [0, -3, 0], size: [0.03, 0.02], ramp: [[0, '#cfeaff', 0.8], [1, '#7ab6ff', 0]], intensity: 1.1, delay: 2.0, emit: 0.7, pos: [0, 0.05, 0] });
    } },

  /* ------------------------------------------------ ice spikes */
  { id: 'ice/ice-spikes', name: 'Ice spikes', category: 'ice', loop: false, duration: 3, stage: { sky: 'night', bloom: 0.4, view: { pos: [2.4, 1.5, 5.4], target: [2.3, 0.55, 0], fov: 42 } },
    build(fx) {
      const mat = iceMat({ opacity: 0.9, emissiveIntensity: 0.65 }); const g = new THREE.Group(); const S = [];
      const mk = (x, z, h, r, t0, lean) => { const m = new THREE.Mesh(spikeGeo(r, h), mat); m.position.set(x, 0, z); m.rotation.set(lean[0], 0, lean[1]); g.add(m); S.push({ m, t0, end: 2.25 + fx.rng() * 0.5 }); };
      const N = 13; for (let i = 0; i < N; i++) {
        const x = 0.4 + i * 0.32, z = (fx.rng() - 0.5) * 0.45, h = (0.55 + fx.rng() * 0.4) * (0.7 + 0.5 * (i / N)), r = 0.1 + fx.rng() * 0.05, t0 = 0.1 + i * 0.07;
        mk(x, z, h, r, t0, [(fx.rng() - 0.5) * 0.3, (fx.rng() - 0.5) * 0.3 - 0.08]);
        mk(x + (fx.rng() - 0.5) * 0.25, z + 0.2 * (fx.rng() > 0.5 ? 1 : -1), h * 0.55, r * 0.7, t0 + 0.04, [(fx.rng() - 0.5) * 0.7, (fx.rng() - 0.5) * 0.7]);
      }
      fx.mesh(g, (t) => S.forEach((s) => s.m.scale.set(1, Math.max(1e-3, back((t - s.t0) / 0.22) * (1 - sm(s.end, s.end + 0.6, t))), 1)));
      fx.ribbon({ t0: 0.05, dur: 0.9, fade: [0, 0.6], points: [[0.1, 0.03, 0], [4.6, 0.03, 0]], n: 8, width: 0.16, sweep: [0, 1.3], ease: 'out', tail: 0.5, intensity: 2.2, core: 4, ramp: [[0, '#ffffff'], [0.3, '#9fdcff'], [1, '#2a68c0']] });
      fx.decal({ kind: 'frost', pos: [1.3, 0.004, 0], t0: 0.1, dur: 2.9, r: [1.6, 1.6], cells: 6, reveal: 0.6, fade: [0.1, 1.0], intensity: 1.1, alpha: 0.9 });
      fx.decal({ kind: 'frost', pos: [3.4, 0.004, 0], t0: 0.45, dur: 2.55, r: [1.6, 1.6], cells: 6, reveal: 0.6, fade: [0.1, 1.0], intensity: 1.1, alpha: 0.9 });
      fx.light({ color: '#86c8ff', intensity: 40, pos: [2.4, 1.0, 1.0], range: 10, env: (t) => 0.35 + 0.65 * sm(0.1, 0.9, t) * (1 - 0.7 * sm(2.2, 3, t)) });
      fx.shake(0.2, 1.0, 0.015);
      fx.emitter({ count: 70, kind: 'shard', shape: 'line', shapeSize: [2.2, 0, 0], dir: [0, 1, 0], spread: 1.1, speed: [1.2, 4], life: [0.5, 1.1], size: [0.06, 0.025], gravity: [0, -8, 0], ramp: iceBurstRamp, intensity: 1.4, delay: 0.1, emit: 0.95, rot: 6, pos: [2.5, 0.1, 0] });
      fx.emitter({ count: 34, kind: 'smoke', blend: 'normal', shape: 'line', shapeSize: [2.2, 0, 0], dir: [0, 1, 0], spread: 0.8, radial: 0, speed: [0.3, 1.2], life: [1.2, 2.2], size: [0.5, 1.4], ramp: mistRamp, lit: 1, delay: 0.1, emit: 1.0, pos: [2.5, 0.1, 0.1], order: -1, turb: [0.2, 0.7] });
      fx.emitter({ count: 24, kind: 'glint', shape: 'line', shapeSize: [2.0, 0, 0], dir: [0, 1, 0], spread: 1, speed: [0, 0.2], life: [0.4, 0.9], size: [0.22, 0.05], ramp: glintRamp, intensity: 3, delay: 0.3, emit: 1.8, pos: [2.5, 0.5, 0] });
    } },

  /* ------------------------------------------------ icicle fall */
  { id: 'ice/icicle-fall', name: 'Icicle fall', category: 'ice', loop: false, duration: 2.6, stage: { sky: 'dusk', bloom: 0.4, view: { pos: [3.4, 1.9, 5.8], target: [0, 1.55, 0], fov: 46 } },
    build(fx) {
      const mat = iceMat({ opacity: 0.92 }), TS = 0.8, TH = TS + Math.sqrt(2 * 2.2 / 9.8); const H0 = 3.1, LEN = 0.95;
      const ledge = new THREE.Group(); const rock = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.28, 0.9), new THREE.MeshStandardMaterial({ color: '#3b4048', roughness: 0.95, flatShading: true })); rock.position.y = H0 + 0.14; ledge.add(rock);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.06, 0.95), iceMat({ opacity: 0.85 })); cap.position.y = H0 + 0.01; ledge.add(cap);
      [[-0.6, 0.45], [-0.3, 0.3], [0.35, 0.38], [0.65, 0.5], [0.9, 0.28]].forEach(([x, l]) => { const c = new THREE.Mesh(new THREE.ConeGeometry(0.05, l, 5), mat); c.rotation.x = Math.PI; c.position.set(x, H0 - l / 2, 0.05); ledge.add(c); });
      fx.mesh(ledge, null, { dur: 99 });
      const ic = new THREE.Mesh(new THREE.ConeGeometry(0.085, LEN, 6), mat); ic.rotation.x = Math.PI; const icg = new THREE.Group(); ic.position.y = -LEN / 2; icg.add(ic); icg.position.set(0, H0, 0.05);
      fx.mesh(icg, (t, pr, f, w, obj) => {
        const hit = t >= TH; obj.visible = !hit;
        if (t < TS) { const sh = sm(0.25, TS, t) * 0.03; obj.rotation.set(Math.sin(t * 70) * sh, 0, Math.sin(t * 53) * sh * 2); obj.position.set(0, H0, 0.05); }
        else { const d = t - TS; obj.position.set(0.05 * d, H0 - 4.9 * d * d, 0.05); obj.rotation.set(0.1 * d, 0, 0.5 * d); }
      }, { dur: 99 });
      const ch = new THREE.Group(); const C = []; for (let i = 0; i < 9; i++) { const s = 0.04 + fx.rng() * 0.07; const m = new THREE.Mesh(chunkGeo(s, fx.rng), mat); const a = fx.rng() * TAU, sp = 0.8 + fx.rng() * 2.2; C.push({ m, s, v: [Math.cos(a) * sp, 1.5 + fx.rng() * 2.5, Math.sin(a) * sp] }); ch.add(m); }
      fx.mesh(ch, (t) => { const tt = t - TH; for (const c of C) { if (tt < 0) { c.m.visible = false; continue; } c.m.visible = true; let x = 0.05, y = 0.1, z = 0, vx = c.v[0], vy = c.v[1], vz = c.v[2]; const n = Math.min(160, Math.floor(tt * 60)); for (let i = 0; i < n; i++) { vy -= 9.8 / 60; x += vx / 60; y += vy / 60; z += vz / 60; if (y < c.s * 0.6) { y = c.s * 0.6; vy = Math.abs(vy) * 0.3; vx *= 0.7; vz *= 0.7; if (vy < 0.3) vy = 0; } } c.m.position.set(x, y, z); c.m.rotation.set(tt * 5, tt * 3, tt * 4); c.m.scale.setScalar(Math.max(1e-3, 1 - sm(0.9, 1.15, tt))); } }, { dur: 99 });
      fx.flash(TH, 0.18, '#e8f6ff', 0.4); fx.shake(TH, 0.3, 0.05);
      fx.light({ color: '#9ad4ff', intensity: 110, pos: [0, 0.8, 0.5], range: 10, env: (t) => (t < TH ? 0.08 : 0.15 + 0.85 * Math.exp(-(t - TH) * 4)), norm: 50 });
      fx.ring({ t0: TH, dur: 0.6, r: [0.1, 1.9], width: [0.22, 0.05], normal: 'up', intensity: 1.2, ramp: [[0, '#fff'], [1, '#6fb4ff']] });
      fx.decal({ kind: 'frost', t0: TH, dur: 2.6 - TH, r: [1.3, 1.3], cells: 6, reveal: 0.3, fade: [0.05, 0.6], intensity: 1.1, alpha: 0.9 });
      fx.emitter({ count: 8, kind: 'drop', shape: 'point', pos: [0, H0 - LEN, 0.05], dir: [0, -1, 0], spread: 0.05, speed: [0, 0.4], life: [0.5, 0.8], gravity: [0, -9.8, 0], size: [0.03, 0.02], ramp: [[0, '#e6f4ff', 0.9], [1, '#9ad0ff', 0]], intensity: 1.4, delay: 0.05, emit: TS - 0.1, t1: TS + 0.4 });
      fx.emitter({ count: 14, kind: 'glint', shape: 'point', pos: [0, H0 - 0.05, 0.1], dir: [0, 1, 0], spread: 1.5, speed: [0, 0.3], life: [0.15, 0.35], size: [0.18, 0.04], ramp: glintRamp, intensity: 3.5, delay: TS - 0.1, emit: 0.2 });
      fx.emitter({ count: 70, kind: 'shard', shape: 'point', pos: [0.05, 0.08, 0.05], dir: [0, 1, 0], spread: 1.3, speed: [1.5, 5], life: [0.6, 1.2], size: [0.06, 0.025], gravity: [0, -9, 0], bounce: 0.3, ramp: iceBurstRamp, intensity: 1.4, delay: TH, rot: 7 });
      fx.emitter({ count: 30, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.2, dir: [0, 0.5, 0], spread: 1, radial: 1, speed: [0.6, 1.8], drag: 1, life: [1, 1.6], size: [0.4, 1.3], ramp: mistRamp, lit: 1, delay: TH, emit: 0.15, pos: [0.05, 0.1, 0.05], order: -1 });
      fx.emitter({ count: 24, kind: 'glint', shape: 'sphere', radius: 0.15, dir: [0, 1, 0], spread: 1.5, radial: 1, speed: [1, 3], life: [0.3, 0.7], size: [0.2, 0.04], ramp: glintRamp, intensity: 3.5, delay: TH, pos: [0.05, 0.12, 0.05] });
    } },

  /* ------------------------------------------------ snowflake burst */
  { id: 'ice/snowflake-burst', name: 'Snowflake burst', category: 'ice', loop: false, duration: 3.2, stage: { sky: 'night', bloom: 0.45, view: { pos: [3.2, 2.0, 4.6], target: [0, 1.0, 0], fov: 44 } },
    build(fx) {
      fx.flash(0.0, 0.25, '#d8eeff', 0.35);
      fx.light({ color: '#8fd0ff', intensity: 120, pos: [0, 1.0, 0.3], range: 14, env: (t) => 0.2 + 0.8 * Math.exp(-t * 1.6), norm: 50 });
      fx.ring({ t0: 0, dur: 1.0, r: [0.2, 3.2], width: [0.4, 0.08], normal: 'up', intensity: 1.5, fill: 0.2, ramp: [[0, '#ffffff'], [0.4, '#a8dcff'], [1, '#2a68c0']] });
      fx.ring({ t0: 0.05, dur: 0.7, r: [0.2, 2.4], width: [0.25, 0.05], normal: 'cam', pos: [0, 1.0, 0], intensity: 1.1, ramp: [[0, '#fff'], [1, '#8cc8ff']] });
      fx.decal({ kind: 'frost', t0: 0.0, dur: 3.2, r: [2.9, 2.9], cells: 7, reveal: 0.8, fade: [0.1, 1.3], intensity: 1.1, alpha: 0.9 });
      fx.decal({ kind: 'rings', t0: 0.0, dur: 1.6, r: [2.6, 2.6], cells: 4, fade: [0.05, 1.2], intensity: 0.9, ramp: [[0, '#000'], [0.5, '#3a8ae0'], [1, '#e6f6ff']] });
      fx.emitter({ count: 110, kind: 'flake', shape: 'sphere', radius: 0.15, dir: [0, 1, 0], spread: 1.35, radial: 0.5, speed: [1.5, 4.2], drag: 1.5, gravity: [0, -0.4, 0], life: [2.0, 3.0], size: [0.12, 0.09], ramp: flakeRamp, intensity: 1.5, turb: [0.5, 0.8], rot: 3, pos: [0, 0.9, 0] });
      fx.emitter({ count: 8, kind: 'flake', shape: 'sphere', radius: 0.3, dir: [0, 1, 0], spread: 1.2, radial: 0.8, speed: [0.8, 2.0], drag: 1.2, gravity: [0, -0.25, 0], life: [2.2, 3], size: [0.55, 0.45], ramp: [[0, '#ffffff', 0], [0.12, '#ffffff', 0.7], [0.8, '#bfe4ff', 0.5], [1, '#6fb0ff', 0]], intensity: 1.2, turb: [0.3, 0.6], rot: 1.5, pos: [0, 1.0, 0] });
      fx.emitter({ count: 36, kind: 'glint', shape: 'sphere', radius: 0.9, dir: [0, 1, 0], spread: 1.5, radial: 1, speed: [0.5, 2.2], drag: 1.2, life: [0.5, 1.4], size: [0.22, 0.05], ramp: glintRamp, intensity: 3.5, emit: 1.0, pos: [0, 1.0, 0] });
      fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', shape: 'ring', radius: 0.5, radiusIn: 0.1, dir: [0, 0.3, 0], spread: 0.5, radial: 1, speed: [1.2, 2.6], drag: 0.9, life: [1.4, 2.4], size: [0.7, 1.8], ramp: mistRamp, lit: 1, emit: 0.3, pos: [0, 0.1, 0], order: -1 });
      fx.emitter({ count: 40, kind: 'soft', shape: 'sphere', radius: 0.8, dir: [0, 1, 0], spread: 1.4, speed: [0.2, 0.8], life: [1.5, 2.8], size: [0.1, 0.03], ramp: [[0, '#ffffff', 0], [0.2, '#bfe4ff', 0.8], [1, '#4c8ee0', 0]], intensity: 1.6, turb: [0.4, 0.5], delay: 0.2, emit: 1.0, pos: [0, 1.2, 0] });
    } },
];
