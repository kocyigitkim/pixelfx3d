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
  count?: number; kind?: string; blend?: 'add' | 'normal'; ramp?: Ramp; intensity?: number;
  size?: Range; sizeVar?: number; sizePow?: number; aspect?: number; life?: Range; speed?: Range;
  dir?: Vec3; spread?: number; radial?: number;
  shape?: 'point' | 'sphere' | 'disc' | 'ring' | 'box' | 'line';
  radius?: number; radiusIn?: number; shapeSize?: Vec3;
  gravity?: Vec3; wind?: number; drag?: number; turb?: [number, number]; swirl?: number;
  bounce?: number; stretch?: number; rot?: number; floorFade?: number; lit?: number;
  pos?: Vec3; rot3?: Vec3; emit?: number; delay?: number; t0?: number; t1?: number; order?: number;
  follow?: (obj: THREE.Object3D, tAbs: number, t: number) => void;
}

export interface OrbParams extends Timed {
  kind?: 'fire' | 'plasma' | 'void' | 'glass' | 'water' | 'ice' | 'energy';
  r?: Range; ease?: string; pos?: Vec3; noise?: number; scroll?: number; disp?: number;
  intensity?: number; power?: number; alpha?: number; pulse?: [number, number]; ramp?: Ramp;
  follow?: (obj: THREE.Object3D, tAbs: number, t: number) => void;
}

export interface RingParams extends Timed {
  r?: Range; width?: Range; normal?: 'up' | 'cam' | Vec3; pos?: Vec3; y?: number; fill?: number;
  breakup?: number; intensity?: number; ramp?: Ramp; decay?: number;
}

export interface ShellParams extends Timed {
  r?: Range; hemi?: boolean; cells?: number; power?: number; noise?: number; intensity?: number;
  ramp?: Ramp; pulse?: number; impacts?: Array<{ t: number; dir: Vec3 }>;
}

export interface BeamParams extends Timed {
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
  color?: string; intensity?: number; pos?: Vec3; range?: number; flicker?: number; rate?: number;
  env?: (t: number, pr: number) => number; colorFn?: (t: number, pr: number) => string;
}

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

export interface ActDef {
  kind: string; weapon?: string; target?: Vec3; windup?: number;
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
  body: {
    set(params: Record<string, unknown>): void;
    tip(len: number): Vec3;
    position: THREE.Vector3;
    armR: { hand: THREE.Object3D };
    torso: THREE.Object3D;
    headMesh: THREE.Object3D;
  };
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
  text(p: TextParams): Part;
  mesh(obj: THREE.Object3D, fn: ((t: number, pr: number, fx: Fx, w: number, obj: THREE.Object3D, tAbs: number) => void) | null, opts?: Timed): Part;
  on(fn: (t: number, tAbs: number, fx: Fx) => void): void;
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
}

export class Stage {
  constructor(el: HTMLElement, opts?: StageOptions);
  play(id: string | EffectDef, opts?: FxOptions): void;
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
