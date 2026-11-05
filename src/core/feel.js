import * as THREE from 'three';
// Feel tuning (PLAN4 §5): impact tiers and envelope curves. Values are data; fx.js and stage.js read them.
export const TIER = { // focal HDR peak, secondary max, fx.light peak, screen flash, hitStop frames, push m, blur, CA, desat
  1: { peak: 2, sec: 0.6, light: 40,  flash: 0,    stop: 2, push: 0.03, blur: 0,    ca: 0,     desat: 0 },
  2: { peak: 4, sec: 0.8, light: 120, flash: 0.08, stop: 3, push: 0.06, blur: 0.02, ca: 0.002, desat: 0.15 },
  3: { peak: 8, sec: 1.0, light: 400, flash: 0.15, stop: 4, push: 0.10, blur: 0.04, ca: 0.004, desat: 0.35 } };
export const ENV = {
  impact: (t, k = 6) => (t < 0 ? 0 : t < 2 / 60 ? 1 : Math.exp(-(t - 2 / 60) * k)),      // 2-frame peak, exp decay
  attack: (t, a = 0.05, k = 4) => (t < 0 ? 0 : t < a ? (t / a) ** 2 : Math.exp(-(t - a) * k)),
  anticip: (t, t0, t1) => { const u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0))); return u * u * u; }, // ease-in to the hit
};
export function tierOf(fx, p) { return TIER[p?.tier ?? fx.tier ?? 1] || TIER[1]; }

// feel: impact -> state (strength, world dir, tier, screen centre uv). Called from stage.play's impact listener.
export function feelHit(stage, e, fx) {
  const F = stage._feel, V = (a) => (Array.isArray(a) ? new THREE.Vector3(...a) : a.clone());
  F.t = 0; F.strength = e.strength ?? 1; fx.updateWorldMatrix(true, false);
  F.dir = V(e.dir ?? [0, -1, 0]).normalize().transformDirection(fx.matrixWorld);
  F.tier = tierOf(fx, e); F.ctr.set(.5, .5);
  if (e.pos) { stage.camera.updateMatrixWorld(); const p = V(e.pos).applyMatrix4(fx.matrixWorld).project(stage.camera); F.ctr.set(p.x * .5 + .5, p.y * .5 + .5); }
}
// per frame: final-pass uniforms + camera push vector stage._feel.v (stage adds it after shake, restores base). feel:false / feel.<k>:false switch parts off.
export function applyFeel(stage, dt) {
  const F = stage._feel, u = stage.finalPass.uniforms, f = stage.opts.feel, on = f !== false, g = (k) => on && f?.[k] !== false;
  const t = F.t;
  if (t === Infinity) { F.v.set(0, 0, 0); u.uBlur.value = u.uCA.value = u.uDesat.value = 0; return; }
  const T = F.tier, s = F.strength, TAU = 0.05;
  F.v.copy(F.dir).multiplyScalar(g('push') ? T.push * s * (t / TAU) * Math.exp(1 - t / TAU) : 0);
  u.uBlur.value = g('blur') ? T.blur * s * ENV.impact(t, 20) : 0;
  u.uCA.value = g('aberration') ? T.ca * s * ENV.impact(t, 20) : 0;
  u.uDesat.value = g('desat') ? T.desat * s * ENV.impact(t, 6) : 0;
  u.uCtr.value.copy(F.ctr);
  F.t += dt; if (t > 1) F.t = Infinity;
}
