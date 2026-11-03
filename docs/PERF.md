# Performance

## Method

- Tool: `tools/perf.mjs`.
- Browser: headed Chromium, ANGLE Metal (macOS) or D3D11 (Windows).
- Each frame ends with a synchronous `readPixels` so the GPU work is included in the timing.
- Viewport: 1280x720.
- Quality levels: low, medium, high (`Stage` `quality` option).

## Budget

- Target: p95 frame time <= 16.6 ms at `medium` quality on an integrated GPU.
- Particles: <= 900 per effect.

## Results

GPU: Apple M4 Pro (ANGLE Metal), headed Chromium, 1280x720, measured 2026-11-03.

All 244 effects at medium: median frame time ranges from 1.3 ms to 4.5 ms; p95 max is 10.7 ms (explosions/grenade); 0 effects have p95 > 16.6 ms.

### Top 10 by median frame time (medium)

| quality | effect | particles | median ms | p95 ms | max ms |
|---|---|---|---|---|---|
| medium | explosions/big-explosion | 497 | 4.5 | 7 | 8.2 |
| medium | fire/spirit-flame | 78 | 4.4 | 4.9 | 7.6 |
| medium | shadow/dark-explosion | 324 | 4.4 | 8 | 10.4 |
| medium | explosions/barrel-explosion | 255 | 4.1 | 4.9 | 6.7 |
| medium | explosions/small-explosion | 246 | 3.9 | 4.9 | 6.6 |
| medium | nature/poison-cloud | 103 | 3.9 | 5.6 | 6.3 |
| medium | moves/sword-combo | 177 | 3.8 | 5.8 | 12.9 |
| medium | projectiles/muzzle-shotgun | 136 | 3.6 | 6 | 7 |
| medium | fire/meteor | 373 | 3.3 | 6.8 | 10.3 |
| medium | weather/fog | 73 | 3.3 | 5.4 | 6.2 |

Ties at 3.3 ms are both listed. `lightning/storm-cloud` (3.1 ms) is 11th.

### Quality levels

GPU: ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified Version)
| quality | effect | particles | median ms | p95 ms | max ms |
|---|---|---|---|---|---|
| low | fire/campfire | 58 | 0.9 | 1.1 | 3.7 |
| low | explosions/nuke | 335 | 1.3 | 2.2 | 5 |
| low | weather/aurora | 7 | 1.1 | 1.3 | 4.2 |
| low | fire/flame-pillar | 255 | 1.1 | 1.6 | 21.1 |
| medium | fire/campfire | 89 | 1.9 | 3.9 | 4.9 |
| medium | explosions/nuke | 504 | 2.8 | 5.6 | 7.2 |
| medium | weather/aurora | 11 | 2 | 4.1 | 5 |
| medium | fire/flame-pillar | 384 | 2.2 | 3.9 | 4.6 |
| high | fire/campfire | 116 | 2.4 | 4.2 | 5.3 |
| high | explosions/nuke | 670 | 3.3 | 6.3 | 7.8 |
| high | weather/aurora | 14 | 2.4 | 4.5 | 5.3 |
| high | fire/flame-pillar | 510 | 2.8 | 4.7 | 17.7 |

### Particle budget

- `weather/storm` was 1246 particles at high (936 at medium, measured before the edit). It was reduced to 886 at high: 420 + 200 + 160 rain/drops + 40 smoke + 66 deck smoke; the rest is unchanged. The 886 figure is derived from the source counts, not measured after the edit.
- All other effects were under 900 at medium in the measured run; `weather/storm` was the only one over.

### Caveat

Measured on a discrete-class Apple GPU, not an integrated GPU. The 60 fps target on integrated GPUs is extrapolated, not measured.

## Notes

- `countScale` lowers additive particle density. Low quality is dimmer by design.
