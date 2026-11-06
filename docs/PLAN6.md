# PLAN6 — real rigged characters, skeleton target, rig-driven anchors

Strictly sequential steps S0..S15, one coding agent per batch. No browser during coding; acceptance = `node --check`, node import checks and the GPU-free node tools below. No new npm deps (three r170 core + `three/addons` GLTFLoader, SkeletonUtils).

Measured (Knight.glb via node GLTFLoader + `self` shim, rest pose): all 3 glbs share one rig, face +Z, feet y=0; head top 2.31, helmet top 2.47. GLTFLoader sanitizes names: `handslot.r`→`handslotr`, `upperarm.l`→`upperarml`. Bone rest world y: hips .406, spine .598, chest .973, head 1.241; mesh bbox centers Knight_Head ~1.77, Knight_Body ~.84 (chibi; hands rest ~.64). JSON chunk 1.97 MB of 3.6; animation BIN 1.33 MB (anims ~85% of every file). Props hang under handslot.r/.l with the blade along slot +Y; 1H_Sword spans y −.37..1.41.

## §1 Decisions
**Models.** Actor KayKit **Knight** (default) / **Mage** (casters); target KayKit **Skeleton_Warrior**. One uniform scale `S = 0.75` (helmet ~1.85 m, head ~1.73 m), feet y=0. `model.rotation.y = +π/2` (faces +X) for the actor, `−π/2` for the target. Every mesh `castShadow=true`, `frustumCulled=false`. Layer-1 depth works unchanged (stage.js:124; three re-derives skinning for overrideMaterial).

**Character choice** (`setupActor`), first match: `act.char` ('knight'|'mage') → 'mage' if `act.weapon==='staff'` or kind cast/castup without weapon → body-only (`def.body`) 'mage' if `def.category` ∈ /^(mage|priest|shaman|arcane|holy)$/ → 'knight'. Add explicit `char:'knight'` to archer.js `ACT_BOW` and `moves/arrow-shot` (kind cast, holds a bow).

**Shared clips.** Only Knight.glb keeps animations; Mage and Skeleton bind the same AnimationClips by bone name. Strip unused clips with a deterministic no-dep node script → Knight ~1.7 MB, Mage ~.4, Skeleton ~.5 (12 MB → ≤3 MB). Originals in `.out/models-orig/` (gitignored).
KEEP (25): `Idle, 1H_Melee_Attack_Chop, 1H_Melee_Attack_Slice_Diagonal, 1H_Melee_Attack_Slice_Horizontal, 1H_Melee_Attack_Stab, 2H_Melee_Attack_Chop, 2H_Melee_Attack_Slice, 2H_Melee_Attack_Spin, Dualwield_Melee_Attack_Stab, Spellcast_Long, Spellcast_Shoot, Spellcast_Raise, Throw, Jump_Full_Short, Cheer, Hit_A, Hit_B, Block_Hit, 1H_Ranged_Aiming, 1H_Ranged_Shoot, Running_A, Running_B, Dodge_Forward, Dodge_Backward, Lie_StandUp`.

**Act kind → clip, contact at hit t=0** (preliminary; S3 rig-info re-measures, S4 pastes):
| kind | clip | dur | contact c | metric |
|---|---|---|---|---|
| slash | 1H_Melee_Attack_Slice_Diagonal | 1.000 | .433 | peak tip speed |
| sideslash | 1H_Melee_Attack_Slice_Horizontal | 1.067 | .267 | peak tip speed |
| smash | 2H_Melee_Attack_Chop | 1.633 | .833 | peak tip speed |
| thrust | 1H_Melee_Attack_Stab | 1.600 | .700 | max forward reach handslot.r |
| cast | Spellcast_Shoot | .933 | .300 | max forward reach |
| castup | Spellcast_Raise | 2.100 | .667 | max hand height |
| stomp | Jump_Full_Short | 1.167 | .700 | hips min after airborne (landing) |
| throw | Throw | 1.367 | .733 | peak tip speed |
| none | Idle | 1.067 | 0 | – |
`actKeys(kind,w)` → `[[-w, F(max(0,c-w))], [0, F(c)], [D-c, F(D)], [D-c+.25, 'guard']]`, `F(x)={clip,time:x}`. Same-clip segments play linearly (real motion, windup time-warped so contact lands on t=0).

**POSES → {clip,time}.** Every existing name keeps working incl. moves.js `addPose` names (moved into the core table; delete the moves.js addPose lines). Key format unchanged `[t, name|{clip,time}, 'snap'?]`. Same clip on both keys → interpolate clip time; different clips → crossfade two actions weights 1−f / f (eased or snap as today). Preliminary (S4 verifies with `rig-info --poses`):
| pose | clip@time |
|---|---|
| idle, guard | Idle@0 |
| windupHigh / cut / follow | Slice_Diagonal@.30/.433/.55 |
| sideBack / sideCut | Slice_Horizontal@.15/.267 |
| overheadUp / smashDown / smashGround / overhead2 | 2H_Chop@.60/.833/.95/.55 |
| pullback, thrustBack / lunge / behind | 1H_Stab@.35/.70/.50 |
| castCharge / castRelease / castUp | Spellcast_Long@1.0 / Spellcast_Shoot@.30 / Spellcast_Raise@.667 |
| crouch / leap / land | Jump_Full_Short@.10/.45/.70 |
| throwBack / throwFwd | Throw@.55/.80 |
| upLow / upHigh / slashBack | 2H_Slice@.25 / 1H_Chop@.533 / 1H_Chop@.45 |
| daggerA / daggerB | Dualwield_Stab@.25/.375 |
| sweepBack / sweepCut | 2H_Spin@.55/.733 |
| roar / armsWide | Cheer@.6/.3 |
| hurt | Hit_A@.15 |
| bowDraw / bowRelease | 1H_Ranged_Aiming@.5 / 1H_Ranged_Shoot@.2 |
| runA / runB / runAir | Running_A@0/.4, Running_B@.25 |
| dashLow / vanish | Dodge_Forward@.2 / Dodge_Backward@.2 |

**Weapons** `holdWeapon(kind)`: hide all prop nodes by default (Knight `1H_Sword_Offhand, Badge_Shield, Rectangle_Shield, Round_Shield, Spike_Shield, 1H_Sword, 2H_Sword`; Mage `Spellbook, Spellbook_open, 1H_Wand, 2H_Staff`). sword → Knight `1H_Sword`; staff → Mage `2H_Staff`; hammer/spear/dagger/scythe/whip keep the procedural meshes on `armR.hand`. `weaponLen` (m): sword 1.05, staff (rig-info), hammer 1.0, spear 1.8, dagger .42, scythe 1.4, whip .3. `tip(l=this.weaponLen)`.

**Target.** `Target extends Dummy` with `char:'skeleton'` (so `set()`, `u`, `mat`, `point()` work; covers existing `fx.target.mat.emissive`, `fx.target.u`, `fx.target.set`). `kick(s)`: s<.8 → Block_Hit, s<1.6 → Hit_A, else Hit_B. `update(dt)` advances reaction time by dt (dt-driven, as today's spring; runs during hit-stop), `setPose({clip,time:min(rt,dur)})`, then blends to Idle@0 over .25 s. `reset()` = super.reset() + clear reaction. Idle is a static frame (deterministic, loop-seam safe; no breathing).

## §2 Architecture
**New `src/core/models.js`** (~30 lines): `export const MODELS={}` (knight|mage|skeleton → {scene, props}), `export const CLIPS=new Map()` (from Knight), `export function loadModels(base=new URL('../../assets/models/', import.meta.url))` idempotent `P ??=` like textures.js; per file `fetch→arrayBuffer→new GLTFLoader().parseAsync(buf,'')`; filter tracks whose node is missing in a model. `export function cloneModel(char)` throws `Error('pixelfx3d: await loadModels() before creating effects with an actor')` if not loaded; returns `SkeletonUtils.clone(MODELS[char].scene)`.

**Rewritten `src/core/dummy.js`.** Keeps exports `bodyUniforms, POSES, actKeys, evalKeys, Dummy, Target`; adds `S`; drops `lerpPose`, `makeBodyMaterial` (no outside users — verify by grep).
- `overlay(mat,u)`: clone model material (map kept) + existing onBeforeCompile fragment block unchanged; compute `vBW` after `#include <skinning_vertex>` (skinned world pos). `transparent=true`. New GLSL uses sq()/cube().
- `class Dummy extends THREE.Group`, `constructor({weapon, char='knight', color})`: `this.model` (cloned, scaled S, rotated), `this.mixer=new AnimationMixer(this.model)`, `this.u`, `this.mats`, `this.mat`. `color` → tint with tintAmt .35.
- `armR.hand`/`armL.hand`: Object3D children of `handslotr`/`handslotl`, `rotation.x=π` (local −Y along the blade), `scale=1/S` so procedural weapons and `tip(l)` stay metric.
- `torso`, `neck`, `pelvis`: detached Object3D offset holders; in `apply()` their pos/rot/scale are applied to bones spine/head/hips in Dummy frame: rotation `local'=qp⁻¹·Q·qp·local` (qp = parent bone rotation relative to the Dummy group), position `+= qp⁻¹·dpos/S`, scale `*=`.
- `headMesh`: Object3D on head bone at head center, counter-rotated so +X is the face; `headR` head radius (m, from rig-info).
- `setPose(p)`: store and evaluate immediately. `{clip,time}` one action; `{a,b,f}` two actions weights 1−f/f; else POSES.idle. Actions lazily created, `setEffectiveWeight`, `action.time=min(time,dur-1e-4)` (no wrap), `mixer.update(0)`.
- `apply()`: re-evaluate pose then offset holders.
- `point(name,out)`: world pos; offsets in bone-local units from rig-info: handR=handslotr, handL=handslotl, chest=spine+offset to torso center, head=head+offset to head center, hips, feet=hips projected to y=0, tip=tip().
- `tip(l,out)`, `set(o)`, `reset()` keep semantics.
- `evalKeys(keys,t)`: same search/snap/ease; returns `{clip,time}` for same-clip segments else `{a,b,f}`.

**`src/core/fx.js`.** setupActor per §1 (`new Dummy({weapon,char})`, `new Target()`). New:
```js
/** fx-local [x,y,z] of a rig anchor at act time t; poses body at t then restores. off adds [dx,dy,dz]. */
anchor(name, t = 0, off)
```
Body names `handR handL tip chest head hips feet`; target `tgt` (=chest), `tgtChest`, `tgtHead`, `tgtFeet` (internally `name.slice(3).toLowerCase()||'chest'`). Throws without body/target. Does not include `fx.on()`-driven body.position moves. `update()`: move body pose eval (uTime, `setPose(evalKeys(keys,tAbs))`) **before** the parts loop (removes one-frame lag); after onFrame call `this.body?.apply()`.

**`src/fx/_skill.js`.** `k.at(n='handR')` accepts anchor names, aliases 'armR'/'armL'; uses `fx.body.point`. `k.ghost` unchanged.

**Preload.** `src/index.js` exports `loadModels, MODELS`; gallery/index.html:122 and gallery/test.html:18 → `await Promise.all([loadTextures(), loadModels()]);`.

**Node tools (GPU-free, via `tools/node-env.mjs`)**: `globalThis.self ??= globalThis`, `fetch` shim for file: URLs, silence "Couldn't load texture" warn.
- `tools/strip-glb.mjs in out keep|-`: drop animations not kept, then unused accessors/bufferViews; repack BIN 4-byte aligned in original order; pad JSON with spaces; self-check re-parse, assert clip names and indices.
- `tools/rig-info.mjs [--poses]`: S check (top·S ∈ [1.75,1.9]); contact times by §1 metrics; prop lengths (2H_Staff, 1H_Sword)·S; head/chest offsets from mesh bbox centers; headR; missing-track list per char; `--poses`: handR y and tip y per POSES entry.
- `tools/anchor-audit.mjs`: build `new Fx({...def, build(){}})` for each def with act/body (no DOM). Sample times −lead, −lead/2, 0, each hit t, hit t+.2, duration/2. Old code (no fx.anchor) computes anchors from old structure (armR.hand, torso+.3, headMesh, pelvis, tip(1), target+[0,1.1,0]/[0,1.62,0]/[0,0,0]); new code uses fx.anchor. `--snapshot` writes `tools/anchors-p5.json`. Report `[files]`: per effect source region (`id: '…'` or `SKILL('…'` to next), list every 3-number array literal (leading numbers; arithmetic flagged `expr`); skip keys `dir|gravity|rotate|rot3|scale|axis|spread|normal|target` and lines with `view`/`stage:`. MATCH = nearest old anchor@t within .3 m AND its new pos differs from old by >.1 m; print `file:line key [lit] ≈ name@t (d) → fx.anchor('name', t) = [new]`. Per melee effect print `REACH id tip.x@T vs target.x → suggest target.x = round(tip.x+0.2,2)`. `--check`: exit 1 if any MATCH line lacks a trailing `// anchor-ok`.
- `tools/actor-smoke.mjs [all|cat:x|ids]`: loadModels, registerAll, createFx each actor effect (needs document → `SKIP-doc`); pass A step update(1/30) from −lead to duration recording hips/handslotr world matrices of body+target and fx.anchor(handR@0, tgt); pass B repeat; fail on NaN, A≠B, PropertyBinding/no-target warnings. Prints `ok n / skipped m`; exit 1 on failure.
- `tools/same-test.mjs`: (§4 only, browser) render non-actor ids at t=.5 on PORT and BASE_PORT and compare hashes.

## §3 Coding steps
- **S0 (coordinator)**: `git tag p5-final`; `git worktree add ../pixelfx3d-p5 p5-final`; `mkdir -p .out/models-orig && cp assets/models/*.glb .out/models-orig/`.
- **S1 snapshot old anchors**: `tools/node-env.mjs`, `tools/anchor-audit.mjs`; run `--snapshot` on current code, commit `tools/anchors-p5.json`. Accept: node --check; ≥240 ids; melee/sword-slash has handR@0.07 and tgt.
- **S2 strip + credits**: `tools/strip-glb.mjs`; Knight with KEEP, Mage & Skeleton with `-`, reading `.out/models-orig/`. NOTICE.md "Character models" section (KayKit Adventurers 1.0 Knight/Mage, KayKit Skeletons 1.0 Skeleton_Warrior, Kay Lousberg kaylousberg.com, CC0 1.0, stripped by tools/strip-glb.mjs, source URLs); one README credit line. Accept: `du -sh assets/models` ≤3 MB; parse check 25/0/0 clips, SkinnedMesh>0 each.
- **S3 loader + wiring**: `src/core/models.js`, `tools/rig-info.mjs`; index.js export; gallery awaits; index.d.ts `loadModels(base?: string|URL): Promise<void>`, `MODELS`. Run rig-info, keep output for S4. Accept: node --check; node-env import + loadModels prints ok; no missing tracks (or filtered).
- **S4 dummy.js rewrite** (~150 lines) with rig-info numbers, offsets, headR, weaponLen; keep procedural hammer/spear/dagger/scythe/whip. Accept: node --check; `rig-info --poses`: windupHigh tip y > cut tip y, castUp hand y > castRelease hand y, land hips y < idle hips y; 1H_Sword top at rest within .1 m of tip().
- **S5 core integration**: fx.js (setupActor, anchor, update order, apply); _skill.js `k.at`; moves.js delete addPose block (keep POSES import); archer.js/moves arrow-shot `char:'knight'`; index.d.ts (`Fx.anchor`, `AnchorName`, `body.point/setPose/neck/pelvis`, `target`, `ActDef.char/keys`); `tools/actor-smoke.mjs`. Accept: node --check; `actor-smoke all` exit 0.
- **S6..S14 per-file anchor pass**. Method: run `anchor-audit <files>`; replace each MATCH with build-time anchors e.g. `const T=0.07, C=fx.anchor('tip',T), H=fx.anchor('handR',T), F=fx.anchor('tgtFeet');` — projectiles `from=fx.anchor('handR',tRelease)`, `to=fx.anchor('tgt')`; relative points via `off` or arithmetic; live followers `follow: k.at('tip')`; true non-anchors get `// anchor-ok`. Apply REACH suggestions to melee `act.target` x. Hit times and VFX layers unchanged; showcase keeps layers (only anchors/act move). Accept per step: node --check, `anchor-audit <files> --check`, `actor-smoke cat:<each>`.
  - S6 melee.js, impacts.js (bladeTable/swing inner/outer vs weaponLen)
  - S7 moves.js, warrior.js
  - S8 rogue.js, archer.js, dark.js, arcane.js (handAt → fx.anchor)
  - S9 mage.js, priest.js, shaman.js, pyro.js
  - S10 hydro.js, geo.js, aero.js, steam.js, lava.js
  - S11 storm.js, frost.js, swamp.js, dune.js, plasma.js (line ~159 torso world pos → `fx.body.point('chest',…)`)
  - S12 cryo.js, nano.js, ion.js, quantum.js (homing `T2=new Target()` keeps its literal position)
  - S13 status.js, holy.js, spawn.js, scifi.js (body-only + legacy joint-angle setPose): holy.js:152 → `setPose({clip:'Lie_StandUp',time:u*dur})`, remove rotation.z lying hack; status.js:145-153 run bob → `{clip:'Running_A',time:((t/0.6)%1)*0.8}` (also ghosts); status.js `eyes()` scale positions/sizes by `k=fx.body.headR/0.115`, hide Knight_Helmet.
  - S14 fire.js, ice.js (holy/heal, ice/frost-nova body), lightning.js, shadow.js, nature.js, ui.js, projectiles.js + anything `anchor-audit` (no args) still lists.
- **S15 docs + final tools**: AUTHORING.md section "Actor, target and anchors" (models/scale, char choice + act.char, POSES/keys {clip,time}, contact table, fx.anchor names + off, k.at(name), rule: never hardcode hand/target coords, run `anchor-audit --check`, `await loadModels()`); update line ~43 (`body: true`) and ~134 (`k.ghost`). `tools/same-test.mjs`. Accept: node --check; `anchor-audit --check` all exit 0; `actor-smoke all` exit 0.

## §4 Test phase (on the user's word)
Setup `node tools/serve.mjs 8123`; baseline `cd ../pixelfx3d-p5 && node tools/serve.mjs 8124`.
1. `node tools/shots.mjs .out/p6/op all 0.5` (+ `transparent=1`, + `host=1`). Pass 406/406, no console/shader/PropertyBinding errors or warnings.
2. `BASE_PORT=8124 node tools/same-test.mjs`. Pass: every non-actor id identical hash (exception projectiles/homing-missile).
3. Contact sheets per actor category: `node tools/shots.mjs .out/p6/cs cat:<c> -0.3,0,-0.7` → `node tools/sheet.mjs …`. Review: textured characters, slash crescent through the blade, projectiles leave the hand and land on the skeleton chest, target hit reaction, feet on ground, no T-pose.
4. `node tools/alpha-test.mjs` showcase set exit 0.
5. `node tools/determinism-test.mjs all`: A 406/406; B only plasma-ball, laser-grid, muzzle-smg, soul-drain.
6. `node tools/gpu-scan.mjs all`: no black frames/errors.
7. perf PERF30 medium within 10% of P5 baseline.
8. `node tools/bake.mjs all --check` ok.
Fix rules: shared code first (dummy.js, fx.js, _skill.js), then per file; rerun failing ids then step 1.

## §5 Risks
- Chibi proportions: hands ~.5–.75 m not 1.3 m; tuned literals move (intended). Camera VIEW targets (y 1.0–1.15) may want ~.9 — only if §4.3 sheets show it.
- Contact/pose times measured not authored; some poses (upLow, vanish, armsWide, bowDraw) may read oddly — fix in POSES only.
- Crossfades between unrelated clips can clip limbs during snap; prefer same-clip keys.
- Offset holders: status rotation.z maps through qp; pivot now spine not pelvis — check sleep/cursed/confused.
- anchor-audit false matches/misses (arithmetic points, fx.on-moved bodies in moves dash, holy) — manual look in S7/S13; `// anchor-ok` escape.
- 30 `document`-needing ids skipped by actor-smoke; only covered in §4.
- Mage hat / Skeleton bulk differ under one S; `tgt` comes from the target's own bones.
- Stripping irreversible in-tree; originals in `.out/models-orig/`.
