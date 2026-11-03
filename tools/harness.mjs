// Shared playwright helpers for alpha-test / determinism-test / sheets / perf. Page: gallery/test.html (see its query params).
import { chromium } from 'playwright';
export const PORT = +(process.env.PORT || 8123);
export const SWIFT = ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
export const launch = (args = SWIFT, headless = true) => chromium.launch({ args, headless });
// injected as a string so it also works on the baseline (old) harness: raw drawing buffer (premultiplied, bottom-up) + SHA-256
const INJECT = `window.__rgba = async () => { const gl = window.__stage.renderer.getContext(); const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight; const px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', px))].map((b) => b.toString(16).padStart(2, '0')).join('');
  let s = ''; for (let i = 0; i < px.length; i += 0x8000) s += String.fromCharCode.apply(null, px.subarray(i, i + 0x8000)); return { w, h, hash, b64: btoa(s) }; }; true`;
export async function open(browser, qs = '', port = PORT, viewport = { width: 960, height: 540 }) {
  const pg = await browser.newPage({ viewport }); const errs = [];
  pg.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); }); pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message.slice(0, 300)));
  await pg.goto(`http://localhost:${port}/gallery/test.html${qs ? '?' + qs : ''}`); await pg.waitForFunction('window.__ready', null, { timeout: 60000 }); await pg.evaluate(INJECT);
  return { pg, errs };
}
/** play id, seek t (t<0 => fraction of duration), return {w,h,hash,b64,dur,loop} */
export const render = (pg, id, t, { opts = {}, ground = true } = {}) => pg.evaluate(async ([id, t, opts, ground]) => {
  const s = window.__stage; s.autoReplay = false; s.play(id, opts); if (!ground) s.ground.visible = false; const d = s.fx.duration; s.seek(t < 0 ? -t * d : t);
  return { ...(await window.__rgba()), dur: d, loop: s.fx.loop }; }, [id, t, opts, ground]);
export const pixels = (r) => Buffer.from(r.b64, 'base64');
export const pngPixel = (pg, dataUrl, x, y) => pg.evaluate(async ([u, x, y]) => { const im = new Image(); im.src = u; await im.decode(); const c = new OffscreenCanvas(im.width, im.height), g = c.getContext('2d'); g.drawImage(im, 0, 0); return [...g.getImageData(x, y, 1, 1).data]; }, [dataUrl, x, y]);
export function pickIds(all, arg = 'all') { return arg === 'all' ? all : arg.startsWith('cat:') ? all.filter((i) => i.startsWith(arg.slice(4) + '/')) : arg.split(','); }
