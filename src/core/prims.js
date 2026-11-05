// Shader-driven primitives. Each is created through an Fx (fx.orb(...), fx.ring(...), ...), lives in the
// Fx group, and is driven by fx time: t0 (start s), dur (length s), fade [in, out] seconds.
import * as THREE from 'three';
import { NOISE, DEPTH, SU } from './glsl.js';
import { makeRamp } from './emitter.js';
import { win, clamp, lerp, easeOut } from './rng.js';

const V3 = (a, d = [0, 0, 0]) => new THREE.Vector3(...(a || d));
const A = (x) => (Array.isArray(x) ? x : [x, x]);
const bl = (add) => ({ transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: add ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: add ? THREE.ZeroFactor : THREE.OneFactor, blendDstAlpha: add ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor });
// loop-safe time noise: uPeriod>0 crossfades two copies one period apart so frame(t) == frame(t+uPeriod). Needs uTime declared before.
const PER = /* glsl */ `uniform float uPeriod;
float fbmT(vec3 p, vec3 v){ if(uPeriod<=0.) return fbm(p+v*uTime); float m=mod(uTime,uPeriod); return mix(fbm(p+v*m),fbm(p+v*(m-uPeriod)),m/uPeriod); }
float fbm3T(vec3 p, vec3 v){ if(uPeriod<=0.) return fbm3(p+v*uTime); float m=mod(uTime,uPeriod); return mix(fbm3(p+v*m),fbm3(p+v*(m-uPeriod)),m/uPeriod); }
float ph(float s){ if(uPeriod<=0.) return uTime*s; float k=max(1.,floor(abs(s)*uPeriod/6.2831853+.5))*sign(s); return 6.2831853*k*mod(uTime,uPeriod)/uPeriod; }`;
const per = (fx) => ({ uPeriod: { value: fx.loop ? fx.duration : 0 } });
const lightU = (fx) => ({ uLightPos: fx.lu.uLightPos, uLightCol: fx.lu.uLightCol });
const DEFR = [[0, '#fff', 1], [1, '#fff', 1]];

class Prim {
  constructor(fx, p) { this.fx = fx; this.p = p; this.t0 = p.t0 ?? 0; this.dur = p.dur ?? fx.duration; const f = p.fade || [0, 0]; this.fi = f[0]; this.fo = f[1]; this.seed = fx.rng() * 100; }
  w(t) { return win(t, this.t0, this.dur, this.fi, this.fo); }
  prog(t) { return clamp((t - this.t0) / Math.max(1e-6, this.dur)); }
  place(o) { const p = this.p; if (p.pos) o.position.set(...p.pos); if (p.rotate) o.rotation.set(...p.rotate); fxAdd(this.fx, o); this.obj = o; o.frustumCulled = false; }
  dispose() { this.obj?.traverse?.((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); }); }
}
const fxAdd = (fx, o) => fx.add(o);

/* ------------------------------------------------------------------ ORB */
const ORB_V = `${NOISE}
uniform float uTime, uNS, uScroll, uDisp; varying vec3 vN, vWP, vP;
${PER}
void main(){ float n=fbm3T(position*uNS,vec3(0.,-uScroll,.3*uScroll)); vec3 pp=position*(1.+(n-.5)*uDisp); vP=position;
  vec4 wp=modelMatrix*vec4(pp,1.); vWP=wp.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }`;
const ORB_F = `${NOISE}
uniform float uTime, uNS, uScroll, uInt, uAlpha, uPow, uSoft; uniform int uMode; uniform sampler2D uRamp; uniform vec3 uLightPos, uLightCol;
varying vec3 vN, vWP, vP;
${PER}
${DEPTH}
void main(){
  vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWP);
  if(uMode==4){ N=normalize(cross(dFdx(vWP),dFdy(vWP))); if(dot(N,V)<0.) N=-N; }
  float ndv=abs(dot(N,V)); float fres=pow(max(1.-ndv,0.),uPow);
  if(uMode==0||uMode==1||uMode==5){
    float h=fbmT(vP*uNS*1.4,vec3(0.,-uScroll*1.6,uScroll*.5)); float heat=clamp(h*1.35+(1.-fres)*.2-.12,0.,1.);
    if(uMode==1) heat=clamp(abs(sin(h*9.+ph(uScroll*3.)))*.5+(1.-fres)*.6,0.,1.);
    if(uMode==5) heat=clamp((1.-fres)*.9+.3*sin(h*12.-ph(uScroll*4.)),0.,1.);
    vec4 c=texture2D(uRamp,vec2(heat,.5)); float a=smoothstep(.1,.45,heat+.15*(1.-fres))*uAlpha;
    gl_FragColor=vec4(c.rgb*uInt*a,a);
  } else if(uMode==2){
    float rim=pow(max(1.-ndv,0.),uPow); float sw=fbmT(vP*uNS,vec3(0.,uScroll,0.)); vec4 c=texture2D(uRamp,vec2(clamp(rim+sw*.2,0.,1.),.5));
    gl_FragColor=vec4(c.rgb*uInt*rim*(.5+sw)*uAlpha,uAlpha);
  } else {
    vec3 L=normalize(uLightPos-vWP); vec3 H=normalize(L+V); float spec=pow(max(dot(N,H),0.),120.)*2.5;
    float n=fbmT(vP*uNS,vec3(0.,uScroll*.3,0.)); vec3 tint=texture2D(uRamp,vec2(.5,.5)).rgb; vec3 rimc=texture2D(uRamp,vec2(clamp(fres,0.,1.),.5)).rgb;
    float facet=(uMode==4)?.25+.75*dot(N,normalize(vec3(.3,.8,.5)))*.5+.25:1.;
    vec3 col=tint*(.2+.5*n)*facet+rimc*fres*uInt+spec*uLightCol; float a=clamp(.16+fres*.8+spec*.4,0.,1.)*uAlpha;
    gl_FragColor=vec4(col*uAlpha,a);
  }
  gl_FragColor*=softF(uSoft);
}`;
const MODES = { fire: 0, plasma: 1, void: 2, glass: 3, water: 3, ice: 4, energy: 5 };
export class Orb extends Prim {
  constructor(fx, p) {
    super(fx, p); const mode = MODES[p.kind || 'fire'];
    this.u = { uTime: { value: 0 }, uNS: { value: p.noise ?? 2.2 }, uScroll: { value: p.scroll ?? 1.2 }, uDisp: { value: p.disp ?? 0.25 }, uInt: { value: p.intensity ?? 1.6 }, uAlpha: { value: 1 }, uPow: { value: p.power ?? 2.2 }, uSoft: { value: p.soft ?? 0.3 }, ...SU,
      uMode: { value: mode }, ...per(fx), uRamp: { value: makeRamp(p.ramp || [[0, '#300'], [.35, '#e30'], [.7, '#fb3'], [1, '#fff']]) }, ...lightU(fx) };
    const m = new THREE.ShaderMaterial({ vertexShader: ORB_V, fragmentShader: ORB_F, uniforms: this.u, ...bl(mode === 0 || mode === 1 || mode === 5), side: mode === 3 || mode === 4 ? THREE.FrontSide : THREE.FrontSide });
    const o = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), m); o.renderOrder = mode < 2 || mode === 5 ? 25 : 12; this.place(o);
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; const p = this.p, pr = this.prog(t);
    const [r0, r1] = A(p.r ?? 1); let r = lerp(r0, r1, p.ease === 'out' ? easeOut(pr) : pr); if (p.pulse) r *= 1 + p.pulse[0] * Math.sin(tAbs * p.pulse[1]);
    this.obj.scale.setScalar(Math.max(1e-4, r)); this.u.uTime.value = tAbs; this.u.uAlpha.value = w * (p.alpha ?? 1);
    if (p.follow) p.follow(this.obj, tAbs, t, pr);
  }
}

/* ------------------------------------------------------------------ RING (shockwave) */
const RING_N = /* glsl */ `float ringN(float r, float ang){ float tn=uReal>.5?uSeed*.1+(1.-exp(-3.*uPr))*3.:uTime*1.5; return vnoise(vec3(cos(ang)*2.+uSeed,sin(ang)*2.,r*3.+tn)); }`; // realism: pan fast->slow, loop-safe
const RING_F = `${NOISE}
uniform float uR, uW, uInt, uFill, uTime, uSeed, uBreak, uA, uPr, uSoft; uniform sampler2D uRamp; varying vec2 vUv;
${DEPTH}
${RING_N}
void main(){ vec2 p=vUv*2.-1.; float r=length(p); float ang=atan(p.y,p.x);
  float n=ringN(r,ang); float rr=uR+(n-.5)*uBreak*uW*2.; float d=(r-rr)/uW;
  float a=exp(-d*d*2.)*(1.-smoothstep(.88,1.,r)); float inner=uFill*smoothstep(rr,rr-uW*6.,r)*smoothstep(0.,rr*.7,r)*(.35+.65*n)*step(r,rr+.001);
  float tt=clamp(abs(d)*.55+(1.-a)*.25,0.,1.); vec3 c=texture2D(uRamp,vec2(tt,.5)).rgb;
  float s=(a+inner)*uA;
  if(uReal>.5){ float e=uPr*.6; s*=smoothstep(e,e+.25,fbm3(vec3(cos(ang)*3.+uSeed,sin(ang)*3.,r*5.))+.1)*softF(uSoft); } // erosion grows over life
  gl_FragColor=vec4(c*uInt*s,s); }`;
const PLANE_V = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const RDIST_F = `${NOISE}
uniform float uR, uW, uTime, uSeed, uBreak, uA, uPr, uRefract, uReal; varying vec2 vUv;
${RING_N}
void main(){ vec2 p=vUv*2.-1.; float r=length(p); float ang=atan(p.y,p.x); float rr=uR+(ringN(r,ang)-.5)*uBreak*uW*2.; float d=(r-rr)/max(uW*1.6,1e-4);
  vec2 g=vec2(dFdx(r),dFdy(r)); float l=length(g); vec2 dir=l>1e-7?g/l:vec2(0.);
  float m=-d*exp(-d*d*2.)*1.65*(1.-smoothstep(.88,1.,r))*uA*(1.-.5*uPr); gl_FragColor=vec4(dir*m*uRefract,0.,0.); }`;
const RDARK_F = `${NOISE}
uniform float uR, uW, uTime, uSeed, uBreak, uA, uPr, uDark, uReal; varying vec2 vUv;
${RING_N}
void main(){ vec2 p=vUv*2.-1.; float r=length(p); float ang=atan(p.y,p.x); float rr=uR+(ringN(r,ang)-.5)*uBreak*uW*2.; float d=(r-rr-uW*1.8)/max(uW*1.4,1e-4);
  float a=exp(-d*d*2.)*(1.-smoothstep(.88,1.,r))*uDark*uA*uReal; if(a<.003) discard; gl_FragColor=vec4(vec3(.015)*a,a); }`;
export class Ring extends Prim {
  constructor(fx, p) {
    super(fx, p); this.R1 = A(p.r)[1]; this.size = this.R1 * 1.15; const nrm = p.normal || 'up';
    this.u = { uR: { value: 0 }, uW: { value: 0.05 }, uInt: { value: p.intensity ?? 2 }, uFill: { value: p.fill ?? 0 }, uTime: { value: 0 }, uSeed: { value: this.seed }, uBreak: { value: p.breakup ?? 0.6 }, uA: { value: 1 }, uPr: { value: 0 }, uSoft: { value: p.soft ?? (nrm === 'up' ? 0 : 0.25) }, uRefract: { value: p.refract ?? 0 }, uDark: { value: p.dark ?? 0 }, ...SU,
      uRamp: { value: makeRamp(p.ramp || [[0, '#fff'], [.4, '#fc8'], [1, '#f60']]) } };
    const o = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: RING_F, uniforms: this.u, ...bl(true), side: THREE.DoubleSide }));
    o.scale.setScalar(this.size); o.renderOrder = 22;
    if (p.refract) { const m = new THREE.Mesh(o.geometry, new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: RDIST_F, uniforms: this.u, ...bl(true), side: THREE.DoubleSide })); m.layers.set(2); m.frustumCulled = false; o.add(m); } // refraction offset, drawn only in Stage.prepass
    if (p.dark) { const m = new THREE.Mesh(o.geometry, new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: RDARK_F, uniforms: this.u, ...bl(false), side: THREE.DoubleSide })); m.renderOrder = 21; m.frustumCulled = false; m.userData.opaqueOnly = true; o.add(m); } // dark contrast rim behind the front
    if (nrm === 'up') { o.rotation.x = -Math.PI / 2; o.position.y = p.y ?? 0.01; } else if (Array.isArray(nrm)) o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...nrm).normalize());
    this.billboard = nrm === 'cam'; this.place(o); if (p.pos) o.position.set(...p.pos); if (nrm === 'up' && !p.pos) o.position.y = p.y ?? 0.01;
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; const p = this.p, pr = this.prog(t); const [r0, r1] = A(p.r); const [w0, w1] = A(p.width ?? [0.2, 0.08]);
    this.u.uR.value = lerp(r0, r1, easeOut(pr)) / this.size; this.u.uW.value = lerp(w0, w1, pr) / this.size; this.u.uA.value = w * (1 - (p.decay ?? 0.7) * pr) * (p.alpha ?? 1); this.u.uTime.value = tAbs; this.u.uPr.value = pr;
    if (this.billboard) this.obj.quaternion.copy(this.fx.camQuat);
  }
}

/* ------------------------------------------------------------------ SHELL (dome / shield / bubble) */
const SHELL_F = `${NOISE}
uniform float uTime, uInt, uPow, uCells, uA, uImpT, uHemi, uNoise, uSoft; uniform vec3 uImpDir; uniform sampler2D uRamp; varying vec3 vN, vWP, vP;
${PER}
${DEPTH}
void main(){ if(uHemi>.5 && vP.y<-.02) discard;
  vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWP); float f=pow(max(1.-abs(dot(N,V)),0.),uPow);
  float edge=0.; if(uCells>0.){ vec2 vo=voronoi(vP*uCells+vec3(0.,uTime*.05,0.)); edge=smoothstep(.09,.0,vo.y)*.9+(1.-smoothstep(0.,.4,vo.x))*.12*vnoise(vP*uCells*2.+uTime*2.); }
  float n=fbmT(vP*3.,vec3(0.,.4,0.))*uNoise;
  float imp=0.; if(uImpT>=0.){ float ang=acos(clamp(dot(normalize(vP),uImpDir),-1.,1.)); float x=ang-uImpT*2.2; imp=exp(-x*x*40.)*exp(-uImpT*2.2)*1.6+exp(-ang*ang*30.)*exp(-uImpT*8.)*2.; }
  float s=clamp(f*.9+edge*(.35+f)+n*.25+imp*(.6+edge*2.),0.,2.); vec3 c=texture2D(uRamp,vec2(clamp(s*.5,0.,1.),.5)).rgb;
  float a=(f*.8+edge*.5+n*.1+imp*.6)*uA; gl_FragColor=vec4(c*uInt*a,a)*softF(uSoft); }`;
const SHELL_DIST_F = `uniform float uA, uPow, uRefract, uHemi; varying vec3 vN, vWP, vP;
void main(){ if(uHemi>.5&&vP.y<-.02) discard; vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWP); float f=pow(max(1.-abs(dot(N,V)),0.),max(uPow*.6,.1));
  vec3 nv=(viewMatrix*vec4(N,0.)).xyz; float l=length(nv.xy); vec2 d=l>1e-4?nv.xy/l:vec2(0.); gl_FragColor=vec4(-d*f*uRefract*uA,0.,0.); }`;
export class Shell extends Prim {
  constructor(fx, p) {
    super(fx, p); this.u = { ...per(fx), uTime: { value: 0 }, uInt: { value: p.intensity ?? 1.5 }, uPow: { value: p.power ?? 2.5 }, uCells: { value: p.cells ?? 0 }, uA: { value: 1 }, uImpT: { value: -1 }, uHemi: { value: p.hemi ? 1 : 0 }, uNoise: { value: p.noise ?? 0.5 }, uSoft: { value: p.soft ?? 0.3 }, uRefract: { value: p.refract ?? 0 }, ...SU,
      uImpDir: { value: new THREE.Vector3(1, 0.3, 0).normalize() }, uRamp: { value: makeRamp(p.ramp || [[0, '#012'], [.4, '#4af'], [1, '#fff']]) } };
    const v = `varying vec3 vN, vWP, vP; void main(){ vP=position; vec4 wp=modelMatrix*vec4(position,1.); vWP=wp.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }`;
    const o = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.ShaderMaterial({ vertexShader: v, fragmentShader: SHELL_F, uniforms: this.u, ...bl(true), side: THREE.DoubleSide })); o.renderOrder = 24; if (p.refract) { const m = new THREE.Mesh(o.geometry, new THREE.ShaderMaterial({ vertexShader: v, fragmentShader: SHELL_DIST_F, uniforms: this.u, ...bl(true) })); m.layers.set(2); m.frustumCulled = false; o.add(m); } this.place(o);
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; const p = this.p; const [r0, r1] = A(p.r ?? 1); this.obj.scale.setScalar(lerp(r0, r1, p.ease === 'out' ? easeOut(this.prog(t)) : this.prog(t)) * (1 + (p.pulse ? p.pulse[0] * Math.sin(tAbs * p.pulse[1]) : 0)));
    this.u.uTime.value = tAbs; this.u.uA.value = w * (p.alpha ?? 1); let it = -1;
    if (p.impacts) for (const im of p.impacts) if (t >= im.t && t - im.t < 1.2) { it = t - im.t; this.u.uImpDir.value.set(...im.dir).normalize(); }
    this.u.uImpT.value = it;
  }
}

/* ------------------------------------------------------------------ BEAM (cylinder shafts: lasers, pillars, cones) */
const BEAM_V = `varying vec3 vN, vWP; varying vec2 vUv; void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.); vWP=wp.xyz; vN=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*wp; }`;
const BEAM_F = `${NOISE}
uniform float uTime, uInt, uA, uFreq, uSpeed, uPulse, uEdge, uNoiseA, uEndFade, uSoft; uniform sampler2D uRamp; varying vec3 vN, vWP; varying vec2 vUv;
${PER}
${DEPTH}
void main(){ vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWP); float c=pow(abs(dot(N,V)),uEdge);
  float y=vUv.y; float an=vUv.x*6.2831853; float n=fbmT(vec3(cos(an)*1.5,sin(an)*1.5,y*uFreq),vec3(.3,0.,-uSpeed)); float bands=mix(1.,.45+1.1*n,uNoiseA);
  float pulse=1.+uPulse*sin(y*uFreq*2.-ph(uSpeed*3.)); float ends=smoothstep(0.,uEndFade,y)*smoothstep(1.,1.-uEndFade,y);
  float a=c*bands*pulse*ends*uA; vec3 col=texture2D(uRamp,vec2(clamp(1.-c*bands,0.,1.),.5)).rgb; gl_FragColor=vec4(col*uInt*a,a)*softF(uSoft); }`;
export class Beam extends Prim {
  constructor(fx, p) {
    super(fx, p); const [rb, rt] = A(p.r ?? 0.1);
    this.u = { ...per(fx), uTime: { value: 0 }, uInt: { value: p.intensity ?? 2 }, uA: { value: 1 }, uFreq: { value: p.freq ?? 3 }, uSpeed: { value: p.speed ?? 2 }, uPulse: { value: p.pulse ?? 0.2 }, uEdge: { value: p.edge ?? 1.6 }, uNoiseA: { value: p.noise ?? 0.6 }, uEndFade: { value: p.endFade ?? 0.12 }, uSoft: { value: p.soft ?? 0.3 }, ...SU,
      uRamp: { value: makeRamp(p.ramp || [[0, '#fff'], [.5, '#8cf'], [1, '#13a']]) } };
    const g = new THREE.CylinderGeometry(rt, rb, 1, 32, 1, true); g.translate(0, 0.5, 0);
    const o = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: BEAM_V, fragmentShader: BEAM_F, uniforms: this.u, ...bl(true), side: THREE.DoubleSide })); o.renderOrder = 23; this.fromTo = p.from && p.to; this.place(o);
    this._a = new THREE.Vector3(); this._b = new THREE.Vector3(); this._y = new THREE.Vector3(0, 1, 0);
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; const p = this.p, pr = this.prog(t);
    let from = p.from, to = p.to; if (p.path) [from, to] = p.path(t, pr); if (!from) { from = p.pos || [0, 0, 0]; to = [from[0], from[1] + (p.height ?? 4), from[2]]; }
    this._a.set(...from); this._b.set(...to); const len = this._a.distanceTo(this._b); const dir = this._b.clone().sub(this._a).normalize();
    this.obj.position.copy(this._a); this.obj.quaternion.setFromUnitVectors(this._y, dir); const sw = p.grow ? lerp(p.grow[0], p.grow[1], easeOut(pr)) : 1;
    this.obj.scale.set(sw, len * (p.extend ? easeOut(clamp(pr * p.extend)) : 1), sw); this.u.uTime.value = tAbs; this.u.uA.value = w * (p.alpha ?? 1);
  }
}

/* ------------------------------------------------------------------ RIBBON (view-space expanded strip: bolts, slashes, trails, whips) */
const RIB_V = `attribute vec3 aTan; attribute float aSide, aU, aWd; uniform float uPx; varying float vU, vS;
void main(){ vU=aU; vS=aSide; vec4 mv=modelViewMatrix*vec4(position,1.); vec2 t=(modelViewMatrix*vec4(aTan,0.)).xy; float l=length(t); t=l>1e-5?t/l:vec2(1.,0.); mv.xy+=vec2(-t.y,t.x)*aSide*aWd; gl_Position=projectionMatrix*mv; }`;
const RIB_F = `uniform float uHead, uTail, uInt, uA, uCore, uTime, uFlick; uniform sampler2D uRamp; varying float vU, vS;
void main(){ float behind=(uHead-vU)/max(uTail,1e-4); if(behind<0.||behind>1.) discard; float head=smoothstep(0.,.04,behind);
  float along=head*(1.-smoothstep(.0,1.,behind)); float s=vS; float core=exp(-s*s*uCore*3.); float glow=exp(-s*s*uCore*.7)*.55;
  vec3 c=texture2D(uRamp,vec2(clamp(behind*.9+abs(s)*.25,0.,1.),.5)).rgb; float a=(core+glow)*along*uA*(1.-uFlick*.3*fract(sin(floor(uTime*30.)*7.1)*43.));
  gl_FragColor=vec4(c*uInt*a,a); }`;
export class Ribbon extends Prim {
  constructor(fx, p) {
    super(fx, p); this.n = p.n ?? 24; const n = this.n; const N = (n + 1) * 2;
    const g = new THREE.BufferGeometry(); this.pos = new Float32Array(N * 3); this.tan = new Float32Array(N * 3); this.side = new Float32Array(N); this.uu = new Float32Array(N); this.wd = new Float32Array(N);
    const idx = []; for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    for (let i = 0; i <= n; i++) { this.side[i * 2] = -1; this.side[i * 2 + 1] = 1; this.uu[i * 2] = this.uu[i * 2 + 1] = i / n; }
    g.setIndex(idx); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aTan', new THREE.BufferAttribute(this.tan, 3)); g.setAttribute('aSide', new THREE.BufferAttribute(this.side, 1));
    g.setAttribute('aU', new THREE.BufferAttribute(this.uu, 1)); g.setAttribute('aWd', new THREE.BufferAttribute(this.wd, 1));
    this.u = { uHead: { value: 2 }, uTail: { value: 3 }, uInt: { value: p.intensity ?? 3 }, uA: { value: 1 }, uCore: { value: p.core ?? 8 }, uTime: { value: 0 }, uFlick: { value: p.flicker ?? 0 }, uRamp: { value: makeRamp(p.ramp || [[0, '#fff'], [.4, '#9cf'], [1, '#26c']]) } };
    const o = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: RIB_V, fragmentShader: RIB_F, uniforms: this.u, ...bl(p.blend !== 'normal'), side: THREE.DoubleSide })); o.renderOrder = 26; this.place(o); this.static = false; this.tmp = new THREE.Vector3();
    if (Array.isArray(p.points)) { this.setPoints(p.points, p.width ?? 0.05); this.static = true; }
  }
  /** pts: array of [x,y,z]; width: number or (u)=>number */
  setPoints(pts, width) {
    const n = this.n, m = pts.length - 1; const get = (u) => { const f = u * m, i = Math.min(m - 1, Math.floor(f)), k = f - i; const a = pts[i], b = pts[i + 1]; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k]; };
    let prev = get(0);
    for (let i = 0; i <= n; i++) {
      const u = i / n, c = get(u), c2 = get(Math.min(1, u + 1 / n)), c1 = get(Math.max(0, u - 1 / n)); const tx = c2[0] - c1[0], ty = c2[1] - c1[1], tz = c2[2] - c1[2]; const wv = typeof width === 'function' ? width(u) : width;
      for (let s = 0; s < 2; s++) { const k = (i * 2 + s) * 3; this.pos[k] = c[0]; this.pos[k + 1] = c[1]; this.pos[k + 2] = c[2]; this.tan[k] = tx; this.tan[k + 1] = ty; this.tan[k + 2] = tz; this.wd[i * 2 + s] = wv; }
    }
    const g = this.obj.geometry; g.attributes.position.needsUpdate = g.attributes.aTan.needsUpdate = g.attributes.aWd.needsUpdate = true;
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; const p = this.p, pr = this.prog(t);
    if (typeof p.points === 'function') this.setPoints(p.points(t, pr, tAbs), p.width ?? 0.05);
    else if (p.shape) this.setPoints(p.shape(t, pr, tAbs), p.width ?? 0.05);
    const head = p.head ? p.head(t, pr) : lerp(p.sweep?.[0] ?? 0, p.sweep?.[1] ?? 1.2, p.ease === 'out' ? easeOut(pr) : pr);
    this.u.uHead.value = head; this.u.uTail.value = p.tail ?? 0.6; this.u.uA.value = w * (p.alpha ?? 1); this.u.uTime.value = tAbs;
  }
}

/** Jagged lightning polyline helper (midpoint displacement) */
export function jagged(rng, a, b, jag = 0.25, depth = 5) {
  let pts = [a, b];
  for (let d = 0; d < depth; d++) {
    const out = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i], q = pts[i + 1]; const len = Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]); const m = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2];
      const k = len * jag * (1 / (1 + d * 0.2)); m[0] += (rng() - 0.5) * k; m[1] += (rng() - 0.5) * k; m[2] += (rng() - 0.5) * k; out.push(m, q);
    }
    pts = out;
  }
  return pts;
}

export class Bolt extends Prim {
  constructor(fx, p) {
    super(fx, p); this.rate = p.rate ?? 24; this.branches = p.branches ?? 3; this.sub = [];
    const mk = (wd) => new Ribbon(fx, { ...p, t0: 0, dur: 1e9, fade: [0, 0], n: 64, width: wd, points: undefined, sweep: undefined, head: () => 2, tail: 3, pos: undefined, rotate: undefined });
    this.main = mk(p.width ?? 0.06); this.main.p.width = p.width ?? 0.06; this.br = []; for (let i = 0; i < this.branches; i++) { const r = mk((p.width ?? 0.06) * 0.45); r.n = 64; this.br.push(r); }
    this.obj = new THREE.Group(); this.last = -1;
  }
  gen(slot) {
    const p = this.p; let s = (Math.imul((this.seed * 1000) | 0, 7919) + Math.imul(slot, 0x9e3779b1)) >>> 0; const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; // pure fn of slot: replay/loop-safe
    const a = typeof p.from === 'function' ? p.from(slot) : p.from, b = typeof p.to === 'function' ? p.to(slot) : p.to; const pts = jagged(rng, a, b, p.jag ?? 0.22, 5); this.main.setPoints(pts, p.width ?? 0.06);
    this.br.forEach((r) => { const i = Math.floor(rng() * (pts.length - 6)); const s = pts[i]; const dir = [(rng() - 0.5) * 2, (rng() - 0.7) * 1.5, (rng() - 0.5) * 2]; const L = (p.branchLen ?? 0.35) * Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      const e = [s[0] + dir[0] * L, s[1] + dir[1] * L, s[2] + dir[2] * L]; r.setPoints(jagged(rng, s, e, 0.3, 4), (p.width ?? 0.06) * 0.45); });
  }
  update(tAbs, t) {
    const w = this.w(t); const vis = w > 0.001; this.main.obj.visible = vis; this.br.forEach((r) => (r.obj.visible = vis)); if (!vis) return;
    const slot = Math.floor((t - this.t0) * this.rate); if (slot !== this.last) { this.last = slot; this.gen(slot); }
    const fl = p_flick(this.p, slot); for (const r of [this.main, ...this.br]) { r.u.uA.value = w * fl * (this.p.alpha ?? 1); r.u.uTime.value = tAbs; r.u.uHead.value = 1.5; r.u.uTail.value = 5; r.obj.visible = true; }
  }
  dispose() { this.main.dispose(); this.br.forEach((r) => r.dispose()); }
}
const p_flick = (p, slot) => { const f = p.flicker ?? 0.35; return 1 - f * (((Math.sin(slot * 12.9898) * 43758.5453) % 1 + 1) % 1); };

/* ------------------------------------------------------------------ DECAL (ground patterns) */
const DECAL_KINDS = { scorch: 0, cracks: 1, glow: 2, rune: 3, frost: 4, rings: 5 };
const DEC_F = `${NOISE}
uniform int uKind; uniform float uTime, uInt, uA, uProg, uHeat, uCell, uSeed, uSpin, uGlyphs, uPoly; uniform sampler2D uRamp; varying vec2 vUv;
${PER}
float rune(vec2 p){ float r=length(p); float ang=atan(p.y,p.x)+uSpin; float seg=fract(ang/6.2831853+.5); float rv=smoothstep(uProg*1.02,uProg*.98,seg+.0)*1.;
  float ring1=exp(-pow((r-.96)*70.,2.)); float ring2=exp(-pow((r-.88)*110.,2.)); float ring3=exp(-pow((r-.5)*80.,2.))*.8; float ring4=exp(-pow((r-.58)*160.,2.))*.5;
  float cell=floor(seg*uGlyphs); float f=fract(seg*uGlyphs); float h=hash11(cell+uSeed); float gx=(f-.5)*uGlyphs*.0+((f-.5)*6.2831853*.76/uGlyphs)/.07; float gy=(r-.74)/.07;
  float g=0.; if(abs(gy)<1.&&abs(gx)<1.){ float lw=.13; g=max(g,step(abs(gx),lw)*step(abs(gy),.9)*step(.15,h)); g=max(g,step(abs(gy-(h-.5)*1.4),lw)*step(abs(gx),.8)*step(.35,h));
    g=max(g,step(abs(gx-gy*.6),lw)*step(abs(gy),.9)*step(.6,h)); g=max(g,step(length(vec2(gx,gy*.8)-vec2(.0,(h-.5)*.4)),.5)*step(length(vec2(gx,gy*.8)-vec2(.0,(h-.5)*.4)),.5)*(1.-step(length(vec2(gx,gy*.8)),.3))*step(.82,h)); }
  float lit=smoothstep(uProg,uProg-.06,cell/uGlyphs); g*=lit;
  float a2=mod(atan(p.y,p.x)+uSpin*-1.5,6.2831853/uPoly)-3.14159265/uPoly; float poly=exp(-pow((r*cos(a2)-.5)*110.,2.))*step(r,.62)*.9;
  float tick=step(.5,fract(ang*36./6.2831853))*exp(-pow((r-.92)*45.,2.))*.4;
  return (ring1+ring2*.7+ring3+ring4+g*1.3+poly+tick)*rv*step(r,1.02); }
void main(){ vec2 p=vUv*2.-1.; float r=length(p); vec3 col=vec3(0.); float a=0.; bool add=true;
  if(uKind==0){ float n=fbm(vec3(p*3.+uSeed,0.)); float m=smoothstep(1.,.25,r+(n-.5)*.7); float em=smoothstep(.5,.75,fbmT(vec3(p*8.+uSeed,0.),vec3(0.,0.,.3)))*uHeat*smoothstep(.9,.15,r);
    vec3 c=texture2D(uRamp,vec2(em,.5)).rgb*uInt; gl_FragColor=vec4((vec3(.012)*m+c*em)*uA,m*.92*uA); return; }
  if(uKind==1){ vec2 vo=voronoi(vec3(p*uCell+uSeed,0.)); float line=smoothstep(.08,.0,vo.y)*smoothstep(1.,.25,r)*(.55+.45*vnoise(vec3(p*6.,uTime*.7)))*smoothstep(uProg+.03,uProg-.03,r);
    float s=line*(.4+uHeat*.9); col=texture2D(uRamp,vec2(clamp(s,0.,1.),.5)).rgb*uInt; a=line; }
  else if(uKind==2){ float g=exp(-r*r*3.)*(.65+.7*fbmT(vec3(p*3.,0.),vec3(0.,0.,.4)))*smoothstep(1.,.7,r); col=texture2D(uRamp,vec2(clamp(g,0.,1.),.5)).rgb*uInt; a=g; }
  else if(uKind==3){ float s=rune(p); col=texture2D(uRamp,vec2(clamp(s*.6,0.,1.),.5)).rgb*uInt; a=s; }
  else if(uKind==4){ vec2 vo=voronoi(vec3(p*uCell,uSeed)); float cr=smoothstep(.14,.0,vo.y); float f=fbm(vec3(p*5.,uSeed)); float m=smoothstep(uProg*1.05,uProg*.7,r+(f-.5)*.5)*smoothstep(1.,.85,r);
    vec3 c=mix(vec3(.45,.75,1.),vec3(1.),cr)*(.45+.55*f)*uInt; float aa=m*(.45+.5*cr)*uA; gl_FragColor=vec4(c*aa,aa); return; }
  else if(uKind==5){ float x=fract(r*uCell-uTime*.5); float s=exp(-pow((x-.5)*5.,2.))*smoothstep(1.,.5,r)*(1.-smoothstep(.0,.2,1.-r)); col=texture2D(uRamp,vec2(clamp(s,0.,1.),.5)).rgb*uInt; a=s; }
  float o=a*uA; gl_FragColor=vec4(col*o,o); }`;
export class Decal extends Prim {
  constructor(fx, p) {
    super(fx, p); this.u = { ...per(fx), uKind: { value: DECAL_KINDS[p.kind || 'glow'] }, uTime: { value: 0 }, uInt: { value: p.intensity ?? 2 }, uA: { value: 1 }, uProg: { value: 1 }, uHeat: { value: 1 }, uCell: { value: p.cells ?? 5 }, uSeed: { value: this.seed },
      uSpin: { value: 0 }, uGlyphs: { value: p.glyphs ?? 16 }, uPoly: { value: p.poly ?? 5 }, uRamp: { value: makeRamp(p.ramp || [[0, '#200'], [.4, '#f50'], [1, '#ffd']]) } };
    const add = p.kind !== 'scorch' && p.kind !== 'frost';
    const o = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: DEC_F, uniforms: this.u, ...bl(add), side: THREE.DoubleSide }));
    o.rotation.x = -Math.PI / 2; o.position.y = p.y ?? 0.004; o.renderOrder = add ? 8 : 6; this.place(o); if (p.rotate) o.rotation.set(...p.rotate); if (!p.rotate) o.rotation.x = -Math.PI / 2; if (!p.pos) o.position.y = p.y ?? 0.004;
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; const p = this.p, pr = this.prog(t); const [r0, r1] = A(p.r ?? 2); this.obj.scale.setScalar(lerp(r0, r1, p.grow === false ? 1 : easeOut(Math.min(1, pr * (p.growSpeed ?? 4)))));
    this.u.uTime.value = tAbs; this.u.uA.value = w * (p.alpha ?? 1); this.u.uProg.value = p.reveal ? clamp((t - this.t0) / p.reveal) : 1; this.u.uHeat.value = p.heat ? lerp(p.heat[0], p.heat[1], pr) : 1; this.u.uSpin.value = (p.spin ?? 0) * tAbs;
  }
}

/* ------------------------------------------------------------------ WATER */
const WATER_F = `${NOISE}
uniform float uTime, uVort, uWave, uA, uR, uSpeed, uK, uDecay, uWid; uniform vec4 uRip[8]; uniform vec3 uDeep, uShallow, uSky, uHor, uLightPos, uLightCol; varying vec3 vWP, vP;
${PER}
float H(vec2 p){ float h=.012*sin(dot(p,vec2(1.,.6))*3.+ph(1.3))+.009*sin(dot(p,vec2(-.7,1.))*4.5+ph(1.7))+(fbm3T(vec3(p*1.6,0.),vec3(0.,0.,.25))-.5)*.05*uWave;
  for(int i=0;i<8;i++){ vec4 rp=uRip[i]; if(rp.w<=0.) continue; float age=uTime-rp.z; if(age<0.) continue; float r=length(p-rp.xy); float x=r-age*uSpeed; h+=rp.w*exp(-x*x*uWid)*sin(x*uK)*exp(-age*uDecay)/(1.+r*2.5); }
  float rr=length(p); if(uVort>0.){ float ang=atan(p.y,p.x); h-=uVort*exp(-rr*rr*1.6)*.35; h+=uVort*.03*sin(ang*3.-rr*9.+ph(3.))*exp(-rr*.6); }
  return h; }
void main(){ vec2 p=vP.xz; float e=.02; float h=H(p); float hx=H(p+vec2(e,0.)), hz=H(p+vec2(0.,e)); vec3 N=normalize(vec3(-(hx-h)/e*3.,1.,-(hz-h)/e*3.));
  vec3 V=normalize(cameraPosition-vWP); float F=.02+.98*pow(1.-clamp(dot(N,V),0.,1.),5.); vec3 R=reflect(-V,N); vec3 sky=mix(uHor,uSky,clamp(R.y*1.4,0.,1.));
  vec3 L=normalize(uLightPos-vWP); float spec=pow(max(dot(R,L),0.),180.)*3.;
  float depth=smoothstep(0.,.8,length(p)/uR); vec3 refr=mix(uShallow,uDeep,.55+.45*depth)*(.35+.65*clamp(N.y,0.,1.)); if(uVort>0.) refr*=1.-uVort*.8*exp(-dot(p,p)*3.);
  float foam=smoothstep(.03,.1,abs(h)+(fbm3T(vec3(p*6.,0.),vec3(0.,0.,1.))-.5)*.03)*.6; vec3 col=mix(refr,sky,F)+spec*uLightCol+foam*vec3(.8,.9,.95)*.5;
  float edge=1.-smoothstep(.88,1.,length(p)/uR); gl_FragColor=vec4(col*edge*uA,edge*uA*.97); }`;
export class Water extends Prim {
  constructor(fx, p) {
    super(fx, p); const R = p.r ?? 3; this.u = { uTime: { value: 0 }, uVort: { value: p.vortex ?? 0 }, uWave: { value: p.waves ?? 1 }, uA: { value: 1 }, uR: { value: R }, uSpeed: { value: p.speed ?? 1.6 }, uK: { value: p.k ?? 14 }, uDecay: { value: p.decay ?? 1.1 }, uWid: { value: p.width ?? 25 },
      uRip: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) }, uDeep: { value: new THREE.Color(p.deep || '#021a2b') }, uShallow: { value: new THREE.Color(p.shallow || '#1b6a86') }, uSky: { value: new THREE.Color(p.sky || '#6aa0d8') }, uHor: { value: new THREE.Color(p.horizon || '#cfe6f2') }, ...per(fx), ...lightU(fx) };
    const v = `varying vec3 vWP, vP; void main(){ vP=position; vec4 wp=modelMatrix*vec4(position,1.); vWP=wp.xyz; gl_Position=projectionMatrix*viewMatrix*wp; }`;
    const g = new THREE.CircleGeometry(R, 96); g.rotateX(-Math.PI / 2); const o = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: v, fragmentShader: WATER_F, uniforms: this.u, ...bl(false), side: THREE.DoubleSide })); o.renderOrder = 7; this.place(o); o.position.y = p.y ?? 0.012;
    this.ripples = (typeof p.ripples === 'function' ? [] : (p.ripples || [])).map((r) => ({ ...r }));
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; this.u.uTime.value = t; this.u.uA.value = w * (this.p.alpha ?? 1); const arr = this.u.uRip.value; let k = 0;
    const rs = typeof this.p.ripples === 'function' ? this.p.ripples(t) : this.ripples; for (const r of rs) { if (t >= r.t && k < 8) { const v = arr[k++]; v.set(r.x ?? 0, r.z ?? 0, r.t, r.amp ?? 0.05); } } for (; k < 8; k++) arr[k].set(0, 0, 0, 0);
    if (this.p.vortexFn) this.u.uVort.value = this.p.vortexFn(t);
  }
}

/* ------------------------------------------------------------------ LIGHT (physical point light + feeds smoke/ground lighting) */
const GLOW_F = `uniform vec3 uCol; uniform float uSoft; varying vec2 vUv;
${DEPTH}
void main(){ vec2 p=vUv*2.-1.; float d2=dot(p,p); float a=max(0.,1./(1.+d2*24.)-.04)*smoothstep(1.,.6,sqrt(d2))*uReal*softF(uSoft); if(a<.002) discard; gl_FragColor=vec4(uCol*a,a); }`;
export class Light extends Prim {
  constructor(fx, p) {
    super(fx, p); this.color = new THREE.Color(p.color || '#ff9a3c'); this.l = new THREE.PointLight(this.color, 0, p.range ?? 12, 2); this.l.position.set(...(p.pos || [0, 1, 0])); fx.add(this.l); this.obj = this.l; this.i0 = (p.intensity ?? 30) * 0.09;
    this.rate = p.rate ?? 9; this.seed2 = this.seed;
    if (p.glow) { const s = p.glowSize ?? 0.12 * (p.range ?? 12); this.gu = { uCol: { value: new THREE.Color() }, uSoft: { value: 0.5 }, ...SU };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: GLOW_F, uniforms: this.gu, ...bl(true) })); m.renderOrder = 27; m.frustumCulled = false; this.l.add(m); this.glow = m; } // inverse-square halo, alpha ~ live intensity
  }
  update(tAbs, t) {
    const w = this.w(t); const p = this.p; const P = this.fx.loop ? this.fx.duration : 0, r = P ? (2 * Math.PI / P) * Math.max(1, Math.round(this.rate * P / (2 * Math.PI))) : this.rate, k2 = P ? 2 : 2.3, k5 = P ? 5 : 5.1; // loops: integer harmonics of the period
    const fl = p.flicker ? 1 + p.flicker * (Math.sin(tAbs * r + this.seed2) * 0.5 + Math.sin(tAbs * r * k2 + this.seed2 * 2) * 0.35 + Math.sin(tAbs * r * k5) * 0.15) : 1;
    const env = p.env ? p.env(t, this.prog(t)) : 1; const I = this.i0 * w * fl * env; this.l.intensity = I; this.l.color.copy(this.color); if (p.colorFn) p.colorFn(this.l.color, t); if (this.glow) { this.glow.visible = w > 0.001; this.glow.quaternion.copy(this.fx.camQuat); this.gu.uCol.value.copy(this.l.color).multiplyScalar(p.glow * 0.35 * Math.min(1.5, w * fl * env)); }
    if (p.main !== false && w > 0.001) { const lu = this.fx.lu; lu.uLightPos.value.copy(this.l.position).applyMatrix4(this.fx.matrixWorld); lu.uLightCol.value.copy(this.l.color).multiplyScalar(Math.min(2.5, I / ((p.norm ?? 18) * 0.09))); lu.uLightRange.value = (p.range ?? 12) * 0.35; }
  }
}

/* ------------------------------------------------------------------ HEAT (screen-space haze; drawn only in Stage.prepass) */
const HEAT_F = `${NOISE}
uniform float uTime, uA, uStr, uRise; varying vec2 vUv;
${PER}
void main(){ vec2 p=vUv; float m=smoothstep(0.,.2,p.y)*smoothstep(1.,.45,p.y)*smoothstep(.5,.15,abs(p.x-.5))*uA;
  vec3 q=vec3(p.x*3.,p.y*4.,0.); vec2 o=vec2(fbm3T(q,vec3(0.,-uRise,.3)),fbm3T(q+vec3(5.2,1.3,0.),vec3(0.,-uRise,.3)))-.5;
  gl_FragColor=vec4(o*2.*uStr*m,0.,0.); }`;
export class Heat extends Prim {
  constructor(fx, p) {
    super(fx, p); const [w, h] = A(p.size ?? [1, 2]); this.u = { ...per(fx), uTime: { value: 0 }, uA: { value: 1 }, uStr: { value: p.strength ?? 0.006 }, uRise: { value: p.rise ?? 1.5 } };
    const g = new THREE.PlaneGeometry(w, h); g.translate(0, h / 2, 0);
    const o = new THREE.Mesh(g, new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: HEAT_F, uniforms: this.u, ...bl(true), side: THREE.DoubleSide })); o.layers.set(2); this.place(o);
  }
  update(tAbs, t) { const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; this.u.uTime.value = tAbs; this.u.uA.value = w * (this.p.alpha ?? 1); this.obj.quaternion.copy(this.fx.camQuat); }
}

/* ------------------------------------------------------------------ TEXT (canvas sprite) */
export class Text extends Prim {
  constructor(fx, p) {
    super(fx, p); const c = document.createElement('canvas'); const S = 128, W = 512; c.width = W; c.height = S; const x = c.getContext('2d'); x.font = `900 ${p.font ?? 92}px ${p.family || 'Impact, "Arial Black", sans-serif'}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.lineJoin = 'round'; x.lineWidth = p.stroke ?? 12; x.strokeStyle = p.outline || '#300'; x.strokeText(p.text, W / 2, S / 2 + 4); const gr = x.createLinearGradient(0, 20, 0, 108); (p.grad || ['#fff', '#fd5', '#f80']).forEach((cc, i, a) => gr.addColorStop(i / Math.max(1, a.length - 1), cc)); x.fillStyle = gr; x.fillText(p.text, W / 2, S / 2 + 4);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false, toneMapped: false }); const s = new THREE.Sprite(m); s.renderOrder = 40; this.place(s); this.base = p.size ?? 1;
  }
  update(tAbs, t) {
    const w = this.w(t); this.obj.visible = w > 0.001; if (!this.obj.visible) return; const p = this.p, pr = this.prog(t); const m = p.motion ? p.motion(pr, t) : {}; const s = (m.scale ?? 1) * this.base; this.obj.scale.set(s * 4, s, 1);
    if (m.pos) this.obj.position.set(...m.pos); this.obj.material.opacity = w * (m.alpha ?? 1); this.obj.material.rotation = m.rot ?? 0;
  }
}

/* ------------------------------------------------------------------ MESH (custom three object with an update callback) */
export class MeshPrim extends Prim {
  constructor(fx, obj, fn, p = {}) { super(fx, p); this.fn = fn; this.place(obj); this.frames = 0; }
  update(tAbs, t) { const w = this.w(t); this.obj.visible = w > 0.001; if (this.obj.visible && this.fn) this.fn(t, this.prog(t), this.fx, w, this.obj, tAbs); }
}
