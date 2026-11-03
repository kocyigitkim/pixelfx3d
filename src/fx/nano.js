// Nano class: 8 tech skills with the NANO ramp (PLAN2 B23). Built from T-MEL, T-HEL, T-NOV, T-GND and T-BUF templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, metal, addMat, VAPOR, NANO } from './_skill.js';
import { bladeTable, sweepSurface, contact } from './melee.js';

const m = meta('nano', 'tech');
const C = [1.62, 1.2, 0.1], T = [3.8, 1.2, 0], G = [3, 0, 0];
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });

export default [
  // 1. swarm-blade: 20 metal chips assemble along the blade, then scatter
  SKILL('nano/swarm-blade', 'Swarm blade', m(['earth', 'nano'], 'melee-swarm', 0.3, 6, 2, 'arc'), 1.4, {
    view: 'side', sky: 'dark',
    act: act('slash', 0.07, 1.85),
    // P3=193
    build(fx, o) {
      const k = kit(fx, o, NANO), grip = bladeTable(fx, -0.05, 0.35, 0.3), tip = bladeTable(fx, -0.05, 0.35, 1.0);
      const at = (t, f) => { const g = grip(clamp(t, -0.05, 0.35)), e = tip(clamp(t, -0.05, 0.35)); return [0, 1, 2].map((j) => g[j] + (e[j] - g[j]) * f); };
      for (let i = 0; i < 20; i++) {
        const piece = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.03), metal('#c9d3dc', k.col(1), 0.5)), f = i / 19;
        const sc = [fx.rng.range(-0.45, 0.45), fx.rng.range(-0.45, 0.45), fx.rng.range(-0.45, 0.45)];
        fx.mesh(piece, (t) => { const a = sm(-0.45, -0.1, t) * (1 - sm(0.5, 0.8, t)), p = at(t, f); piece.position.set(p[0] + sc[0] * (1 - a), p[1] + sc[1] * (1 - a), p[2] + sc[2] * (1 - a)); }, { t0: -0.05, dur: 1.45 });
      }
      sweepSurface(fx, bladeTable(fx, -0.05, 0.35, 1.0), bladeTable(fx, -0.05, 0.35, 1.7), { t0: -0.05, t1: 0.35, len: 0.3, n: 36, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 1.2 * k.b, edge: 3 });
      k.em({ count: 60, kind: 'shard', shape: 'point', dir: [0, 1, 0], spread: 1, speed: [1, 3], life: [0.2, 0.5], size: [0.05, 0.02], intensity: 1.5, emit: 0.4, delay: 0.05, follow: (mm, ta, t) => mm.position.set(...tip(clamp(t, -0.05, 0.35))) });
      ct(fx, k, C, 0.07, 40);
      k.light({ pos: C, t0: 0.02, dur: 0.8, fade: [0.02, 0.4], flicker: 0, intensity: 60 });
      fx.flash(0.05, 0.1, k.col(0), 0.12);
      if (k.g >= 2) { sweepSurface(fx, bladeTable(fx, 0.3, 0.6, 1.0), bladeTable(fx, 0.3, 0.6, 1.7), { t0: 0.3, t1: 0.6, len: 0.3, n: 36, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 1.2 * k.b, edge: 3 }); ct(fx, k, C, 0.35, 48); }
      if (k.g === 3) k.ring({ t0: 0.05, dur: 0.4, r: [0.2, 1.6], normal: 'cam', pos: C });
      k.extras(C, 0.07);
    } }),

  // 2. scrap-barrage: magnet pulls scrap off the ground and fires it at the target
  SKILL('nano/scrap-barrage', 'Scrap barrage', m(['earth', 'nano'], 'volley-magnet', 0.5, 10, 8, 'cone'), 2.4, {
    view: 'long', sky: 'dark',
    act: act('cast', 1.0, 4, { hits: [1.0, 1.2].map((t) => ({ t, stop: 0.04, shake: 0.2, amp: 0.03, push: 1 })) }),
    // P3=257
    build(fx, o) {
      const k = kit(fx, o, NANO), to = k.at('armR'), H = [0.6, 1.38, 0.2];
      const mag = new THREE.Group();
      mag.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 24, Math.PI), metal('#5a626c')));
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.2, 6), addMat(k.col(1), 3)); pole.position.set(0.2, 0, 0); mag.add(pole);
      fx.mesh(mag, () => to(mag), { t0: -0.2, dur: 2.4 });
      const scrap = (i) => {
        const a = fx.rng.range(0, TAU), r = fx.rng.range(0, 1), G0 = [1.2 + r * Math.cos(a), 0, r * Math.sin(a)], Hv = [G0[0], fx.rng.range(1.0, 1.6), G0[2]];
        const rise = fx.rng.range(0, 0.4), fire = fx.rng.range(0.6, 1.2);
        const P = (t) => { const u = sm(rise, rise + 0.5, t), v = sm(fire, fire + 0.35, t); return [0, 1, 2].map((j) => { const h = G0[j] + (Hv[j] - G0[j]) * u; return h + (T[j] - h) * v; }); };
        const piece = new THREE.Mesh(i % 2 ? new THREE.TetrahedronGeometry(0.06) : new THREE.BoxGeometry(0.08, 0.04, 0.06), metal('#8a929c', k.col(1), 0.3));
        fx.mesh(piece, (t) => { piece.position.set(...P(t)); piece.rotation.x = t * 6; }, { t0: 0, dur: 2.4 });
        k.trail({ path: P, t0: fire, dur: 0.4, len: 0.25, width: 0.03 });
        k.sparks(T, fire + 0.35, 12);
      };
      for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; k.ribbon({ points: [[1.2 + Math.cos(a), 0.02, Math.sin(a)], H], width: 0.02, fade: [0.05, 0.3], intensity: 0.4, t0: 0.1, dur: 1.0 }); }
      for (let i = 0; i < 14; i++) scrap(i);
      k.light({ pos: [1.2, 1.2, 0.8], t0: 0.1, dur: 1.4, fade: [0.05, 0.5], flicker: 0, intensity: 60 });
      fx.flash(1.0, 0.1, k.col(0), 0.15);
      if (k.g >= 2) for (let i = 14; i < 18; i++) scrap(i);
      if (k.g === 3) { const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.4), metal('#5a626c', k.col(1), 0.4)); plate.position.set(0.8, 1.2, 0); k.pop(plate, 0.5, 0.8, 2.2, 2.4); }
      k.extras(C, 1.2);
    } }),

  // 3. lattice-wall: hex cells pop out of the ground into a wall
  SKILL('nano/lattice-wall', 'Lattice wall', m(['earth', 'nano'], 'wall-build', 0.6, 20, 0, 'line'), 3.0, {
    view: 'high', sky: 'dark',
    act: act('castup', null, false),
    // P3=194
    build(fx, o) {
      const k = kit(fx, o, NANO), H = [0.6, 1.38, 0.2], WX = 2.2, hexG = new THREE.CylinderGeometry(0.22, 0.22, 0.05, 6), edgeG = new THREE.RingGeometry(0.19, 0.22, 6);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 7; c++) {
        const cell = new THREE.Mesh(hexG, metal('#3a424c', k.col(1), 0.2)), edge = new THREE.Mesh(edgeG, addMat(k.col(1), 2));
        cell.rotation.z = Math.PI / 2; edge.rotation.x = Math.PI / 2; edge.position.y = 0.026; cell.add(edge);
        const y = 0.3 + r * 0.38, z = (c - 3) * 0.38 + (r % 2) * 0.19, d = 0.1 + (0.7 * Math.hypot(z, y - 0.3)) / 2.2;
        cell.position.set(WX, y, z);
        k.pop(cell, d, d + 0.25, 2.6, 3.0);
        k.sparks([WX + 0.1, y, z], d + 0.2, 4);
      }
      k.em({ count: 80, kind: 'shard', shape: 'point', pos: H, dir: [1, 0.2, 0], spread: 0.4, speed: [3, 5], life: [0.3, 0.5], size: [0.04, 0.02], intensity: 1, emit: 1.8, delay: 0.1 });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 2.6), addMat(k.col(1), 2, 0.8)); ground.rotation.x = -Math.PI / 2; ground.position.set(WX, 0.01, 0);
      fx.mesh(ground, () => {}, { t0: 0, dur: 3.0 });
      k.light({ pos: [WX - 0.5, 1.2, 0.8], t0: 0, dur: 2.6, fade: [0.05, 0.4], flicker: 0, intensity: 80 });
      if (k.g >= 2) {
        const scan = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.05), addMat(k.col(1), 2, 0.8)); scan.rotation.y = Math.PI / 2;
        fx.mesh(scan, (t) => { scan.position.set(WX + 0.05, 0.3 + 2.1 * sm(0.4, 2.4, t), 0); }, { t0: 0.4, dur: 2.2 });
      }
      if (k.g === 3) {
        k.bolt({ from: [5, 3, -1], to: [WX, 1.2, 0.2], jag: 0.04, width: 0.02, rate: 10, t0: 1.6, dur: 0.3 });
        k.bolt({ from: [5, 0.5, 1], to: [WX, 0.8, -0.2], jag: 0.04, width: 0.02, rate: 10, t0: 1.6, dur: 0.3 });
        k.sparks([WX - 0.05, 1.2, 0.2], 1.8, 30);
        k.ring({ t0: 1.8, dur: 0.4, r: [0.2, 1.4], normal: 'cam', pos: [WX - 0.05, 1.2, 0.2] });
      }
    } }),

  // 4. magnet-pull: debris is dragged into a spinning core, the target is pulled
  SKILL('nano/magnet-pull', 'Magnet pull', m(['earth', 'nano'], 'pull', 0.5, 14, 6, 'circle'), 2.6, {
    view: 'wide', sky: 'dark',
    act: act('cast', null, 3, { target: [3.6, 0, 0] }),
    // P3=141
    build(fx, o) {
      const k = kit(fx, o, NANO), CORE = [3, 1.2, 0], R2 = 2;
      fx.on((t) => { fx.target.position.x = 3.6 - 0.6 * sm(0.3, 1.2, t); });
      const core = new THREE.Group();
      core.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 24), metal('#8a929c', k.col(1), 0.6)));
      core.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8), metal('#3a424c', k.col(1), 0.8)));
      fx.mesh(core, (t) => { core.position.set(CORE[0], CORE[1] + 0.05 * Math.sin((TAU * t) / 1.2), CORE[2]); core.rotation.y = (TAU * t) / 1.2; }, { t0: -0.1, dur: 2.6 });
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12, S = [CORE[0] + R2 * Math.cos(a), 0.05, R2 * Math.sin(a)], f = 0.3 + 0.9 * (i / 11);
        const piece = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.08), metal('#8a929c', k.col(1), 0.3));
        fx.mesh(piece, (t) => { const u = sm(f, f + 0.6, t), drop = sm(2.2, 2.7, t), p = [0, 1, 2].map((j) => S[j] + (CORE[j] - S[j]) * u); p[1] -= 1.2 * drop; piece.position.set(...p); piece.rotation.y = t * 4; }, { t0: -0.1, dur: 2.7 });
      }
      for (let i = 0; i < 6; i++) { const a = (i * TAU) / 6; k.ribbon({ points: [[CORE[0] + R2 * Math.cos(a), 0.05, R2 * Math.sin(a)], CORE], width: 0.02, fade: [0.05, 0.3], intensity: 0.4, t0: 0, dur: 1.2 }); }
      k.em({ count: 60, kind: 'spark', shape: 'sphere', radius: R2, pos: CORE, radial: 1, speed: [-4, -2], life: [0.3, 0.6], size: [0.06, 0.02], stretch: 1.5, intensity: 2, delay: 0.1, emit: 0.8 });
      k.ring({ t0: 0, dur: 1.0, r: [R2, 0.3], normal: 'up', pos: [CORE[0], 0.02, 0] });
      k.light({ pos: CORE, t0: 0, dur: 2.6, fade: [0.05, 0.4], flicker: 0, intensity: 90 });
      k.bolt({ from: [5, 0.05, 0], to: CORE, jag: 0.04, width: 0.02, rate: 10, t0: 0.6, dur: 0.8 });
      k.bolt({ from: [1, 0.05, 0], to: CORE, jag: 0.04, width: 0.02, rate: 10, t0: 0.6, dur: 0.8 });
      k.sparks(CORE, 2.2, 40);
      k.ring({ t0: 2.2, dur: 0.4, r: [0.2, 1.8], normal: 'cam', pos: CORE });
      fx.flash(2.2, 0.1, k.col(0), 0.2);
      fx.shake(2.2, 0.25, 0.02);
      k.extras(CORE, 2.2);
    } }),

  // 5. repair-cloud: three drones orbit the body and beam repairs into it
  SKILL('nano/repair-cloud', 'Repair cloud', m(['earth', 'nano'], 'heal-drones', 0.8, 16, 0, 'self'), 3.0, {
    body: true, view: 'body', sky: 'dark',
    // P3=311
    build(fx, o) {
      const k = kit(fx, o, NANO), CEN = [0, 1.0, 0];
      const DP = (a0, t) => { const a = a0 + (TAU * t) / 3; return [0.9 * Math.cos(a), 1.3 + 0.1 * Math.sin((TAU * t) / 1.5), 0.9 * Math.sin(a)]; };
      fx.body.setPose(POSES.idle);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.4, 3.0, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u, scan: 0.2 + 1.6 * ((t * 2) / 3 % 1), scanCol: k.col(1) }); });
      for (let i = 0; i < 3; i++) {
        const a0 = (i * TAU) / 3, d = new THREE.Group();
        d.add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), metal('#c9d3dc')));
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), addMat(k.col(1), 3)); lamp.position.y = 0.04; d.add(lamp);
        fx.mesh(d, (t) => d.position.set(...DP(a0, t)), { t0: 0, dur: 3.0 });
        k.beam({ path: (t) => [DP(a0, t), CEN], r: [0.02, 0.02], intensity: 1.5, t0: 0.5, dur: 2.0, fade: [0.1, 0.4] });
      }
      k.em({ count: 200, kind: 'shard', shape: 'sphere', radius: 0.7, pos: CEN, swirl: 2, size: [0.03, 0.01], intensity: 0.6, emit: 2.6 });
      k.gather(CEN, 0, 0.3, 1.2, 30);
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: [0, 0.02, 0] });
      k.light({ pos: [0, 1.2, 0.6], t0: 0, dur: 3.0, fade: [0.1, 0.6], flicker: 0, intensity: 40, env: (t) => 0.7 + 0.3 * Math.sin((TAU * 3 * t) / 3) });
      for (let i = 0; i < 3; i++) {
        const plus = new THREE.Group(), h = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.03), addMat(k.col(1), 2)), v = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.03), addMat(k.col(1), 2));
        plus.add(h, v);
        fx.mesh(plus, (t) => { const u = sm(0.2 + 0.3 * i, 1.6 + 0.3 * i, t) * (1 - sm(2.4, 3.0, t)); plus.position.set(-0.4 + 0.4 * i, 1.2 + 0.8 * u, 0.3); plus.scale.setScalar(Math.max(1e-3, u)); }, { t0: 0, dur: 3.0 });
      }
      fx.flash(0.3, 0.1, k.col(0), 0.12);
      if (k.g >= 2) fx.flash(2.9, 0.12, k.col(1), 0.2);
      if (k.g === 3) { k.sparks(CEN, 2.9, 40); k.ring({ t0: 2.9, dur: 0.4, r: [0.2, 2.0], normal: 'cam', pos: CEN }); }
      k.extras([0, 1.1, 0], 0.3);
    } }),

  // 6. titan-fist: plates assemble on the hand, a rocket fist punches the target
  SKILL('nano/titan-fist', 'Titan fist', m(['earth', 'nano'], 'summon-punch', 0.6, 12, 4, 'point'), 2.0, {
    view: 'side', sky: 'dark',
    act: act('thrust', 0.3, 3.2, { hits: [{ t: 0.3, stop: 0.14, shake: 0.45, amp: 0.06, push: 2.2 }] }),
    // P3=251
    build(fx, o) {
      const k = kit(fx, o, NANO), to = k.at('armR'), F = [3.2, 1.2, 0], H = [0.6, 1.38, 0.2];
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8, off = [0.12 * Math.cos(a), 0.12 * Math.sin(a)], sc = [fx.rng.range(-0.8, 0.8), fx.rng.range(-0.8, 0.8), fx.rng.range(-0.8, 0.8)];
        const pl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.06), metal('#c9d3dc', k.col(1), 0.4));
        const seam = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.01, 0.07), addMat(k.col(1), 3)); seam.position.y = 0.04; pl.add(seam);
        fx.mesh(pl, (t) => { to(pl); const u = sm(-0.6, -0.05, t); pl.position.x += off[0] * u + sc[0] * (1 - u); pl.position.y += off[1] * u + sc[1] * (1 - u); pl.position.z += sc[2] * (1 - u); }, { t0: -0.6, dur: 1.2 });
      }
      const fist = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), metal('#c9d3dc', k.col(1), 0.5));
      fx.mesh(fist, (t) => { if (t < 0) { to(fist); return; } const u = clamp(t / 0.3), p = [0, 1, 2].map((j) => H[j] + (F[j] - H[j]) * u); fist.position.set(...p); fist.visible = t < 0.6; }, { t0: -0.6, dur: 1.2 });
      k.em({ count: 40, kind: 'flame', shape: 'point', dir: [-1, 0, 0], spread: 0.3, speed: [1, 3], life: [0.2, 0.4], size: [0.2, 0.1], aspect: 1.8, emit: 0.3, follow: (mm) => mm.position.set(fist.position.x - 0.2, fist.position.y, fist.position.z) });
      ct(fx, k, F, 0.3, 58);
      k.ring({ t0: 0.3, dur: 0.4, r: [0.2, 1.8], normal: 'cam', pos: F });
      k.ring({ t0: 0.3, dur: 0.6, r: [0.2, 2.2], normal: 'up', pos: [3.2, 0.02, 0] });
      k.sparks(F, 0.3, 60);
      k.smoke({ ramp: VAPOR, count: 20, shape: 'disc', radius: 0.3, pos: F, radial: 1, speed: [0.5, 1.2], life: [1, 1.5], size: [0.3, 0.6], delay: 0.3, emit: 0.1 });
      if (k.g >= 2) {
        for (let i = 0; i < 4; i++) {
          const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), metal('#8a929c'));
          spike.rotation.z = -Math.PI / 2; spike.position.set(0.2, i < 2 ? 0.1 : -0.1, i % 2 ? 0.1 : -0.1); fist.add(spike);
          k.pop(spike, 0.25 + 0.02 * i, 0.4, 1.9, 2.0);
        }
        k.sparks(F, 0.3, 30);
      }
      if (k.g === 3) k.ring({ t0: 0.35, dur: 0.6, r: [0.4, 2.6], normal: 'up', pos: [3.2, 0.02, 0] });
      k.extras(F, 0.3);
    } }),

  // 7. mine-grid: nine mines deploy on a 3x3 grid and chain-detonate from the centre
  SKILL('nano/mine-grid', 'Mine grid', m(['earth', 'nano'], 'trap-chain', 0.6, 18, 6, 'grid'), 2.4, {
    view: 'high', sky: 'dark',
    act: act('throw', 1.2, 3.4),
    // P3=299
    build(fx, o) {
      const k = kit(fx, o, NANO), A = [0.6, 1.38, 0.2], CN = [3, 0, 0], pts = [], tds = [];
      for (let i = 0; i < 9; i++) {
        const gx = CN[0] + (i % 3 - 1) * 0.7, gz = (Math.floor(i / 3) - 1) * 0.7, dist = Math.hypot(gx - CN[0], gz), td = 1.2 + 0.08 * dist, d = 0.04 * i;
        const E = [gx, 0.02, gz], P = (t) => { const u = clamp((t - d) / 0.3), h = 1.2 * Math.sin(Math.PI * u); return [0, 1, 2].map((j) => A[j] + (E[j] - A[j]) * u + (j === 1 ? h : 0)); };
        const mine = new THREE.Group();
        mine.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8), metal('#5a626c')));
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), addMat(k.col(1), 3)); lamp.position.y = 0.03; mine.add(lamp);
        const top = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.01, 8), addMat(k.col(1), 1.6, 0.9)); top.position.y = 0.025; mine.add(top);
        fx.mesh(mine, (t) => { mine.position.set(...P(t)); lamp.material.opacity = t > d + 0.3 ? (Math.floor(t * 2) % 2 ? 1 : 0.15) : 0.5; }, { t0: 0, dur: 2.4 });
        pts.push(E); tds.push(td);
        k.ring({ t0: td, dur: 0.4, r: [0.1, 1.0], normal: 'up', pos: [gx, 0.02, gz] });
        k.sparks([gx, 0.1, gz], td, 20);
        k.glint([gx, 0.1, gz], td, 1.5);
        k.em({ count: 1, kind: 'glint', shape: 'point', pos: [gx, 0.1, gz], size: [0.14, 0.08], life: [0.3, 0.3], intensity: 3, loop: true, period: 0.4, delay: d + 0.3, emit: 0.001, t0: d + 0.3, t1: 2.4 });
        k.ring({ t0: td, dur: 0.4, r: [0.2, 1.4], normal: 'cam', pos: [gx, 0.3, gz], intensity: 1.6 });
        fx.flash(td, 0.06, k.col(0), 0.12);
      }
      for (let i = 0; i < 8; i++) k.bolt({ from: pts[i], to: pts[i + 1], jag: 0.03, width: 0.02, rate: 10, t0: tds[i + 1] - 0.05, dur: 0.3 });
      for (let j = 0; j < 3; j++) {
        const z = (j - 1) * 0.7, x = CN[0] + (j - 1) * 0.7;
        const lx = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.01), addMat(k.col(1), 2, 0.6)); lx.rotation.x = -Math.PI / 2; lx.position.set(CN[0], 0.03, z);
        const lz = new THREE.Mesh(new THREE.PlaneGeometry(0.01, 2.1), addMat(k.col(1), 2, 0.6)); lz.rotation.x = -Math.PI / 2; lz.position.set(x, 0.03, CN[2]);
        fx.mesh(lx, () => {}, { t0: 0, dur: 2.4 }); fx.mesh(lz, () => {}, { t0: 0, dur: 2.4 });
      }
      k.sparks([CN[0], 0.1, CN[2]], 1.2, 60);
      k.ring({ t0: 1.2, dur: 0.4, r: [0.2, 1.8], normal: 'cam', pos: [CN[0], 0.5, CN[2]] });
      k.light({ pos: [CN[0], 0.6, 0.6], t0: 1.2, dur: 1.0, fade: [0.02, 0.4], flicker: 0, intensity: 120 });
      fx.shake(1.2, 0.3, 0.03);
      k.extras(CN, 1.2);
    } }),

  // 8. turret-assembler: a turret builds itself part by part, then fires three shots
  SKILL('nano/turret-assembler', 'Turret assembler', m(['earth', 'nano'], 'summon-turret', 1.2, 30, 8, 'point'), 3.2, {
    view: 'wide', sky: 'dark',
    act: act('castup', 2.0, 4, { hits: [2.3, 2.6].map((t) => ({ t, stop: 0.05, shake: 0.25, amp: 0.03, push: 1 })) }),
    // P3=270
    build(fx, o) {
      const k = kit(fx, o, NANO), B = [3, 0, 0], M = [3.5, 1.44, 0], TG = [3.8, 1.2, 0];
      const parts = [
        [new THREE.CylinderGeometry(0.25, 0.3, 0.2, 8), [B[0], 0.1, 0], 'metal'],
        [new THREE.BoxGeometry(0.12, 0.4, 0.12), [B[0], 0.4, 0], 'metal'],
        [new THREE.BoxGeometry(0.25, 0.15, 0.2), [B[0], 0.7, 0], 'metal'],
        [new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), [B[0] + 0.2, 0.72, 0.07], 'barrel'],
        [new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), [B[0] + 0.2, 0.72, -0.07], 'barrel'],
        [new THREE.SphereGeometry(0.04, 8, 6), [B[0], 0.8, 0], 'sensor'],
      ];
      parts.forEach(([geo, p, kind], i) => {
        const tt = 0.2 + 0.2 * i, mesh = new THREE.Mesh(geo, kind === 'sensor' ? addMat(k.col(1), 3) : metal('#8a929c'));
        if (kind === 'barrel') mesh.rotation.z = Math.PI / 2;
        mesh.position.set(B[0] + 2 * (p[0] - B[0]), 2 * p[1], 2 * p[2]);
        k.pop(mesh, tt, tt + 0.2, 3.0, 3.2, () => mesh.scale.multiplyScalar(2));
        k.sparks(mesh.position.toArray(), tt, 15);
      });
      const bp = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), new THREE.MeshBasicMaterial({ color: k.col(1), wireframe: true, transparent: true, opacity: 0.5 }));
      bp.position.set(B[0], 0.45, 0);
      fx.mesh(bp, (t) => { bp.material.opacity = 0.5 * (1 - sm(1.0, 1.4, t)); }, { t0: 0, dur: 1.4 });
      for (const ti of [1.8, 2.2, 2.6]) {
        k.beam({ from: M, to: TG, r: [0.04, 0.04], intensity: 2, t0: ti, dur: 0.2, fade: [0.02, 0.1] });
        k.em({ count: 1, kind: 'glint', shape: 'point', pos: M, size: [0.3, 0.1], life: [0.22, 0.22], intensity: 3, delay: ti, t0: ti - 0.02, emit: 0.001 });
        k.trail({ path: (t) => [0, 1, 2].map((j) => M[j] + (TG[j] - M[j]) * clamp((t - ti) / 0.2)), t0: ti, dur: 0.2, width: 0.04, intensity: 2.4 });
        k.sparks(M, ti, 10);
        k.sparks(TG, ti + 0.02, 20);
      }
      k.light({ pos: [3, 0.8, 0.5], t0: 0.2, dur: 3.0, fade: [0.1, 0.5], flicker: 0, intensity: 60 });
      if (k.g >= 2) {
        for (let i = 0; i < 8; i++) {
          const sp = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 4), addMat(k.col(1), 3));
          fx.mesh(sp, (t) => { const a = (i * TAU) / 8 + 2 * t; sp.position.set(B[0] + 0.2 * Math.cos(a), 0.8, 0.2 * Math.sin(a)); }, { t0: 0, dur: 3.2 });
        }
      }
      if (k.g === 3) {
        k.beam({ from: M, to: TG, r: [0.06, 0.06], intensity: 2.5, t0: 3.0, dur: 0.2, fade: [0.02, 0.1] });
        k.em({ count: 1, kind: 'glint', shape: 'point', pos: M, size: [0.3, 0.1], life: [0.22, 0.22], intensity: 3, delay: 3.0, t0: 2.98, emit: 0.001 });
        k.trail({ path: (t) => [0, 1, 2].map((j) => M[j] + (TG[j] - M[j]) * clamp((t - 3.0) / 0.2)), t0: 3.0, dur: 0.2, width: 0.04, intensity: 2.4 });
        k.sparks(M, 3.0, 10);
        k.sparks(TG, 3.02, 20);
        k.ring({ t0: 3.0, dur: 0.4, r: [0.2, 1.6], normal: 'cam', pos: TG });
        k.extras(TG, 2.6);
      }
    } }),
];
