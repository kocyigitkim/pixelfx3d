import * as THREE from 'three';
// Flat 3D layout: N slices tiled in a 2D half-float target (docs/PLAN4.md §3).
export function layout(N) {
  const tiles = N === 128 ? 16 : 12;
  return { N, tiles, w: tiles * N, h: Math.ceil(N / tiles) * N };
}
export function makeTarget(N) {
  const { w, h } = layout(N);
  const opt = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping };
  return new THREE.WebGLRenderTarget(w, h, opt);
}
export function makeField(renderer, N) {
  const f = { read: makeTarget(N), write: makeTarget(N) };
  renderer.setClearColor(0x000000, 0);
  for (const rt of [f.read, f.write]) { renderer.setRenderTarget(rt); renderer.clear(); }
  renderer.setRenderTarget(null);
  f.swap = function () { [this.read, this.write] = [this.write, this.read]; };
  return f;
}
export const FLAT_GLSL = /* glsl */ `
uniform float uN, uTiles; uniform vec2 uRes;
// uv of texel (v.xy, slice z); v.xy must be inside [0, N-1]
vec2 sliceUV(vec3 v, float z){
  vec2 tile = vec2(mod(z, uTiles), floor(z / uTiles));
  return (tile * uN + v.xy + .5) / uRes;
}
// trilinear lookup at domain point p in [0,1]^3; xy bilinear comes from the hardware filter (clamped inside the tile)
vec4 sample3(sampler2D t, vec3 p){
  vec3 q = p * uN - .5;
  float z0 = floor(q.z), fz = q.z - z0, z1 = min(z0 + 1., uN - 1.);
  vec2 xy = clamp(q.xy, vec2(0.), vec2(uN - 1.));
  return mix(texture2D(t, sliceUV(vec3(xy, 0.), clamp(z0, 0., uN - 1.))), texture2D(t, sliceUV(vec3(xy, 0.), z1)), fz);
}
// voxel index (x, y, slice) of a pixel; integer valued
vec3 voxelOf(vec2 fc){
  vec2 tile = floor(fc / uN);
  return vec3(floor(mod(fc, uN)), tile.x + tile.y * uTiles);
}
// domain position (0..1) of the voxel centre under a pixel
vec3 domainOf(vec2 fc){ return (voxelOf(fc) + .5) / uN; }
`;
