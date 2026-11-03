import * as THREE from 'three';

/* ---------------------------------------------------------------- helpers */
const TAU = Math.PI * 2;
const cl = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const sm = (a, b, x) => { const t = cl((x - a) / (b - a || 1e-6)); return t * t * (3 - 2 * t); };
const eOut = (t) => 1 - Math.pow(1 - cl(t), 3);
const eBack = (t) => { t = cl(t); const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const eIn = (t) => cl(t) * cl(t);
const lerp = (a, b, t) => a + (b - a) * t;
const VIEW = { pos: [0, 1.35, 5.2], target: [0, 1.25, 0], fov: 40 };
const STAGE = (o = {}) => ({ sky: 'void', ground: false, bloom: 0.6, exposure: 1.1, view: VIEW, ...o });
const backdrop = (fx, c1 = '#0c1018', y = 0) => { // soft dark studio floor so PBR objects read
  const g = new THREE.CircleGeometry(30, 48); g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: c1, roughness: 0.35, metalness: 0.4 })); m.position.y = y; fx.mesh(m, null, { dur: 99 }); return m;
};
const gold = () => new THREE.MeshStandardMaterial({ color: '#f3b630', metalness: 1, roughness: 0.22, emissive: '#5a3300', emissiveIntensity: 0.25 });
const glossy = (c, e = '#000') => new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.25, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12, emissive: e, emissiveIntensity: 0.35 });
const coinMesh = (r = 0.3) => {
  const g = new THREE.Group(), m = gold();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, r * 0.22, 40), m); body.rotation.x = Math.PI / 2; g.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.93, r * 0.07, 12, 40), m); rim.position.z = r * 0.11; g.add(rim); const rim2 = rim.clone(); rim2.position.z = -r * 0.11; g.add(rim2);
  const st = new THREE.Shape(); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU - Math.PI / 2, rr = i % 2 ? r * 0.2 : r * 0.46; st[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); }
  const sg = new THREE.ExtrudeGeometry(st, { depth: r * 0.06, bevelEnabled: false }); const s1 = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({ color: '#ffd45a', metalness: 1, roughness: 0.35 })); s1.position.z = r * 0.11; g.add(s1); const s2 = s1.clone(); s2.position.z = -r * 0.11 - r * 0.06; g.add(s2);
  return g;
};
const heartShape = (s = 1) => { const sh = new THREE.Shape(); sh.moveTo(0, -1.0); sh.bezierCurveTo(-0.2, -0.75, -1.05, -0.2, -1.0, 0.35); sh.bezierCurveTo(-0.95, 0.95, -0.2, 1.0, 0, 0.45); sh.bezierCurveTo(0.2, 1.0, 0.95, 0.95, 1.0, 0.35); sh.bezierCurveTo(1.05, -0.2, 0.2, -0.75, 0, -1.0); return sh; };
const starShape = (R, r, n = 5) => { const s = new THREE.Shape(); for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * TAU + Math.PI / 2, rr = i % 2 ? r : R; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr); } s.closePath(); return s; };
const burst = (fx, pos, t0, o = {}) => {
  fx.emitter({ count: o.n ?? 40, kind: 'spark', shape: 'point', pos, dir: [0, 1, 0], spread: 3.1, speed: [2, 6], life: [0.4, 0.9], gravity: [0, -5, 0], drag: 0.6, size: [0.09, 0.03], stretch: 1.2, ramp: [[0, '#fff', 1], [0.4, o.c || '#ffd060', 1], [1, '#a40', 0]], intensity: 4, delay: t0, emit: 0.001, bounce: -1 });
  fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos, size: [o.g ?? 1.6, 0.4], life: [0.35, 0.35], ramp: [[0, '#fff', 1], [1, o.c || '#ffd060', 0]], intensity: 4, delay: t0, emit: 0.001 });
};
const twinkles = (fx, pos, size, n, t0, dur, c = '#ffe9a0') => fx.emitter({ count: n, kind: 'glint', shape: 'box', shapeSize: size, pos, life: [0.3, 0.7], size: [0.18, 0.05], sizeVar: 0.5, speed: 0, ramp: [[0, '#fff', 1], [1, c, 0]], intensity: 3.2, delay: t0, emit: dur });

export default [
  /* ================================================================ ACHIEVEMENT */
  { id: 'ui/achievement', name: 'Achievement', category: 'ui', loop: false, duration: 2.4, stage: STAGE({ view: { pos: [0, 1.5, 4.2], target: [0, 1.5, 0], fov: 38 } }),
    build(fx) {
      backdrop(fx);
      fx.light({ color: '#ffe0a0', intensity: 60, pos: [1, 3, 4], range: 15 }); fx.light({ color: '#8fb0ff', intensity: 20, pos: [-3, 2, 3], range: 15 });
      const g = new THREE.Group();
      const plate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 0.1), new THREE.MeshStandardMaterial({ color: '#171b24', metalness: 0.7, roughness: 0.35 })); g.add(plate);
      const fm = gold(); [0.45, -0.45].forEach((y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.05, 0.14), fm); b.position.y = y; g.add(b); });
      [1.8, -1.8].forEach((x) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.14), fm); b.position.x = x; g.add(b); });
      const medal = new THREE.Group(); const coin = coinMesh(0.34); medal.add(coin); const rib = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.02), glossy('#c02030')); rib.position.set(0, 0.42, -0.03); medal.add(rib);
      const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape(0.2, 0.09), { depth: 0.04, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), glossy('#fff2b0', '#ffcc40')); star.position.z = 0.14; medal.add(star);
      medal.position.set(-1.35, 0, 0.1); g.add(medal);
      fx.mesh(g, (t) => { const k = eBack(t / 0.5), out = eIn((t - 2.0) / 0.4); g.position.set(0, 1.55 + 2.2 * (1 - k) + 1.8 * out, 0); g.rotation.set(0, Math.sin(t * 1.4) * 0.07, 0); medal.rotation.y = t > 0.3 ? Math.sin((t - 0.3) * 6) * eOut(1 - (t - 0.3) / 1.2) * 0.9 + (t - 0.3 < 0.8 ? (1 - eOut((t - 0.3) / 0.8)) * TAU : 0) : 0; }, { dur: 2.4 });
      const tm = (pr, base, dy) => (p) => ({ pos: [0.35, base + dy + 0.0, 0.2], alpha: 1, scale: 1 });
      const txt = (text, size, y, grad, t0) => fx.text({ text, size, t0, dur: 2.4 - t0, fade: [0.15, 0.35], grad, outline: '#000', stroke: 8, font: text.length > 10 ? 58 : 80, motion: (pr, t) => { const tt = t ?? 0; const k = eBack((tt - t0) / 0.4), out = eIn((tt - 2.0) / 0.4); return { pos: [0.4, y + 1.55 + 2.2 * (1 - eBack(tt / 0.5)) + 1.8 * out, 0.2], scale: k }; } });
      txt('ACHIEVEMENT', 0.2, 0.17, ['#ffe9a0', '#f3b630'], 0.35); txt('UNLOCKED!', 0.3, -0.16, ['#ffffff', '#9fd6ff'], 0.5);
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', size: [1.2, 0.3], pos: [0, 0, 0], life: [0.5, 0.5], ramp: [[0, '#fff', 1], [1, '#ffd060', 0]], intensity: 4, delay: 0.5, emit: 0.001, follow: (m, ta, t) => m.position.set(-1.35, 1.55, 0.3) });
      twinkles(fx, [-0.2, 1.55, 0.3], [1.7, 0.35, 0.1], 22, 0.55, 1.2);
      burst(fx, [-1.35, 1.55, 0.3], 0.5, { n: 30 });
      fx.flash(0.45, 0.2, '#ffe9a0', 0.15);
    } },

  /* ================================================================ COIN COLLECT */
  { id: 'ui/coin-collect', name: 'Coin Collect', category: 'ui', loop: false, duration: 2.45, stage: STAGE({ view: { pos: [0.4, 1.7, 4.3], target: [0.4, 1.5, 0], fov: 40 } }),
    build(fx) {
      backdrop(fx);
      fx.light({ color: '#ffe0a0', intensity: 70, pos: [1.5, 3, 4], range: 15 }); fx.light({ color: '#8fb0ff', intensity: 20, pos: [-3, 2, 3], range: 15 });
      const c = coinMesh(0.5);
      const pos = (t) => { // pop up, hang, then fly to the HUD corner
        if (t < 0.95) { const u = t / 0.95; return [0, 0.35 + 1.5 * Math.sin(u * Math.PI * 0.5) * (1 - 0.0) + 0.0 * u, 0.2]; }
        const u = eIn((t - 1.55) / 0.7); return [lerp(0, 2.3, u), lerp(1.85 + Math.sin(t * 3) * 0.04, 2.9, u), 0.2];
      };
      fx.mesh(c, (t) => { const p = pos(t); c.position.set(...p); c.rotation.y = t * 9 * (1 - 0.6 * sm(0.9, 1.5, t)); c.rotation.x = Math.sin(t * 3) * 0.1; const s = t < 0.12 ? eOut(t / 0.12) : 1; c.scale.setScalar(s * (1 - 0.55 * eIn((t - 1.55) / 0.7)) * (1 + 0.25 * Math.exp(-Math.pow((t - 1.0) * 14, 2)))); }, { t0: 0, dur: 2.2, fade: [0, 0] });
      fx.mesh(new THREE.Group(), null, { dur: 1 });
      burst(fx, [0, 1.85, 0.3], 0.9, { n: 36, g: 2 }); twinkles(fx, [0, 1.85, 0.3], [0.5, 0.5, 0.1], 14, 0.9, 0.6);
      fx.emitter({ count: 12, kind: 'glint', shape: 'point', pos: [0, 0.3, 0.2], dir: [0, 1, 0], spread: 0.5, speed: [1.5, 3], life: [0.3, 0.6], size: [0.2, 0.05], ramp: [[0, '#fff', 1], [1, '#fc4', 0]], intensity: 3, delay: 0.05, emit: 0.001 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [2.3, 2.9, 0.3], size: [1.2, 0.3], life: [0.35, 0.35], ramp: [[0, '#fff', 1], [1, '#fc4', 0]], intensity: 4, delay: 2.2, emit: 0.001 });
      fx.ring({ t0: 0.9, dur: 0.6, r: [0.1, 1.2], width: [0.2, 0.03], normal: 'cam', pos: [0, 1.85, 0.2], intensity: 1.2, ramp: [[0, '#fff'], [1, '#fc4']] });
      fx.text({ text: '+10', size: 0.55, t0: 1.0, dur: 1.4, fade: [0.05, 0.4], grad: ['#fff8c0', '#ffc830'], outline: '#5a3200', stroke: 14, motion: (pr) => ({ pos: [0.15, 2.45 + eOut(pr) * 0.6, 0.4], scale: eBack(pr * 4) }) });
    } },

  /* ================================================================ COMBO COUNTER */
  { id: 'ui/combo-counter', name: 'Combo Counter', category: 'ui', loop: false, duration: 1.45, stage: STAGE({ view: { pos: [0, 1.5, 5.2], target: [0, 1.5, 0], fov: 40 } }),
    build(fx) {
      backdrop(fx, '#10111a');
      fx.light({ color: '#ff9a40', intensity: 80, pos: [0, 2, 3], range: 12, t0: 0, dur: 1.45, fade: [0.02, 0.5] });
      fx.shake(0.12, 0.3, 0.05);
      fx.text({ text: 'x7', size: 1.5, font: 115, stroke: 18, t0: 0.05, dur: 1.4, fade: [0.02, 0.3], grad: ['#fffbd0', '#ffd23a', '#ff6a10'], outline: '#4a1000', motion: (pr, t) => { const tt = (t ?? 0) - 0.05; const pop = tt < 0.18 ? lerp(2.2, 0.9, eOut(tt / 0.18)) : tt < 0.3 ? lerp(0.9, 1.0, (tt - 0.18) / 0.12) : 1 + Math.sin(tt * 16) * 0.015; const fade = 1 - eIn((tt - 1.0) / 0.4); return { pos: [0, 1.6, 0.4], scale: pop * (1 - 0.15 * eIn((tt - 1.0) / 0.4)), alpha: fade, rot: tt < 0.18 ? (0.25 * (1 - tt / 0.18)) : 0 }; } });
      fx.text({ text: 'COMBO', size: 0.5, font: 96, stroke: 12, t0: 0.15, dur: 1.3, fade: [0.05, 0.3], grad: ['#ffffff', '#ffb050'], outline: '#401000', motion: (pr, t) => ({ pos: [0, 0.82, 0.4], scale: eBack(((t ?? 0) - 0.15) / 0.25) }) });
      fx.ring({ t0: 0.05, dur: 0.5, r: [0.2, 2.6], width: [0.5, 0.05], normal: 'cam', pos: [0, 1.55, 0], intensity: 1.4, ramp: [[0, '#fff'], [0.5, '#ffb050'], [1, '#c30']] });
      fx.emitter({ count: 60, kind: 'spark', shape: 'point', pos: [0, 1.55, 0.2], dir: [0, 1, 0], spread: 3.1, speed: [3, 8], life: [0.3, 0.8], gravity: [0, -3, 0], drag: 1, size: [0.1, 0.03], stretch: 1.2, ramp: [[0, '#fff', 1], [0.4, '#ffb040', 1], [1, '#a30', 0]], intensity: 4, delay: 0.05, emit: 0.001 });
      fx.emitter({ count: 8, kind: 'streak', shape: 'point', pos: [0, 1.55, 0.2], dir: [0, 1, 0], spread: 3.1, speed: [6, 9], life: [0.2, 0.35], size: [0.9, 0.9], stretch: 0.5, ramp: [[0, '#fff', 0.9], [1, '#fa4', 0]], intensity: 3, delay: 0.05, emit: 0.001, radial: 1 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 1.55, 0.3], size: [3.2, 0.5], life: [0.3, 0.3], ramp: [[0, '#fff', 1], [1, '#fa4', 0]], intensity: 3, delay: 0.05, emit: 0.001 });
      fx.flash(0.05, 0.15, '#ffd090', 0.18);
    } },

  /* ================================================================ CONFETTI */
  { id: 'ui/confetti', name: 'Confetti', category: 'ui', loop: false, duration: 3.4, stage: STAGE({ sky: 'dusk', ground: false, bloom: 0.35, view: { pos: [0, 2.2, 7], target: [0, 2.0, 0], fov: 46 } }),
    build(fx) {
      backdrop(fx, '#1a1c28');
      fx.light({ color: '#fff0e0', intensity: 120, pos: [0, 6, 5], range: 25 }); fx.light({ color: '#9ab0ff', intensity: 40, pos: [-5, 3, 3], range: 20 });
      const N = 170, im = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.09, 0.006), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.45, metalness: 0.15, side: THREE.DoubleSide, emissive: '#222', emissiveIntensity: 0.4 }), N);
      const cols = ['#ff3b5c', '#ffcc2e', '#35c8ff', '#6be35a', '#c45cff', '#ff8a2e', '#ffffff']; const c = new THREE.Color();
      const P = []; for (let i = 0; i < N; i++) { const left = i % 2 === 0; const a = fx.rng.range(0.25, 0.9) * (left ? 1 : -1), up = fx.rng.range(0.6, 1.2); const sp = fx.rng.range(8, 14);
        P.push({ x0: left ? -3.6 : 3.6, y0: 0.2, z0: fx.rng.range(-0.8, 0.8), vx: Math.sin(a) * sp * 0.75, vy: up * sp * 0.95, vz: fx.rng.range(-1.5, 1.5), ax: fx.rng(), ay: fx.rng(), az: fx.rng(), w: fx.rng.range(5, 14), ph: fx.rng() * TAU, k: fx.rng.range(1.1, 2.0), sc: fx.rng.range(1.3, 2.3), sway: fx.rng.range(0.3, 0.9), sf: fx.rng.range(3, 7), t0: fx.rng() * 0.12 });
        im.setColorAt(i, c.set(fx.rng.pick(cols))); }
      const d = new THREE.Object3D(); const ax = new THREE.Vector3(); const g = 6.5;
      fx.mesh(im, (t) => {
        for (let i = 0; i < N; i++) { const p = P[i]; const tt = Math.max(0, t - p.t0); const k = p.k; const e = (1 - Math.exp(-k * tt)) / k;
          // ballistic burst, then terminal-velocity flutter (drag)
          let x = p.x0 + p.vx * e + Math.sin(tt * p.sf + p.ph) * p.sway * sm(0.4, 1.4, tt) * 0.4, y = p.y0 + p.vy * e - (g / k) * (tt - e) * 0.28 - 0.0, z = p.z0 + p.vz * e;
          y = p.y0 + p.vy * e - (g * 0.28 / k) * (tt - e); const fl = Math.max(0.02, y); if (y < 0.02) y = 0.02 + 0.0;
          const on = tt > 0.0; d.position.set(x, on ? y : -50, z); ax.set(p.ax - 0.5, p.ay - 0.5, p.az - 0.5).normalize(); const st = y <= 0.021 ? 0 : 1; d.quaternion.setFromAxisAngle(ax, p.w * tt * st + p.ph); d.scale.setScalar(p.sc * (tt < 0.05 ? tt / 0.05 : 1) * (1 - 0.0 * sm(2.8, 3.4, t)) * (1 - sm(3.0, 3.4, t))); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }
        im.instanceMatrix.needsUpdate = true;
      }, { dur: 3.4 });
      // cannon pops
      [-3.6, 3.6].forEach((x, i) => { fx.emitter({ count: 24, kind: 'spark', shape: 'point', pos: [x, 0.25, 0], dir: [-Math.sign(x) * 0.5, 1, 0], spread: 0.8, speed: [3, 8], life: [0.3, 0.6], gravity: [0, -6, 0], size: [0.08, 0.02], stretch: 1, ramp: [[0, '#fff', 1], [0.5, '#ffd060', 1], [1, '#f60', 0]], intensity: 3.5, delay: 0.02, emit: 0.001 });
        fx.emitter({ count: 2, kind: 'soft', shape: 'point', pos: [x, 0.3, 0], size: [1.8, 1.8], life: [0.25, 0.25], ramp: [[0, '#fff', 1], [1, '#fc6', 0]], intensity: 2, delay: 0.02, emit: 0.001 });
        fx.emitter({ count: 12, kind: 'smoke', blend: 'normal', shape: 'point', pos: [x, 0.3, 0], dir: [-Math.sign(x) * 0.4, 1, 0], spread: 0.6, speed: [1, 3], life: [0.8, 1.5], size: [0.4, 1.2], ramp: [[0, '#bbb', 0.4], [1, '#888', 0]], lit: 1, delay: 0.02, emit: 0.001, order: -1 }); });
      fx.flash(0.02, 0.2, '#fff4d8', 0.2);
      twinkles(fx, [0, 3, 0], [4, 2, 1], 26, 0.2, 2.4, '#fff');
    } },

  /* ================================================================ COUNTDOWN */
  { id: 'ui/countdown', name: 'Countdown', category: 'ui', loop: false, duration: 3.1, stage: STAGE({ view: { pos: [0, 1.5, 5.4], target: [0, 1.5, 0], fov: 40 } }),
    build(fx) {
      backdrop(fx, '#10131c');
      const items = [['3', 0, '#ff5a5a', ['#fff', '#ff6a6a', '#c01a2a']], ['2', 0.7, '#ffa040', ['#fff', '#ffa040', '#c05a10']], ['1', 1.4, '#ffe14a', ['#fff', '#ffe14a', '#c9a010']], ['GO!', 2.1, '#5aff8a', ['#fff', '#5aff8a', '#10a040']]];
      items.forEach(([s, t0, col, grad], i) => {
        const dur = i === 3 ? 1.0 : 0.7, big = i === 3 ? 1.4 : 1.7;
        fx.text({ text: s, size: big, font: 118, stroke: 18, t0, dur, fade: [0.02, i === 3 ? 0.35 : 0.18], grad, outline: '#05060a', motion: (pr, t) => { const u = ((t ?? 0) - t0); const pop = u < 0.16 ? lerp(2.1, 1, eOut(u / 0.16)) : 1 - 0.1 * sm(0.16, dur, u); return { pos: [0, 1.5, 0.4], scale: pop * (i === 3 ? 1.0 + 0.1 * sm(0.5, 1, u) : 1), alpha: 1, rot: 0 }; } });
        fx.ring({ t0, dur: 0.55, r: [0.4, 3.2], width: [0.35, 0.04], normal: 'cam', pos: [0, 1.5, 0], intensity: 1.2, ramp: [[0, '#fff'], [0.4, col], [1, col]] });
        fx.light({ color: col, intensity: 60, pos: [0, 1.6, 2.5], range: 10, t0, dur, fade: [0.02, 0.35], norm: 40 });
        fx.emitter({ count: i === 3 ? 90 : 36, kind: 'spark', shape: 'ring', radius: 0.5, radiusIn: 0.3, pos: [0, 1.5, 0.2], dir: [0, 1, 0], spread: 0, radial: 1, speed: [2, i === 3 ? 9 : 6], life: [0.3, 0.7], size: [0.08, 0.02], stretch: 1.2, ramp: [[0, '#fff', 1], [0.4, col, 1], [1, col, 0]], intensity: 3.5, delay: t0, emit: 0.001 });
      });
      fx.shake(2.1, 0.3, 0.05); fx.flash(2.1, 0.2, '#b0ffc8', 0.22);
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 1.5, 0.3], size: [3.5, 0.5], life: [0.3, 0.3], ramp: [[0, '#fff', 1], [1, '#5aff8a', 0]], intensity: 3, delay: 2.1, emit: 0.001 });
    } },

  /* ================================================================ CRIT NUMBER */
  { id: 'ui/crit-number', name: 'Crit Number', category: 'ui', loop: false, duration: 1.5, stage: STAGE({ view: { pos: [0, 1.5, 5.2], target: [0, 1.5, 0], fov: 40 } }),
    build(fx) {
      backdrop(fx, '#14100f');
      fx.light({ color: '#ff8a30', intensity: 90, pos: [0, 2, 3], range: 12, dur: 1.5, fade: [0.01, 0.6] }); fx.shake(0.06, 0.28, 0.07);
      fx.flash(0.04, 0.2, '#ffe0a0', 0.4);
      fx.text({ text: '247', size: 1.4, font: 118, stroke: 18, t0: 0.04, dur: 1.45, fade: [0.01, 0.3], grad: ['#fffbd0', '#ffd22a', '#ff5a00'], outline: '#3a0600', motion: (pr, t) => { const u = (t ?? 0) - 0.04; const s = u < 0.1 ? lerp(3, 0.85, eOut(u / 0.1)) : u < 0.25 ? lerp(0.85, 1.12, (u - 0.1) / 0.15) : 1.12 - 0.12 * sm(0.25, 0.5, u) + sm(0.9, 1.4, u) * 0.1; return { pos: [0, 1.5 + eOut(u * 0.9) * 0.45, 0.4], scale: s, rot: (1 - eOut(u / 0.2)) * -0.18 }; } });
      fx.text({ text: 'CRITICAL!', size: 0.46, font: 90, stroke: 14, t0: 0.12, dur: 1.3, fade: [0.03, 0.3], grad: ['#ffffff', '#ff6a3a', '#d01010'], outline: '#2a0000', motion: (pr, t) => ({ pos: [0, 2.55 + eOut(((t ?? 0) - 0.12) * 0.9) * 0.4, 0.4], scale: eBack(((t ?? 0) - 0.12) / 0.2) }) });
      fx.ring({ t0: 0.04, dur: 0.45, r: [0.2, 3.0], width: [0.45, 0.04], normal: 'cam', pos: [0, 1.75, 0], intensity: 1.5, ramp: [[0, '#fff'], [0.4, '#ffb040'], [1, '#c20']] });
      // starburst rays
      fx.emitter({ count: 12, kind: 'streak', shape: 'point', pos: [0, 1.75, 0.2], dir: [0, 1, 0], spread: 3.1, speed: [8, 12], life: [0.22, 0.38], size: [1.2, 1.2], stretch: 0.6, ramp: [[0, '#fff', 1], [1, '#f94', 0]], intensity: 3, delay: 0.04, emit: 0.001, radial: 1 });
      fx.emitter({ count: 70, kind: 'spark', shape: 'point', pos: [0, 1.75, 0.2], dir: [0, 1, 0], spread: 3.1, speed: [3, 10], life: [0.3, 0.9], gravity: [0, -5, 0], drag: 0.8, size: [0.1, 0.03], stretch: 1.3, ramp: [[0, '#fff', 1], [0.4, '#ffa030', 1], [1, '#a20', 0]], intensity: 4, delay: 0.04, emit: 0.001 });
      fx.emitter({ count: 14, kind: 'shard', shape: 'point', pos: [0, 1.75, 0.2], dir: [0, 1, 0], spread: 3.1, speed: [2, 6], life: [0.4, 0.9], gravity: [0, -8, 0], size: [0.1, 0.06], rot: 8, ramp: [[0, '#ffd070', 1], [1, '#c04010', 0]], intensity: 2.5, delay: 0.04, emit: 0.001 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 1.75, 0.3], size: [4, 0.6], life: [0.28, 0.28], ramp: [[0, '#fff', 1], [1, '#fa4', 0]], intensity: 3.5, delay: 0.04, emit: 0.001 });
    } },

  /* ================================================================ DAMAGE NUMBER */
  { id: 'ui/damage-number', name: 'Damage Number', category: 'ui', loop: false, duration: 1.05, stage: STAGE({ view: { pos: [0, 1.4, 4.2], target: [0, 1.4, 0], fov: 38 } }),
    build(fx) {
      backdrop(fx, '#12131a');
      fx.light({ color: '#ff6a50', intensity: 40, pos: [0, 1.5, 2.5], range: 10, dur: 1.05, fade: [0.02, 0.4] });
      fx.text({ text: '-42', size: 0.8, font: 112, stroke: 16, t0: 0, dur: 1.05, fade: [0.01, 0.3], grad: ['#ffffff', '#ff8a7a', '#e02a2a'], outline: '#2a0000', motion: (pr, t) => { const u = t ?? 0; const s = u < 0.1 ? lerp(1.7, 1, eOut(u / 0.1)) : 1 - 0.1 * sm(0.5, 1, u); const arc = u * 0.9, x = Math.sin(u * 2.2) * 0.35 * (u > 0.1 ? 1 : 0); return { pos: [x + u * 0.25, 1.15 + eOut(u * 1.1) * 0.9 - Math.max(0, u - 0.6) * 0.5, 0.4], scale: s, rot: -0.12 * Math.sin(u * 3) }; } });
      fx.emitter({ count: 22, kind: 'spark', shape: 'point', pos: [0, 1.2, 0.2], dir: [0, 1, 0], spread: 3.1, speed: [1.5, 5], life: [0.2, 0.5], gravity: [0, -6, 0], size: [0.08, 0.02], stretch: 1.2, ramp: [[0, '#fff', 1], [0.4, '#ff6a50', 1], [1, '#800', 0]], intensity: 3.5, emit: 0.001 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [0, 1.2, 0.3], size: [1.3, 0.3], life: [0.2, 0.2], ramp: [[0, '#fff', 1], [1, '#f64', 0]], intensity: 3, emit: 0.001 });
    } },

  /* ================================================================ EXCLAMATION */
  { id: 'ui/exclamation', name: 'Exclamation', category: 'ui', loop: false, duration: 1.4, body: true, stage: STAGE({ sky: 'dusk', bloom: 0.5, view: { pos: [1.2, 1.9, 4.2], target: [0, 1.7, 0], fov: 38 } }),
    build(fx) {
      backdrop(fx, '#1a1c26'); fx.light({ color: '#ffe0b0', intensity: 60, pos: [2, 3.5, 3], range: 14 });
      const g = new THREE.Group(), mat = glossy('#ffd21e', '#ff9a00');
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.085, 0.58, 20), mat); bar.position.y = 0.38; g.add(bar); const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 12, 0, TAU, 0, Math.PI / 2), mat); cap.position.y = 0.67; g.add(cap);
      const bt = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12, 0, TAU, Math.PI / 2, Math.PI / 2), mat); bt.position.y = 0.09; g.add(bt);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 14), mat); dot.position.y = -0.1; g.add(dot);
      const back = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff7a10').multiplyScalar(0.5), transparent: true, opacity: 0.0, depthWrite: false })); back.position.y = 0.3; g.add(back);
      g.rotation.order = 'YXZ';
      fx.mesh(g, (t) => { const k = t < 0.22 ? eBack(t / 0.22) : 1; const sq = t < 0.22 ? 1 + 0.0 : 1 + Math.exp(-(t - 0.22) * 9) * Math.sin((t - 0.22) * 30) * 0.18; const bob = Math.sin(t * 9) * 0.05 * sm(0.25, 0.4, t) * (1 - sm(0.9, 1.3, t)); const out = sm(1.05, 1.4, t);
        g.position.set(0, 2.25 + bob + (t < 0.22 ? (1 - k) * -0.6 : 0), 0.1); g.scale.set(k * (2 - sq) * (1 - out), k * sq * (1 - out), k * (1 - out) + 0.001); g.rotation.z = Math.sin(t * 24) * 0.13 * Math.exp(-(t - 0.2) * 3) * (t > 0.2 ? 1 : 0); g.rotation.y = Math.sin(t * 5) * 0.25;
        back.material.opacity = 0.18 * Math.exp(-(t - 0.2) * 3) * (t > 0.1 ? 1 : 0); }, { dur: 1.4 });
      fx.light({ color: '#ffb020', intensity: 40, pos: [0, 2.4, 1], range: 5, t0: 0.05, dur: 1.2, fade: [0.05, 0.3], main: false });
      fx.ring({ t0: 0.2, dur: 0.5, r: [0.2, 0.9], width: [0.15, 0.03], normal: 'cam', pos: [0, 2.5, 0.1], intensity: 1.3, ramp: [[0, '#fff'], [1, '#ff9a20']] });
      fx.emitter({ count: 9, kind: 'streak', shape: 'point', pos: [0, 2.5, 0.2], dir: [0, 1, 0], spread: 3.1, radial: 1, speed: [4, 6], life: [0.2, 0.35], size: [0.55, 0.55], stretch: 0.4, ramp: [[0, '#fff', 1], [1, '#fb2', 0]], intensity: 3, delay: 0.2, emit: 0.001 });
      fx.emitter({ count: 18, kind: 'spark', shape: 'point', pos: [0, 2.5, 0.2], dir: [0, 1, 0], spread: 3.1, speed: [1.5, 4], life: [0.3, 0.7], gravity: [0, -3, 0], size: [0.08, 0.02], stretch: 1, ramp: [[0, '#fff', 1], [0.4, '#ffd040', 1], [1, '#a40', 0]], intensity: 3.5, delay: 0.2, emit: 0.001 });
    } },

  /* ================================================================ HEALTH BAR HIT */
  { id: 'ui/health-bar-hit', name: 'Health Bar Hit', category: 'ui', loop: false, duration: 2.0, stage: STAGE({ view: { pos: [0, 1.7, 5.4], target: [0, 1.6, 0], fov: 36 } }),
    build(fx) {
      backdrop(fx); fx.light({ color: '#fff0e0', intensity: 70, pos: [1, 3.5, 4], range: 15 }); fx.light({ color: '#8fb0ff', intensity: 20, pos: [-3, 2, 3], range: 15 });
      const W = 3.2, H = 0.34, g = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(W + 0.14, H + 0.14, 0.12), new THREE.MeshStandardMaterial({ color: '#2a2e3a', metalness: 0.8, roughness: 0.35 })); g.add(frame);
      const well = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.13), new THREE.MeshStandardMaterial({ color: '#0a0c12', roughness: 0.6 })); well.position.z = 0.0; g.add(well);
      const mk = (c, e, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, H * 0.86, 0.1), new THREE.MeshPhysicalMaterial({ color: c, emissive: e, emissiveIntensity: 0.9, roughness: 0.25, clearcoat: 1 })); m.geometry.translate(0.5, 0, 0); m.position.set(-W / 2 + 0.03, 0, z); g.add(m); return m; };
      const ghost = mk('#ffe9a0', '#ffb040', 0.07), fill = mk('#e02a3a', '#ff2030', 0.09); const sh = mk('#ffffff', '#ffffff', 0.1); sh.scale.y = 0.18; sh.position.y = H * 0.25; sh.material.opacity = 0.35; sh.material.transparent = true;
      for (let i = 1; i < 10; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, H, 0.14), new THREE.MeshStandardMaterial({ color: '#10131a' })); b.position.x = -W / 2 + (i / 10) * W; g.add(b); }
      const hp0 = 0.82, hp1 = 0.5;
      fx.mesh(g, (t) => { const hit = t >= 0.35; const hp = hit ? hp1 : hp0; const sk = hit ? Math.exp(-(t - 0.35) * 7) : 0; const gh = t < 0.35 ? hp0 : t < 1.05 ? hp0 : lerp(hp0, hp1, eOut((t - 1.05) / 0.5));
        fill.scale.x = (W - 0.06) * lerp(hp0, hp1, eIn((t - 0.35) / 0.12)); ghost.scale.x = (W - 0.06) * gh; sh.scale.x = fill.scale.x;
        const low = hit && t > 1.6 ? 0.5 + 0.5 * Math.sin((t - 1.6) * 14) : 0; fill.material.emissiveIntensity = 0.9 + (t > 0.35 ? 3 * Math.exp(-(t - 0.35) * 10) : 0) + low * 0.4;
        g.position.set(Math.sin(t * 90) * 0.06 * sk, 1.7 + Math.sin(t * 70) * 0.04 * sk, 0); g.rotation.z = Math.sin(t * 60) * 0.02 * sk; const o = sm(1.8, 2.0, t); g.scale.setScalar(1 - 0.0 * o); }, { dur: 2 });
      const hx = -W / 2 + 0.03 + (W - 0.06) * hp1;
      fx.emitter({ count: 26, kind: 'shard', shape: 'point', pos: [hx, 1.7, 0.2], dir: [0.3, 1, 0], spread: 1.6, speed: [1.5, 5], life: [0.5, 1], gravity: [0, -9, 0], size: [0.07, 0.04], rot: 8, ramp: [[0, '#ff4a5a', 1], [1, '#801020', 0]], intensity: 2.4, delay: 0.35, emit: 0.001 });
      fx.emitter({ count: 30, kind: 'spark', shape: 'point', pos: [hx, 1.7, 0.2], dir: [0, 1, 0], spread: 2.4, speed: [2, 6], life: [0.2, 0.5], gravity: [0, -6, 0], size: [0.07, 0.02], stretch: 1.2, ramp: [[0, '#fff', 1], [0.4, '#ff6a60', 1], [1, '#800', 0]], intensity: 4, delay: 0.35, emit: 0.001 });
      fx.emitter({ count: 1, kind: 'glint', shape: 'point', pos: [hx, 1.7, 0.3], size: [1.2, 0.3], life: [0.25, 0.25], ramp: [[0, '#fff', 1], [1, '#f55', 0]], intensity: 4, delay: 0.35, emit: 0.001 });
      fx.flash(0.35, 0.14, '#ff6060', 0.12);
      fx.text({ text: '-30', size: 0.6, font: 108, stroke: 14, t0: 0.35, dur: 1.2, fade: [0.02, 0.35], grad: ['#fff', '#ff8a7a', '#e02a2a'], outline: '#2a0000', motion: (pr) => ({ pos: [hx + 0.3 * pr, 2.25 + eOut(pr * 1.2) * 0.5, 0.4], scale: eBack(pr * 5) }) });
    } },

  /* ================================================================ HEART LOST */
  { id: 'ui/heart-lost', name: 'Heart Lost', category: 'ui', loop: false, duration: 1.5, stage: STAGE({ view: { pos: [0, 1.4, 4.6], target: [0, 1.3, 0], fov: 38 } }),
    build(fx) {
      backdrop(fx); fx.light({ color: '#fff0e0', intensity: 70, pos: [1.5, 3.5, 4], range: 15 }); fx.light({ color: '#8fb0ff', intensity: 20, pos: [-3, 2, 3], range: 15 });
      // two heart halves split along a zigzag crack
      const zz = [[0, 0.45], [0.12, 0.22], [-0.1, 0.0], [0.13, -0.28], [-0.05, -0.55], [0.03, -0.78], [0, -1.0]];
      const half = (sgn) => { const sh = new THREE.Shape(); const X = (x) => x; const S = sgn;
        sh.moveTo(0, -1.0); sh.bezierCurveTo(-0.2 * S, -0.75, -1.05 * S, -0.2, -1.0 * S, 0.35); sh.bezierCurveTo(-0.95 * S, 0.95, -0.2 * S, 1.0, 0, 0.45); for (let i = 1; i < zz.length; i++) sh.lineTo(zz[i][0], zz[i][1]); return sh; };
      const geo = (s) => new THREE.ExtrudeGeometry(half(s), { depth: 0.28, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.07, bevelSegments: 4, curveSegments: 22 });
      const mats = [glossy('#e8203a', '#d01030'), glossy('#e8203a', '#d01030')]; mats.forEach((m) => { m.transparent = true; });
      const L = new THREE.Mesh(geo(1), mats[0]), R = new THREE.Mesh(geo(-1), mats[1]); L.geometry.translate(0, 0, -0.14); R.geometry.translate(0, 0, -0.14);
      const gr = new THREE.Group(); const gL = new THREE.Group(), gR = new THREE.Group(); gL.add(L); gR.add(R); gr.add(gL, gR); gr.position.set(0, 1.35, 0); gr.scale.setScalar(0.85);
      const red = new THREE.Color('#e8203a'), grey = new THREE.Color('#444a55'), em = new THREE.Color('#d01030');
      fx.mesh(gr, (t) => { const beat = t < 0.35 ? 1 + Math.abs(Math.sin(t * 20)) * 0.07 * (t > 0.0 ? 1 : 0) : 1; const sp = t > 0.45 ? t - 0.45 : 0; const k = eOut(sp / 0.5);
        const sh = t < 0.45 ? Math.sin(t * 80) * 0.02 * sm(0.0, 0.4, t) : 0; gr.scale.setScalar(0.85 * beat * (t < 0.12 ? eBack(t / 0.12) : 1));
        gL.position.set(-0.55 * k + sh, 0 - 1.6 * sp * sp * 1.6 + 0.3 * Math.sin(sp * 4) * (sp < 0.4 ? 1 : 0), 0); gL.rotation.z = 0.8 * k + sp * 0.4; gL.rotation.y = sp * 0.8;
        gR.position.set(0.55 * k - sh, 0 - 1.6 * sp * sp * 1.8 + 0.3 * Math.sin(sp * 4) * (sp < 0.4 ? 1 : 0), 0); gR.rotation.z = -0.9 * k - sp * 0.5; gR.rotation.y = -sp * 0.9;
        const gm = sm(0.45, 0.95, t); mats.forEach((m) => { m.color.copy(red).lerp(grey, gm); m.emissive.copy(em).multiplyScalar(1 - gm); m.opacity = 1 - sm(1.1, 1.5, t); }); }, { dur: 1.5 });
      fx.flash(0.45, 0.15, '#ff4050', 0.2); fx.shake(0.45, 0.25, 0.04);
      fx.ring({ t0: 0.45, dur: 0.45, r: [0.2, 2.0], width: [0.3, 0.03], normal: 'cam', pos: [0, 1.35, 0.1], intensity: 1.3, ramp: [[0, '#fff'], [0.4, '#ff6a7a'], [1, '#900']] });
      fx.light({ color: '#ff2040', intensity: 60, pos: [0, 1.4, 1.5], range: 8, t0: 0, dur: 1.2, fade: [0.05, 0.5], main: false });
      fx.emitter({ count: 40, kind: 'shard', shape: 'line', shapeSize: [0.02, 0, 0], pos: [0, 1.35, 0.1], dir: [0, 1, 0], spread: 2.4, speed: [1.5, 5], life: [0.6, 1.2], gravity: [0, -7, 0], size: [0.1, 0.05], rot: 8, ramp: [[0, '#ff4a5a', 1], [0.6, '#a01828', 1], [1, '#401018', 0]], intensity: 2.2, delay: 0.45, emit: 0.001 });
      fx.emitter({ count: 24, kind: 'spark', shape: 'point', pos: [0, 1.35, 0.2], dir: [0, 1, 0], spread: 3.1, speed: [2, 6], life: [0.25, 0.6], gravity: [0, -5, 0], size: [0.08, 0.02], stretch: 1.2, ramp: [[0, '#fff', 1], [0.4, '#ff5060', 1], [1, '#800', 0]], intensity: 3.5, delay: 0.45, emit: 0.001 });
      fx.emitter({ count: 8, kind: 'smoke', blend: 'normal', shape: 'point', pos: [0, 1.3, 0.1], dir: [0, 1, 0], spread: 1.2, speed: [0.3, 1], life: [0.8, 1.2], size: [0.4, 1.0], ramp: [[0, '#555', 0.4], [1, '#222', 0]], lit: 1, delay: 0.5, emit: 0.2, order: -1 });
    } },

  /* ================================================================ LEVEL UP */
  { id: 'ui/level-up', name: 'Level Up', category: 'ui', loop: false, duration: 3.2, body: true, stage: STAGE({ sky: 'night', bloom: 0.85, view: { pos: [1.6, 1.6, 8.2], target: [0, 2.0, 0], fov: 42 } }),
    build(fx) {
      backdrop(fx, '#141824');
      fx.light({ color: '#ffd060', intensity: 300, pos: [0, 2.2, 1.2], range: 14, t0: 0.15, dur: 3.0, fade: [0.2, 1.2], norm: 100 });
      fx.beam({ pos: [0, 0, 0], height: 9, r: [1.0, 0.7], t0: 0.2, dur: 2.8, fade: [0.15, 1.1], grow: [0.2, 1], intensity: 0.45, alpha: 0.7, noise: 0.6, freq: 2, speed: 0.8, edge: 1.4, ramp: [[0, '#ffffff'], [0.4, '#ffe08a'], [1, '#f0a020']] });
      fx.beam({ pos: [0, 0, 0], height: 9, r: [0.35, 0.25], t0: 0.2, dur: 2.8, fade: [0.1, 1.0], intensity: 0.8, alpha: 0.8, noise: 0.3, edge: 1.2, ramp: [[0, '#fff'], [1, '#ffe9a0']] });
      fx.decal({ kind: 'glow', t0: 0.15, dur: 2.9, r: [2.2, 2.4], fade: [0.1, 1.2], intensity: 1.6, ramp: [[0, '#000'], [0.5, '#c07a10'], [1, '#ffe9a0']] });
      fx.decal({ kind: 'rune', t0: 0.1, dur: 2.5, r: [1.7, 1.7], fade: [0.1, 1], intensity: 1.2, reveal: 0.7, spin: 0.5, glyphs: 12, ramp: [[0, '#a05a00'], [1, '#fff0b0']] });
      fx.ring({ t0: 0.15, dur: 0.9, r: [0.3, 5], width: [0.5, 0.08], normal: 'up', intensity: 1.6, ramp: [[0, '#fff'], [0.5, '#ffd060'], [1, '#c07010']] });
      // rising energy rings
      [0.3, 0.7, 1.1, 1.5].forEach((t0, i) => { const tor = new THREE.Mesh(new THREE.TorusGeometry(1, 0.02, 8, 64), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd878').multiplyScalar(3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); tor.rotation.x = Math.PI / 2;
        fx.mesh(tor, (t) => { const u = cl((t - t0) / 1.4); tor.position.y = 0.05 + eOut(u) * 4.2; tor.scale.setScalar(0.95 - 0.35 * u); tor.material.opacity = Math.sin(u * Math.PI) * 0.9; }, { t0, dur: 1.4 }); });
      fx.emitter({ count: 120, kind: 'soft', shape: 'disc', radius: 0.9, pos: [0, 0.1, 0], dir: [0, 1, 0], spread: 0.1, speed: [1.5, 4], life: [1, 2], size: [0.07, 0.02], ramp: [[0, '#fff0b0', 1], [1, '#ffa010', 0]], intensity: 3, turb: [0.3, 1], swirl: 1.5, delay: 0.2, emit: 1.8, gravity: [0, 0.5, 0] });
      fx.emitter({ count: 28, kind: 'glint', shape: 'disc', radius: 1.0, pos: [0, 0.5, 0], dir: [0, 1, 0], spread: 0.15, speed: [1, 2.5], life: [0.6, 1.2], size: [0.2, 0.05], ramp: [[0, '#fff', 1], [1, '#ffd060', 0]], intensity: 3, delay: 0.3, emit: 1.8 });
      fx.text({ text: 'LEVEL UP!', size: 0.95, font: 100, stroke: 16, t0: 0.55, dur: 2.6, fade: [0.05, 0.6], grad: ['#fffbe0', '#ffd23a', '#e07a10'], outline: '#3a1c00', motion: (pr, t) => { const u = (t ?? 0) - 0.55; const s = u < 0.35 ? eBack(u / 0.35) : 1; return { pos: [0, 3.65 + Math.sin(u * 3) * 0.05 + sm(0, 0.8, u) * 0.15, 0.5], scale: s, rot: Math.sin(u * 2.4) * 0.015 }; } });
      fx.text({ text: 'LV 12', size: 0.5, font: 90, stroke: 12, t0: 0.85, dur: 2.3, fade: [0.05, 0.6], grad: ['#fff', '#9fd6ff', '#4a8ae0'], outline: '#041a40', motion: (pr, t) => ({ pos: [0, 2.95, 0.5], scale: eBack(((t ?? 0) - 0.85) / 0.3) }) });
      fx.flash(0.2, 0.3, '#ffe9a0', 0.3);
      // the dummy glows
      fx.on((t) => { const g = Math.exp(-Math.pow((t - 0.5) * 1.2, 2)) * 1.0; fx.body.set({ tint: '#ffd060', tintAmt: 0, glow: g * 1.4, rim: '#ffe9a0', rimAmt: g * 1.5 }); });
    } },

  /* ================================================================ QUEST COMPLETE */
  { id: 'ui/quest-complete', name: 'Quest Complete', category: 'ui', loop: false, duration: 2.6, stage: STAGE({ view: { pos: [0, 1.6, 4.4], target: [0, 1.5, 0], fov: 38 } }),
    build(fx) {
      backdrop(fx); fx.light({ color: '#ffe8c0', intensity: 90, pos: [1.5, 3.5, 4], range: 15 }); fx.light({ color: '#8fb0ff', intensity: 20, pos: [-3, 2, 3], range: 15 });
      const g = new THREE.Group(), PW = 3.7;
      const pm = new THREE.MeshStandardMaterial({ color: '#e6cf9c', roughness: 0.9 }); const paper = new THREE.Mesh(new THREE.BoxGeometry(1, 1.0, 0.02), pm); g.add(paper);
      const stripe = new THREE.MeshStandardMaterial({ color: '#8a5a22', roughness: 0.8 }); const bt = new THREE.Mesh(new THREE.BoxGeometry(1, 0.05, 0.03), stripe), bb = bt.clone(); g.add(bt, bb);
      const rollM = new THREE.MeshStandardMaterial({ color: '#d4b87a', roughness: 0.8 }); const rl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.15, 20), rollM), rr = rl.clone(); g.add(rl, rr);
      const cap = new THREE.MeshStandardMaterial({ color: '#b8862a', metalness: 0.9, roughness: 0.3 }); [rl, rr].forEach((r) => { [0.6, -0.6].forEach((y) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), cap); c.position.y = y; r.add(c); }); });
      // green check mark (extruded)
      const ck = new THREE.Shape(); ck.moveTo(-0.28, 0.0); ck.lineTo(-0.16, -0.12); ck.lineTo(-0.05, -0.0); ck.lineTo(0.22, 0.3); ck.lineTo(0.34, 0.18); ck.lineTo(-0.05, -0.27); ck.lineTo(-0.16, -0.37); ck.closePath(); ck.lineTo(-0.28, 0);
      const chk = new THREE.Mesh(new THREE.ExtrudeGeometry(ck, { depth: 0.06, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), glossy('#2bd26a', '#10a040')); chk.position.set(-1.4, 0.02, 0.08); chk.scale.setScalar(0); g.add(chk);
      fx.mesh(g, (t) => { const k = eOut((t - 0.1) / 0.55), out = sm(2.2, 2.6, t); const w = PW * k;
        paper.scale.x = Math.max(0.001, w); bt.scale.x = bb.scale.x = Math.max(0.001, w); bt.position.y = 0.5; bb.position.y = -0.5; rl.position.x = -w / 2; rr.position.x = w / 2; rl.rotation.y = rr.rotation.y = 0; rl.visible = rr.visible = k > 0.01;
        paper.scale.y = 0.95; bt.position.y = 0.475; bb.position.y = -0.475; rl.scale.y = rr.scale.y = 0.95 / 1.15 * 1.1;
        const ck2 = t > 0.95 ? (t < 1.1 ? lerp(2.2, 1, eOut((t - 0.95) / 0.15)) : 1 + Math.exp(-(t - 1.1) * 8) * 0.0) : 0; chk.scale.setScalar(ck2 * 1.25);
        g.position.set(0, 1.5 - out * 0.4 + Math.sin(t * 2) * 0.02, 0); g.scale.setScalar(1 - out * 0.0); g.rotation.x = -out * 0.4; g.children.forEach(() => 0); }, { dur: 2.6, fade: [0, 0] });
      fx.text({ text: 'QUEST', size: 0.42, font: 84, stroke: 6, t0: 0.65, dur: 1.9, fade: [0.05, 0.4], grad: ['#6a4210', '#3a2208'], outline: '#f2e0b0', motion: (pr, t) => ({ pos: [0.55, 1.5 + 0.24 - sm(2.2, 2.6, t ?? 0) * 0.4, 0.2], scale: eBack(((t ?? 0) - 0.65) / 0.3) }) });
      fx.text({ text: 'COMPLETE!', size: 0.5, font: 84, stroke: 8, t0: 0.9, dur: 1.65, fade: [0.05, 0.4], grad: ['#3a8a2a', '#1a5a18'], outline: '#f2e0b0', motion: (pr, t) => ({ pos: [0.55, 1.5 - 0.2 - sm(2.2, 2.6, t ?? 0) * 0.4, 0.2], scale: eBack(((t ?? 0) - 0.9) / 0.3) }) });
      fx.ring({ t0: 0.95, dur: 0.5, r: [0.15, 1.6], width: [0.2, 0.03], normal: 'cam', pos: [-1.4, 1.52, 0.2], intensity: 1.2, ramp: [[0, '#fff'], [0.5, '#6aff9a'], [1, '#1a8a40']] });
      burst(fx, [-1.4, 1.52, 0.3], 0.95, { n: 34, c: '#7affa0', g: 1.3 }); twinkles(fx, [0, 1.5, 0.3], [1.8, 0.45, 0.1], 24, 1.0, 1.3, '#ffe9a0');
      fx.emitter({ count: 40, kind: 'soft', shape: 'box', shapeSize: [1.9, 0.3, 0.2], pos: [0, 1.5, 0.3], dir: [0, 1, 0], spread: 0.5, speed: [0.3, 0.8], life: [0.6, 1.2], size: [0.06, 0.02], ramp: [[0, '#fff0b0', 1], [1, '#ffa010', 0]], intensity: 3, delay: 1.0, emit: 1.2 });
      fx.light({ color: '#6aff9a', intensity: 40, pos: [-1.4, 1.5, 1.5], range: 5, t0: 0.95, dur: 1.2, fade: [0.02, 0.8], main: false });
    } },
];
