// Rig measurements (GPU-free): scale check, contact times, prop lengths, anchor offsets. node tools/rig-info.mjs [--poses]
import './node-env.mjs';
import * as THREE from 'three';
import { loadModels, MODELS } from '../src/core/models.js';
import { CLIPS, cloneModel } from '../src/core/models.js';
await loadModels();
const S = 0.75, f3 = (x) => +x.toFixed(3), V = (v) => `[${f3(v.x)}, ${f3(v.y)}, ${f3(v.z)}]`, out = [];
const log = (...a) => { const s = a.join(' '); out.push(s); console.log(s); };
function rig(char) { const g = new THREE.Group(), m = cloneModel(char); m.scale.setScalar(S); m.rotation.y = Math.PI / 2; g.add(m); g.updateMatrixWorld(true); return { g, m, b: (n) => m.getObjectByName(n) }; }
const box = (o) => new THREE.Box3().setFromObject(o, true);
// scale
const K = rig('knight'), top = box(K.m).max.y; log(`S ${S}: top ${f3(top)} m (${f3(top / S)} model units) ${top >= 1.75 && top <= 1.9 ? 'ok' : 'OUT OF [1.75,1.9]'}`);
for (const c of ['mage', 'skeleton']) log(`  ${c} top ${f3(box(rig(c).m).max.y)} m`);
// props (slot-local +Y extent, metres)
for (const [c, n] of [['knight', '1H_Sword'], ['knight', '2H_Sword'], ['mage', '2H_Staff'], ['mage', '1H_Wand']]) { const o = MODELS[c].scene.getObjectByName(n); o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrix); log(`prop ${c}/${n}: slot y ${f3(bb.min.y)}..${f3(bb.max.y)} → len ${f3(bb.max.y * S)} m`); }
// anchor offsets in bone-local units (rest pose) + head radius
for (const [c, head, body] of [['knight', 'Knight_Head', 'Knight_Body'], ['mage', 'Mage_Head', 'Mage_Body'], ['skeleton', 'Skeleton_Warrior_Head', 'Skeleton_Warrior_Body']]) {
  const R = rig(c), hb = box(R.b(head)), bb = box(R.b(body)), hc = hb.getCenter(new THREE.Vector3()), bc = bb.getCenter(new THREE.Vector3()), hs = hb.getSize(new THREE.Vector3());
  const hO = R.b('head').worldToLocal(hc.clone()), cO = R.b('spine').worldToLocal(bc.clone()), w = new THREE.Vector3();
  log(`${c}: head center ${V(hc)} → head-local ${V(hO)}; body center ${V(bc)} → spine-local ${V(cO)}; headR ${f3((hs.x + hs.y + hs.z) / 6)} m; rest handslotr ${V(R.b('handslotr').getWorldPosition(w))} hips ${V(R.b('hips').getWorldPosition(w))}`);
}
// missing tracks
for (const c of Object.keys(MODELS)) { const names = new Set(); MODELS[c].scene.traverse((o) => names.add(o.name)); const miss = new Set(); for (const cl of CLIPS.values()) for (const t of cl.tracks) if (!names.has(t.name.split('.')[0])) miss.add(t.name.split('.')[0]); log(`missing tracks ${c}: ${[...miss].join(',') || 'none'}`); }
// contact times
const R = rig('knight'), mixer = new THREE.AnimationMixer(R.m), slot = R.b('handslotr'), hips = R.b('hips'), TIP = 1.41;
function sample(clip, fn) { const a = mixer.clipAction(CLIPS.get(clip)); mixer.stopAllAction(); a.play(); const D = CLIPS.get(clip).duration, r = [];
  for (let t = 0; t <= D + 1e-6; t += 1 / 240) { a.time = Math.min(t, D - 1e-4); mixer.update(0); R.g.updateMatrixWorld(true); r.push({ t, ...fn() }); } a.stop(); return { D, r }; }
const pt = () => ({ tip: slot.localToWorld(new THREE.Vector3(0, TIP, 0)), hand: slot.getWorldPosition(new THREE.Vector3()), hip: hips.getWorldPosition(new THREE.Vector3()) });
const metric = {
  // blade crosses the actor's front (+X) on the forward swing (tip moving -Z -> +Z): smallest |tip.z| among those frames reaching >=85% of max tip.x
  front: (r) => { const mx = Math.max(...r.map((x) => x.tip.x)); return r.filter((x, i) => i > 0 && x.tip.z > r[i - 1].tip.z && x.tip.x >= 0.85 * mx).reduce((a, b) => (Math.abs(b.tip.z) < Math.abs(a.tip.z) ? b : a)); },
  // thrust arrives: first frame at >=98% of max forward tip reach
  stab: (r) => { const mx = Math.max(...r.map((x) => x.tip.x)); return r.find((x) => x.tip.x >= 0.98 * mx); },
  // chop lands: first frame after the fastest frame with the tip low (<0.1 m) in front
  chop: (r) => { const f = metric.speed(r); return r.find((x) => x.t > f.t && x.tip.y < 0.1 && x.tip.x > 0.5) || f; },
  speed: (r) => { let bi = 1, bs = -1; for (let i = 1; i < r.length; i++) { const s = r[i].tip.distanceTo(r[i - 1].tip); if (s > bs) { bs = s; bi = i; } } return r[bi]; },
  reach: (r) => r.reduce((a, b) => (b.hand.x > a.hand.x ? b : a)),
  height: (r) => r.reduce((a, b) => (b.hand.y > a.hand.y ? b : a)),
  land: (r) => { const pk = r.reduce((a, b) => (b.hip.y > a.hip.y ? b : a)); return r.filter((x) => x.t > pk.t).reduce((a, b) => (b.hip.y < a.hip.y ? b : a)); },
};
const KINDS = [['slash', '1H_Melee_Attack_Slice_Diagonal', 'front'], ['sideslash', '1H_Melee_Attack_Slice_Horizontal', 'front'], ['smash', '2H_Melee_Attack_Chop', 'chop'], ['thrust', '1H_Melee_Attack_Stab', 'stab'], ['cast', 'Spellcast_Shoot', 'reach'], ['castup', 'Spellcast_Raise', 'height'], ['stomp', 'Jump_Full_Short', 'land'], ['throw', 'Throw', 'speed']];
log('kind | clip | dur | contact | metric | tip@c | hand@c');
for (const [k, c, m] of KINDS) { const { D, r } = sample(c, pt), x = metric[m](r); log(`${k} | ${c} | ${f3(D)} | ${f3(x.t)} | ${m} | ${V(x.tip)} | ${V(x.hand)}`); }
if (process.argv.includes('--poses')) {
  const { Dummy, POSES } = await import('../src/core/dummy.js'), d = new Dummy({ weapon: 'sword' }), w = new THREE.Vector3();
  log('pose | handR y | tip y | hips y');
  for (const n of Object.keys(POSES)) { d.setPose(POSES[n]); d.updateMatrixWorld(true); log(`${n} | ${f3(d.point('handR', w).y)} | ${f3(d.tip(undefined, w).y)} | ${f3(d.point('hips', w).y)}`); }
  d.setPose(POSES.idle); d.updateMatrixWorld(true); const sw = d.model.getObjectByName('1H_Sword'); sw.geometry.computeBoundingBox();
  const top = sw.localToWorld(new THREE.Vector3(0, sw.geometry.boundingBox.max.y, 0)), tp = d.tip(undefined, new THREE.Vector3());
  log(`1H_Sword top ${V(top)} vs tip() ${V(tp)}: d ${f3(top.distanceTo(tp))} ${top.distanceTo(tp) < 0.1 ? 'ok' : 'FAIL'}`);
  for (const n of ['handR', 'handL', 'tip', 'chest', 'head', 'hips', 'feet']) log(`idle ${n} ${V(d.point(n, w))}`);
  const T = new (await import('../src/core/dummy.js')).Target(); T.updateMatrixWorld(true); for (const n of ['chest', 'head', 'feet']) log(`target ${n} ${V(T.point(n, w))}`);
}
// --trace [clip ...]: per clip, per 1/30 s frame, sword tip / handR / hips (Dummy frame: faces +X) — pick contact frames in front of the actor
if (process.argv.includes('--trace')) {
  const { Dummy } = await import('../src/core/dummy.js'), d = new Dummy({ weapon: 'sword' }), w = new THREE.Vector3(), sel = process.argv.slice(process.argv.indexOf('--trace') + 1).filter((a) => !a.startsWith('--'));
  for (const c of sel.length ? sel : KINDS.map((k) => k[1])) { const D = CLIPS.get(c).duration; log(`trace ${c} (${f3(D)} s): t | tip | handR | hips`);
    for (let t = 0; t <= D + 1e-6; t += 1 / 30) { d.setPose({ clip: c, time: t }); d.updateMatrixWorld(true); log(`  ${f3(t)} | ${V(d.tip(undefined, w))} | ${V(d.point('handR', w))} | ${V(d.point('hips', w))}`); } }
}
