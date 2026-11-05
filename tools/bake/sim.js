import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { makeRng } from '../../src/core/rng.js';
import { NOISE } from '../../src/core/glsl.js';
import { layout, makeField, makeTarget, FLAT_GLSL } from './flat3d.js';

// Stable-fluids sim in the flat layout. V = velocity xyz, S = (rho, T, fuel, 0).
const VERT = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
// s3o: open top (outflow), anything sampled above the last voxel centre is 0.
// curlN: divergence-free eddies from 3 value-noise fbm potentials (2 octaves), central differences at eps = 2h.
const HEAD = FLAT_GLSL + NOISE + `
uniform float uSeed, uFreq;
vec4 s3o(sampler2D t, vec3 p){ return p.y > 1. - .5 / uN ? vec4(0.) : sample3(t, p); }
float fb2(vec3 p){ return vnoise(p) + .5 * vnoise(p * 2. + vec3(1.7, 9.2, 3.1)); }
vec3 pot(vec3 p){ return vec3(fb2(p), fb2(p + vec3(31.4, -7.1, 11.3)), fb2(p + vec3(-19.7, 23.9, 5.5))); }
vec3 curlN(vec3 p, float t){
  p += vec3(fract(uSeed * .618) * 50., 0., t * .5);
  float e = 2. * uFreq / uN;
  vec3 dx = pot(p + vec3(e, 0., 0.)) - pot(p - vec3(e, 0., 0.));
  vec3 dy = pot(p + vec3(0., e, 0.)) - pot(p - vec3(0., e, 0.));
  vec3 dz = pot(p + vec3(0., 0., e)) - pot(p - vec3(0., 0., e));
  return vec3(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x) / (2. * e);
}`;
const GUARD = 'if (v.z >= uN) { gl_FragColor = vec4(0.); return; }';
const SHAPE = { sphere: 0, disc: 1, points: 2, box: 3 };
const v3 = (a) => new THREE.Vector3(...(a || [0, 0, 0]));

export class Sim {
  constructor(renderer, preset, seed) {
    this.r = renderer; this.p = preset; this.t = 0; this.n = 0;
    const L = layout(preset.N), s = preset.src, rng = makeRng(seed);
    // shortcut: 'points' centres are jittered inside a ±spread cube around src.c (default .03), no other distribution
    const j = s.spread ?? .03;
    const pts = Array.from({ length: 40 }, () => s.type === 'points'
      ? v3(s.c).add(new THREE.Vector3(rng.range(-j, j), rng.range(-j, j), rng.range(-j, j))) : new THREE.Vector3());
    this.U = {
      uN: { value: L.N }, uTiles: { value: L.tiles }, uRes: { value: new THREE.Vector2(L.w, L.h) },
      uDt: { value: 1 / 60 }, uOn: { value: 0 }, uSeed: { value: seed },
      uShape: { value: SHAPE[s.type] }, uR: { value: s.r || 0 }, uRho: { value: s.rho || 0 }, uTemp: { value: s.T || 0 },
      uFuel: { value: s.fuel || 0 }, uVr: { value: s.vr || 0 }, uVy: { value: s.vy || 0 },
      uC: { value: v3(s.c) }, uMn: { value: v3(s.min) }, uMx: { value: v3(s.max) }, uV: { value: v3(s.v) }, uPts: { value: pts },
      uHeat: { value: preset.heat }, uTurb: { value: preset.turb ?? 0 }, uFreq: { value: preset.freq ?? 4 }, uT: { value: 0 }, uJit: { value: s.jit ?? s.vr ?? s.vy ?? 2 }, uSoot: { value: preset.soot }, uCool: { value: preset.cool }, uFade: { value: preset.fade },
      uAlpha: { value: preset.alpha }, uBeta: { value: preset.beta }, uEps: { value: preset.eps },
      tVel: { value: null }, tF: { value: null }, tS: { value: null }, tV: { value: null }, tW: { value: null }, tD: { value: null }, tP: { value: null },
    };
    this.V = makeField(renderer, L.N); this.S = makeField(renderer, L.N); this.P = makeField(renderer, L.N);
    this.W = makeTarget(L.N); this.D = makeTarget(L.N);
    const mat = (frag) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: HEAD + frag, uniforms: this.U });
    // Shape test: returns 1 inside the source, writes the injected velocity to vel.
    const shape = `
uniform float uShape, uR, uRho, uTemp, uFuel, uVr, uVy, uOn, uJit, uT;
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
    // MacCormack: forward trace q, backward trace of the forward result, half-error correction,
    // clamped to the 8 voxels around q (no new extrema). y may leave the top (outflow).
    const adv = (sponge) => `uniform sampler2D tVel, tF; uniform float uDt;
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN, lo = vec3(0.), hi = vec3(1., 2., 1.), u = sample3(tVel, p).xyz;
  vec3 q = clamp(p - uDt * u, lo, hi), r = clamp(p + uDt * u, lo, hi);
  vec4 f = s3o(tF, q);
  f += .5 * (texture2D(tF, gl_FragCoord.xy / uRes) - s3o(tF, clamp(r - uDt * sample3(tVel, r).xyz, lo, hi)));
  vec3 c = floor(q * uN - .5); vec4 mn = vec4(1e9), mx = vec4(-1e9);
  for (int i = 0; i < 8; i++) {
    float k = float(i);
    vec4 s = s3o(tF, (c + vec3(mod(k, 2.), mod(floor(k / 2.), 2.), floor(k / 4.)) + .5) / uN);
    mn = min(mn, s); mx = max(mx, s);
  }
  f = clamp(f, mn, mx);
  ${sponge ? `vec3 e = min(p, 1. - p);
  f.rgb *= (1. - smoothstep(.88, 1., p.y)) * smoothstep(0., .04, min(e.x, e.z)); // sponge: top + absorbing sides` : ''}
  gl_FragColor = f;
}`;
    const injS = `uniform sampler2D tS;${shape}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN, vel;
  float k = shapeIn(p, vel) * uOn;
  vec4 s = texture2D(tS, gl_FragCoord.xy / uRes);
  float n = .3 + 1.4 * vnoise(p * 14. + uSeed);
  gl_FragColor = vec4(s.r + k * uRho * n, s.g + k * uTemp, s.b + k * uFuel, 0.);
}`;
    const injV = `uniform sampler2D tV;${shape}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN, vel;
  float k = shapeIn(p, vel) * uOn;
  vec4 v0 = texture2D(tV, gl_FragCoord.xy / uRes);
  vel += .6 * uJit * curlN(p * uFreq, uT);
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
    const force = `uniform sampler2D tV, tW, tS; uniform float uDt, uAlpha, uBeta, uEps, uTurb, uT;${DIFF}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN; float h = 1. / uN;
  vec3 g = vec3(dif(tW, p, vec3(1., 0., 0.), h).w, dif(tW, p, vec3(0., 1., 0.), h).w, dif(tW, p, vec3(0., 0., 1.), h).w);
  vec3 n = g / max(length(g), 1e-5);
  vec3 w = texture2D(tW, gl_FragCoord.xy / uRes).xyz;
  vec4 s = texture2D(tS, gl_FragCoord.xy / uRes);
  vec3 vel = texture2D(tV, gl_FragCoord.xy / uRes).xyz;
  // eddies only where there is smoke/heat/fuel, so the empty air is not stirred up
  vec3 tu = curlN(p * uFreq + vec3(0., -uT * .3, 0.), uT) * smoothstep(0., .3, s.r + s.g + s.b);
  gl_FragColor = vec4(vel + uDt * ((uAlpha * s.g - uBeta * s.r) * vec3(0., 1., 0.) + uEps * h * cross(n, w) + uTurb * tu), 0.);
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
          + s3o(tP, p + vec3(0., h, 0.)).x + sample3(tP, p - vec3(0., h, 0.)).x
          + sample3(tP, p + vec3(0., 0., h)).x + sample3(tP, p - vec3(0., 0., h)).x;
  float d = texture2D(tD, gl_FragCoord.xy / uRes).x;
  gl_FragColor = vec4((s - d * sq(h)) / 6., 0., 0., 0.);
}`;
    // Subtract grad P; zero the wall voxels (1 voxel on every face except top).
    const proj = `uniform sampler2D tV, tP;${DIFF}
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy); ${GUARD}
  vec3 p = (v + .5) / uN; float h = 1. / uN;
  vec3 g = vec3(dif(tP, p, vec3(1., 0., 0.), h).x, (s3o(tP, p + vec3(0., h, 0.)).x - sample3(tP, p - vec3(0., h, 0.)).x) / (2. * h), dif(tP, p, vec3(0., 0., 1.), h).x);
  vec3 u = texture2D(tV, gl_FragCoord.xy / uRes).xyz - g;
  bool wall = p.x < h || p.x > 1. - h || p.z < h || p.z > 1. - h || p.y < h;
  gl_FragColor = vec4(wall ? vec3(0.) : u, 0.);
}`;
    this.mAdv = mat(adv(false)); this.mAdvS = mat(adv(true)); this.mInjS = mat(injS); this.mInjV = mat(injV); this.mBurn = mat(burn); this.mCool = mat(cool);
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
    const rp = this.p.src.ramp, x = rp ? Math.min(this.t / rp, 1) : 1;
    U.uOn.value = this.t < this.p.src.t ? x * x * (3 - 2 * x) : 0; // src.ramp: smoothstep fade-in (s) U.uT.value = this.n / 60; // step-indexed time (seconds)
    U.tVel.value = U.tF.value = V.read.texture; this.pass(this.mAdv, V);          // 1 advect V by V
    U.tVel.value = V.read.texture; U.tF.value = S.read.texture; this.pass(this.mAdvS, S); // 2 advect S
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
    this.t += U.uDt.value; this.n++;
  }

  dispose() {
    for (const f of [this.V, this.S, this.P]) { f.read.dispose(); f.write.dispose(); }
    this.W.dispose(); this.D.dispose();
    for (const m of [this.mAdv, this.mAdvS, this.mInjS, this.mInjV, this.mBurn, this.mCool, this.mCurl, this.mForce, this.mDiv, this.mJac, this.mProj]) m.dispose();
    this.q.dispose();
  }
}
