// Actor smoke test (GPU-free): every act/body effect builds, steps -lead..duration twice with identical rig matrices, no NaN, no binding warnings.
// node tools/actor-smoke.mjs [all|cat:<category>|<id> ...]
import './node-env.mjs';
import { loadModels, registerAll, registry, createFx } from '../src/index.js';
const sel = process.argv.slice(2).filter((a) => a !== 'all');
const warns = []; for (const k of ['warn', 'error']) { const f = console[k]; console[k] = (...a) => { const s = a.map(String).join(' '); if (/PropertyBinding|No target node|Trying to update node/.test(s)) warns.push(s); f(...a); }; }
await loadModels(); registerAll();
const defs = [...registry.values()].filter((d) => (d.act || d.body) && (!sel.length || sel.some((s) => (s.startsWith('cat:') ? d.category === s.slice(4) : d.id === s))));
function run(fx) {
  fx.reset(); const out = [], B = fx.body.bones, T = fx.target?.bones;
  for (let i = 0; i < 2000 && fx.time < fx.duration; i++) {
    fx.update(1 / 30); fx.updateMatrixWorld(true);
    for (const o of [B.hips, B.handR, T?.hips, T?.handR]) if (o) out.push(...o.matrixWorld.elements);
  }
  out.push(...fx.anchor('handR', 0)); if (fx.target) out.push(...fx.anchor('tgt'));
  return out;
}
let ok = 0, skip = 0; const fail = [];
for (const d of defs) {
  let fx; try { fx = createFx(d); } catch (e) { if (/document|window|canvas/i.test(e.message)) { skip++; console.log('SKIP-doc', d.id); continue; } fail.push(`${d.id}: build ${e.message}`); continue; }
  const w0 = warns.length;
  try {
    const a = run(fx), b = run(fx);
    if (a.some((x) => !Number.isFinite(x))) fail.push(`${d.id}: NaN`);
    else if (a.length !== b.length || a.some((x, i) => x !== b[i])) fail.push(`${d.id}: pass A != pass B`);
    else if (warns.length > w0) fail.push(`${d.id}: ${warns[w0]}`);
    else ok++;
  } catch (e) { fail.push(`${d.id}: ${e.message}`); }
  fx.dispose();
}
for (const f of fail) console.log('FAIL', f);
console.log(`ok ${ok} / skipped ${skip}${fail.length ? ` / failed ${fail.length}` : ''}`);
process.exit(fail.length ? 1 : 0);
