// pickups: real 3D PBR objects (coin, gem, heart, key, potion, star, shard, chest...) + sparkles / glints / light.
import * as THREE from 'three';
import { burst } from './_aaa.js';

const TAU = Math.PI * 2, sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));

/** soft contact shadow disc on the floor. fn(t) -> {s, a} (scale multiplier, opacity) */
function contactShadow(fx, r = 0.35, fn) {
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uA: { value: 0.6 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA; varying vec2 vUv; void main(){ float d=length(vUv-.5)*2.; float a=smoothstep(1.,.15,d); a*=a; gl_FragColor=vec4(0.,0.,0.,a*uA); }' });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); o.rotation.x = -Math.PI / 2; o.position.y = 0.006; o.renderOrder = 5; o.frustumCulled = false;
  fx.mesh(o, (t) => { const k = fn ? fn(t) : { s: 1, a: 0.6 }; o.scale.setScalar(r * k.s); m.uniforms.uA.value = k.a; if (k.x !== undefined) { o.position.x = k.x; o.position.z = k.z; } }, {});
  return o;
}
const metal = (color, rough = 0.25, extra = {}) => new THREE.MeshStandardMaterial({ color, metalness: 1, roughness: rough, envMapIntensity: 2.2, ...extra });
const glow = (fx, color, x, y, z, I = 14, range = 6, p = {}) => fx.light({ color, intensity: I, pos: [x, y, z], range, ...p });

/** 4-point glint sparkles scattered around a volume */
function sparkles(fx, color, pos, rad, n = 8, extra = {}) {
  return fx.emitter({ count: n, kind: 'glint', shape: 'sphere', radius: rad, pos, size: [0.22, 0.05], sizeVar: 0.5, life: [0.5, 0.7], speed: [0, 0.08], intensity: 3.5,
    ramp: [[0, color, 0], [0.25, '#fff', 1], [1, color, 0]], rot: 0.5, ...extra });
}

/* ------------------------------------------------------------ shared geometry builders */
function coinGeo() {
  // lathe cross-section: raised rim, recessed field, raised centre boss
  const pts = [[0, 0.016], [0.07, 0.016], [0.085, 0.024], [0.105, 0.018], [0.14, 0.013], [0.165, 0.013], [0.172, 0.022], [0.19, 0.026], [0.205, 0.024], [0.215, 0.016], [0.22, 0.008], [0.22, -0.008], [0.215, -0.016], [0.205, -0.024], [0.19, -0.026], [0.172, -0.022], [0.165, -0.013], [0.14, -0.013], [0.105, -0.018], [0.085, -0.024], [0.07, -0.016], [0, -0.016]];
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), 56); g.computeVertexNormals(); return g;
}
function starShape(R = 1, r = 0.45, n = 5) { const s = new THREE.Shape(); for (let i = 0; i < n * 2; i++) { const a = Math.PI / 2 + (i * Math.PI) / n, q = i % 2 ? r : R; const x = Math.cos(a) * q, y = Math.sin(a) * q; i ? s.lineTo(x, y) : s.moveTo(x, y); } s.closePath(); return s; }
function heartShape() { const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.15, -0.35, -0.55, -0.12, -0.55, 0.14); s.bezierCurveTo(-0.55, 0.38, -0.28, 0.5, -0.1, 0.46); s.bezierCurveTo(-0.04, 0.45, 0, 0.4, 0, 0.32); s.bezierCurveTo(0, 0.4, 0.04, 0.45, 0.1, 0.46); s.bezierCurveTo(0.28, 0.5, 0.55, 0.38, 0.55, 0.14); s.bezierCurveTo(0.55, -0.12, 0.15, -0.35, 0, -0.5); return s; }
function heartGeo(depth = 0.22, bevel = 0.1) { const g = new THREE.ExtrudeGeometry(heartShape(), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 8, curveSegments: 28 }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return g; }
/** brilliant-cut lathe (octagonal facets): table, crown, girdle, pavilion, culet */
function gemGeo(seg = 8, scale = 1) {
  const pts = [[0, 0.2], [0.17, 0.2], [0.33, 0.1], [0.4, 0.04], [0.4, 0.0], [0.38, -0.04], [0.0, -0.4]];
  const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0] * scale, p[1] * scale)), seg); g.computeVertexNormals(); return g.toNonIndexed();
}
function rubyMat(color = '#e0143c', extra = {}) { return new THREE.MeshPhysicalMaterial({ color, metalness: 0, roughness: 0.02, transmission: 0.85, thickness: 0.5, ior: 2.4, iridescence: 0.7, iridescenceIOR: 1.8, attenuationColor: new THREE.Color(color), attenuationDistance: 0.35, flatShading: true, envMapIntensity: 3, specularIntensity: 1, clearcoat: 1, ...extra }); }
/** random-ish deterministic hash */
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

/* ----------------------------------------------------------------- the 3D sword for loot beam */
function swordMesh() {
  const g = new THREE.Group(), steel = metal('#d3dbe6', 0.18), gold = metal('#d9a93a', 0.28), grip = new THREE.MeshStandardMaterial({ color: '#3a1d14', roughness: 0.7 });
  const sh = new THREE.Shape(); sh.moveTo(-0.05, 0); sh.lineTo(0.05, 0); sh.lineTo(0.05, 0.78); sh.lineTo(0, 0.92); sh.lineTo(-0.05, 0.78); sh.closePath();
  const bg = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 }); bg.translate(0, 0.16, -0.006);
  const blade = new THREE.Mesh(bg, steel); g.add(blade);
  const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.6, 0.044), metal('#8a95a5', 0.35)); fuller.position.set(0, 0.5, 0); g.add(fuller);
  const guard = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.34, 6, 12), gold); guard.rotation.x = Math.PI / 2; guard.rotation.z = 0; guard.rotation.set(0, 0, Math.PI / 2); guard.position.y = 0.16; g.add(guard);
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.2, 14), grip); handle.position.y = 0.05; g.add(handle);
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), gold); pom.position.y = -0.08; g.add(pom);
  const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), new THREE.MeshStandardMaterial({ color: '#b5f', emissive: '#a3f', emissiveIntensity: 2.5, roughness: 0.1 })); jewel.position.set(0, 0.16, 0.03); g.add(jewel);
  return g;
}

/* ----------------------------------------------------------------- chest */
function woodTexture(seed = 1) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#6b3f1f'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) { const y = hash(i + seed) * 256, h = 1 + hash(i * 3 + seed) * 4, v = 20 + hash(i * 7 + seed) * 50; x.fillStyle = `rgba(${v + 20},${v * 0.55},${v * 0.2},${0.18 + hash(i * 11) * 0.25})`; x.fillRect(0, y, 256, h);
    x.strokeStyle = `rgba(30,12,4,${0.15 + hash(i) * 0.2})`; x.beginPath(); x.moveTo(0, y); for (let k = 0; k <= 8; k++) x.lineTo(k * 32, y + Math.sin(k + i) * 2.5); x.stroke(); }
  for (let i = 0; i < 6; i++) { x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(i * 43, 0, 2, 256); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function buildChest() {
  const g = new THREE.Group(); const W = 0.95, H = 0.46, D = 0.58, tex = woodTexture();
  const wood = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.78, metalness: 0.02, bumpMap: tex, bumpScale: 1.2 });
  const iron = new THREE.MeshStandardMaterial({ color: '#3b3f46', metalness: 0.9, roughness: 0.42, envMapIntensity: 1.5 }); const brass = metal('#d9a93a', 0.3);
  const inner = new THREE.MeshStandardMaterial({ color: '#2a1608', roughness: 1, side: THREE.DoubleSide });
  const body = new THREE.Group(); g.add(body);
  const box = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), wood); box.position.y = H / 2; body.add(box);
  const cav = new THREE.Mesh(new THREE.BoxGeometry(W - 0.1, 0.02, D - 0.1), inner); cav.position.y = H - 0.14; body.add(cav);
  const trim = (x, w) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, H + 0.01, D + 0.04), iron); b.position.set(x, H / 2, 0); body.add(b); }; trim(-W / 2 + 0.11, 0.09); trim(W / 2 - 0.11, 0.09);
  const rim = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), iron); rim.position.y = H - 0.02; body.add(rim); const base = new THREE.Mesh(new THREE.BoxGeometry(W + 0.04, 0.05, D + 0.04), iron); base.position.y = 0.025; body.add(base);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const r = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), brass); r.position.set(sx * (W / 2 - 0.11), 0.08, sz * (D / 2 + 0.02)); body.add(r); const r2 = r.clone(); r2.position.y = H - 0.1; body.add(r2); }
  // lid: half-cylinder (axis along X, bulging up) pivoted at the back top edge
  const hinge = new THREE.Group(); hinge.position.set(0, H, -D / 2); g.add(hinge);
  const lidR = D / 2, lid = new THREE.Group(); lid.position.z = lidR; hinge.add(lid);
  const hc = (r, w) => { const q = new THREE.CylinderGeometry(r, r, w, 32, 1, false, 0, Math.PI); q.rotateZ(Math.PI / 2); return q; };
  lid.add(new THREE.Mesh(hc(lidR, W), wood));
  const mkBand = (x, w) => { const b = new THREE.Mesh(hc(lidR + 0.012, w), iron); b.position.x = x; lid.add(b); }; mkBand(-W / 2 + 0.11, 0.09); mkBand(W / 2 - 0.11, 0.09);
  const capM = wood.clone(); capM.side = THREE.DoubleSide;
  for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CircleGeometry(lidR, 32, 0, Math.PI), capM); cap.rotation.y = Math.PI / 2; cap.position.x = s * W / 2; lid.add(cap); }
  const lidM = lid;
    const lockB = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.15, 0.03), brass); lockB.position.set(0, H - 0.1, D / 2 + 0.03); body.add(lockB);
  const keyhole = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.04, 8), new THREE.MeshBasicMaterial({ color: '#000' })); keyhole.rotation.x = Math.PI / 2; keyhole.position.set(0, H - 0.1, D / 2 + 0.052); body.add(keyhole);
  // gold pile inside
  const pg = new THREE.SphereGeometry(0.4, 28, 16, 0, TAU, 0, Math.PI / 2); const pp = pg.attributes.position; for (let i = 0; i < pp.count; i++) { const x = pp.getX(i), z = pp.getZ(i); pp.setY(i, pp.getY(i) * 0.4 * (1 + 0.25 * Math.sin(x * 20) * Math.cos(z * 17))); pp.setX(i, x * 1.05); pp.setZ(i, z * 0.62); } pg.computeVertexNormals();
  const pile = new THREE.Mesh(pg, metal('#e8b53a', 0.3)); pile.position.y = H - 0.18; body.add(pile);
  return { g, hinge, pile, H, W, D, lid };
}
function sim(n, step, fn) { const out = []; for (let i = 0; i < n; i++) out.push(fn(i)); return out; }
/** ballistic particle with ground bounces, precomputed at 1/60 */
function ballistic(x0, y0, z0, vx, vy, vz, R, T, e = 0.45, floor = 0) {
  const N = Math.ceil(T * 60) + 1, A = new Float32Array(N * 4); let x = x0, y = y0, z = z0, ux = vx, uy = vy, uz = vz, first = -1, landed = false;
  for (let i = 0; i < N; i++) {
    A[i * 4] = x; A[i * 4 + 1] = y; A[i * 4 + 2] = z; A[i * 4 + 3] = first < 0 ? -1 : i / 60 - first;
    uy -= 9.8 / 60; x += ux / 60; y += uy / 60; z += uz / 60;
    if (y < floor + R && uy < 0) { y = floor + R; if (Math.abs(uy) < 0.7) { uy = 0; ux *= 0.9; uz *= 0.9; if (first < 0) first = i / 60; } else { uy = -uy * e; ux *= 0.8; uz *= 0.8; if (first < 0) first = i / 60; } }
    if (uy === 0) { ux *= 0.92; uz *= 0.92; }
  }
  return A;
}

export default [
  /* ===================================================================== chest-open */
  { id: 'pickups/chest-open', name: 'Chest open', category: 'pickups', loop: false, duration: 4.6,
    stage: { sky: 'dusk', bloom: 0.5, view: { pos: [1.5, 1.35, 2.9], target: [0, 0.45, 0], fov: 38 }, exposure: 1 },
    build(fx) {
      const C = buildChest(); fx.mesh(C.g, (t) => {
        const open = t < 0.9 ? 0 : t < 1.55 ? sstep(0.9, 1.3, t) * 1.0 + 0 : 1; // opens fast
        let a = 1.95 * sstep(0.85, 1.45, t); a += 0.14 * Math.sin(clamp((t - 1.3) / 0.8) * Math.PI) * (1 - sstep(1.3, 2.1, t)) * (t > 1.3 ? 1 : 0);
        const shake = t < 0.85 ? Math.sin(t * 55) * 0.012 * sstep(0.0, 0.5, t) * (t > 0.2 ? 1 : 0) : 0;
        C.hinge.rotation.x = -a; C.g.position.x = shake; C.g.rotation.z = shake * 0.4; void open;
      }, { dur: 99 });
      contactShadow(fx, 0.85, () => ({ s: 1, a: 0.7 }));
      // coins + gems
      const coinG = coinGeo(), N = 30, gemN = 7, T = 4.6; const cm = metal('#f1b72b', 0.22);
      const coinIM = new THREE.InstancedMesh(coinG, cm, N); const gemIM = new THREE.InstancedMesh(gemGeo(6, 0.6), new THREE.MeshPhysicalMaterial({ color: '#fff', metalness: 0.1, roughness: 0.05, transmission: 0.6, thickness: 0.3, ior: 2.2, flatShading: true, envMapIntensity: 3, iridescence: 0.8 }), gemN);
      const cols = ['#ff2a55', '#35e08a', '#4aa8ff', '#ffd23a', '#c75bff', '#ff8a2a', '#5ff']; cols.forEach((c, i) => gemIM.setColorAt(i, new THREE.Color(c)));
      coinIM.frustumCulled = gemIM.frustumCulled = false;
      const mk = (n, scale) => sim(n, 0, (i) => { const r = () => fx.rng(); const a = (r() - 0.5) * 1.8 + 0.2, sp = 1.4 + r() * 2.2; const vx = Math.sin(a) * sp * 0.7 + (r() - 0.5) * 0.4, vz = Math.cos(a) * sp * 0.75 + 0.2; return { tl: 1.18 + r() * 0.5, A: null, vx, vz, vy: 3.4 + r() * 2.4, axis: new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize(), turns: 3 + Math.floor(r() * 4), yaw: r() * TAU, x0: (r() - 0.5) * 0.5, z0: (r() - 0.5) * 0.2, sc: (scale === 1 ? 0.4 : 0.5) * (0.85 + r() * 0.3) }; });
      const coins = mk(N, 1), gems = mk(gemN, 2); [coins, gems].forEach((arr, k) => arr.forEach((c) => { c.A = ballistic(c.x0, 0.55, c.z0, c.vx * (k ? 1 : 1), c.vy, c.vz, k ? 0.05 : 0.02, T - c.tl + 0.05, 0.42); }));
      const o = new THREE.Object3D(), q = new THREE.Quaternion(), q2 = new THREE.Quaternion();
      const place = (im, arr, i, t, flat) => {
        const c = arr[i], tt = t - c.tl; if (tt < 0) { o.position.set(0, -5, 0); o.scale.setScalar(1e-4); } else {
          const k = Math.min(c.A.length / 4 - 1, Math.floor(tt * 60)), f = tt * 60 - k, k2 = Math.min(c.A.length / 4 - 1, k + 1);
          o.position.set(c.A[k * 4] + (c.A[k2 * 4] - c.A[k * 4]) * f, c.A[k * 4 + 1] + (c.A[k2 * 4 + 1] - c.A[k * 4 + 1]) * f, c.A[k * 4 + 2] + (c.A[k2 * 4 + 2] - c.A[k * 4 + 2]) * f); o.scale.setScalar(c.sc);
          const ground = c.A[k * 4 + 3]; const sp = ground < 0 ? tt : c.firstT ?? (c.firstT = tt - ground); const ease = Math.min(1, (ground < 0 ? tt / (c.firstT || 1.1) : 1)); void sp; void ease;
          const ang = Math.min(1, tt / 1.25); q.setFromAxisAngle(c.axis, Math.PI * c.turns * (1 - Math.pow(1 - ang, 2))); q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), c.yaw); o.quaternion.copy(q).multiply(q2);
          if (flat && ang >= 1) o.quaternion.copy(q2);
        } o.updateMatrix(); im.setMatrixAt(i, o.matrix);
      };
      fx.mesh(coinIM, (t) => { for (let i = 0; i < N; i++) place(coinIM, coins, i, t, true); coinIM.instanceMatrix.needsUpdate = true; }, { dur: 99 });
      fx.mesh(gemIM, (t) => { for (let i = 0; i < gemN; i++) place(gemIM, gems, i, t, true); gemIM.instanceMatrix.needsUpdate = true; }, { dur: 99 });
      // pile coins sticking out
      const pcn = 16, pcIM = new THREE.InstancedMesh(coinG, cm, pcn); pcIM.frustumCulled = false; for (let i = 0; i < pcn; i++) { const a = fx.rng() * TAU, r = fx.rng() * 0.28; o.position.set(Math.cos(a) * r * 1.3, 0.34 + (0.2 - r * 0.4) + fx.rng() * 0.03, Math.sin(a) * r * 0.7); o.rotation.set((fx.rng() - 0.5) * 1.2, fx.rng() * TAU, (fx.rng() - 0.5) * 1.2); o.scale.setScalar(0.45); o.updateMatrix(); pcIM.setMatrixAt(i, o.matrix); }
      fx.mesh(pcIM, null, { dur: 99 });
      // light from inside + god rays
      const lo = (t) => sstep(0.85, 1.4, t) * (1 - 0.35 * sstep(2, 4.4, t));
      fx.light({ color: '#ffc457', intensity: 40, pos: [0, 0.8, 0.05], range: 8, env: lo, norm: 40 });
      fx.beam({ pos: [0, 0.45, 0], height: 3.4, r: [0.3, 0.55], t0: 0.85, fade: [0.5, 1.2], intensity: 0.4, noise: 0.7, freq: 2.5, speed: 1, edge: 1.2, ramp: [[0, '#fff2c0'], [0.5, '#ffc55a'], [1, '#a05010']], alpha: 0.7 });
      fx.beam({ pos: [0, 0.45, 0], height: 2.2, r: [0.12, 0.3], t0: 0.85, fade: [0.2, 1.6], intensity: 0.7, noise: 0.5, edge: 1.0, ramp: [[0, '#fff2dc'], [0.5, '#ffe08a'], [1, '#c70']] });
      fx.decal({ kind: 'glow', r: [1.4, 1.6], t0: 0.85, fade: [0.4, 1.5], intensity: 0.6, ramp: [[0, '#000'], [0.4, '#a85a10'], [1, '#ffcf70']], alpha: 0.8, y: 0.008 });
      fx.ring({ t0: 0.95, dur: 0.8, r: [0.2, 2.2], width: [0.2, 0.05], normal: 'up', intensity: 0.7, ramp: [[0, '#fff2dc'], [0.5, '#fd9'], [1, '#c80']] });
      fx.shake(0.9, 0.35, 0.025);
      fx.emitter({ count: 70, kind: 'soft', shape: 'disc', radius: 0.3, pos: [0, 0.55, 0], dir: [0, 1, 0], spread: 0.7, speed: [0.6, 2.4], life: [1, 2.4], size: [0.08, 0.02], gravity: [0, -0.2, 0], drag: 0.5, ramp: [[0, '#fff3c0'], [0.4, '#ffc040'], [1, '#c60', 0]], intensity: 1.5, delay: 0.95, emit: 0.4, turb: [0.3, 1] });
      sparkles(fx, '#ffd36a', [0, 0.9, 0], 0.7, 14, { delay: 1.1, emit: 2.5, life: [0.5, 0.7], size: [0.28, 0.06] });
      fx.emitter({ count: 24, kind: 'dust', blend: 'normal', lit: 1, shape: 'box', shapeSize: [0.4, 0.02, 0.25], pos: [0, 0.5, 0], dir: [0, 1, 0], spread: 1, speed: [0.2, 0.6], life: [1.5, 3], size: [0.2, 0.5], ramp: [[0, '#463b2a', 0], [0.2, '#5d503a', 0.25], [1, '#30281b', 0]], delay: 0.9, emit: 0.3, order: -1 });
    } },

  /* ===================================================================== coin-spin */
  { id: 'pickups/coin-spin', name: 'Coin spin', category: 'pickups', loop: true, duration: 1.6,
    stage: { sky: 'dusk', bloom: 0.45, view: { pos: [1.0, 1.0, 1.9], target: [0, 0.62, 0], fov: 36 } },
    build(fx) {
      const grp = new THREE.Group(), inner = new THREE.Group(); grp.add(inner); inner.rotation.x = Math.PI / 2;
      const gold = metal('#f4b92c', 0.22); inner.add(new THREE.Mesh(coinGeo(), gold));
      // embossed star on both faces
      const sg = new THREE.ExtrudeGeometry(starShape(0.075, 0.034), { depth: 0.006, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2 });
      for (const s of [1, -1]) { const m = new THREE.Mesh(sg, gold); m.rotation.x = s > 0 ? -Math.PI / 2 : Math.PI / 2; m.position.y = s * 0.018; inner.add(m); }
      // reeded edge ticks
      const tick = new THREE.BoxGeometry(0.012, 0.03, 0.012); const ticks = new THREE.InstancedMesh(tick, gold, 64); const o = new THREE.Object3D(); for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU; o.position.set(Math.cos(a) * 0.222, 0, Math.sin(a) * 0.222); o.rotation.set(0, -a, 0); o.updateMatrix(); ticks.setMatrixAt(i, o.matrix); } inner.add(ticks);
      grp.scale.setScalar(1.35);
      fx.mesh(grp, (t) => { grp.rotation.y = (t / 1.6) * TAU; grp.position.y = 0.66 + Math.sin((t / 1.6) * TAU) * 0.04; grp.rotation.z = 0.12 * Math.sin((t / 1.6) * TAU); });
      contactShadow(fx, 0.34, (t) => ({ s: 1 - 0.1 * Math.sin((t / 1.6) * TAU), a: 0.55 }));
      glow(fx, '#ffd070', 0.5, 1.0, 0.9, 25, 6); glow(fx, '#6a8cff', -0.8, 0.5, -0.4, 10, 5);
      // sweeping glint when the face turns to the key light
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 0.66, 0.0], size: [0.55, 0.55], life: [0.28, 0.28], intensity: 4, ramp: [[0, '#fff'], [1, '#ffd070', 0]], delay: 0.18, emit: 0.001, follow: (m, ta, t) => m.position.set(0.14 + 0.03 * Math.sin(t * 6), 0.78, 0.05) });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0.1, 0.55, 0.05], size: [0.4, 0.4], life: [0.25, 0.25], intensity: 3.5, ramp: [[0, '#fff'], [1, '#ffd070', 0]], delay: 0.98, emit: 0.001 });
      sparkles(fx, '#ffe090', [0, 0.68, 0], 0.4, 4);
    } },

  /* ===================================================================== collect-burst */
  { id: 'pickups/collect-burst', name: 'Collect burst', category: 'pickups', loop: false, duration: 1.35, tier: 1,
    stage: { sky: 'dusk', bloom: 0.45, view: { pos: [1.2, 1.4, 4.0], target: [0, 0.85, 0], fov: 38 } },
    build(fx) {
      const c = new THREE.Mesh(coinGeo(), metal('#f4b92c', 0.22)); const g = new THREE.Group(); const inner = new THREE.Group(); inner.rotation.x = Math.PI / 2; inner.add(c); g.add(inner); g.scale.setScalar(1.3);
      fx.mesh(g, (t) => { const u = clamp(t / 0.36); g.position.set(0, 0.5 + 0.55 * Math.min(1, u) + 0.2 * u * u, 0); g.rotation.y = t * 14; g.scale.setScalar(1.3 * (t < 0.36 ? 1 + 0.2 * u : Math.max(0.001, 1 - (t - 0.36) / 0.12) * 1.2)); g.visible = t < 0.5; }, { dur: 0.6 });
      const P = [0, 0.95, 0];
      fx.ring({ t0: 0.36, dur: 0.7, r: [0.1, 1.0], width: [0.14, 0.03], normal: 'cam', pos: P, intensity: 1.2, ramp: [[0, '#fff0c0'], [0.5, '#ffd060'], [1, '#e90']] });
      fx.ring({ t0: 0.4, dur: 0.8, r: [0.1, 1.5], width: [0.08, 0.02], normal: 'up', y: 0.02, intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [1, '#d90']] });
      fx.emitter({ count: 1, kind: 'glint', pos: P, size: [0.8, 0.3], life: [0.32, 0.32], intensity: 1.6, delay: 0.36, ramp: [[0, '#fff'], [1, '#fc6', 0]] });
      fx.emitter({ count: 1, kind: 'soft', pos: P, size: [0.5, 0.15], life: [0.4, 0.4], intensity: 0.5, delay: 0.36, ramp: [[0, '#fff2dc'], [1, '#fb4', 0]] });
      fx.emitter({ count: 60, kind: 'spark', shape: 'point', pos: P, dir: [0, 1, 0], spread: 3.14, speed: [1.5, 4.5], life: [0.4, 0.7], gravity: [0, -3.2, 0], drag: 1.2, size: [0.06, 0.015], stretch: 0.9, intensity: 2.5, delay: 0.36, ramp: [[0, '#fff4c8'], [0.4, '#ffc840'], [1, '#c60', 0]] });
      sparkles(fx, '#ffe090', P, 0.7, 12, { delay: 0.38, emit: 0.25, life: [0.5, 0.7], size: [0.3, 0.06], speed: [0.1, 0.6], radial: 0.3 });
      fx.emitter({ count: 24, kind: 'soft', shape: 'sphere', radius: 0.6, pos: P, speed: [-1.8, -1.0], radial: 1, life: [0.3, 0.34], size: [0.07, 0.02], intensity: 1.5, t0: 0, t1: 0.36, emit: 0.3, ramp: [[0, '#ffd070', 0], [0.4, '#ffe8a0', 1], [1, '#ffd070', 0]] });
      burst(fx, P, 0.36, { ground: false, impact: false, ramp: [[0, '#fff2dc'], [0.5, '#ffd060'], [1, '#e90']], col: '#ffd070' });
    } },

  /* ===================================================================== crystal-shard */
  { id: 'pickups/crystal-shard', name: 'Crystal shard', category: 'pickups', loop: true, duration: 3.2,
    stage: { sky: 'dark', bloom: 0.6, view: { pos: [1.4, 1.2, 2.4], target: [0, 0.78, 0], fov: 36 } },
    build(fx) {
      const grp = new THREE.Group(); const prof = [[0, 0.62], [0.05, 0.55], [0.17, 0.3], [0.2, 0.0], [0.2, -0.2], [0.14, -0.35], [0, -0.55]];
      const mk = (s) => { const g = new THREE.LatheGeometry(prof.map((p) => new THREE.Vector2(p[0] * s, p[1] * s)), 6); g.computeVertexNormals(); return g.toNonIndexed(); };
      const amber = new THREE.MeshPhysicalMaterial({ color: '#ffa31a', metalness: 0, roughness: 0.05, transmission: 0.9, thickness: 0.7, ior: 1.7, attenuationColor: new THREE.Color('#ff7a00'), attenuationDistance: 0.4, flatShading: true, envMapIntensity: 2.5, clearcoat: 1, iridescence: 0.3 });
      const main = new THREE.Mesh(mk(1), amber); main.scale.set(0.9, 1, 0.9); grp.add(main);
      const core = new THREE.Mesh(mk(0.55), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9a20').multiplyScalar(2.2) })); core.scale.set(0.9, 1, 0.9); grp.add(core);
      const small = []; for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(mk(0.22 + 0.06 * i), amber); grp.add(m); small.push(m); }
      fx.mesh(grp, (t) => { const k = (t / 3.2) * TAU; grp.position.y = 0.92 + 0.07 * Math.sin(k); main.rotation.y = k; main.rotation.z = 0.12 * Math.sin(k); core.rotation.copy(main.rotation); core.scale.setScalar(0.9 * (1 + 0.08 * Math.sin(k * 3)));
        small.forEach((m, i) => { const a = k + (i / 3) * TAU; m.position.set(Math.cos(a) * 0.42, 0.1 * Math.sin(k * 2 + i * 2) + [0.1, -0.1, 0.0][i], Math.sin(a) * 0.42); m.rotation.set(a * 2, a, 0.4 * i); }); });
      contactShadow(fx, 0.45, (t) => ({ s: 1 + 0.08 * Math.sin((t / 3.2) * TAU), a: 0.5 }));
      fx.light({ color: '#ff9a2a', intensity: 25, pos: [0, 0.95, 0.15], range: 7, env: (t) => 0.8 + 0.2 * Math.sin((t / 3.2) * TAU * 2), norm: 30 });
      fx.decal({ kind: 'glow', r: [0.95, 0.95], intensity: 1.0, ramp: [[0, '#000'], [0.5, '#a04000'], [1, '#ff9a30']], alpha: 0.7, y: 0.006 });
      sparkles(fx, '#ffcf70', [0, 0.95, 0], 0.55, 8, { size: [0.26, 0.05] });
      fx.emitter({ count: 22, kind: 'soft', shape: 'sphere', radius: 0.4, pos: [0, 0.8, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.1, 0.4], life: [1.6, 3.2], size: [0.035, 0.01], intensity: 1.5, gravity: [0, 0.1, 0], turb: [0.2, 1], ramp: [[0, '#ffb040', 0], [0.3, '#ffd080', 1], [1, '#f60', 0]] });
    } },

  /* ===================================================================== gem-spin */
  { id: 'pickups/gem-spin', name: 'Gem spin', category: 'pickups', loop: true, duration: 2.4,
    stage: { sky: 'dark', bloom: 0.55, view: { pos: [1.1, 1.15, 2.1], target: [0, 0.72, 0], fov: 34 } },
    build(fx) {
      const grp = new THREE.Group(); const g = gemGeo(8, 1.5);
      const gem = new THREE.Mesh(g, rubyMat('#b8062a', { transmission: 0.8 })); gem.scale.setScalar(1);
      const inner = new THREE.Mesh(gemGeo(8, 0.9), new THREE.MeshBasicMaterial({ color: new THREE.Color('#d01040').multiplyScalar(0.8) })); inner.rotation.y = 0.2;
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(g, 20), new THREE.LineBasicMaterial({ color: new THREE.Color('#ff9ab0'), transparent: true, opacity: 0.5 }));
      grp.add(inner, gem, wire);
      fx.mesh(grp, (t) => { const k = (t / 2.4) * TAU; grp.rotation.y = k; grp.rotation.z = 0.18; grp.rotation.x = 0.1 * Math.sin(k); grp.position.y = 0.78 + 0.05 * Math.sin(k); inner.scale.setScalar(1 + 0.08 * Math.sin(k * 2)); });
      contactShadow(fx, 0.42, (t) => ({ s: 1 + 0.06 * Math.sin((t / 2.4) * TAU), a: 0.55 }));
      // two orbiting coloured lights give moving refracted flashes
      fx.light({ color: '#ff2a55', intensity: 22, pos: [0.4, 0.9, 0.4], range: 5, flicker: 0.1, rate: 2.6 });
      fx.light({ color: '#ffffff', intensity: 22, pos: [0, 0, 0], range: 5 });
      fx.on((t) => { const a = (t / 2.4) * TAU; const L = fx.parts.filter((p) => p.l); if (L[1]) L[1].l.position.set(Math.cos(-a * 2) * 0.9, 1.2, Math.sin(-a * 2) * 0.9); if (L[0]) L[0].l.position.set(Math.cos(a) * 0.7, 0.6, Math.sin(a) * 0.7); });
      fx.decal({ kind: 'glow', r: [0.9, 0.9], intensity: 0.8, ramp: [[0, '#000'], [0.5, '#80102a'], [1, '#ff3060']], alpha: 0.6, y: 0.006 });
      // rainbow glints (dispersion)
      ['#ff4466', '#ffd040', '#4488ff', '#ffffff'].forEach((c, i) => fx.emitter({ count: 1, kind: 'glint', shape: 'sphere', radius: 0.22, pos: [0, 0.8, 0.1], size: [0.5, 0.2], life: [0.35, 0.35], intensity: 4, delay: 0.3 + i * 0.6, ramp: [[0, '#fff'], [0.3, c], [1, c, 0]], emit: 0.001 }));
      sparkles(fx, '#ff9ab8', [0, 0.8, 0], 0.5, 6);
      fx.beam({ pos: [0, 0.3, 0], height: 1.3, r: [0.25, 0.04], intensity: 0.25, noise: 0.5, ramp: [[0, '#ff6080'], [1, '#400010']], alpha: 0.5 });
    } },

  /* ===================================================================== heart-pickup */
  { id: 'pickups/heart-pickup', name: 'Heart pickup', category: 'pickups', loop: true, duration: 1.2,
    stage: { sky: 'dusk', bloom: 0.5, view: { pos: [0.8, 1.15, 2.7], target: [0, 0.8, 0], fov: 36 } },
    build(fx) {
      const grp = new THREE.Group(); const mat = new THREE.MeshPhysicalMaterial({ color: '#b8081f', roughness: 0.22, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, sheen: 1, sheenColor: new THREE.Color('#ff8090'), envMapIntensity: 1.6, emissive: new THREE.Color('#5a0010'), emissiveIntensity: 0.4 });
      const heart = new THREE.Mesh(heartGeo(0.18, 0.1), mat); heart.scale.setScalar(0.75); grp.add(heart);
      fx.mesh(grp, (t) => { const u = t / 1.2; const b = Math.exp(-Math.pow((u - 0.05) * 11, 2)) * 0.2 + Math.exp(-Math.pow((u - 0.32) * 11, 2)) * 0.13; const s = 1 + b; heart.scale.set(0.75 * s, 0.75 * s * (1 + b * 0.3), 0.75 * s); grp.position.y = 0.82 + 0.03 * Math.sin(u * TAU); grp.rotation.y = 0.4 * Math.sin(u * TAU); mat.emissiveIntensity = 0.3 + b * 3; });
      contactShadow(fx, 0.4, (t) => ({ s: 1 - 0.06 * Math.sin((t / 1.2) * TAU), a: 0.5 }));
      fx.light({ color: '#ff3050', intensity: 18, pos: [0, 0.9, 0.7], range: 5, env: (t) => 0.7 + 0.5 * Math.exp(-Math.pow((t / 1.2 - 0.05) * 11, 2)), norm: 30 });
      fx.decal({ kind: 'glow', r: [0.9, 0.9], intensity: 0.8, ramp: [[0, '#000'], [0.5, '#800a1c'], [1, '#ff3050']], alpha: 0.6, y: 0.006 });
      // little hearts drifting up
      const mini = heartGeo(0.15, 0.08), N = 5, minis = [];
      for (let i = 0; i < N; i++) { const mm = new THREE.MeshStandardMaterial({ color: '#ff5a78', emissive: '#ff2040', emissiveIntensity: 1.2, roughness: 0.3, transparent: true, metalness: 0 }); const m = new THREE.Mesh(mini, mm); m.scale.setScalar(0.08); minis.push({ m, a: fx.rng() * TAU, r: 0.28 + fx.rng() * 0.25, ph: i / N }); }
      const gm = new THREE.Group(); minis.forEach((o) => gm.add(o.m));
      fx.mesh(gm, (t) => { minis.forEach((o) => { const u = (t / 1.2 + o.ph) % 1; o.m.position.set(Math.cos(o.a) * o.r * (0.6 + 0.4 * u), 0.7 + u * 0.85, Math.sin(o.a) * o.r * (0.6 + 0.4 * u)); o.m.rotation.y = o.a + u * 4; o.m.rotation.z = Math.sin(u * 8 + o.a) * 0.3; const s = 0.07 * sstep(0, 0.15, u) * (1 - 0.3 * u); o.m.scale.setScalar(Math.max(1e-4, s)); o.m.material.opacity = 1 - sstep(0.6, 1, u); }); });
      fx.emitter({ count: 18, kind: 'soft', shape: 'sphere', radius: 0.4, pos: [0, 0.8, 0], dir: [0, 1, 0], spread: 0.6, speed: [0.2, 0.6], life: [0.8, 1.2], size: [0.05, 0.01], intensity: 1.5, ramp: [[0, '#ff8090', 0], [0.3, '#ffc0c8', 1], [1, '#f03050', 0]] });
      sparkles(fx, '#ff9aaa', [0, 0.85, 0], 0.5, 5, { size: [0.22, 0.05] });
    } },

  /* ===================================================================== key-glint */
  { id: 'pickups/key-glint', name: 'Key glint', category: 'pickups', loop: true, duration: 2,
    stage: { sky: 'dark', bloom: 0.5, view: { pos: [0.8, 1.25, 2.4], target: [0, 0.82, 0], fov: 34 } },
    build(fx) {
      const grp = new THREE.Group(), silver = metal('#d6dce6', 0.16), dark = metal('#7c8696', 0.3);
      const key = new THREE.Group(); grp.add(key); key.rotation.z = Math.PI / 2; // lies along x? we want vertical: bow at top
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.036, 16, 40), silver); bow.position.y = 0.3; key.add(bow);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * TAU + Math.PI / 2; const l = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.016, 10, 24), silver); l.position.set(Math.cos(a) * 0.07, 0.3 + Math.sin(a) * 0.07, 0); key.add(l); }
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), new THREE.MeshStandardMaterial({ color: '#4af', emissive: '#28f', emissiveIntensity: 1.6, roughness: 0.1, flatShading: true })); gem.position.set(0, 0.3, 0); key.add(gem);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 20), dark); collar.position.y = 0.13; key.add(collar); const c2 = collar.clone(); c2.position.y = 0.0; key.add(c2); const c3 = collar.clone(); c3.position.y = 0.09; c3.scale.set(0.8, 0.4, 0.8); key.add(c3);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.62, 16), silver); shaft.position.y = -0.18; key.add(shaft);
      const bit = (y, w, h) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.03), silver); b.position.set(w / 2 + 0.02, y, 0); key.add(b); return b; };
      bit(-0.42, 0.14, 0.06); bit(-0.33, 0.1, 0.05); bit(-0.24, 0.16, 0.05); const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.04, 16), silver); tip.position.y = -0.5; key.add(tip);
      key.rotation.z = 0; grp.scale.setScalar(1.05);
      fx.mesh(grp, (t) => { const u = t / 2; grp.rotation.y = u * TAU; grp.rotation.z = 0.28 + 0.06 * Math.sin(u * TAU * 2); grp.position.y = 0.95 + 0.04 * Math.sin(u * TAU); });
      contactShadow(fx, 0.34, () => ({ s: 1, a: 0.5 }));
      fx.light({ color: '#cfe0ff', intensity: 25, pos: [0.7, 1.3, 0.9], range: 6 }); fx.light({ color: '#ffd080', intensity: 20, pos: [-0.8, 0.5, 0.5], range: 5 });
      // glint running down the key shaft, ending in a flash at the bit
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 1.2, 0.05], size: [0.3, 0.3], life: [0.7, 0.7], intensity: 4, ramp: [[0, '#fff', 0], [0.2, '#fff', 1], [0.8, '#dfeaff', 1], [1, '#bcd', 0]], delay: 0.2, emit: 0.001,
        follow: (m, ta, t) => { const u = clamp((t - 0.2) / 0.7); m.position.set(0.02, 1.2 - u * 0.8, 0.07); } });
      fx.emitter({ count: 1, kind: 'glint', pos: [0.04, 0.5, 0.06], size: [0.6, 0.15], life: [0.3, 0.3], intensity: 3.5, ramp: [[0, '#fff'], [1, '#cdf', 0]], delay: 0.9, emit: 0.001 });
      fx.emitter({ count: 14, kind: 'soft', shape: 'sphere', radius: 0.3, pos: [0, 0.9, 0], size: [0.03, 0.01], life: [0.4, 0.9], speed: [0, 0.3], intensity: 1.5, delay: 0.9, emit: 0.5, ramp: [[0, '#e8f2ff', 0], [0.3, '#fff', 1], [1, '#9bf', 0]] });
    } },

  /* ===================================================================== loot-beam */
  { id: 'pickups/loot-beam', name: 'Loot beam', category: 'pickups', loop: true, duration: 2.4,
    stage: { sky: 'night', bloom: 0.6, view: { pos: [2.6, 1.2, 4.2], target: [0, 1.3, 0], fov: 42 } },
    build(fx) {
      const sw = swordMesh(); const grp = new THREE.Group(); grp.add(sw); sw.rotation.z = Math.PI / 2 + 0.25; sw.position.set(-0.5, 0, 0); grp.scale.setScalar(1.5);
      fx.mesh(grp, (t) => { const u = t / 2.4; grp.position.y = 0.55 + 0.06 * Math.sin(u * TAU); grp.rotation.y = u * TAU; });
      contactShadow(fx, 0.55, (t) => ({ s: 1 + 0.07 * Math.sin((t / 2.4) * TAU), a: 0.5 }));
      const rar = [[0, '#f0e8ff'], [0.35, '#d99bff'], [0.7, '#9a3cff'], [1, '#3a0a80']];
      fx.beam({ pos: [0, 0, 0], height: 6, r: [0.28, 0.2], intensity: 0.5, noise: 0.7, freq: 2.2, speed: 1.1, edge: 1.5, ramp: rar, endFade: 0.3 });
      fx.beam({ pos: [0, 0, 0], height: 6, r: [0.1, 0.06], intensity: 1.2, noise: 0.3, freq: 3, speed: 2, edge: 1.0, ramp: [[0, '#f0e8ff'], [1, '#e0b0ff']], endFade: 0.3 });
      fx.beam({ pos: [0, 0, 0], height: 3.4, r: [0.55, 0.3], intensity: 0.22, noise: 0.9, freq: 1.5, speed: 0.8, edge: 2.2, ramp: rar, endFade: 0.5 });
      fx.decal({ kind: 'glow', r: [1.2, 1.2], intensity: 1.2, ramp: [[0, '#000'], [0.4, '#4a1090'], [1, '#c58bff']], alpha: 0.9, y: 0.006 });
      fx.ring({ r: [0.2, 1.4], width: [0.1, 0.05], normal: 'up', intensity: 1.3, dur: 2.4, ramp: rar, decay: 1 });
      fx.ring({ r: [0.2, 1.4], width: [0.1, 0.05], normal: 'up', intensity: 1.3, dur: 1.2, t0: 1.2, ramp: rar, decay: 1 }); fx.ring({ r: [0.2, 1.4], width: [0.1, 0.05], normal: 'up', intensity: 1.3, dur: 1.2, t0: 0, ramp: rar, decay: 1 });
      fx.light({ color: '#a560ff', intensity: 22, pos: [0, 1.0, 0], range: 9, flicker: 0.1 }); fx.light({ color: '#e8d0ff', intensity: 24, pos: [0.6, 0.8, 0.6], range: 4 });
      fx.emitter({ count: 70, kind: 'soft', shape: 'disc', radius: 0.5, dir: [0, 1, 0], spread: 0.1, speed: [0.5, 1.6], life: [1.5, 2.4], size: [0.045, 0.012], intensity: 1.5, turb: [0.15, 1], swirl: 1.2, ramp: [[0, '#f0e8ff', 0], [0.2, '#e8c8ff', 1], [1, '#8a3cff', 0]] });
      sparkles(fx, '#e8c8ff', [0, 0.7, 0], 0.5, 8, { size: [0.3, 0.06] });
    } },

  /* ===================================================================== potion */
  { id: 'pickups/potion', name: 'Potion', category: 'pickups', loop: true, duration: 2.4,
    stage: { sky: 'dark', bloom: 0.55, view: { pos: [0.9, 1.2, 2.6], target: [0, 0.75, 0], fov: 34 } },
    build(fx) {
      const grp = new THREE.Group();
      // flask: round belly, neck, lip (outer wall). Inner wall via second lathe for liquid.
      const outer = [[0.001, 0], [0.12, 0.005], [0.2, 0.05], [0.25, 0.14], [0.26, 0.25], [0.22, 0.36], [0.14, 0.46], [0.075, 0.54], [0.065, 0.62], [0.068, 0.72], [0.09, 0.75], [0.095, 0.78], [0.08, 0.79]];
      const glassG = new THREE.LatheGeometry(outer.map((p) => new THREE.Vector2(p[0], p[1])), 48);
      const glass = new THREE.Mesh(glassG, new THREE.MeshPhysicalMaterial({ color: '#dff', metalness: 0, roughness: 0.02, transmission: 1, thickness: 0.08, ior: 1.5, transparent: true, opacity: 1, envMapIntensity: 2.5, clearcoat: 1, specularIntensity: 1, side: THREE.FrontSide })); grp.add(glass);
      const level = 0.3, inn = outer.filter((p) => p[1] <= level).map((p) => [p[0] * 0.93, p[1] + 0.012]); inn.push([0.06, level]);
      const liqG = new THREE.LatheGeometry([...inn.map((p) => new THREE.Vector2(p[0], p[1])), new THREE.Vector2(0.001, level)], 40, 0, TAU);
      const pos = liqG.attributes.position, base = new Float32Array(pos.array), topIdx = []; for (let i = 0; i < pos.count; i++) if (Math.abs(base[i * 3 + 1] - level) < 0.001) topIdx.push(i);
      const liqM = new THREE.MeshPhysicalMaterial({ color: '#0fa850', emissive: '#08a040', emissiveIntensity: 0.3, roughness: 0.3, transmission: 0.0, thickness: 0.2, ior: 1.33, clearcoat: 0, transparent: false, side: THREE.DoubleSide });
      const liq = new THREE.Mesh(liqG, liqM); grp.add(liq);
      const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.13, 16), new THREE.MeshStandardMaterial({ color: '#a8743c', roughness: 0.95 })); cork.position.y = 0.8; grp.add(cork);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.012, 8, 24), metal('#c9a050', 0.4)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.72; grp.add(ring);
      grp.scale.setScalar(1.15);
      fx.mesh(grp, (t) => { const u = t / 2.4, k = u * TAU; grp.position.y = 0.4 + 0.05 * Math.sin(k); grp.rotation.y = 0.8 * Math.sin(k); grp.rotation.z = 0.1 * Math.sin(k + 1);
        const a1 = 0.04 * Math.sin(k * 2), a2 = 0.04 * Math.cos(k * 2 + 1), hump = 0.012 * Math.sin(k * 4);
        for (const i of topIdx) { const x = base[i * 3], z = base[i * 3 + 2]; pos.setY(i, level + a1 * x * 4 + a2 * z * 4 + hump * (x * x + z * z) * 20); } pos.needsUpdate = true; liqG.computeVertexNormals(); liqM.emissiveIntensity = 0.3 + 0.1 * Math.sin(k * 2); });
      contactShadow(fx, 0.4, () => ({ s: 1, a: 0.5 }));
      fx.light({ color: '#40ff90', intensity: 14, pos: [0, 0.55, 0.2], range: 6, flicker: 0.12, rate: 3 }); fx.light({ color: '#cfe8ff', intensity: 25, pos: [0.8, 1.4, 1.0], range: 6 });
      fx.decal({ kind: 'glow', r: [0.9, 0.9], intensity: 0.9, ramp: [[0, '#000'], [0.5, '#0a6a34'], [1, '#40ff90']], alpha: 0.6, y: 0.006 });
      fx.emitter({ count: 9, kind: 'bubble', shape: 'disc', radius: 0.12, pos: [0, 0.5, 0], dir: [0, 1, 0], spread: 0.15, speed: [0.12, 0.25], life: [0.9, 1.4], size: [0.035, 0.02], intensity: 1.2, ramp: [[0, '#c0ffd8', 0], [0.2, '#c0ffd8', 0.9], [1, '#60ff90', 0]], follow: (m, ta, t) => { const k = (t / 2.4) * TAU; m.position.y = 0.4 + 0.05 * Math.sin(k); } });
      fx.emitter({ count: 20, kind: 'soft', shape: 'disc', radius: 0.1, pos: [0, 1.25, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.1, 0.4], life: [1, 2], size: [0.04, 0.01], intensity: 1.5, turb: [0.2, 1.2], ramp: [[0, '#80ffb0', 0], [0.3, '#c0ffd8', 1], [1, '#30d070', 0]] });
      sparkles(fx, '#b8ffd8', [0, 0.85, 0], 0.4, 4);
    } },

  /* ===================================================================== power-star */
  { id: 'pickups/power-star', name: 'Power star', category: 'pickups', loop: true, duration: 1.6,
    stage: { sky: 'dusk', bloom: 0.6, view: { pos: [0.8, 1.25, 2.6], target: [0, 0.95, 0], fov: 36 } },
    build(fx) {
      const grp = new THREE.Group();
      const g = new THREE.ExtrudeGeometry(starShape(0.46, 0.2, 5), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.05, bevelSegments: 8, curveSegments: 6 }); g.translate(0, 0, -0.06); g.computeVertexNormals();
      const mat = new THREE.MeshPhysicalMaterial({ color: '#ffd21c', metalness: 0.6, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, emissive: new THREE.Color('#ff9a00'), emissiveIntensity: 0.6, envMapIntensity: 2.2 });
      const star = new THREE.Mesh(g, mat); grp.add(star);
      const eyeM = new THREE.MeshStandardMaterial({ color: '#201000', roughness: 0.3 }); for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.06, 4, 8), eyeM); e.position.set(s * 0.07, 0.0, 0.135); grp.add(e); }
      // rays facing camera
      const rg = new THREE.BufferGeometry(); const pts = [], N = 12; for (let i = 0; i < N; i++) { const a = (i / N) * TAU, w = 0.07, L = i % 2 ? 0.95 : 1.4; pts.push(Math.cos(a + w) * 0.4, Math.sin(a + w) * 0.4, 0, Math.cos(a - w) * 0.4, Math.sin(a - w) * 0.4, 0, Math.cos(a) * L, Math.sin(a) * L, 0); }
      const col = []; for (let i = 0; i < N * 3; i++) col.push(i % 3 === 2 ? 0 : 1, 1, 1); rg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const rayM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { uA: { value: 1 } }, vertexShader: 'varying float vR; void main(){ vR=length(position.xy); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform float uA; varying float vR; void main(){ float a=smoothstep(1.4,.4,vR); gl_FragColor=vec4(vec3(1.,.8,.2)*a*uA*1.6,a*uA); }' });
      const rays = new THREE.Mesh(rg, rayM); rays.renderOrder = 20; grp.add(rays);
      grp.scale.setScalar(1);
      fx.mesh(grp, (t) => { const u = t / 1.6, k = u * TAU; grp.position.y = 1.0 + 0.07 * Math.sin(k); star.rotation.y = k; star.rotation.z = 0.08 * Math.sin(k * 2); const pu = 1 + 0.08 * Math.sin(k * 2); star.scale.setScalar(pu); mat.emissiveIntensity = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(k * 2));
        rays.quaternion.copy(fx.camQuat); rays.quaternion.premultiply(new THREE.Quaternion()); rays.rotation.z += 0; rayM.uniforms.uA.value = 0.5 + 0.5 * (0.5 + 0.5 * Math.sin(k * 2 + 1)); rays.scale.setScalar(0.9 + 0.2 * Math.sin(k * 2)); rays.rotateZ(u * 0.8); });
      // eyes only visible when facing front; fine
      contactShadow(fx, 0.4, (t) => ({ s: 1 - 0.1 * Math.sin((t / 1.6) * TAU), a: 0.5 }));
      fx.light({ color: '#ffc830', intensity: 22, pos: [0, 1.0, 0.8], range: 7, env: (t) => 0.8 + 0.3 * Math.sin((t / 1.6) * TAU * 2), norm: 40 });
      fx.decal({ kind: 'glow', r: [1.0, 1.0], intensity: 1.0, ramp: [[0, '#000'], [0.5, '#a05a00'], [1, '#ffd040']], alpha: 0.7, y: 0.006 });
      fx.ring({ pos: [0, 1.0, 0], normal: 'cam', r: [0.4, 0.9], width: [0.04, 0.012], intensity: 0.8, dur: 0.8, loop: true, ramp: [[0, '#fff2dc'], [1, '#fb2']] });
      fx.ring({ pos: [0, 1.0, 0], normal: 'cam', r: [0.4, 0.9], width: [0.04, 0.012], intensity: 0.8, dur: 0.8, t0: 0.8, ramp: [[0, '#fff2dc'], [1, '#fb2']] });
      sparkles(fx, '#fff2a0', [0, 1.0, 0], 0.7, 12, { size: [0.3, 0.06], intensity: 4 });
      fx.emitter({ count: 22, kind: 'spark', shape: 'sphere', radius: 0.3, pos: [0, 1.0, 0], dir: [0, 1, 0], spread: 3, speed: [0.2, 0.7], radial: 1, life: [0.5, 0.7], size: [0.04, 0.01], stretch: 0.5, intensity: 4, ramp: [[0, '#fff2dc'], [0.4, '#ffd040'], [1, '#f80', 0]] });
    } },

  /* ===================================================================== xp-orb */
  { id: 'pickups/xp-orb', name: 'XP orb', category: 'pickups', loop: true, duration: 1.8,
    stage: { sky: 'dark', bloom: 0.65, view: { pos: [1.2, 1.35, 3.2], target: [0, 0.9, 0], fov: 38 } },
    build(fx) {
      const path = (t) => { const k = (t / 1.8) * TAU; return [0.55 * Math.sin(k), 0.9 + 0.2 * Math.sin(2 * k), 0.28 * Math.cos(k)]; };
      const ramp = [[0, '#f4ffd0'], [0.3, '#9aff40'], [0.7, '#2aa820'], [1, '#063']];
      fx.orb({ kind: 'plasma', r: [0.13, 0.13], ramp, intensity: 1.8, noise: 3, scroll: 2, disp: 0.12, power: 2, follow: (o, ta, t) => o.position.set(...path(t)) });
      fx.orb({ kind: 'energy', r: [0.26, 0.26], ramp: [[0, '#082'], [0.5, '#6f4'], [1, '#e8ffb0']], intensity: 0.7, alpha: 0.5, power: 2.4, follow: (o, ta, t) => o.position.set(...path(t)), pulse: [0.1, 7] });
      fx.trail({ path, len: 0.9, width: 0.07, n: 60, intensity: 1.2, core: 4, ramp: [[0, '#f4ffd0'], [0.3, '#8fff40'], [1, '#0a6a20']] });
      fx.trail({ path: (t) => { const p = path(t - 0.2); return p; }, len: 0.7, width: 0.04, n: 50, intensity: 1.3, core: 4, ramp: [[0, '#cfffa0'], [1, '#0a6a20']] });
      const lightP = fx.light({ color: '#6aff40', intensity: 21, pos: [0, 0.9, 0], range: 6, flicker: 0.15, rate: 8 });
      fx.on((t) => { lightP.l.position.set(...path(t)); });
      fx.decal({ kind: 'glow', r: [0.9, 0.9], intensity: 0.9, ramp: [[0, '#000'], [0.5, '#0a5a10'], [1, '#6aff40']], alpha: 0.5, y: 0.006 });
      contactShadow(fx, 0.2, (t) => { const p = path(t); return { s: 1 + 0.5 * (1.1 - p[1]), a: 0.35, x: p[0], z: p[2] }; });
      fx.emitter({ count: 36, kind: 'soft', shape: 'point', pos: [0, 0.9, 0], dir: [0, 1, 0], spread: 3.14, speed: [0.05, 0.3], life: [0.5, 1.0], size: [0.04, 0.01], intensity: 1.5, ramp: [[0, '#d0ff90', 0], [0.2, '#d0ff90', 1], [1, '#3c3', 0]], follow: (m, ta, t) => m.position.set(...path(t)) });
      fx.emitter({ count: 2, kind: 'glint', shape: 'point', pos: [0, 0.9, 0], size: [0.36, 0.1], life: [0.5, 0.7], intensity: 4, ramp: [[0, '#fff', 0], [0.3, '#e8ffc0', 1], [1, '#6f4', 0]], follow: (m, ta, t) => m.position.set(...path(t)) });
    } },
];
