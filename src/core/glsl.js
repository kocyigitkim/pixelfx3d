import * as THREE from 'three';
// Shared GLSL chunks.
export const NOISE = /* glsl */ `float sq(float x){return x*x;} float cube(float x){return x*x*x;}
float hash11(float p){ p=fract(p*.1031); p*=p+33.33; p*=p+p; return fract(p); }
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float hash13(vec3 p3){ p3=fract(p3*.1031); p3+=dot(p3,p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
vec3 hash33(vec3 p3){ p3=fract(p3*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yxz+33.33); return fract((p3.xxy+p3.yxx)*p3.zyx); }
float vnoise(vec3 x){
  vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash13(i),hash13(i+vec3(1,0,0)),f.x),mix(hash13(i+vec3(0,1,0)),hash13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash13(i+vec3(0,0,1)),hash13(i+vec3(1,0,1)),f.x),mix(hash13(i+vec3(0,1,1)),hash13(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vnoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }
float fbm3(vec3 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; } return s; }
// voronoi: returns (F1, F2-F1)
vec2 voronoi(vec3 p){
  vec3 i=floor(p), f=fract(p); float d1=8., d2=8.;
  for(int x=-1;x<=1;x++) for(int y=-1;y<=1;y++) for(int z=-1;z<=1;z++){
    vec3 g=vec3(float(x),float(y),float(z)); vec3 o=hash33(i+g); float d=length(g+o-f);
    if(d<d1){ d2=d1; d1=d; } else if(d<d2){ d2=d; }
  }
  return vec2(d1,d2-d1);
}
vec3 fireRamp(float t){ t=clamp(t,0.,1.); return vec3(smoothstep(0.,.3,t)*1.25, smoothstep(.2,.8,t), smoothstep(.65,1.,t)*.85)*(.15+1.9*t); }
mat2 rot2(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
`;
// realism shared uniforms; module-level on purpose: each Stage writes them in prepass() right before it renders (multi-stage safe)
export const SU = { tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNF: { value: new THREE.Vector2(0.05, 400) }, uReal: { value: 0 } };
// softF(s): 0..1 fade where the fragment is within s metres in front of opaque depth, plus near-camera fade; 1 when realism is off
export const DEPTH = /* glsl */ `
uniform sampler2D tDepth; uniform vec2 uRes, uNF; uniform float uReal;
float linZ(float d){ return uNF.x*uNF.y/max(uNF.y-d*(uNF.y-uNF.x),1e-6); }
float softF(float s){ if(uReal<.5||s<=0.) return 1.; float fz=linZ(gl_FragCoord.z); float sz=linZ(texture2D(tDepth,gl_FragCoord.xy/max(uRes,vec2(1.))).x); return smoothstep(0.,s,sz-fz)*smoothstep(uNF.x,uNF.x+.3,fz); }
`;
