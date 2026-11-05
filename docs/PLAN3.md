# Realism upgrade plan (three r170). One step at a time; tests only at the end.

## Facts checked
- r170 resolves multisampled depth into `rt.depthTexture` only after the pass ends, so the composer target cannot feed the same pass. Plan uses one separate half-res pre-pass target `stage.depthRT` (DepthTexture for soft particles; RGBA HalfFloat colour = refraction offsets). MSAA on the main target stays.
- `new THREE.DepthTexture(w, h)`; `RenderTarget.setSize`; `renderer.getDrawingBufferSize(v2)`; `UnrealBloomPass.strength/.radius/.threshold`; soft knee = `bloom.highPassUniforms.smoothWidth.value` (default 0.01; shader does `smoothstep(thr, thr + smoothWidth, lum)`).
- `PointLight` already uses three's windowed inverse-square falloff (decay 2). Only the emitter's lit-particle approximation changes (×2 so brightness matches at 1 m).
- BUG: `src/core/stage.js` play(): `this.setupScreen(fx); this._rest = 0; return fx;` sits inside a `//` comment (screen transitions off, play() returns undefined). S2 fixes it.
- Body material is `transparent = true`; "opaque" = `depthWrite`.
- alpha-test compares `legacy=1` pixels with baseline 481cf24 → every new shader path is gated by one shared uniform `uReal` (0 in legacy) and gives the old result when 0.
- Decals and `normal:'up'` rings get no depth fade (they lie on the ground).

## S1. `src/core/glsl.js`
- Add `import * as THREE from 'three';` at the top, above `// Shared GLSL chunks.`.
- Append at the end:
```js
// realism shared uniforms; module-level on purpose: each Stage writes them in prepass() right before it renders (multi-stage safe)
export const SU = { tDepth: { value: null }, uRes: { value: new THREE.Vector2(1, 1) }, uNF: { value: new THREE.Vector2(0.05, 400) }, uReal: { value: 0 } };
// softF(s): 0..1 fade where the fragment is within s metres in front of opaque depth, plus near-camera fade; 1 when realism is off
export const DEPTH = /* glsl */ `
uniform sampler2D tDepth; uniform vec2 uRes, uNF; uniform float uReal;
float linZ(float d){ return uNF.x*uNF.y/max(uNF.y-d*(uNF.y-uNF.x),1e-6); }
float softF(float s){ if(uReal<.5||s<=0.) return 1.; float fz=linZ(gl_FragCoord.z); float sz=linZ(texture2D(tDepth,gl_FragCoord.xy/max(uRes,vec2(1.))).x); return smoothstep(0.,s,sz-fz)*smoothstep(uNF.x,uNF.x+.3,fz); }
`;
```

## S2. `src/core/stage.js`
a) `import { NOISE } from './glsl.js';` → `import { NOISE, SU } from './glsl.js';`
b) Replace the `const MAIN_OPAQUE = …` line with:
```js
// refraction: rg offset written by layer-2 meshes into depthRT colour (half res). uDist=0 -> exact old path.
const DIST = 'vec2 uv=vUv; if(uDist>.5){ vec2 o=texture2D(tDist,vUv).rg; if(!any(isnan(o))&&!any(isinf(o))) uv=clamp(vUv+clamp(o,-.05,.05),.001,.999); }';
const MAIN_OPAQUE = DIST + 'vec3 c=texture2D(tDiffuse,uv).rgb; if(any(isnan(c))||any(isinf(c))) c=vec3(0.); if(uOn>.5) c=trans(vUv,c,uP,uTime,uAspect); c=mix(c,uFlashCol,clamp(uFlash,0.,1.)); vec2 q=vUv-.5; c*=1.-uVig*dot(q,q)*1.6; gl_FragColor=vec4(c,1.);';
```
and replace the `const MAIN_ALPHA = …` line (keep the comment line above it) with:
```js
const MAIN_ALPHA = DIST + 'vec4 s=texture2D(tDiffuse,uv); if(any(isnan(s))||any(isinf(s))) s=vec4(0.); vec3 c=s.rgb; if(uOn>.5) c=trans(vUv,c,uP,uTime,uAspect); c=clamp(c,0.,1.); float g=max(c.r,max(c.g,c.b)); float k=mix(smoothstep(.03,.1,g),1.,s.a); c*=k; float a=clamp(max(s.a,g*k),0.,1.); c=mix(c,uFlashCol*a,clamp(uFlash,0.,1.)); gl_FragColor=vec4(c,a);';
```
c) In `finalShader`, add `tDist: { value: null }, uDist: { value: 0 }` to `uniforms`; change the GLSL uniform line to `uniform sampler2D tDiffuse, tDist; uniform float uFlash,uP,uTime,uAspect,uVig,uOn,uDist; uniform vec3 uFlashCol; varying vec2 vUv;`.
d) In `fixAlpha`, change `root.traverse((o) => { for (` to `root.traverse((o) => { if (o.userData.opaqueOnly) o.visible = false; for (`.
e) Constructor second line start: `this.real = o.realism !== false; this.bloomScale = o.bloomScale ?? (this.real ? 0.55 : 0.8); this.flashMax = …` (rest unchanged).
f) Directly before `this.finalPass = new ShaderPass(finalShader(null, this.transparent));…` insert:
```js
    this.depthRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthTexture: new THREE.DepthTexture(4, 4) }); this._depthMat = new THREE.MeshBasicMaterial({ colorWrite: false, side: THREE.DoubleSide }); // realism pre-pass (half res): depth for soft particles, rg = refraction offsets
```
g) In `makeGround`, append `this.ground.layers.enable(1);` after `this.scene.add(this.ground);`.
h) End of `resize()` before `}`: `const db = this.renderer.getDrawingBufferSize(SU.uRes.value); this.depthRT.setSize(Math.max(1, db.x >> 1), Math.max(1, db.y >> 1));`
i) In `play()`, on the `this.setSky(...)` line replace the threshold, radius and exposure statements with:
`this.bloom.threshold = st.threshold ?? this.opts.threshold ?? (this.real ? 0.7 : 1.0); this.bloom.radius = st.radius ?? this.opts.radius ?? (this.real ? 0.85 : 0.5); this.bloom.highPassUniforms.smoothWidth.value = this.real ? 0.6 : 0.01; this.renderer.toneMappingExposure = st.exposure ?? this.opts.exposure ?? 1;`
Then replace the whole `this.hemi.intensity *= …` line (with the commented-out tail) with:
```js
    this.hemi.intensity *= st.ambient ?? 1; if (this.transparent) { fixAlpha(fx); fx.lu.uAmbient.value.setScalar(this.opts.ambient ?? 0.5); } // no sky to light smoke: brighter lit-particle ambient
    fx.traverse((o) => { if (o.isMesh && [].concat(o.material).some((m) => m.depthWrite)) o.layers.enable(1); }); // depth-writing meshes (body, target, props) feed soft-particle depth
    this.setupScreen(fx); this._rest = 0; return fx;
```
j) After `setupScreen(fx) {…}` add:
```js
  /** realism pre-pass into depthRT (half res): layer 1 depth only, then layer-2 distortion meshes add rg offsets (depth-tested, no clear) */
  prepass() {
    const r = this.renderer, c = this.camera, s = this.scene, rt = this.depthRT, fp = this.finalPass.uniforms;
    SU.uReal.value = this.real ? 1 : 0; SU.uNF.value.set(c.near, c.far); r.getDrawingBufferSize(SU.uRes.value);
    SU.tDepth.value = this.real ? rt.depthTexture : null; fp.tDist.value = rt.texture; fp.uDist.value = this.real ? 1 : 0;
    if (!this.real) return;
    const lm = c.layers.mask, ac = r.autoClear;
    r.setRenderTarget(rt); r.autoClear = true; s.overrideMaterial = this._depthMat; c.layers.set(1); r.render(s, c);
    s.overrideMaterial = null; c.layers.set(2); r.autoClear = false; r.render(s, c);
    c.layers.mask = lm; r.autoClear = ac; r.setRenderTarget(null);
  }
```
k) In `frame()`: `if (fx) this.camera.position.add(fx.shakeV); this.composer.render(dt);` → `if (fx) this.camera.position.add(fx.shakeV); this.prepass(); this.composer.render(dt);`
l) In `dispose()`, add `this.depthRT.dispose();` before `this.renderer.dispose();`.

## S3. `src/core/emitter.js`
- Import → `import { NOISE, DEPTH, SU } from './glsl.js';`
- VERT uniform line: `…uLightRange, uFlipY, uAspect;` → `…uLightRange, uFlipY, uAspect, uReal;`
- VERT varying line: append ` varying vec3 vLd, vLc, vUp;`
- VERT: `  if(uStretch>0.){` → `  mat2 R=mat2(1.); vLd=vec3(0.,0.,1.); vLc=vec3(0.); vUp=vec3(0.,1.,0.);\n  if(uStretch>0.){`
- VERT: `q=mat2(c,-sn,sn,c)*q; mv.xy+=q*s;` → `R=mat2(c,-sn,sn,c); q=R*q; mv.xy+=q*s;`
- VERT: replace the two lines starting `vec3 dl=uLightPos-wp;` and `vec3 L=uAmbient+uLightCol*att;` with:
```glsl
  vec3 dl=uLightPos-wp; float att=1./(1.+dot(dl,dl)/(uLightRange*uLightRange));
  if(uReal>.5){ float d2=dot(dl,dl), Rw=uLightRange*2.857; float x=d2/max(Rw*Rw,1e-4); float wn=clamp(1.-x*x,0.,1.); att=2.*wn*wn/(d2+1.); } // windowed inverse-square (UE/Frostbite); x2 = same as old at 1 m; Rw = light range
  vL=att;
  if(uReal>.5&&uLit>0.){ mat2 Rt=transpose(R); vec3 lv=(viewMatrix*vec4(dl,0.)).xyz; lv/=max(length(lv),1e-4); vLd=vec3(Rt*lv.xy,lv.z); vec3 uw=(viewMatrix*vec4(0.,1.,0.,0.)).xyz; vUp=vec3(Rt*uw.xy,uw.z); vLc=uLightCol*att; }
  else { vec3 L=uAmbient+uLightCol*att; col.rgb*=mix(vec3(1.),L,uLit); }
```
- FRAG: `uniform int uKind; uniform float uTime, uNoise;` → `uniform int uKind; uniform float uTime, uNoise, uLit, uSoft; uniform vec3 uAmbient;\n${DEPTH}`; append ` varying vec3 vLd, vLc, vUp;` to the FRAG varying line.
- FRAG flame (kind 3): after `a=m*(.4+.4*n); col=mix(deep*.55,col*1.3,clamp(core*1.6+n*.25,0.,1.))*fl;` add:
```glsl
    if(uReal>.5){ float hot=clamp(pow(max(core,0.),.7)*1.6+n*.25,0.,1.); col=mix(deep*.45,vCol.rgb*1.6,hot)*fl; col=mix(col,vec3(.08,.05,.04),smoothstep(.6,1.,y)*.6*(1.-hot)); } // HDR core, cooler sooty tips
```
- FRAG: replace `a*=vCol.a; if(a<.003) discard;` with:
```glsl
  if(uReal>.5&&uLit>0.){ vec3 N=normalize(vec3(p,sqrt(max(0.,1.-dot(p,p)))+.2)); float wr=max(0.,dot(N,vLd)*.5+.5); float bk=pow(max(0.,-vLd.z),2.)*(1.-N.z)*.6;
    vec3 L=uAmbient*mix(.7,1.3,dot(N,vUp)*.5+.5)+vLc*(wr+bk); col*=mix(vec3(1.),min(L,vec3(2.5)),uLit); } // sphere-normal sprite: wrap diffuse + back-light rim + hemi ambient
  a*=vCol.a*softF(uSoft); if(a<.003) discard;
```
- Above `const DEF = {` add: `const SOFT = [0.35, 0.05, 0.6, 0.15, 0.35, 0.05, 0.1, 0.1, 0.05, 0.1, 0.2, 0.05, 0.05, 0.6]; // depth-fade metres by KINDS index`
- Constructor: `uAmbient: lu.uAmbient, uLightPos: lu.uLightPos, uLightCol: lu.uLightCol, uLightRange: lu.uLightRange,` → same text followed by ` uSoft: { value: p.soft ?? SOFT[kind] ?? 0.35 }, ...SU,`. Do not add `soft` to DEF.

## S4. `src/core/prims.js`
- Import → `import { NOISE, DEPTH, SU } from './glsl.js';`
**Orb.** ORB_F: `uniform float uTime, uNS, uScroll, uInt, uAlpha, uPow;` → `…, uPow, uSoft;`; the `${PER}` just before `void main(){\n  vec3 N=normalize(vN);` → `${PER}\n${DEPTH}`; ending `gl_FragColor=vec4(col*uAlpha,a);\n  }\n}\`;` → `gl_FragColor=vec4(col*uAlpha,a);\n  }\n  gl_FragColor*=softF(uSoft);\n}\`;`. In Orb `this.u` add `uSoft: { value: p.soft ?? 0.3 }, ...SU,`.
**Ring.** Replace the whole `const RING_F = …;` block with:
```js
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
```
Keep `const PLANE_V = …`. Directly after it add:
```js
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
```
Ring constructor: first line → `super(fx, p); this.R1 = A(p.r)[1]; this.size = this.R1 * 1.15; const nrm = p.normal || 'up';`. In `this.u` after `uA: { value: 1 },` add `uPr: { value: 0 }, uSoft: { value: p.soft ?? (nrm === 'up' ? 0 : 0.25) }, uRefract: { value: p.refract ?? 0 }, uDark: { value: p.dark ?? 0 }, ...SU,`. After `o.scale.setScalar(this.size); o.renderOrder = 22;` add:
```js
    if (p.refract) { const m = new THREE.Mesh(o.geometry, new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: RDIST_F, uniforms: this.u, ...bl(true), side: THREE.DoubleSide })); m.layers.set(2); m.frustumCulled = false; o.add(m); } // refraction offset, drawn only in Stage.prepass
    if (p.dark) { const m = new THREE.Mesh(o.geometry, new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: RDARK_F, uniforms: this.u, ...bl(false), side: THREE.DoubleSide })); m.renderOrder = 21; m.frustumCulled = false; m.userData.opaqueOnly = true; o.add(m); } // dark contrast rim behind the front
```
Change the next line `const nrm = p.normal || 'up'; if (nrm === 'up')` → `if (nrm === 'up')`. In `Ring.update` after `this.u.uTime.value = tAbs;` add `this.u.uPr.value = pr;`.
**Shell.** SHELL_F: add `, uSoft` to the float uniform list; its `${PER}` → `${PER}\n${DEPTH}`; end → `gl_FragColor=vec4(c*uInt*a,a)*softF(uSoft); }`. Above `export class Shell` add:
```js
const SHELL_DIST_F = `uniform float uA, uPow, uRefract, uHemi; varying vec3 vN, vWP, vP;
void main(){ if(uHemi>.5&&vP.y<-.02) discard; vec3 N=normalize(vN); vec3 V=normalize(cameraPosition-vWP); float f=pow(max(1.-abs(dot(N,V)),0.),max(uPow*.6,.1));
  vec3 nv=(viewMatrix*vec4(N,0.)).xyz; float l=length(nv.xy); vec2 d=l>1e-4?nv.xy/l:vec2(0.); gl_FragColor=vec4(-d*f*uRefract*uA,0.,0.); }`;
```
Shell `this.u`: add `uSoft: { value: p.soft ?? 0.3 }, uRefract: { value: p.refract ?? 0 }, ...SU,`. Constructor: `o.renderOrder = 24; this.place(o);` → `o.renderOrder = 24; if (p.refract) { const m = new THREE.Mesh(o.geometry, new THREE.ShaderMaterial({ vertexShader: v, fragmentShader: SHELL_DIST_F, uniforms: this.u, ...bl(true) })); m.layers.set(2); m.frustumCulled = false; o.add(m); } this.place(o);`.
**Beam.** BEAM_F: add `, uSoft` to the uniform float list; `${PER}` → `${PER}\n${DEPTH}`; end → `gl_FragColor=vec4(col*uInt*a,a)*softF(uSoft); }`. `this.u`: add `uSoft: { value: p.soft ?? 0.3 }, ...SU,`.
**Light glow.** Above `export class Light` add:
```js
const GLOW_F = `uniform vec3 uCol; uniform float uSoft; varying vec2 vUv;
${DEPTH}
void main(){ vec2 p=vUv*2.-1.; float d2=dot(p,p); float a=max(0.,1./(1.+d2*24.)-.04)*smoothstep(1.,.6,sqrt(d2))*uReal*softF(uSoft); if(a<.002) discard; gl_FragColor=vec4(uCol*a,a); }`;
```
Light constructor, after `this.rate = p.rate ?? 9; this.seed2 = this.seed;` add:
```js
    if (p.glow) { const s = p.glowSize ?? 0.12 * (p.range ?? 12); this.gu = { uCol: { value: new THREE.Color() }, uSoft: { value: 0.5 }, ...SU };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.ShaderMaterial({ vertexShader: PLANE_V, fragmentShader: GLOW_F, uniforms: this.gu, ...bl(true) })); m.renderOrder = 27; m.frustumCulled = false; this.l.add(m); this.glow = m; } // inverse-square halo, alpha ~ live intensity
```
Light `update`, after `if (p.colorFn) p.colorFn(this.l.color, t);` add: `if (this.glow) { this.glow.visible = w > 0.001; this.glow.quaternion.copy(this.fx.camQuat); this.gu.uCol.value.copy(this.l.color).multiplyScalar(p.glow * 0.35 * Math.min(1.5, w * fl * env)); }`.
**Heat prim.** Insert before `/* --- TEXT`:
```js
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
```

## S5. `src/core/fx.js`
After `light(p) { … }` add `heat(p) { return this._add(new P.Heat(this, p)); }` (match how the other builders are written, e.g. light).

## S6. `src/fx/_skill.js`
`ring: (p) => fx.ring({ ramp: pr, ...p,` → `ring: (p) => fx.ring({ ramp: pr, ...((p.normal ?? 'up') === 'up' ? { refract: 0.015, dark: 0.25 } : p.normal === 'cam' ? { refract: 0.008 } : {}), ...p,`

## S7. `src/fx/explosions.js`, `src/fx/impacts.js`
```
sed -i '' "/fx.ring({.*normal: 'up'/s/fx.ring({ /fx.ring({ refract: 0.02, dark: 0.3, /" src/fx/explosions.js src/fx/impacts.js
sed -i '' "/fx.ring({.*normal: 'cam'/s/fx.ring({ /fx.ring({ refract: 0.012, /" src/fx/explosions.js src/fx/impacts.js
```

## S8. `src/fx/fire.js`
- `const FIRE = [[0, '#fff3dc', 1], [0.15, '#ffc27a', 1], [0.35, '#ff9a32', 0.9], [0.6, '#e2500f', 0.6], [0.85, '#5a1a08', 0.25], [1, '#140604', 0]]; // blackbody: ~3500K core -> 2500K -> 1500K -> soot`
- `fx.light({ ` → `fx.light({ glow: 0.4, ` in campfire, brazier, candle, fire-tornado, fireball, flame-pillar, meteor, spirit-flame (not fire-breath, fire-ring, flamethrower, torch).
- After each light line add: campfire `fx.heat({ pos: [0, 0.35, 0], size: [0.9, 1.8] });` · brazier `fx.heat({ pos: [0, 0.8, 0], size: [1.0, 2.0] });` · torch `fx.heat({ pos: [0, 2.0, 0], size: [0.35, 0.9], strength: 0.005 });` · fire-tornado `fx.heat({ pos: [0, 0.1, 0], size: [2, 4.2], strength: 0.007 });` · flame-pillar `fx.heat({ pos: [0, 0.2, 0], size: [1.8, 5], strength: 0.008, t0: 0.6, dur: 3.6, fade: [0.3, 1] });`

## S9. Exposure: no change (ACES rolls off). Lower to 0.9 only if fire cores read flat white.

## S10. `gallery/test.html`, `index.d.ts`, docs
- test.html: `if (q.has('legacy')) Object.assign(o, { bloomScale: 1, flashMax: 1, realism: false });`
- index.d.ts: StageOptions `realism?: boolean;`; EmitterParams/OrbParams/BeamParams `soft?: number;`; RingParams `refract?: number; dark?: number; soft?: number;`; ShellParams `refract?: number; soft?: number;`; LightParams `glow?: number; glowSize?: number;`; new `export interface HeatParams extends Timed { pos?: Vec3; size?: Range; strength?: number; rise?: number; alpha?: number; }`; Fx `heat(p: HeatParams): Part;`
- docs/AUTHORING.md: new options on the builder bullets + an `fx.heat` bullet; rule 10 = the new FIRE ramp; rule 11 = "global bloom 0.55 × stage.bloom, threshold 0.7, soft knee 0.6, radius 0.85"; new rule: "flat ground rings/decals: no `soft`; shock rings: `refract` 0.01–0.02, `dark` 0.25–0.3; `Stage({realism:false})` = old look".

## Test phase
```
for f in src/index.js src/core/*.js src/fx/*.js tools/*.mjs; do node --check "$f" || echo "BAD $f"; done
node tools/serve.mjs 8123 &
git worktree add ../pixelfx3d-base 481cf24 && ln -s "$PWD/node_modules" ../pixelfx3d-base/node_modules && node ../pixelfx3d-base/tools/serve.mjs 8124 &
node tools/shots.mjs .out/real/op all 0.5 ; node tools/shots.mjs .out/real/tr all 0.5 transparent=1
node tools/alpha-test.mjs ; node tools/determinism-test.mjs all ; node tools/gpu-scan.mjs all 0.1,0.5,-0.9
node tools/perf.mjs fire/campfire,explosions/small-explosion,weather/fog low,medium
before/after sheets: .out/before (already rendered) vs new renders of the same ids at -0.3,-0.6
```
Acceptance: shots 406/406 both modes, no shader warnings; alpha-test ok (legacy identity); determinism no failures; gpu-scan clean; ≤ ~1 ms extra at medium; visual: no hard lines where smoke/rings meet ground or body; shock rings bend background and erode with a dark rim; lit smoke has a lit side and backlit edge; fire has yellow-white core, orange body, dark tips, heat shimmer; bloom wider/softer without blowout; weather/fog not darker, no seams.

Risks: legacy identity relies on uReal gating; meshes added after play() miss the depth layer; dissolving body still writes depth; refraction offset is in screen units; setupScreen fix changes transitions/* back to working.
