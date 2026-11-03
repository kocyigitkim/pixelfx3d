# Plan: Work Package 2 (162 MMORPG skills) for a sequential Haiku coder

## 0. What I checked in the code (these facts shape the plan)

- **`o.grade` already reaches `build`.** `createFx(def, opts)` calls `new Fx(def, o)`, which calls `def.build(this, o)` (src/core/fx.js:22). `Stage.play(def, opts)` passes `opts` through and only merges `countScale` (stage.js:87). `def.meta` is never copied or removed; `fx.def` is the original object. **No change to src/core is needed.**
- **Ramp direction depends on the builder.** Emitter, ring, beam, ribbon, slash, trail and bolt ramps run bright → dark, in life order. Orb, shell and decal ramps are looked up by intensity, so they run dark → bright. `_skill.js` exports `up(r)` to flip a ramp, and the kit applies it automatically.
- **Inward ("gather") motion:** the emitter supports `radial>0` with a negative `speed`, which gives inward velocity (emitter.js:60-62). There is no other pull feature.
- **Voronoi decals are `cracks` and `frost`.** The limit is 2 per effect. `glow`, `rune`, `scorch` and `rings` have no limit.
- **`follow` exists only on `emitter` and `orb`.** For rings, decals and lights, move `part.obj` / `light.l` in `fx.on`.
- **Existing poses:** idle, guard, windupHigh, cut, follow, sideBack, sideCut, overheadUp, smashDown, pullback, lunge, castCharge, castRelease, castUp, crouch, leap, land, throwBack, throwFwd, upLow, upHigh, daggerA, daggerB, sweepBack, sweepCut, thrustBack, smashGround, hurt.
  - moves.js adds bowDraw, bowRelease, runA, runB, runAir, dashLow, slashBack, overhead2, vanish and behind when it is imported.
  - Act kinds: slash, sideslash, smash, thrust, cast, castup, stomp, throw, none, plus custom `keys`.
  - Weapons: sword, hammer, spear, dagger, scythe, whip, staff.
- **Reusable melee code:** `src/fx/melee.js` exports `swing`, `contact`, `bladeTable` and `sweepSurface`. Reuse them.
- **`gallery/test.html` `__play(id, opts)` already accepts opts**, but `shots.mjs` calls `__play(id)` with no opts. The 4th `shots.mjs` argument is already appended to the test.html URL.
- **Particle count:** `tools/perf.mjs` counts particles as `sum(part.mesh.geometry.instanceCount)` and needs a real GPU. Step A5 adds the same count to `shots.mjs`, so `grade=3` runs check the 900 limit.
- **index.d.ts** has no `grade` or `meta` fields. Add them (types only).

---

## A. Infrastructure steps (do these first, in order)

### A1. Types only (src/core is unchanged)
`index.d.ts`:
- In `interface FxOptions` add `grade?: 1 | 2 | 3;`
- In `interface EffectDef` add `meta?: { class: string; tier: 'class'|'base'|'derived'|'tech'|'quantum'; elements: string[]; archetype: string; castTime: number; cooldown: number; range: number; shape: string };`

### A2. New file `src/fx/_skill.js` (exact code)
`_skill.js` has no default export, and `index.js` must never import it as a category.

```js
// Shared helpers for the 22 skill categories: element ramps, grade scaling, a layer kit, SKILL/meta/act factories.
import * as THREE from 'three';
import { Dummy, POSES } from '../core/dummy.js';
import { smooth as sm, clamp } from '../core/rng.js';
import './moves.js'; // side effect: registers bowDraw, bowRelease, runA, runB, runAir, dashLow, slashBack, overhead2, vanish, behind in POSES
export { sm, clamp, POSES };
export const TAU = Math.PI * 2;

// life-order ramps (core -> mid -> edge -> fade): emitters, rings, beams, ribbons, slashes, trails, bolts
const R = (a, b, c, d) => [[0, a, 1], [0.3, b, 0.9], [0.7, c, 0.5], [1, d, 0]];
export const FIRE = R('#ffe9b0', '#ff9a30', '#c8300a', '#2a0800'), WATER = R('#e8fbff', '#4fb3ff', '#0b4f9c', '#021a3a'), EARTH = R('#d8c9a8', '#8a6a45', '#3b2c1c', '#140e08'), AIR = R('#f4fbff', '#bfe6ff', '#7fa8c9', '#2a3a4a');
export const STEAM = R('#fff3e0', '#e8eef2', '#9aa7b0', '#3a4248'), LAVA = R('#ffd27a', '#ff5a14', '#1b1210', '#050302'), STORM = R('#ffffff', '#a8c8ff', '#5a6cff', '#10143a'), FROST = R('#dff6ff', '#7fd0ff', '#2a6fb5', '#0a1e3a'), SWAMP = R('#b6e35a', '#4e8a2a', '#1c3a14', '#081206'), DUNE = R('#ffe2a8', '#d9a65a', '#7a5a2c', '#2a1e0e');
export const PLASMA = R('#ffffff', '#4de1ff', '#1b3cff', '#060a3a'), CRYO = R('#f2ffff', '#7fe8ff', '#1f6fa8', '#06203a'), NANO = R('#c9d3dc', '#35ffc0', '#3a424c', '#101418'), ION = R('#e6f4ff', '#3a8bff', '#14245e', '#050a20'), QUANTUM = R('#00f0ff', '#ff3df0', '#1a0b3a', '#05020e');
export const STEEL = R('#ffffff', '#bfe0ff', '#3a6ab0', '#0a1430'), BLOOD = R('#ffd0c8', '#ff3a3a', '#7a0010', '#200004'), POISON = R('#e8ffc0', '#6aff4a', '#1a8a20', '#042006'), HOLY = R('#ffffff', '#fff0b0', '#ffc040', '#5a3000');
export const VOID = R('#f0d8ff', '#9a50ff', '#3a1080', '#0a0218'), ARCANE = R('#ffffff', '#d8b8ff', '#8a40f0', '#1a0640'), SPIRIT = R('#f0fff8', '#7affd8', '#1a9a8a', '#022a26'), NATURE = R('#f0ffd0', '#8ae04a', '#2a7a20', '#061a04');
// normal-blend ramps (smoke, dust, vapor, mud, sand): alpha rises, then falls
const N = (a, b, c) => [[0, a, 0], [0.15, b, 0.55], [1, c, 0]];
export const SMOKE = N('#3a342e', '#2e2924', '#141210'), DUST = N('#6b5d4a', '#8a7a62', '#40382c'), VAPOR = N('#e8eef2', '#dfe6ea', '#9aa7b0'), MUD = N('#3a3a1c', '#2c3016', '#10120a'), SAND = N('#c9a66a', '#d9b27a', '#7a5a2c');
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
const I = (p, d, b) => (p.intensity ?? d) * b;
/** layer kit: fx builders with grade size (s) and brightness (b) applied, skill ramp as default. */
export function kit(fx, o, ramp) {
  const G = grade(o), s = G.s, b = G.b, pr = fx.pal(ramp), col = (i) => pr[i][1];
  const k = { G, g: G.g, s, b, col, ramp: pr,
    em: (p) => fx.emitter({ ramp: pr, ...p, size: S(p.size ?? 0.3, s), radius: S(p.radius, s), radiusIn: S(p.radiusIn, s), shapeSize: S(p.shapeSize, s), intensity: I(p, 1, b) }),
    smoke: (p) => k.em({ kind: 'smoke', blend: 'normal', lit: 1, order: -1, ramp: SMOKE, ...p }),
    ring: (p) => fx.ring({ ramp: pr, ...p, r: S(p.r, s), width: S(p.width ?? [0.2, 0.05], s), intensity: I(p, 1.2, b) }),
    orb: (p) => fx.orb({ ramp: up(pr), ...p, r: S(p.r, s), intensity: I(p, 1.2, b) }),
    shell: (p) => fx.shell({ ramp: up(pr), ...p, r: S(p.r, s), intensity: I(p, 1, b) }),
    beam: (p) => fx.beam({ ramp: pr, ...p, r: S(p.r ?? 0.1, s), intensity: I(p, 1, b) }),
    ribbon: (p) => fx.ribbon({ ramp: pr, ...p, intensity: I(p, 1.5, b) }),
    slash: (p) => fx.slash({ ramp: pr, tail: 0.8, sweep: [0, 1.4], ...p, radius: S(p.radius ?? 1.3, s), width: S(p.width ?? 0.2, s), intensity: I(p, 2.6, b) }),
    trail: (p) => fx.trail({ ramp: pr, ...p, width: S(p.width ?? 0.06, s), intensity: I(p, 2, b) }),
    bolt: (p) => fx.bolt({ ramp: pr, ...p, width: S(p.width ?? 0.05, s), intensity: I(p, 2, b) }),
    decal: (p) => fx.decal({ ramp: up(pr), ...p, r: S(p.r, s), intensity: I(p, 1.2, b) }),
    light: (p) => fx.light({ color: col(1), range: 9, norm: 40, ...p, intensity: I(p, 50, b) * (G.g === 3 ? 1.3 : 1) }),
    at: (side = 'armR') => (m) => { fx.body[side].hand.getWorldPosition(m.position); fx.worldToLocal(m.position); },
    sparks: (pos, t, n = 40, p = {}) => k.em({ count: n, kind: 'spark', shape: 'point', pos, dir: [0, 1, 0], spread: 1.4, speed: [2, 7], life: [0.25, 0.7], gravity: [0, -9, 0], size: [0.07, 0.02], stretch: 1.5, intensity: 3, delay: t, t0: t - 0.02, emit: 0.001, ...p }),
    glint: (pos, t, size = 1) => k.em({ count: 1, kind: 'glint', shape: 'point', pos, size: [size, size * 0.3], life: [0.22, 0.22], intensity: 3, delay: t, t0: t - 0.02, emit: 0.001 }),
    gather: (pos, t0, dur, Rr = 1, n = 40, follow) => k.em({ count: n, kind: 'soft', shape: 'sphere', radius: Rr, radiusIn: Rr * 0.7, pos, radial: 1, speed: [-2.2 * Rr * s, -1.6 * Rr * s], life: [0.4, 0.45], size: [0.06, 0.02], intensity: 2, delay: t0, emit: dur, t0, t1: t0 + dur + 0.45, follow }),
    impact: (pos, t, n = 50, r = 1.2) => { k.sparks(pos, t, n); k.glint(pos, t, 1); k.ring({ t0: t, dur: 0.4, r: [0.1, r], normal: 'cam', pos }); k.light({ pos: [pos[0] - 0.3, pos[1] + 0.3, pos[2] + 0.6], t0: t - 0.02, dur: 0.6, fade: [0.01, 0.45], intensity: 70 }); fx.shake(t, 0.3, 0.025 * s); },
    extras: (pos, t) => { if (G.g >= 2) fx.flash(t + 0.12, 0.1, col(1), 0.12); if (G.g < 3) return; k.ring({ t0: t + 0.1, dur: 0.5, r: [0.2, 2.4], width: [0.25, 0.04], normal: 'cam', pos, intensity: 1.6 }); k.sparks(pos, t + 0.1, 40, { speed: [3, 9] }); k.glint(pos, t + 0.1, 1.8); k.light({ pos: [pos[0], pos[1] + 0.5, pos[2] + 0.8], t0: t + 0.08, dur: 0.6, fade: [0.01, 0.5], intensity: 120 }); },
    pop: (obj, t0, t1, t2, t3, fn) => fx.mesh(obj, (t) => { const u = sm(t0, t1, t) * (1 - sm(t2, t3, t)); obj.visible = u > 0.01; obj.scale.setScalar(Math.max(1e-3, u * s)); if (fn) fn(t, u); }, { t0: -5, dur: 99 }),
    ghost: (pose, pos, t0, dur, a = 0.6) => { const d = new Dummy(); d.setPose(POSES[pose] || POSES.idle); d.position.set(...pos); d.set({ holo: 1, scanCol: col(1), alpha: a }); return fx.mesh(d, (t, pr) => d.set({ alpha: a * (1 - pr) }), { t0, dur }); },
  };
  return k;
}
```
Fixed rules for Haiku:
- `k.extras(pos, t)` is called **once** in every skill, at the main impact or release. It adds the grade-2 second flash and the grade-3 flourish: a ring, 40 sparks, a glint and a stronger light. That is 41 particles at grade 3.
- `k.pop` scales the object uniformly. For meshes that must not scale uniformly, wrap them in a `THREE.Group` and change the child scale inside `fn`.
- No phase helper. The timeline rule for every skill:
  - wind-up from `-act.windup` to 0 (body:true skills: 0 to 0.3)
  - release at t=0 (body:true skills: 0.3)
  - impact at T (from the spec)
  - aftermath from T to `duration`, and it must last at least 0.5 s

### A3. Poses: add two to `POSES` in src/core/dummy.js
Insert before the `hurt:` line, keeping the existing order:
```js
  roar: P({ aR: 35, eR: 30, aL: 35, eL: 30, lean: 14, head: 14, py: 0.9, tR: 16, kR: -28, tL: -16, kL: -24 }), armsWide: P({ aR: 125, eR: 8, rR: 40, aL: 125, eL: 8, rL: 40, lean: 6, py: 0.95 }),
```
Use all other poses as they are. Leap, spin and teleport are done with `fx.on` body position and rotation (see templates), not with new poses.

For `body:true` skills, call `fx.body.setPose(POSES.<name>)` once in `build`. Pose keys only run with `act`, so the pose stays.

### A4. gallery/index.html (exact edits)
1. After `<div id="cats"></div>` add:
   `<div id="filt" style="display:flex;gap:6px;padding:0 12px 10px"><select id="tier"></select><select id="elem"></select></div>`
2. In `#bar`, after the palette `<label>`, add:
   `<label>grade <select id="grade"><option>1</option><option>2</option><option>3</option></select></label>`
   This is a select, not radio buttons: it matches the existing palette control and is less markup.
3. After the line `const total = ...;` add:
```js
const defs = [...registry.values()], fill = (sel, label, vals) => { sel.add(new Option(label, '')); for (const v of [...new Set(vals)].sort()) sel.add(new Option(v, v)); };
fill($('#tier'), 'all tiers', defs.map((d) => d.meta?.tier).filter(Boolean)); fill($('#elem'), 'all elements', defs.flatMap((d) => d.meta?.elements || []));
```
4. In `visible()`, before `&& (!q ||`, add:
   `&& (!$('#tier').value || d.meta?.tier === $('#tier').value) && (!$('#elem').value || (d.meta?.elements || []).includes($('#elem').value))`
5. In `opts()`, change the return to `{ seed: ..., palette: ..., flip: ..., grade: +$('#grade').value }`.
6. In `select()`, after the `$('#meta').textContent = ...;` statement add:
   `if (d.meta) $('#meta').textContent += ` · ${d.meta.class} · ${d.meta.elements.join(', ')} · cast ${d.meta.castTime}s · cd ${d.meta.cooldown}s`;`
7. Change `$('#q').oninput = drawList;` to `$('#q').oninput = $('#tier').onchange = $('#elem').onchange = drawList;`
8. Change `for (const id of ['pal', 'seed', 'flip'])` to `['pal', 'seed', 'flip', 'grade']`.

### A5. Grade in renders plus a particle check
- `gallery/test.html`: replace the `__play` line with:
  `window.__play = (id, opts = q.has('grade') ? { grade: +q.get('grade') } : {}) => { stage.autoReplay = false; stage.play(id, opts); return stage.fx.duration; };`
- `tools/shots.mjs`: after `dur = await pg.evaluate((id) => window.__play(id), id);`, inside the same try, add:
  `const np = await pg.evaluate(() => window.__stage.fx.parts.reduce((n, p) => n + (p.mesh?.geometry?.instanceCount || 0), 0)); if (np > 900) errs.push(`PARTICLES ${id} ${np}`);`
- Usage: `node tools/shots.mjs /tmp/w1/g3 cat:warrior 0.4 grade=3`. Filenames are the same for every grade, so use one output directory per grade.

### A6. src/fx/index.js and README
- In the step that **creates** a category file (never earlier), append `import <cat> from './<cat>.js';` to the import lines and add `<cat>` to the end of `CATEGORIES`. Final form:
```js
import warrior from './warrior.js'; import rogue from './rogue.js'; import archer from './archer.js'; import mage from './mage.js'; import priest from './priest.js'; import shaman from './shaman.js'; import dark from './dark.js';
import pyro from './pyro.js'; import hydro from './hydro.js'; import geo from './geo.js'; import aero from './aero.js';
import steam from './steam.js'; import lava from './lava.js'; import storm from './storm.js'; import frost from './frost.js'; import swamp from './swamp.js'; import dune from './dune.js';
import plasma from './plasma.js'; import cryo from './cryo.js'; import nano from './nano.js'; import ion from './ion.js'; import quantum from './quantum.js';
export const CATEGORIES = { moves, fire, explosions, water, ice, lightning, scifi, melee, impacts, projectiles, spawn, arcane, holy, shadow, status, nature, weather, ui, pickups, transitions, critters,
  warrior, rogue, archer, mage, priest, shaman, dark, pyro, hydro, geo, aero, steam, lava, storm, frost, swamp, dune, plasma, cryo, nano, ion, quantum };
```
- README, after the "No images, no sprite sheets" paragraph (last step of wave 5): `**406 effects in 43 categories**: 244 classic effects plus 162 MMORPG skills in 22 skill categories (warrior … quantum). Each skill has 3 grades: \`stage.play(id, { grade: 1 | 2 | 3 })\`.`

---

## B. Per-category coding

### B0. File skeleton and templates (copy these; the tables fill in the parameters)

**File header (every category file):**
```js
import * as THREE from 'three';
import { kit, SKILL, meta, act, sm, clamp, TAU, POSES, metal, rock, addMat, up, SMOKE, DUST, VAPOR, MUD, SAND, /* ramps used */ } from './_skill.js';
import { swing, contact, bladeTable } from './melee.js';   // only if T-MEL / T-WHP is used
const m = meta('<category>', '<tier>');                   // tier: class | base | derived | tech | quantum
export default [ SKILL('<cat>/<name>', '<Name>', m([...elements], '<archetype>', ct, cd, range, '<shape>'), DUR, { view: '<view>', sky: '<sky>', act: ..., build(fx, o) { const k = kit(fx, o, RAMP); /* layers */ } }), ... ];
```

**Fixed points (fx-local):**
- O=[0,0,0]
- A (cast hand) = [0.6,1.38,0.2]
- C (melee contact) = [1.62,1.2,0.1], with target x=1.85
- T (ranged hit) = [3.8,1.2,0], with target x=4
- G (ground target) = [3,0,0], with target x=3

Rows that give other points override these.

**Layer shorthand used in the tables:** every call goes through `k.`.
- `em(kind n shape r @pos t=d/e life spd sz i)` means `k.em({ kind, count:n, shape, radius:r, pos, delay:d, emit:e, t0:d-0.02, life, speed, size, intensity:i })`.
- `smoke(...)`, `ring(r0→r1 @pos t0/dur normal)`, `orb`, `shell`, `beam`, `decal(kind r @pos t0/dur)` and `light(I @pos t0/dur)` take the same keys.
- `swingS(h)` means `swing(fx, { t0: h-0.07, t1: h+0.13, len: 0.12, inner: 0.6, outer: 1.05, c0: k.col(0), c1: k.col(1), c2: k.col(2), intensity: 1.4*k.b, edge: 3 })`.
- `ct(p,h,n)` means `contact(fx, p, h, { hot: k.col(0), mid: k.col(1), cold: k.col(2), light: k.col(1), glintCol: k.col(1), sparks: n })`. This is n+2 particles.
- Particle cost: `sparks(n)`=n, `glint`=1, `impact(n)`=n+1, `gather(n)`=n, `extras`=41 at grade 3.
- **Grade columns:** `g2:` is a layer wrapped in `if (k.g >= 2) {...}`. `g3:` is a layer wrapped in `if (k.g === 3) {...}`.
- **P3** is the total particle count at grade 3, including extras. It must be ≤900. After coding, add up the `count` values for each skill and write the number in a comment `// P3=…` above `build`.

**Templates.** These are code skeletons. The base layers and their particle counts are included in P3.
- **T-MEL** (melee combo or strike): `act` with `keys` and `hits`. For each hit time h: `swingS(h)` and `ct(C or row point, h, n)`. Then the row's extra layers, then `k.extras(C, lastHit)`.
  - COMBO3 keys (copy from moves/sword-combo): `[[-0.45,'guard'],[-0.2,'windupHigh'],[0,'cut','snap'],[0.14,'follow'],[0.34,'sideBack'],[0.47,'sideCut','snap'],[0.62,'follow'],[0.84,'overheadUp'],[0.98,'smashDown','snap'],[1.5,'smashDown'],[2.0,'guard']]`, hits at 0.02, 0.49, 1.0.
- **T-SPIN:** copy melee/spin-slash. `rotY(t)` turns the body N full turns over [t0, t1], set with `fx.on((t)=>fx.body.rotation.y=rotY(t))`. Then `bladeTable(...,rotY)`, `sweepSurface`, `trail`, a ring with `normal:'up'` at y 1.2, and the row's layers.
- **T-PRJ:**
```js
const A=[0.6,1.38,0.2], B=[3.8,1.2,0], T=ROW_T, H=ROW_H; const P=(t)=>{const u=clamp(t/T);return [A[0]+(B[0]-A[0])*u, A[1]+(B[1]-A[1])*u+H*Math.sin(Math.PI*u), A[2]*(1-u)];}; const fol=(mm,ta,t)=>mm.position.set(...P(t));
k.gather(O,-0.45,0.4,0.7,40,k.at());                                    // 40
/* hero from the row (orb or mesh) follows P over [-0.1,T] */
k.trail({path:P,t0:0,dur:T+0.05,len:0.3,width:0.12});
k.em({count:60,kind:'soft',shape:'sphere',radius:0.1,dir:[-1,0,0],spread:0.8,speed:[0.3,1],life:[0.25,0.45],size:[0.12,0.03],intensity:0.8,delay:0,emit:T,t0:0,t1:T+0.5,follow:fol}); // 60
k.impact(B,T,60,1.6); k.extras(B,T);                                     // 61 + 41
```
  Base = 161 + 41.
- **T-NOV:** `k.gather([0,1,0],-0.45,0.4,1.4,60)`; then:
  - `ring(0.2→4.5 up t0/0.7 width[.4,.08] fill .08)`
  - `ring(0.2→2.6 cam @[0,1,0] 0.02/0.45)`
  - `shell(r[.3,2.4] hemi power 2 0/0.45 fade[0,.35])`
  - `em(row kind 120 ring r.5 @[0,.6,0] radial 1 spd[4,8] life[.4,.9] t=0/.001)`
  - `decal(glow r[1.5,2.5] 0/dur-.1 fade[.05,1])`
  - `light(120 @[0,1.4,.8] t-0.4/1.4 env t<0?.3:exp(-2.5t))`
  - `fx.flash(0,.12,k.col(0),.2)`
  - Base = 180 + 41.
- **T-GND** (ground area with delay): `decal(rune r1.6 @G t-0.4/T+0.6 reveal .5 glyphs 14 poly 6 spin .4)`, `ring(R→0.3 up @G T-0.3/0.3 decay .2)` (closes in), then the row's payload at T. Light and shake at T.
- **T-BEAM:** `beam({from:A,to:B,r:[.12,.16],t0:0,dur:D,fade:[.03,.2],noise:.6,edge:1.4})` plus a core `beam(r .05, intensity 2.5)`. Then `em(soft 30 point @A emit D)`, `sparks(B, 0, 80, {emit:D, speed:[1,4]})`, `decal(scorch r[.4,1] @[B.x,0,0])`, and `light(@B env (t)=>0.8+0.2*Math.sin(TAU*8*t/D))`. Act hits every 0.4 s with stop .02, shake .1, push .5. Base = 110.
- **T-BUF / T-HEL** (`body:true`, buffs and heals; D = duration): `fx.body.setPose(POSES.<row>)`; then:
  - `fx.on((t)=>{const u=sm(.15,.45,t)*(1-sm(D-.6,D,t)); fx.body.set({rim:k.col(1),rimAmt:1.1*u*k.b,tint:k.col(1),tintAmt:.12*u,glow:.25*u});})`
  - `k.gather([0,1,0],0,0.3,1.2,30)`
  - `ring(0.2→1.6 up 0.3/0.6)`
  - `light(40 @[0,1.2,.6] 0/D fade[.1,.6] env (t)=>.7+.3*Math.sin(TAU*3*t/D))`
  - `fx.flash(.3,.1,k.col(0),.12)`
  - `k.extras([0,1.1,0],0.3)`
  - Base = 30 + 41 plus the row's layers.
- **T-DSH** (dash): `const X=(t)=>t<t0?x0:t<0?x0+(x1-x0)*sm(t0,0,t):x1; fx.on((t)=>{fx.body.position.x=X(t);});`
  - Act keys: `[[-0.5,'guard'],[t0,'dashLow'],[0,'lunge','snap'],[0.3,'lunge'],[0.9,'guard']]`.
  - 4 speed ribbons at y .5/.8/1.1/1.4: `points:(t)=>{const x=X(clamp(t,t0,0));return [[x-1.4,y,z],[x-.6,y,z],[x,y,z]];}`, `head:()=>1.001`, width .025, fade [.03,.12].
  - `em(dust 30 line shapeSize[(x1-x0)/2,0,0] @[(x0+x1)/2,.05,0] dir[-1,.2,0] normal lit ramp DUST t=t0/0.3)`
  - `ct([x1+0.4,1.2,0.1],0.02,40)`
  - Base = 72.
- **T-LEP** (leap and slam): act `stomp`, windup .65, hits `{t:0,stop:.1,shake:.55,amp:.08,push:2}`. Body x moves from 0 to Lx over [-0.3,0] (`fx.on`). Impact point P=[Lx+0.1,0,0]:
  - `ring(.2→5.5 up @P 0/.9 width[.35,.08])`
  - `decal(cracks r[3,3.6] @P 0/dur-.1 reveal .3 heat[1,.1] cells 4)`
  - `decal(scorch r[1,1.4] @P)`
  - `em(rock 24 disc r.3 @P spd[3,7.5] gravity -10 bounce .35 normal lit ramp [[0,'#6c5a48'],[1,'#6c5a48',1]])`
  - `smoke(dust 50 ring r.4 @P radial .9 spd[1.5,4.5] ramp DUST)`
  - `sparks(P,0,40)`
  - `light(90 @[P.x,1,.8] env exp(-2.4t))`
  - `fx.flash(0,.15,k.col(0),.22)`
  - Base = 114.
- **T-TEL** (teleport, copy the moves/shadow-step pattern): switch time TS, from x Ax to Bx.
```js
fx.on((t)=>{const b=fx.body; if(t<TS){b.position.x=Ax; const q=sm(TS-.35,TS,t); b.set({dissolve:q<.002?-1:q,dDir:-1,edge:k.col(1),edgeW:.09,edgeInt:4});} else {b.position.x=Bx; b.rotation.y=ROT; const q=1-sm(TS,TS+.25,t); b.set({dissolve:q<.002?-1:q,dDir:1,edge:k.col(1),edgeW:.09,edgeInt:4});}});
```
  Plus `ring(.2→1.6 up)` at A at TS-0.3 and at B at TS.
- **T-WHP** (whip): copy `melee/whip-crack` `pts(t)` and its two ribbons. Replace the ramps with `k.ramp`, multiply widths by `k.s`, and set the outer ribbon blend to additive (remove `blend:'normal'`). Particles along the whip: 6 emitters, each `follow:(mm,ta,t)=>mm.position.set(...pts(t)[4*i+4])`. Tip T=[2.2,1.35,0.1]: `ct(T,0,n)`.
- **T-VOL** (volley): for each projectile i, a straight or bezier path `Pi(t)` with start ti and flight time f, `k.trail({path:Pi,t0:ti,dur:f+.05,len:.15,width:w})`, and `sparks(Bi, ti+f, n)` at its end.
- **T-ORB** (orbit, then fire): object i at angle `a=a0_i+ω t`, position `[R cos a, y, R sin a]` until Tf, then a lerp to the target over [Tf, Tf+f]. Each object is a mesh (`fx.mesh(obj,(t)=>obj.position.set(...Pi(t)),{t0:-0.2,dur:Tf+f+0.05})`) with a trail on `Pi`.
- **T-SUM / T-TOTEM / T-WAL:** build the mesh group, place it with `k.pop(group, t0, t1, t2, t3, fn)`, add a rune decal under it, a ring with `normal:'up'` when it rises, and smoke dust 30 (ramp DUST).
- **T-PUL** (pull): `k.em({... shape:'sphere', radius:R, radial:1, speed:[-2R,-1.4R], swirl:3, emit:E})` aimed at the center, `ring(R→.3 up)` repeated, the target pulled with `fx.on((t)=>fx.target.position.x = X0 - dx*sm(a,b,t))`, then a burst at the end.

**Tech rule (plasma, cryo, nano, ion):** every skill has at least one `fx.mesh` solid part using `metal()`. Emissive details use `addMat`. The ground mark is `decal(rune poly 6 glyphs 6)`. Use `flicker:0` on core lights. Use vapor (`VAPOR`) or sparks, never `SMOKE`. Use straight segments: ribbons get `points` as straight polylines.

**Steam rule:** the visible vapor is `k.smoke({ramp:VAPOR})` (normal blend, lit). The STEAM ramp is only for additive glow, at intensity ≤0.5. Always add an orange inner glow (FIRE ramp, soft particles).

---

### WAVE 1. Class skills (tier `class`, meta class = category)

#### Step B1. Create `src/fx/warrior.js` (skills 1-5) and add it to index.js. Step B2: append skills 6-10.
| # | id | meta (elements; archetype; ct/cd/range/shape) | dur | act | view·ramp | layers (after the template) | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|crescent-chain|steel; melee-combo; .4/6/2.5/arc|1.9|COMBO3, sword, target 1.85, hits .02(stop .06 push .9) .49(.07,1.2) 1.0(.13,2.4,flash .25)|side·STEEL|T-MEL ×3 (ct n 30/30/60). Crescent overlays: slash c[.2,1.2,0] R1.4 a0 2.1 a1 -.8 tilt .2 t0 0 dur .3; slash c[.15,1.1,0] R1.5 a0 -.6 a1 2.3 tilt π/2-.25 t0 .45; slash c[.35,1.2,0] R1.7 a0 1.7 a1 -.3 tilt -.1 width .3 t0 .96. After hit 3: ring(.2→3 up @[2,0,0] 1/.6), smoke(DUST 26 disc r.3 @[2,.05,0] t=1/.15)|em(shard 40 point @C t=1/.001 spd[2,6] gravity -9 bounce .3)|slash c[1,1,0] R2.2 tilt 0 width .4 t0 1.02 dur .35 i 3.5|233|
|2|tempest-spin|steel,air; spin; .3/8/2/ring|1.4|keys [[-.35,'guard'],[-.1,'sideBack'],[0,'sideCut','snap'],[.7,'sideCut'],[1.1,'guard']], sword, target 1.6, hits .15/.45 (stop .05)|high·STEEL (wind layers use AIR via a second kit `kw=kit(fx,o,AIR)`)|T-SPIN, 2 turns over [-.02,.6]. kw.ring(1.2→2.4 up y1.1) at .1 and .4. 6 wind circle ribbons (24 points on a circle R1.6, y .4..1.6, sweep[0,1.5], t0 .05i, dur .35, i .8). smoke(DUST 60 ring r1.2 radial 1 spd[1,3] t=.05/.5). kw.em(streak 60 ring r1.5 swirl 4 life[.3,.6] t=0/.6)|smoke(DUST 40 ring r1.8 t=.45/.2)|kw.ring(.5→4 up .6/.5) + kw.em(petal 40 ring r1 swirl 3 normal lit)|273|
|3|breaker-leap|earth,steel; leap-slam; .5/10/5/circle|2.0|T-LEP, weapon hammer, Lx 1.0, target 2.6|wide·EARTH|T-LEP. swing(t0 -.07 t1 .02 inner .7 outer 1.0) hot edge|ring(cam .2→2.4 @[1.1,.6,0]) + 6 spike cones (ConeGeometry .12 .6 7, rock()) popped at r1.4 around P, t .04→.16, sink 1.2→1.7|ring(.2→3.5 up @P .35/.6) + rock 20 at .35|175|
|4|iron-bulwark|steel; buff-aura; .5/20/0/self|2.6|body:true, pose guard|body·STEEL|T-BUF. 6 light plates: PlaneGeometry(.35,.5) addMat(col1,1.6,.7) on a ring R.7 y1.0, angle i·TAU/6 + .4t, lookAt outward; group popped .2→.45, 2.0→2.5. shell(r[.9,.9] cells 6 hemi false .3/2.1 i .6 alpha .5). em(glint 20 ring r.8 @[0,1,0] t=.3/2 life[.2,.3])|4 smaller plates on a ring R.55 y1.6, popped .3→.55|decal(rune r1.4 0.3/2.2) + ring(.2→2 up 1.2/.6)|171|
|5|warcry-surge|steel,fire; nova; .2/15/4/circle|1.8|keys [[-.5,'guard'],[-.25,'crouch'],[0,'roar','snap'],[.7,'roar'],[1.3,'guard']], target 2.6, hit .05 push 2|wide·BLOOD|T-NOV (radial kind 'streak' size[.5,.2] stretch 2). Speed lines: 12 ribbons radiating from y 1.2, points [[cos a·.4, y, sin a·.4],[cos a·3, y, sin a·3]], sweep, t0 .02, dur .25|ring(.2→6 up .15/.6 width .15)|em(ring 30 sphere r.3 @[0,1.2,0] radial 1 spd[2,4]) red shock rings|291|
|6|chain-hook|steel; pull; .3/12/6/line|2.0|keys throw: [[-.4,'guard'],[-.15,'throwBack'],[0,'throwFwd','snap'],[.35,'throwFwd'],[.55,'pullback'],[1.2,'guard']], target 4, hits .3(stop .08 push 0), .7(push -2 stop .1)|side·STEEL|Hook = ConeGeometry .06 .18 metal(). Chain = 16 TorusGeometry(.035,.01) metal() links along the line from the hand (`k.at()` read in the callback into a Vector3) to hook pos H(t): out [0,.3] lerp A→[3.8,1.2,0], back [.4,.7] toward [1.2,1.2,0]. Each link at lerp(hand,H,i/16), rotation.x alternating π/2. Target pulled: fx.on target.position.x = 4 - 2.4·sm(.4,.75,t). ct([3.8,1.2,0],.3,30). ct([1.5,1.2,0],.72,40)|sparks along chain em(spark 30 line) at .45|chain glow trail on H + ring(cam) at .72|158|
|7|rending-wave|steel; ground-wave; .4/9/6/line|1.8|act('smash',.4,4,{weapon:'sword',windup:.55})|long·STEEL|Wave = vertical crescent ribbon moving: points from a slash-like arc at center [x(t),.6,0], x(t)=.8+3.2·sm(0,.45,t), R .7, a0 -.2 a1 2.6 (24 points), head ()=>1.001, width .14. Ground scrape: em(spark 80 line shapeSize[1.6,0,0] @[2.4,.05,0] t=0/.45 spd[1,3] dir[0,1,0]). smoke(DUST 40 line @[2.4,.05,0] t=0/.45). impact([3.8,.8,0],.4,50). decal(scorch r[.3,.6]) at 4 points along the line|second smaller wave at y .3 delayed .08|ring(cam .2→2 @[3.8,.8,0]) + shard 40|252|
|8|blood-oath|blood; buff-aura; .6/30/0/self|2.8|body:true, pose castCharge|body·BLOOD|T-BUF. em(drop 60 sphere r.6 @[0,1.1,0] gravity[0,1.2,0] spd[.1,.3] life[1,1.6] t=.3/2.2) rising blood-light drops. Ring prim at waist (r .5 up y .9 width[.05,.05] .3/2.2 decay 0). decal(glow r1 BLOOD)|em(soft 40 ring r.5 swirl 2 t=.3/2.2)|ring(cam .2→1.6 @[0,1.1,0] .3/.5) + em(ring 20)|192|
|9|shield-rush|steel; dash-stun; .2/10/5/line|1.5|T-DSH x0 -1.5 x1 1.2 t0 -.3, target 2.0, hit .02 stop .12 push 2.2|side·STEEL|T-DSH. Shield = CylinderGeometry(.32,.32,.05,24) metal(), rotated z π/2, follows the left hand (`k.at('armL')`). Shield glow: shell(r[.45,.45] power 3 i .8 -.3/.6), follows via fx.on part.obj.position from the left hand. Stun: 5 glint em on a ring r.3 above the target head @[2,2.05,0] swirl 4 t=.05/1|ring(.2→2 [1,0,0] @[1.6,1.2,0])|em(spark 40 ring around head)|236|
|10|last-stand|fire,steel; buff-aura; .5/60/0/self|3.0|body:true, pose roar|body·FIRE|T-BUF with strong glow (glow .5). em(flame 90 disc r.45 @[0,.05,0] aspect 1.8 spd[.5,1.2] life[.6,1] i .5 t=.3/2.4). em(soft 80 disc r.6 embers gravity[0,1,0] t=.3/2.4 i 2). decal(scorch r1 heat[1,.2]). light 80|em(flame 40 ring r.8)|beam(@O height 3 r[.6,.3] i .25 .3/2.2) + ring(cam)|311|

#### Step B3. Create `src/fx/rogue.js` (skills 1-5). Step B4: append skills 6-10. All rogue skills use weapon `dagger`.
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|shadow-strike|void; teleport-strike; .3/12/6/point|1.6|keys [[-.6,'guard'],[-.45,'vanish'],[-.1,'behind'],[0,'daggerB','snap'],[.3,'daggerA'],[1,'guard']], target 1.9, hit .02 stop .1 push 1.8|side·VOID|T-TEL TS -.2, Ax 0, Bx 2.6, ROT π. smoke(SMOKE 40 sphere r.3 @[0,1,0] t=-.3/.1). smoke(30 @[2.6,1,0] t=-.2/.1). Stab ribbon [[2.6,1.25,0],[1.7,1.15,0]] sweep t0 -.02 dur .12 width .05. ct([2.1,1.2,.1],.02,40)|em(streak 20 point @contact) + big glint|k.ghost('vanish',[0,0,0],-.3,.6) + ring(cam)|174|
|2|venom-fan|poison; volley; .3/8/7/cone|1.4|act('throw',.3,3.6,{windup:.4})|side·POISON|T-VOL with 5 dagger meshes (BoxGeometry .03 .25 .01, metal('#c9d1da','#2a8a20',.6)), angle a∈{-.4..+.4}, from A to A+3.2·[cos a,-.05,sin a] over [0,.3]. Trail each width .03. Per end: sparks 10 + smoke(green ramp N('#3a6a20','#2a4a18','#0a1406') 8). em(drop 30 green at the ends t=.3/.6). decal(glow r.6 @[3.3,0,0]). light(40 green)|2 more daggers (±.55)|smoke(green 50 @[3.3,.6,0] t=.35/.6)|247|
|3|smoke-vanish|void; teleport; .1/15/0/self|1.8|keys [[-.3,'guard'],[-.1,'crouch'],[.05,'vanish'],[1.8,'vanish']], target false|side·VOID|Body dissolve 0→.35 (dDir -1), reappears at x -2.2 at .9→1.2 (dDir 1). smoke(90 sphere r.4 @[0,.6,0] t=0/.25 spd[1,3] life[1.5,2.5] sz[.6,1.8], ramp N('#4a4058','#3a3048','#141018')). Flare soft 1 + glint. ring(.2→2.2 up 0). smoke(40 @[-2.2,.6,0] t=.85/.15). ring at -2.2. fx.flash(0,.1,'#cbb6ff',.15), fx.shake(0,.2,.02)|em(spark 40 VOID)|k.ghost('vanish',O,0,.5) + decal(scorch r.8)|213|
|4|bleed-flurry|blood; melee-combo; .2/9/2/point|1.5|keys 5 stabs (daggerA/daggerB snap at 0,.18,.36,.54,.72; guard at 1.1). Hits at these times stop .03 push .4; the last one stop .1 push 1.6|side·BLOOD|For each stab h: jab ribbon line [[1.0,1.2+.08j,.2],[1.75,1.15+.08j,.1]] sweep t0 h-.02 dur .08 width .04 (j=-2..2), ct([1.8,1.15+.05j,.1],h,12). DoT: em(drop 40 box shapeSize[.15,.4,.1] @[1.85,1.1,0] t=.2/1 gravity -6 bounce .2). decal(glow r.5 @[1.85,0,0]). Target emissive red pulse via fx.on (target.mat.emissive set, intensity .8·sin²)|em(ring 20 rising around the target)|slash at .72 width .25 + stronger emissive|171|
|5|caltrop-field|steel; trap; .3/14/5/circle|2.4|act('throw',.9,3)|wide·STEEL|12 caltrops (TetrahedronGeometry .05, metal()) on parabolas from A to points on a disc r .9 at [2.6,0,0] over [0,.35] (fx.rng positions). Landing glint at .35 (12 glint emitters). ring(.2→1.2 up .35). Trigger .9: 8 spikes (ConeGeometry .04 .3) popped at caltrops .9→.95. sparks 40 @[2.9,.3,0]. ct([2.9,.4,0],.9,40). smoke(DUST 20). decal(rings r1.1 .4/2)|(the landing glints are base)|second trigger at 1.4: sparks 30|197|
|6|twin-fang-dash|steel,void; dash-through; .2/10/6/line|1.3|T-DSH x0 -1.2 x1 3.2 t0 -.25, target 1.9, hit -.05|side·STEEL|T-DSH. Line slashes: 2 ribbons along the path y 1.0 and 1.3, x -1→3, sweep t0 .05 dur .15 width .05 i 3. X-cross at the target t .15: 2 short slashes c[1.9,1.15,0] R.5 (a0 2.4 a1 .7) and (a0 .7 a1 -1.0)|k.ghost('dashLow',[.2,0,0],-.15,.4) + ghost at 1.2|em(spark 40 line @[1,1.1,0] shapeSize[1.6,0,0] t=.3) + ring(cam)|153|
|7|death-mark|void; debuff-execute; .4/20/3/point|2.6|keys [[-.4,'guard'],[-.2,'castCharge'],[0,'castRelease','snap'],[.8,'guard'],[1.3,'windupHigh'],[1.5,'cut','snap'],[1.7,'follow'],[2.4,'guard']], target 1.9, hit 1.52 stop .12 push 2|side·VOID|Mark: decal(rune r.35 @[1.9,2.05,0] rotate[0,0,0] 0/1.6 reveal .3 spin 1 glyphs 8). em(soft 20 @mark t=0/1.5). Thin beam mark→head r .02 i .5. Finisher: slash big a0 2.2 a1 -.7 width .3 i 3.5 t0 1.48. ct(C,1.52,60). Mark shatter: em(shard 30 @mark t=1.52)|smoke(SMOKE 30 @[1.9,.1,0] t=0/1.4)|ring(cam 1→.1 @mark 1.3/.2) + flash|183|
|8|echo-step|air; dash-afterimage; 0/6/5/line|1.4|keys [[-.4,'guard'],[-.2,'runA'],[-.1,'runB'],[0,'dashLow','snap'],[.4,'guard']], target false; body x 0→2.4 over [-.2,0]|side·AIR|4 ghosts: k.ghost(i%2?'runA':'runB',[.6i,0,0],-.2+.05i,.6). 4 speed ribbons. smoke(DUST 25 @O t=-.2) and (25 @[2.4,0,0] t=0). ring(.2→1.6 up @[2.4,0,0] 0). light(30 @[1.2,1.2,.6] -.2/.8)|2 more ghosts (x .3, .9)|each ghost fades into em(soft 15 box @[x,1,0]) (4×15)|151|
|9|razor-cyclone|steel; orbit-release; .5/12/5/ring|2.2|keys [[-.4,'guard'],[-.2,'castCharge'],[0,'castRelease'],[.9,'castRelease'],[1,'throwFwd','snap'],[1.6,'guard']], target 3.8, hit 1.25|high·STEEL|T-ORB: 6 daggers (Box .035 .3 .01 metal()), R .9 y1.1 ω 9, until 1.0, then lerp to [3.7,1.1,(i-2.5)·.15] over [1,1.25]. Each has a trail len .12. ring(.9 up y1.1 width[.03,.03] i .5 0/1). Ends: sparks 12 each. light(50)|2 more daggers|inner ring of 4 daggers, R .5, ω -11|209|
|10|night-ambush|void; critical-strike; .6/15/2/point|1.6|act('slash',.07,1.85,{weapon:'dagger',windup:.6,hits:[{t:.07,stop:.16,shake:.45,amp:.07,push:2.4}]}), sky 'night'|side·VOID|Dark flash: em(soft 1 normal blend size[3,6] ramp [[0,'#000',0],[.2,'#000',.7],[1,'#000',0]] life[.3,.3] t=.05). swingS(.07). Slash width .35 i 4 t0 0. ct(C,.07,70). em(shard 30 VOID). smoke(30 @C)|ring(cam) + glint 1.6|3 echo slashes at .2/.28/.36 (R×.8)|175|

#### Step B5. Create `src/fx/archer.js`
Local helper for the bow (the only new local code):
```js
const bowOf = (fx, k) => { const g = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.017, 8, 40, 1.9), new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.6 })); g.rotation.z = -0.95; const h = new THREE.Group(); h.add(g); g.position.x = -0.5; const to = k.at('armL'); fx.mesh(h, () => to(h), { t0: -3, dur: 99 }); return h; };
const ACT_BOW = (T, wind = 0.7) => ({ target: [4.2, 0, 0], windup: wind, keys: [[-wind, 'guard'], [-wind + 0.3, 'bowDraw'], [0, 'bowDraw'], [0.05, 'bowRelease', 'snap'], [0.6, 'bowRelease'], [1.2, 'guard']], hits: [{ t: T, stop: 0.05, shake: 0.2, amp: 0.03, push: 1.2 }] });
const arrow = () => { const g = new THREE.Group(); const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.78, 8), new THREE.MeshStandardMaterial({ color: '#b8935a' })); s.rotation.z = Math.PI / 2; g.add(s); const h = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 8), metal('#c9d1da')); h.rotation.z = -Math.PI / 2; h.position.x = 0.42; g.add(h); return g; };
```
Every archer skill calls `bowOf(fx,k)`. Arrows are `fx.mesh(arrow(), (t)=>{const p=P(t); a.position.set(...p); a.rotation.z=Math.atan2(dy,dx);}, {t0:0,dur:T+.05})`.

| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|triple-volley|steel,air; volley; .7/6/9/cone|1.5|ACT_BOW(.25)|long·STEEL|3 arrows, fan z angles -.12/0/.12, A=[.75,1.45,0], to [4,1.3,3.25·tan a], T .25, stagger .03. Trails width .03. ring([1,0,0] .05→.5 @A 0/.22). Per end: sparks 20 + smoke(DUST 10). light(30)|em(spark 30 @A t=0)|2 more arrows at ±.24|226|
|2|needle-rain|steel; ground-rain; .7/14/8/circle|2.6|ACT_BOW(.85) (aimed up: keys bowDraw lean)|wide·STEEL|T-GND at G=[3.2,0,0] R1.6. Up-shot trail from A to [1.5,5,0] over [0,.2]. em(streak 160 disc r1.5 @[3.2,6,0] dir[0,-1,0] spread .05 spd[14,16] life[.38,.4] sz[.6,.3] stretch 2 t=.5/1.1). Ground hits em(spark 120 disc r1.5 @[3.2,.05,0] t=.85/1.1 life[.2,.4] spd[1,3]). smoke(DUST 50 disc r1.5). 14 stuck arrow meshes, k.pop at .85+.07i. fx.shake(.85,1.1,.015). light flicker .2|ring(up) pulses at .9/1.2/1.5|6 glowing big arrows at 1.7 + sparks 30|401|
|3|lance-shot|air,steel; charged-pierce; 1.0/12/12/line|1.8|ACT_BOW(.12,1.0)|long·AIR|k.gather(O,-.8,.75,.6,60,k.at()). em(soft 10 follow k.at() size[.25,.1] t=-.8/.8). Release: beam A→[6,1.4,0] r .04 0/.12. Arrow A→[6.5,1.35,0] over .2. trail len .6 width .1. ring([1,0,0]) at A 0 and at the target .12. sparks 50 @[4.2,1.3,0] dir[1,.2,0]. smoke(DUST 30 line along the path)|3 helix ribbons around the path (24 points, r .15, 3 turns) t0 .02 dur .3|second ring at the target + afterglow beam .6s i .3|191|
|4|frost-trap-arrow|frost; trap-zone; .6/15/8/circle|2.6|ACT_BOW(.3)|wide·FROST|Arrow on a parabola A→G[3,0,0], T .3. At .3: decal(frost r[.3,1.8] reveal .5 cells 6). 9 ice cones (ConeGeometry .06 .35 6, MeshStandard '#bfe8ff' rough .1 emissive '#2a6fb5' .3) popped on a ring r1 at .35+.03i. smoke(VAPOR 50 disc r1.2 t=.3/1.5). em(flake 60 disc r1.5 rising slow). ring(.2→2 up .3). light(60 cold)|em(shard 40 @[3,.1,0] t=.3)|5 larger spikes at .9 + ring|191|
|5|hawk-focus|holy,air; buff-aura; .5/25/0/self|2.6|body:true, pose bowDraw, + bowOf|body·HOLY|T-BUF. Eye glint: em(glint 30 @[headMesh world + .1x] t=.3/2.2 sz[.3,.1] life[.3,.3]) (read the head position once in build). 2 bow rings: ring([1,0,0] .55 const, width[.03,.03], at the left-hand pos read in build, .3/2.1 decay 0). Dots: em(soft 40 ring r.55 rot3[0,0,π/2] swirl 3 @bow). 6 converging ribbons from 2 m out to the eye, sweep 0/.3|decal(rune r.4 rotate[0,0,0] @[4,1.2,0]) reticle + ring(cam)|em(petal 30 feathers)|171|
|6|blast-bolt|fire,steel; projectile-explode; .7/10/9/point|2.2|ACT_BOW(.3)|long·FIRE|T-PRJ variant: hero = arrow mesh, follow em kind flame 40 aspect 1.6 i .5. Impact @[4,1.2,0]: orb(fire r[.3,1.5] .3/.7 fade[0,.5] noise 1.8). em(flame 80 sphere r.5 t=.3/.05 i .45). smoke(60 t=.4/.5). sparks 80. ring(.2→4 up). decal(scorch r[2,2.6]). light 200. fx.flash(.3,.2,'#fff',.25)|3 soft bursts (20 each) at .45/.5/.55 offset ±.5|shell(hemi r[.2,2] .3/.4) + em(soft 60 embers rising)|421|

#### Step B6. Create `src/fx/mage.js` (skills 1-6). Step B7: append skills 7-12. All mage skills use weapon `staff`.
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|comet-lance|fire; projectile; .8/6/10/point|2.0|act('cast',.4,4.4)|long·FIRE|T-PRJ T .4 H .15. Hero: orb(fire r[.22,.22] follow) + orb(plasma r .1 follow). trail len .8 width .3, and a second trail len .5 width .12 i 4. Follow flame 60 + spark 40. Impact: orb(fire r[.3,1.2]). em(flame 60). smoke(50). ring(up). decal(scorch)|em(soft 50 embers follow, emit .4, gravity -2)|ring(cam) + smoke pillar 30|432|
|2|glacier-prison|frost; cage; .6/18/7/point|2.6|act('cast',.2,3,{hits:[{t:.2,stop:.1,shake:.3,amp:.04,push:0}]})|wide·FROST|8 ice prisms (CylinderGeometry .12 .16 2.2 6, ice MeshStandard) on a circle r.55 around G, tilted .12 inward, each in a Group. pop(.2+.04i→.35+.04i, 2.1→2.4), fn sets child scale.y. Cone lid (ConeGeometry .7 .5 6) at y 2.3, popped at .5. decal(frost r1.4). em(flake 60). smoke(VAPOR 40). em(shard 40 @[3,1,0] t=.2). Shatter at 2.1: em(shard 60). ring(up). light(70)|shell(r .7 cells 6 alpha .4 .3/1.8)|6 short spikes at r1.0|241|
|3|storm-orb|storm; orbit-burst; .5/12/6/point|2.6|act('cast',1.8,3.6)|wide·STORM|Orb path: orbit R.9 y1.3 angle TAU·2·t/1.4 over [0,1.4], then lerp to [3.5,1.2,0] over [1.4,1.8]. orb(plasma r .22 follow) + orb(energy r .34 alpha .7). trail on the path. 2 bolts: from (slot)=>P(slot/24), to = P + jitter .6 (fx.rng table of 64), rate 24, t0 0 dur 1.8. Burst at 1.8: ring(cam). sparks 80. 3 bolts down to the ground .3s. decal(scorch). light. glint|em(soft 20 follow, mini orb at phase +π)|ring(up) + em(spark 60 disc @[3.5,.05,0] t=1.8/.5)|281|
|4|arcane-barrage|arcane; volley-homing; .4/8/9/point|2.0|act('cast',.5,4) + hits at .62/.74/.86/.98 (stop .02 push .4)|long·ARCANE|6 missiles: bezier A→ctrl[1.8,1.38+.6·(-1)^i,.8·(i%3-1)]→[3.9,1.2,0], t0 .12i, flight .45. Trail len .25 width .07 each. ring(cam small) at A per launch. sparks 14 per hit. gather 30|2 more missiles|final big missile at 1.1 + impact(60)|252|
|5|meteor-rain|fire,earth; ground-rain; 1.0/20/9/circle|3.0|act('castup',.8,3.2)|wide·FIRE|T-GND at [3.2,0,0] R2. 6 meteors: path from [3.2+ox-2,7,oz] down to [3.2+ox,0,oz] over .35, start .5+.25i (ox,oz from fx.rng in r1.5). Each: trail width .18 len .4 + flame follow 25 + impact sparks 20 + smoke(DUST 10) + ring(.1→1.2 up) + decal(scorch r.5) + fx.shake. Aftermath: smoke(60). em(soft 50 embers)|2 more meteors|big meteor at 2.3 with orb(fire) + sparks 60 + ring(.2→4 up)|651|
|6|rime-pillars|frost; ring-wall; .6/16/0/ring|2.6|act('stomp',0,2.2)|high·FROST|8 hex pillars (CylinderGeometry .18 .24 1.6 6, ice mat) at r1.6 angle i·TAU/8, each popped at .04i→.04i+.12, out at 2.0→2.5, fn scale.y. decal(frost r2.2). smoke(VAPOR 50 ring r1.6). em(shard 6 per pillar base, 48). ring(.2→2 up). em(flake 40). light(70)|inner ring of 6 pillars r .9 at .25|8 tip glints + ring(cam)|187|
|7|forked-thunder|storm; chain-split; .4/8/9/cone|1.6|act('cast',.1,4)|long·STORM|bolt A→S[2.2,1.4,0] (width .06 rate 24 0/.35). 3 bolts S→[4,1.2,0],[3.6,1.3,1.2],[3.6,1.3,-1.2], same timing. Per end: sparks 30 + glint + decal(scorch r.4). light 150 env flicker. fx.flash(.1,.12,'#fff',.2). gather 40|branches 5 on all bolts|em(spark 30) at each end + ring(up)|264|
|8|blink-gate|arcane; teleport-portal; .3/10/8/point|1.8|keys [[-.4,'guard'],[-.2,'castRelease'],[1.8,'guard']], target false|wide·ARCANE|2 portals: TorusGeometry(.6,.04,8,48) addMat(col1), rotation.y π/2, at A[.3,1,0] and B[3.2,1,0], popped -.3→0, closing 1.2→1.5. Inner: ring([1,0,0] r .55 fill .5) at both. em(soft 50 ring r.6 rot3[0,0,π/2] swirl 3) at both. T-TEL TS -.05 Ax 0 Bx 3.4. light at both|6 tunnel ribbons A→B -.05/.2|k.ghost at A + ring(cam) at both|171|
|9|mana-sphere|arcane; shield; .3/20/0/self|2.6|body:true, pose castCharge|body·ARCANE|T-BUF. shell(r[.2,1.15] cells 6 .3/2.2 impacts [{t:.8,dir:[1,.3,0]},{t:1.3,dir:[.5,.5,.6]},{t:1.8,dir:[1,0,-.5]}]). 3 incoming soft trails ending at the impact points. At each: sparks 25 + glint + small ring(cam). em(soft 40 motes)|shell #2 r1.0 power 4 i .4|decal(rune r1.4) + break burst at 2.3: sparks 40|230|
|10|gravity-well|arcane,void; pull; .6/18/6/circle|3.0|act('cast',null,3,{target:[3.6,0,0]})|wide·VOID|T-PUL at G=[3,1,0]. orb(void r[.05,.5] .2/2.3). decal(rings r2 @[3,0,0]). em(soft 150 sphere r2.5 radial 1 spd[-5,-3.5] swirl 3 t=.2/2.2). em(rock 30 normal lit sphere r2 radial 1 spd[-2,-1.2]). ring(2.6→.3 up) at .4/1.1/1.8. Target x 3.6→3.2. Burst 2.5: ring(cam .2→3). sparks 80. flash .2|shell(r .8 power 3 dark)|6 stone meshes (IcosahedronGeometry .08) on inward spirals|301|
|11|searing-ray|fire,holy; beam; .5/10/7/line|2.6|keys hold [[-.5,'guard'],[-.25,'castCharge'],[0,'castRelease','snap'],[2,'castRelease'],[2.5,'guard']], target 4, hits .1/.5/.9/1.3/1.7|long·FIRE|T-BEAM D 2.0. em(flame 60 @B small). smoke(40 @B). 4 decal(glow r.3) under the beam. gather 30|helix ribbon around the beam|beam-end burst at 1.8: orb(fire r[.2,.8]) + ring(cam)|321|
|12|time-ripple|arcane; slow-field; .8/20/6/circle|3.0|act('castup',null,3)|wide·ARCANE|decal(rings r2.2 cells 4 0/2.8). decal(rune r2.4 spin .3 reveal .5). em(soft 100 disc r2 spd .05 drag 2 life[2,2.8] t=.2/.5). 4 rings(up r[.5,2.2] decay .2) at .2+.4i dur 1.4 breakup .9. shell(hemi r2.2 alpha .3 power 4). gather 30. light|em(glint 30 frozen, spd 0, life 2)|2 clock-hand meshes (Box 1.8×.03×.03 addMat) rotating slowly at G|201|

#### Step B8. Create `src/fx/priest.js`
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|radiant-mend|holy; heal; 1.0/4/0/self|2.4|body:true, pose castCharge|body·HOLY|T-HEL. em(soft 100 disc r.5 @[0,.05,0] spd[.6,1.2] swirl 1.2 t=.3/1.8). em(glint 30 rising). beam(@O height 2.4 r[.6,.3] i .25 grow .2/1.8). ring(up) ×3 at .3/.8/1.3. 4 plus meshes (2 Box .2×.06×.06 addMat) rising y 1→2.2, fading|em(petal 30 falling light)|ring(up r .25 const @[0,2.1,0]) halo + big flash|201|
|2|sanctuary-circle|holy; heal-zone; 1.2/20/0/circle|3.0|act('castup',null,false)|wide·HOLY|Zone at [1.6,0,0]: decal(rune r2.2 glyphs 16 poly 8 reveal .5). decal(glow r2.2). beam(@zone height 2 r[2,2] i .08 edge 2.4). em(soft 120 disc r2 rising slow t=.2/2.4). ring(up) at 1.0/1.8/2.6. light(60)|6 small light pillars (beam r .1 height 1.5) at octagon points|em(petal 40) + shell(hemi r2.2 alpha .3)|201|
|3|purifying-wave|holy; nova-cleanse; .4/12/5/circle|2.0|act('castup',.05,2.4,{hits:[{t:.05,stop:.05,shake:.3,amp:.04,push:1.2}]})|wide·HOLY|T-NOV (radial kind soft). em(petal 50 radial feathers). smoke(dark violet N('#3a1a4a','#2a1038','#0a040e') 30 @target, blown outward and fading)|ring(.2→6 up .2/.7 white)|8 rays: beam from [cos a·.5,.1,sin a·.5] to [cos a·3,4,sin a·3] r[.1,.4] i .08|301|
|4|guardian-wings|holy; buff; .5/30/0/self|2.8|body:true, pose armsWide|body·HOLY|T-BUF. 2 wings × 7 feathers (SphereGeometry scaled .05×.38×.012 addMat gold .8) at [-.15,1.45,±.12]; spread angle = (.25+.2i)·open, open = sm(.2,.7,t)·(1-sm(2.3,2.8,t)). em(petal 40 drifting). em(soft 60 swirl)|2 wing-tip glints + em(soft 30)|flap at 1.6 (open +.3) + ring(cam) + petal 40|241|
|5|judgment-beam|holy; sky-beam; .6/14/8/point|2.2|act('castup',.3,2.6,{hits:[{t:.3,stop:.08,shake:.35,amp:.05,push:1.4}]})|sky·HOLY|Ground cross: 2 Box 1.4×.01×.12 addMat crossed at [2.6,.01,0], popped -.4→.3. ring(up y 6 r .6) sky halo. beam(@[2.6,0,0] height 14 r[.35,.35] i 1.4 .3/.9). beam(r .8 i .3). ring(.2→3.5 up .3). em(spark 80 up). glint 2.4. smoke(DUST 20). decal(scorch gold). light 160. flash .25|3 rings(up) at y 3/2/1, t .3/.4/.5|second thin beam at .8 + sparks 60|202|
|6|divine-chain|holy; chain-heal; .6/10/8/chain|2.2|act('cast',null,false)|wide·HOLY|2 ally figures (CapsuleGeometry .2 .9 + Sphere .14, MeshStandard '#9aa0a8') at L1[2.2,0,1.2] and L2[3.4,0,-1]. Smooth arc ribbons: hand→L1 chest (sweep .1/.15), L1→L2 (.3/.15), 12 points with a sin bulge .3. At each ally: em(soft 40 rising) + ring(up) + glint 10 + light|second pulse along the chain at .9|chain L2→caster at 1.2 + heal at the caster 40|231|
|7|sun-lance|holy; projectile; .5/6/9/point|1.8|act('throw',.35,4)|long·HOLY|T-PRJ T .35 H .05. Hero: OctahedronGeometry scaled(.6,.08,.08) addMat gold, follow. 12 radial ribbon rays from B (static points, sweep out, t0 .35 dur .3). decal(glow @[3.8,0,0]). light 160|6 motes (soft 20 follow) orbiting the lance|orb(energy r[.2,1] .35/.4) + ring(up)|252|
|8|bless-banner|holy; totem-buff; .8/25/0/circle|3.2|keys [[-.6,'guard'],[-.3,'overheadUp'],[0,'smashGround','snap'],[.6,'guard']], target false|wide·HOLY|Banner group: pole CylinderGeometry(.025,.025,1.8) wood; cloth PlaneGeometry(.5,.7) MeshStandard '#f6e2a0' emissive '#ffc040' .5 at the pole top, rotation.y = .3·sin(TAU·3·t/3.2). Placed at [.9,0,.3], popped 0→.15. ring(.2→2.4 up) at .3/1.1/1.9/2.7. decal(rune r1.2 spin .3). em(soft 80 rising). light env peaks. fx.shake(0,.2,.03). smoke(DUST 20)|em(soft 30 streams from the top)|beam(@top height 3 i .3)|171|

#### Step B9. Create `src/fx/shaman.js`
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|spirit-wolf|spirit; summon-charge; .6/14/8/line|2.6|act('cast',1.1,4)|long·SPIRIT|Wolf group (addMat col1 .7): body Capsule .16 .5 (rot z π/2), head Sphere .12 at +.38, snout Cone, 4 leg cylinders (rotation.z = .5·sin(TAU·8·t/2.6)), tail cone. decal(rune r.8 @[.8,0,.6] -.3/.8). Wolf popped 0→.2, x .8→3.6 over [.3,1.1], y bob. Trail on the wolf path. em(soft 50 follow). Bite 1.1: 2 small slashes at [3.8,1.3,0] (a0 1 a1 -1 / a0 -1 a1 1). ct(T,1.1,40). Fade 1.2→1.6 + em(soft 40)|4 paw decals(glow r .15)|ring(cam) howl + k.ghost-like wolf echo|173|
|2|storm-totem|storm,spirit; totem; .8/20/8/circle|3.2|act('smash',.9,3) + hits 1.7/2.5|wide·STORM|Totem at [1.2,0,.4]: 3 stacked Box/Cylinder wood + top TorusGeometry metal + crystal Octahedron emissive. Popped -.1→.2. At .9/1.7/2.5: bolt crystal→target head .2s + ring(up @totem) + sparks 25 @T + light env. Static bolt crystal→crystal+offset branchLen .2 continuous. em(spark 30 @crystal). decal(scorch @target)|second bolt to a ground point per pulse|big pulse at 2.9: ring(r3) + 3 bolts + sparks 40|186|
|3|thorn-bind|nature; root; .5/12/7/point|2.6|act('cast',.4,3,{hits:[{t:.4,stop:.1,shake:.2,amp:.03,push:0}]})|wide·NATURE|5 vines: TubeGeometry(CatmullRomCurve3 spiral r .35 h 1.4 1.5 turns, 48, .025, 6), MeshStandard '#2f5a1c'. Grow with geometry.setDrawRange(0, floor(u·idxCount/6)·6), u=sm(.3,.8,t), shrink 2.2→2.5. decal(glow r.8 green). em(petal 40 burst). em(soft 40 spores). smoke(DUST 20). light(40)|12 thorn cones (ConeGeometry .02 .08) popped|4 more vines from a ring r1.2 + ring(up)|141|
|4|ancestor-roar|spirit; cone-fear; .4/15/6/cone|2.0|keys [[-.5,'guard'],[-.25,'crouch'],[0,'roar','snap'],[.8,'roar'],[1.4,'guard']], target 3.2, hit .2 push 2|side·SPIRIT|5 rings(normal [1,0,0]) at x .8/1.4/2.0/2.6/3.2, r[.2,.4+.35i], t0 .05i dur .35. 3 face meshes (Sphere .25 scaled 1,1.2,.6 addMat + 2 black eye spheres + mouth ellipse) flying from [.4,1.6,0] to the target and fading. em(streak 40 dir[1,0,0] spread .35). smoke(DUST 30 @target). gather 30. light|2 more rings|2 more faces + ring(up @target)|141|
|5|bone-golem|spirit,earth; summon; 1.0/40/0/point|3.4|act('castup',2.2,3)|wide·EARTH|decal(rune r1.3 @[1.6,0,0] -.4/3.6). decal(cracks r1.6). Golem group (MeshStandard '#d8d0c0' rough): torso Box .6×.7×.4 y1.1, head Box .25, arms Cylinder .08 .7, legs .1 .6. Popped .2→1.2. Eyes 2 soft. em(rock 30). smoke(DUST 60). smoke(green N 30). Punch 2.2: right arm rotation.z → -1.4 over [2.0,2.2]. ct([2.8,1.2,0],2.2,40)|em(shard 30 bone, swirl around)|ring(up @punch) + ring(cam)|233|
|6|ember-swarm|fire,spirit; orbit-attack; .6/12/7/point|2.6|act('cast',1.6,3.8) + hits 1.7/1.8/1.9|wide·FIRE|8 spirits: em(flame 18 point follow Pi(t) aspect 1.5 i .5 emit 2) + em(soft 12 core follow). Orbit R.7 y .9+.1i phase i·TAU/8 ω 6; dart to the target at 1.4+.06i over .25. sparks 12 at each arrival. light(50 orbiting)|em(soft 40 falling embers)|em(flame 60 @target) + ring(up)|381|
|7|ward-totem|spirit,earth; totem-dome; .8/30/0/circle|3.2|keys smash plant (like bless-banner), target false|wide·SPIRIT|Totem at [1,0,.4]: 4 stacked Box rotated 45°, 2 glowing eye boxes (addMat). Popped 0→.2. shell(hemi r[.2,1.8] cells 6 .3/2.6 pulse[.03,TAU·2/3.2]). impacts on the shell from 2 incoming soft trails at 1.2/2.0 (sparks 10 each). decal(rune r1.8). em(soft 60 rising). ring(up). light|4 ward stones (DodecahedronGeometry .1 rock()) at r1.6|reflect flash at 2.4 + sparks 40 on the dome|161|
|8|earth-drum|earth,spirit; pulse; .4/12/0/ring|3.0|keys smashDown beats at 0/.5/1.0/1.5 (overheadUp between), target 3, hits each push .6|wide·EARTH|Drum at [.75,0,0]: CylinderGeometry(.35,.3,.4) wood + top membrane disc (tan). Per beat b: ring(.2→3.5 up b/.7) + smoke(DUST 20) + membrane scale pulse + fx.shake(b,.2,.03) + ring(cam small) + light pulse. decal(glow r1)|em(rock 10 per beat)|5th beat at 2.0: ring(r5) + rock 20 + flash|181|

#### Step B10. Create `src/fx/dark.js`
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|soul-rend|void; curse-beam; .5/12/7/line|2.4|act('cast',.3,3.4) + hits .7/1.1/1.5 (stop .02 shake .15)|side·VOID|beam(target chest [3.4,1.2,0] → A r .08 noise 1.2 i 1.2 .1/1.6). 2 helix ribbons around the beam. Target shake: fx.on target.position.z = .03·sin(TAU·12·t/2.4) in [.1,1.7]. em(soft 60 @target dir[-1,0,0] spd[1.5,3] t=.1/1.5). smoke(30 @target). ring(cam @target). gather 30. light flicker .2|ghost face mesh at the target, pulsing|em(shard 40) + flash at 1.7|201|
|2|shadow-spears|void; line-eruption; .5/10/6/line|2.2|act('smash',.45,3.4)|side·VOID|7 spears (ConeGeometry .1 1.4 4, MeshStandard '#120818' emissive '#5a20a0' .6) along x .8→3.4, popped .05+.06i, sink 1.4→1.9, tilt fx.rng ±.2. decal(glow r.4 dark) under each. smoke(12 each, 84). ring(up small) each. sparks 40 @target. Light x moves along the line (fx.on)|em(shard 40 at the spear tips)|final big spear ×1.2 at the target + ring(cam)|205|
|3|dread-howl|void; nova-fear; .4/18/5/circle|2.2|keys roar (like ancestor-roar), target 2.6, hit .1 push 1.5|wide·VOID|T-NOV with a dark shell; radial = smoke(normal VOID-dark 80) + soft 80. 6 fear faces (Sphere .25 + black eyes + mouth) radiating out from y 1.4 over [0,.8], fading. fx.flash(0,.15,'#2a0040',.2)|ring(cam) second|decal(cracks violet r2.5) + target kick|261|
|4|blood-pact|blood; life-steal; .4/15/6/point|2.4|act('cast',.2,3)|side·BLOOD|ring(cam @[3,1.2,0] .2). sparks 30 red. 7 orbs (Sphere .07 addMat red) rising from the target at .3+.07i, bezier to the caster chest [.1,1.3,0] arriving at 1.0+.07i. Trail each width .05 len .3. Caster tint pulse when each arrives (fx.on). ring(up @caster 1.4). em(drop 30). light red|smoke(blood mist 30 @target)|em(soft 60 rising @caster) + ring(cam)|191|
|5|void-chains|void; bind; .4/14/6/point|2.6|act('throw',.35,3,{hits:[{t:.35,stop:.1,shake:.3,amp:.04,push:0}]})|wide·VOID|3 small rune decals (r .3) at ground points around the target. 3 chains × 14 TorusGeometry(.06,.015) links metal('#2a2030','#7a30d0',.6) from each rune to the target chest; links shown up to index floor(14·sm(.2,.45,t)), retract 2.1→2.5. Bind ring (TorusGeometry .3 addMat) at y1.1, popped .45. Target shake. smoke(30). sparks 30. gather 30. light|4th chain from above|bolt along each chain .5→1.2|131|
|6|bane-sigil|void,blood; delayed-blast; .6/16/6/circle|2.8|act('cast',1.5,3)|wide·VOID|T-GND rune r1.8 glyphs 12 poly 5 reveal .6 0→1.5. ring(2→.2 up) at 1.0/1.2/1.35. em(soft 80 inward). Blast 1.5: beam(@G height 5 r[1.2,.6] .5). orb(void r[.3,1.4] .5). ring(.2→5 up). sparks 80. smoke(50). fx.shake(1.5,.5,.06). flash .2. decal(scorch)|5 point beams (r .1 h 1.5) at pentagon corners at 1.3|second blast at 1.9 (×.6) + ring(cam)|311|

**Then run the WAVE 1 TEST (section C).**

### WAVE 2. Base elements (tier `base`; class = category; elements = [element])

#### Step B11. Create `src/fx/pyro.js` (FIRE)
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|ember-lash|fire; whip; .3/6/3/arc|1.4|act('throw',0,2.5,{weapon:'whip',windup:.45,hits:[{t:0,stop:.07,shake:.12,amp:.025,push:1}]})|side·FIRE|T-WHP. 6 follow emitters em(spark 10 gravity -3). Tip: ct(30). em(flame 30 @tip). smoke(15)|em(soft 30 embers falling from the path at .1)|second lash (reverse sign of the arc) at .45 + ct 20|230|
|2|inferno-wheel|fire; spin-ring; .4/12/2/ring|2.2|keys sideBack/sideCut hold, target 1.8, hits .2/.6/1.0|high·FIRE|em(flame 140 ring r1.4 radiusIn 1.3 @[0,1,0] swirl 5 aspect 1.8 i .45 t=0/1.6). 4 horizontal slashes (tilt π/2 R1.4 a0 0 a1 1.6, t0 .25i). ring(1.4 up glow). decal(scorch ring r1.6). Light orbiting (fx.on, TAU·3·t/2.2). smoke(30)|second wheel y1.6 r1.0, 80 flame|ring(1.4→4 up 1.8) + sparks 60|351|
|3|cinder-burst|fire; nova-short; .2/8/4/circle|1.4|act('cast',.0,2.4,{windup:.3})|wide·FIRE|No shell. em(spark 160 sphere radial 1 spd[6,12] drag 2 life[.4,.9]). em(flame 60 sphere burst). ring(.2→3.5 up 0/.35). ring(cam). decal(scorch). smoke(40). light 200 dur .5. flash .25. shake .3. gather 30|em(shard 40 hot, bounce)|micro ring at .15 + glint|371|
|4|flare-lance|fire; projectile-pierce; .4/8/10/line|1.8|act('throw',.2,3.8)|long·FIRE|Spear: ConeGeometry(.05,1.0,6) emissive '#ff9a30', path A→[5.5,1.25,0] over .3 (straight). Follow flame 60 aspect 1.6. trail len .5. Pierce .2: ring([1,0,0] @T) + sparks 50 dir[1,.2,0]. Lingering em(flame 40 @T emit .8). gather 30|4 heat ribbons beside the path|small blast at the end point: flame 40 + ring(up)|261|
|5|heat-haze-veil|fire; buff-aura; .5/20/0/self|2.8|body:true, pose guard|body·FIRE|T-BUF. em(soft 60 sz[.8,1.2] i .15 rising large faint). em(flame 40 ring r.4 small). 5 vertical wavy ribbons (points: y .2→2, x/z offset .45 + .05·sin(TAU·2·t/2.8+i)) i .4|em(soft 40 swirl embers)|decal(glow ring r1) + activation flare|211|
|6|pyre-sigil|fire; delayed-column; .6/12/6/circle|2.8|act('cast',1.2,3)|wide·FIRE|T-GND rune FIRE r1.4 reveal .5. em(flame 60 ring r1.3 radiusIn 1.2 small t=.3/.9). At 1.2: em(flame 200 disc r.7 dir up spd[3,6] aspect 2 life[.5,1] t=1.2/.8 i .45). beam(@G height 6 r[.8,.5] i .3). ring(up). light 200. smoke(60). sparks 60. shake|em(spark 40 swirl 4 rising)|top burst at 2.0: flame 40 @[3,5,0] + ring(cam)|501|
|7|ashfall|fire; ground-dot; .8/16/6/circle|3.2|act('castup',.6,3) + hits 1.2/1.8/2.4 (stop 0 shake .05)|wide·FIRE|smoke(50 disc r1.6 @[3,4,0] slow). em(dust 120 normal lit gray ramp N('#7a7a78','#6a6a68','#2a2a28') from y4 down spd[1,1.5] t=.2/2.6). em(soft 100 embers falling). em(spark 60 disc @[3,.05,0] emit 2.4). decal(scorch r[.5,1.8] heat[0,1]). light flicker .3|em(flame 40 disc small pockets)|em(streak 40 falling cinders fast)|451|
|8|phoenix-dive|fire; leap-dive; .6/16/6/point|2.2|act stomp windup .7, target 3, hit 0 stop .12; body x 0→2.0 over [-.35,0], y = .8·sin(π·u)|wide·FIRE|2 wing ribbons from the body chest to the wingtips ±z 1.2 (points function of the body position, swept back by u). Tail trail on the body path. em(flame 80 follow the body). Landing: ring(.2→4 up). em(flame 80 burst). decal(scorch). sparks 60. light. flash|em(petal 40 additive FIRE feathers)|beam(@[2,0,0] height 4 r .4 .3/.5) + ring(cam)|301|

#### Step B12. Create `src/fx/hydro.js` (WATER)
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|tidal-lash|water; whip; .3/6/3/arc|1.4|as ember-lash|side·WATER|T-WHP. 6 follow em(drop 10 gravity -9). Tip: em(drop 50 gravity -9 bounce .3). smoke(VAPOR-blue 20). ring(cam). fx.water(r .8 @[2.4,0,0] ripples [{t:0,x:0,z:0,amp:1}]). ct 30|second offset spray ribbon|ring(up) wave crest at the target|203|
|2|bubble-ward|water; shield; .4/20/0/self|3.0|body:true, pose castCharge|body·WATER|T-BUF. shell(r 1.1 power 3 .3/2.5). em(bubble 150 sphere r1.0 radiusIn .95 slow life[1.5,2.5] t=.3/2.4). Shell impacts at 1.0/1.6/2.2: em(drop 20) + ring(cam small) each, with 3 incoming water trails|fx.water(r1.2 ripples ×3)|pop-all at 2.6: drops 60 + smoke(VAPOR 30) + flash|341|
|3|riptide-pull|water; pull; .6/16/6/circle|3.0|act('cast',null,3,{target:[3.4,0,0]})|wide·WATER|fx.water(r2.2 vortex 1 @G). em(drop 120 ring r2 radial 1 spd[-2,-1] swirl 4 t=.2/2.2). em(bubble 60). smoke(VAPOR 30). Target x 3.4→3.0. 4 plank meshes (Box .3×.04×.1 wood) on inward spirals. ring(2→.3 up) ×2. light. Splash at 2.4: em(drop 80 up spd[3,6])|beam(@G height 1.5 r[.6,.1] water)|geyser at the end + ring(cam)|361|
|4|mist-veil|water,air; buff-stealth; .4/25/0/self|3.0|body:true|body·WATER|T-BUF + fx.on alpha .45·u (body.set alpha 1-.55u). smoke(VAPOR-blue N('#cfe6f5','#bcd8ea','#6a8aa0') 90 ring r.6 swirl 1). em(glint 30 droplets)|smoke(50 disc @ the feet)|k.ghost ×2 at z ±.8 fading|241|
|5|geyser-line|water; line-eruption; .5/10/6/line|2.6|act('stomp',.5,3.6)|wide·WATER|5 geysers at x 1.0..3.4 step .6, t .1+.12i: em(drop 40 disc r.2 up spd[5,8] gravity -9 life[.8,1.2] bounce .2) + smoke(VAPOR 10) + ring(up small) + decal(glow r.5). Light x moves|em(bubble 10 each)|big geyser at the target: drop 80 + beam(height 3 water)|471|
|6|rain-mend|water; heal; .8/8/0/self|3.0|body:true|body·WATER|T-HEL. smoke(VAPOR 40 disc r.7 @[0,2.8,0]). em(drop 120 disc r.6 from y2.6 down spd[3,4] t=.3/2.4). em(glint 30). fx.water(r.9 ripples ×4). em(soft 60 heal motes rising). light|ring(up) ×2 pulses|beam(faint from above) + em(petal 30)|321|
|7|orb-cascade|water; orbit-shoot; .6/10/8/point|2.6|act('cast',1.5,4) + hits 1.6/1.7/1.8|wide·WATER|5 orbs (Sphere .12 MeshStandard '#6fc6ff' rough .05 transparent opacity .7 emissive '#1b5fa0' .4), orbit R.8 y1.3 ω 5, shot in order at 1.2+.15i over .3. Trail each. Splash: em(drop 20) + smoke(VAPOR 6) each. em(drop 20 drip during the orbit). gather 30|2 more orbs|ring(cam) + fx.water(@target ground)|273|
|8|tsunami-arc|water; wave; .8/18/7/arc|2.6|act('sideslash',.6,4)|long·WATER|Wave mesh: PlaneGeometry(4,1.8,32,8) bent (vertex x += .5·(z/2)², y lift) MeshStandard '#2f8fe0' transparent .75 rough .1. x .8→4.5 over [0,1.2], height scale.y sm(0,.4)·(1-sm(.9,1.2)). Foam crest ribbon. em(drop 120 follow the crest). em(bubble 60). smoke(VAPOR 40 trailing). Crash: em(drop 80) + ring(up) + fx.water(r2 @[4,0,0] ripples)|second smaller wave delayed .3|beam(splash column) + em(glint 30)|371|

#### Step B13. Create `src/fx/geo.js` (EARTH)
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|stone-fist|earth; summon-punch; .6/10/4/point|2.4|keys castCharge→castRelease snap at .35, target 3.4, hit .5|wide·EARTH|Fist group (DodecahedronGeometry .45 + 4 knuckle boxes, rock()) at [1.6,.3,0], popped 0→.3. Moves x 1.6→3.0 over [.35,.5]. smoke(DUST 40 at the rise). em(rock 20). ct(T,.5,50). smoke(DUST 40 @target). em(rock 20). decal(cracks @[3.4,0,0]). Crumble 1.6→2.1: rock 20|em(rock 20 pebbles orbiting the fist)|ring(cam) + ring(up)|253|
|2|rubble-orbit|earth; orbit-release; .6/12/7/ring|2.6|act('cast',1.7,4)|wide·EARTH|8 rocks (DodecahedronGeometry .1-.16 rock()) rise from the ground [0,.3] to an orbit R1 y1.2 ω 4, fly out at 1.4 toward the target over .3. Each: smoke(DUST 10 follow) and trail (blend 'normal', brown). Each end: smoke(DUST 15)|4 small inner pebbles|ring(up) shock + decal(cracks @O)|281|
|3|fault-line|earth; line-crack; .5/10/6/line|2.4|act('stomp',.3,3.6)|wide·EARTH|Crack plane PlaneGeometry(3,.12) flat, addMat(col1,1.2), origin at x .5, scale.x sm(0,.3,t). Dark rim plane .2 wide rock(). 10 spikes (ConeGeometry .1 .6 5 rock()) along the line popped .03+.03i. smoke(DUST 60 line). em(rock 30). ring(up @target). sparks 30. ct([3.6,.6,0],.3,40)|4 side-branch crack planes|big spike under the target|203|
|4|bedrock-armor|earth; buff-armor; .6/30/0/self|2.8|body:true, pose guard|body·EARTH|T-BUF + fx.on body.set({stone: .8·sm(.2,1,t)·(1-sm(2.3,2.8,t))}). 8 plates (Box .16×.22×.06 rock()) fly from ground points r1.2 to torso anchors (offsets on a cylinder r .22, y .9-1.5) over [.1,.6] (lerp), stay, fall 2.3+. smoke(DUST 40). em(rock 20 rising)|em(glint 20 crystal)|decal(cracks r1.4) + ring(cam)|151|
|5|quake-ring|earth; pulse; .4/14/0/ring|2.8|act('stomp',0,2.6) + hits .6/1.2|wide·EARTH|3 pulses at 0/.6/1.2: ring(.2→4.5 up) + smoke(DUST 40 ring) + em(rock 12) + fx.shake. decal(cracks r[1,4] grows). 12 slab boxes popped at ring radii in sequence|4th pulse at 1.8|center spike + flash|279|
|6|boulder-roll|earth; rolling-projectile; .6/12/6/line|2.8|act('thrust',1.2,4.5)|long·EARTH|Boulder IcosahedronGeometry(.6,1) vertices jittered by sin hash, rock() flat, at [.9,.6,0] popped -.2→0; x .9→5 over [0,1.4], rotation.z=-x/.6. smoke(DUST 80 follow the ground point, emit 1.4). em(rock 30). ct([4.5,.8,0],1.2,40). smoke(DUST 30)|smaller boulder (.35) following .3 behind|shatter at 1.6: rock 40 + dust 40|303|
|7|crystal-spire|earth; summon-pulse; .8/20/7/point|3.0|act('castup',.9,3) + hits 1.6/2.3|wide·EARTH|Crystal OctahedronGeometry scaled(.35,1.6,.35) MeshStandard '#e8d8a8' rough .1 emissive col1 .4, + 4 small crystals, at [1.6,0,0] popped 0→.6. Pulses .9/1.6/2.3: ring(up) + glint + light + thin beam tip→target .15. decal(cracks r1). smoke(DUST 30). em(shard 40)|em(soft 20 orbiting shards)|brighter tip glint + big ring|151|
|8|stone-wall|earth; wall; .5/18/0/line|3.2|act('stomp',null,false)|high·EARTH|7 slabs (Box .5×(1.2..1.8)×.4 rock()) at x 1.6, z -1.5..1.5, each in a Group, popped .04i→.04i+.18 with scale.y, sink 2.8→3.2. smoke(DUST 80 line along z (rot3 [0,π/2,0])). em(rock 30). decal(cracks r1.8 @[1.6,0,0]). ring(up). fx.shake(0,.4,.04). light(40)|7 crenel blocks on top|sparks 30 + dust burst at the end|181|

#### Step B14. Create `src/fx/aero.js` (AIR; keep intensities low so it reads "almost invisible")
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|gale-slash|air; wave-blade; .3/6/8/arc|1.3|act('sideslash',.25,3.4)|long·AIR|Moving crescent ribbon: arc points (R.8 a -1→1, vertical plane) centered at x(t)=.8+3·clamp(t/.3), width .12 i .8. em(streak 60 follow). em(petal 20 normal lit). smoke(DUST 30 line). impact(T,.25,40)|second blade +.08 s|third vertical blade + ring|192|
|2|cyclone-step|air; dash-spiral; .2/8/5/line|1.4|T-DSH x0 0 x1 2.6 t0 -.25, target 3.1, hit .02 push 1.6|side·AIR|T-DSH. 3 helix ribbons around the path (r .4, 3 turns, phase TAU/3). em(streak 60 swirl). smoke(DUST 30 start/end). ring(up @end)|em(petal 30 swirl)|2 rings([1,0,0]) at the end|223|
|3|updraft-launch|air; lift-area; .5/12/6/circle|2.6|act('castup',.3,2.8)|wide·AIR|smoke(DUST 80 disc r1.2 @[2.8,.05,0] swirl 3 up spd[3,5]). em(petal 60 swirl 3). em(streak 60 up). beam(@[2.8,0,0] height 4 r1 i .08). Target y = .5·sm(.3,.8,t)·(1-sm(1.8,2.3,t)). light(30)|em(rock 20 lifted)|ring(cam @y3) + petals 30|291|
|4|zephyr-guard|air; buff-rings; .3/20/0/self|3.0|body:true|body·AIR|T-BUF. 3 rings with normals [.3,1,0],[-.3,1,.3],[0,1,-.3], r .8 width[.03,.03] i .5 breakup .7 decay 0. em(streak 120 ring r.8 swirl 6 at 3 heights (3 emitters × 40)). em(petal 30)|4th ring, vertical|gust at the end: ring(up r3) + dust 30|251|
|5|vacuum-snap|air; implode-burst; .4/12/5/circle|2.0|act('cast',.9,3)|wide·AIR|em(streak 120 sphere r2.2 radial 1 spd[-5,-4] t=0/.8). smoke(DUST 40 inward). ring(cam 2.4→.1 .5/.4). shell(r[1.5,.1] .3/.6). Burst .9: ring(cam .1→3) + ring(up) + em(streak 80 out) + smoke(DUST 40 out) + flash .2 + shake|second contraction ring|shell outward (r[.1,2]) at .9|321|
|6|feather-storm|air; volley; .4/9/8/cone|2.0|act('throw',.35,4) + hits .45/.55|long·AIR|14 blades (SphereGeometry scaled .03×.18×.005 addMat col1 .8) in a fan, flutter rotation; trail width .03 each; start .02i; end sparks 8 (streak). em(petal 60 drifting)|4 more blades|ring(cam @target)|245|
|7|sky-pillar|air; tornado; .8/18/6/circle|3.0|act('castup',.5,3) + hits 1/1.5/2|wide·AIR|em(streak 200 disc r.4 @G swirl 6 up spd[2,4] radial .3 t=0/2.4). smoke(DUST 80 swirl @base). 3 helix ribbons (height 5, rotating TAU·3·t/3). beam(funnel r[.4,1.4] height 5 i .1). em(petal 40 orbit)|em(rock 20 orbit)|ring(up @y5) + ring(cam)|381|
|8|whisper-step|air; teleport-wind; .2/10/6/point|1.8|keys vanish→behind (like shadow-strike), target false|side·AIR|Body alpha 1→0 at [-.2,0], appears at x 2.6 at [0,.2] (body.set alpha + position). 5 curved wind ribbons A→B, t 0/.25. em(streak 40). em(petal 20 at A and B). ring(up) at both. light(30)|k.ghost at A|ring(cam @B) + dust 20|141|

**Then run the WAVE 2 TEST.**

### WAVE 3. Derived elements (tier `derived`; elements = the two parents plus the derived name, e.g. ['fire','water','steam'])
Every skill uses its derived ramp as the kit ramp. A second kit is allowed only for detail color.

#### Step B15. `src/fx/steam.js` (STEAM glow + VAPOR smoke + FIRE inner)
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|scald-burst|nova; .3/10/4/circle|1.8|act('castup',.05,2.4)|wide·STEAM|smoke(VAPOR 120 sphere radial 1 spd[3,6] drag 1.5 life[1.5,2.5] sz[.6,2]). kf.em(soft 40 orange glow center i .6). ring(up) + ring(cam). decal(glow orange faint). em(drop 40 radial). light(120 orange). flash .15. gather 30|smoke(VAPOR 50 low ring)|6 steam jets (streak 10 each)|381|
|2|boiler-geyser|ground-jets; .5/12/6/circle|2.8|act('stomp',.4,3)|wide·STEAM|3 vents (CylinderGeometry .12 .14 .1 rust metal) at a triangle r .8 around G. Each at .3/.45/.6 and again at 1.4: smoke(VAPOR 60 up spd[4,7]) + kf.em(soft 15) + em(drop 15) + em(streak 10) + ring(up small). light|central big jet at 1.0 (60)|pressure ring + flash|401|
|3|fog-brand|debuff; .4/12/7/point|3.0|act('cast',.3,3)|side·STEAM|Droplet trail A→chest .3 + soft follow 20. ring(cam) + sparks 20. Brand: decal(rune r.25 @[3,1.2,.25] rotate[0,0,0] FIRE ramp i 2 .3/2.5). smoke(VAPOR 60 around the target emit 2.4). kf.em(soft 30 embers). light(30 orange)|smoke(VAPOR 40 ring @feet)|brand pulse at 1.5 + vapor burst 30|243|
|4|kettle-rush|dash; .2/8/5/line|1.6|T-DSH x0 -1.2 x1 2.6, target 3.0|side·STEAM|smoke(VAPOR 100 follow the body hip, emit .5). kf.em(soft 30 core follow). smoke(DUST 20). ct([3,1.1,0],.02,40). ring(cam). light(orange)|em(streak 40 whistle)|steam blast 60 at the hit|333|
|5|cloud-hammer|overhead-slam; .5/10/3/circle|2.0|act('smash',0,2.2,{weapon:'hammer',windup:.6,hits:[{t:0,stop:.14,shake:.55,amp:.08}]})|wide·STEAM|swing hammer. I=[1.15,0,0]: smoke(VAPOR 120 ring r.4 dir[0,.15,0] radial 1 spd[3,6]). kf.ring(up orange inner). ring(up). em(drop 40). decal(glow). sparks 40. light. flash|second vapor ring at y .6|vertical vapor plume 50|351|
(`kf = kit(fx, o, FIRE)` for the orange inner glow.)

#### Step B16. `src/fx/lava.js` (LAVA; one shared local shader `LAVA_F` of at most 40 lines)
`LAVA_F` uses `NOISE` from '../core/glsl.js', uniforms `uTime, uProg, uHeat`. Look: black crust `#1b1210`; cracks where `fbm(p*6)` is near .5 glow in the ramp colors; reveal along uv.x < uProg.
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|magma-surge|line-ground; .6/12/6/line|3.0|act('stomp',.5,3.6)|wide·LAVA|Strip PlaneGeometry(3.4,.5,64,4) flat at x .5→3.9 with LAVA_F, uProg sm(0,.6,t), uHeat cools 2.2→3. em(drop 60 orange hopping gravity -9 bounce .2). em(flame 40 small). smoke(50). sparks 40. ring(up @target). ct(40). light moving|em(drop 40 spurts at 3 points)|target burst + ring(cam)|313|
|2|obsidian-rain|volley-fall; .6/12/8/circle|2.4|act('castup',.7,3.2) + hits .9/1.1|wide·LAVA|16 shards (OctahedronGeometry .08 scaled .5,1.6,.5, MeshStandard '#120c10' rough .05 metal .3 emissive '#ff5a14' .3) fall from y5 onto fx.rng disc points around [3.2,0,0], t .5+.04i over .25, stay stuck, emissive cools. Orange trail each. sparks 10 each. decal(scorch). smoke(30). light|6 more shards|big shard + ring(up)|311|
|3|molten-fist|melee-strike; .3/6/2/point|1.8|act('thrust',.04,1.7,{windup:.45,hits:[{t:.04,stop:.12,shake:.35,amp:.05,push:1.8}]}) (no weapon)|side·LAVA|em(soft 20 follow k.at() -.4/.7). em(flame 30 follow the hand). swing(inner 0 outer .2). ct(C,.04,50). em(drop 50 orange from the hand and the target, gravity -9 bounce .2). decal(glow r.2) ×4 at drip points. smoke(30). em(shard 20 crust)|ring(cam LAVA)|em(flame 40 ground splash)|283|
|4|crust-breaker|leap-slam; .6/14/5/circle|2.2|T-LEP Lx 1.0, target 2.6|wide·LAVA|T-LEP but cracks ramp = up(LAVA), heat [1,.4]. 10 crust slabs (Box .4×.08×.3 dark rough) tilting up and falling. em(drop 80 orange eruption). em(flame 50). smoke(60). light 150|em(drop 40 center geyser)|second crack wave + ring(cam)|291|
|5|forge-totem|totem; .8/22/6/circle|3.4|act('smash',1.0,3) + hits 1.8/2.6|wide·LAVA|Totem at [1.2,0,.4]: core Box .3×.9×.3 with LAVA_F + metal anvil top. Pulses: ring(up) + em(flame 25) + beam heat ray to the target .2 + sparks 20 @T. em(drop 60 drips emit 3). decal(glow puddle growing). smoke(40). Melt: scale.y shrinks 2.6→3.2|em(soft 40 ember fountain)|meltdown flame 50 + ring|366|

#### Step B17. `src/fx/storm.js` (STORM)
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|thunder-step|dash; .2/8/6/line|1.4|T-DSH x0 0 x1 3.0 t0 -.15, target 3.3|side·STORM|bolt from [0,1,0] to [3,1,0] (jag .15 branches 4, -.05/.4). 2 ghosts dashLow. em(spark 50 line). 3 decal(glow) along the line. ct. light flash. ring(cam)|bolt along the ground at y .2|em(spark 40 static) + ring(up)|173|
|2|static-field|ground-area; .6/14/6/circle|3.0|act('castup',.5,3) + hits every .5|wide·STORM|decal(rings r2). 6 bolts between fx.rng points inside the disc near the ground (rate 12, flicker .5, windows staggered .4). em(spark 100 disc emit 2.4 tiny). em(glint 40). light flicker. ring(up) at the edge. gather 30|3 more arcs to the target|discharge at 2.6: sky bolt + ring|211|
|3|skybolt-call|delayed-strikes; .6/16/8/circle|3.0|act('castup',1.0,3.2) + hits 1.3/1.6|sky·STORM|3 mark decals(rune r.6) at the target and 2 points, reveal .3 at 0/.1/.2 + ring(contracting). Bolt from y8 to each mark at 1.0/1.3/1.6 (width .12, .25). Each: sparks 40 + decal(scorch) + ring(up) + glint + light 150 + flash .15 + shake. smoke(dark 40 @y7)|4th mark and bolt|triple bolt at 2.0 + ring(cam)|285|
|4|ball-surge|rolling-orb; .5/10/7/line|2.4|act('cast',1.2,4.2)|long·STORM|Path x .8→4 y .4 over [0,1.2]. orb(plasma r .35 follow). orb(energy r .5 follow). 2 bolts orb→ground (from slot fn). em(spark 80 follow gravity -9 bounce .4). Glow decal follow (fx.on dec.obj.position.x). Impact 1.2: ring(cam). sparks 80. 3 short bolts. light. flash|2 mini soft emitters (20 each) orbiting|shell(r[.3,2]) burst|241|
|5|tempest-crown|buff-crown; .4/25/0/self|3.0|body:true|body·STORM|T-BUF. smoke(gray N('#7a8290','#646c7a','#2a2e36') 60 ring r.35 @[0,2.15,0] swirl 2). 3 bolts from the cloud to points around the head, rate 8. em(spark 40 ring). ring(up @y2.1 r .4). em(glint 20). light flicker .3|em(drop 40 rain from the crown)|bolt to the ground at 2.4 + ring(up)|231|

#### Step B18. `src/fx/frost.js` (FROST)
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|rime-lance-ii|projectile; .4/7/9/line|1.8|act('throw',.35,4)|long·FROST|Spear: ConeGeometry .07 1.0 6 + back cone, ice mat. trail len .6. 4 spiral wind ribbons. em(flake 60 follow). Impact: em(shard 60) + decal(frost r1 @[4,0,0]) + smoke(VAPOR 30) + ring(cam). Crystal cluster (3 octahedra) popped at the target. gather 30|em(streak 40 wind spiral)|5 ice spikes at the target base|261|
|2|snowfall-zone|ground-slow; .6/18/6/circle|3.2|act('castup',null,3)|wide·FROST|em(flake 220 disc r1.8 @[3,3.5,0] down spd[.5,1] turb .3 t=.2/2.8). smoke(white 40 @y3.6). decal(frost r2 reveal 1.5). ring(up). smoke(VAPOR 40 ground). light(30 cold)|em(flake 60 swirl ring)|ring(cam) gust + glint 30|431|
|3|hoarfrost-armor|buff-armor; .5/30/0/self|2.8|body:true|body·FROST|T-BUF + body.set({frost: sm(.2,1,t)}). 10 hex plates (CylinderGeometry .1 .1 .02 6, ice mat) fly to torso anchors. em(flake 60 swirl). smoke(VAPOR 40 @feet). em(glint 30)|decal(frost r1.2)|em(shard 40) + ring(cam)|241|
|4|shatter-step|dash-shards; .2/10/5/line|1.6|T-DSH x0 0 x1 2.8, target 3.1|side·FROST|6 crystals (OctahedronGeometry .15, ice mat) appear at x .4..2.4 as the body passes, burst at .5+.08i: em(shard 20) + smoke(VAPOR 6) each. Frost ribbon trail. smoke(snow 30). ct|decal(frost r.8 @start)|ring(cam @target) + shard 40|309|
|5|aurora-veil|heal-buff; .8/30/0/self|3.2|body:true, pose castUp|body·FROST|T-HEL. 5 curtain ribbons: points x∈arc r1.2 around the body, y 1.6→2.6, offset .15·sin(TAU·2·t/3.2+i), width .25, i .6 (second color '#7fffd0' via a mixed ramp). em(soft 80 rising). em(flake 30). light|second curtain layer r1.5|em(glint 40) + faint beam|221|

#### Step B19. `src/fx/swamp.js` (SWAMP, MUD)
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|mire-trap|trap-sink; .5/14/6/circle|3.0|act('throw',.6,3,{hits:[{t:.6,stop:.06,shake:.2,amp:.03,push:0}]})|wide·SWAMP|Mud ball trail + em(drop 20 follow). fx.water(r1.2 @G deep '#1c3a14' shallow '#4e8a2a' vortex .3 ripples). em(bubble 60 slow). em(drop 50 MUD-colored normal at .6). Target y → -.3·sm(.6,2,t) plus a mud skirt CylinderGeometry(.4,.45,.35, open) mud mat around the base. em(soft 30 spores). light(30 green)|6 reeds rising at the rim|mud burst 40|241|
|2|spore-lash|whip; .3/6/3/arc|1.4|as ember-lash, weapon whip|side·SWAMP|T-WHP. 6 follow em(soft 16 glowing spores turb .4 gravity -.3). ct 30. smoke(green 20 @tip)|second lash|em(soft 60 spore nova @target)|271|
|3|bog-tide|slow-wave; .8/16/6/line|3.2|act('sideslash',1.4,4)|long·SWAMP|Mud mound: half CylinderGeometry(.5,.5,3,16,1,false,0,π) rot x π/2 (axis along z) MeshStandard '#2c3016' rough .9, x .8→4 over [0,1.6]. em(drop 80 MUD normal lit from the crest). em(bubble 40). em(petal 30 green). smoke(MUD 30). decal(scorch green-dark trail). Target: em(drop 40) + ct 30|second smaller tide|em(glint 30 bubbles bursting)|323|
|4|reed-snare|bind; .5/12/6/point|2.8|act('cast',.5,3)|wide·SWAMP|14 reeds (CylinderGeometry .015 1.4 + Capsule .03 .12 cattail) on a ring r.35 around the target, bent inward, popped .3→.7. 3 loops (TorusGeometry .3 .02) at y .5/.9/1.3 tightening (scale 1.4→1). em(drop 30 @base). em(soft 30 spores). decal(scorch mud). em(petal 20)|em(soft 20 glowing tips)|outer ring of 8 reeds|141|
|5|moss-regrowth|heal-zone-bloom; 1.0/25/0/circle|3.4|act('castup',null,false)|wide·SWAMP|decal(glow r2 @[1.5,0,0] growing). 12 blooms (stem Cylinder + 5 PlaneGeometry petals emissive) popped staggered over [.3,2.5]. em(soft 80 spores rising). em(petal 40). ring(up) ×3. light(40 green)|em(glint 30 fireflies)|big center bloom + ring(cam)|191|

#### Step B20. `src/fx/dune.js` (DUNE, SAND)
| # | id | meta | dur | act | view·ramp | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|sandspout|tornado-moving; .6/16/6/circle|3.0|act('castup',.8,3.2) + hits 1.4/2.0|wide·DUNE|em(dust 220 normal lit SAND swirl 6 disc r.3 radial .5 up spd[2,4] t=0/2.4, follow x 2.0→3.2). em(streak 60 additive faint). smoke(SAND 50 ring @base). em(rock 20). ring(up). light(30)|second smaller spout (100)|dust blast 40 + ring(cam)|531|
|2|mirage-split|decoy; .3/20/0/self|2.6|act('cast',null,false)|side·DUNE|4 ghosts sliding from the body to z ±.8/±1.6 over [.1,.5] (move d.position in the fn; extend k.ghost with a local mesh callback), fading 1.6→2.4, each dissolving into em(dust 15 SAND). 4 vertical wavy ribbons (shimmer). smoke(SAND 40 @feet). em(glint 20). light(30 warm)|ghosts use pose 'cut'|body dissolves and reappears at a ghost position|161|
|3|dust-veil|cloud-block; .4/18/6/circle|3.2|act('throw',.4,3)|wide·DUNE|Sand ball trail. smoke(SAND 200 sphere r1.6 @[3,1,0] emit 1 life[2,3] sz[1,3] slow). smoke(SAND 60 ring @ground). em(streak 40 grains). light(30)|em(dust 60 swirl grit)|em(glint 30 glassy grains)|431|
|4|glass-storm|transform-volley; .6/14/7/cone|2.8|act('cast',.8,3.6) + hits 1.2/1.6|long·DUNE|em(dust 120 SAND from [1,1,0] dir[1,0,0] spd[3,5] t=0/1.2). em(shard 120 additive (ramp '#ffffff','#ffe2a8' glints) delayed .4 from x 1.5, same velocity). em(glint 40). sparks 40 @target emit 1. 4 wind ribbons. light|10 glass meshes (Octahedron transparent .6)|shard burst 60|421|
|5|dune-wave|sand-wave; .6/14/7/line|3.0|act('sideslash',1.0,4)|long·DUNE|em(dust 220 SAND line shapeSize[1.6,0,0] rot3[0,π/2,0] follow x .8→4.5 over [0,1.4], dir[.5,1,0] spd[1.5,3]). em(streak 60). em(rock 30). ring(up @target). ct 30. light(30)|second line .3 behind (100)|sand crash plume 60|543|

**Then run the WAVE 3 TEST.**

### WAVE 4. Tech (tier `tech`; elements = [base, tech], e.g. ['fire','plasma']). Every skill has a `fx.mesh` solid part (named in the table).

#### Step B21. `src/fx/plasma.js` (PLASMA)
| # | id | solid part | dur | act | view | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|arc-torch (melee-sweep; .3/6/2/arc)|hilt Cylinder metal + blade Box .03×.95×.03 addMat as a child of armR.hand at y -.58 + 5 small Octahedron "shock diamonds" along the blade, scale pulsing sin(TAU·6·t/1.4)|1.4|act('sideslash',.05,1.85,{weapon:'sword'})|side|sweepSurface PLASMA. ct(C,.05,50). em(spark 40 follow the tip)|return swing at .35 + ct 20|ring(cam) + ring of 8 small light spheres on the hilt|155|
|2|thermal-lance (beam-cut; .8/14/7/line)|cannon Cylinder .06 .5 metal + 3 coil Torus emissive, following the hand; 8 small light spheres around the muzzle lighting in sequence during [-.6,0]|2.2|keys hold cast, target 4, hits .2..1.4|long|gather 40. beam path: from A to B(t)=[3+.6t,.02,-1+1.4t] over [0,1.4] (r .06 core + .15 outer). em(spark 120 follow B). Ground cut strip PlaneGeometry growing addMat cooling. smoke(VAPOR 40). Light follows B|smoke(VAPOR 20 from vents)|line detonation at 1.6: spark 60 line + flash|321|
|3|solar-flare-grenade (grenade; .4/12/7/circle)|grenade Sphere .07 metal + Torus band emissive + blinking light sphere (3 integer blinks)|2.0|act('throw',.7,3.4)|wide|Parabola A→[3,.1,0] over .6 with a bounce. Burst .7: big glint 3 + soft flare. ring(cam .1→3). ring(up r4). sparks 120. light 300 dur .4. flash .35. decal(scorch + rune poly 6 brief). smoke(VAPOR 30)|second flare pulse at 1.0|8 Box plates flying out + sparks 30|225|
|4|heat-sink-shield (buff; .4/20/0/self)|plate Box .08×1.2×.9 metal at [.5,1.1,0] + 4 vent slats Box addMat (orange→cyan) + 8 edge light spheres|3.0|body:true|body|T-BUF. shell(hex cells 6 r1.0 alpha .5). smoke(VAPOR 40 from the vents). em(spark 30). Impacts on the plate at 1.2/2.0: sparks 25 + vent pulse|second plate on the left side|vent purge: VAPOR 50 + ring(cam)|241|
|5|rail-sear (line-shot; .5/8/12/line)|2 rails CylinderGeometry .025 1.0 metal along +X at the hand, emissive cooling; 6 sequenced lights along the rails|1.6|act('cast',.05,4.2)|long|beam A→[7,1.3,0] r .03 i 3 + outer .1, 0/.12. 3 rings([1,0,0]) at x 1.5/2.5/3.5. sparks 60 @T + glint. smoke(VAPOR 30 from the rails)|ring(cam @T)|second shot at .5 (sparks 60)|222|
|6|pulse-mortar (ground-barrage; .8/18/8/circle)|shoulder launcher Box .2×.2×.4 + tube Cylinder, following the torso (k.at-like read of fx.body.torso world pos)|2.6|act('cast',.9,3.4) + hits 1.2/1.5/1.8|wide|4 holo marks (decal rune poly 6 r .5 + contracting ring) on a grid. 4 shells (Sphere .06 addMat) on parabolas to the marks, arriving .9+.3i, trail each. Each impact: ring(up .1→1.6) + sparks 30 + soft flash 1 + light 100 + shake .15 + smoke(VAPOR 10)|5th shell|simultaneous final ring + flash|246|
|7|overdrive-core (buff; .5/40/0/self)|reactor Torus .18 .04 metal + inner Sphere .1 addMat + 4 fin boxes at [-.15,1.3,0], spinning|3.0|body:true|body|T-BUF + body.set({emit, scan: .2+1.6·((t·2/3)%1)}). smoke(VAPOR 30 ×2 side vents). em(spark 30). 2 small bolts near the reactor|ring of 8 hologram light spheres at the feet|peak at 2.0: flash + ring(cam) + shell(r[.5,1.4])|161|
|8|fusion-nova (nova-segments; .5/16/5/circle)|12 Box segments .5×.06×.12 addMat on a ring at y1, flying out r .4→4 over [0,.6] and rotating|2.0|act('castup',.05,2.6)|wide|gather 60. ring(up) + ring(cam). shell(hemi cells 6 r[.3,2.2]). sparks 140 radial. light 220. flash .3. decal(rune poly 6)|second segment ring at y .3, counter-rotating|orb(plasma r[.4,.05]→burst) + sparks 40|281|

#### Step B22. `src/fx/cryo.js` (CRYO)
| # | id | solid part | dur | act | view | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|nitrogen-lash (whip; .3/6/3/arc)|nozzle Cylinder metal at the hand|1.4|whip throw|side|T-WHP CRYO. 6 follow smoke(VAPOR-cyan 13). em(glint 30). ct 30. decal(frost r.6 @target)|second spray wave|decal(rune hex flash) + ring(cam)|221|
|2|cryo-grenade (grenade-zone; .4/14/7/circle)|canister Cylinder .05 .16 metal + cyan bands; 19 RingGeometry(.18,.2,6) addMat hex cells flat, popped by distance .6→1.2|2.6|act('throw',.6,3.2)|wide|Arc to G. Burst: smoke(VAPOR-cyan 100 disc radial). 6 Octahedron crystals. em(flake 40). ring(up). light 120. flash|12 more cells (second layer)|crystal burst + ring(cam)|211|
|3|coolant-surge (heal-wave; .6/14/0/circle)|ring of 6 emitter nodes (Cylinder small metal) around the feet, popped|2.6|body:true|body|T-HEL. ring(up r[.2,3] fill .3). em(drop 100 radial low CRYO). smoke(VAPOR 50). decal(rune poly 6)|second wave (60)|em(soft 50 rising) + flash|301|
|4|ice-drone-swarm (orbit-ram; .6/14/7/point)|6 drones: Sphere .07 metal + Torus .1 emissive + 2 fins + a small light sphere|2.6|act('cast',1.4,3.6) + hits 1.6/1.8/1.9|wide|T-ORB with straight trail segments. Ram impacts: em(shard 15) + smoke(VAPOR 6) each. light|2 more drones|freeze burst: decal(frost) + ring(cam)|269|
|5|frost-rail (line-shot-trail; .5/10/10/line)|2 thin Box rails + cyan coil Torus at the hand|2.4|act('cast',.05,4.2)|long|beam CRYO 0/.15. em(shard 40 @T). 12 Octahedron crystals along the ground path, popped .05→.4 staggered. smoke(VAPOR 60 along the line). decal(frost @target)|smoke(VAPOR 30 device jets)|crystals shatter at 1.8: shard 60|231|
|6|thermal-lock (debuff-cage; .4/16/6/point)|6 Box bars .04×1.9×.04 metal-ice emissive on a hexagon r .55 + 2 hex RingGeometry(.5,.58,6) addMat at y .1/1.9; the cage slides down from y3 over [.4,.7]|2.6|act('cast',.4,3,{hits:[{t:.4,stop:.1,shake:.2,amp:.03,push:0}]})|wide|smoke(VAPOR 60 inside). em(glint 30). Hex scan ring moving up (y = 1.9·((2t)%1)). Target emissive cyan. light|decal(rune vertical lock icon above the target)|ring(cam pulse) + flakes 40|201|
|7|cryo-pod-drop (summon-nova; .8/20/6/circle)|pod Capsule .3 .6 metal + 4 panel Boxes rotating open (1.0→1.2) + inner glow Sphere|2.8|act('castup',1.0,3)|wide|Holo mark (rune). Fall y8→0 over [.4,.9] with trail + VAPOR thruster 30. Land: shake + smoke(DUST 30). Nova at 1.2: ring(up r4) + smoke(VAPOR 100 radial) + em(flake 60) + em(shard 40) + light + flash + decal(frost r2.5)|second ring + VAPOR jets 30|6 crystal spikes + ring(cam)|331|
|8|zero-field (slow-field; .8/20/6/circle)|6 pylons Box .1×.6×.1 metal + cyan top light, at hexagon corners r1.8, popped; 10 hovering Octahedron crystals bobbing|3.0|act('castup',null,3)|wide|decal(rune poly 6) + decal(rings). smoke(VAPOR 120 ground disc slow). em(soft 40 near-static motes). Target pushed slowly. light|6 thin beams between the pylons|field pulse ring(up) + flash at 2.4|201|

#### Step B23. `src/fx/nano.js` (NANO)
| # | id | solid part | dur | act | view | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|swarm-blade (melee; .3/6/2/arc)|20 tiny Box .03 metal('#c9d3dc','#35ffc0',.5) assembling along the blade from scattered positions [-.45,-.1] as children of armR.hand, scattering again after .5|1.4|act('slash',.07,1.85) (no weapon)|side|3 em(shard 60) following bladeTable points (len .3/.6/1.0) [-.4,.4]. sweepSurface NANO. ct 40|ring(cam) + scanline|second strike burst 50|313|
|2|scrap-barrage (volley-magnet; .5/10/8/cone)|magnet TorusGeometry(.2,.05,8,24,π) metal + green emissive poles at the hand; 14 scrap meshes (Tetra/Box metal)|2.4|act('cast',.8,4) + hits 1.0/1.2|long|Scrap rises from ground points r1 [0,.4] to a hover, fired to the target staggered [.6,1.2], thin trails. 6 faint green field-line ribbons during the pull. sparks 12 each. light|4 more scraps|big plate + ring(cam)|277|
|3|lattice-wall (wall-build; .6/20/0/line)|21 hex cells CylinderGeometry(.22,.22,.05,6) facing +X (3 rows × 7) metal + edge RingGeometry addMat, popped from the bottom-center outward .1→.8|3.0|act('castup',null,false)|high|em(spark 4 per cell on arrival). em(soft 80 nano stream to the build points). Holo ground line. Disassemble 2.6→3.0. light|scan plane (addMat) sweeping up|2 incoming bolts hit the wall: sparks 30 + ring(cam)|235|
|4|magnet-pull (pull; .5/14/6/circle)|core: floating Torus + center Cylinder at [3,1.2,0], spinning; 12 metal debris pieces|2.6|act('cast',null,3,{target:[3.6,0,0]})|wide|Debris flies from a ground ring r2 to the core [.3,1.4] and sticks; falls at 2.2. 6 field ribbons. em(spark 60 inward). ring(contracting). Target pulled. light|2 bolts debris→core|core burst + ring(cam) + sparks 40|141|
|5|repair-cloud (heal; .8/16/0/self)|3 tiny drones (Box .05 metal + green light) orbiting|3.0|body:true|body|T-HEL. em(shard 200 tiny additive green sphere r.7 swirl 2). body scan y moving (2 cycles). 3 plus icons (Box addMat) rising|3 thin repair beams drone→body|completion flash + ring(cam) + sparks 40|311|
|6|titan-fist (summon-punch; .6/12/4/point)|8 plates (Box) assembling around the right hand during [-.6,-.05] (lerp from scattered to anchors at the hand world pos) + green seam lights|2.0|act('thrust',.3,3.2,{hits:[{t:.3,stop:.14,shake:.45,amp:.06,push:2.2}]})|side|Rocket fist from the hand to the target over [0,.3]. em(flame 40 thruster NANO-cyan follow). ct(60). ring(cam). ring(up). sparks 60. smoke(VAPOR 20)|knuckle spikes pop + sparks 30|second shock ring + plates scatter|253|
|7|mine-grid (trap-chain; .6/18/6/grid)|9 mines (Cylinder .1 .04 metal + green top light, blinking in integer cycles) on a 3×3 grid at spacing .7 around the target|2.4|act('throw',1.2,3.4)|high|Quick deploy arcs [0,.4]. 6 holo grid lines (thin planes). Chain detonation 1.2+.08·dist: ring(up r1) + sparks 20 + flare 1 each. ring(cam center). Light moves. shake|bolt chain between the mines|center blast 60|290|
|8|turret-assembler (summon; 1.2/30/8/point)|base Cylinder, column Box, head Box, 2 barrels Cylinder, green sensor Sphere; wireframe blueprint copy (MeshBasic wireframe green) [0,1.4]|3.2|act('castup',2.0,4) + hits 2.3/2.6|wide|Parts fly in sequence [.2,1.4], spark welds 15 each. 3 shots: thin green beam .08 + muzzle sparks 10 + impact sparks 20. light|8 rotating sensor lights|final burst shot + ring(cam)|221|

#### Step B24. `src/fx/ion.js` (ION)
| # | id | solid part | dur | act | view | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|ion-lash (whip; .3/6/3/arc)|handle Cylinder metal + emissive coil Torus; 5 small Torus glow rings following pts index 5i|1.4|whip throw|side|T-WHP ION. em(spark 60 along). ct 30. bolt tip→target .2|second crack|ring(cam) + bolt to the ground|163|
|2|sonic-lance (shot-cone; .4/8/9/cone)|horn ConeGeometry(.15,.4,16,1,true) metal at the hand|1.6|act('cast',.15,4)|long|6 rings([1,0,0]) at x 1..3.5 with radii growing (cone), staggered .03. em(streak 80 +X fast). smoke(VAPOR 40 disc at the muzzle, radial). ct(T,.15,40). light|second boom|smoke(DUST 40 line) + ring(up @target)|243|
|3|static-drone (drone-chain; .6/14/8/chain)|hex body CylinderGeometry .15 .15 .06 6 metal + 2 rotor Torus + blue lights; flies to hover at [2.2,2,.6] and bobs|2.6|act('cast',.8,3.4) + hits 1.2/1.6|wide|Chain bolts: drone→target (.8), target→[3.8,.1,1.2] (1.2), →[4.2,.1,-1] (1.6). sparks 25 each. light|second drone|overload ring(cam) + final bolt|146|
|4|vacuum-grenade (implode-shock; .4/14/7/circle)|grenade Sphere metal + blue bands + 4 casing Boxes flying off at 1.0|2.2|act('throw',1.0,3.2)|wide|Lands at .5. decal(rune hex). em(streak 120 inward [.5,.95]). ring(cam contracting). shell(r[1.6,.1]). Shock at 1.0: ring(up r5) + ring(cam) + sparks 80 + smoke(DUST 40) + flash + shake|second shock ring|orb(energy r[.1,.8])|281|
|5|jet-dash (dash-thruster; .2/8/6/line)|jetpack: 2 Cylinder nozzles metal following the body|1.5|T-DSH x0 0 x1 3, target 3.3|side|em(flame 60 ×2 ION follow the nozzles dir -X). ring([1,0,0]) at the start and at x 1.5 (sonic). Streak trails|5 shock-diamond soft particles in the flame|sonic ring at the end + sparks 30|263|
|6|pulse-ring (nova-emp; .4/16/5/circle)|3 RingGeometry(r,r+.08,6) addMat hex rings scaling out over [0,.6] staggered|1.8|act('castup',.05,2.6)|wide|2 short bolts on the target. sparks 100 radial. ring(up). Target emissive blue flicker (integer cycles), then dim. decal(rune poly 6). light|12 ground light spheres lighting outward|second EMP + flash|181|
|7|orbital-beam (sky-strike; .8/20/8/point)|3 hologram mark plates (thin hex CylinderGeometry .3 .3 .01 6 addMat) on a triangle around the target|2.4|act('castup',.9,3,{hits:[{t:.9,stop:.1,shake:.5,amp:.07,push:2}]})|sky|3 targeting lasers from the sky (thin beams sweeping to the marks [-.3,.6]). Main beam ION r .6 height 15 .9/.8 + core. ring(up). sparks 100. smoke(VAPOR 40). decal(scorch). light 250. flash|rings(up) at y 1/2/3 on the beam|aftershock rings + glint 30|211|
|8|blade-turbine (buff-shield; .4/20/0/self)|8 blades Box .5×.03×.08 metal with addMat edge, on R .8 y1.1, angle TAU·4·t/3 + hub Torus|3.0|body:true|body|T-BUF. em(spark 80 tangential ring swirl 8). ring(ION up r .8). 2 incoming bolts at 1.2/2.0 deflected: sparks 20 each|second blade ring at y .5|blades launch outward at 2.6 with trails|191|

**Then run the WAVE 4 TEST.**

### WAVE 5. Quantum
#### Step B25. `src/fx/quantum.js` (QUANTUM; tier `quantum`, elements ['quantum'])
One local shader `RIFT_F` of at most 40 lines: a jagged edge glowing cyan/magenta, a dark interior, and `uOpen`.

| # | id | meta (arch; ct/cd/r/shape) | dur | act | view | layers | g2 | g3 | P3 |
|---|---|---|---|---|---|---|---|---|---|
|1|phase-shift|teleport-glitch; .2/10/6/point|1.8|keys vanish→behind, target false|side|Glitch: body.position jitter from a 60-value fx.rng table indexed floor(t·30) in [-.3,.1]. 2 RGB ghosts (k.ghost with scanCol cyan / magenta at ±.06). Swap to x 2.8 at 0. 12 glitch planes addMat flashing (fx.rng windows). Body scan. ring(up) at both. light|em(soft 40 square pixels)|3-ghost chain between A and B|121|
|2|singularity-seed|black-hole; .6/18/7/point|2.4|act('cast',1.6,3)|wide|Seed soft trail to [3,1.2,0] [0,.3]. orb(void r[.05,.35] .3/1.3). Accretion ring (normal [.2,1,.3] r .7 width .25). em(soft 120 disc flat swirl 8). shell(r .6 power 6 faint lens). em(streak 80 inward). Target pulled. Burst 1.6: ring(cam .1→4) + sparks 100 + flash .3 + shake|second accretion ring|em(spark 60) + light|371|
|3|time-fold|rewind-area; .8/20/6/circle|2.8|act('castup',null,3)|wide|decal(rings) + decal(rune clock r2). 6 debris meshes (rock/crystal) thrown out by a burst at .2 on path Pi(u); at 1.0 time reverses: pos = Pi(tf(t)) with tf = t<1 ? t : max(0, 2-t). Per object 2 ribbons: the forward path (cyan) and the reverse path (magenta). Fading past copies. em(soft 40 burst). ring(contracting at 1.0). light|em(glint 30)|ring(cam) + flash at 1.8|151|
|4|echo-clone|clone-attack; .4/14/3/point|2.0|act('slash',.0,2,{weapon:'sword'})|side|Clone: new Dummy({weapon:'sword'}) holo QUANTUM with its own keys (evalKeys) [[0,'guard'],[.3,'windupHigh'],[.5,'cut','snap'],[.7,'follow']] at x1 z.8, emerging [0,.3]. 3 after-image ghosts behind it. Clone strike .5: slash + ct(40). Caster ct(20) at 0. Clone dissolves into em(soft 60) at 1.2|second clone at z -.8|both clones strike together + ring(cam)|165|
|5|entangle-link|link-beam; .5/16/6/chain|2.4|act('cast',.3,3) + hits .9/1.5|wide|Second Target (import Target from '../core/dummy.js') at [3.4,0,1.6] via fx.mesh, wobble pivot.rotation.z = -.15·exp(-(t-h)·6)·sin(40(t-h)) per hit. 2 helix ribbons (cyan + magenta) between the two chests. Short beam caster→target. Pulses along the link (soft follow lerp 30). sparks 20 at both per hit. light|em(soft 60 shared motes)|ring(cam) at both|191|
|6|gravity-crush|press-crater; .6/16/4/point|2.2|act('smash',.5,3,{hits:[{t:.5,stop:.14,shake:.6,amp:.08,push:0}]})|wide|Press disc CylinderGeometry(1,1,.05,6) dark-violet metal + magenta rim ring, descending from y4 to 1.9, slamming at .5. Target squash target.scale.y = 1-.35·sm(.45,.55,t)·(1-sm(1.2,1.8,t)). decal(cracks) + decal(scorch). ring(up). smoke(DUST 60 ring). em(rock 20). decal(rings). light. flash|second press pulse at 1.0|ring(cam) + sparks 40|161|
|7|warp-rift|rift-slash; .5/14/4/arc|2.0|act('sideslash',.5,2.4) + hits .7/.9|side|Rift PlaneGeometry(.4,2) with RIFT_F at [1.6,1.1,0], uOpen sm(0,.4,t)·(1-sm(1.4,1.8,t)). 3 slashes emerging from the rift toward the target at .45/.65/.85 (ct 30 each). sparks 40 on the rift edges. 8 glitch planes. light. flash|rift second color pulse + em(soft 40)|ring(cam) + slash X|177|
|8|probability-storm|random-volley; .6/18/8/cone|2.4|act('cast',.6,4) + hits .9/1.2/1.5|long|20 projectiles i: fate = fx.rng.pick(['hit','miss','split']), color = fx.rng.pick([0,1]) (kit col 0 or 1 ramp), start .03i, flight .4. Trail with flicker .8. hit: sparks 10. miss: passes to x 6 and fades. split: 2 short diverging trails. Light flicker .3|6 more projectiles|collapsed outcome: big impact(60) + ring(cam)|361|

At the end of B25: README edit (A6). **Then run the WAVE 5 TEST and the FINAL TEST.**

---

## C. Per-wave test phase (run only after all coding steps of the wave)
Replace `<cats>` with the wave's categories (W1: warrior rogue archer mage priest shaman dark; W2: pyro hydro geo aero; W3: steam lava storm frost swamp dune; W4: plasma cryo nano ion; W5: quantum).
```
node tools/serve.mjs 8123                                             # if it is not running already
for c in <cats>; do node tools/shots.mjs /tmp/wN/$c cat:$c 0.1,0.4,0.8,-0.9; done           # fix EVERY console error/warning
for c in <cats>; do node tools/shots.mjs /tmp/wN/g3/$c cat:$c 0.5 grade=3; done             # must print no "PARTICLES" lines (≤900 at grade 3)
for c in <cats>; do node tools/sheet.mjs /tmp/wN/$c.png /tmp/wN/$c/*.png; done              # open each sheet with Read and LOOK
# grade comparison: 5 skills per category (pick #1..#5), 3 grades, same time
for g in 1 2 3; do node tools/shots.mjs /tmp/wN/grade$g <id1,id2,id3,id4,id5> 0.5,-0.6 grade=$g; done
node tools/sheet.mjs /tmp/wN/grades.png /tmp/wN/grade1/*.png /tmp/wN/grade2/*.png /tmp/wN/grade3/*.png
node tools/determinism-test.mjs cat:<cat>                              # same seed gives the same pixels (A-check)
```
Fix loop:
- Unreadable, empty or too bright: change intensity (0.3-0.9 for dense additive emitters), size or timing.
- If grades look the same, make the g2/g3 layers larger. Do not change colors.
- If two skills in one category look alike, change the silhouette layer.
- After each fix, re-run `shots` for the changed category only.

Final run (after wave 5): `node tools/shots.mjs /tmp/final all 0.5` must print `ok 406/406`. Also run `node tools/shots.mjs /tmp/final3 all 0.5 grade=3` and check for no PARTICLES lines.

**Report per wave (plain text, in the reply):** list the weak skills with reasons, and the checks that were not done (for example a real-GPU `perf.mjs`).

**Acceptance checklist (TASK2 §12):**
1. 162 new ids, all unique (`node -e` count of the registry, or the count line in the gallery shows 406).
2. `shots.mjs all 0.5` prints no errors.
3. Each skill shows wind-up, release, impact and aftermath. Check the frames at 0.1/0.4/0.8/-0.9; the aftermath must still be visible at -0.9.
4. Grades 1/2/3 differ clearly in the grade sheets: size, brightness and extra layers.
5. Each tech skill has an `fx.mesh` solid part and a clean, hard look.
6. Each derived skill uses its ramp.
7. Original names and looks only (names as given in TASK2).
8. The report states which checks were not done.

Also confirm in code:
- No `Math.random`: `grep -n "Math.random" src/fx/*.js` must be empty.
- Orbs + shells ≤ 3 per skill, and at most 2 `cracks`/`frost` decals per skill.
- Every energetic skill has `k.light` or `contact`.
- Every skill that hits has hits, shake or flash.
- Every skill has 3 or more layers.

---

### Critical Files for Implementation
- /Users/muhammet.kocyigit/Downloads/pixelfx3d/src/fx/_skill.js (new: ramps, grade, kit, SKILL/meta/act)
- /Users/muhammet.kocyigit/Downloads/pixelfx3d/src/fx/index.js
- /Users/muhammet.kocyigit/Downloads/pixelfx3d/src/fx/melee.js (reuse `swing`/`contact`/`bladeTable`/`sweepSurface`) and /Users/muhammet.kocyigit/Downloads/pixelfx3d/src/fx/moves.js (dash, teleport and projectile patterns; extra POSES)
- /Users/muhammet.kocyigit/Downloads/pixelfx3d/gallery/index.html, /Users/muhammet.kocyigit/Downloads/pixelfx3d/gallery/test.html, /Users/muhammet.kocyigit/Downloads/pixelfx3d/tools/shots.mjs
- /Users/muhammet.kocyigit/Downloads/pixelfx3d/src/core/dummy.js (2 new poses only) and /Users/muhammet.kocyigit/Downloads/pixelfx3d/index.d.ts (grade/meta types)

---

**Left out and not checked:**
- The `phase` helper: timing is a fixed rule instead.
- Radio buttons for the grade: a select is used instead.
- Category is taken from the id, so `SKILL` has no separate `category` argument.
- I did not run any of the code. `_skill.js` and the 162 specs are reviewed by reading only.

**Risks:**
- **Particle totals** in the P3 column are estimates. The `shots.mjs grade=3` PARTICLES check is the real gate.
- **Shared poses:** `_skill.js` imports `moves.js` for its poses. If someone loads a skill category without the index, the poses still register, but `moves.js` is evaluated twice by path. That is harmless.
- **Per-frame allocation:** emitter `follow` and mesh callbacks that build arrays (for example `P(t)`) allocate memory every frame. Existing effects do the same.
- **mire-trap sinking:** the target sinks a little below y=0, which the guide says not to do. The mud skirt hides this on the normal stage, but it can show in transparent mode.
