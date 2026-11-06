# PLAN6B — realistic human actor and target (Quaternius CC0)

Sequential steps, one coding agent per batch, no browser/GPU while coding (acceptance: node --check + GPU-free node tools via tools/node-env.mjs). No new npm deps. Baseline for §4: tag `p6-final` (da3c866).

## Measured
- One 65-joint UE-style rig for outfits, base chars and UAL clips: `root(-90°X) > pelvis > spine_01..03 > neck_01 > Head`, `clavicle/upperarm/lowerarm/hand_{l,r}`, fingers `*_01..04_{l,r}`, `thigh/calf/foot/ball_{l,r}`. Metres, faces +Z, right hand at −X, feet y=0; names survive GLTFLoader. Node `.gltf` loading needs a `ProgressEvent` shim.
- Male_Ranger 1.865 m with hood (head top 1.81); rest y: pelvis .949, spine_03 1.311, neck_01 1.52, Head 1.60. Female Head 1.55, top 1.794.
- Superhero_Male_FullBody: `SuperHero_Male` (mesh "Sphere.005_Retopology.004", full body 7281 v / 12566 t), `Eyes` ("Face.001"), `Eyebrows` ("Face", MI_Hair_1). Head cut: keep a triangle if all 3 verts' dominant joint ∈ {Head, neck_01} → 2852 t, 1559 v, y 1.524..1.81. Outfit body tops: Ranger 1.60, Peasant 1.559, Female_Ranger 1.541 (collar covers the seam).
- UAL clips: T/R/S tracks on all 65 bones (LINEAR); scale always 1; non-pelvis translations are constant mannequin rest offsets (≤4.6 cm) → drop them. Pelvis: mannequin rest [0,.05,.917] vs male [0,.043,.949] → add [0,−.007,+.032] (root-local) to every pelvis key (else feet sink 3 cm); female then floats ~1 cm → per-char `y0`.
- Mirror: L/R rest obeys `t'=(−x,y,z)`, `q'=(x,−y,−z,w)` with `_l↔_r`. All UAL spells are left-handed → build right-handed `_R` copies.
- Grip (hand_r local; same fist in every clip): index loop centre (−.03,.11,.03), pinky (−.03,.09,−.04); grip point (−.03,.10,−.01); blade axis pinky→index (−.02,.29,.96). Left = x negated. Sword_Attack@.433 axis → (1.00,.04,.03), Sword_Dash@.33 → (.95,−.04,.30).
- Textures PNG (no base-colour alpha): outfits 4096², skin/head/hair 2048², eyes 256². glTF needs OpenGL (Y+) normals: outfit default normals are OpenGL (UE ones in `Normals-UnrealEngine/`); for head/eyes/hair use `Textures/Normals Unity - Godot/*.png`. Skin/hair `metallicFactor 0`.
- Idle_Loop@0 (Dummy frame, +X, pre pelvis fix): pelvis .877, spine_03 1.243, Head 1.531, hand_r (−.17,.94,.28) — close to P5, so the `anchors-p5.json` gate gets more meaningful.

## §1 Decisions
Characters keep names `knight|mage|skeleton` (act.char, setupActor rule, effects unchanged):
| char | outfit meshes | head (cut from Superhero) | extra | role |
|---|---|---|---|---|
| knight | Male_Ranger all 9 (Pauldron, Arms 2 prims, Bracer, Body, Belt_1, Belt_1.001, Boots, Head_Hood, Legs) | Male head cut + Eyes + Eyebrows | – | default actor |
| mage | Female_Ranger all 9 | Female head cut + Eyes + Eyebrows | – | caster (shares Ranger textures) |
| skeleton | Male_Peasant 4 | Male head cut + Eyes + Eyebrows | Hair_SimpleParted (Rigged to Head Bone) | target, faces −X |
Rangers keep the hood, no hair. Weapons all procedural (dummy.js code for sword, staff, hammer, spear, dagger, scythe, whip; see `git show p5-final:src/core/dummy.js`); KayKit removed entirely incl. credit. `WLEN={sword:1.06,staff:1.28,hammer:1.0,spear:1.8,dagger:.42,scythe:1.4,whip:.3}`.

Files `assets/models/`: `knight.glb` (mesh + all clips), `mage.glb`, `target.glb` (mesh only), shared `tex/*.jpg` by URI (several skeletons in one glb get renamed `pelvis_1` by GLTFLoader; URIs avoid duplication and the bufferView mimeType issue; node texture loads fail into the silenced warning path).
Geometry: keep POSITION, NORMAL, TEXCOORD_0, JOINTS_0, WEIGHTS_0 (drop TEXCOORD_1..3, COLOR_0/1); WEIGHTS_0 normalized u8 renormalized to 255; compact head-cut verts; added meshes keep their own skin (own inverseBindMatrices), joints remapped by name onto the outfit nodes.
Textures (sips JPEG q85 colour / q90 normals): outfit BaseColor 1024, Normal & ORM 512; head BaseColor 1024, Normal 512, Roughness 256; hand skin `T_Regular_*` BaseColor & Normal 512, Roughness 256; Hair_1 512/256; Eye 256/128. ~22 files, ~2.6 MB. Total estimate ~6.6 MB (gate ≤8 MB).
Clips kept (24; `_R` = mirrored, only `_R` stored): Idle_Loop, A_TPose, Sword_Attack, Sword_Regular_A, Sword_Regular_B, Sword_Regular_C, Sword_Heavy_Combo, Sword_Dash, Spell_Simple_Enter_R, Spell_Simple_Shoot_R, Pistol_Aim_Up, Pistol_Aim_Neutral, Pistol_Shoot, Jump_Start, Jump_Land, OverhandThrow, Punch_Cross, Hit_Chest, Hit_Head, Sprint_Loop, Jog_Fwd_Loop, Shield_Dash, Roll, LayToIdle. Constant tracks collapse to one key; one shared input accessor per clip.

ACTS rows gain optional fields `[clip, D, c, E=D, hold=0]` (E = clip time where the act leaves for guard; hold keeps frame E). Preliminary (240 Hz, 1 m blade; S2/S3 re-measure):
| kind | clip | D | c | E / hold | metric |
|---|---|---|---|---|---|
| slash | Sword_Attack | 1.533 | .433 | .70 | front: tip (1.74,.80,−.03); overhead @.333 tip 2.38 |
| sideslash | Sword_Regular_C | 2.000 | .687 | .90 | front: tip (1.72,.43,−.05); wound back @.60 |
| smash | Sword_Heavy_Combo | 4.333 | 2.633 | 3.20 | first tip ≤.05 after fastest: (1.63,−.04,0); overhead hand 1.92 @2.533 |
| thrust | Sword_Dash | 1.567 | .321 | .90 | 98% reach: tip (1.68,.64,.27) |
| cast | Spell_Simple_Enter_R | .533 | .45 | – / .35 | full extension: handR (.61,1.41,.15) |
| castup | OverhandThrow | 1.333 | .292 | .30 / .40 | max hand height 1.68 |
| stomp | Jump_Land | 1.267 | .20 | – | lowest hips .43 |
| throw | OverhandThrow | 1.333 | .37 | – | release, reach 1.02 |
| none | Idle_Loop | – | 0 | – | – |
Target `kick(s)`: s<1.2 → Hit_Chest (.333), else Hit_Head (.433), then the .25 s blend to Idle_Loop@0. Hit_Knockback/Sword_Block unused.

POSES → {clip,time} (all 40 names; S3 verifies with `rig-info --poses`): idle, guard Idle_Loop@0; windupHigh/cut/follow Sword_Attack@.333/.433/.50; sideBack/sideCut Sword_Regular_C@.60/.687; overhead2/overheadUp/smashDown/smashGround Sword_Heavy_Combo@2.50/2.533/2.60/2.65; pullback, thrustBack/lunge/behind Sword_Dash@.20/.321/.50; castCharge Spell_Simple_Enter_R@.30; castRelease Spell_Simple_Shoot_R@.133; castUp Pistol_Aim_Up@0; crouch Jump_Start@0; leap Jump_Start@.57; land Jump_Land@.20; throwBack/throwFwd OverhandThrow@.27/.40; upLow/upHigh/slashBack Sword_Regular_A@.20/.30/.433; daggerA/daggerB Punch_Cross@.15/.30; sweepBack/sweepCut Sword_Regular_B@.183/.25; roar Jump_Land@0; armsWide A_TPose@0; hurt Hit_Chest@.15; bowDraw/bowRelease Pistol_Aim_Neutral@0 / Pistol_Shoot@.10; runA/runB/runAir Sprint_Loop@0/.33, Jog_Fwd_Loop@.30; dashLow Shield_Dash@0; vanish Roll@.20.
Hard-coded clip names outside dummy.js: holy.js:147/155 `Lie_StandUp` → `LayToIdle` (S3 checks LayToIdle@0 is lying); status.js:153 `Running_A` → `{clip:'Sprint_Loop', time: fr(t/0.6)*0.667}`.

## §2 Architecture deltas
- **tools/build-chars.mjs** (new, ~200 lines; node + sips + three for self-check; replaces tools/strip-glb.mjs, which is deleted). `node tools/build-chars.mjs [src=.out/quaternius] [--tex]`: reads outfit/Superhero/hair .gltf+.bin JSON; merges each char into one glTF (outfit node tree + skin, added meshes each with own skin, joints by name, head cut by dominant joint); materials with textures by URI `tex/<name>.jpg`, sampler as source; writes clips into knight.glb (channels target knight nodes; drop scale tracks and non-pelvis translations; pelvis delta; `_R` mirrors; collapse constant tracks; dedupe inputs); GLB writer with 4-byte aligned BIN and space-padded JSON (from strip-glb). `--tex` runs `sips -Z <size> -s format jpeg -s formatOptions <q>`; outputs committed. Self-check: re-parse, assert mesh/joint counts and clip list; mirror check (each `_R` clip at 10 times: every joint world pos equals x-reflection in root-local space of the source within 1 mm). Deterministic: two runs byte-identical.
- **src/core/models.js**: `FILES={knight:'knight.glb', mage:'mage.glb', skeleton:'target.glb'}`; `parseAsync(buf, new URL('.', u).href)`; remove props; keep clip filtering.
- **src/core/dummy.js**: `S=1`; tables ACTS, POSES, WLEN, `RIG[char]={chest:[spine_03-local], head:[Head-local], headR, grip:[pos,axis], y0}`. Bones: hips=pelvis, spine=spine_01 (offset holder torso → spine_01), chest anchor = spine_03+RIG.chest, head=Head, handR/handL=hand_r/hand_l. Hand holder Object3D on hand_r/hand_l at grip.pos, quaternion `setFromUnitVectors((0,−1,0), axis)` (left mirrored), scale 1; tip(l) convention (local −Y) unchanged. `m.position.y=−y0`. holdWeapon procedural only. actKeys 5-tuple: `[[at−w,f(max(0,c−w))],[at,f(c)],[at+E−c,f(E)], hold?[at+E−c+hold,f(E)]:–, [at+E−c+hold+.25,'guard']]`. Target kick per §1, rotY −π/2. overlay() unchanged (hh=y/1.9 fits).
- fx.js, _skill.js, fx.anchor, k.at, bladeArc: no API change.
- holy.js/status.js: clip names above; status eyes()/headAt scale via headR (~.106); delete the dead Knight_Helmet line.
- **tools/rig-info.mjs** body rewrite: new bone names, slot = RIG grip; grip from finger loop centres (mean of 01..03 joints, hand-local; grip = mean of index/middle/ring/pinky centres; axis pinky→index, Idle_Loop@0); per char height check (top ∈ [1.75,1.9]), y0 = min y of skinned bbox at Idle@0 (`Box3.setFromObject(m,true)`), head centre + headR from the head-cut mesh bbox, chest = outfit Body bbox centre → spine_03-local; contact metrics front/stab/chop/reach/height/land; keep --trace/--poses; drop 1H_Sword check; print E frame per kind.
- anchor-audit, actor-smoke unchanged; anchors-p5.json gate kept.
- NOTICE.md "Character models": Quaternius (quaternius.com) CC0 1.0 — Universal Base Characters, Modular Character Outfits – Fantasy, Universal Animation Library 1 & 2; built by tools/build-chars.mjs; KayKit removed. README credit line, index.d.ts ~286-287, AUTHORING "Actor, target and anchors".

## §3 Coding steps
- **S0 (coordinator)**: `git tag p6-final`; `git worktree add ../pixelfx3d-p6 p6-final`; copy the 4 unzipped packs to `.out/quaternius/`.
- **S1 build-chars meshes + textures**: write the tool (merge, head cut, attribute trim, u8 weights, --tex), write 3 glbs (no clips yet) + `assets/models/tex/*.jpg`; `git rm` Knight.glb, Mage.glb, Skeleton_Warrior.glb, tools/strip-glb.mjs; NOTICE/README. Accept: node --check; two builds identical sha1; parse SkinnedMesh counts (expected knight 11, mage 11, skeleton 8 — confirm); every texture URI exists; `du -sh assets/models` ≤7 MB.
- **S2 clips + loader**: clip pass (KEEP, pelvis delta, mirror + self-check, constant collapse); models.js; rig-info rewrite. Accept: self-check passes; rig-info prints 24 clips, no missing tracks, |y0|<.03 per char, top in range, grip per char, contact table; `du -sh assets/models` ≤8 MB.
- **S3 dummy.js**: S=1, RIG/ACTS/POSES/WLEN from rig-info; bones, hand holders, y0, procedural holdWeapon, Target kick; holy.js/status.js clip names. Accept: node --check; `rig-info --poses`: windupHigh tip y > cut tip y; castRelease handR y > 1.3; land hips y < idle hips y; idle feet within ±.02; idle chest y ∈ [1.15,1.35], head ∈ [1.6,1.75]; at each kind's c tip x > .9; `--trace` shows each E before the next move; `actor-smoke all` exit 0.
- **S4 anchor pass A** (melee, impacts, moves, warrior, rogue, archer): anchor-audit; REACH → act.target x (expected near P5 ~1.85; `git show p5-final:<file>`); re-derive act.contact; restore P5 dash lengths shortened for chibi (cyclone-step etc.) where REACH/trace supports; fix MATCH or `// anchor-ok`. Accept: node --check; `anchor-audit <files> --check` 0; `actor-smoke cat:<each>` 0.
- **S5 anchor pass B** (all remaining act/body files: mage, priest, shaman, pyro, hydro, geo, aero, steam, lava, storm, frost, swamp, dune, plasma, cryo, nano, ion, quantum, status, holy, spawn, scifi, fire, ice, lightning, shadow, dark, arcane): same; re-check status rig()/headAt/eyes() in front of the real face (headR ≈ .106 → k ≈ .92), holy halo + LayToIdle timing, scifi/holy head/chest attachments, fire/ice mouth offsets. Accept: `anchor-audit --check` all 0; `actor-smoke all` 0.
- **S6 docs**: AUTHORING (models table, char mapping, clip/contact table, E/hold, POSES, mirrored `_R` spells), index.d.ts comments. Accept: node --check tools; anchor-audit --check and actor-smoke all 0.

## §4 Test phase (on the user's word)
Setup `node tools/serve.mjs 8123`; baseline `cd ../pixelfx3d-p6 && node tools/serve.mjs 8124`.
1. `node tools/shots.mjs .out/p6b/op all 0.5` (+transparent=1, +host=1): 406/406, no console/shader/PropertyBinding errors, no texture 404s.
2. `BASE_PORT=8124 node tools/same-test.mjs`: non-actor ids identical (homing-missile exception).
3. Contact sheets per actor category (`shots.mjs .out/p6b/cs cat:<c> -0.3,0,-0.7` → sheet.mjs). Review: face visible under hood, head not dark (normals), no T-pose, feet not floating/sinking, sword in fist, crescent along blade, casts from right hand, projectiles land on target chest (~1.27), target flinches, mage reads as female ranger.
4. `node tools/alpha-test.mjs` showcase exit 0.
5. `node tools/determinism-test.mjs all`: A 406/406; B only plasma-ball, laser-grid, muzzle-smg, soul-drain.
6. `node tools/gpu-scan.mjs all`: no black frames.
7. Perf PERF30 medium within 10% of p6-final (~30k verts per char).
8. `node tools/bake.mjs all --check` ok.
Fix order: shared (dummy.js tables, build-chars) → per file → rerun step 1.

## §5 Risks
- Normal Y convention guessed from folder names; if inverted in §4.3, flip G in --tex for that set.
- UAL sword attacks lunge low (pelvis .5–.6, tip y .4–.8): tip-anchored VFX follow; literal chest-height arcs may sit high — fix via anchors.
- Swings cross the front within 1–2 frames at 30 fps (40–70 m/s): contact from 240 Hz rig-info; E cut-offs avoid combo follow-ups.
- Mirrored spells rely on the symmetric rig; build self-check is the gate.
- Overlay transparent=true on ~12 meshes/char may sort badly (hood, face, eyes); if seen, transparent only while uAlpha<1 (shared fix).
- Head cut may gap at the collar on female/peasant; widen to spine_03 verts above collar y if needed.
- sips macOS-only (build-time, outputs committed).
- Pose choices roar, armsWide (T-pose), vanish (Roll), castUp (Pistol_Aim_Up), castup (OverhandThrow windup) may read oddly — fix in POSES/ACTS only.
- Target never falls (Hit_Knockback lies flat; anchors wouldn't follow).
- Procedural weapons look simpler than the characters.
