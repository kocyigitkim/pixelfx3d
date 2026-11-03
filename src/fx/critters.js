// critters: procedural creatures from three.js geometry (loops). Animation lives in fx.mesh callbacks.
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2, PI = Math.PI;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const UP = V(0, 1, 0), _m = new THREE.Matrix4(), _a = V(), _b = V(), _c = V();

/** orient obj so +X points along v, +Y roughly up; roll = bank about forward */
function orient(o, p, v, roll = 0) {
  _a.copy(v).normalize(); _b.crossVectors(_a, UP).normalize(); _c.crossVectors(_b, _a); _m.makeBasis(_a, _c, _b); o.quaternion.setFromRotationMatrix(_m); o.position.copy(p); if (roll) o.rotateX(roll);
}
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, ...o });
function ellipsoid(rx, ry, rz, mat, seg = 24) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, seg, Math.max(8, seg >> 1)), mat); m.scale.set(rx, ry, rz); return m; }

/** soft floor decal (dark shadow or additive glow). fn(t) -> {x,z,s,a} */
function floorBlob(fx, r, color, add, fn) {
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, uniforms: { uA: { value: 1 }, uC: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform float uA; uniform vec3 uC; varying vec2 vUv; void main(){ float d=length(vUv-.5)*2.; float a=smoothstep(1.,.05,d); a*=a; gl_FragColor=vec4(uC*a*uA,a*uA); }' });
  const o = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); o.rotation.x = -PI / 2; o.position.y = add ? 0.008 : 0.006; o.renderOrder = add ? 8 : 5; o.frustumCulled = false;
  fx.mesh(o, (t) => { const k = fn(t); o.position.x = k.x ?? 0; o.position.z = k.z ?? 0; o.scale.setScalar(r * (k.s ?? 1)); m.uniforms.uA.value = k.a ?? 0.5; });
}

/** glowing dust shed along a periodic path: N points spawned at path(t - age) drifting away */
function dustTrail(fx, pathFn, { n = 40, life = 1.6, color = '#ffe9a0', size = 1, drift = 0.15, gravity = -0.12 } = {}) {
  const pos = new Float32Array(n * 3), al = new Float32Array(n), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aA', new THREE.BufferAttribute(al, 1));
  const seeds = Array.from({ length: n }, (_, i) => [hash(i), hash(i + 50) - 0.5, hash(i + 90) - 0.5, hash(i + 130) - 0.5]);
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uC: { value: new THREE.Color(color) }, uS: { value: size } },
    vertexShader: 'attribute float aA; varying float vA; uniform float uS; void main(){ vA=aA; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=uS*aA*(26./-mv.z); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uC; varying float vA; void main(){ float d=length(gl_PointCoord-.5)*2.; float a=smoothstep(1.,0.,d); a*=a; gl_FragColor=vec4(uC*a*vA*2.2,a*vA); }' });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 30;
  fx.mesh(pts, (t) => { for (let i = 0; i < n; i++) { const s = seeds[i], age = ((t / life + s[0]) % 1) * life, u = age / life, p = pathFn(t - age);
    pos[i * 3] = p[0] + s[1] * drift * u * 2; pos[i * 3 + 1] = p[1] + gravity * age + s[2] * drift * u; pos[i * 3 + 2] = p[2] + s[3] * drift * u * 2; al[i] = Math.sin(u * PI) * (0.6 + 0.4 * Math.sin(t * 9 + i)); } g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true; });
}

/* ------------------------------------------------------------ underwater environment helpers (fish, jellyfish) */
function backdrop(fx, top, bot) {
  const m = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { uT: { value: new THREE.Color(top) }, uB: { value: new THREE.Color(bot) } },
    vertexShader: 'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 uT,uB; varying vec3 vD; void main(){ float y=vD.y*.5+.5; vec3 c=mix(uB,uT,pow(y,1.3)); c+=vec3(.05,.18,.2)*exp(-pow((vD.y-.05)*4.,2.))*.6; gl_FragColor=vec4(c,1.); }' });
  const o = new THREE.Mesh(new THREE.SphereGeometry(60, 24, 16), m); o.renderOrder = -5; o.frustumCulled = false; fx.mesh(o, null, { dur: 999 });
}
const CAUSTIC = `
float caustic(vec2 uv, float u){ vec2 p=mod(uv*6.28318,6.28318)-250.; vec2 i=p; float c=1.; float inten=.005;
  for(int n=0;n<5;n++){ float t=6.28318*u*(float(n)-2.); i=p+vec2(cos(t-i.x)+sin(t+i.y),sin(t-i.y)+cos(t+i.x)); c+=1./length(vec2(p.x/(sin(i.x+t)/inten),p.y/(cos(i.y+t)/inten))); }
  c/=5.; c=1.17-pow(c,1.4); return pow(abs(c),8.); }`;
function sandFloor(fx, tint = '#b8a47a') {
  const m = new THREE.ShaderMaterial({ uniforms: { uU: { value: 0 }, uC: { value: new THREE.Color(tint) } }, transparent: false, depthWrite: true,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `uniform float uU; uniform vec3 uC; varying vec3 vW; ${CAUSTIC}
      float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5); }
      void main(){ vec2 p=vW.xz; float d=length(p-vec2(0.,0.)); float rip=.5+.5*sin(p.x*18.+sin(p.y*7.)*2.)*sin(p.y*11.+p.x*3.); vec3 sand=uC*(.45+.35*rip+.2*h(floor(p*60.)));
        float c=caustic(p*.35,uU)*1.6+caustic(p*.5+3.,uU)*.8; vec3 col=sand*.35+sand*vec3(.5,.9,1.)*c*1.2; col=mix(col,vec3(.02,.12,.17),smoothstep(2.,12.,d)); gl_FragColor=vec4(col,1.); }` });
  const o = new THREE.Mesh(new THREE.CircleGeometry(40, 48), m); o.rotation.x = -PI / 2; o.position.y = 0.002; o.frustumCulled = false; fx.mesh(o, (t, pr) => { m.uniforms.uU.value = t / fx.duration; }, { dur: 999 });
}

/* ============================================================ BAT */
function wingGeo(n = 11) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9 * 3 * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(9 * 3 * 3), 3)); return g; }
function batWingUpdate(g, s, a, lag, fold) {
  const P = g.attributes.position.array, out = (ang, L, x) => V(x, Math.sin(ang) * L, Math.cos(ang) * L * s);
  const S = V(0.03, 0.02, 0.04 * s), W = S.clone().add(out(a, 0.3 * (1 - fold * 0.5), 0.04)), a2 = a - lag;
  const L = [0.4, 0.46, 0.42, 0.34], X = [0.22, 0.06, -0.1, -0.22], F = [0, 1, 2, 3].map((i) => W.clone().add(out(a2 - fold * (0.5 + i * 0.12), L[i] * (1 - fold * 0.55), X[i])));
  const H = V(-0.24, -0.02, 0.05 * s), M = [0, 1, 2, 3].map((i) => { const A = F[i], B = i < 3 ? F[i + 1] : H; return A.clone().add(B).multiplyScalar(0.5).lerp(W, 0.18); });
  const per = [F[0], M[0], F[1], M[1], F[2], M[2], F[3], M[3], H]; let k = 0; const tri = (p, q, r) => { for (const v of [p, q, r]) { P[k++] = v.x; P[k++] = v.y; P[k++] = v.z; } };
  tri(S, W, H); for (let i = 0; i < 8; i++) tri(W, per[i], per[i + 1]);
  g.attributes.position.needsUpdate = true; g.computeVertexNormals();
}
function batModel() {
  const grp = new THREE.Group(), fur = std('#2a2030', { roughness: 0.9 }), skin = new THREE.MeshStandardMaterial({ color: '#7a5a90', roughness: 0.6, side: THREE.DoubleSide, emissive: '#4a2060', emissiveIntensity: 0.6 });
  const body = ellipsoid(0.12, 0.065, 0.065, fur); grp.add(body); const head = ellipsoid(0.06, 0.055, 0.055, fur); head.position.set(0.14, 0.015, 0); grp.add(head);
  const snout = ellipsoid(0.035, 0.028, 0.03, std('#3a2c3a')); snout.position.set(0.19, -0.005, 0); grp.add(snout); const nose = ellipsoid(0.012, 0.01, 0.014, std('#d58')); nose.position.set(0.222, 0.0, 0); grp.add(nose);
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 10), fur); ear.position.set(0.13, 0.095, s * 0.035); ear.rotation.set(s * 0.25, 0, -0.15); grp.add(ear);
    const eye = ellipsoid(0.011, 0.011, 0.011, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2020').multiplyScalar(3) })); eye.position.set(0.185, 0.03, s * 0.028); grp.add(eye);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.022, 6), std('#eee')); fang.rotation.z = PI; fang.position.set(0.215, -0.03, s * 0.01); grp.add(fang);
    const foot = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.045, 6), fur); foot.position.set(-0.17, -0.03, s * 0.03); foot.rotation.z = 1.2; grp.add(foot); }
  const wings = [-1, 1].map((s) => { const g = wingGeo(); const m = new THREE.Mesh(g, skin); m.frustumCulled = false; grp.add(m); return { g, s }; });
  grp.userData.wings = wings; grp.scale.setScalar(3.2); return grp;
}

/* ============================================================ BIRD */
function featherGeo(len, wid) { const s = new THREE.Shape(); s.moveTo(0, 0); s.bezierCurveTo(len * 0.2, wid, len * 0.75, wid * 0.8, len, 0); s.bezierCurveTo(len * 0.75, -wid * 0.6, len * 0.2, -wid * 0.7, 0, 0); const g = new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.002, bevelSegments: 1, curveSegments: 10 }); return g; }
function birdModel() {
  const grp = new THREE.Group(), blue = std('#2f6fc8', { roughness: 0.5 }), dark = std('#1c3f7a', { roughness: 0.55 }), breast = std('#e8863a', { roughness: 0.6 }), beakM = std('#e8b030', { roughness: 0.4 });
  const body = ellipsoid(0.15, 0.085, 0.085, blue); grp.add(body); const br = ellipsoid(0.12, 0.07, 0.08, breast); br.position.set(0.025, -0.035, 0); grp.add(br);
  const head = ellipsoid(0.065, 0.062, 0.062, blue); head.position.set(0.15, 0.04, 0); grp.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 10), beakM); beak.rotation.z = -PI / 2; beak.position.set(0.23, 0.03, 0); grp.add(beak);
  for (const s of [-1, 1]) { const e = ellipsoid(0.013, 0.013, 0.013, std('#050505', { roughness: 0.1 })); e.position.set(0.18, 0.06, s * 0.045); grp.add(e); const gl = ellipsoid(0.004, 0.004, 0.004, new THREE.MeshBasicMaterial({ color: '#fff' })); gl.position.set(0.19, 0.067, s * 0.054); grp.add(gl); }
  const tail = new THREE.Group(); tail.position.set(-0.13, 0.0, 0); grp.add(tail); for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(featherGeo(0.2, 0.03), dark); f.rotation.set(0, (i - 2) * 0.13, 0); f.rotation.y = (i - 2) * 0.13 + PI; f.position.y = -0.004 * i; tail.add(f); }
  const wings = [-1, 1].map((s) => { const sh = new THREE.Group(); sh.position.set(0.02, 0.05, s * 0.06); grp.add(sh); const inner = new THREE.Group(); sh.add(inner);
    const cov = new THREE.Mesh(featherGeo(0.22, 0.08), blue); cov.rotation.set(-PI / 2, 0, 0); cov.rotation.order = 'XYZ'; // span along local z via rotation
    // build span along +z (s direction): feather geo extends along +x, so rotate about y
    const mk = (len, wid, mat, x, y, rz) => { const f = new THREE.Mesh(featherGeo(len, wid), mat); f.rotation.y = -s * PI / 2; f.rotation.z = 0; f.position.set(x, y, 0); const h = new THREE.Group(); h.add(f); h.rotation.y = rz; return h; };
    const wingIn = new THREE.Group(); inner.add(wingIn); for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(featherGeo(0.2 - i * 0.01, 0.06), blue); f.rotation.y = -s * PI / 2; f.position.set(0.05 - i * 0.045, 0, 0); wingIn.add(f); }
    const outer = new THREE.Group(); outer.position.set(0, 0, s * 0.19); inner.add(outer);
    for (let i = 0; i < 6; i++) { const f = new THREE.Mesh(featherGeo(0.26 - i * 0.012, 0.042), i < 3 ? dark : blue); f.rotation.y = -s * PI / 2 + s * (0.08 * (i - 1.5)) * -1; f.position.set(0.05 - i * 0.04, 0, 0); outer.add(f); }
    return { sh, inner, outer, s }; });
  grp.userData.wings = wings; grp.userData.tail = tail; grp.userData.head = head; return grp;
}

/* ============================================================ BUTTERFLY */
const WING_PATH = [['m', 0, 0.03], ['b', 0.16, 0.2, 0.3, 0.32, 0.4, 0.2], ['b', 0.43, 0.1, 0.39, 0.0, 0.31, -0.03], ['b', 0.31, -0.12, 0.3, -0.3, 0.15, -0.34], ['b', 0.07, -0.34, 0.02, -0.2, 0, -0.06]];
function wingTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512; const x = c.getContext('2d'), S = 512 / 0.5; // 0.5m -> 512 px; u in [0,.5], v in [-.4,.4]
  const T = (u, v) => [u * S, (0.4 - v) * S * 0.64 * 1.25]; // shared mapping; v range 0.8 -> 512*..
  const path = () => { x.beginPath(); for (const s of WING_PATH) { if (s[0] === 'm') x.moveTo(...T(s[1], s[2])); else x.bezierCurveTo(...T(s[1], s[2]), ...T(s[3], s[4]), ...T(s[5], s[6])); } x.closePath(); };
  path(); const g = x.createRadialGradient(...T(0.02, 0), 5, ...T(0.2, 0), 250); g.addColorStop(0, '#2a7fff'); g.addColorStop(0.25, '#18c0ff'); g.addColorStop(0.55, '#2b6be0'); g.addColorStop(1, '#14307a'); x.fillStyle = g; x.fill();
  x.save(); path(); x.clip(); x.strokeStyle = '#06081a'; x.lineWidth = 46; path(); x.stroke(); x.lineWidth = 3; x.strokeStyle = 'rgba(5,8,26,.8)';
  for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(...T(0.02, 0)); x.lineTo(...T(0.42 * Math.cos(-0.9 + i * 0.3), 0.3 * Math.sin(-1.1 + i * 0.32) - 0.05)); x.stroke(); }
  x.fillStyle = '#fff'; for (let i = 0; i < 14; i++) { const a = -0.5 + i * 0.13; const p = T(0.28 + 0.12 * Math.cos(a * 1.2), 0.05 + 0.25 * Math.sin(a * 1.8) - 0.1 * (i > 7 ? 1.6 : 0)); x.beginPath(); x.arc(p[0], p[1], 5, 0, TAU); x.fill(); }
  x.restore(); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
function butterflyModel() {
  const grp = new THREE.Group(); grp.scale.setScalar(2.4); const shape = new THREE.Shape(); for (const s of WING_PATH) { if (s[0] === 'm') shape.moveTo(s[1], s[2]); else shape.bezierCurveTo(...s.slice(1)); } shape.closePath();
  const tex = wingTexture(); const geo = new THREE.ShapeGeometry(shape, 18); const uv = geo.attributes.uv, p = geo.attributes.position, S = 512 / 0.5;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) * S) / 512, 1 - (0.4 - p.getY(i)) * S * 0.64 * 1.25 / 512);
  const mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#6aa0ff', emissiveIntensity: 0.55, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.1 });
  const wings = [-1, 1].map((s) => { const piv = new THREE.Group(); piv.position.set(0.0, 0.01, s * 0.008); grp.add(piv); const m = new THREE.Mesh(geo, mat); m.rotation.x = -PI / 2; m.rotation.z = -PI / 2; // shape u->z, v->x
    m.rotation.set(0, 0, 0); const q = new THREE.Group(); q.add(m); m.rotation.set(-PI / 2, 0, 0); // shape x->x, shape y->-z ; reorient below
    q.rotation.y = -PI / 2 * 0; piv.add(q); m.rotation.set(-PI / 2, 0, -PI / 2); if (s < 0) q.scale.z = 1; return { piv, q, m, s }; });
  const body = new THREE.MeshStandardMaterial({ color: '#15151c', roughness: 0.7 });
  const th = ellipsoid(0.03, 0.014, 0.014, body); th.position.x = 0.01; grp.add(th); const ab = ellipsoid(0.065, 0.011, 0.011, body); ab.position.x = -0.07; grp.add(ab); const hd = ellipsoid(0.016, 0.015, 0.015, body); hd.position.x = 0.05; grp.add(hd);
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.0013, 0.0013, 0.08, 4), body); a.position.set(0.085, 0.03, s * 0.014); a.rotation.set(s * 0.4, 0, -1.0); grp.add(a); const bl = ellipsoid(0.004, 0.004, 0.004, body); bl.position.set(0.1, 0.062, s * 0.027); grp.add(bl); const ey = ellipsoid(0.006, 0.006, 0.006, std('#300', { roughness: 0.2 })); ey.position.set(0.058, 0.008, s * 0.01); grp.add(ey); }
  grp.userData.wings = wings; return grp;
}

/* ============================================================ EYEBALL */
function eyeTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d'); const g = x.createLinearGradient(0, 0, 0, 512); g.addColorStop(0, '#f4efe6'); g.addColorStop(0.6, '#efe6dc'); g.addColorStop(1, '#e2c8c0'); x.fillStyle = g; x.fillRect(0, 0, 1024, 512);
  for (let i = 0; i < 400; i++) { x.fillStyle = `rgba(220,150,150,${0.02 + hash(i) * 0.05})`; x.beginPath(); x.arc(hash(i * 3) * 1024, 200 + hash(i * 5) * 312, 6 + hash(i * 7) * 22, 0, TAU); x.fill(); }
  const vein = (u0, v0, a, len, w, d) => { let px = u0, py = v0, ang = a; x.lineWidth = w; x.strokeStyle = `rgba(${170 + hash(u0) * 30},${20 + hash(v0) * 30},${25},${0.55 + hash(a) * 0.3})`; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < len; k++) { ang += (hash(px + k * 3.1 + d) - 0.5) * 0.7; px += Math.cos(ang) * 6; py += Math.sin(ang) * 6; x.lineTo(px, py); if (d < 2 && k % 9 === 8 && hash(px + k) > 0.45) vein(px, py, ang + (hash(py + k) - 0.5) * 1.6, len - k - 4, w * 0.6, d + 1), x.moveTo(px, py); } x.stroke(); };
  for (let i = 0; i < 70; i++) vein(hash(i) * 1024, 440 - hash(i + 99) * 40, -PI / 2 + (hash(i + 5) - 0.5) * 0.6, 26 + hash(i + 8) * 18, 2.4, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; return t;
}
function irisTexture() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d'); // x: angle, y: radius (0 = pupil edge .. 1 = limbus)
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#f0c030'); g.addColorStop(0.35, '#c87a10'); g.addColorStop(0.75, '#5a7a10'); g.addColorStop(1, '#10200a'); x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  for (let i = 0; i < 700; i++) { const px = hash(i) * 512; x.strokeStyle = `rgba(${hash(i * 3) > 0.5 ? '255,230,120' : '40,20,0'},${0.15 + hash(i * 7) * 0.3})`; x.lineWidth = 1 + hash(i * 9) * 2; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (hash(i * 11) - 0.5) * 6, 80 + hash(i * 13) * 170); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}
function eyeModel() {
  const grp = new THREE.Group(), R = 0.22; const globe = new THREE.Group(); grp.add(globe);
  const sc = new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), new THREE.MeshPhysicalMaterial({ map: eyeTexture(), roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3, sheenColor: new THREE.Color('#f9c') })); sc.rotation.x = PI / 2; globe.add(sc);
  const capAng = 0.62, pupAng = 0.24, mkCap = (a, mat, k) => { const g = new THREE.SphereGeometry(R * k, 48, 12, 0, TAU, 0, a); g.rotateX(PI / 2); return new THREE.Mesh(g, mat); };
  const iris = mkCap(capAng, new THREE.MeshStandardMaterial({ map: irisTexture(), roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 }), 1.004); globe.add(iris);
  // remap cap uv so v runs pupil->limbus
  { const uv = iris.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (uv.getY(i) * 0 + 0) - 0); const p = iris.geometry.attributes.position; for (let i = 0; i < uv.count; i++) { const th = Math.acos(clamp(p.getZ(i) / (R * 1.004), -1, 1)); uv.setY(i, 1 - th / capAng); } }
  const pupil = mkCap(pupAng, new THREE.MeshBasicMaterial({ color: '#000', polygonOffset: true, polygonOffsetFactor: -4 }), 1.008); globe.add(pupil);
  const cornea = new THREE.Mesh(new THREE.SphereGeometry(R * 1.02, 48, 32), new THREE.MeshPhysicalMaterial({ color: '#fff', roughness: 0, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, clearcoatRoughness: 0, envMapIntensity: 3, depthWrite: false })); globe.add(cornea);
  const flesh = new THREE.MeshPhysicalMaterial({ color: '#a8504a', roughness: 0.55, sheen: 1, sheenColor: new THREE.Color('#f88'), side: THREE.DoubleSide }); const lids = [];
  for (const k of [0, 1]) { const g = new THREE.SphereGeometry(R * (1.06 + k * 0.012), 40, 20, 0, TAU, 0, PI / 2); const m = new THREE.Mesh(g, flesh); const lg = new THREE.Group(); lg.add(m); grp.add(lg); lids.push(lg); }
  const nerves = []; for (let i = 0; i < 3; i++) { const ch = new THREE.Group(); ch.position.set((i - 1) * 0.05, (i % 2) * 0.04 - 0.02, -R * 0.95); grp.add(ch); let par = ch; const segs = []; for (let j = 0; j < 4; j++) { const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.03 - j * 0.0055, 0.08, 4, 8), flesh); s.rotation.x = PI / 2; const hold = new THREE.Group(); s.position.z = -0.045; hold.position.z = j ? -0.09 : 0; hold.add(s); par.add(hold); par = hold; segs.push(hold); } nerves.push(segs); }
  grp.userData = { globe, lids, pupil, nerves, R }; return grp;
}

/* ============================================================ FISH */
function fishGeo() {
  const col = (g, f) => { const p = g.attributes.position, c = new Float32Array(p.count * 3); for (let i = 0; i < p.count; i++) { const k = f(p.getX(i), p.getY(i), p.getZ(i)); c[i * 3] = k[0]; c[i * 3 + 1] = k[1]; c[i * 3 + 2] = k[2]; } g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g; };
  const C = (h) => new THREE.Color(h).toArray();
  const body = new THREE.SphereGeometry(1, 28, 16); { const p = body.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i); p.setXYZ(i, x * 0.2, p.getY(i) * 0.075 * (1 - 0.35 * Math.max(0, -x)), p.getZ(i) * 0.035 * (1 - 0.5 * Math.max(0, -x))); } } body.computeVertexNormals();
  col(body, (x, y) => { const stripe = Math.abs(y - 0.012) < 0.009 ? 1 : 0; const t = clamp((y + 0.06) / 0.12); const c1 = new THREE.Color('#e8f2f8').lerp(new THREE.Color('#1c58b8'), Math.pow(t, 1.2)); if (stripe) c1.set('#ffb030'); return c1.toArray(); });
  const mkShape = (pts) => { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); s.closePath(); return new THREE.ShapeGeometry(s); };
  const tail = col(mkShape([[-0.17, 0], [-0.3, 0.075], [-0.265, 0], [-0.3, -0.075]]), () => C('#ff9a30')), dors = col(mkShape([[0.05, 0.07], [-0.05, 0.12], [-0.1, 0.055]]), () => C('#ff8a20')), pect = col(mkShape([[0.08, -0.03], [0.0, -0.075], [0.03, -0.015]]), () => C('#ffc070'));
  pect.translate(0, 0, 0.032); const pect2 = pect.clone(); pect2.translate(0, 0, -0.064);
  const parts = [body, tail, dors, pect, pect2].map((g) => (g.index ? g.toNonIndexed() : g)); parts.forEach((g) => { g.deleteAttribute('uv'); }); return mergeGeometries(parts);
}

/* ============================================================ SKULL */
function skullModel() {
  const grp = new THREE.Group(); const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#c9c1aa'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(${60 + hash(i) * 40},${50 + hash(i) * 30},30,${hash(i * 3) * 0.12})`; x.fillRect(hash(i * 5) * 128, hash(i * 7) * 128, 1 + hash(i) * 4, 1 + hash(i * 3) * 4); }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const bone = new THREE.MeshStandardMaterial({ map: tex, bumpMap: tex, bumpScale: 1.5, roughness: 0.62, color: '#d8d6c8' }), dark = new THREE.MeshBasicMaterial({ color: '#030201' });
  const cran = ellipsoid(0.17, 0.155, 0.15, bone, 32); cran.position.set(0, 0.04, -0.01); grp.add(cran);
  const face = ellipsoid(0.12, 0.1, 0.12, bone); face.position.set(0.075, -0.07, 0); grp.add(face);
  for (const s of [-1, 1]) { const ch = ellipsoid(0.05, 0.03, 0.03, bone); ch.position.set(0.09, -0.07, s * 0.115); ch.rotation.y = s * 0.3; grp.add(ch);
    const sock = ellipsoid(0.046, 0.054, 0.045, dark); sock.position.set(0.128, 0.0, s * 0.065); grp.add(sock); const eye = ellipsoid(0.01, 0.01, 0.01, new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5a10').multiplyScalar(3.5) })); eye.position.set(0.158, 0.0, s * 0.065); eye.userData.eye = 1; grp.add(eye); }
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.06, 3), dark); nose.rotation.set(0, 0, -PI / 2); nose.position.set(0.178, -0.05, 0); nose.scale.set(1, 1, 0.7); grp.add(nose);
  const upper = new THREE.Group(); grp.add(upper); for (let i = 0; i < 8; i++) { const a = ((i - 3.5) / 3.5) * 1.1, t = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.036, 0.021), std('#f4eedc')); t.position.set(0.1 + 0.025 * Math.cos(a) * 0.9, -0.125, Math.sin(a) * 0.075); t.rotation.y = a; upper.add(t); }
  const jaw = new THREE.Group(); jaw.position.set(-0.03, -0.1, 0); grp.add(jaw); const arc = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.011, 10, 24, PI), bone); arc.rotation.set(PI / 2, 0, -PI / 2); arc.rotation.x = PI / 2; arc.rotation.z = -PI / 2; arc.position.set(0.13, 0, 0); arc.scale.set(1, 1.05, 0.85); jaw.add(arc);
  for (let i = 0; i < 7; i++) { const a = ((i - 3) / 3) * 1.05, t = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.032, 0.019), std('#f4eedc')); t.position.set(0.13 + Math.cos(a) * 0.085 * 0.9, 0.02, Math.sin(a) * 0.078); t.rotation.y = a; jaw.add(t); }
  grp.userData = { jaw, cran }; return grp;
}

/* ============================================================ GHOST */
function ghostMat() {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uT: { value: 0 }, uK: { value: 0 } },
    vertexShader: `uniform float uT, uK; varying vec3 vN, vW; varying float vH; void main(){ vec3 p=position; float h=clamp(p.y/1.0,0.,1.); float low=pow(1.-h,2.5); float ang=atan(p.z,p.x);
      float wave=sin(ang*5.+uT*${TAU.toFixed(4)}*1.0)*.5+sin(ang*3.-uT*${TAU.toFixed(4)}*2.)*.5; p.y+=wave*.11*low*step(.0,.4-h)*(1.3-h); p.xz*=1.+low*.06*wave+0.; p.x+=sin(uT*${TAU.toFixed(4)}+h*3.)*.05*(1.-h); p.z+=sin(uT*${TAU.toFixed(4)}*1.+h*2.+1.)*.03*(1.-h);
      vH=h; vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `varying vec3 vN, vW; varying float vH; uniform float uT; void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); float f=pow(1.-abs(dot(N,V)),1.8); float a=(.22+.7*f)*smoothstep(0.,.5,vH)*.95+(1.-smoothstep(0.,.35,vH))*.15*(.3+f); a*=mix(.35,1.,smoothstep(.0,.25,vH));
      vec3 c=mix(vec3(.55,.75,.95),vec3(.9,1.,1.),vH)*(.7+.5*f)+vec3(.2,.5,1.)*f*.7; gl_FragColor=vec4(c*a*1.3,a); }` });
}

/* ============================================================ JELLYFISH */
function bellMat() {
  return new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, uniforms: { uP: { value: 0 }, uT: { value: 0 } },
    vertexShader: `uniform float uP; varying vec3 vN, vW, vL; void main(){ vec3 p=position; float h=clamp(p.y/.5,0.,1.); p.xz*=1.-.28*uP*(1.-h*.5); p.y*=1.+.12*uP; p.xz*=1.+.08*(1.-uP)*(1.-h)*0.; vL=p; vec4 w=modelMatrix*vec4(p,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uT; varying vec3 vN, vW, vL; void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vW); float f=pow(1.-abs(dot(N,V)),2.2); float ang=atan(vL.z,vL.x); float r=length(vL.xz);
      float canal=pow(abs(sin(ang*8.)),24.)*smoothstep(.05,.45,r); float ring=exp(-pow((vL.y-.04)*14.,2.))*.7; float pulse=.7+.3*sin(r*18.-uT*${TAU.toFixed(4)}*2.);
      vec3 base=mix(vec3(.9,.25,.8),vec3(.35,.5,1.),clamp(r*2.2,0.,1.)); vec3 c=base*(.12+f*.9)+vec3(1.,.6,.95)*canal*.9*pulse+vec3(.5,.9,1.)*ring; float a=.25+f*.6+canal*.4; gl_FragColor=vec4(c*a,a); }` });
}

/* ============================================================ SNAKE */
const SN = { n: 90, rad: 10 };
function snakeGeo() {
  const g = new THREE.BufferGeometry(), nv = (SN.n + 1) * (SN.rad + 1); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nv * 3), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(nv * 3), 3));
  const idx = []; for (let i = 0; i < SN.n; i++) for (let j = 0; j < SN.rad; j++) { const a = i * (SN.rad + 1) + j, b = a + SN.rad + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); } g.setIndex(idx); return g;
}

/* ============================================================ FROG */
function skinSphere(rx, ry, rz, top = '#3f8a22', bot = '#d8d890', seg = 24, mat) {
  const g = new THREE.SphereGeometry(1, seg, seg >> 1); const p = g.attributes.position, c = new Float32Array(p.count * 3), A = new THREE.Color(top), B = new THREE.Color(bot), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); t.copy(A).lerp(B, sstep(-0.1, -0.7, y)); c[i * 3] = t.r; c[i * 3 + 1] = t.g; c[i * 3 + 2] = t.b; } g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  const m = new THREE.Mesh(g, mat); m.scale.set(rx, ry, rz); return m;
}
function ik2(hx, hy, fx, fy, L1, L2) { // knee position for two-bone leg, knee bends toward +x/+y
  let dx = fx - hx, dy = fy - hy, d = Math.min(Math.hypot(dx, dy), L1 + L2 - 1e-4); const a = Math.atan2(dy, dx), c = clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1), b = Math.acos(c);
  const ang = a + b; return [hx + Math.cos(ang) * L1, hy + Math.sin(ang) * L1, hx + dx * (d / Math.hypot(dx, dy) || 1), hy + dy * (d / Math.hypot(dx, dy) || 1)];
}

export default [
  /* ===================================================================== BAT */
  { id: 'critters/bat', name: 'Bat', category: 'critters', loop: true, duration: 2.4,
    stage: { sky: 'night', bloom: 0.5, view: { pos: [0.4, 3.6, 3.8], target: [0, 1.3, 0], fov: 38 } },
    build(fx) {
      const bat = batModel(), W = bat.userData.wings, p0 = V(), v0 = V(), p1 = V();
      const path = (t, o = V()) => { const k = (t / 2.4) * TAU; return o.set(1.15 * Math.sin(k), 1.35 + 0.18 * Math.sin(2 * k + 1), 0.8 * Math.sin(2 * k)); };
      fx.mesh(bat, (t) => {
        path(t, p0); path(t + 0.02, p1); v0.copy(p1).sub(p0); const v2 = path(t + 0.12, V()).sub(p1); const turn = _b.crossVectors(v0, v2).y; orient(bat, p0, v0, clamp(turn * 400, -0.7, 0.7) + 0.15);
        const ph = (t / 2.4) * TAU * 7; const a = 0.15 + 0.95 * Math.sin(ph), lag = 0.9 * Math.cos(ph), fold = clamp(0.5 * Math.cos(ph) + 0.4, 0, 1) * 0.6;
        for (const w of W) batWingUpdate(w.g, w.s, a, lag * 0.8, fold); bat.position.y += 0.04 * Math.sin(ph); bat.rotateZ(0.12 * Math.cos(ph));
      });
      floorBlob(fx, 0.5, '#000', false, (t) => { const p = path(t); return { x: p[0], z: p[2], s: 1 + p[1] * 0.3, a: 0.3 }; });
      fx.light({ color: '#8fa8ff', intensity: 20, pos: [-1.5, 3.5, 2], range: 12 }); fx.light({ color: '#ff3040', intensity: 5, pos: [0, 1.3, 0.5], range: 4 });
      fx.emitter({ count: 14, kind: 'dust', blend: 'normal', lit: 1, shape: 'box', shapeSize: [1.6, 0.6, 1], pos: [0, 1.3, 0], size: [0.12, 0.3], life: [2, 4], speed: [0.02, 0.1], ramp: [[0, '#556', 0], [0.4, '#778', 0.12], [1, '#445', 0]], order: -1 });
    } },

  /* ===================================================================== BIRD */
  { id: 'critters/bird', name: 'Bird', category: 'critters', loop: true, duration: 2.4,
    stage: { sky: 'day', bloom: 0.3, view: { pos: [0.6, 1.3, 3.2], target: [0, 1.2, 0], fov: 38 } },
    build(fx) {
      const bird = birdModel(), W = bird.userData.wings, tail = bird.userData.tail;
      const root = new THREE.Group(); root.add(bird); bird.scale.setScalar(1.7);
      fx.mesh(root, (t) => { const u = t / 2.4, ph = u * TAU * 6; const f = Math.sin(ph);
        for (const w of W) { const a = (0.2 + 0.95 * f) * w.s * -1; w.inner.rotation.x = a; w.outer.rotation.x = -0.6 * Math.sin(ph - 1.1) * w.s * -1 * 0.8; w.inner.rotation.z = 0; w.outer.rotation.y = 0.12 * f * w.s * -1; w.inner.rotation.y = 0.08 * f; }
        bird.position.set(0.03 * Math.sin(u * TAU * 2), 0.04 * Math.sin(ph + 1.2) + 0.03 * Math.sin(u * TAU * 3), 0); bird.rotation.z = 0.07 * Math.sin(ph + 1.5) + 0.1; bird.rotation.y = 0.5 + 0.1 * Math.sin(u * TAU); bird.userData.head.position.y = 0.04 + 0.006 * Math.sin(ph * 2);
        tail.rotation.z = 0.15 * Math.sin(ph + 2.2) - 0.1; tail.children.forEach((c, i) => { c.rotation.x = 0.06 * Math.sin(ph + i) ; }); root.position.y = 1.2; }, {});
      // sky blobs of light + falling feathers
      fx.light({ color: '#fff4dc', intensity: 40, pos: [1.5, 3, 2], range: 12 });
      fx.emitter({ count: 4, kind: 'petal', blend: 'normal', lit: 1, shape: 'box', shapeSize: [0.2, 0.05, 0.1], pos: [-0.2, 1.1, 0], dir: [-0.3, -1, 0], spread: 0.4, speed: [0.1, 0.3], size: [0.05, 0.04], life: [1.8, 2.4], gravity: [0, -0.1, 0], turb: [0.4, 1.5], rot: 3, ramp: [[0, '#6aa8ee', 0], [0.2, '#6aa8ee', 1], [1, '#4a88d0', 0]], aspect: 2.2 });
      fx.emitter({ count: 14, kind: 'dust', blend: 'normal', lit: 1, shape: 'box', shapeSize: [1.5, 0.8, 0.6], pos: [0, 1.2, 0], size: [0.06, 0.12], life: [2, 3.5], speed: [0.02, 0.08], ramp: [[0, '#fff', 0], [0.4, '#fff', 0.2], [1, '#fff', 0]], order: -1 });
    } },

  /* ===================================================================== BUTTERFLY */
  { id: 'critters/butterfly', name: 'Butterfly', category: 'critters', loop: true, duration: 3.2,
    stage: { sky: 'dusk', bloom: 0.5, view: { pos: [0.4, 1.6, 2.8], target: [0, 1.05, 0], fov: 38 } },
    build(fx) {
      const bf = butterflyModel(), W = bf.userData.wings;
      const path = (t, o = []) => { const k = (t / 3.2) * TAU; return [0.55 * Math.sin(k) + 0.18 * Math.sin(3 * k + 0.5), 1.1 + 0.16 * Math.sin(2 * k + 1) + 0.07 * Math.sin(5 * k), 0.35 * Math.cos(k) + 0.12 * Math.sin(4 * k)]; };
      const p0 = V(), p1 = V();
      fx.mesh(bf, (t) => { const a = path(t), b = path(t + 0.03); p0.set(...a); p1.set(...b); const v = p1.clone().sub(p0); orient(bf, p0, v, 0);
        const ph = (t / 3.2) * TAU * 10, amp = 0.75 + 0.2 * Math.sin((t / 3.2) * TAU * 2); const f = Math.sin(ph) * amp;
        for (const w of W) { w.piv.rotation.x = -w.s * (0.55 + f * 0.85); w.m.scale.set(1, 1, 1); if (w.s < 0) { w.q.scale.x = 1; } }
        bf.position.y += 0.03 * Math.sin(ph + 0.5); bf.rotateZ(0.2 * Math.sin(ph + 1) - 0.1); bf.rotateY(-0.12 * Math.sin((t / 3.2) * TAU)); }, {});
      // wings geometry orientation (u->z, v->x) built once
      for (const w of W) { w.q.rotation.set(0, 0, 0); w.m.rotation.set(0, 0, 0); w.m.rotation.order = 'XYZ'; w.m.rotation.set(-PI / 2, 0, 0); w.m.rotation.z = 0; const g = new THREE.Group(); w.m.removeFromParent(); w.q.add(w.m); w.m.matrixAutoUpdate = true;
        w.m.rotation.set(0, 0, 0); w.m.matrix.identity(); w.m.rotation.set(0, 0, 0); w.m.applyMatrix4(new THREE.Matrix4().makeBasis(V(0, 0, w.s), V(1, 0, 0), V(0, 1, 0))); w.m.rotation.setFromQuaternion(w.m.quaternion); void g; }
      dustTrail(fx, (t) => path(t), { n: 46, life: 1.6, color: '#8fc8ff', size: 1.2, drift: 0.2, gravity: -0.08 });
      fx.light({ color: '#7fb0ff', intensity: 8, pos: [0, 1.1, 0.5], range: 4, flicker: 0.1, rate: 3 }); fx.light({ color: '#ffd8a0', intensity: 25, pos: [1.5, 2.5, 2], range: 10 });
      floorBlob(fx, 0.3, '#000', false, (t) => { const p = path(t); return { x: p[0], z: p[2], s: 1 + p[1] * 0.2, a: 0.25 }; });
      fx.emitter({ count: 30, kind: 'soft', shape: 'box', shapeSize: [1.2, 0.5, 0.8], pos: [0, 1.1, 0], size: [0.03, 0.01], life: [2, 3.2], speed: [0.02, 0.1], gravity: [0, -0.02, 0], intensity: 2, ramp: [[0, '#9cf', 0], [0.4, '#cdf', 0.9], [1, '#69f', 0]] });
    } },

  /* ===================================================================== EYEBALL */
  { id: 'critters/eyeball', name: 'Eyeball', category: 'critters', loop: true, duration: 3.2,
    stage: { sky: 'dark', bloom: 0.4, view: { pos: [0.4, 1.35, 1.9], target: [0, 1.2, 0], fov: 34 } },
    build(fx) {
      const eye = eyeModel(), { globe, lids, pupil, nerves } = eye.userData; const root = new THREE.Group(); root.add(eye);
      const keys = [[0, 0, 0], [0.5, 0, 0], [0.8, 0.5, 0.05], [1.3, 0.5, 0.05], [1.6, -0.45, 0.35], [2.1, -0.45, 0.35], [2.4, 0.15, -0.35], [2.9, 0.15, -0.35], [3.2, 0, 0]];
      const look = (t) => { for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (t <= b[0]) { const u = sstep(a[0], b[0], t); return [mix(a[1], b[1], u), mix(a[2], b[2], u)]; } } return [0, 0]; };
      const blink = (t) => { const f = (c) => { const u = (t - c) / 0.26; return u < 0 || u > 1 ? 0 : Math.sin(u * PI); }; return Math.max(f(1.45), f(2.55), f(2.8) * 0.0); };
      fx.mesh(root, (t) => { const [yw, pt] = look(t), b = blink(t), u = t / 3.2;
        globe.rotation.set(-pt, yw, 0); const open = -PI / 2, closed = PI / 4 + 0.05; lids[0].rotation.x = mix(open, closed, Math.pow(b, 0.7)) ; lids[1].rotation.x = -mix(open, closed, Math.pow(b, 0.7)) + 0 ; lids[1].rotation.set(PI + 0, 0, 0); lids[1].rotation.x = PI - mix(open, closed, Math.pow(b, 0.7)) * -1 * -1;
        const dil = 1.0 + 0.45 * Math.sin(u * TAU * 2) + (yw > 0.3 ? 0.2 : 0); pupil.scale.set(dil, dil, 1); root.position.y = 1.2 + 0.05 * Math.sin(u * TAU); root.rotation.z = 0.05 * Math.sin(u * TAU * 2); root.rotation.y = 0.1 * Math.sin(u * TAU);
        nerves.forEach((segs, i) => segs.forEach((h, j) => { h.rotation.x = 0.35 * Math.sin(u * TAU * 2 - j * 0.8 + i * 2) ; h.rotation.y = 0.35 * Math.sin(u * TAU * 2 - j * 0.8 + i * 1.3 + 1); })); }, {});
      fx.light({ color: '#ffe8d0', intensity: 40, pos: [1.2, 2.2, 2.2], range: 8 }); fx.light({ color: '#ff3a30', intensity: 15, pos: [-1, 0.8, 1], range: 5 });
      floorBlob(fx, 0.45, '#000', false, (t) => ({ s: 1 + 0.05 * Math.sin((t / 3.2) * TAU), a: 0.45 }));
      fx.emitter({ count: 16, kind: 'dust', blend: 'normal', lit: 1, shape: 'sphere', radius: 1, pos: [0, 1.2, 0], size: [0.1, 0.25], life: [2.5, 4], speed: [0.02, 0.06], ramp: [[0, '#977', 0], [0.4, '#a88', 0.1], [1, '#655', 0]], order: -1 });
    } },

  /* ===================================================================== FISH SCHOOL */
  { id: 'critters/fish-school', name: 'Fish school', category: 'critters', loop: true, duration: 4.8,
    stage: { sky: 'void', ground: false, bloom: 0.45, view: { pos: [0.4, 1.55, 3.9], target: [0, 0.95, 0], fov: 38 } },
    build(fx) {
      backdrop(fx, '#0b6f8f', '#02161f'); sandFloor(fx);
      const N = 16, geo = fishGeo(), uni = { uPh: { value: 0 } };
      const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.55, envMapIntensity: 2 });
      mat.onBeforeCompile = (sh) => { sh.uniforms.uPh = uni.uPh; sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uPh;').replace('#include <begin_vertex>', `#include <begin_vertex>\nfloat ip=instanceMatrix[3].x*2.3+instanceMatrix[3].y*5.1; float w=smoothstep(.12,-.3,transformed.x); transformed.z+=sin(transformed.x*13.-uPh+ip)*.05*(.15+w*1.4); transformed.x+=0.; `); };
      const im = new THREE.InstancedMesh(geo, mat, N); im.frustumCulled = false; const o = new THREE.Object3D(); const base = [];
      for (let i = 0; i < N; i++) { const row = i % 2, k = i >> 1; base.push({ x: -1.5 + k * 0.44 + row * 0.22, y: row ? 1.28 : 0.82, z: row ? -0.35 : 0.12, ph: hash(i) * TAU, s: 1.15 + hash(i + 7) * 0.3 }); im.setColorAt(i, new THREE.Color().setHSL(0.55 + hash(i) * 0.04, 0.2, 0.9 + hash(i + 3) * 0.1)); }
      fx.mesh(im, (t) => { const k = (t / 4.8) * TAU; uni.uPh.value = k * 12;
        for (let i = 0; i < N; i++) { const b = base[i]; const dx = 0.07 * Math.sin(k + b.ph) + 0.03 * Math.sin(k * 2 + b.ph * 2), dy = 0.05 * Math.sin(k * 2 + b.ph) + 0.03 * Math.sin(k + b.ph * 3), dz = 0.05 * Math.sin(k + b.ph * 2);
          o.position.set(b.x + dx, b.y + dy, b.z + dz); o.rotation.set(0.05 * Math.cos(k * 2 + b.ph), 0.14 * Math.sin(k + b.ph) , 0.05 * Math.sin(k * 2 + b.ph)); o.scale.setScalar(b.s); o.updateMatrix(); im.setMatrixAt(i, o.matrix); } im.instanceMatrix.needsUpdate = true; }, {});
      fx.light({ color: '#9fe8ff', intensity: 60, pos: [0.5, 4, 1.5], range: 12 }); fx.light({ color: '#3aa0c0', intensity: 14, pos: [-2, 1, 2], range: 8 });
      for (let i = 0; i < 4; i++) fx.beam({ from: [-2 + i * 1.5, 5, -1], to: [-1.4 + i * 1.2, 0, 0.5], r: [0.12, 0.7], intensity: 0.28, noise: 0.5, freq: 1.5, speed: 0.4, edge: 1.4, ramp: [[0, '#cff'], [0.5, '#6cd'], [1, '#146']], alpha: 0.5, endFade: 0.25 });
      fx.emitter({ count: 30, kind: 'bubble', shape: 'box', shapeSize: [1.6, 0.05, 0.6], pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.2, 0.5], life: [2.5, 4.5], size: [0.025, 0.012], intensity: 1, ramp: [[0, '#cff', 0], [0.2, '#cff', 0.8], [1, '#8df', 0]], turb: [0.1, 1] });
      fx.emitter({ count: 70, kind: 'soft', shape: 'box', shapeSize: [2.5, 1.2, 1.2], pos: [0, 1.1, 0], size: [0.012, 0.006], life: [3, 5], speed: [0.01, 0.06], intensity: 1.4, ramp: [[0, '#8ef', 0], [0.4, '#bef', 0.7], [1, '#6bd', 0]] });
    } },

  /* ===================================================================== FLYING SKULL */
  { id: 'critters/flying-skull', name: 'Flying skull', category: 'critters', loop: true, duration: 2.4,
    stage: { sky: 'dark', bloom: 0.55, view: { pos: [0.7, 1.45, 2.5], target: [0, 1.3, 0], fov: 36 } },
    build(fx) {
      const sk = skullModel(), root = new THREE.Group(); root.add(sk); sk.scale.setScalar(1.7);
      fx.mesh(root, (t) => { const u = t / 2.4, k = u * TAU; root.position.set(0.05 * Math.sin(k), 1.3 + 0.1 * Math.sin(k * 2), 0.05 * Math.cos(k)); sk.rotation.set(0.08 * Math.sin(k * 2 + 1) + 0.05, -PI / 2 + 0.45 * Math.sin(k) + 0.35, 0.08 * Math.sin(k)); const chat = Math.max(0, Math.sin(k * 6)) * 0.2 + 0.05; sk.userData.jaw.rotation.z = -chat * (0.6 + 0.4 * Math.sin(k * 2)); }, {});
      const FP = [0, 1.62, 0];
      fx.orb({ kind: 'fire', r: [0.11, 0.11], pos: [0.0, 1.58, -0.04], intensity: 1.0, ramp: [[0, '#300'], [0.35, '#e30'], [0.7, '#fb3'], [1, '#fff6c0']], noise: 3, scroll: 2.4, disp: 0.5, alpha: 0.8, follow: (o, ta, t) => { const k = (t / 2.4) * TAU; o.position.set(0.05 * Math.sin(k) - 0.01, 1.52 + 0.1 * Math.sin(k * 2), 0.05 * Math.cos(k) - 0.03); } });
      fx.emitter({ count: 34, kind: 'flame', shape: 'disc', radius: 0.07, dir: [0, 1, 0], spread: 0.16, speed: [0.25, 0.8], life: [0.5, 0.9], size: [0.4, 0.1], aspect: 2, intensity: 0.7, turb: [0.15, 2], ramp: [[0, '#fff2c0', 1], [0.25, '#ffa020', 0.9], [0.7, '#d02000', 0.5], [1, '#300', 0]], pos: FP, follow: (m, ta, t) => { const k = (t / 2.4) * TAU; m.position.set(0.05 * Math.sin(k), 1.52 + 0.1 * Math.sin(k * 2), 0.05 * Math.cos(k) - 0.03); } });
      fx.emitter({ count: 26, kind: 'spark', shape: 'disc', radius: 0.08, dir: [0, 1, 0], spread: 0.7, speed: [0.5, 1.5], life: [0.8, 1.6], gravity: [0, 0.2, 0], size: [0.035, 0.01], stretch: 0.5, intensity: 3.5, ramp: [[0, '#fff6c0'], [0.4, '#ff8a20'], [1, '#400', 0]], pos: FP, follow: (m, ta, t) => { const k = (t / 2.4) * TAU; m.position.set(0.05 * Math.sin(k), 1.55 + 0.1 * Math.sin(k * 2), 0.05 * Math.cos(k)); } });
      const lp = fx.light({ color: '#ff8a30', intensity: 3.5, pos: [0, 1.7, 0.2], range: 7, flicker: 0.3, rate: 11 }); fx.on((t) => { lp.l.position.set(0, 1.55 + 0.1 * Math.sin((t / 2.4) * TAU * 2), 0.25); });
      fx.light({ color: '#dfe8ff', intensity: 18, pos: [1.2, 1.5, 2.0], range: 8 }); fx.light({ color: '#ff4a10', intensity: 2, pos: [0, 1.25, 0.5], range: 3, flicker: 0.4, rate: 7 });
      floorBlob(fx, 0.5, '#ff8030', true, (t) => ({ s: 1.4, a: 0.3 + 0.08 * Math.sin((t / 2.4) * TAU * 3) }));
      fx.emitter({ count: 18, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.1, dir: [0, 1, 0], spread: 0.3, speed: [0.2, 0.5], life: [1.2, 2], size: [0.12, 0.4], ramp: [[0, '#222', 0], [0.2, '#3a3028', 0.3], [1, '#111', 0]], pos: [0, 1.8, 0], order: -1 });
    } },

  /* ===================================================================== FROG */
  { id: 'critters/frog', name: 'Frog', category: 'critters', loop: true, duration: 2.6,
    stage: { sky: 'dusk', bloom: 0.35, view: { pos: [0.7, 0.5, 1.45], target: [0.5, 0.2, 0], fov: 34 } },
    build(fx) {
      const skin = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color('#9d6') });
      const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
      const trunk = skinSphere(0.13, 0.085, 0.1, '#3f8a22', '#d9d68a', 28, skin); trunk.position.set(-0.02, 0.0, 0); body.add(trunk);
      const head = skinSphere(0.085, 0.06, 0.095, '#4a9a28', '#cfd080', 28, skin); head.position.set(0.1, 0.03, 0); body.add(head);
      const throat = skinSphere(0.045, 0.03, 0.05, '#c8c878', '#e8e8a0', 16, skin); throat.position.set(0.1, -0.03, 0); body.add(throat);
      const eyes = []; for (const s of [-1, 1]) { const e = new THREE.Group(); e.position.set(0.11, 0.075, s * 0.055); body.add(e); const ball = skinSphere(0.033, 0.033, 0.033, '#4a9a28', '#4a9a28', 16, skin); e.add(ball); const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0335, 20, 12, 0, TAU, 0, 0.9), new THREE.MeshStandardMaterial({ color: '#e8b020', roughness: 0.25 })); iris.rotation.set(0, 0, -PI / 2); iris.rotation.z = -PI / 2; e.add(iris);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(0.0345, 16, 8, 0, TAU, 0, 0.42), new THREE.MeshBasicMaterial({ color: '#000' })); pu.rotation.z = -PI / 2; e.add(pu);
        const lid = new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 10, 0, TAU, 0, PI / 2), skin.clone()); lid.material.vertexColors = false; lid.material.color.set('#3f8a22'); lid.rotation.x = 0; e.add(lid); eyes.push({ e, iris, lid, s }); }
      // spots
      const spot = new THREE.MeshStandardMaterial({ color: '#2a6014', roughness: 0.5 }); for (let i = 0; i < 9; i++) { const sp = ellipsoid(0.016 + hash(i) * 0.014, 0.004, 0.016 + hash(i + 4) * 0.012, spot, 10); const a = (hash(i + 9) - 0.5) * 2.4, b = 0.7 + hash(i + 13) * 0.6; sp.position.set(-0.09 + hash(i + 2) * 0.17, 0.073 + hash(i) * 0.012, Math.sin(a) * 0.075); sp.position.y = 0.07 * Math.cos(Math.abs(a) * 0.9) + 0.012; void b; body.add(sp); }
      // legs
      const L1 = 0.13, L2 = 0.14; const mkLimb = (r, len) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, 10), skin); m.geometry = m.geometry.clone(); const p = m.geometry.attributes.position, c = new Float32Array(p.count * 3), col = new THREE.Color('#44922a'); for (let i = 0; i < p.count; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; } m.geometry.setAttribute('color', new THREE.BufferAttribute(c, 3)); return m; };
      const hind = [-1, 1].map((s) => { const g = new THREE.Group(); root.add(g); const th = mkLimb(0.03, L1 - 0.06), sh = mkLimb(0.022, L2 - 0.05), ft = new THREE.Group(); const f1 = mkLimb(0.014, 0.1); f1.rotation.z = PI / 2; f1.position.x = 0.05; ft.add(f1); for (const q of [-0.02, 0.02]) { const toe = mkLimb(0.008, 0.06); toe.rotation.z = PI / 2; toe.rotation.y = q * 8; toe.position.set(0.09, 0, q); ft.add(toe); } const pad = ellipsoid(0.055, 0.006, 0.04, skin, 10); pad.geometry = pad.geometry.clone(); pad.position.set(0.075, -0.008, 0); ft.add(pad); g.add(th, sh, ft); return { g, th, sh, ft, s }; });
      const front = [-1, 1].map((s) => { const g = new THREE.Group(); root.add(g); const up = mkLimb(0.017, 0.05), lo = mkLimb(0.015, 0.05), hand = ellipsoid(0.03, 0.007, 0.025, skin, 10); g.add(up, lo, hand); return { g, up, lo, hand, s }; });
      const limb = (m, x0, y0, x1, y1, z) => { const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy); m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z); m.rotation.set(0, 0, Math.atan2(dy, dx) - PI / 2); m.scale.y = L / (m.geometry.parameters.length + 2 * m.geometry.parameters.radius); };
      // tongue + fly
      const tmat = new THREE.MeshStandardMaterial({ color: '#d84a62', roughness: 0.3 }), tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 1, 6, 10), tmat), tip = ellipsoid(0.022, 0.016, 0.022, tmat, 12); root.add(tongue, tip);
      const fly = new THREE.Group(); fly.add(ellipsoid(0.014, 0.008, 0.008, std('#111', { roughness: 0.3, metalness: 0.4 }), 10)); const wm = new THREE.MeshBasicMaterial({ color: '#cde', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }); const fw = [-1, 1].map((s) => { const w = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.012), wm); w.geometry.translate(0, 0, s * 0.008); const g = new THREE.Group(); g.add(w); w.rotation.x = 0; g.position.y = 0.006; fly.add(g); w.position.z = 0; return { g, s }; }); root.add(fly);
      const FLY = V(1.05, 0.34, 0.0);
      const mouth = V();
      fx.mesh(root, (t) => {
        // body kinematics
        const crouch = sstep(0.5, 0.8, t) - sstep(1.18, 1.4, t), lp = clamp((t - 0.8) / 0.38), leap = t > 0.8 && t < 1.18, back = clamp((t - 1.95) / 0.5), hop = Math.sin(back * PI);
        let bx = 0.5 * sstep(0.8, 1.18, t) - 0.5 * sstep(1.95, 2.45, t), by = 0.3 * Math.sin(lp * PI) * (leap ? 1 : 0) + 0.1 * hop;
        const ext = leap ? Math.sin(lp * PI * 0.9 + 0.1) : (t > 1.95 && t < 2.45 ? hop * 0.7 : 0); // leg extension 0..1
        const pitch = leap ? mix(0.15, -0.25, lp) : 0.0 - 0.1 * crouch + 0.2 * hop * 0;
        const sink = 0.035 * crouch, breathe = 0.006 * Math.sin((t / 2.6) * TAU * 5);
        body.position.set(bx, 0.095 - sink + by + breathe, 0); body.rotation.z = pitch + 0.0; root.position.set(0, 0, 0);
        // hind legs: hip pos, foot target
        const hipX = bx - 0.1, hipY = body.position.y - 0.02; const cr = crouch;
        const fxFoot = mix(mix(hipX - 0.03, hipX + 0.02, cr), hipX - 0.26, ext), fyFoot = mix(0.01, 0.02, cr) + mix(0, hipY - 0.01 - 0.01 + by * 0.0, ext) * 1.0 - 0.0;
        for (const h of hind) { const footY = ext > 0.02 ? mix(0.012, hipY - 0.115, ext) : 0.012; const footX = ext > 0.02 ? mix(hipX - 0.04, hipX - 0.24, ext) : mix(hipX - 0.06, hipX + 0.01, cr); const k = ik2(hipX, hipY, footX, footY, L1, L2); const z = h.s * 0.105;
          limb(h.th, hipX, hipY, k[0], k[1], z); limb(h.sh, k[0], k[1], k[2], k[3], z); h.ft.position.set(k[2], k[3] + 0.005, z); h.ft.rotation.z = ext > 0.02 ? -ext * 0.9 : 0.0; }
        void fxFoot; void fyFoot;
        const reach = leap ? ext : 0; for (const f of front) { const sx = bx + 0.085, sy = body.position.y - 0.03; const hx = bx + 0.14 + 0.03 * reach, hy = Math.max(0.006, sy - 0.07 + 0.03 * reach * 0 - 0.02 * reach); const kx = (sx + hx) / 2 - 0.02, ky = (sy + hy) / 2 + 0.01; const z = f.s * 0.075; limb(f.up, sx, sy, kx, ky, z); limb(f.lo, kx, ky, hx, hy, z); f.hand.position.set(hx + 0.012, hy, z); }
        // throat gulp + eyes
        const gulp = sstep(1.45, 1.55, t) * (1 - sstep(1.9, 2.1, t)) * (0.5 + 0.5 * Math.sin((t - 1.5) * 18)); throat.scale.set(0.045 * (1 + 0.25 * Math.sin((t / 2.6) * TAU * 6) * 0.3 + 0.5 * gulp), 0.03 * (1 + 0.5 * gulp), 0.05 * (1 + 0.6 * gulp));
        const blinkV = Math.max(sstep(1.2, 1.3, t) * (1 - sstep(1.35, 1.5, t)), sstep(1.7, 1.78, t) * (1 - sstep(1.85, 1.95, t)), sstep(0.3, 0.34, t) * (1 - sstep(0.38, 0.44, t)));
        const flyAt = (tt) => V(FLY.x + 0.1 * Math.sin(tt * 9) + 0.05 * Math.sin(tt * 4), FLY.y + 0.05 * Math.sin(tt * 7 + 1) + 0.02 * Math.sin(tt * 3), 0.07 * Math.sin(tt * 5 + 2));
        const target = flyAt(Math.min(t, 1.08)); eyes.forEach((e) => { e.e.position.y = 0.075 - 0.025 * blinkV - 0.012 * gulp; e.lid.rotation.z = -blinkV * 0.0; e.lid.scale.set(1, 0.6 + 0.4 * (1 - blinkV) , 1); e.lid.position.y = 0.0 - 0.004 * blinkV; e.e.rotation.set(0, 0, 0); void target; });
        // mouth world position
        mouth.set(bx + 0.18 * Math.cos(body.rotation.z), body.position.y + 0.04 + 0.18 * Math.sin(body.rotation.z) * 0.3 - 0.02, 0);
        // fly
        const caught = t >= 1.1, show = t < 1.3 || t > 2.1; const fp = flyAt(t); const tl = clamp((t - 1.0) / 0.1) * (1 - clamp((t - 1.12) / 0.16));
        if (caught && t < 1.3) fp.copy(V().lerpVectors(mouth, FLY.clone().add(V(0, 0.01, 0)), clamp(tl))); else if (t >= 1.3) fp.set(FLY.x, FLY.y, 0); fly.position.copy(fp); fly.visible = show; const fa = t > 2.1 ? sstep(2.1, 2.5, t) : 1; fly.scale.setScalar((fa * (t >= 1.3 && t < 2.1 ? 0 : 1) + 1e-4) * 2.2);
        fw.forEach((w) => (w.g.rotation.x = w.s * (0.5 + 0.6 * Math.sin(t * 160)))); fly.rotation.y = Math.sin(t * 5) * 0.8; if (t < 1.1 || t > 2.1) fly.rotation.z = 0;
        // tongue
        const ext_t = clamp((t - 1.0) / 0.1) * (1 - clamp((t - 1.12) / 0.16)), vis = ext_t > 0.001; tongue.visible = tip.visible = vis;
        if (vis) { const end = V().lerpVectors(mouth, FLY, 1); const e = V().lerpVectors(mouth, end, Math.min(1, ext_t)); const d = e.clone().sub(mouth), L = d.length(); tongue.position.copy(mouth).addScaledVector(d, 0.5); tongue.quaternion.setFromUnitVectors(UP, d.clone().normalize()); tongue.scale.set(1, L / 1.03 + 1e-4, 1); tip.position.copy(e); tip.quaternion.copy(tongue.quaternion); }
      }, {});
      fx.light({ color: '#ffd8b0', intensity: 28, pos: [1.5, 2.5, 2], range: 9 }); fx.light({ color: '#7fa0ff', intensity: 8, pos: [-1.5, 1, 1], range: 6 });
      floorBlob(fx, 0.22, '#000', false, (t) => { const bx = 0.5 * sstep(0.8, 1.18, t) - 0.5 * sstep(1.95, 2.45, t); return { x: bx - 0.02, s: 1 - 0.3 * Math.sin(clamp((t - 0.8) / 0.38) * PI) * (t < 1.2 ? 1 : 0), a: 0.5 }; });
      fx.emitter({ count: 18, kind: 'dust', blend: 'normal', lit: 1, shape: 'disc', radius: 0.08, pos: [0.5, 0.02, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.1, 0.4], life: [0.6, 1.1], size: [0.05, 0.14], ramp: [[0, '#8a7a5a', 0], [0.2, '#9a8a68', 0.4], [1, '#6a5a40', 0]], delay: 1.18, order: -1 });
      fx.emitter({ count: 18, kind: 'dust', blend: 'normal', lit: 1, shape: 'disc', radius: 0.08, pos: [0, 0.02, 0], dir: [0, 1, 0], spread: 1.2, speed: [0.1, 0.4], life: [0.6, 1.1], size: [0.05, 0.14], ramp: [[0, '#8a7a5a', 0], [0.2, '#9a8a68', 0.4], [1, '#6a5a40', 0]], delay: 0.82, order: -1 });
    } },

  /* ===================================================================== GHOST */
  { id: 'critters/ghost', name: 'Ghost', category: 'critters', loop: true, duration: 2.4,
    stage: { sky: 'night', bloom: 0.55, view: { pos: [0.6, 1.1, 2.8], target: [0, 0.75, 0], fov: 38 } },
    build(fx) {
      const grp = new THREE.Group(), mat = ghostMat(); const prof = []; for (let i = 0; i <= 32; i++) { const v = i / 32; let r; if (v < 0.72) r = 0.34 * (1.12 - 0.12 * Math.pow(v / 0.72, 1.5)) * (1 + 0.1 * Math.pow(1 - v / 0.72, 3)); else r = 0.34 * 1.0 * Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.72) / 0.28, 2.2))) * 1.0; prof.push(new THREE.Vector2(Math.max(0.0005, r * (v < 0.72 ? 0.95 + 0.1 * Math.sin(v * 3) : 1)), v * 1.0)); }
      const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 56), mat); body.renderOrder = 10; grp.add(body);
      const dark = new THREE.MeshBasicMaterial({ color: '#02060e' }), eyeG = new THREE.MeshBasicMaterial({ color: new THREE.Color('#9fe8ff').multiplyScalar(3), transparent: true, opacity: 0.95, depthTest: false }); const eyes = [];
      for (const s of [-1, 1]) { const e = ellipsoid(0.045, 0.07, 0.03, dark, 16); e.position.set(0.3, 0.72, s * 0.11); e.rotation.y = s * 0.0; grp.add(e); const gl = ellipsoid(0.02, 0.035, 0.01, eyeG, 10); gl.position.set(0.325, 0.74, s * 0.11); gl.renderOrder = 40; grp.add(gl); eyes.push(gl); }
      const mouth = ellipsoid(0.04, 0.06, 0.05, dark, 16); mouth.position.set(0.31, 0.55, 0); grp.add(mouth);
      const arms = [-1, 1].map((s) => { const a = ellipsoid(0.17, 0.05, 0.05, mat, 16); a.position.set(0.05, 0.5, s * 0.3); a.renderOrder = 11; grp.add(a); return { a, s }; });
      grp.rotation.y = -0.15; const root = new THREE.Group(); root.add(grp); grp.rotation.y = 0;
      fx.mesh(root, (t) => { const u = t / 2.4, k = u * TAU; mat.uniforms.uT.value = u; root.position.set(0.55 * Math.sin(k), 0.3 + 0.1 * Math.sin(k * 2), 0.0); grp.rotation.y = 0.5 - 0.35 * Math.cos(k); grp.rotation.x = 0.0; grp.rotation.z = -0.12 * Math.cos(k) + 0.04 * Math.sin(k * 2); const b = 1 + 0.03 * Math.sin(k * 4); body.scale.set(b, 1 - 0.02 * Math.sin(k * 4), b);
        arms.forEach(({ a, s }) => { a.rotation.z = 0.5 * Math.sin(k * 2 + s) * 0.5 - 0.3; a.rotation.x = s * (0.4 + 0.25 * Math.sin(k * 2)); }); const bl = 1 - sstep(0.45, 0.5, u % 0.5 ) * 0; eyes.forEach((e) => { e.material.opacity = 0.8 + 0.2 * Math.sin(k * 6); }); mouth.scale.set(0.04, 0.05 + 0.025 * Math.sin(k * 2) ** 2, 0.05); }, {});
      floorBlob(fx, 0.55, '#6fb8ff', true, (t) => { const k = (t / 2.4) * TAU; return { x: 0.55 * Math.sin(k), s: 1.2, a: 0.25 }; });
      floorBlob(fx, 0.4, '#000', false, (t) => { const k = (t / 2.4) * TAU; return { x: 0.55 * Math.sin(k), s: 1, a: 0.2 }; });
      const gl = fx.light({ color: '#7fb8ff', intensity: 16, pos: [0, 0.9, 0.4], range: 6, flicker: 0.2, rate: 2 }); fx.on((t) => { gl.l.position.x = 0.55 * Math.sin((t / 2.4) * TAU) + 0.2; });
      fx.emitter({ count: 26, kind: 'smoke', blend: 'normal', lit: 1, shape: 'box', shapeSize: [1.4, 0.02, 0.5], pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.03, 0.12], life: [2, 3.2], size: [0.5, 1.0], ramp: [[0, '#6a8aa8', 0], [0.3, '#8aa8c8', 0.16], [1, '#4a6a88', 0]], order: -1, turb: [0.1, 0.5] });
      fx.emitter({ count: 18, kind: 'soft', shape: 'box', shapeSize: [1, 0.5, 0.4], pos: [0, 0.8, 0], size: [0.03, 0.008], life: [1.5, 2.4], speed: [0.05, 0.2], dir: [0, 1, 0], spread: 0.5, intensity: 2, ramp: [[0, '#9cf', 0], [0.3, '#cef', 1], [1, '#68c', 0]] });
    } },

  /* ===================================================================== JELLYFISH */
  { id: 'critters/jellyfish', name: 'Jellyfish', category: 'critters', loop: true, duration: 3.2,
    stage: { sky: 'void', ground: false, bloom: 0.7, view: { pos: [0.4, 1.4, 4.0], target: [0, 1.25, 0], fov: 38 } },
    build(fx) {
      backdrop(fx, '#04283d', '#010a12');
      const mat = bellMat(); const lp = []; for (let i = 0; i <= 28; i++) { const a = (i / 28) * PI / 2; lp.push(new THREE.Vector2(Math.max(0.001, Math.sin(a) * 0.5), Math.cos(a) * 0.4 * (1 + 0.05 * Math.sin(a * 6)))); } lp.push(new THREE.Vector2(0.5, -0.0), new THREE.Vector2(0.54, -0.025)); // flared lip
      const bell = new THREE.Mesh(new THREE.LatheGeometry(lp, 64), mat); bell.renderOrder = 22; const grp = new THREE.Group(); grp.add(bell);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff9ad0').multiplyScalar(1.4), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })); inner.scale.set(1, 0.45, 1); inner.position.y = 0.1; grp.add(inner);
      const pulse = (t) => { const ph = (t / 1.6) % 1; return ph < 0.28 ? sstep(0, 0.28, ph) : 1 - Math.pow(sstep(0.28, 1, ph), 0.8); }, lift = (t) => { const ph = (t / 1.6) % 1; return ph < 0.28 ? sstep(0, 0.28, ph) : 1 - sstep(0.28, 1, ph); };
      const BY = (t) => 1.15 + 0.2 * lift(t);
      fx.mesh(grp, (t) => { const p = pulse(t); mat.uniforms.uP.value = p; mat.uniforms.uT.value = t / 3.2; grp.position.set(0, BY(t), 0); grp.rotation.z = 0.05 * Math.sin((t / 3.2) * TAU); inner.scale.set(1 - 0.2 * p, 0.45 + 0.2 * p, 1 - 0.2 * p); }, {});
      const mkT = (i, n, thick) => { const a0 = (i / n) * TAU + 0.2, R = thick ? 0.12 : 0.44, len = thick ? 1.0 : 0.85 + 0.5 * hash(i + 3), ph = hash(i) * TAU; const fn = (t) => { const pl = pulse(t), by = BY(t); const out = []; const N = 22; for (let j = N; j >= 0; j--) { const s = j / N, lag = Math.sin((t / 3.2) * TAU * 2 - s * 4 + ph); const spread = (1 - 0.28 * pl) * (R + s * 0.05) * (thick ? 1 : 1) ; const sway = (thick ? 0.08 : 0.07) * s * s * lag + 0.03 * s * Math.sin((t / 3.2) * TAU + ph); out.push([Math.cos(a0) * spread + sway, by - 0.01 - s * len * (1 + 0.1 * pl) + 0.05 * lag * s * 0, Math.sin(a0) * spread + sway * Math.sin(ph) + 0.4 * 0]); } return out; }; return fn; };
      for (let i = 0; i < 5; i++) { const f = mkT(i, 5, true); fx.ribbon({ n: 22, points: (t) => f(t), width: (u) => 0.035 * (0.5 + 0.5 * Math.sin(u * PI * 0.9 + 0.5)) + 0.01, head: () => 1.001, tail: 1.0, intensity: 1.8, core: 3, ramp: [[0, '#fff0ff'], [0.4, '#ff7ad0'], [1, '#601080']] }); }
      for (let i = 0; i < 12; i++) { const f = mkT(i, 12, false); fx.ribbon({ n: 22, points: (t) => f(t), width: 0.012, head: () => 1.001, tail: 1.1, intensity: 1.2, core: 3, ramp: [[0, '#e0f8ff'], [0.4, '#7ad0ff'], [1, '#1030a0']] }); }
      const lt = fx.light({ color: '#d070ff', intensity: 40, pos: [0, 1.3, 0.2], range: 7 }); fx.on((t) => { lt.l.position.y = BY(t) + 0.1; lt.l.intensity = 0.09 * (30 + 18 * pulse(t)); });
      fx.emitter({ count: 120, kind: 'soft', shape: 'box', shapeSize: [2.2, 1.6, 1.2], pos: [0, 1.4, 0], size: [0.012, 0.005], life: [3, 5], speed: [0.01, 0.05], dir: [0, 1, 0], spread: 1, intensity: 1.2, ramp: [[0, '#8ef', 0], [0.4, '#bef', 0.6], [1, '#6bd', 0]] });
      fx.emitter({ count: 20, kind: 'soft', shape: 'sphere', radius: 0.4, pos: [0, 1.3, 0], size: [0.03, 0.01], life: [1.5, 2.5], speed: [0.02, 0.1], intensity: 2.5, ramp: [[0, '#ff9ae0', 0], [0.3, '#ffd0f0', 1], [1, '#a040c0', 0]], follow: (m, ta, t) => { m.position.y = BY(t) - 0.2; } });
    } },

  /* ===================================================================== SLIME */
  { id: 'critters/slime', name: 'Slime', category: 'critters', loop: true, duration: 1.8,
    stage: { sky: 'dusk', bloom: 0.4, view: { pos: [0.3, 0.9, 2.5], target: [0, 0.42, 0], fov: 36 } },
    build(fx) {
      const R = 0.32; let geo = new THREE.IcosahedronGeometry(1, 4); geo.deleteAttribute('uv'); geo.deleteAttribute('normal'); geo = mergeVertices(geo, 1e-4); geo.computeVertexNormals(); const base = new Float32Array(geo.attributes.position.array), P = geo.attributes.position;
      const mat = new THREE.MeshPhysicalMaterial({ color: '#46d83a', metalness: 0, roughness: 0.08, transmission: 0.85, thickness: 0.9, ior: 1.4, attenuationColor: new THREE.Color('#1c8a18'), attenuationDistance: 0.35, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 2.2, specularIntensity: 1 });
      const body = new THREE.Mesh(geo, mat), grp = new THREE.Group(); grp.add(body);
      const core = ellipsoid(0.07, 0.06, 0.06, new THREE.MeshStandardMaterial({ color: '#b6ff40', emissive: '#6ae020', emissiveIntensity: 1.2, roughness: 0.5 }), 16); core.position.set(-0.08, -0.02, -0.02); grp.add(core);
      const eyeM = std('#fff', { roughness: 0.2 }), pupM = new THREE.MeshBasicMaterial({ color: '#0a1a08' }); const eyes = []; for (const s of [-1, 1]) { const e = ellipsoid(0.045, 0.055, 0.04, eyeM, 14); e.position.set(0.19, 0.1, s * 0.11); const pu = ellipsoid(0.022, 0.032, 0.02, pupM, 10); pu.position.set(0.035, 0, 0); e.add(pu); grp.add(e); eyes.push(e); }
      const bubs = []; for (let i = 0; i < 6; i++) { const b = ellipsoid(0.012 + hash(i) * 0.012, 0.012 + hash(i) * 0.012, 0.012 + hash(i) * 0.012, new THREE.MeshStandardMaterial({ color: '#d8ffc8', roughness: 0.1, transparent: true, opacity: 0.7 }), 8); b.userData = { a: hash(i + 3) * TAU, r: 0.08 + hash(i + 5) * 0.14, y: -0.1 + hash(i + 9) * 0.25 }; grp.add(b); bubs.push(b); }
      const st = (t) => { // returns sy (vertical scale), h (height above floor of base), sx via volume
        let sy = 1, h = 0, sw = 0; const a = Math.min;
        if (t < 0.28) sy = mix(1, 0.6, sstep(0, 0.28, t)); else if (t < 0.42) { const u = sstep(0.28, 0.42, t); sy = mix(0.6, 1.32, u); h = 0.0; } else if (t < 1.12) { const u = (t - 0.42) / 0.7; h = 4 * u * (1 - u) * 0.7; sy = mix(1.32, 1.0, Math.abs(u * 2 - 1) > 0.8 ? 1 : 0.55) + 0.0; sy = 1 + 0.28 * Math.cos(u * PI) * 0.6 + 0.04 * Math.sin(u * PI); if (u > 0.78) sy = mix(sy, 1.28, sstep(0.78, 1, u)); } else if (t < 1.26) { const u = sstep(1.12, 1.26, t); sy = mix(1.28, 0.5, u); sw = 1; } else { const u = t - 1.26; sy = 1 - 0.5 * Math.exp(-u * 3.4) * Math.cos(u * 17) + (u > 0.3 ? 0 : 0) ; sy = 1 + (0.5 * Math.cos(u * 17 - 0.0) * -1) * Math.exp(-u * 5) * (u < 0.54 ? 1 : 0.0); sy = mix(sy, 1, sstep(0.4, 0.54, u)); sw = Math.exp(-u * 5); }
        return { sy, h, sw }; };
      fx.mesh(grp, (t) => { const { sy, h, sw } = st(t), sx = 1 / Math.sqrt(sy), k = (t / 1.8) * TAU * 3; const w = Math.max(0, (t > 1.12 ? Math.exp(-(t - 1.12) * 4.5) : 0.2 * (t < 0.42 ? 0 : 1))) * 0.07;
        for (let i = 0; i < P.count; i++) { let x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]; const ph = Math.sin(k * 3 + y * 9 + x * 5) * Math.cos(k * 2 + z * 7);
          let X = x * (1 + w * ph) * sx, Y = y * (1 + w * ph) * sy, Z = z * (1 + w * ph) * sx; if (Y < -0.55 * sy) { const f = (Y + 0.55 * sy); Y = -0.55 * sy + f * 0.35; const spread = 1 + 0.45 * sw * (1 - Math.max(0, Y / sy)); X *= spread * (1 + 0.12 * Math.abs(f)); Z *= spread * (1 + 0.12 * Math.abs(f)); } P.setXYZ(i, X * R, Y * R, Z * R); }
        P.needsUpdate = true; geo.computeVertexNormals(); grp.position.y = R * 0.68 * sy + h + 0.005; eyes.forEach((e, i) => { e.position.set(0.27 * sx, 0.1 * sy, (i ? 1 : -1) * 0.11 * sx); e.scale.set(0.05, 0.062 * (1 + 0.2 * (sy - 1)), 0.04); });
        core.position.set(-0.08 + 0.03 * Math.sin(k * 0.5), -0.02 + 0.03 * Math.sin(k * 0.7), -0.02 + 0.02 * Math.cos(k)); bubs.forEach((b, i) => { const u = (t / 1.8 + b.userData.y) ; b.position.set(Math.cos(b.userData.a + t) * b.userData.r * sx, ((b.userData.y + 0.25 * Math.sin(t * 3.49 + i)) ) * sy, Math.sin(b.userData.a + t) * b.userData.r * sx); void u; }); grp.rotation.y = -PI / 2 + 0.3 * Math.sin((t / 1.8) * TAU); }, {});
      // puddle
      const pud = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshPhysicalMaterial({ color: '#46d83a', roughness: 0.05, transmission: 0.0, transparent: true, opacity: 0.5, clearcoat: 1, envMapIntensity: 2 })); pud.rotation.x = -PI / 2; pud.position.y = 0.004;
      fx.mesh(pud, (t) => { const u = t > 1.12 ? 1 - sstep(1.2, 1.8, t) : 0; const g = t > 1.12 ? sstep(1.12, 1.3, t) : 0; pud.scale.setScalar(0.05 + 0.5 * R * g * 1.0 + 0.001); pud.material.opacity = 0.55 * u * g; }, {});
      floorBlob(fx, R * 1.1, '#000', false, (t) => { const s = st(t); return { s: 1.1 - 0.35 * Math.min(1, s.h / 0.5) + (t > 1.12 ? 0.3 * s.sw : 0), a: 0.5 - 0.3 * Math.min(1, s.h / 0.5) }; });
      fx.light({ color: '#9fff7a', intensity: 10, pos: [0, 0.5, 0.6], range: 4 }); fx.light({ color: '#ffd8b0', intensity: 25, pos: [1.5, 2.4, 2], range: 9 });
      const drops = (delay, n, pos) => fx.emitter({ count: n, kind: 'drop', blend: 'normal', lit: 1, shape: 'disc', radius: 0.22, pos, dir: [0, 1, 0], spread: 1.25, speed: [0.8, 2.6], life: [0.45, 0.8], gravity: [0, -9, 0], size: [0.05, 0.025], bounce: 0.2, ramp: [[0, '#5ff050', 1], [0.8, '#3cc83a', 0.9], [1, '#1c8a18', 0]], delay, radial: 0.8 });
      drops(1.12, 28, [0, 0.05, 0]); drops(0.34, 12, [0, 0.04, 0]);
      fx.ring({ t0: 1.12, dur: 0.5, r: [0.2, 0.9], width: [0.1, 0.03], normal: 'up', intensity: 0.5, ramp: [[0, '#cfffc0'], [1, '#2a9a28']] });
    } },

  /* ===================================================================== SNAKE */
  { id: 'critters/snake', name: 'Snake', category: 'critters', loop: true, duration: 2.4,
    stage: { sky: 'dusk', bloom: 0.3, view: { pos: [0.3, 1.2, 1.9], target: [0, 0.05, 0], fov: 36 } },
    build(fx) {
      const geo = snakeGeo(), mat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.3, metalness: 0.05, sheen: 0.5, sheenColor: new THREE.Color('#bfa') });
      const body = new THREE.Mesh(geo, mat); body.frustumCulled = false; const grp = new THREE.Group(); grp.add(body);
      const head = new THREE.Group(); const hd = ellipsoid(0.075, 0.032, 0.045, mat.clone(), 20); hd.material.vertexColors = false; hd.material.color.set('#4a6a28'); head.add(hd); const snout = ellipsoid(0.04, 0.026, 0.034, hd.material, 14); snout.position.x = 0.06; head.add(snout);
      for (const s of [-1, 1]) { const e = ellipsoid(0.012, 0.012, 0.012, std('#e8c020', { roughness: 0.2 }), 10); e.position.set(0.035, 0.02, s * 0.034); head.add(e); const pu = ellipsoid(0.004, 0.011, 0.004, new THREE.MeshBasicMaterial({ color: '#000' }), 6); pu.position.set(0.045, 0.02, s * 0.039); head.add(pu); }
      const tonM = new THREE.MeshStandardMaterial({ color: '#d02040', roughness: 0.4 }), tg = new THREE.Group(); tg.position.set(0.1, -0.005, 0); head.add(tg); const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.09, 5), tonM); tb.rotation.z = PI / 2; tb.position.x = 0.045; tg.add(tb); for (const s of [-1, 1]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.035, 5), tonM); f.position.set(0.105, 0, s * 0.01); f.rotation.z = PI / 2 + s * 0.4; tg.add(f); } grp.add(head);
      const N = SN.n, R = SN.rad, P = geo.attributes.position, Cc = geo.attributes.color; const pts = Array.from({ length: N + 1 }, () => V()); const col = new THREE.Color(), cA = new THREE.Color('#5a7a2a'), cB = new THREE.Color('#1e2c10'), cC = new THREE.Color('#d8c880');
      const LEN = 2.0, lam = 0.85;
      fx.mesh(grp, (t) => { const u = t / 2.4;
        for (let i = 0; i <= N; i++) { const s = i / N * LEN, x = 0.95 - s, amp = 0.2 * (0.35 + 0.65 * Math.min(1, s / 0.5)) * (1 - 0.25 * Math.max(0, s - 1.4)), z = amp * Math.sin(TAU * (s / lam - u)); const lift = 0.085 + 0.09 * Math.exp(-s * s * 18) * (1 - 0.3 * Math.sin(u * TAU * 2)); pts[i].set(x, lift * (i === 0 ? 1 : 1) + (s < 0.3 ? 0 : 0) , z); if (s > 0.18) pts[i].y = 0.075 - 0.01 * Math.sin(s * 9 - u * TAU * 2) * 0.3; else pts[i].y = 0.075 + 0.1 * (1 - s / 0.18) * (1 - s / 0.18); }
        const tg2 = V(), nn = V(), bb = V(), t2 = V();
        for (let i = 0; i <= N; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(N, i + 1)]; tg2.copy(b).sub(a).normalize(); nn.crossVectors(tg2, UP).normalize(); bb.crossVectors(nn, tg2).normalize(); const s = i / N; const rad = (s < 0.04 ? 0.03 + 0.02 * (s / 0.04) : 0.052 * (1 - 0.25 * sstep(0.04, 0.12, s) * 0 )) * (s > 0.5 ? 1 - Math.pow((s - 0.5) / 0.5, 1.5) * 0.93 : 1) * (s < 0.2 ? 0.72 + 0.28 * sstep(0.0, 0.2, s) : 1) + 0.002;
          for (let j = 0; j <= R; j++) { const a2 = (j / R) * TAU, c = Math.cos(a2), sn = Math.sin(a2), k = i * (R + 1) + j; const ry = rad * 0.8; P.setXYZ(k, pts[i].x + (nn.x * c * rad + bb.x * sn * ry), pts[i].y + (nn.y * c * rad + bb.y * sn * ry), pts[i].z + (nn.z * c * rad + bb.z * sn * ry));
            const diam = Math.pow(Math.max(0, Math.sin(s * 70)), 3) * smoothC(Math.abs(c)); col.copy(cA).lerp(cB, diam * 0.85); if (sn < -0.3) col.lerp(cC, clamp((-sn - 0.3) / 0.4)); const ring = 0.5 + 0.5 * Math.sin(s * 140); col.multiplyScalar(0.85 + 0.2 * ring); Cc.setXYZ(k, col.r, col.g, col.b); } }
        P.needsUpdate = true; Cc.needsUpdate = true; geo.computeVertexNormals();
        const hp = pts[0], h2 = pts[3]; head.position.set(hp.x + 0.04, hp.y + 0.005, hp.z); const dx = hp.x - h2.x, dz = hp.z - h2.z; head.rotation.set(0, -Math.atan2(dz, dx), -0.1 + 0.05 * Math.sin(u * TAU * 2)); head.position.x -= 0.0;
        const fl = Math.max(0, Math.sin(u * TAU * 4)); tg.scale.x = 0.3 + 0.7 * fl * fl; tg.visible = fl > 0.12; tg.rotation.y = 0.2 * Math.sin(u * TAU * 12); }, {});
      function smoothC(x) { return x * x * (3 - 2 * x); }
      floorBlob(fx, 1.2, '#000', false, () => ({ x: 0.0, z: 0.0, s: 1.0, a: 0.0 }));
      fx.light({ color: '#ffd8b0', intensity: 30, pos: [1.5, 2.5, 2], range: 9 }); fx.light({ color: '#7f90ff', intensity: 8, pos: [-1.5, 1, -1], range: 6 });
      fx.emitter({ count: 24, kind: 'dust', blend: 'normal', lit: 1, shape: 'box', shapeSize: [1.0, 0.01, 0.3], pos: [0, 0.02, 0], dir: [-1, 0.3, 0], spread: 0.5, speed: [0.2, 0.5], life: [0.6, 1.3], size: [0.05, 0.16], ramp: [[0, '#8a7a5a', 0], [0.2, '#9a8a68', 0.28], [1, '#6a5a40', 0]], order: -1 });
    } },

  /* ===================================================================== WISP */
  { id: 'critters/wisp', name: 'Wisp', category: 'critters', loop: true, duration: 3.2,
    stage: { sky: 'dark', bloom: 0.75, view: { pos: [0.4, 1.5, 4.2], target: [0, 0.75, 0], fov: 38 } },
    build(fx) {
      const path = (t) => { const k = (t / 3.2) * TAU; return [1.0 * Math.sin(k), 0.62 + 0.26 * Math.sin(2 * k + 0.6) + 0.1 * Math.sin(5 * k), 0.7 * Math.cos(k) * Math.cos(k) * 1.0 - 0.2 + 0.3 * Math.sin(2 * k)]; };
      const ramp = [[0, '#021218'], [0.3, '#0a7a90'], [0.62, '#5ff0ff'], [0.9, '#e8ffff'], [1, '#fff']];
      fx.orb({ kind: 'fire', r: [0.13, 0.13], ramp, intensity: 0.7, noise: 3.2, scroll: 2.8, disp: 0.55, alpha: 0.9, follow: (o, ta, t) => o.position.set(...path(t)) });
      fx.orb({ kind: 'plasma', r: [0.06, 0.06], ramp: [[0, '#8ff'], [1, '#fff']], intensity: 0.9, noise: 4, scroll: 4, disp: 0.3, follow: (o, ta, t) => o.position.set(...path(t)) });
      fx.trail({ path, len: 1.1, width: 0.1, n: 80, intensity: 0.8, core: 3, ramp: [[0, '#f0ffff'], [0.25, '#5ff0ff'], [0.6, '#0a8a9a'], [1, '#012a30']] });
      fx.trail({ path: (t) => { const p = path(t - 0.12); return [p[0], p[1] + 0.03, p[2]]; }, len: 0.9, width: 0.035, n: 60, intensity: 0.8, core: 4, ramp: [[0, '#fff'], [1, '#2ab8c8']] });
      fx.emitter({ count: 36, kind: 'flame', shape: 'disc', radius: 0.05, dir: [0, 1, 0], spread: 0.3, speed: [0.2, 0.6], life: [0.4, 0.8], size: [0.35, 0.08], aspect: 2.0, intensity: 0.35, turb: [0.15, 2], ramp: [[0, '#e8ffff', 1], [0.25, '#4fe8ff', 0.9], [0.7, '#0a7090', 0.5], [1, '#012', 0]], follow: (m, ta, t) => m.position.set(...path(t)) });
      fx.emitter({ count: 40, kind: 'spark', shape: 'sphere', radius: 0.08, dir: [0, 1, 0], spread: 2, speed: [0.1, 0.5], life: [0.8, 1.8], gravity: [0, 0.2, 0], size: [0.03, 0.008], stretch: 0.5, intensity: 3, ramp: [[0, '#fff'], [0.4, '#5ff0ff'], [1, '#046', 0]], follow: (m, ta, t) => m.position.set(...path(t)) });
      dustTrail(fx, path, { n: 40, life: 1.4, color: '#7ff4ff', size: 1.2, drift: 0.18, gravity: 0.1 });
      const lp = fx.light({ color: '#4fe8ff', intensity: 22, pos: [0, 0.7, 0], range: 8, flicker: 0.2, rate: 6 }); fx.on((t) => lp.l.position.set(...path(t)));
      floorBlob(fx, 0.9, '#2ad8f0', true, (t) => { const p = path(t); return { x: p[0], z: p[2], s: 1 + (1 - Math.min(1, p[1])) * 0.2, a: 0.5 }; });
      fx.emitter({ count: 14, kind: 'smoke', blend: 'normal', lit: 1, shape: 'box', shapeSize: [1.3, 0.02, 0.8], pos: [0, 0.05, -0.1], dir: [0, 1, 0], spread: 0.4, speed: [0.03, 0.1], life: [2, 3], size: [0.5, 0.9], ramp: [[0, '#0a3a44', 0], [0.3, '#1a6a78', 0.12], [1, '#082a30', 0]], order: -1 });
    } },
];
