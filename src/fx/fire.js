import * as THREE from 'three';
import { ENV } from '../core/feel.js';
import { spiral, band } from '../core/meshes.js';
import { burst } from './_aaa.js';
const stack = (fx) => { // crossed logs
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#3a281b', roughness: 0.95 });
  for (let i = 0; i < 5; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.95, 10), m); const a = (i / 5) * Math.PI * 2; l.position.set(Math.cos(a) * 0.18, 0.1, Math.sin(a) * 0.18); l.rotation.set(Math.PI / 2 - 0.35, 0, -a + Math.PI / 2); l.rotation.order = 'YXZ'; l.rotation.y = a; l.rotation.x = 1.2; g.add(l); }
  return g;
};
const FIRE = [[0, '#fff3dc', 1], [0.15, '#ffc27a', 1], [0.35, '#ff9a32', 0.9], [0.6, '#e2500f', 0.6], [0.85, '#5a1a08', 0.25], [1, '#140604', 0]]; // blackbody: ~3500K core -> 2500K -> 1500K -> soot
const SMOKE = [[0, '#2a2622', 0], [0.15, '#403a34', 0.35], [1, '#15130f', 0]];
const mat = (c, r = 0.9, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const smoke = (fx, o) => fx.emitter({ kind: 'smoke', blend: 'normal', lit: 1, order: -1, ramp: SMOKE, ...o });
const COLD = [[0, '#e8ffff', 1], [0.25, '#7fe8ff', 0.9], [0.65, '#2a6cff', 0.5], [1, '#102', 0]];

export default [
  { id: 'fire/campfire', name: 'Campfire', category: 'fire', loop: true, duration: 3, stage: { sky: 'night', view: { pos: [2.6, 1.5, 3.2], target: [0, 0.55, 0] } },
    build(fx) {
      fx.mesh(stack(fx), null, { dur: 99 });
      fx.decal({ kind: 'glow', r: [1.2, 1.2], ramp: [[0, '#000'], [0.35, '#8a1a00'], [1, '#ff8a20']], intensity: 0.5, alpha: 0.6, y: 0.006 });
      fx.decal({ kind: 'scorch', r: [1.1, 1.1], ramp: [[0, '#0a0604'], [1, '#050302']], intensity: 1, alpha: 0.8, y: 0.005 });
      fx.light({ glow: 0.25, color: '#ff8a2a', intensity: 16, pos: [0, 0.8, 0], flicker: 0.15, rate: 10, range: 6 });
      fx.heat({ pos: [0, 0.35, 0], size: [0.9, 1.8] });
      fx.orb({ r: [0.12, 0.12], kind: 'fire', intensity: 2, pos: [0, 0.14, 0], ramp: [[0, '#200'], [0.3, '#c21'], [0.6, '#f70'], [0.85, '#fc4'], [1, '#fff']], noise: 1.8, scroll: 1, disp: 0.55 }); // only HDR peak: flame base
      fx.emitter({ count: 24, kind: 'flame', shape: 'disc', radius: 0.26, dir: [0, 1, 0], spread: 0.1, speed: [0.25, 0.6], life: [1, 1], size: [0.7, 0.2], sizeVar: 0.4, aspect: 1.9, ramp: fx.pal(FIRE), intensity: 0.5, turb: [0.2, 1.4], pos: [0, 0.12, 0] }); // life 1 s = 3 cycles per loop
      fx.emitter({ count: 6, kind: 'soft', shape: 'disc', radius: 0.15, dir: [0, 1, 0], speed: [0, 0.05], life: [1.5, 1.5], size: [0.9, 0.9], ramp: [[0, '#ff7a20', 0], [0.5, '#ff6a10', 0.35], [1, '#ff7a20', 0]], intensity: 0.5, pos: [0, 0.35, 0] });
      fx.emitter({ count: 30, kind: 'spark', shape: 'disc', radius: 0.2, dir: [0, 1, 0], spread: 0.6, speed: [0.8, 2.4], life: [1.2, 2.8], gravity: [0, 0.4, 0], drag: 0.25, size: [0.06, 0.02], stretch: 0.6, ramp: [[0, '#fff6c0'], [0.4, '#ff8a20'], [1, '#400', 0]], intensity: 1.5, turb: [0.4, 1], pos: [0, 0.3, 0] });
      smoke(fx, { count: 26, shape: 'disc', radius: 0.2, dir: [0, 1, 0], spread: 0.2, speed: [0.5, 0.9], life: [2, 3], size: [0.4, 1.7], turb: [0.3, 0.6], gravity: [0, 0.1, 0], pos: [0, 0.9, 0] });
    } },

  { id: 'fire/brazier', name: 'Brazier', category: 'fire', loop: true, duration: 3, stage: { sky: 'night', view: { pos: [2.4, 1.5, 3.0], target: [0, 0.7, 0] } },
    build(fx) {
      const g = new THREE.Group(), iron = mat('#1d1b1a', 0.5, 0.85);
      const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0.0], [0.18, 0.02], [0.3, 0.12], [0.42, 0.26], [0.45, 0.3], [0.41, 0.3], [0.28, 0.2], [0.0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 28), iron); bowl.position.y = 0.5; bowl.material.side = THREE.DoubleSide; g.add(bowl);
      for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.62, 8), iron); l.position.set(Math.cos(a) * 0.16, 0.26, Math.sin(a) * 0.16); l.rotation.set(Math.sin(a) * 0.28, 0, -Math.cos(a) * 0.28); g.add(l); }
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.435, 0.018, 8, 36), iron); rim.rotation.x = Math.PI / 2; rim.position.y = 0.8; g.add(rim);
      const coals = new THREE.Mesh(new THREE.CircleGeometry(0.38, 24), new THREE.MeshBasicMaterial({ color: '#ff5a10' })); coals.rotation.x = -Math.PI / 2; coals.position.y = 0.72; g.add(coals);
      fx.mesh(g, null, { dur: 99 });
      fx.decal({ kind: 'glow', r: [1.6, 1.6], ramp: [[0, '#000'], [0.4, '#6a1400'], [1, '#ff7a20']], intensity: 1, alpha: 0.7, y: 0.006 });
      fx.light({ glow: 0.4, color: '#ff8228', intensity: 25, pos: [0, 1.2, 0], flicker: 0.3, range: 11 });
      fx.heat({ pos: [0, 0.8, 0], size: [1.0, 2.0] });
      fx.emitter({ count: 22, kind: 'soft', shape: 'disc', radius: 0.33, dir: [0, 1, 0], spread: 0.05, speed: [0.05, 0.2], life: [0.5, 1.2], size: [0.18, 0.1], ramp: [[0, '#ffb040', 0], [0.3, '#ff6a10', 0.8], [1, '#400', 0]], intensity: 1.2, pos: [0, 0.74, 0], turb: [0.1, 2] });
      fx.emitter({ count: 40, kind: 'flame', shape: 'disc', radius: 0.32, dir: [0, 1, 0], spread: 0.12, speed: [0.5, 1.0], life: [0.7, 1.3], size: [0.75, 0.25], aspect: 2.0, ramp: fx.pal(FIRE), intensity: 0.55, turb: [0.25, 1.5], pos: [0, 0.76, 0] });
      fx.emitter({ count: 60, kind: 'spark', shape: 'disc', radius: 0.3, dir: [0, 1, 0], spread: 0.7, speed: [1, 3], life: [1.2, 2.8], gravity: [0, 0.5, 0], drag: 0.25, size: [0.06, 0.02], stretch: 0.6, ramp: [[0, '#fff6c0'], [0.4, '#ff8a20'], [1, '#400', 0]], intensity: 1.5, turb: [0.5, 1], pos: [0, 0.8, 0] });
      smoke(fx, { count: 24, shape: 'disc', radius: 0.25, dir: [0, 1, 0], spread: 0.2, speed: [0.5, 0.9], life: [2, 3], size: [0.5, 1.8], turb: [0.3, 0.6], gravity: [0, 0.1, 0], pos: [0, 1.4, 0] });
    } },

  { id: 'fire/candle', name: 'Candle', category: 'fire', loop: true, duration: 4, stage: { sky: 'dark', bloom: 0.5, view: { pos: [0.55, 0.42, 0.75], target: [0, 0.27, 0], fov: 34 } },
    build(fx) {
      const g = new THREE.Group();
      const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.04, 0.22, 24), new THREE.MeshPhysicalMaterial({ color: '#efe3c6', roughness: 0.45, transmission: 0, sheen: 1, emissive: '#6a3a10', emissiveIntensity: 0.25 })); wax.position.y = 0.11; g.add(wax);
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.03, 6), mat('#111')); wick.position.y = 0.235; g.add(wick);
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.012, 32), mat('#8a6a2a', 0.35, 0.9)); dish.position.y = 0.006; g.add(dish);
      fx.mesh(g, null, { dur: 99 });
      fx.light({ glow: 0.4, color: '#ffa850', intensity: 4.5, pos: [0, 0.3, 0.04], flicker: 0.12, range: 3, rate: 5, norm: 4 });
      fx.emitter({ count: 7, kind: 'flame', shape: 'point', dir: [0, 1, 0], spread: 0.02, speed: [0.02, 0.05], life: [0.9, 1.3], size: [0.075, 0.03], aspect: 2.3, ramp: [[0, '#fffbe0', 1], [0.3, '#ffd070', 0.9], [0.7, '#ff7a20', 0.55], [1, '#401000', 0]], intensity: 0.9, turb: [0.006, 1.4], pos: [0, 0.245, 0] });
      fx.emitter({ count: 3, kind: 'flame', shape: 'point', dir: [0, 1, 0], spread: 0.0, speed: [0, 0.01], life: [1.3, 1.6], size: [0.045, 0.03], aspect: 1.4, ramp: [[0, '#8fb0ff', 0.9], [0.5, '#3a60ff', 0.5], [1, '#102', 0]], intensity: 0.8, pos: [0, 0.238, 0] });
      fx.emitter({ count: 4, kind: 'soft', shape: 'point', dir: [0, 1, 0], speed: 0, life: [4, 4], size: [0.22, 0.22], ramp: [[0, '#ffa040', 0.12], [1, '#ffa040', 0.12]], intensity: 0.7, pos: [0, 0.28, 0] });
      smoke(fx, { count: 8, shape: 'point', dir: [0, 1, 0], spread: 0.05, speed: [0.05, 0.1], life: [3, 4], size: [0.03, 0.14], ramp: [[0, '#888', 0], [0.2, '#999', 0.12], [1, '#555', 0]], turb: [0.04, 0.8], pos: [0, 0.34, 0] });
    } },

  { id: 'fire/fire-breath', name: 'Fire breath', category: 'fire', loop: true, duration: 1.5, body: true, stage: { sky: 'dusk', view: { pos: [3.2, 1.6, 4.6], target: [2.2, 1.2, 0] } },
    build(fx) {
      const o = [0.28, 1.55, 0];
      fx.light({ color: '#ff8a30', intensity: 25, pos: [2.2, 1.5, 0.6], flicker: 0.35, range: 12 });
      fx.emitter({ count: 70, kind: 'smoke', shape: 'point', dir: [1, 0.05, 0], spread: 0.17, speed: [4.5, 7], life: [0.55, 0.9], size: [0.2, 1.3], aspect: 1.3, ramp: fx.pal([[0, '#fff0b0', 1], [0.2, '#ffa830', 0.9], [0.6, '#d03a08', 0.5], [1, '#200', 0]]), intensity: 0.5, drag: 0.5, gravity: [0, 1.4, 0], turb: [0.8, 1.5], pos: o });
      fx.emitter({ count: 40, kind: 'spark', shape: 'point', dir: [1, 0.15, 0], spread: 0.4, speed: [3, 7], life: [0.5, 0.7], gravity: [0, -1, 0], size: [0.05, 0.02], stretch: 0.8, ramp: [[0, '#fff'], [0.4, '#ffa030'], [1, '#600', 0]], intensity: 3, turb: [0.5, 2], pos: o });
      smoke(fx, { count: 36, shape: 'point', dir: [1, 0.3, 0], spread: 0.35, speed: [2.5, 4], life: [1.0, 1.4], size: [0.5, 1.7], ramp: [[0, '#2a2622', 0], [0.5, '#3c342c', 0.3], [1, '#15130f', 0]], drag: 1.2, gravity: [0, 1.2, 0], turb: [0.6, 1], pos: [o[0] + 1.6, 1.55, 0] });
      fx.decal({ kind: 'glow', r: [2.2, 2.2], pos: [2.6, 0.01, 0], ramp: [[0, '#000'], [0.5, '#7a1c00'], [1, '#ff7a20']], intensity: 0.6, alpha: 0.5 });
    } },

  { id: 'fire/fire-ring', name: 'Fire ring', category: 'fire', tier: 2, loop: false, duration: 3.9, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [4.2, 3.0, 5.2], target: [0, 0.3, 0] } },
    build(fx) {
      fx.flash(0, 0.2, '#ffb060', 0.08);
      fx.light({ color: '#ff7a20', intensity: 60, pos: [0, 1.2, 0], range: 16, flicker: 0.3, fade: [0.1, 1.2], dur: 3.5 });
      fx.ring({ t0: 0, dur: 0.9, r: [0.3, 3.0], width: [0.15, 0.06], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#fff0b0'], [0.5, '#ff9a30'], [1, '#a30']] });
      fx.decal({ kind: 'scorch', t0: 0.3, dur: 3.6, r: [2.9, 2.9], fade: [0.4, 1.5], heat: [1, 0], ramp: [[0, '#1a1410'], [0.5, '#f40'], [1, '#fc8']] });
      fx.emitter({ count: 12, tex: 'explosion-fireball', sizePow: 0.5, shape: 'ring', radius: 0.4, radiusIn: 0.2, dir: [0, 0.15, 0], spread: 0.15, radial: 1, speed: [2.2, 3.4], life: [0.7, 1.0], size: [0.6, 0.9], aspect: 1.9, ramp: fx.pal(FIRE), intensity: 0.35, emit: 0.25, drag: 0.4, turb: [0.2, 2] });
      fx.emitter({ count: 300, kind: 'flame', shape: 'ring', radius: 3.0, radiusIn: 2.6, dir: [0, 1, 0], spread: 0.12, speed: [0.9, 1.6], life: [0.6, 1.1], size: [0.4, 0.18], aspect: 1.9, ramp: fx.pal(FIRE), intensity: 0.32, delay: 0.85, emit: 2.0, turb: [0.5, 2.2], floorFade: 0.05 });
      fx.emitter({ count: 160, kind: 'smoke', shape: 'ring', radius: 3.0, radiusIn: 2.6, dir: [0, 1, 0], spread: 0.15, speed: [0.6, 1.2], life: [0.6, 1.0], size: [0.5, 1.0], ramp: fx.pal(FIRE), intensity: 0.22, delay: 0.85, emit: 2.0, turb: [0.4, 1.5], floorFade: 0.05 }); // hot haze fills gaps between tongues
      fx.emitter({ count: 110, kind: 'spark', shape: 'ring', radius: 2.9, radiusIn: 2.5, dir: [0, 1, 0], spread: 0.5, speed: [1, 3.5], life: [1, 2.2], gravity: [0, 0.3, 0], drag: 0.3, size: [0.05, 0.02], stretch: 0.6, ramp: [[0, '#fff2b0'], [0.4, '#ff8a20'], [1, '#400', 0]], intensity: 1.5, delay: 0.9, emit: 2.3 });
      smoke(fx, { count: 50, shape: 'ring', radius: 2.9, radiusIn: 2.5, dir: [0, 1, 0], spread: 0.2, speed: [0.5, 1.0], life: [2, 3], size: [0.6, 1.8], delay: 1.0, emit: 2.0, turb: [0.3, 0.6], pos: [0, 0.7, 0] });
      burst(fx, [0, 0, 0], 0, { ramp: [[0, '#fff0b0'], [0.5, '#ff9a30'], [1, '#a30']], col: '#ff7a20', debris: false });
    } },

  { id: 'fire/fire-tornado', name: 'Fire tornado', category: 'fire', loop: true, duration: 2, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [3.6, 2.2, 4.8], target: [0, 1.5, 0] } },
    build(fx) {
      fx.light({ glow: 0.4, color: '#ff7a20', intensity: 25, pos: [0, 1.5, 0.3], range: 14, flicker: 0.3 });
      fx.heat({ pos: [0, 0.1, 0], size: [2, 4.2], strength: 0.007 });
      fx.decal({ kind: 'glow', r: [2.0, 2.0], ramp: [[0, '#000'], [0.4, '#6a1800'], [1, '#ff6a10']], intensity: 0.9, alpha: 0.7, y: 0.006 });
      [[0.15, 0.22], [0.6, 0.32], [1.1, 0.46], [1.6, 0.62], [2.15, 0.82], [2.7, 1.05]].forEach(([y, r], i) => fx.emitter({ count: 70, kind: 'flame', shape: 'ring', radius: r, radiusIn: r * 0.8, pos: [0, y, 0], dir: [0, 1, 0], spread: 0.15, speed: [0.5, 1.0], life: [0.5, 0.9], size: [0.3 - i * 0.02, 0.12], aspect: 1.7, ramp: fx.pal(FIRE), intensity: 0.32 - i * 0.025, swirl: 7 - i * 0.6, turb: [0.3, 2] }));
      fx.emitter({ count: 150, kind: 'smoke', shape: 'ring', radius: 0.25, radiusIn: 0.15, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.1, speed: [1.4, 2.0], life: [1.3, 1.8], size: [0.35, 1.1], ramp: fx.pal(FIRE), intensity: 0.2, swirl: 7, radial: 0.35, turb: [0.2, 1.2] }); // funnel body: rises, widens, spins
      fx.emitter({ count: 60, kind: 'flame', shape: 'disc', radius: 0.12, dir: [0, 1, 0], spread: 0.05, speed: [1.6, 2.4], life: [0.6, 1.0], size: [0.5, 0.25], aspect: 2.2, ramp: fx.pal(FIRE), intensity: 0.28, swirl: 8, turb: [0.1, 2] });
      fx.emitter({ count: 90, kind: 'spark', shape: 'disc', radius: 0.5, dir: [0, 1, 0], spread: 0.3, speed: [1.5, 3.5], life: [1, 1.8], size: [0.05, 0.02], stretch: 0.6, ramp: [[0, '#fff0b0'], [0.4, '#ff8a20'], [1, '#400', 0]], intensity: 1.5, swirl: 6, radial: 0.8 });
      fx.emitter({ count: 40, kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 0.9, radiusIn: 0.4, dir: [0, 0.3, 0], spread: 0.5, speed: [0.3, 0.8], life: [1, 1.6], size: [0.3, 0.9], swirl: 4, ramp: [[0, '#4a3c30', 0], [0.3, '#3a3028', 0.35], [1, '#1a1612', 0]], order: -1 });
      smoke(fx, { count: 40, shape: 'ring', radius: 1.0, radiusIn: 0.6, dir: [0, 1, 0], spread: 0.25, speed: [1.0, 1.8], life: [1.4, 1.9], size: [0.9, 2.2], swirl: 3, pos: [0, 3.0, 0], ramp: [[0, '#2a2622', 0], [0.4, '#3a342e', 0.3], [1, '#15130f', 0]] });
    } },

  { id: 'fire/fireball', name: 'Fireball', category: 'fire', loop: true, duration: 1.2, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [-1.2, 1.4, 4.6], target: [-0.4, 1.2, 0], fov: 38 } },
    build(fx) {
      const c = [0.6, 1.25, 0]; // the ball holds its place; trails stream toward -x (flight axis)
      fx.orb({ kind: 'fire', r: [0.3, 0.3], intensity: 2.2, ramp: [[0, '#300'], [0.3, '#d02a08'], [0.6, '#ff8a20'], [0.85, '#ffd060'], [1, '#fff4c0']], pos: c, noise: 2.5, scroll: 2.5, disp: 0.2, power: 2 }); // focal: only element above HDR 1; scroll*1.2 s is integer (loop-safe)
      fx.emitter({ count: 60, tex: 'explosion-fireball', shape: 'sphere', radius: 0.2, dir: [-1, 0.1, 0], spread: 0.35, speed: [2.5, 5], life: [0.3, 0.5], size: [0.6, 0.2], sizePow: 0.5, ramp: fx.pal(FIRE), intensity: 0.8, turb: [0.3, 1.5], pos: c });
      smoke(fx, { count: 40, shape: 'sphere', radius: 0.2, dir: [-1, 0.2, 0], spread: 0.3, speed: [2.5, 4], life: [0.8, 1.15], size: [0.5, 1.2], gravity: [0, 0.8, 0], turb: [0.4, 1], pos: c });
      fx.emitter({ count: 30, tex: 'ember-burst', kind: 'spark', blend: 'add', shape: 'sphere', radius: 0.25, dir: [-1, 0.1, 0], spread: 0.5, speed: [2, 5], life: [0.4, 0.9], gravity: [0, -1.5, 0], size: [0.07, 0.03], stretch: 0.6, ramp: [[0, '#fff2b0'], [0.4, '#ff8a20'], [1, '#400', 0]], intensity: 0.8, turb: [0.4, 1.5], pos: c });
      fx.erode({ geo: spiral({ turns: 1.5, r0: 0.35, r1: 0.15, h: 1.2, w: 0.08 }), ramp: FIRE, scroll: [-2.5, 0], tile: [3, 1], erode: [0.2, 0.6], intensity: 0.6, blend: 'add', pos: c, rot3: [0, 0, Math.PI / 2] }); // helix axis = flight axis; -2.5 * 1.2 s = -3 turns (loop-safe)
      fx.light({ glow: 0.25, color: '#ff8030', intensity: 25, pos: c, range: 6, flicker: 0.1, rate: 10 }); // Light snaps rate to an integer harmonic of 2π/duration
      fx.heat({ pos: [c[0] - 0.9, 0.8, 0], size: [1.2, 1.6], strength: 0.006, rise: 2.5 });
    } },

  { id: 'fire/flame-pillar', name: 'Flame pillar', category: 'fire', tier: 2, loop: false, duration: 5, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [4.5, 2.4, 6.4], target: [0, 2.0, 0] } },
    build(fx) {
      fx.flash(0.65, 0.25, '#ffc080', 0.08);
      fx.light({ glow: 0.4, color: '#ff7a20', intensity: 70, pos: [0, 1.6, 0.4], range: 18, flicker: 0.3, env: (t) => t < 0.6 ? t / 0.6 * 0.3 : t < 3.2 ? 1 : Math.max(0.05, 1 - (t - 3.2) / 1.6) });
      fx.heat({ pos: [0, 0.2, 0], size: [1.8, 5], strength: 0.008, t0: 0.6, dur: 3.6, fade: [0.3, 1] });
      fx.decal({ kind: 'cracks', t0: 0.05, dur: 4.9, r: [2.3, 2.6], fade: [0.1, 1.8], heat: [1, 0.15], reveal: 0.5, cells: 4 });
      fx.decal({ kind: 'glow', t0: 0.1, dur: 4.5, r: [1.8, 2.4], fade: [0.5, 1.5], ramp: [[0, '#000'], [0.4, '#7a1c00'], [1, '#ff7a20']], intensity: 1.2 });
      fx.ring({ t0: 0.6, dur: 0.7, r: [0.3, 3.5], width: [0.175, 0.05], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#fff0b0'], [1, '#c50']] });
      fx.beam({ pos: [0, 0, 0], height: 5.0, r: [0.55, 0.7], t0: 0.6, dur: 2.9, fade: [0.15, 0.9], noise: 1.6, speed: 2.5, intensity: 0.55, edge: 1.3, ramp: [[0, '#fff0b0'], [0.4, '#ffa030'], [1, '#701000']] });
      fx.emitter({ count: 220, kind: 'flame', shape: 'disc', radius: 0.5, dir: [0, 1, 0], spread: 0.06, speed: [3, 5], life: [0.8, 1.3], size: [1.0, 0.7], aspect: 2.2, ramp: fx.pal(FIRE), intensity: 0.4, delay: 0.6, emit: 2.6, swirl: 2, turb: [0.3, 1.2], floorFade: 0.1 });
      fx.emitter({ count: 110, kind: 'spark', shape: 'disc', radius: 0.5, dir: [0, 1, 0], spread: 0.4, speed: [4, 9], life: [0.8, 2.0], gravity: [0, -3, 0], size: [0.07, 0.02], stretch: 0.8, ramp: [[0, '#fff2c0'], [0.4, '#ff9020'], [1, '#500', 0]], intensity: 1.5, delay: 0.6, emit: 2.4 });
      fx.emitter({ count: 30, kind: 'rock', blend: 'normal', shape: 'disc', radius: 0.6, dir: [0, 1, 0], spread: 0.7, speed: [2, 5], life: [1.0, 1.6], gravity: [0, -9, 0], size: [0.12, 0.09], ramp: [[0, '#5a4a3c'], [1, '#5a4a3c', 1]], lit: 1, bounce: 0.3, rot: 6, delay: 0.6, emit: 0.1 });
      smoke(fx, { count: 90, shape: 'disc', radius: 0.6, dir: [0, 1, 0], spread: 0.25, speed: [1, 2.6], life: [1.8, 3], size: [1.0, 3.2], delay: 2.8, emit: 1.6, turb: [0.5, 0.5], gravity: [0, 0.4, 0], pos: [0, 0.6, 0], ramp: [[0, '#3a322a', 0], [0.2, '#2c2621', 0.6], [1, '#0e0d0c', 0]] });
      fx.emitter({ count: 50, kind: 'flame', shape: 'disc', radius: 0.4, dir: [0, 1, 0], spread: 0.3, speed: [0.3, 1.0], life: [0.8, 1.4], size: [0.6, 0.2], aspect: 1.6, ramp: fx.pal(FIRE), intensity: 0.4, delay: 3.0, emit: 1.0 });
      burst(fx, [0, 0, 0], 0.6, { ramp: [[0, '#fff0b0'], [0.4, '#ffa030'], [1, '#701000']], col: '#ff7a20', debris: false });
    } },

  { id: 'fire/flamethrower', name: 'Flamethrower', category: 'fire', loop: true, duration: 1.6, body: true, stage: { sky: 'dusk', view: { pos: [3.4, 1.4, 4.8], target: [2.4, 1.0, 0] } },
    build(fx) {
      const o = [0.62, 1.12, 0.12];
      fx.light({ color: '#ff8a30', intensity: 25, pos: [2.4, 1.3, 0.8], flicker: 0.4, range: 13, rate: 14 });
      fx.emitter({ count: 110, kind: 'smoke', shape: 'point', dir: [1, 0.02, 0], spread: 0.09, speed: [6, 9], life: [0.55, 0.85], size: [0.15, 1.0], aspect: 1.5, ramp: fx.pal([[0, '#fff4c0', 1], [0.2, '#ffb838', 0.9], [0.6, '#d83a08', 0.5], [1, '#200', 0]]), intensity: 0.45, drag: 0.3, gravity: [0, 0.8, 0], turb: [0.5, 2], pos: o });
      fx.emitter({ count: 50, kind: 'soft', shape: 'point', dir: [1, 0.1, 0], spread: 0.25, speed: [4, 8], life: [0.5, 1.2], gravity: [0, -4, 0], size: [0.07, 0.03], ramp: [[0, '#fff0b0'], [0.4, '#ff8a20'], [1, '#600', 0]], intensity: 1.5, bounce: 0.2, pos: o });
      fx.emitter({ count: 50, kind: 'spark', shape: 'point', dir: [1, 0.2, 0], spread: 0.35, speed: [4, 9], life: [0.5, 0.7], gravity: [0, -2, 0], size: [0.05, 0.02], stretch: 0.9, ramp: [[0, '#fff'], [0.4, '#ffa030'], [1, '#600', 0]], intensity: 3, pos: o });
      smoke(fx, { count: 30, shape: 'point', dir: [1, 0.3, 0], spread: 0.3, speed: [3, 5], life: [0.9, 1.4], size: [0.5, 1.5], drag: 1, gravity: [0, 1, 0], pos: [3.6, 1.1, 0], ramp: [[0, '#2a2622', 0], [0.5, '#3a322c', 0.3], [1, '#15130f', 0]] });
      fx.decal({ kind: 'glow', r: [2.4, 2.4], pos: [3.2, 0.01, 0], ramp: [[0, '#000'], [0.5, '#7a1c00'], [1, '#ff7a20']], intensity: 0.6, alpha: 0.5 });
    } },

  { id: 'fire/meteor', name: 'Meteor', category: 'fire', loop: false, duration: 5, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [5.5, 2.8, 9], target: [0, 2.6, 0], fov: 46 } },
    build(fx) {
      const TI = 1.3, P0 = [-6, 11, -1], P1 = [0, 0.45, 0]; // TI = hit time TH
      const pos = (t) => { const u = Math.min(1, t / TI), e = u * u * 0.6 + u * 0.4; return [P0[0] + (P1[0] - P0[0]) * e, P0[1] + (P1[1] - P0[1]) * e, P0[2] + (P1[2] - P0[2]) * e]; };
      const dl = [P1[0] - P0[0], P1[1] - P0[1], P1[2] - P0[2]], dn = Math.hypot(...dl), dir = dl.map((v) => v / dn);
      const head = (m, a, t) => m.position.set(...pos(Math.min(t, TI)));
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), new THREE.MeshStandardMaterial({ color: '#2a1d16', roughness: 0.9, emissive: '#ff4a10', emissiveIntensity: 0.9 }));
      const gp = rock.geometry.attributes.position; for (let i = 0; i < gp.count; i++) { const k = 1 + 0.16 * Math.sin(gp.getX(i) * 7 + gp.getY(i) * 5) * Math.cos(gp.getZ(i) * 6); gp.setXYZ(i, gp.getX(i) * k, gp.getY(i) * k, gp.getZ(i) * k); } rock.geometry.computeVertexNormals();
      fx.mesh(rock, (t, pr, f, w, o) => { o.position.set(...pos(t)); o.rotation.set(t * 3, t * 2, 0); }, { t0: 0, dur: TI });
      // anticipation: head = fire orb + explosion-fireball trail + smoke-puff trail, lit by its own light
      fx.orb({ t0: 0, dur: TI, r: [0.3, 0.3], kind: 'fire', intensity: 1, fade: [0, 0.1], follow: head, ramp: [[0, '#200'], [0.3, '#c21'], [0.6, '#f70'], [0.85, '#fc4'], [1, '#fff']], noise: 1.8, scroll: 2.5, disp: 0.55 });
      fx.trail({ t0: 0, dur: TI, path: pos, len: 0.5, width: 0.5, n: 40, intensity: 1, ramp: [[0, '#fff4c0'], [0.3, '#ffa030'], [1, '#701000']] });
      fx.emitter({ count: 50, tex: 'explosion-fireball', shape: 'sphere', radius: 0.3, dir: [-0.6, 0.8, 0], spread: 0.4, speed: [1, 2.5], life: [0.25, 0.5], size: [0.8, 0.35], sizePow: 0.5, ramp: fx.pal(FIRE), intensity: 0.8, t0: 0, t1: TI, loop: false, emit: TI, follow: head });
      smoke(fx, { count: 30, shape: 'sphere', radius: 0.4, dir: [-0.5, 0.5, 0], spread: 0.4, speed: [1, 2], life: [1.2, 2], size: [0.8, 2], t0: 0, t1: TI, loop: false, emit: TI * 0.9, follow: head });
      const L = fx.light({ glow: 0.25, color: '#ff7a28', intensity: 120, pos: [0, 1, 0], range: 20, flicker: 0.25, env: (t) => (t < TI ? 0.15 + 0.85 * ENV.anticip(t, 0, TI) : 0.5 * Math.exp(-(t - TI) * 1.5)) });
      fx.on((t) => { const v = t < TI ? pos(t) : [0, 1.2, 0]; L.obj.position.set(...v); L.lp?.set(...v); }); // light rides the head, then sits over the crater
      // impact at TH: 2-frame flash (4x light, HDR core), explosion cluster, shock, dust crown, debris, decals
      fx.impact({ t: TI, strength: 1, dir, pos: P1 });
      fx.light({ color: '#fff0d8', intensity: 18, pos: [0, 0.6, 0], range: 20, main: false, env: (t) => 4 * ENV.impact(t - TI, 6) }); // main:false keeps the host-lighting uniforms owned by L
      fx.emitter({ count: 1, kind: 'soft', blend: 'add', shape: 'point', pos: P1, speed: 0, life: [0.05, 0.05], size: [0.6, 0.6], ramp: [[0, '#fff6e0', 1], [1, '#ffd0a0', 0.6]], intensity: 8, delay: TI, emit: 0.001 });
      fx.emitter({ count: 6, tex: 'explosion-fireball', shape: 'sphere', radius: 0.6, dir: [0, 1, 0], spread: 1, speed: [0.3, 1.2], life: [0.5, 0.75], size: [1.8, 1.2], sizePow: 0.5, ramp: fx.pal(FIRE), intensity: 0.8, delay: TI, emit: 0.05, pos: P1 });
      const sh = fx.erode({ geo: band({ r: 1, h: 0.5 }), erode: [.25, 1], tile: [6, 1], scroll: [1.5, 0], blend: 'add', intensity: .4, ramp: FIRE, pos: P1, t0: TI, dur: 0.5 });
      fx.on((t) => { const s = 0.3 + 4 * Math.min(1, Math.max(0, (t - TI) / 0.5)); sh.obj.scale.set(s, 1, s); }); // shock expands over 0.5 s
      fx.ring({ t0: TI, dur: 0.9, r: [0.3, 7], width: [0.3, 0.075], normal: 'up', intensity: 0.3, fill: 0, refract: 0.015, dark: 0.25, ramp: [[0, '#ffd9a0'], [0.5, '#ff9a40'], [1, '#7a2a08']] });
      fx.emitter({ count: 40, kind: 'dust', blend: 'normal', shape: 'ring', radius: 1.2, radiusIn: 0.8, dir: [0, 0.3, 0], spread: 0.3, radial: 1, speed: [1.5, 3], life: [1.2, 1.8], size: [0.8, 1.4], ramp: [[0, '#6b5d4a', 0], [0.3, '#8a7a62', 0.35], [1, '#40382c', 0]], order: -1, delay: TI, emit: 0.1, pos: P1 }); // dust kind + normal blend -> dust-ring
      fx.debris({ count: 30, pos: P1, speed: [4, 8], spread: 0.7, size: [0.06, 0.14], life: 2.5, color: '#3a2a20', t0: TI });
      fx.flash(TI, 0.1, '#ffd090', 0.15);
      fx.orb({ t0: TI, dur: 0.8, r: [0.3, 1.8], ease: 'out', kind: 'fire', intensity: 1, fade: [0, 0.5], ramp: [[0, '#200'], [0.3, '#c21'], [0.6, '#f70'], [0.85, '#fc4'], [1, '#fff']], pos: [0, 0.9, 0], noise: 1.8, scroll: 2.5, disp: 0.55 });
      fx.emitter({ count: 60, tex: 'ember-burst', kind: 'spark', blend: 'add', shape: 'sphere', radius: 0.5, dir: [0, 1, 0], spread: 1.1, speed: [3, 8], life: [0.8, 1.8], gravity: [0, -9, 0], size: [0.1, 0.04], stretch: 1.4, ramp: [[0, '#fff', 1], [0.3, '#ffc050'], [1, '#800', 0]], intensity: 1, bounce: 0.35, delay: TI, emit: 0.1, pos: P1 });
      fx.emitter({ count: 60, kind: 'smoke', shape: 'sphere', radius: 0.5, dir: [0, 1, 0], spread: 1.1, speed: [1.5, 5], life: [0.5, 0.8], size: [1.4, 2.8], ramp: fx.pal([[0, '#ffe9b0', 0.9], [0.2, '#ff9a30', 0.85], [0.55, '#c8300a', 0.5], [1, '#200', 0]]), intensity: 0.45, drag: 1.1, gravity: [0, 2.2, 0], delay: TI, pos: [0, 0.6, 0], turb: [0.3, 1.2] }); // fire cloud: gone by TH+0.8
      fx.emitter({ count: 36, kind: 'rock', blend: 'normal', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.1, speed: [3, 10], life: [1.4, 2.8], gravity: [0, -9.8, 0], size: [0.2, 0.15], ramp: [[0, '#5c4c3e'], [1, '#5c4c3e', 1]], lit: 1, bounce: 0.3, rot: 6, delay: TI, pos: [0, 0.2, 0] });
      fx.decal({ kind: 'glow', t0: 0, dur: TI + 1.2, reveal: TI, growSpeed: 0.8, fade: [0, 1.2], r: [0.4, 3.0], ramp: [[0, '#000'], [0.4, '#8a1a00'], [1, '#ff8a20']], intensity: 1.2, alpha: 0.8 }); // projected anticipation glow grows toward the hit
      fx.decal({ kind: 'scorch', t0: TI, dur: 5 - TI, r: [3.2, 3.8], fade: [0.2, 1.4], heat: [1, 0], ramp: [[0, '#300'], [0.5, '#f40'], [1, '#fc8']] }); // heat cools to 0 by the end
      fx.decal({ kind: 'cracks', t0: TI, dur: 3.5, r: [3.6, 4.2], fade: [0.1, 2.4], heat: [1, 0.1], reveal: 0.4, cells: 4 });
      smoke(fx, { count: 60, shape: 'sphere', radius: 0.6, dir: [0, 1, 0], spread: 0.8, speed: [0.8, 3], life: [1.2, 1.8], size: [1.4, 4.5], delay: TI + 0.1, emit: 0.6, drag: 0.9, gravity: [0, 0.8, 0], turb: [0.5, 0.5], pos: [0, 0.8, 0], ramp: [[0, '#4a3d30', 0], [0.12, '#2f2822', 0.8], [0.6, '#1c1916', 0.5], [1, '#0e0d0c', 0]] }); // column clears by TH+2.5
    } },

  { id: 'fire/spirit-flame', name: 'Spirit flame', category: 'fire', loop: true, duration: 3, stage: { sky: 'dark', bloom: 0.6, view: { pos: [1.8, 1.4, 2.6], target: [0, 1.05, 0], fov: 36 } },
    build(fx) {
      fx.light({ glow: 0.4, color: '#5fb8ff', intensity: 20, pos: [0, 1.1, 0.2], flicker: 0.3, range: 8, rate: 4 });
      fx.decal({ kind: 'glow', r: [1.5, 1.5], ramp: [[0, '#000'], [0.4, '#06204a'], [1, '#4aa8ff']], intensity: 0.8, alpha: 0.5, y: 0.006 });
      fx.emitter({ count: 3, kind: 'soft', shape: 'point', dir: [0, 1, 0], speed: 0, life: [3, 3], size: [1.1, 1.1], ramp: [[0, '#4a9aff', 0.14], [1, '#4a9aff', 0.14]], intensity: 0.8, pos: [0, 1.1, 0] });
      fx.emitter({ count: 34, kind: 'flame', shape: 'sphere', radius: 0.1, dir: [0, 1, 0], spread: 0.15, speed: [0.2, 0.5], life: [0.9, 1.5], size: [0.5, 0.18], aspect: 2.0, ramp: COLD, intensity: 0.6, turb: [0.15, 1.2], pos: [0, 0.95, 0] });
      fx.emitter({ count: 14, kind: 'flame', shape: 'sphere', radius: 0.06, dir: [0, 1, 0], spread: 0.2, speed: [0.1, 0.3], life: [1.2, 1.8], size: [0.35, 0.12], aspect: 1.8, ramp: [[0, '#e8f2ff', 1], [0.3, '#bff4ff', 0.7], [1, '#4a2aff', 0]], intensity: 0.7, turb: [0.1, 1], pos: [0, 0.98, 0] });
      fx.emitter({ count: 40, kind: 'soft', shape: 'sphere', radius: 0.25, dir: [0, 1, 0], spread: 1.2, speed: [0.1, 0.5], life: [1.5, 3], size: [0.05, 0.015], ramp: [[0, '#bff4ff', 0], [0.3, '#7fe8ff', 0.9], [1, '#2a4aff', 0]], intensity: 1.5, turb: [0.3, 1], pos: [0, 1.1, 0] });
      fx.emitter({ count: 12, tex: 'explosion-fireball', sizePow: 0.5, blend: 'add', shape: 'point', dir: [0, 1, 0], spread: 0.3, speed: [0.2, 0.4], life: [2, 3], size: [0.3, 0.9], ramp: [[0, '#2a5aff', 0], [0.3, '#2a5aff', 0.12], [1, '#2a2aff', 0]], intensity: 0.7, turb: [0.2, 0.8], pos: [0, 1.2, 0] });
      fx.on((t, a, f) => { const y = 0.05 * Math.sin(t / 3 * Math.PI * 2); f.parts.forEach((p) => { if (p.mesh && p.p.kind) p.mesh.position.y = (p.p.pos ? p.p.pos[1] : 0) + y; }); });
    } },

  { id: 'fire/torch', name: 'Torch', category: 'fire', loop: true, duration: 2, stage: { sky: 'night', view: { pos: [1.4, 1.9, 2.4], target: [0, 1.7, 0], fov: 40 } },
    build(fx) {
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 4, 0.3), new THREE.MeshStandardMaterial({ color: '#4a4640', roughness: 0.95, bumpScale: 1 })); wall.position.set(0, 1.8, -0.45); g.add(wall);
      for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) { const w = 0.55 + ((r * 7 + c * 3) % 5) * 0.05, b = new THREE.Mesh(new THREE.BoxGeometry(w - 0.04, 0.46, 0.05), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.08, 0.06, 0.2 + ((r * 5 + c * 11) % 7) * 0.012), roughness: 1 })); b.position.set(-2.2 + c * 0.62 + (r % 2) * 0.3, 0.05 + r * 0.5, -0.29 + ((r + c) % 3) * 0.005); g.add(b); }
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.85, 10), mat('#3b2616', 0.9)); stick.position.set(0, 1.35, -0.12); stick.rotation.x = 0.28; g.add(stick);
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.2, 12), mat('#14100c', 1)); head.position.set(0, 1.84, -0.01); head.rotation.x = 0.28; g.add(head);
      const brk = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 14), mat('#222', 0.5, 0.8)); brk.position.set(0, 1.45, -0.1); brk.rotation.x = Math.PI / 2 + 0.28; g.add(brk);
      fx.mesh(g, null, { dur: 99 });
      fx.light({ color: '#ff8a2a', intensity: 22, pos: [0, 2.05, 0.5], flicker: 0.4, range: 9, rate: 10 });
      fx.heat({ pos: [0, 2.0, 0], size: [0.35, 0.9], strength: 0.005 });
      fx.emitter({ count: 28, kind: 'flame', shape: 'disc', radius: 0.05, dir: [0.05, 1, 0.1], spread: 0.12, speed: [0.3, 0.7], life: [0.6, 1.0], size: [0.5, 0.16], aspect: 2.0, ramp: fx.pal(FIRE), intensity: 0.65, turb: [0.15, 1.8], pos: [0, 1.95, -0.0] });
      fx.emitter({ count: 28, kind: 'spark', shape: 'disc', radius: 0.05, dir: [0, 1, 0], spread: 0.7, speed: [0.5, 1.8], life: [0.8, 1.9], gravity: [0, 0.4, 0], drag: 0.3, size: [0.04, 0.015], stretch: 0.6, ramp: [[0, '#fff6c0'], [0.4, '#ff8a20'], [1, '#400', 0]], intensity: 1.5, turb: [0.3, 1], pos: [0, 2.0, 0] });
      smoke(fx, { count: 16, shape: 'disc', radius: 0.05, dir: [0, 1, 0], spread: 0.2, speed: [0.4, 0.7], life: [1.6, 2], size: [0.25, 0.9], turb: [0.25, 0.7], gravity: [0, 0.15, 0], pos: [0, 2.4, 0] });
    } },
];
