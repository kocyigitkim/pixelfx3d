// PLAN6 §4.2 (browser, exit 1 on failure): every non-actor effect (no act/body) renders the same hash at t=.5 as the P5 baseline server.
// usage: BASE_PORT=8124 [PORT=8123] node tools/same-test.mjs [all|cat:x|id,id]   (baseline: cd ../pixelfx3d-p5 && node tools/serve.mjs 8124)
import './node-env.mjs';
import { registerAll, registry } from '../src/index.js';
import { launch, open, render, pickIds, PORT } from './harness.mjs';
registerAll(); const actor = new Set([...registry.values()].filter((d) => d.act || d.body).map((d) => d.id));
const BASE = +(process.env.BASE_PORT || 8124), b = await launch(), A = await open(b, '', PORT), B = await open(b, '', BASE);
const ids = pickIds(await A.pg.evaluate('window.__ids'), process.argv[2]).filter((id) => !actor.has(id)), diff = [];
for (const id of ids) if ((await render(A.pg, id, 0.5)).hash !== (await render(B.pg, id, 0.5)).hash) diff.push(id);
console.log(`same ${ids.length - diff.length}/${ids.length}` + (diff.length ? '\n differ: ' + diff.join(', ') : ''));
const errs = [...A.errs, ...B.errs]; if (errs.length) console.log('console errors:\n ' + errs.join('\n '));
await b.close(); process.exit(diff.length || errs.length ? 1 : 0);
