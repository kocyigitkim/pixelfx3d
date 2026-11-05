# PLAN5: AAA pass over the remaining 396 effects (three r170, WebGL2)

Goal: the 396 effects that were not rebuilt in P4 should match the 10 showcase effects (Diablo IV / Black Desert realistic-dark). This must not change any `id, name, category, duration, loop`, `stage`/`view`, `act` or `meta`. Adding a `tier:` field to a definition is allowed (ground-slam already has one). Do not touch the showcase effects: fire/fireball, fire/meteor, fire/campfire, explosions/grenade, melee/sword-slash, impacts/ground-slam, holy/heal, ice/frost-nova, lightning/lightning-strike, shadow/void-orb.
Process: sequential Haiku steps, one file each, about 250 changed lines or fewer. Acceptance per step is `node --check <file>` only. No browser runs until the test phase (§4).

## 0. Before S1 (coordinator)
- `git tag p4-final`.
- Record the perf baseline: `node tools/perf.mjs <PERF30> medium` and save the output to `.out/p5/perf-p4.txt` (list in §4).
- Before-sheets: `node tools/shots.mjs .out/p5/before all -0.3,-0.7`.

## 1. Per-class recipes (mechanical; apply by class letter)
Shared numbers (feel.js `TIER` plus this plan):

| tier | light peak (cd) | ENV.impact k | screen flash max | shock r (m) | dust crown | debris | impact strength |
|---|---|---|---|---|---|---|---|
| 1 | 25 | 12 | 0 | 2.5 | 16 | 8 | 0.4 |
| 2 | 70 | 9 | 0.08 | 4 | 26 | 18 | 0.7 |
| 3 | 140 | 6 | 0.15 | 5 | 36 | 30 | 1.0 |

**Value hierarchy (every class).**
- (V1) At most one layer per effect has `intensity > 1.5`: the focal layer. Exempt: sparks and glints (count ≤ 60, life ≤ 0.7) and the 2-frame core sprite from `burst()`.
- (V2) Focal caps: orb 2.5, beam 2.5, bolt 3, slash 2.6, ribbon/trail 1.5, ring 1.0, shell 1.5, decal 1.2. Any `intensity ≥ 3` on an orb, ring, beam, shell or ribbon is clamped to its cap.
- (V3) A first ramp stop of `'#fff'`/`'#ffffff'` in an additive layer that is not a spark or glint becomes `'#fff2dc'` if the second stop is warm (R > B), otherwise `'#e8f2ff'`. Arcane and void use `'#f0e8ff'`.
- (V4) `fx.flash`: amount ≤ the tier flash max, color never `'#fff'` (use the ramp's second stop).
- (V5) Smoke and dust: `blend:'normal', lit:1, order:-1`, ramp colors at most `#5a5048` (albedo ≤ 0.35). Exception for steam, vapor, mist, fog, cloud and snow: ≤ `#b8c0c8`.
- (V6) Scorch decal ramps have no stop darker than `'#1a1410'`. Replace `'#000'`, `'#050403'`, `'#100'`, `'#200'` and `'#300'` at stop 0 with `'#1a1410'`.
- (V7) Light peak = `intensity × max(env)` ≤ the tier cap. Effects without a tier are tier 1 if they loop, otherwise tier 2.
- (V8) At most 4 `fx.light` per effect: each Light holds a pool slot for the effect's whole life. Remove the dimmest extras.

**A) Impact / burst** (explosion, slam, strike, hit). Add `tier: N` to the definition (number from the step list).
1. At each main hit time T, add one line `burst(fx, P, T, { ramp, col, dir })`, placed at the END of `build` (so existing decals are counted and the random-number order of earlier layers is unchanged).
   - P is the hit point.
   - `ramp` is the effect's warm (or element) life-order ramp after V3.
   - `col` is the light color.
   - `dir` is `[0,-1,0]` for ground hits; for side hits it is the hit direction.
   - Ground variant if `P[1] < 0.35`; override with `ground:false|true`.
2. Remove what `burst()` now provides at T ± 0.05:
   - `fx.shake`
   - `fx.light` lights that peak at T
   - up-normal shock `fx.ring` with `intensity > 0.5` or `fill > 0` (keep at most one extra ring, set to `intensity:.3, fill:0`, width halved)
   - the `'#fff'` flash.
   Keep existing decals; apply V6.
3. Fire layers: `kind:'flame'`, or `tex:'explosion-fireball'` with count ≤ 12·s, `sizePow .5`, `intensity ≤ .8`. Additive `kind:'smoke'` becomes an explicit `tex:'explosion-fireball'` with count ≤ 12. Fireball orbs fade out within 40 % of their life (`fade:[0, .55·dur]`).
4. Sparks stay procedural (`kind:'spark'`). Cut count to ≤ 110 total.
5. Several hits: `burst` with the full tier on the last or biggest hit, tier 1 with `{dust:false, debris:false, marks:false}` on the others.

**B) Projectile / flight.**
1. Leading edge is brightest: the head orb or glow `intensity ≤ 2.5` is the focal layer; trails `≤ 1.2`, tapered (default).
2. Trail: keep `fx.trail`/`trailR`. Physical projectiles (rocket, cannonball, flare, missile, firework) get a smoke trail: `kind:'smoke', blend:'normal', lit:1`, count ≤ 40, `follow` set to the head path.
3. The light follows the head:
   `const L = fx.light({...}); fx.on((t) => L.obj.position.set(...path(t)));`
   Intensity ≤ 0.5 × the tier cap.
4. Arrival: one-shot effects call `burst(fx, hitPos, tHit, { tier: 1 | 2 })`. Loop projectiles call `burst(..., { impact:false })`; `burst()` already turns off debris and decals in loops.

**C) Persistent loop** (fire, aura, orb, totem, beam, vortex).
1. No `fx.impact`, no full `burst`.
2. Lights: tier 1 cap (≤ 25; torches 10–25). The `flicker` rate is already rounded to integer harmonics in loops; `fx.on` callbacks must use `2π·n/duration`.
3. Every `fx.erode` in a loop: `lifeFade:0` and `scroll:[Math.round(k*D)/D, 0]` (integer scroll per period; D = duration).
4. Optional: one erode mesh replacing a flat whole-duration aura ring. Use `band({r, h:.4})` for auras or `spiral({turns:2, r0, r1, h})` for vortices, with `intensity ≤ .6, erode:[.3,.8], tile:[6,1], blend:'add'`. At most one per effect; only when a whole-duration up-normal ring is the aura.
5. Smoke under V5. Flames: `kind:'flame'` (auto-mapped to fire-column).

**D) Melee / act-based.** Act hits already emit `fx.impact` and shake; do not add `fx.impact` or `fx.shake`.
1. Contact: use `contact()` from melee.js (upgraded in S9).
2. Ground-hitting swings (smash, cleave, stomp, pound, slam): `burst(fx, groundP, T, {})`. Its impact is skipped automatically because the act has a hit at T.
3. `fx.slash`: intensity ≤ 2.6 on the main slash only; extra slashes ≤ 1.5. V3 on their ramps.
4. Target-feet dust: ≤ 8 `kind:'dust'` puffs (the sword-slash pattern).

**E) Buff / heal / body / teleport.** No `fx.impact`, debris or cracks.
1. Spiral/arc erode meshes: `w ≥ .25`, `intensity ≤ 1.6`, `head:[0,1]`, ramps warm-desaturated (`'#fff2dc' → '#e0b870' → '#8a5a20'`; green heal `'#eaf6dc' → '#8ac06a' → '#2a5a20'`).
2. Body shader `emit`/`glow` ≤ 1.5. Lights ≤ 0.5 × the tier cap, `env: (t) => ENV.attack(t - t0, .08, 4)`.
3. Shells ≤ 1.5. `fx.flash` only at tier 3, ≤ 0.08.

**F) Environment** (water, weather, nature fields).
1. Water discs `y ≥ .015`.
2. Mist, spray and clouds: textured smoke (`kind:'smoke'` normal) under V5 (vapor exception).
3. Rain, snow, leaves and petals: unchanged except lights (tier 1 cap) and V3.
4. One-shot splashes or geysers: `burst(fx, P, T, { dust:false, debris:false, marks:false, flash:false })`.
5. Storm bolts: flash ≤ 0.15, light ≤ 70.

**G) Screen / transition / UI.** Leave as is, except V4: `fx.flash` amounts > 0.15 become 0.15, and a `'#fff'` color becomes warm. No `burst`.

## 2. `src/fx/_aaa.js` (new) and the kit (S1)
`_aaa.js` imports only core modules, so it creates no import cycle (`_skill.js` imports moves.js).
```js
// PLAN5 recipe layers: impact burst (flash sprite, capped light, erode shock, ring, dust crown, debris, ground marks).
import { ringSheet } from '../core/meshes.js'; import { ENV } from '../core/feel.js'; import { Decal } from '../core/prims.js';
export const LCAP = [0, 25, 70, 140], LK = [0, 12, 9, 6];
export const SHOCK = [[0, '#ffd9a0'], [0.5, '#ff9a40'], [1, '#7a2a08']], SCORCH = [[0, '#1a1410'], [0.5, '#f60'], [1, '#fc8']];
export const DUSTC = [[0, '#5a4a3a', 0], [0.12, '#3a3028', 0.35], [1, '#2a2420', 0]];
export const tierOf = (fx, o = {}) => Math.min(3, Math.max(1, Math.round(o.tier ?? fx.tier ?? 2)));
export const capL = (fx, i, o) => Math.min(i, LCAP[tierOf(fx, o)]);
export function burst(fx, pos, t, o = {}) {
  const b = (fx._bt ||= []); if (b.some((x) => Math.abs(x - t) < 0.05)) return; b.push(t); // one burst per hit time
  const T = tierOf(fx, o), L = fx.loop, gnd = o.ground ?? pos[1] < 0.35, r = o.r ?? [0, 2.5, 4, 5][T], ramp = o.ramp ?? SHOCK, G = [pos[0], 0.02, pos[2]];
  if (o.impact !== false && !L && !(fx.actor?.hits || []).some((h) => Math.abs(h.t - t) < 0.05)) fx.impact({ t, strength: [0, 0.4, 0.7, 1][T], dir: o.dir ?? [0, -1, 0], pos });
  if (o.flash !== false) fx.emitter({ count: 1, kind: 'soft', blend: 'add', shape: 'point', pos, speed: 0, life: [0.05, 0.05], size: [0.3 + 0.13 * T, 0.3 + 0.13 * T], ramp: [[0, '#fff6e0', 1], [1, ramp[1][1], 0.6]], intensity: 8, delay: t, emit: 0.001 });
  if (o.light !== false) fx.light({ color: o.col ?? ramp[1][1], intensity: LCAP[T], pos: [pos[0] + 0.2, pos[1] + 0.8, pos[2] + 0.8], range: 8, t0: t - 0.02, dur: 1.2, env: (u) => ENV.impact(u - t, LK[T]) });
  if (!gnd) { fx.ring({ t0: t, dur: 0.4, r: [0.1, r * 0.4], width: [0.1, 0.02], normal: 'cam', pos, intensity: 0.3, fill: 0, ramp }); return; }
  const sh = fx.erode({ geo: ringSheet({ r0: 0.55, r1: 1 }), erode: [0.25, 1], tile: [6, 1], scroll: [1.5, 0], blend: 'add', intensity: 0.4, ramp, pos: G, t0: t, dur: 0.5 });
  fx.on((u) => { const s = 0.3 + (r - 0.3) * Math.min(1, Math.max(0, (u - t) / 0.5)); sh.obj.scale.set(s, 1, s); });
  fx.ring({ refract: 0.02, dark: 0.3, t0: t, dur: 0.8, r: [0.2, r * 1.1], width: [0.12, 0.03], normal: 'up', pos: G, intensity: 0.3, fill: 0, ramp });
  if (o.dust !== false) fx.emitter({ count: [0, 16, 26, 36][T], kind: 'dust', blend: 'normal', lit: 1, shape: 'ring', radius: 1, radiusIn: 0.6, pos: [pos[0], 0.1, pos[2]], dir: [0, 0.3, 0], spread: 0.3, radial: 1, speed: [1.5, 3], life: [1.2, 1.8], size: [1.12, 1.96], ramp: DUSTC, intensity: 0.6, drag: 1.6, order: -1, delay: t, emit: 0.1 });
  if (L) return; // loops: no debris / marks (seam)
  if (o.debris !== false) fx.debris({ count: [0, 8, 18, 30][T], pos: [pos[0], 0.1, pos[2]], speed: [3, 7], spread: 0.8, size: [0.04, 0.1], life: 2.2, color: '#4a4038', t0: t });
  const nd = fx.parts.filter((p) => p instanceof Decal).length, D = Math.max(0.3, fx.duration - t - 0.05);
  if (o.marks !== false && nd < 2 && T >= 2) fx.decal({ kind: 'cracks', t0: t, dur: D, r: [r * 0.6, r * 0.7], fade: [0.05, D * 0.7], heat: [1, 0.1], reveal: 0.4, cells: 4, pos: G });
  if (o.marks !== false && nd < 1 && o.scorch !== false) fx.decal({ kind: 'scorch', t0: t, dur: D, r: [r * 0.3, r * 0.4], fade: [0.05, D * 0.7], heat: [1, 0], ramp: o.scorchRamp ?? SCORCH, pos: G });
}
```
Edits to `_skill.js` (about 25 lines):
1. `import { burst, LCAP } from './_aaa.js'; import { ENV } from '../core/feel.js';`
2. Ramps (V3/V5):
   - STORM `'#ffffff'` → `'#e4ecff'`
   - PLASMA → `'#dff6ff'`
   - STEEL → `'#e8eef6'`
   - HOLY → `'#fff2d6'`
   - ARCANE → `'#efe4ff'`
   - `DUST = N('#5a4a3a','#3a3028','#2a2420')`
   - `SAND = N('#6e5c40','#5e4e36','#2a2014')`
3. `const I = (p, d, b, c = 99) => Math.min(c, (p.intensity ?? d) * b);`
   - Caps: ring 1.0, orb 2.5, shell 1.5, beam 2.5, ribbon 1.5, trail 1.5, bolt 3, slash 2.6, decal 1.2; `em` uncapped.
   - Ring defaults: `width [0.12, 0.03]`, `intensity 0.6`, `fill: 0` when the normal is up.
4. `light`: `intensity: Math.min(LCAP[G.g], I(p, 50, b) * (G.g === 3 ? 1.3 : 1))`.
5. `gather` intensity 2 → 1.2.
6. `impact(pos, t, n, r)`: keep sparks and glint; replace ring + light + shake with `burst(fx, pos, t, { tier: G.g, ramp: pr, col: col(1), r: r * 3 })`.
7. `extras(pos, t, cls)`:
```js
extras: (pos, t, cls) => { const soft = cls === 'E' || (!cls && SOFT.test(fx.def.meta?.archetype || ''));
  if (G.g >= 2) fx.flash(t + 0.12, 0.1, col(1), [0, 0, 0.06, 0.1][G.g]);
  if (soft) { fx.light({ color: col(1), pos: [pos[0], pos[1] + 0.5, pos[2] + 0.8], range: 9, intensity: LCAP[G.g] * 0.5, t0: t, dur: 0.9, env: (u) => ENV.attack(u - t, 0.08, 4) });
    if (G.g === 3) k.ring({ t0: t + 0.1, dur: 0.6, r: [0.2, 2.4], normal: 'up', pos: [pos[0], 0.02, pos[2]], intensity: 0.5 }); return; }
  burst(fx, pos, t, { tier: G.g, ramp: pr, col: col(1), dir: cls === 'B' ? [1, 0, 0] : [0, -1, 0] });
  if (G.g === 3) { k.sparks(pos, t + 0.1, 40, { speed: [3, 9] }); k.glint(pos, t + 0.1, 1.8); } },
```
   with
   `const SOFT = /^(buff|heal|chain-heal|shield|totem|decoy|link-beam|nova-cleanse|life-steal|rewind-area|lift-area|slow-field|ground-slow|cloud-block|wall|ring-wall)|^teleport(-wind|-portal|-glitch)?$/;`
8. Also in S1:
   - feel.js `TIER[n].light` 40/120/400 → 25/70/140 (data only; not read at runtime).
   - shots.mjs warning line: `parts.filter(p => p.l).length > 4` → push `LIGHTS id n`.
   - alpha-test.mjs: `const ALPHA_IDS = process.argv[2]?.split(',') ?? [...]`.
9. Acceptance: `node --check` on `_aaa.js`, `_skill.js`, feel.js, shots.mjs, alpha-test.mjs. About 60 lines changed.

## 3. Steps
Format: ids → class + tier.
- "burst" means the A recipe line.
- Every step also applies V1–V8 to every non-showcase effect in the file.
- Particle budget: shots.mjs flags any effect over 900. Per step, keep each effect at or under its old count + 37 (crown + core). `burst` adds at most 37 particles (debris is instanced and not counted).
- Every step's acceptance is `node --check src/fx/<file>`.
- Line estimate is about 8 lines per A/B effect and 3 per C/E/F/G effect.

**S2 explosions.js (11, about 120 lines)**
- Rewrite the `blast()` helper: drop the white flash .7 and the shake; flash → `'#ffd090'` at the tier max; drop the fill ring; additive smoke → `tex:'explosion-fireball'`, count 12·s; add `burst(fx,[x,0,z],t0,{ramp:HOT, r:Math.min(5, 2.5*s)})`; scorch ramp V6.
- small-explosion A2, barrel-explosion A2, big-explosion A3, dirt-explosion A2 (debris 30), nuke A3 (keep its own big ring at .3), plasma-explosion A2 (cool ramp), implosion A2 (burst at TP), smoke-bomb A1 `{flash:false}`, firework-burst A1 `{ground:false}`.
- firework-rocket B. cartoon-pow G.

**S3 impacts.js (10, about 100 lines)**
- The sparks/smoke/rocks helpers get V5/V3.
- hit-spark A1 air, hit-flash A1 air, crit-hit A2 air, blunt-hit A2 air, bullet-impact A1, ricochet A1 air, heavy-landing A3 ground (fix the black `#050403` scorch and `#000` cracks per V6).
- parry D1, shield-block D2, impact-frame G.

**S4 fire.js (9, about 70 lines)**
- brazier, candle, torch, spirit-flame, fire-tornado, fire-breath, flamethrower: C.
- fire-ring A2 `{debris:false}`. Known weak: tongues read as single sprites; do not restructure.
- flame-pillar A2 `{debris:false}`.

**S5 lightning.js (10, about 80 lines)**
- `BOLT`/`sparkRamp` first stop → `'#e8f2ff'`.
- ball-lightning C (seam residual; caps only), plasma-ball C (caps only), spark-arc C, storm-cloud C/F, tesla-coil C, electrified E.
- charge-up E, chain-lightning A2 air at each target (one burst at full tier, the rest tier 1), thunderclap A3 ground, zap-hit A1 air.

**S6 ice.js (9, about 70 lines)**
- blizzard-vortex C, frost-breath C, ice-crystal C, ice-lance B loop, freeze E.
- ice-shatter A2 ground, ice-spikes A2, icicle-fall A2 (full tier on the last hit), snowflake-burst A1 air.
- All bursts use `ramp:[[0,'#e8f2ff'],[.5,'#7fc0ff'],[1,'#1a3a6a']], scorch:false`.

**S7 holy.js (9, about 70 lines)**
- GOLD/GOLD_A/GRN first stop → `'#fff2dc'` / `'#eaf6dc'`.
- blessing E, divine-shield C/E, halo C, sunburst C, heal-aoe E, resurrection E.
- feather-burst A1 air `{flash:false}`, holy-pillar A2 `{scorch:false}`, smite A3 ground.

**S8 shadow.js (11, about 80 lines)**
- black-hole C, eclipse C, necro-skulls C, shadow-flames C, soul-drain C (seam residual: no timing changes).
- curse E, life-steal E, hex-sigil E.
- dark-explosion A3, grasping-hands A2, shadow-tendrils A2.
- All bursts use `ramp:[[0,'#e8d8ff'],[.5,'#8a50e0'],[1,'#2a0a50']], scorchRamp:[[0,'#1a1410'],[.5,'#5a2a8a'],[1,'#c8a0ff']]`.

**S9 melee.js (11, about 70 lines)**
- `contact()`: hot default `'#fff'` → `'#fff2dc'`; light → `intensity: capL(fx, o.lightI ?? 70), env: (u) => ENV.impact(u - t, 9)` (drop `fade`). This also lifts warrior and rogue.
- claw-swipe D, dagger-flurry D, double-slash D, scythe-reap D, spear-sweep D, spin-slash D, thrust D, whip-crack D1.
- hammer-smash D + A3 ground, heavy-cleave D + A3 ground, uppercut D + A2 `{debris:false, marks:false}`.

**S10 projectiles.js (13, about 110 lines)**
- `sparkE` ramp V3 exempt.
- Loops, all B with `{impact:false}` bursts at arrival: arrow, bullet-tracer, energy-disc, laser-bolt, plasma-shot, rocket. muzzle-smg is a known seam: caps only.
- One-shots: cannonball B + A2 ground, homing-missile B + A2, magic-missile B + A1 air, flare B (light follows, ≤ 35).
- muzzle-pistol A1 air `{dust:false}`, muzzle-shotgun A1 air.

**S11 arcane.js (12, about 90 lines; 61 `'#fff'` → V3)**
- arcane-beam C, arcane-orb C, portal C, rune-circle C, spell-charge C/E.
- arcane-missiles B + A1 air per hit, blink-in E, blink-out E, magic-circle-cast E.
- mana-burst A2, star-fall A2 ground (last strike full tier), time-stop G.

**S12 nature.js (13, about 90 lines)**
- leaf-storm F/C, poison-cloud F/C, tornado F/C, toxic-puddle F/C.
- healing-bloom E, root-snare E, vine-whip D1.
- acid-splash A1 `{debris:false, scorch:false}`, boulder A3, earth-spike A2, quake A3, spore-burst A1 air, thorns A1 `{debris:false}`.

**S13 water.js (12, about 50 lines)**
- F: bubbles, drip, fountain, rain-splash, ripples, water-jet, water-orb, waterfall, whirlpool (loops); geyser A2-F and splash A1-F (F burst flags).
- wave-crash: known weak, caps only, no geometry changes. All discs `y ≥ .015`.

**S14 weather.js (12, about 45 lines)**
- All F loops: aurora, blizzard, cherry-blossoms, clouds, falling-leaves, fireflies, fog (P3: slightly bright → cloud albedo ≤ `#8a9098`), god-rays (beam ≤ 1.5), rain, shooting-stars, snow, storm (flash ≤ .15, light ≤ 70).

**S15 scifi.js (12, about 70 lines)**
- C: energy-core, force-field, hologram, jetpack, laser-grid (seam: caps only), scanner, teleporter-pad, tractor-beam.
- glitch G, warp-in E, warp-out E.
- emp-blast A2 ground (cool ramp, `scorch:false`).

**S16 transitions.js (10, ≤ 20 lines)**
- G: blinds, burn-away, crt-off, diamond-wipe, glitch-wipe, iris, pixel-dissolve, shatter-wipe, slash-wipe, star-iris. Probably a no-op; grep `fx.flash`.

**S17 critters.js (12, about 50 lines)**
- All C loops: bat, bird, butterfly, eyeball, fish-school, flying-skull, frog, ghost, jellyfish, slime, snake, wisp.
- Lights ≤ 25 (21 lights: V8); emissive ≤ 1.5; V3.

**S18 spawn.js (10, about 70 lines)**
- coin-drop E, disintegrate E, dissolve-burn E, respawn-beam E (beam ≤ 1.5), soul-rise E, spawn-portal E.
- egg-hatch A1 air (known hot core → orb ≤ 2.5), poof A1 `{flash:false, debris:false}`, shatter-death A2, summon-rise A2.

**S19 moves.js (12, about 110 lines; 74 `'#fff'` → V3)**
- Its sparks/dust/rocks helpers get V5.
- arrow-shot D+B, dash-strike D, sword-combo D.
- earth-stomp D+A3, ground-pound D+A3, hammer-smash D+A3, fireball-throw D+B+A2, holy-smite D+A2, frost-nova-cast D+A2 (ice ramp), lightning-call D+A2.
- haste-run E, shadow-step E.

**S20 status.js (13, about 40 lines)**
- E/C, no impact: bleeding, burning, charmed, confused, cursed, frozen, haste, poisoned, rage, sleep, slowed, stunned (loops), petrified (one-shot E).

**S21 pickups.js (11, about 40 lines)**
- C: coin-spin, crystal-shard, gem-spin, heart-pickup, key-glint, loot-beam (beam ≤ 1.5), potion, power-star, xp-orb.
- chest-open E (light ≤ 70).
- collect-burst A1 `{ground:false, impact:false}`.

**S22 ui.js (12, ≤ 20 lines)**
- G: achievement, coin-collect, combo-counter, confetti, countdown, crit-number, damage-number, exclamation, health-bar-hit, heart-lost, level-up, quest-complete.
- Only V4: flashes at lines 89, 115, 131, 140, 221, 246 → ≤ .15.

**S23–S44: skill files (light pass, about 40–80 lines each).** The kit already gives every skill the recipe at `extras`. Per file:
- (K1) Remove `fx.shake` where the act has hits or an `extras`/`impact` call falls at the same t ± 0.05.
- (K2) Remove the skill's own `k.light`/`fx.light` peaking at the `extras` t (the `burst` light replaces it).
- (K3) Remove the skill's own up-normal `k.ring` at the `extras` t when the `extras` position is on the ground (`y < .35`).
- (K4) Pass `cls` where the archetype misleads: `'E'` for non-hitting casts, `'A'` to force a hit, `'B'` for projectile arrival.
- (K5) V1–V8 on custom `fx.*` layers; materials made by `addMat(c, k)` with k > 2 → 2.
- (K6) Raise each `// P3=` by the particles `burst` adds (+17/+27/+37 for ground hits at g1/g2/g3, +1 in air).

Steps, with files, effect counts and notes:
- S23 warrior (10): rending-wave is a known weak effect; leave it.
- S24 rogue (10): smoke-vanish and night-ambush E.
- S25 archer (6): triple-volley brief; hawk-focus E.
- S26 mage (12): forked-thunder brief; blink-gate and time-ripple E.
- S27 priest (8): bless-banner known weak, leave; judgment-beam and sun-lance A.
- S28 shaman (8): bone-golem emissive ≤ 1.2 (known over-bright).
- S29 dark (6): blood-pact E.
- S30 pyro (8): ashfall and phoenix-dive known weak; caps only.
- S31 hydro (8): water F rules.
- S32 geo (8): ground A; debris already in the kit.
- S33 aero (8): gale-slash "almost invisible" by design.
- S34 steam (5): vapor exception for V5.
- S35 lava (5).
- S36 storm (5).
- S37 frost (5).
- S38 swamp (5).
- S39 dune (5): highest budget (761); check shots.
- S40 plasma (8).
- S41 cryo (8).
- S42 nano (8): one loop, so C rules there.
- S43 ion (8).
- S44 quantum (8): probability-storm count varies with the random-number choices; no `extras` calls, so add `k.impact` dedupe only.

**S45 global sweep (grep-based, ≤ 150 lines; skip the showcase effects).**
1. `grep -nE "light\(\{[^}]*intensity: (1[6-9][0-9]|[2-9][0-9]{2})" src/fx/*.js` (29 lights over 160): set to the tier cap (V7).
2. `grep -nE "kind: 'smoke'[^}]*blend: 'add'|blend: 'add'[^}]*kind: 'smoke'"`: fire → `tex:'explosion-fireball'`; smoke → normal.
3. `grep -n "fx.shake(" src/fx/*.js` in files that call `burst(`/`impact(`, or whose effect has `act.hits`: remove those at the same t.
4. `grep -nE "normal: 'up'[^}]*fill: 0\.[1-9]|fill: 0\.[1-9][^}]*normal: 'up'"`: `fill: 0`.
5. `grep -nE "(orb|ring|beam|shell|ribbon)\(\{[^}]*intensity: ([3-9]|[1-9][0-9])"`: cap per V2.
6. `grep -nE "flash\([^)]*'#fff[f]*'"` and amounts > .15: V4.
7. `grep -nE "kind: 'scorch'[^}]*'#(000|050403|100|200|300)'"`: V6.
8. Loop files: every `erode(` without `lifeFade: 0` gets it, and integer scroll.

## 4. Test phase (coordinator; `node tools/serve.mjs 8123` running)
1. `node tools/shots.mjs .out/p5/op all 0.5`, then the same with `transparent=1` and with `host=1`. Pass: 406/406, no console or shader errors, no `PARTICLES` lines, no `LIGHTS` lines.
2. Contact sheets for the visual review:
   - `node tools/shots.mjs .out/p5/cs cat:<c> -0.3,-0.7` for every category
   - then `node tools/sheet.mjs .out/p5/cs/<c>.png .out/p5/cs/<c>_*@*.png`
   - review against the before-sheets.
3. Alpha test with 20 ids: `node tools/alpha-test.mjs explosions/small-explosion,explosions/nuke,impacts/heavy-landing,impacts/crit-hit,fire/torch,fire/flame-pillar,lightning/thunderclap,ice/ice-spikes,holy/smite,shadow/dark-explosion,melee/hammer-smash,projectiles/rocket,arcane/star-fall,nature/quake,water/geyser,scifi/emp-blast,spawn/shatter-death,moves/ground-pound,warrior/breaker-leap,mage/meteor-rain`. Pass: ok.
4. Determinism: `node tools/determinism-test.mjs all`. Part A must be 406/406. Part B may show only the 4 known residuals (plasma-ball, laser-grid, muzzle-smg, soul-drain).
5. `node tools/gpu-scan.mjs all`: no flags.
6. Perf: `node tools/perf.mjs <PERF30> medium`, where PERF30 = the 20 alpha ids + geo/quake-ring, dune/glass-storm, steam/boiler-geyser, pyro/ashfall, hydro/tsunami-arc, lava/crust-breaker, shaman/earth-drum, ion/vacuum-grenade, quantum/gravity-crush, nano/titan-fist. Pass: median ≤ the P4 baseline + 1.5 ms per id.
7. `node tools/bake.mjs all --check`: ok (no texture changes are expected).

Bugfix rules:
- Fix in the shared code first (`_aaa.js`, `_skill.js`, `blast`, `contact`), then per file.
- Too bright: lower intensity, never raise exposure.
- A seam: integer scroll / `lifeFade: 0`, or remove the erode.
- Over budget: cut the dust crown first, then extra smoke.
- Never change gameplay data.
- Rerun only the failing ids, then step 1 once at the end.

Report: `docs/REPORT-P5.md` (Done / Test results table / Still weak / Checks not done). Update the AUTHORING tier table (25/70/140) and add a `burst()` and `extras(pos, t, cls)` entry. Commit "PLAN5 S1-S45 + test phase", then push.

## 5. Risks
- **Hand-tuned effects regress.** Caps only, no restructuring, for:
  - P1: fire-ring, egg-hatch, wave-crash; the seam residuals ball-lightning, plasma-ball, muzzle-smg, soul-drain
  - P2: rending-wave, bless-banner, bone-golem, ashfall, phoenix-dive, triple-volley, forked-thunder, gale-slash, probability-storm
  - P3: weather/fog
  - P4: sword-slash crescent, heal spirals.
  Compare before/after sheets for these first.
- **Random-number consumption.** Every new part takes `fx.rng()` (Prim seed; Debris vertex jitter), so the seeds of all parts built after it shift. Results stay deterministic, but the look changes. Mitigation: `burst`/`extras` are the last calls in `build`; `k.impact` calls in the middle of a build (7) are accepted.
- **Particle budget.** `burst` adds ≤ 37 per hit. The worst skills are dune 761, pyro and steam 701. Several bursts in one effect use tier 1 with the crown off.
- **Debris determinism.** It is analytic and comes from the seeded random numbers, but loops skip it. A ground offset in host mode (`fx.groundY`) changes the bounces but not determinism.
- **Loop seams from new erode meshes.** `lifeFade: 0` and integer scroll per period; `burst` in loops has no debris or marks.
- **Light pool (4 slots).** Each Light keeps its slot for the effect's whole life; a 5th falls back to a local light and recompiles shaders in host mode. The `LIGHTS` warning plus V8 catch this.
- **Double feel.** `fx.impact` plus an act hit at the same t gives a double push. `burst` checks `actor.hits`; non-kit code must not add `fx.impact` to act effects.
- **Archetype misclassification in the `extras` SOFT regex.** It is fixed per skill with `cls` (K4); the visual review is the backstop.
