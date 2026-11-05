// §3 preset table as data (docs/PLAN4.md §3). Domain = unit cube, velocities in domain/s.
export const PRESETS = {
  'smoke-puff': { N: 96, sec: 2, alpha: 1, beta: .1, eps: .3, cool: 1.5, fade: .25, heat: 0, soot: 0, atlas: 1024, emissive: false, framePow: 1,
    src: { type: 'sphere', c: [.5, .3, .5], r: .08, t: .15, rho: 1, T: .3, fuel: 0, vr: 1.2 } },
  'fire-column': { N: 96, sec: 1.6, alpha: 3, beta: .05, eps: .5, cool: 2.5, fade: .6, heat: 1.5, soot: .4, atlas: 1024, emissive: true, framePow: 1,
    src: { type: 'disc', c: [.5, .08, .5], r: .1, t: .4, rho: 0, T: .6, fuel: 1, vy: .8 } },
  'explosion-fireball': { N: 128, sec: 1.6, alpha: 1.5, beta: .1, eps: .6, cool: 1.2, fade: .3, heat: 2, soot: .8, atlas: 2048, emissive: true, framePow: .6,
    src: { type: 'sphere', c: [.5, .4, .5], r: .06, t: .05, rho: 0, T: 1, fuel: 2, vr: 4 } },
  'ember-burst': { N: 96, sec: 1.2, alpha: .8, beta: 0, eps: .8, cool: 2, fade: 0, heat: 0, soot: 0, atlas: 1024, emissive: true, framePow: .6,
    src: { type: 'points', n: 40, c: [.5, .3, .5], r: .01, t: .1, rho: .2, T: 1, fuel: 0, vr: 2.5 } },
  'dust-ring': { N: 96, sec: 2.4, alpha: -.2, beta: .3, eps: .35, cool: 0, fade: .2, heat: 0, soot: 0, atlas: 1024, emissive: false, framePow: 1,
    src: { type: 'box', min: [.1, 0, .3], max: [.3, .06, .7], t: .2, rho: 1, T: 0, fuel: 0, v: [2.5, -.3, 0] } },
};
