# pixelfx3d

Realistic **3D, shader-driven** re-imagining of [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) — the same effects (fire, explosions, water, ice, lightning, sci-fi, melee, impacts, projectiles, spawn/death, arcane, holy, shadow, status, nature, weather, UI, pickups, transitions, critters, moves), rebuilt for **three.js / WebGL2**.

No images, no sprite sheets: particles, flames, smoke, water, shields, lightning and decals are GLSL; every random number is seeded, so frame N is always identical.

**406 effects in 43 categories**: 244 classic effects plus 162 MMORPG skills in 22 skill categories (warrior, rogue, archer, mage, priest, shaman, dark, pyro, hydro, geo, aero, steam, lava, storm, frost, swamp, dune, plasma, cryo, nano, ion, quantum). Each skill has 3 grades: `stage.play(id, { grade: 1 | 2 | 3 })`, and a `meta` block (class, elements, tier, archetype, castTime, cooldown, range, shape). The gallery filters by tier/element and has a grade selector.

## run the gallery
```
npm i                         # three
node tools/serve.mjs 8123     # any static server works
open http://localhost:8123/gallery/
```
Keys: `↑/↓` next effect · `R` replay · `Space` pause · `T` tour · `P` PNG · `/` search. Deep links: `gallery/#fire/campfire`.

## use one
```js
import { Stage, registerAll, createFx } from './src/index.js';
registerAll();

const stage = new Stage(document.querySelector('#view'));   // renderer + sky + ground + HDR bloom
stage.start();
stage.play('ice/frost-nova', { seed: 7, palette: ['#041526', '#1a5f9e', '#58b8ff', '#c8f0ff', '#fff'] });
```
Inside your own three.js game, skip `Stage` and add effects to your scene:
```js
const fx = createFx('fire/fireball', { position: [0, 1, 0], scale: 1, flip: false, angle: 0 });
scene.add(fx);
fx.camQuat.copy(camera.quaternion);   // billboards face this
// each frame (dt in seconds)
fx.update(dt);                        // fx.done is true for finished one-shots, fx.reset() replays
```
Effects use your renderer's HDR pipeline: add an `UnrealBloomPass` (threshold ≈ 1) and ACES tone-mapping for the intended look (`Stage` does this).

## write one
See [docs/AUTHORING.md](docs/AUTHORING.md). A recipe is ~10 lines of builders (`emitter`, `orb`, `ring`, `shell`, `beam`, `ribbon/slash/bolt/trail`, `decal`, `water`, `light`, `text`, `mesh`) plus `shake/flash/hit`:

```js
{ id: 'fire/campfire', loop: true, duration: 3,
  build(fx) {
    fx.light({ color: '#ff8a2a', intensity: 22, pos: [0, .8, 0], flicker: .35 });
    fx.emitter({ kind: 'flame', count: 34, shape: 'disc', radius: .26, aspect: 1.9, speed: [.25,.6], life: [.7,1.25],
                 size: [.7,.2], ramp: fx.pal([[0,'#fff2c0'],[.25,'#ffb030'],[.7,'#e04010'],[1,'#300',0]]), intensity: .6, turb: [.2,1.4] });
  } }
```

## transparent compositing
`new Stage(el, { transparent: true })` renders over whatever is behind the canvas. Alpha = max(scene alpha, glow brightness), output is premultiplied. Sky, ground and fog are off, and anything under y < 0 is clipped. The gallery has a `transparent` switch (also `?transparent=1`).

## export
```
node tools/sheets.mjs out fire/campfire 24 256
```
Writes transparent PNG frames, a sprite sheet and a JSON per effect. JSON fields: `frameW, frameH, frames, fps, loop, cols, rows, duration`.

## quality
`quality: 'low' | 'medium' | 'high'` on `Stage`. Without `Stage`, use `createFx(id, { countScale })` to scale particle counts. Lower counts are dimmer by design (additive overlap).

## look options
Stage options: `bloomScale` (default 0.55), `flashMax` (default 0.6), `toneMapping` (`aces | agx | neutral | none`), `threshold`, `radius`, `bloom`, `exposure`.

## tests
```
node tools/determinism-test.mjs all      # same seed = same pixels; loops: frame 0 ~= frame duration
node tools/alpha-test.mjs
node tools/shots.mjs /tmp/w/shots/me all 0.5
node tools/gpu-scan.mjs all 0.1,0.5,-0.9   # real-GPU blank-frame / console-error scan (headed Chromium)
```

## types and entry points
TypeScript types ship in `index.d.ts` (and `fx.d.ts` for effect files). Per-category imports:
```js
import fire from 'pixelfx3d/fx/fire';
fire.forEach(register);
```
Bundlers resolve `three` and `three/addons/*`. Only plain browsers need an import map. `three` (>= 0.160) is a peer dependency; `@types/three` is needed for the types.

License: MIT, see NOTICE.md for the catalog credits (patch-gg/pixelfx, Hugo Duprez) and three.js.

## layout
```
src/core   emitter (GPU particles) · prims (orb/ring/shell/beam/ribbon/bolt/decal/water/light/text) · dummy (mannequin + acts) · stage
src/fx     one file per category, default-exports effect definitions
gallery    index.html (browser) · test.html (headless harness)
tools      serve.mjs · shots.mjs (render frames) · sheet.mjs (contact sheet)
```

MIT. Original effect designs © patch-gg (MIT); this project reimplements them from scratch in 3D.
