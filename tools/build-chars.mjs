// Build the actor/target characters from the Quaternius CC0 packs (NOTICE.md) into assets/models/{knight,mage,target}.glb + tex/*.jpg.
// node tools/build-chars.mjs [src=.out/quaternius] [--tex]   (--tex re-encodes the textures with macOS sips; outputs are committed)
// Deterministic: same sources -> byte-identical glbs. Self-check re-parses every glb with three's GLTFLoader.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
process.chdir(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2), SRC = args.find((a) => !a.startsWith('--')) || '.out/quaternius', OUT = 'assets/models/';
const OF = `${SRC}/Modular Character Outfits - Fantasy[Standard]/Exports/glTF (Godot-Unreal)/Outfits/`, BC = `${SRC}/Universal Base Characters[Standard]/Base Characters/Godot - UE/`;
const HR = `${SRC}/Universal Base Characters[Standard]/Hairstyles/Rigged to Head Bone/glTF (Godot -Unreal)/`;
/** out file -> [outfit, head source (full body, cut to Head/neck_01), extra skinned meshes...] */
const CHARS = { knight: [OF + 'Male_Ranger', BC + 'Superhero_Male_FullBody'], mage: [OF + 'Female_Ranger', BC + 'Superhero_Female_FullBody'], target: [OF + 'Male_Peasant', BC + 'Superhero_Male_FullBody', HR + 'Hair_SimpleParted'] };
const HEAD = new Set(['Head', 'neck_01']);
const UAL = [`${SRC}/Universal Animation Library[Standard]/Unreal-Godot/UAL1_Standard.glb`, `${SRC}/Universal Animation Library 2[Standard]/Unreal-Godot/UAL2_Standard.glb`];
/** clips stored in knight.glb (shared by bone name); '_R' = right-handed mirror of the (left-handed) source clip, only the mirror is stored */
const KEEP = ['Idle_Loop', 'A_TPose', 'Sword_Attack', 'Sword_Regular_A', 'Sword_Regular_B', 'Sword_Regular_C', 'Sword_Heavy_Combo', 'Sword_Dash', 'Spell_Simple_Enter_R', 'Spell_Simple_Shoot_R',
  'Pistol_Aim_Up', 'Pistol_Aim_Neutral', 'Pistol_Shoot', 'Jump_Start', 'Jump_Land', 'OverhandThrow', 'Punch_Cross', 'Hit_Chest', 'Hit_Head', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Shield_Dash', 'Roll', 'LayToIdle'];

const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }, TA = { 5121: Uint8Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
const CT = new Map(Object.entries(TA).map(([k, T]) => [T, +k]));
function load(p) { const j = JSON.parse(readFileSync(p + '.gltf', 'utf8')), dir = p.replace(/[^/]*$/, ''); return { j, dir, bin: readFileSync(dir + j.buffers[0].uri) }; }
function loadGlb(p) { const b = readFileSync(p), jl = b.readUInt32LE(12); return { j: JSON.parse(b.subarray(20, 20 + jl).toString('utf8')), bin: b.subarray(28 + jl, 28 + jl + b.readUInt32LE(20 + jl)) }; }
function acc(g, i) {
  const a = g.j.accessors[i], v = g.j.bufferViews[a.bufferView], T = TA[a.componentType], o = g.bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0);
  assert(!v.byteStride && !a.sparse, 'interleaved/sparse unsupported'); return new T(g.bin.buffer.slice(o, o + a.count * NC[a.type] * T.BYTES_PER_ELEMENT));
}

/* ---------------------------------------------------------------- glTF writer */
function writer() {
  const j = { asset: { version: '2.0', generator: 'pixelfx3d tools/build-chars.mjs' }, scene: 0, scenes: [], nodes: [], meshes: [], skins: [], materials: [], textures: [], images: [], samplers: [], accessors: [], bufferViews: [], buffers: [] };
  const parts = []; let off = 0;
  const add = (arr, type, extra) => {
    const b = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength), pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad; }
    j.bufferViews.push({ buffer: 0, byteOffset: off, byteLength: b.length }); parts.push(b); off += b.length;
    return j.accessors.push({ bufferView: j.bufferViews.length - 1, componentType: CT.get(arr.constructor), count: arr.length / NC[type], type, ...extra }) - 1;
  };
  const glb = () => {
    const pad = (4 - (off % 4)) % 4; if (pad) parts.push(Buffer.alloc(pad)); j.buffers = [{ byteLength: off + pad }];
    for (const k of Object.keys(j)) if (Array.isArray(j[k]) && !j[k].length) delete j[k];
    let js = Buffer.from(JSON.stringify(j), 'utf8'); js = Buffer.concat([js, Buffer.alloc((4 - (js.length % 4)) % 4, 0x20)]);
    const bin = Buffer.concat(parts), h = Buffer.alloc(20), cb = Buffer.alloc(8);
    h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(28 + js.length + bin.length, 8); h.writeUInt32LE(js.length, 12); h.writeUInt32LE(0x4e4f534a, 16);
    cb.writeUInt32LE(bin.length, 0); cb.writeUInt32LE(0x004e4942, 4); return Buffer.concat([h, js, cb, bin]);
  };
  return { j, add, glb };
}

/* ---------------------------------------------------------------- materials / textures (by URI tex/<name>.jpg) */
const TEX = new Map(); // tex name -> source png
function material(w, g, mi, cache) {
  const src = g.j.materials[mi], hit = w.j.materials.findIndex((m) => m.name === src.name); if (hit >= 0) return hit;
  const m = JSON.parse(JSON.stringify(src)), pbr = m.pbrMetallicRoughness ??= {};
  for (const ti of [m.normalTexture, m.occlusionTexture, m.emissiveTexture, pbr.baseColorTexture, pbr.metallicRoughnessTexture]) if (ti) {
    const im = g.j.images[g.j.textures[ti.index].source], name = im.name.replace(/\.png$/, ''), file = g.dir + name + '.png'; assert(existsSync(file), 'missing ' + file);
    TEX.set(name, file); let ii = w.j.images.findIndex((x) => x.name === name);
    if (ii < 0) { ii = w.j.images.push({ name, uri: `tex/${name}.jpg`, mimeType: 'image/jpeg' }) - 1; w.j.textures.push({ sampler: 0, source: ii }); }
    ti.index = ii; // one texture per image, same order
  }
  if (!/Ranger|Peasant/.test(m.name)) pbr.metallicFactor = 0; // skin, eyes, hair
  if (!w.j.samplers.length) w.j.samplers.push(g.j.samplers[0]);
  return w.j.materials.push(m) - 1;
}

/* ---------------------------------------------------------------- geometry: POSITION NORMAL TEXCOORD_0 JOINTS_0 WEIGHTS_0 (u8, sum 255) */
function primitive(w, g, p, skinJoints, cut) {
  const A = p.attributes, P = acc(g, A.POSITION), N = acc(g, A.NORMAL), UV = acc(g, A.TEXCOORD_0), J = acc(g, A.JOINTS_0), W = acc(g, A.WEIGHTS_0), I = acc(g, p.indices), n = P.length / 3;
  const dom = (v) => { let b = 0; for (let k = 1; k < 4; k++) if (W[v * 4 + k] > W[v * 4 + b]) b = k; return J[v * 4 + b]; };
  let tri = I; const map = new Int32Array(n).fill(-1), ord = [];
  if (cut) { const keep = (v) => HEAD.has(g.j.nodes[skinJoints[dom(v)]].name), t = []; for (let i = 0; i < I.length; i += 3) if (keep(I[i]) && keep(I[i + 1]) && keep(I[i + 2])) t.push(I[i], I[i + 1], I[i + 2]); tri = t; }
  for (const v of tri) if (map[v] < 0) map[v] = ord.push(v) - 1;
  const pick = (src, k, T = src.constructor) => { const o = new T(ord.length * k); ord.forEach((v, i) => { for (let c = 0; c < k; c++) o[i * k + c] = src[v * k + c]; }); return o; };
  const wt = new Uint8Array(ord.length * 4);
  ord.forEach((v, i) => { const q = [0, 1, 2, 3].map((k) => Math.round(W[v * 4 + k] * 255)), s = q.reduce((a, b) => a + b, 0); let b = 0; for (let k = 1; k < 4; k++) if (q[k] > q[b]) b = k; q[b] += 255 - s; wt.set(q, i * 4); });
  const pos = pick(P, 3), mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < pos.length; i++) { mn[i % 3] = Math.min(mn[i % 3], pos[i]); mx[i % 3] = Math.max(mx[i % 3], pos[i]); }
  const ix = ord.length < 65536 ? Uint16Array.from(tri, (v) => map[v]) : Uint32Array.from(tri, (v) => map[v]);
  return { attributes: { POSITION: w.add(pos, 'VEC3', { min: mn, max: mx }), NORMAL: w.add(pick(N, 3), 'VEC3'), TEXCOORD_0: w.add(pick(UV, 2), 'VEC2'), JOINTS_0: w.add(pick(J, 4, Uint8Array), 'VEC4'), WEIGHTS_0: w.add(wt, 'VEC4', { normalized: true }) },
    indices: w.add(ix, 'SCALAR'), material: material(w, g, p.material) };
}
function mesh(w, g, mi, skinJoints, cut) { const m = g.j.meshes[mi]; return w.j.meshes.push({ name: m.name, primitives: m.primitives.map((p) => primitive(w, g, p, skinJoints, cut)) }) - 1; }

/* ---------------------------------------------------------------- clips: rotations + pelvis translation (shifted onto the char's rest), no scale; constant tracks -> 2 keys */
const mirrorName = (n) => n.replace(/_([lr])$/, (_, c) => (c === 'l' ? '_r' : '_l'));
function clips(w, names) {
  const U = UAL.map(loadGlb), byName = new Map(w.j.nodes.map((n, i) => [n.name, i])), pel = w.j.nodes[byName.get('pelvis')].translation;
  for (const name of names) {
    const mir = name.endsWith('_R'), src = mir ? name.slice(0, -2) : name, g = U.find((u) => u.j.animations.some((a) => a.name === src)); assert(g, 'missing clip ' + src);
    const a = g.j.animations.find((x) => x.name === src), uPel = g.j.nodes.find((n) => n.name === 'pelvis').translation, inputs = new Map(), anim = { name, channels: [], samplers: [] };
    const input = (arr) => { const k = arr.join(','); if (!inputs.has(k)) inputs.set(k, w.add(arr, 'SCALAR', { min: [arr[0]], max: [arr[arr.length - 1]] })); return inputs.get(k); };
    for (const c of a.channels) {
      const bone = g.j.nodes[c.target.node].name, path = c.target.path; if (path === 'scale' || (path === 'translation' && bone !== 'pelvis')) continue;
      const smp = a.samplers[c.sampler], T = acc(g, smp.input), V = acc(g, smp.output), k = path === 'rotation' ? 4 : 3; assert.equal(smp.interpolation, 'LINEAR');
      if (path === 'translation') for (let i = 0; i < V.length; i += 3) for (let j = 0; j < 3; j++) V[i + j] += pel[j] - uPel[j];
      if (mir) for (let i = 0; i < V.length; i += k) { if (k === 3) V[i] = -V[i]; else { V[i + 1] = -V[i + 1]; V[i + 2] = -V[i + 2]; } }
      const node = byName.get(mir ? mirrorName(bone) : bone); assert(node != null, 'no node ' + bone);
      const flat = V.every((x, i) => Math.abs(x - V[i % k]) < 1e-6), times = flat ? Float32Array.of(T[0], T[T.length - 1]) : T, vals = flat ? Float32Array.from([...V.subarray(0, k), ...V.subarray(0, k)]) : V;
      anim.channels.push({ sampler: anim.samplers.push({ input: input(times), output: w.add(vals, k === 4 ? 'VEC4' : 'VEC3'), interpolation: 'LINEAR' }) - 1, target: { node, path } });
    }
    (w.j.animations ??= []).push(anim);
  }
}

/* ---------------------------------------------------------------- characters */
function build(name, [outfit, head, ...extra], clipNames = []) {
  const w = writer(), o = load(outfit), sk = o.j.skins[0];
  assert(o.j.skins.length === 1 && sk.joints.length === 65, outfit + ': expected one 65-joint skin');
  w.j.nodes = JSON.parse(JSON.stringify(o.j.nodes)); w.j.scenes = [{ name, nodes: o.j.scenes[0].nodes }];
  const byName = new Map(w.j.nodes.map((n, i) => [n.name, i])), arm = w.j.nodes[o.j.scenes[0].nodes[0]];
  w.j.skins.push({ name, joints: sk.joints, inverseBindMatrices: w.add(acc(o, sk.inverseBindMatrices), 'MAT4') });
  w.j.nodes.forEach((n) => { if (n.mesh != null) n.mesh = mesh(w, o, n.mesh, sk.joints, false); });
  for (const f of [head, ...extra]) {
    const g = load(f), s = g.j.skins[0], joints = s.joints.map((ji) => { const k = byName.get(g.j.nodes[ji].name); assert(k != null, 'unmatched joint ' + g.j.nodes[ji].name); return k; });
    const si = w.j.skins.push({ name: g.j.nodes[g.j.scenes[0].nodes[0]].name + '_' + f.split('/').pop(), joints, inverseBindMatrices: w.add(acc(g, s.inverseBindMatrices), 'MAT4') }) - 1;
    g.j.nodes.forEach((n) => { if (n.mesh == null) return; const cut = f === head && /^super/i.test(n.name);
      arm.children.push(w.j.nodes.push({ name: cut ? n.name + '_Head' : n.name, mesh: mesh(w, g, n.mesh, s.joints, cut), skin: si }) - 1); });
  }
  if (clipNames.length) clips(w, clipNames);
  return w.glb();
}

mkdirSync(OUT + 'tex', { recursive: true });
const files = Object.fromEntries(Object.entries(CHARS).map(([k, v]) => [k, build(k, v, k === 'knight' ? KEEP : [])]));
for (const [k, b] of Object.entries(files)) writeFileSync(`${OUT}${k}.glb`, b);

/* ---------------------------------------------------------------- textures (sips: JPEG q85 colour / q90 normal maps) */
const SIZE = [[/^T_(Ranger|Peasant|Superhero_\w+?)_(BaseColor|Dark)/, 1024], [/Roughness|^T_Hair_\d_Normal|^T_Eye_Brown/, 256], [/^T_Eye_Normal/, 128]];
if (args.includes('--tex')) for (const [n, f] of [...TEX].sort()) {
  const sz = SIZE.find(([r]) => r.test(n))?.[1] ?? 512;
  execFileSync('sips', ['-Z', String(sz), '-s', 'format', 'jpeg', '-s', 'formatOptions', /Normal/.test(n) ? '90' : '85', f, '--out', `${OUT}tex/${n}.jpg`], { stdio: 'ignore' });
}

/* ---------------------------------------------------------------- self-check */
await import('./node-env.mjs');
const THREE = await import('three'), { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
for (const [k, b] of Object.entries(files)) {
  const g = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), new URL(OUT, `file://${process.cwd()}/`).href), sm = [];
  g.scene.traverse((o) => o.isSkinnedMesh && sm.push(o));
  const bones = new Set(sm.flatMap((m) => m.skeleton.bones)); assert.equal(bones.size, 65, k + ': bones');
  const j = g.parser.json; for (const im of j.images) assert(existsSync(OUT + im.uri), k + ': missing texture ' + im.uri);
  g.scene.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(g.scene, true);
  if (k === 'knight') assert.deepEqual(g.animations.map((c) => c.name), KEEP, 'clip list'); else assert.equal(g.animations.length, 0);
  console.log(`${k}.glb ${(b.length / 1e6).toFixed(2)} MB: ${sm.length} skinned meshes (${sm.map((m) => m.name).join(' ')}), ${j.images.length} textures, y ${bb.min.y.toFixed(3)}..${bb.max.y.toFixed(3)}`);
}

// mirror check: each '_R' clip at 10 times, every joint (root-local) = x-reflection of the source clip's mirrored joint within 1 mm
{
  const b = build('knight', CHARS.knight, [...KEEP, ...KEEP.filter((n) => n.endsWith('_R')).map((n) => n.slice(0, -2))]), g = await new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), '');
  const root = g.scene.getObjectByName('root'), bones = []; root.traverse((o) => o.isBone && bones.push(o)); const mx = new THREE.AnimationMixer(g.scene);
  const pose = (clip, t) => { mx.stopAllAction(); const a = mx.clipAction(clip); a.play(); a.time = t; mx.update(0); g.scene.updateMatrixWorld(true); return new Map(bones.map((o) => [o.name, root.worldToLocal(o.getWorldPosition(new THREE.Vector3()))])); };
  for (const n of KEEP.filter((x) => x.endsWith('_R'))) {
    const R = g.animations.find((c) => c.name === n), S = g.animations.find((c) => c.name === n.slice(0, -2)); let worst = 0;
    for (let i = 0; i < 10; i++) { const t = (R.duration * i) / 10, pr = pose(R, t), ps = pose(S, t); for (const [bn, p] of pr) { const q = ps.get(mirrorName(bn)); worst = Math.max(worst, Math.hypot(p.x + q.x, p.y - q.y, p.z - q.z)); } }
    assert(worst < 1e-3, `${n}: mirror error ${worst}`); console.log(`mirror ${n}: max joint error ${(worst * 1000).toFixed(3)} mm`);
  }
}
