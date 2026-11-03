// Plasma class: 8 tech skills with the PLASMA ramp (PLAN2 B21). Built from the T-MEL, T-BUF, T-PRJ, T-NOV, T-BEAM and T-GND templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, metal, addMat, VAPOR, PLASMA } from './_skill.js';
import { bladeTable, sweepSurface, contact } from './melee.js';

const m = meta('plasma', 'tech');
const C = [1.62, 1.2, 0.1], T = [3.8, 1.2, 0];
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n });
/** solid ring of 12 emissive metal segments flying out (fusion nova) */
const seg = (fx, k, y, dir) => {
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12, s = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.12), metal('#3a424c', k.col(1), 1.5));
    fx.mesh(s, (t) => { const u = sm(0, 0.6, t), r = 0.4 + 3.6 * u; s.position.set(r * Math.cos(a), y, r * Math.sin(a)); s.rotation.y = -a + dir * u * 2; s.material.emissiveIntensity = 1.5 * (1 - sm(0.6, 1.2, t)); }, { t0: 0, dur: 1.2 });
  }
};

export default [
  SKILL('plasma/arc-torch', 'Arc torch', m(['fire', 'plasma'], 'melee-sweep', 0.3, 6, 2, 'arc'), 1.4, {
    view: 'side', sky: 'dark',
    act: act('sideslash', 0.05, 1.85, { weapon: 'sword' }),
    // P3=155
    build(fx, o) {
      const k = kit(fx, o, PLASMA), to = k.at('armR');
      const A = bladeTable(fx, -0.05, 0.35, 1.0), B = bladeTable(fx, -0.05, 0.35, 1.7);
      sweepSurface(fx, A, B, { t0: -0.05, t1: 0.35, len: 0.3, n: 36, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 1.2 * k.b, edge: 3 });
      const hilt = new THREE.Group();
      hilt.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.22, 8), metal('#8a929c')));
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.95, 0.03), addMat(k.col(1), 2)); blade.position.y = -0.58; hilt.add(blade);
      const dia = [];
      for (let i = 0; i < 5; i++) { const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), addMat(k.col(1), 3)); d.position.y = -0.25 - 0.16 * i; hilt.add(d); dia.push(d); }
      if (k.g === 3) for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8, s = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), addMat(k.col(0), 3)); s.position.set(Math.cos(a) * 0.05, 0.1, Math.sin(a) * 0.05); hilt.add(s); }
      fx.mesh(hilt, (t) => { to(hilt); dia.forEach((d, i) => d.scale.setScalar(0.7 + 0.3 * Math.sin((TAU * 6 * t) / 1.4 + i))); }, { t0: -0.05, dur: 1.45 });
      ct(fx, k, C, 0.05, 50);
      k.em({ count: 40, kind: 'spark', shape: 'point', dir: [0, 1, 0], spread: 1, speed: [1, 3], life: [0.2, 0.5], size: [0.06, 0.02], stretch: 1.5, intensity: 2, emit: 0.6, follow: (mm, ta, t) => mm.position.set(...B(t)) });
      k.light({ pos: C, t0: 0.02, dur: 0.8, fade: [0.02, 0.4], flicker: 0, intensity: 60 });
      fx.flash(0.05, 0.1, k.col(0), 0.12);
      if (k.g >= 2) { sweepSurface(fx, bladeTable(fx, 0.3, 0.6, 1.0), bladeTable(fx, 0.3, 0.6, 1.7), { t0: 0.3, t1: 0.6, len: 0.3, n: 36, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 1.2 * k.b, edge: 3 }); ct(fx, k, C, 0.35, 20); }
      if (k.g === 3) k.ring({ t0: 0.05, dur: 0.4, r: [0.2, 1.6], normal: 'cam', pos: C });
      k.extras(C, 0.05);
    } }),

  SKILL('plasma/thermal-lance', 'Thermal lance', m(['fire', 'plasma'], 'beam-cut', 0.8, 14, 7, 'line'), 2.2, {
    view: 'long', sky: 'dark',
    act: act('cast', 0.2, 4, { hits: [0.2, 0.6, 1.0, 1.4].map((t) => ({ t, stop: 0.03, shake: 0.1, amp: 0.01, push: 0 })) }),
    // P3=321
    build(fx, o) {
      const k = kit(fx, o, PLASMA), to = k.at('armR'), A = [0.6, 1.38, 0.2];
      const B = (t) => { const u = clamp(t / 1.4); return [3 + 0.6 * u, 0.02, -1 + 1.4 * u]; };
      const cannon = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 8), metal('#8a929c')); bar.rotation.z = Math.PI / 2; bar.position.x = 0.25; cannon.add(bar);
      for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.012, 6, 16), addMat(k.col(1), 3)); c.rotation.y = Math.PI / 2; c.position.x = 0.1 + 0.1 * i; cannon.add(c); }
      fx.mesh(cannon, () => to(cannon), { t0: -0.6, dur: 2.2 });
      for (let i = 0; i < 8; i++) {
        const a = -0.6 + i * 0.075, s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), addMat(k.col(1), 3));
        fx.mesh(s, (t) => { to(s); s.position.x += 0.5; s.position.y += 0.05 * Math.cos(i); s.position.z += 0.05 * Math.sin(i); s.scale.setScalar(0.1 + 0.9 * sm(a, a + 0.08, t)); }, { t0: -0.6, dur: 2.2 });
      }
      k.gather(A, -0.3, 0.3, 0.6, 40);
      k.beam({ path: (t) => [A, B(t)], r: [0.15, 0.15], t0: 0, dur: 1.4, fade: [0.03, 0.2], noise: 0.6, edge: 1.4 });
      k.beam({ path: (t) => [A, B(t)], r: [0.06, 0.06], intensity: 2.5, t0: 0, dur: 1.4, fade: [0.03, 0.2] });
      k.em({ count: 120, kind: 'spark', shape: 'point', dir: [0, 1, 0], spread: 1.2, speed: [1, 4], life: [0.2, 0.5], size: [0.06, 0.02], stretch: 1.5, intensity: 2, emit: 1.4, follow: (mm, ta, t) => mm.position.set(...B(t)) });
      const strip = new THREE.Group(), plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.12), addMat(k.col(1), 2, 0.9));
      plane.rotation.x = -Math.PI / 2; strip.add(plane);
      fx.mesh(strip, (t) => { const E = B(t), dx = E[0] - 3, dz = E[2] + 1; strip.position.set(3 + dx / 2, 0.01, -1 + dz / 2); strip.rotation.y = -Math.atan2(dz, dx); strip.scale.x = Math.hypot(dx, dz); plane.material.opacity = 0.9 * (1 - sm(0.8, 1.6, t)); }, { t0: 0, dur: 2.0 });
      k.smoke({ ramp: VAPOR, count: 40, shape: 'disc', radius: 0.3, pos: [3.3, 0.1, -0.3], dir: [0, 1, 0], speed: [0.3, 1], life: [1, 1.8], size: [0.3, 0.8], emit: 1.4 });
      const L = k.light({ pos: B(0), t0: 0, dur: 1.4, fade: [0.02, 0.3], flicker: 0, intensity: 80 });
      fx.on((t) => { L.l.position.set(...B(t)); });
      if (k.g >= 2) k.smoke({ ramp: VAPOR, count: 20, shape: 'point', follow: to, dir: [1, 0.3, 0], speed: [0.3, 1], life: [0.8, 1.4], size: [0.2, 0.5], emit: 1.4 });
      if (k.g === 3) {
        k.em({ count: 60, kind: 'spark', shape: 'line', shapeSize: [1.5, 0, 0], pos: [3.6, 0.1, 0], dir: [0, 1, 0], spread: 1, speed: [2, 5], life: [0.3, 0.6], size: [0.06, 0.02], stretch: 1.5, intensity: 2, delay: 1.6, emit: 0.001 });
        fx.flash(1.6, 0.12, k.col(0), 0.2);
      }
      k.extras(A, 0.2);
    } }),

  SKILL('plasma/solar-flare-grenade', 'Solar flare grenade', m(['fire', 'plasma'], 'grenade', 0.4, 12, 7, 'circle'), 2.0, {
    view: 'wide', sky: 'dark',
    act: act('throw', 0.7, 3.4),
    // P3=265
    build(fx, o) {
      const k = kit(fx, o, PLASMA), A = [0.6, 1.38, 0.2], E = [3, 0.1, 0], BP = [3, 0.4, 0];
      const P = (t) => { const u = clamp(t / 0.6), h = 1.2 * Math.sin(Math.PI * u); return [A[0] + (E[0] - A[0]) * u, A[1] + (E[1] - A[1]) * u + h, A[2] + (E[2] - A[2]) * u]; };
      const gren = new THREE.Group();
      gren.add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), metal('#5a626c')));
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.012, 6, 16), addMat(k.col(1), 3)); band.rotation.x = Math.PI / 2; gren.add(band);
      const blink = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), addMat(k.col(0), 3)); blink.position.y = 0.08; gren.add(blink);
      fx.mesh(gren, (t) => { gren.position.set(...P(t)); blink.material.opacity = Math.floor(t * 3) % 2 ? 1 : 0.15; }, { t0: -0.1, dur: 0.8 });
      for (let i = 0; i < 3; i++) k.glint(BP, 0.7 + 0.05 * i, 3);
      k.em({ count: 1, kind: 'soft', shape: 'point', pos: BP, size: [2.5, 2.5], life: [0.4, 0.4], intensity: 3, delay: 0.7, emit: 0.001, t0: 0.69 });
      k.ring({ t0: 0.7, dur: 0.5, r: [0.1, 3], normal: 'cam', pos: BP });
      k.ring({ t0: 0.7, dur: 0.7, r: [0.2, 4], normal: 'up', pos: [3, 0.02, 0], width: [0.3, 0.05] });
      k.sparks(BP, 0.7, 120);
      k.light({ pos: [3, 1, 0.5], t0: 0.7, dur: 0.4, fade: [0.01, 0.3], flicker: 0, intensity: 150 });
      fx.flash(0.7, 0.1, k.col(0), 0.18);
      k.decal({ kind: 'scorch', r: [1.2, 1.2], pos: [3, 0, 0], t0: 0.7, dur: 2.0 });
      k.decal({ kind: 'rune', r: [1, 1], pos: [3, 0, 0], t0: 0.7, dur: 0.8, glyphs: 6, poly: 6, spin: 0.6 });
      k.smoke({ ramp: VAPOR, count: 30, shape: 'sphere', radius: 0.3, pos: BP, radial: 1, speed: [0.5, 1.5], life: [1, 1.6], size: [0.4, 0.9], delay: 0.7, emit: 0.2 });
      if (k.g >= 2) { k.ring({ t0: 1.0, dur: 0.4, r: [0.2, 2.2], normal: 'cam', pos: BP }); k.sparks(BP, 1.0, 40); }
      if (k.g === 3) {
        for (let i = 0; i < 8; i++) {
          const a = (i * TAU) / 8, pl = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.02, 0.08), metal('#8a929c', k.col(1), 0.5));
          fx.mesh(pl, (t) => { const u = clamp((t - 0.7) / 0.6); pl.position.set(3 + Math.cos(a) * u * 1.2, 0.4 + 0.8 * u - 0.5 * u * u, Math.sin(a) * u * 1.2); pl.rotation.y = a + u * 4; }, { t0: 0.7, dur: 1.2 });
        }
        k.sparks(BP, 1.0, 30);
      }
      k.extras(BP, 0.7);
    } }),

  SKILL('plasma/heat-sink-shield', 'Heat-sink shield', m(['fire', 'plasma'], 'buff-shield', 0.4, 20, 0, 'self'), 3.0, {
    body: true, view: 'body', sky: 'dark',
    // P3=211
    build(fx, o) {
      const k = kit(fx, o, PLASMA), P1 = [0.5, 1.1, 0], P2 = [-0.5, 1.1, 0], c0 = new THREE.Color('#ff9a30'), c1 = new THREE.Color(k.col(1));
      fx.body.setPose(POSES.guard);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.4, 2.8, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, tint: k.col(1), tintAmt: 0.12 * u, glow: 0.25 * u }); });
      const plate = (p) => { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.9), metal('#5a626c', k.col(1), 0.4)); pl.position.set(...p); k.pop(pl, 0.05, 0.4, 2.6, 3.0); };
      plate(P1);
      for (let i = 0; i < 4; i++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.05, 0.7), addMat('#ff9a30', 2)); sl.position.set(0.52, 0.75 + 0.2 * i, 0); k.pop(sl, 0.05, 0.4, 2.6, 3.0, (t) => sl.material.color.copy(c0).lerp(c1, sm(0.5, 1.5, t)).multiplyScalar(2)); }
      for (let i = 0; i < 8; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), addMat(k.col(1), 3)); sp.position.set(0.56, 0.55 + 0.15 * i, i % 2 ? 0.46 : -0.46); k.pop(sp, 0.05 + 0.03 * i, 0.4 + 0.03 * i, 2.6, 3.0); }
      if (k.g >= 2) plate(P2);
      k.shell({ r: [1.0, 1.0], cells: 6, pos: [0, 1.0, 0], t0: 0.2, dur: 2.6, fade: [0.2, 0.6], intensity: 0.5 });
      k.smoke({ ramp: VAPOR, count: 40, shape: 'point', pos: [0.55, 0.9, 0], dir: [1, 0.6, 0], spread: 0.8, speed: [0.3, 1], life: [1, 1.8], size: [0.3, 0.7], drag: 1.5, emit: 2.6 });
      k.em({ count: 30, kind: 'spark', shape: 'sphere', radius: 0.5, pos: P1, dir: [1, 0, 0], spread: 0.5, speed: [0.5, 2], life: [0.3, 0.6], size: [0.05, 0.02], stretch: 1.2, intensity: 2.5, emit: 2.8 });
      for (const t of [1.2, 2.0]) { k.sparks([0.55, 1.1, 0], t, 25); k.light({ pos: [0.6, 1.1, 0.4], t0: t, dur: 0.4, fade: [0.01, 0.3], flicker: 0, intensity: 50 }); fx.hit(t, { stop: 0.03, shake: 0.12, amp: 0.02, push: 0 }); }
      if (k.g === 3) {
        k.smoke({ ramp: VAPOR, count: 50, shape: 'point', pos: [0.55, 1.1, 0], dir: [1, 0.4, 0], speed: [1, 2], life: [1, 1.6], size: [0.3, 0.8], delay: 2.4, emit: 0.3 });
        k.ring({ t0: 2.4, dur: 0.5, r: [0.2, 1.4], normal: 'cam', pos: [0.55, 1.1, 0] });
      }
      k.extras([0, 1.1, 0], 0.3);
    } }),

  SKILL('plasma/rail-sear', 'Rail sear', m(['fire', 'plasma'], 'line-shot', 0.5, 8, 12, 'line'), 1.6, {
    view: 'long', sky: 'dark',
    act: act('cast', 0.05, 4.2),
    // P3=192
    build(fx, o) {
      const k = kit(fx, o, PLASMA), to = k.at('armR'), A = [0.6, 1.38, 0.2];
      const rails = new THREE.Group();
      for (const dz of [-0.06, 0.06]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), metal('#8a929c', k.col(1), 1.5)); r.rotation.z = Math.PI / 2; r.position.set(0.5, 0, dz); rails.add(r); }
      fx.mesh(rails, (t) => { to(rails); rails.children.forEach((r) => { r.material.emissiveIntensity = 1.5 * (1 - sm(0, 1.6, t)); }); }, { t0: -0.05, dur: 1.7 });
      for (let i = 0; i < 6; i++) {
        const a = -0.1 + i * 0.15, s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 4), addMat(k.col(1), 3));
        fx.mesh(s, (t) => { to(s); s.position.x += 0.1 + 0.15 * i; s.scale.setScalar(0.01 + sm(a, a + 0.08, t)); }, { t0: -0.1, dur: 1.8 });
      }
      k.beam({ from: A, to: [7, 1.3, 0], r: [0.03, 0.03], intensity: 3, t0: 0, dur: 0.12 });
      k.beam({ from: A, to: [7, 1.3, 0], r: [0.1, 0.1], intensity: 1, t0: 0, dur: 0.12 });
      for (const x of [1.5, 2.5, 3.5]) k.ring({ t0: 0.05, dur: 0.3, r: [0.1, 0.6], normal: [1, 0, 0], pos: [x, 1.3, 0] });
      k.sparks(T, 0.12, 60);
      k.glint(T, 0.12, 1.2);
      k.smoke({ ramp: VAPOR, count: 30, shape: 'line', shapeSize: [0.5, 0, 0], follow: to, dir: [0, 1, 0], spread: 0.8, speed: [0.3, 1], life: [1, 1.6], size: [0.3, 0.7], delay: 0.05, emit: 0.8 });
      k.light({ pos: T, t0: 0.05, dur: 0.5, fade: [0.01, 0.3], flicker: 0, intensity: 60 });
      fx.flash(0.05, 0.1, k.col(0), 0.2);
      if (k.g >= 2) k.ring({ t0: 0.12, dur: 0.3, r: [0.1, 1.6], normal: 'cam', pos: T });
      if (k.g === 3) k.sparks(T, 0.5, 60);
      k.extras(A, 0.05);
    } }),

  SKILL('plasma/pulse-mortar', 'Pulse mortar', m(['fire', 'plasma'], 'ground-barrage', 0.8, 18, 8, 'circle'), 2.6, {
    view: 'wide', sky: 'dark',
    act: act('cast', 0.9, 3.4, { hits: [0.9, 1.2, 1.5, 1.8].map((t) => ({ t, stop: 0.05, shake: 0.2, amp: 0.03, push: 1 })) }),
    // P3=246
    build(fx, o) {
      const k = kit(fx, o, PLASMA), MUZZ = [0.6, 1.6, 0.2], M = [[2.8, 0, -0.5], [2.8, 0, 0.5], [3.4, 0, -0.5], [3.4, 0, 0.5]], ARR = [0.9, 1.2, 1.5, 1.8];
      const torso = (obj) => { fx.body.torso.getWorldPosition(obj.position); fx.worldToLocal(obj.position); };
      const launcher = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.4), metal('#5a626c'));
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.4, 8), metal('#8a929c')); tube.rotation.x = Math.PI / 2; tube.position.z = 0.3;
      launcher.add(box, tube);
      fx.mesh(launcher, () => torso(launcher), { t0: -0.3, dur: 3.5 });
      const shell = (p, arr) => {
        const Pi = (t) => { const u = clamp((t - 0.2) / (arr - 0.2)); return [MUZZ[0] + (p[0] - MUZZ[0]) * u, MUZZ[1] + (p[1] - MUZZ[1]) * u + 1.4 * Math.sin(Math.PI * u), MUZZ[2] + (p[2] - MUZZ[2]) * u]; };
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), addMat(k.col(0), 2));
        fx.mesh(s, (t) => s.position.set(...Pi(t)), { t0: 0.2, dur: arr - 0.15 });
        k.trail({ path: Pi, t0: 0.2, dur: arr - 0.15, len: 0.3, width: 0.04 });
      };
      const impact = (p, t) => {
        k.ring({ t0: t, dur: 0.5, r: [0.1, 1.6], normal: 'up', pos: [p[0], 0.02, p[2]] });
        k.sparks(p, t, 30);
        k.em({ count: 1, kind: 'soft', shape: 'point', pos: p, size: [1.2, 1.2], life: [0.3, 0.3], intensity: 2, delay: t, emit: 0.001, t0: t - 0.02 });
        k.smoke({ ramp: VAPOR, count: 10, shape: 'disc', radius: 0.3, pos: p, radial: 1, speed: [0.5, 1.2], life: [1, 1.5], size: [0.4, 0.8], delay: t, emit: 0.1 });
        k.light({ pos: [p[0], 1, p[2] + 0.6], t0: t - 0.02, dur: 0.6, fade: [0.01, 0.4], flicker: 0, intensity: 100 });
        fx.shake(t, 0.15, 0.03);
      };
      M.forEach((p, i) => {
        k.decal({ kind: 'rune', r: [0.5, 0.5], pos: p, t0: 0, dur: 2.2, glyphs: 6, poly: 6 });
        k.ring({ t0: 0, dur: 0.9, r: [0.6, 0.1], normal: 'up', pos: p });
        shell(p, ARR[i]);
        impact(p, ARR[i]);
      });
      if (k.g >= 2) { shell([3.1, 0, 0], 2.1); impact([3.1, 0, 0], 2.1); }
      if (k.g === 3) { k.ring({ t0: 2.1, dur: 0.6, r: [0.2, 3], normal: 'up', pos: [3.1, 0.02, 0] }); fx.flash(2.1, 0.12, k.col(0), 0.2); }
      k.extras([3.1, 0, 0], 2.1);
    } }),

  SKILL('plasma/overdrive-core', 'Overdrive core', m(['fire', 'plasma'], 'buff-core', 0.5, 40, 0, 'self'), 3.0, {
    body: true, view: 'body', sky: 'dark',
    // P3=131
    build(fx, o) {
      const k = kit(fx, o, PLASMA), RC = [-0.15, 1.3, 0];
      fx.body.setPose(POSES.idle);
      fx.on((t) => { const u = sm(0.15, 0.45, t) * (1 - sm(2.6, 3.0, t)); fx.body.set({ rim: k.col(1), rimAmt: 1.1 * u * k.b, emit: 0.6 * u, scan: 0.2 + 1.6 * ((t * 2 / 3) % 1), scanCol: k.col(1) }); });
      const reactor = new THREE.Group();
      reactor.add(new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.04, 8, 24), metal('#8a929c', k.col(1), 0.6)));
      reactor.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), addMat(k.col(0), 2)));
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2, f = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.04), metal('#5a626c')); f.position.set(0.22 * Math.cos(a), 0, 0.22 * Math.sin(a)); f.rotation.y = -a; reactor.add(f); }
      reactor.position.set(...RC);
      fx.mesh(reactor, (t) => { reactor.rotation.y = (TAU * t) / 1.5; }, { t0: -0.1, dur: 3.0 });
      for (const z of [0.25, -0.25]) k.smoke({ ramp: VAPOR, count: 30, shape: 'point', pos: [-0.3, 1.1, z], dir: [-1, 0.5, 0], spread: 0.6, speed: [0.3, 1], life: [1, 1.6], size: [0.3, 0.6], drag: 1.5, emit: 2.8 });
      k.em({ count: 30, kind: 'spark', shape: 'sphere', radius: 0.2, pos: RC, dir: [-1, 0, 0], spread: 0.8, speed: [0.5, 1.5], life: [0.3, 0.6], size: [0.05, 0.02], stretch: 1.2, intensity: 2.5, emit: 2.8 });
      k.bolt({ from: [-0.4, 1.25, 0.2], to: [-0.22, 1.42, 0.12], jag: 0.04, width: 0.015, rate: 10, t0: 0, dur: 3.0 });
      k.bolt({ from: [-0.4, 1.35, -0.2], to: [-0.22, 1.2, -0.12], jag: 0.04, width: 0.015, rate: 10, t0: 0, dur: 3.0 });
      if (k.g >= 2) {
        for (let i = 0; i < 8; i++) { const a = (i * TAU) / 8, h = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), addMat(k.col(1), 3)); h.position.set(0.5 * Math.cos(a), 0.05, 0.5 * Math.sin(a)); fx.mesh(h, () => {}, { t0: 0, dur: 3.0 }); }
      }
      if (k.g === 3) {
        fx.flash(2.0, 0.12, k.col(0), 0.2);
        k.ring({ t0: 2.0, dur: 0.5, r: [0.2, 2], normal: 'cam', pos: RC });
        k.shell({ r: [0.5, 1.4], pos: RC, t0: 2.0, dur: 0.8, fade: [0.1, 0.4], intensity: 1.0 });
      }
      k.extras(RC, 2.0);
    } }),

  SKILL('plasma/fusion-nova', 'Fusion nova', m(['fire', 'plasma'], 'nova-segments', 0.5, 16, 5, 'circle'), 2.0, {
    view: 'wide', sky: 'dark',
    act: act('castup', 0.05, 2.6),
    // P3=281
    build(fx, o) {
      const k = kit(fx, o, PLASMA), O1 = [0, 1, 0];
      k.gather(O1, 0, 0.5, 1.2, 60);
      seg(fx, k, 1, 1);
      k.ring({ t0: 0, dur: 0.6, r: [0.2, 4], normal: 'up', pos: [0, 0.02, 0] });
      k.ring({ t0: 0, dur: 0.4, r: [0.2, 2.2], normal: 'cam', pos: O1 });
      k.shell({ r: [0.3, 2.2], hemi: true, cells: 6, pos: [0, 0, 0], t0: 0, dur: 0.8, fade: [0.05, 0.4], intensity: 0.8 });
      k.em({ count: 140, kind: 'spark', shape: 'sphere', radius: 0.3, pos: O1, radial: 1, speed: [4, 8], drag: 1.5, life: [0.3, 0.7], size: [0.07, 0.02], stretch: 1.5, intensity: 3, emit: 0.001 });
      k.light({ pos: [0, 2, 0.8], t0: 0, dur: 1.2, fade: [0.01, 0.5], flicker: 0, intensity: 220 });
      fx.flash(0, 0.12, k.col(0), 0.3);
      k.decal({ kind: 'rune', r: [1.6, 1.6], pos: [0, 0, 0], t0: 0, dur: 1.8, glyphs: 6, poly: 6, spin: 0.6 });
      if (k.g >= 2) seg(fx, k, 0.3, -1);
      if (k.g === 3) {
        k.orb({ kind: 'plasma', r: [0.4, 0.05], pos: O1, t0: 0, dur: 0.5, fade: [0.02, 0.3] });
        k.sparks(O1, 0.5, 40);
      }
      k.extras(O1, 0.5);
    } }),
];
