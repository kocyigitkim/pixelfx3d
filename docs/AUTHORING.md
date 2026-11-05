# pixelfx3d — authoring guide

3D, shader-driven, realistic re-imagining of every effect in `patch-gg/pixelfx`. three.js (WebGL2), no assets, no images:
every pixel comes from GLSL, every random number from a seeded RNG (`fx.rng()`), so frame N is the same every time.

World: **meters, +Y up, characters face +X, feet on y = 0, 1.8 m tall.** Default camera sits at +Z/+X looking at (0,1,0)
(override per effect with `stage.view`). Origin of an effect = the spot on the ground in front of/under the action.

## An effect file
`src/fx/<category>.js` default-exports an **array** of definitions:

```js
export default [{
  id: 'fire/campfire',        // '<category>/<kebab-name>'  (same ids as pixelfx where one exists)
  name: 'Campfire', category: 'fire',
  loop: true, duration: 3,    // loop => seamless period in seconds; one-shot => length in seconds
  stage: { sky: 'night', view: { pos: [2.6,1.5,3.2], target: [0,0.55,0], fov: 40 }, bloom: 0.45, ground: true, exposure: 1 },
  act:  { kind: 'slash', weapon: 'sword', target: [2.1,0,0], windup: 0.45, hits: [{ t: 0.07, stop: 0.09, shake: 0.2, amp: 0.03, push: 1.4 }] }, // optional
  body: true,                 // optional: show the mannequin (no attack) so you can drive its shader (fx.body.set)
  screen: { glsl: '...' },    // optional: full-screen transition (see below)
  build(fx, o) { ... },       // create parts with the fx.* builders. o = user options (o.palette, o.seed ...)
}];
```
`stage.sky`: `night | dusk | day | dark | void | storm`. Time `t` is seconds from the effect's first frame (`t=0`).
Acts run the mannequin from `-windup` s before t=0 (wind-up) to the recovery; hit-stop / camera shake / target kick are `hits`.

## Builders on `fx` (all take `t0`, `dur`, `fade:[in,out]` seconds; default = whole effect; coordinates are fx-local meters)
* `fx.emitter(p)` – GPU particles (analytic, deterministic). Params (defaults in brackets):
  `count`(100) `kind` `blend:'add'|'normal'`('add') `ramp:[[u,'#hex',alpha],...]` over particle life (use `fx.pal([...])` to make it palette-aware) `intensity`(1; HDR multiplier)
  `size:[s0,s1]` (m; sizeVar .3, sizePow 1) `aspect` (flame/height stretch) `life:[a,b]` s `speed:[a,b]` m/s `dir:[x,y,z]` `spread`(rad, cone half-angle .3) `radial`(0..1 push outward from spawn point)
  `shape:'point'|'sphere'|'disc'|'ring'|'box'|'line'` with `radius`(outer) `radiusIn`(inner) or `shapeSize:[x,y,z]` (box half-extents / line half-length in x)
  `gravity:[x,y,z]` `wind` `drag`(1/s) `turb:[amp,freq]` `swirl`(rad/s around local Y) `bounce`(0..1, floor at y=0; -1 off) `stretch`(spark streaks along velocity) `rot`(spin) `floorFade`(soft fade near y=0)
  `lit`(0..1: normal-blend particles take the fx key light + ambient — use 1 for smoke/dust/debris) `pos:[x,y,z]` (emitter origin) `rot3:[rx,ry,rz]` `soft` (soft-particle depth fade)
  Timing: burst = `emit` ≈ 0.001 (default) with `delay`; spread over time: `emit: seconds`; **loop effects loop automatically** (period = fx.duration, steady state from frame 0).
  `t0/t1`: visibility window. `order`: render order tweak. `follow(mesh,tAbs,t)`: move the emitter object per frame.
  `kind`: `soft` glow dot · `spark` streak (use `stretch`) · `streak` long thin line · `smoke` noisy soft (use blend 'normal' + lit) · `flame` teardrop tongue (base sits at particle position; use `aspect` ~1.8) ·
  `ring` · `shard` faceted chip · `flake` snowflake · `drop` water drop · `glint` 4-point star · `petal` tumbling petal/leaf · `bubble` · `rock` shaded blob · `dust` puff.
* `fx.orb({kind:'fire|plasma|void|glass|water|ice|energy', r:[r0,r1], ease:'out', pos, noise, scroll, disp, intensity, power, alpha, pulse:[amp,freq], ramp, soft})` – noise-displaced sphere (fireballs, plasma, black holes, water/glass spheres, crystals).
* `fx.ring({r:[r0,r1], width:[w0,w1], normal:'up'|'cam'|[x,y,z], pos, y, fill, breakup, intensity, ramp, decay, refract, dark, soft})` – expanding shock/light ring (ground ring when 'up'). `refract` = screen-space bend (0.01–0.02), `dark` = dark rim (0.25–0.3).
* `fx.shell({r:[r0,r1], hemi, cells, power, noise, intensity, ramp, pulse, impacts:[{t, dir:[x,y,z]}], refract, soft})` – fresnel dome/bubble/shield; `cells` = hex/voronoi plates; impacts ripple.
* `fx.beam({from:[..], to:[..]} | {pos, height} | {path:(t,pr)=>[from,to]}, r:[rBase,rTop], noise, freq, speed, pulse, edge, grow:[a,b], intensity, ramp, soft})` – soft shafts: lasers, pillars of light, cones, tractor beams.
* `fx.ribbon({points:[[x,y,z],...] | points:(t,pr)=>[...], n, width:number|(u)=>w, sweep:[a,b]|head:(t,pr)=>h, tail, ramp, intensity, core})` – view-aligned glow strip (head→tail gradient). 
  `fx.slash({center, radius, a0, a1, tilt, depth, width, ...})` crescent arc (angles in rad in the XY plane facing +X; `tilt` rolls the plane about X: π/2 = horizontal swing).
  `fx.trail({path:(t)=>[x,y,z], len, width, n})` ribbon trailing a moving point. `fx.bolt({from, to, jag, branches, branchLen, width, rate (Hz re-roll), flicker, ramp})` re-rolled jagged lightning (`from`/`to` may be `(slot)=>[x,y,z]`).
* `fx.decal({kind:'scorch'|'cracks'|'glow'|'rune'|'frost'|'rings', r:[r0,r1], cells, glyphs, poly, spin, reveal (s to draw in), heat:[a,b], ramp, intensity, y})` – ground-plane patterns.
* `fx.water({r, deep, shallow, ripples:[{t,x,z,amp}], vortex, waves})` – shaded animated water disc (reflections, ripples, optional whirlpool).
* `fx.light({color, intensity, pos, range, flicker, rate, env:(t,pr)=>k, colorFn, glow, glowSize})` – a real PointLight; ALSO drives the `lit` particles. Intensity ~ 10-40 for torches, 100-400 for blasts.
* `fx.heat({pos, size:[w,h], strength, rise, alpha, t0, dur, fade})` – heat-shimmer column (screen-space refraction haze over fires). One per fire; pair with a `glow` light.
* `fx.text({text, size, motion:(pr)=>({pos,scale,alpha,rot}), grad, outline})` – canvas sprite text.
* `fx.mesh(object3d, (t, pr, fx, w, obj, tAbs)=>{}, {t0,dur})` – any custom three.js object (PBR meshes for coins/gems/hearts/keys, creatures, debris...). `MeshStandardMaterial/MeshPhysicalMaterial` get image-based reflections for free.
* `fx.on((t, tAbs, fx)=>{})` per-frame callback. `fx.shake(t0,dur,amp)`, `fx.flash(t0,dur,'#fff',amt)`, `fx.hit(t,{stop,shake,amp,push})`.
* `fx.slash/trail/…` return the part. `fx.rng()` seeded 0..1 (`fx.rng.range(a,b)`, `.pick`). `fx.pal(stops)` palette-aware ramp stops.
* Body shader (when `act` or `body: true`): `fx.body.set({dissolve, dDir, edge:'#f70', edgeW, edgeInt, tint:'#..', tintAmt, frost, stone, rim:'#..', rimAmt, alpha, scan (world y of scan line), scanCol, emit, holo, glow})` each frame in `fx.on(...)`.
  `fx.body.tip(len)` world pos of weapon tip; `fx.body.armR.hand`, `.torso`, `.headMesh` are Object3Ds to read positions from (`obj.getWorldPosition`; fx is usually at the origin).
  Dissolve: `dissolve` 0→1 eats the body from the bottom (`dDir:1`) or the top (`dDir:-1`), `edge` glows at the front. `uDissolve=-1` = off.
* Screen transitions: `screen: { glsl: 'vec3 trans(vec2 uv, vec3 c, float p, float t, float a){ ... }' }` – `c` is the rendered frame, `p` 0→1 over the effect, `a` aspect ratio. Noise helpers (`fbm`, `vnoise`, `hash12`, `voronoi`) are available.

## Look rules (this is what makes it read as real)
1. **Additive overlap accumulates** – 40 overlapping flame quads at intensity 2 = a white blob. Dense emitters: `intensity` 0.3–0.9; sparse sparks/glints: 2–5. Start ramps at a hot color (not pure white) and cool through orange/red to transparent. Keep bloom threshold in mind: only values > 1 bloom.
2. **Smoke/dust/debris** → `blend:'normal'`, `lit:1`, dark desaturated ramp with alpha rising then falling; add a `fx.light` so they pick up fire/glow color. Smoke `order:-1` so glow draws over it.
3. Every energetic effect should light its surroundings: `fx.light` (+ ground `decal` glow). Add `fx.flash/shake` for impacts. Use **hit-stop** (`act.hits.stop`) for melee.
4. Break symmetry: vary sizes (`sizeVar`), use `turb`, stagger `delay/emit`, mix 3+ layers (core, body, sparks, smoke, light, ground).
5. Big shapes (orbs, shells) are the hero of one beat — fade them out; don't leave them solid.
6. Loops: define everything over `duration` (or use `loop` emitters); prims default to the whole duration. One-shots: stage a **beginning, a peak and an aftermath** (embers, scorch, cooling light).
7. Performance (must run on integrated GPUs): ≤ ~900 total particles, ≤ 3 orbs/shells, ≤ 2 voronoi decals per effect, no per-frame allocations in hot callbacks.
8. Determinism: never use `Math.random`; use `fx.rng`. No network, no images — everything procedural.
9. If you need a different shape of particle, build it from `fx.mesh` + custom `THREE.ShaderMaterial`; keep material code inside your category file.
10. **FIRE ramp** (`src/fx/fire.js`, reuse it for fire-like flames): `[[0,'#fff3dc',1],[0.15,'#ffc27a',1],[0.35,'#ff9a32',0.9],[0.6,'#e2500f',0.6],[0.85,'#5a1a08',0.25],[1,'#140604',0]]`. Cool blue-white flame ramps (jetpack) use the same shape: hot core, then orange tip, then a dark ember.
11. Global bloom 0.55 × stage.bloom, threshold 0.7, soft knee 0.6, radius 0.85; visible bloom grows with strength², so keep `stage.bloom` ≤ 0.5.
12. Full-screen flash is capped at 0.6 (`stage.flashMax`); use ≤ 0.3 and prefer lights.
13. Custom additive materials: use `blendSrcAlpha: Zero, blendDstAlpha: One` (Stage patches this in transparent mode).
14. Loops: callbacks must use `t` (not `tAbs`/`ta`) and periodic frequencies `2π·n/duration`; prims are already loop-safe.
15. Do not hide things under y=0 by relying on the ground; it is clipped in transparent mode.
16. Flat ground rings/decals: no `soft`; shock rings: `refract` 0.01–0.02, `dark` 0.25–0.3; `Stage({realism:false})` = old look.

## Test loop
Server is already running on :8123 (`node tools/serve.mjs 8123`; start it if not). Render frames of any effect(s):
```
node tools/shots.mjs /tmp/w/shots/<yourname> fire/torch,fire/brazier 0.3,1,-0.5      # ids (or cat:fire / all), times in s (negative = fraction of duration)
node tools/sheet.mjs /tmp/w/shots/<yourname>/sheet.png /tmp/w/shots/<yourname>/fire_torch@*.png     # contact sheet → open with the Read tool to LOOK at it
```
`shots.mjs` prints every console error/warning (shader compile errors included) — fix them all. LOOK at screenshots at ≥3 times per effect (start/peak/end; loops: 2 phases)
and iterate until it reads like the effect described in the catalog (`https://github.com/patch-gg/pixelfx/blob/main/docs/CATALOG.md`).
Reference recipes: `src/fx/fire.js` (campfire), `src/fx/explosions.js` (small-explosion), `src/fx/melee.js` (sword-slash with act).
Loop check: `node tools/determinism-test.mjs cat:<category>` (same seed = same pixels; frame 0 ~= frame duration). Export: `node tools/sheets.mjs <outDir> <id> 24 256`.

## Skills (src/fx/_skill.js)
The 162 MMORPG skills (22 `src/fx/<category>.js` files) are built from shared helpers in `src/fx/_skill.js`. Import from there; do not re-declare them.

* `SKILL(id, name, meta, dur, def)` – factory returning the effect definition. `def` supplies `build`, `act`, `sky`, `view` (a key of `VIEW`); the factory fills `category`, `loop: false`, `duration`, `meta` and `stage`.
* `meta(category, tier)` – returns `(elements, archetype, castTime, cooldown, range, shape) => meta object`. Used for the `meta` block.
* `kit(fx, o, RAMP)` – returns `k`, a layer kit with grade applied. `o` is the user options (must carry `grade`); `RAMP` is the skill's element ramp.
  * `k.g` grade (1-3), `k.s` size multiplier, `k.b` brightness multiplier. Both `s` and `b` are `1 / 1.15 / 1.3` for grades 1 / 2 / 3.
  * `k.col(i)` palette colour of ramp stop `i`; `k.ramp` the palette-aware ramp.
  * Layer builders (each applies `k.s` / `k.b` and the ramp by default): `k.em`, `k.smoke`, `k.ring`, `k.orb`, `k.shell`, `k.beam`, `k.ribbon`, `k.slash`, `k.trail`, `k.bolt`, `k.decal`, `k.light`.
  * Composites: `k.gather(pos, t0, dur, R, n, follow)`, `k.impact(pos, t, n, r)` (sparks, glint, ring, light, shake), `k.sparks(pos, t, n, p)`, `k.glint(pos, t, size)`, `k.extras(pos, t)` (grade layers, see below).
  * `k.pop(obj, t0, t1, t2, t3, fn)` – scales a mesh in and out (`t0..t1` grow, `t2..t3` shrink).
  * `k.at(side)` – returns a mover that places an object at the hand (`'armR'` by default).
  * `k.ghost(pose, pos, t0, dur, a)` – holographic mannequin ghost.
* Grade rules: `grade()` clamps to 1-3. Grade 2 adds one layer inside `if (k.g >= 2)` (a flash). Grade 3 adds two layers inside `if (k.g === 3)` (an extra ring plus sparks, glint and light). `k.light` also gets x1.3 intensity at grade 3.
* Element ramps (exported): `FIRE, WATER, EARTH, AIR, STEAM, LAVA, STORM, FROST, SWAMP, DUNE, PLASMA, CRYO, NANO, ION, QUANTUM`. Also exported for other skills: `STEEL, BLOOD, POISON, HOLY, VOID, ARCANE, SPIRIT, NATURE`.
* Look ramps (normal blend, alpha rises then falls): `SMOKE, DUST, VAPOR, MUD, SAND`.
* Helpers: `up(ramp)` reverses a ramp for orbs, shells and decals (dark to bright), `metal()`, `rock()`, `addMat()`, `act()`, `VIEW`, `sm`, `clamp`, `TAU`, `POSES`.
* Particle budget: each skill's `build` carries a `// P3=<n>` comment recording its particle count. Keep it updated when you change the counts.
* GLSL rule: never call `pow(x, y)` in GLSL with a base that can be negative. Wrap it as `pow(max(x, 0.), y)`. Metal returns NaN, and one NaN pixel blanks the whole frame.
