// Rigged actor ("the dummy", Quaternius ranger knight / mage) with a shader-overlay body material (dissolve, frost, stone, tint, rim, scan),
// a peasant target ('skeleton') and act poses as {clip,time} frames of the shared UAL clips. Faces +X, feet on y=0, ~1.85 m tall.
import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { clamp, easeInOut, lerp } from './rng.js';
import { MODELS, cloneModel } from './models.js';

/** uniform model scale (the Quaternius models are metric) */
export const S = 1;

/* ---------------------------------------------------------------- body overlay material */
export function bodyUniforms() {
  return { uTime: { value: 0 }, uDissolve: { value: -1 }, uDDir: { value: 1 }, uEdge: { value: new THREE.Color('#ff7a1a') }, uEdgeW: { value: 0.05 }, uEdgeInt: { value: 4 },
    uTint: { value: new THREE.Color('#ffffff') }, uTintAmt: { value: 0 }, uFrost: { value: 0 }, uStone: { value: 0 }, uRim: { value: new THREE.Color('#66aaff') }, uRimAmt: { value: 0 },
    uAlpha: { value: 1 }, uScan: { value: -10 }, uScanCol: { value: new THREE.Color('#5ff') }, uEmit: { value: new THREE.Color('#000') }, uHolo: { value: 0 }, uGlow: { value: 0 } };
}
/** per-instance clone of a model material with the overlay shader (map kept). vBW = skinned world position. */
function overlay(src, u) {
  const m = src.clone();
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vBW;').replace('#include <skinning_vertex>', '#include <skinning_vertex>\nvBW=(modelMatrix*vec4(transformed,1.)).xyz;');
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

/* ---------------------------------------------------------------- poses: frames of the shared UAL clips (tools/rig-info.mjs --poses) */
const C = (clip, time) => ({ clip, time }), SA = 'Sword_Attack', RA = 'Sword_Regular_A', RB = 'Sword_Regular_B', RC = 'Sword_Regular_C', HC = 'Sword_Heavy_Combo', SD = 'Sword_Dash', OT = 'OverhandThrow', JS = 'Jump_Start', JL = 'Jump_Land', IL = 'Idle_Loop';
export const POSES = {
  idle: C(IL, 0), guard: C(IL, 0),
  windupHigh: C(SA, 0.333), cut: C(SA, 0.433), follow: C(SA, 0.5), sideBack: C(RC, 0.6), sideCut: C(RC, 0.687),
  overhead2: C(HC, 2.5), overheadUp: C(HC, 2.533), smashDown: C(HC, 2.6), smashGround: C(HC, 2.65),
  pullback: C(SD, 0.2), thrustBack: C(SD, 0.2), lunge: C(SD, 0.321), behind: C(SD, 0.5),
  castCharge: C('Spell_Simple_Enter_R', 0.3), castRelease: C('Spell_Simple_Shoot_R', 0.133), castUp: C('Pistol_Aim_Up', 0),
  crouch: C(JS, 0), leap: C(JS, 0.57), land: C(JL, 0.2), throwBack: C(OT, 0.27), throwFwd: C(OT, 0.4),
  upLow: C(RA, 0.2), upHigh: C(RA, 0.3), slashBack: C(RA, 0.433),
  daggerA: C('Punch_Cross', 0.15), daggerB: C('Punch_Cross', 0.3), sweepBack: C(RB, 0.183), sweepCut: C(RB, 0.25),
  roar: C(JL, 0), armsWide: C('A_TPose', 0), hurt: C('Hit_Chest', 0.15), bowDraw: C('Pistol_Aim_Neutral', 0), bowRelease: C('Pistol_Shoot', 0.1),
  runA: C('Sprint_Loop', 0), runB: C('Sprint_Loop', 0.33), runAir: C('Jog_Fwd_Loop', 0.3), dashLow: C('Shield_Dash', 0), vanish: C('Roll', 0.2),
};
/** act kind -> [clip, duration, contact c, E = clip time where the act leaves for guard (default D), hold at E (s)]; contact lands on act time 0.
 *  tools/rig-info.mjs (240 Hz): slash/sideslash = fastest blade crossing of the front, smash = tip lands low, thrust = 98% reach, cast = full extension,
 *  castup = hand highest, stomp = hips lowest, throw = hand fastest; E = end of the settled follow-through (before the clip's recovery / next swing). */
const ACTS = { slash: [SA, 1.533, 0.433, 0.7], sideslash: [RC, 2, 0.687, 1.067], smash: [HC, 4.333, 2.633, 3.229], thrust: [SD, 1.567, 0.321, 0.921],
  cast: ['Spell_Simple_Enter_R', 0.533, 0.404, 0.533, 0.35], castup: [OT, 1.333, 0.292, 0.3, 0.4], stomp: [JL, 1.267, 0.2], throw: [OT, 1.333, 0.371] };
const WLEN = { sword: 1.06, staff: 1.28, hammer: 1.0, spear: 1.8, dagger: 0.42, scythe: 1.4, whip: 0.3 };
/** per char (rig-info, Idle_Loop@0): chest (spine_03-local), head centre (Head-local), head radius, right grip [hand_r-local pos, blade axis], y0 = lowest skinned point */
const RIG = {
  knight: { chest: [0.006, -0.065, -0.006], head: [0.008, 0.058, 0], headR: 0.125, grip: [[-0.034, 0.103, -0.005], [-0.023, 0.293, 0.956]], y0: -0.018 },
  mage: { chest: [0.005, -0.075, 0.013], head: [-0.001, 0.073, 0.008], headR: 0.115, grip: [[-0.029, 0.077, 0], [-0.023, 0.29, 0.957]], y0: -0.013 },
  skeleton: { chest: [0.016, -0.084, -0.017], head: [0.008, 0.058, 0], headR: 0.125, grip: [[-0.034, 0.103, -0.005], [-0.023, 0.293, 0.956]], y0: -0.018 },
};

/* ---------------------------------------------------------------- the actor */
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();
export class Dummy extends THREE.Group {
  constructor(opts = {}) {
    super(); const char = this.char = opts.char || 'knight'; this.u = bodyUniforms(); this.mats = [];
    const R = RIG[char], m = this.model = cloneModel(char); m.rotation.y = opts.rotY ?? Math.PI / 2; m.position.y = -R.y0; this.add(m);
    this.mixer = new THREE.AnimationMixer(m); this.clips = MODELS[char].clips; this.acts = new Map();
    const cache = new Map(); m.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false;
      o.material = cache.get(o.material) ?? cache.set(o.material, overlay(o.material, this.u)).get(o.material); });
    this.mats = [...cache.values()]; this.mat = this.mats[0];
    const B = (n) => m.getObjectByName(n); this.bones = { hips: B('pelvis'), spine: B('spine_01'), chest: B('spine_03'), head: B('Head'), handR: B('hand_r'), handL: B('hand_l') };
    // hand holders in the fist: local -Y runs along the blade (grip axis); the left one is the x-mirror of the right
    const [gp, ga] = R.grip, q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(...ga).normalize());
    const hand = (bone, s) => { const h = new THREE.Object3D(); h.position.set(s * gp[0], gp[1], gp[2]); h.quaternion.set(q.x, s * q.y, s * q.z, q.w); bone.add(h); return { hand: h }; };
    this.armR = hand(this.bones.handR, 1); this.armL = hand(this.bones.handL, -1);
    this.torso = new THREE.Object3D(); this.neck = new THREE.Object3D(); this.pelvis = new THREE.Object3D(); // offset holders (Dummy frame), see apply()
    this.chestOff = new THREE.Vector3(...R.chest); this.headOff = new THREE.Vector3(...R.head); this.headR = R.headR;
    this.updateMatrixWorld(true); const hm = this.headMesh = new THREE.Object3D(); hm.position.copy(this.headOff);
    hm.quaternion.copy(this.bones.head.getWorldQuaternion(_q)).invert().multiply(this.getWorldQuaternion(_q2)); this.bones.head.add(hm); // +X = face
    if (opts.color) { this.u.uTint.value.set(opts.color); this.tintAmt = 0.35; this.tintCol = opts.color; this.u.uTintAmt.value = 0.35; }
    this.weaponLen = 1; this.setPose(POSES.idle);
    if (opts.weapon) this.holdWeapon(opts.weapon);
  }
  holdWeapon(kind = 'sword') {
    this.weapon?.removeFromParent(); this.weaponKind = kind; this.weaponLen = WLEN[kind] ?? WLEN.sword;
    const g = new THREE.Group(); const steel = new THREE.MeshStandardMaterial({ color: '#c9d1da', metalness: 1, roughness: 0.22 }); const grip = new THREE.MeshStandardMaterial({ color: '#3a2a20', roughness: 0.8 });
    if (kind === 'hammer') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 10), grip); h.position.y = -0.4; g.add(h); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.2), steel); hd.position.y = -0.92; g.add(hd); }
    else if (kind === 'spear') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.7, 8), grip); h.position.y = -0.7; g.add(h); const tip = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.25, 8), steel); tip.position.y = -1.67; tip.rotation.z = Math.PI; g.add(tip); }
    else if (kind === 'dagger') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.38, 0.01), steel); b.position.y = -0.27; g.add(b); const gd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.12), steel); gd.position.y = -0.07; g.add(gd); const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 8), grip); hl.position.y = 0.0; g.add(hl); }
    else if (kind === 'scythe') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.6, 8), grip); h.position.y = -0.55; g.add(h); const bl = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.07, 0.62), steel); bl.position.set(0, -1.38, 0.28); g.add(bl); const bt = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.22, 4), steel); bt.rotation.x = -Math.PI / 2; bt.position.set(0, -1.4, 0.68); g.add(bt); }
    else if (kind === 'whip') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.3, 8), grip); h.position.y = -0.1; g.add(h); }
    else if (kind === 'staff') { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 1.5, 8), grip); h.position.y = -0.5; g.add(h); const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 2), new THREE.MeshStandardMaterial({ color: '#8cf', emissive: '#48f', emissiveIntensity: 2 })); orb.position.y = -1.28; g.add(orb); }
    else { const b = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.95, 0.012), steel); b.position.y = -0.58; g.add(b); const gd = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.03, 0.22), steel); gd.position.y = -0.1; g.add(gd); const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), grip); hl.position.y = 0.02; g.add(hl); }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); this.armR.hand.add(g); this.weapon = g;
  }
  /** p: {clip,time} | {a,b,f} (crossfade) | POSES entry; evaluated immediately */
  setPose(p) { this.pose = p?.clip || p?.a ? p : POSES.idle; this._eval(); }
  _act(p, w) {
    let a = this.acts.get(p.clip); const c = this.clips.get(p.clip); if (!c) return;
    if (!a) { a = this.mixer.clipAction(c); a.play(); this.acts.set(p.clip, a); }
    a.setEffectiveWeight(w); a.time = Math.min(Math.max(0, p.time), c.duration - 1e-4);
  }
  _eval() {
    // undo apply() offsets: the mixer only writes channels whose value changed since its last update
    if (this._base) { for (const [b, p, q, s] of this._base) { b.position.copy(p); b.quaternion.copy(q); b.scale.copy(s); } this._base = null; }
    for (const a of this.acts.values()) a.setEffectiveWeight(0);
    const p = this.pose; if (p.a) { this._act(p.a, 1 - p.f); this._act(p.b, p.f); } else this._act(p, 1);
    this.mixer.update(0);
  }
  /** re-evaluate the pose, then apply the torso/neck/pelvis offset holders (Dummy-frame rotation/position/scale) to spine/head/hips */
  apply() {
    this._eval(); const B = this.bones;
    for (const [h, b] of [[this.pelvis, B.hips], [this.torso, B.spine], [this.neck, B.head]]) {
      const id = h.position.lengthSq() === 0 && h.quaternion.w === 1 && h.scale.x === 1 && h.scale.y === 1 && h.scale.z === 1; if (id) continue;
      this._base ??= [B.hips, B.spine, B.head].map((o) => [o, o.position.clone(), o.quaternion.clone(), o.scale.clone()]);
      b.parent.updateWorldMatrix(true, false); const qp = _q.copy(this.getWorldQuaternion(_q2)).invert().multiply(b.parent.getWorldQuaternion(_q2)), qi = qp.clone().invert();
      b.quaternion.premultiply(qp).premultiply(h.quaternion).premultiply(qi); b.position.add(_v.copy(h.position).applyQuaternion(qi).divideScalar(S)); b.scale.multiply(h.scale);
    }
  }
  /** world position of a rig anchor: handR handL tip chest head hips feet */
  point(name, out = new THREE.Vector3()) {
    const B = this.bones, at = (o, off) => { o.updateWorldMatrix(true, false); return off ? o.localToWorld(out.copy(off)) : out.setFromMatrixPosition(o.matrixWorld); };
    switch (name) {
      case 'handR': return at(B.handR); case 'handL': return at(B.handL); case 'tip': return this.tip(undefined, out);
      case 'chest': return at(B.chest, this.chestOff); case 'head': return at(B.head, this.headOff); case 'hips': return at(B.hips);
      case 'feet': at(B.hips); this.worldToLocal(out).y = 0; return this.localToWorld(out);
    }
    throw new Error('pixelfx3d: unknown anchor ' + name);
  }
  /** world position on the held weapon, l m from the hand slot along the blade (default: weapon tip) */
  tip(l = this.weaponLen, out = new THREE.Vector3()) { const h = this.armR.hand; h.updateWorldMatrix(true, false); return h.localToWorld(out.set(0, -l, 0)); }
  set(o) { for (const k in o) { const v = o[k]; const t = this.u['u' + k[0].toUpperCase() + k.slice(1)]; if (!t) continue; if (t.value?.isColor) t.value.set(v); else t.value = v; } }
  reset() { Object.assign(this.u.uDissolve, { value: -1 }); this.u.uTintAmt.value = this.tintAmt || 0; if (this.tintCol) this.u.uTint.value.set(this.tintCol); this.u.uFrost.value = 0; this.u.uStone.value = 0; this.u.uRimAmt.value = 0; this.u.uAlpha.value = 1; this.u.uScan.value = -10; this.u.uHolo.value = 0; this.u.uGlow.value = 0; this.u.uEmit.value.set(0); }
}

/** training target (peasant, char 'skeleton', faces -X). kick(strength) plays a hit reaction; update(dt) advances it, then blends back to Idle. */
export class Target extends Dummy {
  constructor() { super({ char: 'skeleton', rotY: -Math.PI / 2 }); this.react = null; this.rt = 0; }
  kick(s = 1) { this.react = s < 1.2 ? 'Hit_Chest' : 'Hit_Head'; this.rt = 0; this.update(0); }
  update(dt) {
    if (!this.react) return; this.rt += dt; const D = this.clips.get(this.react).duration, r = C(this.react, Math.min(this.rt, D)), f = clamp((this.rt - D) / 0.25);
    this.setPose(f <= 0 ? r : f >= 1 ? POSES.idle : { a: r, b: POSES.idle, f: easeInOut(f) }); if (f >= 1) this.react = null;
  }
  reset() { super.reset(); this.react = null; this.rt = 0; this.setPose(POSES.idle); }
}

const F = (c) => (x) => C(c, x);
/** act keys: the kind's clip plays linearly, time-warped so its contact frame lands on act time `at` (act.contact, default 0), up to E (held `hold` s); then back to guard */
export function actKeys(kind, w = 0.45, at = 0) {
  const a = ACTS[kind]; if (!a) return [[0, 'idle']]; const [clip, D, c, E = D, hold = 0] = a, f = F(clip), e = at + E - c;
  return [[at - w, f(Math.max(0, c - w))], [at, f(c)], [e, f(E)], ...(hold ? [[e + hold, f(E)]] : []), [e + hold + 0.25, 'guard']];
}
/** keys [[t, name | {clip,time}, 'snap'?], ...] at time t -> {clip,time} (same clip: clip time interpolated linearly) or {a,b,f} crossfade */
export function evalKeys(keys, t) {
  const P = (n) => (typeof n === 'string' ? POSES[n] || POSES.idle : n);
  if (t <= keys[0][0]) return P(keys[0][1]);
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, n0] = keys[i], [t1, n1, mode] = keys[i + 1]; if (t >= t1) continue;
    const a = P(n0), b = P(n1), snap = mode === 'snap', lin = (t - t0) / (t1 - t0);
    if (a.clip === b.clip) return C(a.clip, lerp(a.time, b.time, snap ? clamp((t - (t1 - 0.06)) / 0.06) : lin));
    return { a, b, f: snap ? clamp((t - (t1 - 0.06)) / 0.06) : easeInOut(lin) };
  }
  return P(keys[keys.length - 1][1]);
}
