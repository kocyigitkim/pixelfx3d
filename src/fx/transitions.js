import * as THREE from 'three';

/* Full-screen shader transitions. glsl defines vec3 trans(vec2 uv, vec3 c, float p, float t, float a)
   (tDiffuse = rendered frame is also available for refraction / displacement). Covered at p ~ 0.5. */
const TAU = Math.PI * 2;
const H = /* glsl */ `
float trs(float p){ return 1.-abs(1.-2.*p); }                 // 0 -> 1 (covered at p=.5) -> 0
float ez(float x){ x=clamp(x,0.,1.); return x*x*(3.-2.*x); }
float ezo(float x){ x=clamp(x,0.,1.); return 1.-pow(1.-x,3.); }
float ezi(float x){ x=clamp(x,0.,1.); return x*x*x; }
vec2 hash22(vec2 p){ vec3 p3=fract(vec3(p.xyx)*vec3(.1031,.1030,.0973)); p3+=dot(p3,p3.yzx+33.33); return fract((p3.xx+p3.yz)*p3.zy); }
`;

/* ---------------------------------------------------------------- a small lit diorama for the wipe to cover */
const diorama = (fx, v = 0) => {
  const warm = ['#ffb070', '#9fc0ff', '#ffd9a0', '#c0a0ff', '#a0ffd0'][v % 5], cols = [['#c0392b', '#2c7fb8', '#d9b44a'], ['#3aa0a0', '#a0453a', '#e0d8c8'], ['#8a5ac0', '#d9884a', '#4a9a6a'], ['#d0d0d8', '#c04a6a', '#4a7ad0'], ['#e0a030', '#3a6ac0', '#c05030']][v % 5];
  const base = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 0.18, 48), new THREE.MeshStandardMaterial({ color: '#2a2d36', metalness: 0.6, roughness: 0.3 })); base.position.y = 0.09; fx.mesh(base, null, { dur: 99 });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.55, 0.17, 160, 20), new THREE.MeshPhysicalMaterial({ color: cols[2], metalness: 1, roughness: 0.18, clearcoat: 0.5 })); knot.position.y = 1.25;
  fx.mesh(knot, (t) => { knot.rotation.set(t * 0.6, t * 0.9, 0); }, { dur: 99 });
  const orb = new THREE.Mesh(new THREE.SphereGeometry(0.5, 48, 32), new THREE.MeshPhysicalMaterial({ color: cols[0], roughness: 0.12, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.05 })); orb.position.set(-1.35, 0.68, 0.3); fx.mesh(orb, (t) => { orb.position.y = 0.68 + Math.sin(t * 2) * 0.05; }, { dur: 99 });
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8, 1, 1, 1), new THREE.MeshStandardMaterial({ color: cols[1], roughness: 0.35, metalness: 0.5 })); box.position.set(1.4, 0.58, 0.1); fx.mesh(box, (t) => { box.rotation.y = 0.5 + t * 0.4; }, { dur: 99 });
  const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.5, 16), new THREE.MeshStandardMaterial({ color: '#d8d4c8', roughness: 0.5 })); pil.position.set(-0.3, 0.93, -1.2); fx.mesh(pil, null, { dur: 99 });
  fx.light({ color: warm, intensity: 70, pos: [-1.5, 3.2, 2.5], range: 14 }); fx.light({ color: '#7aa0ff', intensity: 24, pos: [3, 2, -2], range: 12, main: false });
  fx.emitter({ count: 20, kind: 'flame', shape: 'disc', radius: 0.06, pos: [-0.3, 1.75, -1.2], dir: [0, 1, 0], spread: 0.1, speed: [0.2, 0.5], life: [0.5, 0.9], size: [0.3, 0.08], aspect: 1.8, ramp: [[0, '#fff2c0', 1], [0.3, '#ffb030', 0.9], [1, '#300', 0]], intensity: 0.7, loop: true, period: 3 });
  fx.emitter({ count: 24, kind: 'spark', shape: 'disc', radius: 0.05, pos: [-0.3, 1.8, -1.2], dir: [0, 1, 0], spread: 0.6, speed: [0.6, 1.8], life: [0.8, 1.6], gravity: [0, 0.3, 0], size: [0.04, 0.015], stretch: 0.5, ramp: [[0, '#fff6c0', 1], [0.5, '#ff8a20', 1], [1, '#400', 0]], intensity: 3, loop: true, period: 3 });
  fx.light({ color: '#ff9a40', intensity: 18, pos: [-0.3, 2, -1.1], range: 6, flicker: 0.3, main: false });
};
const VIEW = (v = 0) => ({ pos: [[3.4, 2.1, 4.6], [-3.2, 2.0, 4.8], [0.4, 3.2, 5.2], [3.8, 1.6, 3.9], [-2.6, 2.6, 4.9]][v % 5], target: [0, 1.0, 0], fov: 44 });
const SK = ['dusk', 'night', 'day', 'storm', 'dusk'];
const T = (id, name, dur, v, glsl, extra = {}) => ({ id: 'transitions/' + id, name, category: 'transitions', loop: false, duration: dur, stage: { sky: SK[v % 5], bloom: 0.45, view: VIEW(v), ...(extra.stage || {}) }, screen: { glsl: H + glsl }, build(fx) { diorama(fx, v); } });

export default [
  /* ================================================================ BLINDS */
  T('blinds', 'Blinds', 2.0, 0, /* glsl */ `
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float s=trs(p); float N=9.; float y=uv.y*N; float id=floor(y); float f=fract(y);
  float sp=clamp(s*1.75-(N-1.-id)/N*0.75,0.,1.); sp=ez(sp);
  float hf=sp*.5; float d=abs(f-.5);
  float sh=sp>.002?smoothstep(hf+.2,hf,d):0.; vec3 col=c*(1.-.6*sh*step(f,.5)-.35*sh*step(.5,f));
  if(d<hf+.003){
    float u=(f-.5)/max(hf,1e-3);
    vec3 n=normalize(vec3(0.,sqrt(max(0.,1.-sp*sp))*.9+u*.3,sp+.05)); vec3 L=normalize(vec3(.25,.8,.55)); vec3 V=vec3(0.,0.,1.);
    float df=max(dot(n,L),0.); float sp2=pow(max(dot(n,normalize(L+V)),0.),38.);
    float br=.5+.5*vnoise(vec3(uv.x*90.,id,1.)); vec3 base=vec3(.17,.18,.215);
    vec3 m=base*(.22+1.15*df)*(.9+.2*br)+sp2*vec3(1.,.93,.82)*.55*(.7+.3*br);
    float rim=smoothstep(.82,1.,u)*vec3(1.).x; m+=vec3(1.,.95,.88)*rim*.55*sp;  // lit top lip
    m*=mix(1.,.25,smoothstep(.85,1.,-u));                                      // dark lower lip
    m+=vec3(.5,.7,1.)*pow(1.-abs(u),6.)*.0;
    col=m*(1.-.7*(1.-sp)*(1.-sp));
  }
  return col; }`),

  /* ================================================================ BURN AWAY */
  T('burn-away', 'Burn Away', 3.0, 1, /* glsl */ `
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  vec2 q=uv*vec2(a,1.);
  float n=fbm(vec3(q*2.6,3.))*.75+fbm(vec3(q*9.,7.))*.25; float g=uv.y*.55+(n-.5)*.95+.35+(uv.x-.5)*.1;
  float ph=p<.5?0.:1.; float k=p<.5?ezo(p*2.):ez(p*2.-1.);
  float th=mix(-.35,1.25,k);
  float d=g-th;                                             // d<0 : burnt side
  vec3 ash=vec3(.012,.009,.008)*(.6+.8*fbm(vec3(q*14.,1.)));
  vec3 col=c; float ember=0.;
  if(ph<.5){
    // scorched paper ahead of front, white-hot rim, glowing breakup behind it
    float char=smoothstep(.2,.0,d); col=mix(c,c*vec3(.35,.17,.08)*.5,char*char);
    col*=1.-.7*smoothstep(.11,.0,d)*step(0.,d);
    float rim=exp(-pow(max(d,0.)*55.,2.));
    vec3 hot=mix(vec3(1.,.3,.04),vec3(1.,.9,.5),rim)*(1.2+3.*rim);
    float inside=step(d,0.);
    float cr=smoothstep(.68,.95,fbm(vec3(q*22.,t*.3)))*smoothstep(-.2,.0,d);
    col=mix(col,ash,inside);
    col+=hot*rim*step(-.006,d)*.8+vec3(1.,.3,.04)*cr*inside*(.8+1.6*smoothstep(-.2,0.,d));
    col+=vec3(1.,.45,.1)*exp(-pow(max(d,0.)*9.,2.))*.25*(1.-inside);
    ember=step(d,0.);
  } else {
    // cooling ash curtain peels away: ember glow on the lifting edge
    float cov=step(0.,d); col=mix(c,ash,cov);
    float rim=exp(-pow(abs(d)*20.,2.)); float cr=smoothstep(.68,.95,fbm(vec3(q*20.,t*.4)))*smoothstep(.3,0.,d)*cov;
    col+=vec3(1.,.4,.08)*(rim*1.4+cr*1.4)*.8;
    col+=vec3(1.,.3,.05)*exp(-pow(max(-d,0.)*14.,2.))*.25*(1.-cov);
  }
  // rising embers
  for(int i=0;i<3;i++){ vec2 cell=floor(q*vec2(26.,14.)*(1.+float(i)*.7)+vec2(float(i)*13.,-t*(1.5+float(i)))); vec2 h=hash22(cell+float(i)*7.1); vec2 f=fract(q*vec2(26.,14.)*(1.+float(i)*.7)+vec2(float(i)*13.,-t*(1.5+float(i))))-h; float e=smoothstep(.12,.0,length(f))*step(.94,hash12(cell+3.3)); col+=vec3(1.,.5,.12)*e*2.*smoothstep(-.1,.2,-abs(d)+.35); }
  return col; }`, { }),

  /* ================================================================ CRT OFF */
  T('crt-off', 'CRT Off', 2.0, 3, /* glsl */ `
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float off=p<.5?p*2.:2.-p*2.;                           // 0 on  -> 1 off -> 0 on
  float ph=p<.5?0.:1.;
  float hs=1.-ez(clamp(off/.62,0.,1.)); float ws=1.-ez(clamp((off-.62)/.38,0.,1.));
  hs=max(hs*hs,.0035); ws=max(ws,.0);
  vec2 q=uv-.5;
  // slight barrel curvature as the tube loses deflection
  vec2 b=q*(1.+dot(q,q)*.22*(.3+off));
  vec2 s=vec2(b.x/max(ws,.003),b.y/hs)+.5;
  float inside=step(0.,s.x)*step(s.x,1.)*step(0.,s.y)*step(s.y,1.);
  vec3 img=texture2D(tDiffuse,clamp(s,0.,1.)).rgb;
  // phosphor mask + scanlines
  float sl=.82+.18*sin(s.y*540.*3.14159); vec3 mask=.85+.15*vec3(sin(s.x*960.*3.14159*1.),sin(s.x*960.*3.14159+2.09),sin(s.x*960.*3.14159+4.18));
  img*=sl*mask*(1.+min(off*1.2/max(sqrt(hs),.06)*.35,1.2));
  img+=vec3(.35,.5,.45)*off*.12; // blue-green tube tint
  vec3 col=img*inside;
  // bright horizontal line + phosphor bloom
  float ay=abs(q.y); float lineW=.0022+.012*hs; float core=exp(-pow(ay/lineW,2.));
  float span=smoothstep(ws*.5+.02,ws*.5-.02,abs(q.x));
  vec3 ph1=vec3(.75,.95,1.);
  col+=ph1*core*span*(0.9+1.4*ez((off-.55)/.45))*step(.45,off);
  col+=ph1*exp(-ay*32.)*span*.35*smoothstep(.35,.9,off)*step(.02,off);
  // final dot
  float r=length(vec2(q.x*a,q.y)); float dotG=exp(-r*r*4000.)*1.4+exp(-r*r*400.)*.5+exp(-r*r*60.)*.12;
  col+=ph1*dotG*ez((off-.85)/.15);
  // afterglow when fully off decays, power-on flicker
  col=mix(col,vec3(0.),step(.995,off)*0.);
  float fl=1.+.25*sin(t*90.)*smoothstep(.0,.4,off)*(1.-smoothstep(.4,.7,off))*ph;
  col*=fl; return min(col,vec3(.8))+(1.-exp(-max(col-.8,0.)*5.))*.2; }`),

  /* ================================================================ DIAMOND WIPE */
  T('diamond-wipe', 'Diamond Wipe', 2.0, 4, /* glsl */ `
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float s=trs(p); float C=11.; vec2 g=vec2(uv.x*a,uv.y)*C; vec2 id=floor(g); vec2 lp=fract(g)-.5;
  vec2 ncell=vec2(a*C,C); float diag=(id.x/ncell.x+ (C-1.-id.y)/ncell.y)*.5;
  float sp=ez(clamp(s*1.9-diag*.9,0.,1.)); float r=sp*1.0+.0;           // diamond radius in |x|+|y| units (1.0 fills the cell)
  float dd=abs(lp.x)+abs(lp.y);
  vec3 col=c;
  // contact shadow around growing gems
  col*=1.-.5*smoothstep(r+.22,r,dd)*step(.001,sp)*(1.-step(r,dd)*0.);
  if(dd<r){
    // faceted jewel: four bevel facets + table
    vec2 sg=sign(lp+1e-4); float edge=r-dd; float bev=smoothstep(.0,.12,edge)*.0; vec2 ap=abs(lp); vec2 fc=ap.x>ap.y?vec2(sg.x,0.):vec2(0.,sg.y);
    vec3 n=normalize(vec3(fc*.9,.9));
    vec3 L=normalize(vec3(-.4,.7,.6)); float df=max(dot(n,L),0.); float spc=pow(max(dot(n,normalize(L+vec3(0.,0.,1.))),0.),30.);
    vec3 base=mix(vec3(.05,.07,.16),vec3(.16,.1,.3),hash12(id)); 
    vec3 m=base*(.4+1.3*df)+vec3(.7,.8,1.)*spc*.7*(1.-bev*.5);
    m+=vec3(.9,.95,1.)*(smoothstep(.04,.0,edge)*.9+smoothstep(.035,.0,abs(ap.x-ap.y))*.5*step(.02,r));                                 // lit edge line
    m+=vec3(.3,.5,1.)*pow(1.-bev,2.)*.0;
    float fac=hash12(id+floor(lp*2.+1.)); m*=.85+.3*fac;
    col=mix(m,c*.0+m,1.);
    // caustic sparkle
    col+=vec3(.6,.8,1.)*smoothstep(.97,1.,hash12(id+floor(t*6.)))*smoothstep(.1,.0,abs(lp.x))*.6;
  }
  return col; }`),

  /* ================================================================ GLITCH WIPE */
  T('glitch-wipe', 'Glitch Wipe', 1.8, 2, /* glsl */ `
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float s=trs(p); float fr=floor(t*18.); float act=ez(s*3.)*(1.-ez((s-.92)*12.))+0.;
  // block rows with random heights
  float row=floor(uv.y*mix(12.,34.,hash11(fr)))+fr*1.7; float rh=hash11(row);
  float row2=floor(uv.y*60.+fr*3.); float rh2=hash11(row2*1.3+fr);
  float dispAmt=(rh-.5)*.22*step(.55,hash11(row+fr))*act*(1.+s*2.);
  vec2 u2=uv+vec2(dispAmt+(rh2-.5)*.015*act,0.);
  // RGB split
  float sp2=.012*act*(.4+rh);
  vec3 img=vec3(texture2D(tDiffuse,u2+vec2(sp2,0.)).r,texture2D(tDiffuse,u2).g,texture2D(tDiffuse,u2-vec2(sp2,0.)).b);
  // pixel-sorted blocks
  vec2 bl=floor(uv*vec2(26.,15.)); float bh=hash12(bl+fr*.37);
  if(bh>1.-.25*act){ vec2 bc=(bl+.5)/vec2(26.,15.); img=texture2D(tDiffuse,bc).rgb*(.6+.8*hash12(bl+3.)); }
  // coverage: blocks flip to a dark glitch field
  vec2 cb=floor(uv*vec2(a*14.,16.)); float ch=hash12(cb*1.7+floor(t*10.)*.01); float cov=step(ch,s*1.25-.08);
  vec2 sb=floor(uv*vec2(a*14.,16.)*vec2(3.,2.)); float sch=hash12(sb+floor(t*24.))*.6+.4*hash12(floor(sb*.3));
  vec3 dark=vec3(.02,.015,.03); vec3 neon=mix(vec3(1.,.1,.7),vec3(.1,.9,1.),step(.5,hash12(cb+7.)))*(.5+1.5*step(.95,sch));
  vec3 fld=dark+neon*step(.9,sch)*.35*act+vec3(.0,.5,.4)*step(.97,hash12(vec2(floor(uv.y*200.),fr)))*act*.8;
  vec3 col=mix(img,fld,cov);
  // scan tear lines and static
  col+=vec3(.9)*step(.992,hash12(vec2(floor(uv.y*540.),fr)))*act*.6;
  col*=1.-.12*act*step(.5,fract(uv.y*270.));
  col=mix(col,col*vec3(1.,.6,1.2),.15*act);
  return col; }`),

  /* ================================================================ IRIS */
  T('iris', 'Iris', 2.2, 2, /* glsl */ `
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float s=trs(p); vec2 q=(uv-.5)*vec2(a,1.); float R=mix(1.35,.0,ezo(s)); 
  float N=8.; float ang=atan(q.y,q.x)+s*1.6; float sec=6.2831853/N; float ia=mod(ang,sec)-sec*.5;
  float r=length(q); 
  // polygonal aperture: blade edges are straight lines
  float apo=cos(sec*.5); float dpoly=r*cos(ia)/apo;            // distance along polygon normal / apothem
  float Rp=R*.98; float d=dpoly-Rp;
  vec3 col=c;
  // refracted scene near the opening (lens-ish) and soft shadow
  float inner=smoothstep(.0,-.18,d)*smoothstep(Rp*.0,Rp*.3,Rp);
  col=c*(1.-.5*smoothstep(-.12,.0,d)*step(d,0.));
  if(d>0.){
    float blade=floor((ang)/sec); float bid=hash11(blade);
    float u=(ia/sec)+.5;                                          // across blade
    float rad=clamp(d/(1.6),0.,1.);
    vec3 base=vec3(.06,.065,.075)*(.8+.5*bid);
    float seam=smoothstep(.02,.0,min(u,1.-u))*smoothstep(0.,.12,d);
    float sheen=pow(max(0.,sin(u*3.14159+bid*2.)),3.)*.55;
    float spec=pow(max(0.,1.-abs(u-.35-.2*bid)*4.),6.)*.5;
    vec3 m=base*(.6+sheen*2.)+vec3(.9,.92,1.)*spec*.18*(1.-rad*.5);
    m*=1.-seam*.8; m+=vec3(.5,.55,.65)*smoothstep(.08,.0,d)*.9*(0.6+.4*sheen*2.); // lit edge of the blade
    m+=vec3(.7,.75,.9)*.05*fbm(vec3(q*30.,bid));
    col=m;
  }
  return col; }`),

  /* ================================================================ PIXEL DISSOLVE */
  T('pixel-dissolve', 'Pixel Dissolve', 2.2, 4, /* glsl */ `
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float s=trs(p); float C=30.; vec2 g=vec2(uv.x*a,uv.y)*C; vec2 id=floor(g); vec2 lp=fract(g)-.5;
  float h=hash12(id); float h2=hash12(id+9.7); float wave=(uv.x*.4+(1.-uv.y)*.3);
  float k=clamp((s*1.5-(h*.7+wave*.3)*.85)/.3,0.,1.);                // per-cell progress 0..1
  vec2 cuv=(id+.5)/vec2(a*C,C); vec3 mos=texture2D(tDiffuse,cuv).rgb;
  vec3 col=c;
  float tile=ez(k);
  if(k>0.){
    float sz=.5*tile+.0; float m=max(abs(lp.x),abs(lp.y));
    float pre=smoothstep(0.,.4,k);
    col=mix(c,mos,pre);                                                         // cell pixelates first
    vec3 glow=mix(vec3(.1,.8,1.),vec3(1.,.3,.8),h2)*3.;
    col+=glow*smoothstep(.3,.6,k)*(1.-smoothstep(.6,1.,k))*.25;                  // neon flash before it goes dark
    if(m<sz+.0){
      float bev=smoothstep(sz-.09,sz,m); vec3 base=vec3(.025,.03,.045)*(.8+.5*h2);
      vec3 n=normalize(vec3(sign(lp.x)*bev*.8*step(abs(lp.y),abs(lp.x)),sign(lp.y)*bev*.8*step(abs(lp.x),abs(lp.y)),1.));
      float df=max(dot(n,normalize(vec3(-.4,.6,.7))),0.);
      vec3 tl=base*(.5+1.5*df)+vec3(.4,.6,.9)*bev*.18*df;
      tl+=vec3(.1,.7,1.)*smoothstep(.05,.0,sz-m)*(1.-ez((k-.7)*3.))*.8;
      col=mix(col,tl,smoothstep(.3,.6,k));
    }
    float full=smoothstep(.85,1.,k); col=mix(col,vec3(.02,.025,.04)*(.6+.8*smoothstep(.45,.5,m))+vec3(.1,.5,.7)*smoothstep(.49,.5,m)*.12,full*step(sz,m)*0.);
  }
  return col; }`),

  /* ================================================================ SHATTER WIPE */
  T('shatter-wipe', 'Shatter Wipe', 2.8, 3, /* glsl */ `
vec4 vor2(vec2 p){ vec2 i=floor(p), f=fract(p); float d1=8., d2=8.; vec2 c1=vec2(0.);
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){ vec2 g=vec2(float(x),float(y)); vec2 o=hash22(i+g); vec2 r=g+o-f; float d=dot(r,r);
    if(d<d1){ d2=d1; d1=d; c1=i+g+o; } else if(d<d2){ d2=d; } }
  return vec4(c1,sqrt(d1),sqrt(d2)-sqrt(d1)); }
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float s=trs(p); float C=7.5; vec2 P=vec2(uv.x*a,uv.y); vec2 imp=vec2(.5*a,.55);
  vec4 v=vor2(P*C); vec2 cen=v.xy/C; float edge=v.w;
  float di=length(cen-imp);
  float crack=ez((s*5.-di*2.5+.1)/.8);                     // cracks spread from the impact point
  float fall=clamp((s-.2)*2.2-di*.55,0.,1.);               // each shard releases, then tumbles away
  float f2=fall*fall;
  vec2 lp=P-cen; float ang=(hash12(v.xy)-.5)*2.6*f2; float cs=cos(ang), sn=sin(ang);
  vec2 off=vec2((hash12(v.xy+3.)-.5)*.5,-.9-hash12(v.xy+5.)*.6)*f2*.55;
  float sc=1.-.85*ez(fall*1.1);
  vec2 sp=(mat2(cs,sn,-sn,cs)*(lp-off))/max(sc,.05);   // inverse transform -> source point in the shard
  float inCell=step(length(sp),length(lp)*0.+max(.35,0.))*0.;
  vec2 S=cen+sp;
  vec4 v2=vor2(S*C); float same=step(length(v2.xy-v.xy),.0001);
  // glass refraction: each shard is tilted
  vec2 tilt=(hash22(v.xy+11.)-.5)*.03*(1.+fall*4.);
  vec2 suv=vec2(S.x/a,S.y)+tilt;
  vec3 img=texture2D(tDiffuse,clamp(suv,0.,1.)).rgb;
  vec3 gl=img*(.92+.25*hash12(v.xy+5.))+vec3(.15,.2,.25)*.0;
  gl+=vec3(.5,.7,.9)*(.15*hash12(floor(v.xy*3.)))*fall;                      // facet sheen
  vec3 bg=vec3(.01,.012,.02)+vec3(.05,.07,.1)*fbm(vec3(P*2.,t*.1))*.5*fall;
  float ed=smoothstep(.03,.0,v2.w);                                         // bright refracting edge
  gl+=vec3(.8,.92,1.)*ed*(.5+1.2*fall)*same;
  vec3 col=mix(bg,gl,same*step(fall,.999));
  // crack lines before they fall (under the intact glass)
  float cl=smoothstep(.05,.0,edge)*crack*(1.-step(.001,fall));
  col=mix(col,col*.75+vec3(.7,.85,1.)*.55,cl);
  float ring=exp(-pow((length(P-imp)-s*3.)*4.,2.))*.0;
  col+=vec3(.7,.85,1.)*exp(-length(P-imp)*18.)*(1.-ez(s*4.))*s*3.;          // impact flash
  col=mix(col,vec3(0.),smoothstep(.97,1.,fall)*0.);
  return col; }`),

  /* ================================================================ SLASH WIPE */
  T('slash-wipe', 'Slash Wipe', 1.7, 1, /* glsl */ `
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float s=trs(p); vec2 P=(uv-.5)*vec2(a,1.); vec2 dir=normalize(vec2(1.,-.38)); vec2 nrm=vec2(-dir.y,dir.x);
  float sd=dot(P,nrm); float al=dot(P,dir);                                    // across / along the cut
  float L=length(vec2(a,1.))*.6;
  float sweep=ezo(clamp(s/.18,0.,1.));                                         // blade travels along the line
  float head=mix(-L,L,sweep);
  float gap=ez(clamp((s-.16)/.84,0.,1.))*.95;                                 // halves slide away
  float side=sign(sd+1e-5); float sdm=sd-side*gap;
  vec2 Ps=P-nrm*side*gap; vec2 suv=Ps/vec2(a,1.)+.5;
  float ok=step(0.,sdm*side)*step(.0,suv.x)*step(suv.x,1.)*step(.0,suv.y)*step(suv.y,1.)*step(-head,-al+.0)*0.+step(0.,sdm*side)*step(.0,suv.x)*step(suv.x,1.)*step(.0,suv.y)*step(suv.y,1.);
  float cutDone=step(al,head);                                                 // cut exists behind the blade tip
  vec3 img=texture2D(tDiffuse,clamp(suv,0.,1.)).rgb;
  vec3 bg=vec3(.01,.01,.014)+vec3(.8,.15,.05)*exp(-abs(sdm)*3.)*.0;
  vec3 col=mix(bg,img,mix(1.,ok,cutDone));
  float d=abs(sd);
  // cut edges glow (white-hot core, orange falloff), brightest at the blade tip
  float w=mix(.004,.02,ez(s*4.)); float edgeA=exp(-pow(d/w,2.))*cutDone*(1.-ez((s-.3)*2.2))*0.;
  float nearEdge=abs(sdm);
  float hot=exp(-nearEdge*nearEdge/(w*w+.0004))*step(0.,sdm*side)*ok*cutDone*(1.-ez((s-.12)*1.6));
  col+=vec3(1.,.55,.2)*hot*2.2+vec3(1.)*exp(-nearEdge*nearEdge*40000.)*ok*cutDone*(1.-ez((s-.1)*3.))*3.;
  col*=1.-.4*smoothstep(.08,.0,nearEdge)*cutDone*ok*0.;
  // the blade streak itself
  float tip=exp(-pow((al-head)*9.,2.))*exp(-pow(d*26.,2.))*step(s,.2);
  float tail=smoothstep(.9,.0,(head-al)/ (L*.9))*step(al,head)*exp(-pow(d*60.,2.))*step(s,.22);
  col+=vec3(.8,.95,1.)*(tip*5.+tail*3.);
  // slash flash
  col+=vec3(.7,.8,1.)*.25*exp(-pow((s-.04)*30.,2.));
  // sparks along the cut
  vec2 cell=floor(vec2(al*40.,sd*40.)+vec2(0.,-floor(t*30.))); float sp=step(.985,hash12(cell))*exp(-d*6.)*cutDone*(1.-ez((s-.1)*3.));
  col+=vec3(1.,.8,.4)*sp*3.;
  return col; }`),

  /* ================================================================ STAR IRIS */
  T('star-iris', 'Star Iris', 2.2, 0, /* glsl */ `
float sdStar5(vec2 p,float r,float rf){ const vec2 k1=vec2(.809016994375,-.587785252292); const vec2 k2=vec2(-k1.x,k1.y);
  p.x=abs(p.x); p-=2.*max(dot(k1,p),0.)*k1; p-=2.*max(dot(k2,p),0.)*k2; p.x=abs(p.x); p.y-=r;
  vec2 ba=rf*vec2(-k1.y,k1.x)-vec2(0.,1.); float h=clamp(dot(p,ba)/dot(ba,ba),0.,r); return length(p-ba*h)*sign(p.y*ba.x-p.x*ba.y); }
float starD(vec2 q,float s){ float R=mix(1.8,.0,ezo(s)); float an=s*2.4; float cs=cos(an), sn=sin(an); q=mat2(cs,-sn,sn,cs)*q; return sdStar5(q,R,.45)*1.0; }
vec3 trans(vec2 uv, vec3 c, float p, float t, float a){
  float s=trs(p); vec2 q=(uv-.5)*vec2(a,1.);
  float d=starD(q,s); float e=.003;
  vec2 gr=vec2(starD(q+vec2(e,0.),s)-starD(q-vec2(e,0.),s),starD(q+vec2(0.,e),s)-starD(q-vec2(0.,e),s))/(2.*e);
  vec3 col=c*(1.-.55*smoothstep(-.15,.0,d)*step(d,0.));
  if(d>0.){
    vec3 sky=mix(vec3(.02,.03,.09),vec3(.08,.05,.16),uv.y)+vec3(.04,.05,.1)*fbm(vec3(q*3.,t*.05));
    vec2 sc=floor(q*60.); float sh=hash12(sc); float st=step(.985,sh)*smoothstep(.3,.0,length(fract(q*60.)-.5))*(.6+.4*sin(t*4.+sh*30.)); sky+=vec3(.8,.9,1.)*st;
    float bev=smoothstep(.07,.0,d); vec3 n=normalize(vec3(-gr*bev*1.4,1.)); float df=max(dot(n,normalize(vec3(-.5,.6,.65))),0.); float spc=pow(max(dot(n,normalize(normalize(vec3(-.5,.6,.65))+vec3(0.,0.,1.))),0.),24.);
    vec3 gold=vec3(1.,.72,.25); col=mix(sky,gold*(.25+1.1*df)+vec3(1.,.95,.8)*spc*.8,bev);
    col+=gold*exp(-d*30.)*.7*(1.-bev*0.);                                  // gold halo spilling on the sky
    // sparkles drifting from the rim
    vec2 cell=floor(vec2(atan(q.y,q.x)*40.,d*30.)+vec2(0.,-floor(t*8.))); float tw=step(.965,hash12(cell))*exp(-d*10.); col+=vec3(1.,.9,.6)*tw*3.;
  } else { col+=vec3(1.,.8,.4)*exp(d*45.)*.35; }
  return col; }`),
];
