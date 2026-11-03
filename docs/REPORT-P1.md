# Package 1 report (P1–P7), 2026-11-03

## Done
- **P1 transparent mode**: `new Stage(el, { transparent: true })` → alpha canvas, premultiplied output, sky/ground/fog off, alpha-safe bloom (bloom blend keeps scene alpha; final pass alpha = max(sceneAlpha, glow), faint glow tails cut so corners stay 0), additive materials no longer add coverage. Lit particles get a neutral ambient (`ambient` option, default 0.5) because there is no sky to light smoke. Gallery: `transparent` switch + checkerboard. `tools/alpha-test.mjs` passes (10 effects / 10 categories over magenta: corner alpha 0, no opaque rect, premultiplied valid, no dark halo; opaque pixels identical to baseline with `legacy=1`; gallery has no 4xx).
- **P2 export**: `tools/sheets.mjs <out> <ids> <fps> <size>` → `frame_####.png` with alpha, `sheet.png`, `sheet.json {frameW, frameH, frames, fps, loop, cols, rows, duration}`.
- **P3 look**: global bloom energy −36% (`bloomScale` 0.8), flash capped at 0.6. New flame shader (teardrop silhouette, noise erosion, hot core → saturated rim). Fixed effects: fire-tornado (funnel body + 6 widening rings), fire-ring, campfire ramp/heat glow, wave-crash fade, scythe-reap, claw-swipe, summon-rise, egg-hatch, resurrection, halo, lightning-strike, zap-hit, chain-lightning, jetpack, eclipse (no square), necro-skulls, collect-burst (no white peak), flying-skull, slime, bird, crt-off, time-stop, aurora (checked: renders), earth-spike (sinks). Contact sheets reviewed by eye.
- **P4 determinism**: `tools/determinism-test.mjs`. Test A (same seed → identical hash): 244/244 pass. Test B (loop seam): orb/beam/shell/decal/water noise, light flicker and bolts are now periodic; 10 of 14 flagged loops fixed.
- **P5 quality + perf**: `quality: 'low'|'medium'|'high'` scales pixel ratio, MSAA and particle count. Real-GPU numbers in `docs/PERF.md` (Apple M4 Pro: median 1.3–4.5 ms, p95 ≤ 10.7 ms, none over 16.6 ms). weather/storm cut from 1246 to 886 particles.
- **P6 packaging**: `index.d.ts`, `fx.d.ts`, package `exports` per category (`pixelfx3d/fx/<cat>`), `types`; library code imports bare `three` (bundler/import-map), gallery keeps its import map. Gallery 404 (favicon) fixed.
- **P7**: `NOTICE.md`. README and AUTHORING updated.
- All 244 effects render with no console error or shader warning in both opaque and transparent mode.

## Still weak / listed failures
- **Loop seam (by design or residual)**: projectiles/muzzle-smg (recoil snaps at every shot boundary, seam = one more boundary), shadow/soul-drain (soul respawn streak at seam, 0.46% px), lightning/ball-lightning (0.48%) and lightning/plasma-ball (1.07%): bolt re-roll reads `fx.t` at generation; scifi/laser-grid 0.41% (limit 0.3%).
- **Ring and ribbon noise** still use wrapped time without crossfade (slight pop possible at the loop point; not caught by the seam test).
- **Dark smoke over light backgrounds**: smoke ramps are soot-dark by design and ACES crushes them; in transparent mode over a white/pink page explosions read as a black cloud. Mitigated with the ambient floor, not redesigned.
- **water/wave-crash**: the pool mesh edge shows as a hard rectangle at some angles (pre-existing).
- **fire/fire-ring**: tongues still read as individual sprites at the ring's far side.
- **spawn/egg-hatch**: the glowing egg core is near white at the hatch moment (intentional glow, slightly hot).
- **sRGB on premultiplied colour**: thin smoke edges over light backgrounds come out slightly lighter than over black (accepted).

## Checks not done
- No test on an integrated GPU; the 60 fps target is extrapolated from the M4 Pro numbers.
- `tsc --noEmit` on the `.d.ts` files was not run (needs network for @types/three).
- Visual review covered the 24 listed effects at 3 times each plus the fire and water categories; the other categories were checked only for console/shader errors at t=0.5.
- NOTICE.md credit line for Hugo Duprez vs patch-gg could not be verified against the upstream LICENSE offline.
