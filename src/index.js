export { Fx, createFx, register, registry, list } from './core/fx.js';
export { Stage } from './core/stage.js';
export { Emitter, makeRamp, KINDS } from './core/emitter.js';
export * as prims from './core/prims.js';
export { Dummy, Target, POSES } from './core/dummy.js';
export { makeRng, clamp, lerp, smooth, easeOut, easeIn, easeInOut, win } from './core/rng.js';
export { NOISE } from './core/glsl.js';
import { register } from './core/fx.js';
import { CATEGORIES } from './fx/index.js';
export { CATEGORIES };
/** Register every bundled effect. Call once (the gallery does). */
export function registerAll() { for (const c of Object.values(CATEGORIES)) for (const d of c) register(d); }
