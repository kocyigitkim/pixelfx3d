# TASK PROMPT: 162 NEW MMORPG SKILL EFFECTS (ASD-STE100 Simplified Technical English)

Version 2. This version adds the four-element system, derived elements, and futuristic skills.

## 1. ROLE

You are a senior real-time VFX engineer for three.js (WebGL2) and GLSL.
You add new skill effects to the project "pixelfx3d".
Follow all rules in this document.

## 2. GOAL

Create at least 162 new skill effects in the style of classic MMORPG skills.
Make them in five waves. Do the waves in order.

| Wave | Content | Skills |
|---|---|---|
| 1 | Seven classic classes | 60 |
| 2 | Four base elements | 32 |
| 3 | Six derived elements | 30 |
| 4 | Four futuristic (tech) elements | 32 |
| 5 | Quantum | 8 |
| | Total | 162 |

Each skill must show a full sequence: wind-up, cast, release, impact, and aftermath.
Each skill must have three visual grades.
All skills must be original.

WARNING: Do not copy skill names, icons, sounds, models, or effects from any game.
Use the games in section 3 only as a reference for how skills work.

## 3. REFERENCE: HOW MMORPG SKILLS WORK

### 3.1 Common skill timeline

| Phase | Typical time | What the player sees |
|---|---|---|
| 1. Wind-up | 0.2 to 0.6 s | The body pulls back. Light gathers at the weapon or hand. |
| 2. Cast | 0.0 to 2.0 s | A circle shows on the ground. Particles move toward the hand. A cast bar fills. |
| 3. Release | 0.05 to 0.15 s | A short bright flash. The body snaps forward. The camera can shake. |
| 4. Travel | 0.1 to 1.0 s | A projectile, a wave, or a dash moves to the target. A trail follows it. |
| 5. Impact | 0.1 to 0.3 s | A bright flash, sparks, a shock ring. The game stops for a short time (hit-stop). |
| 6. Aftermath | 0.5 to 4.0 s | Smoke, embers, a ground mark, or a damage-over-time effect stays. |
| 7. State | The effect lasts | A buff or debuff aura stays on the body until it ends. |

### 3.2 Skill archetypes

1. Melee combo: two or three fast strikes with a trail for each strike.
2. Spin: a ring-shaped sweep around the body.
3. Dash: the body moves fast. After-images and a line of dust stay behind.
4. Leap and slam: the body jumps, lands, and a shock wave spreads on the ground.
5. Projectile: one object flies to the target and bursts.
6. Volley: many small projectiles fly in a fan or in a rain.
7. Beam or channel: a continuous beam stays between the caster and the target.
8. Ground area: a mark shows on the ground. The effect starts after a delay.
9. Nova: a ring spreads from the caster in all directions.
10. Chain: the effect jumps from one target to the next.
11. Buff aura: a persistent glow on the caster or ally.
12. Debuff or damage over time: a mark or particles stay on the target.
13. Heal: soft light rises. Small light symbols float up.
14. Summon: a circle opens. A creature or object rises from it.
15. Trap or totem: an object stays on the ground and pulses.
16. Teleport: the body fades at one point and appears at another point.
17. Whip or lash: a long curved strip snaps out and back.
18. Wall or barrier: a large object rises from the ground and stays.
19. Orbit: small objects circle the caster, then fly at the target.
20. Pull or push: an area moves objects toward or away from a point.

### 3.3 Design rules from reference games
- Build each skill from layers. Put each layer on a body point or on the ground.
- Each skill has three grades. The grade changes size, brightness, and the number of layers.
- Make the silhouette read clearly from far away. Use one strong color for each skill.
- A missile spell has a visible projectile with a trail and a separate impact effect.
- School color language: fire orange, frost blue, arcane violet, shadow dark purple, nature green, holy gold.

## 4. ELEMENT SYSTEM

### 4.1 Four base elements

| Element | Motion language | Main shapes | Color ramp (core, mid, edge) |
|---|---|---|---|
| Fire | Rises. Flickers. Spreads in bursts. | Tongues, embers, rings, smoke | `#ffe9b0`, `#ff9a30`, `#c8300a` |
| Water | Flows. Curves. Falls and splashes. | Waves, drops, bubbles, mist | `#e8fbff`, `#4fb3ff`, `#0b4f9c` |
| Earth | Heavy. Slow start. Hard stop. | Rocks, spikes, cracks, dust | `#d8c9a8`, `#8a6a45`, `#3b2c1c` |
| Air | Fast. Spiral. Almost invisible. | Streaks, rings, feathers, vortex | `#f4fbff`, `#bfe6ff`, `#7fa8c9` |

### 4.2 Six derived elements (fusion of two base elements)

| Derived | Made from | Category name | Look | Color ramp |
|---|---|---|---|---|
| Steam | Fire and Water | `steam` | White vapor with orange glow inside | `#fff3e0`, `#e8eef2`, `#9aa7b0` |
| Lava | Fire and Earth | `lava` | Black crust with bright cracks and drips | `#ffd27a`, `#ff5a14`, `#1b1210` |
| Storm | Fire and Air | `storm` | Lightning, static, and bright arcs | `#ffffff`, `#a8c8ff`, `#5a6cff` |
| Frost | Water and Air | `frost` | Ice crystals, snow, cold wind | `#dff6ff`, `#7fd0ff`, `#2a6fb5` |
| Swamp | Water and Earth | `swamp` | Mud, reeds, spores, slow bubbles | `#b6e35a`, `#4e8a2a`, `#1c3a14` |
| Dune | Earth and Air | `dune` | Sand, dust, glass shards, mirage | `#ffe2a8`, `#d9a65a`, `#7a5a2c` |

### 4.3 Four futuristic (tech) elements

| Tech element | Base | Category name | Look | Color ramp |
|---|---|---|---|---|
| Plasma | Fire | `plasma` | White-hot core, shock diamonds, heat vents | `#ffffff`, `#4de1ff`, `#1b3cff` |
| Cryo | Water | `cryo` | Nitrogen fog, hex lattice, crystal drones | `#f2ffff`, `#7fe8ff`, `#1f6fa8` |
| Nano | Earth | `nano` | Metal swarm, magnets, hard-surface shapes | `#c9d3dc`, `#35ffc0`, `#3a424c` |
| Ion | Air | `ion` | Electric arcs, sonic rings, thruster flames | `#e6f4ff`, `#3a8bff`, `#14245e` |

### 4.4 Quantum

Category name: `quantum`. Bends space, time, and probability.
Color ramp: core `#00f0ff`, mid `#ff3df0`, edge `#1a0b3a`.

### 4.5 How to derive a tech skill from a base skill

1. Pick a base skill. 2. Keep the archetype and the timing. 3. Replace organic motion with straight lines and sharp angles. 4. Add hard shapes: plates, rails, rings with notches, hex cells. 5. Add machine signs: vents, scan lines, a ring of small lights, a short holographic mark on the ground. 6. Use `fx.mesh` for solid parts (drones, rails, plates); PBR metal. 7. Replace smoke with vapor or sparks. 8. Cleaner, brighter ramp; no random flicker on the core.

### 4.6 How to derive a fusion skill

1. Pick two base skills, same archetype if possible. 2. Use the derived element's ramp. 3. Motion of the first element for the release. 4. Motion of the second element for the aftermath. 5. Add one new signature detail (e.g. Lava: black crust that cracks).

## 5. PROJECT STATE

Read `docs/AUTHORING.md` first. The project has 244 effects in 21 categories (`src/fx/*.js`).
Key files: `src/core/fx.js` (builder methods), `src/core/dummy.js` (mannequin, POSES, act kinds, weapons), `src/fx/melee.js` (acted effect example), `src/fx/moves.js` (full attack example), `src/fx/index.js` (category list).
Existing effect ids must not change. New skills must not copy an existing definition.
Existing category names must not be reused: moves, fire, explosions, water, ice, lightning, scifi, melee, impacts, projectiles, spawn, arcane, holy, shadow, status, nature, weather, ui, pickups, transitions, critters.

## 6. SKILL LIST

Id = `<category>/<name>`. Each category in its own file `src/fx/<category>.js`. Add all new categories to `src/fx/index.js`.

### WAVE 1: SEVEN CLASSIC CLASSES (60)

#### Warrior (10) `warrior/`
1. `crescent-chain`: melee combo, three strikes, steel trails.
2. `tempest-spin`: spin, wind ring and dust.
3. `breaker-leap`: leap and slam, earth cracks.
4. `iron-bulwark`: buff aura, metal plates of light.
5. `warcry-surge`: nova, red shock wave and speed lines.
6. `chain-hook`: chain pulls the target to the caster.
7. `rending-wave`: ground wave of steel, flies forward.
8. `blood-oath`: buff aura, crimson, small blood-light drops.
9. `shield-rush`: dash with stun, shield glow.
10. `last-stand`: buff aura, fire, strong glow, rising embers.

#### Rogue (10) `rogue/`
1. `shadow-strike`: teleport behind the target, then stab.
2. `venom-fan`: volley of daggers in a fan, green poison.
3. `smoke-vanish`: teleport with smoke, body fades.
4. `bleed-flurry`: many fast stabs, red damage over time.
5. `caltrop-field`: trap, spikes on the ground.
6. `twin-fang-dash`: dash through the target, line slash.
7. `death-mark`: debuff mark above the target, then a finishing slash.
8. `echo-step`: dash with after-images.
9. `razor-cyclone`: spinning daggers orbit, then fly out.
10. `night-ambush`: critical strike with a dark flash.

#### Archer (6) `archer/`
1. `triple-volley`: three arrows in a fan.
2. `needle-rain`: ground area, arrows fall from above.
3. `lance-shot`: charged piercing arrow with a long trail.
4. `frost-trap-arrow`: arrow makes an ice zone on the ground.
5. `hawk-focus`: buff aura, eye glow, ring around the bow.
6. `blast-bolt`: arrow bursts in a fire explosion.

#### Mage (12) `mage/`
1. `comet-lance`: fire projectile with a long tail.
2. `glacier-prison`: ice cage around the target.
3. `storm-orb`: lightning orb that orbits, then bursts.
4. `arcane-barrage`: volley of homing missiles.
5. `meteor-rain`: ground area, many small meteors.
6. `rime-pillars`: ring of ice pillars that rise from the ground.
7. `forked-thunder`: bolt that splits into three branches.
8. `blink-gate`: teleport with two portals.
9. `mana-sphere`: shield sphere that takes hits.
10. `gravity-well`: area that pulls objects to the center.
11. `searing-ray`: channeled beam.
12. `time-ripple`: slow field with distorted rings.

#### Priest (8) `priest/`
1. `radiant-mend`: single heal, light rises from the feet.
2. `sanctuary-circle`: ground heal zone.
3. `purifying-wave`: nova that cleanses, white and gold.
4. `guardian-wings`: buff, wings of light.
5. `judgment-beam`: beam of light from the sky.
6. `divine-chain`: heal chain between three allies.
7. `sun-lance`: holy projectile.
8. `bless-banner`: banner of light on the ground, pulses.

#### Shaman and Summoner (8) `shaman/`
1. `spirit-wolf`: summon, a wolf of light runs and bites.
2. `storm-totem`: totem pulses lightning.
3. `thorn-bind`: vines that root the target.
4. `ancestor-roar`: cone of sound waves and spirit faces.
5. `bone-golem`: summon, a golem rises from the ground.
6. `ember-swarm`: small fire spirits orbit, then attack.
7. `ward-totem`: totem with a protective dome.
8. `earth-drum`: pulses of shock waves from a drum.

#### Dark (6) `dark/`
1. `soul-rend`: curse beam, the target shakes.
2. `shadow-spears`: spears rise from the ground in a line.
3. `dread-howl`: nova with fear faces.
4. `blood-pact`: life-steal orbs fly back to the caster.
5. `void-chains`: chains bind the target.
6. `bane-sigil`: sigil on the ground, delay, then detonation.

### WAVE 2: FOUR BASE ELEMENTS (32)

#### Pyro (8) `pyro/` (Fire)
1. `ember-lash`: whip of fire, curved strip with sparks.
2. `inferno-wheel`: wheel of fire turns around the caster.
3. `cinder-burst`: nova of embers, short and hard.
4. `flare-lance`: spear of fire flies and pierces.
5. `heat-haze-veil`: buff aura, air shimmer around the body.
6. `pyre-sigil`: sigil on the ground, delay, then a fire column.
7. `ashfall`: ground area, falling ash and sparks, damage over time.
8. `phoenix-dive`: leap with a bird shape of fire in the trail.

#### Hydro (8) `hydro/` (Water)
1. `tidal-lash`: whip of water, arc with spray.
2. `bubble-ward`: shield of many bubbles that pop on hit.
3. `riptide-pull`: whirl area that pulls objects to the center.
4. `mist-veil`: buff, fog around the body, body is hard to see.
5. `geyser-line`: line of geysers that erupt one after the other.
6. `rain-mend`: heal, local rain with light drops.
7. `orb-cascade`: water orbs orbit the caster, then shoot.
8. `tsunami-arc`: large wave crescent moves forward.

#### Geo (8) `geo/` (Earth)
1. `stone-fist`: giant fist of rock rises and punches.
2. `rubble-orbit`: rocks orbit the caster, then fly out.
3. `fault-line`: crack line on the ground, shards erupt.
4. `bedrock-armor`: buff, rock plates form on the body.
5. `quake-ring`: pulses of rings on the ground.
6. `boulder-roll`: large boulder rolls in a line.
7. `crystal-spire`: crystal grows from the ground and pulses.
8. `stone-wall`: wall of rock rises and stays.

#### Aero (8) `aero/` (Air)
1. `gale-slash`: wind blade crescent, almost clear.
2. `cyclone-step`: dash with a spiral of wind.
3. `updraft-launch`: area lifts dust and leaves into the air.
4. `zephyr-guard`: buff, rings of wind around the body.
5. `vacuum-snap`: implosion that pulls, then bursts.
6. `feather-storm`: volley of feather-shaped wind blades.
7. `sky-pillar`: vertical tornado column.
8. `whisper-step`: teleport with wind trails.

### WAVE 3: SIX DERIVED ELEMENTS (30)

#### Steam (5) `steam/`
1. `scald-burst`: nova of hot steam.
2. `boiler-geyser`: pressure jets from the ground.
3. `fog-brand`: debuff, hot mark on the target, vapor stays.
4. `kettle-rush`: dash with a steam trail.
5. `cloud-hammer`: overhead slam that makes a steam ring.

#### Lava (5) `lava/`
1. `magma-surge`: line of lava on the ground.
2. `obsidian-rain`: volley of dark glass shards.
3. `molten-fist`: melee strike with lava drips.
4. `crust-breaker`: leap and slam, lava cracks.
5. `forge-totem`: totem that melts, pulses, and drips.

#### Storm (5) `storm/`
1. `thunder-step`: dash with a line of lightning.
2. `static-field`: ground area with small arcs.
3. `skybolt-call`: marks on the ground, then delayed bolts.
4. `ball-surge`: charged orb rolls forward.
5. `tempest-crown`: buff, small storm circles the head.

#### Frost (5) `frost/`
1. `rime-lance-ii`: ice spear with a cold wind trail.
2. `snowfall-zone`: ground area, snow, slow effect.
3. `hoarfrost-armor`: buff, frost plates on the body.
4. `shatter-step`: dash that leaves ice shards that burst.
5. `aurora-veil`: heal and buff, ribbons of cold light.

#### Swamp (5) `swamp/`
1. `mire-trap`: trap on the ground, the target sinks.
2. `spore-lash`: whip with a trail of glowing spores.
3. `bog-tide`: slow wave of mud.
4. `reed-snare`: reeds rise and bind the target.
5. `moss-regrowth`: heal area, plants bloom over time.

#### Dune (5) `dune/`
1. `sandspout`: tornado of sand.
2. `mirage-split`: decoy after-images that fade.
3. `dust-veil`: cloud that blocks the view.
4. `glass-storm`: sand turns to glass shards in the wind.
5. `dune-wave`: wave of sand moves forward.

### WAVE 4: FOUR FUTURISTIC ELEMENTS (32)

#### Plasma (8) `plasma/`
1. `arc-torch`: melee sweep with a plasma blade and shock diamonds.
2. `thermal-lance`: charged beam that cuts a line.
3. `solar-flare-grenade`: grenade bursts in a white flare.
4. `heat-sink-shield`: buff, vents glow on a plate shield.
5. `rail-sear`: fast line shot, hot rails glow.
6. `pulse-mortar`: ground area, plasma shells fall in order.
7. `overdrive-core`: buff, reactor glow, vapor vents.
8. `fusion-nova`: nova with ring segments.

#### Cryo (8) `cryo/`
1. `nitrogen-lash`: spray whip with cold vapor.
2. `cryo-grenade`: grenade freezes a zone, hex lattice grows.
3. `coolant-surge`: heal and cleanse wave of cold fluid.
4. `ice-drone-swarm`: small drones orbit, then ram the target.
5. `frost-rail`: line shot that leaves an ice trail.
6. `thermal-lock`: debuff, hex cage of frost around the target.
7. `cryo-pod-drop`: pod falls, opens, and makes a nova.
8. `zero-field`: slow field with crystals and fog.

#### Nano (8) `nano/`
1. `swarm-blade`: blade made of tiny machines, swarm trail.
2. `scrap-barrage`: volley of metal shards pulled by a magnet.
3. `lattice-wall`: hex wall that builds itself.
4. `magnet-pull`: area that pulls metal debris.
5. `repair-cloud`: heal, cloud of tiny machines.
6. `titan-fist`: machine fist builds up and punches.
7. `mine-grid`: traps in a grid, then chain detonation.
8. `turret-assembler`: summon, a turret builds itself part by part.

#### Ion (8) `ion/`
1. `ion-lash`: electric whip with glow rings.
2. `sonic-lance`: sonic boom shot with a shock cone.
3. `static-drone`: drone with chain arcs.
4. `vacuum-grenade`: implosion, then a shock wave.
5. `jet-dash`: dash with thruster flames and a sonic ring.
6. `pulse-ring`: nova that disables, hex ring.
7. `orbital-beam`: beam from the sky, ground marks first.
8. `blade-turbine`: spinning blade shield.

### WAVE 5: QUANTUM (8) `quantum/`
1. `phase-shift`: teleport with a glitch effect.
2. `singularity-seed`: small black hole that pulls, then bursts.
3. `time-fold`: area where objects return to a past position.
4. `echo-clone`: clone made of after-images attacks.
5. `entangle-link`: beam links two targets and shares damage.
6. `gravity-crush`: heavy press on the target, crater forms.
7. `warp-rift`: a rift tears open and slashes.
8. `probability-storm`: many flickering projectiles. Use `fx.rng` for the random choice.

## 7. DEFINITION FORMAT

```js
{
  id: 'warrior/crescent-chain', name: 'Crescent Chain', category: 'warrior',
  loop: false, duration: 1.6,
  meta: { class: 'warrior', elements: ['steel'], tier: 'class', archetype: 'melee-combo',
          castTime: 0.4, cooldown: 6, range: 2.5, shape: 'arc' },
  stage: { sky: 'dusk', view: { pos: [1.2, 1.6, 5.6], target: [1.1, 1.1, 0] } },
  act: { kind: 'slash', weapon: 'sword', windup: 0.45, hits: [ { t: 0.08, stop: 0.08, shake: 0.2, amp: 0.03, push: 1.2 } ] },
  build(fx, o) { const g = o.grade || 1; /* layers */ }
}
```

1. Use the `meta` object for every skill. 2. `meta.tier` in: class, base, derived, tech, quantum. 3. `meta.elements` is a list. 4. Use a mannequin `act` for every skill, except heals and buffs that use `body: true`. 5. Read `o.grade` (1, 2, 3), default 1. 6. Grade rules in section 8. 7. Use the element ramp from section 4 via `fx.pal()`.

## 8. GRADE RULES

| Grade | Size | Brightness | Layers | Extra |
|---|---|---|---|---|
| 1 | 100% | 100% | Base layers | None |
| 2 | 115% | 115% | Base plus one extra layer | A second light flash |
| 3 | 130% | 130% | Base plus two extra layers | A final flourish and a stronger light |

Grades must look clearly different in a contact sheet. Same color and shape for all grades. Keep the particle limit for grade 3.

## 9. RULES

1. No `Math.random`; use `fx.rng`. 2. No image files or external assets. 3. Deterministic. 4. Max 900 particles per effect at grade 3. 5. Max 3 orbs or shells per effect. 6. Max 2 voronoi decals per effect. 7. GLSL ES 3.00, no extensions. 8. Do not rewrite `src/core/*`; small backward-compatible changes only. 9. New poses may be added to `POSES`; do not change existing poses. 10. `fx.light` on each energetic skill. 11. `fx.hit`, `fx.shake`, or `fx.flash` on each skill that hits. 12. Three or more layers per skill. 13. Max 40 lines of GLSL per custom shader; shared GLSL in one helper per file. 14. Tech skill: `fx.mesh` for at least one solid part. 15. Two skills in one category must not look alike.

### 9.1 Look rules
1. Additive layers add up; dense emitter intensity 0.3 to 0.9. 2. Smoke and dust: normal blending, `lit: 1`. 3. Release first frames readable: clear flash. 4. One main color per skill; second color only for details. 5. Aftermath visible for 0.5 s or more. 6. Silhouette readable from 8 m. 7. Tech: clean hard edge. 8. Base element: natural motion of the element.

## 10. TEST PROCEDURE (per wave)

1. `node tools/serve.mjs 8123`. 2. `node tools/shots.mjs <outdir> cat:<category> 0.1,0.4,0.8,-0.9`. 3. Fix every console error and shader warning. 4. `node tools/sheet.mjs <out.png> <images...>`. 5. Open and look. 6. Fix unreadable, too bright, or empty skills. 7. Render grades 1/2/3 for 5 skills per category; they must differ. 8. Compare with existing effects; remove copies. 9. Do not trust the exit code only. 10. After wave 5: `node tools/shots.mjs <dir> all 0.5` with no error.

## 11. DELIVERABLES

1. 22 new files in `src/fx/`: warrior, rogue, archer, mage, priest, shaman, dark, pyro, hydro, geo, aero, steam, lava, storm, frost, swamp, dune, plasma, cryo, nano, ion, quantum.
2. Updated `src/fx/index.js`.
3. Updated gallery: filter for `meta.tier` and `meta.elements`; grade selector (1, 2, 3); display of `meta` (class, elements, castTime, cooldown).
4. Updated `README.md` with the new skill count.
5. A report per wave listing weak skills and reasons.

## 12. COMPLETION CRITERIA

1. At least 162 new skills, unique ids. 2. `shots.mjs all 0.5` no errors. 3. Each skill shows wind-up, release, impact, aftermath. 4. Three grades clearly differ. 5. Each tech skill has a solid part and a clean hard look. 6. Each derived skill uses its ramp. 7. Nothing copied from a game. 8. The report states which checks were not done.
