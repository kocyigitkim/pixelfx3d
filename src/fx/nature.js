import * as THREE from 'three';
import { NOISE } from '../core/glsl.js';

/* ---------------------------------------------------------------- helpers (local to this category) */
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const fr = (x) => x - Math.floor(x);
const eob = (x) => { x = cl(x); const c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const TAU = Math.PI * 2;

function tube(segs, rad, mat) {
  const nv = (segs + 1) * rad, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = [];
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad, c = a + rad, d = b + rad; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), ref = new THREE.Vector3();
  m.userData.set = (pts, rf) => {
    for (let i = 0; i <= segs; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(segs, i + 1)]; T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (T.lengthSq() < 1e-10) T.set(0, 1, 0); T.normalize();
      if (i === 0) { ref.set(0, 0, 1); if (Math.abs(T.z) > 0.9) ref.set(1, 0, 0); B.crossVectors(T, ref).normalize(); N.crossVectors(B, T); } else { B.crossVectors(T, N).normalize(); N.crossVectors(B, T).normalize(); }
      const r = rf(i / segs), p = pts[i];
      for (let j = 0; j < rad; j++) { const an = (j / rad) * TAU, c = Math.cos(an), s = Math.sin(an); const rx = N.x * c + B.x * s, ry = N.y * c + B.y * s, rz = N.z * c + B.z * s, k = (i * rad + j) * 3; pos[k] = p[0] + rx * r; pos[k + 1] = p[1] + ry * r; pos[k + 2] = p[2] + rz * r; nor[k] = rx; nor[k + 1] = ry; nor[k + 2] = rz; }
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
  };
  return m;
}
const mkPts = (n) => Array.from({ length: n + 1 }, () => [0, 0, 0]);
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function rockGeo(r, rng, amp = 0.28, detail = 2) { // noisy, faceted boulder
  const g = new THREE.IcosahedronGeometry(r, detail); const p = g.attributes.position, seed = rng() * 50, v = new THREE.Vector3();
  const f = (x, y, z) => { let n = 0, a = 1, s = 1.3; for (let o = 0; o < 3; o++) { n += a * (hash3(Math.floor(x * s + seed), Math.floor(y * s), Math.floor(z * s)) - 0.5); a *= 0.5; s *= 2; } return n; };
  const vm = new Map(); for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const key = v.x.toFixed(3) + v.y.toFixed(3) + v.z.toFixed(3); let k = vm.get(key); if (k === undefined) { const q = v.clone().normalize(); k = 1 + amp * 2 * (Math.sin(q.x * 3.1 + seed) * Math.sin(q.y * 2.7 + seed * 1.3) * Math.sin(q.z * 3.3) * 0.7 + f(q.x, q.y, q.z) * 0.8); vm.set(key, k); } p.setXYZ(i, v.x * k, v.y * k, v.z * k); }
  g.computeVertexNormals(); return g;
}
function spikeGeo(r, h, rng, sides = 6, jit = 0.25) {
  const g = new THREE.ConeGeometry(r, h, sides, 3, true).toNonIndexed(); const p = g.attributes.position, v = new THREE.Vector3(), seed = rng() * 9;
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const k = 1 + jit * (hash3(Math.round(v.x * 40), Math.round(v.y * 8), seed) - 0.5) * 2 * (1 - (v.y / h + 0.5)); p.setXYZ(i, v.x * k, v.y, v.z * k); }
  g.translate(0, h / 2, 0); g.computeVertexNormals(); return g;
}
const rockMat = (c = '#6a6258') => new THREE.MeshStandardMaterial({ color: c, roughness: 0.92, metalness: 0.02, flatShading: true });
const leafGeo = () => { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(0.35, 0.15, 0.4, 0.6, 0, 1); s.bezierCurveTo(-0.4, 0.6, -0.35, 0.15, 0, 0); return new THREE.ShapeGeometry(s, 10); };
const ADD = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };
const NORM = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor };
const _h = {};
function halo(color, size, hdr = 1.5) {
  if (!_h.tex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _h.tex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _h.tex, color: new THREE.Color(color).multiplyScalar(hdr), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.scale.setScalar(size); s.renderOrder = 30; s.frustumCulled = false; return s;
}
const DUST = (a = 0.5, c = '#7a6a56') => [[0, c, 0], [0.15, c, a], [1, '#4a4034', 0]];
const ROCKRAMP = (c = '#6c5a48') => [[0, c], [1, c, 1]];

export default [
  /* ===================================================================== acid splash */
  { id: 'nature/acid-splash', name: 'Acid splash', category: 'nature', loop: false, duration: 2.8, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [2.6, 1.9, 3.6], target: [0, 0.3, 0], fov: 38 } },
    build(fx) {
      const G = [[0, '#f4ffb0', 1], [0.3, '#b8ff20', 0.9], [1, '#2a7a08', 0.7]];
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 16), new THREE.MeshPhysicalMaterial({ color: '#b6ff2a', emissive: '#7ac010', emissiveIntensity: 0.8, roughness: 0.08, transmission: 0, clearcoat: 1 }));
      fx.mesh(bl, (t, pr, f, w, o) => { const u = cl(t / 0.32); o.position.set(0, 3.0 - u * u * 2.92, 0); o.scale.set(0.9 - 0.15 * u, 1.3 * (1 - 0.1 * u), 0.9 - 0.15 * u); o.visible = t < 0.32; }, { dur: 99 });
      fx.flash(0.32, 0.15, '#c8ff40', 0.3);
      fx.decal({ kind: 'scorch', t0: 0.32, dur: 2.48, r: [0.4, 1.15], fade: [0.1, 1.0], heat: [1, 0.3], growSpeed: 2, ramp: [[0, '#101a04'], [0.5, '#6ab010'], [1, '#d8ff50']] });
      fx.water({ r: 0.85, deep: '#183004', shallow: '#98d818', sky: '#b8e870', horizon: '#d8ff90', t0: 0.32, dur: 2.48, fade: [0.1, 1.0], y: 0.012, ripples: [{ t: 0.34, amp: 0.07 }, { t: 0.6, amp: 0.04 }, { t: 1.0, x: 0.2, z: 0.1, amp: 0.03 }], alpha: 0.9 });
      fx.ring({ t0: 0.32, dur: 0.6, r: [0.1, 1.9], width: [0.25, 0.05], normal: 'up', intensity: 1.2, fill: 0.2, ramp: [[0, '#f4ffc0'], [0.4, '#b8ff20'], [1, '#2a7a08']] });
      fx.orb({ t0: 0.32, dur: 0.28, r: [0.15, 0.75], ease: 'out', kind: 'water', pos: [0, 0.3, 0], noise: 3, scroll: 2.5, disp: 0.6, power: 2, intensity: 1, fade: [0, 0.2], ramp: [[0, '#2a5a08'], [0.5, '#98e020'], [1, '#f0ffa0']] });
      fx.emitter({ count: 110, kind: 'drop', shape: 'point', pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 1.25, speed: [1.5, 6], life: [0.5, 1.1], gravity: [0, -10, 0], size: [0.07, 0.04], ramp: G, intensity: 1.6, delay: 0.32, bounce: -1, aspect: 1.5, floorFade: 0.03 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'point', pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 1.4, speed: [2, 6], life: [0.4, 0.9], gravity: [0, -9, 0], size: [0.08, 0.02], stretch: 1.2, ramp: [[0, '#fff'], [0.3, '#c8ff40'], [1, '#2a7a08', 0]], intensity: 3, delay: 0.32, bounce: 0.25 });
      fx.emitter({ count: 22, kind: 'bubble', shape: 'disc', radius: 0.55, pos: [0, 0.03, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.05, 0.25], life: [0.6, 1.2], size: [0.06, 0.1], ramp: [[0, '#d8ff70', 0], [0.2, '#d8ff70', 1], [1, '#70c010', 0]], intensity: 1.2, delay: 0.5, emit: 1.6 });
      fx.emitter({ count: 46, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.5, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.35, speed: [0.3, 0.8], life: [1.2, 2.2], size: [0.25, 1.0], ramp: [[0, '#6a8a2a', 0], [0.2, '#8aa83a', 0.4], [1, '#3a4a1a', 0]], lit: 1, delay: 0.45, emit: 1.8, turb: [0.3, 0.8], gravity: [0, 0.3, 0], order: -1 });
      fx.light({ color: '#9aff20', intensity: 90, pos: [0, 0.6, 0.3], range: 8, t0: 0.3, dur: 2.5, fade: [0.02, 1.2], env: (t) => 1 });
    } },

  /* ===================================================================== boulder */
  { id: 'nature/boulder', name: 'Boulder', category: 'nature', loop: false, duration: 2.3, stage: { sky: 'dusk', bloom: 0.3, view: { pos: [2, 2.4, 7.5], target: [-0.6, 1.3, 0], fov: 42 } },
    build(fx) {
      const rk = new THREE.Mesh(rockGeo(0.6, fx.rng, 0.22), rockMat('#6e6458')); const TI = 0.95;
      fx.mesh(rk, (t, pr, f, w, o) => { const u = cl(t / TI); o.position.set(-4.2 + 4.4 * u, 0.5 + 3.4 * (1 - u * u), 0); o.rotation.set(t * 3.2, t * 1.4, t * 4.4); o.visible = t < TI; }, { dur: 99 });
      fx.emitter({ count: 30, kind: 'dust', blend: 'normal', shape: 'sphere', radius: 0.3, dir: [-1, 0.2, 0], spread: 0.6, speed: [0.1, 0.5], life: [0.6, 1.0], size: [0.2, 0.5], ramp: DUST(0.25), lit: 1, t0: 0, t1: TI + 0.2, emit: TI, follow: (m, ta, t) => { const u = cl(t / TI); m.position.set(-4.2 + 4.4 * u, 0.5 + 3.4 * (1 - u * u), 0); }, order: -1 });
      fx.flash(TI, 0.2, '#fff0d8', 0.35); fx.shake(TI, 0.7, 0.13);
      fx.emitter({ count: 70, kind: 'rock', blend: 'normal', shape: 'sphere', radius: 0.35, pos: [0.2, 0.4, 0], dir: [0, 1, 0], spread: 1.2, speed: [2.5, 8], life: [1.2, 1.9], gravity: [0, -10, 0], size: [0.2, 0.12], ramp: ROCKRAMP('#7a6e60'), lit: 1, bounce: 0.35, rot: 6, delay: TI });
      fx.emitter({ count: 50, kind: 'shard', blend: 'normal', shape: 'sphere', radius: 0.3, pos: [0.2, 0.4, 0], dir: [0, 1, 0], spread: 1.4, speed: [3, 9], life: [0.9, 1.5], gravity: [0, -10, 0], size: [0.1, 0.06], ramp: ROCKRAMP('#8a7e70'), lit: 1, bounce: 0.3, rot: 8, delay: TI });
      fx.emitter({ count: 70, kind: 'dust', blend: 'normal', shape: 'ring', radius: 0.5, pos: [0.2, 0.12, 0], dir: [0, 0.25, 0], spread: 1.4, speed: [1.5, 4], life: [1.1, 2], size: [0.5, 1.8], ramp: DUST(0.55), lit: 1, delay: TI, drag: 1.6, radial: 1, gravity: [0, 0.2, 0], order: -1 });
      fx.emitter({ count: 24, kind: 'dust', blend: 'normal', shape: 'sphere', radius: 0.3, pos: [0.2, 0.4, 0], dir: [0, 1, 0], spread: 0.8, speed: [1, 3], life: [1.4, 2.2], size: [0.6, 1.8], ramp: DUST(0.45), lit: 1, delay: TI + 0.02, drag: 1.2, gravity: [0, 0.4, 0], order: -1 });
      fx.ring({ t0: TI, dur: 0.7, r: [0.3, 4], width: [0.35, 0.08], normal: 'up', pos: [0.2, 0.02, 0], intensity: 0.5, fill: 0.08, ramp: [[0, '#fff'], [0.4, '#d8c8a8'], [1, '#6a5a44']] });
      fx.decal({ kind: 'scorch', t0: TI, dur: 1.35, r: [1.0, 1.2], fade: [0.05, 0.8], heat: [0, 0], pos: [0.2, 0.004, 0], ramp: [[0, '#1a1208'], [1, '#3a2a18']] });
      fx.decal({ kind: 'cracks', t0: TI, dur: 1.35, r: [1.4, 1.7], fade: [0.05, 0.8], reveal: 0.3, cells: 4, heat: [0.2, 0], pos: [0.2, 0.005, 0], ramp: [[0, '#1a1208'], [1, '#6a5a44']] });
      fx.light({ color: '#ffd8a0', intensity: 22, pos: [0.2, 1.0, 1.0], range: 8, t0: TI - 0.02, dur: 0.5, fade: [0.01, 0.4] });
    } },

  /* ===================================================================== earth spike */
  { id: 'nature/earth-spike', name: 'Earth spike', category: 'nature', loop: false, duration: 3.4, stage: { sky: 'dusk', bloom: 0.3, view: { pos: [3, 1.9, 4.6], target: [0, 1.0, 0], fov: 40 } },
    build(fx) {
      const mat = rockMat('#7a6e5e'), g = new THREE.Group();
      const main = new THREE.Mesh(spikeGeo(0.55, 2.3, fx.rng, 7, 0.3), mat); g.add(main);
      const side = [[0.5, 0.2, 1.1, 0.5], [-0.45, 0.6, 0.9, 0.7], [0.2, 2.4, 1.3, -0.6], [-0.1, 4.0, 0.8, -0.3], [0.1, 5.2, 0.9, 0.9]].map((q, i) => { const m = new THREE.Mesh(spikeGeo(0.24, q[2], fx.rng, 5, 0.3), mat); m.position.set(Math.cos(q[1]) * 0.3, 0, Math.sin(q[1]) * 0.3); m.rotation.set(Math.sin(q[1]) * 0.55 + q[3] * 0.1, 0, -Math.cos(q[1]) * 0.55); m.userData = { d: i * 0.04 }; g.add(m); return m; });
      fx.mesh(g, (t, pr, f, w, o) => {
        const up = eob((t - 0.65) / 0.22), down = sm(2.3, 3.0, t); o.visible = t > 0.64 && down < 0.999; const jit = t > 2.2 && t < 3.0 ? Math.sin(t * 80) * 0.01 * (1 - down) : 0;
        main.scale.set(1, Math.max(0.01, up), 1); main.rotation.z = 0.04; o.position.x = jit; o.position.y = -down * 2.6; side.forEach((m) => { const kk = cl(eob((t - 0.7 - m.userData.d) / 0.25)); m.scale.set(1, Math.max(0.01, kk), 1); });
      }, { dur: 99 });
      fx.decal({ kind: 'cracks', t0: 0.05, dur: 3.3, r: [1.8, 2.1], fade: [0.1, 1.4], reveal: 0.6, cells: 5, heat: [0.15, 0], growSpeed: 3, ramp: [[0, '#100a05'], [0.5, '#6a4a2a'], [1, '#d8a860']] });
      fx.shake(0.05, 0.6, 0.03); fx.shake(0.64, 0.6, 0.1);
      fx.emitter({ count: 40, kind: 'dust', blend: 'normal', shape: 'disc', radius: 0.7, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.2, 0.8], life: [0.8, 1.4], size: [0.2, 0.6], ramp: DUST(0.35), lit: 1, delay: 0.15, emit: 0.5, order: -1 });
      fx.emitter({ count: 80, kind: 'rock', blend: 'normal', shape: 'disc', radius: 0.4, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.9, speed: [2, 6], life: [1, 1.7], gravity: [0, -10, 0], size: [0.12, 0.08], ramp: ROCKRAMP('#7a6a58'), lit: 1, bounce: 0.3, rot: 6, delay: 0.64 });
      fx.emitter({ count: 70, kind: 'dust', blend: 'normal', shape: 'ring', radius: 0.5, pos: [0, 0.1, 0], dir: [0, 0.3, 0], spread: 1.3, speed: [1.5, 3.5], life: [1, 1.8], size: [0.4, 1.4], ramp: DUST(0.5), lit: 1, delay: 0.64, drag: 1.5, radial: 1, order: -1 });
      fx.ring({ t0: 0.64, dur: 0.6, r: [0.2, 3.2], width: [0.3, 0.06], normal: 'up', intensity: 0.35, ramp: [[0, '#e8d8b8'], [1, '#8a7a60']] });
      fx.emitter({ count: 70, kind: 'rock', blend: 'normal', shape: 'box', shapeSize: [0.35, 1.0, 0.35], pos: [0, 1.2, 0], dir: [0, 0, 0], spread: 1.5, speed: [0.3, 1.5], life: [1, 1.5], gravity: [0, -9, 0], size: [0.11, 0.07], ramp: ROCKRAMP('#7a6a58'), lit: 1, bounce: 0.3, rot: 5, delay: 2.4, emit: 0.6, radial: 0.4 });
      fx.emitter({ count: 50, kind: 'dust', blend: 'normal', shape: 'box', shapeSize: [0.3, 1.0, 0.3], pos: [0, 1.2, 0], dir: [0, 0, 0], spread: 1.5, speed: [0.3, 1], life: [1, 1.6], size: [0.3, 1.0], ramp: DUST(0.45), lit: 1, delay: 2.4, emit: 0.7, drag: 1, radial: 0.8, gravity: [0, -0.3, 0], order: -1 });
      fx.light({ color: '#ffc890', intensity: 20, pos: [1.2, 1.5, 1.5], range: 7 });
    } },

  /* ===================================================================== healing bloom */
  { id: 'nature/healing-bloom', name: 'Healing bloom', category: 'nature', loop: false, duration: 3.3, stage: { sky: 'day', bloom: 0.5, view: { pos: [2.2, 1.5, 3.2], target: [0, 0.85, 0], fov: 38 } },
    build(fx) {
      const stemM = new THREE.MeshStandardMaterial({ color: '#4aa83a', roughness: 0.5, emissive: '#2a6a10', emissiveIntensity: 0.35 }), S = 16, stem = tube(S, 7, stemM), pts = mkPts(S);
      const lf = leafGeo(), lm = new THREE.MeshStandardMaterial({ color: '#5ac848', roughness: 0.45, emissive: '#2a8a18', emissiveIntensity: 0.4, side: THREE.DoubleSide });
      const g = new THREE.Group(); g.add(stem); const leaves = [[0.32, 0.4, 0.55], [0.5, 3.4, 0.45], [0.2, 2.2, 0.35]].map((q) => { const p = new THREE.Group(), m = new THREE.Mesh(lf, lm); m.scale.setScalar(q[2]); p.add(m); p.userData = q; g.add(p); return p; });
      const heartM = new THREE.MeshPhysicalMaterial({ color: '#ffd24a', emissive: '#ffb020', emissiveIntensity: 1.0, roughness: 0.15, metalness: 0.5, clearcoat: 1 });
      const hs = new THREE.Shape(); hs.moveTo(0, -0.5); hs.bezierCurveTo(-0.1, -0.38, -0.5, -0.12, -0.5, 0.18); hs.bezierCurveTo(-0.5, 0.45, -0.18, 0.52, 0, 0.28); hs.bezierCurveTo(0.18, 0.52, 0.5, 0.45, 0.5, 0.18); hs.bezierCurveTo(0.5, -0.12, 0.1, -0.38, 0, -0.5);
      const hg = new THREE.ExtrudeGeometry(hs, { depth: 0.22, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.09, bevelSegments: 4, curveSegments: 20 }); hg.center();
      const heart = new THREE.Mesh(hg, heartM); const hh = halo('#ffd060', 1.6, 1.4); heart.add(hh); hh.scale.setScalar(2.6); g.add(heart);
      const pm = new THREE.MeshStandardMaterial({ color: '#ffe8a0', roughness: 0.4, emissive: '#ffb040', emissiveIntensity: 0.5, side: THREE.DoubleSide, transparent: true });
      const petals = []; for (let i = 0; i < 8; i++) { const p = new THREE.Group(), m = new THREE.Mesh(lf, pm); m.scale.set(0.9, 0.55, 1); p.add(m); p.rotation.y = (i / 8) * TAU; g.add(p); petals.push(p); }
      fx.mesh(g, (t, pr, f, w, o) => {
        const gr = eob((t - 0.15) / 0.8), a = cl(gr), top = 0.95 * a;
        for (let k = 0; k <= S; k++) { const u = k / S; pts[k][0] = Math.sin(u * 3 + 0.3) * 0.06 * u * a; pts[k][1] = top * u; pts[k][2] = Math.cos(u * 2.4) * 0.04 * u * a; }
        stem.userData.set(pts, (u) => 0.03 * (1 - 0.5 * u) * Math.min(1, a * 4)); stem.visible = a > 0.02;
        leaves.forEach((p) => { const [h, yaw, s] = p.userData, e = eob((t - 0.4 - h * 0.5) / 0.6); p.position.set(pts[Math.floor(h / 0.95 * S)][0], h * a, pts[Math.floor(h / 0.95 * S)][2]); p.rotation.set(0, yaw, 0); p.children[0].rotation.set(-0.3 - 1.3 * (1 - e) * -1 * -1, 0, 0); p.children[0].rotation.x = -(0.35 + (1 - cl(e)) * 1.2); p.scale.setScalar(Math.max(0.01, cl(e))); });
        const hb = eob((t - 0.8) / 0.6), rise = sm(2.3, 3.1, t); heart.position.set(0, 1.08 + 0.25 * hb + rise * 0.7 + Math.sin(t * 3) * 0.025, 0); heart.scale.setScalar(Math.max(0.001, 0.34 * cl(hb) * (1 - sm(2.8, 3.3, t) * 0.6))); heart.rotation.y = t * 1.2; heartM.emissiveIntensity = 0.7 + 0.6 * Math.sin(t * 5); hh.material.opacity = (0.5 + 0.2 * Math.sin(t * 5)) * (1 - sm(3.0, 3.3, t));
        const open = eob((t - 1.1) / 0.8), lift = sm(2.0, 3.0, t); petals.forEach((p, i) => { p.position.set(0, 0.95 * a + 0.12 + lift * (0.8 + i * 0.05), 0); p.children[0].position.set(0.02, 0, 0); p.children[0].rotation.set(0, 0, 0); p.rotation.set(0, (i / 8) * TAU + lift * 2, -(0.12 + 1.0 * cl(open))); const sc = cl(open) * (1 - lift) * 1.35; p.scale.setScalar(Math.max(0.001, sc)); });
        pm.opacity = 1 - sm(2.2, 3.0, t);
      }, { dur: 99 });
      fx.decal({ kind: 'glow', r: [1.4, 1.4], t0: 0.1, dur: 3.2, fade: [0.5, 1.0], intensity: 1.0, alpha: 0.8, ramp: [[0, '#000'], [0.4, '#4a8a1a'], [1, '#ffe080']] });
      fx.ring({ t0: 0.9, dur: 1.2, r: [0.2, 1.7], width: [0.2, 0.04], normal: 'up', intensity: 1, ramp: [[0, '#fff'], [0.4, '#ffe080'], [1, '#6ac030']] });
      fx.ring({ t0: 1.9, dur: 0.9, r: [0.2, 0.9], width: [0.12, 0.03], normal: 'cam', pos: [0, 1.4, 0], intensity: 0.8, ramp: [[0, '#fff'], [0.4, '#ffe080'], [1, '#c09020']] });
      fx.emitter({ count: 70, kind: 'soft', shape: 'sphere', radius: 0.5, pos: [0, 1.0, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.3, 1.2], life: [1.2, 2.2], size: [0.07, 0.01], ramp: [[0, '#fff4c0', 0], [0.2, '#ffe070', 1], [1, '#80c030', 0]], intensity: 2.2, delay: 1.2, emit: 1.8, gravity: [0, 0.3, 0], turb: [0.2, 1] });
      fx.emitter({ count: 30, kind: 'petal', shape: 'sphere', radius: 0.35, pos: [0, 1.2, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.5, 1.2], life: [1.5, 2.2], size: [0.1, 0.07], rot: 3, ramp: [[0, '#fff0b0', 1], [0.7, '#ffd060', 0.9], [1, '#c08020', 0]], intensity: 1.2, delay: 2.2, emit: 0.7, gravity: [0, 0.2, 0], turb: [0.3, 1] });
      fx.emitter({ count: 20, kind: 'glint', shape: 'sphere', radius: 0.4, pos: [0, 1.3, 0], speed: [0.1, 0.4], life: [0.5, 1], size: [0.14, 0.03], ramp: [[0, '#fff', 0], [0.5, '#fff0a0', 1], [1, '#fff', 0]], intensity: 2.5, delay: 1.4, emit: 1.6 });
      fx.light({ color: '#ffd878', intensity: 40, pos: [0.3, 1.5, 0.6], range: 7, env: (t) => sm(0.6, 1.3, t) * (1 - sm(2.8, 3.3, t)) });
    } },

  /* ===================================================================== leaf storm */
  { id: 'nature/leaf-storm', name: 'Leaf storm', category: 'nature', loop: true, duration: 2.4, body: true, stage: { sky: 'day', bloom: 0.3, view: { pos: [2.8, 1.7, 4], target: [0, 1.0, 0], fov: 40 } },
    build(fx) {
      const lf = leafGeo(), N = 24, cols = ['#4aa83a', '#6ac040', '#9ac838', '#c8a030', '#38902a'], mats = cols.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, side: THREE.DoubleSide, emissive: c, emissiveIntensity: 0.08 })); const per = [];
      for (let i = 0; i < N; i++) { const m = new THREE.Mesh(lf, mats[i % 5]); m.scale.setScalar(0.13 + fx.rng() * 0.07); const p = { m, ph: i / N, a0: fx.rng() * TAU, r: 0.6 + fx.rng() * 0.35, tw: 1 + Math.floor(fx.rng() * 3), sp: 1 + Math.floor(fx.rng() * 2), tum: fx.rng() * 6 }; per.push(p); }
      const g = new THREE.Group(); per.forEach((p) => g.add(p.m));
      fx.mesh(g, (t) => { per.forEach((p) => { const u = fr(t / 2.4 + p.ph), a = p.a0 + u * TAU * 1.4 * p.sp, r = p.r * (0.8 + 0.4 * Math.sin(u * Math.PI)) + 0.1 * Math.sin(u * TAU * 2); p.m.position.set(Math.cos(a) * r, 0.05 + u * 2.3, Math.sin(a) * r); p.m.rotation.set(u * TAU * p.tw + p.tum, a + u * 4, u * TAU * 2 * p.tw); p.m.scale.setScalar(p.m.scale.x); const s = Math.sin(u * Math.PI) ** 0.6; p.m.visible = s > 0.05; }); }, { dur: 99 });
      fx.emitter({ count: 90, kind: 'petal', shape: 'ring', radius: 0.8, radiusIn: 0.45, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.2, speed: [0.9, 1.3], life: [2.2, 2.4], size: [0.09, 0.08], rot: 6, swirl: 2.8, ramp: [[0, '#6ac040', 0], [0.12, '#7ad040', 1], [0.7, '#4a9a30', 1], [1, '#c8a030', 0]], intensity: 1, lit: 0 });
      fx.ribbon({ n: 40, blend: 'add', intensity: 0.5, tail: 1, head: () => 1.001, ramp: [[0, '#eaffd0'], [1, '#4a9a30']], width: (u) => 0.025 * u, points: (t) => { const o = []; for (let i = 0; i <= 40; i++) { const u = i / 40, a = u * TAU * 1.4 + t / 2.4 * TAU, r = 0.75 + 0.05 * Math.sin(u * 9); o.push([Math.cos(a) * r, 0.1 + u * 2.1, Math.sin(a) * r]); } return o; } });
      fx.emitter({ count: 24, kind: 'dust', blend: 'normal', shape: 'ring', radius: 0.8, radiusIn: 0.4, pos: [0, 0.05, 0], dir: [0, 0.3, 0], spread: 0.4, speed: [0.2, 0.6], life: [1, 1.6], size: [0.2, 0.6], ramp: DUST(0.2, '#8a9a60'), lit: 1, swirl: 3, order: -1 });
      fx.light({ color: '#b8ff90', intensity: 10, pos: [0.6, 1.4, 0.8], range: 6 });
      fx.on(() => fx.body.set({ rim: '#9ae060', rimAmt: 0.5 }));
    } },

  /* ===================================================================== poison cloud */
  { id: 'nature/poison-cloud', name: 'Poison cloud', category: 'nature', loop: true, duration: 4, stage: { sky: 'dusk', bloom: 0.35, view: { pos: [3.4, 1.8, 4.4], target: [0, 0.7, 0], fov: 40 } },
    build(fx) {
      fx.emitter({ count: 70, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 1.5, pos: [0, 0.3, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.05, 0.25], life: [3, 4], size: [1.0, 2.0], ramp: [[0, '#9ac020', 0], [0.2, '#a8cc28', 0.5], [0.6, '#6a8a30', 0.45], [0.85, '#6a3a8a', 0.3], [1, '#3a1a5a', 0]], lit: 1, turb: [0.3, 0.4], swirl: 0.3, order: -1, floorFade: 0.5 });
      fx.emitter({ count: 40, kind: 'smoke', shape: 'disc', radius: 1.4, pos: [0, 0.25, 0], dir: [0, 1, 0], spread: 0.4, speed: [0.05, 0.2], life: [3, 4], size: [1.0, 1.8], ramp: [[0, '#c8e030', 0], [0.25, '#b8d828', 0.18], [0.7, '#80b030', 0.12], [1, '#6a30a0', 0]], intensity: 0.35, turb: [0.3, 0.4], floorFade: 0.5 });
      for (let k = 0; k < 4; k++) {
        const ph = k * 1.5, rr = 0.5 + 0.2 * k; fx.ribbon({ n: 44, blend: 'add', intensity: 0.4, core: 1, tail: 1, head: () => 1.001, ramp: [[0, '#d8ff50'], [0.5, '#98c830'], [1, '#6a3aa0']], width: (u) => 0.12 * Math.sin(Math.PI * Math.min(1, u * 1.05)) * (0.3 + 0.7 * (1 - u * 0.4)),
          points: (t) => { const o = [], tt = t / 4 * TAU; for (let i = 0; i <= 44; i++) { const u = i / 44, a = ph + u * 5.2 * (k % 2 ? -1 : 1) + tt, r = rr * (0.4 + 0.9 * u) + 0.06 * Math.sin(u * 9 + tt); o.push([Math.cos(a) * r, 0.1 + u * 1.9 + 0.1 * Math.sin(tt + k), Math.sin(a) * r]); } return o; } });
      }
      fx.emitter({ count: 26, kind: 'soft', shape: 'disc', radius: 1.3, pos: [0, 0.2, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.1, 0.4], life: [2, 3.4], size: [0.04, 0.01], ramp: [[0, '#eaff80', 0], [0.3, '#d8ff50', 1], [1, '#8a40c0', 0]], intensity: 2, turb: [0.25, 0.8] });
      fx.decal({ kind: 'glow', r: [1.8, 1.8], intensity: 0.7, alpha: 0.7, ramp: [[0, '#000'], [0.5, '#3a6a10'], [1, '#b8e830']] });
      fx.light({ color: '#a8e030', intensity: 22, pos: [0, 0.9, 0.6], range: 7, flicker: 0.1 });
    } },

  /* ===================================================================== quake */
  { id: 'nature/quake', name: 'Quake', category: 'nature', loop: false, duration: 3.1, stage: { sky: 'dusk', bloom: 0.4, view: { pos: [2.6, 2.4, 5], target: [0, 0.2, 0], fov: 42 } },
    build(fx) {
      const m = new THREE.ShaderMaterial({ ...NORM, side: THREE.DoubleSide, uniforms: { uOpen: { value: 0 }, uA: { value: 1 }, uTime: { value: 0 } }, vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `${NOISE} uniform float uOpen,uA,uTime; varying vec3 vP;
        void main(){ float x=vP.x*.5, y=vP.y*.5; // plane local: x along the rift (m*2)
          float lx=vP.x; float z0=(fbm(vec3(lx*1.1,3.,0.))-.5)*.9+sin(lx*1.7)*.12; float d=abs(vP.y-z0); float L=1.-smoothstep(1.2,2.9,abs(lx)); float w=uOpen*.3*L*(.55+.9*fbm(vec3(lx*3.,1.,uTime*.2)));
          float n=fbm(vec3(lx*5.,vP.y*5.,uTime*.3)); float edge=smoothstep(w+.07+n*.06,w*.9,d); float core=smoothstep(w*.8,0.,d);
          float hot=core*(.6+.7*n); vec3 glow=mix(vec3(.9,.18,.02),vec3(1.,.75,.25),hot)*(.8+hot*1.3); vec3 rim=vec3(.04,.025,.015);
          float crack=smoothstep(.02,0.,abs(d-(w+.05+n*.05)))*smoothstep(.0,.5,uOpen)*.9; float a=max(edge,crack*.6);
          vec3 col=mix(rim,glow,core*uOpen); col+=vec3(.9,.25,.05)*crack*.8; gl_FragColor=vec4(col*a*uA,a*uA); }` });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3), m); pl.rotation.x = -Math.PI / 2; pl.position.y = 0.012; pl.renderOrder = 9;
      fx.mesh(pl, (t, pr, f, w, o, ta) => { m.uniforms.uOpen.value = eob((t - 1.25) / 1.0) * (1 - sm(2.7, 3.1, t) * 0.0); m.uniforms.uTime.value = ta; m.uniforms.uA.value = sm(1.2, 1.3, t) * (1 - sm(2.7, 3.1, t)); }, { dur: 99 });
      const slabs = []; const sm1 = rockMat('#6a6054'); const sg = new THREE.Group();
      for (let i = 0; i < 9; i++) { const side = i % 2 ? 1 : -1, x = -2 + (i / 8) * 4 + (fx.rng() - 0.5) * 0.3, z = side * (0.4 + fx.rng() * 0.7); const b = new THREE.Mesh(new THREE.BoxGeometry(0.5 + fx.rng() * 0.5, 0.16, 0.4 + fx.rng() * 0.4), sm1); b.userData = { x, z, d: 1.2 + fx.rng() * 0.5, amp: 0.2 + fx.rng() * 0.3, tz: (fx.rng() - 0.5) * 0.5 * side, tx: (fx.rng() - 0.5) * 0.4, ry: (fx.rng() - 0.5) * 0.8 }; sg.add(b); slabs.push(b); }
      fx.mesh(sg, (t) => slabs.forEach((b) => { const q = b.userData, u = cl((t - q.d) / 1.1), s = Math.sin(Math.PI * u) ** 0.7; b.visible = u > 0 && u < 1; b.position.set(q.x, -0.1 + (0.1 + q.amp) * s, q.z); b.rotation.set(q.tx * s, q.ry * (1 - u), q.tz * s); }), { dur: 99 });
      for (const [t0, a] of [[0.2, 0.08], [0.75, 0.1], [1.25, 0.16]]) { fx.shake(t0, 0.45, a); fx.ring({ t0, dur: 0.7, r: [0.2, 3.8], width: [0.2, 0.05], normal: 'up', intensity: 0.5, ramp: [[0, '#fff'], [0.4, '#d8c0a0'], [1, '#6a5a44']] }); fx.emitter({ count: 40, kind: 'dust', blend: 'normal', shape: 'box', shapeSize: [2, 0.02, 1], pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.8, speed: [0.5, 1.8], life: [0.8, 1.5], size: [0.25, 0.8], ramp: DUST(0.4), lit: 1, delay: t0, drag: 1.2, order: -1 }); }
      fx.flash(1.25, 0.2, '#ffb060', 0.25);
      fx.decal({ kind: 'cracks', t0: 0.2, dur: 2.9, r: [2.6, 2.9], fade: [0.1, 0.9], reveal: 0.9, cells: 5, heat: [0.1, 0.8], ramp: [[0, '#100804'], [0.5, '#e04a10'], [1, '#ffc060']], growSpeed: 3 });
      fx.emitter({ count: 70, kind: 'rock', blend: 'normal', shape: 'line', shapeSize: [1.8, 0, 0], pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.8, speed: [1.5, 5], life: [0.9, 1.5], gravity: [0, -10, 0], size: [0.1, 0.06], ramp: ROCKRAMP('#6a5a48'), lit: 1, bounce: 0.3, rot: 5, delay: 1.25, emit: 0.5 });
      fx.emitter({ count: 70, kind: 'spark', shape: 'line', shapeSize: [1.8, 0, 0], pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.5, speed: [1, 4], life: [0.6, 1.4], gravity: [0, -3, 0], size: [0.05, 0.015], stretch: 1, ramp: [[0, '#fff0c0'], [0.3, '#ff8a20'], [1, '#600', 0]], intensity: 3, delay: 1.3, emit: 1.2 });
      fx.emitter({ count: 50, kind: 'smoke', blend: 'normal', shape: 'line', shapeSize: [1.8, 0, 0], pos: [0, 0.15, 0], dir: [0, 1, 0], spread: 0.4, speed: [0.5, 1.4], life: [1.2, 2], size: [0.4, 1.4], ramp: [[0, '#3a2a20', 0], [0.2, '#4a3a2e', 0.5], [1, '#1a1410', 0]], lit: 1, delay: 1.3, emit: 1.2, turb: [0.3, 0.6], order: -1 });
      fx.light({ color: '#ff6a20', intensity: 60, pos: [0, 0.4, 0.2], range: 7, env: (t) => sm(1.2, 1.7, t) * (1 - sm(2.5, 3.1, t)) });
    } },

  /* ===================================================================== root snare */
  { id: 'nature/root-snare', name: 'Root snare', category: 'nature', loop: false, duration: 2.7, body: true, stage: { sky: 'dusk', bloom: 0.3, view: { pos: [2.6, 1.5, 3.4], target: [0, 0.8, 0], fov: 38 } },
    build(fx) {
      const mat = new THREE.MeshStandardMaterial({ color: '#4e3822', roughness: 0.95, emissive: '#1a3a10', emissiveIntensity: 0.15 }); const NR = 6, S = 36, roots = [], g = new THREE.Group();
      for (let i = 0; i < NR; i++) { const r = { m: tube(S, 7, mat), pts: mkPts(S), a0: (i / NR) * TAU + fx.rng() * 0.4, d: i * 0.06, y1: 0.55 + fx.rng() * 0.6, dir: i % 2 ? 1 : -1, r0: 0.95 + fx.rng() * 0.3 }; roots.push(r); g.add(r.m); }
      fx.mesh(g, (t) => {
        const crumble = sm(2.0, 2.3, t);
        for (const r of roots) {
          const gr = cl((t - 0.2 - r.d) / 0.8), e = gr * gr * (3 - 2 * gr), cinch = sm(1.1, 1.5, t), tw = 0.0;
          for (let k = 0; k <= S; k++) { const s = k / S * e; let x, y, a, rr;
            if (s < 0.25) { const q = s / 0.25; rr = r.r0 + (0.24 - r.r0) * q; y = -0.05 + 0.2 * Math.sin(q * Math.PI * 0.5) * 0.5 + q * 0.12; a = r.a0 + q * 0.6 * r.dir; } else { const q = (s - 0.25) / 0.75; rr = 0.24 - 0.07 * cinch - 0.03 * q; y = 0.07 + q * r.y1 * 1.25; a = r.a0 + 0.6 * r.dir + q * TAU * 1.3 * r.dir; }
            x = Math.cos(a) * rr; r.pts[k][0] = x; r.pts[k][1] = y; r.pts[k][2] = Math.sin(a) * rr; }
          r.m.userData.set(r.pts, (u) => (0.045 * (1 - 0.55 * u) + 0.012) * (1 - 0.7 * cinch * 0) * (1 - crumble)); r.m.visible = e > 0.01 && crumble < 0.99;
          if (t > 2.0) r.m.position.y = -sm(2.0, 2.4, t) * 0.0;
        }
      }, { dur: 99 });
      fx.emitter({ count: 50, kind: 'dust', blend: 'normal', shape: 'ring', radius: 1.0, radiusIn: 0.5, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.5, 1.4], life: [0.8, 1.4], size: [0.2, 0.7], ramp: DUST(0.45, '#a08868'), lit: 1, delay: 0.2, emit: 0.6, order: -1 });
      fx.emitter({ count: 50, kind: 'rock', blend: 'normal', shape: 'ring', radius: 0.9, radiusIn: 0.4, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.6, speed: [1, 3], life: [0.8, 1.3], gravity: [0, -9, 0], size: [0.07, 0.04], ramp: ROCKRAMP('#4a3626'), lit: 1, bounce: 0.3, rot: 5, delay: 0.2, emit: 0.6 });
      fx.emitter({ count: 70, kind: 'shard', blend: 'normal', shape: 'box', shapeSize: [0.3, 0.5, 0.3], pos: [0, 0.5, 0], dir: [0, 0.3, 0], spread: 1.5, speed: [1, 3.5], life: [1, 1.6], gravity: [0, -9, 0], size: [0.07, 0.04], ramp: ROCKRAMP('#5a4430'), lit: 1, bounce: 0.3, rot: 7, delay: 2.0, radial: 0.8 });
      fx.emitter({ count: 50, kind: 'dust', blend: 'normal', shape: 'box', shapeSize: [0.3, 0.5, 0.3], pos: [0, 0.5, 0], dir: [0, 0.3, 0], spread: 1.5, speed: [0.5, 1.8], life: [1, 1.6], size: [0.3, 1.0], ramp: DUST(0.5, '#6a5440'), lit: 1, delay: 2.0, drag: 1.3, radial: 0.8, order: -1 });
      fx.emitter({ count: 24, kind: 'petal', shape: 'box', shapeSize: [0.3, 0.5, 0.3], pos: [0, 0.6, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.3, 1.2], life: [1, 1.8], size: [0.06, 0.05], rot: 4, ramp: [[0, '#6ac040', 1], [1, '#3a7a20', 0]], delay: 2.0, gravity: [0, -1, 0] });
      fx.decal({ kind: 'cracks', t0: 0.15, dur: 2.5, r: [1.3, 1.5], fade: [0.1, 0.7], reveal: 0.5, cells: 4, heat: [0.1, 0], ramp: [[0, '#100a05'], [0.5, '#3a5a20'], [1, '#8ad040']], growSpeed: 3 });
      fx.shake(0.25, 0.3, 0.03); fx.shake(2.0, 0.4, 0.04);
      fx.light({ color: '#c8e8a0', intensity: 40, pos: [0.8, 1.6, 1.4], range: 8, env: (t) => sm(0.2, 0.6, t) * (1 - sm(1.9, 2.3, t)) });
      fx.on((t) => { fx.body.set({ tint: '#3a5a20', tintAmt: 0.12 * sm(1.1, 1.5, t), rim: '#8ad060', rimAmt: 0.4 * sm(0.5, 1.5, t) }); });
    } },

  /* ===================================================================== spore burst */
  { id: 'nature/spore-burst', name: 'Spore burst', category: 'nature', loop: false, duration: 3.2, stage: { sky: 'night', bloom: 0.5, view: { pos: [1.7, 1.0, 2.5], target: [0, 0.55, 0], fov: 40 } },
    build(fx) {
      const cap = []; for (let i = 0; i <= 14; i++) { const u = i / 14, a = u * Math.PI * 0.5; cap.push(new THREE.Vector2(Math.sin(a) * 0.36 * (1 + 0.1 * Math.sin(u * 5)), Math.cos(a) * 0.24)); }
      const stem = [[0.0, 0], [0.09, 0], [0.075, 0.12], [0.06, 0.3], [0.07, 0.42], [0.001, 0.44]].map((q) => new THREE.Vector2(q[0] === 0 ? 0.001 : q[0], q[1]));
      const cm = new THREE.MeshStandardMaterial({ color: '#7a28c8', roughness: 0.35, emissive: '#5a18c0', emissiveIntensity: 0.5 }), sm0 = new THREE.MeshStandardMaterial({ color: '#d8c8b0', roughness: 0.6, emissive: '#3a2a60', emissiveIntensity: 0.2 });
      const g = new THREE.Group(), cp = new THREE.Mesh(new THREE.LatheGeometry(cap, 28), cm); cp.position.y = 0.4; g.add(cp); const st = new THREE.Mesh(new THREE.LatheGeometry(stem, 16), sm0); g.add(st);
      const gill = new THREE.Mesh(new THREE.CircleGeometry(0.34, 24), new THREE.MeshStandardMaterial({ color: '#e0b0ff', emissive: '#a050ff', emissiveIntensity: 0.6, side: THREE.DoubleSide })); gill.rotation.x = Math.PI / 2; gill.position.y = 0.4; g.add(gill);
      const spm = new THREE.MeshStandardMaterial({ color: '#f0e8ff', emissive: '#c090ff', emissiveIntensity: 0.9, roughness: 0.4 }); for (let i = 0; i < 9; i++) { const a = i * 2.4, e = 0.25 + (i % 3) * 0.25, rr = Math.sin(e * 1.2) * 0.355, s = new THREE.Mesh(new THREE.SphereGeometry(0.03 + (i % 3) * 0.008, 10, 8), spm); s.position.set(Math.cos(a) * rr, 0.4 + Math.cos(e * 1.2) * 0.24 * 0.98, Math.sin(a) * rr); s.scale.y = 0.5; s.lookAt(0, 0.45, 0); cp.parent.add(s); }
      const hl = halo('#a050ff', 1.4, 0.8); hl.position.y = 0.4; g.add(hl);
      fx.mesh(g, (t, pr, f, w, o) => {
        const grow = eob((t - 0.2) / 0.9), sw = sm(1.1, 1.5, t), wob = t > 1.1 ? Math.sin(t * 60) * 0.03 * sm(1.1, 1.5, t) : 0; const s = 1.7 * cl(grow) * (1 + 0.55 * sw * sw) + wob; o.scale.set(Math.max(0.001, s) * (1 + 0.15 * sw), Math.max(0.001, s) * (1 - 0.1 * sw), Math.max(0.001, s) * (1 + 0.15 * sw)); o.visible = t > 0.2 && t < 1.5; cm.emissiveIntensity = 0.5 + 1.5 * sw; hl.material.opacity = 0.3 + 0.7 * sw;
      }, { dur: 99 });
      fx.decal({ kind: 'glow', r: [1.0, 1.0], t0: 0.1, dur: 3.1, fade: [0.5, 1.2], intensity: 0.8, alpha: 0.7, ramp: [[0, '#000'], [0.5, '#3a1a78'], [1, '#a070ff']] });
      fx.emitter({ count: 24, kind: 'soft', shape: 'sphere', radius: 0.2, pos: [0, 0.4, 0], dir: [0, 1, 0], spread: 1, speed: [0.1, 0.4], life: [0.6, 1], size: [0.05, 0.01], ramp: [[0, '#e0c0ff', 0.8], [1, '#6a30c0', 0]], intensity: 1.8, delay: 0.5, emit: 0.9 });
      fx.flash(1.5, 0.2, '#c8a0ff', 0.3); fx.shake(1.5, 0.4, 0.04);
      fx.ring({ t0: 1.5, dur: 0.7, r: [0.2, 2.6], width: [0.2, 0.05], normal: 'up', intensity: 0.8, ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#4a20a0']] });
      fx.ring({ t0: 1.5, dur: 0.5, r: [0.2, 1.6], width: [0.15, 0.03], normal: 'cam', pos: [0, 0.7, 0], intensity: 1.2, ramp: [[0, '#fff'], [1, '#a070ff']] });
      fx.emitter({ count: 260, kind: 'soft', shape: 'sphere', radius: 0.2, pos: [0, 0.7, 0], dir: [0, 1, 0], spread: 1.6, speed: [0.8, 3.0], life: [2.2, 3.2], size: [0.05, 0.02], sizeVar: 0.7, ramp: [[0, '#fff0ff', 1], [0.25, '#d8a0ff', 0.9], [0.7, '#7a40d0', 0.6], [1, '#3a1a80', 0]], intensity: 2.2, delay: 1.5, drag: 1.4, gravity: [0, -0.18, 0], turb: [0.35, 0.8], floorFade: 0.05 });
      fx.emitter({ count: 70, kind: 'glint', shape: 'sphere', radius: 0.4, pos: [0, 0.7, 0], speed: [0.5, 1.5], life: [1, 2.2], size: [0.12, 0.03], ramp: [[0, '#fff', 0], [0.3, '#f0d8ff', 1], [1, '#fff', 0]], intensity: 2.5, delay: 1.6, drag: 1.2, gravity: [0, -0.12, 0], turb: [0.3, 0.8] });
      fx.emitter({ count: 26, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.2, pos: [0, 0.7, 0], dir: [0, 1, 0], spread: 1.6, speed: [0.4, 1.4], life: [1.2, 2], size: [0.3, 1.0], ramp: [[0, '#8a68c0', 0], [0.2, '#8a68c0', 0.3], [1, '#2a1a50', 0]], lit: 1, delay: 1.5, drag: 1.5, order: -1 });
      fx.light({ color: '#a060ff', intensity: 40, pos: [0.4, 1.0, 0.6], range: 7, env: (t) => 0.35 + 0.65 * sm(0.5, 1.4, t) * (1 - 0.6 * sm(1.6, 3.0, t)) });
    } },

  /* ===================================================================== thorns */
  { id: 'nature/thorns', name: 'Thorns', category: 'nature', loop: false, duration: 2.4, stage: { sky: 'dusk', bloom: 0.4, view: { pos: [1.5, 1.7, 5.4], target: [0, 0.7, 0], fov: 40 } },
    build(fx) {
      const mat = new THREE.MeshStandardMaterial({ color: '#2a4a1c', roughness: 0.55, flatShading: true, emissive: '#2aa020', emissiveIntensity: 0.25 }), tip = new THREE.MeshStandardMaterial({ color: '#d8e0a0', roughness: 0.4, emissive: '#80ff40', emissiveIntensity: 0.4, flatShading: true });
      const g = new THREE.Group(), th = []; const N = 11;
      for (let i = 0; i < N; i++) { const x = -1.9 + (i / (N - 1)) * 3.8, big = 0.55 + 0.45 * Math.sin((i / (N - 1)) * Math.PI), h = (0.7 + fx.rng() * 0.7) * big + 0.25; const m = new THREE.Mesh(spikeGeo(0.11 + 0.05 * big, h, fx.rng, 5, 0.2), mat); const tp = new THREE.Mesh(spikeGeo(0.04, h * 0.25, fx.rng, 5, 0.1), tip); tp.position.y = h * 0.76; m.add(tp); m.position.set(x, 0, (fx.rng() - 0.5) * 0.3); m.rotation.set((fx.rng() - 0.5) * 0.5, 0, (fx.rng() - 0.5) * 0.6); m.userData = { d: 0.25 + i * 0.1 + fx.rng() * 0.06, hold: 1.7 + fx.rng() * 0.15 }; g.add(m); th.push(m); if (i % 2 === 0) { const m2 = new THREE.Mesh(spikeGeo(0.06, h * 0.55, fx.rng, 5, 0.2), mat); m2.position.set(x + 0.16, 0, 0.12); m2.rotation.set(0.3, 0, -0.6); m2.userData = { d: m.userData.d + 0.07, hold: m.userData.hold }; g.add(m2); th.push(m2); } }
      fx.mesh(g, (t) => th.forEach((m) => { const q = m.userData, up = eob((t - q.d) / 0.2), dn = sm(q.hold, q.hold + 0.5, t); const k = up * (1 - dn); m.visible = k > 0.01; m.scale.set(1, Math.max(0.01, k), 1); }), { dur: 99 });
      fx.decal({ kind: 'cracks', t0: 0.1, dur: 2.3, r: [2.2, 2.4], fade: [0.1, 0.7], reveal: 0.8, cells: 6, heat: [0.8, 0.1], ramp: [[0, '#081004'], [0.5, '#2a8a18'], [1, '#b0ff60']], growSpeed: 3, intensity: 1.2 });
      fx.emitter({ count: 120, kind: 'dust', blend: 'normal', shape: 'line', shapeSize: [1.9, 0, 0], pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.7, speed: [0.5, 2], life: [0.7, 1.3], size: [0.2, 0.6], ramp: DUST(0.45, '#6a5440'), lit: 1, delay: 0.25, emit: 1.2, order: -1 });
      fx.emitter({ count: 100, kind: 'rock', blend: 'normal', shape: 'line', shapeSize: [1.9, 0, 0], pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.9, speed: [1.5, 4], life: [0.7, 1.2], gravity: [0, -10, 0], size: [0.06, 0.035], ramp: ROCKRAMP('#4a3626'), lit: 1, bounce: 0.3, rot: 6, delay: 0.25, emit: 1.2 });
      fx.emitter({ count: 80, kind: 'soft', shape: 'line', shapeSize: [1.9, 0, 0], pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.5, 2], life: [0.5, 1.2], size: [0.14, 0.03], ramp: [[0, '#eaffb0', 1], [0.4, '#6aff30', 0.7], [1, '#106010', 0]], intensity: 1.6, delay: 0.25, emit: 1.2, gravity: [0, 0.3, 0] });
      fx.emitter({ count: 40, kind: 'spark', shape: 'line', shapeSize: [1.9, 0, 0], pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.7, speed: [1, 3], life: [0.5, 1], size: [0.05, 0.015], stretch: 1, gravity: [0, -3, 0], ramp: [[0, '#fff'], [0.4, '#9aff50'], [1, '#106010', 0]], intensity: 3, delay: 0.25, emit: 1.2 });
      fx.shake(0.3, 1.1, 0.04);
      fx.light({ color: '#6aff30', intensity: 40, pos: [0, 0.8, 1], range: 7, env: (t) => sm(0.2, 0.7, t) * (1 - sm(1.7, 2.3, t)) });
    } },

  /* ===================================================================== tornado */
  { id: 'nature/tornado', name: 'Tornado', category: 'nature', loop: true, duration: 2, stage: { sky: 'storm', bloom: 0.35, view: { pos: [5, 2.2, 6.4], target: [0, 1.7, 0], fov: 40 } },
    build(fx) {
      const H = 3.6, prof = []; for (let i = 0; i <= 24; i++) { const u = i / 24; prof.push(new THREE.Vector2(0.08 + Math.pow(u, 1.9) * 1.25 + 0.04 * Math.sin(u * 14), u * H)); }
      const m = new THREE.ShaderMaterial({ ...NORM, side: THREE.DoubleSide, uniforms: { uPh: { value: 0 }, uFl: { value: 0 } }, vertexShader: 'varying vec3 vP,vN,vV; void main(){ vP=position; vN=normalize(normalMatrix*normal); vec4 mv=modelViewMatrix*vec4(position,1.); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }',
        fragmentShader: `${NOISE} uniform float uPh,uFl; varying vec3 vP,vN,vV;
        void main(){ float y=vP.y/${H.toFixed(1)}; float a=atan(vP.z,vP.x); float tw=a+uPh+y*5.; vec3 q=vec3(cos(tw)*1.6,sin(tw)*1.6,y*3.2-0.0); float n=fbm(q); float n2=fbm(vec3(cos(tw*2.+uPh)*2.,sin(tw*2.+uPh)*2.,y*6.));
          float f=abs(dot(normalize(vN),normalize(vV))); float edge=pow(f,.6); float a1=smoothstep(.0,.08,y)*smoothstep(1.01,.82,y)*(.15+.75*smoothstep(.25,.75,n*.7+n2*.5))*(.45+.55*edge);
          vec3 c=mix(vec3(.16,.14,.12),vec3(.5,.46,.42),n2)*(.55+.9*y*.0+.5*(1.-y)); c+=vec3(.5,.6,1.)*uFl*smoothstep(.6,1.,y)*1.4*(.4+n); gl_FragColor=vec4(c*a1,a1); }` });
      const cone = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), m); cone.renderOrder = 12;
      fx.mesh(cone, (t, pr, f, w, o, ta) => { m.uniforms.uPh.value = -(t / 2) * TAU; m.uniforms.uFl.value = fl(t); }, { dur: 99 });
      const fl = (t) => { const k = (t * 3.7) % 1; return (k < 0.12 ? 1 : 0) * (Math.floor(t * 3.7) % 2 ? 1 : 0.7) + 0.25 * (Math.sin(t * 40) > 0.6 ? 1 : 0) * 0; };
      fx.emitter({ count: 70, kind: 'smoke', blend: 'normal', shape: 'ring', radius: 0.9, radiusIn: 0.3, pos: [0, 0.2, 0], dir: [0, 1, 0], spread: 0.15, speed: [0.9, 1.6], life: [1.6, 2], size: [0.5, 1.5], ramp: [[0, '#5a5248', 0], [0.2, '#6a6258', 0.45], [1, '#3a342e', 0]], lit: 1, swirl: 6, turb: [0.2, 0.8], order: -2 });
      fx.emitter({ count: 50, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.4, pos: [0, 3.3, 0], dir: [0, 0.2, 0], spread: 1.2, speed: [0.5, 1.2], life: [1.2, 2], size: [0.8, 2.2], ramp: [[0, '#2a2a34', 0], [0.2, '#34343e', 0.5], [1, '#18181e', 0]], lit: 1, swirl: 3, order: -2 });
      fx.emitter({ count: 70, kind: 'dust', blend: 'normal', shape: 'ring', radius: 1.5, radiusIn: 0.5, pos: [0, 0.08, 0], dir: [0, 0.15, 0], spread: 0.5, speed: [0.2, 0.6], life: [1, 2], size: [0.5, 1.4], ramp: DUST(0.5, '#8a7a60'), lit: 1, swirl: 3.5, order: -1 });
      fx.emitter({ count: 44, kind: 'rock', blend: 'normal', shape: 'ring', radius: 0.8, radiusIn: 0.4, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.3, speed: [1, 2.8], life: [1.6, 2], size: [0.1, 0.07], rot: 8, swirl: 6, ramp: ROCKRAMP('#6a5a48'), lit: 1, drag: 0 });
      fx.emitter({ count: 40, kind: 'shard', blend: 'normal', shape: 'ring', radius: 0.7, radiusIn: 0.3, pos: [0, 0.2, 0], dir: [0, 1, 0], spread: 0.3, speed: [1.2, 3], life: [1.4, 2], size: [0.07, 0.05], rot: 9, swirl: 7, ramp: [[0, '#8a7a5a'], [1, '#8a7a5a', 1]], lit: 1 });
      fx.emitter({ count: 40, kind: 'petal', shape: 'ring', radius: 0.8, radiusIn: 0.3, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.3, speed: [1, 2.4], life: [1.6, 2], size: [0.1, 0.08], rot: 7, swirl: 6, ramp: [[0, '#5aa838', 0], [0.2, '#5aa838', 1], [1, '#8a9a38', 0]], lit: 0, intensity: 0.7 });
      fx.bolt({ from: [0, 3.7, 0], to: (s) => [Math.cos(s * 2.4) * 0.9, 2.0 + (s % 3) * 0.1, Math.sin(s * 2.4) * 0.9], jag: 0.25, branches: 2, width: 0.035, rate: 7, flicker: 0.5, ramp: [[0, '#fff'], [0.5, '#b8c8ff'], [1, '#5a6aff']] });
      fx.light({ color: '#9ab0ff', intensity: 60, pos: [0, 3.4, 0.5], range: 10, env: (t) => 0.1 + 1.4 * fl(t), norm: 40 });
      fx.light({ color: '#a89878', intensity: 8, pos: [1.5, 1.0, 1.5], range: 7 });
    } },

  /* ===================================================================== toxic puddle */
  { id: 'nature/toxic-puddle', name: 'Toxic puddle', category: 'nature', loop: true, duration: 4, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [1.8, 1.7, 2.7], target: [0, 0.1, 0], fov: 38 } },
    build(fx) {
      const R = 1.2, m = new THREE.ShaderMaterial({ ...NORM, uniforms: { uPh: { value: 0 }, uLightPos: { value: new THREE.Vector3(1, 3, 2) } }, vertexShader: 'varying vec3 vP,vWP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vWP=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
        fragmentShader: `${NOISE} uniform float uPh; varying vec3 vP,vWP;
        void main(){ vec2 p=vP.xz; float r=length(p)/${R.toFixed(2)}; float ang=atan(p.y,p.x); vec2 wp=p+vec2(sin(uPh+p.y*3.),cos(uPh+p.x*3.))*.04;
          vec2 vo=voronoi(vec3(wp*2.8,2.)); float vein=smoothstep(.07,.0,vo.y)*smoothstep(.42,.62,fbm(vec3(wp*1.6,3.))); vec2 vo2=voronoi(vec3(wp*6.,7.)); float v2=smoothstep(.05,.0,vo2.y)*.35*smoothstep(.5,.7,fbm(vec3(wp*2.,9.))); float pulse=.55+.45*sin(uPh+vo.x*6.);
          float n=fbm(vec3(wp*3.,1.)); vec3 V=normalize(cameraPosition-vWP); vec3 N=normalize(vec3((n-.5)*.15,1.,(fbm(vec3(wp*3.+7.,1.))-.5)*.15)); float F=.04+.96*sq(sq(1.-clamp(dot(N,V),0.,1.)));
          vec3 R3=reflect(-V,N); vec3 sky=mix(vec3(.04,.05,.03),vec3(.35,.4,.22),clamp(R3.y*1.5,0.,1.)); float spec=pow(max(dot(R3,normalize(vec3(.4,.8,.5))),0.),90.)*1.5;
          vec3 col=vec3(.012,.015,.01)+sky*F*.8+spec; vec3 glow=vec3(.65,1.,.1)*(vein*(.8+pulse*1.2)+v2*pulse*.7)*smoothstep(1.,.5,r); col+=glow;
          float edge=1.-smoothstep(.82,1.,r+(n-.5)*.18); gl_FragColor=vec4(col*edge,edge*.98); }` });
      const g = new THREE.CircleGeometry(R, 64); g.rotateX(-Math.PI / 2); const pud = new THREE.Mesh(g, m); pud.position.y = 0.012; pud.renderOrder = 7;
      fx.mesh(pud, (t, pr, f, w, o, ta) => { m.uniforms.uPh.value = t / 4 * TAU; }, { dur: 99 });
      const bm = new THREE.MeshPhysicalMaterial({ color: '#0a1006', roughness: 0.06, metalness: 0.2, clearcoat: 1, emissive: '#7ac010', emissiveIntensity: 0.18, transparent: true, opacity: 0.92 });
      const spots = [[0.35, 0.2, 0.2, 0.3], [-0.4, -0.25, 0.14, 1.0], [0.05, -0.5, 0.18, 1.8], [-0.35, 0.35, 0.12, 2.5], [0.5, -0.15, 0.1, 3.2]];
      spots.forEach(([x, z, r, t0], i) => {
        const b = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), bm); const dur = 0.9, e = () => 0;
        fx.mesh(b, (t) => { const u = ((t - t0) % 4 + 4) % 4 / dur; if (u > 1) { b.visible = false; return; } b.visible = true; const dome = sm(0, 0.65, u), st = sm(0.55, 0.97, u), pop = u > 0.97 ? 0 : 1; b.position.set(x, 0.01 + r * (0.15 + 0.6 * st) * dome, z); b.scale.set(r * (0.4 + 0.7 * dome) * (1 - 0.3 * st) * pop, r * (0.1 + 0.55 * dome + 0.65 * st) * pop, r * (0.4 + 0.7 * dome) * (1 - 0.3 * st) * pop); }, { dur: 99 });
        fx.emitter({ count: 9, kind: 'smoke', blend: 'normal', shape: 'point', pos: [x, 0.1 + r * 0.6, z], dir: [0, 1, 0], spread: 0.9, speed: [0.2, 0.6], life: [1.0, 1.6], size: [0.15, 0.55], ramp: [[0, '#9ac820', 0], [0.2, '#b0e030', 0.4], [1, '#4a6a10', 0]], lit: 1, delay: t0 + dur * 0.97, gravity: [0, 0.3, 0], turb: [0.1, 1], order: 2 });
        fx.emitter({ count: 8, kind: 'drop', shape: 'point', pos: [x, 0.15, z], dir: [0, 1, 0], spread: 0.9, speed: [0.5, 1.4], life: [0.4, 0.7], gravity: [0, -6, 0], size: [0.03, 0.02], ramp: [[0, '#d8ff60'], [1, '#4a8010', 0.8]], intensity: 1.2, delay: t0 + dur * 0.97 });
        fx.ring({ t0: (t0 + dur * 0.97) % 3.5, dur: 0.5, r: [r * 0.4, r * 2.2], width: [0.04, 0.01], normal: 'up', pos: [x, 0.02, z], intensity: 0.7, breakup: 0.1, ramp: [[0, '#eaff90'], [1, '#4a8010']] });
      });
      fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.9, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.1, 0.3], life: [2, 3], size: [0.4, 1.0], ramp: [[0, '#7ab020', 0], [0.3, '#8ac028', 0.18], [1, '#3a5a10', 0]], lit: 1, turb: [0.2, 0.5], order: 2 });
      fx.emitter({ count: 16, kind: 'soft', shape: 'disc', radius: 0.9, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.1, 0.4], life: [1.5, 3], size: [0.04, 0.01], ramp: [[0, '#eaff90', 0], [0.3, '#c8ff40', 1], [1, '#4a8010', 0]], intensity: 1.8, turb: [0.2, 0.8] });
      fx.light({ color: '#a8ff20', intensity: 18, pos: [0, 0.6, 0.2], range: 5, flicker: 0.12 });
    } },

  /* ===================================================================== vine whip */
  { id: 'nature/vine-whip', name: 'Vine whip', category: 'nature', loop: false, duration: 1.4, stage: { sky: 'dusk', bloom: 0.3, view: { pos: [1.5, 1.2, 4.6], target: [1.5, 0.8, 0], fov: 40 } },
    build(fx) {
      const L = 3.4, S = 44;
      const pose = (sp, t) => { // sp 0..1 along the vine
        const rx = -0.25 * sp + 0.45 * Math.sin(sp * Math.PI * 0.95), ry = 2.0 * Math.pow(sp, 0.85) - 0.2 * Math.sin(sp * 7) * sp, rz = 0.12 * Math.sin(sp * 5);
        const lash = Math.exp(-Math.pow((t - 0.55) * 5, 2)), ex = L * sp, ey = 0.55 * Math.sin(sp * 2.6) * (1 - 0.3 * sp) + 0.06 + 0.16 * Math.sin(sp * 22 - t * 46) * sp * lash, ez = 0.1 * Math.sin(sp * 9 - t * 30) * sp * lash;
        const k = sm(0.38 + 0.18 * sp, 0.5 + 0.2 * sp, t); return [rx + (ex - rx) * k, ry + (ey - ry) * k, rz + (ez - rz) * k];
      };
      const gf = (t) => sm(0.0, 0.32, t) * (1 - sm(0.85, 1.35, t)), mat = new THREE.MeshStandardMaterial({ color: '#2f7a22', roughness: 0.55, emissive: '#1a5a10', emissiveIntensity: 0.3 }), tm = new THREE.MeshStandardMaterial({ color: '#d8d8a0', roughness: 0.4, flatShading: true });
      const vine = tube(S, 8, mat), pts = mkPts(S), g = new THREE.Group(); g.add(vine); const NT = 13, thorns = []; const tg = spikeGeo(0.022, 0.09, fx.rng, 4, 0.1);
      for (let i = 0; i < NT; i++) { const m = new THREE.Mesh(tg, tm); g.add(m); thorns.push(m); }
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({ color: '#8aff50', emissive: '#6aff30', emissiveIntensity: 0.9 })); g.add(tip);
      const up = new THREE.Vector3(0, 1, 0), T = new THREE.Vector3(), Nn = new THREE.Vector3(), Dd = new THREE.Vector3();
      fx.mesh(g, (t) => {
        const gv = gf(t); vine.visible = gv > 0.01; for (let k = 0; k <= S; k++) { const p = pose((k / S) * Math.max(0.001, gv), t); pts[k][0] = p[0]; pts[k][1] = p[1] - (1 - sm(0, 0.15, t)) * 0.05 - sm(1.1, 1.4, t) * 0.0; pts[k][2] = p[2]; }
        vine.userData.set(pts, (u) => (0.075 * Math.pow(1 - u, 0.8) + 0.016));
        thorns.forEach((m, i) => { const k = Math.floor(((i + 1) / (NT + 1)) * S), a = pts[k], b = pts[Math.min(S, k + 1)], c = pts[Math.max(0, k - 1)]; T.set(b[0] - c[0], b[1] - c[1], b[2] - c[2]).normalize(); Nn.crossVectors(T, new THREE.Vector3(0, 0, 1)).normalize(); const sd = i % 2 ? 1 : -1; Dd.copy(Nn).multiplyScalar(0.55 * sd).addScaledVector(new THREE.Vector3(0, 0, 1), 0.7 * (i % 3 - 1)).addScaledVector(T, -0.25).normalize(); const r = 0.06 * Math.pow(1 - (i + 1) / (NT + 1), 0.8) + 0.012; m.position.set(a[0] + Dd.x * r * 0.8, a[1] + Dd.y * r * 0.8, a[2] + Dd.z * r * 0.8); m.quaternion.setFromUnitVectors(up, Dd); m.visible = vine.visible; m.scale.setScalar(0.6 + 1.2 * (1 - (i + 1) / (NT + 1))); });
        tip.position.set(pts[S][0], pts[S][1], pts[S][2]); tip.visible = vine.visible;
      }, { dur: 99 });
      const tipAt = (t) => { const p = pose(Math.max(0.001, gf(t)), t); return [p[0], p[1], p[2]]; };
      fx.trail({ path: tipAt, len: 0.14, width: 0.1, n: 28, t0: 0.4, dur: 0.45, fade: [0.02, 0.1], intensity: 0.9, ramp: [[0, '#f4ffd0'], [0.4, '#8aff50'], [1, '#1a5a10']] });
      fx.flash(0.66, 0.1, '#e8ffc0', 0.25); fx.shake(0.66, 0.25, 0.06);
      const cp = pose(1, 0.9);
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [cp[0], cp[1], 0], size: [1.0, 0.2], life: [0.18, 0.18], ramp: [[0, '#fff'], [1, '#9f6', 0]], intensity: 4, delay: 0.64 });
      fx.ring({ t0: 0.64, dur: 0.35, r: [0.05, 1.0], width: [0.12, 0.02], normal: 'cam', pos: [cp[0], cp[1], 0], intensity: 1.4, ramp: [[0, '#fff'], [0.4, '#c8ff90'], [1, '#4aa030']] });
      fx.emitter({ count: 50, kind: 'dust', blend: 'normal', shape: 'point', pos: [cp[0], 0.06, 0], dir: [0, 1, 0], spread: 1.3, speed: [0.5, 2], life: [0.6, 1.1], size: [0.2, 0.7], ramp: DUST(0.5, '#7a6a50'), lit: 1, delay: 0.64, drag: 1.5, order: -1 });
      fx.emitter({ count: 30, kind: 'petal', shape: 'point', pos: [cp[0], cp[1], 0], dir: [0, 1, 0], spread: 1.4, speed: [1, 3.5], life: [0.6, 1.2], size: [0.07, 0.05], rot: 6, ramp: [[0, '#8aff50', 1], [1, '#2a7a18', 0]], delay: 0.64, gravity: [0, -3, 0], drag: 1 });
      fx.emitter({ count: 40, kind: 'dust', blend: 'normal', shape: 'point', pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.3, 1.2], life: [0.5, 1], size: [0.15, 0.5], ramp: DUST(0.4, '#6a5440'), lit: 1, delay: 0.05, emit: 0.4, order: -1 });
      fx.emitter({ count: 24, kind: 'dust', blend: 'normal', shape: 'point', pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.3, 1.2], life: [0.5, 1], size: [0.15, 0.5], ramp: DUST(0.4, '#6a5440'), lit: 1, delay: 1.0, emit: 0.35, order: -1 });
      fx.decal({ kind: 'cracks', t0: 0.0, dur: 1.4, r: [0.7, 0.8], fade: [0.05, 0.5], reveal: 0.3, cells: 4, heat: [0.5, 0], pos: [0, 0.006, 0], ramp: [[0, '#100a05'], [0.5, '#3a7a20'], [1, '#9aff60']], intensity: 1 });
      fx.light({ color: '#9aff60', intensity: 30, pos: [1.8, 1.2, 1], range: 6, t0: 0.55, dur: 0.4, fade: [0.02, 0.3] });
    } },
];
