// Rig measurements (GPU-free, 240 Hz): clips, heights, y0, grip, anchor offsets, contact + E table. node tools/rig-info.mjs [--poses] [--trace [clip ...]]
import './node-env.mjs';
import * as THREE from 'three';
import { loadModels, MODELS, CLIPS, cloneModel } from '../src/core/models.js';
await loadModels();
const f3 = (x) => +x.toFixed(3), V = (v) => `[${f3(v.x)}, ${f3(v.y)}, ${f3(v.z)}]`;
const log = (...a) => console.log(a.join(' '));
const IDLE = 'Idle_Loop', BLADE = 1.06, FING = ['index', 'middle', 'ring', 'pinky'];
/** model in the Dummy frame (faces +X), posed by clip frames */
function rig(char) {
  const g = new THREE.Group(), m = cloneModel(char), mx = new THREE.AnimationMixer(m); m.rotation.y = Math.PI / 2; g.add(m);
  const b = (n) => m.getObjectByName(n), w = (n) => b(n).getWorldPosition(new THREE.Vector3());
  const pose = (clip, t) => { const c = MODELS[char].clips.get(clip); mx.stopAllAction(); const a = mx.clipAction(c); a.play(); a.time = Math.min(Math.max(0, t), c.duration - 1e-4); mx.update(0); g.updateMatrixWorld(true); };
  return { g, m, b, w, pose };
}
const box = (o) => new THREE.Box3().setFromObject(o, true), mesh = (m, re) => { let r; m.traverse((o) => { if (o.isSkinnedMesh && re.test(o.name)) r = o; }); return r; };
// clips
log(`clips ${CLIPS.size}: ${[...CLIPS.values()].map((c) => `${c.name} ${f3(c.duration)}`).join(', ')}`);
for (const c of Object.keys(MODELS)) { const names = new Set(); MODELS[c].scene.traverse((o) => names.add(o.name)); const miss = new Set(); for (const cl of CLIPS.values()) for (const t of cl.tracks) if (!names.has(t.name.split('.')[0])) miss.add(t.name.split('.')[0]); log(`missing tracks ${c}: ${[...miss].join(',') || 'none'}`); }
// per char at Idle_Loop@0: height, y0, grip (hand-local, finger loop centres), head/chest offsets
const RIG = {};
for (const c of ['knight', 'mage', 'skeleton']) {
  const R = rig(c); R.pose(IDLE, 0); const bb = box(R.m), y0 = bb.min.y, top = bb.max.y - y0;
  const loop = (f, s) => R.b('hand_' + s).worldToLocal([1, 2, 3].map((i) => R.w(`${f}_0${i}_${s}`)).reduce((a, x) => a.add(x), new THREE.Vector3()).divideScalar(3));
  const grip = (s) => { const L = FING.map((f) => loop(f, s)); return [L.reduce((a, x) => a.add(x), new THREE.Vector3()).divideScalar(4), L[0].clone().sub(L[3]).normalize()]; };
  const [gp, ga] = grip('r'), [lp, la] = grip('l');
  const hb = box(mesh(R.m, /_Head$/)), hc = hb.getCenter(new THREE.Vector3()), hs = hb.getSize(new THREE.Vector3()), cb = box(mesh(R.m, /_Body$/)).getCenter(new THREE.Vector3());
  const head = R.b('Head').worldToLocal(hc.clone()), chest = R.b('spine_03').worldToLocal(cb.clone()), headR = (hs.x + hs.y + hs.z) / 6;
  RIG[c] = { chest, head, headR, gp, ga, y0 };
  log(`${c}: top ${f3(top)} ${top >= 1.75 && top <= 1.9 ? 'ok' : 'OUT OF [1.75,1.9]'}, y0 ${f3(y0)} ${Math.abs(y0) < 0.03 ? 'ok' : 'BIG'}; grip r pos ${V(gp)} axis ${V(ga)} | l pos ${V(lp)} axis ${V(la)} (mirror d ${f3(Math.hypot(lp.x + gp.x, lp.y - gp.y, lp.z - gp.z))})`);
  log(`  chest spine_03-local ${V(chest)} (y ${f3(cb.y - y0)}); head Head-local ${V(head)} (y ${f3(hc.y - y0)}), headR ${f3(headR)}`);
  R.m.position.y = -y0; R.g.updateMatrixWorld(true); const tip = R.b('hand_r').localToWorld(gp.clone().addScaledVector(ga, BLADE));
  log(`  idle handR ${V(R.w('hand_r'))} grip ${V(R.b('hand_r').localToWorld(gp.clone()))} tip ${V(tip)} hips ${V(R.w('pelvis'))} spine_03 ${V(R.w('spine_03'))} Head ${V(R.w('Head'))}`);
}
// contact table (knight, 240 Hz, sword tip at BLADE m along the grip axis)
const K = rig('knight'), G = RIG.knight; K.m.position.y = -G.y0;
function sample(clip) {
  const D = CLIPS.get(clip).duration, r = [];
  for (let t = 0; t <= D + 1e-6; t += 1 / 240) { K.pose(clip, t); const h = K.b('hand_r'); r.push({ t, tip: h.localToWorld(G.gp.clone().addScaledVector(G.ga, BLADE)), hand: K.w('hand_r'), hip: K.w('pelvis') }); }
  r.forEach((x, i) => { const p = r[Math.max(0, i - 1)]; x.ts = x.tip.distanceTo(p.tip) * 240; x.hs = x.hand.distanceTo(p.hand) * 240; }); return { D, r };
}
const best = (r, f) => r.reduce((a, b) => (f(b) > f(a) ? b : a));
const metric = {
  // blade crosses the actor's front (tip z changes sign, tip x > .5): the fastest such frame
  front: (r) => { const c = r.filter((x, i) => i > 0 && Math.sign(x.tip.z) !== Math.sign(r[i - 1].tip.z) && x.tip.x > 0.5); return c.length ? best(c, (x) => x.ts) : metric.speed(r); },
  stab: (r) => { const mx = Math.max(...r.map((x) => x.tip.x)); return r.find((x) => x.tip.x >= 0.98 * mx); },
  // first frame after the fastest one with the tip low (<= .05) in front
  chop: (r) => { const f = metric.speed(r); return r.find((x) => x.t > f.t && x.tip.y <= 0.05 && x.tip.x > 0.5) || f; },
  speed: (r) => best(r, (x) => x.ts), release: (r) => best(r, (x) => x.hs),
  reach: (r) => { const mx = Math.max(...r.map((x) => x.hand.x)); return r.find((x) => x.hand.x >= 0.98 * mx && x.hs < 1.2); }, /* near full extension, arm slowing */ height: (r) => best(r, (x) => x.hand.y), low: (r) => best(r, (x) => -x.hip.y),
};
// E candidate: end of the first settled run (hand speed < .8 m/s) after contact, capped at c + .6 (before the clip winds into its recovery / next swing)
const settle = (r, c) => { const i0 = r.findIndex((x) => x.t > c.t && x.hs < 0.8); if (i0 < 0) return r[r.length - 1]; let i = i0; while (i + 1 < r.length && r[i + 1].hs < 0.8 && r[i + 1].t <= c.t + 0.6) i++; return r[i]; };
const KINDS = [['slash', 'Sword_Attack', 'front'], ['sideslash', 'Sword_Regular_C', 'front'], ['smash', 'Sword_Heavy_Combo', 'chop'], ['thrust', 'Sword_Dash', 'stab'], ['cast', 'Spell_Simple_Enter_R', 'reach'], ['castup', 'OverhandThrow', 'height'], ['stomp', 'Jump_Land', 'low'], ['throw', 'OverhandThrow', 'release']];
log(`kind | clip | D | c | metric | E | tip@c | hand@c | hips@c | tip speed@c | tip@E`);
for (const [k, c, m] of KINDS) { const { D, r } = sample(c), x = metric[m](r), e = settle(r, x); log(`${k} | ${c} | ${f3(D)} | ${f3(x.t)} | ${m} | ${f3(e.t)} | ${V(x.tip)} | ${V(x.hand)} | ${V(x.hip)} | ${f3(x.ts)} | ${V(e.tip)}`); }
if (process.argv.includes('--poses')) {
  const D = await import('../src/core/dummy.js'), d = new D.Dummy({ weapon: 'sword' }), w = new THREE.Vector3();
  log('pose | clip@time | handR y | tip y | hips y');
  for (const n of Object.keys(D.POSES)) { d.setPose(D.POSES[n]); d.updateMatrixWorld(true); log(`${n} | ${D.POSES[n].clip}@${D.POSES[n].time} | ${f3(d.point('handR', w).y)} | ${f3(d.tip(undefined, w).y)} | ${f3(d.point('hips', w).y)}`); }
  log('kind | contact frame | tip | handR | hips | act keys');
  for (const [k] of KINDS) { const ks = D.actKeys(k, 0.45, 0), p = ks[1][1]; d.setPose(p); d.updateMatrixWorld(true); log(`${k} | ${p.clip}@${f3(p.time)} | ${V(d.tip(undefined, new THREE.Vector3()))} | ${V(d.point('handR', w))} | ${V(d.point('hips', w))} | ${ks.map(([t, q]) => `${f3(t)}:${typeof q === 'string' ? q : f3(q.time)}`).join(' ')}`); }
  d.setPose(D.POSES.idle); d.updateMatrixWorld(true);
  for (const n of ['handR', 'handL', 'tip', 'chest', 'head', 'hips', 'feet']) log(`idle ${n} ${V(d.point(n, w))}`);
  log(`idle skinned bbox y ${f3(box(d.model).min.y)}..${f3(box(d.model).max.y)}`);
  const T = new D.Target(); T.position.set(2.2, 0, 0); T.updateMatrixWorld(true); for (const n of ['chest', 'head', 'feet']) log(`target(x 2.2) ${n} ${V(T.point(n, w))}`);
}
// --trace [clip ...]: per clip, per 1/30 s frame, sword tip / handR / hips (Dummy frame: faces +X)
if (process.argv.includes('--trace')) {
  const { Dummy } = await import('../src/core/dummy.js'), d = new Dummy({ weapon: 'sword' }), w = new THREE.Vector3(), sel = process.argv.slice(process.argv.indexOf('--trace') + 1).filter((a) => !a.startsWith('--'));
  for (const c of sel.length ? sel : [...new Set(KINDS.map((k) => k[1]))]) { const D = CLIPS.get(c).duration; log(`trace ${c} (${f3(D)} s): t | tip | handR | hips`);
    for (let t = 0; t <= D + 1e-6; t += 1 / 30) { d.setPose({ clip: c, time: t }); d.updateMatrixWorld(true); log(`  ${f3(t)} | ${V(d.tip(undefined, w))} | ${V(d.point('handR', w))} | ${V(d.point('hips', w))}`); } }
}
