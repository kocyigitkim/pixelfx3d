import * as THREE from 'three';
import { NOISE } from '../core/glsl.js';

/* ---------------------------------------------------------------- helpers (local to this category) */
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const eob = (x) => { x = cl(x); const c = 1.7; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
const ADD = { transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor };

const _halo = {};
function halo(color, size, hdr = 1.5) { // additive soft sprite from a procedural canvas gradient
  if (!_halo.tex) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); _halo.tex = new THREE.CanvasTexture(c); }
  const m = new THREE.SpriteMaterial({ map: _halo.tex, color: new THREE.Color(color).multiplyScalar(hdr), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
  const s = new THREE.Sprite(m); s.scale.setScalar(size); s.renderOrder = 30; s.frustumCulled = false; return s;
}

/** dark body with a glowing fresnel rim + drifting veins (tentacles, arms). uniforms.uA = opacity */
function rimMat(base = '#07030c', rim = '#9a4dff', pw = 2.4, it = 1.6) {
  return new THREE.ShaderMaterial({
    uniforms: { uBase: { value: new THREE.Color(base) }, uRim: { value: new THREE.Color(rim) }, uPow: { value: pw }, uInt: { value: it }, uA: { value: 1 }, uTime: { value: 0 } }, transparent: true, side: THREE.DoubleSide,
    vertexShader: `varying vec3 vN, vV, vP; void main(){ vP=position; vec4 mv=modelViewMatrix*vec4(position,1.); vN=normalize(normalMatrix*normal); vV=-mv.xyz; gl_Position=projectionMatrix*mv; }`,
    fragmentShader: `${NOISE} uniform vec3 uBase,uRim; uniform float uPow,uInt,uA,uTime; varying vec3 vN,vV,vP;
      void main(){ vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N; float f=pow(1.-abs(dot(N,normalize(vV))),uPow); float n=fbm3(vP*4.+vec3(0.,-uTime*.6,0.)); float vein=smoothstep(.62,.7,n)*.5;
        vec3 c=uBase*(.6+n)+uRim*(f*uInt*(.45+n)+vein*.5); gl_FragColor=vec4(c,uA); }` });
}

/** tube along a live polyline. mesh.userData.set(pts[[x,y,z]*(segs+1)], radiusFn(u)) */
function tube(segs, rad, mat) {
  const nv = (segs + 1) * rad, pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = [];
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad, c = a + rad, d = b + rad; idx.push(a, c, b, b, c, d); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false;
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), ref = new THREE.Vector3();
  m.userData.set = (pts, rf) => {
    for (let i = 0; i <= segs; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(segs, i + 1)]; T.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (T.lengthSq() < 1e-10) T.set(0, 1, 0); T.normalize();
      if (i === 0) { ref.set(0, 0, 1); if (Math.abs(T.z) > 0.9) ref.set(1, 0, 0); B.crossVectors(T, ref).normalize(); N.crossVectors(B, T); } else { B.crossVectors(T, N).normalize(); N.crossVectors(B, T).normalize(); }
      const r = rf(i / segs), p = pts[i];
      for (let j = 0; j < rad; j++) { const an = (j / rad) * 6.2832, c = Math.cos(an), s = Math.sin(an); const rx = N.x * c + B.x * s, ry = N.y * c + B.y * s, rz = N.z * c + B.z * s, k = (i * rad + j) * 3;
        pos[k] = p[0] + rx * r; pos[k + 1] = p[1] + ry * r; pos[k + 2] = p[2] + rz * r; nor[k] = rx; nor[k + 1] = ry; nor[k + 2] = rz; }
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
  };
  return m;
}
const mkPts = (n) => Array.from({ length: n + 1 }, () => [0, 0, 0]);

/** small PBR skull facing +Z, ~1 unit tall. group.userData.jaw = jaw pivot (rotation.x opens it), .eyes = glow materials */
function skull(glow = '#9a5cff', hdr = 3, boneCol = '#cfc8b4') {
  const g = new THREE.Group(), bone = new THREE.MeshStandardMaterial({ color: boneCol, roughness: 0.55, metalness: 0.05, emissive: glow, emissiveIntensity: 0.12 });
  const dark = new THREE.MeshBasicMaterial({ color: '#030106' }), eg = new THREE.MeshBasicMaterial({ color: new THREE.Color(glow).multiplyScalar(hdr), toneMapped: false });
  const add = (geo, mat, x, y, z, sx = 1, sy = 1, sz = 1, par = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); par.add(m); return m; };
  add(new THREE.SphereGeometry(0.5, 24, 18), bone, 0, 0.08, 0, 1, 1.02, 0.98);
  add(new THREE.SphereGeometry(0.34, 20, 14), bone, 0, -0.33, 0.17, 0.95, 0.78, 0.85);
  add(new THREE.SphereGeometry(0.2, 14, 10), bone, 0.3, -0.18, 0.2, 0.7, 1, 0.8); add(new THREE.SphereGeometry(0.2, 14, 10), bone, -0.3, -0.18, 0.2, 0.7, 1, 0.8);
  for (const s of [-1, 1]) { add(new THREE.SphereGeometry(0.15, 16, 12), dark, 0.2 * s, -0.12, 0.38, 1, 1.15, 0.7); add(new THREE.SphereGeometry(0.06, 10, 8), eg, 0.2 * s, -0.12, 0.45); }
  const nose = add(new THREE.ConeGeometry(0.06, 0.12, 3), dark, 0, -0.33, 0.5, 1, 1, 0.5); nose.rotation.z = Math.PI;
  const jaw = new THREE.Group(); jaw.position.set(0, -0.5, 0.0); g.add(jaw); add(new THREE.SphereGeometry(0.3, 16, 12), bone, 0, -0.1, 0.2, 0.92, 0.36, 0.85, jaw);
  for (let i = -3; i <= 3; i++) { add(new THREE.BoxGeometry(0.065, 0.085, 0.05), bone, i * 0.075, -0.505, 0.5 - Math.abs(i) * 0.03); add(new THREE.BoxGeometry(0.065, 0.07, 0.05), bone, i * 0.075, -0.14, 0.45 - Math.abs(i) * 0.04, 1, 1, 1, jaw); }
  g.userData.jaw = jaw; g.userData.eg = eg; g.userData.bone = bone; return g;
}
const SMOKE = (a = 0.5, c = '#120a1c', c2 = '#2a1745') => [[0, c2, 0], [0.18, c2, a], [0.6, c, a * 0.7], [1, '#05020a', 0]];

export default [
  /* ===================================================================== black hole */
  { id: 'shadow/black-hole', name: 'Black hole', category: 'shadow', loop: true, duration: 4, stage: { sky: 'void', bloom: 0.3, view: { pos: [3.4, 2.1, 4.4], target: [0, 1.15, 0], fov: 38 } },
    build(fx) {
      const C = [0, 1.2, 0], tilt = [0.42, 0, 0.18];
      const g = new THREE.Group(); g.position.set(...C); g.rotation.set(...tilt);
      const geo = new THREE.RingGeometry(0.5, 2.1, 160, 6); geo.rotateX(-Math.PI / 2);
      const dm = new THREE.ShaderMaterial({ ...ADD, side: THREE.DoubleSide, uniforms: { uTime: { value: 0 }, uA: { value: 1 } }, vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `${NOISE} uniform float uTime,uA; varying vec3 vP;
        void main(){ vec2 p=vP.xz; float r=length(p), a=atan(p.y,p.x); float sw=uTime*1.57*(1.6/(r*r+.25)); // 4s loop: integer turns not guaranteed => use noise on rotating coords only
          float aa=a-sw; vec3 q=vec3(cos(aa)*r*2.6,sin(aa)*r*2.6,r*3.); float n=fbm(q); float bands=.5+.5*sin(r*46.+n*7.);
          float heat=1.-smoothstep(.5,2.05,r); float dop=.55+.45*sin(a+1.2);
          vec3 col=mix(vec3(.45,.12,.95),vec3(1.,.5,.15),smoothstep(.15,.6,heat)); col=mix(col,vec3(1.,.93,.8),smoothstep(.72,1.,heat));
          float al=smoothstep(.5,.66,r)*(1.-smoothstep(1.55,2.1,r))*(.25+.9*bands)*(.35+n*1.1); gl_FragColor=vec4(col*al*dop*(.35+heat*1.1)*uA,al); }` });
      const disk = new THREE.Mesh(geo, dm); disk.renderOrder = 18; g.add(disk);
      fx.mesh(g, (t, pr, f, w, o, ta) => { dm.uniforms.uTime.value = (ta % 4); dm.uniforms.uA.value = w; }, { dur: 99 });
      const occ = new THREE.Mesh(new THREE.SphereGeometry(0.47, 32, 24), new THREE.MeshBasicMaterial({ color: '#000' })); occ.position.set(...C); fx.mesh(occ, null, { dur: 99 });
      fx.orb({ kind: 'void', r: 0.56, pos: C, noise: 2, scroll: 0.5, disp: 0.05, power: 3, intensity: 0.8, ramp: [[0, '#000'], [0.5, '#6b3fb5'], [1, '#e8dcff']] });
      fx.ring({ normal: 'cam', pos: C, r: [0.62, 0.62], width: [0.05, 0.05], intensity: 0.55, decay: 0, breakup: 0.3, ramp: [[0, '#fff'], [0.5, '#ffbe7a'], [1, '#8a40ff']] });
      for (const [rr, ct] of [[2.3, 70], [1.7, 50]]) fx.emitter({ count: ct, kind: 'spark', shape: 'ring', radius: rr, radiusIn: rr - 0.5, radial: 1, speed: [-0.85, -0.5], life: [2.2, 3.2], swirl: 2.4, size: [0.05, 0.015], stretch: 0.9, ramp: [[0, '#ffd9a0', 0], [0.2, '#ffb060', 1], [0.8, '#a050ff', 0.8], [1, '#201040', 0]], intensity: 2.5, pos: C, rot3: tilt });
      fx.emitter({ count: 24, kind: 'soft', shape: 'ring', radius: 2.2, radiusIn: 1.2, radial: 1, speed: [-0.7, -0.4], life: [2.5, 3.5], swirl: 2, size: [0.28, 0.04], ramp: [[0, '#6020c0', 0], [0.3, '#8a40ff', 0.5], [1, '#000', 0]], intensity: 0.7, pos: C, rot3: tilt });
      fx.light({ color: '#9a5aff', intensity: 40, pos: [0, 1.6, 0.6], range: 9, flicker: 0.1 });
      fx.light({ color: '#ff9a50', intensity: 25, pos: [1.2, 1.3, 0.2], range: 6 });
    } },

  /* ===================================================================== curse */
  { id: 'shadow/curse', name: 'Curse', category: 'shadow', loop: false, duration: 3.4, body: true, stage: { sky: 'dark', bloom: 0.5, view: { pos: [2.5, 1.7, 3.6], target: [0, 1.05, 0], fov: 40 } },
    build(fx) {
      const sk = skull('#a45cff', 3.5); sk.scale.setScalar(0.5); const h = halo('#8a40ff', 2.2, 1.2);
      fx.mesh(sk, (t, pr, f, w, o) => { const a = eob((t - 0.15) / 0.5); const hold = sm(1.5, 2.1, t); o.position.set(0.05, 2.9 - a * 1.1 + Math.sin(t * 6) * 0.01 * (1 - a), 0); const s = 0.5 * (1.6 - 0.6 * a) * (1 - hold * 0.5); o.scale.setScalar(Math.max(1e-3, s) * (t < 0.15 ? 0 : 1)); o.rotation.set(0, Math.PI / 2 + Math.sin(t * 3) * 0.05, 0); sk.userData.jaw.rotation.x = 0.35 * (1 - a) + Math.sin(t * 9) * 0.04 * a; sk.userData.bone.emissiveIntensity = 0.12 + 1.4 * sm(0.6, 0.75, t) * (1 - sm(0.75, 1.3, t)); o.visible = t < 2.2 && t > 0.15; }, { dur: 99 });
      fx.mesh(h, (t, pr, f, w, o) => { o.position.set(0.1, 1.8, 0); o.scale.setScalar(1.2 + 1.5 * sm(0.5, 0.7, t) * (1 - sm(0.7, 1.4, t))); o.material.opacity = 0.35 + 0.5 * sm(0.55, 0.7, t) * (1 - sm(0.7, 1.8, t)); }, { dur: 99 });
      fx.ring({ t0: 0.62, dur: 0.8, r: [0.2, 2.6], width: [0.3, 0.05], normal: 'up', intensity: 1.4, fill: 0.1, ramp: [[0, '#fff'], [0.4, '#c090ff'], [1, '#4a1a90']] });
      fx.ring({ t0: 0.62, dur: 0.45, r: [0.1, 1.3], width: [0.2, 0.03], normal: 'cam', pos: [0.1, 1.8, 0], intensity: 2, ramp: [[0, '#fff'], [1, '#9a5cff']] });
      fx.flash(0.62, 0.3, '#b890ff', 0.5); fx.shake(0.62, 0.5, 0.05);
      fx.decal({ kind: 'rune', t0: 0.5, dur: 2.7, fade: [0.5, 0.7], r: [1.5, 1.5], reveal: 0.8, glyphs: 14, poly: 5, spin: 0.2, intensity: 1.6, ramp: [[0, '#10001a'], [0.5, '#7a30d8'], [1, '#e0c0ff']] });
      fx.emitter({ count: 70, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.4, dir: [0, 1, 0], spread: 0.5, speed: [0.3, 0.9], life: [1.4, 2.4], size: [0.4, 1.2], ramp: SMOKE(0.6), lit: 1, turb: [0.3, 0.7], delay: 0.7, emit: 1.8, pos: [0, 0.2, 0], order: -1 });
      fx.emitter({ count: 80, kind: 'soft', shape: 'sphere', radius: 0.35, dir: [0, 1, 0], spread: 1.2, speed: [0.2, 0.9], life: [1, 2], size: [0.05, 0.01], ramp: [[0, '#e0c0ff', 1], [1, '#5a20b0', 0]], intensity: 2.5, delay: 0.8, emit: 1.8, pos: [0, 1.0, 0], turb: [0.2, 1], gravity: [0, 0.3, 0] });
      fx.emitter({ count: 60, kind: 'rock', blend: 'normal', shape: 'sphere', radius: 0.3, dir: [0, 0.3, 0], spread: 1.5, speed: [0.2, 1.2], life: [1, 1.4], gravity: [0, -7, 0], size: [0.07, 0.04], ramp: [[0, '#2a1a3a'], [1, '#2a1a3a', 1]], lit: 1, bounce: 0.2, rot: 5, delay: 2.35, emit: 0.6, pos: [0, 1.0, 0] });
      fx.emitter({ count: 70, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.35, dir: [0, 0.4, 0], spread: 1.4, speed: [0.4, 1.4], life: [1.0, 1.5], size: [0.3, 0.9], ramp: SMOKE(0.7, '#0a0412'), lit: 1, delay: 2.3, emit: 0.8, pos: [0, 0.9, 0], drag: 1 });
      fx.light({ color: '#8a40ff', intensity: 50, pos: [0.8, 1.7, 1], range: 7, env: (t) => 0.3 + 0.7 * sm(0.55, 0.7, t) * (1 - 0.4 * sm(0.7, 2, t)) });
      fx.on((t) => {
        const tint = sm(0.6, 1.3, t) * (1 - sm(2.7, 3.2, t) * 0.0); const pulse = 0.5 + 0.5 * Math.sin(t * 7);
        fx.body.set({ tint: '#4a1590', tintAmt: 0.85 * tint, rim: '#b070ff', rimAmt: 1.5 * tint, emit: new THREE.Color('#7a30d8').multiplyScalar(0.25 * pulse * sm(1.2, 1.8, t) * (1 - sm(2.2, 2.4, t))), glow: 0.6 * tint, dissolve: t > 2.2 ? sm(2.25, 3.25, t) : -1, dDir: 1, edge: '#b070ff', edgeW: 0.07, edgeInt: 5 });
      });
    } },

  /* ===================================================================== dark explosion */
  { id: 'shadow/dark-explosion', name: 'Dark explosion', category: 'shadow', loop: false, duration: 3.8, stage: { sky: 'dark', bloom: 0.5, view: { pos: [5, 2.4, 6], target: [0, 1.2, 0], fov: 38 } },
    build(fx) {
      const C = [0, 1.2, 0];
      fx.emitter({ count: 90, kind: 'soft', shape: 'sphere', radius: 1.8, radiusIn: 1.1, radial: 1, speed: [-2.2, -1.4], life: [0.6, 0.9], size: [0.07, 0.015], ramp: [[0, '#c090ff', 0], [0.3, '#a060ff', 1], [1, '#fff', 0.8]], intensity: 2.2, emit: 0.9, swirl: 4, pos: C });
      fx.orb({ t0: 0, dur: 1.0, r: [0.05, 0.3], kind: 'void', pos: C, power: 2.5, intensity: 3, noise: 3, scroll: 2, disp: 0.3, ramp: [[0, '#000'], [0.5, '#8a40ff'], [1, '#fff']] });
      fx.flash(1.0, 0.35, '#8a50ff', 0.55); fx.shake(1.0, 0.8, 0.12);
      fx.orb({ t0: 1.0, dur: 1.0, r: [0.3, 2.0], ease: 'out', kind: 'void', pos: C, power: 2.8, intensity: 3, noise: 2.4, scroll: 1.5, disp: 0.5, fade: [0, 0.4], ramp: [[0, '#000'], [0.5, '#7a30d8'], [1, '#e8d8ff']] });
      fx.orb({ t0: 2.4, dur: 0.9, r: [1.3, 0.05], kind: 'void', pos: C, power: 2.8, intensity: 3, noise: 3, scroll: 3, disp: 0.3, fade: [0.2, 0.15], ramp: [[0, '#000'], [0.5, '#7a30d8'], [1, '#e8d8ff']] });
      fx.ring({ t0: 1.0, dur: 1.0, r: [0.3, 7], width: [0.6, 0.15], normal: 'up', intensity: 1.2, fill: 0.2, ramp: [[0, '#fff'], [0.3, '#b890ff'], [1, '#3a1070']] });
      fx.ring({ t0: 1.0, dur: 0.8, r: [0.3, 4], width: [0.3, 0.05], normal: 'cam', pos: C, intensity: 2, ramp: [[0, '#fff'], [1, '#9a5cff']] });
      fx.emitter({ count: 70, kind: 'shard', blend: 'normal', shape: 'sphere', radius: 0.3, dir: [0, 1, 0], spread: 1.7, speed: [3, 9], life: [1.2, 2.2], gravity: [0, -9, 0], size: [0.2, 0.15], ramp: [[0, '#1a0a28'], [1, '#1a0a28', 1]], lit: 1, rot: 7, bounce: 0.3, delay: 1.0, pos: C });
      fx.emitter({ count: 110, kind: 'spark', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.6, speed: [4, 11], life: [0.5, 1.2], gravity: [0, -6, 0], size: [0.09, 0.025], stretch: 1.4, ramp: [[0, '#fff'], [0.3, '#b080ff'], [1, '#301060', 0]], intensity: 4, delay: 1.0, pos: C });
      fx.emitter({ count: 100, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.7, dir: [0, 1, 0], spread: 1.3, speed: [1.2, 4], life: [1.8, 3.2], size: [1.2, 3.8], ramp: SMOKE(0.85, '#0e0816', '#2a1844'), lit: 1, delay: 1.05, emit: 0.4, drag: 1.2, gravity: [0, 0.5, 0], turb: [0.4, 0.5], pos: [0, 0.9, 0], order: -1 });
      fx.emitter({ count: 60, kind: 'soft', shape: 'sphere', radius: 2.6, radial: 1, speed: [-3.2, -2], life: [0.5, 0.8], size: [0.08, 0.02], ramp: [[0, '#c090ff', 0], [0.4, '#a060ff', 1], [1, '#fff', 0]], intensity: 2.2, delay: 2.5, emit: 0.7, pos: C });
      fx.decal({ kind: 'scorch', t0: 1.0, dur: 2.8, r: [3, 3.4], fade: [0.1, 1.2], heat: [1, 0], ramp: [[0, '#100020'], [0.5, '#6a28c8'], [1, '#d8b8ff']] });
      fx.decal({ kind: 'cracks', t0: 1.0, dur: 2.8, r: [3.4, 3.8], fade: [0.1, 1.5], reveal: 0.4, cells: 4, heat: [1, 0.2], ramp: [[0, '#200040'], [0.5, '#8a40ff'], [1, '#e0c8ff']] });
      fx.light({ color: '#8a50ff', intensity: 320, pos: [0, 1.4, 0], range: 24, norm: 100, env: (t) => (t < 1 ? 0.15 + t * 0.5 : t < 1.05 ? 1 : t < 2.4 ? Math.exp(-(t - 1.05) * 1.4) : 0.25 * Math.exp(-(t - 2.4) * 2) + 0.3 * sm(2.4, 3.2, t) * (1 - sm(3.2, 3.6, t))) });
    } },

  /* ===================================================================== eclipse */
  { id: 'shadow/eclipse', name: 'Eclipse', category: 'shadow', loop: true, duration: 4, stage: { sky: 'dark', ground: false, bloom: 0.3, view: { pos: [0, 1.5, 6], target: [0, 3, 0], fov: 40 } },
    build(fx) {
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 }, uPh: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `${NOISE} uniform float uTime,uPh; varying vec2 vUv;
        void main(){ vec2 p=(vUv*2.-1.); float edge=smoothstep(1.,.8,length(p)); p*=1.0; float R=.2; float d=length(p); float ang=atan(p.y,p.x); float w=6.2831853*uPh;
          vec2 mo=vec2(sin(w)*.012,cos(w)*.008); float dm=length(p-mo); float moon=smoothstep(R*1.04+.002,R*1.04-.004,dm);
          vec3 sky=mix(vec3(.01,.012,.04),vec3(.06,.05,.14),smoothstep(1.,0.,d));
          float disk=smoothstep(R+.003,R-.004,d); vec3 sun=vec3(2.2,1.9,1.4)*disk;
          float cor=exp(-(d-R)*(d>R?9.:0.)); float st=fbm(vec3(cos(ang)*2.2+uTime*.1,sin(ang)*2.2,(d-R)*5.-uTime*.4));
          float streak=pow(st,1.6)*2.6*(.7+.3*sin(w+ang*3.)); vec3 corona=vec3(.85,.78,1.)*(cor*cor*cor*.8+streak*.55*exp(-(d-R)*7.))*step(R*.9,d);
          float rim=exp(-pow((d-R)*60.,2.))*.9;
          float ba=.9+sin(w)*.25; float bd=length(p-(R*1.0)*vec2(cos(ba),sin(ba))); float bead=exp(-bd*bd*5000.)*(1.5+2.5*pow(.5+.5*sin(w),2.)); vec3 beadc=vec3(2.6,2.4,2.3)*bead;
          vec3 col=sky+sun+corona+vec3(1.,.8,.7)*rim*.8+beadc; col=mix(col,vec3(0.,0.,.004)+vec3(.1,.06,.18)*exp(-pow((dm-R*1.04)*50.,2.))*.7,moon);
          float a=edge; gl_FragColor=vec4(col*a,a); }` });
      m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor;
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), m); pl.position.set(0, 3, -4); pl.renderOrder = 5;
      fx.mesh(pl, (t, pr, f, w, o, ta) => { m.uniforms.uTime.value = ta; m.uniforms.uPh.value = (ta % 4) / 4; }, { dur: 99 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0.0, 3.0, -3.9], size: [0.9, 0.9], life: [4, 4], emit: 0.001, ramp: [[0, '#fff', 0.3], [0.5, '#fff', 0.9], [1, '#fff', 0.3]], intensity: 3, follow: (m, ta, t) => { const ba = 0.9 + Math.sin(t / 4 * Math.PI * 2) * 0.25; m.position.set(Math.cos(ba) * 1.6, 3 + Math.sin(ba) * 1.6, -3.9); } });
      fx.emitter({ count: 40, kind: 'soft', shape: 'ring', radius: 3.4, radiusIn: 2.2, dir: [0, 0, 1], spread: 0.1, speed: [0.05, 0.2], life: [3, 4], size: [0.04, 0.01], ramp: [[0, '#fff', 0], [0.3, '#d8c8ff', 0.6], [1, '#fff', 0]], intensity: 1.5, rot3: [Math.PI / 2, 0, 0], pos: [0, 3, -3.9] });
    } },

  /* ===================================================================== grasping hands */
  { id: 'shadow/grasping-hands', name: 'Grasping hands', category: 'shadow', loop: false, duration: 3.1, stage: { sky: 'dark', bloom: 0.45, view: { pos: [3.2, 2.5, 4.6], target: [0, 0.85, 0], fov: 40 } },
    build(fx) {
      fx.water({ r: 1.9, deep: '#030106', shallow: '#150a24', sky: '#3a1a66', horizon: '#6a3aa0', fade: [0.3, 0.5], t0: 0.05, dur: 3.0, y: 0.015, waves: 0.4, ripples: [{ t: 0.3, amp: 0.05 }, { t: 0.45, x: 0.5, z: 0.3, amp: 0.04 }, { t: 0.6, x: -0.5, z: -0.3, amp: 0.04 }, { t: 2.3, amp: 0.04 }] });
      fx.decal({ kind: 'glow', r: [2, 2], t0: 0.1, dur: 2.9, fade: [0.4, 0.5], intensity: 0.8, ramp: [[0, '#000'], [0.5, '#3a1470'], [1, '#9a5cff']], y: 0.02 });
      const mat = rimMat('#06020b', '#a560ff', 2.2, 2.0), N = 5, S = 22, FS = 6; const arms = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * 6.283 + 0.35, rr = 0.35 + fx.rng() * 0.5; const arm = { a, bx: Math.cos(a) * rr, bz: Math.sin(a) * rr, H: 1.0 + fx.rng() * 0.6, lean: 0.35 + fx.rng() * 0.35, d: i * 0.07, ph: fx.rng() * 6, m: tube(S, 8, mat), pts: mkPts(S), fing: [] };
        for (let k = 0; k < 5; k++) arm.fing.push({ m: tube(FS, 5, mat), pts: mkPts(FS) }); arms.push(arm);
      }
      const g = new THREE.Group(); arms.forEach((A) => { g.add(A.m); A.fing.forEach((f) => g.add(f.m)); });
      const T = new THREE.Vector3(), Nn = new THREE.Vector3(), Sd = new THREE.Vector3(), P = new THREE.Vector3(), d = new THREE.Vector3();
      fx.mesh(g, (t, pr, f, w, o, ta) => {
        mat.uniforms.uA.value = w; mat.uniforms.uTime.value = ta;
        for (const A of arms) {
          const rise = eob((t - 0.3 - A.d) / 0.7), clench = sm(1.1, 1.8, t), back = sm(1.95 + A.d, 2.75, t), ext = rise * (1 - back);
          const ox = Math.cos(A.a), oz = Math.sin(A.a), h = A.H * ext;
          for (let k = 0; k <= S; k++) { const u = k / S, wob = Math.sin(u * 6 - t * 5 + A.ph) * 0.07 * u * ext * (1 - 0.6 * clench); A.pts[k][0] = A.bx + ox * A.lean * u * u * ext + -oz * wob; A.pts[k][1] = -0.05 + h * u + 0.05; A.pts[k][2] = A.bz + oz * A.lean * u * u * ext + ox * wob; }
          A.m.userData.set(A.pts, (u) => (0.14 * (1 - u) + 0.07 * u) * (0.2 + 0.8 * Math.min(1, ext * 3)));
          const e = A.pts[S], e0 = A.pts[S - 1]; T.set(e[0] - e0[0], e[1] - e0[1], e[2] - e0[2]).normalize(); P.set(-ox, 0, -oz); Nn.copy(P).addScaledVector(T, -P.dot(T)).normalize(); Sd.crossVectors(T, Nn).normalize();
          for (let k = 0; k < 5; k++) {
            const F = A.fing[k], th = k === 4, off = th ? 0.075 : (k - 1.5) * 0.048, len = th ? 0.14 : (k === 1 || k === 2 ? 0.22 : 0.18), step = len / FS; let th0 = th ? -0.5 : 0.1; const cur = (th ? 0.7 : 1) * (0.35 + clench * 1.9) * (0.6 + 0.4 * ext);
            let px = e[0] + Sd.x * off, py = e[1] + Sd.y * off, pz = e[2] + Sd.z * off; if (th) { px += Nn.x * 0.02; py += Nn.y * 0.02; pz += Nn.z * 0.02; }
            for (let m = 0; m <= FS; m++) { F.pts[m][0] = px; F.pts[m][1] = py; F.pts[m][2] = pz; const ang = th0 + cur * (m / FS) * 1.15; d.copy(T).multiplyScalar(Math.cos(ang)).addScaledVector(Nn, Math.sin(ang)); px += d.x * step; py += d.y * step; pz += d.z * step; if (th) { px += Sd.x * step * 0.4 * (1 - clench); pz += Sd.z * step * 0.4 * (1 - clench); } }
            F.m.userData.set(F.pts, (u) => (0.026 * (1 - u) + 0.006) * Math.min(1, ext * 4)); F.m.visible = ext > 0.02;
          }
          A.m.visible = ext > 0.01;
        }
      }, { t0: 0, dur: 3.1 });
      fx.emitter({ count: 70, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 1.2, dir: [0, 1, 0], spread: 0.3, speed: [0.2, 0.6], life: [1.2, 2.2], size: [0.5, 1.3], ramp: SMOKE(0.5), lit: 1, turb: [0.3, 0.6], emit: 2.2, delay: 0.2, pos: [0, 0.1, 0], order: -1 });
      fx.emitter({ count: 50, kind: 'soft', shape: 'disc', radius: 1.3, dir: [0, 1, 0], spread: 0.3, speed: [0.3, 1], life: [1, 2], size: [0.05, 0.01], ramp: [[0, '#d0a8ff', 0.9], [1, '#4a1890', 0]], intensity: 2.2, emit: 2.2, delay: 0.2, pos: [0, 0.05, 0], turb: [0.2, 1] });
      fx.light({ color: '#8a40ff', intensity: 35, pos: [0, 1.3, 0.4], range: 8, fade: [0.3, 0.5] });
    } },

  /* ===================================================================== hex sigil */
  { id: 'shadow/hex-sigil', name: 'Hex sigil', category: 'shadow', loop: false, duration: 4.2, stage: { sky: 'dark', bloom: 0.55, view: { pos: [2.2, 2.9, 3.4], target: [0, 0.2, 0], fov: 40 } },
    build(fx) {
      const R = 1.5, rev = 2.7;
      fx.decal({ kind: 'scorch', t0: 0, dur: 4.2, r: [R * 1.05, R * 1.05], fade: [0.5, 0.8], heat: [0.4, 0], ramp: [[0, '#100008'], [0.5, '#8a1030'], [1, '#ff6a40']], alpha: 0.5 });
      fx.decal({ kind: 'rune', t0: 0.2, dur: 3.9, r: [R, R], reveal: rev, glyphs: 12, poly: 6, spin: 0.15, intensity: 1.7, fade: [0.05, 0.7], growSpeed: 100, ramp: [[0, '#1a0010'], [0.45, '#b01868'], [0.8, '#ff5aa0'], [1, '#ffe0f0']] });
      const pen = halo('#ff8a40', 0.22, 2); const core = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe0b0').multiplyScalar(4), toneMapped: false }));
      const pg = new THREE.Group(); pg.add(pen, core);
      fx.mesh(pg, (t, pr, f, w, o) => { const u = cl((t - 0.2) / rev), seg = Math.min(u, 0.999), a = -Math.PI + seg * Math.PI * 2, rr = R * (0.96 - 0.08 * Math.sin(seg * 80) * 0), rad = rr * (0.94 + 0.02 * Math.sin(seg * 120)); o.position.set(Math.cos(a) * rad, 0.06 + 0.04 * Math.abs(Math.sin(seg * 60)), -Math.sin(a) * rad); o.visible = t > 0.2 && t < 0.2 + rev + 0.15; }, { dur: 99 });
      fx.emitter({ count: 120, kind: 'spark', shape: 'point', dir: [0, 1, 0], spread: 1.3, speed: [0.5, 2], life: [0.3, 0.7], gravity: [0, -3, 0], size: [0.04, 0.012], stretch: 1.2, ramp: [[0, '#fff0c0'], [0.4, '#ff7a30'], [1, '#601020', 0]], intensity: 3.5, emit: rev, delay: 0.2, follow: (m, ta, t) => { const u = cl((t - 0.2) / rev), a = -Math.PI + Math.min(u, 0.999) * Math.PI * 2; m.position.set(Math.cos(a) * R * 0.94, 0.06, -Math.sin(a) * R * 0.94); } });
      fx.light({ color: '#ff5a90', intensity: 30, pos: [0, 0.8, 0], range: 7, fade: [0.5, 0.8], env: (t) => 0.3 + 0.7 * sm(0.2, 2.9, t) });
      fx.light({ color: '#ff9a50', intensity: 14, pos: [0, 0.4, 0], range: 4, dur: 3.0, fade: [0.1, 0.1], follow: true, env: () => 1 });
      fx.emitter({ count: 110, kind: 'spark', shape: 'ring', radius: R, radiusIn: 0.2, dir: [0, 1, 0], spread: 0.5, speed: [0.3, 1.4], life: [0.9, 1.8], gravity: [0, 0.5, 0], drag: 0.2, size: [0.05, 0.012], stretch: 0.3, ramp: [[0, '#ffd0e0'], [0.3, '#ff4a8a'], [1, '#30000a', 0]], intensity: 3, turb: [0.3, 1.2], delay: 3.1, emit: 1.0 });
      fx.emitter({ count: 40, kind: 'smoke', blend: 'normal', shape: 'ring', radius: R, radiusIn: 0.3, dir: [0, 1, 0], spread: 0.3, speed: [0.2, 0.5], life: [1, 1.8], size: [0.3, 0.9], ramp: SMOKE(0.4, '#140812', '#2a1030'), lit: 1, delay: 3.1, emit: 0.9, order: -1 });
    } },

  /* ===================================================================== life steal */
  { id: 'shadow/life-steal', name: 'Life steal', category: 'shadow', loop: false, duration: 2.2, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [1.2, 1.7, 5.8], target: [1.2, 1.1, 0], fov: 38 } },
    act: { kind: 'cast', target: [2.6, 0, 0], windup: 0.35 },
    build(fx) {
      const src = [2.5, 1.25, 0], dst = [0.12, 1.25, 0.05];
      fx.emitter({ count: 50, kind: 'drop', blend: 'add', shape: 'sphere', radius: 0.12, dir: [-1, 0.3, 0], spread: 1.1, speed: [0.6, 2], life: [0.4, 0.9], gravity: [0, -5, 0], size: [0.05, 0.03], ramp: [[0, '#ff6a70'], [1, '#800010', 0]], intensity: 1.8, emit: 0.9, delay: 0.25, pos: src });
      fx.ring({ t0: 0.25, dur: 0.5, r: [0.1, 0.5], width: [0.15, 0.03], normal: 'cam', pos: src, intensity: 1.6, ramp: [[0, '#fff'], [0.4, '#ff5a60'], [1, '#900010']] });
      const NO = 9;
      for (let i = 0; i < NO; i++) {
        const t0 = 0.3 + i * 0.1, a = fx.rng.range(-0.9, 0.9), b = fx.rng.range(0.2, 0.7), c = fx.rng.range(-0.5, 0.5);
        const path = (t) => { const u = cl((t - t0) / 0.7); const e = u * u * (3 - 2 * u); return [src[0] + (dst[0] - src[0]) * e + Math.sin(e * Math.PI) * 0.1 * c, src[1] + (dst[1] - src[1]) * e + Math.sin(e * Math.PI) * b, src[2] + Math.sin(e * Math.PI) * a]; };
        fx.trail({ path, len: 0.33, width: 0.07, n: 24, t0, dur: 0.78, fade: [0.03, 0.06], intensity: 3, ramp: [[0, '#ffe0e0'], [0.2, '#ff4050'], [1, '#500008']] });
        const orb = halo('#ff3a4a', 0.34, 3);
        fx.mesh(orb, (t, pr, f, w, o) => { const p = path(Math.min(t, t0 + 0.7)); o.position.set(p[0], p[1], p[2]); o.visible = t > t0 && t < t0 + 0.72; }, { dur: 99 });
        fx.emitter({ count: 14, kind: 'soft', shape: 'sphere', radius: 0.1, speed: [0.5, 1.6], life: [0.3, 0.5], size: [0.1, 0.01], ramp: [[0, '#fff', 1], [0.3, '#ff6a70', 0.8], [1, '#600', 0]], intensity: 2, delay: t0 + 0.68, pos: dst });
      }
      fx.ring({ t0: 0.9, dur: 1.0, r: [0.2, 0.5], width: [0.15, 0.03], normal: 'cam', pos: [0.1, 1.2, 0], intensity: 0.8, breakup: 0.1, ramp: [[0, '#fff'], [0.3, '#ff6a70'], [1, '#800018']] });
      fx.light({ color: '#ff3040', intensity: 50, pos: [0.5, 1.4, 1], range: 6, t0: 0.3, dur: 1.8, fade: [0.2, 0.7] });
      fx.on((t) => { const k = sm(0.7, 1.3, t) * (1 - sm(1.4, 2.1, t)); fx.body.set({ tint: '#ff2030', tintAmt: 0.4 * k, rim: '#ff5060', rimAmt: 1.2 * k, glow: 0.5 * k }); if (fx.target) fx.target.u && 0; });
    } },

  /* ===================================================================== necro skulls */
  { id: 'shadow/necro-skulls', name: 'Necro skulls', category: 'shadow', loop: true, duration: 3, stage: { sky: 'dark', bloom: 0.55, view: { pos: [3, 2.1, 4.2], target: [0, 1.1, 0], fov: 38 } },
    build(fx) {
      const G = '#4dff7a', Cn = [0, 1.15, 0], tilt = new THREE.Euler(0.45, 0, 0.25), Rr = 1.15, NS = 4;
      const orbitPos = (i, t, out) => { const a = ((t / 3) + i / NS) * Math.PI * 2; out.set(Math.cos(a) * Rr, Math.sin(a * 2) * 0.05, Math.sin(a) * Rr).applyEuler(tilt); out.x += Cn[0]; out.y += Cn[1]; out.z += Cn[2]; return out; };
      fx.emitter({ count: 36, kind: 'flame', shape: 'disc', radius: 0.14, dir: [0, 1, 0], spread: 0.15, speed: [0.3, 0.8], life: [0.6, 1.1], size: [0.4, 0.1], aspect: 1.9, ramp: [[0, '#7aff9a', 1], [0.25, '#2aff5a', 0.9], [0.7, '#10a050', 0.5], [1, '#012', 0]], intensity: 0.22, turb: [0.2, 1.5], pos: [0, 0.85, 0] });
      fx.emitter({ count: 50, kind: 'spark', shape: 'disc', radius: 0.2, dir: [0, 1, 0], spread: 0.7, speed: [0.5, 1.8], life: [1, 2], gravity: [0, 0.3, 0], size: [0.05, 0.015], stretch: 0.5, ramp: [[0, '#eaffd0'], [0.4, '#4dff7a'], [1, '#042', 0]], intensity: 3, turb: [0.3, 1], pos: [0, 1.0, 0] });
      fx.emitter({ count: 30, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.2, dir: [0, 1, 0], spread: 0.3, speed: [0.3, 0.7], life: [1.5, 2.6], size: [0.35, 1.1], ramp: [[0, '#0a2a18', 0], [0.2, '#1a4a2c', 0.35], [1, '#04100a', 0]], lit: 1, turb: [0.2, 0.6], pos: [0, 1.4, 0], order: -1 });
      fx.decal({ kind: 'glow', r: [1.6, 1.6], intensity: 1, alpha: 0.7, ramp: [[0, '#000'], [0.5, '#0a5a2a'], [1, '#4dff7a']] });
      const tmp = new THREE.Vector3(), nx = new THREE.Vector3();
      for (let i = 0; i < NS; i++) {
        const sk = skull(G, 4); sk.scale.setScalar(0.34); const eg = halo(G, 0.5, 0.6); sk.add(eg); eg.scale.setScalar(1.9); eg.position.z = -0.2;
        fx.mesh(sk, (t, pr, f, w, o, ta) => { orbitPos(i, t, tmp); o.position.copy(tmp); orbitPos(i, t + 0.05, nx); nx.sub(tmp); o.rotation.set(0, Math.atan2(nx.x, nx.z), 0); sk.userData.jaw.rotation.x = 0.15 + 0.2 * Math.sin(ta * 5 + i * 2); }, { dur: 99 });
        fx.trail({ path: (t) => { orbitPos(i, t, tmp); return [tmp.x, tmp.y - 0.02, tmp.z]; }, len: 0.55, width: 0.12, n: 28, intensity: 1.4, ramp: [[0, '#d0ffd8'], [0.3, '#4dff7a'], [1, '#021408']] });
      }
      fx.emitter({ count: 40, kind: 'smoke', blend: 'normal', shape: 'ring', radius: Rr, radiusIn: Rr - 0.2, dir: [0, 0.4, 0], spread: 0.4, speed: [0.05, 0.3], life: [1.2, 2.2], size: [0.25, 0.7], ramp: [[0, '#1a4a2c', 0], [0.3, '#2a6a40', 0.25], [1, '#04100a', 0]], lit: 1, rot3: [0.45, 0, 0.25], pos: Cn, order: -1 });
      fx.light({ color: '#4dff7a', intensity: 40, pos: [0, 1.2, 0], range: 7, flicker: 0.3 });
    } },

  /* ===================================================================== shadow flames */
  { id: 'shadow/shadow-flames', name: 'Shadow flames', category: 'shadow', loop: true, duration: 2.4, stage: { sky: 'dark', bloom: 0.5, view: { pos: [3.2, 1.7, 4.2], target: [0, 0.7, 0], fov: 40 } },
    build(fx) {
      fx.decal({ kind: 'glow', r: [1.4, 1.4], intensity: 1.1, alpha: 0.8, ramp: [[0, '#000'], [0.4, '#3a1478'], [1, '#a060ff']], y: 0.006 });
      fx.emitter({ count: 70, kind: 'flame', shape: 'disc', radius: 0.32, dir: [0, 1, 0], spread: 0.12, speed: [0.3, 0.8], life: [0.8, 1.4], size: [1.2, 0.3], aspect: 1.8, ramp: [[0, '#e8d0ff', 0.9], [0.25, '#a050ff', 0.9], [0.7, '#4a1aa0', 0.5], [1, '#100030', 0]], intensity: 0.38, turb: [0.25, 1.4], pos: [0, 0.05, 0] });
      fx.emitter({ count: 60, kind: 'flame', blend: 'normal', shape: 'disc', radius: 0.17, dir: [0, 1, 0], spread: 0.1, speed: [0.25, 0.7], life: [0.8, 1.3], size: [0.65, 0.18], aspect: 2.0, ramp: [[0, '#000', 1], [0.7, '#07010e', 0.95], [1, '#0a0212', 0]], turb: [0.2, 1.4], pos: [0, 0.1, 0], order: 12 });
      fx.emitter({ count: 28, kind: 'flame', shape: 'ring', radius: 0.36, radiusIn: 0.28, dir: [0, 1, 0], spread: 0.1, speed: [0.3, 0.7], life: [0.7, 1.1], size: [0.45, 0.1], aspect: 2.2, ramp: [[0, '#fff', 1], [0.3, '#c080ff', 0.9], [1, '#200050', 0]], intensity: 0.35, turb: [0.15, 1.6], pos: [0, 0.05, 0], order: 14 });
      fx.emitter({ count: 50, kind: 'spark', shape: 'disc', radius: 0.25, dir: [0, 1, 0], spread: 0.6, speed: [0.8, 2.2], life: [1.2, 2.4], gravity: [0, 0.4, 0], drag: 0.25, size: [0.05, 0.015], stretch: 0.5, ramp: [[0, '#f0e0ff'], [0.4, '#a060ff'], [1, '#200050', 0]], intensity: 3, turb: [0.4, 1], pos: [0, 0.3, 0] });
      fx.emitter({ count: 34, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.25, dir: [0, 1, 0], spread: 0.2, speed: [0.5, 1], life: [1.8, 2.4], size: [0.4, 1.5], ramp: SMOKE(0.6, '#0a0412', '#2a1448'), lit: 1, turb: [0.3, 0.6], gravity: [0, 0.1, 0], pos: [0, 0.9, 0], order: -1 });
      fx.light({ color: '#8a40ff', intensity: 24, pos: [0, 0.8, 0], range: 8, flicker: 0.35 });
    } },

  /* ===================================================================== shadow tendrils */
  { id: 'shadow/shadow-tendrils', name: 'Shadow tendrils', category: 'shadow', loop: false, duration: 3.2, stage: { sky: 'dark', bloom: 0.45, view: { pos: [3.2, 2.5, 4.6], target: [0, 0.8, 0], fov: 40 } },
    build(fx) {
      fx.water({ r: 1.8, deep: '#030106', shallow: '#150a24', sky: '#3a1a66', horizon: '#6a3aa0', t0: 0.05, dur: 3.1, fade: [0.3, 0.5], y: 0.015, waves: 0.4, ripples: [{ t: 0.3, amp: 0.05 }, { t: 0.5, x: 0.4, z: -0.3, amp: 0.04 }, { t: 2.5, amp: 0.04 }] });
      fx.decal({ kind: 'glow', r: [1.9, 1.9], t0: 0.1, dur: 3.0, fade: [0.4, 0.5], intensity: 0.8, ramp: [[0, '#000'], [0.5, '#3a1470'], [1, '#9a5cff']], y: 0.02 });
      const mat = rimMat('#05020a', '#8f55ff', 2.2, 2.0), N = 7, S = 36; const ten = [];
      for (let i = 0; i < N; i++) { const a = (i / N) * 6.283 + fx.rng() * 0.5, rr = 0.2 + fx.rng() * 0.6; ten.push({ a, bx: Math.cos(a) * rr, bz: Math.sin(a) * rr, H: 1.4 + fx.rng() * 1.1, d: fx.rng() * 0.25, ph: fx.rng() * 6.28, ph2: fx.rng() * 6.28, lean: 0.4 + fx.rng() * 0.6, m: tube(S, 8, mat), pts: mkPts(S) }); }
      const g = new THREE.Group(); ten.forEach((A) => g.add(A.m));
      fx.mesh(g, (t, pr, f, w, o, ta) => {
        mat.uniforms.uA.value = w; mat.uniforms.uTime.value = ta;
        for (const A of ten) {
          const rise = eob((t - 0.25 - A.d) / 0.55), back = sm(2.35 + A.d * 0.5, 3.0, t), ext = rise * (1 - back), lash = Math.exp(-Math.pow((t - 0.55 - A.d) * 3.2, 2));
          const ox = Math.cos(A.a), oz = Math.sin(A.a), h = A.H * ext;
          for (let k = 0; k <= S; k++) { const u = k / S, amp = (0.1 + 0.28 * lash) * u * (0.4 + u) * ext, ph = u * 5.5 - t * (4 + 5 * lash) + A.ph, ph2 = u * 4.3 - t * 3.3 + A.ph2;
            A.pts[k][0] = A.bx + ox * A.lean * u * u * ext + Math.sin(ph) * amp * -oz + Math.sin(ph2) * amp * 0.6 * ox; A.pts[k][1] = h * u * (1 - 0.12 * u * Math.sin(ph) * 0) + 0.02 - 0.1; A.pts[k][2] = A.bz + oz * A.lean * u * u * ext + Math.sin(ph) * amp * ox + Math.sin(ph2) * amp * 0.6 * oz; }
          A.m.userData.set(A.pts, (u) => (0.15 * Math.pow(1 - u, 0.9) + 0.008) * Math.min(1, 0.3 + ext * 2.5)); A.m.visible = ext > 0.01;
        }
      }, { dur: 3.2 });
      fx.emitter({ count: 60, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 1.2, dir: [0, 1, 0], spread: 0.3, speed: [0.2, 0.6], life: [1.2, 2], size: [0.5, 1.3], ramp: SMOKE(0.5), lit: 1, turb: [0.3, 0.6], emit: 2.4, delay: 0.2, pos: [0, 0.1, 0], order: -1 });
      fx.emitter({ count: 50, kind: 'soft', shape: 'disc', radius: 1.2, dir: [0, 1, 0], spread: 0.4, speed: [0.3, 1.2], life: [1, 2], size: [0.05, 0.01], ramp: [[0, '#d0a8ff', 0.9], [1, '#4a1890', 0]], intensity: 2.2, emit: 2.2, delay: 0.2, pos: [0, 0.05, 0], turb: [0.2, 1] });
      fx.light({ color: '#8a40ff', intensity: 34, pos: [0, 1.4, 0.5], range: 8, fade: [0.3, 0.5] });
    } },

  /* ===================================================================== soul drain */
  { id: 'shadow/soul-drain', name: 'Soul drain', category: 'shadow', loop: true, duration: 3.2, stage: { sky: 'dark', bloom: 0.55, view: { pos: [4.2, 2.3, 5.6], target: [0, 1.9, 0], fov: 42 } },
    build(fx) {
      const NS = 6, P = 3.2, y0 = 3.6, y1 = 0.95;
      const soulPos = (i, t) => { const s = (((t / P) + i / NS) % 1 + 1) % 1, e = Math.pow(s, 1.7), rr = 1.5 * Math.pow(1 - e, 1.3) + 0.04, a = i * 1.7 + e * 8.5; return [Math.cos(a) * rr, y0 + (y1 - y0) * e, Math.sin(a) * rr]; };
      const cr = new THREE.Group(), cm = new THREE.MeshPhysicalMaterial({ color: '#08040f', roughness: 0.12, metalness: 0.4, clearcoat: 1, emissive: '#6a20d0', emissiveIntensity: 0.1 });
      const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), cm); body.scale.set(0.8, 1.45, 0.8); cr.add(body); const hl = halo('#9a5cff', 1.6, 1.0); cr.add(hl);
      fx.mesh(cr, (t, pr, f, w, o, ta) => { let fl = 0; for (let i = 0; i < NS; i++) { const since = ((((t / P) + i / NS) % 1) + 1) % 1 * P; fl = Math.max(fl, Math.exp(-since * 5)); } o.position.set(0, 0.95 + Math.sin(ta * 1.96) * 0.04, 0); body.rotation.y = ta * 0.8; cm.emissiveIntensity = 0.15 + fl * 3; body.scale.set(0.8 + fl * 0.15, 1.45 + fl * 0.1, 0.8 + fl * 0.15); hl.material.opacity = 0.25 + fl * 0.9; hl.scale.setScalar(1.3 + fl * 1.0); }, { dur: 99 });
      for (let i = 0; i < NS; i++) {
        const sp = halo('#d8f4ff', 0.2, 1.2), body2 = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8fbff').multiplyScalar(1.6), toneMapped: false })); const g = new THREE.Group(); g.add(sp, body2);
        fx.mesh(g, (t, pr, f, w, o) => { const p = soulPos(i, t), s = (((t / P) + i / NS) % 1 + 1) % 1; o.position.set(p[0], p[1], p[2]); const k = sm(0, 0.06, s) * (1 - sm(0.93, 1, s)); o.scale.setScalar(0.5 + 0.9 * k); sp.material.opacity = k; body2.visible = k > 0.1; }, { dur: 99 });
        fx.trail({ path: (t) => soulPos(i, t), len: 0.7, width: 0.08, n: 36, intensity: 0.8, ramp: [[0, '#f4fcff'], [0.3, '#8fd0ff'], [1, '#101840']] });
      }
      fx.emitter({ count: 44, kind: 'soft', shape: 'ring', radius: 1.5, radiusIn: 0.4, dir: [0, -1, 0], spread: 0.1, speed: [0.5, 1.4], life: [1.4, 2.2], swirl: 2.2, size: [0.12, 0.01], ramp: [[0, '#a0d8ff', 0], [0.3, '#a0d8ff', 0.6], [1, '#305090', 0]], intensity: 0.9, pos: [0, 3.3, 0], turb: [0.2, 1] });
      fx.emitter({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.5, speed: [0.5, 1.6], life: [0.5, 1], size: [0.05, 0.01], stretch: 0.6, ramp: [[0, '#fff'], [0.4, '#b080ff'], [1, '#301060', 0]], intensity: 2.5, pos: [0, 0.95, 0], emit: 3.0 });
      fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', shape: 'disc', radius: 0.4, dir: [0, 1, 0], spread: 0.3, speed: [0.1, 0.4], life: [1.5, 2.5], size: [0.5, 1.4], ramp: SMOKE(0.4), lit: 1, pos: [0, 0.1, 0], order: -1 });
      fx.decal({ kind: 'glow', r: [1.4, 1.4], intensity: 0.8, alpha: 0.7, ramp: [[0, '#000'], [0.5, '#2a1068'], [1, '#8a50ff']] });
      fx.light({ color: '#9a6aff', intensity: 40, pos: [0, 1.3, 0.3], range: 7, flicker: 0.15 });
      fx.light({ color: '#a0d8ff', intensity: 15, pos: [0, 2.8, 0], range: 6 });
    } },

  /* ===================================================================== void orb */
  { id: 'shadow/void-orb', name: 'Void orb', category: 'shadow', loop: true, duration: 3.2, stage: { sky: 'void', bloom: 0.3, view: { pos: [2.6, 1.6, 3.4], target: [0, 1.1, 0], fov: 38 } },
    build(fx) {
      const C = [0, 1.1, 0];
      const occ = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), new THREE.MeshBasicMaterial({ color: '#000' })); occ.position.set(...C); fx.mesh(occ, (t, pr, f, w, o, ta) => o.scale.setScalar(1 + 0.04 * Math.sin(ta * 1.96 * 2)), { dur: 99 });
      fx.orb({ kind: 'void', r: 0.55, pos: C, pulse: [0.04, 3.9], noise: 2.4, scroll: 0.8, disp: 0.08, power: 2.6, intensity: 2.4, ramp: [[0, '#000'], [0.35, '#6a58d0'], [0.7, '#c8d8ff'], [1, '#fff']] });
      fx.ring({ normal: 'cam', pos: C, r: [0.57, 0.57], width: [0.03, 0.03], decay: 0, intensity: 0.9, breakup: 0.25, ramp: [[0, '#fff'], [0.5, '#bcd0ff'], [1, '#6a50d0']] });
      for (let k = 0; k < 2; k++) fx.ring({ t0: k * 1.6, dur: 1.6, r: [0.6, 2.0], width: [0.2, 0.04], decay: 1, normal: 'cam', pos: C, intensity: 0.25, breakup: 0.5, ramp: [[0, '#cfd8ff'], [1, '#403090']] });
      fx.emitter({ count: 90, kind: 'spark', shape: 'sphere', radius: 2.0, radiusIn: 1.2, radial: 1, speed: [-1.8, -1.0], life: [0.7, 1.1], size: [0.08, 0.01], stretch: 1.3, ramp: [[0, '#8090ff', 0], [0.25, '#c8d0ff', 1], [1, '#fff', 0.2]], intensity: 3, pos: C, swirl: 1.2, drag: -0.0 });
      fx.emitter({ count: 50, kind: 'soft', shape: 'sphere', radius: 1.6, radiusIn: 0.9, radial: 1, speed: [-1.2, -0.7], life: [1.1, 1.6], size: [0.06, 0.01], ramp: [[0, '#a0a8ff', 0], [0.3, '#d8dcff', 1], [1, '#fff', 0]], intensity: 2, pos: C, swirl: 1.5 });
      fx.emitter({ count: 26, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 1.2, radiusIn: 0.8, radial: 1, speed: [-0.6, -0.3], life: [1.4, 2.2], size: [0.5, 0.15], ramp: [[0, '#1a1038', 0], [0.3, '#1a1038', 0.4], [1, '#000', 0]], pos: C, swirl: 1.5, order: -1 });
      fx.light({ color: '#9aa8ff', intensity: 26, pos: [0, 1.4, 0.8], range: 8, flicker: 0.1 });
    } },
];
