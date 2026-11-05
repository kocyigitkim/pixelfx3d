// Parametric surfaces (swirls, slashes, shock bands) and Erode: a surface prim with UV-scrolled noise erosion.
import * as THREE from 'three';
import { SU, DEPTH } from './glsl.js';
import { makeRamp } from './emitter.js';
import { lerp } from './rng.js';
import { Prim, bl } from './prims.js';

const TAU = Math.PI * 2, N = 64, M = 4; // default u / v segments

/** f(u,v) → [x,y,z] on a (nu+1)×(nv+1) grid; uv = (u, v). */
export function surface(nu, nv, f) {
  const pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const u = i / nu, v = j / nv; pos.push(...f(u, v)); uv.push(u, v); }
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}
export function spiral({ turns = 2, r0 = 0.5, r1 = 0.5, h = 2, w = 0.15 } = {}) {
  return surface(Math.ceil(turns * N), M, (u, v) => { const a = u * turns * TAU, r = lerp(r0, r1, u) + (v - 0.5) * w; return [r * Math.cos(a), h * u, r * Math.sin(a)]; });
}
export function cone({ r0 = 0, r1 = 0.5, h = 1 } = {}) {
  return surface(N, M, (u, v) => { const a = u * TAU, r = lerp(r0, r1, v); return [r * Math.cos(a), h * v, r * Math.sin(a)]; });
}
export function arc({ R = 1, a0 = 0, a1 = Math.PI, w = 0.3, tilt = 0, thick = 0 } = {}) {
  const c = Math.cos(tilt), s = Math.sin(tilt);
  return surface(N, M, (u, v) => { const a = lerp(a0, a1, u), r = R + (v - 0.5) * w, z = r * Math.sin(a), y = thick * Math.sin(Math.PI * v); return [r * Math.cos(a), y * c - z * s, y * s + z * c]; }); // shortcut: thick is a cross-section bulge, not a true offset shell
}
export function slash({ R = 1, a0 = -0.6, a1 = 0.6, w = 0.4, curl = 0.3 } = {}) {
  return surface(N, M, (u, v) => { const a = lerp(a0, a1, u), s = Math.sin(Math.PI * u), r = R + (v - 0.5) * w * s; return [r * Math.cos(a), curl * s * (v - 0.5), r * Math.sin(a)]; });
}
export function ringSheet({ r0 = 0.5, r1 = 1 } = {}) {
  return surface(N, M, (u, v) => { const a = u * TAU, r = lerp(r0, r1, v); return [r * Math.cos(a), 0, r * Math.sin(a)]; });
}
export function band({ r = 1, h = 0.4 } = {}) {
  return surface(N, M, (u, v) => { const a = u * TAU; return [r * Math.cos(a), h * v, r * Math.sin(a)]; });
}

/* ------------------------------------------------------------------ ERODE (eroding UV-scrolled surface) */
const ERODE_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const ERODE_F = `${DEPTH}
uniform sampler2D tNoise, uRamp; uniform float uA, uPr, uInt, uTime, uSeed, uE0, uE1, uHead, uSoft, uChan, uFade; uniform vec2 uTile, uScroll; varying vec2 vUv;
void main(){ float ph=uTime; vec2 tuv=vUv*uTile+uScroll*ph+uSeed*.37;
  float n = uChan>.5 ? texture2D(tNoise,tuv).a : texture2D(tNoise,tuv).r;
  float e=mix(uE0,uE1,uPr*uFade); float mask=sin(vUv.y*3.14159);
  float head = uHead<0. ? 0. : smoothstep(uHead-.15,uHead,vUv.x)*step(vUv.x,uHead);
  float a=smoothstep(e,e+uSoft,n*mask)*uA*softF(uSoft*.5)*(1.-uFade*uPr*uPr);
  vec3 col=texture2D(uRamp,vec2(clamp(n*mask,0.,1.),.5)).rgb*uInt*(1.+3.*head);
  gl_FragColor=vec4(col*a,a); }`;
export class Erode extends Prim {
  constructor(fx, p) {
    super(fx, p); const e = p.erode ?? [0, 1];
    this.u = { uA: { value: 1 }, uPr: { value: 0 }, uInt: { value: p.intensity ?? 1.5 }, uRamp: { value: makeRamp(p.ramp || [[0, '#fff'], [0.5, '#9cf'], [1, '#26c']]) }, uTile: { value: new THREE.Vector2(...(p.tile ?? [4, 1])) }, uScroll: { value: new THREE.Vector2(...(p.scroll ?? [2, 0])) },
      uE0: { value: e[0] }, uE1: { value: e[1] }, uFade: { value: p.lifeFade ?? (this.dur >= fx.duration ? 0 : 1) }, uHead: { value: -1 }, uSoft: { value: p.soft ?? 0.2 }, uSeed: { value: this.seed }, uTime: { value: 0 }, uChan: { value: p.channel === 'a' ? 1 : 0 }, ...SU };
    const o = new THREE.Mesh(p.geo, new THREE.ShaderMaterial({ vertexShader: ERODE_V, fragmentShader: ERODE_F, uniforms: this.u, ...bl(p.blend !== 'normal'), side: THREE.DoubleSide }));
    o.renderOrder = 25; if (p.rot3) o.rotation.set(...p.rot3); if (p.scale) o.scale.setScalar(p.scale); this.place(o);
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; const p = this.p, pr = this.prog(t);
    this.u.uA.value = w * (p.alpha ?? 1); this.u.uPr.value = pr; this.u.uTime.value = tAbs; if (p.head) this.u.uHead.value = lerp(p.head[0], p.head[1], pr);
  }
}
