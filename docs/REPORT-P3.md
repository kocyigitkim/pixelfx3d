# Package 3 report: realism (lighting, rings, fire), 2026-11-05

Research notes: `docs/RESEARCH.md`. Plan: `docs/PLAN3.md`. All new paths are gated by the shared `uReal` uniform; `new Stage(el, { realism: false })` (gallery `?legacy=1`) restores the previous look pixel-for-pixel.

## Done
- **Soft particles / depth fade** (NVIDIA, UE DepthFade): the stage renders an opaque depth pre-pass (half-res, layer 1: ground + depth-writing fx meshes); emitter sprites, orbs, shells, beams and rings fade over a per-kind transition zone (`soft` option) where they meet the ground or body, plus a near-camera fade. No more hard cut lines.
- **Screen-space refraction**: rings with `refract` and shells write a distortion offset into a half-res target (layer 2); the final pass samples the scene at uv+offset. Shock rings read as pressure waves. Kit rings (`_skill.js`), explosion and impact rings got `refract` and a `dark` contrast rim mesh.
- **Energy-conserving bloom**: threshold 1.0 → 0.7 with soft knee 0.6, radius 0.5 → 0.85, strength scale 0.8 → 0.55; HDR emitters stay honest (fire core > 1.0).
- **Lit sprites**: sphere normal from sprite uv, wrap diffuse from the effect light with windowed inverse-square falloff (UE/Frostbite), back-light rim, hemisphere ambient. Smoke now has volume and a lit side.
- **Blackbody fire**: new `FIRE` ramp (white-yellow core → orange → dark red → soot), HDR core, sooty tips; `glow` halo sprite on fire lights; `fx.heat()` heat-haze prim on campfire, brazier, torch, fire-tornado, flame-pillar.
- **Rings**: erosion noise that grows over life, noise pan fast → slow, thin dark rim; persistent rings (`decay: 0`) skip life-based erosion so loops stay seamless.
- **Metal NaN**: 37 `pow(x, int)` calls replaced by `sq()/cube()`; second NaN guard after screen transitions (arcane/time-stop was blanking).
- Types (`index.d.ts`), AUTHORING and README updated; `tools/gpu-scan.mjs` and `tools/perf.mjs` keep working.

## Test results (final tree)
| check | result |
|---|---|
| `shots.mjs all 0.5` opaque | 406/406, no console/shader errors |
| `shots.mjs all 0.5 transparent=1` | 406/406 |
| `alpha-test.mjs` (legacy vs baseline 481cf24) | ok |
| `determinism-test.mjs` A | 406/406 identical |
| `determinism-test.mjs` B (loop seam) | 4 known residuals: plasma-ball, laser-grid, muzzle-smg, soul-drain (ball-lightning now passes) |
| `gpu-scan.mjs all` (Apple M4 Pro, Metal) | no black frames |
| `perf.mjs` realism vs legacy | within ~1 ms median (campfire 3.1 vs 2.7 ms, fog 4.8 vs 6.5 ms) |

## Still weak (reason)
- Refraction is subtle in stills; it reads in motion only. Offset is in screen units, so it scales with resolution.
- weather/fog is a little bright after the ambient lift (lit smoke was black before).
- Meshes added after `play()` are not on the depth layer, so sprites do not fade against them.
- The dissolving body still writes depth while fading.
- Lit sprites use a fake sphere normal, not six-way lightmaps; thin smoke can look slightly plastic.
- Ring/ribbon noise still uses wrapped time without crossfade (slight pop possible at the loop point, not caught by the seam test).

## Checks not done
- No run on an integrated GPU; perf is from the M4 Pro.
- Visual before/after review covered fire, explosions, impacts, weather, shadow and holy by contact sheet; other categories were checked for errors and blank frames only.
- Transparent-mode refraction samples the scene target only; the host page behind the canvas is not refracted (by design).
