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

Results table: pending. The table from the T9 run has not been pasted into this file yet.

Top 10 heaviest effects: pending the same T9 run.

## Notes

- `countScale` lowers additive particle density. Low quality is dimmer by design.
