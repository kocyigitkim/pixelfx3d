// P1 acceptance (exit 1 on failure): transparent output is clean premultiplied alpha; opaque pixels == baseline commit; gallery has no 4xx.
// needs current tree on PORT (8123) and the baseline worktree on BASE_PORT (8124) — see README "tests".
import { launch, open, render, pixels, pngPixel, PORT } from './harness.mjs';
const BASE = +(process.env.BASE_PORT || 8124);
const ALPHA_IDS = ['fire/campfire', 'explosions/small-explosion', 'water/splash', 'ice/frost-nova', 'lightning/chain-lightning', 'melee/sword-slash', 'arcane/mana-burst', 'holy/halo', 'shadow/necro-skulls', 'nature/healing-bloom'];
const CONTROL_IDS = ['explosions/small-explosion', 'ice/frost-nova', 'impacts/hit-spark', 'melee/sword-slash', 'moves/arrow-shot', 'nature/healing-bloom', 'projectiles/cannonball', 'shadow/hex-sigil', 'spawn/poof', 'ui/coin-collect'];
const fails = []; const fail = (m) => { fails.push(m); console.log('FAIL', m); };
const b = await launch();
// 1. transparent mode over a magenta page
const T = await open(b, 'transparent=1&bg=ff00ff');
for (const id of ALPHA_IDS) {
  const r = await render(T.pg, id, -0.5), px = pixels(r), W = r.w, H = r.h, N = W * H;
  for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) { const a = px[(y * W + x) * 4 + 3]; if (a !== 0) fail(`${id} corner ${x},${y} alpha ${a}`); }
  let solid = 0, bad = 0, soft = 0, halo = 0;
  const L = (i) => Math.max(px[i], px[i + 1], px[i + 2]) / px[i + 3]; // un-premultiplied brightness (max channel: saturated purple is not "dark")
  for (let i = 0; i < px.length; i += 4) { const a = px[i + 3];
    if (Math.max(px[i], px[i + 1], px[i + 2]) > a + 1) bad++;          // premultiplied: rgb must not exceed alpha
    if (a >= 250) solid++;
    if (a < 8 || a > 100) continue; soft++;
    // dark halo = a soft edge pixel much darker than the denser pixel it borders (correct premultiplication keeps colour constant across alpha)
    const x = (i >> 2) % W, y = (i >> 2) / W | 0; let ja = a + 40, j = -1;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; const k = (yy * W + xx) * 4; if (px[k + 3] > ja) { ja = px[k + 3]; j = k; } }
    if (j >= 0 && L(i) < 0.3 * L(j)) halo++; }
  if (solid / N > 0.5) fail(`${id} opaque rect: ${(100 * solid / N).toFixed(1)}% alpha>=250`);
  if (soft > 50 && halo / soft > 0.2) fail(`${id} dark halo: ${(100 * halo / soft).toFixed(1)}% of soft edge pixels darker than their denser neighbour`);
  if (bad / N > 0.001) fail(`${id} ${bad} invalid premultiplied pixels`);
  const shot = 'data:image/png;base64,' + (await T.pg.screenshot()).toString('base64');
  for (const [x, y] of [[0, 0], [959, 0], [0, 539], [959, 539]]) { const c = await pngPixel(T.pg, shot, x, y); if (Math.abs(c[0] - 255) > 3 || c[1] > 3 || Math.abs(c[2] - 255) > 3) fail(`${id} page corner ${x},${y} not magenta: ${c}`); }
}
T.errs.forEach((e) => fail('console ' + e));
// 2. opaque identity vs baseline commit (ground hidden: baseline ground used Math.random)
const cur = await open(b, 'legacy=1'), base = await open(b, '', BASE);
for (const id of CONTROL_IDS) for (const t of [-0.25, -0.6]) {
  const r1 = await render(cur.pg, id, t, { ground: false }), r0 = await render(base.pg, id, t, { ground: false }); if (r1.hash === r0.hash) continue;
  const p1 = pixels(r1), p0 = pixels(r0); let diff = 0, max = 0;
  for (let i = 0; i < p1.length; i++) { if (i % 4 === 3) continue; const d = Math.abs(p1[i] - p0[i]); if (d > 2) diff++; if (d > max) max = d; }
  if (diff / (p1.length * 0.75) > 0.002 || max > 6) fail(`${id}@${t} opaque differs: ${diff} px > 2, max ${max}`);
}
// 3. gallery: no 4xx / page errors (opaque + transparent)
const g = await b.newPage(); g.on('response', (r) => { if (r.status() >= 400) fail(`gallery ${r.status()} ${r.url()}`); }); g.on('pageerror', (e) => fail('gallery PAGEERR ' + e.message));
await g.goto(`http://localhost:${PORT}/gallery/`); await g.waitForTimeout(3000); await g.goto(`http://localhost:${PORT}/gallery/?transparent=1#fire/campfire`); await g.waitForTimeout(2000);
await b.close(); console.log(fails.length ? `alpha-test FAILED (${fails.length})` : 'alpha-test ok'); process.exit(fails.length ? 1 : 0);
