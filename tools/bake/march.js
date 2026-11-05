import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { layout, makeTarget, FLAT_GLSL } from './flat3d.js';
import { Sim } from './sim.js';
import { toB64 } from './noise.js';

// Shadow volumes and orthographic raymarch for one preset (docs/PLAN4.md §3, S4).
const VERT = 'void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }';
const LUM = 'vec3(.2126, .7152, .0722)';
// fireRamp: the six FIRE stops of src/fx/fire.js (hex to 0..1), piecewise linear over T.
const RAMP = /* glsl */ `
vec3 fireRamp(float t){
  t = clamp(t, 0., 1.);
  vec3 c = mix(vec3(1., .953, .863), vec3(1., .761, .478), clamp(t / .15, 0., 1.));
  c = mix(c, vec3(1., .604, .196), clamp((t - .15) / .2, 0., 1.));
  c = mix(c, vec3(.886, .314, .059), clamp((t - .35) / .25, 0., 1.));
  c = mix(c, vec3(.353, .102, .031), clamp((t - .6) / .25, 0., 1.));
  return mix(c, vec3(.078, .024, .016), clamp((t - .85) / .15, 0., 1.));
}`;
// Per voxel: T_d for d = uSgn * axis, 16 taps at 2k·h. Density outside the cube is 0.
const SHADOW = /* glsl */ `uniform sampler2D tS; uniform float uSig; uniform vec3 uSgn;
${FLAT_GLSL}
float rhoAt(vec3 q){ vec3 i = step(vec3(0.), q) * step(q, vec3(1.)); return sample3(tS, q).r * i.x * i.y * i.z; }
void main(){
  vec3 v = voxelOf(gl_FragCoord.xy);
  if (v.z >= uN) { gl_FragColor = vec4(0.); return; }
  vec3 p = (v + .5) / uN; float h = 1. / uN;
  vec3 tau = vec3(0.);
  for (int j = 0; j < 3; j++) {
    vec3 e = vec3(float(j == 0), float(j == 1), float(j == 2));
    vec3 d = uSgn * e; float s = 0.;
    for (int k = 1; k <= 16; k++) s += rhoAt(p + d * (2. * float(k) * h));
    tau += e * exp(-uSig * s * 2. * h);
  }
  gl_FragColor = vec4(tau, 1.);
}`;
// Front to back along -z (camera at +z). N samples, dz = h. isB: emissive output.
const march = (N, isB) => /* glsl */ `uniform sampler2D tS, tL; uniform float uSig, uEmax, uF; uniform vec2 uOrig;
${FLAT_GLSL}
${RAMP}
void main(){
  vec2 uv = (gl_FragCoord.xy - uOrig) / uF;
  float dz = 1. / uN, Tv = 1., E = 0.; vec3 C = vec3(0.);
  for (int i = 0; i < ${N}; i++) {
    vec3 p = vec3(uv, 1. - (float(i) + .5) / uN);
    vec3 e3 = min(p, 1. - p);
    float edge = min(min(e3.x, e3.y), e3.z);
    vec4 s = sample3(tS, p);
    float rho = s.r * smoothstep(0., 4. / uN, edge);
    float a = 1. - exp(-uSig * rho * dz);
    C += Tv * a * .9 * sample3(tL, p).xyz;
    ${isB ? `E += Tv * dot(fireRamp(s.g), ${LUM}) * uSig * rho * dz;` : ''}
    Tv *= 1. - a;
  }
  float alpha = 1. - Tv;
  vec3 rgb = alpha < 2. / 255. ? vec3(.5) : C / max(alpha, 1e-3);
  gl_FragColor = vec4(rgb, ${isB ? 'clamp(E / uEmax, 0., 1.)' : 'alpha'});
}`;

function makeShadow(preset, sim) {
  const L = layout(preset.N), F = preset.atlas / 8, sig = 24 * (preset.densityScale ?? 1);
  const U = { uN: { value: L.N }, uTiles: { value: L.tiles }, uRes: { value: new THREE.Vector2(L.w, L.h) } };
  const mk = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, uniforms, blending: THREE.NoBlending, depthTest: false, depthWrite: false });
  const tS = { value: null }, uSig = { value: sig };
  const sh = { plus: makeTarget(preset.N), minus: makeTarget(preset.N), quad: new FullScreenQuad(null), tS, sig, sim };
  sh.mP = mk(SHADOW, { ...U, tS, uSig, uSgn: { value: new THREE.Vector3(1, 1, 1) } });
  sh.mM = mk(SHADOW, { ...U, tS, uSig, uSgn: { value: new THREE.Vector3(-1, -1, -1) } });
  const M = { ...U, tS, uSig, uF: { value: F }, uOrig: { value: new THREE.Vector2() } };
  sh.M = M;
  sh.mA = mk(march(preset.N, false), { ...M, tL: { value: null }, uEmax: { value: 1 } });
  sh.mB = mk(march(preset.N, true), { ...M, tL: { value: null }, uEmax: { value: preset.emissive ? 4 : 1 } });
  return sh;
}

// Renders TL+ (+x,+y,+z) and TL- (-x,-y,-z) for the current sim state. Returns the shadow object.
export function shadowPass(renderer, sim, preset) {
  if (!sim.shadow) sim.shadow = makeShadow(preset, sim);
  const sh = sim.shadow;
  sh.tS.value = sim.S.read.texture;
  sh.quad.material = sh.mP; renderer.setRenderTarget(sh.plus); sh.quad.render(renderer);
  sh.quad.material = sh.mM; renderer.setRenderTarget(sh.minus); sh.quad.render(renderer);
  renderer.setRenderTarget(null);
  return sh;
}

// Renders one frame into tile tileIdx of targetA (+x,+y,+z weights) and targetB (-x,-y,-z weights, emissive alpha).
export function renderFrame(renderer, sim, preset, tileIdx, targetA, targetB, shadow) {
  const sh = shadow, F = preset.atlas / 8;
  const x = (tileIdx % 8) * F, y = (7 - Math.floor(tileIdx / 8)) * F;
  sh.M.tS.value = sim.S.read.texture;
  sh.M.uOrig.value.set(x, y);
  sh.mA.uniforms.tL.value = sh.plus.texture;
  sh.mB.uniforms.tL.value = sh.minus.texture;
  const pass = (mat, rt) => {
    sh.quad.material = mat; renderer.setRenderTarget(rt);
    renderer.setViewport(x, y, F, F); renderer.setScissor(x, y, F, F); renderer.setScissorTest(true);
    sh.quad.render(renderer);
  };
  pass(sh.mA, targetA); pass(sh.mB, targetB);
  renderer.setScissorTest(false); renderer.setRenderTarget(null);
}

export function bakePreset(renderer, name, preset, seed) {
  const t0 = performance.now(), atlas = preset.atlas, emax = preset.emissive ? 4 : 1;
  const sim = new Sim(renderer, preset, seed);
  const opt = { type: THREE.UnsignedByteType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  const A = new THREE.WebGLRenderTarget(atlas, atlas, opt), B = new THREE.WebGLRenderTarget(atlas, atlas, opt);
  const steps = Math.round(preset.sec * 60);
  let f = 0;
  for (let i = 1; i <= steps; i++) {
    sim.step();
    // frame k is captured after substep floor((k+1)*steps/64), so the 64 frames span the whole sim
    if (f < 64 && i === Math.floor((f + 1) * steps / 64)) { const sh = shadowPass(renderer, sim, preset); renderFrame(renderer, sim, preset, f++, A, B, sh); }
  }
  const bufA = new Uint8Array(atlas * atlas * 4), bufB = new Uint8Array(atlas * atlas * 4);
  renderer.readRenderTargetPixels(A, 0, 0, atlas, atlas, bufA);
  renderer.readRenderTargetPixels(B, 0, 0, atlas, atlas, bufB);
  const ms = Math.round(performance.now() - t0);
  const sh = sim.shadow;
  if (sh) { sh.plus.dispose(); sh.minus.dispose(); sh.quad.dispose(); for (const m of [sh.mP, sh.mM, sh.mA, sh.mB]) m.dispose(); }
  sim.dispose(); A.dispose(); B.dispose();
  return {
    files: [{ name: `${name}_a`, w: atlas, h: atlas, b64: toB64(bufA) }, { name: `${name}_b`, w: atlas, h: atlas, b64: toB64(bufB) }],
    meta: { size: atlas, grid: [8, 8], frames: 64, seconds: preset.sec, a: `${name}_a.png`, b: `${name}_b.png`, emissive: !!preset.emissive, emax, framePow: preset.framePow, loop: false, ms },
  };
}
