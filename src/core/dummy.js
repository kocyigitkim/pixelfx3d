// Rigged actor ("the dummy", KayKit Knight/Mage) with a shader-overlay body material (dissolve, frost, stone, tint, rim, scan),
// a Skeleton_Warrior target and act poses as {clip,time} frames of the shared clips. Faces +X, feet on y=0, ~1.85 m tall.
import * as THREE from 'three';
import { NOISE } from './glsl.js';
import { clamp, easeInOut, lerp } from './rng.js';
import { MODELS, cloneModel } from './models.js';

/** uniform model scale (KayKit units -> metres) */
export const S = 0.75;

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

/* ---------------------------------------------------------------- poses: frames of the shared KayKit clips (tools/rig-info.mjs) */
const C = (clip, time) => ({ clip, time }), SD = '1H_Melee_Attack_Slice_Diagonal', SH = '1H_Melee_Attack_Slice_Horizontal', CH2 = '2H_Melee_Attack_Chop', ST = '1H_Melee_Attack_Stab', CH1 = '1H_Melee_Attack_Chop', JP = 'Jump_Full_Short';
export const POSES = {
  idle: C('Idle', 0), guard: C('Idle', 0),
  windupHigh: C(SD, 0.3), cut: C(SD, 0.396), follow: C(SD, 0.467), sideBack: C(SH, 0.2), sideCut: C(SH, 0.258),
  overheadUp: C(CH2, 0.6), smashDown: C(CH2, 0.867), smashGround: C(CH2, 0.95), overhead2: C(CH2, 0.55),
  pullback: C(ST, 0.3), thrustBack: C(ST, 0.3), lunge: C(ST, 0.433), behind: C(ST, 0.5),
  castCharge: C('Spellcast_Long', 1.0), castRelease: C('Spellcast_Shoot', 0.3), castUp: C('Spellcast_Raise', 0.667),
  crouch: C(JP, 0.1), leap: C(JP, 0.45), land: C(JP, 0.7), throwBack: C('Throw', 0.55), throwFwd: C('Throw', 0.8),
  upLow: C(CH1, 0.03), upHigh: C(CH1, 0.15), slashBack: C(CH1, 0.45),
  daggerA: C('Dualwield_Melee_Attack_Stab', 0.3), daggerB: C('Dualwield_Melee_Attack_Stab', 0.433), sweepBack: C('2H_Melee_Attack_Spin', 0.55), sweepCut: C('2H_Melee_Attack_Spin', 0.72),
  roar: C('Cheer', 0.6), armsWide: C('Cheer', 0.3), hurt: C('Hit_A', 0.15), bowDraw: C('1H_Ranged_Aiming', 0.5), bowRelease: C('1H_Ranged_Shoot', 0.2),
  runA: C('Running_A', 0), runB: C('Running_A', 0.4), runAir: C('Running_B', 0.25), dashLow: C('Dodge_Forward', 0.2), vanish: C('Dodge_Backward', 0.2),
};
/** act kind -> [clip, duration, contact time] (contact lands on act time 0; tools/rig-info.mjs: slash/sideslash = blade crosses the front (+X, z~0), smash = tip lands low in front, thrust = full reach) */
const ACTS = { slash: [SD, 1, 0.396], sideslash: [SH, 1.067, 0.258], smash: [CH2, 1.633, 0.867], thrust: [ST, 1.6, 0.433], cast: ['Spellcast_Shoot', 0.933, 0.3],
  castup: ['Spellcast_Raise', 2.1, 0.667], stomp: [JP, 1.167, 0.7], throw: ['Throw', 1.367, 0.733] };
const WLEN = { sword: 1.08, staff: 0.94, hammer: 1.0, spear: 1.8, dagger: 0.42, scythe: 1.4, whip: 0.3 };
/** per char: chest offset (spine-local), head centre offset (head-local), head radius (m) */
const RIG = { knight: [[0, 0.237, -0.01], [0, 0.524, 0.023], 0.4], mage: [[0, 0.234, 0.005], [0, 0.394, -0.114], 0.436], skeleton: [[0, 0.215, 0.002], [0, 0.494, -0.002], 0.327] };

/* ---------------------------------------------------------------- the actor */
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();
export class Dummy extends THREE.Group {
  constructor(opts = {}) {
    super(); const char = this.char = opts.char || 'knight'; this.u = bodyUniforms(); this.mats = [];
    const m = this.model = cloneModel(char); m.scale.setScalar(S); m.rotation.y = opts.rotY ?? Math.PI / 2; this.add(m);
    this.mixer = new THREE.AnimationMixer(m); this.clips = MODELS[char].clips; this.acts = new Map();
    const cache = new Map(); m.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.frustumCulled = false;
      o.material = cache.get(o.material) ?? cache.set(o.material, overlay(o.material, this.u)).get(o.material); });
    this.mats = [...cache.values()]; this.mat = this.mats[0];
    this.props = MODELS[char].props.map((n) => m.getObjectByName(n)); this.props.forEach((p) => (p.visible = false));
    const B = (n) => m.getObjectByName(n); this.bones = { hips: B('hips'), spine: B('spine'), head: B('head'), handR: B('handslotr'), handL: B('handslotl') };
    const hand = (bone) => { const h = new THREE.Object3D(); h.rotation.x = Math.PI; h.scale.setScalar(1 / S); bone.add(h); return { hand: h }; }; // local -Y runs along the blade, metric
    this.armR = hand(this.bones.handR); this.armL = hand(this.bones.handL);
    this.torso = new THREE.Object3D(); this.neck = new THREE.Object3D(); this.pelvis = new THREE.Object3D(); // offset holders (Dummy frame), see apply()
    const [chest, headC, headR] = RIG[char]; this.chestOff = new THREE.Vector3(...chest); this.headOff = new THREE.Vector3(...headC); this.headR = headR;
    this.updateMatrixWorld(true); const hm = this.headMesh = new THREE.Object3D(); hm.position.copy(this.headOff); hm.scale.setScalar(1 / S);
    hm.quaternion.copy(this.bones.head.getWorldQuaternion(_q)).invert().multiply(this.getWorldQuaternion(_q2)); this.bones.head.add(hm); // +X = face
    if (opts.color) { this.u.uTint.value.set(opts.color); this.tintAmt = 0.35; this.tintCol = opts.color; this.u.uTintAmt.value = 0.35; }
    this.weaponLen = 1; this.setPose(POSES.idle);
    if (opts.weapon) this.holdWeapon(opts.weapon);
  }
  holdWeapon(kind = 'sword') {
    this.weapon?.removeFromParent(); this.props.forEach((p) => (p.visible = false)); this.weaponKind = kind; this.weaponLen = WLEN[kind] ?? 1.08;
    const prop = { sword: '1H_Sword', staff: '2H_Staff' }[kind], pm = prop && this.props.find((p) => p.name === prop);
    if (pm) { pm.visible = true; this.weapon = pm; return; }
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
      case 'chest': return at(B.spine, this.chestOff); case 'head': return at(B.head, this.headOff); case 'hips': return at(B.hips);
      case 'feet': at(B.hips); this.worldToLocal(out).y = 0; return this.localToWorld(out);
    }
    throw new Error('pixelfx3d: unknown anchor ' + name);
  }
  /** world position on the held weapon, l m from the hand slot along the blade (default: weapon tip) */
  tip(l = this.weaponLen, out = new THREE.Vector3()) { const h = this.armR.hand; h.updateWorldMatrix(true, false); return h.localToWorld(out.set(0, -l, 0)); }
  set(o) { for (const k in o) { const v = o[k]; const t = this.u['u' + k[0].toUpperCase() + k.slice(1)]; if (!t) continue; if (t.value?.isColor) t.value.set(v); else t.value = v; } }
  reset() { Object.assign(this.u.uDissolve, { value: -1 }); this.u.uTintAmt.value = this.tintAmt || 0; if (this.tintCol) this.u.uTint.value.set(this.tintCol); this.u.uFrost.value = 0; this.u.uStone.value = 0; this.u.uRimAmt.value = 0; this.u.uAlpha.value = 1; this.u.uScan.value = -10; this.u.uHolo.value = 0; this.u.uGlow.value = 0; this.u.uEmit.value.set(0); }
}

/** Skeleton_Warrior training target (faces -X). kick(strength) plays a hit reaction; update(dt) advances it, then blends back to Idle. */
export class Target extends Dummy {
  constructor() { super({ char: 'skeleton', rotY: -Math.PI / 2 }); this.react = null; this.rt = 0; }
  kick(s = 1) { this.react = s < 0.8 ? 'Block_Hit' : s < 1.6 ? 'Hit_A' : 'Hit_B'; this.rt = 0; this.update(0); }
  update(dt) {
    if (!this.react) return; this.rt += dt; const D = this.clips.get(this.react).duration, r = C(this.react, Math.min(this.rt, D)), f = clamp((this.rt - D) / 0.25);
    this.setPose(f <= 0 ? r : f >= 1 ? POSES.idle : { a: r, b: POSES.idle, f: easeInOut(f) }); if (f >= 1) this.react = null;
  }
  reset() { super.reset(); this.react = null; this.rt = 0; this.setPose(POSES.idle); }
}

const F = (c) => (x) => C(c, x);
/** act keys: the kind's clip plays linearly, time-warped so its contact frame lands on act time `at` (act.contact, default 0); then back to guard */
export function actKeys(kind, w = 0.45, at = 0) { const a = ACTS[kind]; if (!a) return [[0, 'idle']]; const [clip, D, c] = a, f = F(clip); return [[at - w, f(Math.max(0, c - w))], [at, f(c)], [at + D - c, f(D)], [at + D - c + 0.25, 'guard']]; }
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
