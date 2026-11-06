// Lava class: 5 fire+earth+lava derived skills (PLAN2 B16). Black crust with bright cracks from one shared shader (LAVA_F).
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, LAVA, DUST, metal, rock } from './_skill.js';
import { NOISE } from '../core/glsl.js';
import { swing, contact } from './melee.js';

const LAVA_F = /* glsl */ `
uniform float uTime, uProg, uHeat; varying vec2 vUv;
${NOISE}
void main(){
  if (vUv.x > uProg) discard;
  float n = fbm(vec3(vUv * vec2(6.0, 3.0), uTime * 0.05));
  float crack = 1.0 - smoothstep(0.0, 0.05, abs(n - 0.5));
  vec3 crust = vec3(0.106, 0.071, 0.063), hot = vec3(1.0, 0.45, 0.1);
  gl_FragColor = vec4(crust + hot * crack * uHeat * 2.0, 1.0);
}`;
const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
/** shared lava material: heat(t) and prog(t) drive uHeat and uProg every frame */
const lavaMat = (fx, heat = () => 1, prog = () => 1) => {
  const u = { uTime: { value: 0 }, uProg: { value: 1 }, uHeat: { value: 1 } };
  fx.on((t) => { u.uTime.value = t; u.uHeat.value = heat(t); u.uProg.value = prog(t); });
  return new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: LAVA_F, uniforms: u });
};
/** dark crust shard material with an emissive that the caller cools */
const shardMat = () => new THREE.MeshStandardMaterial({ color: '#120c10', roughness: 0.05, metalness: 0.3, emissive: '#ff5a14', emissiveIntensity: 0.3 });
const m = meta('lava', 'derived');
const ELEM = ['fire', 'earth', 'lava'];
/** T-MEL contact burst with n sparks (n + 2 particles) */
const ct = (fx, k, p, h, n, o) => contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n, ...o });

export default [
  SKILL('lava/magma-surge', 'Magma surge', m(ELEM, 'line-ground', 0.6, 12, 6, 'line'), 3.0, {
    view: 'wide',
    act: act('stomp', 0.5, 3.6),
    // P3=589
    build(fx, o) {
      const k = kit(fx, o, LAVA);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.25, 64, 4), lavaMat(fx, (t) => 2.2 - 1.9 * sm(0, 3, t), (t) => sm(0, 0.6, t)));
      strip.rotation.x = -Math.PI / 2; strip.position.set(2.2, 0.02, 0);
      fx.mesh(strip, null, { t0: -0.1, dur: 3.1 });
      const L = k.light({ pos: [0.5, 1, 0.8], t0: 0, dur: 3, fade: [0.1, 0.6], intensity: 70 });
      fx.on((t) => { L.obj.position.x = 0.5 + 3.4 * clamp(t / 3); });
      k.em({ count: 60, kind: 'drop', shape: 'line', shapeSize: [1.7, 0, 0], pos: [2.2, 0.05, 0], dir: [0, 1, 0], spread: 0.6, speed: [1, 3], gravity: [0, -9, 0], bounce: 0.2, life: [0.8, 1.4], size: [0.07, 0.03], intensity: 1.5, delay: 0.3, emit: 2.0 });
      k.em({ count: 40, kind: 'flame', shape: 'line', shapeSize: [1.7, 0, 0], pos: [2.2, 0.1, 0], dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1.2], life: [0.4, 0.7], size: [0.2, 0.08], aspect: 1.6, intensity: 0.4, delay: 0.3, emit: 2.0 });
      k.smoke({ count: 50, shape: 'line', shapeSize: [1.7, 0, 0], pos: [2.2, 0.2, 0], dir: [0, 1, 0], speed: [0.3, 0.8], life: [1.5, 2.5], size: [0.6, 1.2], delay: 0.5, emit: 2.0 });
      k.em({ count: 110, kind: 'flame', shape: 'box', shapeSize: [3.0, 0, 0.5], pos: [2.2, 0.05, 0], dir: [0, 1, 0], spread: 0.15, speed: [0.5, 1.2], life: [0.4, 0.7], size: [0.35, 0.15], aspect: 1.5, intensity: 0.4, delay: 0.3, emit: 2.0, t0: 0.28 });
      k.em({ count: 60, kind: 'spark', shape: 'box', shapeSize: [3.0, 0, 0.4], pos: [2.2, 0.05, 0], dir: [0, 1, 0], spread: 0.5, speed: [2, 4], gravity: [0, -8, 0], life: [0.5, 0.7], size: [0.05, 0.02], intensity: 3, bounce: 0.3, delay: 0.3, emit: 2.0, t0: 0.28 });
      k.smoke({ count: 40, shape: 'box', shapeSize: [3.0, 0, 0.4], pos: [2.2, 0.3, 0], size: [0.5, 1.4], life: [1.2, 2], delay: 0.3, emit: 2.0 });
      k.sparks([2.2, 0.1, 0], 0.5, 40);
      ct(fx, k, [3.6, 0.2, 0], 0.5, 40, { lightI: 0 });
      if (k.g >= 2) [1.2, 2.2, 3.2].forEach((x, i) => k.em({ count: 13, kind: 'drop', shape: 'point', pos: [x, 0.05, 0], dir: [0, 1, 0], spread: 0.5, speed: [2, 4], gravity: [0, -9, 0], bounce: 0.2, life: [0.6, 1], size: [0.07, 0.03], intensity: 1.5, delay: 0.5 + 0.2 * i, emit: 0.001 }));
      if (k.g === 3) { k.ring({ t0: 0.5, dur: 0.5, r: [0.2, 2.2], normal: 'cam', pos: [3.6, 0.6, 0] }); k.sparks([3.6, 0.4, 0], 0.5, 30); }
      k.extras([3.6, 0.2, 0], 0.5);
    } }),

  SKILL('lava/obsidian-rain', 'Obsidian rain', m(ELEM, 'volley-fall', 0.6, 12, 8, 'circle'), 2.4, {
    view: 'wide',
    act: act('castup', 0.7, 3.2, { hits: [0.7, 0.9, 1.1].map((t) => ({ t, stop: 0.06, shake: 0.3, amp: 0.04, push: 1.6 })) }),
    // P3=328
    build(fx, o) {
      const k = kit(fx, o, LAVA), C = [3.2, 0, 0];
      const shard = (i) => {
        const tt = 0.5 + 0.04 * i, land = [C[0] + (fx.rng() - 0.5) * 1.6, 0.1, (fx.rng() - 0.5) * 1.6];
        const P = (t) => { const u = clamp((t - tt) / 0.25); return [land[0], 0.1 + 4.9 * (1 - u * u), land[2]]; };
        const mat = shardMat(), mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.08), mat);
        mesh.scale.set(0.5, 1.6, 0.5);
        fx.mesh(mesh, (t) => { mesh.position.set(...P(t)); mesh.visible = t >= tt - 0.02; mat.emissiveIntensity = 0.3 + 1.2 * Math.exp(-2 * Math.max(0, t - tt - 0.25)); }, { t0: -0.1, dur: 3.2 });
        k.trail({ path: P, t0: tt, dur: 0.25, len: 0.5, width: 0.05 });
        k.sparks([land[0], 0.1, land[2]], tt + 0.25, 10);
      };
      for (let i = 0; i < 16; i++) shard(i);
      k.decal({ kind: 'scorch', r: [1, 1.4], pos: [C[0], 0.02, 0], t0: 0.7, dur: 1.6 });
      k.smoke({ count: 30, shape: 'disc', radius: 1.2, pos: [C[0], 0.1, 0], dir: [0, 1, 0], speed: [0.3, 0.8], life: [1.2, 2], size: [0.5, 1], delay: 0.9, emit: 1.0 });
      k.light({ pos: [C[0], 1, 0.8], t0: 0.7, dur: 1.6, fade: [0.02, 0.6], intensity: 90 });
      if (k.g >= 2) for (let i = 16; i < 22; i++) shard(i);
      if (k.g === 3) {
        const big = new THREE.Mesh(new THREE.OctahedronGeometry(0.3), shardMat());
        big.scale.set(1, 2.5, 1); big.position.set(C[0], 0.4, 0);
        fx.mesh(big, null, { t0: 0.8, dur: 2.2 });
        k.ring({ t0: 0.8, dur: 0.5, r: [0.2, 2], normal: 'up', pos: [C[0], 0.03, 0] });
      }
      k.extras(C, 0.5);
    } }),

  SKILL('lava/molten-fist', 'Molten fist', m(ELEM, 'melee-strike', 0.3, 6, 2, 'point'), 1.8, {
    view: 'side',
    act: act('thrust', 0.04, 0.9, { windup: 0.45, contact: 0.04, hits: [{ t: 0.04, stop: 0.12, shake: 0.35, amp: 0.05, push: 1.8 }] }),
    // P3=335
    build(fx, o) {
      const k = kit(fx, o, LAVA), C = fx.anchor('tgt', 0, [-0.08, 0.1, 0.1]), A = fx.anchor('handR', 0.04); // fist at contact
      k.em({ count: 1, kind: 'soft', shape: 'point', size: [0.5, 0.5], life: [0.6, 0.6], intensity: 1.6, delay: -0.3, t0: -0.3, emit: 0.001, follow: k.at() });
      k.em({ count: 20, kind: 'soft', shape: 'sphere', radius: 0.2, dir: [1, 0, 0], speed: [0.5, 1], life: [0.4, 0.7], size: [0.3, 0.15], intensity: 1, delay: -0.4, emit: 0.7, follow: k.at() });
      k.em({ count: 30, kind: 'flame', shape: 'sphere', radius: 0.15, dir: [1, 0, 0], speed: [0.3, 0.8], life: [0.3, 0.5], size: [0.3, 0.12], aspect: 1.6, intensity: 0.4, delay: -0.4, emit: 0.7, follow: k.at() });
      swing(fx, { t0: 0, t1: 0.12, len: 0.12, inner: 0, outer: 0.2, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 1.4 * k.b, edge: 3 });
      ct(fx, k, C, 0.04, 60, { lightI: 0 });
      k.em({ count: 25, kind: 'drop', shape: 'point', pos: A, dir: [1, 0.3, 0], spread: 0.6, speed: [1, 3], gravity: [0, -9, 0], bounce: 0.2, life: [0.6, 1], size: [0.07, 0.03], intensity: 1.5, delay: 0.04, emit: 0.001 });
      k.em({ count: 25, kind: 'drop', shape: 'point', pos: C, dir: [0, 0.5, 0.5], spread: 0.8, speed: [1, 3], gravity: [0, -9, 0], bounce: 0.2, life: [0.6, 1], size: [0.07, 0.03], intensity: 1.5, delay: 0.04, emit: 0.001 });
      k.em({ count: 40, kind: 'drop', shape: 'point', pos: C, dir: [0, 1, 0], spread: 1, speed: [1, 3], gravity: [0, -6, 0], bounce: 0.2, life: [0.6, 1], size: [0.07, 0.03], intensity: 1.5, delay: 0.04, emit: 0.001 });
      [[-0.32, 0.2], [0.08, 0.3], [-0.52, -0.1], [0.18, -0.2]].forEach(([dx, z]) => k.decal({ kind: 'glow', r: [0.2, 0.2], pos: [C[0] + 0.08 + dx, 0, z], t0: 0.04, dur: 1.2 }));
      k.smoke({ count: 30, shape: 'sphere', radius: 0.3, pos: C, dir: [0, 1, 0], speed: [0.5, 1.2], life: [0.8, 1.4], size: [0.4, 0.9], delay: 0.05, emit: 0.001 });
      k.em({ count: 20, kind: 'shard', shape: 'point', pos: C, dir: [0.5, 0.3, 0.8], spread: 1, speed: [2, 5], gravity: [0, -9, 0], bounce: 0.3, life: [0.6, 1], size: [0.08, 0.03], intensity: 1, delay: 0.04, emit: 0.001, ramp: [[0, '#1b1210'], [1, '#050302', 0]] });
      if (k.g >= 2) k.ring({ t0: 0.04, dur: 0.35, r: [0.2, 1.4], normal: 'cam', pos: C });
      if (k.g === 3) k.em({ count: 40, kind: 'flame', shape: 'disc', radius: 0.5, pos: [C[0], 0.05, C[2]], dir: [0, 1, 0], speed: [0.5, 1.5], life: [0.4, 0.8], size: [0.3, 0.12], aspect: 1.8, intensity: 0.4, delay: 0.05, emit: 0.001 });
      k.extras(C, 0.04);
    } }),

  SKILL('lava/crust-breaker', 'Crust breaker', m(ELEM, 'leap-slam', 0.6, 14, 5, 'circle'), 2.2, {
    view: 'wide',
    act: act('stomp', 0, 2.6, { windup: 0.65, hits: [{ t: 0, stop: 0.1, shake: 0.55, amp: 0.08, push: 2 }] }),
    // P3=422
    build(fx, o) {
      const k = kit(fx, o, LAVA), P = [1.1, 0, 0];
      fx.on((t) => { fx.body.position.x = 1.0 * sm(-0.3, 0, t); });
      k.decal({ kind: 'cracks', r: [3, 3.6], pos: [P[0], 0.02, 0], t0: 0, dur: 2.1, reveal: 0.3, heat: [1, 0.4], cells: 4 });
      k.decal({ kind: 'scorch', r: [1, 1.4], pos: [P[0], 0.02, 0], t0: 0, dur: 2.2 });
      k.em({ count: 24, kind: 'rock', shape: 'disc', radius: 0.3, pos: P, dir: [0, 1, 0], spread: 1, speed: [3, 7.5], gravity: [0, -10, 0], bounce: 0.35, life: [1, 1.8], size: [0.12, 0.06], blend: 'normal', lit: 1, ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], emit: 0.001 });
      k.smoke({ ramp: DUST, count: 50, shape: 'ring', radius: 0.4, pos: P, radial: 0.9, speed: [1.5, 4.5], life: [1.2, 2], size: [0.5, 1.2], emit: 0.001 });
      k.sparks(P, 0, 40);
      for (let i = 0; i < 10; i++) {
        const side = i % 2 ? 1 : -1, ox = (i - 4.5) * 0.25, z = ((i % 3) - 1) * 0.3;
        const slab = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.3), rock('#1b1210'));
        fx.mesh(slab, (t) => { const u = clamp(t / 0.9); slab.position.set(P[0] + ox, 0.05 + 0.6 * Math.sin(Math.PI * u), z); slab.rotation.z = side * 1.2 * u; }, { t0: 0, dur: 2.2 });
      }
      k.em({ count: 80, kind: 'drop', shape: 'disc', radius: 0.4, pos: P, dir: [0, 1, 0], spread: 0.8, speed: [2, 5], gravity: [0, -9, 0], bounce: 0.2, life: [0.8, 1.4], size: [0.08, 0.03], intensity: 1.5, emit: 0.001 });
      k.em({ count: 50, kind: 'flame', shape: 'disc', radius: 0.6, pos: P, dir: [0, 1, 0], spread: 0.6, speed: [0.5, 2], life: [0.4, 0.8], size: [0.4, 0.15], aspect: 1.8, intensity: 0.4, emit: 0.001 });
      k.smoke({ count: 60, shape: 'disc', radius: 0.8, pos: P, dir: [0, 1, 0], speed: [1, 2.5], life: [1.5, 2.5], size: [0.6, 1.2], emit: 0.001 });
      if (k.g >= 2) k.em({ count: 40, kind: 'drop', shape: 'point', pos: P, dir: [0, 1, 0], spread: 0.3, speed: [4, 7], gravity: [0, -9, 0], life: [0.8, 1.4], size: [0.08, 0.03], intensity: 1.5, delay: 0.2, emit: 0.001 });
      if (k.g === 3) {
        k.decal({ kind: 'cracks', r: [2, 2.5], pos: [P[0], 0.02, 0], t0: 1.0, dur: 1.1, reveal: 0.3, heat: [1, 0.4], cells: 4 });
        k.ring({ t0: 1.0, dur: 0.5, r: [0.2, 2], normal: 'cam', pos: [P[0], 1, 0] });
      }
      k.extras(P, 0);
    } }),

  SKILL('lava/forge-totem', 'Forge totem', m(ELEM, 'totem', 0.8, 22, 6, 'circle'), 3.4, {
    view: 'wide',
    act: act('smash', 1.0, 3, { hits: [1.0, 1.8, 2.6].map((t) => ({ t, stop: 0.06, shake: 0.3, amp: 0.04, push: 1.6 })) }),
    // P3=486
    build(fx, o) {
      const k = kit(fx, o, LAVA), B = [1.2, 0, 0.4], TG = fx.anchor('tgt', 0, [0, 0.1, 0]), TOP = [1.2, 1.71, 0.4]; // anchor-ok
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.3), lavaMat(fx));
      core.position.set(1.2, 0.855, 0.4); core.scale.setScalar(1.9);
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.12, 0.46), metal('#4a4f57'));
      anvil.position.y = 0.51; core.add(anvil);
      fx.mesh(core, (t) => { core.scale.y = 1.9 * (1 - 0.6 * sm(2.6, 3.2, t)); }, { t0: -0.5, dur: 4.5 });
      for (const p of [1.0, 1.8, 2.6]) {
        k.ring({ t0: p, dur: 0.4, r: [0.2, 1.4], normal: 'up', pos: [B[0], 0.05, B[2]] });
        k.em({ count: 25, kind: 'flame', shape: 'disc', radius: 0.2, pos: TOP, dir: [0, 1, 0], speed: [0.5, 1.5], life: [0.4, 0.7], size: [0.25, 0.1], aspect: 1.8, intensity: 0.4, delay: p, emit: 0.001 });
        k.beam({ from: TOP, to: TG, r: [0.1, 0.14], t0: p, dur: 0.2, fade: [0.03, 0.2] });
        k.sparks(TG, p + 0.2, 30);
      }
      k.em({ count: 90, kind: 'drop', shape: 'point', pos: TOP, dir: [0, -1, 0], spread: 0.9, speed: [0.3, 1], gravity: [0, -9, 0], bounce: 0.2, life: [0.8, 1.2], size: [0.06, 0.03], intensity: 1.5, delay: 0.3, emit: 3 });
      k.decal({ kind: 'glow', r: [0.8, 0.8], pos: [B[0], 0.02, B[2]], t0: 0.3, dur: 3.0, reveal: 0.6 });
      k.smoke({ count: 40, shape: 'disc', radius: 0.3, pos: [B[0], 1, B[2]], dir: [0, 1, 0], speed: [0.5, 1.2], life: [1.5, 2.5], size: [0.5, 1.1], delay: 1.0, emit: 2.4 });
      k.em({ count: 60, kind: 'flame', shape: 'disc', radius: 0.18, pos: TOP, dir: [0, 1, 0], speed: [0.6, 1.2], life: [0.3, 0.5], size: [0.3, 0.12], aspect: 1.8, intensity: 0.45, delay: 0, emit: 3.0, t0: -0.02 });
      k.light({ pos: [1.2, 1.2, 1], t0: 0.8, dur: 2.6, fade: [0.05, 0.5], flicker: 0.3, intensity: 60 });
      if (k.g >= 2) k.em({ count: 40, kind: 'soft', shape: 'point', pos: TOP, dir: [0, 1, 0], spread: 0.4, speed: [1, 3], life: [0.6, 1.2], size: [0.15, 0.06], intensity: 1.2, delay: 1.0, emit: 2.0 });
      if (k.g === 3) {
        k.em({ count: 50, kind: 'flame', shape: 'disc', radius: 0.3, pos: TOP, dir: [0, 1, 0], speed: [1, 2.5], life: [0.5, 0.9], size: [0.4, 0.18], aspect: 1.8, intensity: 0.4, delay: 2.6, emit: 0.6 });
        k.ring({ t0: 2.6, dur: 0.6, r: [0.2, 2.2], normal: 'up', pos: [B[0], 0.05, B[2]] });
      }
      k.extras(TOP, 1.0);
    } }),
];
