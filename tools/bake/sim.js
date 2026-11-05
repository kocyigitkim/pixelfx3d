import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { makeRng } from '../../src/core/rng.js';
import { NOISE } from '../../src/core/glsl.js';
import { layout, makeField, makeTarget, FLAT_GLSL } from './flat3d.js';

// Stable-fluids sim in the flat layout. V = velocity xyz, S = (rho, T, fuel, 0).
const VERT = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
const HEAD = FLAT_GLSL + NOISE;
const GUARD = 'if (v.z >= uN) { gl_FragColor = vec4(0.); return; }';
const SHAPE = { sphere: 0, disc: 1, points: 2, box: 3 };
const v3 = (a) => new THREE.Vector3(...(a || [0, 0, 0]));

export class Sim {
  constructor(renderer, preset, seed) {
    this.r = renderer; this.p = preset; this.t = 0;
    const L = layout(preset.N), s = preset.src, rng = makeRng(seed);
    // shortcut: 'points' centres are jittered inside a 0.03 cube around src.c, no other spread
    const pts = Array.from({ length: 40 }, () => s.type === 'points'
      ? v3(s.c).add(new THREE.Vector3(rng.range(-.03, .03), rng.range(-.03, .03), rng.range(-.03, .03))) : new THREE.Vector3());
    this.U = {
      uN: { value: L.N }, uTiles: { value: L.tiles }, uRes: { value: new THREE.Vector2(L.w, L.h) },
      uDt: { value: 1 / 60 }, uOn: { value: 0 }, uSeed: { value: seed },
      uShape: { value: SHAPE[s.type] }, uR: { value: s.r || 0 }, uRho: { value: s.rho || 0 }, uTemp: { value: s.T || 0 },
      uFuel: { value: s.fuel || 0 }, uVr: { value: s.vr || 0 }, uVy: { value: s.vy || 0 },
      uC: { value: v3(s.c) }, uMn: { value: v3(s.min) }, uMx: { value: v3(s.max) }, uV: { value: v3(s.v) }, uPts: { value: pts },
      uHeat: { value: preset.heat }, uSoot: { value: preset.soot }, uCool: { value: preset.cool }, uFade: { value: preset.fade },
      uAlpha: { value: preset.alpha }, uBeta: { value: preset.beta }, uEps: { value: preset.eps },
      tVel: { value: null }, tF: { value: null }, tS: { value: null }, tV: { value: null }, tW: { value: null }, tD: { value: null }, tP: { value: null },
    };
    this.V = makeField(renderer, L.N); this.S = makeField(renderer, L.N); this.P = makeField(renderer, L.N);
    this.W = makeTarget(L.N); this.D = makeTarget(L.N);
    const mat = (frag) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: HEAD + frag, uniforms: this.U });
    // Shape test: returns 1 inside the source, writes the injected velocity to vel.
    const shape = `
uniform float uShape, uR, uRho, uTemp, uFuel, uVr, uVy, uSeed, uOn;
uniform vec3 uC, uMn, uMx, uV;
uniform vec3 uPts[40];
float shapeIn(vec3 p, out vec3 vel){
  vel = vec3(0.);
  if (uShape < .5) { vec3 d = p - uC; vel = uVr * d / max(length(d), 1e-5); return step(length(d), uR); }
  if (uShape < 1.5) { vec3 d = p - uC; vel = vec3(0., uVy, 0.); return step(length(d.xz), uR) * step(abs(d.y), 1.5 / uN); }
  if (uShape < 2.5) {
    float w = 0.;
    for (int i = 0; i < 40; i++) { vec3 d = p - uPts[i]; if (length(d) < max(uR, 1. / uN)) { w = 1.; vel = uVr * d / max(length(d), 1e-5); } }
    return w;
  }
  vec3 a = step(uMn, p) * step(p, uMx); vel = uV; return a.x * a.y * a.z;
}`;
    const adv = `uniform sampler2D tVel, tF; uniform float uDt;
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN;
  vec3 q = clamp(p - uDt * sample3(tVel, p).xyz, 0., 1.);
  gl_FragColor = sample3(tF, q);
}`;
    const injS = `uniform sampler2D tS;${shape}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN, vel;
  float k = shapeIn(p, vel) * uOn;
  vec4 s = texture2D(tS, gl_FragCoord.xy / uRes);
  float n = .7 + .6 * hash13(p * uN + uSeed);
  gl_FragColor = vec4(s.r + k * uRho * n, s.g + k * uTemp, s.b + k * uFuel, 0.);
}`;
    const injV = `uniform sampler2D tV;${shape}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN, vel;
  float k = shapeIn(p, vel) * uOn;
  vec4 v0 = texture2D(tV, gl_FragCoord.xy / uRes);
  gl_FragColor = vec4(mix(v0.xyz, vel, k), 0.);
}`;
    const burn = `uniform sampler2D tS; uniform float uDt, uHeat, uSoot;
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec4 s = texture2D(tS, gl_FragCoord.xy / uRes);
  float b = s.g > .25 ? min(s.b, 4. * uDt) : 0.;
  gl_FragColor = vec4(s.r + uSoot * b, s.g + uHeat * b, s.b - b, 0.);
}`;
    const cool = `uniform sampler2D tS; uniform float uDt, uCool, uFade;
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec4 s = texture2D(tS, gl_FragCoord.xy / uRes);
  gl_FragColor = vec4(s.r * exp(-uFade * uDt), s.g * exp(-uCool * uDt), s.b, 0.);
}`;
    // Central difference of a texture at p along unit axis a (uses sample3 at p ± h; clamped at the domain edge).
    const DIFF = `vec4 dif(sampler2D t, vec3 p, vec3 a, float h){ return (sample3(t, p + a * h) - sample3(t, p - a * h)) / (2. * h); }`;
    const curl = `uniform sampler2D tV;${DIFF}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN; float h = 1. / uN;
  vec3 dx = dif(tV, p, vec3(1., 0., 0.), h).xyz, dy = dif(tV, p, vec3(0., 1., 0.), h).xyz, dz = dif(tV, p, vec3(0., 0., 1.), h).xyz;
  vec3 w = vec3(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x);
  gl_FragColor = vec4(w, length(w));
}`;
    const force = `uniform sampler2D tV, tW, tS; uniform float uDt, uAlpha, uBeta, uEps;${DIFF}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN; float h = 1. / uN;
  vec3 g = vec3(dif(tW, p, vec3(1., 0., 0.), h).w, dif(tW, p, vec3(0., 1., 0.), h).w, dif(tW, p, vec3(0., 0., 1.), h).w);
  vec3 n = g / max(length(g), 1e-5);
  vec3 w = texture2D(tW, gl_FragCoord.xy / uRes).xyz;
  vec4 s = texture2D(tS, gl_FragCoord.xy / uRes);
  vec3 vel = texture2D(tV, gl_FragCoord.xy / uRes).xyz;
  gl_FragColor = vec4(vel + uDt * ((uAlpha * s.g - uBeta * s.r) * vec3(0., 1., 0.) + uEps * h * cross(n, w)), 0.);
}`;
    const div = `uniform sampler2D tV;${DIFF}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN; float h = 1. / uN;
  gl_FragColor = vec4(dif(tV, p, vec3(1., 0., 0.), h).x + dif(tV, p, vec3(0., 1., 0.), h).y + dif(tV, p, vec3(0., 0., 1.), h).z, 0., 0., 0.);
}`;
    // One Jacobi sweep of lap(P) = D; P starts at 0 (cleared each step).
    const jac = `uniform sampler2D tP, tD;
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN; float h = 1. / uN;
  float s = sample3(tP, p + vec3(h, 0., 0.)).x + sample3(tP, p - vec3(h, 0., 0.)).x
          + sample3(tP, p + vec3(0., h, 0.)).x + sample3(tP, p - vec3(0., h, 0.)).x
          + sample3(tP, p + vec3(0., 0., h)).x + sample3(tP, p - vec3(0., 0., h)).x;
  float d = texture2D(tD, gl_FragCoord.xy / uRes).x;
  gl_FragColor = vec4((s - d * sq(h)) / 6., 0., 0., 0.);
}`;
    // Subtract grad P; zero the wall voxels (1 voxel on every face except top).
    const proj = `uniform sampler2D tV, tP;${DIFF}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN; float h = 1. / uN;
  vec3 g = vec3(dif(tP, p, vec3(1., 0., 0.), h).x, dif(tP, p, vec3(0., 1., 0.), h).x, dif(tP, p, vec3(0., 0., 1.), h).x);
  vec3 u = texture2D(tV, gl_FragCoord.xy / uRes).xyz - g;
  bool wall = p.x < h || p.x > 1. - h || p.z < h || p.z > 1. - h || p.y < h;
  gl_FragColor = vec4(wall ? vec3(0.) : u, 0.);
}`;
    this.mAdv = mat(adv); this.mInjS = mat(injS); this.mInjV = mat(injV); this.mBurn = mat(burn); this.mCool = mat(cool);
    this.mCurl = mat(curl); this.mForce = mat(force); this.mDiv = mat(div); this.mJac = mat(jac); this.mProj = mat(proj);
    this.q = new FullScreenQuad(this.mAdv);
  }

  draw(m, rt) {
    this.q.material = m; this.r.setRenderTarget(rt); this.q.render(this.r); this.r.setRenderTarget(null);
  }

  pass(m, f) { this.draw(m, f.write); f.swap(); }

  divergence() { this.U.tV.value = this.V.read.texture; this.draw(this.mDiv, this.D); }

  step() {
    const { U, V, S, W, D, P } = this;
    U.uOn.value = this.t < this.p.src.t ? 1 : 0;
    U.tVel.value = U.tF.value = V.read.texture; this.pass(this.mAdv, V);          // 1 advect V by V
    U.tVel.value = V.read.texture; U.tF.value = S.read.texture; this.pass(this.mAdv, S); // 2 advect S
    U.tS.value = S.read.texture; this.pass(this.mInjS, S);                        // 3 inject S
    U.tV.value = V.read.texture; this.pass(this.mInjV, V);                        // 3 inject V
    U.tS.value = S.read.texture; this.pass(this.mBurn, S);                        // 4 combustion
    U.tV.value = V.read.texture; this.draw(this.mCurl, W);                        // 5 curl W = (ω, |ω|)
    U.tW.value = W.texture; U.tS.value = S.read.texture; U.tV.value = V.read.texture; this.pass(this.mForce, V); // 6 buoyancy + confinement
    this.divergence();                                                            // 7 D = div V
    this.r.setRenderTarget(P.read); this.r.clear(); this.r.setRenderTarget(null); // P = 0
    U.tD.value = D.texture;
    for (let i = 0; i < 24; i++) { U.tP.value = P.read.texture; this.pass(this.mJac, P); } // 8 Jacobi
    U.tV.value = V.read.texture; U.tP.value = P.read.texture; this.pass(this.mProj, V);    // 9 project
    U.tS.value = S.read.texture; this.pass(this.mCool, S);                        // 10 cooling and fade
    this.t += U.uDt.value;
  }

  dispose() {
    for (const f of [this.V, this.S, this.P]) { f.read.dispose(); f.write.dispose(); }
    this.W.dispose(); this.D.dispose();
    for (const m of [this.mAdv, this.mInjS, this.mInjV, this.mBurn, this.mCool, this.mCurl, this.mForce, this.mDiv, this.mJac, this.mProj]) m.dispose();
    this.q.dispose();
  }
}
