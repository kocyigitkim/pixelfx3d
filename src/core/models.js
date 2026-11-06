// Rigged Quaternius characters (CC0, see NOTICE.md; built by tools/build-chars.mjs). All three share one rig; only knight.glb carries the animation clips.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const FILES = { knight: 'knight.glb', mage: 'mage.glb', skeleton: 'target.glb' };
/** knight|mage|skeleton -> { scene, clips: Map(name -> AnimationClip filtered to this model) } */
export const MODELS = {};
/** clip name -> AnimationClip (from knight.glb) */
export const CLIPS = new Map();
let P = null;
/** Loads the character models (textures from <base>/tex/). Idempotent: repeated calls return the same promise. */
export function loadModels(base = new URL('../../assets/models/', import.meta.url)) {
  return P ??= (async () => {
    const g = {};
    await Promise.all(Object.entries(FILES).map(async ([k, f]) => { const u = new URL(f, base), buf = await (await fetch(u)).arrayBuffer(); g[k] = await new GLTFLoader().parseAsync(buf, new URL('.', u).href); }));
    for (const c of g.knight.animations) CLIPS.set(c.name, c);
    for (const [k, { scene }] of Object.entries(g)) {
      const names = new Set(); scene.traverse((o) => names.add(o.name));
      const clips = new Map([...CLIPS].map(([n, c]) => { const t = c.tracks.filter((tr) => names.has(tr.name.split('.')[0])); return [n, t.length === c.tracks.length ? c : new c.constructor(n, c.duration, t)]; }));
      MODELS[k] = { scene, clips };
    }
  })();
}
/** independent copy (own skeleton) of a loaded model's scene */
export function cloneModel(char) {
  const m = MODELS[char]; if (!m) throw new Error('pixelfx3d: await loadModels() before creating effects with an actor');
  return SkeletonUtils.clone(m.scene);
}
