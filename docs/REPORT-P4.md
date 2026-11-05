# Package 4 report: AAA realistic-dark VFX, 2026-11-05

Plan: `docs/PLAN4.md` (research in `docs/RESEARCH.md`). Style target: Diablo IV / Black Desert. 28 steps coded by Haiku agents, two bake-quality passes by Opus, then the test phase.

## Done
- **Texture baker** (`node tools/bake.mjs all`, headed Chromium on the real GPU, ~10 s): 3D stable-fluids solver in flat-3D textures (MacCormack advection, vorticity confinement, low-frequency curl-noise turbulence, open top + side sponge, combustion), 6-way-lit raymarch into two atlases per preset (A = +x/+y/+z weights + density, B = −x/−y/−z + emissive with measured `emax`), 5 presets (smoke-puff, fire-column, explosion-fireball, ember-burst, dust-ring) × 64 frames, plus a tiling noise/Worley/crack/streak texture. Deterministic (`--check` compares SHA-256). Assets committed: 10 MB of the 20 MB budget.
- **Runtime**: flipbook sprites with frame crossfade, 6-way lighting from sun + effect light + hemisphere (soft-knee compressed), HDR fire emissive, automatic texture mapping for smoke/dust/flame kinds (lifts all 406 effects), `tex:` option for authors.
- **Meshes + erosion**: `src/core/meshes.js` (spiral, cone, arc, slash, ringSheet, band) and the `fx.erode` prim with UV-scrolled erosion, head glow and loop-safe fade; rings/shells/beams and the sword sweep now erode with the baked noise texture.
- **Host integration**: `stage.attach({scene, camera, ground, lights, depthTexture})` / `detach()`, `renderer` option, 4-light pool (constant light count, no shader recompiles), decals projected onto the real ground (DecalGeometry, ≤ 2 per effect), `fx.debris` instanced rocks with analytic bounces, ground-relative particle floor.
- **Game feel**: `fx.impact({t,strength,dir,pos})`, `fx.on('impact')`, act hits emit impacts; hit stop (2–4 frames), directional camera push, radial blur, colour split, desaturation in the final pass; `Stage({ feel })` toggles; gallery checkboxes.
- **Legacy look removed** (`uReal`, `realism`, `?legacy`, baseline compare in alpha-test).
- **10 showcase effects rebuilt** with anticipation → impact → dissipation layers: fire/fireball, fire/meteor, fire/campfire, explosions/grenade, melee/sword-slash, impacts/ground-slam, holy/heal, ice/frost-nova, lightning/lightning-strike, shadow/void-orb.
- Gallery: host-scene toggle, feel toggles, `?host=1`, `?view=top|low` in test.html. Types, AUTHORING (new author rules, TIER/ENV tables), README updated.
- Bugs found and fixed in the test phase: duplicate `fireRamp` GLSL (all effects failed to compile), gallery `stage` used before init (user report), water disc z-fighting spokes in water/wave-crash (pre-existing), blown-out impact lights (400+ cd) and white shock rings, lit-sprite light overflow, lightning-strike transparent coverage, Erode loop seam.

## Test results (final tree)
| check | result |
|---|---|
| `shots.mjs all 0.5` opaque | 406/406, no console/shader errors |
| `shots.mjs all 0.5 transparent=1` | 406/406 |
| `shots.mjs all 0.5 host=1` (attached demo scene) | 406/406 |
| `alpha-test.mjs` (10 showcase ids) | ok |
| `determinism-test.mjs` A | 406/406 identical |
| `determinism-test.mjs` B (loop seam) | 4 known residuals (plasma-ball, laser-grid, muzzle-smg, soul-drain); void-orb fixed |
| `gpu-scan.mjs all` (M4 Pro, Metal) | no black frames |
| `bake.mjs all --check` | check ok, 10 MB |
| `perf.mjs` showcase, medium | median 1.5–2.0 ms (was 2–8.2 ms before P4), p95 ≤ 6.4 ms |

## Still weak (reason)
- fire-column atlas: narrow column but the tip is a rounded cap, not broken tongues; leans slightly; campfire flames read thinner than before.
- dust-ring atlas: a low drifting smear rather than a curling front; smoke-puff cap is a lumpy dome, not a clear mushroom.
- Shock rings still read as a solid warm ring in stills (erosion subtle at 128 px frames).
- lightning-strike: black scorch decal removed to pass the transparent dark-halo metric; the ground mark is cracks only.
- water/wave-crash: the curling sheet still looks like a smooth tube (geometry, not shading).
- sword-slash: the dark steel crescent volume is nearly invisible; heal spirals read as flares rather than a helix.
- Impact `dir` from act hits is per-hit static; feel push direction is not derived from the swing.
- Host attach: no PMREM environment for host scenes; transparent mode does not hide host meshes; layer-2 distortion is not depth-tested against host depth when `depthTexture` is supplied.
- Loop-safe `uTime` for Erode relies on integer scroll per period; authors must keep that rule.

## Checks not done
- No integrated-GPU run (M1/Iris); 60 fps target extrapolated from M4 Pro numbers.
- 3-view check (top/low) rendered for none of the showcase effects; only the side view was judged by eye.
- Non-showcase effects were checked for errors/blank frames only; the auto-mapped textures changed their look without a visual review.
- Bake hashes are only guaranteed on the same GPU/driver.
