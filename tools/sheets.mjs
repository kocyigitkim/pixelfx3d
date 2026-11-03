// P2: transparent PNG frames + sprite sheet + JSON per effect. usage: node tools/sheets.mjs outDir id[,id...] [fps=24] [size=256]
import fs from 'node:fs'; import path from 'node:path'; import { launch, open, pngPixel } from './harness.mjs';
const [out, idArg, fpsA = '24', sizeA = '256'] = process.argv.slice(2); const fps = +fpsA, size = +sizeA;
if (!out || !idArg) { console.error('usage: node tools/sheets.mjs outDir id[,id...] [fps] [size]'); process.exit(2); }
const b = await launch(); const { pg, errs } = await open(b, `transparent=1&w=${size}&h=${size}`, undefined, { width: size, height: size });
for (const id of idArg.split(',')) {
  const r = await pg.evaluate(([id, fps]) => { const s = window.__stage; s.autoReplay = false; s.play(id); const fx = s.fx, d = fx.duration, n = fx.loop ? Math.round(d * fps) : Math.floor(d * fps) + 1;
    const W = s.canvas.width, H = s.canvas.height, cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), sh = document.createElement('canvas'); sh.width = cols * W; sh.height = rows * H; const g = sh.getContext('2d'), frames = [];
    for (let i = 0; i < n; i++) { s.seek(i / fps); frames.push(s.canvas.toDataURL('image/png')); g.drawImage(s.canvas, (i % cols) * W, Math.floor(i / cols) * H); }
    return { frames, sheet: sh.toDataURL('image/png'), meta: { id, frameW: W, frameH: H, frames: n, fps, loop: fx.loop, cols, rows, duration: d } }; }, [id, fps]);
  const dir = path.join(out, id.replace('/', '_')); fs.mkdirSync(dir, { recursive: true }); const png = (u) => Buffer.from(u.split(',')[1], 'base64');
  r.frames.forEach((u, i) => fs.writeFileSync(path.join(dir, `frame_${String(i).padStart(4, '0')}.png`), png(u)));
  fs.writeFileSync(path.join(dir, 'sheet.png'), png(r.sheet)); fs.writeFileSync(path.join(dir, 'sheet.json'), JSON.stringify(r.meta, null, 1));
  const a = (await pngPixel(pg, r.frames[0], 0, 0))[3]; if (a !== 0) { console.error(`${id}: frame 0 corner alpha ${a} (expected 0)`); process.exitCode = 1; }
  console.log('wrote', dir, r.meta.frames, 'frames');
}
if (errs.length) { console.error(errs.join('\n')); process.exitCode = 1; } await b.close();
