# Package 2 report: 162 MMORPG skills, 2026-11-03

## Done
- **22 new categories, 162 skills** (`src/fx/warrior.js` … `quantum.js`), all registered in `src/fx/index.js`: 43 categories, 406 effects. Ids are unique; no existing id changed.
- **Shared kit** `src/fx/_skill.js`: element ramps (section 4 of TASK2), `SKILL()` factory, `meta()`, `kit(fx, o, RAMP)` with grade scaling (`k.g/k.s/k.b`), layer builders, `gather/impact/sparks/extras/pop`.
- **Grades**: every skill reads `o.grade` (1/2/3); g2 adds one layer and a second flash, g3 adds two layers plus a stronger light and flourish (`k.extras`). Contact-sheet check on 5 skills × 3 grades: clearly different.
- **Gallery**: tier and element filters, grade selector, meta line (class · elements · cast · cooldown). `tools/shots.mjs` takes `grade=N` and flags any effect over 900 particles.
- **Tech skills** (plasma, cryo, nano, ion): each has at least one solid `fx.mesh` metal part (plates, rails, drones, hex cells, turret parts), holo rune marks, vapor/sparks instead of smoke.
- **Derived skills** use their derived ramp (STEAM/LAVA/STORM/FROST/SWAMP/DUNE); tech skills use PLASMA/CRYO/NANO/ION; quantum uses QUANTUM.
- **Per-wave visual review** (4 times per skill, contact sheets by eye) with a fix pass per wave: wave 1 (12 fixes), wave 2 (8), wave 3 (6), wave 4 (7).
- **Metal NaN blank-frame fix** (found via sword-slash on the real GPU): `pow()` bases guarded, NaN/Inf guard in the bloom high-pass and final pass; `tools/gpu-scan.mjs` scans every effect on the real GPU for blank frames.

## Test results (final tree)
| check | result |
|---|---|
| `shots.mjs all 0.5` opaque | 406/406, no console/shader errors |
| `shots.mjs all 0.5 transparent=1` | 406/406 |
| particle budget (≤900 at high) | all pass (weather/rain cut 1162 → 852) |
| `alpha-test.mjs` | ok |
| `determinism-test.mjs` A (same seed) | 406/406 identical |
| `determinism-test.mjs` B (loop seam) | 5 known residuals (ball-lightning, plasma-ball, laser-grid, muzzle-smg, soul-drain), see REPORT-P1 |
| `gpu-scan.mjs all` (Apple M4 Pro, Metal) | no blank frames, no console errors |

## Still weak (reason)
- warrior/rending-wave: the steel crescent still reads as a shard cloud; the ribbon is seen edge-on from the side view.
- priest/bless-banner: the banner is a flat emissive rectangle; needs a cloth mesh with wave deformation.
- shaman/bone-golem: the golem body is over-bright white (emissive bone material too strong).
- pyro/ashfall: ash spawns high and reads as a cloud at the top of the frame rather than a falling zone.
- pyro/phoenix-dive: the bird silhouette in the trail is not readable; it is a flame trail plus two wing ribbons.
- archer/triple-volley and mage/forked-thunder: the projectile/bolt is brief, so most sampled frames show only the aftermath.
- aero/gale-slash: by design "almost invisible"; reads mainly as the impact ring.
- quantum/probability-storm: grade-3 particle count varies with the rng fate choices (≤321, reported worst case).
- Several P3 comments are hand sums; the runtime check in shots.mjs is the authority.

## Checks not done
- No run on an integrated GPU; perf numbers in `docs/PERF.md` are from the M4 Pro (244 effects); the 162 skills were not perf-measured.
- Grade comparison rendered for 5 skills per wave 1 only (crescent-chain, venom-fan, comet-lance, purifying-wave, dread-howl); other waves checked at grade 1 only.
- "Not a copy of an existing effect" was judged by eye on contact sheets, not by a pixel comparison.
- No originality audit against real games beyond using only the names given in TASK2.
