import * as THREE from 'three';

const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const hs = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const win = (t, a, d, fi = 0.03, fo = 0.1) => sm(a, a + fi + 1e-4, t) * (1 - sm(a + d - fo, a + d, t));

const CY = [[0, '#ffffff'], [0.3, '#8cf4ff'], [1, '#1a6aff']];
const cyRamp = [[0, '#e8ffff', 0], [0.2, '#8cf4ff', 1], [0.7, '#2a9aff', 0.6], [1, '#0a2a90', 0]];
const glintRamp = [[0, '#ffffff', 0], [0.2, '#d8ffff', 1], [1, '#4ac8ff', 0]];
const sparkCy = [[0, '#ffffff'], [0.35, '#8cf0ff'], [1, '#1a5aff', 0]];
const metal = (c = '#7a828e', r = 0.3, m = 0.95) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
const ringMesh = (r, w, c) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, w, 8, 64), glowMat(c)); m.rotation.x = Math.PI / 2; return m; };

export default [
  /* ------------------------------------------------ EMP blast */
  { id: 'scifi/emp-blast', name: 'EMP blast', category: 'scifi', loop: false, duration: 3.2, stage: { sky: 'dark', bloom: 0.5, view: { pos: [4.4, 2.6, 5.4], target: [0, 1.0, 0], fov: 44 } },
    build(fx) {
      const T = 0.5; const dev = new THREE.Group(); const em = new THREE.MeshStandardMaterial({ color: '#2a2f38', roughness: 0.4, metalness: 0.8, emissive: '#3cf', emissiveIntensity: 1 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.55, 8), em); body.position.y = 0.3; dev.add(body); const top = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), em); top.position.y = 0.62; dev.add(top);
      fx.mesh(dev, () => { const t = fx.t; const alive = t < T ? 1 : (t < 2.0 ? (0.5 + 0.5 * hs(Math.floor(t * 18))) * (1 - sm(1.0, 2.0, t)) * (hs(Math.floor(t * 18) + 3) > 0.35 ? 1 : 0.1) : 0); em.emissiveIntensity = alive * 2 + (t < T ? sm(0, T, t) * 1.5 : 0); }, { dur: 99 });
      fx.flash(T, 0.25, '#cff', 0.5); fx.shake(T, 0.4, 0.05);
      fx.light({ color: '#4cf', intensity: 200, pos: [0, 1.2, 0], range: 14, env: (t) => (t < T ? 0.1 + 0.4 * sm(0, T, t) : (0.1 + 0.9 * Math.exp(-(t - T) * 2.2)) * (t < 1.9 ? (0.5 + 0.5 * hs(Math.floor(t * 20))) : 0)), norm: 70 });
      fx.shell({ t0: T, dur: 1.3, r: [0.2, 4.2], hemi: true, ease: 'out', power: 1.6, noise: 0.4, intensity: 1.6, fade: [0.02, 1.0], pos: [0, 0, 0], ramp: [[0, '#021a40'], [0.4, '#2a9aff'], [1, '#e8ffff']] });
      fx.shell({ t0: T + 0.05, dur: 1.1, r: [0.2, 3.8], hemi: true, ease: 'out', cells: 22, power: 1.2, noise: 0.2, intensity: 1.0, fade: [0.02, 0.9], ramp: [[0, '#021a40'], [0.5, '#4ac8ff'], [1, '#ffffff']] });
      fx.ring({ t0: T, dur: 1.0, r: [0.2, 4.6], width: [0.4, 0.1], normal: 'up', intensity: 1.5, fill: 0.2, ramp: [[0, '#fff'], [0.4, '#8cf4ff'], [1, '#1a5aff']] });
      fx.ring({ t0: T + 0.1, dur: 1.3, r: [0.2, 3.4], width: [0.15, 0.04], normal: 'up', y: 0.03, intensity: 1.0, ramp: [[0, '#cff'], [1, '#26c']] });
      fx.decal({ kind: 'rings', t0: T, dur: 2.4, fade: [0.1, 1.0], r: [3.8, 3.8], cells: 5, intensity: 0.9, ramp: [[0, '#000'], [0.5, '#2a8aff'], [1, '#d8ffff']] });
      for (let i = 0; i < 6; i++) { const a = hs(i * 3.1) * TAU, r = 0.8 + hs(i * 7.7) * 2.2, a2 = a + 0.6 + hs(i) * 0.8, r2 = 0.5 + hs(i * 5.3) * 2; const t0 = 0.9 + i * 0.22; fx.bolt({ t0, dur: 0.3 + 0.1 * (i % 2), fade: [0, 0.2], from: [Math.cos(a) * r, 0.03, Math.sin(a) * r], to: (s) => [Math.cos(a2) * r2, 0.03 + 0.5 * hs(s + i), Math.sin(a2) * r2], jag: 0.3, branches: 1, width: 0.02, rate: 20, flicker: 0.5, ramp: CY, intensity: 3 });
        fx.emitter({ count: 14, kind: 'spark', shape: 'point', pos: [Math.cos(a) * r, 0.05, Math.sin(a) * r], dir: [0, 1, 0], spread: 1.3, speed: [1, 3.5], life: [0.2, 0.5], gravity: [0, -8, 0], size: [0.05, 0.015], stretch: 1.1, ramp: sparkCy, intensity: 4, delay: t0, bounce: 0.3 }); }
      fx.bolt({ t0: T, dur: 1.2, fade: [0, 0.8], from: [0, 0.9, 0], to: (s) => [Math.cos(s * 2.1) * 1.4, 0.2 + hs(s) * 1.0, Math.sin(s * 2.1) * 1.4], jag: 0.3, branches: 2, width: 0.02, rate: 14, flicker: 0.5, ramp: CY, intensity: 3 });
      fx.emitter({ count: 12, kind: 'smoke', blend: 'normal', shape: 'point', pos: [0, 0.7, 0], dir: [0, 1, 0], spread: 0.4, speed: [0.3, 0.8], life: [1.2, 2], size: [0.2, 0.9], ramp: [[0, '#555a66', 0], [0.2, '#4a4f58', 0.4], [1, '#222', 0]], lit: 1, delay: 1.2, emit: 1.0, order: -1 });
    } },

  /* ------------------------------------------------ energy core */
  { id: 'scifi/energy-core', name: 'Energy core', category: 'scifi', loop: true, duration: 2.4, stage: { sky: 'dark', bloom: 0.55, view: { pos: [2.4, 1.6, 3.2], target: [0, 1.1, 0], fov: 38 } },
    build(fx) {
      const C = [0, 1.1, 0], g = new THREE.Group(); const m = metal('#8a929e', 0.25, 1.0), dk = metal('#2a2f38', 0.5, 0.8);
      const rings = []; [0.55, 0.62, 0.69].forEach((r, i) => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 12, 64), m); t.position.y = 1.1; g.add(t); rings.push(t); });
      for (let i = 0; i < 4; i++) { const a = (i / 4) * TAU + 0.4; const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 10), dk); bar.position.set(Math.cos(a) * 0.48, 1.1, Math.sin(a) * 0.48); g.add(bar); }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.1, 24), dk); cap.position.y = 0.33; g.add(cap); const cap2 = cap.clone(); cap2.position.y = 1.87; g.add(cap2);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.85, 0.18, 32), dk); base.position.y = 0.09; g.add(base);
      fx.mesh(g, (t, pr, f, w, o, tAbs) => { rings[0].rotation.set(Math.PI / 2 + 0.6 * Math.sin(TAU * t / 2.4), TAU * t / 2.4, 0); rings[1].rotation.set(0.5 + TAU * t / 2.4, 0, Math.PI / 2); rings[2].rotation.set(Math.sin(TAU * t / 2.4 * 2) * 0.4, -TAU * t / 2.4 * 2, 0.9); }, { dur: 99 });
      fx.orb({ kind: 'plasma', r: [0.27, 0.27], pos: C, intensity: 0.8, noise: 2.6, scroll: 2, disp: 0.3, pulse: [0.07, TAU / 2.4 * 2], ramp: [[0, '#0a2a90'], [0.4, '#2ab0ff'], [0.8, '#b8f8ff'], [1, '#fff']] });
      fx.orb({ kind: 'energy', r: [0.42, 0.42], pos: C, intensity: 0.45, noise: 2, scroll: 1.5, disp: 0.5, alpha: 0.6, power: 1.4, ramp: [[0, '#04205a'], [0.6, '#2aa0ff'], [1, '#d8ffff']], pulse: [0.06, TAU / 2.4 * 2] });
      fx.light({ color: '#4cc4ff', intensity: 60, pos: [0.3, 1.2, 0.8], range: 10, env: (t) => 0.85 + 0.15 * Math.sin(TAU * t / 2.4 * 2) });
      fx.decal({ kind: 'rings', r: [1.8, 1.8], cells: 4, intensity: 0.8, ramp: [[0, '#000'], [0.5, '#2a8aff'], [1, '#d8ffff']], alpha: 0.8 });
      fx.decal({ kind: 'glow', r: [1.5, 1.5], ramp: [[0, '#000'], [0.5, '#04205a'], [1, '#3ac4ff']], intensity: 0.7, alpha: 0.7, y: 0.01 });
      for (let k = 0; k < 4; k++) fx.bolt({ from: C, to: (s) => { const a = hs(s * 1.3 + k) * TAU, e = (hs(s * 0.7 + k * 3) - 0.5) * 1.6; const c = Math.cos(e); return [Math.cos(a) * c * 0.38, 1.1 + Math.sin(e) * 0.38, Math.sin(a) * c * 0.38]; }, jag: 0.3, branches: 0, width: 0.012, rate: 12 + k * 3, flicker: 0.5, ramp: CY, intensity: 2.5 });
      fx.emitter({ count: 40, kind: 'spark', shape: 'sphere', radius: 0.35, radiusIn: 0.2, pos: C, dir: [0, 1, 0], spread: 1.5, radial: 1, speed: [0.3, 1.2], life: [0.4, 0.9], size: [0.05, 0.015], stretch: 1.0, swirl: 2, ramp: sparkCy, intensity: 3 });
      fx.emitter({ count: 20, kind: 'soft', shape: 'disc', radius: 0.6, pos: [0, 0.4, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.3, 0.8], life: [1.2, 2.0], size: [0.07, 0.02], ramp: cyRamp, intensity: 1.6 });
    } },

  /* ------------------------------------------------ force field */
  { id: 'scifi/force-field', name: 'Force field', category: 'scifi', loop: true, duration: 2.4, body: true, stage: { sky: 'dark', bloom: 0.5, view: { pos: [3.6, 1.9, 4.6], target: [0, 0.9, 0], fov: 42 } },
    build(fx) {
      const imp = [[0.3, [1, 0.5, 0.4]], [1.1, [-0.4, 0.8, 0.9]], [1.8, [0.6, 0.35, -0.8]]];
      fx.shell({ r: [1.75, 1.75], hemi: true, cells: 7, power: 1.6, noise: 0.35, intensity: 1.5, pulse: [0.01, TAU / 2.4 * 3], ramp: [[0, '#021a40'], [0.35, '#2a8aff'], [0.7, '#8cf4ff'], [1, '#ffffff']], impacts: imp.map(([t, d]) => ({ t, dir: d })) });
      fx.decal({ kind: 'rings', r: [1.75, 1.75], cells: 3, intensity: 0.9, ramp: [[0, '#000'], [0.5, '#2a8aff'], [1, '#d8ffff']], alpha: 0.9 });
      fx.decal({ kind: 'glow', r: [1.9, 1.9], ramp: [[0, '#000'], [0.5, '#04205a'], [1, '#3ac4ff']], intensity: 0.6, alpha: 0.6, y: 0.01 });
      fx.light({ color: '#4ab4ff', intensity: 50, pos: [0.4, 1.5, 0.8], range: 8, env: (t) => 0.7 + 0.3 * Math.max(...imp.map(([a]) => win(t, a, 0.5, 0.01, 0.4))) });
      imp.forEach(([t0, d]) => { const n = Math.hypot(...d), p = d.map((v) => v / n * 1.74);
        fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: p, size: [0.9, 0.3], life: [0.25, 0.25], ramp: glintRamp, intensity: 4, delay: t0 });
        fx.emitter({ count: 30, kind: 'spark', shape: 'point', pos: p, dir: d.map((v) => v / n), spread: 1.4, speed: [1, 4], life: [0.25, 0.6], gravity: [0, -6, 0], size: [0.05, 0.015], stretch: 1.2, ramp: sparkCy, intensity: 4, delay: t0 });
        fx.ring({ t0, dur: 0.35, r: [0.05, 0.6], width: [0.1, 0.03], normal: d.map((v) => v / n), pos: p, intensity: 1.3, ramp: [[0, '#fff'], [1, '#4ac8ff']] }); });
      fx.emitter({ count: 24, kind: 'glint', shape: 'sphere', radius: 1.7, radiusIn: 1.6, pos: [0, 0, 0], dir: [0, 1, 0], spread: 1, speed: [0, 0.05], life: [0.3, 0.8], size: [0.18, 0.04], ramp: glintRamp, intensity: 2.5 });
      fx.on((t) => fx.body.set({ rim: '#6cf', rimAmt: 0.25 }));
    } },

  /* ------------------------------------------------ glitch */
  { id: 'scifi/glitch', name: 'Glitch', category: 'scifi', loop: true, duration: 2.4, body: true, stage: { sky: 'dark', bloom: 0.4, view: { pos: [2.8, 1.4, 3.6], target: [0, 0.95, 0], fov: 40 } },
    screen: { glsl: `vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
      float g = smoothstep(.2,.22,p)*(1.-smoothstep(.32,.36,p)) + smoothstep(.5,.51,p)*(1.-smoothstep(.57,.6,p)) + smoothstep(.74,.75,p)*(1.-smoothstep(.8,.84,p));
      if(g<=0.) return c;
      float band = floor(uv.y*28.+floor(p*90.)*3.); float h = hash12(vec2(band, floor(p*90.)));
      float blk = step(.78, h);
      vec3 o = c;
      o.r = mix(o.r, o.r*1.5+.05, blk*g); o.b = mix(o.b, o.b*1.6, blk*g*.8); o.g *= 1.-blk*g*.5;
      float sc = .5+.5*sin(uv.y*900.); o *= 1.-g*.25*sc;
      float n = hash12(floor(uv*vec2(80.,45.))+floor(p*60.)); o += g*step(.994,n)*vec3(.2,.9,1.);
      o = mix(o, o.gbr, step(.9,hash12(vec2(band,3.+floor(p*40.))))*g);
      return o; }` },
    build(fx) {
      const G = (t) => win(t, 0.5, 0.35, 0.01, 0.05) + win(t, 1.2, 0.2, 0.01, 0.03) + win(t, 1.8, 0.35, 0.01, 0.05);
      fx.decal({ kind: 'rings', r: [1.3, 1.3], cells: 3, intensity: 0.6, ramp: [[0, '#000'], [0.5, '#2a8aff'], [1, '#d8ffff']], alpha: 0.6 });
      fx.light({ color: '#4cf', intensity: 22, pos: [1.0, 1.6, 1.0], range: 8, env: (t) => 0.4 + 0.6 * G(t) * hs(Math.floor(t * 30)) });
      fx.emitter({ count: 50, kind: 'shard', shape: 'box', shapeSize: [0.4, 0.9, 0.3], pos: [0, 0.95, 0], dir: [1, 0, 0], spread: 1.5, speed: [0.2, 1.2], life: [0.1, 0.25], size: [0.06, 0.02], ramp: [[0, '#00ffff', 1], [0.5, '#ff2aff', 1], [1, '#00ffff', 0]], intensity: 2, rot: 0, t0: 0.5, t1: 2.2 });
      fx.on((t) => {
        const g = clamp(G(t)), st = Math.floor(t * 30), h = hs(st * 1.7), h2 = hs(st * 3.3 + 1);
        fx.body.set({ alpha: g > 0 ? (h > 0.35 ? 1 : 0.35) : 1, tint: h2 > 0.5 ? '#00ffff' : '#ff2aff', tintAmt: g * 0.55 * (h > 0.3 ? 1 : 0), emit: new THREE.Color(h2 > 0.5 ? 0 : 0.2, h2 > 0.5 ? 0.18 : 0.02, 0.2).multiplyScalar(g), scan: g > 0.1 ? 0.2 + 1.5 * hs(st * 2.1) : -10, scanCol: '#7ff', holo: g * 0.6 });
        fx.body.position.x = g > 0.1 ? (hs(st * 4.7) - 0.5) * 0.12 : 0; fx.body.scale.set(1 + (g > 0.1 ? (hs(st * 6.1) - 0.5) * 0.06 : 0), 1, 1);
      });
    } },

  /* ------------------------------------------------ hologram */
  { id: 'scifi/hologram', name: 'Hologram', category: 'scifi', loop: true, duration: 4, body: true, stage: { sky: 'dark', bloom: 0.55, view: { pos: [3.0, 1.5, 3.8], target: [0, 1.0, 0], fov: 40 } },
    build(fx) {
      const proj = new THREE.Group(); const dk = metal('#252a32', 0.4, 0.8);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.14, 40), dk); disc.position.y = 0.07; proj.add(disc);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.02, 40), glowMat('#4af')); lens.position.y = 0.145; proj.add(lens); proj.add(ringMesh(0.64, 0.012, '#8ff')); proj.children[2].position.y = 0.15;
      fx.mesh(proj, null, { dur: 99 });
      fx.beam({ pos: [0, 0.15, 0], height: 2.05, r: [0.55, 0.62], noise: 0.5, speed: 1, intensity: 0.5, edge: 1.2, ramp: [[0, '#d8ffff'], [0.5, '#4ac8ff'], [1, '#0a3a90']] });
      fx.decal({ kind: 'rings', r: [1.3, 1.3], cells: 4, intensity: 0.9, ramp: [[0, '#000'], [0.5, '#2a9aff'], [1, '#d8ffff']], alpha: 0.9 });
      fx.light({ color: '#4cc8ff', intensity: 34, pos: [0.4, 1.3, 0.6], range: 7, env: (t) => 0.7 + 0.3 * hs(Math.floor(t * 18)) });
      fx.emitter({ count: 26, kind: 'soft', shape: 'disc', radius: 0.5, pos: [0, 0.15, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.3, 0.9], life: [1.5, 2.2], size: [0.05, 0.02], ramp: cyRamp, intensity: 1.8 });
      fx.on((t) => {
        const st = Math.floor(t * 22), gl = win(t, 1.4, 0.18, 0.01, 0.02) + win(t, 3.1, 0.25, 0.01, 0.03); const fl = 0.8 + 0.2 * hs(st) - gl * 0.5 * hs(st + 5);
        const scan = 0.1 + 1.8 * ((t / 2) % 1);
        fx.body.set({ holo: 1, alpha: clamp(fl) * 0.85, rim: '#7ff', rimAmt: 1.2, tint: '#3cf', tintAmt: 0.55, scan, scanCol: '#aff', emit: new THREE.Color(0.0, 0.08, 0.14) });
        fx.body.position.x = gl > 0.1 ? (hs(st * 4.1) - 0.5) * 0.1 : 0; fx.body.position.y = 0.17;
      });
    } },

  /* ------------------------------------------------ jetpack */
  { id: 'scifi/jetpack', name: 'Jetpack', category: 'scifi', loop: true, duration: 2, body: true, stage: { sky: 'dusk', bloom: 0.4, view: { pos: [-2.6, 1.0, 4.2], target: [-0.1, 0.9, 0], fov: 42 } },
    build(fx) {
      const HY = (t) => 0.55 + 0.06 * Math.sin(TAU * t / 2);
      const pack = new THREE.Group(); const m = metal('#5a626e', 0.35, 0.9);
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, 0.34), metal('#3a4048', 0.5, 0.7)); box.position.set(-0.2, 1.22, 0); pack.add(box);
      [-0.1, 0.1].forEach((z) => { const n = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.3, 16), m); n.position.set(-0.24, 0.92, z); pack.add(n); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 20), glowMat('#fa4')); ring.rotation.x = Math.PI / 2; ring.position.set(-0.24, 0.77, z); pack.add(ring); });
      fx.mesh(pack, (t, pr, f, w, o) => { o.position.y = HY(t) - 0.55 + 0.55; }, { dur: 99 });
      // pack is built relative to y(0.55 hover) body offset; body gets same lift
      fx.on((t) => { fx.body.position.y = HY(t) - 0.55 + 0.55 - 0.0; fx.parts[0] && 0; });
      fx.decal({ kind: 'glow', pos: [-0.25, 0.01, 0], r: [1.6, 1.6], ramp: [[0, '#000'], [0.4, '#6a2000'], [1, '#ffa040']], intensity: 0.9, alpha: 0.7 });
      fx.light({ color: '#ff9a40', intensity: 28, pos: [-0.3, 0.3, 0.3], range: 8, flicker: 0.3, rate: 24 });
      [-0.1, 0.1].forEach((z, i) => {
        const P = (t) => HY(t) + 0.37 - 0.55 + 0.0;
        fx.emitter({ count: 26, kind: 'flame', shape: 'point', pos: [-0.24, 0.77 + 0.55 - 0.55, z], dir: [0, -1, 0], spread: 0.06, speed: [1.2, 2.2], life: [0.18, 0.3], size: [0.4, 0.15], aspect: -2.4, ramp: [[0, '#d8ecff', 1], [0.25, '#7ab8ff', 0.9], [0.55, '#ff9a3a', 0.7], [1, '#401000', 0]], intensity: 0.7, follow: (m, a, t) => m.position.y = 0.77 + (HY(t) - 0.55) + 0.55 - 0.55 + 0.55 - 0.55 });
        fx.emitter({ count: 20, kind: 'spark', shape: 'point', pos: [-0.24, 0.77, z], dir: [0, -1, 0], spread: 0.3, speed: [2, 5], life: [0.2, 0.5], gravity: [0, -3, 0], size: [0.05, 0.015], stretch: 1.2, ramp: [[0, '#fff'], [0.4, '#ffc050'], [1, '#800', 0]], intensity: 2.5, bounce: 0.3, follow: (m, a, t) => m.position.y = 0.77 + (HY(t) - 0.55) });
        fx.emitter({ count: 22, kind: 'smoke', blend: 'normal', shape: 'point', pos: [-0.24, 0.5, z], dir: [0, -1, 0], spread: 0.3, speed: [0.6, 1.4], life: [0.7, 1.1], size: [0.15, 0.6], ramp: [[0, '#66625e', 0], [0.2, '#58544f', 0.35], [1, '#2a2826', 0]], lit: 1, order: -1, turb: [0.2, 1], follow: (m, a, t) => m.position.y = 0.55 + (HY(t) - 0.55) });
      });
      fx.emitter({ count: 40, kind: 'dust', blend: 'normal', shape: 'disc', radius: 0.2, pos: [-0.24, 0.05, 0], dir: [0, 0.15, 0], spread: 0.4, radial: 1, speed: [1.2, 2.6], drag: 1, life: [0.6, 1.0], size: [0.3, 0.9], ramp: [[0, '#8a7f72', 0], [0.2, '#756c60', 0.4], [1, '#3a352f', 0]], lit: 1, order: -1 });
      fx.emitter({ count: 24, kind: 'rock', blend: 'normal', shape: 'disc', radius: 0.15, pos: [-0.24, 0.05, 0], dir: [0, 0.4, 0], spread: 0.9, radial: 1, speed: [0.8, 2.2], gravity: [0, -9, 0], life: [0.5, 0.9], size: [0.03, 0.025], ramp: [[0, '#7a6a58'], [1, '#7a6a58', 1]], lit: 1, bounce: 0.3 });
    } },

  /* ------------------------------------------------ laser grid */
  { id: 'scifi/laser-grid', name: 'Laser grid', category: 'scifi', loop: true, duration: 3, body: true, stage: { sky: 'dark', bloom: 0.55, view: { pos: [2.2, 1.6, 6.0], target: [0, 1.0, 0], fov: 46 } },
    build(fx) {
      const posts = new THREE.Group(); const dk = metal('#2a2f38', 0.4, 0.8);
      [-2.3, 2.3].forEach((x) => { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.3, 0.16), dk); p.position.set(x, 1.15, -0.6); posts.add(p); for (let i = 0; i < 6; i++) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), glowMat('#f33')); e.position.set(x + (x < 0 ? 0.09 : -0.09), 0.2 + i * 0.38, -0.6); posts.add(e); } });
      fx.mesh(posts, null, { dur: 99 });
      const RED = [[0, '#ffe8e0'], [0.35, '#ff5a40'], [1, '#a00808']];
      for (let i = 0; i < 6; i++) fx.beam({ path: (t) => { const y = 0.2 + i * 0.38 + 0.18 * Math.sin(TAU * t / 3 + i * 1.1); return [[-2.2, y, -0.6], [2.2, y, -0.6]]; }, r: [0.012, 0.012], noise: 0.3, speed: 4, pulse: 0.15, edge: 1.0, intensity: 1.6, ramp: RED });
      fx.beam({ path: (t) => { const k = (t / 3 * 2) % 1; return [[-2.2, 0.1 + 1.9 * k, -0.6], [2.2, 2.0 - 1.9 * k, -0.6]]; }, r: [0.018, 0.018], noise: 0.3, speed: 4, edge: 1.0, intensity: 3.5, ramp: RED, fade: [0.0, 0.0] });
      fx.beam({ path: (t) => { const x = -2 + 4 * (0.5 + 0.5 * Math.sin(TAU * t / 3)); return [[x, 0.02, -0.6], [x, 2.3, -0.6]]; }, r: [0.014, 0.014], noise: 0.3, speed: 4, edge: 1.0, intensity: 3, ramp: RED });
      fx.light({ color: '#ff4030', intensity: 40, pos: [0, 1.2, 0.4], range: 9, flicker: 0.1 });
      fx.decal({ kind: 'glow', pos: [0, 0.01, -0.6], r: [2.6, 1.0], ramp: [[0, '#000'], [0.4, '#500'], [1, '#f44']], intensity: 0.5, alpha: 0.6 });
      fx.emitter({ count: 50, kind: 'smoke', blend: 'normal', shape: 'box', shapeSize: [2.2, 1.0, 1.0], pos: [0, 1.0, -0.2], dir: [1, 0, 0], spread: 1, speed: [0.02, 0.1], life: [2.5, 3], size: [0.9, 1.5], ramp: [[0, '#6a3a3a', 0], [0.3, '#8a4a48', 0.07], [1, '#4a2a2a', 0]], lit: 1, order: -1 });
      fx.emitter({ count: 20, kind: 'glint', shape: 'box', shapeSize: [2.2, 1.0, 0.1], pos: [0, 1.0, -0.6], dir: [0, 1, 0], spread: 1, speed: [0, 0.05], life: [0.3, 0.7], size: [0.16, 0.04], ramp: [[0, '#fff', 0], [0.3, '#ff9080', 1], [1, '#f33', 0]], intensity: 2 });
      fx.on(() => { fx.body.position.set(0.0, 0, 0.5); fx.body.set({ rim: '#f64', rimAmt: 0.5 }); });
    } },

  /* ------------------------------------------------ scanner */
  { id: 'scifi/scanner', name: 'Scanner', category: 'scifi', loop: true, duration: 3.2, body: true, stage: { sky: 'dark', bloom: 0.5, view: { pos: [3.2, 1.5, 3.6], target: [0.3, 1.0, 0], fov: 40 } },
    build(fx) {
      const SY = (t) => 0.05 + 1.85 * (0.5 - 0.5 * Math.cos(TAU * t / 3.2));
      const ring = new THREE.Group(); ring.add(ringMesh(0.62, 0.012, '#8ff')); const r2 = ringMesh(0.5, 0.05, '#2a9aff'); r2.material.opacity = 0.35; ring.add(r2);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.62, 48), glowMat('#2ab4ff')); disc.rotation.x = -Math.PI / 2; disc.material.opacity = 0.12; ring.add(disc);
      fx.mesh(ring, (t, pr, f, w, o) => { o.position.y = SY(t); }, { dur: 99 });
      fx.decal({ kind: 'rings', r: [1.4, 1.4], cells: 4, intensity: 0.8, ramp: [[0, '#000'], [0.5, '#2a9aff'], [1, '#d8ffff']], alpha: 0.8 });
      fx.light({ color: '#4cc8ff', intensity: 30, pos: [0.6, 1.4, 0.8], range: 7 });
      fx.text({ text: 'SCANNING', size: 0.18, font: 70, outline: '#024', grad: ['#d8ffff', '#4ac8ff', '#2a8aff'], motion: (pr, t) => ({ pos: [0.95, 1.85, 0.2], alpha: 0.7 + 0.3 * hs(Math.floor((t ?? pr * 3.2) * 12)), scale: 1 }) });
      fx.text({ text: '87%', size: 0.16, font: 70, outline: '#024', grad: ['#fff', '#8cf4ff', '#2a8aff'], motion: () => ({ pos: [0.95, 1.65, 0.2], alpha: 0.9, scale: 1 }) });
      fx.emitter({ count: 20, kind: 'soft', shape: 'ring', radius: 0.62, radiusIn: 0.55, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.1, speed: [0, 0], life: [0.05, 0.1], size: [0.05, 0.05], ramp: cyRamp, intensity: 0.001 });
      fx.on((t) => { const y = SY(t); fx.body.set({ holo: 0.25, scan: y, scanCol: '#8ff', rim: '#4cf', rimAmt: 0.5, emit: new THREE.Color(0, 0.03, 0.06) }); });
    } },

  /* ------------------------------------------------ teleporter pad */
  { id: 'scifi/teleporter-pad', name: 'Teleporter pad', category: 'scifi', loop: true, duration: 2.4, stage: { sky: 'dark', bloom: 0.55, view: { pos: [3.0, 1.7, 4.0], target: [0, 1.2, 0], fov: 42 } },
    build(fx) {
      const pad = new THREE.Group(); const dk = metal('#2a2f38', 0.4, 0.8);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.1, 0.14, 48), dk); b.position.y = 0.07; pad.add(b);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.02, 48), new THREE.MeshStandardMaterial({ color: '#0a2a40', emissive: '#2ab4ff', emissiveIntensity: 0.6, roughness: 0.3 })); top.position.y = 0.145; pad.add(top);
      const rim = ringMesh(0.93, 0.02, '#8ff'); rim.position.y = 0.15; pad.add(rim);
      fx.mesh(pad, null, { dur: 99 });
      fx.decal({ kind: 'rune', r: [0.84, 0.84], y: 0.17, glyphs: 12, spin: -TAU / 2.4, poly: 6, intensity: 1.3, ramp: [[0, '#0a2a60'], [0.5, '#4ac8ff'], [1, '#fff']] });
      fx.beam({ pos: [0, 0.15, 0], height: 3.6, r: [0.72, 0.62], noise: 0.7, freq: 2, speed: 2.5, intensity: 0.22, edge: 1.3, ramp: [[0, '#e8ffff'], [0.5, '#4ac8ff'], [1, '#0a3a90']] });
      fx.beam({ pos: [0, 0.15, 0], height: 3.6, r: [0.3, 0.24], noise: 0.4, speed: 3, intensity: 0.3, edge: 1.0, ramp: [[0, '#ffffff'], [0.5, '#9af0ff'], [1, '#2a8aff']] });
      const rg = new THREE.Group(); for (let i = 0; i < 3; i++) { const r = ringMesh(0.72, 0.012, '#aff'); rg.add(r); }
      fx.mesh(rg, (t) => rg.children.forEach((r, i) => { const k = ((t / 2.4) + i / 3) % 1; r.position.y = 0.2 + k * 2.6; r.material.opacity = Math.sin(Math.PI * k); r.scale.setScalar(1 - 0.25 * k); }), { dur: 99 });
      fx.light({ color: '#4cc8ff', intensity: 55, pos: [0, 1.4, 0.6], range: 10, env: (t) => 0.85 + 0.15 * Math.sin(TAU * t / 2.4 * 2) });
      fx.decal({ kind: 'glow', r: [2.0, 2.0], ramp: [[0, '#000'], [0.5, '#04205a'], [1, '#3ac4ff']], intensity: 0.7, alpha: 0.7, y: 0.01 });
      fx.emitter({ count: 70, kind: 'soft', shape: 'disc', radius: 0.8, pos: [0, 0.2, 0], dir: [0, 1, 0], spread: 0.1, speed: [0.8, 1.6], life: [1.2, 2.2], size: [0.05, 0.02], swirl: 1.5, ramp: cyRamp, intensity: 2.2 });
      fx.emitter({ count: 24, kind: 'glint', shape: 'disc', radius: 0.7, pos: [0, 0.4, 0], dir: [0, 1, 0], spread: 0.2, speed: [0.5, 1.2], life: [0.6, 1.2], size: [0.18, 0.04], ramp: glintRamp, intensity: 2.5 });
    } },

  /* ------------------------------------------------ tractor beam */
  { id: 'scifi/tractor-beam', name: 'Tractor beam', category: 'scifi', loop: true, duration: 3, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [3.4, 2.2, 5.2], target: [0, 2.0, 0], fov: 48 } },
    build(fx) {
      const top = new THREE.Group(); const dk = metal('#2d323a', 0.4, 0.8);
      const sau = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 1.0, 0.22, 40), dk); sau.position.y = 4.6; top.add(sau); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 12, 0, TAU, 0, Math.PI / 2), metal('#4a5260', 0.2, 0.9)); dome.position.y = 4.7; top.add(dome);
      const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.34, 32), glowMat('#aff')); lamp.rotation.x = Math.PI / 2; lamp.position.y = 4.48; top.add(lamp);
      fx.mesh(top, null, { dur: 99 });
      fx.beam({ from: [0, 4.5, 0], to: [0, 0.0, 0], r: [0.3, 1.5], noise: 0.7, freq: 3, speed: 1.2, intensity: 0.9, edge: 1.2, ramp: [[0, '#f0ffff'], [0.5, '#7af0d8'], [1, '#106a70']] });
      fx.beam({ from: [0, 4.5, 0], to: [0, 0.0, 0], r: [0.1, 0.6], noise: 0.4, freq: 2, speed: 3, intensity: 1.0, edge: 1.0, ramp: [[0, '#ffffff'], [0.5, '#a8fff0'], [1, '#2a9a90']] });
      fx.decal({ kind: 'glow', r: [1.9, 1.9], ramp: [[0, '#000'], [0.5, '#06403a'], [1, '#6af0d8']], intensity: 0.8, alpha: 0.8, y: 0.01 });
      fx.decal({ kind: 'rings', r: [1.5, 1.5], cells: 3, intensity: 0.7, ramp: [[0, '#000'], [0.5, '#2ab4a0'], [1, '#d8fff8']], alpha: 0.7 });
      fx.light({ color: '#8afce0', intensity: 60, pos: [0, 2.2, 0.6], range: 10 });
      const rg = new THREE.Group(); const mat = new THREE.MeshStandardMaterial({ color: '#6a665e', roughness: 0.9, flatShading: true });
      const R = []; for (let i = 0; i < 6; i++) { const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1 + hs(i) * 0.14, 0), mat); m.scale.set(1, 0.7 + hs(i + 4) * 0.5, 1); rg.add(m); R.push({ m, ph: i / 6, a: hs(i * 3) * TAU, r: 0.3 + hs(i * 7) * 0.5, s: 1 + (i % 3) }); }
      fx.mesh(rg, (t) => R.forEach((o) => { const k = ((t / 3) + o.ph) % 1, y = 0.15 + k * 3.9; const rr = o.r * (1 - 0.7 * k) + 0.05, a = o.a + TAU * k * (1 + o.s * 0.5); o.m.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); o.m.rotation.set(k * 6 * o.s, k * 4, k * 5); o.m.scale.setScalar(sm(0, 0.06, k) * (1 - sm(0.9, 1.0, k))); }), { dur: 99 });
      fx.emitter({ count: 70, kind: 'dust', blend: 'normal', shape: 'disc', radius: 1.1, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.15, speed: [0.5, 1.6], life: [1.6, 2.6], size: [0.35, 0.8], swirl: 1.8, ramp: [[0, '#8a8472', 0], [0.2, '#8a8472', 0.35], [1, '#4a463c', 0]], lit: 1, order: -1, turb: [0.2, 0.7] });
      fx.emitter({ count: 60, kind: 'soft', shape: 'disc', radius: 1.0, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.08, speed: [1.2, 2.2], life: [1.4, 2.4], size: [0.045, 0.02], swirl: 2.2, ramp: [[0, '#fff', 0], [0.2, '#c8fff0', 1], [1, '#4af0d0', 0]], intensity: 2 });
    } },

  /* ------------------------------------------------ warp in */
  { id: 'scifi/warp-in', name: 'Warp in', category: 'scifi', loop: false, duration: 3, body: true, stage: { sky: 'dark', bloom: 0.55, view: { pos: [3.2, 1.6, 4.0], target: [0, 1.0, 0], fov: 42 } },
    build(fx) {
      const TE = 2.1; const sy = (t) => 1.9 * sm(0.45, TE, t);
      fx.beam({ t0: 0, dur: 2.3, fade: [0.25, 0.5], pos: [0, 0, 0], height: 4.5, r: [0.6, 0.5], noise: 0.7, speed: 3, intensity: 0.2, edge: 1.2, ramp: [[0, '#e8ffff'], [0.5, '#4ac8ff'], [1, '#0a3a90']] });
      fx.beam({ t0: 0, dur: 2.3, fade: [0.25, 0.5], pos: [0, 0, 0], height: 4.5, r: [0.25, 0.2], noise: 0.4, speed: 4, intensity: 0.28, edge: 1.0, ramp: [[0, '#fff'], [0.5, '#aaf6ff'], [1, '#2a8aff']] });
      const sc = new THREE.Group(); sc.add(ringMesh(0.5, 0.012, '#bff')); const dd = new THREE.Mesh(new THREE.CircleGeometry(0.5, 40), glowMat('#2ab4ff')); dd.rotation.x = -Math.PI / 2; dd.material.opacity = 0.18; sc.add(dd);
      fx.mesh(sc, (t, pr, f, w, o) => { o.position.y = sy(t); o.visible = t > 0.4 && t < TE + 0.1; }, { dur: 99 });
      fx.decal({ kind: 'rune', t0: 0, dur: 3, fade: [0.3, 0.9], r: [1.3, 1.3], glyphs: 12, spin: 1.2, poly: 6, reveal: 0.4, intensity: 1.3, ramp: [[0, '#0a2a60'], [0.5, '#4ac8ff'], [1, '#fff']] });
      fx.light({ color: '#4cc8ff', intensity: 70, pos: [0.3, 1.4, 0.8], range: 10, env: (t) => 0.2 + 0.5 * sm(0, 0.5, t) + 0.8 * win(t, TE, 0.4, 0.01, 0.35) - 0.2 * sm(2.5, 3, t) });
      fx.flash(TE, 0.25, '#dfffff', 0.25);
      fx.ring({ t0: TE, dur: 0.8, r: [0.3, 3.0], width: [0.3, 0.06], normal: 'up', intensity: 1.4, fill: 0.15, ramp: [[0, '#fff'], [0.4, '#8cf4ff'], [1, '#1a5aff']] });
      fx.ring({ t0: 0.2, dur: 1.8, r: [1.4, 0.3], width: [0.06, 0.12], normal: 'up', y: 0.03, intensity: 1.0, ramp: [[0, '#cff'], [1, '#26c']] });
      fx.emitter({ count: 70, kind: 'soft', shape: 'ring', radius: 1.2, radiusIn: 0.8, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.05, radial: 0, speed: [1, 2.6], life: [0.7, 1.4], size: [0.05, 0.02], swirl: 1, ramp: cyRamp, intensity: 2.2, emit: 1.8, delay: 0.3 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.4, pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 1.5, radial: 1, speed: [-1.5, -2.5], life: [0.3, 0.45], size: [0.06, 0.015], stretch: 1.3, ramp: sparkCy, intensity: 3, delay: 0.6, emit: 1.5 });
      fx.emitter({ count: 50, kind: 'spark', shape: 'sphere', radius: 0.2, pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 1.5, radial: 1, speed: [2, 6], life: [0.4, 0.9], gravity: [0, -4, 0], size: [0.06, 0.02], stretch: 1.3, ramp: sparkCy, intensity: 4, delay: TE });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 0.95, 0], size: [2.4, 0.5], life: [0.3, 0.3], ramp: glintRamp, intensity: 3.5, delay: TE });
      fx.on((t) => { const d = 1 - sm(0.45, TE, t); const aft = Math.exp(-Math.max(0, t - TE) * 2.5) * (t >= TE ? 1 : 0); fx.body.set({ dissolve: t < 0.4 ? 1 : d, dDir: -1, edge: '#7ff', edgeW: 0.12, edgeInt: 3, rim: '#8ff', rimAmt: 0.5 + aft * 2, tint: '#4cf', tintAmt: 0.4 * (1 - sm(TE, 3, t)), scan: t > 0.4 && t < TE ? sy(t) : -10, scanCol: '#aff', emit: new THREE.Color(0, 0.08, 0.16).multiplyScalar(aft) }); });
    } },

  /* ------------------------------------------------ warp out */
  { id: 'scifi/warp-out', name: 'Warp out', category: 'scifi', loop: false, duration: 2.6, body: true, stage: { sky: 'dark', bloom: 0.55, view: { pos: [3.2, 1.8, 4.0], target: [0, 1.2, 0], fov: 44 } },
    build(fx) {
      const T0 = 0.35, T1 = 1.7;
      fx.beam({ t0: 0.1, dur: 2.2, fade: [0.3, 0.7], pos: [0, 0, 0], height: 5, r: [0.6, 0.5], noise: 0.7, speed: 3, intensity: 0.2, edge: 1.2, ramp: [[0, '#e8ffff'], [0.5, '#4ac8ff'], [1, '#0a3a90']] });
      fx.beam({ t0: 0.2, dur: 1.9, fade: [0.3, 0.6], pos: [0, 0, 0], height: 5, r: [0.22, 0.18], noise: 0.4, speed: 4, intensity: 0.28, edge: 1.0, ramp: [[0, '#fff'], [0.5, '#aaf6ff'], [1, '#2a8aff']] });
      fx.decal({ kind: 'rune', t0: 0, dur: 2.6, fade: [0.2, 0.9], r: [1.3, 1.3], glyphs: 12, spin: -1.2, poly: 6, reveal: 0.3, intensity: 1.3, ramp: [[0, '#0a2a60'], [0.5, '#4ac8ff'], [1, '#fff']] });
      fx.light({ color: '#4cc8ff', intensity: 70, pos: [0.3, 1.5, 0.8], range: 10, env: (t) => 0.2 + 0.6 * sm(0, 0.4, t) + 0.8 * win(t, T1, 0.4, 0.01, 0.35) - 0.2 * sm(2.0, 2.6, t) });
      fx.flash(T1, 0.25, '#dfffff', 0.25); fx.shake(T1, 0.3, 0.02);
      fx.ring({ t0: T1, dur: 0.8, r: [0.3, 3.2], width: [0.3, 0.06], normal: 'up', intensity: 1.4, fill: 0.15, ramp: [[0, '#fff'], [0.4, '#8cf4ff'], [1, '#1a5aff']] });
      fx.ring({ t0: 0.3, dur: 1.4, r: [1.5, 0.2], width: [0.05, 0.1], normal: 'up', y: 0.03, intensity: 1.0, ramp: [[0, '#cff'], [1, '#26c']] });
      fx.emitter({ count: 130, kind: 'spark', shape: 'box', shapeSize: [0.3, 0.9, 0.2], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 0.15, speed: [2.5, 7], life: [0.5, 1.1], size: [0.07, 0.015], stretch: 2.0, ramp: [[0, '#fff'], [0.3, '#8cf4ff'], [1, '#1a5aff', 0]], intensity: 3, delay: T0, emit: T1 - T0 });
      fx.emitter({ count: 60, kind: 'soft', shape: 'box', shapeSize: [0.3, 0.9, 0.2], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 0.2, speed: [1, 3], life: [0.6, 1.2], size: [0.07, 0.02], ramp: cyRamp, intensity: 2, delay: T0, emit: T1 - T0 });
      fx.emitter({ count: 24, kind: 'glint', shape: 'box', shapeSize: [0.3, 0.9, 0.2], pos: [0, 0.95, 0], dir: [0, 1, 0], spread: 0.5, speed: [0.5, 2], life: [0.3, 0.8], size: [0.2, 0.04], ramp: glintRamp, intensity: 3, delay: T0, emit: T1 - T0 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'ring', radius: 1.3, radiusIn: 0.9, pos: [0, 0.05, 0], dir: [0, 1, 0], spread: 0.1, speed: [-1, -2], life: [0.4, 0.7], size: [0.05, 0.015], stretch: 1.2, ramp: sparkCy, intensity: 3, delay: 0.3, emit: 1.2 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 1.0, 0], size: [2.4, 0.5], life: [0.3, 0.3], ramp: glintRamp, intensity: 3.5, delay: T1 });
      fx.on((t) => { const d = sm(T0, T1, t); const g = 1 - sm(T1, 2.3, t); fx.body.set({ dissolve: t < T0 ? -1 : d, dDir: 1, edge: '#7ff', edgeW: 0.12, edgeInt: 3, rim: '#8ff', rimAmt: 0.4 + 1.4 * sm(0, T1, t) * g, tint: '#4cf', tintAmt: 0.5 * sm(0, T1, t), emit: new THREE.Color(0, 0.08, 0.16).multiplyScalar(sm(0, T1, t) * g) }); if (t >= T1) fx.body.set({ alpha: 0 }); else fx.body.set({ alpha: 1 }); });
    } },
];
