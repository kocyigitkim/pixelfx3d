// P4 (exit 1 on failure): A) same seed twice -> identical pixels; B) loop effects: frame(t=0) ~= frame(t=duration). usage: node tools/determinism-test.mjs [all|cat:x|id,id]
import { launch, open, render, pixels, pickIds } from './harness.mjs';
const b = await launch(); const { pg, errs } = await open(b);
const ids = pickIds(await pg.evaluate('window.__ids'), process.argv[2]); const failA = [], failB = [];
for (const id of ids) {
  const a1 = await render(pg, id, -0.6, { opts: { seed: 7 } }), a2 = await render(pg, id, -0.6, { opts: { seed: 7 } });
  if (a1.hash !== a2.hash) failA.push(id);
  if (!a1.loop) continue;
  const p0 = pixels(await render(pg, id, 0)), p1 = pixels(await render(pg, id, a1.dur)); let sum = 0, big = 0;
  for (let i = 0; i < p0.length; i++) { if (i % 4 === 3) continue; const d = Math.abs(p0[i] - p1[i]); sum += d; if (d > 16) big++; }
  const n = p0.length * 0.75, mean = sum / n; if (mean > 0.5 || big / n > 0.003) failB.push(`${id} mean ${mean.toFixed(2)} big ${(100 * big / n).toFixed(2)}%`);
}
console.log('A same-seed failures:', failA.length ? failA.join(', ') : 'none'); console.log('B loop-seam failures:\n ' + (failB.join('\n ') || 'none'));
if (errs.length) console.log('console errors:\n ' + errs.join('\n '));
await b.close(); process.exit(failA.length || failB.length || errs.length ? 1 : 0);
