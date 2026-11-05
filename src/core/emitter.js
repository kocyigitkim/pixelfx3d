// Analytic GPU particle emitter. Every particle is a pure function of (time, seed): deterministic,
// loop-safe, no CPU simulation. Billboards with procedural fragment "kinds" (smoke, flame, spark...).
import * as THREE from 'three';
import { NOISE, DEPTH, SU } from './glsl.js';

export const KINDS = { soft: 0, spark: 1, smoke: 2, flame: 3, ring: 4, shard: 5, flake: 6, drop: 7, glint: 8, petal: 9, bubble: 10, rock: 11, streak: 12, dust: 13 };
const SHAPES = { point: 0, sphere: 1, disc: 2, ring: 3, box: 4, line: 5 };

const _c = new THREE.Color();
/** stops: [[u, color, alpha?], ...] with u in 0..1. Returns a 1D HalfFloat ramp texture (linear RGB, may be HDR via {hdr}). */
export function makeRamp(stops, n = 128) {
  const data = new Uint16Array(n * 4);
  const st = stops.map((s, i) => Array.isArray(s) ? s : [i / Math.max(1, stops.length - 1), s, 1]).map(([u, c, a = 1]) => {
    _c.set(c); return { u, r: _c.r, g: _c.g, b: _c.b, a };
  });
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1); let k = 0; while (k < st.length - 2 && u > st[k + 1].u) k++;
    const a = st[k], b = st[Math.min(k + 1, st.length - 1)]; const f = b.u === a.u ? 0 : Math.min(1, Math.max(0, (u - a.u) / (b.u - a.u)));
    const v = [a.r + (b.r - a.r) * f, a.g + (b.g - a.g) * f, a.b + (b.b - a.b) * f, a.a + (b.a - a.a) * f];
    for (let j = 0; j < 4; j++) data[i * 4 + j] = THREE.DataUtils.toHalfFloat(v[j]);
  }
  const tex = new THREE.DataTexture(data, n, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping; tex.needsUpdate = true;
  return tex;
}

const VERT = /* glsl */ `
${NOISE}
attribute vec4 aRnd; attribute vec4 aRnd2;
uniform float uTime, uDelay, uSpan, uPeriod, uSpread, uDrag, uRadial, uBounce, uFloorFade, uLit, uInt, uStretch, uRot, uSwirl, uSizePow, uSizeVar, uLightRange, uFlipY, uAspect, uReal;
uniform vec2 uLife, uSpeed, uSize, uTurb;
uniform vec3 uDir, uGravity, uShapeSize, uAmbient, uLightPos, uLightCol, uWind;
uniform int uShape, uKind;
uniform sampler2D uRamp;
varying vec2 vUv; varying float vU; varying vec4 vRnd; varying vec4 vCol; varying float vSp; varying float vL; varying vec3 vLd, vLc, vUp;

vec3 shapePos(vec4 r, vec4 r2){
  if(uShape==1){ float th=r.x*6.2831853, z=r.y*2.-1.; float s=sqrt(1.-z*z); vec3 d=vec3(s*cos(th),z,s*sin(th)); return d*mix(uShapeSize.y,uShapeSize.x,pow(max(r2.x,0.),.3333)); }
  if(uShape==2){ float th=r.x*6.2831853; return vec3(cos(th),0.,sin(th))*mix(uShapeSize.y,uShapeSize.x,sqrt(r2.x)); }
  if(uShape==3){ float th=r.x*6.2831853; return vec3(cos(th),0.,sin(th))*mix(uShapeSize.y,uShapeSize.x,r2.x); }
  if(uShape==4){ return (vec3(r.x,r2.x,r2.y)*2.-1.)*uShapeSize; }
  if(uShape==5){ return vec3((r.x*2.-1.)*uShapeSize.x,0.,0.); }
  return vec3(0.);
}
vec3 coneDir(vec4 r){
  float cs=mix(cos(uSpread),1.,r.y); float sn=sqrt(max(0.,1.-cs*cs)); float ph=r.z*6.2831853;
  vec3 up=normalize(uDir); vec3 a=abs(up.y)<.99?vec3(0,1,0):vec3(1,0,0);
  vec3 t=normalize(cross(up,a)); vec3 b=cross(up,t);
  return up*cs+(t*cos(ph)+b*sin(ph))*sn;
}
void main(){
  float life=mix(uLife.x,uLife.y,aRnd2.x);
  float birth=uDelay+aRnd.w*uSpan;
  float t=uTime-birth;
  if(uPeriod>0.) t=mod(t,uPeriod);
  float u=t/life;
  if(t<0. || u>1.){ gl_Position=vec4(2.,2.,2.,1.); vU=2.; return; }
  vec3 p0=shapePos(aRnd,aRnd2);
  vec3 dr=coneDir(aRnd);
  if(uRadial>0. && uShape!=0) dr=normalize(mix(dr,normalize(p0+vec3(1e-4)),uRadial));
  float speed=mix(uSpeed.x,uSpeed.y,aRnd2.y);
  vec3 v=dr*speed;
  float k=uDrag; vec3 disp,gd;
  if(k>1e-3){ float e=(1.-exp(-k*t))/k; disp=v*e; gd=uGravity*(t-e)/k; } else { disp=v*t; gd=.5*uGravity*t*t; }
  vec3 pos=p0+disp+gd+uWind*t*t*.5;
  if(uBounce>=0. && uGravity.y<0.){
    float a=.5*uGravity.y, b=v.y, c=p0.y; float D=b*b-4.*a*c;
    if(D>0.){ float th=(-b-sqrt(D))/(2.*a);
      if(t>th){ float t2=t-th; float vy2=-(v.y+uGravity.y*th)*uBounce; float y=vy2*t2+.5*uGravity.y*t2*t2;
        float tr=-2.*vy2/uGravity.y; if(y<0.||t2>tr) y=0.; pos.y=y;
        pos.xz=p0.xz+v.xz*th+v.xz*.5*(1.-exp(-3.*t2))/3.; } }
  }
  if(uTurb.x>0.){ vec3 q=vec3(aRnd.xy*7.,t*uTurb.y)+pos*.35; pos+=(vec3(vnoise(q),vnoise(q+17.1),vnoise(q+31.7))-.5)*2.*uTurb.x*(.3+u); }
  if(abs(uSwirl)>1e-4){ float ang=uSwirl*t*(.6+.8*aRnd2.y); float c=cos(ang), s=sin(ang); pos.xz=mat2(c,-s,s,c)*pos.xz; }
  float s=mix(uSize.x,uSize.y,pow(u,uSizePow))*(1.+(aRnd2.z-.5)*2.*uSizeVar);
  vec4 mv=modelViewMatrix*vec4(pos,1.);
  vec2 q=position.xy;
  vec3 vel=v*exp(-k*t)+uGravity*t;
  float sp=length(vel); vSp=sp;
  mat2 R=mat2(1.); vLd=vec3(0.,0.,1.); vLc=vec3(0.); vUp=vec3(0.,1.,0.);
  if(uStretch>0.){
    vec2 vv=(modelViewMatrix*vec4(vel,0.)).xy; float l=length(vv);
    vec2 d=l>1e-4?vv/l:vec2(0.,1.);
    float len=s*(1.+uStretch*sp*.1);
    q=vec2(q.x*s*.5, q.y*len); q=d.x*vec2(q.y,0.)*0.+ (d*q.y + vec2(-d.y,d.x)*q.x);
    mv.xy+=q;
  } else {
    float rt=(uKind==3?0.:aRnd2.w*6.2831853)+uRot*t*(aRnd2.y-.5)*2.; float c=cos(rt), sn=sin(rt);
    if(uKind==3) q.y+=.5; q.y*=uAspect;
    R=mat2(c,-sn,sn,c); q=R*q; mv.xy+=q*s;
  }
  gl_Position=projectionMatrix*mv;
  vUv=position.xy+.5; vU=u; vRnd=aRnd2;
  vec4 col=texture2D(uRamp,vec2(u,.5)); col.rgb*=uInt;
  vec3 wp=(modelMatrix*vec4(pos,1.)).xyz;
  vec3 dl=uLightPos-wp; float att=1./(1.+dot(dl,dl)/(uLightRange*uLightRange));
  if(uReal>.5){ float d2=dot(dl,dl), Rw=uLightRange*2.857; float x=d2/max(Rw*Rw,1e-4); float wn=clamp(1.-x*x,0.,1.); att=2.*wn*wn/(d2+1.); } // windowed inverse-square (UE/Frostbite); x2 = same as old at 1 m; Rw = light range
  vL=att;
  if(uReal>.5&&uLit>0.){ mat2 Rt=transpose(R); vec3 lv=(viewMatrix*vec4(dl,0.)).xyz; lv/=max(length(lv),1e-4); vLd=vec3(Rt*lv.xy,lv.z); vec3 uw=(viewMatrix*vec4(0.,1.,0.,0.)).xyz; vUp=vec3(Rt*uw.xy,uw.z); vLc=uLightCol*att; }
  else { vec3 L=uAmbient+uLightCol*att; col.rgb*=mix(vec3(1.),L,uLit); }
  if(uFloorFade>0.) col.a*=smoothstep(0.,uFloorFade,wp.y+s*.15);
  vCol=col;
}`;

const FRAG = /* glsl */ `
${NOISE}
uniform int uKind; uniform float uTime, uNoise, uLit, uSoft; uniform vec3 uAmbient;
${DEPTH}
varying vec2 vUv; varying float vU; varying vec4 vRnd; varying vec4 vCol; varying float vSp; varying float vL; varying vec3 vLd, vLc, vUp;
void main(){
  if(vU>1.5) discard;
  vec2 p=vUv*2.-1.; float d=length(p); float a=0.; vec3 col=vCol.rgb; float seed=vRnd.x*17.+vRnd.z*5.;
  if(uKind==0){ a=exp(-d*d*3.2)*(1.-smoothstep(.85,1.,d)); }
  else if(uKind==1){ float ux=vUv.y*2.-1.; a=exp(-p.x*p.x*22.)*smoothstep(1.,.55,abs(ux))*mix(.25,1.,vUv.y); col*=mix(.6,1.6,vUv.y); }
  else if(uKind==12){ a=exp(-p.x*p.x*60.)*(1.-smoothstep(0.,1.,vUv.y))*smoothstep(0.,.1,vUv.y); }
  else if(uKind==2){
    float n=fbm(vec3(vUv*2.6+vRnd.xy*9.,vU*.9+vRnd.z*5.)); float n2=fbm(vec3(vUv*2.6+vRnd.xy*9.+3.1,vU*.9+vRnd.z*5.+7.));
    a=smoothstep(1.,.15,d+(n-.5)*1.1); col*=.55+.9*n; col*=mix(.75,1.15,clamp(.5+(n-n2)*2.+p.y*.25,0.,1.));
  }
  else if(uKind==3){
    float x=p.x, y=vUv.y;
    float n=fbm(vec3(x*2.2,y*2.6-vU*3.,seed)); float n2=fbm(vec3(x*4.+3.,y*5.-vU*4.5,seed+7.));
    float w=.9*pow(max(1.-y,0.),.6)*smoothstep(0.,.18,y+.06); float wob=(n-.5)*1.8*y;   // teardrop: round base, thin noisy tip
    float m=smoothstep(.1,-.4,abs(x+wob)-w)*smoothstep(1.,.45,y)*smoothstep(-.05,.12,y);
    m*=smoothstep(.3,.75,n2+m*.5);                                                  // noise erosion: no straight edges
    float core=pow(m,2.2)*(1.-y*.8); float fl=.85+.3*sin(vU*31.+seed*7.);
    vec3 deep=col*col/max(max(col.r,max(col.g,col.b)),1e-3);
    a=m*(.4+.4*n); col=mix(deep*.55,col*1.3,clamp(core*1.6+n*.25,0.,1.))*fl;
    if(uReal>.5){ float hot=clamp(pow(max(core,0.),.7)*1.6+n*.25,0.,1.); col=mix(deep*.45,vCol.rgb*1.6,hot)*fl; col=mix(col,vec3(.08,.05,.04),smoothstep(.6,1.,y)*.6*(1.-hot)); } // HDR core, cooler sooty tips
  }
  else if(uKind==4){ float rr=abs(d-.78); a=exp(-rr*rr*160.)*(.6+.5*vnoise(vec3(atan(p.y,p.x)*3.,seed,uTime*2.))); }
  else if(uKind==5){ // faceted shard
    vec2 q=abs(p); float dm=q.x*(.9+vRnd.y*.6)+q.y*(.9+vRnd.w*.6); a=step(dm,.85); float f=(p.x*vRnd.y-p.y*vRnd.w>0.)?1.15:.55; col*=f*(.7+.5*hash12(floor(vUv*3.)+seed)); }
  else if(uKind==6){ float ang=atan(p.y,p.x); float arm=pow(abs(cos(ang*3.)),12.)*smoothstep(1.,.2,d); a=max(exp(-d*d*9.)*.9,arm*.9); }
  else if(uKind==7){ vec2 q=vec2(p.x*1.6,p.y*.8+.0); float dd=length(q*vec2(1.,.55)); a=exp(-dd*dd*3.)*smoothstep(1.,.7,abs(p.y)); col*=1.+.6*smoothstep(.3,-.6,p.y)*0.; }
  else if(uKind==8){ a=max(exp(-abs(p.x)*16.)*exp(-abs(p.y)*2.2),exp(-abs(p.y)*16.)*exp(-abs(p.x)*2.2)); a+=exp(-d*d*20.)*.9; a=clamp(a,0.,1.); }
  else if(uKind==9){ float fl=cos(vU*9.+seed); vec2 q=vec2(p.x,p.y/(.25+.75*abs(fl))); float dd=length(q*vec2(1.,1.4)); a=smoothstep(1.,.82,dd); col*=.65+.5*(fl>0.?1.:.6)*(.6+.4*vnoise(vec3(vUv*4.,seed))); }
  else if(uKind==10){ float rr=abs(d-.82); a=exp(-rr*rr*90.)*.9+smoothstep(.85,.3,d)*.12; a+=exp(-pow(length(p-vec2(-.35,.4))*5.,2.))*.9; col*=1.; }
  else if(uKind==11){ float n=vnoise(vec3(p*2.2,seed)); a=step(d+(n-.5)*.7,.78); vec3 nr=normalize(vec3(p*.8,.7)); float lam=clamp(dot(nr,normalize(vec3(.4,.8,.5))),0.,1.); col*=.35+.9*lam; col*=.6+.7*vnoise(vec3(p*7.,seed)); }
  else if(uKind==13){ float n=fbm(vec3(vUv*4.+seed,vU)); a=smoothstep(1.,.3,d)*smoothstep(.2,.7,n+.25)*.8; }
  if(uReal>.5&&uLit>0.){ vec3 N=normalize(vec3(p,sqrt(max(0.,1.-dot(p,p)))+.2)); float wr=max(0.,dot(N,vLd)*.5+.5); float bk=pow(max(0.,-vLd.z),2.)*(1.-N.z)*.6;
    col=pow(max(col,vec3(0.)),vec3(.7)); vec3 L=min(uAmbient*3.5,vec3(.6))*mix(.7,1.3,dot(N,vUp)*.5+.5)+vLc*(wr+bk); col*=mix(vec3(1.),min(L,vec3(2.5)),uLit); } // soot ramps are authored for a 0.1 ambient: lift darks, brighter sky ambient // sphere-normal sprite: wrap diffuse + back-light rim + hemi ambient
  a*=vCol.a*softF(uSoft); if(a<.003) discard;
  gl_FragColor=vec4(col*a,a);
}`;

const SOFT = [0.35, 0.05, 0.6, 0.15, 0.35, 0.05, 0.1, 0.1, 0.05, 0.1, 0.2, 0.05, 0.05, 0.6]; // depth-fade metres by KINDS index
const DEF = {
  count: 100, shape: 'point', size: 0.3, radius: 0, radiusIn: 0, shapeSize: null, dir: [0, 1, 0], spread: 0.3, speed: [1, 2],
  gravity: [0, 0, 0], wind: [0, 0, 0], drag: 0, life: [1, 2], delay: 0, emit: 0.001, loop: null, kind: 'soft', blend: 'add',
  ramp: [[0, '#fff', 1], [1, '#fff', 0]], intensity: 1, lit: 0, floorFade: 0, bounce: -1, radial: 0, turb: [0, 1], swirl: 0,
  stretch: 0, rot: 0, sizePow: 1, sizeVar: 0.3, order: 0,
};

export class Emitter {
  /** fx: owning Fx (for shared light uniforms, rng). p: params (see DEF). */
  constructor(fx, p = {}) {
    p = { ...DEF, ...p }; this.p = p; this.fx = fx;
    const rng = fx.rng; const n = Math.max(1, Math.round((p.count | 0) * (fx.o.countScale ?? 1)));
    const base = new THREE.PlaneGeometry(1, 1); const g = new THREE.InstancedBufferGeometry(); g.index = base.index;
    g.setAttribute('position', base.getAttribute('position')); g.setAttribute('uv', base.getAttribute('uv'));
    const r1 = new Float32Array(n * 4), r2 = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { for (let j = 0; j < 4; j++) { r1[i * 4 + j] = rng(); r2[i * 4 + j] = rng(); } r1[i * 4 + 3] = (i + rng() * 0.999) / n; }
    g.setAttribute('aRnd', new THREE.InstancedBufferAttribute(r1, 4)); g.setAttribute('aRnd2', new THREE.InstancedBufferAttribute(r2, 4));
    g.instanceCount = n;
    const size = Array.isArray(p.size) ? p.size : [p.size, p.size];
    const ss = p.shapeSize || [p.radius || 0, p.radiusIn || 0, 0];
    const kind = typeof p.kind === 'number' ? p.kind : KINDS[p.kind];
    const period = p.loop === false ? 0 : (p.loop === true || (p.loop == null && fx.loop)) ? (p.period || fx.duration) : 0;
    const lu = fx.lu;
    this.u = {
      uTime: { value: 0 }, uDelay: { value: p.delay }, uSpan: { value: period ? (p.emit > 0.01 ? p.emit : period) : p.emit }, uPeriod: { value: period },
      uLife: { value: new THREE.Vector2(...(Array.isArray(p.life) ? p.life : [p.life, p.life])) },
      uSpeed: { value: new THREE.Vector2(...(Array.isArray(p.speed) ? p.speed : [p.speed, p.speed])) },
      uSpread: { value: p.spread }, uDir: { value: new THREE.Vector3(...p.dir) }, uGravity: { value: new THREE.Vector3(...p.gravity) },
      uWind: { value: new THREE.Vector3(...p.wind) }, uDrag: { value: p.drag }, uRadial: { value: p.radial }, uBounce: { value: p.bounce },
      uShape: { value: SHAPES[p.shape] }, uShapeSize: { value: new THREE.Vector3(...ss) }, uKind: { value: kind }, uNoise: { value: 1 },
      uTurb: { value: new THREE.Vector2(...p.turb) }, uSwirl: { value: p.swirl }, uSize: { value: new THREE.Vector2(...size) },
      uSizePow: { value: p.sizePow }, uSizeVar: { value: p.sizeVar }, uStretch: { value: p.stretch }, uRot: { value: p.rot },
      uInt: { value: p.intensity }, uLit: { value: p.lit }, uFloorFade: { value: p.floorFade }, uFlipY: { value: 0 }, uAspect: { value: p.aspect ?? 1 },
      uRamp: { value: makeRamp(p.ramp) },
      uAmbient: lu.uAmbient, uLightPos: lu.uLightPos, uLightCol: lu.uLightCol, uLightRange: lu.uLightRange, uSoft: { value: p.soft ?? SOFT[kind] ?? 0.35 }, ...SU,
    };
    const add = p.blend === 'add';
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: add ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: add ? THREE.ZeroFactor : THREE.OneFactor, blendDstAlpha: add ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor });
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = (add ? 20 : 10) + p.order;
    if (p.pos) this.mesh.position.set(...p.pos);
    if (p.rot3) this.mesh.rotation.set(...p.rot3);
    fx.add(this.mesh);
    this.on = p.t0 != null || p.t1 != null; this.t0 = p.t0 ?? -1e9; this.t1 = p.t1 ?? 1e9;
  }
  update(tAbs, t) { this.u.uTime.value = tAbs; if (this.on) this.mesh.visible = t >= this.t0 && t <= this.t1; if (this.p.follow) this.p.follow(this.mesh, tAbs, t); }
  dispose() { this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.u.uRamp.value.dispose(); }
}
