// Strip animations from a .glb (no deps, deterministic). node tools/strip-glb.mjs in.glb out.glb <Clip,Clip,...|->
// '-' drops every animation. Unused accessors/bufferViews are removed; BIN is repacked (4-byte aligned, original order).
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert';
const [inp, out, keepArg] = process.argv.slice(2);
if (!inp || !out || !keepArg) { console.error('usage: strip-glb in out keep|-'); process.exit(2); }
const KEEP = keepArg === '-' ? [] : keepArg.split(',');
function readGlb(b) {
  assert.equal(b.readUInt32LE(0), 0x46546c67, 'not a glb');
  const jl = b.readUInt32LE(12), json = JSON.parse(b.subarray(20, 20 + jl).toString('utf8').trimEnd());
  const bin = b.subarray(28 + jl, 28 + jl + b.readUInt32LE(20 + jl));
  return { json, bin };
}
const { json: j, bin } = readGlb(readFileSync(inp));
j.animations = (j.animations || []).filter((a) => KEEP.includes(a.name));
const missing = KEEP.filter((n) => !j.animations.some((a) => a.name === n)); assert(!missing.length, 'missing clips: ' + missing);
if (!j.animations.length) delete j.animations;
// used accessors
const usedA = new Set(), addA = (i) => i != null && usedA.add(i);
for (const m of j.meshes || []) for (const p of m.primitives) { Object.values(p.attributes).forEach(addA); addA(p.indices); for (const t of p.targets || []) Object.values(t).forEach(addA); }
for (const s of j.skins || []) addA(s.inverseBindMatrices);
for (const a of j.animations || []) for (const s of a.samplers) { addA(s.input); addA(s.output); }
const aOld = [...usedA].sort((x, y) => x - y), aMap = new Map(aOld.map((o, n) => [o, n]));
// used bufferViews
const usedV = new Set();
for (const i of aOld) { const a = j.accessors[i]; if (a.bufferView != null) usedV.add(a.bufferView); assert(!a.sparse, 'sparse accessors unsupported'); }
for (const im of j.images || []) if (im.bufferView != null) usedV.add(im.bufferView);
const vOld = [...usedV].sort((x, y) => x - y), vMap = new Map(vOld.map((o, n) => [o, n]));
// repack BIN
const parts = []; let off = 0;
const views = vOld.map((o) => { const v = j.bufferViews[o], src = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength), pad = (4 - (off % 4)) % 4;
  if (pad) parts.push(Buffer.alloc(pad)); off += pad; const nv = { ...v, buffer: 0, byteOffset: off }; parts.push(src); off += v.byteLength; return nv; });
const padB = (4 - (off % 4)) % 4; if (padB) parts.push(Buffer.alloc(padB)); off += padB;
j.bufferViews = views; j.buffers = [{ byteLength: off }];
j.accessors = aOld.map((o) => { const a = { ...j.accessors[o] }; if (a.bufferView != null) a.bufferView = vMap.get(a.bufferView); return a; });
const rA = (i) => aMap.get(i);
for (const m of j.meshes || []) for (const p of m.primitives) { for (const k in p.attributes) p.attributes[k] = rA(p.attributes[k]); if (p.indices != null) p.indices = rA(p.indices); for (const t of p.targets || []) for (const k in t) t[k] = rA(t[k]); }
for (const s of j.skins || []) if (s.inverseBindMatrices != null) s.inverseBindMatrices = rA(s.inverseBindMatrices);
for (const a of j.animations || []) for (const s of a.samplers) { s.input = rA(s.input); s.output = rA(s.output); }
for (const im of j.images || []) if (im.bufferView != null) im.bufferView = vMap.get(im.bufferView);
// write
let js = Buffer.from(JSON.stringify(j), 'utf8'); const jp = (4 - (js.length % 4)) % 4; js = Buffer.concat([js, Buffer.alloc(jp, 0x20)]);
const binB = Buffer.concat(parts), total = 12 + 8 + js.length + 8 + binB.length, h = Buffer.alloc(12), cj = Buffer.alloc(8), cb = Buffer.alloc(8);
h.writeUInt32LE(0x46546c67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(total, 8);
cj.writeUInt32LE(js.length, 0); cj.writeUInt32LE(0x4e4f534a, 4); cb.writeUInt32LE(binB.length, 0); cb.writeUInt32LE(0x004e4942, 4);
const outB = Buffer.concat([h, cj, js, cb, binB]); writeFileSync(out, outB);
// self-check: re-parse, clip names, index bounds, image bytes identical
const r = readGlb(outB);
assert.deepEqual((r.json.animations || []).map((a) => a.name).sort(), [...KEEP].sort());
for (const a of r.json.accessors) assert(a.bufferView == null || a.bufferView < r.json.bufferViews.length);
for (const v of r.json.bufferViews) assert(v.byteOffset + v.byteLength <= r.bin.length && v.byteOffset % 4 === 0);
for (const a of r.json.animations || []) for (const s of a.samplers) assert(s.input < r.json.accessors.length && s.output < r.json.accessors.length);
console.log(`${out}: ${(r.json.animations || []).length} clips, ${r.json.accessors.length} accessors, ${(outB.length / 1e6).toFixed(2)} MB`);
