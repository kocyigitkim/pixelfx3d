import * as THREE from 'three';
import { NOISE } from '../core/glsl.js';
import { Dummy } from '../core/dummy.js';

/* ---------------------------------------------------------------- helpers (local to this category) */
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const fr = (x) => x - Math.floor(x);
const TAU = Math.PI * 2;
const VIEW = { pos: [2.5, 1.7, 3.9], target: [0, 1.2, 0], fov: 40 };
const BODY = (sky = 'dusk', bloom = 0.4) => ({ sky, bloom, view: VIEW });

const _g = {};
function glyph(ch, fill = '#fff', stroke = '#000', size = 0.3) { // canvas text sprite (normal blend, drawn on top)
  const key = ch + fill + stroke; let tex = _g[key];
  if (!tex) { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.font = '900 96px "Arial Black", Impact, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineWidth = 14; x.strokeStyle = stroke; x.strokeText(ch, 64, 70); x.fillStyle = fill; x.fillText(ch, 64, 70); tex = _g[key] = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false })); s.scale.setScalar(size); s.renderOrder = 40; s.frustumCulled = false; return s;
}
const _h = {};
function halo(color, size, hdr = 1.5) {
  if (!_h.tex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _h.tex = new THREE.CanvasTexture(c); }
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: _h.tex, color: new THREE.Color(color).multiplyScalar(hdr), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false })); s.scale.setScalar(size); s.renderOrder = 30; s.frustumCulled = false; return s;
}
function heartGeo() {
  const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.1, -0.38, -0.5, -0.12, -0.5, 0.18); s.bezierCurveTo(-0.5, 0.45, -0.18, 0.52, 0, 0.28); s.bezierCurveTo(0.18, 0.52, 0.5, 0.45, 0.5, 0.18); s.bezierCurveTo(0.5, -0.12, 0.1, -0.38, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.09, bevelSegments: 5, curveSegments: 24 }); g.center(); return g;
}
function starGeo(R = 0.5, r = 0.22) {
  const s = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU + Math.PI / 2, rr = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }); g.center(); return g;
}
function skull(glow = '#9a5cff', hdr = 3) {
  const g = new THREE.Group(), bone = new THREE.MeshStandardMaterial({ color: '#cfc8b4', roughness: 0.55, emissive: glow, emissiveIntensity: 0.2 }), dark = new THREE.MeshBasicMaterial({ color: '#030106' }), eg = new THREE.MeshBasicMaterial({ color: new THREE.Color(glow).multiplyScalar(hdr), toneMapped: false });
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, par = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); par.add(m); return m; };
  add(new THREE.SphereGeometry(0.5, 20, 16), bone, 0, 0.08, 0, 1, 1.02, 0.98); add(new THREE.SphereGeometry(0.34, 16, 12), bone, 0, -0.33, 0.17, 0.95, 0.78, 0.85);
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.15, 14, 10), dark, 0.2 * s, -0.12, 0.38, 1, 1.15, 0.7); add(new THREE.SphereGeometry(0.06, 10, 8), eg, 0.2 * s, -0.12, 0.45); }
  const jaw = new THREE.Group(); jaw.position.set(0, -0.5, 0); g.add(jaw); add(new THREE.SphereGeometry(0.3, 14, 10), bone, 0, -0.1, 0.2, 0.92, 0.36, 0.85, jaw);
  for (let i = -3; i <= 3; i++) add(new THREE.BoxGeometry(0.065, 0.085, 0.05), bone, i * 0.075, -0.505, 0.5 - Math.abs(i) * 0.03);
  g.userData.jaw = jaw; g.userData.bone = bone; return g;
}
/** P5 dummy point -> this rig: y mapped piecewise through P5 feet/hips/chest/head (0/.95/1.25/1.73) onto the rig anchors, x/z kept. Body points only (y <= ~1.75). */
const rig = (fx) => { const o = [0, 0.95, 1.25, 1.73], h = [0, fx.anchor('hips')[1], fx.anchor('chest')[1], fx.anchor('head')[1]];
  return ([x, y, z]) => { let i = 1; while (i < 3 && y > o[i]) i++; return [x, h[i - 1] + ((h[i] - h[i - 1]) * (y - o[i - 1])) / (o[i] - o[i - 1]), z]; }; };
/** head point from a P5 head-relative offset (P5 head radius .115), scaled to this rig's head */
const headAt = (fx, x, y, z) => fx.anchor('head', 0, [x, y, z].map((v) => (v * fx.body.headR) / 0.115));
/** little eyes on the dummy's face (+X); P5 sizes scaled by k = headR / .115; hides the knight helmet. returns the pupils */
function eyes(fx, open) {
  const hm = fx.body.headMesh, k = fx.body.headR / 0.115, out = []; const white = new THREE.MeshBasicMaterial({ color: '#f4f4f4' }), blk = new THREE.MeshBasicMaterial({ color: '#0a0a0e' });
  const helm = fx.body.model.getObjectByName('Knight_Helmet'); if (helm) helm.visible = false;
  for (const s of [-1, 1]) {
    if (open) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.03 * k, 12, 10), white); e.position.set(0.1 * k, 0.02 * k, 0.045 * k * s); e.scale.set(0.6, 1, 1); hm.add(e); const p = new THREE.Mesh(new THREE.SphereGeometry(0.015 * k, 10, 8), blk); p.position.set(0.026 * k, 0, 0); e.add(p); out.push(p); }
    else { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.003 * k, 0.03 * k, 3, 6), blk); e.position.set(0.114 * k, 0.012 * k, 0.045 * k * s); e.rotation.x = Math.PI / 2; e.scale.set(1.2, 1, 1); hm.add(e); }
  }
  return out;
}
const beat = (t, per, k = 7) => { const p = ((t % per) + per) % per; return Math.exp(-p * k) + 0.55 * Math.exp(-Math.max(0, p - per * 0.28) * k) * sm(per * 0.28, per * 0.3, p); };
const SMOKE = (a = 0.5, c = '#120a1c', c2 = '#2a1745') => [[0, c2, 0], [0.18, c2, a], [0.6, c, a * 0.7], [1, '#05020a', 0]];

export default [
  /* ===================================================================== bleeding */
  { id: 'status/bleeding', name: 'Bleeding', category: 'status', loop: true, duration: 2.4, body: true, stage: BODY('dusk', 0.35),
    build(fx) {
      const R = rig(fx), W = [[0.03, 1.33, 0.2], [0.02, 1.5, 0.26], [0.06, 0.78, 0.14]]; // P5 wounds, mapped by R // anchor-ok
      const pts = [[0.2, 0.8], [0.1, 0.5], [-0.15, 0.3], [0.0, 0.7]];
      fx.water({ r: 0.95, deep: '#1a0204', shallow: '#6a0a10', sky: '#8a3a40', horizon: '#c0707a', y: 0.012, waves: 0.3, ripples: (t) => { const o = []; for (let k = 0; k < 8; k++) { const T = k * 0.3; o.push({ t: t - ((t - T) % 2.4 + 2.4) % 2.4, x: Math.cos(k * 2.4) * 0.16 + 0.03, z: Math.sin(k * 2.4) * 0.16 + 0.1, amp: 0.035 }); } return o; }, width: 40, decay: 1.6 });
      W.forEach((w0, i) => { const w = R(w0);
        fx.emitter({ count: 9, kind: 'drop', blend: 'normal', shape: 'point', pos: w, dir: [0, -1, 0], spread: 0.08, speed: [0.1, 0.3], life: [0.5, 0.65], gravity: [0, -7, 0], size: [0.09, 0.07], ramp: [[0, '#b01018'], [1, '#600008', 1]], lit: 1, delay: i * 0.1, emit: 2.4, aspect: 1.5 });
        fx.emitter({ count: 5, kind: 'soft', shape: 'point', pos: w, dir: [0, -1, 0], spread: 0.4, speed: [0, 0.2], life: [0.3, 0.5], size: [0.07, 0.02], ramp: [[0, '#ff4048', 0.9], [1, '#800010', 0]], intensity: 0.7, delay: i * 0.1, emit: 2.4 });
        const pts2 = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts2.push(R([w0[0] + Math.sin(u * 5 + i) * 0.012, w0[1] - u * [0.45, 0.4, 0.55][i], w0[2] - u * 0.01])); }
        fx.ribbon({ points: pts2, n: 12, width: (u) => 0.012 * (1 - 0.6 * u), blend: 'normal', core: 1, intensity: 0.5, ramp: [[0, '#a00c14'], [1, '#400006']], sweep: [0, 1], tail: 1 });
      });
      fx.light({ color: '#ff2030', intensity: 12, pos: [0.6, 1.2, 0.9], range: 5, env: (t) => 0.4 + beat(t, 0.8) });
      fx.on((t) => { const b = beat(t, 0.8, 8); fx.body.set({ tint: '#a8101c', tintAmt: 0.5 * b + 0.1, rim: '#ff2a3a', rimAmt: 1.2 * b + 0.1, glow: 0.6 * b }); });
    } },

  /* ===================================================================== burning */
  { id: 'status/burning', name: 'Burning', category: 'status', loop: true, duration: 1.2, body: true, stage: BODY('night', 0.5),
    build(fx) {
      const fl = (o) => fx.emitter({ kind: 'flame', dir: [0, 1, 0], spread: 0.25, speed: [0.3, 0.8], life: [0.5, 0.9], aspect: 1.5, ramp: [[0, '#ffd890', 1], [0.25, '#ff9020', 0.9], [0.7, '#d83a08', 0.5], [1, '#300', 0]], intensity: 0.3, turb: [0.15, 2], ...o });
      fl({ count: 60, shape: 'box', shapeSize: [0.1, 0.45, 0.2], pos: fx.anchor('chest'), size: [0.45, 0.12] });
      fl({ count: 20, shape: 'sphere', radius: 0.5 * fx.body.headR, pos: fx.anchor('head', 0, [0, 0.5 * fx.body.headR, 0]), size: [0.45, 0.1] });
      fl({ count: 22, shape: 'box', shapeSize: [0.08, 0.4, 0.14], pos: rig(fx)([0, 0.45, 0]), size: [0.36, 0.08] }); // anchor-ok
      fl({ count: 16, shape: 'sphere', radius: 0.06, pos: [0.0, 1.2, 0.5], size: [0.2, 0.05], speed: [0.2, 0.5] }); fl({ count: 16, shape: 'sphere', radius: 0.06, pos: [0.0, 1.2, -0.5], size: [0.2, 0.05], speed: [0.2, 0.5] });
      fx.emitter({ count: 40, kind: 'spark', shape: 'box', shapeSize: [0.2, 0.8, 0.25], pos: [0, 1.0, 0], dir: [0, 1, 0], spread: 0.7, speed: [0.5, 1.8], life: [0.6, 1.2], gravity: [0, 0.6, 0], size: [0.04, 0.012], stretch: 0.6, ramp: [[0, '#fff0c0'], [0.4, '#ff8a20'], [1, '#400', 0]], intensity: 1.5, turb: [0.3, 1.5] }); // anchor-ok
      fx.emitter({ count: 26, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.3, pos: [0, 1.6, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1], life: [1.0, 1.2], size: [0.3, 1.2], ramp: [[0, '#2a2622', 0], [0.2, '#403a34', 0.3], [1, '#15130f', 0]], lit: 1, order: -1 }); // anchor-ok
      fx.decal({ kind: 'scorch', r: [1.2, 1.2], intensity: 1, heat: [0.7, 0.7], alpha: 0.7, ramp: [[0, '#1a1410'], [0.5, '#f40'], [1, '#fc8']] });
      fx.light({ color: '#ff8a30', intensity: 22, pos: [0.4, 1.1, 0.6], range: 8, flicker: 0.4, rate: 14 });
      fx.on((t) => { const f = 0.5 + 0.5 * Math.sin(t / 1.2 * TAU * 2), hot = Math.exp(-((t % 0.6)) * 7); fx.body.set({ tint: '#2a1208', tintAmt: 0.5 + 0.1 * f, emit: new THREE.Color(1, 0.3, 0.05).multiplyScalar(0.06 + 0.2 * hot + 0.05 * f), rim: '#ff7a20', rimAmt: 1.6, glow: 0.8 }); });
    } },

  /* ===================================================================== charmed */
  { id: 'status/charmed', name: 'Charmed', category: 'status', loop: true, duration: 2.4, body: true, stage: BODY('dusk', 0.45),
    build(fx) {
      const hm = new THREE.MeshPhysicalMaterial({ color: '#ff3f86', roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, emissive: '#ff2468', emissiveIntensity: 0.4, metalness: 0.05 });
      const H = new THREE.Mesh(heartGeo(), hm); const hg = new THREE.Group(); hg.add(H); const hh = halo('#ff5a9a', 1.8, 1.0); hg.add(hh);
      fx.mesh(hg, (t, pr, f, w, o) => { const b = beat(t, 0.8, 9); const s = 0.3 * (1 + 0.22 * b); H.scale.setScalar(s); H.rotation.y = Math.sin(t * TAU / 2.4) * 0.5 + 0.3; hm.emissiveIntensity = 0.25 + 0.9 * b; hh.material.opacity = 0.3 + 0.5 * b; hh.scale.setScalar(1.3 + 0.5 * b); o.position.set(0, 2.38 + 0.03 * Math.sin(t * TAU / 2.4 * 2), 0); }, { dur: 99 });
      for (let k = 0; k < 3; k++) fx.ring({ t0: 0.8 * k, dur: 0.8, r: [0.2, 0.8], width: [0.1, 0.02], normal: 'cam', pos: [0, 2.38, 0], intensity: 1.0, breakup: 0.1, ramp: [[0, '#fff2dc'], [0.4, '#ff8ab8'], [1, '#c01858']] });
      for (let i = 0; i < 6; i++) { const sp = glyph('♥', '#ff5a9a', '#7a1038', 0.2), ph = i / 6, a0 = i * 2.1; fx.mesh(sp, (t, pr, f, w, o) => { const u = fr(t / 2.4 + ph), a = a0 + u * 2; o.position.set(Math.cos(a) * 0.45, 0.9 + u * 1.5, Math.sin(a) * 0.45); const s = 0.1 + 0.16 * Math.sin(u * Math.PI); o.scale.setScalar(s); o.material.opacity = Math.sin(u * Math.PI); }, { dur: 99 }); }
      fx.emitter({ count: 30, kind: 'soft', shape: 'box', shapeSize: [0.3, 0.8, 0.3], pos: [0, 1.0, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.2, 0.6], life: [1, 1.8], size: [0.06, 0.01], ramp: [[0, '#ffe0f0', 1], [0.4, '#ff6aa8', 0.6], [1, '#800040', 0]], intensity: 1.5, turb: [0.2, 1] }); // anchor-ok
      fx.decal({ kind: 'glow', r: [1.1, 1.1], intensity: 0.8, alpha: 0.6, ramp: [[0, '#000'], [0.5, '#8a1a50'], [1, '#ff6aa8']] });
      fx.light({ color: '#ff5a9a', intensity: 18, pos: [0.4, 2.0, 0.8], range: 6, env: (t) => 0.5 + 0.5 * beat(t, 0.8) });
      fx.on((t) => { const b = beat(t, 0.8, 9); fx.body.set({ tint: '#ff8ab8', tintAmt: 0.22 + 0.1 * b, rim: '#ff5a9a', rimAmt: 1 + b * 0.8, glow: 0.4 + 0.3 * b }); });
    } },

  /* ===================================================================== confused */
  { id: 'status/confused', name: 'Confused', category: 'status', loop: true, duration: 2.4, body: true, stage: BODY('day', 0.35),
    build(fx) {
      const pp = eyes(fx, true);
      const N = 64; fx.ribbon({ n: N, blend: 'add', intensity: 1.5, core: 4, tail: 1, ramp: [[0, '#e8f2ff'], [0.4, '#7ad0ff'], [1, '#6a40ff']], head: () => 1.001, width: (u) => 0.03 * (0.4 + u),
        points: (t) => { const o = [], ph = t / 2.4 * TAU; for (let i = 0; i <= N; i++) { const u = i / N, a = u * TAU * 2.6 - ph * 1.0, r = 0.04 + 0.3 * u; const x = Math.cos(a) * r, z = Math.sin(a) * r; o.push([x, 2.1 + z * 0.55, z * 0.83]); } return o; } });
      fx.emitter({ count: 18, kind: 'glint', shape: 'ring', radius: 0.3, radiusIn: 0.05, pos: [0, 2.12, 0], dir: [0, 0.5, 0], spread: 0.5, speed: [0.05, 0.3], life: [0.5, 1], size: [0.14, 0.03], ramp: [[0, '#fff', 0], [0.4, '#aee', 1], [1, '#fff', 0]], intensity: 1.5 });
      for (let i = 0; i < 3; i++) { const q = glyph('?', '#ffe45a', '#6a4a00', 0.34); fx.mesh(q, (t, pr, f, w, o) => { const a = (t / 2.4 + i / 3) * TAU, bob = Math.sin(a * 2 + i) * 0.07; o.position.set(Math.cos(a) * 0.42, 2.18 + bob, Math.sin(a) * 0.42); o.scale.setScalar(0.3 + 0.05 * Math.sin(a * 3 + i)); }, { dur: 99 }); }
      fx.light({ color: '#8ad0ff', intensity: 8, pos: [0, 2.3, 0.4], range: 4 });
      const hd = fx.body.neck, tor = fx.body.torso;
      fx.on((t) => { const a = t / 2.4 * TAU; hd.rotation.y = Math.sin(a) * 0.5; hd.rotation.x = Math.sin(a * 2) * 0.08; tor.rotation.z = -0.02 + Math.sin(a * 2 + 1) * 0.05; tor.rotation.x = Math.sin(a) * 0.04;
        const dart = Math.sin(a * 4); pp.forEach((p) => { p.position.z = dart * 0.012; p.position.y = Math.cos(a * 3) * 0.008; });
        fx.body.set({ rim: '#7ad0ff', rimAmt: 0.6, tint: '#aab8ff', tintAmt: 0.08 }); });
    } },

  /* ===================================================================== cursed */
  { id: 'status/cursed', name: 'Cursed', category: 'status', loop: true, duration: 2.4, body: true, stage: BODY('dark', 0.5),
    build(fx) {
      const sk = skull('#a45cff', 3.5); const h = halo('#8a40ff', 1, 1.0); sk.add(h); h.position.z = -0.2; h.scale.setScalar(2.4);
      fx.mesh(sk, (t, pr, f, w, o, ta) => { const fl = Math.sin(t * 17) * Math.sin(t * 5.3) > 0.55 ? 0.2 : 1; o.position.set(0, 2.3 + 0.04 * Math.sin(t * TAU / 2.4), 0); o.rotation.y = Math.PI / 2 + Math.sin(t * 2.6) * 0.2; o.scale.setScalar(0.24 * (0.9 + 0.1 * fl)); sk.userData.jaw.rotation.x = 0.1 + 0.15 * Math.max(0, Math.sin(t * 11)); sk.userData.bone.emissiveIntensity = 0.2 + 0.8 * fl * (0.5 + 0.5 * Math.sin(t * TAU / 2.4 * 2)); h.material.opacity = 0.3 * fl; }, { dur: 99 });
      fx.emitter({ count: 60, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [0.2, 0.85, 0.2], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.3, 0.8], life: [1.2, 2], size: [0.3, 0.9], ramp: SMOKE(0.45), lit: 1, turb: [0.3, 0.7], order: -1, gravity: [0, 0.3, 0] }); // anchor-ok
      fx.emitter({ count: 40, kind: 'soft', shape: 'box', shapeSize: [0.25, 0.9, 0.25], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.2, 0.7], life: [1, 1.8], size: [0.05, 0.01], ramp: [[0, '#e0c0ff', 1], [1, '#5a20b0', 0]], intensity: 1.5, turb: [0.2, 1] }); // anchor-ok
      fx.decal({ kind: 'rune', r: [1.3, 1.3], glyphs: 14, poly: 5, spin: 0.25, intensity: 1.2, growSpeed: 100, ramp: [[0, '#10001a'], [0.5, '#7a30d8'], [1, '#e0c0ff']], alpha: 0.8 });
      fx.light({ color: '#8a40ff', intensity: 20, pos: [0.6, 1.5, 1], range: 6, flicker: 0.2 });
      fx.on((t) => { const s = fr(t / 2.4); fx.body.set({ tint: '#3a1070', tintAmt: 0.55, rim: '#9a5cff', rimAmt: 1.5, glow: 0.5, scan: -0.1 + s * 2.1, scanCol: '#8a40ff', emit: new THREE.Color('#5a20b0').multiplyScalar(0.12 + 0.1 * Math.sin(t * TAU / 2.4 * 2)) }); });
    } },

  /* ===================================================================== frozen */
  { id: 'status/frozen', name: 'Frozen', category: 'status', loop: true, duration: 2, body: true, stage: BODY('day', 0.4),
    build(fx) {
      const ice = new THREE.MeshPhysicalMaterial({ color: '#cdeaff', roughness: 0.06, metalness: 0, transparent: true, opacity: 0.85, clearcoat: 1, emissive: '#2a6aa0', emissiveIntensity: 0.25 });
      const R = rig(fx), ic = [[0.04, 0.88, 0.3, 0.26], [-0.05, 0.9, -0.3, 0.2], [0.1, 1.46, 0.27, 0.16], [0.0, 1.46, -0.27, 0.14], [0.1, 1.55, 0.17, 0.12], [0.12, 0.62, 0.12, 0.17], [0.0, 0.62, -0.12, 0.14]].map((q) => [...R(q), q[3]]); const g = new THREE.Group(); // P5 icicle roots mapped onto this rig
      ic.forEach((q) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.022 + q[3] * 0.05, q[3], 6), ice); m.rotation.x = Math.PI; m.position.set(q[0], q[1] - q[3] / 2, q[2]); g.add(m); });
      fx.mesh(g, null, { dur: 99 });
      ic.slice(0, 5).forEach((q, i) => fx.emitter({ count: 3, kind: 'drop', shape: 'point', pos: [q[0], q[1] - q[3], q[2]], dir: [0, -1, 0], spread: 0.02, speed: [0, 0.1], life: [0.5, 0.6], gravity: [0, -8, 0], size: [0.03, 0.025], ramp: [[0, '#d8f4ff'], [1, '#80c0ff', 0.8]], intensity: 1.5, delay: i * 0.2, emit: 2, bounce: -1 }));
      fx.emitter({ count: 14, kind: 'smoke', blend: 'normal', shape: 'point', pos: headAt(fx, 0.17, -0.09, 0), dir: [1, 0.25, 0], spread: 0.3, speed: [0.2, 0.5], life: [1.0, 1.6], size: [0.1, 0.45], ramp: [[0, '#b6c0c8', 0], [0.2, '#b6c0c8', 0.35], [1, '#9db0c0', 0]], lit: 1, emit: 2, turb: [0.1, 1], order: 3 });
      fx.emitter({ count: 70, kind: 'flake', shape: 'box', shapeSize: [1.2, 0.05, 1.2], pos: [0, 2.8, 0], dir: [0, -1, 0], spread: 0.2, speed: [0.1, 0.35], life: [2, 3], size: [0.045, 0.045], rot: 2, ramp: [[0, '#e8f2ff', 0], [0.15, '#fff', 1], [0.8, '#d8f0ff', 1], [1, '#d8f0ff', 0]], intensity: 1.2, turb: [0.15, 0.5], floorFade: 0.1 });
      fx.decal({ kind: 'frost', r: [1.3, 1.3], cells: 5, growSpeed: 100, alpha: 0.9, intensity: 1 });
      fx.emitter({ count: 22, kind: 'glint', shape: 'box', shapeSize: [0.2, 0.8, 0.25], pos: [0, 1.0, 0], speed: [0, 0.05], life: [0.5, 1], size: [0.1, 0.02], ramp: [[0, '#fff', 0], [0.5, '#cfeaff', 1], [1, '#fff', 0]], intensity: 1.5 }); // anchor-ok
      fx.light({ color: '#8ac8ff', intensity: 20, pos: [0.8, 1.5, 1], range: 6 });
      fx.on((t) => { const p = 0.5 + 0.5 * Math.sin(t / 2 * TAU); fx.body.set({ frost: 1.0, tint: '#7ab8e8', tintAmt: 0.5, rim: '#aee0ff', rimAmt: 1.3 + 0.3 * p, glow: 0.3 }); });
    } },

  /* ===================================================================== haste */
  { id: 'status/haste', name: 'Haste', category: 'status', loop: true, duration: 1.2, body: true, stage: { sky: 'day', bloom: 0.35, view: { pos: [1.2, 1.4, 4.4], target: [-0.2, 1.0, 0], fov: 38 } },
    build(fx) {
      const ghosts = [];
      for (let i = 1; i <= 3; i++) { const d = new Dummy({ color: '#ffd24a' }); d.position.x = -0.42 * i; d.u.uHolo.value = 1; d.u.uScanCol.value.set('#ffcf40'); d.u.uAlpha.value = 0.5 - i * 0.12; d.u.uTint.value.set('#ffd24a'); d.u.uTintAmt.value = 0.6; d.u.uGlow.value = 1; ghosts.push(d); fx.mesh(d, null, { dur: 99 }); }
      const bobP = (t) => ({ clip: 'Running_A', time: fr(t / 0.6) * 0.8 }); // run cycle, one stride per 0.6 s
      fx.emitter({ count: 40, kind: 'streak', shape: 'box', shapeSize: [0.4, 0.9, 0.9], pos: [-0.8, 1.0, 0], dir: [-1, 0, 0], spread: 0.02, speed: [6, 9], life: [0.3, 0.45], size: [0.3, 0.3], ramp: [[0, '#fff6c0', 0], [0.3, '#ffe070', 0.8], [1, '#ffc020', 0]], intensity: 0.8, stretch: 0 });
      fx.emitter({ count: 30, kind: 'dust', blend: 'normal', shape: 'box', shapeSize: [0.1, 0.02, 0.15], pos: [-0.1, 0.05, 0], dir: [-1, 0.5, 0], spread: 0.5, speed: [0.8, 2], life: [0.5, 0.9], size: [0.15, 0.5], ramp: [[0, '#5b503f', 0], [0.2, '#5b503f', 0.5], [1, '#453b2c', 0]], lit: 1, order: -1, gravity: [0, 0.2, 0], drag: 1.5 });
      fx.emitter({ count: 26, kind: 'spark', shape: 'box', shapeSize: [0.2, 0.9, 0.3], pos: [-0.2, 1.0, 0], dir: [-1, 0.1, 0], spread: 0.3, speed: [2, 4], life: [0.3, 0.6], size: [0.05, 0.01], stretch: 1.5, ramp: [[0, '#fff2dc'], [0.4, '#ffd040'], [1, '#a05000', 0]], intensity: 3 }); // anchor-ok
      fx.light({ color: '#ffd24a', intensity: 14, pos: [-0.4, 1.4, 1.2], range: 5 });
      fx.on((t) => { fx.body.setPose(bobP(t)); ghosts.forEach((d, i) => { d.setPose(bobP(t - 0.06 * (i + 1))); d.u.uTime.value = t; }); fx.body.set({ rim: '#ffd24a', rimAmt: 1.2, tint: '#ffe060', tintAmt: 0.1, glow: 0.4 }); });
    } },

  /* ===================================================================== petrified */
  { id: 'status/petrified', name: 'Petrified', category: 'status', loop: false, duration: 3.8, body: true, stage: BODY('dusk', 0.3),
    build(fx) {
      const R = rig(fx), cr = (pts, t0) => fx.ribbon({ points: pts.map(R), n: pts.length - 1, width: 0.012, blend: 'normal', core: 1, intensity: 0.6, ramp: [[0, '#101010'], [1, '#2a2a2a']], t0, dur: 3.8 - t0, sweep: [0, 1.1], tail: 1.2 }); // P5 crack paths mapped onto this rig
      cr([[0.02, 1.7, 0.1], [0.03, 1.55, 0.14], [0.0, 1.45, 0.2], [0.03, 1.3, 0.19], [0.0, 1.1, 0.14], [0.04, 0.95, 0.12]], 1.9); // anchor-ok
      cr([[0.02, 1.45, 0.21], [0.02, 1.4, 0.3], [0.0, 1.3, 0.38], [0.0, 1.15, 0.43]], 2.05); cr([[0.05, 0.8, 0.12], [0.04, 0.6, 0.1], [0.06, 0.45, 0.14], [0.05, 0.2, 0.1]], 2.2); // anchor-ok
      fx.emitter({ count: 50, kind: 'dust', blend: 'normal', shape: 'disc', radius: 0.35, pos: [0, 0.06, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.2, 0.6], life: [0.8, 1.4], size: [0.2, 0.6], ramp: [[0, '#53514d', 0], [0.2, '#53514d', 0.45], [1, '#403d3a', 0]], lit: 1, order: -1, delay: 0.15, emit: 1.7, drag: 0.8 });
      fx.emitter({ count: 70, kind: 'rock', blend: 'normal', shape: 'box', shapeSize: [0.18, 0.85, 0.22], pos: [0, 0.95, 0], dir: [0, 0.4, 0], spread: 1.3, speed: [1.2, 4], life: [1.2, 1.8], gravity: [0, -9.8, 0], size: [0.13, 0.08], ramp: [[0, '#8a8782'], [1, '#8a8782', 1]], lit: 1, bounce: 0.3, rot: 5, radial: 0.8, delay: 2.75, t0: 2.74 }); // anchor-ok
      fx.emitter({ count: 70, kind: 'dust', blend: 'normal', shape: 'box', shapeSize: [0.2, 0.8, 0.25], pos: [0, 0.95, 0], dir: [0, 0.3, 0], spread: 1.4, speed: [0.6, 2.2], life: [1.0, 1.6], size: [0.4, 1.5], ramp: [[0, '#53514d', 0], [0.15, '#53514d', 0.6], [1, '#393733', 0]], lit: 1, order: -1, delay: 2.75, drag: 1.4, radial: 0.8, t0: 2.74 }); // anchor-ok
      fx.emitter({ count: 40, kind: 'shard', blend: 'normal', shape: 'box', shapeSize: [0.15, 0.8, 0.2], pos: [0, 0.95, 0], dir: [0, 0.5, 0], spread: 1.4, speed: [2, 6], life: [0.8, 1.4], gravity: [0, -9.8, 0], size: [0.06, 0.04], ramp: [[0, '#aaa59e'], [1, '#aaa59e', 1]], lit: 1, rot: 8, bounce: 0.3, delay: 2.75, t0: 2.74 }); // anchor-ok
      fx.shake(2.75, 0.5, 0.05);
      fx.light({ color: '#cfd4da', intensity: 10, pos: [1, 1.5, 1.5], range: 6 });
      fx.on((t) => { const s = sm(0.2, 1.9, t); const shake = sm(2.2, 2.7, t) * (t < 2.75 ? 1 : 0); fx.body.torso.position.x = Math.sin(t * 90) * 0.004 * shake; fx.body.set({ stone: s, tint: '#7a7468', tintAmt: 0.45 * s, alpha: t > 2.75 ? 0 : 1, rim: '#bcc4cc', rimAmt: 0.25 * s }); });
    } },

  /* ===================================================================== poisoned */
  { id: 'status/poisoned', name: 'Poisoned', category: 'status', loop: true, duration: 1.6, body: true, stage: BODY('dusk', 0.4),
    build(fx) {
      fx.emitter({ count: 12, kind: 'drop', blend: 'normal', shape: 'point', pos: headAt(fx, 0.1, -0.11, 0.1), dir: [0, -0.2, 1], spread: 0.3, speed: [0.1, 0.4], life: [0.55, 0.9], gravity: [0, -6, 0], size: [0.04, 0.03], ramp: [[0, '#7aff30'], [1, '#2a8a10', 1]], lit: 0, intensity: 1.2, aspect: 1.5, emit: 1.6 });
      for (const [i, p] of [[0, [0.1, 1.38, 0.2]], [1, [0.02, 1.0, 0.16]], [2, [0.0, 0.62, 0.14]]]) fx.ring({ t0: 0.1 + i * 0.5, dur: 0.5, r: [0.03, 0.2], width: [0.03, 0.01], normal: 'cam', pos: rig(fx)(p), intensity: 1.2, breakup: 0.1, ramp: [[0, '#eaffc0'], [0.5, '#7aff30'], [1, '#2a8a10']] }); // anchor-ok
      fx.emitter({ count: 20, kind: 'bubble', shape: 'box', shapeSize: [0.2, 0.7, 0.25], pos: [0, 1.0, 0], dir: [0, 1, 0], spread: 0.4, speed: [0.2, 0.6], life: [0.8, 1.5], size: [0.05, 0.06], ramp: [[0, '#b0ff70', 0], [0.2, '#b0ff70', 1], [1, '#4aa820', 0]], intensity: 1.4 }); // anchor-ok
      fx.emitter({ count: 30, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.6, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.1, 0.4], life: [1.2, 1.8], size: [0.4, 1.1], ramp: [[0, '#1a3a0a', 0], [0.3, '#2a5a14', 0.35], [1, '#0a1a05', 0]], lit: 1, order: -1 });
      fx.decal({ kind: 'glow', r: [1.0, 1.0], intensity: 0.9, alpha: 0.7, ramp: [[0, '#000'], [0.5, '#1a5a0a'], [1, '#7aff30']] });
      fx.light({ color: '#7aff30', intensity: 18, pos: [0.6, 1.2, 1], range: 6, env: (t) => 0.7 + 0.3 * Math.sin(t / 1.6 * TAU) });
      fx.on((t) => { const w = fr(t / 1.6); fx.body.set({ tint: '#5ac020', tintAmt: 0.3 + 0.2 * Math.sin(t / 1.6 * TAU * 2), rim: '#9aff40', rimAmt: 1.1, glow: 0.5, scan: -0.1 + w * 2.1, scanCol: '#8aff30', emit: new THREE.Color('#2a8a10').multiplyScalar(0.12) }); });
    } },

  /* ===================================================================== rage */
  { id: 'status/rage', name: 'Rage', category: 'status', loop: true, duration: 1.2, body: true, stage: BODY('dusk', 0.45),
    build(fx) {
      const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); x.strokeStyle = '#e01020'; x.lineWidth = 15; x.lineCap = 'round'; x.shadowColor = '#600008'; x.shadowBlur = 4;
      for (const q of [0, 1, 2, 3]) { const sx = q % 2 ? 1 : -1, sy = q < 2 ? 1 : -1; x.beginPath(); x.moveTo(64 + sx * 14, 64 + sy * 14); x.quadraticCurveTo(64 + sx * 14, 64 + sy * 40, 64 + sx * 42, 64 + sy * 42); x.stroke(); x.beginPath(); x.moveTo(64 + sx * 14, 64 + sy * 14); x.quadraticCurveTo(64 + sx * 40, 64 + sy * 14, 64 + sx * 42, 64 + sy * 42); x.stroke(); }
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; const am = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, toneMapped: false })); am.renderOrder = 41;
      fx.mesh(am, (t, pr, f, w, o) => { const b = beat(t, 0.6, 9); o.position.set(0.05, 2.05, 0.2); o.scale.setScalar(0.4 * (1 + 0.5 * b)); o.material.rotation = Math.sin(t * 20) * 0.04; }, { dur: 99 });
      for (const s of [-1, 1]) fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', shape: 'point', pos: headAt(fx, 0, 0.01, 0.1 * s), dir: [0.2, 0.5, s], spread: 0.35, speed: [1.2, 2.2], life: [0.5, 0.8], size: [0.2, 0.7], ramp: [[0, '#c1bebb', 0], [0.15, '#c1bebb', 0.7], [1, '#97918b', 0]], lit: 1, turb: [0.1, 2], order: 3 });
      fx.emitter({ count: 20, kind: 'spark', shape: 'sphere', radius: 0.2, pos: rig(fx)([0, 1.4, 0]), dir: [0, 1, 0], spread: 1.5, speed: [1, 2.5], life: [0.3, 0.6], size: [0.04, 0.01], stretch: 1, ramp: [[0, '#ffe0a0'], [0.4, '#ff4020'], [1, '#600', 0]], intensity: 3 }); // anchor-ok
      fx.decal({ kind: 'cracks', r: [1.5, 1.5], cells: 4, growSpeed: 100, heat: [1, 1], intensity: 1.2, alpha: 0.9, ramp: [[0, '#400'], [0.5, '#f31'], [1, '#fb6']] });
      fx.decal({ kind: 'glow', r: [1.2, 1.2], intensity: 0.8, alpha: 0.6, ramp: [[0, '#000'], [0.5, '#8a0808'], [1, '#ff3a20']] });
      fx.light({ color: '#ff2a20', intensity: 15, pos: [0.6, 1.3, 1], range: 6, env: (t) => 0.4 + 0.8 * beat(t, 0.6, 9) });
      const tor = fx.body.torso, pel = fx.body.pelvis;
      fx.on((t) => { const b = beat(t, 0.6, 9), j = Math.sin(t * 95) * 0.5 + Math.sin(t * 61) * 0.5; tor.position.x = j * 0.006 * (0.3 + b); tor.position.z = Math.cos(t * 83) * 0.005 * (0.3 + b); tor.scale.setScalar(1 + 0.04 * b); pel.rotation.z = j * 0.01;
        fx.body.set({ tint: '#c01408', tintAmt: 0.45 + 0.25 * b, rim: '#ff3020', rimAmt: 1.2 + 1.2 * b, glow: 0.5 + 0.6 * b, emit: new THREE.Color('#ff2a10').multiplyScalar(0.12 * b) }); });
    } },

  /* ===================================================================== sleep */
  { id: 'status/sleep', name: 'Sleep', category: 'status', loop: true, duration: 2.4, body: true, stage: BODY('night', 0.4),
    build(fx) {
      eyes(fx, false);
      for (let i = 0; i < 3; i++) {
        const z = glyph('Z', '#cfe4ff', '#2a4a9a', 0.3);
        fx.mesh(z, (t, pr, f, w, o) => { const u = fr(t / 2.4 + i / 3); o.position.set(0.12 + u * 0.55, 1.95 + u * 0.75, 0.05 + Math.sin(u * 5 + i) * 0.1); o.scale.setScalar(0.12 + 0.34 * u); o.material.opacity = sm(0, 0.15, u) * (1 - sm(0.75, 1, u)); o.material.rotation = -0.2 + Math.sin(u * 6) * 0.15; }, { dur: 99 });
      }
      fx.emitter({ count: 20, kind: 'soft', shape: 'sphere', radius: 0.3, pos: [0, 1.3, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.05, 0.25], life: [1.5, 2.4], size: [0.04, 0.01], ramp: [[0, '#cfe4ff', 0], [0.4, '#a0c4ff', 1], [1, '#4060c0', 0]], intensity: 1.4, turb: [0.15, 0.8] }); // anchor-ok
      fx.emitter({ count: 24, kind: 'soft', shape: 'sphere', radius: 0.4, pos: [0, 1.2, 0], dir: [0, 1, 0], spread: 1.5, speed: [0.05, 0.2], life: [2, 2.4], size: [0.5, 0.9], ramp: [[0, '#5a78d0', 0], [0.4, '#5a78d0', 0.1], [1, '#2a3a80', 0]], intensity: 0.5 }); // anchor-ok
      fx.light({ color: '#7a98ff', intensity: 14, pos: [0.4, 1.8, 1], range: 6, env: (t) => 0.6 + 0.4 * Math.sin(t / 2.4 * TAU) });
      const nk = fx.body.neck, tor = fx.body.torso;
      fx.on((t) => { const a = Math.sin(t / 2.4 * TAU); nk.rotation.z = -0.28 + 0.03 * a; tor.scale.set(1 + 0.012 * a, 1 + 0.02 * a, 1 + 0.02 * a); tor.rotation.z = 0.06 + 0.015 * a;
        fx.body.set({ tint: '#6a86d0', tintAmt: 0.22, rim: '#8aa8ff', rimAmt: 0.9 + 0.5 * (0.5 + 0.5 * a), glow: 0.35 + 0.35 * (0.5 + 0.5 * a) }); });
    } },

  /* ===================================================================== slowed */
  { id: 'status/slowed', name: 'Slowed', category: 'status', loop: true, duration: 2.4, body: true, stage: BODY('dusk', 0.4),
    build(fx) {
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uA1: { value: 0 }, uA2: { value: 0 }, uTime: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `uniform float uA1,uA2,uTime; varying vec2 vUv;
        float seg(vec2 p, vec2 a, vec2 b, float w){ vec2 pa=p-a, ba=b-a; float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.); return smoothstep(w,w*.4,length(pa-ba*h)); }
        void main(){ vec2 p=vUv*2.-1.; float r=length(p); if(r>1.) discard; float ang=atan(p.x,p.y);
          float face=smoothstep(1.,.88,r); vec3 col=mix(vec3(.04,.1,.2),vec3(.15,.32,.52),r*r)*.9; float a=.45;
          float rim=smoothstep(.9,.95,r)*smoothstep(1.,.96,r); col+=vec3(.5,.85,1.)*rim*1.6; a+=rim*.5;
          float tk=step(.82,fract(ang/6.2831853*12.+.5)*0.+1.-abs(fract(ang/6.2831853*12.+.5)-.5)*2.)*smoothstep(.72,.74,r)*smoothstep(.9,.86,r); col+=vec3(.7,.95,1.)*tk*1.6; a+=tk*.5;
          vec2 d1=vec2(sin(uA1),cos(uA1)), d2=vec2(sin(uA2),cos(uA2)); float h1=seg(p,vec2(0.),d1*.72,.03), h2=seg(p,vec2(0.),d2*.45,.045); col+=vec3(.8,1.,1.)*(h1+h2)*1.8; a+=(h1+h2)*.6;
          float hub=smoothstep(.07,.05,r); col+=vec3(1.)*hub; a+=hub;
          float gl=smoothstep(.12,0.,abs(p.x*.8+p.y-.55))*smoothstep(.9,.2,r)*.5; col+=vec3(.7,.9,1.)*gl; a+=gl*.3;
          gl_FragColor=vec4(col*min(a,1.),min(a,1.)); }` });
      m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
      const clock = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), m); clock.renderOrder = 4;
      fx.mesh(clock, (t, pr, f, w, o) => { o.position.set(-0.1, 1.85, -0.38); o.quaternion.copy(fx.camQuat); const k = t / 0.4, st = Math.floor(k), fk = k - st, e = st + 1 - Math.pow(1 - Math.min(1, fk * 3), 3) * 0 + (Math.sin(Math.min(1, fk * 2.5) * Math.PI * 0.5)); m.uniforms.uA1.value = (st + Math.sin(Math.min(1, fk * 2.2) * Math.PI / 2)) * (TAU / 12) * 0.5; m.uniforms.uA2.value = t / 2.4 * TAU / 3 * 0.5; }, { dur: 99 });
      fx.ring({ normal: 'cam', pos: [-0.1, 1.85, -0.39], r: [0.5, 0.5], width: [0.03, 0.03], decay: 0, intensity: 0.5, breakup: 0.05, ramp: [[0, '#e8f2ff'], [0.5, '#8ad0ff'], [1, '#2a60c0']] });
      fx.emitter({ count: 16, kind: 'drop', shape: 'box', shapeSize: [0.25, 0.7, 0.3], pos: [0, 1.0, 0], dir: [0, -1, 0], spread: 0.05, speed: [0.1, 0.3], life: [1.6, 2.2], gravity: [0, -0.35, 0], size: [0.05, 0.04], ramp: [[0, '#d8f0ff', 0], [0.2, '#d8f0ff', 0.9], [1, '#6a98d0', 0.2]], intensity: 1.4, floorFade: 0.05, aspect: 1.4 }); // anchor-ok
      for (let k = 0; k < 3; k++) fx.ring({ t0: 0.8 * k, dur: 1.2, r: [0.05, 0.6], width: [0.06, 0.02], normal: 'up', pos: [Math.cos(k * 2.2) * 0.25, 0.01, Math.sin(k * 2.2) * 0.25], intensity: 0.8, breakup: 0.1, ramp: [[0, '#e8f2ff'], [0.5, '#9ad0ff'], [1, '#2a60c0']] });
      fx.emitter({ count: 30, kind: 'soft', shape: 'box', shapeSize: [0.3, 0.9, 0.3], pos: [0, 1, 0], dir: [-1, 0, 0], spread: 0.2, speed: [0.05, 0.2], life: [1.5, 2.4], size: [0.04, 0.01], ramp: [[0, '#cfe8ff', 0], [0.4, '#a0d0ff', 0.8], [1, '#4070c0', 0]], intensity: 1.2 }); // anchor-ok
      fx.light({ color: '#8ac0ff', intensity: 14, pos: [0.4, 1.8, 1], range: 6 });
      fx.on((t) => { fx.body.set({ tint: '#7898b8', tintAmt: 0.35, rim: '#8ac8ff', rimAmt: 1.0, glow: 0.3 }); });
    } },

  /* ===================================================================== stunned */
  { id: 'status/stunned', name: 'Stunned', category: 'status', loop: true, duration: 2, body: true, stage: BODY('day', 0.4),
    build(fx) {
      const C = [0, 1.95, 0], R = 0.46, tilt = new THREE.Euler(0.3, 0, 0.12); const tmp = new THREE.Vector3(), nx = new THREE.Vector3(); // anchor-ok
      const pos = (u, out, y = 0) => { const a = u * TAU; out.set(Math.cos(a) * R, y, Math.sin(a) * R).applyEuler(tilt); out.x += C[0]; out.y += C[1]; out.z += C[2]; return out; };
      const sm1 = new THREE.MeshStandardMaterial({ color: '#ffd23a', emissive: '#ffa010', emissiveIntensity: 0.9, roughness: 0.3, metalness: 0.2 });
      const sg = starGeo();
      for (let i = 0; i < 4; i++) {
        const s = new THREE.Mesh(sg, sm1), hl = halo('#ffd040', 2.4, 0.5); s.add(hl); fx.mesh(s, (t, pr, f, w, o, ta) => { pos(t / 2 + i / 6 + (i > 2 ? 0.08 : 0) + (i > 0 ? 0 : 0), o.position, Math.sin(ta * 5 + i) * 0.02); o.rotation.set(0, ta * 4 + i, 0.2); o.scale.setScalar(0.17); }, { dur: 99 });
        const ph = [0, 1 / 6, 2 / 6, 4 / 6][i]; fx.trail({ path: (t) => { pos(t / 2 + (i === 0 ? 0 : i === 1 ? 1 / 6 : i === 2 ? 2 / 6 : 4 / 6) + 0 * ph, tmp); return [tmp.x, tmp.y, tmp.z]; }, len: 0.3, width: 0.05, n: 20, intensity: 1.5, ramp: [[0, '#fff6c0'], [0.4, '#ffc030'], [1, '#a05000']] });
      }
      const bm = new THREE.MeshStandardMaterial({ color: '#4aa0ff', roughness: 0.6 }), bk = new THREE.MeshStandardMaterial({ color: '#ff9a20', roughness: 0.5 }), bw = new THREE.MeshStandardMaterial({ color: '#2a78d8', roughness: 0.7, side: THREE.DoubleSide });
      for (let i = 0; i < 2; i++) {
        const b = new THREE.Group(), bd = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), bm); bd.scale.set(1.4, 1, 1); b.add(bd); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), bm); hd.position.set(0.07, 0.03, 0); b.add(hd);
        const bkm = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 8), bk); bkm.rotation.z = -Math.PI / 2; bkm.position.set(0.115, 0.025, 0); b.add(bkm); const wings = [];
        for (const s of [-1, 1]) { const w = new THREE.Group(); const wm = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.05), bw); wm.position.z = 0.04 * s; wm.rotation.x = Math.PI / 2; w.add(wm); w.position.set(0, 0.02, 0); b.add(w); wings.push([w, s]); }
        const tl = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), bm); tl.rotation.z = Math.PI / 2; tl.position.set(-0.085, 0, 0); b.add(tl);
        fx.mesh(b, (t, pr, f, w, o, ta) => { const u = t / 2 + (i ? 0.5 : 0.25) + 0.0; pos(u, o.position, 0.0); pos(u + 0.02, nx); nx.sub(o.position); o.rotation.set(0, Math.atan2(-nx.z, nx.x), 0); o.scale.setScalar(1.9); wings.forEach(([wg, s]) => { wg.rotation.x = s * Math.sin(ta * 22 + i) * 0.9; }); o.position.y += Math.sin(ta * 9 + i) * 0.015; }, { dur: 99 });
      }
      fx.emitter({ count: 26, kind: 'glint', shape: 'ring', radius: R, radiusIn: R - 0.05, pos: C, rot3: [0.3, 0, 0.12], dir: [0, 1, 0], spread: 0.6, speed: [0.05, 0.3], life: [0.4, 0.9], size: [0.1, 0.02], ramp: [[0, '#fff', 0], [0.3, '#ffe880', 1], [1, '#ffb020', 0]], intensity: 1.5, swirl: 3 });
      fx.light({ color: '#ffd24a', intensity: 12, pos: [0.4, 2.3, 0.6], range: 4 });
      const nk = fx.body.neck, tor = fx.body.torso;
      fx.on((t) => { const a = t / 2 * TAU; nk.rotation.z = 0.08 * Math.sin(a); nk.rotation.x = 0.1 * Math.cos(a); tor.rotation.x = 0.06 * Math.sin(a + 1); tor.rotation.z = 0.04 * Math.cos(a); fx.body.set({ rim: '#ffd24a', rimAmt: 0.5, tint: '#ffe890', tintAmt: 0.06 }); });
    } },
];
