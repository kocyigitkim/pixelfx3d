// Real-GPU sanity scan (headed chromium, ANGLE Metal/D3D11): flags frames that are almost entirely black (NaN blank-outs) or have console errors.
// usage: node tools/gpu-scan.mjs [all|cat:x|id,id] [t1,t2,...]   -> exit 1 on any flag
import { launch, open, render, pixels, pickIds } from './harness.mjs';
const angle = process.platform === 'darwin' ? 'metal' : process.platform === 'win32' ? 'd3d11' : 'gl';
const b = await launch(['--ignore-gpu-blocklist', '--use-gl=angle', `--use-angle=${angle}`], false);
const { pg, errs } = await open(b); const ids = pickIds(await pg.evaluate('window.__ids'), process.argv[2]); const ts = (process.argv[3] || '0.1,0.5,-0.9').split(',').map(Number); const bad = [];
for (const id of ids) for (const t of ts) { const r = await render(pg, id, t), px = pixels(r); let blk = 0; for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] <= 6) blk++; const f = blk / (r.w * r.h); if (f > 0.9 && !id.startsWith('transitions/')) bad.push(`${id}@${t} ${(100 * f).toFixed(0)}% black`); }
console.log(bad.length ? 'BLACK FRAMES:\n ' + bad.join('\n ') : 'no black frames'); if (errs.length) console.log('console errors:\n ' + errs.join('\n '));
await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
