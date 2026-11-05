// Projectiles: small PBR models on analytic paths, ribbon trails, billboard glow heads, muzzle flashes.
import * as THREE from 'three';
import { star, jag } from './impacts.js';
import { Target } from '../core/dummy.js';
import { burst } from './_aaa.js';

const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
const lerp3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
const bez = (a, b, c, k) => { const u = 1 - k; return [u * u * a[0] + 2 * u * k * b[0] + k * k * c[0], u * u * a[1] + 2 * u * k * b[1] + k * k * c[1], u * u * a[2] + 2 * u * k * b[2] + k * k * c[2]]; };
const _x = new THREE.Vector3(1, 0, 0), _t = new THREE.Vector3();
const orient = (o, path, t) => { const a = path(t - 0.01), b = path(t + 0.01); _t.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]); if (_t.lengthSq() > 1e-9) o.quaternion.setFromUnitVectors(_x, _t.normalize()); };
const GL_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const GL_F = `uniform vec3 uC0, uC1; uniform float uInt, uA, uFl; varying vec2 vUv;
void main(){ vec2 p=vUv*2.-1.; float r2=dot(p,p); float core=exp(-r2*20.), halo=exp(-r2*4.5)*(1.-smoothstep(.8,1.,sqrt(r2))); float fl=uFl*(exp(-abs(p.x)*14.)*exp(-abs(p.y)*2.5)+exp(-abs(p.y)*14.)*exp(-abs(p.x)*2.5));
  vec3 c=uC0*core*1.5+uC1*(halo*.55+fl*.8); gl_FragColor=vec4(c*uInt*uA,1.); }`;
/** billboard glow head following a path. o: {path|pos, size, c0, c1, intensity, flare, pulse:[amp,freq], t0, dur, fade} */
function glow(fx, o) {
  const u = { uC0: { value: new THREE.Color(o.c0 || '#fff') }, uC1: { value: new THREE.Color(o.c1 || '#f60') }, uInt: { value: o.intensity ?? 2 }, uA: { value: 1 }, uFl: { value: o.flare ?? 0 } };
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.ShaderMaterial({ vertexShader: GL_V, fragmentShader: GL_F, uniforms: u, transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor }));
  m.renderOrder = 29; m.frustumCulled = false;
  fx.mesh(m, (t, pr, f, w, obj, tAbs) => { obj.quaternion.copy(f.camQuat); const p = o.path ? o.path(t) : o.pos; obj.position.set(p[0], p[1], p[2]); const k = o.pulse ? 1 + o.pulse[0] * Math.sin(tAbs * o.pulse[1]) : 1; obj.scale.setScalar((typeof o.size === 'function' ? o.size(pr) : o.size ?? 0.4) * k); u.uA.value = w; }, { t0: o.t0, dur: o.dur, fade: o.fade });
  return m;
}
/** ribbon trail behind a path point; width(u) with u=0 tail .. 1 head */
function trailR(fx, o) {
  const n = o.n ?? 30, len = o.len ?? 0.4, t0 = o.t0 ?? 0;
  return fx.ribbon({ n, tail: o.tail ?? 1.0, head: () => 1.001, blend: o.blend, ...o, width: o.width || ((u) => 0.05 * u), points: (t) => { const out = []; for (let i = 0; i <= n; i++) out.push(o.path(Math.max(t0, t - (1 - i / n) * len))); return out; } });
}
const smokeE = (fx, o) => fx.emitter({ kind: 'smoke', blend: 'normal', lit: 1, order: -1, ramp: [[0, '#57504a', 0], [0.12, '#4a453e', 0.6], [1, '#221f1b', 0]], gravity: [0, 0.3, 0], turb: [0.3, 0.9], drag: 1.2, ...o });
const sparkE = (fx, o) => fx.emitter({ kind: 'spark', stretch: 1.6, size: [0.07, 0.02], ramp: [[0, '#fff'], [0.35, '#ffc050'], [1, '#a03000', 0]], intensity: 4, gravity: [0, -9, 0], ...o });
const steel = () => new THREE.MeshStandardMaterial({ color: '#cfd6de', metalness: 1, roughness: 0.25 });
const mat = (c, r = 0.7, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const rotX = (g, ang = -Math.PI / 2) => { g.rotation.z = ang; return g; };
const ballistic = (t, p0, v, floor, e, out) => { let x = p0[0], y = p0[1], z = p0[2], vx = v[0], vy = v[1], vz = v[2], tt = 0; const dt = 1 / 120; while (tt < t) { const d = Math.min(dt, t - tt); vy -= 9.8 * d; x += vx * d; y += vy * d; z += vz * d; if (y < floor) { y = floor; vy = -vy * e; vx *= 0.75; vz *= 0.75; if (Math.abs(vy) < 0.4) vy = 0; } tt += d; } out.set(x, y, z); };
const follow = (fx, L, path) => fx.on((t) => { const p = path(t); L.obj.position.set(...p); L.lp?.set(...p); }); // light rides the head
const FRONT = { pos: [0.7, 1.35, 3.0], target: [0, 1.2, 0] };

function arrowModel() { const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.75, 8), mat('#a77b4a', 0.6)); rotX(sh, Math.PI / 2); g.add(sh);
  const hd = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 4), steel()); hd.rotation.z = -Math.PI / 2; hd.position.x = 0.42; g.add(hd);
  for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.002, 0.035), mat(i === 0 ? '#c0392b' : '#eee', 0.9)); f.position.x = -0.3; f.position.y = 0; f.rotation.x = (i * Math.PI) / 3; f.geometry.translate(0, 0, 0); g.add(f); } return g; }
function rocketModel(len = 0.65, r = 0.065) { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20), mat('#d8dde2', 0.35, 0.6)); rotX(b, Math.PI / 2); g.add(b);
  const ns = new THREE.Mesh(new THREE.ConeGeometry(r, r * 2.6, 20), mat('#c0392b', 0.4, 0.4)); ns.rotation.z = -Math.PI / 2; ns.position.x = len / 2 + r * 1.3; g.add(ns);
  const st = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, len * 0.12, 20), mat('#c0392b', 0.5, 0.3)); rotX(st, Math.PI / 2); st.position.x = len * 0.18; g.add(st);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(len * 0.22, r * 1.6, 0.012), mat('#6a727c', 0.5, 0.6)); f.position.set(-len / 2 + len * 0.08, 0, 0); const pv = new THREE.Group(); pv.rotation.x = (i * Math.PI) / 2; f.position.y = r * 1.3; pv.add(f); g.add(pv); }
  const nz = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.7, r * 0.9, 0.06, 16), mat('#222', 0.5, 0.8)); rotX(nz, Math.PI / 2); nz.position.x = -len / 2 - 0.02; g.add(nz); return g; }

export default [
  { id: 'projectiles/arrow', name: 'Arrow', category: 'projectiles', loop: true, duration: 0.6, stage: { sky: 'day', bloom: 0.2, view: { pos: [0.4, 1.3, 1.9], target: [0, 1.2, 0] } },
    build(fx) {
      const a = arrowModel(); fx.mesh(a, (t, pr, f, w, o, tAbs) => { o.position.set(0, 1.2 + 0.006 * Math.sin(tAbs * 20.94), 0); o.rotation.set(0.04 * Math.sin(tAbs * 10.47 * 2), 0.03 * Math.sin(tAbs * 10.47), 0.02 * Math.sin(tAbs * 20.94)); });
      fx.emitter({ count: 40, kind: 'streak', stretch: 3, shape: 'box', shapeSize: [2.4, 0.7, 0.7], pos: [0, 1.2, 0], dir: [-1, 0, 0], spread: 0.02, speed: [9, 14], life: [0.22, 0.4], size: [0.5, 0.35], ramp: [[0, '#e8f2ff', 0], [0.2, '#fff', 0.5], [1, '#cfe0ff', 0]], intensity: 0.7, emit: 0.6 });
      fx.ribbon({ points: [[-1.8, 1.2, 0.01], [-0.35, 1.2, 0.01]], n: 12, width: (u) => 0.01 * u, head: () => 1.001, tail: 1, blend: 'normal', intensity: 0.5, ramp: [[0, '#fff'], [1, '#dde6f0']] });
      fx.light({ color: '#fff4e0', intensity: 12, pos: [0.4, 2.2, 1.5], range: 8 });
    } },

  { id: 'projectiles/bullet-tracer', name: 'Bullet tracer', category: 'projectiles', loop: true, duration: 0.6, stage: { sky: 'dusk', bloom: 0.55, view: { pos: [0.7, 1.35, 2.6], target: [-0.3, 1.2, 0] } },
    build(fx) {
      const L = 3.2;
      fx.ribbon({ points: [[-L, 1.2, 0.02], [0, 1.2, 0.02]], n: 20, width: (u) => 0.02 * Math.pow(u, 0.7), head: () => 1.001, tail: 1.0, intensity: 1.2, flicker: 0.5, ramp: [[0, '#fff2dc'], [0.25, '#ffe090'], [0.6, '#ff4010'], [1, '#500']] });
      fx.ribbon({ points: [[-1.2, 1.2, 0.02], [0, 1.2, 0.02]], n: 10, width: (u) => 0.012 * u, head: () => 1.001, tail: 1.0, intensity: 1.2, ramp: [[0, '#fff2dc'], [1, '#ffd890']] });
      const slug = new THREE.Mesh(new THREE.CapsuleGeometry(0.012, 0.06, 4, 10), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4, 2.5), toneMapped: false })); rotX(slug, Math.PI / 2); slug.position.set(0, 1.2, 0.02); fx.mesh(slug, null, {});
      glow(fx, { pos: [0, 1.2, 0.02], size: 0.28, c0: '#fff2dc', c1: '#ff7030', intensity: 2.2, flare: 0.4, pulse: [0.06, 60] });
      fx.emitter({ count: 24, kind: 'spark', stretch: 1.6, shape: 'point', pos: [-0.1, 1.2, 0], dir: [-1, 0, 0], spread: 0.25, speed: [2, 6], life: [0.12, 0.3], size: [0.05, 0.01], ramp: [[0, '#fff'], [0.4, '#ffa040'], [1, '#800', 0]], intensity: 3, emit: 0.6 });
      fx.emitter({ count: 40, kind: 'streak', stretch: 3, shape: 'box', shapeSize: [2.4, 0.6, 0.6], pos: [0, 1.2, 0], dir: [-1, 0, 0], spread: 0.02, speed: [10, 16], life: [0.2, 0.35], size: [0.5, 0.35], ramp: [[0, '#fff2dc', 0], [0.2, '#ffd8b0', 0.4], [1, '#f80', 0]], intensity: 0.6, emit: 0.6 });
      fx.light({ color: '#ff9a50', intensity: 25, pos: [0, 1.3, 0.6], range: 6 });
    } },

  { id: 'projectiles/cannonball', name: 'Cannon shot', category: 'projectiles', tier: 2, loop: false, duration: 3.8, stage: { sky: 'dusk', bloom: 0.4, view: { pos: [0.6, 2.0, 11.5], target: [0.8, 1.2, 0] } },
    build(fx) {
      const M = [-3.6, 1.45, 0], L = [4.6, 0.16, -0.6], tF = 0.4, tL = 2.7, g = 9.8, T = tL - tF; const v = [(L[0] - M[0]) / T, (L[1] - M[1] + 0.5 * g * T * T) / T, (L[2] - M[2]) / T];
      const path = (t) => { const s = Math.min(Math.max(t - tF, 0), T); return [M[0] + v[0] * s, M[1] + v[1] * s - 0.5 * g * s * s, M[2] + v[2] * s]; };
      const cg = new THREE.Group(); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.5, 20), mat('#2a2c30', 0.4, 0.8)); barrel.rotation.z = -Math.PI / 2 + 0.3; barrel.position.set(-4.0, 1.1, 0); cg.add(barrel);
      const mz = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.035, 8, 20), mat('#2a2c30', 0.4, 0.8)); mz.position.set(-3.3, 1.32, 0); mz.rotation.y = Math.PI / 2; mz.rotation.x = 0.3; cg.add(mz);
      for (const z of [-0.3, 0.3]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.1, 20), mat('#5a3d26', 0.8)); w.rotation.x = Math.PI / 2; w.position.set(-4.2, 0.42, z); cg.add(w); } const cr = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.15, 0.5), mat('#5a3d26', 0.8)); cr.position.set(-4.1, 0.75, 0); cg.add(cr); fx.mesh(cg, (t, pr, f, w, o) => { const rec = t > tF ? Math.exp(-(t - tF) * 5) * 0 + Math.min(1, (t - tF) * 20) * Math.exp(-(t - tF) * 3) * 0.25 : 0; o.position.x = -rec; }, {});
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), mat('#1c1d20', 0.35, 0.9)); fx.mesh(ball, (t, pr, f, w, o) => { const p = path(t); o.position.set(p[0], p[1], p[2]); o.visible = t >= tF && t <= tL; }, {});
      fx.shake(tF, 0.4, 0.12); fx.flash(tF, 0.15, '#ffd8a0', 0.08);
      star(fx, { pos: [M[0] + 0.3, M[1] + 0.1, 0.2], t0: tF, dur: 0.22, r: [0.4, 2.0], arms: [[0, 1], [0.4, 0.55], [-0.4, 0.55], [1.2, 0.3], [-1.2, 0.3], [2.4, 0.5], [-2.4, 0.5], [3.14, 0.35]], valley: 0.12, c0: '#fff2dc', c1: '#ffb040', c2: '#c03010', intensity: 2.6 });
      fx.emitter({ count: 40, kind: 'soft', shape: 'point', pos: [M[0] + 0.1, M[1], 0], dir: [1, 0.3, 0], spread: 0.4, speed: [3, 8], life: [0.12, 0.3], size: [0.6, 1.3], ramp: [[0, '#fff0c0', 0.9], [0.3, '#ffa030', 0.7], [1, '#401', 0]], intensity: 0.8, delay: tF, emit: 0.05 });
      sparkE(fx, { count: 60, shape: 'point', pos: [M[0] + 0.3, M[1], 0], dir: [1, 0.2, 0], spread: 0.5, speed: [4, 13], life: [0.4, 0.7], delay: tF });
      smokeE(fx, { count: 70, shape: 'sphere', radius: 0.25, pos: [M[0] + 0.4, M[1] - 0.1, 0], dir: [1, 0.1, 0.2], spread: 0.9, radial: 0.3, speed: [0.6, 3.2], life: [2.2, 3.4], size: [1.2, 3.2], ramp: [[0, '#55504a', 0], [0.1, '#55504a', 0.6], [0.6, '#413e39', 0.4], [1, '#2e2a25', 0]], delay: tF + 0.03, emit: 0.4, drag: 1.0, rise: 0.5 });
      fx.light({ color: '#ffa850', intensity: 70, pos: [M[0] + 1, M[1] + 0.5, 1.5], range: 16, t0: tF, dur: 0.7, fade: [0.01, 0.5], norm: 100 });
      trailR(fx, { path, len: 0.9, n: 40, t0: tF, dur: tL - tF + 0.8, fade: [0, 0.6], blend: 'normal', width: (u) => 0.03 + 0.12 * (1 - u), intensity: 0.7, ramp: [[0, '#d0ccc4'], [1, '#6a645c']] });
      for (let i = 0; i < 9; i++) { const ts = tF + 0.05 + i * 0.26, p = path(ts); smokeE(fx, { count: 5, shape: 'sphere', radius: 0.06, pos: p, dir: [0, 0.3, 0], spread: 1.6, speed: [0.1, 0.5], life: [1.0, 1.8], size: [0.25, 0.7], delay: ts, emit: 0.05 }); }
      const I = [L[0], 0.1, L[2]]; // thud
      fx.ring({ t0: tL, dur: 0.5, r: [0.2, 2.2], width: [0.125, 0.025], normal: 'up', pos: I, intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [1, '#8a7a68']], decay: 1 });
      smokeE(fx, { count: 30, shape: 'disc', radius: 0.3, pos: I, dir: [0, 0.4, 0], spread: 1.4, radial: 0.9, speed: [0.8, 3], life: [0.8, 1.6], size: [0.5, 1.4], delay: tL, emit: 0.1 });
      fx.emitter({ count: 16, kind: 'rock', blend: 'normal', shape: 'disc', radius: 0.2, pos: I, dir: [0, 1, 0], spread: 0.9, speed: [2, 6], life: [0.8, 1.4], gravity: [0, -10, 0], size: [0.1, 0.06], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], lit: 1, bounce: 0.3, rot: 6, delay: tL, emit: 0.001 });
      burst(fx, I, tL, { ramp: [[0, '#fff2dc'], [0.4, '#d8c8b0'], [1, '#8a7a68']], col: '#ffb070' });
    } },

  { id: 'projectiles/energy-disc', name: 'Energy disc', category: 'projectiles', loop: true, duration: 0.5, stage: { sky: 'night', bloom: 0.6, view: FRONT },
    build(fx) {
      const u = { uSpin: { value: 0 }, uInt: { value: 1.1 } };
      const m = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.ShaderMaterial({ uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
        vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
        fragmentShader: `float sq(float x){return x*x;} float cube(float x){return x*x*x;} uniform float uSpin, uInt; varying vec2 vP; void main(){ float r=length(vP), a=atan(vP.y,vP.x); float N=12.; float x=fract(a*N/6.2831853+uSpin); float R=.7+.28*x*x; if(r>R) discard;
          float rim=smoothstep(R-.16,R,r); float edge=smoothstep(R-.03,R,r); float hole=smoothstep(.2,.26,r); float spokes=.5+.5*cos((a+uSpin*6.2831853/N)*6.); vec3 body=vec3(.05,.35,.5)*(.4+.6*spokes)*hole;
          vec3 c=body+vec3(.4,1.,1.2)*rim*rim*2.+vec3(1.)*edge*2.5+vec3(.2,.8,1.)*exp(-sq((r-.26)*14.))*1.5; gl_FragColor=vec4(c*uInt*hole,1.); }` }));
      m.position.set(0, 1.2, 0); m.scale.setScalar(0.5); m.rotation.set(0.5, -0.55, 0); fx.mesh(m, (t, pr, f, w, o) => { u.uSpin.value = pr * 3; }, {});
      fx.ribbon({ points: [[-2.4, 1.2, 0], [-0.3, 1.2, 0]], n: 14, width: (u2) => 0.2 * Math.pow(u2, 1.2), head: () => 1.001, tail: 1, intensity: 0.7, flicker: 0.4, ramp: [[0, '#bff'], [0.4, '#28b8ff'], [1, '#04306a']] });
      glow(fx, { pos: [0, 1.2, 0], size: 1.3, c0: '#8cf', c1: '#1070e0', intensity: 0.28, pulse: [0.05, 50] });
      fx.emitter({ count: 60, kind: 'spark', stretch: 1.6, shape: 'ring', radius: 0.42, pos: [0, 1.2, 0], rot3: [0.5, 0.55, 0], dir: [-1, 0, 0], radial: 0.7, spread: 0.6, speed: [2, 7], life: [0.15, 0.4], size: [0.06, 0.015], ramp: [[0, '#fff'], [0.4, '#6cf'], [1, '#04a', 0]], intensity: 4, emit: 0.5 });
      fx.light({ color: '#4ab0ff', intensity: 25, pos: [0, 1.5, 1.0], range: 6 });
    } },

  { id: 'projectiles/flare', name: 'Signal flare', category: 'projectiles', loop: false, duration: 5.0, stage: { sky: 'night', bloom: 0.55, view: { pos: [0.2, 1.8, 10], target: [0.8, 3.3, 0], fov: 46 } },
    build(fx) {
      const S = [-0.6, 0.2, 0], A = [0.9, 5.6, -0.5], tB = 1.3; const path = (t) => lerp3(S, A, 1 - Math.pow(1 - Math.min(1, Math.max(0, t) / tB), 1.6)); const wob = (t) => { const p = path(t); return [p[0] + 0.05 * Math.sin(t * 25), p[1], p[2]]; };
      glow(fx, { path: wob, size: 0.5, c0: '#fff', c1: '#ff3020', intensity: 1.5, flare: 0.3, t0: 0.05, dur: tB - 0.05, pulse: [0.15, 40], fade: [0, 0.05] });
      trailR(fx, { path: wob, len: 0.5, n: 36, t0: 0.05, dur: tB + 0.4, fade: [0, 0.35], width: (u) => 0.07 * u, intensity: 1.2, flicker: 0.5, ramp: [[0, '#fff2dc'], [0.3, '#ff8040'], [1, '#600']] });
      trailR(fx, { path: wob, len: 1.1, n: 40, t0: 0.05, dur: tB + 1.5, fade: [0, 1.2], blend: 'normal', width: (u) => 0.03 + 0.16 * (1 - u), intensity: 0.55, ramp: [[0, '#9a8a86'], [1, '#4a3c3a']] });
      fx.emitter({ count: 1, kind: 'soft', shape: 'point', pos: S, size: [0.3, 0.8], life: [0.3, 0.3], ramp: [[0, '#fff2dc'], [1, '#f50', 0]], intensity: 1.5, emit: 0.001, delay: 0.05 });
      sparkE(fx, { count: 30, shape: 'point', pos: S, dir: [0, 1, 0], spread: 0.5, speed: [2, 6], life: [0.3, 0.7], delay: 0.05, ramp: [[0, '#fff'], [0.4, '#ff6020'], [1, '#400', 0]] });
      smokeE(fx, { count: 24, shape: 'sphere', radius: 0.1, pos: S, dir: [0, 0.3, 0], spread: 1.5, speed: [0.3, 1.2], life: [1, 2.2], size: [0.4, 1.2], delay: 0.05, emit: 0.2 });
      const w0 = tB; fx.flash(w0, 0.25, '#ff5040', 0.08);
      glow(fx, { pos: A, size: (pr) => 0.5 + 2.4 * ease(pr * 8) * 0.6 + 1.2 * ease(pr * 8) * 0, c0: '#fff0e8', c1: '#ff2a20', intensity: 2.0, flare: 0.35, pulse: [0.12, 9], t0: w0, dur: 3.55, fade: [0, 0.8] });
      star(fx, { pos: A, t0: w0, dur: 0.3, r: [0.4, 3.2], arms: jag(fx, 12, 0.3, 1), valley: 0.1, c0: '#fff2dc', c1: '#ff6040', c2: '#a00800', intensity: 1.5 });
      fx.ring({ t0: w0, dur: 0.6, r: [0.2, 4.5], width: [0.3, 0.04], normal: 'cam', pos: A, intensity: 1.0, ramp: [[0, '#fff2dc'], [0.4, '#ff6050'], [1, '#800']] });
      fx.emitter({ count: 90, kind: 'spark', stretch: 1.4, shape: 'sphere', radius: 0.1, pos: A, dir: [0, 1, 0], spread: 3.1, speed: [1, 6], life: [0.8, 2.2], size: [0.06, 0.015], gravity: [0, -1.5, 0], drag: 1.2, ramp: [[0, '#fff'], [0.3, '#ff7050'], [1, '#600', 0]], intensity: 1.5, delay: w0, emit: 0.05 });
      fx.emitter({ count: 70, kind: 'spark', stretch: 1.2, shape: 'sphere', radius: 0.15, pos: A, dir: [0, -1, 0], spread: 1.2, speed: [0.3, 1.4], life: [1.0, 2.2], size: [0.05, 0.012], gravity: [0, -0.8, 0], drag: 0.6, ramp: [[0, '#ffe0d0'], [0.4, '#ff4030'], [1, '#500', 0]], intensity: 1.5, delay: w0 + 0.3, emit: 2.4 });
      smokeE(fx, { count: 40, shape: 'sphere', radius: 0.3, pos: A, dir: [0, -0.3, 0], spread: 3, speed: [0.1, 0.6], life: [2.5, 3.5], size: [0.8, 2.2], delay: w0 + 0.2, emit: 1.5, ramp: [[0, '#5b4e4d', 0], [0.2, '#4e3c3b', 0.2], [1, '#211816', 0]], lit: 1, rise: -0.2 });
      follow(fx, fx.light({ color: '#ff3a28', intensity: 35, pos: [A[0], A[1] - 0.5, A[2] + 1.2], range: 22, t0: 0.05, dur: 4.85, fade: [0.05, 0.9], norm: 100, flicker: 0.18, rate: 14 }), (t) => wob(Math.min(t, w0)));
      fx.decal({ kind: 'glow', t0: w0, dur: 3.6, r: [3, 6], pos: [A[0], 0.005, 0], fade: [0.3, 1.0], intensity: 0.5, ramp: [[0, '#100'], [0.5, '#a01008'], [1, '#ff6050']] });
    } },

  { id: 'projectiles/homing-missile', name: 'Homing missile', category: 'projectiles', tier: 2, loop: false, duration: 3.8, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [0.4, 2.4, 11.5], target: [0.4, 1.7, 0], fov: 40 } },
    build(fx) {
      const P0 = [-4.2, 0.6, 0.4], P1 = [-1.5, 5.6, 1.4], P2 = [3.8, 1.15, 0], t0 = 0.2, t1 = 2.75;
      const path = (t) => bez(P0, P1, P2, Math.pow(Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), 0.85));
      const ms = rocketModel(0.7, 0.05); fx.mesh(ms, (t, pr, f, w, o) => { const p = path(t); o.position.set(p[0], p[1], p[2]); orient(o, path, Math.min(t, t1 - 0.02)); o.visible = t >= t0 && t < t1; }, {});
      const tg = new Target(); tg.position.set(3.9, 0, 0); fx.mesh(tg, (t, pr, f, w, o) => { if (t > t1) { const s = t - t1; o.position.set(3.9 + 1.6 * (1 - Math.exp(-s * 2)), 0.3 * Math.sin(Math.min(s, 0.9) * 3.5), 0.4 * s); o.rotation.set(s * 1.5, s * 2, -s * 2.4); o.visible = s < 1.1; } else { o.position.set(3.9, 0, 0); o.rotation.set(0, 0, 0); } }, {});
      glow(fx, { path: (t) => { const p = path(t), q = path(t - 0.02); return [p[0] + (q[0] - p[0]) * 3.5, p[1] + (q[1] - p[1]) * 3.5, p[2] + (q[2] - p[2]) * 3.5]; }, size: 0.7, c0: '#fff4d0', c1: '#ff7020', intensity: 1.6, t0, dur: t1 - t0, pulse: [0.2, 50] });
      trailR(fx, { path, len: 0.35, n: 36, t0, dur: t1 - t0 + 0.2, fade: [0, 0.2], width: (u) => 0.07 * u, intensity: 1.2, flicker: 0.5, ramp: [[0, '#fff2dc'], [0.3, '#ffa040'], [1, '#600']] });
      follow(fx, fx.light({ color: '#ff9040', intensity: 35, pos: P0, range: 7, t0, dur: t1 - t0, fade: [0.05, 0.02] }), path);
      trailR(fx, { path, len: 1.4, n: 50, t0, dur: t1 - t0 + 1.0, fade: [0, 0.9], blend: 'normal', width: (u) => 0.04 + 0.22 * (1 - u), intensity: 0.5, ramp: [[0, '#c8c4bc'], [1, '#5a544c']] });
      for (let i = 0; i < 9; i++) { const ts = t0 + i * 0.27, p = path(ts); smokeE(fx, { count: 5, shape: 'sphere', radius: 0.05, pos: p, dir: [0, 0.2, 0], spread: 1.6, speed: [0.1, 0.5], life: [1.0, 1.8], size: [0.3, 0.8], delay: ts, emit: 0.05 }); }
      const E = [3.7, 1.0, 0.1];
      fx.flash(t1, 0.25, '#ffe0b0', 0.08);
      fx.orb({ t0: t1, dur: 0.8, r: [0.3, 1.5], ease: 'out', kind: 'fire', intensity: 0.9, ramp: [[0, '#200'], [0.3, '#c21'], [0.6, '#f70'], [0.85, '#fc4'], [1, '#fff']], pos: E, fade: [0, 0.44], noise: 1.8, scroll: 2.5, disp: 0.55 });
      fx.ring({ t0: t1, dur: 0.7, r: [0.3, 5], width: [0.2, 0.04], normal: 'up', pos: [E[0], 0.02, 0], intensity: 0.3, fill: 0, ramp: [[0, '#fff2dc'], [0.4, '#fc9'], [1, '#a50']] });
      fx.emitter({ count: 60, kind: 'flame', shape: 'sphere', radius: 0.35, pos: [E[0], 0.7, 0], dir: [0, 1, 0], spread: 0.9, speed: [1, 3.6], life: [0.5, 1.2], size: [1.0, 2.0], ramp: fx.pal([[0, '#ffe9b0', 0.9], [0.2, '#ff9a30', 0.85], [0.55, '#c8300a', 0.5], [1, '#200', 0]]), intensity: 0.45, drag: 1.1, gravity: [0, 2, 0], turb: [0.3, 1.2], delay: t1 });
      smokeE(fx, { count: 70, shape: 'sphere', radius: 0.5, pos: [E[0], 0.8, 0], dir: [0, 1, 0], spread: 0.8, speed: [0.6, 2.4], life: [1.6, 3], size: [1.0, 3.4], ramp: [[0, '#3a3128', 0], [0.12, '#2f2822', 0.75], [0.6, '#1c1916', 0.5], [1, '#0e0d0c', 0]], delay: t1 + 0.08, emit: 0.4, drag: 0.9, rise: 0.8 });
      sparkE(fx, { count: 60, shape: 'sphere', radius: 0.15, pos: [E[0], 0.5, 0], dir: [0, 1, 0], spread: 1.5, speed: [3, 11], life: [0.5, 0.7], delay: t1, bounce: 0.35 });
      fx.emitter({ count: 20, kind: 'rock', blend: 'normal', shape: 'sphere', radius: 0.2, pos: [E[0], 0.2, 0], dir: [0, 1, 0], spread: 1.0, speed: [3, 8], life: [1.2, 2.2], gravity: [0, -9.8, 0], size: [0.15, 0.1], ramp: [[0, '#6c5a48'], [1, '#6c5a48', 1]], lit: 1, bounce: 0.3, rot: 6, delay: t1 });
      fx.decal({ kind: 'scorch', t0: t1, dur: 1.05, r: [1.8, 2.4], pos: [E[0], 0.004, 0], fade: [0.1, 0.8], heat: [1, 0], ramp: [[0, '#1a1410'], [0.5, '#f40'], [1, '#fc8']] });
      burst(fx, E, t1, { ground: true, ramp: [[0, '#fff2dc'], [0.4, '#ffa040'], [1, '#a50']], col: '#ffa040' });
    } },

  { id: 'projectiles/laser-bolt', name: 'Laser bolt', category: 'projectiles', loop: true, duration: 0.5, stage: { sky: 'night', bloom: 0.65, view: FRONT },
    build(fx) {
      fx.beam({ from: [-0.55, 1.2, 0], to: [0.55, 1.2, 0], r: [0.03, 0.03], intensity: 0.6, noise: 0.2, speed: 8, pulse: 0.1, edge: 1.6, endFade: 0.35, ramp: [[0, '#ffb0a0'], [0.4, '#ff3040'], [1, '#a00010']] });
      fx.beam({ from: [-0.45, 1.2, 0], to: [0.45, 1.2, 0], r: [0.012, 0.012], intensity: 1.1, noise: 0, endFade: 0.3, ramp: [[0, '#fff2dc'], [1, '#fff']] });
      fx.ribbon({ points: [[-3.0, 1.2, 0], [-0.5, 1.2, 0]], n: 18, width: (u) => 0.05 * Math.pow(u, 1.3), head: () => 1.001, tail: 1, intensity: 1.2, flicker: 0.7, ramp: [[0, '#ffb0a0'], [0.4, '#ff2030'], [1, '#400008']] });
      glow(fx, { pos: [0.5, 1.2, 0], size: 0.45, c0: '#ffd0c8', c1: '#ff2030', intensity: 0.7, flare: 0.3, pulse: [0.08, 60] });
      fx.emitter({ count: 30, kind: 'spark', stretch: 1.6, shape: 'line', shapeSize: [0.4, 0, 0], pos: [-0.4, 1.2, 0], dir: [-1, 0, 0], spread: 1.2, radial: 0, speed: [0.5, 2.5], life: [0.15, 0.35], size: [0.05, 0.01], ramp: [[0, '#fff'], [0.4, '#ff5060'], [1, '#600', 0]], intensity: 3.5, emit: 0.5 });
      fx.emitter({ count: 30, kind: 'streak', stretch: 3, shape: 'box', shapeSize: [2.4, 0.6, 0.6], pos: [0, 1.2, 0], dir: [-1, 0, 0], spread: 0.02, speed: [10, 15], life: [0.2, 0.3], size: [0.5, 0.35], ramp: [[0, '#f88', 0], [0.2, '#f88', 0.3], [1, '#f00', 0]], intensity: 0.5, emit: 0.5 });
      fx.light({ color: '#ff2040', intensity: 25, pos: [0, 1.4, 0.7], range: 7 });
    } },

  { id: 'projectiles/magic-missile', name: 'Magic missile', category: 'projectiles', tier: 1, loop: false, duration: 1.9, stage: { sky: 'night', bloom: 0.6, view: { pos: [0.3, 1.5, 7.2], target: [0, 1.2, 0] } },
    build(fx) {
      const S = [-3.4, 0.9, 0.2], E = [3.1, 1.5, 0], t0 = 0.15, t1 = 1.3, W = (t, ph) => { const k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))), p = lerp3(S, E, k * k * (3 - 2 * k) * 0.35 + k * 0.65); return [p[0], p[1] + 0.55 * Math.sin(k * 9 + ph) * (1 - 0.5 * k) + 0.25 * Math.sin(k * 21), p[2] + 0.5 * Math.sin(k * 7 + 1.2 + ph) * (1 - k * 0.6)]; };
      const path = (t) => W(t, 0), p2 = (t) => { const p = W(t, 0), k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); const a = 18 * k; return [p[0], p[1] + 0.14 * Math.sin(a * 2 + t * 30), p[2] + 0.14 * Math.cos(a * 2 + t * 30)]; }, p3 = (t) => { const p = W(t, 0), k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return [p[0], p[1] + 0.14 * Math.sin(t * 30 + 3.14), p[2] + 0.14 * Math.cos(t * 30 + 3.14)]; };
      glow(fx, { path, size: 0.65, c0: '#f0e8ff', c1: '#9a50ff', intensity: 1.8, flare: 0.35, pulse: [0.12, 45], t0, dur: t1 - t0, fade: [0.05, 0.02] });
      trailR(fx, { path, len: 0.5, n: 44, t0, dur: t1 - t0 + 0.5, fade: [0.02, 0.4], width: (u) => 0.08 * u, intensity: 1.2, ramp: [[0, '#f0e8ff'], [0.3, '#c090ff'], [1, '#3a1080']] });
      trailR(fx, { path: p2, len: 0.45, n: 44, t0, dur: t1 - t0 + 0.45, fade: [0.02, 0.4], width: (u) => 0.025 * u, intensity: 1.2, ramp: [[0, '#f0e8ff'], [0.3, '#ff90ff'], [1, '#601090']] });
      trailR(fx, { path: p3, len: 0.45, n: 44, t0, dur: t1 - t0 + 0.45, fade: [0.02, 0.4], width: (u) => 0.025 * u, intensity: 1.2, ramp: [[0, '#f0e8ff'], [0.3, '#90b0ff'], [1, '#102090']] });
      follow(fx, fx.light({ color: '#9a60ff', intensity: 12, pos: [0, 1.6, 1.5], range: 9, t0, dur: t1 - t0 + 0.5, fade: [0.05, 0.4], norm: 40 }), (t) => path(Math.min(t, t1)));
      star(fx, { pos: E, t0: t1, dur: 0.4, r: [0.3, 2.0], arms: jag(fx, 10, 0.4, 1), valley: 0.1, c0: '#f0e8ff', c1: '#c090ff', c2: '#4010a0', intensity: 1.5, spin: 0.3 });
      fx.ring({ t0: t1, dur: 0.55, r: [0.1, 2.4], width: [0.2, 0.03], normal: 'cam', pos: E, intensity: 1.0, ramp: [[0, '#f0e8ff'], [0.5, '#b080ff'], [1, '#4010a0']] });
      fx.emitter({ count: 60, kind: 'spark', stretch: 1.4, shape: 'sphere', radius: 0.05, pos: E, dir: [0, 1, 0], spread: 3.1, speed: [1.5, 7], life: [0.5, 0.7], size: [0.06, 0.015], gravity: [0, -1, 0], drag: 1.0, ramp: [[0, '#fff'], [0.35, '#b070ff'], [1, '#301080', 0]], intensity: 3.5, delay: t1 });
      fx.emitter({ count: 16, kind: 'glint', shape: 'sphere', radius: 0.7, pos: E, size: [0.4, 0.1], life: [0.3, 0.7], ramp: [[0, '#fff'], [1, '#c090ff', 0]], intensity: 3, delay: t1 + 0.02, emit: 0.3 });
      burst(fx, E, t1, { ramp: [[0, '#f0e8ff'], [0.5, '#b080ff'], [1, '#4010a0']], col: '#a060ff', dir: [1, 0, 0] });
    } },

  { id: 'projectiles/muzzle-pistol', name: 'Pistol shot', category: 'projectiles', tier: 1, loop: false, duration: 1.8, stage: { sky: 'dusk', bloom: 0.45, view: { pos: [0.6, 1.35, 1.6], target: [0.22, 1.2, 0] } },
    build(fx) {
      const gun = new THREE.Group(); const dark = mat('#26282c', 0.35, 0.9); const slide = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.05, 0.032), dark); slide.position.set(0, 0.02, 0); gun.add(slide); const frame = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.03), mat('#3a3d42', 0.5, 0.6)); frame.position.set(-0.01, -0.02, 0); gun.add(frame);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.032), mat('#1c1d20', 0.7, 0.2)); grip.position.set(-0.07, -0.1, 0); grip.rotation.z = 0.2; gun.add(grip); const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.05, 10), dark); rotX(bar, Math.PI / 2); bar.position.set(0.14, 0.02, 0); gun.add(bar);
      const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.07, 6, 10), mat('#8d939c', 0.5)); hand.position.set(-0.08, -0.12, 0.0); gun.add(hand); const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.5, 6, 10), mat('#8d939c', 0.5)); arm.rotation.z = Math.PI / 2 - 0.15; arm.position.set(-0.36, -0.15, 0); gun.add(arm);
      const M = [0.2, 1.22, 0]; gun.position.set(0, 1.2, 0); const tf = 0.08;
      fx.mesh(gun, (t, pr, f, w, o) => { const r = t > tf ? Math.exp(-(t - tf) * 22) * Math.min(1, (t - tf) * 60) : 0; o.position.set(-0.05 * r, 1.2 + 0.015 * r, 0); o.rotation.z = 0.12 * r; slide.position.x = -0.045 * r; }, {});
      star(fx, { pos: [M[0] + 0.12, M[1], 0.03], t0: tf, dur: 0.09, r: [0.3, 1.1], arms: [[0, 1], [0.35, 0.6], [-0.35, 0.6], [0.8, 0.38], [-0.8, 0.38], [1.5, 0.3], [-1.5, 0.3], [2.5, 0.25], [-2.5, 0.25], [3.14, 0.3]], valley: 0.14, c0: '#fff2dc', c1: '#ffc050', c2: '#d04010', intensity: 2.8, fade: [0, 0.05] });
      fx.emitter({ count: 14, kind: 'soft', shape: 'point', pos: [M[0] + 0.05, M[1], 0.02], dir: [1, 0.05, 0], spread: 0.3, speed: [2, 6], life: [0.06, 0.12], size: [0.12, 0.3], ramp: [[0, '#fff0c0', 0.9], [0.4, '#ff9a30', 0.7], [1, '#400', 0]], intensity: 0.6, delay: tf, emit: 0.01 });
      sparkE(fx, { count: 30, shape: 'point', pos: [M[0] + 0.1, M[1], 0.02], dir: [1, 0.15, 0.3], spread: 0.5, speed: [3, 9], life: [0.2, 0.6], delay: tf });
      smokeE(fx, { count: 22, shape: 'sphere', radius: 0.03, pos: [M[0] + 0.08, M[1], 0], dir: [1, 0.3, 0.1], spread: 0.8, speed: [0.3, 1.6], life: [0.9, 1.7], size: [0.12, 0.5], delay: tf + 0.02, emit: 0.1, drag: 1.6, ramp: [[0, '#55504c', 0], [0.12, '#4c4843', 0.5], [1, '#292521', 0]] });
      const cas = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.019, 8), mat('#c89b3c', 0.3, 1)); const pt = new THREE.Vector3(); fx.mesh(cas, (t, pr, f, w, o) => { if (t < tf) { o.visible = false; return; } ballistic(t - tf, [0.06, 1.25, 0.02], [-0.5, 2.6, 1.7], 0.01, 0.4, pt); o.position.copy(pt); o.rotation.set((t - tf) * 22, (t - tf) * 14, (t - tf) * 9); o.visible = true; }, {});
      burst(fx, [M[0] + 0.12, M[1], 0.03], tf, { ground: false, dust: false, ramp: [[0, '#fff2dc'], [0.5, '#ffc050'], [1, '#d04010']], col: '#ffb860', dir: [1, 0, 0] });
    } },

  { id: 'projectiles/muzzle-shotgun', name: 'Shotgun blast', category: 'projectiles', tier: 1, loop: false, duration: 3.2, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [1.2, 1.55, 3.4], target: [0.8, 1.2, 0] } },
    build(fx) {
      const gun = new THREE.Group(); const dark = mat('#222428', 0.35, 0.9), wood = mat('#6a4428', 0.7); const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 12), dark); rotX(barrel, Math.PI / 2); barrel.position.set(0.15, 0.02, 0); gun.add(barrel);
      const mag = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.6, 10), dark); rotX(mag, Math.PI / 2); mag.position.set(0.05, -0.02, 0); gun.add(mag); const pump = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 0.05), wood); pump.position.set(0.12, -0.04, 0); gun.add(pump);
      const rec = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), dark); rec.position.set(-0.25, 0.01, 0); gun.add(rec); const stock = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.035), wood); stock.position.set(-0.52, -0.02, 0); stock.rotation.z = -0.12; gun.add(stock);
      const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.08, 6, 10), mat('#8d939c', 0.5)); hand.position.set(0.1, -0.1, 0.0); gun.add(hand);
      const M = [0.62, 1.22, 0], tf = 0.12; fx.mesh(gun, (t, pr, f, w, o) => { const r = t > tf ? Math.exp(-(t - tf) * 9) * Math.min(1, (t - tf) * 50) : 0; o.position.set(0.2 - 0.12 * r, 1.2 + 0.05 * r, 0); o.rotation.z = 0.12 * r; }, {});
      star(fx, { pos: [M[0] + 0.3, M[1], 0.05], t0: tf, dur: 0.12, r: [0.4, 1.7], arms: [[0, 1], [0.3, 0.7], [-0.3, 0.7], [0.65, 0.5], [-0.65, 0.5], [1.1, 0.32], [-1.1, 0.32], [2.4, 0.3], [-2.4, 0.3], [3.14, 0.28]], valley: 0.16, c0: '#fff2dc', c1: '#ffb040', c2: '#c03010', intensity: 2.8, fade: [0, 0.06] });
      fx.emitter({ count: 40, kind: 'soft', shape: 'point', pos: [M[0] + 0.05, M[1], 0], dir: [1, 0.05, 0], spread: 0.45, speed: [3, 9], life: [0.1, 0.25], size: [0.25, 0.6], ramp: [[0, '#fff0c0', 0.9], [0.3, '#ff9a30', 0.7], [1, '#400', 0]], intensity: 0.6, delay: tf, emit: 0.03 });
      for (let i = 0; i < 14; i++) { const a = (fx.rng() - 0.5) * 0.5, b = (fx.rng() - 0.5) * 0.5, L = 3.2 + fx.rng() * 1.2; fx.ribbon({ points: [[M[0] + 0.1, M[1], 0], [M[0] + 0.1 + L, M[1] + a * L, b * L]], n: 8, width: (u) => 0.01 * (0.4 + u), sweep: [-0.3, 1.5], ease: 'out', tail: 0.45, t0: tf, dur: 0.18 + fx.rng() * 0.05, intensity: 1.2, ramp: [[0, '#fff2dc'], [0.5, '#ffd890'], [1, '#c05010']] }); }
      sparkE(fx, { count: 60, shape: 'point', pos: [M[0] + 0.15, M[1], 0], dir: [1, 0.1, 0.1], spread: 0.6, speed: [4, 12], life: [0.3, 0.7], delay: tf });
      smokeE(fx, { count: 70, shape: 'sphere', radius: 0.08, pos: [M[0] + 0.1, M[1], 0], dir: [1, 0.25, 0.1], spread: 0.9, speed: [0.5, 3.6], life: [2.0, 3.0], size: [0.3, 1.6], delay: tf + 0.02, emit: 0.35, drag: 1.4, rise: 0.4, ramp: [[0, '#55504c', 0], [0.12, '#45413d', 0.55], [0.6, '#35322e', 0.35], [1, '#1d1a17', 0]] });
      const cas = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 10), mat('#b8342c', 0.5)); const pt = new THREE.Vector3(); fx.mesh(cas, (t, pr, f, w, o) => { const s = t - tf - 0.25; if (s < 0) { o.visible = false; return; } ballistic(s, [0.35, 1.28, 0.03], [-0.6, 2.4, 1.8], 0.025, 0.35, pt); o.position.copy(pt); o.rotation.set(s * 18, s * 10, s * 7); o.visible = true; }, {});
      burst(fx, [M[0] + 0.3, M[1], 0.05], tf, { ground: false, ramp: [[0, '#fff2dc'], [0.5, '#ffb040'], [1, '#c03010']], col: '#ffb050', dir: [1, 0, 0] });
    } },

  { id: 'projectiles/muzzle-smg', name: 'SMG burst', category: 'projectiles', loop: true, duration: 1.0, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [0.8, 1.4, 2.3], target: [0.3, 1.2, 0] } },
    build(fx) {
      const gun = new THREE.Group(); const dark = mat('#222428', 0.35, 0.9); const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.07, 0.045), dark); gun.add(body); const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 10), dark); rotX(bar, Math.PI / 2); bar.position.set(0.28, 0.01, 0); gun.add(bar);
      const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.2, 0.035), mat('#2a2c30', 0.5, 0.6)); mag.position.set(0.02, -0.13, 0); gun.add(mag); const grip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.035), mat('#1c1d20', 0.7)); grip.position.set(-0.1, -0.09, 0); grip.rotation.z = 0.25; gun.add(grip);
      const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.02), dark); stock.position.set(-0.3, 0.01, 0); gun.add(stock); const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.06, 6, 10), mat('#8d939c', 0.5)); hand.position.set(-0.1, -0.15, 0.01); gun.add(hand);
      const D = 1.0, N = 12, M = [0.5, 1.21, 0]; fx.mesh(gun, (t, pr, f, w, o) => { const ph = (t * N) % 1, k = Math.exp(-ph * 9); o.position.set(0.1 - 0.02 * k, 1.2 + 0.006 * k, 0); o.rotation.z = 0.025 * k; }, {});
      for (let i = 0; i < N; i++) { const t0 = i / N + 0.01, ang = (fx.rng() - 0.5) * 0.3; star(fx, { pos: [M[0] + 0.1, M[1], 0.03], t0, dur: 0.045, r: [0.25 + fx.rng() * 0.1, 0.7 + fx.rng() * 0.3], rot: ang, arms: [[0, 1], [0.35, 0.55], [-0.35, 0.55], [0.8, 0.35], [-0.8, 0.35], [1.6, 0.25], [-1.6, 0.25], [2.6, 0.22], [-2.6, 0.22], [3.14, 0.3]], valley: 0.14, c0: '#fff2dc', c1: '#ffc050', c2: '#d04010', intensity: 2.4, fade: [0, 0.03] }); }
      for (let i = 0; i < N; i++) { const t0 = i / N; fx.light({ color: '#ffb860', intensity: 25, pos: [1.0, 1.5, 1.0], range: 6, t0, dur: 0.06, fade: [0.002, 0.04], norm: 40, main: i === 0 }); }
      sparkE(fx, { count: 60, shape: 'point', pos: [M[0] + 0.1, M[1], 0.02], dir: [1, 0.1, 0.3], spread: 0.5, speed: [3, 9], life: [0.15, 0.45], size: [0.05, 0.015], emit: D * 0.98 });
      smokeE(fx, { count: 28, shape: 'sphere', radius: 0.04, pos: [M[0] + 0.1, M[1], 0], dir: [1, 0.3, 0.1], spread: 0.8, speed: [0.3, 1.6], life: [0.8, 1.4], size: [0.12, 0.5], emit: D, drag: 1.6, ramp: [[0, '#55504c', 0], [0.12, '#4c4843', 0.4], [1, '#292521', 0]] });
      fx.emitter({ count: N, kind: 'shard', shape: 'point', pos: [0.15, 1.27, 0.02], dir: [-0.3, 1, 0.9], spread: 0.35, speed: [1.6, 2.6], life: [0.45, 0.5], gravity: [0, -9.8, 0], size: [0.03, 0.025], ramp: [[0, '#d8a840'], [1, '#d8a840', 1]], blend: 'normal', lit: 1, rot: 14, emit: D * 0.98 });
    } },

  { id: 'projectiles/plasma-shot', name: 'Plasma shot', category: 'projectiles', loop: true, duration: 0.8, stage: { sky: 'night', bloom: 0.65, view: FRONT },
    build(fx) {
      fx.orb({ kind: 'plasma', r: [0.24, 0.24], pos: [0, 1.2, 0], noise: 3, scroll: 2.4, disp: 0.3, intensity: 0.9, power: 2, pulse: [0.06, 7.85], ramp: [[0, '#021'], [0.35, '#087a50'], [0.75, '#30d890'], [1, '#b8ffe0']] });
      glow(fx, { pos: [0, 1.2, 0], size: 1.3, c0: '#a8ffd8', c1: '#10c880', intensity: 0.3, pulse: [0.08, 15.7] });
      fx.ribbon({ points: [[-2.2, 1.2, 0], [-0.2, 1.2, 0]], n: 14, width: (u) => 0.22 * Math.pow(u, 1.3), head: () => 1.001, tail: 1, intensity: 1.2, flicker: 0.4, ramp: [[0, '#d8fff0'], [0.4, '#20d890'], [1, '#064030']] });
      fx.emitter({ count: 26, kind: 'drop', shape: 'sphere', radius: 0.12, pos: [-0.15, 1.2, 0], dir: [-1, 0, 0], spread: 0.45, speed: [1.5, 4.5], life: [0.4, 0.8], size: [0.1, 0.03], drag: 0.8, gravity: [0, -1.2, 0], ramp: [[0, '#d8fff0'], [0.4, '#30e8a0'], [1, '#064030', 0]], intensity: 1.5, emit: 0.8, aspect: 1.2 });
      fx.emitter({ count: 30, kind: 'spark', stretch: 1.4, shape: 'sphere', radius: 0.2, pos: [0, 1.2, 0], dir: [-1, 0, 0], spread: 1.6, speed: [0.5, 3], life: [0.2, 0.5], size: [0.05, 0.012], ramp: [[0, '#fff'], [0.4, '#40ffb0'], [1, '#064030', 0]], intensity: 3.5, emit: 0.8 });
      fx.emitter({ count: 36, kind: 'streak', stretch: 3, shape: 'box', shapeSize: [2.4, 0.6, 0.6], pos: [0, 1.2, 0], dir: [-1, 0, 0], spread: 0.02, speed: [9, 14], life: [0.2, 0.35], size: [0.5, 0.35], ramp: [[0, '#8fc', 0], [0.2, '#8fc', 0.3], [1, '#0a6', 0]], intensity: 0.5, emit: 0.8 });
      fx.light({ color: '#30ffa8', intensity: 25, pos: [0, 1.4, 0.8], range: 7 });
    } },

  { id: 'projectiles/rocket', name: 'Rocket', category: 'projectiles', loop: true, duration: 1.2, stage: { sky: 'dusk', bloom: 0.5, view: { pos: [0.5, 1.5, 3.8], target: [-0.3, 1.2, 0] } },
    build(fx) {
      const r = rocketModel(0.65, 0.065); fx.mesh(r, (t, pr, f, w, o, tAbs) => { o.position.set(0, 1.2 + 0.008 * Math.sin(tAbs * 5.236 * 2), 0); o.rotation.set(0.05 * Math.sin(tAbs * 5.236 * 3), 0.03 * Math.sin(tAbs * 5.236 * 2), 0.03 * Math.sin(tAbs * 5.236)); }, {});
      const N0 = [-0.36, 1.2, 0];
      fx.ribbon({ points: [[-1.15, 1.2, 0], [-0.34, 1.2, 0]], n: 14, width: (u) => 0.1 * Math.pow(u, 0.7), head: () => 1.001, tail: 1, intensity: 1.2, flicker: 0.6, ramp: [[0, '#fff4d0'], [0.3, '#ffb040'], [0.7, '#e03a10'], [1, '#400']] });
      fx.emitter({ count: 50, kind: 'soft', shape: 'point', pos: N0, dir: [-1, 0, 0], spread: 0.12, speed: [2, 5], life: [0.1, 0.28], size: [0.3, 0.12], ramp: [[0, '#fff2dc', 0.9], [0.3, '#ffb040', 0.7], [1, '#e03a10', 0]], intensity: 1.0, emit: 1.2 });
      glow(fx, { pos: [-0.38, 1.2, 0], size: 0.5, c0: '#fff2dc', c1: '#ff8030', intensity: 0.9, pulse: [0.15, 50] });
      fx.emitter({ count: 110, kind: 'smoke', blend: 'normal', lit: 1, order: -1, shape: 'sphere', radius: 0.05, pos: [N0[0] - 0.1, 1.2, 0], dir: [-1, 0.05, 0], spread: 0.2, speed: [3, 5], life: [0.8, 1.2], size: [0.2, 0.8], ramp: [[0, '#54514c', 0], [0.1, '#54514c', 0.65], [1, '#23201c', 0]], turb: [0.15, 1.0], drag: 0.2, gravity: [0, 0.2, 0], emit: 1.2 });
      sparkE(fx, { count: 60, shape: 'point', pos: N0, dir: [-1, 0.1, 0], spread: 0.5, speed: [2, 8], life: [0.2, 0.55], emit: 1.2, size: [0.045, 0.012], gravity: [0, -3, 0], bounce: -1 });
      fx.emitter({ count: 40, kind: 'streak', stretch: 3, shape: 'box', shapeSize: [2.4, 0.7, 0.7], pos: [0, 1.2, 0], dir: [-1, 0, 0], spread: 0.02, speed: [9, 14], life: [0.2, 0.35], size: [0.5, 0.35], ramp: [[0, '#fff2dc', 0], [0.2, '#ffe8d0', 0.4], [1, '#f80', 0]], intensity: 0.5, emit: 1.2 });
      fx.light({ color: '#ff9040', intensity: 25, pos: [-0.8, 1.3, 0.8], range: 7, flicker: 0.25, rate: 25, norm: 40 });
    } },
];
