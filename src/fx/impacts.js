// Impacts: jagged billboard starbursts, camera-plane burst lines, dust rings, cracks, energy domes. Characters take hits via the mannequin.
import * as THREE from 'three';
import { ringSheet } from '../core/meshes.js';
import { ENV } from '../core/feel.js';
import { burst } from './_aaa.js';

const _r = new THREE.Vector3(), _u = new THREE.Vector3();
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const STAR_V = `attribute float aR; varying float vR; void main(){ vR=aR; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const STAR_F = `uniform vec3 uC0, uC1, uC2; uniform float uInt, uA, uP; varying float vR;
void main(){ float b=pow(clamp(1.-vR,0.,1.),uP); vec3 c=vR<.45?mix(uC0,uC1,vR/.45):mix(uC1,uC2,(vR-.45)/.55); gl_FragColor=vec4(c*b*uInt*uA,1.); }`;
/** camera-facing jagged star. arms: [[angle, length(0..1)],...]; r: [r0,r1] world size; scale: optional (pr)=>size override. */
export function star(fx, o) {
  const arms = o.arms.slice().sort((a, b) => a[0] - b[0]), n = arms.length, pos = [], aR = [], idx = [], valley = o.valley ?? 0.12;
  pos.push(0, 0, 0); aR.push(0);
  for (let i = 0; i < n; i++) {
    const [a, l] = arms[i], [a2, l2] = arms[(i + 1) % n], am = i === n - 1 ? (a + a2 + Math.PI * 2) / 2 : (a + a2) / 2, vr = Math.min(l, l2) * valley;
    pos.push(Math.cos(a) * l, Math.sin(a) * l, 0); aR.push(l > 0 ? 1 : 0); pos.push(Math.cos(am) * vr, Math.sin(am) * vr, 0); aR.push(Math.min(1, vr + 0.1));
  }
  const m = n * 2; for (let i = 0; i < m; i++) idx.push(0, 1 + i, 1 + ((i + 1) % m));
  const g = new THREE.BufferGeometry(); g.setIndex(idx); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aR', new THREE.Float32BufferAttribute(aR, 1));
  const u = { uC0: { value: new THREE.Color(o.c0 || '#fff') }, uC1: { value: new THREE.Color(o.c1 || '#ffd070') }, uC2: { value: new THREE.Color(o.c2 || '#e05010') }, uInt: { value: o.intensity ?? 2.5 }, uA: { value: 1 }, uP: { value: o.power ?? 0.8 } };
  const mat = new THREE.ShaderMaterial({ vertexShader: STAR_V, fragmentShader: STAR_F, uniforms: u, transparent: true, depthWrite: false, depthTest: o.depthTest ?? false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
  const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = 30; const [r0, r1] = o.r || [0.3, 1];
  fx.mesh(mesh, (t, pr, f, w, obj) => { obj.quaternion.copy(f.camQuat); obj.rotateZ((o.spin ?? 0) * pr + (o.rot ?? 0)); obj.scale.setScalar(o.scale ? o.scale(pr) : r0 + (r1 - r0) * ease(pr * 1.6)); u.uA.value = w * (1 - pr * pr * (o.decay ?? 0.5)); }, { t0: o.t0 ?? 0, dur: o.dur ?? 0.3, fade: o.fade || [0, 0.12], pos: o.pos });
  return mesh;
}
/** jagged random arms */
export function jag(fx, n, lmin = 0.35, lmax = 1) { const a = []; for (let i = 0; i < n; i++) a.push([(i / n) * Math.PI * 2 + (fx.rng() - 0.5) * (Math.PI / n) * 1.2, lmin + (lmax - lmin) * Math.pow(fx.rng(), 0.7)]); return a; }
/** radial speed lines in the camera plane */
export function camLines(fx, o) {
  const n = o.n ?? 14, [r0, r1] = o.r || [0.3, 1.8];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + (fx.rng() - 0.5) * 0.4, k0 = r0 * (1 + fx.rng() * 0.6), k1 = r1 * (0.55 + fx.rng() * 0.6);
    fx.ribbon({ n: 6, width: (u) => (o.width ?? 0.025) * Math.sin(Math.PI * Math.min(1, u * 0.95 + 0.03)), sweep: [0, 1.5], ease: 'out', tail: 0.7, t0: (o.t0 ?? 0) + fx.rng() * 0.03, dur: o.dur ?? 0.25, fade: [0, 0.1], intensity: o.intensity ?? 2.4, ramp: o.ramp || [[0, '#fff'], [0.5, '#ffd890'], [1, '#e06010']],
      points: (t, pr, tAbs) => { _r.set(1, 0, 0).applyQuaternion(fx.camQuat); _u.set(0, 1, 0).applyQuaternion(fx.camQuat); const c = o.pos, out = []; for (let j = 0; j <= 5; j++) { const d = k0 + (k1 - k0) * (j / 5); out.push([c[0] + (_r.x * Math.cos(a) + _u.x * Math.sin(a)) * d, c[1] + (_r.y * Math.cos(a) + _u.y * Math.sin(a)) * d, c[2] + (_r.z * Math.cos(a) + _u.z * Math.sin(a)) * d]); } return out; } });
  }
}
const sparks = (fx, p, o = {}) => fx.emitter({ count: o.n ?? 60, kind: 'spark', shape: 'point', pos: p, dir: o.dir || [0, 1, 0], spread: o.spread ?? 1.3, speed: [o.s0 ?? 2, o.s1 ?? 9], life: o.life || [0.3, 0.8], gravity: [0, -9, 0], size: [o.size ?? 0.08, 0.02], stretch: 1.6, ramp: o.ramp || [[0, '#fff'], [0.35, '#ffcf60'], [1, '#a03000', 0]], intensity: o.int ?? 4, bounce: p[1] < 0.4 ? 0.35 : -1, delay: o.t ?? 0, t0: (o.t ?? 0) - 0.02, emit: 0.001 });
const smoke = (fx, p, o = {}) => fx.emitter({ count: o.n ?? 30, kind: 'smoke', blend: 'normal', shape: o.shape || 'disc', radius: o.radius ?? 0.3, pos: p, dir: o.dir || [0, 0.3, 0], spread: o.spread ?? 1.5, radial: o.radial ?? 0.9, speed: o.speed || [0.8, 3], life: o.life || [0.8, 1.8], size: o.size || [0.5, 1.6], ramp: o.ramp || [[0, '#595047', 0], [0.12, '#4b443c', 0.6], [1, '#23201c', 0]], lit: 1, drag: o.drag ?? 1.6, gravity: [0, o.rise ?? 0.35, 0], turb: [0.3, 0.9], delay: o.t ?? 0, t0: (o.t ?? 0) - 0.02, emit: o.emit ?? 0.15, order: -1 });
const rocks = (fx, p, o = {}) => fx.emitter({ count: o.n ?? 20, kind: 'rock', blend: 'normal', shape: 'disc', radius: o.radius ?? 0.25, pos: p, dir: [0, 1, 0], spread: o.spread ?? 0.9, speed: o.speed || [2.5, 7], life: [1.0, 1.9], gravity: [0, -10, 0], size: o.size || [0.14, 0.08], ramp: [[0, o.col || '#5f4f3f'], [1, o.col || '#5f4f3f', 1]], lit: 1, bounce: 0.35, rot: 6, delay: o.t ?? 0, t0: (o.t ?? 0) - 0.02, emit: 0.001 });
const hurtAct = (t0 = 0.03, hits = {}, extra = {}) => ({ target: false, windup: 0.1, keys: [[-0.1, 'guard'], [t0, 'hurt', 'snap'], [0.6, 'hurt'], [1.2, 'guard']], hits: [{ t: t0, stop: 0.08, shake: 0.25, amp: 0.04, ...hits }], ...extra });
const BODYVIEW = { pos: [1.1, 1.5, 3.9], target: [0.2, 1.1, 0] };
const hitAt = (fx, off = [0.25, -0.05, 0.2]) => fx.anchor('chest', 0, off); // hit point on the actor's chest (front, slightly right)

export default [
  { id: 'impacts/hit-spark', name: 'Hit spark', category: 'impacts', tier: 1, loop: false, duration: 0.5, stage: { sky: 'dusk', bloom: 0.4, view: { pos: [0.8, 1.4, 3.0], target: [0, 1.15, 0] } },
    build(fx) {
      const C = [0, 1.15, 0];
      star(fx, { pos: C, t0: 0, dur: 0.28, r: [0.3, 1.25], arms: [[0.12, 1], [1.65, 0.45], [3.3, 0.72], [4.85, 0.34]], valley: 0.06, c0: '#fff2dc', c1: '#ffd070', c2: '#e05010', intensity: 2.6, spin: 0.15 });
      star(fx, { pos: C, t0: 0, dur: 0.18, r: [0.2, 0.6], arms: [[0.5, 0.8], [2.1, 0.6], [3.6, 0.9], [5.3, 0.5]], valley: 0.2, c0: '#fff2dc', c1: '#fff2dc', c2: '#ffd070', intensity: 1.5 });
      sparks(fx, C, { n: 60, dir: [0.7, 0.35, 0.6], spread: 0.5, s0: 3, s1: 11, size: 0.12, life: [0.4, 0.7], int: 5 });
      sparks(fx, C, { n: 25, dir: [0.2, 0.8, 0.5], spread: 1.2, s0: 1, s1: 5, size: 0.08, life: [0.4, 0.7] });
      fx.emitter({ count: 12, kind: 'shard', blend: 'normal', shape: 'sphere', radius: 0.05, pos: C, dir: [0.4, 0.6, 0.6], spread: 1.1, speed: [1.5, 4.5], life: [0.4, 0.5], gravity: [0, -9, 0], size: [0.05, 0.03], ramp: [[0, '#b8bcc4'], [1, '#b8bcc4', 1]], lit: 1, rot: 8, emit: 0.001 });
      burst(fx, C, 0, { ramp: [[0, '#fff2dc'], [0.5, '#ffd070'], [1, '#e05010']], col: '#ffc070', dir: [-0.7, -0.35, -0.6] });
    } },

  { id: 'impacts/hit-flash', name: 'Hit flash', category: 'impacts', tier: 1, loop: false, duration: 0.5, stage: { sky: 'dusk', bloom: 0.4, view: BODYVIEW },
    act: hurtAct(0.03, { stop: 0.07, shake: 0.18, amp: 0.03 }),
    build(fx) {
      const C0 = hitAt(fx);
      fx.on((t) => {
        let tint = '#fff', amt = 0, glow = 0;
        if (t >= 0.0 && t < 0.07) { amt = 1; glow = 1; } else if (t >= 0.07 && t < 0.42) { const k = Math.floor((t - 0.07) / 0.06), fade = 1 - (t - 0.07) / 0.35; tint = k % 2 === 0 ? '#ff2a1a' : '#ffffff'; amt = 0.85 * fade; glow = 0.6 * fade; }
        fx.body.set({ tint, tintAmt: amt, glow });
      });
      star(fx, { pos: C0, t0: 0.0, dur: 0.2, r: [0.2, 0.9], arms: jag(fx, 8, 0.5, 1), valley: 0.1, c0: '#fff2dc', c1: '#ff9080', c2: '#c01010', intensity: 2 });
      camLines(fx, { pos: C0, n: 12, r: [0.35, 1.5], t0: 0.0, dur: 0.22, ramp: [[0, '#fff2dc'], [0.5, '#ffb0a0'], [1, '#e02010']], intensity: 1.5 });
      burst(fx, C0, 0.03, { ramp: [[0, '#fff2dc'], [0.5, '#ffb0a0'], [1, '#e02010']], col: '#ff5040', dir: [-1, 0, 0] });
    } },

  { id: 'impacts/impact-frame', name: 'Impact frame', category: 'impacts', loop: false, duration: 0.3, stage: { sky: 'day', bloom: 0.3, view: BODYVIEW },
    act: hurtAct(0.0, { stop: 0.0, shake: 0.25, amp: 0.05 }, { keys: [[-0.05, 'guard'], [0, 'hurt', 'snap'], [0.3, 'hurt']], windup: 0.05 }),
    screen: { glsl: `vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
      vec2 q=(uv-.5)*vec2(a,1.); float r=length(q); float ang=atan(q.y,q.x); float lum=dot(c,vec3(.3,.5,.2));
      float rays=smoothstep(.5,.85,hash12(vec2(floor(ang*38.),floor(p*9.)))); rays*=smoothstep(.1,.5,r);
      if(p<.16) return mix(vec3(1.),vec3(0.),rays*.95);
      if(p<.46){ float v=step(.3,lum); vec3 inv=vec3(1.-v); return mix(inv,vec3(1.)-inv,rays); }
      if(p<.72){ vec3 inv=vec3(1.)-c; return mix(c,inv,step(.5,fract(p*13.))*.9); }
      return mix(c*(1.+.0),c,1.); }` },
    build(fx) {
      const C0 = hitAt(fx); fx.flash(0, 0.1, '#ffe8c0', 0.15);
      star(fx, { pos: C0, t0: 0, dur: 0.2, r: [0.4, 1.8], arms: jag(fx, 14, 0.3, 1), valley: 0.1, c0: '#fff', c1: '#fff', c2: '#ccc', intensity: 2 });
      camLines(fx, { pos: C0, n: 20, r: [0.5, 2.6], t0: 0, dur: 0.22, width: 0.04, intensity: 2, ramp: [[0, '#fff'], [1, '#fff']] });
    } },

  { id: 'impacts/crit-hit', name: 'Critical hit', category: 'impacts', tier: 2, loop: false, duration: 0.9, stage: { sky: 'dusk', bloom: 0.5, view: BODYVIEW },
    act: hurtAct(0.03, { stop: 0.12, shake: 0.4, amp: 0.07 }),
    build(fx) {
      const C0 = hitAt(fx);
      fx.on((t) => { const a = t > 0 && t < 0.3 ? 0.8 * (1 - t / 0.3) : 0; fx.body.set({ tint: '#ff3020', tintAmt: a, glow: a * 0.8 }); });
      fx.flash(0.0, 0.1, '#fff3d0', 0.08);
      star(fx, { pos: C0, t0: 0, dur: 0.5, scale: (pr) => (pr < 0.18 ? 0.3 + 1.5 * ease(pr / 0.18) : 1.8 - 0.7 * ease((pr - 0.18) / 0.82)), arms: jag(fx, 16, 0.25, 1), valley: 0.08, c0: '#fff2dc', c1: '#ffd040', c2: '#e02010', intensity: 1.5, spin: 0.25, fade: [0, 0.3], power: 1.4 });
      star(fx, { pos: C0, t0: 0.01, dur: 0.3, r: [0.2, 1.3], arms: jag(fx, 10, 0.4, 1), valley: 0.12, c0: '#fff2dc', c1: '#fff2dc', c2: '#ffd890', intensity: 1.5, spin: -0.4, rot: 0.3, power: 1.4 });
      fx.ring({ refract: 0.012, t0: 0.02, dur: 0.45, r: [0.2, 2.2], width: [0.2, 0.03], normal: 'cam', pos: C0, intensity: 1.0, ramp: [[0, '#fff2dc'], [0.5, '#ffd050'], [1, '#e04010']] });
      camLines(fx, { pos: C0, n: 16, r: [0.5, 2.4], t0: 0.02, dur: 0.3, intensity: 1.5, ramp: [[0, '#fff2dc'], [0.5, '#ffd890'], [1, '#e06010']] });
      [[2.4, -0.6, 0.15], [-0.9, 0.8, -0.1], [0.6, 2.7, 0.2]].forEach(([a0, a1, tl], i) => fx.slash({ center: [C0[0] + 0.4 * i - 0.3, C0[1] + 0.1, 0.35], radius: 0.9 + 0.25 * i, a0: a0 + i, a1: a1 + i, tilt: tl, t0: 0.04 + 0.03 * i, dur: 0.3, width: 0.1, tail: 0.8, sweep: [0, 1.4], intensity: i ? 1.5 : 2.6, ramp: [[0, '#fff2dc'], [0.4, '#ffd060'], [1, '#e04010']] }));
      fx.emitter({ count: 26, kind: 'shard', shape: 'sphere', radius: 0.1, pos: C0, dir: [0.3, 0.5, 0.8], spread: 2.2, speed: [3, 8], life: [0.5, 1.1], gravity: [0, -7, 0], size: [0.1, 0.05], ramp: [[0, '#fff2dc'], [0.3, '#ffd060'], [1, '#e04010', 0]], intensity: 1.5, rot: 10, drag: 0.8, delay: 0.03, emit: 0.001 });
      sparks(fx, C0, { n: 60, dir: [0.4, 0.4, 0.8], spread: 1.8, s0: 3, s1: 11, t: 0.03, life: [0.3, 0.7] });
      burst(fx, C0, 0.03, { ramp: [[0, '#fff2dc'], [0.5, '#ffd050'], [1, '#e04010']], col: '#ffb040', dir: [-1, 0, 0] });
    } },

  { id: 'impacts/blunt-hit', name: 'Blunt hit', category: 'impacts', tier: 2, loop: false, duration: 0.9, stage: { sky: 'dusk', view: BODYVIEW },
    act: hurtAct(0.04, { stop: 0.1, shake: 0.3, amp: 0.05 }),
    build(fx) {
      fx.on((t) => { const a = t > 0.04 && t < 0.4 ? 0.4 * (1 - (t - 0.04) / 0.36) : 0; fx.body.set({ tint: '#ffb090', tintAmt: a }); });
      const G = fx.anchor('feet', 0, [0.2, 0.05, 0.1]), B = hitAt(fx, [0.25, -0.15, 0.25]);
      fx.ring({ refract: 0.012, t0: 0.04, dur: 0.4, r: [0.15, 0.8], width: [0.2, 0.05], normal: 'cam', pos: B, intensity: 0.28, fill: 0.04, ramp: [[0, '#fff2dc'], [0.4, '#d8c8b0'], [1, '#8a7a68']] });
      smoke(fx, B, { n: 18, shape: 'sphere', radius: 0.12, dir: [0.3, 0.2, 1], spread: 1.6, radial: 0.8, speed: [0.5, 2], size: [0.25, 0.7], rise: 0.1, t: 0.04, emit: 0.08, life: [0.5, 1.1] });
      smoke(fx, G, { n: 40, radius: 0.35, speed: [0.8, 3.2], size: [0.5, 1.5], t: 0.04, emit: 0.1 });
      fx.ring({ refract: 0.02, dark: 0.3, t0: 0.04, dur: 0.7, r: [0.3, 2.6], width: [0.15, 0.05], normal: 'up', pos: G, intensity: 0.3, fill: 0, ramp: [[0, '#c8b8a0'], [1, '#6a5a48']], decay: 1 });
      rocks(fx, hitAt(fx, [0.25, -0.2, 0.1]), { n: 12, spread: 1.4, speed: [1, 3.5], size: [0.07, 0.04], t: 0.04, col: '#7a6850' });
      burst(fx, B, 0.04, { ramp: [[0, '#fff2dc'], [0.4, '#d8c8b0'], [1, '#8a7a68']], col: '#ffc890', dir: [-1, 0, 0] });
    } },

  { id: 'impacts/bullet-impact', name: 'Bullet impact', category: 'impacts', tier: 1, loop: false, duration: 1.4, stage: { sky: 'dusk', bloom: 0.4, view: { pos: [1.4, 1.6, 3.4], target: [0, 1.2, 0] } },
    build(fx) {
      const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 2.8, 0.3), new THREE.MeshStandardMaterial({ color: '#6a665f', roughness: 0.95, metalness: 0 })); wall.position.set(0, 1.4, -0.15); fx.mesh(wall, null, {});
      const I = [0.1, 1.2, 0.02];
      star(fx, { pos: [I[0], I[1], 0.1], t0: 0, dur: 0.22, r: [0.2, 0.7], arms: jag(fx, 9, 0.4, 1), valley: 0.1, c0: '#fff2dc', c1: '#ffd080', c2: '#d05010', intensity: 2.6, depthTest: true });
      sparks(fx, [I[0], I[1], 0.05], { n: 60, dir: [0.35, 0.3, 1], spread: 1.35, s0: 2, s1: 9, life: [0.35, 0.7], size: 0.1 });
      rocks(fx, [I[0], I[1], 0.05], { n: 16, spread: 1.2, speed: [1, 4], size: [0.04, 0.025], col: '#8a8478' }); fx.emitter({ count: 16, kind: 'rock', blend: 'normal', shape: 'point', pos: [I[0], I[1], 0.05], dir: [0, 0.3, 1], spread: 1.0, speed: [1, 4], life: [0.7, 1.2], gravity: [0, -9, 0], size: [0.04, 0.025], ramp: [[0, '#8a8478'], [1, '#8a8478', 1]], lit: 1, rot: 6, emit: 0.001 });
      smoke(fx, [I[0], I[1], 0.06], { n: 24, shape: 'sphere', radius: 0.05, dir: [0, 0.2, 1], spread: 1.0, radial: 0.2, speed: [0.3, 1.2], size: [0.15, 0.55], rise: 0.2, life: [1.0, 1.8], ramp: [[0, '#55514a', 0], [0.15, '#4b4740', 0.55], [1, '#2e2b26', 0]], emit: 0.12, drag: 1.2 });
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), new THREE.MeshBasicMaterial({ color: '#0a0908' })); hole.position.set(I[0], I[1], 0.003); fx.mesh(hole, null, { t0: 0.01 });
      fx.decal({ kind: 'cracks', t0: 0.0, dur: 1.4, r: [0.5, 0.55], pos: [I[0], I[1], 0.004], rotate: [0, 0, 0], fade: [0.02, 0.9], heat: [0.4, 0], reveal: 0.15, cells: 5, intensity: 0.5, ramp: [[0, '#1a1410'], [0.5, '#a08060'], [1, '#ffd8a0']] });
      fx.decal({ kind: 'scorch', t0: 0.0, dur: 1.4, r: [0.18, 0.2], pos: [I[0], I[1], 0.005], rotate: [0, 0, 0], fade: [0.03, 0.6], heat: [0.6, 0], ramp: [[0, '#1a1410'], [0.5, '#f60'], [1, '#fc8']] });
      burst(fx, [I[0], I[1], 0.1], 0, { ramp: [[0, '#fff2dc'], [0.5, '#ffd080'], [1, '#d05010']], col: '#ffc070', dir: [0, 0, -1] });
    } },

  { id: 'impacts/ground-slam', name: 'Ground slam', category: 'impacts', loop: false, duration: 3.2, tier: 3, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [2.2, 2.2, 8.5], target: [0.6, 0.8, 0] } },
    act: { kind: 'stomp', target: false, windup: 0.7, hits: [{ t: 0, stop: 0.14, shake: 0.9, amp: 0.14, dir: [0, -1, 0] }] },
    build(fx) {
      // act hit at T0 (amp .14 -> fx 'impact' strength 1) already emits the impact event, so no fx.impact here
      const P = [0.25, 0, 0], T0 = 0, SL = [P[0], 0.1, 0], DUST = [[0, '#5a4a3a', 0], [0.12, '#3a3028', 0.6], [1, '#2a2420', 0]];
      fx.flash(0, 0.18, '#ffd8a0', 0.15);
      // anticipation: dust pulled inward, ground glow grows over the windup
      fx.emitter({ count: 21, kind: 'dust', blend: 'normal', shape: 'ring', radius: 2, radiusIn: 1.8, pos: SL, dir: [0, 0.3, 0], spread: 0.3, radial: -1, speed: [2, 3], life: [0.7, 0.7], size: [0.84, 1.68], ramp: DUST, intensity: 0.6, lit: 1, drag: 1.6, turb: [0.3, 0.9], t0: 0, delay: 0, emit: 0.7, order: -1 });
      fx.decal({ kind: 'glow', t0: 0, dur: 2.5, reveal: 0.7, r: [1.5, 2.8], pos: P, fade: [0.03, 2.0], intensity: 1.0 });
      // impact at T0: shock, rings, cracks, scorch, dust crown, debris, warm light, core sprite
      fx.ring({ refract: 0.02, dark: 0.3, t0: T0, dur: 0.9, r: [0.3, 7], width: [0.25, 0.05], normal: 'up', pos: P, intensity: 0.3, fill: 0, ramp: [[0, '#ffd9a0'], [0.5, '#ff9a40'], [1, '#7a2a08']] });
      fx.ring({ refract: 0.02, dark: 0.3, t0: 0.12, dur: 1.0, r: [0.3, 5], width: [0.18, 0.04], normal: 'up', pos: P, intensity: 0.3, fill: 0, ramp: [[0, '#ffd9a0'], [0.5, '#ff9a40'], [1, '#7a2a08']] });
      const sh = fx.erode({ geo: ringSheet({ r0: 0.5, r1: 1 }), erode: [.25, 1], tile: [6, 1], scroll: [1.5, 0], blend: 'add', intensity: .4, ramp: [[0, '#fff'], [0.4, '#fc9'], [1, '#a50']], pos: P, t0: T0, dur: 0.5 });
      fx.on((t) => { const s = 0.3 + 4.7 * Math.min(1, Math.max(0, t / 0.5)); sh.obj.scale.set(s, 1, s); }); // shock expands .3 -> 5 over .5 s
      fx.decal({ kind: 'cracks', t0: 0, dur: 3.1, r: [4.2, 4.8], pos: P, fade: [0.05, 2.0], heat: [1, 0.2], reveal: 0.4, cells: 5, ramp: [[0, '#300'], [0.4, '#f40'], [1, '#fc6']] });
      fx.decal({ kind: 'scorch', t0: 0, dur: 3.1, r: [1.0, 1.8], pos: P, fade: [0.05, 2.0], heat: [1, 0], ramp: [[0, '#210'], [0.5, '#f60'], [1, '#fc8']] });
      fx.emitter({ count: 34, kind: 'dust', blend: 'normal', shape: 'ring', radius: 1.2, radiusIn: 0.8, pos: SL, dir: [0, 0.3, 0], spread: 0.3, radial: 1, speed: [2, 4], life: [1.2, 2], size: [1.12, 1.96], ramp: DUST, intensity: 0.6, lit: 1, drag: 1.6, gravity: [0, -0.3, 0], turb: [0.3, 0.9], delay: T0, t0: T0 - 0.02, emit: 0.1, order: -1 }); // gravity < 0: dust settles, clear by 2.2 s
      fx.debris({ count: 36, t0: T0, pos: SL, color: '#4a4038', speed: [3, 7], spread: 0.9, size: [0.05, 0.14], life: 2.2 });
      fx.light({ color: '#ffb070', intensity: 70, pos: [0.4, 1.2, 1.0], range: 8, t0: T0 - 0.02, dur: 1.2, env: (t) => ENV.impact(t - T0, 8) });
      fx.emitter({ count: 1, kind: 'soft', blend: 'add', shape: 'point', pos: SL, speed: 0, life: [0.05, 0.05], size: [0.7, 0.7], ramp: [[0, '#fff6e0', 1], [1, '#ffd0a0', 0.6]], intensity: 8, delay: T0, emit: 0.001 });
      // dissipation: smoke column (unchanged)
      smoke(fx, [P[0], 0.1, 0], { n: 80, radius: 0.5, speed: [1.8, 6], size: [1, 2.6], t: 0, emit: 0.3, life: [1.5, 2.6], drag: 1.4, ramp: [[0, '#8a7a68', 0], [0.12, '#7a6c5c', 0.5], [1, '#4a4238', 0]] });
      smoke(fx, [P[0], 0.2, 0], { n: 40, shape: 'sphere', radius: 0.4, dir: [0, 1, 0], spread: 0.8, radial: 0.2, speed: [1, 3], size: [1, 2.2], t: 0.05, rise: 0.8, life: [1.8, 2.6], ramp: [[0, '#8a7a68', 0], [0.12, '#7a6c5c', 0.45], [1, '#4a4238', 0]] });
      sparks(fx, [P[0], 0.1, 0], { n: 90, spread: 1.4, s0: 3, s1: 11, life: [0.4, 1.2] });
    } },

  { id: 'impacts/heavy-landing', name: 'Heavy landing', category: 'impacts', tier: 3, loop: false, duration: 1.6, stage: { sky: 'dusk', view: { pos: [1.8, 1.9, 6.4], target: [0.4, 0.6, 0] } },
    act: { kind: 'stomp', target: false, windup: 0.6, hits: [{ t: 0, stop: 0.1, shake: 0.5, amp: 0.08 }] },
    build(fx) {
      const P = [0.2, 0, 0];
      fx.decal({ kind: 'scorch', t0: 0, dur: 1.55, r: [0.5, 1.1], pos: P, fade: [0.04, 1.2], heat: [0, 0], ramp: [[0, '#1a1410'], [1, '#1a1410']], alpha: 0.9 });
      fx.decal({ kind: 'cracks', t0: 0, dur: 1.5, r: [1.8, 2.3], pos: P, fade: [0.04, 1.0], heat: [0.5, 0], reveal: 0.2, cells: 4, intensity: 0.6, ramp: [[0, '#1a1410'], [0.5, '#9a8a78'], [1, '#e0d0b8']] });
      fx.ring({ refract: 0.02, dark: 0.3, t0: 0, dur: 0.6, r: [0.3, 3.6], width: [0.15, 0.04], normal: 'up', pos: P, intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#d8c8b0'], [1, '#8a7a68']], decay: 1 });
      fx.emitter({ count: 50, kind: 'smoke', blend: 'normal', shape: 'ring', radius: 0.5, radiusIn: 0.3, pos: [P[0], 0.1, 0], dir: [0, 0.2, 0], spread: 0.5, radial: 1, speed: [1.5, 3.5], life: [0.9, 1.6], size: [0.5, 1.5], ramp: [[0, '#595047', 0], [0.12, '#4b443c', 0.6], [1, '#23201c', 0]], lit: 1, drag: 1.8, gravity: [0, 0.3, 0], turb: [0.3, 0.9], emit: 0.1, order: -1 });
      fx.emitter({ count: 60, kind: 'smoke', blend: 'normal', shape: 'ring', radius: 0.7, radiusIn: 0.5, pos: [P[0], 0.1, 0], dir: [0, 0.2, 0], spread: 0.5, radial: 1, speed: [2.2, 4.8], life: [1.0, 1.9], size: [0.6, 1.8], ramp: [[0, '#595047', 0], [0.12, '#4b443c', 0.55], [1, '#23201c', 0]], lit: 1, drag: 1.8, gravity: [0, 0.3, 0], turb: [0.3, 0.9], delay: 0.1, emit: 0.1, order: -1 });
      rocks(fx, [P[0], 0.1, 0], { n: 16, speed: [2, 5], size: [0.1, 0.06] });
      burst(fx, P, 0, { ramp: [[0, '#fff2dc'], [0.4, '#d8c8b0'], [1, '#8a7a68']], col: '#ffd8b0' });
    } },

  { id: 'impacts/parry', name: 'Parry', category: 'impacts', tier: 1, loop: false, duration: 1.0, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [0.4, 1.5, 4.2], target: [0, 1.3, 0] } },
    build(fx) {
      const steel = new THREE.MeshStandardMaterial({ color: '#d6dde6', metalness: 1, roughness: 0.2 }), gold = new THREE.MeshStandardMaterial({ color: '#8a6a30', metalness: 0.9, roughness: 0.35 });
      const mk = () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.BoxGeometry(0.085, 1.5, 0.018), steel); b.position.y = 0.75; g.add(b); const tp = new THREE.Mesh(new THREE.ConeGeometry(0.0425, 0.18, 4), steel); tp.position.y = 1.59; tp.rotation.y = Math.PI / 4; tp.scale.z = 0.2; g.add(tp);
        const gd = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.06), gold); gd.position.y = -0.02; g.add(gd); const gr = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.3, 10), new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.8 })); gr.position.y = -0.2; g.add(gr); const pm = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), gold); pm.position.y = -0.37; g.add(pm); return g; };
      const A = mk(), B = mk(), root = new THREE.Group(); root.add(A, B); const C = [0, 1.3, 0.0], ca = 0.75, ia = 0.7;
      const place = (g, sgn, off, ang) => { const th = sgn * (ia + ang); g.rotation.z = th; const dx = -Math.sin(th), dy = Math.cos(th); g.position.set(C[0] - dx * 0.65 + sgn * off * 0.6, C[1] - dy * 0.65 - off * 0.35, sgn === 1 ? -0.02 : 0.02); };
      fx.mesh(root, (t) => {
        const ap = t < 0.06 ? 1 - ease(t / 0.06) : 0, sh = t > 0.06 && t < 0.55 ? Math.exp(-(t - 0.06) * 7) * Math.sin((t - 0.06) * 70) : 0, ret = t > 0.5 ? ease((t - 0.5) / 0.4) : 0;
        place(A, -1, ap * 1.6 + ret * 1.0 + sh * 0.02, sh * 0.08); place(B, 1, ap * 1.6 + ret * 1.0 - sh * 0.02, -sh * 0.08); A.position.y -= ret * 0.3; B.position.y += ret * 0.2;
      }, {});
      star(fx, { pos: [0, 1.3, 0.15], t0: 0.06, dur: 0.35, r: [0.3, 1.5], arms: [[0, 1], [0.785, 0.45], [1.57, 0.9], [2.35, 0.45], [3.14, 1], [3.93, 0.45], [4.71, 0.9], [5.5, 0.45]], valley: 0.06, c0: '#fff2dc', c1: '#fff0c0', c2: '#e0a030', intensity: 2.8, spin: 0.2 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'sphere', radius: 0.05, pos: [0, 1.3, 0.1], dir: [0, 1, 0], spread: 3.0, speed: [2, 10], life: [0.4, 0.7], gravity: [0, -8, 0], size: [0.07, 0.02], stretch: 1.6, ramp: [[0, '#fff'], [0.3, '#ffd060'], [1, '#a05000', 0]], intensity: 4, bounce: -1, drag: 0.5, delay: 0.06, emit: 0.04 });
      fx.emitter({ count: 20, kind: 'glint', shape: 'sphere', radius: 0.5, pos: [0, 1.3, 0.1], size: [0.35, 0.1], life: [0.25, 0.5], ramp: [[0, '#fff'], [1, '#ffd060', 0]], intensity: 3, delay: 0.07, emit: 0.2 });
      fx.ring({ refract: 0.012, t0: 0.06, dur: 0.45, r: [0.1, 1.4], width: [0.12, 0.02], normal: 'cam', pos: [0, 1.3, 0.1], intensity: 1.0, ramp: [[0, '#fff2dc'], [1, '#ffc050']] });
      fx.light({ color: '#ffd070', intensity: 25, pos: [0.4, 1.6, 1.0], range: 7, t0: 0.05, dur: 0.6, fade: [0.01, 0.45], norm: 50 });
    } },

  { id: 'impacts/ricochet', name: 'Ricochet', category: 'impacts', tier: 1, loop: false, duration: 1.1, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [0.6, 0.8, 4.2], target: [0.1, 0.4, 0] } },
    build(fx) {
      const I = [0, 0.02, 0], S = [-3.4, 1.6, 0.5], E = [3.6, 1.2, -0.5], tI = 0.3, tE = 0.75;
      const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      const path = (t) => (t < tI ? lerp3(S, I, Math.max(0, t) / tI) : t < tE ? lerp3(I, E, (t - tI) / (tE - tI)) : E);
      fx.trail({ path, len: 0.16, n: 36, width: 0.05, t0: 0, dur: 1.0, fade: [0, 0.2], intensity: 1.5, ramp: [[0, '#fff2dc'], [0.35, '#ffd070'], [1, '#c03010']] });
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 3.4, 2.2), toneMapped: false }));
      fx.mesh(head, (t, pr, f, w, o) => { const p = path(t); o.position.set(p[0], p[1], p[2]); o.visible = t < tE + 0.05; }, { t0: 0, dur: 1.0 });
      star(fx, { pos: [0, 0.06, 0.1], t0: tI, dur: 0.3, r: [0.2, 1.1], arms: [[0.1, 1], [1.4, 0.4], [3.1, 0.7], [4.6, 0.35], [5.5, 0.55]], valley: 0.07, c0: '#fff2dc', c1: '#ffd070', c2: '#e05010', intensity: 2.6 });
      const skid = []; for (let i = 0; i <= 12; i++) { const u = i / 12; skid.push([-0.1 + u * 1.7, 0.012, -0.04 * u + 0.015 * Math.sin(u * 12)]); }
      fx.ribbon({ points: skid, n: 12, width: (u) => 0.035 * (1 - u * 0.7), head: () => 1.2, tail: 1.6, t0: tI, dur: 0.8, fade: [0.02, 0.6], intensity: 1.5, ramp: [[0, '#fff2dc'], [0.4, '#ffa030'], [1, '#802000']] });
      fx.decal({ kind: 'glow', t0: tI, dur: 0.8, r: [0.3, 0.6], pos: [0.2, 0.01, 0], fade: [0.02, 0.6], intensity: 1 });
      fx.emitter({ count: 60, kind: 'spark', shape: 'line', shapeSize: [0.8, 0, 0], pos: [0.7, 0.02, 0], dir: [0.5, 1, -0.1], spread: 0.9, speed: [1.5, 6], life: [0.3, 0.7], gravity: [0, -9, 0], size: [0.06, 0.02], stretch: 1.5, ramp: [[0, '#fff'], [0.35, '#ffc050'], [1, '#a03000', 0]], intensity: 4, bounce: 0.4, delay: tI, emit: 0.1 });
      smoke(fx, [0.5, 0.05, 0], { n: 14, radius: 0.5, speed: [0.3, 1.2], size: [0.3, 0.9], t: tI, emit: 0.15, life: [0.8, 1.4] });
      burst(fx, [0, 0.06, 0], tI, { ground: false, ramp: [[0, '#fff2dc'], [0.5, '#ffd070'], [1, '#e05010']], col: '#ffb060', dir: [0.9, -0.4, -0.1] });
    } },

  { id: 'impacts/shield-block', name: 'Shield block', category: 'impacts', tier: 2, loop: false, duration: 1.1, stage: { sky: 'night', bloom: 0.5, view: { pos: [1.8, 1.4, 4.6], target: [0.8, 0.9, 0] } },
    act: { target: false, windup: 0.2, keys: [[-0.2, 'guard'], [1.1, 'guard']], hits: [{ t: 0.1, stop: 0.06, shake: 0.3, amp: 0.05 }] },
    build(fx) {
      const P = [0.75, 0, 0], R = 1.5, dir = [0.9, 0.35, 0.25], hp = [P[0] + dir[0] * R * 0.93, dir[1] * R * 0.93, dir[2] * R * 0.93];
      fx.shell({ t0: 0.0, dur: 1.1, r: [R * 0.9, R], ease: 'out', hemi: true, cells: 6, power: 2.2, noise: 0.35, intensity: 1.5, pos: P, ramp: [[0, '#012'], [0.4, '#2a8fff'], [1, '#e8fbff']], impacts: [{ t: 0.1, dir }], fade: [0.05, 0.6] });
      fx.flash(0.1, 0.1, '#bfe8ff', 0.08);
      star(fx, { pos: [hp[0] + 0.1, hp[1], hp[2] + 0.1], t0: 0.1, dur: 0.25, r: [0.2, 0.9], arms: jag(fx, 8, 0.4, 1), valley: 0.1, c0: '#e8f2ff', c1: '#9fd8ff', c2: '#2060e0', intensity: 2.4 });
      fx.ring({ t0: 0.1, dur: 0.5, r: [0.1, 1.5], width: [0.12, 0.02], normal: [0.9, 0.35, 0.25], pos: hp, intensity: 1.0, ramp: [[0, '#e8f2ff'], [1, '#4aa0ff']] });
      fx.emitter({ count: 60, kind: 'spark', shape: 'point', pos: hp, dir: [0.7, 0.4, 0.4], spread: 1.3, speed: [2, 7], life: [0.3, 0.7], gravity: [0, -7, 0], size: [0.06, 0.02], stretch: 1.6, ramp: [[0, '#fff'], [0.4, '#7cc4ff'], [1, '#1040a0', 0]], intensity: 4, delay: 0.1, bounce: -1, emit: 0.001 });
      fx.decal({ kind: 'rings', t0: 0.0, dur: 1.0, r: [0.8, 1.5], pos: P, fade: [0.05, 0.7], intensity: 0.8, ramp: [[0, '#012'], [0.5, '#2a8fff'], [1, '#bff']] });
      fx.light({ color: '#4aa0ff', intensity: 70, pos: [P[0] + 0.5, 1.2, 1.0], range: 8, t0: 0.0, dur: 0.9, fade: [0.02, 0.7], norm: 50 });
    } },
];
