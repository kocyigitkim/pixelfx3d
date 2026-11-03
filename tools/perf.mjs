// P5: frame time per effect on a REAL GPU (headed chromium). usage: node tools/perf.mjs [all|cat:x|id,id] [low,medium,high]
import { launch, open, pickIds } from './harness.mjs';
const angle = process.platform === 'darwin' ? 'metal' : process.platform === 'win32' ? 'd3d11' : 'gl';
const b = await launch(['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--disable-gpu-vsync', '--disable-frame-rate-limit', '--use-gl=angle', `--use-angle=${angle}`], false);
const quals = (process.argv[3] || 'low,medium,high').split(','), rows = [];
for (const q of quals) {
  const { pg } = await open(b, `quality=${q}&w=1280&h=720`, undefined, { width: 1280, height: 720 });
  if (q === quals[0]) console.log('GPU:', await pg.evaluate(() => { const gl = window.__stage.renderer.getContext(), e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }));
  for (const id of pickIds(await pg.evaluate('window.__ids'), process.argv[2])) rows.push({ q, id, ...(await pg.evaluate((id) => {
    const s = window.__stage; s.autoReplay = false; s.play(id); const gl = s.renderer.getContext(), px = new Uint8Array(4), ts = [];
    const particles = s.fx.parts.reduce((n, p) => n + (p.mesh?.geometry?.instanceCount || 0), 0);
    for (let i = 0; i < 20; i++) { s.frame(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } // warm-up: shader compile
    s.fx.reset(); const n = Math.max(60, Math.min(240, Math.round(s.fx.duration * 60)));
    for (let i = 0; i < n; i++) { const t0 = performance.now(); s.frame(1 / 60); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); ts.push(performance.now() - t0); } // readPixels = wait for GPU
    ts.sort((a, b) => a - b); return { particles, median: +ts[n >> 1].toFixed(2), p95: +ts[Math.floor(n * 0.95)].toFixed(2), max: +ts[n - 1].toFixed(2) }; }, id)) });
}
console.log('| quality | effect | particles | median ms | p95 ms | max ms |\n|---|---|---|---|---|---|');
for (const r of rows) console.log(`| ${r.q} | ${r.id} | ${r.particles} | ${r.median} | ${r.p95} | ${r.max} |`);
const over = rows.filter((r) => r.particles > 900); if (over.length) console.log('OVER 900 particles:', [...new Set(over.map((r) => r.id))].join(', '));
await b.close();
