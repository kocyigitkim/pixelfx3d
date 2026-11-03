import * as THREE from 'three';
import { NOISE } from '../core/glsl.js';

/* ---------------------------------------------------------------- shared scene helpers */
const TAU = Math.PI * 2;
const land = (fx, color = '#2b3a2a', r = 160, rough = 1, y = 0) => {
  const g = new THREE.CircleGeometry(r, 64); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0 })); m.position.y = y; fx.mesh(m, null, { dur: 99 }); return m;
};
/** a tree: trunk + instanced foliage blobs. */
const tree = (fx, x, z, { h = 3.4, s = 1, leaf = '#3f6b34', trunk = '#4a3425', blobs = 46, spread = 1.7, leafCol2 = null, bare = false } = {}) => {
  const g = new THREE.Group();
  const tm = new THREE.MeshStandardMaterial({ color: trunk, roughness: 0.95 });
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.28 * s, h, 9), tm); tr.position.y = h / 2; g.add(tr);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * TAU + fx.rng() * 0.6; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * s, 0.1 * s, 1.5 * s, 6), tm); b.position.set(Math.cos(a) * 0.5 * s, h * 0.85, Math.sin(a) * 0.5 * s); b.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9); g.add(b); }
  if (!bare) {
    const im = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.85 }), blobs); const d = new THREE.Object3D(), c = new THREE.Color(), c2 = new THREE.Color(leaf), c3 = new THREE.Color(leafCol2 || leaf);
    for (let i = 0; i < blobs; i++) {
      const a = fx.rng() * TAU, rr = Math.sqrt(fx.rng()) * spread * s, yy = h + (fx.rng() - 0.35) * spread * 0.9 * s;
      d.position.set(Math.cos(a) * rr, yy - rr * 0.25, Math.sin(a) * rr); const sc = (0.45 + fx.rng() * 0.5) * s; d.scale.set(sc, sc * 0.82, sc); d.updateMatrix(); im.setMatrixAt(i, d.matrix);
      c.copy(c2).lerp(c3, fx.rng()); c.multiplyScalar(0.7 + fx.rng() * 0.5); im.setColorAt(i, c);
    }
    g.add(im);
  }
  g.position.set(x, 0, z); fx.mesh(g, null, { dur: 99 }); return g;
};
const trunk = (fx, x, z, h = 9, r = 0.3, color = '#2d2219') => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, h, 9), new THREE.MeshStandardMaterial({ color, roughness: 1 })); m.position.set(x, h / 2, z); fx.mesh(m, null, { dur: 99 }); return m;
};
const pine = (fx, x, z, h = 4, color = '#10281c') => {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color, roughness: 0.9 });
  for (let i = 0; i < 4; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry((1.1 - i * 0.2) * h * 0.28, h * 0.42, 9), m); c.position.y = h * 0.28 + i * h * 0.2; g.add(c); }
  const t = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, h * 0.3, 6), new THREE.MeshStandardMaterial({ color: '#2b1d14' })); t.position.y = h * 0.12; g.add(t);
  g.position.set(x, 0, z); fx.mesh(g, null, { dur: 99 }); return g;
};
const hills = (fx, color = '#0a1018', z = -70, n = 9, hmax = 16) => {
  for (let i = 0; i < n; i++) { const x = -90 + i * (180 / (n - 1)) + (fx.rng() - 0.5) * 12; const hh = hmax * (0.45 + fx.rng() * 0.55); const r = hh * (1.2 + fx.rng() * 0.8);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, hh, 7), new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true })); c.position.set(x, hh / 2 - 0.2, z - fx.rng() * 18); fx.mesh(c, null, { dur: 99 }); }
};
const lake = (fx, x, z, r, color = '#03070d', rough = 0.06) => {
  const g = new THREE.CircleGeometry(r, 64); g.rotateX(-Math.PI / 2); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0.85, envMapIntensity: 2 })); m.position.set(x, 0.02, z); fx.mesh(m, null, { dur: 99 }); return m;
};
const sunGlow = (fx, pos, col = '#ffd9a0', size = 22, k = 0.5) => fx.emitter({ count: 3, kind: 'soft', shape: 'point', pos, life: [11.9, 11.9], size: [size, size], sizeVar: 0.1, speed: 0, ramp: [[0, col, 1], [1, col, 1]], intensity: k, order: -3 });
const RAIN = (n, o = {}) => ({ count: n, kind: 'streak', shape: 'box', shapeSize: [9, 0.2, 7], pos: [0, 9, 0], dir: [0, -1, 0], spread: 0.03, speed: [13, 17], life: [0.55, 0.7], size: [0.5, 0.5], sizeVar: 0.25, stretch: 1.0, ramp: [[0, '#bcd2ea', 0.0], [0.1, '#bcd2ea', 0.8], [0.9, '#9fb8d2', 0.7], [1, '#9fb8d2', 0]], intensity: 0.9, floorFade: 0.5, ...o });

export default [
  /* ================================================================ AURORA */
  { id: 'weather/aurora', name: 'Aurora', category: 'weather', loop: true, duration: 12,
    stage: { sky: 'night', ground: false, bloom: 0.45, exposure: 1.0, view: { pos: [0, 1.4, 8], target: [0, 9, -30], fov: 66 } },
    build(fx) {
      land(fx, '#0b121a', 200, 1);
      lake(fx, 0, -22, 34, '#04141a');
      hills(fx, '#05090d', -78, 11, 15);
      const mk = (seed, z, y0, hgt, w, sh) => {
        const g = new THREE.PlaneGeometry(w, hgt, 90, 1); g.translate(0, hgt / 2, 0);
        const u = { uPh: { value: 0 }, uSeed: { value: seed }, uSh: { value: sh } };
        const m = new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
          vertexShader: `uniform float uPh,uSeed,uSh; varying vec2 vUv; varying float vX;
            void main(){ vUv=uv; vec3 p=position; float x=p.x; vX=x;
              float c=cos(uPh), s=sin(uPh);
              p.z+=uSh*(sin(x*.045+uSeed+c*1.4)*1.+sin(x*.11+uSeed*2.3+s*1.2)*.45);
              p.y+=sin(x*.07+uSeed+s)*1.2*uv.y;
              p.x+=sin(uv.y*3.+uSeed+c)*1.2;
              gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
          fragmentShader: `${NOISE}
            uniform float uPh,uSeed; varying vec2 vUv; varying float vX;
            void main(){
              vec2 tc=vec2(cos(uPh),sin(uPh));
              float x=vX;
              // vertical rays: noise in x (sharp), rippling in time on a circle (seamless loop)
              float r1=fbm(vec3(x*.35+uSeed,tc*1.1+uSeed));
              float r2=fbm(vec3(x*1.3+uSeed*2.,tc*1.7));
              float rays=smoothstep(.25,.85,r1)*(.55+.9*r2);
              float fine=.65+.35*vnoise(vec3(x*3.2,vUv.y*2.,uSeed+tc.x));
              float v=vUv.y;
              float body=smoothstep(0.,.07,v)*exp(-v*2.3);
              float fold=.45+.9*fbm(vec3(x*.08+uSeed,v*1.5,tc*.9));
              float edge=exp(-pow(v*9.,2.))*1.2; // bright lower hem
              float I=(body*rays*fine*fold+edge*rays*.8);
              vec3 green=vec3(.1,1.,.45), teal=vec3(.1,.8,.8), vio=vec3(.65,.2,1.), pink=vec3(1.,.25,.6);
              vec3 c=mix(green,teal,smoothstep(.1,.4,v)); c=mix(c,vio,smoothstep(.35,.75,v)); c=mix(c,pink,smoothstep(.8,1.,v)*.6);
              c=mix(c,vec3(.6,1.,.5),edge*.35);
              gl_FragColor=vec4(c*I*1.05*smoothstep(1.,.85,v)*smoothstep(0.,.03,v),1.); }`,
          fog: false });
        const o = new THREE.Mesh(g, m); o.position.set(0, y0, z); o.frustumCulled = false; o.renderOrder = 5;
        fx.mesh(o, (t) => { u.uPh.value = (t / 12) * TAU; }, { dur: 99 }); return o;
      };
      mk(1.3, -48, 7, 24, 170, 10); mk(5.1, -66, 11, 28, 220, 14); mk(8.7, -38, 5, 18, 140, 7);
      // a few twinkling bright stars
      fx.emitter({ count: 14, kind: 'glint', shape: 'box', shapeSize: [60, 22, 2], pos: [0, 36, -90], size: [1.6, 1.6], sizeVar: 0.6, life: [2, 5], speed: 0, ramp: [[0, '#cfe', 0], [0.5, '#fff', 1], [1, '#cfe', 0]], intensity: 1.3 });
      fx.light({ color: '#40ffa0', intensity: 14, pos: [0, 10, -10], range: 40, env: (t) => 0.8 + 0.2 * Math.sin((t / 12) * TAU) });
    } },

  /* ================================================================ BLIZZARD */
  { id: 'weather/blizzard', name: 'Blizzard', category: 'weather', loop: true, duration: 8,
    stage: { sky: 'storm', ground: false, bloom: 0.25, exposure: 1.1, view: { pos: [0, 1.7, 6], target: [0, 1.5, -2], fov: 62 } },
    build(fx) {
      land(fx, '#aab4bf', 200, 0.95);
      fx.lu.uAmbient.value.set(0.55, 0.6, 0.68);
      for (let i = 0; i < 9; i++) pine(fx, -14 + i * 3.4 + (fx.rng() - 0.5) * 2, -6 - fx.rng() * 14, 4 + fx.rng() * 3, '#16301f');
      fx.light({ color: '#cfe0ff', intensity: 18, pos: [3, 5, 4], range: 30, flicker: 0.1, rate: 2 });
      const wind = { dir: [-1, -0.12, 0.16], spread: 0.08 };
      fx.emitter({ count: 520, kind: 'flake', shape: 'box', shapeSize: [10, 4, 9], pos: [6, 3.2, -2], ...wind, speed: [9, 15], life: [1.3, 2.0], size: [0.11, 0.11], sizeVar: 0.5, rot: 4, turb: [0.5, 1.5], ramp: [[0, '#fff', 0], [0.1, '#f2f8ff', 0.95], [0.9, '#f2f8ff', 0.9], [1, '#fff', 0]], intensity: 1.3 });
      fx.emitter({ count: 160, kind: 'streak', shape: 'box', shapeSize: [10, 4, 9], pos: [6, 3.2, -2], ...wind, speed: [12, 18], life: [1.0, 1.4], size: [0.4, 0.4], stretch: 0.8, ramp: [[0, '#fff', 0], [0.15, '#e6f0ff', 0.6], [0.85, '#e6f0ff', 0.5], [1, '#fff', 0]], intensity: 0.8 });
      fx.emitter({ count: 64, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [8, 2.5, 5], pos: [8, 2.2, -3], dir: [-1, 0, 0.1], spread: 0.1, speed: [4, 7], life: [4, 6], size: [4.5, 7], sizeVar: 0.3, aspect: 1, turb: [0.8, 0.5], ramp: [[0, '#c9d3de', 0], [0.2, '#cdd7e2', 0.28], [0.8, '#bcc8d4', 0.28], [1, '#c9d3de', 0]], lit: 1, order: 2 });
      fx.emitter({ count: 22, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [6, 1.5, 3], pos: [8, 2, 3], dir: [-1, 0, 0], spread: 0.1, speed: [8, 12], life: [1.6, 2.4], size: [3, 5], aspect: 1, ramp: [[0, '#e3ecf5', 0], [0.3, '#e6eef7', 0.35], [1, '#e3ecf5', 0]], lit: 1, order: 3 });
    } },

  /* ================================================================ CHERRY BLOSSOMS */
  { id: 'weather/cherry-blossoms', name: 'Cherry Blossoms', category: 'weather', loop: true, duration: 10,
    stage: { sky: 'day', ground: false, bloom: 0.35, exposure: 1.0, view: { pos: [0.6, 1.5, 7.5], target: [0, 2.7, 0], fov: 52 } },
    build(fx) {
      land(fx, '#7a9a55', 200, 1);
      fx.lu.uAmbient.value.set(0.95, 0.9, 0.95);
      tree(fx, -0.6, -1, { h: 3.6, s: 1.5, leaf: '#f4a6c0', leafCol2: '#ffd8e6', blobs: 90, spread: 2.2, trunk: '#3a2a22' });
      tree(fx, 4.6, -5, { h: 3.4, s: 1.4, leaf: '#f6b5cc', leafCol2: '#ffdce8', blobs: 70, spread: 2.2, trunk: '#3a2a22' });
      tree(fx, -6, -4, { h: 3.2, s: 1.3, leaf: '#efa0bb', leafCol2: '#ffd0e0', blobs: 70, spread: 2.2, trunk: '#3a2a22' });
      // fallen petals on the ground
      fx.decal({ kind: 'glow', r: [3.5, 3.5], y: 0.008, intensity: 0.5, alpha: 0.25, ramp: [[0, '#000'], [0.5, '#c07090'], [1, '#ffd0e0']] });
      fx.light({ color: '#fff0dc', intensity: 90, pos: [5, 8, 5], range: 40 });
      const base = { kind: 'petal', shape: 'box', shapeSize: [4.5, 1.2, 3], pos: [0, 4.2, -0.5], dir: [0.5, -0.4, 0.1], spread: 0.9, life: [7, 9.5], gravity: [0.35, -0.9, 0], drag: 1.6, rot: 3, turb: [0.9, 0.5], sizeVar: 0.4 };
      fx.emitter({ ...base, count: 150, speed: [0.3, 1], size: [0.11, 0.1], ramp: [[0, '#ffc2d6', 0], [0.06, '#ffb6cd', 1], [0.9, '#f59ab8', 1], [1, '#f59ab8', 0]], intensity: 1.15, lit: 1, blend: 'normal', floorFade: 0.15 });
      fx.emitter({ ...base, count: 70, speed: [0.5, 1.5], size: [0.09, 0.08], ramp: [[0, '#fff', 0], [0.06, '#ffe6ee', 1], [0.9, '#ffd0de', 1], [1, '#ffd0de', 0]], intensity: 1.0, lit: 1, blend: 'normal', pos: [1, 4.4, 1.5], floorFade: 0.15 });
      fx.emitter({ kind: 'dust', count: 14, shape: 'box', shapeSize: [5, 2, 3], pos: [0, 2.5, 1], dir: [1, 0.1, 0], speed: [0.3, 0.7], life: [6, 9], size: [0.5, 0.9], blend: 'normal', lit: 1, ramp: [[0, '#fff', 0], [0.5, '#ffe', 0.12], [1, '#fff', 0]] });
    } },

  /* ================================================================ CLOUDS */
  { id: 'weather/clouds', name: 'Clouds', category: 'weather', loop: true, duration: 12,
    stage: { sky: 'day', ground: false, bloom: 0.3, exposure: 1.0, view: { pos: [0, 2, 12], target: [0, 9, -30], fov: 66 } },
    build(fx) {
      land(fx, '#5f8a4e', 260, 1);
      hills(fx, '#47663b', -95, 12, 10);
      fx.lu.uAmbient.value.set(0.9, 0.95, 1.05);
      fx.light({ color: '#fff4dc', intensity: 250, pos: [30, 40, 10], range: 200, norm: 150 });
      sunGlow(fx, [-25, 30, -90], '#fff0c8', 36, 0.55);
      const cum = (n, z, y, w, s, a, ci) => fx.emitter({ count: n, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [w, y[1], z[1]], pos: [0, y[0], z[0]], dir: [1, 0, 0], spread: 0.04, speed: [1.1, 1.5], life: [11.5, 11.8], size: s, sizeVar: 0.45, aspect: a, turb: [1.2, 0.08], ramp: [[0, ci[0], 0], [0.18, ci[1], 0.9], [0.5, ci[2], 0.95], [0.82, ci[1], 0.9], [1, ci[0], 0]], lit: 1, order: -2 });
      cum(26, [-48, 8], [20, 5], 40, [18, 24], 0.55, ['#ffffff', '#f4f6fa', '#d9e0ea']);
      cum(18, [-80, 10], [30, 6], 60, [26, 34], 0.5, ['#e9eef6', '#e3e9f2', '#c8d2e0']);
      cum(14, [-28, 6], [14, 3], 30, [11, 15], 0.6, ['#ffffff', '#f6f8fb', '#dde4ee']);
      fx.emitter({ count: 12, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [50, 2, 20], pos: [0, 43, -50], dir: [1, 0, 0], spread: 0.03, speed: [2.2, 3], life: [11.5, 11.8], size: [30, 44], aspect: 0.7, sizeVar: 0.3, ramp: [[0, '#fff', 0], [0.25, '#ffffff', 0.38], [0.75, '#f3f6fb', 0.38], [1, '#fff', 0]], lit: 1, order: -3 });
      fx.emitter({ count: 8, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [30, 1, 8], pos: [-6, 7, -20], dir: [1, 0, 0], spread: 0.03, speed: [1.5, 2], life: [11.5, 11.8], size: [12, 18], aspect: 0.8, ramp: [[0, '#fff', 0], [0.3, '#fafcff', 0.5], [0.7, '#eef2f8', 0.5], [1, '#fff', 0]], lit: 1, order: -1 });
    } },

  /* ================================================================ FALLING LEAVES */
  { id: 'weather/falling-leaves', name: 'Falling Leaves', category: 'weather', loop: true, duration: 10,
    stage: { sky: 'dusk', ground: false, bloom: 0.35, exposure: 1.05, view: { pos: [1, 1.4, 8], target: [0, 2.6, 0], fov: 54 } },
    build(fx) {
      land(fx, '#4a3a22', 200, 1);
      fx.lu.uAmbient.value.set(0.9, 0.7, 0.55);
      tree(fx, -1.5, -1.5, { h: 3.8, s: 1.5, leaf: '#d9701a', leafCol2: '#e8b21e', blobs: 90, spread: 2.2, trunk: '#2f2118' });
      tree(fx, 5.2, -5, { h: 3.4, s: 1.4, leaf: '#b8381a', leafCol2: '#e0861a', blobs: 70, spread: 2.2, trunk: '#2f2118' });
      tree(fx, -7, -6, { h: 3.4, s: 1.4, leaf: '#e0a020', leafCol2: '#c85a14', blobs: 70, spread: 2.2, trunk: '#2f2118' });
      // leaf litter piles
      const litter = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ color: '#fff', roughness: 1 }), 90); const d = new THREE.Object3D(), c = new THREE.Color();
      const cols = ['#c8561a', '#d98a1c', '#a8301a', '#e0b030'];
      for (let i = 0; i < 90; i++) { const a = fx.rng() * TAU, r = 0.5 + fx.rng() * 6; d.position.set(-1.5 + Math.cos(a) * r, 0.02, -1 + Math.sin(a) * r * 0.8); d.scale.set(0.12 + fx.rng() * 0.12, 0.02, 0.09 + fx.rng() * 0.08); d.rotation.y = fx.rng() * TAU; d.updateMatrix(); litter.setMatrixAt(i, d.matrix); litter.setColorAt(i, c.set(fx.rng.pick(cols))); }
      fx.mesh(litter, null, { dur: 99 });
      fx.light({ color: '#ffb468', intensity: 110, pos: [-6, 4, 6], range: 40 });
      const base = { kind: 'petal', shape: 'box', shapeSize: [4.5, 1, 3], pos: [-1, 4.6, -0.5], dir: [0.4, -0.5, 0.1], spread: 0.9, life: [6.5, 9.5], gravity: [0.3, -1.4, 0], drag: 1.8, rot: 4, turb: [1.1, 0.55], sizeVar: 0.4, lit: 1, blend: 'normal', floorFade: 0.12 };
      const ls = (col, a) => [[0, col, 0], [0.05, col, 1], [0.92, a, 1], [1, a, 0]];
      fx.emitter({ ...base, count: 70, speed: [0.3, 1.2], size: [0.2, 0.19], ramp: ls('#e0701a', '#a84a10'), intensity: 1.2 });
      fx.emitter({ ...base, count: 60, speed: [0.3, 1.2], size: [0.18, 0.17], ramp: ls('#e8b020', '#b07a10'), intensity: 1.2, pos: [1, 4.8, 0.5] });
      fx.emitter({ ...base, count: 50, speed: [0.3, 1.2], size: [0.19, 0.18], ramp: ls('#b5361a', '#6a1a10'), intensity: 1.1, pos: [-2, 4.4, 1] });
      fx.emitter({ ...base, count: 20, speed: [1, 2.5], size: [0.17, 0.16], ramp: ls('#c9601a', '#7a3a10'), intensity: 1.1, dir: [1, -0.1, 0.1], gravity: [0.5, -1.2, 0], pos: [-6, 2.6, 0], shapeSize: [1, 1.5, 3] });
    } },

  /* ================================================================ FIREFLIES */
  { id: 'weather/fireflies', name: 'Fireflies', category: 'weather', loop: true, duration: 12,
    stage: { sky: 'dark', ground: false, bloom: 0.85, exposure: 1.2, ambient: 1.2, view: { pos: [0, 1.5, 8], target: [0, 1.4, -2], fov: 56 } },
    build(fx) {
      land(fx, '#0d1a0f', 200, 1);
      fx.water({ r: 3.4, deep: '#010806', shallow: '#0a2820', sky: '#1a3a40', horizon: '#223a40', pos: [1.5, 0, -2], waves: 0.5, ripples: [] });
      for (let i = 0; i < 7; i++) tree(fx, -11 + i * 3.6 + (fx.rng() - 0.5) * 2, -8 - fx.rng() * 6, { h: 4 + fx.rng() * 2, s: 1.1, leaf: '#0f2a16', leafCol2: '#143a1c', blobs: 40, spread: 2 });
      // grass blades
      const gr = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.6, 3), new THREE.MeshStandardMaterial({ color: '#2d5a2a', roughness: 1 }), 420); const d = new THREE.Object3D();
      for (let i = 0; i < 420; i++) { d.position.set((fx.rng() - 0.5) * 16, 0.25, -6 + fx.rng() * 12); if (Math.hypot(d.position.x - 1.5, d.position.z + 2) < 3.5) d.position.y = -2; d.scale.setScalar(0.6 + fx.rng() * 1.2); d.rotation.set((fx.rng() - 0.5) * 0.4, 0, (fx.rng() - 0.5) * 0.4); d.updateMatrix(); gr.setMatrixAt(i, d.matrix); }
      fx.mesh(gr, null, { dur: 99 });
      fx.light({ color: '#8fb0ff', intensity: 5, pos: [-4, 8, 4], range: 40 });
      const ff = { shape: 'box', shapeSize: [6.5, 1.1, 4.5], pos: [0, 1.4, -1.5], speed: [0.25, 0.7], dir: [0, 0.2, 0], spread: 2.5, turb: [0.9, 0.45], drag: 0.2 };
      fx.emitter({ ...ff, count: 60, kind: 'soft', life: [2.2, 4.5], size: [0.22, 0.22], sizeVar: 0.35, ramp: [[0, '#d8ff60', 0], [0.2, '#d9ff55', 1], [0.5, '#fff6a0', 0.35], [0.7, '#c8ff40', 1], [1, '#a0e020', 0]], intensity: 2.6 });
      fx.emitter({ ...ff, count: 60, kind: 'glint', life: [2.2, 4.5], size: [0.2, 0.2], ramp: [[0, '#fff', 0], [0.2, '#f4ffa0', 0.9], [0.5, '#fff', 0.2], [0.7, '#f4ffa0', 0.9], [1, '#fff', 0]], intensity: 2.4, sizeVar: 0.3 });
      fx.emitter({ ...ff, count: 26, kind: 'soft', life: [3, 6], pos: [0, 0.6, -1], size: [0.55, 0.55], ramp: [[0, '#b0ff40', 0], [0.5, '#a8f040', 0.16], [1, '#b0ff40', 0]], intensity: 1.0, shapeSize: [6, 0.5, 4] });
      for (let k = 0; k < 3; k++) {
        const L = fx.light({ color: '#c8ff50', intensity: 6, pos: [0, 1.2, 0], range: 5, main: false, env: (t) => 0.55 + 0.45 * Math.sin((t / 12) * TAU * (2 + k) + k * 2) });
        fx.on((t) => { const a = (t / 12) * TAU; L.l.position.set(-2 + k * 2 + Math.sin(a * (1 + k) + k) * 1.5, 1.0 + Math.sin(a * 2 + k) * 0.3, -1 + Math.cos(a * (1 + (k % 2)) + k * 3) * 1.6); });
      }
    } },

  /* ================================================================ FOG */
  { id: 'weather/fog', name: 'Fog', category: 'weather', loop: true, duration: 12,
    stage: { sky: 'dusk', ground: false, bloom: 0.3, exposure: 1.0, view: { pos: [0, 1.7, 9], target: [0, 1.8, -10], fov: 56 } },
    build(fx) {
      land(fx, '#2a3128', 200, 1);
      fx.lu.uAmbient.value.set(0.55, 0.55, 0.62);
      for (let i = 0; i < 26; i++) { const z = 3 - i * 2.6 - fx.rng() * 2; trunk(fx, (fx.rng() - 0.5) * 14, z, 14, 0.22 + fx.rng() * 0.22, '#231b15'); }
      for (let i = 0; i < 14; i++) { const z = -4 - i * 3; const s = new THREE.Mesh(new THREE.DodecahedronGeometry(0.5 + fx.rng() * 0.6, 0), new THREE.MeshStandardMaterial({ color: '#2a2c2e', roughness: 1, flatShading: true })); s.position.set((fx.rng() - 0.5) * 12, 0.15, z); s.scale.y = 0.6; fx.mesh(s, null, { dur: 99 }); }
      fx.light({ color: '#ffd8b0', intensity: 30, pos: [-5, 6, -6], range: 40 });
      const fogL = (n, z, y, sz, k, order, spd = [0.35, 0.7]) => fx.emitter({ count: n, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [12, y[1], z[1]], pos: [0, y[0], z[0]], dir: [1, 0, 0], spread: 0.05, speed: spd, life: [11.5, 11.8], size: sz, sizeVar: 0.4, aspect: 0.5, turb: [0.6, 0.12], ramp: [[0, '#b8bcc4', 0], [0.2, '#b9bdc6', k], [0.8, '#b0b5c0', k], [1, '#b8bcc4', 0]], lit: 1, order });
      fogL(34, [-4, 12], [0.9, 0.7], [5, 8], 0.28, -1);
      fogL(26, [-14, 8], [1.6, 1.1], [6, 10], 0.34, -1);
      fogL(16, [4, 3], [0.6, 0.4], [3, 5], 0.14, 2, [0.5, 0.9]);
      fx.emitter({ kind: 'dust', count: 20, shape: 'box', shapeSize: [6, 1.5, 4], pos: [0, 1.5, 0], dir: [1, 0, 0], speed: [0.2, 0.5], life: [8, 11], size: [0.5, 1], blend: 'normal', lit: 1, ramp: [[0, '#fff', 0], [0.5, '#fff', 0.1], [1, '#fff', 0]] });
    } },

  /* ================================================================ GOD RAYS */
  { id: 'weather/god-rays', name: 'God Rays', category: 'weather', loop: true, duration: 10,
    stage: { sky: 'day', ground: false, bloom: 0.55, exposure: 0.95, view: { pos: [0.5, 1.5, 7.5], target: [0, 2.4, 0], fov: 54 } },
    build(fx) {
      land(fx, '#35502c', 200, 1);
      fx.lu.uAmbient.value.set(0.45, 0.52, 0.45);
      for (let i = 0; i < 16; i++) { const a = -1 + (i / 15) * 2; trunk(fx, a * 9 + (fx.rng() - 0.5) * 2, -3 - fx.rng() * 10, 12, 0.28 + fx.rng() * 0.2, '#2a2016'); }
      fx.light({ color: '#fff0c0', intensity: 220, pos: [-4, 9, -1], range: 40 });
      for (let i = 0; i < 6; i++) {
        const x0 = -6 + i * 2.1 + (fx.rng() - 0.5), ph = fx.rng();
        fx.beam({ from: [x0 - 6, 11, -4], to: [x0 + 0.5, 0, 0.5 + (fx.rng() - 0.5) * 3], r: [0.2, 0.55 + fx.rng() * 0.6], noise: 0.5, freq: 2, speed: 0.3, pulse: 0.25, edge: 1.2, intensity: 0.5 + fx.rng() * 0.3, alpha: 0.6, ramp: [[0, '#fff2c0'], [0.5, '#ffe29a'], [1, '#ffcf70']], endFade: 0.2 });
      }
      fx.emitter({ kind: 'dust', count: 40, shape: 'box', shapeSize: [6, 3, 3], pos: [-1, 3, 0], dir: [0.4, 0.3, 0], spread: 1.5, speed: [0.05, 0.25], life: [8, 11.5], size: [0.1, 0.16], blend: 'add', turb: [0.5, 0.4], ramp: [[0, '#ffe8b0', 0], [0.3, '#ffe8b0', 0.55], [0.7, '#ffe8b0', 0.55], [1, '#ffe8b0', 0]], intensity: 1.4 });
      fx.emitter({ kind: 'soft', count: 40, shape: 'box', shapeSize: [6, 3, 3], pos: [-1, 3, 0], dir: [0.3, 0.2, 0], spread: 1.5, speed: [0.05, 0.2], life: [4, 9], size: [0.04, 0.07], turb: [0.6, 0.5], ramp: [[0, '#fff', 0], [0.5, '#fff0c0', 1], [1, '#fff', 0]], intensity: 2.4 });
      fx.emitter({ kind: 'smoke', blend: 'normal', count: 14, shape: 'box', shapeSize: [8, 1, 3], pos: [0, 1, -3], dir: [1, 0, 0], speed: [0.2, 0.4], life: [9, 11], size: [4, 7], aspect: 0.5, lit: 1, ramp: [[0, '#cfd8c0', 0], [0.3, '#d6dec4', 0.18], [0.7, '#d6dec4', 0.18], [1, '#cfd8c0', 0]], order: -1 });
      sunGlow(fx, [-14, 22, -10], '#fff0c0', 16, 0.5);
    } },

  /* ================================================================ RAIN */
  { id: 'weather/rain', name: 'Rain', category: 'weather', loop: true, duration: 8,
    stage: { sky: 'storm', ground: false, bloom: 0.3, exposure: 1.1, view: { pos: [0, 1.6, 7], target: [0, 1.6, -3], fov: 56 } },
    build(fx) {
      land(fx, '#1c2228', 200, 0.4);
      fx.lu.uAmbient.value.set(0.35, 0.4, 0.5);
      // puddles with rain ripples
      const rp = []; for (let i = 0; i < 8; i++) rp.push({ t: 0, x: 0, z: 0, amp: 0.02 });
      const pud = fx.water({ r: 3.2, deep: '#0a1118', shallow: '#26323c', sky: '#4a5a6a', horizon: '#6a7a8a', pos: [-1, 0, -1], y: 0.014, waves: 0.4, ripples: [] });
      pud.p.ripples = (t) => { const a = []; for (let i = 0; i < 8; i++) { const ph = (t * 1.5 + i / 8) % 1; a.push({ t: t - ph * 0.7, x: Math.sin(i * 12.9 + (Math.floor(t * 1.5 + i / 8) % 12) * 7.3) * 2.4, z: Math.cos(i * 7.7 + (Math.floor(t * 1.5 + i / 8) % 12) * 3.1) * 2.4, amp: 0.045 }); } return a; };
      for (let i = 0; i < 10; i++) tree(fx, -14 + i * 3.1 + (fx.rng() - 0.5) * 2, -9 - fx.rng() * 8, { h: 4, s: 1.1, leaf: '#1c3324', leafCol2: '#22402c', blobs: 36, spread: 2 });
      // street lamp w/ warm light
      const lamp = new THREE.Group(); const pm = new THREE.MeshStandardMaterial({ color: '#15181c', metalness: 0.6, roughness: 0.5 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 3.6, 8), pm); pole.position.y = 1.8; lamp.add(pole);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd8a0').multiplyScalar(3) })); hd.position.y = 3.65; lamp.add(hd); lamp.position.set(2.6, 0, -2.5); fx.mesh(lamp, null, { dur: 99 });
      fx.light({ color: '#ffc880', intensity: 40, pos: [2.6, 3.4, -2.2], range: 12 });
      fx.emitter(RAIN(520, { shapeSize: [9, 0.2, 8], pos: [0, 9, -1], dir: [0.12, -1, 0] }));
      fx.emitter(RAIN(260, { shapeSize: [3.5, 0.2, 3], pos: [0, 8, 4.5], dir: [0.12, -1, 0], size: [0.9, 0.9], intensity: 0.7 }));
      // ground splash dots
      fx.emitter({ count: 200, kind: 'ring', shape: 'box', shapeSize: [7, 0, 7], pos: [0, 0.03, -1], dir: [0, 1, 0], spread: 0.2, speed: 0, life: [0.25, 0.45], size: [0.04, 0.3], ramp: [[0, '#cfe0f0', 0.7], [1, '#cfe0f0', 0]], intensity: 0.7 });
      fx.emitter({ count: 160, kind: 'drop', shape: 'box', shapeSize: [7, 0, 7], pos: [0, 0.03, -1], dir: [0, 1, 0], spread: 0.7, speed: [0.8, 1.6], gravity: [0, -7, 0], life: [0.25, 0.45], size: [0.03, 0.02], ramp: [[0, '#dfeaf5', 0.9], [1, '#dfeaf5', 0]], intensity: 1.3 });
      fx.emitter({ count: 22, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [10, 0.6, 6], pos: [0, 0.5, -6], dir: [1, 0, 0], speed: [0.2, 0.5], life: [7, 8], size: [4, 7], aspect: 0.4, lit: 1, ramp: [[0, '#6a7480', 0], [0.3, '#6a7480', 0.25], [0.7, '#6a7480', 0.25], [1, '#6a7480', 0]], order: -1 });
    } },

  /* ================================================================ SHOOTING STARS */
  { id: 'weather/shooting-stars', name: 'Shooting Stars', category: 'weather', loop: true, duration: 10,
    stage: { sky: 'night', ground: false, bloom: 0.8, exposure: 1.2, view: { pos: [0, 1.5, 6], target: [0, 9, -30], fov: 72 } },
    build(fx) {
      land(fx, '#070b10', 200, 1);
      lake(fx, 0, -18, 30, '#050a18');
      hills(fx, '#04070b', -70, 12, 14);
      for (let i = 0; i < 6; i++) pine(fx, -9 + i * 3.6 + (fx.rng() - 0.5) * 2, -7 - fx.rng() * 4, 4 + fx.rng() * 3, '#050a0a');
      fx.emitter({ count: 50, kind: 'glint', shape: 'box', shapeSize: [55, 24, 1], pos: [0, 40, -85], size: [1.6, 1.6], sizeVar: 0.7, life: [2, 6], speed: 0, ramp: [[0, '#cde', 0], [0.5, '#fff', 1], [1, '#cde', 0]], intensity: 1.8 });
      fx.light({ color: '#8fb0ff', intensity: 8, pos: [0, 10, 4], range: 40 });
      const shots = [[0.3, 1.1], [2.4, 0.9], [4.2, 1.3], [6.1, 0.8], [7.3, 1.2], [8.8, 0.9]];
      shots.forEach(([t0, dur], i) => {
        const sx = fx.rng.range(-30, 30), sy = fx.rng.range(26, 46), sz = -60 - fx.rng() * 20; const dx = (fx.rng() > 0.5 ? 1 : -1) * fx.rng.range(25, 40), dy = -fx.rng.range(12, 22);
        const path = (t) => { const u = Math.min(1, Math.max(0, (t - t0) / dur)); return [sx + dx * u, sy + dy * u, sz]; };
        fx.trail({ path, len: 0.55, width: 0.55, n: 24, t0, dur: dur + 0.35, fade: [0, 0.1], intensity: 3.4, core: 4, ramp: [[0, '#ffffff'], [0.3, '#bfe4ff'], [1, '#3a58c8']] });
        fx.emitter({ count: 1, kind: 'glint', shape: 'point', size: [2.4, 2.4], life: [dur, dur], speed: 0, ramp: [[0, '#fff', 1], [0.8, '#cfe8ff', 1], [1, '#fff', 0]], intensity: 3, delay: t0, emit: 0.001, period: 10, follow: (m, tAbs, t) => { const p = path(t); m.position.set(p[0], p[1], p[2]); } });
        fx.emitter({ count: 14, kind: 'spark', shape: 'point', size: [0.5, 0.1], life: [0.4, 0.9], speed: [0.5, 2], spread: 3, ramp: [[0, '#fff', 1], [1, '#8bf', 0]], intensity: 2.5, delay: t0, emit: dur * 0.8, stretch: 0.2, follow: (m, tAbs, t) => { const p = path(Math.min(t, t0 + dur)); m.position.set(p[0], p[1], p[2]); } });
      });
    } },

  /* ================================================================ SNOW */
  { id: 'weather/snow', name: 'Snow', category: 'weather', loop: true, duration: 12,
    stage: { sky: 'night', ground: false, bloom: 0.55, exposure: 1.15, view: { pos: [0, 1.7, 7.5], target: [0, 1.7, -2], fov: 56 } },
    build(fx) {
      land(fx, '#c9d6e6', 200, 0.95);
      fx.lu.uAmbient.value.set(0.35, 0.42, 0.6);
      for (let i = 0; i < 12; i++) pine(fx, -16 + i * 3 + (fx.rng() - 0.5) * 2, -8 - fx.rng() * 12, 4.5 + fx.rng() * 3, '#102a22');
      // snowy caps via white cones scaled
      const lamp = new THREE.Group(); const pm = new THREE.MeshStandardMaterial({ color: '#1a1d22', metalness: 0.6, roughness: 0.5 });
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), pm); pole.position.y = 1.7; lamp.add(pole);
      const hd = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd49a').multiplyScalar(3) })); hd.position.y = 3.45; lamp.add(hd); lamp.position.set(2.2, 0, -1.5); fx.mesh(lamp, null, { dur: 99 });
      fx.light({ color: '#ffc27a', intensity: 90, pos: [2.2, 3.2, -1.2], range: 14, flicker: 0.04, norm: 40 });
      fx.light({ color: '#8fb0ff', intensity: 20, pos: [-3, 6, 4], range: 30 });
      fx.decal({ kind: 'glow', r: [3.6, 3.6], pos: [2.2, 0.03, -1.5], y: 0.03, intensity: 0.9, alpha: 0.6, ramp: [[0, '#000'], [0.5, '#6a4a28'], [1, '#ffc88a']] });
      const sn = { shape: 'box', shapeSize: [9, 0.3, 8], pos: [0, 7.5, -1], dir: [0.15, -1, 0.05], spread: 0.15, gravity: [0.1, -0.2, 0], drag: 1.2, rot: 2, turb: [0.5, 0.35], blend: 'add' };
      fx.emitter({ ...sn, count: 340, kind: 'flake', speed: [0.7, 1.3], life: [9, 11.5], size: [0.075, 0.07], sizeVar: 0.6, ramp: [[0, '#fff', 0], [0.04, '#eef6ff', 0.95], [0.9, '#eef6ff', 0.95], [1, '#fff', 0]], intensity: 1.1, floorFade: 0.3 });
      fx.emitter({ ...sn, count: 130, kind: 'soft', speed: [0.9, 1.6], life: [7, 9], size: [0.05, 0.05], ramp: [[0, '#fff', 0], [0.05, '#fff', 1], [0.9, '#fff', 0.9], [1, '#fff', 0]], intensity: 1.6, floorFade: 0.3 });
      fx.emitter({ ...sn, count: 40, kind: 'soft', shapeSize: [3, 0.3, 2], pos: [1, 5.5, 5], speed: [1.2, 2], life: [4, 6], size: [0.2, 0.2], ramp: [[0, '#fff', 0], [0.2, '#fff', 0.3], [0.8, '#fff', 0.25], [1, '#fff', 0]], intensity: 1.0 });
    } },

  /* ================================================================ STORM */
  { id: 'weather/storm', name: 'Storm', category: 'weather', loop: true, duration: 10,
    stage: { sky: 'storm', ground: false, bloom: 0.5, exposure: 1.1, view: { pos: [0, 1.6, 7.5], target: [0, 4, -8], fov: 62 } },
    build(fx) {
      land(fx, '#141a1f', 220, 0.35);
      fx.lu.uAmbient.value.set(0.22, 0.26, 0.34);
      lake(fx, 0, -12, 14, '#0a1218', 0.15);
      for (let i = 0; i < 9; i++) tree(fx, -16 + i * 4 + (fx.rng() - 0.5) * 2, -22 - fx.rng() * 8, { h: 4.5, s: 1.3, leaf: '#0f1d17', leafCol2: '#142419', blobs: 36, spread: 2 , bare: false });
      // bending in wind: nothing, trees are static; wind shown by rain slant and deck motion
      const flashes = [[2.1, 0.55], [2.5, 0.35], [6.6, 0.7]];
      const strike = (t0, x, dur) => {
        fx.bolt({ from: [x, 26, -22], to: [x + 3, 0.3, -18], jag: 0.2, branches: 4, branchLen: 0.3, width: 0.28, rate: 30, flicker: 0.45, t0, dur, ramp: [[0, '#ffffff'], [0.5, '#cfdcff'], [1, '#7a9aff']], intensity: 6 });
        fx.bolt({ from: [x + 6, 20, -24], to: [x + 3, 14, -21], jag: 0.3, branches: 1, width: 0.12, rate: 30, flicker: 0.5, t0: t0 + 0.05, dur: dur * 0.7, intensity: 4 });
        fx.flash(t0, dur * 0.8, '#cfe0ff', 0.55); fx.shake(t0, 0.3, 0.03);
      };
      strike(2.1, -4, 0.28); strike(2.45, -3, 0.18); strike(6.6, 6, 0.32);
      fx.light({ color: '#b9ceff', intensity: 700, pos: [0, 12, -12], range: 90, main: true, norm: 200, env: (t) => { let k = 0; for (const [a, d] of [[2.1, 0.28], [2.45, 0.18], [6.6, 0.32]]) { const u = (t - a) / d; if (u >= 0 && u <= 1) k = Math.max(k, (1 - u) * (0.6 + 0.4 * Math.sin(u * 40))); } return k; } });
      fx.light({ color: '#6a7c92', intensity: 8, pos: [0, 8, 4], range: 40 });
      // dark cloud deck, lit by flashes
      const deck = (n, z, y, sz, spd, k) => fx.emitter({ count: n, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [40, 3, 20], pos: [0, y, z], dir: [1, 0, 0], spread: 0.05, speed: spd, life: [9.8, 9.9], size: sz, sizeVar: 0.4, aspect: 0.55, turb: [1, 0.15], ramp: [[0, '#2a3340', 0], [0.2, '#36414f', k], [0.8, '#2e3846', k], [1, '#2a3340', 0]], lit: 1, order: -2 });
      deck(30, -35, 22, [22, 30], [3, 4.5], 0.95); deck(22, -18, 17, [16, 22], [4, 6], 0.85); deck(14, -8, 14, [12, 18], [5, 7], 0.55);
      const wind = { dir: [0.35, -1, 0.1] };
      fx.emitter(RAIN(420, { shapeSize: [11, 0.2, 9], pos: [-2, 9, -1], ...wind, speed: [17, 22], life: [0.45, 0.55], size: [0.55, 0.55], intensity: 1.0 }));
      fx.emitter(RAIN(200, { shapeSize: [4, 0.2, 3], pos: [-1, 8, 4.5], ...wind, speed: [17, 22], life: [0.4, 0.5], size: [1, 1], intensity: 0.75 }));
      fx.emitter({ count: 160, kind: 'drop', shape: 'box', shapeSize: [8, 0, 8], pos: [0, 0.03, -1], dir: [0, 1, 0], spread: 0.8, speed: [1, 2.2], gravity: [0, -8, 0], life: [0.25, 0.5], size: [0.035, 0.025], ramp: [[0, '#dfeaf5', 0.9], [1, '#dfeaf5', 0]], intensity: 1.4 });
      fx.emitter({ count: 40, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [12, 0.6, 6], pos: [0, 0.5, -6], dir: [1, 0, 0], speed: [1, 2], life: [6, 8], size: [4, 8], aspect: 0.4, lit: 1, ramp: [[0, '#5a6674', 0], [0.3, '#5a6674', 0.22], [0.7, '#5a6674', 0.22], [1, '#5a6674', 0]], order: -1 });
    } },
];
