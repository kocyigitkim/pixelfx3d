// Shaman class: 8 summon, totem, root, fear, pulse and orbit skills (PLAN2 B9). Built from the T-MEL, T-NOV, T-ORB and T-SUM templates.
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, metal, rock, addMat, DUST, EARTH, FIRE, NATURE, SPIRIT, STORM } from './_skill.js';
import { contact } from './melee.js';

const m = meta('shaman', 'class');
const GREEN = [[0, '#5a8a3a', 0], [0.15, '#4a7a2e', 0.55], [1, '#1c3a14', 0]]; // normal-blend green smoke
const lerp3 = (p, q, u) => [p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u, p[2] + (q[2] - p[2]) * u];
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });

export default [
  SKILL('shaman/spirit-wolf', 'Spirit wolf', m(['spirit'], 'summon-charge', 0.6, 14, 8, 'line'), 2.6, {
    view: 'long',
    act: act('cast', 1.1, 4),
    // P3=174
    build(fx, o) {
      const k = kit(fx, o, SPIRIT);
      const WP = (t) => [0.8 + 2.8 * sm(0.3, 1.1, t), 0.5 + 0.06 * Math.sin((TAU * 2 * t) / 2.6), 0];
      const wm = addMat(k.col(1), 0.7, 0.85), wolf = new THREE.Group(), legs = [];
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.5, 4, 8), wm); body.rotation.z = Math.PI / 2; wolf.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), wm); head.position.set(0.38, 0.12, 0); wolf.add(head);
      const snout = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), wm); snout.rotation.z = -Math.PI / 2; snout.position.set(0.5, 0.1, 0); wolf.add(snout);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.25, 8), wm); tail.rotation.z = Math.PI / 2; tail.position.set(-0.45, 0.12, 0); wolf.add(tail);
      for (const [x, z] of [[0.2, 0.08], [0.2, -0.08], [-0.2, 0.08], [-0.2, -0.08]]) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), wm); leg.position.set(x, -0.2, z); wolf.add(leg); legs.push(leg); }
      k.pop(wolf, 0, 0.2, 1.2, 1.6, (t) => { wolf.position.set(...WP(t)); legs.forEach((l, i) => { l.rotation.z = 0.5 * Math.sin((TAU * 8 * t) / 2.6 + i * Math.PI); }); });
      k.decal({ kind: 'rune', r: [0.8, 0.8], pos: [0.8, 0, 0.6], t0: -0.3, dur: 0.8 });
      k.trail({ path: WP, len: 0.5, width: 0.05, t0: 0.3, dur: 0.8 });
      k.em({ count: 50, kind: 'soft', shape: 'sphere', radius: 0.2, pos: [0, 0.5, 0], follow: (mm, ta, t) => mm.position.set(...WP(t)), delay: 0.3, emit: 0.9, t0: 0.3 });
      // bite at 1.1: two crossing slashes and a contact burst
      const BITE = fx.anchor('tgt', 0, [-0.2, 0.2, 0]);
      k.slash({ center: BITE, radius: 0.5, a0: 1, a1: -1, width: 0.08, t0: 1.05, dur: 0.2 });
      k.slash({ center: BITE, radius: 0.5, a0: -1, a1: 1, width: 0.08, t0: 1.05, dur: 0.2 });
      ct(fx, k, fx.anchor('tgt', 0, [-0.2, 0.1, 0]), 1.1, 40, { lightI: 0 });
      // fade out with a soft burst
      k.em({ count: 40, kind: 'soft', shape: 'sphere', radius: 0.5, pos: [3.6, 0.9, 0], speed: [0.5, 1.2], radial: 1, delay: 1.2, emit: 0.4, t0: 1.2 });
      k.extras(BITE, 1.1);
      if (k.g >= 2) for (let i = 0; i < 4; i++) k.decal({ kind: 'glow', r: [0.15, 0.15], pos: [0.8 + 0.5 * i, 0, 0.6], t0: 0.3 + 0.1 * i, dur: 0.9 });
      if (k.g === 3) k.ring({ t0: 1.2, dur: 0.4, r: [0.2, 2.2], normal: 'cam', pos: [2.2, 1.6, 0] });
    } }),

  SKILL('shaman/storm-totem', 'Storm totem', m(['storm', 'spirit'], 'totem', 0.8, 20, 8, 'circle'), 3.2, {
    view: 'wide', sky: 'storm',
    act: act('smash', 0.9, 3, { hits: [0.9, 1.7, 2.5].map((t) => ({ t, stop: 0.06, shake: 0.3, amp: 0.04, push: 1.2 })) }),
    // P3=186
    build(fx, o) {
      const k = kit(fx, o, STORM);
      const BASE = [1.2, 0, 0.4], CR = [1.2, 3.5, 0.4], TH = fx.anchor('tgtHead', 0, [0, -0.12, 0]), GP = [3.4, 0.02, -0.6]; // anchor-ok
      const totem = new THREE.Group(); totem.position.set(...BASE);
      const wood = rock('#6a4a2a');
      for (let i = 0; i < 3; i++) { const seg = new THREE.Mesh(i % 2 ? new THREE.CylinderGeometry(0.12, 0.14, 0.6, 8) : new THREE.BoxGeometry(0.28, 0.6, 0.28), wood); seg.position.y = 0.3 + i * 0.6; totem.add(seg); }
      const top = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16), metal()); top.rotation.x = Math.PI / 2; top.position.y = 2.0; totem.add(top);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), metal('#9ab8ff', '#6a8cff', 1.2)); crystal.position.set(0, 2.2, 0); totem.add(crystal);
      k.pop(totem, -0.1, 0.2, 3.1, 3.2, () => totem.scale.multiplyScalar(1.6));
      // three pulses: bolt to the target head, ring and sparks
      for (const t of [0.9, 1.7, 2.5]) {
        k.bolt({ from: CR, to: TH, t0: t, dur: 0.2, fade: [0.02, 0.1], jag: 0.3, branches: 1, branchLen: 0.2, width: 0.03, rate: 30, flicker: 0.4, intensity: 3 });
        for (const q of [[1.9, 3.9, 0.9], [0.5, 3.0, -0.4], [1.9, 2.8, -0.5]]) k.bolt({ from: CR, to: q, t0: t, dur: 0.2, jag: 0.3, branches: 1, branchLen: 0.2, width: 0.05, rate: 30, intensity: 2.6 });
        k.ring({ t0: t, dur: 0.5, r: [0.2, 1.8], normal: 'up', pos: BASE });
        k.sparks(TH, t, 25);
        if (k.g >= 2) k.bolt({ from: CR, to: GP, t0: t, dur: 0.2, jag: 0.3, branches: 1, branchLen: 0.2, width: 0.03, rate: 30, intensity: 3 });
      }
      // continuous crackle at the crystal
      k.bolt({ from: CR, to: [CR[0] + 0.25, CR[1] + 0.35, CR[2]], branches: 1, branchLen: 0.2, width: 0.02, rate: 20, flicker: 0.5, intensity: 2, t0: 0, dur: 3.2 });
      k.em({ count: 30, kind: 'spark', shape: 'sphere', radius: 0.15, pos: CR, dir: [0, 1, 0], spread: 1, speed: [1, 3], life: [0.2, 0.5], intensity: 3, delay: 0, emit: 3.2, t0: 0 });
      k.decal({ kind: 'scorch', r: [0.4, 0.8], pos: [3, 0, 0], t0: 0.9, dur: 2.2 });
      k.light({ pos: CR, t0: 0, dur: 3.2, env: (t) => 0.6 + 0.4 * Math.sin(TAU * 2 * t), intensity: 60 });
      k.extras(TH, 0.9);
      if (k.g === 3) {
        k.ring({ t0: 2.9, dur: 0.6, r: [0.3, 3], normal: 'up', pos: BASE });
        for (const to of [TH, GP, [0.2, 0.02, 1.4]]) k.bolt({ from: CR, to, t0: 2.9, dur: 0.25, jag: 0.3, branches: 1, branchLen: 0.2, width: 0.035, rate: 30, intensity: 3.5 });
        k.sparks(TH, 2.9, 40);
      }
    } }),

  SKILL('shaman/thorn-bind', 'Thorn bind', m(['nature'], 'root', 0.5, 12, 7, 'point'), 2.6, {
    view: 'wide',
    act: act('cast', 0.4, 3, { hits: [{ t: 0.4, stop: 0.1, shake: 0.2, amp: 0.03, push: 0 }] }),
    // P3=142
    build(fx, o) {
      const k = kit(fx, o, NATURE), T = [3, 0, 0];
      const vmat = new THREE.MeshStandardMaterial({ color: '#2f5a1c', roughness: 0.7 });
      // a spiral vine that grows by draw range, then shrinks away
      const vine = (x, z, phi, t0) => {
        const pts = Array.from({ length: 12 }, (_, j) => { const a = phi + (j / 11) * 3 * Math.PI; return new THREE.Vector3(0.35 * Math.cos(a), (j / 11) * 1.4, 0.35 * Math.sin(a)); });
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.025, 6), idx = g.index.count;
        const v = new THREE.Mesh(g, vmat); v.position.set(x, 0, z);
        fx.mesh(v, (t) => { const u = sm(t0, t0 + 0.5, t); g.setDrawRange(0, Math.floor((u * idx) / 6) * 6); v.scale.setScalar(Math.max(0.001, 1 - sm(2.2, 2.5, t))); }, { t0: -5, dur: 99 });
        return v;
      };
      for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; vine(T[0] + 0.5 * Math.cos(a), 0.5 * Math.sin(a), i, 0.3); }
      k.decal({ kind: 'glow', r: [0.8, 0.8], pos: T, t0: 0, dur: 2.2 });
      k.em({ count: 40, kind: 'petal', shape: 'sphere', radius: 0.6, pos: [3, 0.8, 0], dir: [0, 1, 0], spread: 1, speed: [0.5, 1.5], life: [0.8, 1.4], blend: 'normal', lit: 1, delay: 0.5, emit: 0.001, t0: 0.5 });
      k.em({ count: 40, kind: 'soft', shape: 'disc', radius: 0.8, pos: [3, 0.5, 0], dir: [0, 1, 0], speed: [0.2, 0.6], delay: 0, emit: 2.5, t0: 0 });
      k.smoke({ count: 20, shape: 'disc', radius: 0.6, pos: [3, 0.05, 0], ramp: DUST, delay: 0.2, emit: 0.4, t0: 0.2 });
      k.light({ pos: [3, 1, 0.6], t0: 0, dur: 2.4, fade: [0.1, 0.6], intensity: 40 });
      k.extras(fx.anchor('tgt', 0, [0, -0.1, 0]), 0.4);
      if (k.g >= 2) {
        const thorn = rock('#4a6a2a');
        for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12, th = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 5), thorn); th.position.set(3 + 0.45 * Math.cos(a), 0.3, 0.45 * Math.sin(a)); k.pop(th, 0.3 + 0.02 * i, 0.5 + 0.02 * i, 2.2, 2.5); }
      }
      if (k.g === 3) {
        for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4; vine(3 + 1.2 * Math.cos(a), 1.2 * Math.sin(a), i, 0.5); }
        k.ring({ t0: 0.5, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: T });
      }
    } }),

  SKILL('shaman/ancestor-roar', 'Ancestor roar', m(['spirit'], 'cone-fear', 0.4, 15, 6, 'cone'), 2.0, {
    view: 'side',
    act: act('none', null, 3.2, { keys: [[-0.5, 'guard'], [-0.25, 'crouch'], [0, 'roar', 'snap'], [0.8, 'roar'], [1.4, 'guard']], hits: [{ t: 0.2, stop: 0.06, shake: 0.2, amp: 0.03, push: 2 }] }),
    // P3=142
    build(fx, o) {
      const k = kit(fx, o, SPIRIT);
      // shockwave rings march toward the target
      for (let i = 0; i < (k.g >= 2 ? 7 : 5); i++) k.ring({ t0: 0.05 * i, dur: 0.35, r: [0.2, 0.4 + 0.35 * i], normal: [1, 0, 0], pos: [0.8 + 0.6 * i, 1.2, 0] });
      // ancestor faces fly from the caster to the target and fade
      const fm = addMat(k.col(1), 0.8, 0.8), eyeM = new THREE.MeshBasicMaterial({ color: '#000000' });
      const face = (t0) => {
        const f = new THREE.Group(), head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 10), fm); head.scale.set(1, 1.2, 0.6); f.add(head);
        for (const ez of [-0.1, 0.1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeM); e.position.set(0.24, 0.06, ez); f.add(e); }
        const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), eyeM); mouth.scale.set(0.5, 1.4, 0.6); mouth.position.set(0.24, -0.1, 0); f.add(mouth);
        fx.mesh(f, (t) => { const u = sm(t0, t0 + 0.5, t); f.position.set(0.4 + 2.8 * u, 1.6 - 0.2 * u, 0); f.visible = t >= t0 && t < t0 + 0.9; }, { t0: -5, dur: 99 });
      };
      for (let i = 0; i < (k.g === 3 ? 5 : 3); i++) face(0.2 + 0.15 * i);
      k.em({ count: 40, kind: 'streak', shape: 'point', pos: fx.anchor('head', 0.1, [0.2, 0, 0]), dir: [1, 0, 0], spread: 0.35, speed: [4, 6], life: [0.3, 0.5], delay: 0.1, emit: 0.6, t0: 0.1 });
      k.smoke({ count: 30, shape: 'disc', radius: 0.6, pos: [3.2, 0.1, 0], ramp: DUST, delay: 0.2, emit: 0.3, t0: 0.2 });
      k.gather(fx.anchor('chest', 0, [0.3, 0, 0]), 0, 0.3, 0.8, 30);
      k.light({ pos: [1.5, 1.4, 0.8], t0: 0, dur: 2, env: (t) => Math.exp(-2 * t), intensity: 80 });
      k.extras(fx.anchor('tgt', 0, [0, 0.1, 0]), 0.2);
      if (k.g === 3) k.ring({ t0: 0.6, dur: 0.6, r: [0.2, 1.6], normal: 'up', pos: [3.2, 0, 0] });
    } }),

  SKILL('shaman/bone-golem', 'Bone golem', m(['spirit', 'earth'], 'summon', 1.0, 40, 0, 'point'), 3.4, {
    view: 'wide',
    act: act('castup', 2.2, 3),
    // P3=234
    build(fx, o) {
      const k = kit(fx, o, EARTH), G0 = [1.6, 0, 0], P = fx.anchor('tgt', 0, [-0.2, 0.1, 0]);
      const bone = new THREE.MeshStandardMaterial({ color: '#d8d0c0', roughness: 0.9 });
      const golem = new THREE.Group(); golem.position.set(...G0);
      const add = (geo, p, parent = golem) => { const mm = new THREE.Mesh(geo, bone); mm.position.set(...p); parent.add(mm); return mm; };
      add(new THREE.BoxGeometry(0.6, 0.7, 0.4), [0, 1.1, 0]); // golem part, not actor // anchor-ok
      add(new THREE.BoxGeometry(0.25, 0.25, 0.25), [0, 1.6, 0]); // golem part, not actor // anchor-ok
      // arms pivot at the shoulder; the right arm swings forward (+x) for the punch
      const armR = new THREE.Group(), armL = new THREE.Group();
      armR.position.set(0.4, 1.4, 0); armL.position.set(-0.4, 1.4, 0); golem.add(armR, armL);
      add(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), [0, -0.35, 0], armR);
      add(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 6), [0, -0.35, 0], armL);
      for (const x of [-0.15, 0.15]) add(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6), [x, 0.3, 0]);
      for (const z of [-0.07, 0.07]) { const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), addMat(k.col(0), 1.2, 1)); eye.position.set(0.13, 1.62, z); golem.add(eye); }
      k.pop(golem, 0.2, 1.2, 3.0, 3.4, (t) => { golem.scale.multiplyScalar(1.7); armR.rotation.z = 1.4 * sm(2.0, 2.2, t); });
      k.decal({ kind: 'rune', r: [1.3, 1.3], pos: G0, t0: -0.4, dur: 4 });
      k.decal({ kind: 'cracks', r: [1.6, 1.6], pos: G0, t0: 0.2, dur: 3, reveal: 0.5, heat: [1, 0.1], cells: 4, y: 0.005 });
      k.em({ count: 30, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.6, pos: [G0[0], 0.05, 0], dir: [0, 1, 0], spread: 0.9, speed: [1, 3], gravity: [0, -10, 0], bounce: 0.35, size: [0.14, 0.08], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], delay: 0.2, emit: 1, t0: 0.2 });
      k.smoke({ count: 60, shape: 'disc', radius: 0.8, pos: [G0[0], 0.05, 0], ramp: DUST, delay: 0.2, emit: 1, t0: 0.2 });
      k.smoke({ count: 30, shape: 'disc', radius: 0.8, pos: [G0[0], 0.05, 0], ramp: GREEN, delay: 0.2, emit: 1, t0: 0.2 });
      ct(fx, k, P, 2.2, 40, { lightI: 0 });
      k.light({ pos: [G0[0], 1.6, 0.8], t0: 0.2, dur: 3.2, fade: [0.1, 0.6], intensity: 60 });
      k.extras(P, 2.2);
      if (k.g >= 2) k.em({ count: 30, kind: 'shard', shape: 'ring', radius: 0.8, pos: P, swirl: 3, ramp: [[0, '#f0e8d8'], [1, '#8a8270', 0]], speed: [0.5, 1.5], delay: 2.2, emit: 0.001, t0: 2.2 });
      if (k.g === 3) {
        k.ring({ t0: 2.2, dur: 0.6, r: [0.2, 2.6], normal: 'up', pos: [P[0], 0, 0] });
        k.ring({ t0: 2.2, dur: 0.4, r: [0.2, 1.2], normal: 'cam', pos: P });
      }
    } }),

  SKILL('shaman/ember-swarm', 'Ember swarm', m(['fire', 'spirit'], 'orbit-attack', 0.6, 12, 7, 'point'), 2.6, {
    view: 'wide',
    act: act('cast', 1.6, 3.8, { hits: [1.6, 1.7, 1.8, 1.9].map((t) => ({ t, stop: 0.03, shake: 0.15, amp: 0.02, push: 0.4 })) }),
    // P3=478
    build(fx, o) {
      const k = kit(fx, o, FIRE), TG = fx.anchor('tgt', 0, [0, 0.1, 0]);
      // spirit i orbits the caster until its dart time T, then flies to the target over .25 s
      const SP = (i, t) => { const T = 1.4 + 0.06 * i, a = (i * TAU) / 8 + 6 * Math.min(t, T), s = [0.7 * Math.cos(a), 0.9 + 0.1 * i, 0.7 * Math.sin(a)]; return lerp3(s, TG, sm(T, T + 0.25, t)); };
      for (let i = 0; i < 8; i++) {
        const T = 1.4 + 0.06 * i;
        k.em({ count: 18, kind: 'flame', shape: 'point', aspect: 1.5, intensity: 0.5, follow: (mm, ta, t) => mm.position.set(...SP(i, t)), delay: 0, emit: 2, t0: 0, t1: T + 0.6 });
        k.em({ count: 12, kind: 'soft', shape: 'sphere', radius: 0.05, follow: (mm, ta, t) => mm.position.set(...SP(i, t)), delay: 0, emit: 2, t0: 0, t1: T + 0.6 });
        k.sparks(TG, T + 0.25, 12);
      }
      const L = k.light({ pos: SP(0, 0), t0: 0, dur: 2.2, fade: [0.1, 0.4], intensity: 50 });
      fx.on((t) => L.l.position.set(...SP(0, t)));
      k.extras(TG, 1.6);
      if (k.g >= 2) k.em({ count: 40, kind: 'soft', shape: 'disc', radius: 0.8, pos: [3.8, 2, 0], dir: [0, -1, 0], speed: [0.5, 1.5], gravity: [0, -2, 0], delay: 1.4, emit: 0.8, t0: 1.4 });
      if (k.g === 3) {
        k.em({ count: 60, kind: 'flame', shape: 'disc', radius: 0.5, pos: [3.8, 0.05, 0], aspect: 1.5, speed: [0.5, 1.2], life: [0.5, 0.9], delay: 1.6, emit: 0.4, t0: 1.6 });
        k.ring({ t0: 1.6, dur: 0.5, r: [0.2, 1.8], normal: 'up', pos: [3.8, 0, 0] });
      }
    } }),

  SKILL('shaman/ward-totem', 'Ward totem', m(['spirit', 'earth'], 'totem-dome', 0.8, 30, 0, 'circle'), 3.2, {
    view: 'wide',
    act: act('smash', null, false, { keys: [[-0.5, 'guard'], [0, 'smashGround', 'snap'], [0.8, 'smashGround'], [1.4, 'guard']] }),
    // P3=161
    build(fx, o) {
      const k = kit(fx, o, SPIRIT), C0 = [1, 0, 0.4];
      const totem = new THREE.Group(); totem.position.set(...C0);
      const stone = rock('#6c6a64');
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), stone); b.position.y = 0.2 + i * 0.4; b.rotation.y = Math.PI / 4; totem.add(b); }
      for (const z of [-0.12, 0.12]) { const eye = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.04), addMat(k.col(1), 2, 1)); eye.position.set(0.22, 0.9, z); totem.add(eye); }
      k.pop(totem, 0, 0.2, 3.0, 3.2);
      // dome with two incoming soft trails that ripple it at 1.2 and 2.0
      const IN = (t0, y) => (t) => lerp3([4.2, y, 0.4], [2.8, 1.2, 0.4], clamp((t - t0) / 0.2));
      k.shell({ r: [0.2, 1.8], hemi: true, cells: 6, t0: 0.3, dur: 2.6, pulse: [0.03, (TAU * 2) / 3.2], pos: C0, impacts: [{ t: 1.2, dir: [1, 0.2, 0] }, { t: 2.0, dir: [1, -0.2, 0.2] }] });
      k.trail({ path: IN(1.0, 1.6), len: 0.3, width: 0.08, t0: 1.0, dur: 0.3 });
      k.trail({ path: IN(1.8, 0.6), len: 0.3, width: 0.08, t0: 1.8, dur: 0.3 });
      k.sparks([2.8, 1.2, 0.4], 1.2, 10);
      k.sparks([2.8, 0.6, 0.4], 2.0, 10);
      k.decal({ kind: 'rune', r: [1.8, 1.8], pos: C0, t0: 0, dur: 3 });
      k.em({ count: 60, kind: 'soft', shape: 'disc', radius: 0.8, pos: [C0[0], 0.05, C0[2]], dir: [0, 1, 0], speed: [0.4, 0.9], delay: 0, emit: 2.6, t0: 0 });
      k.ring({ t0: 0, dur: 0.8, r: [0.2, 2.4], normal: 'up', pos: C0 });
      k.light({ pos: [C0[0], 1.2, C0[2]], t0: 0, dur: 3.2, fade: [0.1, 0.6], env: (t) => 0.7 + 0.3 * Math.sin((TAU * t) / 1.6), intensity: 40 });
      k.extras([C0[0], 1.4, C0[2]], 2.4);
      if (k.g >= 2) for (let i = 0; i < 4; i++) { const a = (i * TAU) / 4 + 0.3, st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1), stone); st.position.set(C0[0] + 1.6 * Math.cos(a), 0.15, C0[2] + 1.6 * Math.sin(a)); k.pop(st, 0.2 + 0.05 * i, 0.5 + 0.05 * i, 2.8, 3.1); }
      if (k.g === 3) {
        k.sparks([C0[0] + 0.2, 1.6, C0[2]], 2.4, 40);
      }
    } }),

  SKILL('shaman/earth-drum', 'Earth drum', m(['earth', 'spirit'], 'pulse', 0.4, 12, 0, 'ring'), 3.0, {
    view: 'wide',
    act: act('smash', null, 3, { keys: [[-0.5, 'guard'], [0, 'smashDown', 'snap'], [0.25, 'overheadUp'], [0.5, 'smashDown', 'snap'], [0.75, 'overheadUp'], [1, 'smashDown', 'snap'], [1.25, 'overheadUp'], [1.5, 'smashDown', 'snap'], [2, 'guard']], hits: [0, 0.5, 1, 1.5].map((t) => ({ t, stop: 0.05, shake: 0.25, amp: 0.03, push: 0.6 })) }),
    // P3=182
    build(fx, o) {
      const k = kit(fx, o, EARTH), D = [0.75, 0, 0], BEAT = [0, 0.5, 1, 1.5];
      const drum = new THREE.Group(); drum.position.set(...D);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.4, 16), rock('#6a4a2a')); body.position.y = 0.2; drum.add(body);
      const skin = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 16), new THREE.MeshStandardMaterial({ color: '#d8c49a', roughness: 0.8 })); skin.position.y = 0.41; drum.add(skin);
      // membrane bulges on each beat
      const pulse = (t) => BEAT.reduce((s, b) => (t >= b ? s + Math.exp(-6 * (t - b)) : s), 0);
      fx.mesh(drum, (t) => { const p = pulse(t); skin.scale.set(1 + 0.06 * p, 1, 1 + 0.06 * p); }, { t0: -5, dur: 99 });
      for (const b of BEAT) {
        k.ring({ t0: b, dur: 0.7, r: [0.2, 3.5], normal: 'up', pos: D });
        k.smoke({ count: 20, shape: 'disc', radius: 0.4, pos: [D[0], 0.05, 0], ramp: DUST, delay: b, emit: 0.1, t0: b });
        k.ring({ t0: b, dur: 0.3, r: [0.1, 0.8], normal: 'cam', pos: [D[0], 0.5, 0] });
        if (b) { fx.flash(b, 0.08, k.col(0), 0.1); k.light({ pos: [D[0], 0.6, 0.6], t0: b, dur: 0.6, fade: [0.01, 0.4], intensity: 50 }); } // beat 0: extras burst owns flash + light
        if (k.g >= 2) k.em({ count: 10, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.35, pos: [D[0], 0.05, 0], dir: [0, 1, 0], spread: 0.9, speed: [1.5, 3], gravity: [0, -10, 0], bounce: 0.35, size: [0.12, 0.07], ramp: [[0, '#8a7a62'], [1, '#8a7a62', 1]], delay: b, emit: 0.001, t0: b });
      }
      k.decal({ kind: 'glow', r: [1, 1], pos: D, t0: 0, dur: 3 });
      k.extras([D[0], 0.8, 0], 0);
      if (k.g === 3) {
        k.ring({ t0: 2, dur: 0.7, r: [0.2, 5], normal: 'up', pos: D });
        k.em({ count: 20, kind: 'rock', blend: 'normal', lit: 1, shape: 'disc', radius: 0.35, pos: [D[0], 0.05, 0], dir: [0, 1, 0], spread: 0.9, speed: [1.5, 3], gravity: [0, -10, 0], bounce: 0.35, size: [0.12, 0.07], ramp: [[0, '#8a7a62'], [1, '#8a7a62', 1]], delay: 2, emit: 0.001, t0: 2 });
        fx.flash(2, 0.1, k.col(0), 0.15);
      }
    } }),
];
