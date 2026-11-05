# PLAN4: AAA realistic-dark VFX (three r170, WebGL2)

**Rules**
- Strictly sequential. Haiku agents do all the coding, one step at a time, each step ≤ ~150 changed lines.
- No tests until all steps are done, except each step's own acceptance command.
- Order: code → test phase → bugfix → `docs/REPORT-P4.md` → push.
- Server for every command: `node tools/serve.mjs 8123`.

## 1. Target look and author rules
Target: Diablo IV / Black Desert realistic-dark. Lit smoke, physically plausible fire, debris, ground cracks, desaturated palette, **one bright focal point per effect**, strong anticipation → impact → dissipation timing.

Author rules (they replace the "no images" rule in AUTHORING):
1. **Authored textures.** Smoke, fire, explosions and dust use baked flipbooks (`tex:`). Mesh effects use `noise.png` erosion. Procedural sprites stay only for sparks, glints and tiny motes.
2. **Mesh shapes.** Slashes, swirls and shockwaves are `meshes.js` surfaces (or `sweepSurface`) with UV-scrolled erosion. No flat quads for big shapes.
3. **Timing.**
   - Non-linear life curves (`ENV`).
   - The impact flash lasts 2 frames (33 ms) at high contrast.
   - The leading edge is brightest and sharpest; the tail erodes.
   - Dissipation clears fast: fire gone within 40% of the effect's life, smoke ≤ 2 s after impact.
4. **Value hierarchy.** Peak brightness comes from the tier table (§5). Only the focal layer goes above HDR 1.0. Smoke and dust are normal-blended with albedo ≤ 0.35 and are never additive.
5. **Grounding.**
   - Every energetic effect has an `fx.light` that lights the host scene.
   - Decals and cracks are projected onto the real ground.
   - Debris bounces on the ground.
   - Sprites soft-fade against host depth.
6. **Game feel.** Use `fx.impact({t, strength, dir})`: hit stop of 2–4 frames, a directional camera push (no random shake), a short radial blur, colour split (chromatic aberration) and brief desaturation. All of it can be turned off with Stage `feel`.
7. **Every camera angle.** Volumes are billboards with 6-way lighting or 3D meshes. No shape may depend on one view direction. Check 3 views per effect (side, top-down 70°, low 10°).

## 2. Architecture
**New modules**
- `tools/bake.mjs`: node driver. Launches headed Chromium on the real GPU (same launch flags as `gpu-scan.mjs`), opens `tools/bake.html`, calls `window.__bake(name)`, writes PNGs and the manifest, checks the budget, and supports `--check`.
- `tools/bake.html` plus browser modules:
  - `tools/bake/flat3d.js`: flat 3D texture helpers
  - `tools/bake/sim.js`: fluid solver
  - `tools/bake/march.js`: shadow volumes, raymarch, atlas packing
  - `tools/bake/noise.js`: tiling noise
  - `tools/bake/presets.js`: preset table
- `tools/bake/png.mjs`: node PNG encoder (`zlib.deflateSync` + CRC32) and SHA-256. No new dependency.
- `src/core/textures.js`: `loadTextures(base?)`, `getTex(name)`, `TEX`.
- `src/core/meshes.js`: `surface()` plus spiral, cone, arc, slash, ringSheet, band; and the `Erode` prim.
- `src/core/feel.js`: `TIER`, `ENV`, push/post state, `applyFeel(stage, fx, dt)`.
- `assets/fx/*.png` and `assets/fx/manifest.json`.

**Changed modules**
- `glsl.js`: `SU` gains `uSunDir, uSunCol, uSky, uGnd, tNoise`. A `SIXWAY` GLSL chunk is added.
- `emitter.js`:
  - `tex` option: flipbook with crossfade between adjacent frames (no motion vectors), 6-way lighting and emissive.
  - Existing kinds map to textures automatically.
  - `uGroundY` floor uniform.
- `prims.js`:
  - Ring erosion uses `tNoise` instead of `fbm3` (cheaper, and lifts all effects).
  - Shell and Beam get erosion.
  - `Decal` projects onto `fx.ground` with DecalGeometry.
  - New `Debris` prim.
  - `Light` borrows from the light pool.
- `fx.js`:
  - New builders `erode`, `debris`, `impact`.
  - `on('impact', fn)` overload; `on(fn)` stays the per-frame callback.
  - Act `hits` also emit `impact`, so all act-based effects get the feel layer for free.
- `stage.js`:
  - `attach()`, `renderer` option, `feel` option, sun/sky uniforms each frame.
  - The final shader gains blur, colour split and desaturation.
  - The light pool.
- `melee.js` `sweepSurface`: erosion from `aAge`/`aV`, brightest leading edge.
- Also changed: `gallery/index.html`, `gallery/test.html`, `tools/alpha-test.mjs`, `index.d.ts`, `docs/AUTHORING.md`, `README.md`, `package.json` (`files` += `"assets"`).

**Deleted (S16)**
- `stage.js`: `this.real` and every `this.real ?` branch. Keep the realism values: bloomScale 0.55, threshold 0.7, radius 0.85, smoothWidth 0.6, prepass and uDist always on.
- `SU.uReal` and every `uReal` in `glsl.js` (DEPTH `softF` gate), `emitter.js` (5 uses: uniform declaration, attenuation branch, lit branch, flame branch, frag lit — keep the `uReal>.5` bodies and drop the else paths), and `prims.js` (6 uses: RING_N, RING_F, RDIST_F, RDARK_F declarations, `*uReal` in RDARK and GLOW_F).
- `index.d.ts` `realism?: boolean`.
- `gallery/test.html`: the `legacy` line and its comment.
- `tools/alpha-test.mjs` section 2 (baseline compare, `BASE`, `CONTROL_IDS`). Keep sections 1 and 3.
- README line 66 (baseline worktree note).
- AUTHORING rule 16 tail ("`Stage({realism:false})` = old look").

## 3. Baker spec
**Solver.** Stable fluids (Stam), semi-Lagrangian advection, in a flat 3D layout: N slices tiled in a 2D HalfFloat RGBA target. Tiles per row: 12 for N=96, giving 1152×768; 16 for N=128, giving 2048×1024. This means one draw per pass.
- `sample3(tex,p)`: 2 bilinear fetches mixed in z.
- Use three.js `WebGLRenderTarget` + `FullScreenQuad` (`three/addons/postprocessing/Pass.js`).

**Fields**
- V = velocity xyz
- S = (ρ soot/density, T temperature, fuel, 0)
- P = pressure
- D = divergence
- W = curl xyz + |ω|

**Pass order per substep** (dt = 1/60):
1. advect V by V
2. advect S
3. inject the preset source. Noise comes from `hash13(p*N + uSeed)`. All CPU randomness comes from `makeRng(seed)` in `src/core/rng.js`. No `Math.random`.
4. combustion where T > 0.25: `burn = min(fuel, 4·dt)`, `fuel -= burn`, `T += heat·burn`, `ρ += soot·burn`
5. curl W
6. forces: `v += dt·[(α·T − β·ρ)·ŷ + ε·h·(N×ω)]`, with `N = ∇|ω| / max(|∇|ω||, 1e-5)`
7. divergence
8. Jacobi pressure, 24 iterations
9. subtract the pressure gradient. Velocity is multiplied by a wall mask of 1 voxel on all faces except the top.
10. cooling and fade: `T *= exp(−cool·dt)`, `ρ *= exp(−fade·dt)`

Use `sq()` instead of `pow(x,int)` and guard every `normalize` (Metal NaN).

**Presets** (domain = unit cube, velocities in domain/s). Every preset bakes 64 frames on an 8×8 grid.

| name | N | sec | source | α | β | ε | cool | fade | heat/soot | atlas | emissive |
|---|---|---|---|---|---|---|---|---|---|---|---|
| smoke-puff | 96 | 2.0 | sphere r .08 at (.5,.3,.5) for t<.15: ρ 1, T .3, radial v 1.2 | 1.0 | .1 | .30 | 1.5 | .25 | 0/0 | 1024² | no |
| fire-column | 96 | 1.6 | disc r .1 at y .08 for t<.4: fuel 1, T .6, v.y .8 | 3.0 | .05 | .50 | 2.5 | .6 | 1.5/.4 | 1024² | yes |
| explosion-fireball | 128 | 1.6 | sphere r .06 at (.5,.4,.5) for t<.05: fuel 2, T 1, radial v 4 | 1.5 | .1 | .60 | 1.2 | .3 | 2/.8 | 2048² | yes |
| ember-burst | 96 | 1.2 | 40 seeded points r .01: T 1, ρ .2, radial v 2.5 | .8 | 0 | .80 | 2.0 | 0 | 0/0 | 1024² | yes |
| dust-ring | 96 | 2.4 | rolling segment: box x .1–.3, y<.06 for t<.2; ρ 1, v (2.5,−.3,0) | −.2 | .3 | .35 | – | .2 | 0/0 | 1024² | no |

- Steps = sec·60. A frame is taken every `steps/64` substeps.
- "dust-ring" is baked as one rolling puff; the runtime makes the ring from many sprites (shape `'ring'`, `radial:1`). This keeps it correct from every angle.

**Shadow volumes** (per frame): for each of the 6 axis directions d, `T_d(x) = exp(−Σ_{k=1..16} σ·ρ(x+d·2kh)·2h)`, with σ = 24 × `densityScale`. Results go into two flat targets: `TL+` (+x, +y, +z) and `TL−` (−x, −y, −z).

**Raymarch.** Orthographic view along −z. Frame size = atlas/8 (128 or 256 px). N samples per ray. Density is multiplied by `smoothstep(0, 4h, distance to face)` so tile borders are clear.
- per step: `a = 1 − exp(−σρ·dz)`
- `C_d += Tv·a·0.9·T_d`
- `E += Tv·bb(T)·σρ·dz` (bb = luminance of `fireRamp(T)`)
- `Tv *= 1 − a`
- `alpha = 1 − Tv`

**Output (straight alpha)**
- Atlas A: `rgb = C_{+x,+y,+z} / max(alpha, 1e-3)`, `a = alpha`
- Atlas B: `rgb = C_{−x,−y,−z} / max(alpha, 1e-3)`, `a = E / emax`
- Where alpha < 2/255, set the rgb weights to 0.5. Neutral weights prevent dark halos.
- Frame i goes to column i%8, row ⌊i/8⌋, row 0 at the top of the PNG.
- Each frame renders into an RGBA8 target tile (viewport/scissor). Then one `readPixels` → base64 → node. Node flips the rows and encodes the PNG with `png.mjs`. Never encode through a browser canvas: it premultiplies and destroys rgb where a≈0.

**Noise** (`noise.png`, 512² RGBA, every channel tiles):
- R = periodic fbm (5 octaves)
- G = Worley F1 (8 cells)
- B = Worley F2−F1 (crack lines)
- A = fbm stretched 4:1 along x (streaks for slashes and beams)

**Files**
- `assets/fx/<name>_a.png`, `assets/fx/<name>_b.png`, `assets/fx/noise.png`
- `assets/fx/manifest.json`:
  - `{version:1, seed:1337, presets:{<name>:{size, grid:[8,8], frames:64, seconds, a, b, emissive, emax, framePow, loop:false, sha256:{a,b}}}, noise:{file:"noise.png", size:512, channels:"fbm,worleyF1,worleyEdge,streak", sha256}}`
  - `framePow` = 0.6 for explosion and ember (fast early evolution), 1 otherwise.

**Budget estimate (PNG on disk)**

| item | size |
|---|---|
| explosion, 2 × 2048² | ~7 MB |
| smoke, fire, dust, 3 × 2 × 1024² | ~7.5 MB |
| ember (sparse) | ~1 MB |
| noise | ~0.8 MB |
| **total** | **~16 MB (≤ 20 MB)** |

VRAM with mipmaps is about 90 MB.

`bake.mjs` prints the sizes and exits 1 if the total is over 20 MB.

**Determinism.** Fixed seed, fixed dt, no wall-clock time. `--check` re-bakes and compares SHA-256 against the manifest. Hashes are guaranteed only on the same GPU and driver, so the PNGs are committed.

**Run**
- `node tools/bake.mjs [all|<name>|noise] [--check]` (headed window)
- Expected time: under 3 min for all on an M1; each preset 10–40 s.

## 4. Runtime spec
**Loader** (`textures.js`)
- `ImageBitmapLoader.setOptions({imageOrientation:'flipY', premultiplyAlpha:'none', colorSpaceConversion:'none'})`. This is required: HTMLImage loading would wipe B.rgb where a = 0.
- Textures: `NoColorSpace`, `LinearMipmapLinearFilter`, `generateMipmaps`. Noise uses `RepeatWrapping`.
- `getTex(name)` returns at once `{a, b, frames, framePow, emissive, emax, ready:false}`. `ready` flips when the load finishes. The emitter sets `uTexOn = ready ? 1 : 0` in `update()`, so play is never blocked; until a texture is ready, the procedural kind draws.
- `test.html` and the gallery `await loadTextures()` before `__ready`.
- Base URL = `new URL('../../assets/fx/', import.meta.url)`.

**Flipbook** (emitter frag, `uTexOn > .5`)
```glsl
float x=pow(clamp(vU,0.,1.),uFramePow)*(F-1.); if(uTexLoop>.5) x=mod(x+vRnd.y*F,F);
float f0=floor(x), f1=min(f0+1.,F-1.), k=fract(x);
vec2 uv=clamp(vUv,.5/uTile,1.-.5/uTile); if(vRnd.w>.5){ uv.x=1.-uv.x; }   // random flip; also negate light x
vec2 t0=(vec2(mod(f0,8.),7.-floor(f0/8.))+uv)/8., t1=(vec2(mod(f1,8.),7.-floor(f1/8.))+uv)/8.;
vec4 A=mix(texture2D(uTexA,t0),texture2D(uTexA,t1),k), B=mix(texture2D(uTexB,t0),texture2D(uTexB,t1),k);
```
- `F = 64`
- `uTile` = frame px (128 or 256)
- Loops use a random start frame; one-shot bursts do not.

**6-way lighting** (`SIXWAY` chunk). The light vector must be in sprite space. The vertex shader already builds `vLd` and `vUp` with `Rt`. Add `vSd` = `uSunDir` transformed the same way; flip x when the sprite is flipped.
```glsl
float W6(vec3 l){ return dot(max(l,0.),A.rgb)+dot(max(-l,0.),B.rgb); }
vec3 L = uSunCol*W6(vSd) + vLc*W6(vLd) + uSky*W6(vUp) + uGnd*W6(-vUp);
col = vCol.rgb*L;  a = A.a*vCol.a*softF(uSoft);
```
- The ramp gives tint and life alpha only.
- The stage writes `uSunDir, uSunCol` from `stage.moon`, or from the first host DirectionalLight / `lights.sun`. It writes `uSky, uGnd` = hemi colour × intensity.

**Fire emissive** (`emissive:true` presets): `e = B.a*emax; col += fireRamp(e*vEm)*uInt*e;`
- `vEm` = ramp luminance: hot early, then cooling.
- Output `vec4(col*a + emis, a)` with blend One / OneMinusSrcAlpha (premultiplied "additive + alpha"). Smoke occludes and fire adds light in one draw.
- HDR values above 1 go into the HalfFloat composer, then bloom.
- In transparent mode, `MAIN_ALPHA` already raises a to the brightness, so premultiplied output stays valid.

**Emitter plug-in**
- New option `tex: 'smoke-puff' | 'fire-column' | 'explosion-fireball' | 'ember-burst' | 'dust-ring' | false`.
- Auto-map (S8) when `tex` is undefined:
  - `smoke` with normal blend → smoke-puff
  - `smoke` with additive blend → explosion-fireball (emissive, blend switched to premultiplied)
  - `dust` → dust-ring
  - `flame` → fire-column (keeps the bottom anchor)
- Everything else stays procedural.

**Soft particles.** `softF` is unchanged. `SU.tDepth` = `attach.depthTexture` if the host gives one; otherwise the stage prepass renders host meshes with `depthWrite` (put on layer 1 once in `attach`).

## 5. Timing and value rules (data in `feel.js`)
```js
export const TIER = { // focal HDR peak, secondary max, fx.light peak, screen flash, hitStop frames, push m, blur, CA, desat
  1: { peak: 2, sec: 0.6, light: 40,  flash: 0,    stop: 2, push: 0.03, blur: 0,    ca: 0,     desat: 0 },
  2: { peak: 4, sec: 0.8, light: 120, flash: 0.08, stop: 3, push: 0.06, blur: 0.02, ca: 0.002, desat: 0.15 },
  3: { peak: 8, sec: 1.0, light: 400, flash: 0.15, stop: 4, push: 0.10, blur: 0.04, ca: 0.004, desat: 0.35 } };
export const ENV = {
  impact: (t, k = 6) => (t < 0 ? 0 : t < 2 / 60 ? 1 : Math.exp(-(t - 2 / 60) * k)),      // 2-frame peak, exp decay
  attack: (t, a = 0.05, k = 4) => (t < 0 ? 0 : t < a ? (t / a) ** 2 : Math.exp(-(t - a) * k)),
  anticip: (t, t0, t1) => { const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return u * u * u; }, // ease-in to the hit
};
```
- **Tier source.** Skills use `grade(o).g`; other effects pass `tier` explicitly.
- **Size curves.** Bursts use `sizePow` 0.4–0.6; alpha fades over the last 40% of life.
- **Impact flash.** At the hit, 2 frames of:
  - one `soft` core sprite at HDR `TIER.peak`, size 0.6·s
  - the light at 4× via `ENV.impact`
  - an optional screen flash ≤ `TIER.flash`

  On frame 3 the core shrinks to 0.3× within 50 ms and shifts to the element colour.

## 6. Steps
Every step lists its files, what to add and an acceptance command. "LOOK" means `node tools/sheet.mjs`, then open the PNG.

**S0. Baseline (no code).** `node tools/perf.mjs fire/fireball,fire/meteor,fire/campfire,explosions/grenade,melee/sword-slash,impacts/ground-slam,holy/heal,ice/frost-nova,lightning/lightning-strike,shadow/void-orb medium`. Paste the table into the plan's scratch notes for REPORT-P4.

### Baker
**S1. PNG writer and driver.**
- `tools/bake/png.mjs`: `encodePNG(w, h, rgbaUint8) → Buffer` (signature, IHDR colour type 6, IDAT from `deflateSync` of filter-0 rows, IEND, CRC32 table) and `sha256(buf)`.
- `tools/bake.mjs`:
  - launch with gpu-scan flags, headed
  - `goto /tools/bake.html` and wait for `__ready`
  - for each name: `r = await pg.evaluate(n => __bake(n), name)` returning `{files:[{name,w,h,b64}], meta}`
  - flip rows, write `assets/fx/`, merge `manifest.json`
  - sum the sizes and exit 1 above 20 MB
  - `--check` compares hashes
- `tools/bake.html`: importmap as in `test.html`, imports `./bake/presets.js`, defines `__bake('test')`, which renders an 8×8 gradient grid.
- Accept: `node tools/bake.mjs test && node tools/bake.mjs test --check` → files exist, check passes. LOOK at `assets/fx/test_a.png`.

**S2. Tiling noise.**
- `tools/bake/noise.js`: one shader pass at 512² with periodic value-noise fbm (lattice mod period), periodic Worley (cell index mod 8). Channels as in §3.
- `__bake('noise')`.
- Accept: `node tools/bake.mjs noise`. The driver prints the seam check (mean |col0 − col511| < 2/255, same for rows) and passes.

**S3a. Sim core.**
- `tools/bake/flat3d.js`: `makeField(N, tiles)` (HalfFloat RT ping-pong), GLSL `sample3` and `voxel→uv`.
- `tools/bake/sim.js`: `class Sim { constructor(preset, seed); step(); }` with passes 1–4 and 10 from §3.
- `presets.js`: the §3 table as data.
- `__simDebug(name, steps)` returns Σρ, Σ|V| and a NaN count (read back at 1/8 resolution).
- Accept: `bake.mjs --debug smoke-puff` prints Σρ > 0 and NaN 0 at steps 30 and 120.

**S3b. Vorticity and projection.** Add passes 5–9 to `Sim.step` (curl, confinement, divergence, 24 Jacobi iterations, gradient subtract, wall mask). Accept: `--debug` shows max divergence after projection < 5% of before; NaN 0.

**S4. Shadow volumes, raymarch, atlas.**
- `tools/bake/march.js`: `shadowPass(sim)` (6 directions → TL+ and TL−) and `renderFrame(sim, preset, tileIdx, targetA, targetB)` per §3.
- `__bake(name)` runs the sim, captures 64 frames, reads back A and B, adds the manifest meta, and logs the timing.
- Accept: `node tools/bake.mjs all` writes 11 PNGs and the manifest, total ≤ 20 MB, `--check` passes. LOOK at the explosion and smoke atlases: lit side visible, no square edges.

### Loader and runtime
**S5. `src/core/textures.js`** as in §4. Export `loadTextures, getTex` from `src/index.js`. `test.html` and `gallery/index.html`: `await loadTextures()` before `__ready` / `start`. `SU.tNoise` = the noise texture. Accept: `node tools/shots.mjs /tmp/s5 fire/campfire 0.5` ok 1/1 and no 404s (`alpha-test` section 3 later).

**S6. Emitter flipbook and 6-way.**
- `emitter.js`: option `tex`; uniforms `uTexOn, uTexA, uTexB, uFramePow, uTexLoop, uTile, uEmis, uEmax`; varying `vSd`.
- `glsl.js`: `SU += uSunDir, uSunCol, uSky, uGnd`; `SIXWAY` chunk.
- `stage.js` `prepass()`: write the sun and sky values from `this.sunLight || this.moon` and `this.hemi`.
- The textured branch goes before the kind branches; it sets `col`, `a`, then `softF`.
- Accept: `node tools/shots.mjs /tmp/s6 all 0.5` ok 406/406, no shader errors.

**S7. Fire emissive** per §4. When the preset's `emissive` is true, force premultiplied blend (`blendDst OneMinusSrcAlpha`) and add `emis`. Flame anchor: `if(uKind==3) q.y+=.5` applies to textured flames too. Accept: S6 command ok.

**S8. Auto-map.**
- In the Emitter constructor, `tex = p.tex ?? AUTO(kind, blend)` per §4.
- Smoke size ×1.15 (the baked puff fills ~85% of its tile).
- Accept: `shots cat:fire,cat:explosions,cat:impacts 0.3,1` ok. LOOK: smoke lit from the fire light and the sun, no dark halo.

### Meshes and erosion
**S9. `src/core/meshes.js`.**
- `surface(nu, nv, f(u,v) → [x,y,z]) → BufferGeometry`: index, uv = (u along the sweep / time, v across), `computeVertexNormals`.
- Presets:
  - `spiral({turns, r0, r1, h, w})`
  - `cone({r0, r1, h})`
  - `arc({R, a0, a1, w, tilt, thick})`
  - `slash({R, a0, a1, w, curl})` (crescent with depth, readable edge-on)
  - `ringSheet({r0, r1})`
  - `band({r, h})` (shock cylinder)
- `class Erode extends Prim`: material `ERODE_F`.
  - `n = texture2D(tNoise, uv*uTile + uScroll*ph).{r|a}`; `e = mix(uE0, uE1, ENV-shaped pr)`
  - `head = smoothstep(uHead-.15, uHead, vUv.x)*step(vUv.x, uHead)`
  - `a = smoothstep(e, e+uSoft, n*mask(vUv.y))`
  - `col = ramp(clamp(a+head,0,1))*uInt*(1+3*head)`
  - additive or normal, `softF`
- `fx.erode({geo, t0, dur, ramp, tile:[4,1], scroll:[2,0], erode:[0,1], head:[0,1], channel:'r'|'a', blend, intensity})`.
- Accept: `shots /tmp/s9 all 0.5` ok (compiles; no user yet).

**S10. Lift prims.**
- `RING_F` erosion: replace `fbm3(...)` with `texture2D(tNoise, vec2(ang/6.283*3., r*1.5)+uSeed*.13).r`.
- Shell and Beam: add `uErode` (default 0) with the same erosion.
- `melee.js` `SW_F`: `n = texture2D(tNoise, vec2(vAge*2., vV)).a`; `e = vAge*.9`; `b *= smoothstep(e, e+.2, n)`; leading edge `×(1 + 2*exp(-vAge*12.))`.
- Accept: `shots cat:melee,cat:plasma,cat:explosions 0.2,0.6` ok. Perf for sword-slash not worse than S0.

### Attach API, decals, debris
**S11. `stage.attach({scene, camera, ground, lights, depthTexture})`.**
- Store the host objects.
- `this.scene = scene`; `this.camera = camera`; rebuild `RenderPass` scene and camera.
- Remove the stage sky, ground, hemi and moon from the old scene.
- `sunLight = lights?.sun ||` first DirectionalLight found; `hemi = lights?.hemi ||` first HemisphereLight found, or keep the stage's own hemi added to the host scene.
- Host meshes with `depthWrite` get `layers.enable(1)`.
- `this.groundMesh = ground`.
- `play()` adds the fx to the host scene and sets `fx.ground = ground`, `fx.groundY = ground ? bbox.max.y : 0`.
- Constructor option `renderer` reuses the host renderer (no new canvas).
- `detach()` restores the stage's own scene.
- Accept: `test.html ?host=1` (see S27, built minimally here: a boxes scene plus a `PlaneGeometry` ground with vertex noise) → `node tools/shots.mjs /tmp/s11 fire/campfire 0.5 host=1` ok.

**S12. Light pool and ground height.**
- The stage keeps 4 PointLights (intensity 0, `decay 2`) in the active scene.
- `P.Light` takes `fx.lightPool?.pop()` instead of `new PointLight` and returns it on `dispose`. Without a pool, behaviour is unchanged.
- The emitter gets `uGroundY` (fx-local floor). The bounce formula uses `c = p0.y - uGroundY` and `pos.y = uGroundY + y`.
- Accept: `shots cat:explosions 0.5 host=1` ok. Program count is stable across 3 plays: `renderer.info.programs.length` is the same after the 2nd and 3rd play (log it in `test.html`).

**S13. Projected decals and debris.**
- `Decal`: if `fx.ground` exists and `p.project !== false`, then on the first update build `new DecalGeometry(fx.ground, worldPos, euler(-π/2, 0, 0), size(2·r1, 2·r1, 2·r1))`, `applyMatrix4(inverse(fx.matrixWorld))`, `polygonOffset −4`. The growing radius moves into the shader: `p = (vUv*2.-1.)*r1/max(r(t),1e-3)`, discard if `length(p) > 1.02`.
- New `class Debris extends Prim`: `InstancedMesh(IcosahedronGeometry(1,0)` jittered by `fx.rng`, `MeshStandardMaterial{flatShading, roughness .9})`, count ≤ 40.
  - Per chunk: v0, spin, size from `fx.rng`.
  - CPU closed form: up to 3 bounces, restitution e = `p.bounce` (.35); after each bounce spin ×0.5 and horizontal speed ×0.6.
  - Sink by `0.3·size` during the last 0.5 s.
  - Writes instance matrices in `update`, no allocations.
- `fx.debris({count, pos, speed, spread, size, life, bounce, color})`.
- Accept: `shots impacts/ground-slam 0.3,1.5 host=1` ok. LOOK: cracks follow the bumpy ground, rocks rest on it.

### Feel and post
**S14. `src/core/feel.js`** with `TIER` and `ENV` (§5).
- `fx.impact({t, strength=1, dir=[0,-1,0], pos})` pushes an event.
- `Fx.update`: when it is crossed, `this._emit('impact', e)`.
- Act `hits` also emit `impact {strength: amp/0.05, dir:[1,0,0]}`.
- `fx.on('impact', fn)` overload (string first argument → listeners map).
- Stage listens: hit stop `fx.hold = round(2 + 2·clamp(strength)) / 60` if `feel.hitStop`. This replaces `e.stop` when feel is on.
- Accept: `shots melee/sword-slash,impacts/ground-slam 0.1,0.3` ok. `determinism-test cat:melee` passes.

**S15. Feel post.**
- `finalShader`: uniforms `uBlur, uCA, uDesat, uCtr` and the `samp(uv)` helper (8 taps toward `uCtr`, r/b offset by ±`d·uCA`), plus `c = mix(c, vec3(dot(c, vec3(.2126,.7152,.0722))), uDesat)`. Opaque path only; transparent mode skips feel post (shortcut).
- `feel.js` `applyFeel`:
  - push offset = `dirWorld·TIER.push·strength·(u/τ)·e^{1−u/τ}`, τ = .05 s, added to the camera like `shakeV`
  - blur and colour split decay `ENV.impact(u, 20)`
  - desaturation decays `ENV.impact(u, 6)`
  - `uCtr` = projected impact position
- Stage option `feel: {hitStop, push, blur, aberration, desat}` (all default true; `feel:false` = off).
- Accept: `shots impacts/ground-slam 0.02,0.05` ok. LOOK: blur visible at 0.02, gone by 0.3.

### Legacy removal
**S16.** Delete exactly the list in §2. Change alpha-test `ALPHA_IDS` to the 10 showcase ids. Accept: `grep -rn "uReal\|realism\|legacy" src tools gallery index.d.ts` is empty, and `shots all 0.5` gives 406/406.

### Showcase (one effect per step; keep the id, duration and camera unless stated)
Each step: rewrite the `build` in its file using the layer list. Accept: `node tools/shots.mjs /tmp/sNN <id> -0.1,-0.3,-0.6,-0.9` plus `host=1`. LOOK at all 3 views (§1 rule 7).

| step | effect | tier | layers |
|---|---|---|---|
| S17 | fire/fireball (loop 1.2 s) | 2 | **Focal:** small fire orb core at HDR 4 (only bright thing). **Trail:** `tex:explosion-fireball` sprites behind it (life .5, sizePow .5). **Smoke trail:** smoke-puff, dark, lit. **Embers:** ember-burst motes. **Mesh:** faint spiral `fx.erode` around the flight axis, scroll −2 in u, loop-safe (`ph()`). **Light:** follows the ball, range 6, flicker 10 Hz with integer harmonics. Heat haze. No decal, no feel. |
| S18 | fire/meteor | 3 | **Anticipation (0 → hit):** descending meteor with explosion-fireball trail and smoke-puff trail lit by its light; projected ground glow grows (`ENV.anticip`); sky light rises. **Impact:** 2-frame flash; `fx.impact` strength 1, dir = travel direction. Explosion-fireball cluster (6 sprites, 2048 atlas); `band` + `ringSheet` erosion shock with refract; dust-ring crown (ring emitter, radial); 30 debris; projected cracks + scorch with cooling emissive; ember-burst. **Dissipation:** fire gone by +0.8 s; smoke column lit by the fading light and the sun, clears by +2.5 s; decal cools by the end. |
| S19 | fire/campfire (loop 3 s) | 1 | Keep the logs. 24 fire-column flame tongues (anchored, random start, sizeVar .4); smoke-puff above, dark, lit from below; rising sparks; light 8–12 Hz loop-safe, range 6, lights the host ground; projected glow + soot decal; heat haze. Peak HDR 2 only at the flame base. No feel. |
| S20 | explosions/grenade | 2 | **Anticipation:** keep the bounce/roll and fuse sparks; light pre-glow 0.1 s before TB. **Impact at TB:** 2-frame flash; `fx.impact` strength .8, dir = grenade → camera. Explosion-fireball cluster; `ringSheet` shock with refract; streaks; 24 debris (dirt colour) bouncing; dust-ring crown; projected scorch + cracks; light `ENV.impact(k=2)`. **Dissipation:** smoke-puff mushroom lit by the sun; fire gone by +0.6 s, smoke thins by +3 s. Replace `blast()` use here only. |
| S21 | melee/sword-slash | 2 | **Anticipation:** windup (existing) plus a faint glint at the blade tip at −0.1. **Impact 0.07:** eroding `sweepSurface` (S10), leading edge brightest; `meshes.slash` crescent as a faint secondary volume (normal blend, dark rim); contact sparks + 2-frame glint; light spike. `fx.impact` comes from the act hit (strength .6, dir = swing). **Dissipation:** erosion to 1 within 0.25 s; small dust-ring puffs at the target's feet. |
| S22 | impacts/ground-slam | 3 | **Anticipation:** windup 0.7, dust pulled in (radial −), ground decal glow `ENV.anticip`. **Impact 0:** `fx.impact` strength 1, dir [0,−1,0] (push down); projected cracks reveal .4 s; `ringSheet` erosion shock with refract and dark rim; dust-ring sprites on a ring (radial); 36 debris; short warm light. **Dissipation:** dust settles (gravity +), clear by 2.2 s. |
| S23 | holy/heal (body) | 1 | **Anticipation 0–0.4:** projected rune decal fades in; motes gather. **Peak 0.6:** two counter-rotating `spiral` erosion meshes rising around the body (scroll +v), cream/gold, desaturated (no pure yellow), HDR ≤ 2.5; warm light range 5 lights the body and ground; ember-burst gold motes. **Dissipation:** spirals erode bottom-up; motes drift up. No feel. |
| S24 | ice/frost-nova (body) | 2 | **Anticipation 0–0.3:** cold mist (smoke-puff tint #b8d0e0, normal blend) gathers; frost decal starts. **Impact ~0.35:** `ringSheet` erosion expanding fast → slow; ring of `cone` ice spikes erupting (Standard material, roughness .15, cold emissive rim); 2-frame cold flash light; `fx.impact` strength .7, dir radial ([0,−1,0]); projected frost decal grows. **Dissipation:** spikes shatter into debris shards (glass colour) at +1.4 s; mist clears by 2.5 s. |
| S25 | lightning/lightning-strike | 3 | **Anticipation:** 2 faint pre-leader bolts (0.2 s), ambient dims (desat .2 ramp). **Impact:** main bolt 2 frames at HDR 8, then 3 restrikes 60 ms apart; huge 2-frame light lighting the host scene; screen flash .15; `fx.impact` strength 1, dir down, colour split .004. Ground: projected scorch + cracks with blue-white emissive cooling; dust-ring; sparks; small smoke-puff. **Dissipation:** decal afterglow 1 s, smoke. |
| S26 | shadow/void-orb (loop 3.2 s) | 2 | **Focal:** void orb, dark core with a bright rim only. **Mesh:** erosion shell (`ringSheet`/sphere surface) with noise scrolling inward; two `spiral` meshes drawing inward. Normal-blend smoke-puff wisps (purple-black, faintly lit). Motes radial negative. Low purple light. Projected dark ring decal. All scroll speeds are integer per period (loop-safe). No feel. |

### Gallery and docs
**S27.**
- `gallery/index.html`:
  - "host scene" checkbox: a demo scene (uneven ground, 3 pillars, sun DirectionalLight with shadows) attached through `stage.attach` / `detach`
  - feel checkboxes: hitStop, push, blur, aberration, desat → `stage.opts.feel`
- `gallery/test.html`: `?host=1` builds the same demo scene (shared `gallery/host.js`).
- Accept: `node tools/alpha-test.mjs` (gallery section, no 4xx) and `shots fire/campfire 0.5 host=1` ok.

**S28.**
- `index.d.ts`: `tex`, `erode`, `debris`, `impact`, `on('impact')`, `attach` / `detach`, `feel`, `renderer`, `loadTextures`, `getTex`; remove `realism`.
- AUTHORING: §1 rules replace rule 8 "no images"; add the TIER and ENV tables; replace rule 16.
- README: bake and tests.
- `package.json` `files` += `"assets"`.
- Accept: `npx tsc --noEmit index.d.ts fx.d.ts` (if tsc is available) or a grep check; then `shots all 0.5` ok.

## 7. Test phase, then bugfix, report, push
Commands (server on 8123; GPU tools run headed):
1. `node tools/shots.mjs /tmp/t/op all 0.5` → 406/406, no errors/warnings
2. `node tools/shots.mjs /tmp/t/tr all 0.5 transparent=1` → 406/406
3. `node tools/shots.mjs /tmp/t/host all 0.5 host=1` → 406/406
4. showcase sheets: `shots <10 ids> -0.1,-0.3,-0.6,-0.9` in all 3 modes plus top/low views (`?view=top|low` via S27) → LOOK, judge against §1
5. `node tools/alpha-test.mjs` → ok (corner alpha 0, valid premultiplied, no dark halo, gallery no 4xx)
6. `node tools/determinism-test.mjs all` → A 406/406; B only the 4 known residuals
7. `node tools/gpu-scan.mjs all` → no black frames, no console errors
8. `node tools/perf.mjs <10 ids> low,medium,high` vs S0 → each showcase median ≤ S0 + 1.5 ms on the dev GPU, p95 ≤ 16.6 ms at medium; all effects ≤ 900 particles
9. `node tools/bake.mjs all --check` → hashes match the manifest
10. budget: the driver prints the total; `du -ch assets/fx/*.png | tail -1` ≤ 20 MB

Bugfix: fix each failure at the root in shared code, then rerun the failing command plus 1–3. Write `docs/REPORT-P4.md` (done / test table / still weak / checks not done, P3 format). Commit, then push to `https://github.com/kocyigitkim/pixelfx3d.git`.

## 8. Risks and open questions (ask the user at the end)
**Risks**
- Bake hashes are only reproducible on the same GPU and driver, so the PNGs are committed.
- Browser premultiplication would destroy 6-way data. Mitigated by ImageBitmapLoader options and the node PNG encoder.
- 128-px frames blur on full-screen smoke.
- Changing the host light count recompiles all host shaders. Mitigated by the 4-light pool; a 5th simultaneous light is dropped.
- DecalGeometry on a high-poly host ground is slow. Cap: ≤ 2 projected decals per effect, built once.
- The analytic emitter bounce assumes a flat floor at `groundY`. Debris uses the same assumption (`shortcut:` comment).
- Auto-mapping changes the look of all 406 effects; non-showcase effects get error checks only.
- Feel post is skipped in transparent mode.
- Metal NaN: new shaders must use `sq()` and guarded `normalize`.

**Open questions**
1. 2048² for every preset would be about 35 MB and break the 20 MB budget. Accept 2048² for the explosion only, or raise the budget?
2. When attached, should the stage render the host scene, or should the host keep its renderer and call `stage.renderFx()`?
3. Should feel default to on when attached?
4. Is the light pool size of 4 enough?
5. When should KTX2 conversion happen?
6. Is an integrated GPU (M1/Iris) available to confirm the 60 fps target?
