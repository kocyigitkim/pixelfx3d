// Rigged KayKit characters (CC0, see NOTICE.md). All three share one rig; only Knight.glb carries the animation clips.
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
const FILES = { knight: 'Knight.glb', mage: 'Mage.glb', skeleton: 'Skeleton_Warrior.glb' };
/** knight|mage|skeleton -> { scene, props: names of the hand-slot prop meshes, clips: Map(name -> AnimationClip filtered to this model) } */
export const MODELS = {};
/** clip name -> AnimationClip (from Knight.glb) */
export const CLIPS = new Map();
let P = null;
/** Loads the character models. Idempotent: repeated calls return the same promise. */
export function loadModels(base = new URL('../../assets/models/', import.meta.url)) {
  return P ??= (async () => {
    const g = {};
    await Promise.all(Object.entries(FILES).map(async ([k, f]) => { const buf = await (await fetch(new URL(f, base))).arrayBuffer(); g[k] = await new GLTFLoader().parseAsync(buf, ''); }));
    for (const c of g.knight.animations) CLIPS.set(c.name, c);
    for (const [k, { scene }] of Object.entries(g)) {
      const names = new Set(), props = []; scene.traverse((o) => { names.add(o.name); if (o.isMesh && !o.isSkinnedMesh && /^handslot/.test(o.parent?.name)) props.push(o.name); });
      const clips = new Map([...CLIPS].map(([n, c]) => { const t = c.tracks.filter((tr) => names.has(tr.name.split('.')[0])); return [n, t.length === c.tracks.length ? c : new c.constructor(n, c.duration, t)]; }));
      MODELS[k] = { scene, props, clips };
    }
  })();
}
/** independent copy (own skeleton) of a loaded model's scene */
export function cloneModel(char) {
  const m = MODELS[char]; if (!m) throw new Error('pixelfx3d: await loadModels() before creating effects with an actor');
  return SkeletonUtils.clone(m.scene);
}
