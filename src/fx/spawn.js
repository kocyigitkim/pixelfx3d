import * as THREE from 'three';
import { Dummy, POSES } from '../core/dummy.js';
import { clamp, smooth as sm, lerp } from '../core/rng.js';

const VIEW = { pos: [2.5, 1.35, 3.6], target: [0, 0.95, 0], fov: 40 };
const dissY = (d, dir) => { const l = d * 1.5 - 0.2; return dir > 0 ? 1.9 * l : 1.9 * (1 - l); }; // world y of the dissolve front

/* ---- coin helpers ---- */
const makeCoin = () => {
  const g = new THREE.CylinderGeometry(0.075, 0.075, 0.016, 28);
  const m = new THREE.MeshStandardMaterial({ color: '#ffc43a', metalness: 1, roughness: 0.28 });
  const rim = new THREE.MeshStandardMaterial({ color: '#ffdf70', metalness: 1, roughness: 0.2 });
  const c = new THREE.Group(); c.add(new THREE.Mesh(g, m));
  const t = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.006, 8, 28), rim); t.rotation.x = Math.PI / 2; t.position.y = 0.0085; c.add(t);
  const t2 = t.clone(); t2.position.y = -0.0085; c.add(t2);
  return c;
};
const eggTexture = (fx) => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  x.fillStyle = '#e9dcc0'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${90 + fx.rng() * 40},${70 + fx.rng() * 30},${40 + fx.rng() * 30},${0.15 + fx.rng() * 0.5})`; const r = 0.8 + fx.rng() * 3.2; x.beginPath(); x.arc(fx.rng() * 256, fx.rng() * 256, r, 0, 7); x.fill(); }
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = THREE.RepeatWrapping; return tx;
};
const eggMat = (fx, uCrack) => {
  const m = new THREE.MeshStandardMaterial({ map: eggTexture(fx), roughness: 0.5, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCrack = uCrack;
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      uniform float uCrack; float hs(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
      float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hs(i),hs(i+vec2(1,0)),f.x),mix(hs(i+vec2(0,1)),hs(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      { vec2 q=vMapUv*vec2(5.,3.2); float w=vn(q*2.)*.35; vec2 f=fract(q+w); vec2 g=floor(q+w); float h1=hs(g), h2=hs(g+7.3);
        float line=min(abs(f.x-h1)*1.0, abs(f.y-h2)*1.0); float cr=smoothstep(.06,.0,line);
        float reveal=smoothstep(uCrack-.25,uCrack,vn(q*1.3+3.)*.9+.05) ; cr*=1.-reveal; cr*=step(.001,uCrack);
        totalEmissiveRadiance+=vec3(1.6,1.25,.6)*cr*2.5; diffuseColor.rgb*=1.-cr*.5; }`);
  };
  return m;
};
const eggProfile = () => { // y 0..0.42
  const pts = []; for (let i = 0; i <= 28; i++) { const v = i / 28, y = v * 0.44; const r = Math.pow(Math.sin(Math.PI * v), 0.68) * 0.17 * (1.12 - 0.34 * v); pts.push(new THREE.Vector2(Math.max(0.0005, r), y)); } return pts;
};

const ghost = () => { const d = new Dummy({ color: '#dfe9ff' }); d.setPose(POSES.idle); return d; };

const bruteGroup = () => {
  const g = new THREE.Group(), skin = new THREE.MeshStandardMaterial({ color: '#6b2a22', roughness: 0.75, metalness: 0.05 }), dark = new THREE.MeshStandardMaterial({ color: '#2b1a17', roughness: 0.8 }), horn = new THREE.MeshStandardMaterial({ color: '#d9cdb0', roughness: 0.45 });
  const add = (geo, m, p, s, r) => { const o = new THREE.Mesh(geo, m); o.position.set(...p); if (s) o.scale.set(...s); if (r) o.rotation.set(...r); g.add(o); return o; };
  const sph = new THREE.SphereGeometry(1, 24, 18), cyl = new THREE.CylinderGeometry(1, 1, 1, 14), cone = new THREE.ConeGeometry(1, 1, 12);
  add(sph, skin, [0, 1.45, 0], [0.5, 0.58, 0.4]); // torso
  add(sph, dark, [0.05, 1.12, 0], [0.4, 0.28, 0.33]); // belly/belt
  add(sph, skin, [0.12, 2.1, 0], [0.24, 0.26, 0.22]); // head
  add(sph, dark, [0.3, 2.07, 0], [0.08, 0.1, 0.12]); // snout
  for (const s of [-1, 1]) {
    add(cone, horn, [0.1, 2.38, s * 0.19], [0.06, 0.3, 0.06], [s * 0.5, 0, -0.3]);
    add(sph, skin, [0, 1.85, s * 0.6], [0.24, 0.24, 0.24]); // shoulder
    add(cyl, skin, [0.08, 1.4, s * 0.72], [0.13, 0.55, 0.13], [s * 0.15, 0, 0.1]);
    add(sph, skin, [0.12, 0.98, s * 0.76], [0.19, 0.19, 0.19]); // fist
    add(cyl, skin, [0, 0.45, s * 0.24], [0.17, 0.5, 0.17]); // leg
    add(sph, dark, [0.08, 0.06, s * 0.24], [0.26, 0.1, 0.18]); // foot
    const eye = add(sph, new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 1.2, 0.2) }), [0.33, 2.15, s * 0.09], [0.03, 0.03, 0.03]); eye.userData.eye = 1;
  }
  return g;
};

export default [
  /* ------------------------------------------------------------------ coin drop */
  { id: 'spawn/coin-drop', name: 'Coin drop', category: 'spawn', loop: false, duration: 3, body: true, stage: { sky: 'dusk', view: { pos: [1.6, 1.5, 3.4], target: [0.5, 0.5, 0.3], fov: 40 }, bloom: 0.35 },
    build(fx) {
      const coins = [], N = 9, F = 90, DT = 1 / 60;
      for (let i = 0; i < N; i++) { // precompute a bounce path per coin
        const a = fx.rng.range(0, 6.28), sp = fx.rng.range(0.5, 1.6), vy0 = fx.rng.range(3.4, 5.2); let x = 0.05, y = 1.0, z = 0, vx = Math.cos(a) * sp + 0.3, vy = vy0, vz = Math.sin(a) * sp; const path = new Float32Array((F + 1) * 3);
        for (let k = 0; k <= F; k++) { path[k * 3] = x; path[k * 3 + 1] = y; path[k * 3 + 2] = z; for (let s = 0; s < 1; s++) { vy -= 9.8 * DT; x += vx * DT; y += vy * DT; z += vz * DT; if (y < 0.016) { y = 0.016; vy = Math.abs(vy) * 0.46; vx *= 0.7; vz *= 0.7; if (vy < 0.5) { vy = 0; vx *= 0.8; vz *= 0.8; } } } }
        const c = makeCoin(); const d = i * 0.035 + 0.12; coins.push({ c, path, d, A: Math.PI * fx.rng.pick([5, 7, 9, 11]), ax: fx.rng.range(0, 6.28), ts: fx.rng.range(1.0, 1.4) });
        fx.mesh(c, (t) => {
          const u = (t - d) / DT; if (u < 0) { c.visible = false; return; } c.visible = true; const k = Math.min(F - 1, Math.floor(u)), f = Math.min(1, u - k);
          c.position.set(lerp(path[k * 3], path[k * 3 + 3], f), lerp(path[k * 3 + 1], path[k * 3 + 4], f), lerp(path[k * 3 + 2], path[k * 3 + 5], f));
          const q = clamp((t - d) / (coins[i].ts)); const ang = coins[i].A * (1 - (1 - q) * (1 - q)); c.rotation.set(0, coins[i].ax, 0); c.rotateX(ang); c.rotateZ(ang * 0.37 * (1 - q));
        }, { dur: 99 });
      }
      fx.on((t) => { fx.body.set({ alpha: t < 0.1 ? 1 : 0, tint: '#fff', tintAmt: t < 0.1 ? smooth01(t / 0.1) * 0.8 : 0 }); });
      fx.flash(0.08, 0.2, '#ffe9a0', 0.4);
      fx.light({ color: '#ffd070', intensity: 90, pos: [0.4, 1.2, 0.2], range: 8, t0: 0.05, dur: 1.4, fade: [0.02, 1.0] });
      fx.emitter({ count: 22, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.3, pos: [0, 1, 0], dir: [0, 1, 0], radial: 0.8, spread: 1.5, speed: [0.5, 1.7], life: [0.7, 1.2], size: [0.5, 1.2], drag: 2, ramp: [[0, '#fff2d6', 0.9], [0.4, '#b6a48a', 0.6], [1, '#5a5048', 0]], delay: 0.1, order: -1 });
      fx.emitter({ count: 26, kind: 'glint', shape: 'sphere', radius: 0.5, pos: [0.3, 0.6, 0], size: [0.28, 0.05], life: [0.3, 0.7], ramp: [[0, '#fff'], [0.5, '#ffd868'], [1, '#a60', 0]], intensity: 3, delay: 0.3, emit: 1.4, speed: [0, 0.3] });
      fx.emitter({ count: 30, kind: 'spark', shape: 'sphere', radius: 0.1, pos: [0, 1, 0], dir: [0, 1, 0], spread: 1.6, speed: [1.5, 4], life: [0.4, 0.9], gravity: [0, -7, 0], size: [0.06, 0.02], stretch: 1.2, ramp: [[0, '#fff'], [0.4, '#ffc040'], [1, '#a40', 0]], intensity: 3, delay: 0.1, bounce: 0.4 });
    } },

  /* ------------------------------------------------------------------ disintegrate */
  { id: 'spawn/disintegrate', name: 'Disintegrate', category: 'spawn', loop: false, duration: 3.4, body: true, stage: { sky: 'dark', view: VIEW, bloom: 0.55 },
    build(fx) {
      fx.on((t) => {
        const fl = Math.exp(-Math.max(0, t - 0.15) * 7) * sm(0, 0.15, t); const d = sm(0.35, 2.7, t);
        fx.body.set({ dissolve: t < 0.3 ? -1 : d, dDir: -1, edge: '#9fe4ff', edgeW: 0.07, edgeInt: 4, tint: '#cfe8ff', tintAmt: fl * 0.9, rimAmt: 0.8, rim: '#7fd0ff', glow: fl });
      });
      fx.flash(0.12, 0.25, '#dff', 0.5);
      fx.light({ color: '#8fd4ff', intensity: 55, pos: [0.6, 1.3, 0.4], range: 7, t0: 0.1, dur: 3, fade: [0.1, 1.0], flicker: 0.1 });
      fx.emitter({ count: 220, kind: 'soft', shape: 'box', shapeSize: [0.22, 0.85, 0.16], pos: [0, 0.95, 0], dir: [0.3, 1, 0.1], spread: 0.9, speed: [0.15, 0.7], life: [1.0, 2.2], size: [0.035, 0.008], ramp: [[0, '#ffffff'], [0.3, '#9fe4ff'], [1, '#2060c0', 0]], intensity: 2.2, delay: 0.3, emit: 2.4, turb: [0.5, 1.2], gravity: [0.2, 0.55, 0.1], drag: 0.4 });
      fx.emitter({ count: 60, kind: 'glint', shape: 'box', shapeSize: [0.2, 0.85, 0.15], pos: [0, 0.95, 0], size: [0.13, 0.03], life: [0.4, 0.9], ramp: [[0, '#fff'], [1, '#8cf', 0]], intensity: 3, delay: 0.4, emit: 2.4, speed: [0, 0.2] });
      fx.decal({ kind: 'glow', r: [1.0, 1.0], ramp: [[0, '#000'], [0.5, '#1a4a80'], [1, '#9fe4ff']], intensity: 0.7, alpha: 0.6, t0: 0.2, dur: 3, fade: [0.5, 1.2] });
    } },

  /* ------------------------------------------------------------------ dissolve burn */
  { id: 'spawn/dissolve-burn', name: 'Dissolve burn', category: 'spawn', loop: false, duration: 3.6, body: true, stage: { sky: 'night', view: VIEW, bloom: 0.5 },
    build(fx) {
      fx.on((t) => {
        const d = sm(0.2, 2.9, t); fx.body.set({ dissolve: t < 0.15 ? -1 : d, dDir: 1, edge: '#ff5a10', edgeW: 0.08, edgeInt: 5.5, tint: '#111', tintAmt: sm(0.2, 1.2, t) * 0.45 * (1 - d), rimAmt: 0.9 * (1 - d), rim: '#ff6a20' });
        fx.lightY = dissY(d, 1);
      });
      const L = fx.light({ color: '#ff7a30', intensity: 55, pos: [0, 0.6, 0.4], range: 8, flicker: 0.35, t0: 0.1, dur: 3.2, fade: [0.2, 0.8] });
      fx.on((t) => { L.l.position.y = 0.2 + clamp(dissY(sm(0.2, 2.9, t), 1), 0, 1.9) * 0.9; });
      fx.decal({ kind: 'scorch', r: [0.9, 1.0], t0: 0.2, dur: 3.3, fade: [0.5, 1.0], heat: [1, 0], ramp: [[0, '#100'], [0.5, '#f40'], [1, '#fc8']] });
      fx.emitter({ count: 90, kind: 'flame', shape: 'box', shapeSize: [0.15, 0.1, 0.12], pos: [0, 0.2, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.3, 0.9], life: [0.5, 0.9], size: [0.3, 0.1], aspect: 1.8, ramp: fx.pal([[0, '#ffd890', 0.8], [0.3, '#ff7a20', 0.8], [0.7, '#b02808', 0.4], [1, '#200', 0]]), intensity: 0.5, t0: 0.2, delay: 0, emit: 2.8, follow: null, turb: [0.3, 2] });
      fx.emitter({ count: 120, kind: 'spark', shape: 'box', shapeSize: [0.2, 0.9, 0.15], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 0.8, speed: [0.4, 1.8], life: [0.8, 2.0], size: [0.05, 0.015], stretch: 0.6, ramp: [[0, '#fff0b0'], [0.35, '#ff8a20'], [1, '#400', 0]], intensity: 3.2, delay: 0.3, emit: 2.6, gravity: [0, 0.8, 0], turb: [0.5, 1.2], drag: 0.3 });
      fx.emitter({ count: 70, kind: 'smoke', blend: 'normal', lit: 1, shape: 'box', shapeSize: [0.2, 0.9, 0.15], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 0.4, speed: [0.3, 0.8], life: [1.5, 2.8], size: [0.3, 1.0], ramp: [[0, '#2a2420', 0], [0.2, '#3a332e', 0.4], [1, '#141210', 0]], delay: 0.3, emit: 2.6, turb: [0.4, 0.6], gravity: [0, 0.2, 0], order: -1 });
      fx.emitter({ count: 70, kind: 'dust', blend: 'normal', lit: 1, shape: 'box', shapeSize: [0.2, 0.9, 0.15], pos: [0, 0.95, 0], dir: [0, -1, 0], spread: 0.4, speed: [0.1, 0.5], life: [1.5, 2.6], size: [0.03, 0.02], ramp: [[0, '#555', 0.9], [1, '#222', 0]], delay: 0.4, emit: 2.4, gravity: [0.15, -0.3, 0.05], drag: 0.5, turb: [0.3, 1], floorFade: 1 });
    } },

  /* ------------------------------------------------------------------ egg hatch */
  { id: 'spawn/egg-hatch', name: 'Egg hatch', category: 'spawn', loop: false, duration: 3.1, stage: { sky: 'dusk', view: { pos: [0.9, 0.75, 1.6], target: [0, 0.22, 0], fov: 38 }, bloom: 0.5 },
    build(fx) {
      const uCrack = { value: 0 };
      const mat = eggMat(fx, uCrack), prof = eggProfile();
      const cut = 20; const bot = new THREE.Mesh(new THREE.LatheGeometry(prof.slice(0, cut + 1).concat([new THREE.Vector2(0.0005, prof[cut].y)]), 40), mat);
      const top = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(0.0005, prof[cut].y)].concat(prof.slice(cut)), 40), mat);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 0.65, 0.3), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })); inner.position.y = 0.3;
      const grp = new THREE.Group(); const topG = new THREE.Group(); topG.position.y = prof[cut].y; top.position.y = -prof[cut].y; topG.add(top); grp.add(bot, topG, inner);
      const nest = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24), new THREE.MeshStandardMaterial({ color: '#6b4a2a', roughness: 1 })); nest.rotation.x = Math.PI / 2; nest.position.y = 0.03; nest.scale.set(1.15, 1.15, 1.6); grp.add(nest);
      fx.mesh(grp, (t) => {
        const pre = t < 1.85; uCrack.value = pre ? sm(0.5, 1.8, t) * 1.2 : 1.3;
        const wob = pre ? Math.sin(t * 22) * 0.1 * sm(0.3, 0.9, t) * (1 - sm(1.4, 1.8, t) * 0.4) * (0.5 + 0.5 * Math.sin(t * 5.3)) : 0; // rocking
        grp.rotation.z = wob * 0.7; grp.rotation.x = Math.cos(t * 17) * wob * 0.35; grp.position.y = 0;
        const b = clamp((t - 1.85) / 0.9); const e = 1 - Math.pow(1 - b, 2);
        topG.position.set(e * 0.25, prof[cut].y + (e * 0.35 - 3.2 * b * b * 0.35) , e * 0.05); topG.rotation.set(e * 0.4, 0, -e * 1.6); topG.visible = b < 0.95;
        bot.visible = true; bot.scale.setScalar(1);
        inner.visible = t > 1.75 && t < 2.55; inner.scale.setScalar(0.9 + sm(1.7, 1.85, t) * 0.2 + (t > 1.85 ? 0.3 * Math.exp(-(t - 1.85) * 5) : 0)); inner.material.color.setScalar(1).multiplyScalar(0).add(new THREE.Color(0.9, 0.65, 0.3).multiplyScalar(t > 2.3 ? Math.max(0, 1 - (t - 2.3) / 0.7) : 1));
      }, { dur: 99 });
      fx.light({ color: '#ffd890', intensity: 6, pos: [0, 0.3, 0.1], range: 4, env: (t) => sm(1.0, 1.8, t) * 0.8, t0: 0, dur: 1.9 });
      fx.light({ color: '#ffe6a8', intensity: 30, pos: [0, 0.45, 0.2], range: 8, t0: 1.85, dur: 1.25, fade: [0.03, 0.9] });
      fx.flash(1.85, 0.25, '#fff2c0', 0.15); fx.shake(1.85, 0.4, 0.03);
      fx.beam({ pos: [0, 0.3, 0], height: 1.6, r: [0.08, 0.22], intensity: 0.3, t0: 1.85, dur: 1.0, fade: [0.03, 0.8], ramp: [[0, '#fff6d0'], [0.6, '#ffd070'], [1, '#c06000']], noise: 0.4 });
      fx.ring({ t0: 1.85, dur: 0.7, r: [0.1, 1.2], width: [0.15, 0.04], normal: 'up', intensity: 0.8, ramp: [[0, '#fff'], [1, '#fc7']] });
      fx.emitter({ count: 28, kind: 'shard', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.1, pos: [0, 0.32, 0], dir: [0, 1, 0], radial: 1, spread: 1.4, speed: [1.2, 3.2], life: [0.9, 1.6], size: [0.04, 0.03], gravity: [0, -9, 0], bounce: 0.3, rot: 8, ramp: [[0, '#efe3c8'], [1, '#e2d3b0', 1]], delay: 1.85 });
      fx.emitter({ count: 70, kind: 'soft', shape: 'sphere', radius: 0.12, pos: [0, 0.32, 0], dir: [0, 1, 0], spread: 1.5, speed: [0.5, 2.4], life: [0.7, 1.6], size: [0.03, 0.008], gravity: [0, 0.3, 0], drag: 0.8, ramp: [[0, '#fff'], [0.4, '#ffd070'], [1, '#c60', 0]], intensity: 1.0, delay: 1.85, turb: [0.3, 1] });
      fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', lit: 1, shape: 'disc', radius: 0.2, pos: [0, 0.2, 0], dir: [0, 1, 0], radial: 0.8, spread: 1.2, speed: [0.3, 1], life: [0.8, 1.5], size: [0.3, 0.7], ramp: [[0, '#fff2d0', 0.5], [1, '#a89868', 0]], delay: 1.85, order: -1, drag: 1.5 });
      fx.emitter({ count: 14, kind: 'glint', shape: 'sphere', radius: 0.25, pos: [0, 0.3, 0], size: [0.18, 0.04], life: [0.3, 0.6], ramp: [[0, '#fff'], [1, '#fd8', 0]], intensity: 2, delay: 1.9, emit: 0.8, speed: [0, 0.2] });
    } },

  /* ------------------------------------------------------------------ poof */
  { id: 'spawn/poof', name: 'Poof', category: 'spawn', loop: false, duration: 1.6, body: true, stage: { sky: 'day', view: { pos: [2.2, 1.4, 3.2], target: [0, 0.9, 0], fov: 40 } },
    build(fx) {
      fx.on((t) => { fx.body.set({ alpha: t < 0.12 ? 1 : 0, tint: '#fff', tintAmt: t < 0.12 ? sm(0, 0.12, t) : 0 }); });
      fx.flash(0.1, 0.18, '#fff', 0.5);
      fx.emitter({ count: 34, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.35, pos: [0, 0.9, 0], radial: 1, spread: 1.6, speed: [0.6, 2.2], life: [0.7, 1.2], size: [0.7, 1.6], drag: 3, ramp: [[0, '#ffffff', 0.95], [0.35, '#e8e8f2', 0.85], [1, '#b0b4c8', 0]], delay: 0.1, order: -1, rot: 1.2, gravity: [0, 0.3, 0] });
      fx.emitter({ count: 12, kind: 'glint', shape: 'sphere', radius: 0.3, pos: [0, 0.95, 0], radial: 1, speed: [1.4, 2.6], life: [0.7, 1.1], size: [0.34, 0.12], rot: 7, drag: 1.3, gravity: [0, -1, 0], ramp: [[0, '#fff6a0'], [0.6, '#ffd040'], [1, '#f80', 0]], intensity: 2.5, delay: 0.1 });
      fx.emitter({ count: 14, kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 0.3, pos: [0, 0.1, 0], radial: 1, speed: [0.8, 1.8], life: [0.6, 1.0], size: [0.4, 0.9], drag: 2.4, ramp: [[0, '#f4f4f8', 0.8], [1, '#c8cadc', 0]], delay: 0.1 });
      fx.ring({ t0: 0.1, dur: 0.5, r: [0.2, 1.4], width: [0.2, 0.04], normal: 'cam', pos: [0, 0.95, 0], intensity: 0.9, ramp: [[0, '#fff'], [1, '#cfd8ff']] });
    } },

  /* ------------------------------------------------------------------ respawn beam */
  { id: 'spawn/respawn-beam', name: 'Respawn beam', category: 'spawn', loop: false, duration: 2.5, body: true, stage: { sky: 'dark', view: { pos: [2.6, 1.4, 3.8], target: [0, 1.0, 0], fov: 40 }, bloom: 0.6 },
    build(fx) {
      fx.on((t) => {
        const d = 1 - sm(0.4, 1.8, t); const sc = dissY(d, -1);
        fx.body.set({ dissolve: t < 0.3 ? 1 : d, dDir: -1, edge: '#aef4ff', edgeW: 0.06, edgeInt: 5, holo: (1 - sm(1.6, 2.2, t)) * 0.45, scanCol: '#7fe8ff', scan: t > 0.4 && t < 1.9 ? sc : -10, tint: '#9fe8ff', tintAmt: Math.max(0, 1 - sm(1.8, 2.4, t)) * 0.25, rimAmt: 0.6 * (1 - sm(1.8, 2.4, t)), rim: '#7fe8ff' });
      });
      fx.beam({ pos: [0, 0, 0], height: 6, r: [0.42, 0.42], intensity: 0.3, t0: 0.05, dur: 2.2, fade: [0.15, 0.7], ramp: [[0, '#7fe8ff'], [0.5, '#bff4ff'], [1, '#e8ffff']], noise: 0.5, speed: 3, edge: 2 });
      fx.beam({ pos: [0, 0, 0], height: 6, r: [0.14, 0.14], intensity: 0.6, t0: 0.05, dur: 2.0, fade: [0.15, 0.6], ramp: [[0, '#dffcff'], [1, '#fff']], noise: 0.2 });
      fx.decal({ kind: 'rune', r: [1.1, 1.1], glyphs: 14, spin: 0.6, reveal: 0.5, ramp: [[0, '#2a8ab0'], [1, '#bff4ff']], intensity: 1.6, t0: 0, dur: 2.5, fade: [0.2, 0.8] });
      fx.ring({ t0: 0.05, dur: 0.8, r: [0.3, 2.2], width: [0.25, 0.05], normal: 'up', intensity: 1.2, ramp: [[0, '#fff'], [1, '#6fd8ff']] });
      fx.ring({ t0: 1.8, dur: 0.7, r: [0.3, 1.9], width: [0.2, 0.04], normal: 'up', intensity: 1.0, ramp: [[0, '#fff'], [1, '#6fd8ff']] });
      fx.flash(1.85, 0.3, '#dff', 0.3);
      fx.light({ color: '#8fe8ff', intensity: 110, pos: [0.4, 1.4, 0.4], range: 9, t0: 0.05, dur: 2.3, fade: [0.2, 0.7], flicker: 0.08 });
      fx.emitter({ count: 120, kind: 'soft', shape: 'ring', radius: 0.9, radiusIn: 0.4, pos: [0, 0, 0], dir: [0, 1, 0], spread: 0.1, speed: [1.5, 3.5], life: [0.8, 1.5], size: [0.03, 0.01], ramp: [[0, '#fff'], [0.4, '#8fe8ff'], [1, '#2080c0', 0]], intensity: 2.4, delay: 0.1, emit: 1.8, swirl: 2 });
      fx.emitter({ count: 20, kind: 'glint', shape: 'disc', radius: 0.5, pos: [0, 0.2, 0], size: [0.2, 0.04], life: [0.3, 0.7], ramp: [[0, '#fff'], [1, '#8ef', 0]], intensity: 3, delay: 0.5, emit: 1.6, speed: [0, 0.4], dir: [0, 1, 0] });
    } },

  /* ------------------------------------------------------------------ shatter death */
  { id: 'spawn/shatter-death', name: 'Shatter death', category: 'spawn', loop: false, duration: 3.3, body: true, stage: { sky: 'dusk', view: VIEW, bloom: 0.4 },
    build(fx) {
      const T = 1.45;
      fx.on((t) => {
        const f = sm(0.05, T - 0.1, t), pre = t < T;
        fx.body.set({ frost: pre ? f : 1, alpha: pre ? 1 : 0, rim: '#bfe6ff', rimAmt: f * 1.0, tint: '#bfe0ff', tintAmt: f * 0.18 });
      });
      fx.hit(T, { shake: 0.4, amp: 0.05 });
      fx.flash(T, 0.2, '#dff4ff', 0.5);
      fx.light({ color: '#9fd8ff', intensity: 40, pos: [0.5, 1.4, 0.6], range: 7, t0: 0.1, dur: 3, fade: [0.5, 1.2], env: (t) => (t > T ? 1.8 * Math.exp(-(t - T) * 2) + 0.2 : 0.6) });
      fx.emitter({ count: 110, kind: 'shard', blend: 'normal', lit: 1, shape: 'box', shapeSize: [0.2, 0.85, 0.15], pos: [0, 0.95, 0], dir: [0, 0.4, 0], radial: 1, spread: 1.5, speed: [1, 4.2], life: [1.2, 2.0], size: [0.1, 0.07], gravity: [0, -9, 0], bounce: 0.35, rot: 6, ramp: [[0, '#bfe6ff'], [0.7, '#9ccff2'], [1, '#9ccff2', 0.9]], delay: T });
      fx.emitter({ count: 50, kind: 'flake', shape: 'box', shapeSize: [0.25, 0.85, 0.2], pos: [0, 0.95, 0], radial: 1, speed: [0.5, 2], life: [1.0, 2.2], size: [0.06, 0.04], gravity: [0, -0.8, 0], drag: 1.2, rot: 3, ramp: [[0, '#fff'], [1, '#aadcff', 0]], intensity: 1.5, delay: T, turb: [0.4, 1] });
      fx.emitter({ count: 60, kind: 'glint', shape: 'box', shapeSize: [0.2, 0.85, 0.15], pos: [0, 0.95, 0], size: [0.2, 0.03], life: [0.3, 0.9], ramp: [[0, '#fff'], [1, '#8cf', 0]], intensity: 4, delay: T, emit: 0.4, speed: [0, 0.6], radial: 1 });
      fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', lit: 1, shape: 'box', shapeSize: [0.2, 0.7, 0.15], pos: [0, 0.9, 0], radial: 1, spread: 1, speed: [0.3, 1.3], life: [1.0, 1.8], size: [0.5, 1.3], ramp: [[0, '#e8f6ff', 0.55], [1, '#a9cde8', 0]], drag: 1.4, delay: T, order: -1, gravity: [0, -0.15, 0] });
      fx.decal({ kind: 'frost', r: [0.3, 1.5], t0: T, dur: 1.8, fade: [0.05, 1.0], ramp: [[0, '#6fb0e0'], [1, '#e8f8ff']], intensity: 1, cells: 5 });
      fx.ring({ t0: T, dur: 0.6, r: [0.3, 2.2], width: [0.3, 0.05], normal: 'up', intensity: 1.2, ramp: [[0, '#fff'], [1, '#8ccaff']] });
    } },

  /* ------------------------------------------------------------------ soul rise */
  { id: 'spawn/soul-rise', name: 'Soul rise', category: 'spawn', loop: false, duration: 3.2, body: true, stage: { sky: 'dark', view: { pos: [3.2, 1.9, 5.2], target: [0, 1.35, 0], fov: 44 }, bloom: 0.5 },
    build(fx) {
      const gh = ghost(); gh.u.uHolo.value = 1; gh.u.uScanCol.value.set('#cfe8ff');
      fx.mesh(gh, (t) => {
        const u = sm(0.3, 2.6, t); gh.position.set(0.0, u * 1.5, 0); gh.rotation.y = u * 0.9; gh.visible = t > 0.25;
        gh.u.uHolo.value = 1; gh.u.uAlpha.value = sm(0.25, 0.7, t) * (1 - sm(1.9, 2.9, t)); gh.u.uTime.value = t;
      }, { dur: 99 });
      fx.on((t) => { fx.body.set({ tint: '#202530', tintAmt: sm(0.1, 0.6, t) * 0.75, alpha: 1 - sm(2.0, 3.0, t) * 0.35 }); });
      fx.light({ color: '#bcd8ff', intensity: 55, pos: [0.3, 1.5, 0.4], range: 8, env: (t) => sm(0.2, 0.9, t) * (1 - sm(2.4, 3.2, t) * 0.7), t0: 0, dur: 3.2, flicker: 0.12 });
      fx.emitter({ count: 120, kind: 'soft', shape: 'box', shapeSize: [0.2, 0.85, 0.15], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.4, 1.0], life: [1.0, 2.0], size: [0.03, 0.008], ramp: [[0, '#fff'], [0.4, '#bcd8ff'], [1, '#6a8ae0', 0]], intensity: 2.2, delay: 0.3, emit: 2.2, gravity: [0, 0.8, 0], turb: [0.4, 1], drag: 0.3 });
      fx.emitter({ count: 16, kind: 'glint', shape: 'point', pos: [0, 3.0, 0], size: [0.5, 0.1], life: [0.6, 1.0], ramp: [[0, '#fff'], [1, '#bdf', 0]], intensity: 3, delay: 2.4, emit: 0.6 });
      fx.emitter({ count: 80, kind: 'soft', shape: 'sphere', radius: 0.3, pos: [0, 2.6, 0], radial: 1, speed: [0.2, 1.0], life: [0.8, 1.5], size: [0.04, 0.01], ramp: [[0, '#fff'], [1, '#9cf', 0]], intensity: 3, delay: 2.3, emit: 0.4, drag: 0.8, gravity: [0, 0.6, 0] });
      fx.decal({ kind: 'glow', r: [0.8, 0.8], ramp: [[0, '#000'], [0.6, '#2a3a70'], [1, '#bcd8ff']], intensity: 0.6, alpha: 0.5, fade: [0.4, 1.5] });
    } },

  /* ------------------------------------------------------------------ spawn portal */
  { id: 'spawn/spawn-portal', name: 'Spawn portal', category: 'spawn', loop: false, duration: 3.8, stage: { sky: 'dark', view: { pos: [2.4, 1.7, 3.6], target: [0, 0.5, 0], fov: 40 }, bloom: 0.6 },
    build(fx) {
      const orb = fx.orb({ kind: 'void', r: [0.05, 1.25], ease: 'out', pos: [0, 0.06, 0], t0: 0.1, dur: 3.1, fade: [0.2, 0.0], noise: 1.5, scroll: 1.2, disp: 0.3, intensity: 2.2, power: 1.4, ramp: [[0, '#000'], [0.5, '#4b108a'], [0.85, '#c070ff'], [1, '#f0d0ff']] });
      const orb2 = fx.orb({ kind: 'void', r: [1.25, 0.0], pos: [0, 0.06, 0], t0: 3.15, dur: 0.45, fade: [0.0, 0.1], noise: 1.5, disp: 0.3, intensity: 2.2, power: 1.4, ramp: [[0, '#000'], [0.5, '#4b108a'], [0.85, '#c070ff'], [1, '#f0d0ff']] });
      fx.on(() => { orb.obj.scale.y *= 0.07; orb2.obj.scale.y *= 0.07; });
      fx.decal({ kind: 'rings', r: [1.5, 1.5], t0: 0, dur: 3.2, fade: [0.2, 0.4], ramp: [[0, '#5a1aa0'], [1, '#e0b0ff']], intensity: 1.6, spin: 0.5 });
      fx.decal({ kind: 'rings', r: [1.5, 0], t0: 3.2, dur: 0.5, fade: [0, 0.1], growSpeed: 1, ramp: [[0, '#5a1aa0'], [1, '#e0b0ff']], intensity: 1.6 });
      fx.decal({ kind: 'glow', r: [2.6, 2.6], t0: 0, dur: 3.6, fade: [0.5, 0.5], ramp: [[0, '#000'], [0.5, '#3a0a70'], [1, '#a050f0']], intensity: 0.8, alpha: 0.7 });
      fx.beam({ pos: [0, 0, 0], height: 1.8, r: [0.9, 0.4], intensity: 0.5, t0: 0.4, dur: 2.7, fade: [0.5, 0.5], ramp: [[0, '#8030d0'], [1, '#d8a0ff']], noise: 0.9 });
      fx.ring({ t0: 0.1, dur: 0.7, r: [0.2, 2.8], width: [0.3, 0.05], normal: 'up', intensity: 1.2, ramp: [[0, '#fff'], [1, '#a050f0']] });
      fx.ring({ t0: 3.15, dur: 0.6, r: [2.2, 0.2], width: [0.1, 0.05], normal: 'up', intensity: 1.2, ramp: [[0, '#fff'], [1, '#a050f0']] });
      fx.flash(3.2, 0.25, '#e0b0ff', 0.35); fx.shake(0.1, 0.4, 0.02); fx.shake(3.15, 0.3, 0.03);
      fx.light({ color: '#a050ff', intensity: 85, pos: [0, 0.8, 0], range: 8, t0: 0, dur: 3.8, fade: [0.3, 0.4], flicker: 0.15, env: (t) => (t > 3.15 ? Math.max(0, 1 - (t - 3.15) / 0.5) : 1) });
      fx.emitter({ count: 90, kind: 'soft', shape: 'disc', radius: 0.9, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.35, speed: [0.8, 2.4], life: [1.0, 1.8], size: [0.1, 0.02], aspect: 1, ramp: [[0, '#fff'], [0.3, '#e0b0ff'], [1, '#6020c0', 0]], intensity: 1.8, delay: 0.8, emit: 2.2, swirl: 3, turb: [0.5, 1], t1: 3.3 });
      fx.emitter({ count: 70, kind: 'spark', shape: 'disc', radius: 0.8, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.6, speed: [1.5, 4], life: [0.6, 1.3], gravity: [0, -3, 0], size: [0.05, 0.015], stretch: 1, ramp: [[0, '#fff'], [0.4, '#d890ff'], [1, '#60c', 0]], intensity: 3, delay: 0.9, emit: 2.2, bounce: 0.3 });
      fx.emitter({ count: 50, kind: 'soft', shape: 'ring', radius: 1.8, radiusIn: 1.3, pos: [0, 0.05, 0], dir: [0, 0.1, 0], speed: [0.2, 0.6], life: [0.8, 1.4], size: [0.05, 0.01], ramp: [[0, '#d8a0ff'], [1, '#60c', 0]], intensity: 2, delay: 0.2, emit: 2.8, swirl: -2, radial: -0.9, t1: 3.4, floorFade: 1 });
    } },

  /* ------------------------------------------------------------------ summon rise */
  { id: 'spawn/summon-rise', name: 'Summon rise', category: 'spawn', loop: false, duration: 4.6, stage: { sky: 'dark', view: { pos: [3.4, 1.9, 5.2], target: [0, 1.15, 0], fov: 42 }, bloom: 0.5 },
    build(fx) {
      const br = bruteGroup(); const eyes = []; br.traverse((o) => { if (o.userData.eye) eyes.push(o); });
      fx.mesh(br, (t) => {
        const u = sm(1.2, 3.4, t); br.position.y = -2.7 + u * 2.7; br.visible = t > 1.1; br.rotation.y = 0.2; const s = 1 + (u >= 1 ? 0 : 0); br.scale.setScalar(s);
        br.rotation.x = 0.1 * Math.sin(u * 9) * (1 - u); br.position.x = 0.02 * Math.sin(t * 40) * (1 - u);
      }, { dur: 99 });
      fx.decal({ kind: 'rune', r: [2.0, 2.0], glyphs: 18, poly: 6, spin: 0.35, reveal: 1.0, ramp: [[0, '#701010'], [0.5, '#e03010'], [1, '#ffb060']], intensity: 1.1, t0: 0, dur: 4.6, fade: [0.1, 1.0] });
      fx.decal({ kind: 'cracks', r: [2.6, 2.8], cells: 4, heat: [1, 0.2], reveal: 0.6, t0: 1.1, dur: 3.5, fade: [0.1, 1.5], ramp: [[0, '#300'], [0.5, '#f40'], [1, '#fc8']] });
      fx.decal({ kind: 'scorch', r: [1.8, 2.0], t0: 1.1, dur: 3.5, fade: [0.5, 1.5] });
      fx.flash(1.15, 0.25, '#ff7a30', 0.15); fx.shake(1.15, 2.2, 0.05);
      fx.ring({ t0: 1.15, dur: 0.9, r: [0.3, 5], width: [0.4, 0.08], normal: 'up', intensity: 1.2, ramp: [[0, '#fff'], [0.4, '#fa6'], [1, '#a30']] });
      fx.beam({ pos: [0, 0, 0], height: 5, r: [0.7, 0.9], intensity: 0.18, t0: 1.1, dur: 2.0, fade: [0.05, 1.2], ramp: [[0, '#ff4a10'], [1, '#ffb060']], noise: 1.2 });
      fx.light({ color: '#ff4a20', intensity: 55, pos: [0.4, 1.0, 0.6], range: 10, flicker: 0.2, env: (t) => sm(0.3, 1.2, t) * (1 - sm(3.6, 4.6, t) * 0.8) });
      fx.light({ color: '#ff9a50', intensity: 45, pos: [0, 0.6, 0.8], range: 9, t0: 1.1, dur: 1.2, fade: [0.02, 0.9] });
      fx.emitter({ count: 70, kind: 'soft', shape: 'ring', radius: 1.9, radiusIn: 1.2, pos: [0, 0, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.5, 1.8], life: [0.8, 1.6], size: [0.04, 0.01], ramp: [[0, '#ffe0a0'], [0.4, '#ff6020'], [1, '#600', 0]], intensity: 1.5, delay: 0.3, emit: 3, swirl: 1 });
      fx.emitter({ count: 50, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.6, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.9, speed: [2, 6], life: [1.0, 1.8], size: [0.12, 0.08], gravity: [0, -9.8, 0], bounce: 0.3, rot: 5, ramp: [[0, '#4a3830'], [1, '#4a3830', 1]], delay: 1.15, emit: 0.6 });
      fx.emitter({ count: 50, kind: 'dust', blend: 'normal', lit: 1, shape: 'disc', radius: 0.9, pos: [0, 0.1, 0], dir: [0, 1, 0], radial: 1, spread: 1.3, speed: [0.6, 2.0], life: [1.5, 2.8], size: [0.5, 1.5], drag: 1.2, ramp: [[0, '#6a5446', 0], [0.2, '#5a4a3e', 0.5], [1, '#2a2420', 0]], delay: 1.15, emit: 1.8, order: -1, gravity: [0, 0.15, 0] });
      fx.emitter({ count: 60, kind: 'spark', shape: 'disc', radius: 0.5, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.8, speed: [2, 6], life: [0.6, 1.4], gravity: [0, -7, 0], size: [0.05, 0.015], stretch: 1.2, ramp: [[0, '#fff0b0'], [0.4, '#ff7a20'], [1, '#400', 0]], intensity: 2.5, delay: 1.2, emit: 1, bounce: 0.35 });
    } },
];

function smooth01(x) { return x * x * (3 - 2 * x); }
