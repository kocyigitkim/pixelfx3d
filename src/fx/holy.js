import * as THREE from 'three';
import { Dummy, POSES } from '../core/dummy.js';
import { NOISE } from '../core/glsl.js';
import { spiral } from '../core/meshes.js';
import { clamp, smooth as sm, lerp } from '../core/rng.js';
import { burst } from './_aaa.js';

const TAU = Math.PI * 2;
const GOLD = [[0, '#fff2dc'], [0.25, '#fff0b8'], [0.6, '#ffc040'], [1, '#a05800']];
const GOLD_A = (a = 0) => [[0, '#fff2dc', 1], [0.25, '#ffeaa0', 0.9], [0.6, '#ffb830', 0.6], [1, '#8a4a00', a]];
const GRN = [[0, '#eaf6dc'], [0.25, '#c8ffd0'], [0.6, '#50e070'], [1, '#106030']];
const SKY = { sky: 'dark', bloom: 0.6 };
const HOLYB = [[0, '#fff2dc'], [0.5, '#ffc040'], [1, '#a05800']];

const heartMesh = (col = '#ff5a78') => {
  const s = new THREE.Shape(); s.moveTo(0, -0.5); s.bezierCurveTo(-0.7, 0.0, -0.55, 0.7, 0, 0.35); s.bezierCurveTo(0.55, 0.7, 0.7, 0.0, 0, -0.5);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.07, bevelSegments: 4, curveSegments: 14 }); g.center(); g.scale(0.16, 0.16, 0.16);
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.9, roughness: 0.25, metalness: 0.1, transparent: true }));
};
const plusMesh = () => {
  const m = new THREE.MeshStandardMaterial({ color: '#7dff8d', emissive: '#30d060', emissiveIntensity: 1.4, roughness: 0.3, transparent: true });
  const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.07, 0.07), m), new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.22, 0.07), m)); g.userData.m = m; return g;
};
const featherGeo = () => { const g = new THREE.SphereGeometry(1, 12, 8); g.scale(0.045, 0.34, 0.012); g.translate(0, 0.34, 0); return g; };
const wingGroup = (side) => {
  const grp = new THREE.Group(), geo = featherGeo(), mat = new THREE.MeshStandardMaterial({ color: '#fffaf0', emissive: '#fff2c8', emissiveIntensity: 0.12, roughness: 0.6, transparent: true, side: THREE.DoubleSide });
  const fs = []; for (let i = 0; i < 9; i++) { const pivot = new THREE.Group(); const f = new THREE.Mesh(geo, mat); f.scale.set(1 + i * 0.12, 0.55 + i * 0.13, 1); f.rotation.z = Math.PI; pivot.add(f); pivot.userData.i = i; grp.add(pivot); fs.push(pivot); }
  grp.userData = { fs, mat, side }; return grp;
};
const placeWing = (w, open, side) => { // open 0 folded .. 1 spread
  const fs = w.userData.fs; for (const p of fs) { const i = p.userData.i; const spread = (0.25 + i * 0.2) * open; p.rotation.set(0, 0, 0); p.rotation.x = -side * (0.2 + open * 0.55); p.rotation.z = (-0.15 - i * 0.04) + spread * 1.05 + open * 0.15; p.position.set(-i * 0.02, i * 0.02 * open, 0); }
};

export default [
  /* ------------------------------------------------------------------ blessing */
  { id: 'holy/blessing', name: 'Blessing', category: 'holy', loop: true, duration: 3, body: true, stage: { ...SKY, view: { pos: [2.6, 1.7, 4.2], target: [0, 1.6, 0], fov: 46 } },
    build(fx) {
      fx.body.setPose(POSES.idle);
      fx.on((t) => { fx.body.set({ tint: '#ffe8a0', glow: 0.35 + 0.1 * Math.sin(t / 3 * TAU), tintAmt: 0.1 }); });
      fx.beam({ pos: [0, 0, 0], height: 6, r: [1.15, 0.2], intensity: 0.28, ramp: [[0, '#ffe8a0'], [0.5, '#fff0c0'], [1, '#fffaf0']], noise: 0.8, edge: 2, speed: 0.6, freq: 1.5, pulse: 0.1 });
      fx.beam({ pos: [0.3, 0, 0.1], height: 6, r: [0.35, 0.05], intensity: 0.3, ramp: [[0, '#ffd070'], [1, '#fff']], noise: 0.9, edge: 2.2, speed: 0.9, freq: 2.2 });
      fx.decal({ kind: 'glow', r: [1.4, 1.4], ramp: [[0, '#000'], [0.5, '#a06010'], [1, '#ffe090']], intensity: 0.9, alpha: 0.7, y: 0.01 });
      fx.light({ color: '#ffe0a0', intensity: 12, pos: [0.4, 3, 0.4], range: 9, flicker: 0.05, rate: TAU / 3 });
      fx.emitter({ count: 90, kind: 'glint', shape: 'disc', radius: 0.9, pos: [0, 3.4, 0], dir: [0, -1, 0], spread: 0.1, speed: [0.5, 1.1], life: [2.4, 3.2], size: [0.1, 0.04], rot: 0.7, ramp: [[0, '#fff', 0], [0.2, '#fff4c8', 1], [0.8, '#ffd060', 0.8], [1, '#c80', 0]], intensity: 1.5, turb: [0.2, 1], loop: true });
      fx.emitter({ count: 90, kind: 'soft', shape: 'disc', radius: 0.8, pos: [0, 3.2, 0], dir: [0, -1, 0], spread: 0.1, speed: [0.3, 0.9], life: [2.6, 3.2], size: [0.03, 0.01], ramp: [[0, '#fff2dc', 0], [0.2, '#ffe8a0', 1], [1, '#c80', 0]], intensity: 1.5, turb: [0.2, 1.4], floorFade: 1 });
    } },

  /* ------------------------------------------------------------------ divine shield */
  { id: 'holy/divine-shield', name: 'Divine shield', category: 'holy', loop: true, duration: 2.4, body: true, stage: { ...SKY, view: { pos: [2.8, 1.5, 3.8], target: [0, 0.95, 0], fov: 42 } },
    build(fx) {
      const D = 2.4; fx.body.setPose(POSES.guard);
      fx.shell({ r: 1.25, pos: [0, 0.95, 0], cells: 6, power: 2.2, intensity: 1.5, noise: 0.5, pulse: [0.015, TAU / D * 2], ramp: [[0, '#6a3a00'], [0.45, '#ffb830'], [1, '#fff6d0']], impacts: [{ t: 0.5, dir: [1, 0.3, 0.4] }, { t: 1.6, dir: [0.5, 0.6, 0.8] }] });
      fx.shell({ r: 1.28, pos: [0, 0.95, 0], power: 4, intensity: 0.6, noise: 0.2, alpha: 0.6, ramp: [[0, '#000'], [0.5, '#ffe090'], [1, '#fff']] });
      fx.decal({ kind: 'rune', r: [1.25, 1.25], glyphs: 12, poly: 6, spin: TAU / 12 / D * 2, ramp: [[0, '#8a5000'], [0.5, '#ffc040'], [1, '#fff4c8']], intensity: 1.2 });
      fx.decal({ kind: 'glow', r: [1.6, 1.6], ramp: [[0, '#000'], [0.5, '#a06010'], [1, '#ffe090']], intensity: 0.7, alpha: 0.6, y: 0.003 });
      fx.emitter({ count: 40, kind: 'glint', shape: 'sphere', radius: 1.25, radiusIn: 1.1, pos: [0, 0.95, 0], size: [0.14, 0.03], life: [0.4, 0.7], ramp: [[0, '#fff'], [1, '#fc6', 0]], intensity: 3, speed: [0, 0.1] });
      fx.emitter({ count: 40, kind: 'soft', shape: 'sphere', radius: 1.2, pos: [0, 0.95, 0], dir: [0, 1, 0], speed: [0.1, 0.4], life: [1.4, 2.4], size: [0.03, 0.01], ramp: [[0, '#fff2dc', 0], [0.3, '#ffe090', 1], [1, '#c80', 0]], intensity: 1.5, turb: [0.2, 1], swirl: TAU / D });
      fx.light({ color: '#ffc860', intensity: 12, pos: [0.3, 1.0, 0.8], range: 6, flicker: 0.06, rate: TAU / D * 3 });
    } },

  /* ------------------------------------------------------------------ feather burst */
  { id: 'holy/feather-burst', name: 'Feather burst', category: 'holy', tier: 1, loop: false, duration: 3, stage: { sky: 'day', bloom: 0.35, view: { pos: [2.6, 1.6, 4.0], target: [0, 1.1, 0], fov: 44 } },
    build(fx) {
      fx.emitter({ count: 24, kind: 'smoke', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.2, pos: [0, 1.2, 0], radial: 1, spread: 1.4, speed: [0.5, 2.0], life: [0.7, 1.3], size: [0.5, 1.4], drag: 3, ramp: [[0, '#bdbdbd', 0.95], [0.4, '#b3b3b9', 0.7], [1, '#9ea3b0', 0]], order: -1, gravity: [0, 0.2, 0] });
      fx.emitter({ count: 80, kind: 'petal', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.15, pos: [0, 1.2, 0], dir: [0, 1, 0], radial: 0.6, spread: 1.4, speed: [2, 5.5], life: [2.4, 3.0], size: [0.2, 0.14], aspect: 2.2, drag: 2.4, gravity: [0, -0.7, 0], turb: [0.7, 1.2], rot: 3.5, ramp: [[0, '#ffffff', 1], [0.7, '#f4f0ea', 1], [1, '#dcd8d0', 0]] });
      fx.emitter({ count: 20, kind: 'petal', blend: 'normal', lit: 1, shape: 'sphere', radius: 0.15, pos: [0, 1.2, 0], dir: [0, 1, 0], spread: 1.6, speed: [1, 3], life: [2.4, 3.0], size: [0.28, 0.2], aspect: 2.4, drag: 2.0, gravity: [0, -0.5, 0], turb: [0.9, 1], rot: 2.5, ramp: [[0, '#fff', 1], [1, '#e8e4dc', 0]], delay: 0.05 });
      fx.emitter({ count: 40, kind: 'glint', shape: 'sphere', radius: 0.5, pos: [0, 1.2, 0], radial: 1, speed: [0.5, 2.5], life: [0.4, 0.7], size: [0.18, 0.04], drag: 1.5, ramp: [[0, '#fff'], [1, '#fe9', 0]], intensity: 2.6, emit: 0.5 });
      fx.ring({ t0: 0, dur: 0.5, r: [0.2, 2.0], width: [0.15, 0.03], normal: 'cam', pos: [0, 1.2, 0], intensity: 0.9, ramp: [[0, '#fff2dc'], [1, '#fff6d0']] });
      fx.decal({ kind: 'glow', r: [1.4, 1.4], t0: 0, dur: 2.5, fade: [0.1, 1.5], ramp: [[0, '#000'], [0.5, '#908060'], [1, '#fff4d0']], intensity: 0.5, alpha: 0.5 });
      burst(fx, [0, 1.2, 0], 0, { flash: false, ramp: [[0, '#fff2dc'], [0.5, '#fff4d8'], [1, '#d6c8a0']], col: '#fff4d8' });
    } },

  /* ------------------------------------------------------------------ halo */
  { id: 'holy/halo', name: 'Halo', category: 'holy', loop: true, duration: 2, body: true, stage: { ...SKY, bloom: 0.45, view: { pos: [1.8, 2.0, 2.6], target: [0, 1.75, 0], fov: 38 } },
    build(fx) {
      const D = 2; fx.body.setPose(POSES.idle);
      const grp = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: '#ffd24a', metalness: 1, roughness: 0.22, emissive: '#ff9a10', emissiveIntensity: 0.5 });
      const tor = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.017, 14, 56), mat); tor.rotation.x = Math.PI / 2; grp.add(tor);
      const tor2 = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.006, 8, 56), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.2, 0.5) })); tor2.rotation.x = Math.PI / 2; grp.add(tor2);
      fx.mesh(grp, (t) => { const ph = t / D * TAU; grp.position.set(-0.02, 1.98 + 0.03 * Math.sin(ph), 0); grp.rotation.set(0.12 * Math.sin(ph + 1), ph, 0.08 * Math.cos(ph)); }, { dur: 99 });
      fx.ribbon({ points: (t) => { const pts = [], n = 56, ph = t / D * TAU * 2; for (let i = 0; i <= n; i++) { const a = (i / n) * TAU * 0.999 + ph; pts.push([-0.02 + Math.cos(a) * 0.21, 1.98 + 0.03 * Math.sin(t / D * TAU), Math.sin(a) * 0.21]); } return pts; }, n: 56, width: 0.03, head: () => 1.001, tail: 0.6, intensity: 1.2, core: 4, ramp: [[0, '#fff4d0'], [0.3, '#ffe0a0'], [0.7, '#ffb840'], [1, '#a05800']] });
      fx.orb({ kind: 'energy', r: 0.0001, alpha: 0, pos: [0, 0, 0] });
      fx.emitter({ count: 22, kind: 'glint', shape: 'ring', radius: 0.21, radiusIn: 0.18, pos: [-0.02, 1.98, 0], size: [0.1, 0.02], life: [0.4, 0.7], ramp: [[0, '#fff'], [1, '#fc6', 0]], intensity: 2, speed: [0, 0.1], dir: [0, 1, 0] });
      fx.emitter({ count: 24, kind: 'soft', shape: 'ring', radius: 0.21, radiusIn: 0.18, pos: [-0.02, 1.98, 0], dir: [0, 1, 0], spread: 0.4, speed: [0.05, 0.25], life: [0.8, 1.6], size: [0.025, 0.006], ramp: [[0, '#fff2dc'], [1, '#fa4', 0]], intensity: 1.5 });
      fx.on((t) => fx.body.set({ rim: '#ffd070', rimAmt: 0.25 }));
      fx.light({ color: '#ffc860', intensity: 14, pos: [0.1, 2.25, 0.2], range: 3.5, flicker: 0.05, rate: TAU / D * 2 });
    } },

  /* ------------------------------------------------------------------ heal */
  { id: 'holy/heal', name: 'Heal', category: 'holy', loop: false, duration: 1.9, body: true, stage: { ...SKY, view: { pos: [2.4, 1.5, 3.6], target: [0, 1.0, 0], fov: 42 } },
    build(fx) {
      const GOLD_R = [[0, '#fff6e0'], [0.5, '#e8c890'], [1, '#8a6a30']];
      fx.on((t) => { const k = sm(0.6, 1.0, t) * (1 - sm(1.2, 1.9, t)); fx.body.set({ tint: '#ffd890', tintAmt: k * 0.2, glow: k * 0.35 }); }); // subtle gold body glow
      fx.decal({ kind: 'rune', r: [1.2, 1.2], glyphs: 12, poly: 6, spin: 0.4, reveal: 0.4, t0: 0, dur: 1.9, fade: [0.3, 0.8], ramp: [[0, '#8a5000'], [0.5, '#ffc040'], [1, '#fff4c8']], intensity: 1.2 });
      fx.emitter({ count: 30, kind: 'glint', shape: 'sphere', radius: 1.2, pos: [0, 1.0, 0], radial: -1, speed: [1, 2], life: [0.4, 0.6], size: [0.08, 0.03], ramp: [[0, '#fff', 0], [0.3, '#fff6e0', 1], [1, '#e8c890', 0]], intensity: 2, emit: 0.4 }); // motes gather to the body
      for (const s of [1, -1]) { // two counter-rotating spirals: scroll flips direction
        fx.erode({ geo: spiral({ turns: 1.5, r0: 0.55, r1: 0.45, h: 1.9, w: 0.28 }), blend: 'add', ramp: GOLD_R, intensity: 1.6, scroll: [s, 0], tile: [3, 1], erode: [0.1, 0.8], head: [0, 1], soft: 0.25, rot3: [0, s < 0 ? Math.PI : 0, 0], t0: 0.2, dur: 1.6 });
      }
      fx.light({ color: '#ffd890', intensity: 25, pos: [0.4, 1.2, 0.6], range: 5, t0: 0, dur: 1.9, fade: [0.05, 0.6], env: (t) => sm(0, 0.6, t) * (1 - sm(0.6, 1.6, t)) });
      fx.emitter({ count: 40, kind: 'soft', tex: 'ember-burst', shape: 'disc', radius: 0.5, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.2, speed: [0.4, 1.2], life: [1.2, 1.8], size: [0.2, 0.1], ramp: [[0, '#fff6e0', 0], [0.2, '#ffd890', 1], [1, '#8a6a30', 0]], intensity: 2, delay: 0.6, emit: 0.8 }); // gold motes drift up
    } },

  /* ------------------------------------------------------------------ heal aoe */
  { id: 'holy/heal-aoe', name: 'Healing ring', category: 'holy', loop: false, duration: 2.9, stage: { sky: 'dusk', bloom: 0.55, view: { pos: [3.4, 3.0, 4.6], target: [0, 0.3, 0], fov: 42 } },
    build(fx) {
      const RING = [3.5, 1.5]; const speed = 3.2 / 1.2; // ring reaches r=3.2 at t=1.2
      fx.ring({ t0: 0.0, dur: 1.3, r: [0.2, 3.6], width: [0.45, 0.1], normal: 'up', intensity: 1.0, fill: 0.2, decay: 0.5, ramp: [[0, '#eaf6dc'], [0.4, '#a0ffb8'], [1, '#30c060']] });
      fx.ring({ t0: 0.12, dur: 1.2, r: [0.2, 3.0], width: [0.2, 0.05], normal: 'up', intensity: 1.0, ramp: [[0, '#eaf6dc'], [1, '#60f090']] });
      fx.decal({ kind: 'glow', r: [3.0, 3.2], t0: 0, dur: 2.9, fade: [0.3, 1.4], ramp: [[0, '#000'], [0.5, '#0a5028'], [1, '#70ffa0']], intensity: 0.9, alpha: 0.7, y: 0.005 });
      fx.decal({ kind: 'rune', r: [1.6, 1.6], glyphs: 12, poly: 6, spin: 0.4, reveal: 0.6, t0: 0.1, dur: 2.7, fade: [0.1, 1.2], ramp: [[0, '#106030'], [0.5, '#50e080'], [1, '#d0ffe0']], intensity: 1.2 });
      fx.light({ color: '#70ff98', intensity: 26, pos: [0, 1.2, 0.2], range: 10, t0: 0, dur: 2.9, fade: [0.1, 1.4], env: (t) => 0.5 + 0.8 * Math.exp(-t * 1.5) });
      for (let i = 0; i < 14; i++) {
        const a = i * 2.399 + fx.rng() * 0.6, r = 0.5 + 2.6 * Math.sqrt((i + 0.5) / 14), x = Math.cos(a) * r, z = Math.sin(a) * r, tS = r / speed + 0.05, rise = 0.9 + fx.rng() * 0.5, sc = 0.9 + fx.rng() * 0.8;
        const p = plusMesh(); fx.mesh(p, (t) => { const u = clamp((t - tS) / 1.3); p.visible = t > tS && u < 1; const e = 1 - Math.pow(1 - clamp(u * 3), 3); p.scale.setScalar(sc * e * (u > 0.7 ? 1 - (u - 0.7) / 0.3 * 0.2 : 1)); p.position.set(x, 0.05 + u * rise * 0.9 + 0.15 * e, z); p.rotation.y = u * 3 + i; p.userData.m.opacity = 1 - sm(0.65, 1, u); }, { dur: 99 });
        fx.emitter({ count: 8, kind: 'glint', shape: 'point', pos: [x, 0.3, z], size: [0.16, 0.04], life: [0.3, 0.7], ramp: [[0, '#fff'], [1, '#8fa', 0]], intensity: 3, delay: tS, emit: 0.4, speed: [0, 0.3] });
      }
      fx.emitter({ count: 120, kind: 'soft', shape: 'disc', radius: 3.0, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.4, 1.4], life: [1.0, 1.8], size: [0.04, 0.01], ramp: [[0, '#eaf6dc'], [0.4, '#90ffb0'], [1, '#20c050', 0]], intensity: 1.5, delay: 0.3, emit: 1.6, floorFade: 1 });
      fx.emitter({ count: 22, kind: 'petal', shape: 'disc', radius: 2.4, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1.4], life: [1.2, 1.9], size: [0.12, 0.07], aspect: 1.8, rot: 3, turb: [0.4, 1], ramp: [[0, '#eaf6dc', 0.9], [0.5, '#a0ffc0', 0.9], [1, '#40d070', 0]], intensity: 1.5, delay: 0.3, emit: 1.4 });
    } },

  /* ------------------------------------------------------------------ holy pillar */
  { id: 'holy/holy-pillar', name: 'Holy pillar', category: 'holy', tier: 2, loop: false, duration: 3.5, stage: { ...SKY, view: { pos: [3.4, 2.0, 5.0], target: [0, 1.7, 0], fov: 46 } },
    build(fx) {
      const G = [[0, '#ffc860'], [0.5, '#fff0c0'], [1, '#ffffff']], N = 5, TC = 1.1, TF = 2.7;
      fx.decal({ kind: 'rune', r: [1.5, 1.5], glyphs: 14, poly: 5, spin: 0.35, reveal: 0.9, t0: 0, dur: 3.5, fade: [0.1, 0.7], ramp: [[0, '#8a5000'], [0.5, '#ffc040'], [1, '#fff4c8']], intensity: 1.2 });
      fx.decal({ kind: 'glow', r: [1.8, 1.8], t0: 0.2, dur: 3.2, fade: [0.5, 0.8], ramp: [[0, '#000'], [0.5, '#a06010'], [1, '#ffe090']], intensity: 0.9, alpha: 0.7, y: 0.003 });
      for (let i = 0; i < N; i++) { // converging shafts
        const a = i * TAU / N + 0.4, st = 0.2 + i * 0.08;
        fx.beam({ t0: st, dur: TC - st + 0.4, fade: [0.15, 0.3], r: [0.09, 0.05], intensity: 0.7, noise: 0.6, ramp: G, path: (t) => { const u = sm(st, TC, t); const R = 3.2 * (1 - u) + 0.05; return [[Math.cos(a) * R * 1.4, 0, Math.sin(a) * R * 1.4], [Math.cos(a) * R * 0.5, 6, Math.sin(a) * R * 0.5]]; } });
      }
      fx.beam({ pos: [0, 0, 0], height: 8, r: [0.45, 0.45], intensity: 0.3, t0: TC, dur: TF - TC + 0.4, fade: [0.05, 0.5], extend: 5, grow: [1, 0.05], ramp: [[0, '#ffc860'], [0.5, '#fff0c0'], [1, '#fff']], noise: 0.5, speed: 3 });
      fx.beam({ pos: [0, 0, 0], height: 8, r: [0.14, 0.14], intensity: 0.9, t0: TC, dur: TF - TC, fade: [0.05, 0.4], extend: 5, grow: [1, 0.05], ramp: [[0, '#fff2dc'], [1, '#fff']], noise: 0.2 });
      fx.ring({ t0: TC, dur: 0.8, r: [0.3, 3.8], width: [0.2, 0.03], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [1, '#ffb830']] });
      fx.ring({ t0: TF, dur: 0.6, r: [2.2, 0.2], width: [0.15, 0.05], normal: 'up', intensity: 1.0, ramp: [[0, '#fff2dc'], [1, '#ffb830']] });
      fx.flash(TC, 0.3, '#fff0c0', 0.08); fx.flash(TF + 0.1, 0.2, '#fff0c0', 0.08);
      fx.light({ color: '#ffd070', intensity: 41, pos: [0.5, 1.5, 0.7], range: 10, env: (t) => sm(0.1, 1.1, t) * 0.8 + (t > TC ? 0.9 : 0) * (1 - sm(TF, 3.5, t)), t0: 0, dur: 3.5, fade: [0.1, 0.4] });
      fx.emitter({ count: 120, kind: 'soft', shape: 'disc', radius: 1.2, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.1, speed: [1.2, 3.5], life: [1, 1.8], size: [0.04, 0.01], ramp: [[0, '#fff2dc'], [0.4, '#ffd060'], [1, '#b60', 0]], intensity: 1.5, delay: TC, emit: 1.4, swirl: 1 });
      fx.emitter({ count: 40, kind: 'glint', shape: 'disc', radius: 1.3, pos: [0, 0.2, 0], dir: [0, 1, 0], size: [0.25, 0.04], life: [0.3, 0.7], ramp: [[0, '#fff'], [1, '#fd8', 0]], intensity: 3.5, delay: TC, emit: 1.5, speed: [0, 0.4] });
      burst(fx, [0, 0, 0], TC, { ramp: HOLYB, col: '#ffd070', scorch: false });
    } },

  /* ------------------------------------------------------------------ resurrection */
  { id: 'holy/resurrection', name: 'Resurrection', category: 'holy', loop: false, duration: 4.8, body: true, stage: { ...SKY, bloom: 0.45, view: { pos: [3.6, 1.8, 5.0], target: [-0.2, 1.0, 0], fov: 44 } },
    build(fx) {
      const TS = 1.5, TW = 2.6, TX = 3.7; const L = wingGroup(1), R = wingGroup(-1);
      const wings = new THREE.Group(); L.position.z = 0.1; R.position.z = -0.1; R.scale.z = -1; wings.add(L, R); wings.position.set(-0.12, 1.42, 0);
      fx.mesh(wings, (t) => {
        const o = sm(TW, TW + 0.8, t), fold = 0.05 + 0.95 * o; wings.visible = t > TW - 0.05 && t < TX + 0.4; placeWing(L, fold, 1); placeWing(R, fold, 1);
        const a = 1 - sm(TX - 0.2, TX + 0.4, t); L.userData.mat.opacity = a * sm(TW - 0.05, TW + 0.15, t); wings.rotation.y = 0; wings.scale.setScalar(0.8 + 0.4 * o + 0.1 * Math.sin(t * 2)); wings.position.y = 1.42 + 0.03 * Math.sin(t * 2.2);
      }, { dur: 99 });
      fx.on((t) => {
        const u = sm(TS, TS + 1.3, t); const lie = 1 - u; fx.body.rotation.z = lie * Math.PI / 2; fx.body.position.set(0, lie * 0.14, 0); fx.body.setPose({ ...POSES.idle, aR: 15 + 140 * sm(TW, TW + 0.8, t) * (1 - sm(TX, TX + 0.5, t)), aL: 10 + 140 * sm(TW, TW + 0.8, t) * (1 - sm(TX, TX + 0.5, t)), head: 8 * (1 - u) });
        const k = sm(0.6, 1.6, t) * (1 - sm(3.4, 4.6, t)); fx.body.set({ tint: '#ffe8a8', tintAmt: 0.5 * k + 0.3 * (1 - sm(0.4, 1.2, t)) * 0.0, glow: 0.6 * k + 0.4 * Math.exp(-Math.pow((t - TS - 1.3) / 0.3, 2)), rim: '#ffd070', rimAmt: 0.9 * k });
      });
      fx.beam({ pos: [0, 0, 0], height: 7, r: [0.9, 0.5], intensity: 0.35, t0: 0.3, dur: 3.2, fade: [0.8, 1.2], ramp: [[0, '#ffb040'], [0.5, '#ffe0a0'], [1, '#fff4d8']], noise: 0.7, speed: 1.2, edge: 1.8, grow: [0.6, 1] });
      fx.beam({ pos: [0, 0, 0], height: 7, r: [0.18, 0.1], intensity: 0.35, t0: 0.5, dur: 2.5, fade: [0.8, 0.9], ramp: [[0, '#fff4d8'], [1, '#ffd070']], noise: 0.3 });
      fx.decal({ kind: 'rune', r: [1.6, 1.6], glyphs: 16, poly: 6, spin: 0.3, reveal: 1.0, t0: 0.2, dur: 4.4, fade: [0.2, 1.0], ramp: [[0, '#8a5000'], [0.5, '#ffc040'], [1, '#fff4c8']], intensity: 1.0 });
      fx.decal({ kind: 'glow', r: [2.0, 2.0], t0: 0.2, dur: 4.2, fade: [0.8, 1.2], ramp: [[0, '#000'], [0.5, '#a06010'], [1, '#ffe090']], intensity: 0.8, alpha: 0.6, y: 0.003 });
      fx.ring({ t0: TS + 1.2, dur: 0.8, r: [0.3, 4.2], width: [0.4, 0.06], normal: 'up', intensity: 1.0, ramp: [[0, '#fff2dc'], [1, '#ffb830']] });
      fx.ring({ t0: TW + 0.2, dur: 0.7, r: [0.2, 2.8], width: [0.25, 0.05], normal: 'cam', pos: [-0.1, 1.4, 0], intensity: 0.7, ramp: [[0, '#fff2dc'], [1, '#ffd070']] });
      fx.shake(TS + 1.25, 0.4, 0.025);
      fx.light({ color: '#ffd070', intensity: 23, pos: [0.5, 1.5, 0.8], range: 10, env: (t) => (1 - 0.65 * sm(2.4, 3.2, t)) * (0.3 + sm(0.3, 1.5, t) * 0.7) + 0.8 * Math.exp(-Math.pow((t - TS - 1.3) / 0.4, 2)) + 0.6 * Math.exp(-Math.pow((t - TX) / 0.3, 2)), t0: 0, dur: 4.8, fade: [0.2, 1.0] });
      fx.emitter({ count: 120, kind: 'soft', shape: 'disc', radius: 1.2, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.5, 1.8], life: [1.2, 2.2], size: [0.04, 0.01], ramp: [[0, '#fff2dc'], [0.4, '#ffd060'], [1, '#b60', 0]], intensity: 1.5, delay: 0.5, emit: 3.2, swirl: 1.2 });
      fx.emitter({ count: 30, kind: 'glint', shape: 'box', shapeSize: [0.7, 0.1, 0.2], pos: [-0.5, 0.7, 0], size: [0.2, 0.04], life: [0.3, 0.7], ramp: [[0, '#fff'], [1, '#fd8', 0]], intensity: 2, delay: 0.8, emit: 2.5, speed: [0, 0.3] });
      fx.emitter({ count: 110, kind: 'petal', blend: 'normal', lit: 1, shape: 'box', shapeSize: [0.2, 0.5, 1.0], pos: [-0.2, 1.5, 0], dir: [-0.3, 0.5, 0], radial: 0.7, spread: 1.4, speed: [1, 3.8], life: [2.0, 3.0], size: [0.14, 0.09], aspect: 2.4, drag: 2, gravity: [0, -0.5, 0], turb: [0.7, 1.1], rot: 3, ramp: [[0, '#f4f0e8', 1], [0.7, '#e8e0d0', 1], [1, '#e0d8c8', 0]], delay: TX });
      fx.emitter({ count: 50, kind: 'glint', shape: 'box', shapeSize: [0.3, 0.6, 1.0], pos: [-0.2, 1.5, 0], radial: 1, speed: [0.5, 2], life: [0.4, 0.7], size: [0.2, 0.04], drag: 1.2, ramp: [[0, '#fff'], [1, '#fe9', 0]], intensity: 2, delay: TX, emit: 0.5 });
    } },

  /* ------------------------------------------------------------------ smite */
  { id: 'holy/smite', name: 'Smite', category: 'holy', tier: 3, loop: false, duration: 2.8, body: true, stage: { ...SKY, view: { pos: [3.2, 1.8, 5.2], target: [0, 1.7, 0], fov: 46 } },
    build(fx) {
      const TI = 0.95;
      fx.decal({ kind: 'rune', r: [1.1, 1.1], glyphs: 10, poly: 4, spin: 0.8, reveal: 0.4, t0: 0, dur: 2.4, fade: [0.1, 0.9], ramp: [[0, '#8a5000'], [0.5, '#ffc040'], [1, '#fff4c8']], intensity: 1.6 });
      fx.beam({ from: [0, 0, 0], to: [0, 9, 0], r: [0.04, 0.04], t0: 0.1, dur: TI - 0.1, fade: [0.2, 0.05], intensity: 0.8, ramp: [[0, '#ffd070'], [1, '#fff']], noise: 0.2 });
      fx.beam({ pos: [0, 0, 0], height: 10, r: [0.4, 0.4], t0: TI, dur: 1.1, fade: [0.0, 0.8], intensity: 0.45, ramp: [[0, '#ffc860'], [0.5, '#fff0c0'], [1, '#fff']], noise: 0.6, speed: 6, grow: [1.2, 0.5], extend: 7 });
      fx.beam({ pos: [0, 0, 0], height: 10, r: [0.14, 0.14], t0: TI, dur: 0.8, fade: [0.0, 0.6], intensity: 1.2, ramp: [[0, '#fff2dc'], [1, '#fff']], noise: 0.1, extend: 7 });
      fx.orb({ kind: 'energy', r: [0.35, 0.1], pos: [0, 1.0, 0], t0: TI - 0.02, dur: 0.5, fade: [0, 0.4], intensity: 2.2, ramp: [[0, '#ffa820'], [0.5, '#ffe090'], [1, '#fff']] });
      fx.ring({ t0: TI, dur: 0.8, r: [0.3, 6], width: [0.25, 0.03], normal: 'up', intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.5, '#ffe090'], [1, '#ffa010']] });
      fx.ring({ t0: TI + 0.03, dur: 0.5, r: [0.3, 3.5], width: [0.3, 0.05], normal: 'cam', pos: [0, 1.0, 0], intensity: 1.0, ramp: [[0, '#fff2dc'], [1, '#ffd070']] });
      fx.decal({ kind: 'cracks', r: [2.2, 2.6], cells: 4, heat: [1, 0.1], reveal: 0.25, t0: TI, dur: 1.8, fade: [0.05, 1.2], ramp: [[0, '#8a4a00'], [0.5, '#ffb030'], [1, '#fff4c0']] });
      fx.decal({ kind: 'scorch', r: [1.2, 1.5], t0: TI, dur: 1.8, fade: [0.1, 1.2], heat: [1, 0], ramp: [[0, '#1a1410'], [0.5, '#fa0'], [1, '#fff4c0']] });
      fx.flash(TI, 0.25, '#fff6d8', 0.15);
      fx.light({ color: '#ffc860', intensity: 30, pos: [0, 2.5, 0.5], range: 8, t0: 0.1, dur: TI - 0.1, fade: [0.3, 0.02] });
      fx.on((t) => { const h = Math.exp(-Math.max(0, t - TI) * 6) * (t > TI ? 1 : 0); fx.body.set({ tint: '#ffffff', tintAmt: h, glow: h, rim: '#ffd070', rimAmt: h }); fx.body.position.x = t > TI && t < TI + 0.5 ? 0.1 * (1 - Math.exp(-(t - TI) * 20)) * Math.exp(-(t - TI) * 5) : 0; fx.body.rotation.z = t > TI && t < TI + 0.6 ? -0.15 * Math.exp(-(t - TI) * 8) * (1 - Math.exp(-(t - TI) * 40)) : 0; });
      fx.emitter({ count: 60, kind: 'spark', shape: 'disc', radius: 0.3, pos: [0, 0.2, 0], dir: [0, 1, 0], spread: 1.3, speed: [3, 10], life: [0.4, 0.7], size: [0.07, 0.02], stretch: 1.5, gravity: [0, -9, 0], ramp: [[0, '#fff'], [0.4, '#ffd060'], [1, '#a50', 0]], intensity: 4, delay: TI, bounce: 0.35 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 1.0, 0], size: [2.0, 0.5], life: [0.3, 0.3], ramp: [[0, '#fff'], [1, '#ffd070', 0]], intensity: 4, delay: TI });
      fx.emitter({ count: 30, kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 0.5, pos: [0, 0.1, 0], radial: 1, speed: [1.5, 4], life: [0.8, 1.6], size: [0.6, 1.5], drag: 2, ramp: [[0, '#565040', 0.7], [1, '#2a241a', 0]], delay: TI, order: -1 });
      fx.emitter({ count: 70, kind: 'soft', shape: 'disc', radius: 1.2, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.2, speed: [0.5, 2.5], life: [1, 1.8], size: [0.04, 0.01], ramp: [[0, '#fff2dc'], [0.4, '#ffd060'], [1, '#b60', 0]], intensity: 1.5, delay: TI + 0.1, emit: 0.5, gravity: [0, 0.4, 0] });
      burst(fx, [0, 0, 0], TI, { ramp: HOLYB, col: '#ffd890' });
    } },

  /* ------------------------------------------------------------------ sunburst */
  { id: 'holy/sunburst', name: 'Sunburst', category: 'holy', loop: true, duration: 4, stage: { ...SKY, bloom: 0.7, view: { pos: [0.4, 1.5, 4.2], target: [0, 1.5, 0], fov: 42 } },
    build(fx) {
      const D = 4, C = [0, 1.5, 0], U = { uPh: { value: 0 }, uA: { value: 1 } };
      const m = new THREE.ShaderMaterial({ uniforms: U, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        vertexShader: 'varying vec2 vUv; void main(){ vUv=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `${NOISE} uniform float uPh, uA; varying vec2 vUv;
          void main(){ float r=length(vUv); if(r>1.) discard; float a=atan(vUv.y,vUv.x);
            float r1=pow(abs(sin(a*7.+uPh)),9.)*.5+pow(abs(sin(a*12.-uPh*2.+1.3)),14.)*.45+pow(abs(sin(a*3.+uPh*3.)),20.)*.4;
            float n=.6+.7*fbm3(vec3(cos(a)*2.,sin(a)*2.,r*2.)+vec3(cos(uPh),sin(uPh),0.)*.15); float fall=exp(-r*3.2)*smoothstep(1.,.5,r);
            float rays=r1*n*fall*smoothstep(.1,.3,r); float halo=exp(-r*6.)*1.3+exp(-r*18.)*2.;
            vec3 col=vec3(1.,.78,.32)*rays*1.3+vec3(1.,.9,.6)*halo; gl_FragColor=vec4(col*uA,1.); }` });
      const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.scale.setScalar(3.4); q.position.set(...C); q.renderOrder = 20;
      fx.mesh(q, (t, pr, f, w, obj) => { U.uPh.value = t / D * TAU; obj.quaternion.copy(f.camQuat); }, { dur: 99 });
      fx.orb({ kind: 'fire', r: 0.38, pos: C, intensity: 1.0, noise: 2.5, scroll: 1.2, disp: 0.18, power: 1.6, pulse: [0.04, TAU / D * 2], ramp: [[0, '#ff9a10'], [0.4, '#ffd060'], [0.8, '#fff0c0'], [1, '#fff']] });
      fx.ring({ r: [0.7, 0.7], width: [0.02, 0.02], normal: 'cam', pos: C, intensity: 0.8, decay: 0, breakup: 0, ramp: [[0, '#ffe8a0'], [1, '#ffd070']] });
      fx.emitter({ count: 50, kind: 'glint', shape: 'ring', radius: 1.6, radiusIn: 0.5, pos: C, rot3: [Math.PI / 2, 0, 0], size: [0.22, 0.05], life: [0.4, 0.7], ramp: [[0, '#fff'], [1, '#fc6', 0]], intensity: 3, speed: [0, 0.1] });
      fx.emitter({ count: 90, kind: 'soft', shape: 'sphere', radius: 0.5, pos: C, radial: 1, speed: [0.3, 1.1], life: [1.6, 3.0], size: [0.04, 0.01], ramp: [[0, '#fff2dc'], [0.5, '#ffd060'], [1, '#b60', 0]], intensity: 1.5, turb: [0.2, 1], swirl: TAU / D });
      fx.light({ color: '#ffd070', intensity: 25, pos: [0.3, 1.5, 1.2], range: 10, flicker: 0.04, rate: TAU / D * 2 });
    } },
];
