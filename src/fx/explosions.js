import * as THREE from 'three';
const mat = (c, r = 0.8, m = 0, e) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m, ...(e ? { emissive: e } : {}) });
const HOT = [[0, '#ffe9b0', 0.9], [0.2, '#ff9a30', 0.85], [0.55, '#c8300a', 0.5], [1, '#200', 0]];
const DSMOKE = [[0, '#4a3d30', 0], [0.12, '#2f2822', 0.8], [0.6, '#1c1916', 0.55], [1, '#0e0d0c', 0]];
const SPK = [[0, '#fff'], [0.3, '#ffc050'], [1, '#800', 0]];
/* reusable ground blast: t0 start, s scale, p centre */
const blast = (fx, t0, s = 1, p = [0, 0, 0], o = {}) => {
  const [x, y, z] = p; fx.flash(t0, 0.3 * s, '#fff', 0.7); fx.shake(t0, 0.5 + 0.2 * s, 0.07 * s);
  fx.ring({ t0, dur: 0.8, r: [0.2, 5 * s], width: [0.5 * s, 0.12], normal: 'up', pos: [x, 0.02, z], intensity: 1.3, fill: 0.15, ramp: [[0, '#fff'], [0.4, '#fc9'], [1, '#a50']] });
  fx.orb({ t0, dur: 0.9, r: [0.3 * s, 1.7 * s], ease: 'out', kind: 'fire', intensity: 0.8, ramp: [[0, '#200'], [0.3, '#c21'], [0.6, '#f70'], [0.85, '#fc4'], [1, '#fea']], pos: [x, y + 0.9 * s, z], fade: [0, 0.55], noise: 1.8, scroll: 2.5, disp: 0.55 });
  fx.emitter({ count: 70, kind: 'smoke', shape: 'sphere', radius: 0.45 * s, dir: [0, 1, 0], spread: 0.9, speed: [1.2 * s, 4 * s], life: [0.6, 1.4], size: [1.2 * s, 2.6 * s], ramp: fx.pal(HOT), intensity: 0.5, drag: 1.1, gravity: [0, 2, 0], delay: t0, pos: [x, y + 0.6 * s, z], turb: [0.3, 1.2] });
  fx.emitter({ count: 100, kind: 'smoke', blend: 'normal', lit: 1, order: -1, shape: 'sphere', radius: 0.5 * s, dir: [0, 1, 0], spread: 0.7, speed: [0.8 * s, 2.6 * s], life: [2.2, 4.2], size: [1.2 * s, 4 * s], ramp: DSMOKE, delay: t0 + 0.1, emit: 0.5, drag: 0.9, gravity: [0, 0.9, 0], turb: [0.5, 0.5], pos: [x, y + 0.8 * s, z] });
  fx.emitter({ count: o.sparks ?? 110, kind: 'spark', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.4, speed: [4 * s, 11 * s], life: [0.5, 1.4], gravity: [0, -9, 0], size: [0.09, 0.03], stretch: 1.4, ramp: SPK, intensity: 4, bounce: 0.35, delay: t0, pos: [x, y + 0.3, z] });
  fx.decal({ kind: 'scorch', t0: t0 + 0.05, dur: fx.duration - t0 - 0.06, r: [2.2 * s, 2.8 * s], fade: [0.15, 1.6], heat: [1, 0], ramp: [[0, '#300'], [0.5, '#f40'], [1, '#fc8']], pos: [x, 0.01, z] });
};
export default [
  { id: 'explosions/small-explosion', name: 'Explosion', category: 'explosions', loop: false, duration: 5.4, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [5.5, 2.6, 7], target: [0, 1.2, 0] } },
    build(fx) {
      fx.flash(0, 0.3, '#fff', 0.8); fx.shake(0, 0.6, 0.09);
      fx.light({ color: '#ffa040', intensity: 420, pos: [0, 1.3, 0], range: 30, flicker: 0.2, env: (t) => (t < 0.04 ? t / 0.04 : Math.exp(-(t - 0.04) * 1.5)) + 0.0, norm: 120 });
      fx.ring({ t0: 0, dur: 0.9, r: [0.2, 6], width: [0.5, 0.12], normal: 'up', intensity: 1.3, fill: 0.15, ramp: [[0, '#fff'], [0.4, '#fc9'], [1, '#a50']] });
      fx.ring({ t0: 0.03, dur: 0.6, r: [0.2, 3.2], width: [0.3, 0.06], normal: 'cam', pos: [0, 1, 0], intensity: 1.2, ramp: [[0, '#fff'], [1, '#fb6']] });
      fx.orb({ t0: 0, dur: 0.95, r: [0.3, 1.9], ease: 'out', kind: 'fire', intensity: 0.9, ramp: [[0, '#200'], [0.3, '#c21'], [0.6, '#f70'], [0.85, '#fc4'], [1, '#fff']], pos: [0, 1.0, 0], fade: [0, 0.6], noise: 1.8, scroll: 2.5, disp: 0.55 });
      fx.emitter({ count: 90, kind: 'smoke', shape: 'sphere', radius: 0.5, dir: [0, 1, 0], spread: 0.9, speed: [1.2, 4.2], life: [0.6, 1.5], size: [1.4, 2.8], ramp: fx.pal([[0, '#ffe9b0', 0.9], [0.2, '#ff9a30', 0.85], [0.55, '#c8300a', 0.5], [1, '#200', 0]]), intensity: 0.45, aspect: 1, drag: 1.1, gravity: [0, 2.2, 0], pos: [0, 0.8, 0], turb: [0.3, 1.2] });
      fx.emitter({ count: 90, kind: 'smoke', blend: 'normal', shape: 'sphere', radius: 0.6, dir: [0, 1, 0], spread: 0.7, speed: [0.8, 2.6], life: [2.2, 4.6], size: [1.4, 5], ramp: [[0, '#4a3d30', 0], [0.12, '#2f2822', 0.8], [0.6, '#1c1916', 0.55], [1, '#0e0d0c', 0]], lit: 1, delay: 0.1, emit: 0.5, drag: 0.9, gravity: [0, 0.9, 0], turb: [0.5, 0.5], pos: [0, 0.9, 0], order: -1 });
      fx.emitter({ count: 120, kind: 'spark', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.4, speed: [4, 12], life: [0.5, 1.4], gravity: [0, -9, 0], size: [0.1, 0.03], stretch: 1.4, ramp: [[0, '#fff'], [0.3, '#ffc050'], [1, '#800', 0]], intensity: 4, bounce: 0.35, pos: [0, 0.3, 0] });
      fx.emitter({ count: 26, kind: 'rock', blend: 'normal', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.0, speed: [3, 9], life: [1.4, 2.6], gravity: [0, -9.8, 0], size: [0.18, 0.14], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], lit: 1, bounce: 0.3, rot: 6, pos: [0, 0.2, 0] });
      fx.decal({ kind: 'scorch', t0: 0.05, dur: 5.3, r: [2.4, 3], fade: [0.15, 1.6], heat: [1, 0], ramp: [[0, '#300'], [0.5, '#f40'], [1, '#fc8']] });
      fx.decal({ kind: 'cracks', t0: 0.05, dur: 3, r: [3.2, 3.6], fade: [0.1, 2.2], heat: [1, 0.1], reveal: 0.4, cells: 4 });
    } },

  { id: 'explosions/barrel-explosion', name: 'Barrel explosion', category: 'explosions', loop: false, duration: 5.2, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [4.6, 2.2, 6], target: [0, 1.0, 0] } },
    build(fx) {
      const g = new THREE.Group(); const red = new THREE.MeshStandardMaterial({ color: '#b02a1a', roughness: 0.45, metalness: 0.5, emissive: '#ff2200', emissiveIntensity: 0 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.9, 24), red); body.position.y = 0.45; g.add(body);
      for (const y of [0.15, 0.75]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.02, 8, 28), mat('#2a2a2a', 0.4, 0.8)); b.rotation.x = Math.PI / 2; b.position.y = y; g.add(b); }
      const sym = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), new THREE.MeshBasicMaterial({ color: '#ffd23a' })); sym.position.set(0.0, 0.45, 0.345); g.add(sym);
      fx.mesh(g, (t, pr, f, w, o) => { const u = Math.min(1, t / 1.0); o.scale.set(1 + 0.1 * u * u, 1 + 0.06 * u * u, 1 + 0.1 * u * u); o.rotation.z = Math.sin(t * 40) * 0.01 * u; red.emissiveIntensity = u * u * 2.2 * (0.8 + 0.2 * Math.sin(t * 30)); }, { t0: 0, dur: 1.0 });
      fx.light({ color: '#ff5a20', intensity: 12, pos: [0, 0.6, 0.5], t0: 0.2, dur: 0.8, fade: [0.3, 0], flicker: 0.5, norm: 18 });
      fx.emitter({ count: 24, kind: 'spark', shape: 'disc', radius: 0.3, dir: [0, 1, 0], spread: 0.8, speed: [1, 3], life: [0.3, 0.7], gravity: [0, -4, 0], size: [0.04, 0.015], stretch: 0.8, ramp: SPK, intensity: 3, t0: 0, t1: 1.0, emit: 1.0, loop: false, pos: [0, 0.9, 0] });
      fx.emitter({ count: 20, kind: 'flame', shape: 'disc', radius: 0.12, dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1.2], life: [0.3, 0.5], size: [0.3, 0.1], aspect: 1.8, ramp: HOT, intensity: 0.7, t0: 0.4, t1: 1.0, delay: 0.4, emit: 0.6, loop: false, pos: [0, 0.95, 0] });
      blast(fx, 1.0, 1.15, [0, 0, 0], { sparks: 100 });
      fx.emitter({ count: 14, kind: 'shard', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.2, speed: [4, 10], life: [1.4, 2.6], gravity: [0, -9.8, 0], size: [0.2, 0.14], ramp: [[0, '#8a2a1c'], [1, '#8a2a1c', 1]], bounce: 0.35, rot: 8, delay: 1.0, pos: [0, 0.5, 0] });
      fx.emitter({ count: 10, kind: 'smoke', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 1.2, speed: [3, 8], life: [1.2, 2.2], gravity: [0, -7, 0], size: [0.5, 0.2], aspect: 1.4, ramp: HOT, intensity: 0.6, bounce: 0.3, delay: 1.0, pos: [0, 0.5, 0] });
      fx.light({ color: '#ff8030', intensity: 360, pos: [0, 1.2, 0], range: 28, t0: 1.0, dur: 4.2, flicker: 0.25, env: (t) => Math.exp(-(t - 1.0) * 1.4), norm: 120 });
    } },

  { id: 'explosions/big-explosion', name: 'Big explosion', category: 'explosions', loop: false, duration: 7.2, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [11, 4.5, 15], target: [0, 3.2, 0], fov: 44 } },
    build(fx) {
      blast(fx, 0, 2.2, [0, 0, 0], { sparks: 160 });
      fx.light({ color: '#ffa040', intensity: 700, pos: [0, 2.5, 0], range: 50, flicker: 0.2, env: (t) => (t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 0.8)), norm: 240 });
      fx.emitter({ count: 90, kind: 'smoke', blend: 'normal', lit: 1, order: -1, shape: 'disc', radius: 0.8, dir: [0, 1, 0], spread: 0.12, speed: [3, 6], life: [3, 5], size: [1.6, 3.6], ramp: DSMOKE, delay: 0.3, emit: 1.6, drag: 0.5, turb: [0.5, 0.4], pos: [0, 1, 0] });
      fx.emitter({ count: 80, kind: 'smoke', blend: 'normal', lit: 1, order: -1, shape: 'sphere', radius: 1.2, dir: [0, 1, 0], spread: 1.6, speed: [0.8, 3.2], life: [3, 5], size: [2.4, 5.6], ramp: DSMOKE, delay: 1.4, emit: 1.2, drag: 0.8, gravity: [0, 0.2, 0], turb: [0.5, 0.4], pos: [0, 6.2, 0], radial: 0.6 });
      fx.emitter({ count: 50, kind: 'smoke', shape: 'sphere', radius: 1.0, dir: [0, 1, 0], spread: 1.5, speed: [0.5, 2], life: [1.2, 2.2], size: [2, 4], ramp: [[0, '#ffc070', 0], [0.2, '#ff8a30', 0.55], [0.6, '#a02a08', 0.3], [1, '#200', 0]], intensity: 0.4, delay: 1.2, emit: 0.8, pos: [0, 5.6, 0], radial: 0.6 });
      fx.emitter({ count: 40, kind: 'rock', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.4, dir: [0, 1, 0], spread: 1.1, speed: [5, 14], life: [1.6, 3], gravity: [0, -9.8, 0], size: [0.3, 0.2], ramp: [[0, '#5c4c3e'], [1, '#5c4c3e', 1]], bounce: 0.3, rot: 6, pos: [0, 0.3, 0] });
      fx.emitter({ count: 70, kind: 'smoke', shape: 'disc', radius: 1.8, dir: [0, 1, 0], spread: 0.2, speed: [0.3, 1.2], life: [0.8, 1.6], size: [1.2, 0.4], aspect: 1.8, ramp: fx.pal(HOT), intensity: 0.4, delay: 0.8, emit: 2.5, pos: [0, 0.1, 0], floorFade: 0.1 });
    } },

  { id: 'explosions/cartoon-pow', name: 'Cartoon POW', category: 'explosions', loop: false, duration: 1.05, stage: { sky: 'void', bloom: 0.4, view: { pos: [0, 1.2, 5], target: [0, 1.2, 0], fov: 40 }, ground: false },
    build(fx) {
      const c = [0, 1.2, 0];
      fx.flash(0, 0.14, '#fff', 0.5);
      fx.ring({ t0: 0, dur: 0.4, r: [0.3, 2.3], width: [0.35, 0.05], normal: 'cam', pos: c, intensity: 1.6, ramp: [[0, '#fff'], [1, '#ffc030']] });
      fx.orb({ t0: 0, dur: 0.5, r: [0.3, 1.4], ease: 'out', kind: 'fire', intensity: 0.8, pos: c, fade: [0, 0.35], ramp: [[0, '#c21'], [0.5, '#f80'], [1, '#ffe060']], noise: 2.4, scroll: 4, disp: 0.7 });
      fx.emitter({ count: 14, kind: 'glint', shape: 'point', pos: c, size: [3.2, 4.2], life: [0.45, 0.6], ramp: [[0, '#fff3a0'], [1, '#ff7a20', 0]], intensity: 1.6, rot: 0.3 });
      fx.emitter({ count: 26, kind: 'shard', shape: 'sphere', radius: 0.2, dir: [0, 0, 1], spread: 3, speed: [3, 7], life: [0.4, 0.8], size: [0.22, 0.1], ramp: [[0, '#ffd23a'], [0.6, '#ff6a1a'], [1, '#ff3a10', 0]], intensity: 1.4, drag: 2, rot: 10, pos: c });
      fx.emitter({ count: 40, kind: 'spark', shape: 'point', pos: c, dir: [0, 0, 1], spread: 3, speed: [3, 9], life: [0.3, 0.7], size: [0.1, 0.03], stretch: 1.2, ramp: SPK, intensity: 4, drag: 1.5 });
      fx.emitter({ count: 12, kind: 'smoke', blend: 'normal', lit: 0, shape: 'sphere', radius: 0.3, dir: [0, 0, 1], spread: 3, speed: [1, 2.5], life: [0.6, 0.9], size: [0.5, 1.1], ramp: [[0, '#f4f4f4', 0], [0.2, '#fff', 0.9], [1, '#bbb', 0]], drag: 2, pos: c, order: -2, delay: 0.05 });
      fx.text({ text: 'POW!', size: 1.4, pos: c, grad: ['#fff8a0', '#ffd23a', '#ff6a10'], outline: '#5a1000', t0: 0, dur: 1.05, fade: [0.02, 0.2], motion: (u) => ({ pos: [0, 1.2, 0.5], scale: u < 0.15 ? 0.3 + u / 0.15 * 1.15 : 1.45 - Math.max(0, u - 0.15) * 0.25 + Math.sin(u * 40) * 0.03 * (1 - u), rot: Math.sin(u * 18) * 0.06 - 0.12, alpha: 1 }) });
      fx.light({ color: '#ffb040', intensity: 25, pos: [0, 1.2, 1.5], t0: 0, dur: 0.5, fade: [0, 0.4], norm: 20 });
    } },

  { id: 'explosions/dirt-explosion', name: 'Dirt explosion', category: 'explosions', loop: false, duration: 3.6, stage: { sky: 'day', view: { pos: [4.6, 2.0, 6], target: [0, 1.0, 0] } },
    build(fx) {
      fx.flash(0, 0.15, '#ffe0b0', 0.35); fx.shake(0, 0.5, 0.07);
      fx.light({ color: '#ffb060', intensity: 150, pos: [0, 0.8, 0], range: 16, t0: 0, dur: 0.8, fade: [0, 0.6], norm: 80 });
      fx.ring({ t0: 0, dur: 0.5, r: [0.2, 3.5], width: [0.4, 0.1], normal: 'up', intensity: 0.7, fill: 0.1, ramp: [[0, '#fff0c0'], [1, '#a68a60']] });
      fx.decal({ kind: 'scorch', t0: 0.05, dur: 3.5, r: [1.5, 1.9], fade: [0.1, 1.2], heat: [0.4, 0], ramp: [[0, '#1a120c'], [0.5, '#2a1c12'], [1, '#6a4a2a']] });
      fx.emitter({ count: 70, kind: 'dust', blend: 'normal', lit: 1, shape: 'disc', radius: 0.4, dir: [0, 1, 0], spread: 0.5, speed: [3, 8], life: [1.2, 2.6], size: [0.8, 2.6], ramp: [[0, '#8a6c48', 0], [0.12, '#7a5e3e', 0.85], [1, '#4a3a2a', 0]], drag: 1.3, gravity: [0, -1.5, 0], turb: [0.4, 0.8], pos: [0, 0.1, 0] });
      fx.emitter({ count: 50, kind: 'smoke', blend: 'normal', lit: 1, order: -1, shape: 'disc', radius: 0.8, dir: [0, 1, 0], spread: 1.4, speed: [1, 4], life: [1.5, 2.8], size: [1, 3], ramp: [[0, '#7a6246', 0], [0.2, '#6a5238', 0.6], [1, '#3a2c20', 0]], drag: 1.2, emit: 0.3, gravity: [0, 0.3, 0], pos: [0, 0.1, 0], radial: 0.5 });
      fx.emitter({ count: 80, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.3, dir: [0, 1, 0], spread: 0.7, speed: [4, 11], life: [1.2, 2.2], gravity: [0, -10, 0], size: [0.12, 0.06], ramp: [[0, '#4a3624'], [1, '#4a3624', 1]], bounce: 0.35, rot: 8, pos: [0, 0.1, 0] });
      fx.emitter({ count: 30, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.3, dir: [0, 1, 0], spread: 0.9, speed: [3, 7], life: [1.2, 2.2], gravity: [0, -10, 0], size: [0.26, 0.18], ramp: [[0, '#5a4430'], [1, '#5a4430', 1]], bounce: 0.3, rot: 5, pos: [0, 0.1, 0] });
      fx.emitter({ count: 30, kind: 'spark', shape: 'disc', radius: 0.2, dir: [0, 1, 0], spread: 0.9, speed: [3, 8], life: [0.3, 0.8], gravity: [0, -9, 0], size: [0.07, 0.02], stretch: 1.2, ramp: SPK, intensity: 3.5, pos: [0, 0.2, 0] });
      fx.emitter({ count: 30, kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 0.5, radiusIn: 0.3, dir: [0, 0.1, 0], spread: 0.1, radial: 1, speed: [3, 5], life: [1.2, 2.0], size: [0.6, 1.8], ramp: [[0, '#8a6c48', 0], [0.2, '#8a6c48', 0.5], [1, '#5a4a38', 0]], drag: 2, pos: [0, 0.1, 0] });
    } },

  { id: 'explosions/firework-burst', name: 'Firework burst', category: 'explosions', loop: false, duration: 3.6, stage: { sky: 'night', bloom: 0.7, ground: true, view: { pos: [0, 2.0, 9], target: [0, 6.0, 0], fov: 50 } },
    build(fx) {
      const c = [0, 6.5, 0];
      fx.flash(0.05, 0.25, '#ffe8c0', 0.25);
      fx.light({ color: '#ff9a50', intensity: 300, pos: [0, 6.5, 1], range: 30, t0: 0, dur: 3.2, env: (t) => t < 0.05 ? t / 0.05 : Math.exp(-t * 1.4), norm: 120 });
      fx.orb({ t0: 0, dur: 0.3, r: [0.1, 0.9], ease: 'out', kind: 'plasma', intensity: 1.2, pos: c, fade: [0, 0.2], ramp: [[0, '#f60'], [1, '#fff6d0']] });
      fx.emitter({ count: 220, kind: 'spark', shape: 'point', pos: c, dir: [0, 1, 0], spread: 3.2, speed: [7, 10.5], life: [1.8, 2.8], size: [0.2, 0.06], stretch: 1.0, drag: 1.5, gravity: [0, -1.6, 0], ramp: [[0, '#ffe0ff'], [0.12, '#ff6ae0'], [0.5, '#ff2a90'], [1, '#601040', 0]], intensity: 2.6, turb: [0.05, 2] });
      fx.emitter({ count: 120, kind: 'spark', shape: 'point', pos: c, dir: [0, 1, 0], spread: 3.2, speed: [4.5, 8], life: [1.6, 2.6], size: [0.17, 0.05], stretch: 0.9, drag: 1.5, gravity: [0, -1.6, 0], ramp: [[0, '#e0ffff'], [0.15, '#40e0ff'], [0.55, '#2a6aff'], [1, '#102060', 0]], intensity: 2.6 });
      fx.emitter({ count: 130, kind: 'glint', shape: 'point', pos: c, dir: [0, 1, 0], spread: 3.2, speed: [3, 8], life: [1.0, 2.0], size: [0.22, 0.12], drag: 1.5, gravity: [0, -1.2, 0], delay: 1.1, ramp: [[0, '#fff'], [0.5, '#ffe090'], [1, '#ffb030', 0]], intensity: 3, turb: [0.3, 6], emit: 0.8 });
      fx.emitter({ count: 20, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 1.2, dir: [0, 0, 0], spread: 3, speed: [0.1, 0.5], life: [2, 3], size: [1.5, 3], ramp: [[0, '#555', 0], [0.3, '#686068', 0.12], [1, '#333', 0]], delay: 0.2, pos: c, order: -2 });
    } },

  { id: 'explosions/firework-rocket', name: 'Firework rocket', category: 'explosions', loop: false, duration: 3.8, stage: { sky: 'night', bloom: 0.7, ground: true, view: { pos: [0, 2.2, 9.5], target: [0, 5.0, 0], fov: 52 } },
    build(fx) {
      const TB = 1.5, top = 6.2; const path = (t) => { const u = Math.min(1, t / TB); return [Math.sin(t * 9) * 0.04 * u, 0.35 + (top - 0.35) * (1 - (1 - u) * (1 - u)), 0]; };
      const body = new THREE.Group(); const st = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 10), mat('#c22', 0.5)); body.add(st); const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 10), mat('#eee', 0.4)); cone.position.y = 0.26; body.add(cone);
      fx.mesh(body, (t, pr, f, w, o) => { o.position.set(...path(t)); }, { t0: 0, dur: TB });
      fx.light({ color: '#ffb050', intensity: 12, pos: [0, 0.5, 0.5], t0: 0, dur: TB, fade: [0.05, 0.1], norm: 18 });
      fx.on((t, a, f) => { const l = f.parts.find((q) => q.l); if (l && t < TB) l.l.position.set(path(t)[0], path(t)[1], 0.6); else if (l) l.l.position.set(0, top, 1); });
      fx.trail({ t0: 0, dur: TB, path, len: 0.7, width: 0.09, n: 40, intensity: 2.2, ramp: [[0, '#fff6c0'], [0.3, '#ffb040'], [1, '#802000']] });
      fx.emitter({ count: 90, kind: 'spark', shape: 'point', dir: [0, -1, 0], spread: 0.35, speed: [1, 3], life: [0.4, 1.0], gravity: [0, -3, 0], size: [0.05, 0.015], stretch: 0.8, ramp: SPK, intensity: 3, t0: 0, t1: TB, emit: TB, loop: false, follow: (m, a, t) => m.position.set(...path(Math.min(t, TB))) });
      fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', lit: 1, shape: 'point', dir: [0, -1, 0], spread: 0.3, speed: [0.2, 0.8], life: [1.5, 2.5], size: [0.15, 0.6], ramp: [[0, '#888', 0], [0.2, '#999', 0.25], [1, '#444', 0]], t0: 0, t1: TB, emit: TB, loop: false, follow: (m, a, t) => m.position.set(...path(Math.min(t, TB))), order: -2 });
      const c = [0, top, 0];
      fx.flash(TB, 0.25, '#ffe8b0', 0.3);
      fx.light({ color: '#ffc060', intensity: 300, pos: [0, top, 1], range: 30, t0: TB, dur: 2.2, env: (t) => Math.exp(-(t - TB) * 1.6), norm: 120 });
      fx.emitter({ count: 90, kind: 'spark', shape: 'point', pos: c, dir: [0, 1, 0], spread: 3.2, speed: [7, 10], life: [1.8, 2.6], size: [0.2, 0.06], stretch: 1.2, drag: 1.4, gravity: [0, -3.2, 0], delay: TB, ramp: [[0, '#fff'], [0.2, '#ffd060'], [0.6, '#ff9a20'], [1, '#603000', 0]], intensity: 3.6, turb: [0.1, 2] });
      fx.emitter({ count: 110, kind: 'spark', shape: 'point', pos: c, dir: [0, 1, 0], spread: 3.2, speed: [4.5, 8], life: [1.6, 2.4], size: [0.17, 0.05], stretch: 0.9, drag: 1.4, gravity: [0, -3.2, 0], delay: TB, ramp: [[0, '#fff6d0'], [0.3, '#ffc040'], [1, '#804000', 0]], intensity: 3.2 });
      fx.emitter({ count: 110, kind: 'glint', shape: 'point', pos: c, dir: [0, 1, 0], spread: 3.2, speed: [3, 8], life: [0.8, 1.6], size: [0.22, 0.1], drag: 1.4, gravity: [0, -1.5, 0], delay: TB + 0.9, emit: 0.8, ramp: [[0, '#fff'], [1, '#ffb030', 0]], intensity: 3 });
    } },

  { id: 'explosions/grenade', name: 'Grenade', category: 'explosions', loop: false, duration: 4.2, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [1.8, 1.5, 4.4], target: [-0.9, 0.55, 0], fov: 46 } },
    build(fx) {
      const TB = 2.4; const H = (t) => { const k = Math.min(t, TB); const seg = [[0, 0.55, 0.7, -3.4, -1.5], [0.7, 1.3, 0.35, -1.5, -0.6], [1.3, 1.9, 0.14, -0.6, -0.15], [1.9, 99, 0.04, -0.15, 0]]; for (const [a, b, h, x0, x1] of seg) if (k < b) { const u = (k - a) / Math.min(b - a, 0.6); if (a === 0) { const v = k / 0.7; return [-3.4 + 1.9 * v, 0.1 + (1 - Math.pow(2 * v - 1, 2)) * 1.1 + 0.1, 0]; } const uu = Math.min(1, (k - a) / (Math.min(b, a + 0.6) - a)); return [x0 + (x1 - x0) * uu, 0.1 + Math.sin(Math.PI * Math.min(1, uu)) * h, 0]; } return [0, 0.1, 0]; };
      const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), mat('#3a4a2c', 0.6, 0.3)); b.scale.set(0.85, 1.1, 0.85); g.add(b); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.06, 10), mat('#999', 0.3, 0.9)); top.position.y = 0.13; g.add(top); const lev = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.15, 0.03), mat('#aaa', 0.3, 0.9)); lev.position.set(0.07, 0.07, 0); lev.rotation.z = -0.15; g.add(lev);
      fx.mesh(g, (t, pr, f, w, o) => { const p = H(t); o.position.set(...p); o.rotation.set(t * 6, 0, t * 5 * (t < TB - 0.5 ? 1 : 0.1)); }, { t0: 0, dur: TB });
      fx.light({ color: '#ffb050', intensity: 5, pos: [0, 0.3, 0.2], t0: 1.6, dur: TB - 1.6, fade: [0.2, 0.05], flicker: 0.6, norm: 18 });
      fx.emitter({ count: 40, kind: 'spark', shape: 'point', dir: [0, 1, 0], spread: 1.2, speed: [0.5, 2], life: [0.2, 0.5], gravity: [0, -3, 0], size: [0.04, 0.012], stretch: 0.6, ramp: SPK, intensity: 3.5, t0: 0, t1: TB, emit: TB, loop: false, follow: (m, a, t) => { const p = H(Math.min(t, TB)); m.position.set(p[0], p[1] + 0.17, 0); } });
      fx.emitter({ count: 12, kind: 'smoke', blend: 'normal', lit: 1, shape: 'point', dir: [0, 1, 0], spread: 0.6, speed: [0.2, 0.6], life: [0.8, 1.4], size: [0.1, 0.4], ramp: [[0, '#888', 0], [0.2, '#aaa', 0.3], [1, '#555', 0]], t0: 0, t1: TB, emit: TB, loop: false, follow: (m, a, t) => { const p = H(Math.min(t, TB)); m.position.set(p[0], p[1] + 0.17, 0); } });
      blast(fx, TB, 0.9, [0, 0, 0], { sparks: 90 });
      fx.emitter({ count: 80, kind: 'streak', shape: 'sphere', radius: 0.1, dir: [0, 0.3, 0], spread: 1.9, speed: [14, 28], life: [0.2, 0.45], size: [0.45, 0.03], stretch: 2, ramp: [[0, '#fff'], [0.4, '#ffd070'], [1, '#a40', 0]], intensity: 3, delay: TB, pos: [0, 0.4, 0] });
      fx.emitter({ count: 12, kind: 'shard', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.1, dir: [0, 1, 0], spread: 1.3, speed: [5, 11], life: [1.0, 1.8], gravity: [0, -9.8, 0], size: [0.07, 0.04], ramp: [[0, '#4a5a3c'], [1, '#4a5a3c', 1]], bounce: 0.4, rot: 12, delay: TB, pos: [0, 0.3, 0] });
      fx.light({ color: '#ffa040', intensity: 300, pos: [0, 1.2, 0], range: 24, t0: TB, dur: 1.8, env: (t) => Math.exp(-(t - TB) * 2), norm: 100 });
    } },

  { id: 'explosions/implosion', name: 'Implosion', category: 'explosions', loop: false, duration: 1.65, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [3.8, 2.2, 5.2], target: [0, 1.2, 0] } },
    build(fx) {
      const c = [0, 1.2, 0], TP = 1.15;
      fx.orb({ t0: 0.1, dur: TP - 0.1, r: [1.1, 0.12], kind: 'void', intensity: 1.2, power: 2.5, ramp: [[0, '#101'], [0.5, '#8a2cff'], [1, '#ffffff']], pos: c, fade: [0.2, 0.05], noise: 2, scroll: 3 });
      fx.ring({ t0: 0.0, dur: TP, r: [3.2, 0.2], width: [0.1, 0.03], normal: 'up', pos: [0, 0.02, 0], intensity: 1.0, ramp: [[0, '#fff'], [1, '#a6f']], fade: [0.1, 0.1] });
      fx.emitter({ count: 120, kind: 'rock', blend: 'normal', lit: 1, shape: 'sphere', radius: 3.2, radiusIn: 2.2, dir: [0, 1, 0], spread: 3.2, radial: 1, speed: [-3.6, -2.8], life: [1.0, 1.1], size: [0.14, 0.08], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], rot: 6, pos: c, emit: 0.15 });
      fx.emitter({ count: 90, kind: 'spark', shape: 'sphere', radius: 3.0, radiusIn: 2.0, dir: [0, 1, 0], spread: 3.2, radial: 1, speed: [-3.6, -2.8], life: [1.0, 1.1], size: [0.08, 0.03], stretch: 1.4, ramp: [[0, '#c8a0ff', 0], [0.5, '#c8a0ff', 1], [1, '#fff']], intensity: 3, pos: c, emit: 0.15 });
      fx.flash(TP, 0.2, '#e8d8ff', 0.3); fx.shake(TP, 0.35, 0.08);
      fx.ring({ t0: TP, dur: 0.4, r: [0.2, 3.5], width: [0.3, 0.05], normal: 'cam', pos: c, intensity: 0.8, ramp: [[0, '#fff'], [1, '#a6f']] });
      fx.ring({ t0: TP, dur: 0.5, r: [0.2, 4.5], width: [0.4, 0.08], normal: 'up', pos: [0, 0.02, 0], intensity: 0.7, fill: 0.05, ramp: [[0, '#c8b0ff'], [1, '#64d']] });
      fx.orb({ t0: TP, dur: 0.3, r: [0.2, 1.2], ease: 'out', kind: 'plasma', intensity: 0.5, pos: c, fade: [0, 0.2], ramp: [[0, '#40f'], [1, '#c8b8ff']] });
      fx.emitter({ count: 70, kind: 'spark', shape: 'sphere', radius: 0.1, dir: [0, 1, 0], spread: 3.2, speed: [4, 11], life: [0.3, 0.7], size: [0.07, 0.02], stretch: 1.3, ramp: [[0, '#fff'], [0.4, '#c8a0ff'], [1, '#406', 0]], intensity: 4, gravity: [0, -3, 0], delay: TP, pos: c });
      fx.emitter({ count: 30, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.3, dir: [0, 1, 0], spread: 3, speed: [1, 3], life: [1, 1.4], size: [0.6, 1.6], ramp: [[0, '#4a3d50', 0], [0.2, '#3a3040', 0.5], [1, '#100c14', 0]], delay: TP, drag: 1.5, pos: c });
      fx.light({ color: '#a070ff', intensity: 120, pos: [0, 1.2, 0.3], range: 14, env: (t) => t < TP ? 0.1 + t / TP * 0.5 : Math.exp(-(t - TP) * 5) * 2, norm: 60 });
    } },

  { id: 'explosions/nuke', name: 'Nuke', category: 'explosions', loop: false, duration: 9, stage: { sky: 'dusk', bloom: 0.55, exposure: 1, view: { pos: [22, 7, 30], target: [0, 8.5, 0], fov: 45 } },
    build(fx) {
      fx.flash(0, 1.2, '#ffffff', 1.0); fx.shake(0.1, 2.2, 0.25);
      fx.light({ color: '#ffcf90', intensity: 1400, pos: [0, 4, 0], range: 120, env: (t) => t < 0.06 ? t / 0.06 : Math.exp(-(t - 0.06) * 0.55), norm: 400, flicker: 0.1 });
      fx.orb({ t0: 0, dur: 1.6, r: [0.6, 6.5], ease: 'out', kind: 'fire', intensity: 1.0, ramp: [[0, '#400'], [0.3, '#e32'], [0.6, '#fb4'], [0.85, '#ffe8a0'], [1, '#fff']], pos: [0, 3.2, 0], fade: [0, 1.2], noise: 1.3, scroll: 1.5, disp: 0.45 });
      fx.ring({ t0: 0, dur: 2.2, r: [0.5, 26], width: [1.5, 0.3], normal: 'up', pos: [0, 0.03, 0], intensity: 1.2, fill: 0.12, ramp: [[0, '#fff'], [0.4, '#fdc'], [1, '#a50']] });
      fx.ring({ t0: 0.05, dur: 1.4, r: [0.5, 14], width: [0.9, 0.2], normal: 'cam', pos: [0, 3.5, 0], intensity: 0.8, ramp: [[0, '#fff'], [1, '#fb8']], fade: [0, 0.8] });
      fx.decal({ kind: 'scorch', t0: 0.2, dur: 8.7, r: [6, 8], fade: [0.3, 2.5], heat: [1, 0], ramp: [[0, '#200'], [0.5, '#f40'], [1, '#fc8']] });
      fx.emitter({ count: 150, kind: 'smoke', blend: 'normal', lit: 1, order: -1, shape: 'disc', radius: 1.4, dir: [0, 1, 0], spread: 0.1, speed: [4, 8], life: [4, 6], size: [3, 6], ramp: [[0, '#5a4a3c', 0], [0.12, '#3a302a', 0.85], [0.7, '#241f1b', 0.6], [1, '#100e0c', 0]], delay: 0.5, emit: 3.6, drag: 0.3, turb: [0.5, 0.3], pos: [0, 1, 0] });
      fx.emitter({ count: 160, kind: 'smoke', blend: 'normal', lit: 1, order: -1, shape: 'sphere', radius: 2.2, dir: [0, 1, 0], spread: 1.7, speed: [0.5, 3.5], life: [4, 6], size: [4, 8.5], ramp: [[0, '#6a5645', 0], [0.12, '#463a30', 0.85], [0.7, '#2a2420', 0.6], [1, '#12100e', 0]], delay: 1.5, emit: 2.0, drag: 0.6, turb: [0.5, 0.3], pos: [0, 12, 0], radial: 0.8 });
      fx.emitter({ count: 90, kind: 'smoke', shape: 'sphere', radius: 2.0, dir: [0, 1, 0], spread: 1.7, speed: [0.3, 2.5], life: [2, 3.5], size: [4, 8], ramp: [[0, '#ffd890', 0], [0.2, '#ff9a40', 0.5], [0.6, '#b03a10', 0.3], [1, '#200', 0]], intensity: 0.35, delay: 1.3, emit: 1.8, pos: [0, 11, 0], radial: 0.8 });
      fx.emitter({ count: 90, kind: 'smoke', shape: 'disc', radius: 1.4, dir: [0, 1, 0], spread: 0.1, speed: [4, 8], life: [1.5, 3], size: [2.5, 5], ramp: [[0, '#ffd890', 0], [0.2, '#ff8a30', 0.4], [1, '#200', 0]], intensity: 0.3, delay: 0.4, emit: 2.2, drag: 0.3, pos: [0, 0.8, 0] });
      fx.emitter({ count: 60, kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 1.5, radiusIn: 1, dir: [0, 0.05, 0], spread: 0.1, radial: 1, speed: [10, 16], life: [2, 3.5], size: [3, 7], ramp: [[0, '#8a7a68', 0], [0.2, '#7a6a58', 0.5], [1, '#3a322a', 0]], drag: 1.5, delay: 0.2, pos: [0, 0.4, 0] });
      fx.emitter({ count: 120, kind: 'spark', shape: 'sphere', radius: 0.5, dir: [0, 1, 0], spread: 1.4, speed: [10, 28], life: [0.8, 2.2], gravity: [0, -9, 0], size: [0.18, 0.05], stretch: 1.6, ramp: SPK, intensity: 4, delay: 0.05, pos: [0, 0.5, 0] });
    } },

  { id: 'explosions/plasma-explosion', name: 'Plasma explosion', category: 'explosions', loop: false, duration: 1.7, stage: { sky: 'dark', bloom: 0.7, view: { pos: [4.2, 2.2, 5.6], target: [0, 1.2, 0] } },
    build(fx) {
      const c = [0, 1.2, 0];
      fx.flash(0, 0.25, '#b8a0ff', 0.6); fx.shake(0, 0.4, 0.05);
      fx.light({ color: '#7a60ff', intensity: 250, pos: [0, 1.4, 0.5], range: 20, env: (t) => t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 2.2), norm: 100 });
      fx.orb({ t0: 0, dur: 0.7, r: [0.2, 1.6], ease: 'out', kind: 'plasma', intensity: 1.0, power: 2, ramp: [[0, '#2010a0'], [0.4, '#6a3cff'], [0.75, '#6ad0ff'], [1, '#ffffff']], pos: c, fade: [0, 0.5], noise: 2.2, scroll: 4, disp: 0.5 });
      fx.orb({ t0: 0, dur: 0.35, r: [0.1, 0.7], ease: 'out', kind: 'energy', intensity: 1.0, ramp: [[0, '#fff'], [1, '#aaf']], pos: c, fade: [0, 0.3] });
      fx.ring({ t0: 0, dur: 0.7, r: [0.2, 5], width: [0.4, 0.08], normal: 'up', pos: [0, 0.02, 0], intensity: 1.3, fill: 0.2, ramp: [[0, '#fff'], [0.4, '#9ae'], [1, '#52f']] });
      fx.ring({ t0: 0.02, dur: 0.5, r: [0.2, 3.4], width: [0.3, 0.05], normal: 'cam', pos: c, intensity: 1.4, ramp: [[0, '#fff'], [1, '#8ae']] });
      fx.decal({ kind: 'glow', t0: 0, dur: 1.5, r: [2.5, 3], fade: [0.05, 1.0], ramp: [[0, '#000'], [0.4, '#2a1a8a'], [1, '#8ac4ff']], intensity: 1.2 });
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + fx.rng() * 0.5, h = fx.rng.range(0.3, 2.2), r = fx.rng.range(2.2, 3.2); fx.bolt({ from: c, to: [Math.cos(a) * r, h, Math.sin(a) * r], t0: 0.03 + i * 0.015, dur: 0.5, fade: [0, 0.3], jag: 0.35, branches: 2, width: 0.045, rate: 24, ramp: [[0, '#fff'], [0.5, '#9cf'], [1, '#63f']] }); }
      fx.emitter({ count: 120, kind: 'spark', shape: 'sphere', radius: 0.2, dir: [0, 1, 0], spread: 3.2, speed: [3, 10], life: [0.4, 1.1], size: [0.08, 0.025], stretch: 1.3, ramp: [[0, '#fff'], [0.3, '#9cf'], [1, '#42c', 0]], intensity: 4, drag: 1, gravity: [0, -3, 0], pos: c });
      fx.emitter({ count: 30, kind: 'soft', shape: 'sphere', radius: 0.4, dir: [0, 1, 0], spread: 3.2, speed: [1, 3], life: [0.5, 1.2], size: [0.3, 0.05], ramp: [[0, '#cbf', 0.8], [1, '#52f', 0]], intensity: 1.8, drag: 1, pos: c });
      fx.emitter({ count: 14, kind: 'smoke', shape: 'sphere', radius: 0.3, dir: [0, 1, 0], spread: 3.2, speed: [0.6, 1.8], life: [0.8, 1.4], size: [0.8, 1.8], ramp: [[0, '#7a5aff', 0], [0.2, '#5a3ae0', 0.3], [1, '#102', 0]], intensity: 0.5, drag: 1.3, delay: 0.1, pos: c });
    } },

  { id: 'explosions/smoke-bomb', name: 'Smoke bomb', category: 'explosions', loop: false, duration: 5, stage: { sky: 'day', view: { pos: [4.6, 2.2, 6.4], target: [0, 1.1, 0] } },
    build(fx) {
      const can = new THREE.Group(); const cm = mat('#58603e', 0.5, 0.6); const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.2, 18), cm); cb.position.y = 0.1; can.add(cb); const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.04, 18), mat('#222', 0.4, 0.8)); cap.position.y = 0.22; can.add(cap); can.rotation.z = Math.PI / 2; can.position.set(0, 0.06, 0);
      fx.mesh(can, (t, pr, f, w, o) => { const u = Math.min(1, t / 0.3); o.rotation.x = u * 0.2; o.position.y = 0.06 + Math.abs(Math.sin(t * 6)) * 0.002; }, { t0: 0, dur: 5 });
      fx.flash(0.28, 0.12, '#fff', 0.15);
      fx.emitter({ count: 14, kind: 'spark', shape: 'point', dir: [0, 1, 0], spread: 0.7, speed: [1, 3], life: [0.3, 0.7], gravity: [0, -6, 0], size: [0.04, 0.012], stretch: 0.8, ramp: SPK, intensity: 3, t0: 0, t1: 0.7, delay: 0.25, pos: [0, 0.25, 0] });
      fx.emitter({ count: 150, kind: 'smoke', blend: 'normal', lit: 1, order: -1, shape: 'sphere', radius: 0.25, dir: [0, 1, 0], spread: 1.5, speed: [1.2, 3.4], life: [2.8, 4.4], size: [1.0, 3.4], ramp: [[0, '#c6c8c2', 0], [0.1, '#b4b6b0', 0.85], [0.6, '#8f918c', 0.6], [1, '#6a6c68', 0]], delay: 0.3, emit: 1.8, drag: 0.9, gravity: [0, 0.18, 0], turb: [0.45, 0.45], pos: [0, 0.4, 0], radial: 0.5 });
      fx.emitter({ count: 50, kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 0.3, radiusIn: 0.1, dir: [0, 0.05, 0], spread: 0.1, radial: 1, speed: [1.5, 3], life: [1.5, 2.8], size: [0.6, 1.8], ramp: [[0, '#b8b8b0', 0], [0.2, '#b0b0a8', 0.5], [1, '#808078', 0]], drag: 1.2, delay: 0.3, emit: 1.5, pos: [0, 0.2, 0] });
      fx.emitter({ count: 40, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 1.2, dir: [0, 1, 0], spread: 1.2, speed: [0.1, 0.4], life: [2, 3.2], size: [0.5, 1.4], ramp: [[0, '#b4b6b0', 0], [0.3, '#a0a29c', 0.14], [1, '#808280', 0]], delay: 2.0, emit: 2.5, turb: [0.4, 0.8], gravity: [0, 0.25, 0], pos: [0, 0.8, 0] });
    } },
];
