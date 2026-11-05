import * as THREE from 'three';
import { SU } from './glsl.js';
// Baked textures from assets/fx. Data-carrying: no colour-space conversion, no premultiplication (see PLAN4 §4).
export const TEX = {};
const PH = (() => { const t = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1); t.needsUpdate = true; return t; })();
// Creates or refreshes TEX[name] with placeholder textures and ready:false (synchronous, so callers never see null).
function entry(name, p = {}) {
  const size = p.size ?? 1024, e = TEX[name] ?? (TEX[name] = {});
  return Object.assign(e, { a: e.a ?? PH, b: e.b ?? PH, frames: p.frames ?? 64, framePow: p.framePow ?? 1, emissive: !!p.emissive, emax: p.emax ?? 1, size, tile: size / 8, ready: false });
}
function tex(bmp) {
  const t = new THREE.Texture(bmp);
  t.colorSpace = THREE.NoColorSpace; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
let P = null;
/** Loads manifest presets (a, b) and noise. Idempotent: repeated calls return the same promise. */
export function loadTextures(base = new URL('../../assets/fx/', import.meta.url)) {
  return P ??= (async () => {
    let man;
    try { man = await (await fetch(new URL('manifest.json', base))).json(); } catch (e) { console.warn('textures: manifest failed', e); return; }
    const L = new THREE.ImageBitmapLoader();
    L.setOptions({ imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const load = (file) => L.loadAsync(new URL(file, base).href), warn = (what) => (e) => console.warn(`textures: ${what} failed`, e);
    const jobs = [];
    if (man.noise) jobs.push(load(man.noise.file).then((b) => { const t = tex(b); t.wrapS = t.wrapT = THREE.RepeatWrapping; SU.tNoise.value = t; }).catch(warn('noise')));
    for (const [name, p] of Object.entries(man.presets ?? {})) {
      const e = entry(name, p);
      jobs.push(Promise.all([load(p.a), load(p.b)]).then(([a, b]) => { e.a = tex(a); e.b = tex(b); e.ready = true; }).catch(warn(name)));
    }
    await Promise.all(jobs);
  })();
}
/** Entry for a preset name; unknown names get a placeholder entry (ready:false). */
export function getTex(name) { return TEX[name] ?? entry(name); }
