// Shared helpers for the 22 skill categories: element ramps, grade scaling, a layer kit, SKILL/meta/act factories.
import * as THREE from 'three';
import { Dummy, POSES } from '../core/dummy.js';
import { smooth as sm, clamp } from '../core/rng.js';
import { burst, LCAP } from './_aaa.js'; import { ENV } from '../core/feel.js';
import './moves.js';
export { sm, clamp, POSES };
export const TAU = Math.PI * 2;

// life-order ramps (core -> mid -> edge -> fade): emitters, rings, beams, ribbons, slashes, trails, bolts
const R = (a, b, c, d) => [[0, a, 1], [0.3, b, 0.9], [0.7, c, 0.5], [1, d, 0]];
export const FIRE = R('#ffe9b0', '#ff9a30', '#c8300a', '#2a0800'), WATER = R('#e8fbff', '#4fb3ff', '#0b4f9c', '#021a3a'), EARTH = R('#d8c9a8', '#8a6a45', '#3b2c1c', '#140e08'), AIR = R('#f4fbff', '#bfe6ff', '#7fa8c9', '#2a3a4a');
export const STEAM = R('#fff3e0', '#e8eef2', '#9aa7b0', '#3a4248'), LAVA = R('#ffd27a', '#ff5a14', '#1b1210', '#050302'), STORM = R('#e4ecff', '#a8c8ff', '#5a6cff', '#10143a'), FROST = R('#dff6ff', '#7fd0ff', '#2a6fb5', '#0a1e3a'), SWAMP = R('#b6e35a', '#4e8a2a', '#1c3a14', '#081206'), DUNE = R('#ffe2a8', '#d9a65a', '#7a5a2c', '#2a1e0e');
export const PLASMA = R('#dff6ff', '#4de1ff', '#1b3cff', '#060a3a'), CRYO = R('#f2ffff', '#7fe8ff', '#1f6fa8', '#06203a'), NANO = R('#c9d3dc', '#35ffc0', '#3a424c', '#101418'), ION = R('#e6f4ff', '#3a8bff', '#14245e', '#050a20'), QUANTUM = R('#00f0ff', '#ff3df0', '#1a0b3a', '#05020e');
export const STEEL = R('#e8eef6', '#bfe0ff', '#3a6ab0', '#0a1430'), BLOOD = R('#ffd0c8', '#ff3a3a', '#7a0010', '#200004'), POISON = R('#e8ffc0', '#6aff4a', '#1a8a20', '#042006'), HOLY = R('#fff2d6', '#fff0b0', '#ffc040', '#5a3000');
export const VOID = R('#f0d8ff', '#9a50ff', '#3a1080', '#0a0218'), ARCANE = R('#efe4ff', '#d8b8ff', '#8a40f0', '#1a0640'), SPIRIT = R('#f0fff8', '#7affd8', '#1a9a8a', '#022a26'), NATURE = R('#f0ffd0', '#8ae04a', '#2a7a20', '#061a04');
// normal-blend ramps (smoke, dust, vapor, mud, sand): alpha rises, then falls
const N = (a, b, c) => [[0, a, 0], [0.15, b, 0.55], [1, c, 0]];
export const SMOKE = N('#3a342e', '#2e2924', '#141210'), DUST = N('#5a4a3a', '#3a3028', '#2a2420'), VAPOR = N('#e8eef2', '#dfe6ea', '#9aa7b0'), MUD = N('#3a3a1c', '#2c3016', '#10120a'), SAND = N('#6e5c40', '#5e4e36', '#2a2014');
// orb / shell / decal ramps are looked up dark -> bright
export const up = (r) => r.map(([u, c]) => [1 - u, c]).reverse();

export const VIEW = { side: { pos: [1.3, 1.7, 6.6], target: [1.1, 1.15, 0] }, wide: { pos: [1.8, 2.0, 8.6], target: [1.6, 1.0, 0] }, high: { pos: [1.4, 3.8, 7.2], target: [1.4, 0.7, 0] },
  body: { pos: [2.4, 1.6, 4.4], target: [0, 1.0, 0] }, long: { pos: [2.4, 1.9, 9.6], target: [2.4, 1.0, 0] }, sky: { pos: [1.4, 1.6, 8.4], target: [2.2, 2.0, 0], fov: 48 } };
export const meta = (cls, tier) => (elements, archetype, castTime, cooldown, range, shape) => ({ class: cls, tier, elements, archetype, castTime, cooldown, range, shape });
export const act = (kind, T, x = 4, o = {}) => ({ kind, target: x === false ? false : [x, 0, 0], windup: 0.5, hits: T == null ? [] : [{ t: T, stop: 0.06, shake: 0.3, amp: 0.04, push: 1.6 }], ...o });
export function SKILL(id, name, m, duration, def) { return { id, name, category: id.split('/')[0], loop: false, duration, meta: m, ...def, stage: { sky: def.sky || 'dusk', bloom: 0.45, view: VIEW[def.view || 'side'] } }; }

export const metal = (c = '#8a929c', e = '#000000', ei = 0) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: 0.28, emissive: e, emissiveIntensity: ei });
export const rock = (c = '#6c5a48') => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0.02, flatShading: true });
export const addMat = (c, k = 2, op = 1) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k), transparent: true, opacity: op, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
  blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });

export function grade(o = {}) { const g = Math.min(3, Math.max(1, Math.round(o.grade || 1))); return { g, s: [1, 1.15, 1.3][g - 1], b: [1, 1.15, 1.3][g - 1], extra: g - 1 }; }
const S = (v, s) => (v == null || typeof v === 'function' ? v : Array.isArray(v) ? v.map((x) => x * s) : v * s);
const I = (p, d, b, c = 99) => Math.min(c, (p.intensity ?? d) * b);
// V6: scorch stops never darker than #1a1410 (per-channel max)
const lift = (r) => r?.map((st) => { const c = new THREE.Color(st[1]), m = new THREE.Color('#1a1410'); return [st[0], '#' + c.setRGB(Math.max(c.r, m.r), Math.max(c.g, m.g), Math.max(c.b, m.b)).getHexString(), ...st.slice(2)]; });
const SOFT = /^(buff|heal|chain-heal|shield|totem|decoy|link-beam|nova-cleanse|life-steal|rewind-area|lift-area|slow-field|ground-slow|cloud-block|wall|ring-wall)|^teleport(-wind|-portal|-glitch)?$/; // non-impact (soft) archetypes
/** layer kit: fx builders with grade size (s) and brightness (b) applied, skill ramp as default. */
export function kit(fx, o, ramp) {
  const G = grade(o), s = G.s, b = G.b, pr = fx.pal(ramp), col = (i) => pr[i][1];
  const k = { G, g: G.g, s, b, col, ramp: pr,
    em: (p) => fx.emitter({ ramp: pr, ...p, size: S(p.size ?? 0.3, s), radius: S(p.radius, s), radiusIn: S(p.radiusIn, s), shapeSize: S(p.shapeSize, s), intensity: I(p, 1, b) }),
    smoke: (p) => k.em({ kind: 'smoke', blend: 'normal', lit: 1, order: -1, ramp: SMOKE, ...p }),
    ring: (p) => fx.ring({ ramp: pr, fill: 0, ...((p.normal ?? 'up') === 'up' ? { refract: 0.015, dark: 0.25 } : p.normal === 'cam' ? { refract: 0.008 } : {}), ...p, r: S(p.r, s), width: S(p.width ?? [0.12, 0.03], s), intensity: I(p, 0.6, b, 1) }),
    orb: (p) => fx.orb({ ramp: up(pr), ...p, r: S(p.r, s), intensity: I(p, 1.2, b, 2.5) }),
    shell: (p) => fx.shell({ ramp: up(pr), ...p, r: S(p.r, s), intensity: I(p, 1, b, 1.5) }),
    beam: (p) => fx.beam({ ramp: pr, ...p, r: S(p.r ?? 0.1, s), intensity: I(p, 1, b, 2.5) }),
    ribbon: (p) => fx.ribbon({ ramp: pr, ...p, intensity: I(p, 1.5, b, 1.5) }),
    slash: (p) => fx.slash({ ramp: pr, tail: 0.8, sweep: [0, 1.4], ...p, radius: S(p.radius ?? 1.3, s), width: S(p.width ?? 0.2, s), intensity: I(p, 2.6, b, 2.6) }),
    trail: (p) => fx.trail({ ramp: pr, ...p, width: S(p.width ?? 0.06, s), intensity: I(p, 2, b, 1.5) }),
    bolt: (p) => fx.bolt({ ramp: pr, ...p, width: S(p.width ?? 0.05, s), intensity: I(p, 2, b, 3) }),
    decal: (p) => { const q = { ramp: up(pr), ...p }; return fx.decal({ ...q, ramp: q.kind === 'scorch' ? lift(q.ramp) : q.ramp, r: S(p.r, s), intensity: I(p, 1.2, b, 1.2) }); },
    light: (p) => fx.light({ color: col(1), range: 9, norm: 40, ...p, intensity: Math.min(LCAP[G.g], I(p, 50, b) * (G.g === 3 ? 1.3 : 1)) }),
    at: (n = 'handR') => { n = { armR: 'handR', armL: 'handL' }[n] || n; const tg = n.startsWith('tgt'), nm = tg ? n.slice(3).toLowerCase() || 'chest' : n; // follow: live anchor
      return (m) => { (tg ? fx.target : fx.body).point(nm, m.position); fx.worldToLocal(m.position); }; },
    sparks: (pos, t, n = 40, p = {}) => k.em({ count: n, kind: 'spark', shape: 'point', pos, dir: [0, 1, 0], spread: 1.4, speed: [2, 7], life: [0.25, 0.7], gravity: [0, -9, 0], size: [0.07, 0.02], stretch: 1.5, intensity: 3, delay: t, t0: t - 0.02, emit: 0.001, ...p }),
    glint: (pos, t, size = 1) => k.em({ count: 1, kind: 'glint', shape: 'point', pos, size: [size, size * 0.3], life: [0.22, 0.22], intensity: 3, delay: t, t0: t - 0.02, emit: 0.001 }),
    gather: (pos, t0, dur, Rr = 1, n = 40, follow) => k.em({ count: n, kind: 'soft', shape: 'sphere', radius: Rr, radiusIn: Rr * 0.7, pos, radial: 1, speed: [-2.2 * Rr * s, -1.6 * Rr * s], life: [0.4, 0.45], size: [0.06, 0.02], intensity: 1.2, delay: t0, emit: dur, t0, t1: t0 + dur + 0.45, follow }),
    impact: (pos, t, n = 50, r = 1.2) => { k.sparks(pos, t, n); k.glint(pos, t, 1); burst(fx, pos, t, { tier: G.g, ramp: pr, col: col(1), r: r * 3 }); },
    extras: (pos, t, cls) => { const soft = cls === 'E' || (!cls && SOFT.test(fx.def.meta?.archetype || ''));
      if (G.g >= 2) fx.flash(t + 0.12, 0.1, col(1), [0, 0, 0.06, 0.1][G.g]);
      if (soft) { fx.light({ color: col(1), pos: [pos[0], pos[1] + 0.5, pos[2] + 0.8], range: 9, intensity: LCAP[G.g] * 0.5, t0: t, dur: 0.9, env: (u) => ENV.attack(u - t, 0.08, 4) });
        if (G.g === 3) k.ring({ t0: t + 0.1, dur: 0.6, r: [0.2, 2.4], normal: 'up', pos: [pos[0], 0.02, pos[2]], intensity: 0.5 }); return; }
      burst(fx, pos, t, { tier: G.g, ramp: pr, col: col(1), dir: cls === 'B' ? [1, 0, 0] : [0, -1, 0] });
      if (G.g === 3) { k.sparks(pos, t + 0.1, 40, { speed: [3, 9] }); k.glint(pos, t + 0.1, 1.8); } },
    pop: (obj, t0, t1, t2, t3, fn) => fx.mesh(obj, (t) => { const u = sm(t0, t1, t) * (1 - sm(t2, t3, t)); obj.visible = u > 0.01; obj.scale.setScalar(Math.max(1e-3, u * s)); if (fn) fn(t, u); }, { t0: -5, dur: 99 }),
    ghost: (pose, pos, t0, dur, a = 0.6) => { const d = new Dummy(); d.setPose(POSES[pose] || POSES.idle); d.position.set(...pos); d.set({ holo: 1, scanCol: col(1), alpha: a }); return fx.mesh(d, (t, pr) => d.set({ alpha: a * (1 - pr) }), { t0, dur }); },
  };
  return k;
}
