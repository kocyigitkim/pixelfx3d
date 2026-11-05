// Procedural mannequin ("the dummy") with a shader-overlay body material (dissolve, frost, stone, tint, rim, scan),
// plus a straw target and keyframed act poses. Character faces +X, stands on y=0, about 1.8 m tall.
import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { clamp, easeInOut, lerp } from './rng.js';

const D = Math.PI / 180;

/* ---------------------------------------------------------------- body overlay material */
export function bodyUniforms() {
  return { uTime: { value: 0 }, uDissolve: { value: -1 }, uDDir: { value: 1 }, uEdge: { value: new THREE.Color('#ff7a1a') }, uEdgeW: { value: 0.05 }, uEdgeInt: { value: 4 },
    uTint: { value: new THREE.Color('#ffffff') }, uTintAmt: { value: 0 }, uFrost: { value: 0 }, uStone: { value: 0 }, uRim: { value: new THREE.Color('#66aaff') }, uRimAmt: { value: 0 },
    uAlpha: { value: 1 }, uScan: { value: -10 }, uScanCol: { value: new THREE.Color('#5ff') }, uEmit: { value: new THREE.Color('#000') }, uHolo: { value: 0 }, uGlow: { value: 0 } };
}
export function makeBodyMaterial(u, color = '#8d939c', params = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.15, ...params });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBW=(modelMatrix*vec4(transformed,1.)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>\n${NOISE}\nvarying vec3 vBW; uniform float uTime,uDissolve,uDDir,uEdgeW,uEdgeInt,uTintAmt,uFrost,uStone,uRimAmt,uAlpha,uScan,uHolo,uGlow; uniform vec3 uEdge,uTint,uRim,uScanCol,uEmit;`)
      .replace('#include <dithering_fragment>', `
      float hh=clamp(vBW.y/1.9,0.,1.); float dn=fbm3(vBW*5.+vec3(0.,0.,uTime*.1));
      float dv=(uDDir>0.? hh:1.-hh)+(dn-.5)*.35;
      if(uDissolve>-.5){ float lvl=uDissolve*1.5-.2; if(dv<lvl) discard; float e=smoothstep(lvl+uEdgeW,lvl,dv); gl_FragColor.rgb+=uEdge*uEdgeInt*e*step(lvl,dv+.0001); gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(.02),smoothstep(lvl+uEdgeW*3.,lvl+uEdgeW,dv)*.6*step(.001,uDissolve)); }
      float lum=dot(gl_FragColor.rgb,vec3(.3,.5,.2));
      if(uStone>0.){ float sn=fbm(vBW*9.); vec3 stone=vec3(.42,.41,.4)*(.6+.8*sn)*(.4+lum*2.); gl_FragColor.rgb=mix(gl_FragColor.rgb,stone,smoothstep(0.,.05,uStone-(1.-hh)*.0)*clamp(uStone*1.4-(hh)*.4+.0,0.,1.)); }
      if(uFrost>0.){ vec2 vo=voronoi(vBW*14.); float cr=smoothstep(.16,.0,vo.y); float fn=fbm(vBW*7.); float m=smoothstep(uFrost*1.2,uFrost*.6,(1.-hh)*.6+fn*.5+(uFrost<0.?0.:0.)); m=clamp(uFrost*1.6-(1.-fn)*.6-(hh)*.35,0.,1.); gl_FragColor.rgb=mix(gl_FragColor.rgb,mix(vec3(.55,.8,1.),vec3(1.),cr)*(.7+.6*fn),m); gl_FragColor.rgb+=vec3(.3,.6,1.)*cr*m*.8; }
      gl_FragColor.rgb=mix(gl_FragColor.rgb,uTint*(.25+lum*2.),uTintAmt);
      { vec3 Nn=normalize(vNormal); vec3 Vv=normalize(vViewPosition); float fr=pow(1.-abs(dot(Nn,Vv)),2.6); gl_FragColor.rgb+=uRim*fr*uRimAmt+uEmit; }
      if(uScan>-5.){ float d=abs(vBW.y-uScan); gl_FragColor.rgb+=uScanCol*exp(-d*d*900.)*5.+uScanCol*step(vBW.y,uScan)*.18*(.5+.5*sin(vBW.y*160.)); }
      if(uHolo>0.){ float sl=.55+.45*sin(vBW.y*220.-uTime*8.); vec3 Nn=normalize(vNormal); vec3 Vv=normalize(vViewPosition); float fr=pow(1.-abs(dot(Nn,Vv)),1.6); gl_FragColor.rgb=mix(gl_FragColor.rgb,uScanCol*(.35+fr*2.5)*sl,uHolo); gl_FragColor.a*=mix(1.,.35+fr*.65,uHolo); }
      gl_FragColor.rgb+=uTint*uGlow*(.2+.8*sq(1.-abs(dot(normalize(vNormal),normalize(vViewPosition)))));
      gl_FragColor.a*=uAlpha;
      #include <dithering_fragment>`);
  };
  m.transparent = true; m.alphaTest = 0;
  return m;
}

/* ---------------------------------------------------------------- poses */
const P = (o) => ({ py: 0.95, lean: 0, twist: 0, head: 0, aR: 15, eR: 60, aL: 10, eL: 55, rR: 0, rL: 0, tR: 10, kR: -18, tL: -12, kL: -14, x: 0, ...o });
export const POSES = {
  idle: P({}), guard: P({ aR: 55, eR: 80, aL: 45, eL: 85, lean: -4, tR: 18, kR: -25, tL: -14, kL: -20, py: 0.92 }),
  windupHigh: P({ aR: 150, eR: 45, aL: 40, eL: 60, lean: 12, twist: -28, py: 0.93, kR: -22 }), cut: P({ aR: 48, eR: 10, aL: 20, eL: 40, lean: -18, twist: 22, py: 0.88, tR: 26, kR: -38, tL: -20, kL: -10, x: 0.18 }),
  follow: P({ aR: 25, eR: 5, aL: 10, eL: 40, lean: -24, twist: 30, py: 0.87, tR: 28, kR: -42, x: 0.22 }),
  sideBack: P({ aR: 20, eR: 20, rR: 80, lean: 0, twist: -70, py: 0.9 }), sideCut: P({ aR: 80, eR: 5, rR: 0, lean: -6, twist: 65, py: 0.88, tR: 24, kR: -30, x: 0.15 }),
  overheadUp: P({ aR: 172, eR: 18, aL: 168, eL: 18, lean: 16, py: 0.97, kR: -10, tR: 6 }), smashDown: P({ aR: 42, eR: 6, aL: 40, eL: 6, lean: -38, py: 0.82, tR: 38, kR: -55, tL: -14, kL: -26, x: 0.22 }),
  pullback: P({ aR: 70, eR: 115, aL: 55, eL: 80, twist: -35, lean: 4, py: 0.88, tR: -8, kR: -30, tL: 20, kL: -30 }), lunge: P({ aR: 92, eR: 0, aL: 40, eL: 70, twist: 38, lean: -10, py: 0.78, tR: 48, kR: -62, tL: -34, kL: -8, x: 0.4 }),
  castCharge: P({ aR: 98, eR: 50, aL: 98, eL: 50, lean: 6, py: 0.94, tR: 8, kR: -14 }), castRelease: P({ aR: 92, eR: 0, aL: 92, eL: 2, lean: -10, py: 0.9, tR: 14, kR: -26, x: 0.1 }),
  castUp: P({ aR: 165, eR: 8, aL: 165, eL: 8, lean: 14, py: 0.97 }), crouch: P({ py: 0.6, tR: 72, kR: -125, tL: 72, kL: -125, lean: -26, aR: 40, eR: 40, aL: 40, eL: 40 }),
  leap: P({ py: 1.45, aR: 165, eR: 10, aL: 165, eL: 10, tR: 40, kR: -80, tL: 50, kL: -90, lean: 8 }), land: P({ py: 0.52, tR: 78, kR: -128, tL: 78, kL: -128, lean: -32, aR: 30, eR: 20, aL: 30, eL: 20 }),
  throwBack: P({ aR: -50, eR: 40, aL: 80, eL: 20, twist: -50, lean: 14, py: 0.9 }), throwFwd: P({ aR: 130, eR: 10, aL: -20, eL: 30, twist: 50, lean: -22, py: 0.86, x: 0.2, tR: 26, kR: -36 }),
  upLow: P({ aR: -38, eR: 28, aL: 20, eL: 70, lean: -12, twist: -20, py: 0.74, tR: 44, kR: -85, tL: -22, kL: -40, x: 0.05 }), upHigh: P({ aR: 160, eR: 10, aL: 30, eL: 80, lean: 16, twist: 22, py: 0.98, tR: 14, kR: -8, tL: -8, kL: -8, x: 0.22 }),
  daggerA: P({ aR: 70, eR: 70, aL: 40, eL: 80, twist: -25, lean: -8, py: 0.86, x: 0.2, tR: 30, kR: -45 }), daggerB: P({ aR: 40, eR: 20, aL: 35, eL: 80, twist: 28, lean: -14, py: 0.85, x: 0.28, tR: 30, kR: -45 }),
  sweepBack: P({ aR: 50, eR: 6, rR: 40, aL: 40, eL: 70, twist: -62, lean: -14, py: 0.64, tR: 70, kR: -120, tL: 60, kL: -110, x: 0.05 }), sweepCut: P({ aR: 50, eR: 4, rR: 0, aL: 30, eL: 60, twist: 58, lean: -16, py: 0.62, tR: 66, kR: -112, tL: 64, kL: -118, x: 0.25 }),
  thrustBack: P({ aR: -5, eR: 95, aL: 30, eL: 80, twist: -35, lean: 6, py: 0.86, tR: -8, kR: -30, tL: 20, kL: -30 }), smashGround: P({ aR: 24, eR: 4, aL: 24, eL: 4, lean: -20, py: 0.8, tR: 38, kR: -55, tL: -14, kL: -26, x: 0.25 }),
  roar: P({ aR: 35, eR: 30, aL: 35, eL: 30, lean: 14, head: 14, py: 0.9, tR: 16, kR: -28, tL: -16, kL: -24 }), armsWide: P({ aR: 125, eR: 8, rR: 40, aL: 125, eL: 8, rL: 40, lean: 6, py: 0.95 }),
  hurt: P({ lean: 20, aR: -20, eR: 20, aL: -20, eL: 20, py: 0.9, head: -12 }),
};
const ACTS = {
  slash: (w) => [[-w, 'guard'], [-w * 0.4, 'windupHigh'], [0, 'cut', 'snap'], [0.1, 'follow'], [0.8, 'guard']],
  sideslash: (w) => [[-w, 'guard'], [-w * 0.4, 'sideBack'], [0, 'sideCut', 'snap'], [0.1, 'follow'], [0.8, 'guard']],
  smash: (w) => [[-w, 'guard'], [-w * 0.5, 'overheadUp'], [0, 'smashDown', 'snap'], [0.35, 'smashDown'], [1.1, 'guard']],
  thrust: (w) => [[-w, 'guard'], [-w * 0.4, 'pullback'], [0, 'lunge', 'snap'], [0.25, 'lunge'], [0.9, 'guard']],
  cast: (w) => [[-w, 'guard'], [-w * 0.45, 'castCharge'], [0, 'castRelease', 'snap'], [0.5, 'castRelease'], [1.2, 'guard']],
  castup: (w) => [[-w, 'guard'], [-w * 0.5, 'castCharge'], [0, 'castUp'], [0.8, 'castUp'], [1.4, 'guard']],
  stomp: (w) => [[-w, 'guard'], [-w * 0.6, 'crouch'], [-w * 0.2, 'leap'], [0, 'land', 'snap'], [0.5, 'land'], [1.2, 'guard']],
  throw: (w) => [[-w, 'guard'], [-w * 0.4, 'throwBack'], [0, 'throwFwd', 'snap'], [0.4, 'throwFwd'], [1., 'guard']],
  none: () => [[0, 'idle']],
};

/* ---------------------------------------------------------------- the dummy */
export class Dummy extends THREE.Group {
  constructor(opts = {}) {
    super(); this.u = bodyUniforms(); const mat = makeBodyMaterial(this.u, opts.color || '#8e949d'); const joint = makeBodyMaterial(this.u, '#4d535c', { roughness: 0.7 });
    const cap = (r, l, m = mat) => { const g = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m); g.castShadow = true; return g; };
    this.pelvis = new THREE.Group(); this.add(this.pelvis);
    const hip = cap(0.15, 0.08, joint); hip.rotation.x = Math.PI / 2; this.pelvis.add(hip);
    this.torso = new THREE.Group(); this.pelvis.add(this.torso); const chest = cap(0.17, 0.3); chest.position.y = 0.3; chest.scale.z = 1.25; this.torso.add(chest);
    this.neck = new THREE.Group(); this.neck.position.y = 0.66; this.torso.add(this.neck); const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 24, 18), mat); head.position.y = 0.12; head.scale.set(1.05, 1.15, 1); this.neck.add(head); this.headMesh = head;
    const mkArm = (s) => { const sh = new THREE.Group(); sh.position.set(0, 0.56, 0.23 * s); this.torso.add(sh); const up = cap(0.055, 0.2); up.position.y = -0.17; sh.add(up); const el = new THREE.Group(); el.position.y = -0.34; sh.add(el);
      const lo = cap(0.045, 0.2); lo.position.y = -0.16; el.add(lo); const hand = new THREE.Group(); hand.position.y = -0.34; el.add(hand); const palm = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), joint); hand.add(palm); return { sh, el, hand }; };
    this.armR = mkArm(1); this.armL = mkArm(-1);
    const mkLeg = (s) => { const th = new THREE.Group(); th.position.set(0, -0.05, 0.1 * s); this.pelvis.add(th); const t = cap(0.07, 0.3); t.position.y = -0.24; th.add(t); const kn = new THREE.Group(); kn.position.y = -0.46; th.add(kn);
      const sh = cap(0.055, 0.32); sh.position.y = -0.22; kn.add(sh); const ft = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.11), joint); ft.position.set(0.07, -0.47, 0); kn.add(ft); return { th, kn }; };
    this.legR = mkLeg(1); this.legL = mkLeg(-1);
    this.pose = { ...POSES.idle }; this.setPose(POSES.idle);
    if (opts.weapon) this.holdWeapon(opts.weapon);
  }
  holdWeapon(kind = 'sword') {
    this.weapon?.removeFromParent(); const g = new THREE.Group(); const steel = new THREE.MeshStandardMaterial({ color: '#c9d1da', metalness: 1, roughness: 0.22 }); const grip = new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.8 });
    if (kind === 'hammer') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 10), grip); h.position.y = -0.4; g.add(h); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.2), steel); hd.position.y = -0.92; g.add(hd); }
    else if (kind === 'spear') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8), grip); h.position.y = -0.7; g.add(h); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.25, 8), steel); tip.position.y = -1.67; tip.rotation.z = Math.PI; g.add(tip); }
    else if (kind === 'dagger') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.01), steel); b.position.y = -0.27; g.add(b); const gd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.12), steel); gd.position.y = -0.07; g.add(gd); const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 8), grip); hl.position.y = 0.0; g.add(hl); }
    else if (kind === 'scythe') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.6, 8), grip); h.position.y = -0.55; g.add(h); const bl = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.62), steel); bl.position.set(0, -1.38, 0.28); bl.rotation.x = 0.0; g.add(bl); const bt = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 4), steel); bt.rotation.x = -Math.PI / 2; bt.position.set(0, -1.4, 0.68); g.add(bt); }
    else if (kind === 'whip') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.3, 8), grip); h.position.y = -0.1; g.add(h); }
    else if (kind === 'staff') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.5, 8), grip); h.position.y = -0.5; g.add(h); const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 2), new THREE.MeshStandardMaterial({ color: '#8cf', emissive: '#48f', emissiveIntensity: 2 })); orb.position.y = -1.28; g.add(orb); }
    else { const b = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.95, 0.012), steel); b.position.y = -0.58; g.add(b); const gd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.22), steel); gd.position.y = -0.1; g.add(gd); const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), grip); hl.position.y = 0.02; g.add(hl); }
    this.armR.hand.add(g); g.rotation.z = Math.PI; this.weapon = g; // blade continues forearm direction
    g.rotation.z = 0; this.weaponKind = kind;
  }
  setPose(p) {
    const q = this.pose = p; this.pelvis.position.set(q.x, q.py, 0); this.torso.rotation.set(0, q.twist * D, -q.lean * D); this.neck.rotation.z = q.head * D;
    this.armR.sh.rotation.set(q.rR * D, 0, q.aR * D); this.armR.el.rotation.z = q.eR * D; this.armL.sh.rotation.set(-q.rL * D, 0, q.aL * D); this.armL.el.rotation.z = q.eL * D;
    this.legR.th.rotation.z = q.tR * D; this.legR.kn.rotation.z = q.kR * D; this.legL.th.rotation.z = q.tL * D; this.legL.kn.rotation.z = q.kL * D;
    // keep feet planted-ish: lower the pelvis if legs are bent (approximate): handled by pose py values
  }
  /** world position of the weapon tip / hand (for effects that need to follow the blade) */
  tip(l = 1.0, out = new THREE.Vector3()) { return this.armR.hand.localToWorld(out.set(0, -l, 0)); }
  set(o) { for (const k in o) { const v = o[k]; const t = this.u['u' + k[0].toUpperCase() + k.slice(1)]; if (!t) continue; if (t.value?.isColor) t.value.set(v); else t.value = v; } }
  reset() { Object.assign(this.u.uDissolve, { value: -1 }); this.u.uTintAmt.value = 0; this.u.uFrost.value = 0; this.u.uStone.value = 0; this.u.uRimAmt.value = 0; this.u.uAlpha.value = 1; this.u.uScan.value = -10; this.u.uHolo.value = 0; this.u.uGlow.value = 0; this.u.uEmit.value.set(0); }
}

export function lerpPose(a, b, t) { const o = {}; for (const k in a) o[k] = lerp(a[k], b[k], t); return o; }

/** Straw training target. kick(strength) rocks it back; update(dt) springs. */
export class Target extends THREE.Group {
  constructor() {
    super(); const wood = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.9 }); const straw = new THREE.MeshStandardMaterial({ color: '#c9a64f', roughness: 1 });
    this.pivot = new THREE.Group(); this.add(this.pivot); const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.7, 10), wood); post.position.y = 0.85; this.pivot.add(post);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.7, 14), straw); body.position.y = 1.1; this.pivot.add(body); const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), straw); head.position.y = 1.62; this.pivot.add(head);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 8), wood); arm.rotation.x = Math.PI / 2; arm.position.y = 1.35; this.pivot.add(arm);
    this.ang = 0; this.vel = 0; this.mat = straw; this.base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.06, 16), wood); this.base.position.y = 0.03; this.add(this.base);
  }
  kick(s = 1) { this.vel -= 3.2 * s; }
  update(dt) { const k = 90, c = 7; this.vel += (-k * this.ang - c * this.vel) * dt; this.ang += this.vel * dt; this.pivot.rotation.z = this.ang; }
  reset() { this.ang = this.vel = 0; this.pivot.rotation.z = 0; }
}

export function actKeys(kind, windup = 0.45) { return (ACTS[kind] || ACTS.none)(windup); }
export function evalKeys(keys, t) {
  if (t <= keys[0][0]) return POSES[keys[0][1]];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, n0] = keys[i], [t1, n1, mode] = keys[i + 1]; if (t >= t1) continue;
    let f = (t - t0) / (t1 - t0); if (mode === 'snap') f = clamp((t - (t1 - 0.06)) / 0.06); else f = easeInOut(f);
    return lerpPose(POSES[n0], POSES[n1], f);
  }
  return POSES[keys[keys.length - 1][1]];
}
