import * as THREE from 'three';

/* ---------- shared types ---------- */
export type Vec3 = [number, number, number];
export type Range = [number, number];
/** stops: [u, '#hex', alpha?] */
export type Ramp = Array<[number, string, number?]>;
export interface Timed { t0?: number; dur?: number; fade?: [number, number]; }

export interface Rng {
  (): number;
  range(a: number, b: number): number;
  pick<T>(arr: T[]): T;
}

/* ---------- builder params (names as in docs/AUTHORING.md) ---------- */
export interface EmitterParams extends Timed {
  soft?: number;
  count?: number; kind?: string; blend?: 'add' | 'normal'; ramp?: Ramp; intensity?: number;
  size?: Range; sizeVar?: number; sizePow?: number; aspect?: number; life?: Range; speed?: Range;
  dir?: Vec3; spread?: number; radial?: number;
  shape?: 'point' | 'sphere' | 'disc' | 'ring' | 'box' | 'line';
  radius?: number; radiusIn?: number; shapeSize?: Vec3;
  gravity?: Vec3; wind?: number; drag?: number; turb?: [number, number]; swirl?: number;
  bounce?: number; stretch?: number; rot?: number; floorFade?: number; lit?: number;
  pos?: Vec3; rot3?: Vec3; emit?: number; delay?: number; t0?: number; t1?: number; order?: number;
  /** baked flipbook preset (assets/fx); false = procedural sprite; undefined = auto-map by kind/blend */
  tex?: string | false; texLoop?: boolean;
  follow?: (obj: THREE.Object3D, tAbs: number, t: number) => void;
}

export interface ErodeParams extends Timed {
  geo: THREE.BufferGeometry; ramp?: Ramp; tile?: [number, number]; scroll?: [number, number];
  erode?: [number, number]; head?: [number, number]; channel?: 'r' | 'a'; blend?: 'add' | 'normal';
  intensity?: number; soft?: number; pos?: Vec3; rot3?: Vec3; scale?: number; alpha?: number;
}

export interface DebrisParams extends Timed {
  count?: number; pos?: Vec3; speed?: Range; spread?: number; size?: Range; life?: number; bounce?: number; color?: string;
}

export interface ImpactParams { t?: number; strength?: number; dir?: Vec3; pos?: Vec3 | null; }
export interface ImpactEvent { t: number; strength: number; dir: Vec3 | number[]; pos: Vec3 | null; fromAct?: boolean; }

/** stage.attach() input: a host three.js scene rendered through the stage's bloom + final passes */
export interface HostParams {
  scene: THREE.Scene; camera: THREE.Camera; ground?: THREE.Object3D | null;
  lights?: { sun?: THREE.DirectionalLight; hemi?: THREE.HemisphereLight };
  depthTexture?: THREE.Texture | null;
}

/** baked texture entry from getTex(name) */
export interface TexEntry {
  a: THREE.Texture; b: THREE.Texture; frames: number; framePow: number; emissive: boolean; emax: number; size: number; tile: number; ready: boolean;
}

export interface OrbParams extends Timed {
  soft?: number;
  kind?: 'fire' | 'plasma' | 'void' | 'glass' | 'water' | 'ice' | 'energy';
  r?: Range; ease?: string; pos?: Vec3; noise?: number; scroll?: number; disp?: number;
  intensity?: number; power?: number; alpha?: number; pulse?: [number, number]; ramp?: Ramp;
  follow?: (obj: THREE.Object3D, tAbs: number, t: number) => void;
}

export interface RingParams extends Timed {
  refract?: number; dark?: number; soft?: number;
  r?: Range; width?: Range; normal?: 'up' | 'cam' | Vec3; pos?: Vec3; y?: number; fill?: number;
  breakup?: number; intensity?: number; ramp?: Ramp; decay?: number;
}

export interface ShellParams extends Timed {
  refract?: number; soft?: number;
  r?: Range; hemi?: boolean; cells?: number; power?: number; noise?: number; intensity?: number;
  ramp?: Ramp; pulse?: number; impacts?: Array<{ t: number; dir: Vec3 }>;
}

export interface BeamParams extends Timed {
  soft?: number;
  from?: Vec3; to?: Vec3; pos?: Vec3; height?: number;
  path?: (t: number, pr: number) => [Vec3, Vec3];
  r?: Range; noise?: number; freq?: number; speed?: number; pulse?: number; edge?: number;
  grow?: Range; intensity?: number; ramp?: Ramp;
}

export interface RibbonParams extends Timed {
  points?: Vec3[] | ((t: number, pr: number) => Vec3[]);
  n?: number; width?: number | ((u: number) => number);
  sweep?: Range; head?: (t: number, pr: number) => number; tail?: number;
  ramp?: Ramp; intensity?: number; core?: number;
}

export interface SlashParams extends Timed {
  center?: Vec3; radius?: number; a0?: number; a1?: number; tilt?: number; depth?: number; width?: number;
}

export interface TrailParams extends Timed {
  path: (t: number) => Vec3; len?: number; width?: number; n?: number;
}

export interface BoltParams extends Timed {
  from?: Vec3 | ((slot: number) => Vec3); to?: Vec3 | ((slot: number) => Vec3);
  jag?: number; branches?: number; branchLen?: number; width?: number; rate?: number;
  flicker?: number; ramp?: Ramp;
}

export interface DecalParams extends Timed {
  kind?: 'scorch' | 'cracks' | 'glow' | 'rune' | 'frost' | 'rings';
  r?: Range; cells?: number; glyphs?: string; poly?: number; spin?: number; reveal?: number;
  heat?: Range; ramp?: Ramp; intensity?: number; y?: number; alpha?: number; growSpeed?: number;
}

export interface WaterParams extends Timed {
  r?: number; deep?: string; shallow?: string; ripples?: Array<{ t: number; x?: number; z?: number; amp: number }>;
  vortex?: number; waves?: number; y?: number;
}

export interface LightParams extends Timed {
  glow?: number; glowSize?: number;
  color?: string; intensity?: number; pos?: Vec3; range?: number; flicker?: number; rate?: number;
  env?: (t: number, pr: number) => number; colorFn?: (t: number, pr: number) => string;
}

export interface HeatParams extends Timed { pos?: Vec3; size?: Range; strength?: number; rise?: number; alpha?: number; }

export interface TextParams extends Timed {
  text: string; size?: number; motion?: (pr: number, t?: number) => { pos?: Vec3; scale?: number; alpha?: number; rot?: number };
  grad?: string[]; outline?: string; font?: number;
}

/* ---------- options and definitions ---------- */
export interface FxOptions {
  seed?: number; position?: Vec3; scale?: number; flip?: boolean; angle?: number;
  palette?: unknown; speed?: number; countScale?: number; grade?: 1 | 2 | 3;
}

export interface Part { obj?: THREE.Object3D; update?: (t: number, tAbs: number, fx: Fx) => void; [k: string]: unknown; }

export interface StageDef {
  sky?: 'night' | 'dusk' | 'day' | 'dark' | 'void' | 'storm';
  view?: { pos: Vec3; target: Vec3; fov: number };
  bloom?: number; ground?: boolean; exposure?: number;
}

/** rig anchors for Fx.anchor(): actor body, or the target (tgt = tgtChest) */
export type AnchorName = 'handR' | 'handL' | 'tip' | 'chest' | 'head' | 'hips' | 'feet' | 'tgt' | 'tgtChest' | 'tgtHead' | 'tgtFeet';
/** a frame of a shared KayKit clip, or a crossfade of two */
export type Pose = { clip: string; time: number } | { a: { clip: string; time: number }; b: { clip: string; time: number }; f: number };
export interface ActDef {
  kind: string; weapon?: string; target?: Vec3 | false; windup?: number;
  /** actor model; default: mage for staff / weaponless casts, else knight */
  char?: 'knight' | 'mage';
  /** act time where the kind's contact frame lands (blade crosses the front / full reach / chop lands); default 0. Set it to the blade hit t. */
  contact?: number;
  /** pose keys [t, POSES name | {clip,time}, 'snap'?] (default: from kind) */
  keys?: Array<[number, string | { clip: string; time: number }, 'snap'?]>;
  hits?: Array<{ t: number; stop?: number; shake?: number; amp?: number; push?: number }>;
}

export interface EffectDef {
  id: string; name: string; category: string; loop: boolean; duration: number;
  meta?: { class: string; tier: 'class' | 'base' | 'derived' | 'tech' | 'quantum'; elements: string[]; archetype: string; castTime: number; cooldown: number; range: number; shape: string };
  stage?: StageDef; act?: ActDef; body?: boolean; screen?: { glsl: string };
  build(fx: Fx, o: FxOptions & Record<string, unknown>): void;
}

/* ---------- Fx: one effect instance ---------- */
export class Fx extends THREE.Group {
  constructor(def?: EffectDef, opts?: FxOptions);
  parts: Part[];
  body: THREE.Group & {
    set(params: Record<string, unknown>): void;
    tip(len?: number, out?: THREE.Vector3): THREE.Vector3;
    /** world position of a body anchor */
    point(name: Exclude<AnchorName, `tgt${string}`>, out?: THREE.Vector3): THREE.Vector3;
    setPose(p: Pose): void;
    armR: { hand: THREE.Object3D }; armL: { hand: THREE.Object3D };
    /** offset holders (Dummy frame) applied to spine / head / hips each frame */
    torso: THREE.Object3D; neck: THREE.Object3D; pelvis: THREE.Object3D;
    headMesh: THREE.Object3D; headR: number; weaponLen: number;
  };
  /** Skeleton_Warrior target (act.target), same overlay API as body */
  target?: THREE.Group & { set(params: Record<string, unknown>): void; point(name: 'chest' | 'head' | 'feet', out?: THREE.Vector3): THREE.Vector3; mat: THREE.MeshStandardMaterial; kick(s?: number): void };
  /** fx-local [x,y,z] of a rig anchor at act time t (poses the body at t, then restores); off adds [dx,dy,dz] */
  anchor(name: AnchorName, t?: number, off?: Vec3): Vec3;
  /** fx.slash() params {center, radius, a0, a1, tilt, depth} fitted to the real blade (handR pivot, tip path) over act time [t0, t1] */
  bladeArc(t0: number, t1: number, n?: number): { center: Vec3; radius: number; a0: number; a1: number; tilt: number; depth: number };
  emitter(p: EmitterParams): Part;
  orb(p: OrbParams): Part;
  ring(p: RingParams): Part;
  shell(p: ShellParams): Part;
  beam(p: BeamParams): Part;
  ribbon(p: RibbonParams): Part;
  slash(p: SlashParams): Part;
  trail(p: TrailParams): Part;
  bolt(p: BoltParams): Part;
  decal(p: DecalParams): Part;
  water(p: WaterParams): Part;
  light(p: LightParams): Part & { l: THREE.PointLight };
  heat(p: HeatParams): Part;
  erode(p: ErodeParams): Part;
  debris(p: DebrisParams): Part;
  /** impact event at fx-local time t (default now): fires 'impact' listeners once per period */
  impact(p?: ImpactParams): Fx;
  text(p: TextParams): Part;
  mesh(obj: THREE.Object3D, fn: ((t: number, pr: number, fx: Fx, w: number, obj: THREE.Object3D, tAbs: number) => void) | null, opts?: Timed): Part;
  on(fn: (t: number, tAbs: number, fx: Fx) => void): void;
  on(event: 'impact', fn: (e: ImpactEvent, fx: Fx) => void): void;
  shake(t0: number, dur: number, amp: number): void;
  flash(t0: number, dur: number, color: string, amt: number): void;
  hit(t: number, opts: { stop?: number; shake?: number; amp?: number; push?: number }): void;
  pal(stops: Ramp): Ramp;
  update(tAbs: number): void;
  reset(): void;
  dispose(): void;
  t: number;
  done: boolean;
  rng: Rng;
  duration: number;
}

/* ---------- Stage: renderer, camera, playback ---------- */
export interface StageOptions {
  transparent?: boolean; quality?: 'low' | 'medium' | 'high'; preserve?: boolean; maxPixelRatio?: number;
  bloom?: number; bloomScale?: number; threshold?: number; radius?: number; exposure?: number;
  flashMax?: number; toneMapping?: 'aces' | 'agx' | 'neutral' | 'none'; sky?: StageDef['sky'];
  /** game-feel layer: false = all off; per-part flags default to true */
  feel?: false | { hitStop?: boolean; push?: boolean; blur?: boolean; aberration?: boolean; desat?: boolean };
  /** host-owned renderer: the stage does not create, size or append a canvas */
  renderer?: THREE.WebGLRenderer;
}

export class Stage {
  constructor(el: HTMLElement, opts?: StageOptions);
  play(id: string | EffectDef, opts?: FxOptions): void;
  /** host mode: render a host scene/camera through this stage's bloom + final passes */
  attach(h: HostParams): void;
  detach(): void;
  frame(t: number): void;
  seek(t: number): void;
  start(): void;
  stop(): void;
  setSky(sky: StageDef['sky']): void;
  resize(): void;
  dispose(): void;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  canvas: HTMLCanvasElement;
  fx: Fx;
  transparent: boolean;
  quality: 'low' | 'medium' | 'high';
  bloomScale: number;
  flashMax: number;
  autoReplay: boolean;
}

/* ---------- registry and helpers ---------- */
export function createFx(id: string, opts?: FxOptions & { countScale?: number }): Fx;
export function register(def: EffectDef): void;
export function list(): EffectDef[];
export const registry: Map<string, EffectDef>;
export const CATEGORIES: Record<string, EffectDef[]>;
export function registerAll(): void;
export function makeRng(seed?: number): Rng;
export function clamp(x: number, a: number, b: number): number;
export function lerp(a: number, b: number, t: number): number;
export function smooth(a: number, b: number, x: number): number;
export function easeOut(x: number): number;
export function easeIn(x: number): number;
export function easeInOut(x: number): number;
export function win(x: number, a: number, b: number): number;
export const NOISE: string;
export function makeRamp(stops: Ramp): Ramp;
export const KINDS: string[];
export class Emitter {}
export const prims: Record<string, (...args: unknown[]) => unknown>;
export const Dummy: unknown;
export const Target: unknown;
export const POSES: Record<string, unknown>;

/* ---------- textures (assets/fx, see docs/AUTHORING.md) ---------- */
export function loadTextures(base?: string | URL): Promise<void>;
export function getTex(name: string): TexEntry;
export const TEX: Record<string, TexEntry>;

/* ---------- character models (assets/models, KayKit CC0) ---------- */
/** Load Knight / Mage / Skeleton_Warrior. Await before creating effects with an actor (act/body). Idempotent. */
export function loadModels(base?: string | URL): Promise<void>;
export const MODELS: Record<'knight' | 'mage' | 'skeleton', { scene: THREE.Object3D; props: string[]; clips: Map<string, THREE.AnimationClip> }>;

/* ---------- parametric mesh builders (src/core/meshes.js) ---------- */
export function surface(nu: number, nv: number, f: (u: number, v: number) => Vec3): THREE.BufferGeometry;
export interface SpiralParams { turns?: number; r0?: number; r1?: number; h?: number; w?: number; }
export function spiral(p?: SpiralParams): THREE.BufferGeometry;
export interface ConeParams { r0?: number; r1?: number; h?: number; }
export function cone(p?: ConeParams): THREE.BufferGeometry;
export interface ArcParams { R?: number; a0?: number; a1?: number; w?: number; tilt?: number; thick?: number; }
export function arc(p?: ArcParams): THREE.BufferGeometry;
export interface SlashMeshParams { R?: number; a0?: number; a1?: number; w?: number; curl?: number; }
export function slash(p?: SlashMeshParams): THREE.BufferGeometry;
export interface RingSheetParams { r0?: number; r1?: number; }
export function ringSheet(p?: RingSheetParams): THREE.BufferGeometry;
export interface BandParams { r?: number; h?: number; }
export function band(p?: BandParams): THREE.BufferGeometry;
