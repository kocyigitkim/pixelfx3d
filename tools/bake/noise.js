// Tiling noise bake (one pass, 512^2 RGBA8). Every channel repeats over uv in [0,1).
// R = fbm (base 4x4), G = Worley F1 (8x8 cells), B = crack lines (F2-F1), A = streaks (fbm base 4x1).
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
const FRAG = `precision highp float;
varying vec2 vUv;
uniform vec2 uOff;
float h2(vec2 c){ vec3 p3=fract(vec3(c.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
// Lattice indices wrap with mod(per): the value repeats every uv period 1.
float vnoise(vec2 p, vec2 per){
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float a=h2(mod(i,per)+uOff), b=h2(mod(i+vec2(1.,0.),per)+uOff);
  float c=h2(mod(i+vec2(0.,1.),per)+uOff), d=h2(mod(i+vec2(1.,1.),per)+uOff);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
// 5 octaves, lattice doubles per octave so every octave tiles. Normalized to ~0..1.
float fbm(vec2 uv, vec2 base){
  float s=0., a=.5, n=0.;
  for(int i=0;i<5;i++){ vec2 per=base*exp2(float(i)); s+=a*vnoise(uv*per,per); n+=a; a*=.5; }
  return s/n;
}
vec2 jit(vec2 w){ return vec2(h2(w+uOff), h2(w+uOff+vec2(37.7,91.3))); }
// Periodic Worley over 8x8 cells: returns F1, F2 (cell units).
vec2 worley(vec2 uv){
  vec2 p=uv*8., ci=floor(p); float f1=9., f2=9.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 c=ci+vec2(float(x),float(y)); vec2 pt=c+jit(mod(c,8.));
    float d=length(p-pt);
    if(d<f1){ f2=f1; f1=d; } else if(d<f2){ f2=d; }
  }
  return vec2(f1,f2);
}
void main(){
  vec2 F=worley(vUv);
  float r=fbm(vUv, vec2(4.,4.));
  float g=clamp(F.x*1.4,0.,1.);
  float b=clamp(1.-(F.y-F.x)*10.,0.,1.);
  float a=fbm(vUv, vec2(4.,1.));
  gl_FragColor=vec4(r,g,b,a);
}`;

export const toB64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

export function bakeNoise(renderer, seed) {
  const W = 512;
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uOff: { value: new THREE.Vector2((seed * 13.7) % 101, (seed * 7.3) % 103) } },
  });
  const quad = new FullScreenQuad(mat);
  const rt = new THREE.WebGLRenderTarget(W, W, { format: THREE.RGBAFormat, type: THREE.UnsignedByteType, depthBuffer: false });
  renderer.setRenderTarget(rt);
  quad.render(renderer);
  renderer.setRenderTarget(null);
  const px = new Uint8Array(W * W * 4);
  renderer.readRenderTargetPixels(rt, 0, 0, W, W, px);
  rt.dispose(); quad.dispose(); mat.dispose();
  return {
    files: [{ name: 'noise', w: W, h: W, b64: toB64(px) }],
    meta: { file: 'noise.png', size: W, channels: 'fbm,worleyF1,worleyEdge,streak' },
  };
}
