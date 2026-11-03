// usage: node tools/shots.mjs outDir id[,id...] t[,t...]   (ids "all" | "cat:fire" supported)
import { chromium } from 'playwright'; import fs from 'node:fs'; import path from 'node:path';
const [out, idArg, tArg = '0.3,1'] = process.argv.slice(2); fs.mkdirSync(out, { recursive: true });
const port = process.env.PORT || 8123;
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = [];
pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text().slice(0, 600)); }); pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 600)));
await pg.goto(`http://localhost:${port}/gallery/test.html`); await pg.waitForFunction('window.__ready', null, { timeout: 60000 });
let ids = await pg.evaluate('window.__ids'); if (idArg.startsWith('cat:')) ids = ids.filter((i) => i.startsWith(idArg.slice(4) + '/')); else if (idArg !== 'all') ids = idArg.split(',');
const ts = tArg.split(',').map(Number); const report = [];
for (const id of ids) {
  const e0 = errs.length; let dur = 0;
  try { dur = await pg.evaluate((id) => window.__play(id), id); for (const tt of ts) { const t = tt < 0 ? -tt * dur : tt; await pg.evaluate((t) => window.__seek(t), t); await pg.screenshot({ path: path.join(out, `${id.replace('/', '_')}@${t.toFixed(2)}.png`) }); } } catch (e) { errs.push('EXC ' + id + ' ' + String(e).slice(0, 400)); }
  report.push({ id, dur, errors: errs.slice(e0) });
}
console.log(JSON.stringify(report.filter((r) => r.errors.length), null, 1)); console.log(`ok ${report.length - report.filter((r) => r.errors.length).length}/${report.length}`);
await b.close();
