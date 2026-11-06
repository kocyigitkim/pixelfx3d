// Anchor audit (GPU-free): finds hardcoded [x,y,z] literals that sit on old rig anchors and suggests fx.anchor().
// node tools/anchor-audit.mjs [--snapshot] [--check] [src/fx/a.js ...]
import './node-env.mjs';
import * as THREE from 'three';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import * as LIB from '../src/index.js';
import { evalKeys } from '../src/core/dummy.js';

const ROOT = new URL('..', import.meta.url), SNAP = new URL('anchors-p5.json', import.meta.url);
const args = process.argv.slice(2), SNAPSHOT = args.includes('--snapshot'), CHECK = args.includes('--check');
let files = args.filter((a) => !a.startsWith('--'));
if (LIB.loadModels) await LIB.loadModels();
LIB.registerAll();
const R3 = (v) => [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)], key = (n, t) => `${n}@${+t.toFixed(3)}`;
const BODY = ['handR', 'handL', 'tip', 'chest', 'head', 'hips', 'feet'], TGT = ['tgt', 'tgtHead', 'tgtFeet'];
function makeFx(def) { try { return new LIB.Fx(def); } catch { return new LIB.Fx({ ...def, build() {} }); } } // real build (body-only setPose), fallback: no layers
function times(fx) {
  const a = fx.def.act || {}, L = fx.lead || 0, s = new Set([-L, -L / 2, 0, fx.duration / 2]);
  for (const h of a.hits || []) { s.add(h.t); s.add(h.t + 0.2); }
  return [...s].map((t) => +t.toFixed(3)).sort((x, y) => x - y);
}
const v = new THREE.Vector3();
function oldAnchor(fx, n, t) { // P5 structure
  const b = fx.body, g = fx.target, loc = (o, x = 0, y = 0, z = 0) => R3(fx.worldToLocal(o.localToWorld(v.set(x, y, z))));
  if (n.startsWith('tgt')) { const y = { tgt: 1.1, tgtHead: 1.62, tgtFeet: 0 }[n]; return R3(v.copy(g.position).add({ x: 0, y, z: 0 })); }
  if (fx.keys) b.setPose(evalKeys(fx.keys, t)); fx.updateMatrixWorld(true);
  const r = { handR: () => loc(b.armR.hand), handL: () => loc(b.armL.hand), tip: () => R3(fx.worldToLocal(b.tip(1, v))), chest: () => loc(b.torso, 0, 0.3, 0), head: () => loc(b.headMesh), hips: () => loc(b.pelvis), feet: () => { const p = loc(b.pelvis); p[1] = 0; return p; } }[n]();
  if (fx.keys) b.setPose(evalKeys(fx.keys, fx.time));
  return r;
}
const anchor = (fx, n, t) => (fx.anchor ? fx.anchor(n, n.startsWith('tgt') ? 0 : t).map((x) => +x.toFixed(3)) : oldAnchor(fx, n, t));
function anchorsOf(fx) {
  const o = {};
  for (const t of times(fx)) for (const n of BODY) o[key(n, t)] = anchor(fx, n, t);
  if (fx.target) for (const n of TGT) o[n] = anchor(fx, n, 0);
  return o;
}
const defs = [...LIB.registry.values()].filter((d) => d.act || d.body), NOW = {}, META = {};
for (const d of defs) { const fx = makeFx(d); NOW[d.id] = anchorsOf(fx); META[d.id] = { kind: d.act?.kind, hit: d.act?.hits?.[0]?.t, tx: fx.target?.position.x, tipAt: (t) => anchor(fx, 'tip', t) }; }
if (SNAPSHOT) { writeFileSync(SNAP, JSON.stringify(NOW, null, 0).replace(/\],"/g, '],\n"').replace(/\},"/g, '},\n"')); console.log(`snapshot ${Object.keys(NOW).length} ids -> tools/anchors-p5.json`); process.exit(0); }

const OLD = JSON.parse(readFileSync(SNAP, 'utf8'));
if (!files.length) files = readdirSync(new URL('src/fx/', ROOT)).filter((f) => f.endsWith('.js') && !f.startsWith('_') && f !== 'index.js').map((f) => 'src/fx/' + f);
const SKIP = /^(dir|gravity|rotate|rot3|scale|axis|spread|normal|target)$/, NUM = /^\s*-?(\d+\.?\d*|\.\d+)/;
let bad = 0, nMatch = 0;
for (const f of files) {
  const lines = readFileSync(new URL(f, ROOT), 'utf8').split('\n');
  let id = null;
  lines.forEach((ln, i) => {
    const m = ln.match(/id:\s*'([^']+)'|SKILL\('([^']+)'/); if (m) id = m[1] || m[2];
    if (!id || !OLD[id] || !NOW[id] || /view|stage:/.test(ln)) return;
    for (const a of ln.matchAll(/(?:(\w+)\s*[:=]\s*)?\[([^\[\],]+),([^\[\],]+),([^\[\],]+)\]/g)) {
      const k = a[1] || '', el = [a[2], a[3], a[4]]; if (SKIP.test(k) || !el.every((e) => NUM.test(e))) continue;
      const lit = el.map((e) => parseFloat(e)), expr = el.some((e) => !/^\s*-?(\d+\.?\d*|\.\d+)\s*$/.test(e));
      let best = null, bd = 0.3;
      for (const [n, p] of Object.entries(OLD[id])) { const d = Math.hypot(p[0] - lit[0], p[1] - lit[1], p[2] - lit[2]); if (d < bd) { bd = d; best = n; } }
      if (!best || !NOW[id][best]) continue;
      const q = NOW[id][best], o = OLD[id][best]; if (Math.hypot(q[0] - o[0], q[1] - o[1], q[2] - o[2]) <= 0.1) continue;
      const [nm, t] = best.split('@'), ok = /\/\/ anchor-ok\s*$/.test(ln); nMatch++; if (!ok) bad++;
      console.log(`${f}:${i + 1} ${k} [${lit.join(', ')}]${expr ? ' expr' : ''} ≈ ${best} (${bd.toFixed(2)}) → fx.anchor('${nm}'${t ? ', ' + t : ''}) = [${q.join(', ')}]${ok ? ' ok' : ''}`);
    }
  });
}
for (const [id, m] of Object.entries(META)) {
  if (!/^(slash|sideslash|smash|thrust)$/.test(m.kind || '') || m.hit == null || m.tx == null) continue;
  if (files.length && !files.some((f) => readFileSync(new URL(f, ROOT), 'utf8').includes(`'${id}'`))) continue;
  const tx = m.tipAt(m.hit)[0]; console.log(`REACH ${id} tip.x@${m.hit} ${tx} vs target.x ${m.tx} → suggest target.x = ${Math.round((tx + 0.2) * 100) / 100}`);
}
console.log(`matches ${nMatch}, without anchor-ok ${bad}`);
if (CHECK && bad) process.exit(1);
