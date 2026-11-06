// moves: whole attacks that chain effects, acted with the mannequin (act + hit-stop + shake + target kick).
import * as THREE from 'three';
import { Dummy, POSES, evalKeys } from '../core/dummy.js';
import { burst } from './_aaa.js'; import { contact } from './melee.js';

const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const eo = (t) => 1 - Math.pow(1 - clamp(t), 3);
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const HP = V();
const hand = (fx, side = 'armR', o = HP) => fx.body[side].hand.getWorldPosition(o);


/* ---------------------------------------------------------------- helpers */
const FIRE = [[0, '#fff2c0', 0.95], [0.25, '#ffb030', 0.9], [0.65, '#e04010', 0.55], [1, '#300', 0]];
function sparks(fx, o) { // burst of streak sparks
  return fx.emitter({ count: Math.min(60, o.n ?? 50), kind: 'spark', shape: 'point', pos: o.pos, dir: o.dir ?? [0, 1, 0], spread: o.spread ?? 1.4, speed: o.speed ?? [2, 8], life: o.life ?? [0.25, 0.7], gravity: [0, -9, 0], size: [0.07, 0.02], stretch: 1.5, bounce: 0.3,
    ramp: o.ramp ?? [[0, '#fff2dc'], [0.4, '#ffd070'], [1, '#a40', 0]], intensity: o.int ?? 4, delay: o.t, emit: 0.001, t0: o.t - 0.02 });
}
function glint(fx, pos, t, size = 1, color = '#fff', c2 = '#ffd070') { return fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos, size: [size, size * 0.3], life: [0.2, 0.2], ramp: [[0, color], [1, c2, 0]], intensity: 4, delay: t, emit: 0.001, t0: t - 0.02 }); }
function dust(fx, o) { return fx.emitter({ count: o.n ?? 30, kind: 'dust', blend: 'normal', lit: 1, shape: o.shape ?? 'ring', radius: o.r ?? 0.4, pos: o.pos ?? [0, 0.05, 0], dir: [0, 1, 0], spread: 1.3, radial: o.radial ?? 0.9, speed: o.speed ?? [1, 3], life: o.life ?? [0.7, 1.5], size: o.size ?? [0.4, 1.1], drag: 1.2, gravity: [0, 0.2, 0], ramp: o.ramp ?? [[0, '#463d30', 0], [0.15, '#5a5040', 0.5], [1, '#2a241d', 0]], delay: o.t, emit: o.emit ?? 0.08, order: -1, t0: o.t - 0.02 }); }
function rocks(fx, o) { return fx.emitter({ count: o.n ?? 20, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: o.r ?? 0.3, pos: o.pos, dir: [0, 1, 0], spread: o.spread ?? 1.0, speed: o.speed ?? [3, 8], life: [1.2, 2.2], gravity: [0, -9.8, 0], size: o.size ?? [0.16, 0.12], ramp: [[0, '#5f4f3f'], [1, '#5f4f3f', 1]], bounce: 0.3, rot: 6, delay: o.t, emit: 0.001, t0: o.t - 0.02 }); }
function shadowDisc(fx, r, fn) { // tiny soft shadow under moving mesh
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: 0.5 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float a=smoothstep(1.,.1,length(vUv-.5)*2.); gl_FragColor=vec4(0.,0.,0.,a*a*uA); }' });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); o.rotation.x = -PI / 2; o.position.y = 0.007; o.frustumCulled = false; fx.mesh(o, (t) => { const k = fn(t); o.position.x = k.x; o.position.z = k.z ?? 0; o.scale.setScalar(r * k.s); m.uniforms.uA.value = k.a; }); }
const spikeMat = () => new THREE.MeshStandardMaterial({ color: '#6a5d50', roughness: 0.9, metalness: 0.02, flatShading: true });
function spike(h, r, mat, seed = 1) { const g = new THREE.ConeGeometry(r, h, 7, 3); g.translate(0, h / 2, 0); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453; const n = (k - Math.floor(k) - 0.5) * 0.3; p.setX(i, p.getX(i) * (1 + n)); p.setZ(i, p.getZ(i) * (1 - n)); } g.computeVertexNormals(); return new THREE.Mesh(g, mat); }
const segMesh = (mat, r = 0.004) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 5), mat); return m; };
function setSeg(m, a, b) { const d = _d.copy(b).sub(a), L = d.length(); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(UPV, d.normalize()); m.scale.set(1, L, 1); }
const _d = V(), UPV = V(0, 1, 0);
const steel = () => new THREE.MeshStandardMaterial({ color: '#c9d1da', metalness: 1, roughness: 0.22 });
function bodyReset(fx) { fx.body.set({ dissolve: -1, alpha: 1 }); }

export default [
  /* =============================================================== ARROW SHOT */
  { id: 'moves/arrow-shot', name: 'Arrow shot', category: 'moves', loop: false, duration: 1.3,
    stage: { sky: 'dusk', bloom: 0.45, view: { pos: [1.4, 1.55, 6.2], target: [1.2, 1.2, 0], fov: 38 } },
    act: { kind: 'cast', char: 'knight', target: [2.4, 0, 0], windup: 0.7, keys: [[-0.7, 'guard'], [-0.4, 'bowDraw'], [0, 'bowDraw'], [0.05, 'bowRelease', 'snap'], [0.6, 'bowRelease'], [1.2, 'guard']], hits: [{ t: 0.2, stop: 0.04, shake: 0.12, amp: 0.02, push: 1.0 }] },
    build(fx) {
      const wood = new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.6 }), strM = new THREE.MeshStandardMaterial({ color: '#e8e0c8', roughness: 0.8 });
      const R = 0.5, arc = 1.9; const bow = new THREE.Group(); const limb = new THREE.Mesh(new THREE.TorusGeometry(R, 0.017, 8, 40, arc), wood); limb.rotation.z = -arc / 2; limb.position.x = -R; bow.add(limb);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.14, 10), new THREE.MeshStandardMaterial({ color: '#2a1a12', roughness: 0.8 })); grip.position.x = 0; bow.add(grip);
      const tipU = V(R * Math.cos(arc / 2) - R, R * Math.sin(arc / 2), 0), tipD = V(tipU.x, -tipU.y, 0); const s1 = segMesh(strM), s2 = segMesh(strM); bow.add(s1, s2); bow.rotation.z = 0;
      const arrow = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.78, 8), new THREE.MeshStandardMaterial({ color: '#b8935a', roughness: 0.6 })); shaft.rotation.z = PI / 2; arrow.add(shaft);
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 8), steel()); head.rotation.z = -PI / 2; head.position.x = 0.42; arrow.add(head);
      for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.035), new THREE.MeshStandardMaterial({ color: '#d33', side: THREE.DoubleSide, roughness: 0.7 })); f.position.x = -0.34; f.rotation.x = (i / 3) * PI; arrow.add(f); }
      const G = fx.anchor('tgt'), Lh = fx.anchor('handL', 0), rel = V(0.7, 1.45, 0), IMP = V(G[0] - 0.2, G[1] + 0.1, 0.0), pn = V(), L = V(), Rh = V(), tp = V(); const ARR_T = 0.2;
      fx.mesh(bow, (t) => { hand(fx, 'armL', L); hand(fx, 'armR', Rh); bow.position.copy(L); bow.position.x += 0.02; bow.position.x -= 0; bow.position.z = L.z; const nock = t < 0.0 ? Rh : (t < 0.06 ? Rh.clone().lerp(V(L.x - 0.04, L.y, L.z), t / 0.06 * 0.5) : V(L.x - 0.04, L.y, L.z)); const w = bow.position; // limb tips relative -> world
        const a = tipU.clone().add(w).setX(w.x + tipU.x), b = tipD.clone().add(w).setX(w.x + tipD.x); a.x = L.x + tipU.x + R - R; b.x = a.x; a.y = L.y + tipU.y; b.y = L.y + tipD.y; a.z = b.z = L.z; s1.parent.worldToLocal; const loc = (v) => bow.worldToLocal(v.clone());
        const nk = loc(t < 0.12 ? nock : V(L.x - 0.0, L.y, L.z)); setSeg(s1, loc(a.clone()), nk); setSeg(s2, loc(b.clone()), nk); }, { dur: 99 });
      fx.mesh(arrow, (t) => { hand(fx, 'armL', L); hand(fx, 'armR', Rh); if (t <= 0) { rel.set(L.x + 0.05, L.y, L.z); pn.copy(Rh); pn.x = Math.min(pn.x, rel.x - 0.1); arrow.position.set(pn.x + 0.32, L.y, L.z); arrow.rotation.set(0, 0, 0.0); }
        else { const u = clamp(t / ARR_T); const p = rel.clone().lerp(IMP, u * u * 0.3 + u * 0.7); arrow.position.set(p.x + 0.32 - 0.32 * 0 - 0.4 * 0, p.y, p.z); arrow.rotation.set(0, 0, Math.atan2(IMP.y - rel.y, IMP.x - rel.x) * 0.5 * 0); if (u >= 1) { const w = Math.exp(-(t - ARR_T) * 6) * Math.sin((t - ARR_T) * 90) * 0.05; arrow.position.set(IMP.x - 0.2, IMP.y, IMP.z); arrow.rotation.z = w; arrow.rotation.y = w * 0.6; } } }, { dur: 99 });
      fx.trail({ path: (t) => { const u = clamp(t / ARR_T); const p = rel.clone().lerp(IMP, u * u * 0.3 + u * 0.7); return [p.x - 0.0, p.y, p.z]; }, t0: 0, dur: 0.38, len: 0.14, width: 0.03, n: 30, intensity: 1.2, core: 4, fade: [0, 0.15], ramp: [[0, '#e8f2ff'], [0.4, '#cfe0ff'], [1, '#4a6aa8']] });
      fx.ring({ t0: 0.0, dur: 0.22, r: [0.05, 0.5], width: [0.08, 0.02], normal: [1, 0, 0], pos: fx.anchor('handL', 0.05, [0.12, 0, 0]), intensity: 1.2, ramp: [[0, '#e8f2ff'], [1, '#9ab8ff']] }); // bow release
      for (let i = 0; i < 4; i++) fx.ribbon({ points: [[Lh[0] + 0.12, Lh[1] + i * 0.07 - 0.1, 0.1 * (i - 1.5)], [(Lh[0] + IMP.x) / 2, (Lh[1] + IMP.y) / 2 + i * 0.07 - 0.08, 0.06 * (i - 1.5)], [IMP.x, IMP.y + i * 0.07 - 0.08, 0.03 * (i - 1.5)]], n: 12, width: 0.012, t0: 0.02, dur: 0.22, sweep: [0, 1.5], tail: 0.4, intensity: 1.2, ramp: [[0, '#e8f2ff'], [1, '#6a8ad8']] });
      fx.light({ color: '#a8c4ff', intensity: 24, pos: [1.0, 1.5, 0.6], range: 5, t0: -0.1, dur: 0.5, fade: [0.02, 0.3] });
      const IP = (dx, dy, dz) => [IMP.x + dx, IMP.y + dy, IMP.z + dz]; // impact point on the target chest
      sparks(fx, { t: ARR_T, pos: IP(-0.1, 0, 0.05), n: 40, dir: [-0.4, 0.4, 0.3], spread: 1.3, speed: [1.5, 5] }); glint(fx, IP(-0.05, 0, 0.1), ARR_T, 0.7, '#fff', '#9cf');
      fx.emitter({ count: 22, kind: 'dust', blend: 'normal', lit: 1, shape: 'point', pos: IP(-0.1, -0.05, 0), dir: [0, 1, 0], spread: 1.8, speed: [0.3, 1.2], life: [0.5, 1.0], size: [0.12, 0.3], ramp: [[0, '#625026', 0], [0.15, '#625026', 0.6], [1, '#433b1c', 0]], delay: ARR_T, emit: 0.05, order: -1, t0: ARR_T - 0.02 });
      fx.emitter({ count: 14, kind: 'petal', blend: 'normal', lit: 1, shape: 'point', pos: IP(-0.1, -0.05, 0), dir: [0, 1, 0], spread: 1.8, speed: [0.5, 1.8], life: [0.8, 1.4], size: [0.04, 0.03], rot: 8, gravity: [0, -2, 0], ramp: [[0, '#d8bc5a', 1], [1, '#a88a3a', 0]], delay: ARR_T, emit: 0.04, t0: ARR_T - 0.02 });
      burst(fx, IP(-0.05, 0, 0.05), ARR_T, { tier: 1, dir: [-1, 0, 0], col: '#ffc880' });
    } },

  /* =============================================================== DASH STRIKE */
  { id: 'moves/dash-strike', name: 'Dash strike', category: 'moves', loop: false, duration: 1.3,
    stage: { sky: 'night', bloom: 0.5, view: { pos: [1.2, 1.5, 7.2], target: [0.7, 1.05, 0], fov: 40 } },
    act: { kind: 'thrust', weapon: 'sword', target: [2.27, 0, 0], windup: 0.5, keys: [[-0.5, 'guard'], [-0.3, 'pullback'], [-0.05, 'dashLow'], [0, 'lunge', 'snap'], [0.25, 'lunge'], [0.9, 'guard']], hits: [{ t: 0.02, stop: 0.11, shake: 0.25, amp: 0.035, push: 1.8, flash: 0.15 }] },
    build(fx) {
      const X = (t) => (t < -0.3 ? -1.5 : t < 0 ? -1.5 + 1.95 * eo((t + 0.3) / 0.3) : 0.45 + 0.25 * eo(t / 0.5) - 0.0);
      fx.on((t, ta) => { fx.body.position.x = X(clamp(ta, -0.5, 1.5)) - 0.0; });
      const at = (n, t) => { const p = fx.anchor(n, t); p[0] += X(t); return p; }, C = at('tip', 0.02), Hd = at('handR', 0.02), cy = fx.anchor('chest', 0)[1]; // anchors + the dash offset X(t)
      // speed streaks and afterimage ribbons
      for (let i = 0; i < 5; i++) { const y = 0.5 + i * 0.28, z = (i % 2 ? 0.3 : -0.2); fx.ribbon({ points: (t) => { const x = X(clamp(t, -0.3, 0)) ; return [[x - 1.6 - i * 0.1, y, z], [x - 0.8, y + 0.02, z * 0.8], [x, y, z * 0.5]]; }, n: 14, width: 0.025, t0: -0.3, dur: 0.38, head: (t) => 1.001, tail: 0.9, intensity: 1.5, ramp: [[0, '#e8f2ff'], [0.4, '#9cf'], [1, '#2a4aa8']], fade: [0.03, 0.12] }); }
      fx.ribbon({ points: (t) => [[X(clamp(t, -0.3, 0.0)) - 1.5, cy - 0.1, 0.05], [X(clamp(t, -0.3, 0.0)) - 0.7, cy - 0.08, 0.05], [X(clamp(t, -0.3, 0.0)) + 0.1, cy - 0.05, 0.05]], n: 14, width: 0.17, t0: -0.3, dur: 0.38, head: () => 1.001, tail: 1.0, intensity: 0.7, core: 2, ramp: [[0, '#cfe4ff'], [0.4, '#6a9aff'], [1, '#0a1a60']], fade: [0.03, 0.1] });
      dust(fx, { t: -0.3, pos: [-1.5, 0.05, 0], shape: 'box', r: 0.2, n: 18, speed: [0.5, 1.6], size: [0.3, 0.7] });
      fx.emitter({ count: 40, kind: 'dust', blend: 'normal', lit: 1, shape: 'line', shapeSize: [1.2, 0, 0], pos: [-0.7, 0.05, 0], dir: [-1, 0.2, 0], spread: 0.5, speed: [0.5, 2], life: [0.4, 0.9], size: [0.15, 0.4], ramp: [[0, '#463d30', 0], [0.2, '#5a5040', 0.35], [1, '#2a241d', 0]], delay: -0.3, emit: 0.3, order: -1, t0: -0.32, t1: 1.0 });
      fx.ring({ t0: -0.32, dur: 0.3, r: [0.2, 1.6], width: [0.12, 0.03], normal: 'up', pos: [-1.5, 0.02, 0], intensity: 0.8, ramp: [[0, '#e8f2ff'], [1, '#6a9aff']] });
      // the finishing thrust-slash
      const ba = fx.bladeArc(-0.08, 0.06); ba.center[0] += X(0);
      fx.slash({ ...ba, width: 0.2, t0: -0.01, dur: 0.22, tail: 0.8, sweep: [0, 1.4], intensity: 2.6, ramp: [[0, '#e8f2ff'], [0.3, '#a9d6ff'], [1, '#1b3fa8']] });
      fx.beam({ from: Hd, to: C, r: [0.06, 0.12], t0: -0.02, dur: 0.14, fade: [0.0, 0.1], intensity: 1.5, noise: 0.3, edge: 1.2, ramp: [[0, '#e8f2ff'], [1, '#6a9aff']] });
      fx.ring({ t0: 0.02, dur: 0.4, r: [0.2, 2.2], width: [0.25, 0.05], normal: [1, 0, 0], pos: C, intensity: 1.5, ramp: [[0, '#e8f2ff'], [0.5, '#b8d4ff'], [1, '#2a5ad8']] });
      fx.ring({ t0: 0.02, dur: 0.5, r: [0.2, 3.0], width: [0.15, 0.04], normal: 'up', intensity: 0.7, ramp: [[0, '#e8f2ff'], [1, '#4a7ae8']] });
      sparks(fx, { t: 0.02, pos: C, n: 80, dir: [1, 0.3, 0], spread: 1.4, speed: [2, 9], ramp: [[0, '#e8f2ff'], [0.4, '#a0c4ff'], [1, '#24a', 0]] }); glint(fx, C, 0.02, 1.2, '#fff', '#8ab4ff');
      dust(fx, { t: 0.02, pos: fx.anchor('tgtFeet', 0, [-0.1, 0.05, 0]), r: 0.3, n: 8 });
      fx.light({ color: '#8fb8ff', intensity: 60, pos: [1.8, 1.4, 0.8], range: 9, t0: -0.3, dur: 1.0, env: (t) => (t < 0 ? 0.35 : Math.exp(-t * 4) * 1.0 + 0.0), norm: 40 });
      fx.flash(0.02, 0.12, '#cfe0ff', 0.08);
    } },

  /* =============================================================== EARTH STOMP */
  { id: 'moves/earth-stomp', name: 'Earth stomp', category: 'moves', loop: false, duration: 2.0, tier: 3,
    stage: { sky: 'dusk', bloom: 0.4, view: { pos: [1.6, 1.8, 7.4], target: [1.3, 0.8, 0], fov: 40 } },
    act: { kind: 'stomp', target: [2.6, 0, 0], windup: 0.65, hits: [{ t: 0.0, stop: 0.07, shake: 0.5, amp: 0.07 }, { t: 0.32, stop: 0, shake: 0.3, amp: 0.04, push: 2.2 }] },
    build(fx) {
      const mat = spikeMat(); const N = 7, sp = [];
      for (let i = 0; i < N; i++) { const s = spike(0.9 + 0.35 * Math.sin(i * 2.1) + i * 0.08, 0.17 + i * 0.012, mat, i); const x = 0.7 + i * 0.32, z = Math.sin(i * 1.7) * 0.22; s.position.set(x, 0, z); s.rotation.set(Math.sin(i * 3.1) * 0.12, i, Math.cos(i * 2.3) * 0.18 - 0.1); sp.push({ s, t: 0.04 + i * 0.05, x, z }); const g = new THREE.Group(); g.add(s); fx.mesh(g, (t) => { const u = clamp((t - (0.04 + i * 0.05)) / 0.12), d = clamp((t - 1.0 - i * 0.02) / 0.8); const h = eo(u) * (1 - sstep(0, 1, d)) ; s.scale.set(1, Math.max(1e-3, h), 1); s.position.y = -0.1 * (1 - h) - 0.0; s.visible = h > 0.01; }, { dur: 99 }); }
      fx.ring({ t0: 0, dur: 0.9, r: [0.2, 6.5], width: [0.175, 0.04], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#e8c898'], [1, '#8a6a40']] });
      fx.decal({ kind: 'cracks', t0: 0, dur: 1.9, r: [3.5, 4.2], reveal: 0.35, heat: [0.9, 0.1], cells: 4, fade: [0.05, 1.0], ramp: [[0, '#200'], [0.5, '#c4501a'], [1, '#ffbb50']], intensity: 1.2 });
      fx.decal({ kind: 'scorch', t0: 0, dur: 1.95, r: [1.2, 1.6], fade: [0.1, 1.0], heat: [0.6, 0], ramp: [[0, '#1a1410'], [0.5, '#c4501a'], [1, '#fc8']] });
      dust(fx, { t: 0, r: 0.5, n: 8, speed: [1.5, 4.5], size: [0.5, 1.4], emit: 0.15 }); dust(fx, { t: 0.04, shape: 'line', pos: [1.8, 0.1, 0], r: 0, n: 40, speed: [0.5, 1.6], size: [0.3, 0.9], emit: 0.4 });
      rocks(fx, { t: 0.0, pos: [0.1, 0.1, 0], n: 18, speed: [3, 7], spread: 1.1 }); rocks(fx, { t: 0.1, pos: [1.6, 0.2, 0], n: 22, speed: [2.5, 6.5], spread: 0.9 });
      sparks(fx, { t: 0.0, pos: [0.05, 0.05, 0.05], n: 40, dir: [1, 0.6, 0], spread: 1.4, speed: [2, 8], ramp: [[0, '#fff2dc'], [0.4, '#ffc060'], [1, '#a40', 0]] });
      fx.emitter({ count: 70, kind: 'soft', shape: 'line', shapeSize: [1.6, 0, 0.1], pos: [1.7, 0.1, 0], dir: [0, 1, 0], spread: 0.7, speed: [0.5, 2.5], life: [0.4, 1.0], size: [0.05, 0.01], gravity: [0, -3, 0], intensity: 1.5, ramp: [[0, '#fff2c0'], [0.5, '#ffa030'], [1, '#a30', 0]], delay: 0.05, emit: 0.4 });
      fx.flash(0, 0.2, '#ffe6c0', 0.15);
      const ER = [[0, '#fff2dc'], [0.4, '#e8c898'], [1, '#8a6a40']];
      burst(fx, [0.1, 0, 0], 0, { ramp: ER, col: '#ffb060', marks: false }); burst(fx, fx.anchor('tgtFeet'), 0.32, { tier: 1, ramp: ER, col: '#ffb060', dust: false, debris: false, marks: false });
    } },

  /* =============================================================== FIREBALL THROW */
  { id: 'moves/fireball-throw', name: 'Fireball throw', category: 'moves', loop: false, duration: 2.0, tier: 2,
    stage: { sky: 'dusk', bloom: 0.55, view: { pos: [1.6, 1.7, 7.4], target: [1.4, 1.1, 0], fov: 40 } },
    act: { kind: 'throw', target: [3.6, 0, 0], windup: 0.6, hits: [{ t: 0.5, stop: 0.09, shake: 0.45, amp: 0.06, push: 2.2, flash: 0.2 }] },
    build(fx) {
      const hp = V(), P = V(), G = fx.anchor('tgt'); const T0 = 0.5, END = V(G[0] - 0.2, G[1] + 0.05, 0), dy = G[1] - 1.1; // dy: old chest 1.1 -> target chest
      const pos = (t, o = V()) => { if (t < 0) { hand(fx, 'armR', hp); return o.copy(hp).add(V(0.12, 0.0, 0)); } const u = clamp(t / T0); if (u === 0) return o.copy(P); hand(fx, 'armR', hp); if (t < 0.02) P.copy(hp); return o.copy(P).lerp(END, u).add(V(0, 0.55 * Math.sin(u * PI) * 0.5, 0)); };
      const pp = (t) => { const o = pos(t); return [o.x, o.y, o.z]; };
      fx.orb({ kind: 'fire', t0: -0.55, dur: T0 + 0.55, r: [0.04, 0.26], ease: 'out', intensity: 1.1, ramp: [[0, '#200'], [0.3, '#c21'], [0.6, '#f70'], [0.85, '#fc4'], [1, '#fff']], noise: 2.4, scroll: 3, disp: 0.5, follow: (o, ta, t) => { pos(t, o.position); const s = t > 0 ? 0.26 : 0.04 + 0.22 * (t + 0.55) / 0.55; o.scale.setScalar(s); } });
      fx.orb({ kind: 'plasma', t0: -0.4, dur: T0 + 0.4, r: [0.05, 0.12], intensity: 1.6, ramp: [[0, '#f84'], [1, '#fff']], noise: 3, scroll: 4, disp: 0.3, follow: (o, ta, t) => pos(t, o.position) });
      fx.emitter({ count: 70, kind: 'flame', shape: 'sphere', radius: 0.12, pos: fx.anchor('hips', -0.6, [0, 0.08, 0]), dir: [-1, 0.2, 0], spread: 0.6, speed: [0.5, 1.5], life: [0.3, 0.55], size: [0.5, 0.15], aspect: 1.5, intensity: 0.55, ramp: FIRE, t0: -0.5, t1: T0, follow: (m, ta, t) => pos(t, m.position) });
      fx.emitter({ count: 50, kind: 'spark', shape: 'sphere', radius: 0.15, pos: fx.anchor('hips', -0.6, [0, 0.08, 0]), dir: [-1, 0.2, 0], spread: 1.2, speed: [0.5, 2.5], life: [0.4, 0.7], gravity: [0, -1, 0], size: [0.05, 0.015], stretch: 0.8, intensity: 3, ramp: [[0, '#fff2dc'], [0.4, '#ffa030'], [1, '#a30', 0]], t0: -0.5, t1: T0, follow: (m, ta, t) => pos(t, m.position) });
      fx.trail({ path: pp, t0: 0, dur: T0, len: 0.35, width: 0.2, n: 40, intensity: 1.2, core: 3, ramp: [[0, '#fff2c0'], [0.3, '#ff9a30'], [0.7, '#c03000'], [1, '#300']], fade: [0, 0.05] });
      const lt = fx.light({ color: '#ff8a30', intensity: 35, pos: fx.anchor('head', 0, [-0.01, -0.18, 0.18]), range: 8, t0: -0.55, dur: T0 + 0.55, flicker: 0.2, norm: 30 }); fx.on((t) => { pos(t, lt.l.position); lt.l.position.z += 0.4; });
      // impact
      const I = END.x, B = T0;
      fx.ring({ t0: B, dur: 0.9, r: [0.2, 5.2], width: [0.225, 0.05], normal: 'up', pos: [I, 0.01, 0], intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#fc9'], [1, '#a50']] });
      fx.ring({ t0: B + 0.03, dur: 0.55, r: [0.2, 2.8], width: [0.3, 0.06], normal: 'cam', pos: [I, 1.1 + dy, 0], intensity: 1.2, ramp: [[0, '#fff2dc'], [1, '#fb6']] });
      fx.orb({ t0: B, dur: 0.8, r: [0.3, 1.7], ease: 'out', kind: 'fire', intensity: 0.9, ramp: [[0, '#200'], [0.3, '#c21'], [0.6, '#f70'], [0.85, '#fc4'], [1, '#fff']], pos: [I, 1.0 + dy, 0], fade: [0, 0.44], noise: 1.8, scroll: 2.5, disp: 0.55 });
      fx.emitter({ count: 80, kind: 'flame', shape: 'sphere', radius: 0.5, pos: [I, 0.8, 0], dir: [0, 1, 0], spread: 0.9, speed: [1, 3.8], life: [0.6, 1.4], size: [1.2, 2.4], aspect: 1, intensity: 0.45, drag: 1.1, gravity: [0, 2, 0], turb: [0.3, 1.2], ramp: fx.pal([[0, '#ffe9b0', 0.9], [0.2, '#ff9a30', 0.85], [0.55, '#c8300a', 0.5], [1, '#200', 0]]), delay: B, emit: 0.05, t0: B - 0.02 });
      fx.emitter({ count: 70, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.6, pos: [I, 0.9, 0], dir: [0, 1, 0], spread: 0.7, speed: [0.8, 2.4], life: [2, 3.6], size: [1.2, 4], ramp: [[0, '#4a3d30', 0], [0.12, '#2f2822', 0.8], [0.6, '#1c1916', 0.55], [1, '#0e0d0c', 0]], drag: 0.9, gravity: [0, 0.8, 0], turb: [0.5, 0.5], delay: B + 0.1, emit: 0.5, order: -1, t0: B });
      sparks(fx, { t: B, pos: [I, 0.4, 0], n: 60, spread: 1.4, speed: [4, 11] }); rocks(fx, { t: B, pos: [I, 0.2, 0], n: 18 });
      fx.decal({ kind: 'scorch', t0: B, dur: 2 - B, r: [2.0, 2.6], pos: [I, 0.004, 0], fade: [0.15, 1.2], heat: [1, 0], ramp: [[0, '#1a1410'], [0.5, '#f40'], [1, '#fc8']] });
      burst(fx, [I, 1.0 + dy, 0], B, { ground: true, ramp: [[0, '#fff2dc'], [0.4, '#fc9'], [1, '#a50']], col: '#ffa040' });
    } },

  /* =============================================================== GROUND POUND */
  { id: 'moves/ground-pound', name: 'Ground pound', category: 'moves', loop: false, duration: 2.0, tier: 3,
    stage: { sky: 'dusk', bloom: 0.45, view: { pos: [2.2, 2.0, 7.6], target: [1.2, 0.9, 0], fov: 42 } },
    act: { kind: 'stomp', target: [2.6, 0, 0], windup: 0.7, hits: [{ t: 0, stop: 0.12, shake: 0.7, amp: 0.1, push: 2.6, flash: 0.35 }] },
    build(fx) {
      fx.ring({ t0: 0, dur: 1.0, r: [0.2, 8], width: [0.2, 0.05], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#ffd8a0'], [1, '#a06a30']] });
      fx.ring({ t0: 0.08, dur: 0.9, r: [0.2, 5.5], width: [0.25, 0.06], normal: 'up', y: 0.02, intensity: 0.6, ramp: [[0, '#fff2dc'], [1, '#c88a40']] });
      fx.ring({ t0: 0.02, dur: 0.5, r: [0.3, 3.5], width: [0.3, 0.06], normal: 'cam', pos: fx.anchor('hips', -0.35, [0, -0.05, 0]), intensity: 1.0, ramp: [[0, '#fff2dc'], [1, '#fc8']] });
      fx.shell({ t0: 0, dur: 0.5, r: [0.2, 3.4], ease: 'out', hemi: true, power: 2, noise: 0.4, intensity: 0.5, fade: [0, 0.35], ramp: [[0, '#321'], [0.5, '#fc8'], [1, '#fff']] });
      fx.decal({ kind: 'cracks', t0: 0, dur: 1.95, r: [4.2, 5.0], reveal: 0.3, heat: [1, 0.1], cells: 4.5, fade: [0.03, 1.1], ramp: [[0, '#200'], [0.5, '#d4501a'], [1, '#ffcc60']], intensity: 1.4 });
      fx.decal({ kind: 'scorch', t0: 0, dur: 1.95, r: [1.6, 2.2], fade: [0.1, 1.0], heat: [0.7, 0], ramp: [[0, '#1a1410'], [0.5, '#c4501a'], [1, '#fc8']] });
      dust(fx, { t: 0, r: 0.6, n: 30, speed: [2, 6], size: [0.6, 1.8], emit: 0.2 }); dust(fx, { t: 0.1, r: 1.5, n: 40, speed: [1, 3], size: [0.5, 1.4], emit: 0.3 });
      rocks(fx, { t: 0, pos: [0.0, 0.2, 0], n: 34, speed: [4, 11], spread: 1.0, r: 0.5 }); sparks(fx, { t: 0, pos: [0.2, 0.1, 0], n: 70, speed: [3, 10], spread: 1.5 });
      fx.emitter({ count: 40, kind: 'smoke', blend: 'normal', lit: 1, shape: 'ring', radius: 0.8, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 1.4, radial: 1, speed: [2, 5], life: [1.2, 2.4], size: [0.8, 2.6], drag: 1.5, ramp: [[0, '#463d30', 0], [0.15, '#5a5040', 0.5], [1, '#2a241d', 0]], delay: 0.0, emit: 0.1, order: -1 });
      // radial rock slabs thrown up along the shock
      const mat = spikeMat(); for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU + 0.3, r = 1.2 + (i % 2) * 0.9; const s = spike(0.5 + (i % 3) * 0.15, 0.12, mat, i + 3); s.rotation.z = 0.0; const g = new THREE.Group(); g.add(s); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); fx.mesh(g, (t) => { const u = clamp((t - 0.06 - r * 0.07) / 0.1), d = clamp((t - 0.9) / 0.6); const h = eo(u) * (1 - sstep(0, 1, d)); s.scale.set(1, Math.max(1e-3, h), 1); s.visible = h > 0.02; }, { dur: 99 }); }
      fx.flash(0, 0.18, '#ffe8c0', 0.15);
      fx.shake(0.28, 0.5, 0.04);
      burst(fx, [0, 0, 0], 0, { ramp: [[0, '#fff2dc'], [0.4, '#ffd8a0'], [1, '#a06a30']], col: '#ffb868', marks: false });
    } },

  /* =============================================================== HOLY SMITE */
  { id: 'moves/holy-smite', name: 'Holy smite', category: 'moves', loop: false, duration: 2.2,
    stage: { sky: 'dusk', bloom: 0.65, view: { pos: [0.9, 1.4, 6.4], target: [1.5, 2.0, 0], fov: 44 } },
    act: { kind: 'castup', target: [2.4, 0, 0], windup: 0.7, hits: [{ t: 0.25, stop: 0.08, shake: 0.35, amp: 0.05, push: 1.4, flash: 0.3 }] },
    build(fx) {
      const GOLD = [[0, '#fff2dc'], [0.35, '#fff0b0'], [0.7, '#ffc050'], [1, '#a06010']], T = fx.anchor('tgtFeet')[0];
      // telegraph: rune circle draws in at target
      fx.decal({ kind: 'rune', t0: -0.55, dur: 2.75, r: [1.5, 1.7], pos: [T, 0.006, 0], reveal: 0.55, glyphs: 14, poly: 6, spin: 0.5, ramp: [[0, '#6a4a10'], [0.5, '#ffc850'], [1, '#fff6d0']], intensity: 1.2, fade: [0.1, 0.9] });
      fx.decal({ kind: 'glow', t0: -0.3, dur: 2.5, r: [1.6, 2.0], pos: [T, 0.004, 0], ramp: [[0, '#000'], [0.4, '#a06a10'], [1, '#ffd870']], intensity: 1.2, alpha: 0.8, fade: [0.3, 1.2] });
      fx.ring({ t0: -0.1, dur: 0.5, r: [2.4, 0.3], width: [0.1, 0.04], normal: 'up', pos: [T, 0.02, 0], intensity: 1.4, ramp: [[0, '#fff2dc'], [1, '#ffc850']], decay: 0.2 });
      // the column
      fx.beam({ pos: [T, 0, 0], height: 12, r: [0.9, 0.9], t0: 0.25, dur: 1.4, fade: [0.02, 0.9], intensity: 0.45, noise: 0.6, freq: 1.2, speed: 1.4, edge: 1.5, ramp: GOLD, grow: [0.3, 1.0], endFade: 0.06 });
      fx.beam({ pos: [T, 0, 0], height: 12, r: [0.3, 0.3], t0: 0.25, dur: 1.2, fade: [0.0, 0.7], intensity: 1.2, noise: 0.3, freq: 2, speed: 3, edge: 1.0, ramp: [[0, '#fff2dc'], [1, '#fff0b0']], grow: [0.4, 1.0], endFade: 0.06 });
      fx.beam({ pos: [T, 0, 0], height: 10, r: [1.8, 1.4], t0: 0.25, dur: 1.5, fade: [0.05, 1.0], intensity: 0.1, noise: 0.9, freq: 1, speed: 0.6, edge: 2.4, ramp: GOLD, endFade: 0.2 });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; fx.beam({ from: [T + Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1], to: [T + Math.cos(a) * 2.8, 5.5, Math.sin(a) * 2.8], r: [0.12, 0.45], t0: 0.3, dur: 1.2, fade: [0.05, 0.8], intensity: 0.08, noise: 0.7, edge: 1.4, ramp: GOLD }); }
      fx.ring({ t0: 0.25, dur: 0.8, r: [0.3, 5], width: [0.15, 0.03], normal: 'up', pos: [T, 0.02, 0], intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#ffe8a0'], [1, '#c8801a']] });
      for (let i = 0; i < 3; i++) fx.ring({ t0: 0.3 + i * 0.22, dur: 0.9, r: [0.8, 0.8], width: [0.06, 0.05], normal: 'up', pos: [T, 0.3 + i * 0.0, 0], y: 0.02, intensity: 0, ramp: GOLD });
      fx.emitter({ count: 1, kind: 'glint', pos: fx.anchor('tgtHead'), size: [3.0, 1.0], life: [0.35, 0.35], intensity: 4, delay: 0.25, ramp: [[0, '#fff'], [1, '#ffe08a', 0]] });
      fx.emitter({ count: 120, kind: 'soft', shape: 'disc', radius: 1.0, pos: [T, 0.05, 0], dir: [0, 1, 0], spread: 0.15, speed: [1, 3.5], life: [1, 2.2], size: [0.07, 0.02], intensity: 1.5, swirl: 1.6, turb: [0.2, 1], ramp: [[0, '#fff6d0', 0], [0.2, '#fff0b0', 1], [1, '#ffb030', 0]], delay: 0.25, emit: 1.0 });
      fx.emitter({ count: 26, kind: 'petal', blend: 'normal', lit: 0, shape: 'disc', radius: 0.9, pos: [T, 3.4, 0], dir: [0, -1, 0], spread: 0.4, speed: [0.3, 1.0], life: [1.8, 2.6], size: [0.09, 0.06], rot: 3, aspect: 2.4, turb: [0.5, 1], gravity: [0, -0.4, 0], blend2: 0, ramp: [[0, '#fff', 0], [0.2, '#fff4d0', 0.95], [1, '#ffe0a0', 0]], delay: 0.35, emit: 0.8 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'disc', radius: 0.4, pos: [T, 0.1, 0], dir: [0, 1, 0], spread: 1.4, speed: [2, 7], life: [0.4, 0.7], gravity: [0, -6, 0], size: [0.07, 0.02], stretch: 1.2, intensity: 4, ramp: [[0, '#fff2dc'], [0.4, '#ffe080'], [1, '#c80', 0]], delay: 0.25, emit: 0.001 });
      fx.emitter({ count: 20, kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 0.5, pos: [T, 0.05, 0], dir: [0, 1, 0], spread: 1.3, radial: 1, speed: [1, 3], life: [0.8, 1.4], size: [0.4, 1.0], ramp: [[0, '#544a38', 0], [0.2, '#5a503e', 0.3], [1, '#352b18', 0]], delay: 0.25, emit: 0.1, order: -1 });
      fx.light({ color: '#ffd878', intensity: 35, pos: [T - 0.6, 2.2, 1.2], range: 22, t0: -0.3, dur: 2.2, env: (t) => (t < 0.25 ? 0.12 + 0.2 * (t + 0.3) : t < 1.5 ? 1 : Math.max(0, 1 - (t - 1.5) / 0.7)), norm: 120 });
      fx.flash(0.25, 0.3, '#fffbe0', 0.08);
      fx.on((t) => { const k = clamp(1 - Math.abs(t - 0.5) * 1.5); fx.target?.set({ rim: '#ffcc60', rimAmt: 1.5 * k * (t > 0.25 ? 1 : 0) }); }); // holy glow on the skeleton (overlay rim, not the shared texture material)
      burst(fx, [T, 0, 0], 0.25, { ramp: GOLD, col: '#ffd878' });
    } },

  /* =============================================================== SWORD COMBO */
  { id: 'moves/sword-combo', name: 'Sword combo', category: 'moves', loop: false, duration: 2.0,
    stage: { sky: 'night', bloom: 0.5, view: { pos: [1.3, 1.6, 6.2], target: [1.2, 1.15, 0], fov: 38 } },
    act: { kind: 'slash', weapon: 'sword', target: [1.49, 0, 0], windup: 0.45,
      keys: [[-0.45, 'guard'], [-0.2, 'windupHigh'], [0, 'cut', 'snap'], [0.14, 'follow'], [0.34, 'sideBack'], [0.47, 'sideCut', 'snap'], [0.62, 'follow'], [0.84, 'overheadUp'], [0.98, 'smashDown', 'snap'], [1.5, 'smashDown'], [2.0, 'guard']],
      hits: [{ t: 0.02, stop: 0.06, shake: 0.15, amp: 0.025, push: 0.9 }, { t: 0.49, stop: 0.07, shake: 0.2, amp: 0.03, push: 1.2 }, { t: 1.0, stop: 0.13, shake: 0.5, amp: 0.07, push: 2.4, flash: 0.25 }] },
    build(fx) {
      const C1 = [[0, '#e8f2ff'], [0.3, '#a9d6ff'], [1, '#1b3fa8']], C2 = [[0, '#e8f2ff'], [0.3, '#cfe6ff'], [1, '#2a58c8']], C3 = [[0, '#fff2dc'], [0.25, '#fff0b0'], [0.6, '#ffa030'], [1, '#a02000']];
      fx.slash({ ...fx.bladeArc(-0.08, 0.12), width: 0.2, t0: 0, dur: 0.3, tail: 0.8, sweep: [0, 1.4], intensity: 1.5, ramp: C1 });
      fx.slash({ ...fx.bladeArc(0.4, 0.56), width: 0.22, t0: 0.45, dur: 0.3, tail: 0.8, sweep: [0, 1.4], intensity: 1.5, ramp: C2 });
      fx.slash({ ...fx.bladeArc(0.9, 1.04), width: 0.3, t0: 0.96, dur: 0.34, tail: 0.9, sweep: [0, 1.4], intensity: 2.6, ramp: C3 });
      const hit = (t, n, p, c, col = '#9cf') => contact(fx, p, t, { sparks: n, dir: [1, 0.2, 0], spread: 1.2, speed: 8, light: col, glintCol: col, lightI: 40 });
      const T3 = fx.anchor('tip', 1.0), G3 = [T3[0], 0, T3[2]]; // finisher: blade tip / ground under it
      hit(0.02, 40, fx.anchor('tip', 0.02)); hit(0.49, 55, fx.anchor('tip', 0.49), 0, '#cfe6ff');
      fx.ring({ t0: 0.49, dur: 0.3, r: [0.1, 1.2], width: [0.1, 0.02], normal: 'cam', pos: fx.anchor('tip', 0.49), intensity: 1.2, ramp: [[0, '#e8f2ff'], [1, '#9cf']] });
      // finisher
      sparks(fx, { t: 1.0, pos: T3, n: 110, dir: [0.3, 1, 0], spread: 1.4, speed: [3, 11], ramp: [[0, '#fff2dc'], [0.3, '#ffd070'], [1, '#a40', 0]] }); glint(fx, T3, 1.0, 1.6, '#fff', '#ffb040');
      fx.ring({ t0: 1.0, dur: 0.7, r: [0.2, 3.8], width: [0.175, 0.03], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.5, '#ffd890'], [1, '#c60']] }); fx.ring({ t0: 1.0, dur: 0.5, r: [0.2, 2.4], width: [0.25, 0.05], normal: 'cam', pos: T3, intensity: 1.3, ramp: [[0, '#fff2dc'], [1, '#fb6']] });
      dust(fx, { t: 1.0, pos: [G3[0], 0.05, G3[2]], r: 0.3, n: 8, speed: [1, 3.5], size: [0.3, 0.9] });
      fx.decal({ kind: 'cracks', t0: 1.0, dur: 1.0, r: [1.6, 2.0], pos: [G3[0], 0.004, G3[2]], reveal: 0.2, heat: [1, 0], cells: 4, fade: [0.05, 0.7], ramp: [[0, '#200'], [0.5, '#c4501a'], [1, '#ffbb50']] });
      fx.flash(1.0, 0.14, '#fff0c0', 0.08);
      burst(fx, G3, 1.0, { ramp: C3, col: '#ffb860', marks: false });
    } },

  /* =============================================================== HAMMER SMASH */
  { id: 'moves/hammer-smash', name: 'Hammer smash', category: 'moves', loop: false, duration: 1.9, tier: 3,
    stage: { sky: 'dusk', bloom: 0.45, view: { pos: [1.6, 1.5, 6.6], target: [1.3, 0.8, 0], fov: 40 } },
    act: { kind: 'smash', weapon: 'hammer', target: [1.33, 0, 0], windup: 0.6, hits: [{ t: 0.0, stop: 0.13, shake: 0.6, amp: 0.09, push: 2.8, flash: 0.3 }] },
    build(fx) {
      const Tp = fx.anchor('tip', 0), I = [Tp[0], 0, Tp[2]]; // hammer head hits the floor in front of the actor
      fx.slash({ ...fx.bladeArc(-0.25, 0.02), width: 0.3, t0: -0.1, dur: 0.22, tail: 0.9, sweep: [0, 1.4], intensity: 2.6, ramp: [[0, '#fff2dc'], [0.3, '#ffd8a0'], [1, '#8a3a10']] });
      fx.ring({ t0: 0, dur: 0.85, r: [0.2, 5.5], width: [0.175, 0.04], normal: 'up', pos: [I[0], 0.01, 0], intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#ffd8a0'], [1, '#a06a30']] });
      fx.ring({ t0: 0.02, dur: 0.4, r: [0.2, 2.6], width: [0.25, 0.05], normal: 'cam', pos: [I[0], 0.5, 0], intensity: 1.2, ramp: [[0, '#fff2dc'], [1, '#fc8']] });
      fx.decal({ kind: 'cracks', t0: 0, dur: 1.85, r: [3.6, 4.4], pos: [I[0], 0.004, 0], reveal: 0.3, heat: [1, 0.1], cells: 4, fade: [0.03, 1.0], ramp: [[0, '#200'], [0.5, '#d4501a'], [1, '#ffcc60']], intensity: 1.4 });
      fx.decal({ kind: 'scorch', t0: 0, dur: 1.85, r: [1.0, 1.4], pos: [I[0], 0.004, 0], fade: [0.1, 1.0], heat: [0.7, 0], ramp: [[0, '#1a1410'], [0.5, '#c4501a'], [1, '#fc8']] });
      dust(fx, { t: 0, pos: [I[0], 0.05, 0], r: 0.4, n: 10, speed: [1.5, 4.5], size: [0.5, 1.4], emit: 0.15 }); rocks(fx, { t: 0, pos: [I[0], 0.15, 0], n: 26, speed: [3, 9], spread: 0.9 });
      sparks(fx, { t: 0, pos: [I[0], 0.1, 0.1], n: 90, dir: [0.5, 1, 0], spread: 1.3, speed: [3, 11], ramp: [[0, '#fff2dc'], [0.3, '#ffd070'], [1, '#a40', 0]] }); glint(fx, [I[0], 0.2, 0.1], 0, 1.4, '#fff', '#ffc060');
      fx.emitter({ count: 50, kind: 'soft', shape: 'ring', radius: 0.9, pos: [I[0], 0.06, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.5, 2], life: [0.4, 0.9], size: [0.05, 0.01], gravity: [0, -3, 0], intensity: 1.5, ramp: [[0, '#fff2c0'], [0.5, '#ffa030'], [1, '#a30', 0]], delay: 0.03, emit: 0.3 });
      fx.flash(0, 0.15, '#ffe6c0', 0.15); fx.shake(0.18, 0.4, 0.035);
      burst(fx, I, 0, { ramp: [[0, '#fff2dc'], [0.4, '#ffd8a0'], [1, '#a06a30']], col: '#ffb060', marks: false });
    } },

  /* =============================================================== FROST NOVA CAST */
  { id: 'moves/frost-nova-cast', name: 'Frost nova', category: 'moves', loop: false, duration: 2.4, tier: 2,
    stage: { sky: 'night', bloom: 0.55, view: { pos: [1.4, 2.2, 7.0], target: [1.2, 0.9, 0], fov: 42 } },
    act: { kind: 'cast', weapon: 'staff', target: [2.4, 0, 0], windup: 0.8, hits: [{ t: 0.1, stop: 0.07, shake: 0.35, amp: 0.05, push: 1.0, flash: 0.2 }] },
    build(fx) {
      const ICE = [[0, '#e8f2ff'], [0.35, '#b8e4ff'], [0.7, '#4aa0ff'], [1, '#103a90']], tp = V();
      // charge at the staff orb
      fx.orb({ kind: 'energy', t0: -0.8, dur: 1.1, r: [0.04, 0.2], ease: 'out', intensity: 1.2, fade: [0.1, 0.25], ramp: [[0, '#06a'], [0.5, '#7cf'], [1, '#fff']], follow: (o) => { fx.body.tip(undefined, o.position); }, power: 1.8 });
      fx.emitter({ count: 50, kind: 'soft', shape: 'sphere', radius: 0.7, pos: [0.1, 1.5, 0.3], speed: [-1.8, -0.8], radial: 1, life: [0.4, 0.6], size: [0.05, 0.015], intensity: 1.5, t0: -0.8, t1: 0.0, emit: 0.8, ramp: [[0, '#8cf', 0], [0.4, '#fff', 1], [1, '#4af', 0]], follow: (m) => fx.body.tip(undefined, m.position) });
      fx.light({ color: '#7cf', intensity: 50, pos: fx.anchor('handR', -0.8, [-0.17, 0.04, 0.17]), range: 6, t0: -0.8, dur: 1.1, fade: [0.3, 0.3], norm: 30 });
      // nova
      fx.flash(0.08, 0.25, '#cfeaff', 0.08);
      fx.ring({ t0: 0.08, dur: 0.9, r: [0.2, 6], width: [0.15, 0.04], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#e8f2ff'], [0.4, '#bfe8ff'], [1, '#2a7ae8']] });
      fx.ring({ t0: 0.12, dur: 0.7, r: [0.2, 4], width: [0.3, 0.06], normal: 'cam', pos: fx.anchor('hips', -0.4, [0, 0.06, 0]), intensity: 1.2, ramp: [[0, '#e8f2ff'], [1, '#6ab8ff']] });
      fx.shell({ t0: 0.08, dur: 0.9, r: [0.3, 3.2], ease: 'out', hemi: true, cells: 5, power: 2, noise: 0.3, intensity: 0.9, fade: [0, 0.6], ramp: [[0, '#014'], [0.5, '#5ab0ff'], [1, '#fff']] });
      fx.decal({ kind: 'frost', t0: 0.08, dur: 2.3, r: [0.5, 4.2], growSpeed: 2.5, reveal: 0.5, cells: 6, fade: [0.1, 1.0], intensity: 1.2, ramp: ICE });
      fx.decal({ kind: 'glow', t0: 0.1, dur: 2.2, r: [3.5, 3.5], ramp: [[0, '#000'], [0.5, '#1a50a0'], [1, '#8ad0ff']], intensity: 0.5, alpha: 0.5, fade: [0.2, 1.2], y: 0.012 });
      // ice crystals burst from the ground
      const mat = new THREE.MeshPhysicalMaterial({ color: '#9fd8ff', metalness: 0, roughness: 0.06, transmission: 0.0, transparent: true, opacity: 0.82, ior: 1.31, clearcoat: 1, flatShading: true, envMapIntensity: 3, emissive: '#2a70d0', emissiveIntensity: 0.35 });
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + 0.2 * Math.sin(i * 3), r = 1.4 + (i % 3) * 0.7 + 0.2 * Math.sin(i * 5), s = new THREE.Mesh(new THREE.ConeGeometry(0.1 + (i % 3) * 0.04, 0.7 + (i % 4) * 0.25, 6), mat); s.geometry.translate(0, 0.35 + (i % 4) * 0.125, 0); const g = new THREE.Group(); g.add(s); g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); g.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
        fx.mesh(g, (t) => { const u = clamp((t - 0.12 - r * 0.06) / 0.14), d = clamp((t - 1.5) / 0.8); const h = eo(u) * (1 - sstep(0, 1, d)); s.scale.set(1, Math.max(1e-3, h), 1); s.visible = h > 0.02; }, { dur: 99 }); }
      fx.emitter({ count: 70, kind: 'shard', blend: 'add', shape: 'ring', radius: 1.2, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 1.0, radial: 0.9, speed: [2, 6], life: [0.7, 1.4], gravity: [0, -7, 0], size: [0.12, 0.05], rot: 5, intensity: 1.2, ramp: [[0, '#e8f2ff'], [0.4, '#aee0ff'], [1, '#2a70d0', 0]], delay: 0.1, emit: 0.2, bounce: 0.3 });
      fx.emitter({ count: 90, kind: 'flake', shape: 'disc', radius: 3.5, pos: [0, 0.2, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.2, 1.2], life: [1.5, 3], size: [0.07, 0.04], rot: 2, intensity: 1.5, turb: [0.3, 1], gravity: [0, -0.3, 0], ramp: [[0, '#e8f2ff', 0], [0.2, '#e8f6ff', 1], [1, '#8ac8ff', 0]], delay: 0.15, emit: 1 });
      fx.emitter({ count: 26, kind: 'smoke', blend: 'normal', lit: 1, shape: 'ring', radius: 1.5, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 1.3, radial: 1, speed: [0.5, 2.5], life: [1.2, 2.2], size: [0.7, 1.8], drag: 1.2, ramp: [[0, '#aec1d6', 0], [0.2, '#9ab5c9', 0.3], [1, '#59799a', 0]], delay: 0.1, emit: 0.2, order: -1 });
      // freeze the target
      fx.on((t) => { const k = sstep(0.55, 0.9, t) * (1 - sstep(1.8, 2.3, t)); fx.target?.set({ frost: k, rim: '#2a80ff', rimAmt: 0.7 * k }); }); // overlay frost + rim on the skeleton
      burst(fx, [0, 0, 0], 0.08, { ramp: ICE, col: '#6ab8ff', dust: false });
    } },

  /* =============================================================== HASTE RUN */
  { id: 'moves/haste-run', name: 'Haste run', category: 'moves', loop: false, duration: 1.8,
    stage: { sky: 'dusk', bloom: 0.5, view: { pos: [0.0, 1.4, 7.2], target: [0, 1.0, 0], fov: 40 } },
    act: { kind: 'thrust', target: false, windup: 0.3, keys: (() => { const k = [[-0.3, 'guard'], [-0.1, 'crouch'], [0.05, 'dashLow']]; for (let i = 0; i < 18; i++) k.push([0.2 + i * 0.1, i % 2 ? 'runB' : 'runA']); k.push([2.1, 'guard']); return k; })() },
    build(fx) {
      const X = (t) => -3.4 + 6.8 * (sstep(-0.1, 1.55, t) * 0.6 + 0.4 * clamp((t + 0.1) / 1.65)) * 1.0;
      const ZZ = (t) => 0.0;
      const keys = fx.keys, DELAYS = [0.1, 0.2, 0.3, 0.4, 0.5], cy = fx.anchor('chest', 0.5)[1];
      fx.on((t, ta) => { fx.body.position.x = X(ta); fx.body.position.y = 0; });
      const ghosts = DELAYS.map((d, i) => { const g = new Dummy({}); g.set({ tint: '#4af', tintAmt: 1, alpha: 0.4 - i * 0.06, rim: '#9df', rimAmt: 1.4, glow: 0.9 }); fx.mesh(g, (t, pr, f, w, o, ta) => { g.position.x = X(ta - d); g.setPose(evalKeys(keys, ta - d)); g.u.uTime.value = ta; g.visible = ta - d > -0.15 && ta < 1.7 + d; g.u.uAlpha.value = (0.42 - i * 0.07) * (1 - sstep(1.5, 1.8, ta)); }, { dur: 99 }); return g; });
      fx.on((t, ta) => { fx.body.set({ tint: '#7cf', tintAmt: 0.0, rim: '#9df', rimAmt: 0.7, glow: 0.2 }); });
      // wind streaks
      for (let i = 0; i < 7; i++) { const y = 0.3 + i * 0.28, z = (i % 3 - 1) * 0.35; fx.ribbon({ points: (t) => { const x = X(t); return [[x - 2.8 - i * 0.2, y, z], [x - 1.4, y + 0.02, z], [x - 0.2, y, z]]; }, n: 16, width: 0.02, t0: -0.1, dur: 1.7, head: () => 1.001, tail: 0.8, intensity: 1.2, ramp: [[0, '#e8f2ff'], [0.4, '#9cf'], [1, '#2a4aa8']], fade: [0.1, 0.25] }); }
      fx.ribbon({ points: (t) => { const x = X(t); return [[x - 2.4, cy, 0.0], [x - 1.2, cy - 0.02, 0.0], [x, cy, 0.0]]; }, n: 14, width: 0.28, t0: -0.1, dur: 1.7, head: () => 1.001, tail: 1.0, intensity: 0.45, core: 2, ramp: [[0, '#cfe8ff'], [0.4, '#5a9aff'], [1, '#0a1a60']], fade: [0.1, 0.25] });
      // dust kicked at the feet + shockwave at launch
      fx.emitter({ count: 120, kind: 'dust', blend: 'normal', lit: 1, shape: 'line', shapeSize: [3.4, 0, 0.1], pos: [0, 0.04, 0], dir: [-0.6, 0.6, 0], spread: 0.7, speed: [0.5, 1.8], life: [0.4, 0.9], size: [0.15, 0.4], ramp: [[0, '#463d30', 0], [0.2, '#5a5040', 0.35], [1, '#2a241d', 0]], delay: 0, emit: 1.6, order: -1, t0: 0, t1: 1.9 });
      fx.ring({ t0: -0.1, dur: 0.45, r: [0.2, 2.0], width: [0.18, 0.04], normal: 'up', pos: [-3.4, 0.02, 0], intensity: 1.0, ramp: [[0, '#e8f2ff'], [1, '#6a9aff']] });
      fx.emitter({ count: 50, kind: 'spark', shape: 'line', shapeSize: [3.4, 0, 0], pos: [0, 0.05, 0], dir: [-1, 0.5, 0], spread: 0.8, speed: [1, 4], life: [0.2, 0.5], gravity: [0, -6, 0], size: [0.05, 0.015], stretch: 1.4, intensity: 3, ramp: [[0, '#e8f2ff'], [0.4, '#aee'], [1, '#26a', 0]], delay: 0, emit: 1.6, t0: 0, t1: 1.9 });
      const lt = fx.light({ color: '#7fb0ff', intensity: 35, pos: [0, 1.5, 1.0], range: 8, t0: -0.1, dur: 1.9, fade: [0.1, 0.3] }); fx.on((t, ta) => { lt.l.position.x = X(ta); });
      shadowDisc(fx, 0.45, (t) => ({ x: X(t), s: 1, a: 0.35 }));
    } },

  /* =============================================================== LIGHTNING CALL */
  { id: 'moves/lightning-call', name: 'Lightning call', category: 'moves', loop: false, duration: 2.2, tier: 2,
    stage: { sky: 'storm', bloom: 0.6, view: { pos: [1.2, 1.7, 7.4], target: [1.3, 2.0, 0], fov: 44 } },
    act: { kind: 'castup', weapon: 'staff', target: [2.6, 0, 0], windup: 0.8, hits: [{ t: 0.12, stop: 0.07, shake: 0.4, amp: 0.06, push: 1.2, flash: 0.35 }, { t: 0.72, stop: 0.05, shake: 0.3, amp: 0.04, push: 0.8, flash: 0.25 }, { t: 1.15, stop: 0.1, shake: 0.6, amp: 0.09, push: 2.4, flash: 0.5 }] },
    build(fx) {
      const T = fx.anchor('tgtFeet'), Gy = fx.anchor('tgt')[1], SKY = (x = 0, z = 0) => [T[0] + x, 9, z];
      // gathering storm clouds above the target
      fx.emitter({ count: 40, kind: 'smoke', blend: 'normal', lit: 1, shape: 'disc', radius: 2.6, pos: [T[0], 7.4, 0], dir: [0, 0, 0], spread: 0.3, speed: [0.05, 0.3], life: [2, 3], size: [2.4, 4.5], ramp: [[0, '#10141c', 0], [0.2, '#1c2230', 0.9], [1, '#0a0d14', 0]], delay: -0.8, emit: 0.8, order: -2, t0: -0.8, swirl: 0.4 });
      fx.emitter({ count: 20, kind: 'soft', shape: 'disc', radius: 2.4, pos: [T[0], 7.0, 0], size: [1.6, 2.4], life: [0.3, 0.7], intensity: 0.0, ramp: [[0, '#8ab0ff', 0], [0.5, '#c8e0ff', 0.0], [1, '#8ab0ff', 0]] });
      // charging arc on the staff
      fx.orb({ kind: 'plasma', t0: -0.8, dur: 1.0, r: [0.04, 0.16], ease: 'out', intensity: 1.5, fade: [0.1, 0.2], ramp: [[0, '#46f'], [0.5, '#9cf'], [1, '#fff']], follow: (o) => { fx.body.tip(undefined, o.position); } });
      fx.bolt({ from: (s) => { const p = fx.body.tip(undefined, V()); return [p.x, p.y, p.z]; }, to: (s) => [2.0 + (s % 3) * 0.2, 7.5, 0.0], t0: -0.6, dur: 0.7, jag: 0.12, branches: 1, width: 0.015, rate: 20, flicker: 0.5, ramp: [[0, '#e8f2ff'], [0.4, '#9cf'], [1, '#26c']], fade: [0.2, 0.2], alpha: 0.5 });
      const strike = (t, big, x = 0) => {
        const w = big ? 0.2 : 0.1, dur = big ? 0.5 : 0.3, to = [T[0] + x, 0.05, 0];
        fx.bolt({ from: SKY(x * 0.5, 0.2), to, t0: t, dur, jag: 0.2, branches: big ? 5 : 3, branchLen: 0.3, width: w, rate: 28, flicker: 0.4, fade: [0, 0.2], ramp: [[0, '#e8f2ff'], [0.35, '#cfe0ff'], [1, '#4a6aff']] });
        fx.beam({ from: SKY(x * 0.5, 0.2), to, r: [big ? 0.5 : 0.3, big ? 0.55 : 0.35], t0: t, dur: dur * 0.8, fade: [0, 0.25], intensity: big ? 0.6 : 0.4, noise: 0.5, edge: 2, ramp: [[0, '#e8f2ff'], [0.5, '#9cc0ff'], [1, '#2a3aa8']] });
        fx.ring({ t0: t, dur: 0.5, r: [0.2, big ? 4.5 : 2.5], width: [0.15, 0.025], normal: 'up', pos: [T[0] + x, 0.02, 0], intensity: 0.3, fill: 0, ramp: [[0, '#e8f2ff'], [0.5, '#b8d0ff'], [1, '#2a4ad8']] });
        fx.bolt({ from: [T[0] + x, 0.1, 0], to: [T[0] + x - 1.6, 0.1, 0.8], t0: t, dur: 0.25, jag: 0.4, branches: 0, width: 0.03, rate: 24, ramp: [[0, '#e8f2ff'], [1, '#6a8aff']] }); fx.bolt({ from: [T[0] + x, 0.1, 0], to: [T[0] + x + 1.4, 0.1, -0.7], t0: t, dur: 0.25, jag: 0.4, branches: 0, width: 0.03, rate: 24, ramp: [[0, '#e8f2ff'], [1, '#6a8aff']] });
        sparks(fx, { t, pos: [T[0] + x, 0.5, 0], n: big ? 100 : 50, dir: [0, 1, 0], spread: 1.4, speed: [3, 10], ramp: [[0, '#e8f2ff'], [0.4, '#aac8ff'], [1, '#24a', 0]] }); glint(fx, [T[0] + x, Gy + 0.1, 0.1], t, big ? 2 : 1.1, '#fff', '#8ab0ff');
        fx.flash(t, big ? 0.3 : 0.16, '#e0ecff', 0.08);
      };
      strike(0.12, false, 0.1); strike(0.72, false, -0.5); strike(1.15, true, 0);
      fx.decal({ kind: 'scorch', t0: 0.12, dur: 2.0, r: [1.4, 2.0], pos: [T[0], 0.004, 0], fade: [0.1, 1.0], heat: [1, 0], ramp: [[0, '#1a1410'], [0.5, '#48f'], [1, '#cdf']] });
      fx.decal({ kind: 'cracks', t0: 1.15, dur: 1.0, r: [2.4, 2.8], pos: [T[0], 0.004, 0], reveal: 0.25, heat: [1, 0], cells: 4, fade: [0.05, 0.8], ramp: [[0, '#003'], [0.5, '#48f'], [1, '#cdf']] });
      fx.emitter({ count: 30, kind: 'smoke', blend: 'normal', lit: 1, shape: 'disc', radius: 0.4, pos: [T[0], 0.1, 0], dir: [0, 1, 0], spread: 0.4, speed: [0.5, 1.5], life: [1.2, 2.2], size: [0.5, 1.4], ramp: [[0, '#4d515e', 0], [0.2, '#4d515e', 0.4], [1, '#1e1e1e', 0]], delay: 0.2, emit: 1.0, order: -1 });
      fx.on((t) => { const k = t > 1.15 ? Math.exp(-(t - 1.15) * 3) : 0; fx.target?.set({ rim: '#5a8aff', rimAmt: 3 * k }); }); // shock flash on the skeleton
      const LR = [[0, '#e8f2ff'], [0.5, '#b8d0ff'], [1, '#2a4ad8']], s1 = { tier: 1, ramp: LR, col: '#9cc0ff', dust: false, debris: false, marks: false };
      burst(fx, [T[0] + 0.1, 0, 0], 0.12, s1); burst(fx, [T[0] - 0.5, 0, 0], 0.72, s1); burst(fx, [T[0], 0, 0], 1.15, { ramp: LR, col: '#9cc0ff', marks: false });
    } },

  /* =============================================================== SHADOW STEP */
  { id: 'moves/shadow-step', name: 'Shadow step', category: 'moves', loop: false, duration: 1.8,
    stage: { sky: 'dark', bloom: 0.55, view: { pos: [1.0, 1.5, 7.0], target: [1.4, 1.0, 0], fov: 40 } },
    act: { kind: 'slash', weapon: 'sword', target: [1.6, 0, 0], windup: 0.9, keys: [[-0.9, 'guard'], [-0.55, 'vanish'], [-0.25, 'vanish'], [-0.2, 'behind'], [0, 'behind'], [0.06, 'cut', 'snap'], [0.2, 'follow'], [0.9, 'guard']], hits: [{ t: 0.05, stop: 0.1, shake: 0.3, amp: 0.045, push: -2.0, flash: 0.2 }] },
    build(fx) {
      const A = [0, 0, 0], B = [2.9, 0, 0.0], hy = fx.anchor('hips', -0.3)[1], cy = fx.anchor('chest', -0.3)[1];
      const mir = (p) => [B[0] - p[0], p[1], -p[2]], ba = fx.bladeArc(0, 0.2), arcB = { center: mir(ba.center), radius: ba.radius, a0: PI - ba.a0, a1: PI - ba.a1, tilt: -ba.tilt }; // body at B faces -X (rotation.y = PI)
      // body: dissolve to smoke at A, reappear behind the target at B facing -X
      fx.on((t, ta) => { const b = fx.body; const phase = ta < -0.28 ? 0 : 1;
        if (ta < -0.28) { b.position.x = A[0]; b.rotation.y = 0; const k = sstep(-0.85, -0.3, ta); b.set({ dissolve: k < 0.002 ? -1 : k, dDir: -1, edge: '#9a4aff', edgeW: 0.09, edgeInt: 4, tint: '#1a0830', tintAmt: 0.55 * k, rim: '#a060ff', rimAmt: 0.9 * k }); }
        else { b.position.x = B[0]; b.rotation.y = PI; const k = 1 - sstep(-0.28, -0.05, ta); b.set({ dissolve: k < 0.002 ? -1 : k, dDir: 1, edge: '#9a4aff', edgeW: 0.09, edgeInt: 4, tint: '#1a0830', tintAmt: 0.5 * k + 0.12 * (1 - sstep(0, 0.5, ta)), rim: '#a060ff', rimAmt: 0.9 * (1 - sstep(-0.1, 0.6, ta)) }); } void phase; });
      const SH = [[0, '#f0e8ff'], [0.2, '#d8a8ff'], [0.55, '#7a30e0'], [1, '#1a0540']];
      // departure
      fx.orb({ kind: 'void', t0: -0.55, dur: 0.5, r: [0.1, 0.9], ease: 'out', pos: fx.anchor('hips', -0.9, [0.1, 0.08, 0]), fade: [0.05, 0.3], intensity: 1.2, power: 2, ramp: [[0, '#000'], [0.5, '#5a20c0'], [1, '#d8a8ff']], noise: 2, scroll: 1.5 }); // anchor-ok
      fx.emitter({ count: 80, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.35, pos: fx.anchor('hips', -0.9, [0, 0.08, 0]), dir: [0, 1, 0], spread: 1.0, speed: [0.3, 1.6], life: [0.8, 1.5], size: [0.5, 1.5], ramp: [[0, '#0a0412', 0], [0.2, '#1a0a30', 0.85], [1, '#05020a', 0]], drag: 1, gravity: [0, 0.4, 0], delay: -0.75, emit: 0.5, order: -1, t0: -0.8, t1: 1.0, turb: [0.4, 1] });
      fx.emitter({ count: 60, kind: 'soft', shape: 'sphere', radius: 0.4, pos: fx.anchor('hips', -0.9, [0, 0.08, 0]), speed: [0.5, 2], radial: 1, dir: [0, 1, 0], spread: 3, life: [0.5, 1.2], size: [0.07, 0.015], intensity: 1.5, ramp: [[0, '#f0e8ff', 1], [0.4, '#b070ff', 0.9], [1, '#40108a', 0]], delay: -0.55, emit: 0.3, t0: -0.6, t1: 1 });
      fx.decal({ kind: 'rune', t0: -0.9, dur: 1.6, r: [1.0, 1.2], pos: [0, 0.006, 0], reveal: 0.35, glyphs: 12, poly: 4, spin: 1.2, ramp: [[0, '#2a0a60'], [0.5, '#8a40ff'], [1, '#e8c8ff']], intensity: 1.2, fade: [0.15, 0.7] });
      fx.decal({ kind: 'scorch', t0: -0.9, dur: 2.5, r: [1.2, 1.4], fade: [0.2, 1.0], heat: [0, 0], ramp: [[0, '#1a1410'], [1, '#2a0a60']] });
      // the dash between the two points: dark streak with violet edge
      fx.ribbon({ points: [[0.2, hy + 0.13, 0], [1.0, hy + 0.23, 0.1], [2.0, hy + 0.18, -0.1], [2.8, hy + 0.08, 0]], n: 40, width: 0.22, t0: -0.3, dur: 0.35, head: (t) => Math.min(1.2, (t + 0.3) / 0.12), tail: 0.9, intensity: 1.5, core: 2.5, ramp: SH, fade: [0, 0.2] });
      fx.ribbon({ points: [[0.2, cy + 0.1, 0], [1.0, cy + 0.2, 0.1], [2.0, cy + 0.1, -0.1], [2.8, cy + 0.05, 0]], n: 40, width: 0.06, t0: -0.28, dur: 0.33, head: (t) => Math.min(1.2, (t + 0.28) / 0.12), tail: 0.7, intensity: 1.5, ramp: [[0, '#f0e8ff'], [1, '#9a4aff']], fade: [0, 0.2] });
      // arrival
      fx.ring({ t0: -0.22, dur: 0.5, r: [0.2, 2.2], width: [0.2, 0.04], normal: 'up', pos: [B[0], 0.02, 0], intensity: 1.2, ramp: SH });
      fx.emitter({ count: 70, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.35, pos: [B[0], hy, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.5, 2], life: [0.6, 1.2], size: [0.5, 1.3], ramp: [[0, '#0a0412', 0], [0.2, '#1a0a30', 0.8], [1, '#05020a', 0]], drag: 1, delay: -0.22, emit: 0.1, order: -1, t0: -0.25 });
      // the strike from behind
      fx.slash({ ...arcB, width: 0.22, t0: 0.0, dur: 0.3, tail: 0.8, sweep: [0, 1.4], intensity: 2.6, ramp: SH });
      fx.slash({ ...arcB, radius: arcB.radius * 1.07, width: 0.07, t0: 0.02, dur: 0.28, tail: 0.6, sweep: [0, 1.4], intensity: 1.5, ramp: [[0, '#f0e8ff'], [1, '#c090ff']] });
      sparks(fx, { t: 0.05, pos: fx.anchor('tgt', 0, [0.1, 0.1, 0]), n: 70, dir: [-1, 0.2, 0], spread: 1.3, speed: [2, 8], ramp: [[0, '#f0e8ff'], [0.4, '#c898ff'], [1, '#40a', 0]] }); glint(fx, fx.anchor('tgt', 0, [0.1, 0.1, 0.05]), 0.05, 1.2, '#fff', '#a060ff'); // anchor-ok
      fx.ring({ t0: 0.05, dur: 0.4, r: [0.2, 2.0], width: [0.2, 0.04], normal: 'cam', pos: fx.anchor('tgt', 0, [0.1, 0.1, 0]), intensity: 1.2, ramp: SH }); // anchor-ok
      fx.light({ color: '#9a50ff', intensity: 35, pos: [1.7, 1.4, 1.0], range: 9, t0: -0.3, dur: 1.2, env: (t) => (t < 0 ? 0.35 : Math.exp(-t * 3)), norm: 40 });
      fx.light({ color: '#7030d0', intensity: 35, pos: [0, 1.2, 0.8], range: 6, t0: -0.9, dur: 0.7, fade: [0.2, 0.3] });
    } },
];
