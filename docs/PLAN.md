# Implementation plan for P1–P7 in pixelfx3d (steps for a Haiku agent)

All steps edit files under `/Users/muhammet.kocyigit/Downloads/pixelfx3d`. Every path below is relative to that folder. Do the steps in order, one at a time, and run no tests until S48. When a step says "old → new", replace that exact text. If the text is not unique, edit only inside the named effect block.

## What I found while reading the code (this drives the design)

- **Why alpha breaks today:**
  - The final pass writes `vec4(c,1.)`.
  - `UnrealBloomPass.blendMaterial` uses `AdditiveBlending` (`SRC_ALPHA, ONE`). That pollutes the scene alpha.
  - The additive `bl(true)` / emitter blending uses `blendSrcAlpha=One, blendDstAlpha=One`. Glow therefore adds coverage, which gives dark fringes and opaque quads over a light background.
  - Fifteen materials in fx files have the same problem: `THREE.AdditiveBlending` in aurora, halo sprites and scifi `glowMat`, and the `ADD` consts in `src/fx/shadow.js` and `src/fx/nature.js`. Melee `SW_F` even writes alpha 1.0 on additive sweeps.
- **Opaque RGB never depends on scene alpha.** I checked the highpass, blur, composite and OutputPass shaders. So changing only the alpha blend factors leaves opaque pixels identical. The transparent path reuses `UnrealBloomPass`, with the blend material changed to (color `SrcAlpha, One`; alpha `Zero, One`), and a new final-pass branch.
- **Bloom is quadratic.** The composite output alpha is `strength*3` and the blend multiplies RGB by it. Visible bloom is therefore `≈3·strength²`, so per-effect bloom 0.6 is about 1.8× the bloom at 0.45. A global `bloomScale` 0.8 cuts bloom energy by about 36%.
- **Ground is not deterministic.** `makeGround` uses `Math.random`. `src/fx/moves.js:303` has a dead `Math.random` in a comma expression.
- **Loops cannot match at t=duration today:**
  - All parts receive absolute time, so orb, beam, shell and decal noise, light flicker and mesh callbacks drift.
  - `Bolt.gen` uses an rng whose state carries over between calls, so bolt shape depends on history.
  - Beam noise also has a seam at `vUv.x` = 0/1. That is a render error.
- **Below-ground meshes leak in transparent mode** (summon-rise brute, earth-spike). A global renderer clipping plane at y=0, in transparent mode only, mimics the ground. It must be set *after* the PMREM `fromScene` call, otherwise the environment map breaks.
- **Tool problems:**
  - `tools/shots.mjs` and `tools/sheet.mjs` hard-code `executablePath: '/usr/bin/google-chrome'`, so they fail on macOS. The bundled Playwright chromium is installed.
  - There is an untracked `tools/_shots_tmp.mjs` (not mine). Leave it alone.
- **Package entry points and import maps already work.**
  - `package.json` already exports `./fx/*`.
  - Library code imports only `'three'` and `'three/addons/*'`, and three's own exports map both. No code change is needed; only types and docs.
- **The gallery 404 is most likely `/favicon.ico`** (there is no `<link rel=icon>`). T5 confirms it.
- **Baseline for the opaque check.** The last commit `481cf24` is the baseline. It is served from a git worktree at test time, so nothing has to be captured before the changes. The ground is hidden in both renders, because the baseline ground uses `Math.random`.

---

## Code steps

### Phase A: core (small, backward compatible)

**S1 — `src/core/stage.js`: imports and constants.**

1. After `import { createFx, Fx } from './fx.js';` add:
   ```js
   import { makeRng } from './rng.js';
   ```
2. After the closing `};` of `SKIES` add:
   ```js
   const QUALITY = { low: { pr: 0.75, count: 0.5, samples: 0 }, medium: { pr: 1, count: 0.75, samples: 2 }, high: { pr: 1.5, count: 1, samples: 4 } };
   const TONE = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping, none: THREE.NoToneMapping };
   ```

**S2 — `src/core/stage.js`: replace the whole `finalShader` function with:**
```js
const MAIN_OPAQUE = 'vec3 c=texture2D(tDiffuse,vUv).rgb; if(uOn>.5) c=trans(vUv,c,uP,uTime,uAspect); c=mix(c,uFlashCol,clamp(uFlash,0.,1.)); vec2 q=vUv-.5; c*=1.-uVig*dot(q,q)*1.6; gl_FragColor=vec4(c,1.);';
// transparent: keep scene alpha; glow adds coverage = its brightness, so rgb <= a (valid premultiplied). No vignette (would darken edges).
const MAIN_ALPHA = 'vec4 s=texture2D(tDiffuse,vUv); vec3 c=s.rgb; if(uOn>.5) c=trans(vUv,c,uP,uTime,uAspect); c=clamp(c,0.,1.); float a=clamp(max(s.a,max(c.r,max(c.g,c.b))),0.,1.); c=mix(c,uFlashCol*a,clamp(uFlash,0.,1.)); gl_FragColor=vec4(c,a);';
function finalShader(fn, tr) {
  return { uniforms: { tDiffuse: { value: null }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 1, 1) }, uP: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 }, uVig: { value: 0.35 }, uOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `${NOISE}
uniform sampler2D tDiffuse; uniform float uFlash,uP,uTime,uAspect,uVig,uOn; uniform vec3 uFlashCol; varying vec2 vUv;
${fn || 'vec3 trans(vec2 uv, vec3 c, float p, float t, float a){ return c; }'}
void main(){ ${tr ? MAIN_ALPHA : MAIN_OPAQUE} }` };
}
// transparent mode: additive materials must add light, not coverage (dark fringes / opaque quads otherwise). RGB unchanged.
function fixAlpha(root) {
  root.traverse((o) => { for (const m of [].concat(o.material || [])) {
    if (m.blending === THREE.AdditiveBlending) Object.assign(m, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    else if (m.blending === THREE.CustomBlending && m.blendDst === THREE.OneFactor) Object.assign(m, { blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
  } });
}
```

**S3 — `src/core/stage.js`: constructor.** Replace the first three lines of `constructor` (from `this.container = container;` through `this.renderer.toneMappingExposure = o.exposure ?? 1.0;`) with:
```js
    this.container = container; this.opts = o; this.transparent = !!o.transparent; const q = QUALITY[o.quality]; this.quality = q ? o.quality : 'high';
    this.bloomScale = o.bloomScale ?? 0.8; this.flashMax = o.flashMax ?? 0.6; // global anti-overbright (bloom is ~strength^2, so 0.8 -> 0.64x energy)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserve, alpha: this.transparent, premultipliedAlpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.maxPixelRatio ?? 1.5, q ? q.pr : Infinity)); this.renderer.toneMapping = TONE[o.toneMapping] ?? THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = o.exposure ?? 1.0;
```
Keep the line `container.appendChild(...)` that follows.

**S4 — `src/core/stage.js`: constructor, continued.**

1. Right after the line `this.sky.renderOrder = -10; this.scene.add(this.sky);` add:
   ```js
   if (this.transparent) { this.sky.visible = false; this.renderer.setClearColor(0x000000, 0); this.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)]; } // after PMREM on purpose; y<0 hidden like the ground would
   ```
2. In `new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 })` change `samples: 4` to `samples: q ? q.samples : 4`.
3. After the line that creates `this.bloom` (it also adds `OutputPass`) add:
   ```js
   if (this.transparent) Object.assign(this.bloom.blendMaterial, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }); // same RGB as AdditiveBlending, keeps scene alpha
   ```
4. `this.finalPass = new ShaderPass(finalShader());` → `this.finalPass = new ShaderPass(finalShader(null, this.transparent));`

**S5 — `src/core/stage.js`: methods.**

1. `makeGround() {` → `makeGround() { const rnd = makeRng(7);`. Then replace all four `Math.random()` in that function with `rnd()`.
2. In `setSky`: `this.scene.fog = s.fogD ? new THREE.FogExp2(s.fog, s.fogD) : null;` → `this.scene.fog = s.fogD && !this.transparent ? new THREE.FogExp2(s.fog, s.fogD) : null;`
3. In `play`:
   - `const fx = def instanceof Fx ? def : createFx(def, opts);` → `const q = QUALITY[this.opts.quality]; const fx = def instanceof Fx ? def : createFx(def, q ? { countScale: q.count, ...opts } : opts);`
   - `this.ground.visible = st.ground !== false; this.bloom.strength = st.bloom ?? this.opts.bloom ?? 0.45; this.bloom.threshold = st.threshold ?? 1.0; this.bloom.radius = st.radius ?? 0.5;` → `this.ground.visible = !this.transparent && st.ground !== false; this.bloom.strength = (st.bloom ?? this.opts.bloom ?? 0.45) * this.bloomScale; this.bloom.threshold = st.threshold ?? this.opts.threshold ?? 1.0; this.bloom.radius = st.radius ?? this.opts.radius ?? 0.5;`
   - `this.hemi.intensity *= st.ambient ?? 1; this.setupScreen(fx);` → `this.hemi.intensity *= st.ambient ?? 1; if (this.transparent) fixAlpha(fx); this.setupScreen(fx);`
4. In `setupScreen`: `new ShaderPass(finalShader(sc ? sc.glsl : null))` → `new ShaderPass(finalShader(sc ? sc.glsl : null, this.transparent))`
5. In `frame`: `fp.uFlash.value = fx.flashAmt;` → `fp.uFlash.value = Math.min(this.flashMax, fx.flashAmt);`

**S6 — `src/core/fx.js` `update()`.**

Old:
```js
    for (const p of this.parts) p.update(tAbs, t); for (const f of this.onFrame) f(t, tAbs, this);
    if (this.body) { this.body.u.uTime.value = tAbs;
```
New:
```js
    const tp = this.loop ? t : tAbs; // loops: parts see wrapped time, so frame(t) == frame(t + duration); identical inside the first period
    for (const p of this.parts) p.update(tp, t); for (const f of this.onFrame) f(t, tAbs, this);
    if (this.body) { this.body.u.uTime.value = tp;
```

**S7 — `src/core/emitter.js`.**

1. `const n = Math.max(1, p.count | 0);` → `const n = Math.max(1, Math.round((p.count | 0) * (fx.o.countScale ?? 1)));`
2. In the material, change `blendSrcAlpha: THREE.OneFactor` to `blendSrcAlpha: add ? THREE.ZeroFactor : THREE.OneFactor`. Leave `blendDstAlpha` as it is.

**S8 — `src/core/emitter.js` FRAG: flame kind** (hot core, saturated cooler rim, per-tongue flicker; no global time, so loops stay seamless). Replace the whole `else if(uKind==3){ ... }` block with:
```glsl
  else if(uKind==3){
    float x=p.x, y=vUv.y; float w=(1.-y)*.95;
    float n=fbm(vec3(x*1.7,y*2.2-vU*3.,seed)); float wob=(n-.5)*.9*y;
    float m=smoothstep(w+.12,w-.3,abs(x+wob))*smoothstep(0.,.14,y)*smoothstep(1.,.5,y);
    float core=pow(m,2.2)*(1.-y*.8); float fl=.85+.3*sin(vU*31.+seed*7.);
    vec3 deep=col*col/max(max(col.r,max(col.g,col.b)),1e-3);
    a=m*(.55+.45*n); col=mix(deep*.55,col*1.3,clamp(core*1.6+n*.25,0.,1.))*fl;
  }
```

**S9 — `src/core/prims.js`: blend helper and periodic snippet.**

1. In `bl`: `blendSrcAlpha: THREE.OneFactor` → `blendSrcAlpha: add ? THREE.ZeroFactor : THREE.OneFactor`.
2. After the `bl` line add:
   ```js
   // loop-safe time noise: uPeriod>0 crossfades two copies one period apart so frame(t) == frame(t+uPeriod). Needs uTime declared before.
   const PER = /* glsl */ `uniform float uPeriod;
   float fbmT(vec3 p, vec3 v){ if(uPeriod<=0.) return fbm(p+v*uTime); float m=mod(uTime,uPeriod); return mix(fbm(p+v*m),fbm(p+v*(m-uPeriod)),m/uPeriod); }
   float fbm3T(vec3 p, vec3 v){ if(uPeriod<=0.) return fbm3(p+v*uTime); float m=mod(uTime,uPeriod); return mix(fbm3(p+v*m),fbm3(p+v*(m-uPeriod)),m/uPeriod); }
   float ph(float s){ if(uPeriod<=0.) return uTime*s; float k=max(1.,floor(abs(s)*uPeriod/6.2831853+.5))*sign(s); return 6.2831853*k*mod(uTime,uPeriod)/uPeriod; }`;
   const per = (fx) => ({ uPeriod: { value: fx.loop ? fx.duration : 0 } });
   ```

**S10 — `src/core/prims.js` Orb (periodic plasma/fire orb).**

- In `ORB_V`: after `uniform float uTime, uNS, uScroll, uDisp; varying vec3 vN, vWP, vP;` insert `${PER}`. Replace `fbm3(position*uNS+vec3(0.,-uTime*uScroll,uTime*.3*uScroll))` with `fbm3T(position*uNS,vec3(0.,-uScroll,.3*uScroll))`.
- In `ORB_F`: after `varying vec3 vN, vWP, vP;` insert `${PER}`. Then:
  - `fbm(vP*uNS*1.4+vec3(0.,-uTime*uScroll*1.6,uTime*uScroll*.5))` → `fbmT(vP*uNS*1.4,vec3(0.,-uScroll*1.6,uScroll*.5))`
  - `sin(h*9.+uTime*uScroll*3.)` → `sin(h*9.+ph(uScroll*3.))`
  - `sin(h*12.-uTime*uScroll*4.)` → `sin(h*12.-ph(uScroll*4.))`
  - `fbm(vec3(vP*uNS+vec3(0.,uTime*uScroll,0.)))` → `fbmT(vP*uNS,vec3(0.,uScroll,0.))`
  - `fbm(vP*uNS+vec3(0.,uTime*uScroll*.3,0.))` → `fbmT(vP*uNS,vec3(0.,uScroll*.3,0.))`
- In the Orb constructor's `this.u = {`, add `...per(fx),` after `uMode: { value: mode },`.

**S11 — `src/core/prims.js` Beam (periodic, and the seam fixed).**

- In `BEAM_F`: after its `uniform ... varying vec2 vUv;` line insert `${PER}`.
- `float n=fbm(vec3(vUv.x*6.2831*1.5,y*uFreq-uTime*uSpeed,uTime*.3));` → `float an=vUv.x*6.2831853; float n=fbmT(vec3(cos(an)*1.5,sin(an)*1.5,y*uFreq),vec3(.3,0.,-uSpeed));`
- `sin(y*uFreq*2.-uTime*uSpeed*3.)` → `sin(y*uFreq*2.-ph(uSpeed*3.))`
- In the Beam constructor's `this.u = {`, add `...per(fx),` at the start.

**S12 — `src/core/prims.js` Shell and Decal (periodic glow).**

- **Shell:**
  - After the `SHELL_F` uniform line insert `${PER}`.
  - `float n=fbm(vP*3.+vec3(0.,uTime*.4,0.))*uNoise;` → `float n=fbmT(vP*3.,vec3(0.,.4,0.))*uNoise;`
  - In the Shell constructor's `this.u = {`, add `...per(fx),` at the start.
- **Decal:**
  - After the `DEC_F` uniform line (ends `varying vec2 vUv;`) insert `${PER}`.
  - `fbm(vec3(p*8.+uSeed,uTime*.3))` → `fbmT(vec3(p*8.+uSeed,0.),vec3(0.,0.,.3))`
  - `fbm(vec3(p*3.,uTime*.4))` → `fbmT(vec3(p*3.,0.),vec3(0.,0.,.4))`
  - In the Decal constructor's `this.u = {`, add `...per(fx),` at the start.

**S13 — `src/core/prims.js` Bolt and Light.**

1. In `Bolt.gen`, replace
   ```js
   const rng = (this._r ||= (() => { let s = (this.seed * 1000) | 0; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })());
   ```
   with
   ```js
   let s = (Math.imul((this.seed * 1000) | 0, 7919) + Math.imul(slot, 0x9e3779b1)) >>> 0; const rng = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; // pure fn of slot: replay/loop-safe
   ```
2. In `Light.update` replace the `const fl = ...;` line with:
   ```js
   const P = this.fx.loop ? this.fx.duration : 0, r = P ? (2 * Math.PI / P) * Math.max(1, Math.round(this.rate * P / (2 * Math.PI))) : this.rate, k2 = P ? 2 : 2.3, k5 = P ? 5 : 5.1; // loops: integer harmonics of the period
   const fl = p.flicker ? 1 + p.flicker * (Math.sin(tAbs * r + this.seed2) * 0.5 + Math.sin(tAbs * r * k2 + this.seed2 * 2) * 0.35 + Math.sin(tAbs * r * k5) * 0.15) : 1;
   ```

**S14 — Additive alpha in fx helper consts** (the RGB result does not change).

- `src/fx/shadow.js` line 8 (`ADD`) and `src/fx/nature.js` line 42 (`ADD`): `blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor` → `blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor`.
- `src/fx/melee.js` `sweepSurface` material: append `, blendSrcAlpha: o.normal ? THREE.OneFactor : THREE.ZeroFactor, blendDstAlpha: o.normal ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor` before `});`.
- `src/fx/moves.js:303`: `env: (u) => (Math.random, Math.exp(-u * 4.5))` → `env: (u) => Math.exp(-u * 4.5)`.

### Phase B: harness and tools

**S15 — Replace `gallery/test.html` entirely:**
```html
<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><body style="margin:0;background:#000"><div id="v" style="width:960px;height:540px"></div>
<script type="importmap">{"imports":{"three":"../node_modules/three/build/three.module.js","three/addons/":"../node_modules/three/examples/jsm/"}}</script>
<script type="module">
import { Stage, registerAll, registry } from '../src/index.js';
registerAll();
// query: transparent=1, legacy=1 (old bloom/flash defaults, for baseline compare), quality=low|medium|high, w, h, bg=hex
const q = new URLSearchParams(location.search), v = document.getElementById('v');
if (q.get('bg')) document.body.style.background = '#' + q.get('bg');
v.style.width = (q.get('w') || 960) + 'px'; v.style.height = (q.get('h') || 540) + 'px';
const o = { preserve: true, maxPixelRatio: 1, transparent: q.has('transparent'), quality: q.get('quality') || undefined };
if (q.has('legacy')) Object.assign(o, { bloomScale: 1, flashMax: 1 });
const stage = new Stage(v, o);
window.__stage = stage; window.__ids = [...registry.keys()];
window.__play = (id, opts) => { stage.autoReplay = false; stage.play(id, opts); return stage.fx.duration; };
window.__seek = (t) => { stage.seek(t); return true; };
window.__ready = true;
</script>
```

**S16 — `gallery/index.html`.**

1. In `<head>` after `<title>…</title>` add `<link rel="icon" href="data:,">` (the 404 fix).
2. CSS: before `</style>` add:
   ```css
   #view.tr{background:repeating-conic-gradient(#2b2e36 0% 25%,#1c1e24 0% 50%) 0 0/24px 24px}
   ```
3. In `#bar` after the mirror label add `<label><input id="trn" type="checkbox"> transparent</label>`.
4. Replace `const stage = new Stage($('#view'), { preserve: true }); stage.start(); window.stage = stage;` with:
   ```js
   const TR = new URLSearchParams(location.search).has('transparent'); $('#trn').checked = TR; $('#view').classList.toggle('tr', TR);
   $('#trn').onchange = (e) => { const u = new URL(location.href); if (e.target.checked) u.searchParams.set('transparent', '1'); else u.searchParams.delete('transparent'); location.href = u.href; };
   const stage = new Stage($('#view'), { preserve: true, transparent: TR }); stage.start(); window.stage = stage;
   ```
5. In `select()`: `stage.bloom.strength = +$('#blm').value * ((d.stage?.bloom ?? 0.45) / 0.45);` → `... * ((d.stage?.bloom ?? 0.45) / 0.45) * stage.bloomScale;`
6. In `$('#blm').oninput`: `stage.bloom.strength = +e.target.value;` → `stage.bloom.strength = +e.target.value * stage.bloomScale;`

**S17 — `tools/shots.mjs` and `tools/sheet.mjs`.** Delete `executablePath: '/usr/bin/google-chrome', ` in both. In `shots.mjs`:
- `const [out, idArg, tArg = '0.3,1'] = process.argv.slice(2);` → `const [out, idArg, tArg = '0.3,1', qs = ''] = process.argv.slice(2);`
- `gallery/test.html\`` → `gallery/test.html${qs ? '?' + qs : ''}\``
- Update the usage comment: `... t[,t...] [query e.g. transparent=1]`.

**S18 — New `tools/harness.mjs`:**
```js
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
```

**S19 — New `tools/alpha-test.mjs`:**
```js
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
  let solid = 0, soft = 0, dark = 0, bad = 0;
  for (let i = 0; i < px.length; i += 4) { const a = px[i + 3];
    if (Math.max(px[i], px[i + 1], px[i + 2]) > a + 1) bad++;          // premultiplied: rgb must not exceed alpha
    if (a >= 250) solid++;
    if (a >= 8 && a <= 160) { soft++; if ((0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / a < 0.05) dark++; } } // near-black soft edge = dark halo
  if (solid / N > 0.5) fail(`${id} opaque rect: ${(100 * solid / N).toFixed(1)}% alpha>=250`);
  if (soft && dark / soft > 0.03) fail(`${id} dark halo: ${(100 * dark / soft).toFixed(1)}% of soft pixels near-black`);
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
```

**S20 — New `tools/determinism-test.mjs`:**
```js
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
```

**S21 — New `tools/sheets.mjs`:**
```js
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
```

**S22 — New `tools/perf.mjs`:**
```js
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
```

### Phase C: visual fixes (P3). Each step touches one effect; split further if needed

**S23 — `src/fx/fire.js`: shared fire ramp and campfire.**
- `const FIRE = [[0, '#fff2c0', 1], [0.25, '#ffb030', 0.9], [0.7, '#e04010', 0.5], [1, '#300', 0]];` → `const FIRE = [[0, '#ffe2a0', 1], [0.2, '#ffa030', 0.95], [0.55, '#e0480c', 0.7], [0.85, '#6a1606', 0.3], [1, '#1a0602', 0]];` (hot → orange → dark red, less white).
- In campfire, on the flame emitter: `intensity: 0.6, turb: [0.2, 1.4]` → `intensity: 0.5, turb: [0.2, 1.4]`. After that line add a base heat glow:
  ```js
  fx.emitter({ count: 6, kind: 'soft', shape: 'disc', radius: 0.15, dir: [0, 1, 0], speed: [0, 0.05], life: [1.5, 1.5], size: [0.9, 0.9], ramp: [[0, '#ff7a20', 0], [0.5, '#ff6a10', 0.35], [1, '#ff7a20', 0]], intensity: 0.5, pos: [0, 0.35, 0] });
  ```

**S24 — `fire/fire-ring`:**
- `fx.flash(0, 0.2, '#ffb060', 0.35)` → `0.2`
- Light `intensity: 90, pos: [0, 1.2, 0], range: 16` → `intensity: 60, ...`
- The first ring's `intensity: 1.2` → `0.9`
- First smoke burst `intensity: 0.5, emit: 0.25` → `intensity: 0.35, emit: 0.25`
- Wall emitter: `count: 220, kind: 'smoke', ... speed: [0.5, 1.4], life: [0.7, 1.5], size: [0.8, 0.3], aspect: 2.0, ramp: fx.pal(FIRE), intensity: 0.45` → `count: 200, kind: 'flame', ... speed: [0.4, 1.1], life: [0.6, 1.2], size: [0.9, 0.35], aspect: 1.9, ramp: fx.pal(FIRE), intensity: 0.3`
- Sparks `intensity: 3, delay: 0.9, emit: 2.3` → `intensity: 2.2, delay: 0.9, emit: 2.3`

**S25 — `fire/fire-tornado`: replace the whole `build(fx) { ... }` with a real funnel** (rings that widen with height, 530 particles):
```js
    build(fx) {
      fx.light({ color: '#ff7a20', intensity: 70, pos: [0, 1.5, 0.3], range: 14, flicker: 0.3 });
      fx.decal({ kind: 'glow', r: [2.0, 2.0], ramp: [[0, '#000'], [0.4, '#6a1800'], [1, '#ff6a10']], intensity: 0.9, alpha: 0.7, y: 0.006 });
      [[0.15, 0.22], [0.6, 0.32], [1.1, 0.46], [1.6, 0.62], [2.15, 0.82], [2.7, 1.05]].forEach(([y, r], i) => fx.emitter({ count: 50, kind: 'flame', shape: 'ring', radius: r, radiusIn: r * 0.8, pos: [0, y, 0], dir: [0, 1, 0], spread: 0.15, speed: [0.25, 0.6], life: [0.5, 0.9], size: [0.55 - i * 0.03, 0.2], aspect: 1.7, ramp: fx.pal(FIRE), intensity: 0.32 - i * 0.025, swirl: 7 - i * 0.6, turb: [0.12, 1.5] }));
      fx.emitter({ count: 60, kind: 'flame', shape: 'disc', radius: 0.12, dir: [0, 1, 0], spread: 0.05, speed: [1.6, 2.4], life: [0.6, 1.0], size: [0.5, 0.25], aspect: 2.2, ramp: fx.pal(FIRE), intensity: 0.28, swirl: 8, turb: [0.1, 2] });
      fx.emitter({ count: 90, kind: 'spark', shape: 'disc', radius: 0.5, dir: [0, 1, 0], spread: 0.3, speed: [1.5, 3.5], life: [1, 1.8], size: [0.05, 0.02], stretch: 0.6, ramp: [[0, '#fff0b0'], [0.4, '#ff8a20'], [1, '#400', 0]], intensity: 2.2, swirl: 6, radial: 0.8 });
      fx.emitter({ count: 40, kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 0.9, radiusIn: 0.4, dir: [0, 0.3, 0], spread: 0.5, speed: [0.3, 0.8], life: [1, 1.6], size: [0.3, 0.9], swirl: 4, ramp: [[0, '#4a3c30', 0], [0.3, '#3a3028', 0.35], [1, '#1a1612', 0]], order: -1 });
      smoke(fx, { count: 40, shape: 'ring', radius: 1.0, radiusIn: 0.6, dir: [0, 1, 0], spread: 0.25, speed: [1.0, 1.8], life: [1.4, 1.9], size: [0.9, 2.2], swirl: 3, pos: [0, 3.0, 0], ramp: [[0, '#2a2622', 0], [0.4, '#3a342e', 0.3], [1, '#15130f', 0]] });
    } },
```

**S26 — `lightning/lightning-strike`:**
- `stage: { sky: 'storm', bloom: 0.5,` → `bloom: 0.4,`
- Light `intensity: 600` → `260`
- `fx.flash(TS, 0.35, '#e6ecff', 0.9); fx.flash(TS + 0.28, 0.2, '#e6ecff', 0.5);` → amounts `0.45` and `0.25`
- Beam `r: [0.45, 0.35], noise: 0.8, speed: 8, intensity: 1.6` → `r: [0.22, 0.16], noise: 0.8, speed: 8, intensity: 0.6`
- First bolt `width: 0.09, rate: 40, flicker: 0.3, ramp: BOLT, intensity: 4` → `width: 0.06, ..., intensity: 2.6`
- Second bolt `intensity: 3.5` → `2.4`; third bolt `intensity: 3 })` → `2 })`
- Sparks `intensity: 4.5` → `3`
- Glint `size: [2.4, 0.6], life: [0.35, 0.35], ramp: glintRamp, intensity: 4` → `size: [1.4, 0.4], ..., intensity: 2`

**S27 — `lightning/zap-hit`:**
- `fx.flash(0.02, 0.12, '#dfe6ff', 0.4)` → `0.25`
- Main bolt `intensity: 3.8` → `2.6`
- The five branch bolts `intensity: 3 }); }` → `intensity: 2.2 }); }`
- Light `intensity: 130` → `70`
- Glint `size: [1.0, 0.3], life: [0.2, 0.2], ramp: glintRamp, intensity: 4` → `size: [0.6, 0.2], ..., intensity: 2.2`
- Sparks `ramp: sparkRamp, intensity: 4, bounce: 0.3 }` → `intensity: 2.8`

**S28 — `lightning/chain-lightning`:**
- `emissiveIntensity = 2.2 *` → `1.4 *`
- Segment bolts `width: 0.04, rate: 30, flicker: 0.5, ramp: BOLT, intensity: 3.5` → `width: 0.032, ..., intensity: 2.4`
- Extra bolt `intensity: 2.5` → `1.8`
- Light `intensity: 60, pos: [-1.2, 1.4, 0.6]` → `40`
- Per-target light `intensity: 90` → `50`
- Glint `size: [1.1, 0.4], life: [0.25, 0.25], ramp: glintRamp, intensity: 4` → `size: [0.7, 0.3], ..., intensity: 2`
- Both spark emitters `intensity: 4` → `2.8`

**S29 — `water/wave-crash`:**
- Wave mesh callback `fx.mesh(wave, (t) => {` → `fx.mesh(wave, (t, pr, f, w) => { wm.opacity = 0.93 * w;`, and its options `{ dur: TC + 0.5 }` → `{ dur: TC + 0.5, fade: [0, 0.35] }` (fixes the wave popping out of existence).
- Foam ramps:
  - 1st `[[0, '#fff', 0], [0.2, '#ffffff', 0.9], [1, '#cde6ee', 0]]` → `[[0, '#eef6f8', 0], [0.2, '#e2eef2', 0.75], [1, '#c0d8e2', 0]]`
  - 2nd `count: 160` → `110`, ramp `[[0, '#fff', 0], [0.15, '#ffffff', 0.95], [1, '#d5eaf0', 0]]` → `[[0, '#e8f4f8', 0], [0.15, '#dcecf2', 0.7], [1, '#b8d4de', 0]]`
  - 4th `[[0, '#fff', 0], [0.2, '#ffffff', 0.85], [1, '#cde6ee', 0]]` → `[[0, '#eef6f8', 0], [0.2, '#dceaf0', 0.65], [1, '#bcd4de', 0]]`

**S30 — `melee/scythe-reap`:**
- First `sweepSurface(... normal: true, c0: '#5a30a8', c1: '#40208a', c2: '#2a1060', intensity: 2.2, edge: 0.8 })` → `c0: '#7a48d0', c1: '#4a2898', c2: '#1a0840', intensity: 0.9`
- Second sweep `intensity: 1.0, edge: 6` → `intensity: 0.8, edge: 6`
- Trail `intensity: 3, ramp: [[0, '#fff'], [0.5, '#c8d8ff'], [1, '#6040a0']]` → `intensity: 1.8, ramp: [[0, '#e8e0ff'], [0.5, '#a888ff'], [1, '#4020a0']]`
- Loop soft emitter `intensity: 1.6, drag: 1.0` → `intensity: 1.2, drag: 1.0`

**S31 — `melee/claw-swipe`:**
- `const hot = [[0, '#ffffff'], [0.3, '#ffb060'], [1, '#c01808']];` → `[[0, '#ffe0c0'], [0.3, '#ff8a40'], [1, '#a01008']]`
- `0.08 * Math.pow(` → `0.06 * Math.pow(`
- `intensity: 3.2, ramp: hot` → `intensity: 1.8, ramp: hot`
- Afterglow `intensity: 1.5, ramp: [[0, '#ff7a30']` → `intensity: 0.8, ...`

**S32 — `spawn/summon-rise`:**
- Rune `intensity: 1.8` → `1.1`
- `fx.flash(1.15, 0.25, '#ff7a30', 0.25)` → `0.15`
- Beam `r: [0.7, 0.7], intensity: 0.3,` → `r: [0.7, 0.9], intensity: 0.18,`, and its `noise: 0.7` → `noise: 1.2`
- Soft emitter `intensity: 2.2, delay: 0.3` → `1.5`
- Sparks `intensity: 3.5` → `2.5`
- The brute below ground is hidden in transparent mode by S4's clipping plane.

**S33 — `spawn/egg-hatch`:**
- `new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 1.5, 0.7) })` → `new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.95, 0.42), transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false })`
- In the callback `new THREE.Color(2.2, 1.7, 0.8)` → `new THREE.Color(1.3, 0.95, 0.42)`
- `fx.flash(1.85, 0.25, '#fff2c0', 0.3)` → `0.15`
- Beam `intensity: 0.5` → `0.3`
- Soft `intensity: 3, delay: 1.85, turb: [0.3, 1]` → `intensity: 1.8`
- Glint `intensity: 3, delay: 1.9` → `2`

**S34 — `holy/halo`:**
- `stage: { ...SKY, view:` → `stage: { ...SKY, bloom: 0.45, view:`
- `emissiveIntensity: 0.9` → `0.5`
- `new THREE.Color(4, 3.2, 1.4)` → `new THREE.Color(1.6, 1.2, 0.5)`
- Ribbon `intensity: 2.4, core: 4, ramp: GOLD` → `intensity: 1.2, core: 4, ramp: [[0, '#fff4d0'], [0.3, '#ffe0a0'], [0.7, '#ffb840'], [1, '#a05800']]`
- Glint `intensity: 3.2` → `2`; soft `intensity: 2.4 });` → `1.6`
- Light `intensity: 26` → `14`

**S35 — `holy/resurrection`:**
- `stage: { ...SKY, view:` → `stage: { ...SKY, bloom: 0.45, view:`
- Outer beam `intensity: 0.7, ... ramp: [[0, '#ffc860'], [0.5, '#fff0c0'], [1, '#fff']]` → `intensity: 0.35, ... ramp: [[0, '#ffb040'], [0.5, '#ffe0a0'], [1, '#fff4d8']]`
- Inner beam `r: [0.25, 0.15], intensity: 0.8, ... ramp: [[0, '#fff'], [1, '#fff']]` → `r: [0.18, 0.1], intensity: 0.35, ... ramp: [[0, '#fff4d8'], [1, '#ffd070']]`
- Rune `intensity: 1.6` → `1.0`
- Flashes `0.4` → `0.2` and `0.35` → `0.18`
- Light `intensity: 90` → `55`
- Soft `intensity: 2.4` → `1.6`
- Glints `intensity: 3.4` → `2` and `intensity: 3, delay: TX` → `2`

**S36 — `scifi/jetpack`:**
- `bloom: 0.5` → `0.4`
- Light `intensity: 40` → `28`
- Flame `ramp: [[0, '#fff6e0', 1], [0.3, '#8ac8ff', 0.9], [0.65, '#ff8a28', 0.6], [1, '#400', 0]], intensity: 1.3` → `ramp: [[0, '#d8ecff', 1], [0.25, '#7ab8ff', 0.9], [0.55, '#ff9a3a', 0.7], [1, '#401000', 0]], intensity: 0.7`
- Sparks `intensity: 4, bounce: 0.3` → `intensity: 2.5, bounce: 0.3`

**S37 — `shadow/eclipse`** (no dark square in transparent mode, loop-safe streaks):
- `fbm(vec3(cos(ang)*2.2+uTime*.1,sin(ang)*2.2,(d-R)*5.-uTime*.4))` → `fbm(vec3(cos(ang)*2.2+cos(w)*.4,sin(ang)*2.2+sin(w)*.4,(d-R)*5.))`
- `(1.5+2.5*pow(.5+.5*sin(w),2.))` → `(0.8+1.6*pow(.5+.5*sin(w),2.))`
- `vec3(2.6,2.4,2.3)*bead` → `vec3(1.8,1.6,1.5)*bead`
- `float a=edge; gl_FragColor=vec4(col*a,a); }` → `float a=edge*clamp(max(moon,max(col.r,max(col.g,col.b))),0.,1.); gl_FragColor=vec4(col*edge,a); }`
- Glint `size: [0.9, 0.9]` → `[0.6, 0.6]`, `intensity: 3` → `1.6`

**S38 — `shadow/necro-skulls`:**
- `bloom: 0.55` → `0.45`
- `skull(G, 4)` → `skull(G, 2)`
- Jaw `Math.sin(ta * 5 + i * 2)` → `Math.sin((t / 3) * Math.PI * 6 + i * 2)`
- Trail `width: 0.12, n: 28, intensity: 1.4, ramp: [[0, '#d0ffd8'], [0.3, '#4dff7a'], [1, '#021408']]` → `width: 0.08, n: 28, intensity: 0.8, ramp: [[0, '#9effb0'], [0.3, '#2fd060'], [1, '#021408']]`

**S39 — `pickups/collect-burst`** (no white peak):
- `bloom: 0.55` → `0.45`
- Light `intensity: 50` → `35`
- Camera ring `intensity: 2.2, ramp: [[0, '#fff'], [0.5, '#ffe08a'], [1, '#e90']]` → `intensity: 1.2, ramp: [[0, '#fff0c0'], [0.5, '#ffd060'], [1, '#e90']]`
- Up ring `intensity: 1.6` → `1.0`
- Glint `size: [1.2, 0.4], life: [0.32, 0.32], intensity: 3` → `size: [0.8, 0.3], ..., intensity: 1.6`
- Soft `intensity: 0.8, delay: 0.36` → `0.5`
- Sparks `intensity: 4, delay: 0.36, ramp: [[0, '#fff']` → `intensity: 2.5, delay: 0.36, ramp: [[0, '#fff4c8']`
- Implode `intensity: 3, t0: 0, t1: 0.36, emit: 0.3, ramp: [[0, '#ffd070', 0], [0.4, '#fff', 1]` → `intensity: 1.8, ... [0.4, '#ffe8a0', 1]`

**S40 — `critters/flying-skull`:**
- `bloom: 0.55` → `0.45`
- Orb `intensity: 1.0, ramp: [[0, '#300'], [0.35, '#e30'], [0.7, '#fb3'], [1, '#fff6c0']]` → `intensity: 0.6, ramp: [[0, '#300'], [0.35, '#d82a06'], [0.7, '#ff9a2a'], [1, '#ffd890']]`
- Flame `intensity: 0.7, turb: [0.15, 2]` → `0.45`
- Sparks `intensity: 3.5` → `2.5`
- Light `intensity: 18, pos: [1.2, 1.5, 2.0]` → `10`

**S41 — `critters/slime`:**
- `transmission: 0.85` → `0.55`
- `envMapIntensity: 2.2, specularIntensity` → `envMapIntensity: 1.3, specularIntensity`
- Core `emissiveIntensity: 1.2` → `0.8`
- Bubbles (loop-safe): `Math.cos(b.userData.a + t)` → `Math.cos(b.userData.a + (t / 1.8) * TAU)`; `Math.sin(b.userData.a + t)` → `Math.sin(b.userData.a + (t / 1.8) * TAU)`; `Math.sin(t * 3.49 + i)` → `Math.sin((t / 1.8) * TAU * 2 + i)`

**S42 — `critters/bird`:**
- Light `intensity: 40, pos: [1.5, 3, 2]` → `intensity: 16`
- Dust ramp `[0.4, '#fff', 0.2]` → `[0.4, '#fff', 0.12]`

**S43 — `transitions/crt-off`** (inside the crt-off GLSL only):
- `img*=sl*mask*(1.+off*1.2/ max(sqrt(hs),.06)*.35);` → `img*=sl*mask*(1.+min(off*1.2/max(sqrt(hs),.06)*.35,1.2));`
- `(1.5+3.*ez((off-.55)/.45))` → `(0.9+1.4*ez((off-.55)/.45))`
- `exp(-r*r*4000.)*2.5+` → `exp(-r*r*4000.)*1.4+`
- `return col*fl; }` → `col*=fl; return min(col,vec3(.8))+(1.-exp(-max(col-.8,0.)*5.))*.2; }` (soft shoulder, no hard white clip)

**S44 — `arcane/time-stop`:**
- `bloom: 0.55` → `0.45`
- Screen GLSL `o=mix(o,vec3(1.)-o,fl*.6);` → `fl*.25`
- `fx.flash(TF, 0.25, '#ffffff', 0.45)` → `0.25`; `fx.flash(TS, 0.3, '#dfe8ff', 0.6)` → `0.3`
- Dial GLSL `vec3(.6,.8,1.)*cr*2.2` → `*cr*1.4`
- Glint `intensity: 3.5` → `2.2`; soft ring `intensity: 2.4, delay: TS` → `1.6`

**S45 — `weather/aurora`:**
- Stage `bloom: 0.7, exposure: 1.15` → `bloom: 0.45, exposure: 1.0`
- Shader `c*I*1.7*` → `c*I*1.05*`. Keep alpha `1.`: AdditiveBlending uses src alpha, and transparent mode fixes the coverage via `fixAlpha`.
- Glints `size: [2.2, 2.2]` → `[1.6, 1.6]`, `intensity: 2.2` → `1.3`

**S46 — `nature/earth-spike`** (sink into the ground instead of squashing):
- In the mesh callback replace
  ```js
  const up = eob((t - 0.65) / 0.22), down = sm(2.3, 3.0, t), k = up * (1 - down); o.visible = t > 0.64 && k > 0.01;
  ```
  with
  ```js
  const up = eob((t - 0.65) / 0.22), down = sm(2.3, 3.0, t); o.visible = t > 0.64 && down < 0.999;
  ```
- `main.scale.set(1, Math.max(0.01, k), 1);` → `main.scale.set(1, Math.max(0.01, up), 1);`
- `o.position.x = jit;` → `o.position.x = jit; o.position.y = -down * 2.6;`
- `const kk = cl(eob((t - 0.7 - m.userData.d) / 0.25)) * (1 - down);` → `const kk = cl(eob((t - 0.7 - m.userData.d) / 0.25));`
- Ring `intensity: 0.4, ramp: [[0, '#fff'], [1, '#8a7a60']]` → `intensity: 0.35, ramp: [[0, '#e8d8b8'], [1, '#8a7a60']]`

### Phase D: types and docs (P6, P7, P5 doc)

**S47 — New files.**

1. `index.d.ts`, hand-written. It declares:
   - Shared types: `Vec3`, `Range`, `Ramp` (stops `[u, '#hex', alpha?]`), `Timed {t0,dur,fade}`.
   - `FxOptions {seed, position, scale, flip, angle, palette, speed, countScale}`.
   - One param interface per builder, with exactly the parameter names listed in `docs/AUTHORING.md`: `EmitterParams`, `OrbParams`, `RingParams`, `ShellParams`, `BeamParams`, `RibbonParams`, `SlashParams`, `TrailParams`, `BoltParams`, `DecalParams`, `WaterParams`, `LightParams`, `TextParams`.
   - `Part`, `StageDef`, `EffectDef`.
   - `class Fx extends THREE.Group`, with all builders and `on`, `shake`, `flash`, `hit`, `update`, `reset`, `dispose`, `t`, `done`, `rng`.
   - `Rng`.
   - `StageOptions {transparent, quality: 'low'|'medium'|'high', preserve, maxPixelRatio, bloom, bloomScale, threshold, radius, exposure, flashMax, toneMapping: 'aces'|'agx'|'neutral'|'none', sky}`.
   - `class Stage` with `play`, `frame`, `seek`, `start`, `stop`, `setSky`, `resize`, `dispose`, `renderer`, `scene`, `camera`, `canvas`, `fx`, `transparent`, `quality`, `bloomScale`, `flashMax`, `autoReplay`.
   - Functions and values: `createFx`, `register`, `list`, `registry`, `CATEGORIES`, `registerAll`, `makeRng`, `clamp`, `lerp`, `smooth`, `easeOut`, `easeIn`, `easeInOut`, `win`, `NOISE`, `makeRamp`, `KINDS`, `Emitter`, `prims`, `Dummy`, `Target`, `POSES`.
   - Starts with `import * as THREE from 'three';`. Consumers need `@types/three`.
2. `fx.d.ts`: `import type { EffectDef } from './index'; declare const defs: EffectDef[]; export default defs;`
3. `package.json`:
   - `"exports": { ".": { "types": "./index.d.ts", "default": "./src/index.js" }, "./fx/*": { "types": "./fx.d.ts", "default": "./src/fx/*.js" } }`
   - `"types": "./index.d.ts"`
   - `"files": ["src", "index.d.ts", "fx.d.ts", "NOTICE.md"]`
4. `NOTICE.md`: credit **patch-gg/pixelfx** (https://github.com/patch-gg/pixelfx, MIT License) and **Hugo Duprez** for the effect catalog, names and ids. State that all code, shaders and procedural assets here are new and were written from scratch, and that no source, images or sprite sheets were copied. Credit three.js (MIT, not bundled).
5. `docs/PERF.md`:
   - Method (`tools/perf.mjs`, headed Chromium, ANGLE Metal/D3D11, `readPixels` sync, 1280×720, quality low/medium/high).
   - Budget: ≤ 16.6 ms p95 at medium on an integrated GPU; ≤ 900 particles.
   - The results table pasted from T9; the top 10 heaviest effects; a note that `countScale` lowers additive density (low quality is dimmer by design).

**S48 — `README.md` and `docs/AUTHORING.md`.**

- **README** gets new sections:
  - **transparent compositing:** `new Stage(el, { transparent: true })`, how it works (alpha = max(scene alpha, glow brightness), premultiplied, sky/ground/fog off, y<0 clipped), and the gallery `transparent` switch.
  - **export:** `node tools/sheets.mjs out fire/campfire 24 256` and the JSON fields `frameW, frameH, frames, fps, loop, cols, rows, duration`.
  - **quality:** `quality: 'low'|'medium'|'high'`, plus `createFx(id, { countScale })` without Stage.
  - **look options:** `bloomScale` (0.8), `flashMax` (0.6), `toneMapping`, `threshold`, `radius`.
  - **tests:** the T-phase commands.
  - **types and entry points:** `import fire from 'pixelfx3d/fx/fire'; fire.forEach(register)`. Bundlers resolve `three` and `three/addons/*`; only plain browsers need an import map.
  - **license line:** "see NOTICE.md".
- **AUTHORING** "Look rules" gets:
  - The new FIRE ramp.
  - Global bloom is `0.8 × stage.bloom`, and visible bloom grows with strength², so keep `stage.bloom` ≤ 0.5.
  - Full-screen flash is capped at 0.6; use ≤ 0.3 and prefer lights.
  - Custom additive materials: use `blendSrcAlpha: Zero, blendDstAlpha: One` (Stage patches this in transparent mode).
  - Loops: callbacks must use `t` (not `tAbs`/`ta`) and periodic frequencies `2π·n/duration`; prims already loop-safe.
  - Do not hide things under y=0 by relying on the ground; it is clipped in transparent mode.
  - Update the test-loop section to the new tools.

---

## Test phase (only after S48)

- **T0 — Syntax check.**
  ```
  cd /Users/muhammet.kocyigit/Downloads/pixelfx3d && for f in src/index.js src/core/*.js src/fx/*.js tools/*.mjs; do node --check "$f" || echo "BAD $f"; done
  ```
  Expect no `BAD`.
- **T1 — Servers** (run in the background).
  ```
  node tools/serve.mjs 8123
  git worktree add ../pixelfx3d-base 481cf24 && ln -s "$PWD/node_modules" ../pixelfx3d-base/node_modules && node ../pixelfx3d-base/tools/serve.mjs 8124
  ```
  If playwright says a browser is missing: `npx playwright install chromium`.
- **T2 — Console and shader errors, all effects, both modes.**
  ```
  node tools/shots.mjs /tmp/pfx/opaque all 0.5
  node tools/shots.mjs /tmp/pfx/tr all 0.5 transparent=1
  ```
  Both must print `ok 244/244`. Fix every reported error before continuing.
- **T3 — `node tools/alpha-test.mjs`** must exit 0.
  - Opaque-diff failures mean a core edit changed RGB. Recheck S5, S7, S9 and S10–S12, and confirm the page uses `?legacy=1`.
  - Do not loosen thresholds. For a dark-halo failure, look at the frame before changing anything.
- **T4 — `node tools/determinism-test.mjs`** (about 10 min, run in the background) must exit 0.
  - **Recipe R1 for each B failure:** in that effect's code, replace time-based callback arguments `tAbs`/`ta` with `t`. Replace every `Math.sin(t * K)` / `cos` with `Math.sin((t / D) * Math.PI * 2 * N)`, where D is the duration and N = max(1, round(K·D/2π)). Rerun with only the failing ids: `node tools/determinism-test.mjs id1,id2`.
  - Expected candidates: effects using critters' `dustTrail` (`t*9`), and others using `ta`.
- **T5 — Gallery 404.** Covered in T3. Also open http://localhost:8123/gallery/ and toggle `transparent`: the checkerboard must show through.
- **T6 — Visual review.**
  ```
  node tools/shots.mjs /tmp/pfx/p3 fire/campfire,fire/fire-tornado,water/wave-crash,fire/fire-ring,melee/scythe-reap,melee/claw-swipe,spawn/summon-rise,spawn/egg-hatch,holy/resurrection,holy/halo,lightning/lightning-strike,scifi/jetpack,lightning/zap-hit,lightning/chain-lightning,shadow/eclipse,shadow/necro-skulls,pickups/collect-burst,critters/flying-skull,critters/slime,critters/bird,transitions/crt-off,arcane/time-stop,weather/aurora,nature/earth-spike -0.2,-0.5,-0.85
  node tools/sheet.mjs /tmp/pfx/p3/sheet.png /tmp/pfx/p3/*.png
  ```
  Open the sheet with Read. Checklist:
  - No frame where the subject is white or blown out.
  - Fire shows a yellow core, orange body, dark red tips and smoke.
  - The tornado widens upward.
  - The wave fades out.
  - The earth spike sinks.
  - The eclipse has no square.
  - If an effect is still blown out, lower its largest `intensity` by 30% (only that number) and re-shoot.
- **T7 — Export.**
  ```
  node tools/sheets.mjs /tmp/pfx/sheets fire/campfire,explosions/small-explosion 24 256
  ```
  Exit 0; check `sheet.json` (campfire: frames 72, loop true) and look at `sheet.png`.
- **T8 — Transparent sheet look.** Open `/tmp/pfx/sheets/fire_campfire/sheet.png` with Read: no rectangle, soft edges.
- **T9 — Perf on a real GPU** (headed, on the Mac, not swiftshader).
  ```
  node tools/perf.mjs all medium
  node tools/perf.mjs fire/campfire,explosions/nuke,weather/aurora,fire/flame-pillar low,medium,high
  ```
  The printed GPU must not be SwiftShader. Paste the tables into `docs/PERF.md` and list any `OVER 900`.
- **T10 — Optional, needs network.** `npx -y -p typescript -p @types/three tsc --noEmit index.d.ts fx.d.ts`. Then remove the worktree: `git worktree remove ../pixelfx3d-base`.

## Acceptance criteria

1. Opaque mode is default. With `legacy=1` (old bloom and flash values), the 10 control effects match baseline `481cf24` within ≤ 0.2% pixels > 2/255 and max diff ≤ 6. With defaults, bloom is about 36% lower and flash is capped at 0.6.
2. `transparent:true`, for the 10 alpha effects:
   - corners have alpha 0;
   - page corners are pure magenta;
   - ≤ 50% of pixels are solid;
   - ≤ 3% of soft-edge pixels are near-black;
   - premultiplied pixels are valid;
   - no console errors.
   The gallery has a working transparent switch and checkerboard.
3. `tools/sheets.mjs` writes `frame_####.png` with alpha, `sheet.png`, and `sheet.json {frameW, frameH, frames, fps, loop, cols, rows, duration}`.
4. `determinism-test` exits 0: same seed gives identical hashes; every loop effect has frame(0) ≈ frame(duration). Orb, beam, shell and decal noise and light flicker are periodic, and bolts depend only on the slot.
5. The 23 listed effects pass the T6 checklist, with no global loss of fire, smoke and ember layering.
6. `quality` low/medium/high scales pixel ratio, MSAA and particle count. `docs/PERF.md` holds real-GPU numbers. No effect is over 900 particles.
7. The `index.d.ts`/`fx.d.ts` types and package `exports`/`types` are in place. The gallery has no 4xx (favicon). `NOTICE.md` exists, and README and AUTHORING are updated.
8. There is no `Math.random` in `src` (`grep -rn "Math.random" src` returns nothing), no effect id changed, and GLSL stays within what three compiles as ES 3.00.

### Critical Files for Implementation
- `src/core/stage.js`
- `src/core/prims.js`
- `src/core/emitter.js`
- `src/core/fx.js`
- `tools/harness.mjs` (new; used by `alpha-test.mjs`, `determinism-test.mjs`, `sheets.mjs`, `perf.mjs`)

---

I did not render or look at any frames (read-only). The per-effect numbers in S23–S46 are reasoned from the code, not seen, so T6 is the real check. The bird and slime fixes are guesses because their defects were not specified.

Things you should know before running this:
- **sRGB on premultiplied colour.** In transparent mode, OutputPass converts premultiplied colour to sRGB. Over black this matches opaque exactly; over light backgrounds, thin smoke edges come out slightly lighter. This is accepted, not fixed.
- **Ring and ribbon noise.** These still use wrapped time without crossfade, so they can pop slightly at the loop point. T4 does not catch this: in the loop check, frame(0) and frame(duration) are the same picture.
- **NOTICE.md wording.** The relationship between Hugo Duprez and patch-gg is not in the repo. Please confirm the exact copyright line from the upstream LICENSE.
