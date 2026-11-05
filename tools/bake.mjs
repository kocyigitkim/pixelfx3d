// Offline asset baker driver (headed Chromium on the real GPU, same flags as gpu-scan.mjs).
// usage: node tools/bake.mjs [all|<name>|noise|test] [--check]
import { chromium } from 'playwright';
import fs from 'node:fs'; import path from 'node:path';
import { encodePNG, sha256 } from './bake/png.mjs';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const outDir = path.join(root, 'assets', 'fx'), manPath = path.join(outDir, 'manifest.json');
const BUDGET = 20 * 1024 * 1024;
const check = process.argv.includes('--check');
const sel = process.argv.slice(2).find((a) => !a.startsWith('--')) || 'all';
const dbgIdx = process.argv.indexOf('--debug'), dbg = dbgIdx >= 0 ? process.argv[dbgIdx + 1] : null;
const angle = process.platform === 'darwin' ? 'metal' : process.platform === 'win32' ? 'd3d11' : 'gl';
const b = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--use-gl=angle', `--use-angle=${angle}`], headless: false });
const bad = [];
try {
  const pg = await b.newPage();
  pg.on('pageerror', (e) => bad.push('PAGEERR ' + e.message.slice(0, 300)));
  await pg.goto('http://localhost:8123/tools/bake.html');
  await pg.waitForFunction('window.__ready', null, { timeout: 120000 });
  if (dbg) {
    const res = [];
    for (const n of [30, 120]) {
      const r = await pg.evaluate(([nm, st]) => window.__simDebug(nm, st), [dbg, n]);
      console.log(`${dbg} steps ${n}: sumRho ${r.sumRho.toPrecision(5)}  sumV ${r.sumV.toPrecision(5)}  nan ${r.nan}  divBefore ${r.divBefore.toPrecision(4)}  divAfter ${r.divAfter.toPrecision(4)}`);
      res.push(r);
    }
    await b.close();
    process.exit(bad.length || res.some((r) => r.nan > 0 || !(r.sumRho > 0) || r.divAfter > 0.05 * r.divBefore) ? 1 : 0);
  }
  const names = sel === 'all' ? [...(await pg.evaluate('window.__presets')), 'noise'] : [sel];
  const out = []; // {name, meta, files:[{file, w, h, png}]}
  for (const name of names) {
    const r = await pg.evaluate((n) => window.__bake(n), name);
    if (!r) { console.log(`skip ${name} (no bake)`); continue; }
    if (r.meta?.ms) console.log(`${name} ${r.meta.ms} ms`);
    out.push({ name, meta: r.meta || {}, files: r.files.map((f) => {
      // GL readback is bottom-up: flip rows before encoding.
      const px = Buffer.from(f.b64, 'base64'), stride = f.w * 4, flipped = Buffer.alloc(px.length);
      for (let y = 0; y < f.h; y++) px.copy(flipped, y * stride, (f.h - 1 - y) * stride, (f.h - y) * stride);
      return { file: `${f.name}.png`, w: f.w, h: f.h, png: encodePNG(f.w, f.h, flipped), rgba: flipped };
    }) });
  }
  for (const o of out) if (o.meta.a) o.meta.sha256 = { a: sha256(o.files[0].png), b: sha256(o.files[1].png) };
  if (check) {
    const man = JSON.parse(fs.readFileSync(manPath, 'utf8'));
    for (const o of out) for (const f of o.files) {
      const want = man.files?.[f.file]?.sha256, got = sha256(f.png);
      if (want !== got) bad.push(`${f.file}: manifest ${want ?? 'missing'} != baked ${got}`);
    }
    if (!bad.length) console.log('check ok');
  } else {
    fs.mkdirSync(outDir, { recursive: true });
    let man = { version: 1, seed: 1337, presets: {}, noise: {} };
    if (fs.existsSync(manPath)) man = { ...man, ...JSON.parse(fs.readFileSync(manPath, 'utf8')) };
    man.files = man.files || {};
    for (const o of out) {
      for (const f of o.files) {
        fs.writeFileSync(path.join(outDir, f.file), f.png);
        man.files[f.file] = { w: f.w, h: f.h, sha256: sha256(f.png) };
      }
      if (o.meta.file === 'noise.png') man.noise = { ...o.meta, sha256: sha256(o.files[0].png) };
      else if (Object.keys(o.meta).length) man.presets[o.name] = { ...man.presets[o.name], ...o.meta };
    }
    fs.writeFileSync(manPath, JSON.stringify(man, null, 2) + '\n');
    console.log('wrote ' + out.reduce((n, o) => n + o.files.length, 0) + ' file(s) + manifest.json');
  }
  // Seam check on the raw RGBA: wrap pairs col0/col[w-1] and row0/row[h-1], mean over all channels.
  for (const o of out.filter((o) => o.meta.file === 'noise.png')) {
    const f = o.files[0], px = f.rgba, s = f.w * 4;
    let col = 0, row = 0;
    for (let y = 0; y < f.h; y++) for (let k = 0; k < 4; k++) col += Math.abs(px[y * s + k] - px[y * s + s - 4 + k]);
    for (let x = 0; x < s; x++) row += Math.abs(px[x] - px[(f.h - 1) * s + x]);
    const cm = col / (f.h * 4), rm = row / s;
    // Interior max: largest per-pair mean adjacent difference over all interior column / row pairs (all channels).
    let icm = 0, irm = 0;
    for (let x = 0; x < f.w - 1; x++) { let t = 0; for (let y = 0; y < f.h; y++) for (let k = 0; k < 4; k++) t += Math.abs(px[y * s + x * 4 + k] - px[y * s + x * 4 + 4 + k]); icm = Math.max(icm, t / (f.h * 4)); }
    for (let y = 0; y < f.h - 1; y++) { let t = 0; for (let x = 0; x < s; x++) t += Math.abs(px[y * s + x] - px[y * s + s + x]); irm = Math.max(irm, t / s); }
    console.log(`seam col ${cm.toFixed(3)}/255 (interior max ${icm.toFixed(3)}/255) row ${rm.toFixed(3)}/255 (interior max ${irm.toFixed(3)}/255)`);
    if (cm > icm || rm > irm) bad.push('seam check failed (above interior max)');
    else console.log('seam ok');
  }
} finally {
  await b.close();
}
// Budget: sum all PNGs in assets/fx.
const pngs = fs.existsSync(outDir) ? fs.readdirSync(outDir).filter((f) => f.endsWith('.png')) : [];
let total = 0;
for (const f of pngs) { const s = fs.statSync(path.join(outDir, f)).size; total += s; console.log(`  ${f}  ${(s / 1048576).toFixed(3)} MB`); }
console.log(`total ${(total / 1048576).toFixed(3)} MB (budget 20 MB)`);
if (total > BUDGET) bad.push('over 20 MB budget');
if (bad.length) { console.log(bad.join('\n')); process.exit(1); }
