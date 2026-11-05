// §3 preset table as data (docs/PLAN4.md §3). Domain = unit cube, velocities in domain/s.
// src.ramp = smoothstep fade-in of the source (s); src.jit = curl jitter of injected velocity (default vr ?? vy ?? 2).
// turb = curl-noise acceleration (domain/s², masked to the plume), freq = noise lattice cells per domain (octaves at freq and 2·freq).
export const PRESETS = {
  'smoke-puff': { N: 96, sec: 2, alpha: .3, beta: .1, eps: 3, cool: 1, fade: 1.3, heat: 0, soot: 0, atlas: 1024, emissive: false, framePow: 1, turb: .5, freq: 5, densityScale: 1.3,
    src: { type: 'sphere', c: [.5, .18, .5], r: .07, t: .2, rho: 1, T: 1, fuel: 0, vr: .4 } },
  'fire-column': { N: 96, sec: 1.6, alpha: 4, beta: .02, eps: 8, cool: 5, fade: 4, heat: 1.5, soot: .15, atlas: 1024, emissive: true, framePow: 1, turb: 1.3, freq: 9, densityScale: 5,
    src: { type: 'disc', c: [.5, .06, .5], r: .055, t: 1.6, ramp: .25, rho: 0, T: .3, fuel: .3, vy: 1 } },
  'explosion-fireball': { N: 128, sec: 1.6, alpha: .35, beta: .1, eps: 12, cool: 1.4, fade: .35, heat: 1.5, soot: .8, atlas: 2048, emissive: true, framePow: .6, turb: 1.2, freq: 5, densityScale: 1.2,
    src: { type: 'sphere', c: [.5, .2, .5], r: .045, t: .06, rho: 0, T: 1, fuel: 1, vr: 1.5 } },
  'ember-burst': { N: 96, sec: 1.2, alpha: .8, beta: 0, eps: 8, cool: 2, fade: 2, heat: 0, soot: 0, atlas: 1024, emissive: true, framePow: .6, turb: .6, freq: 6,
    src: { type: 'points', n: 40, c: [.5, .35, .5], r: .02, spread: .2, t: .1, rho: .5, T: 1, fuel: 0, vr: 1.2 } },
  'dust-ring': { N: 96, sec: 2.4, alpha: -.1, beta: .4, eps: 5, cool: 0, fade: .7, heat: 0, soot: 0, atlas: 1024, emissive: false, framePow: 1, turb: 1, freq: 4, densityScale: .8,
    src: { type: 'box', min: [.06, 0, .3], max: [.2, .06, .7], t: .2, rho: .18, T: 0, fuel: 0, v: [.5, -.05, 0], jit: .6 } },
};
