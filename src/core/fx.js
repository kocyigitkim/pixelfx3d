// Fx: one playable effect = a THREE.Group + a set of time-driven parts built by an effect definition.
import * as THREE from 'three';
import { makeRng, clamp, lerp, easeOut } from './rng.js';
import { Emitter } from './emitter.js';
import * as P from './prims.js';
import { Dummy, Target, actKeys, evalKeys } from './dummy.js';

export const registry = new Map();
export function register(def) { registry.set(def.id, def); return def; }
export function list(category) { return [...registry.values()].filter((d) => !category || d.category === category); }

const _c = new THREE.Color(), _c2 = new THREE.Color();
export class Fx extends THREE.Group {
  /** def: effect definition {id, loop, duration, build(fx,o), act?, body?}; o: {seed, position, scale, flip, angle, palette, speed, ...} */
  constructor(def, o = {}) {
    super(); this.def = def; this.fxId = def.id; this.o = o; this.loop = !!def.loop; this.duration = def.duration ?? 2; this.rng = makeRng(o.seed ?? 1337);
    this.time = 0; this.parts = []; this.events = []; this.hold = 0; this.speed = o.speed ?? 1; this.camQuat = new THREE.Quaternion(); this.shakeV = new THREE.Vector3(); this.flashAmt = 0; this.flashColor = new THREE.Color(1, 1, 1);
    this.lu = { uAmbient: { value: new THREE.Color(0.1, 0.12, 0.18) }, uLightPos: { value: new THREE.Vector3(0, 3, 0) }, uLightCol: { value: new THREE.Color(0, 0, 0) }, uLightRange: { value: 4 } };
    this.onFrame = []; this.postState = null; this.timeScale = 1; this.lead = 0;
    if (o.position) this.position.set(...o.position); if (o.scale) this.scale.setScalar(o.scale); if (o.flip) this.scale.x *= -1; if (o.angle) this.rotation.y = o.angle;
    if (def.act || def.body) this.setupActor();
    def.build(this, o); this.reset();
  }
  /** palette-aware ramp stops. stops in life order (bright → dark). o.palette is dark → bright like pixelfx. */
  pal(stops) {
    const pal = this.o.palette; if (!pal || !pal.length) return stops; const n = pal.length;
    const at = (x) => { const f = clamp(x) * (n - 1), i = Math.min(n - 2, Math.floor(f)), k = f - i; return _c.set(pal[i]).lerp(_c2.set(pal[Math.min(n - 1, i + 1)]), k).clone(); };
    return stops.map((s, i) => { const a = Array.isArray(s) ? s : [i / Math.max(1, stops.length - 1), s, 1]; return [a[0], '#' + at(1 - a[0]).getHexString(), a[2] ?? 1]; });
  }
  setupActor() {
    const d = this.def, a = d.act; this.body = new Dummy({ weapon: a?.weapon }); this.add(this.body); this.actor = a || null;
    if (a) { this.lead = a.lead ?? a.windup ?? 0.45; this.keys = a.keys || actKeys(a.kind || 'slash', this.lead); if (a.target !== false) { this.target = new Target(); const t = a.target || [2.2, 0, 0]; this.target.position.set(t[0], t[1] || 0, t[2] || 0); this.add(this.target); } (a.hits || []).forEach((h) => this.hit(h.t, h)); }
  }
  /* ---------------------------------------------------------- builders */
  _add(p) { this.parts.push(p); return p; }
  emitter(p) { return this._add(new Emitter(this, p)); }
  orb(p) { return this._add(new P.Orb(this, p)); }
  ring(p) { return this._add(new P.Ring(this, p)); }
  shell(p) { return this._add(new P.Shell(this, p)); }
  beam(p) { return this._add(new P.Beam(this, p)); }
  ribbon(p) { return this._add(new P.Ribbon(this, p)); }
  bolt(p) { return this._add(new P.Bolt(this, p)); }
  decal(p) { return this._add(new P.Decal(this, p)); }
  water(p) { return this._add(new P.Water(this, p)); }
  light(p) { return this._add(new P.Light(this, p)); }
  heat(p) { return this._add(new P.Heat(this, p)); }
  text(p) { return this._add(new P.Text(this, p)); }
  /** custom three object. fn(t, pr, fx, w, obj, tAbs) runs every frame while in [t0, t0+dur]. */
  mesh(obj, fn, p = {}) { return this._add(new P.MeshPrim(this, obj, fn, p)); }
  /** per-frame callback (t = looped fx time, tAbs = absolute) */
  on(fn) { this.onFrame.push(fn); return this; }
  /** crescent slash: p {center, radius, a0, a1, tilt, depth, width, t0, dur, ramp, ...ribbon opts} */
  slash(p) {
    const c = p.center || [0, 1.1, 0], R = p.radius ?? 1.3, a0 = p.a0 ?? 2.0, a1 = p.a1 ?? -0.5, tilt = p.tilt ?? 0, depth = p.depth ?? 0.15, n = p.n ?? 40, cy = Math.cos(tilt), sy = Math.sin(tilt), pts = [];
    for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); const x = R * Math.cos(a), y = R * Math.sin(a), z = depth * R * Math.sin(a * 0.5); pts.push([c[0] + x, c[1] + y * cy - z * sy, c[2] + y * sy + z * cy]); }
    const wmax = p.width ?? 0.16; return this.ribbon({ n, tail: 0.7, sweep: [-0.1, 1.5], ease: 'out', ...p, points: pts, width: (u) => wmax * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.96 + 0.02)), 0.7) * (0.35 + 0.65 * u) });
  }
  /** moving trail behind an analytic path: path(t) → [x,y,z]; p {len (s), n, width, t0, dur, ...} */
  trail(p) {
    const n = p.n ?? 32, len = p.len ?? 0.5, w = p.width ?? 0.06; return this.ribbon({ n, tail: 1.0, head: () => 1.001, ...p, width: (u) => w * Math.pow(u, 0.8) * (p.taper === false ? 1 : 1), points: (t) => { const o = []; for (let i = 0; i <= n; i++) o.push(p.path(Math.max(this._t0(p), t - (1 - i / n) * len))); return o; } });
  }
  _t0(p) { return p.t0 ?? 0; }
  /** camera shake: amp (m), over [t0, t0+dur] */
  shake(t0, dur, amp) { this.events.push({ type: 'shake', t0, dur, amp }); return this; }
  flash(t0, dur, color = '#fff', amt = 1) { this.events.push({ type: 'flash', t0, dur, color: new THREE.Color(color), amt }); return this; }
  /** hit at time t: {stop (s of hit-stop), shake, amp, push (target kick), flash} */
  hit(t, o = {}) { this.events.push({ type: 'hit', t0: t, ...o }); if (o.shake) this.shake(t, o.shake, o.amp ?? 0.05); return this; }
  /* ---------------------------------------------------------- run */
  reset() { this.time = -(this.lead || 0); this.hold = 0; this.events.forEach((e) => (e.done = false)); this.target?.reset(); this.body?.reset(); this.update(0); }
  get t() { return this.loop ? ((this.time % this.duration) + this.duration) % this.duration : clamp(this.time, -1e3, this.duration); }
  get done() { return !this.loop && this.time > this.duration; }
  update(dt) {
    this.updateWorldMatrix(true, false); this.target?.update(dt);
    if (this.hold > 0) { this.hold -= dt; dt = 0; }
    const prev = this.time; this.time += dt * this.speed * this.timeScale; const tAbs = this.time, t = this.t;
    this.shakeV.set(0, 0, 0); this.flashAmt = 0;
    for (const e of this.events) {
      if (e.type === 'hit' && !e.done && prev < e.t0 && tAbs >= e.t0) { e.done = true; if (e.stop) this.hold = e.stop; if (e.push) this.target?.kick(e.push); if (e.flash) this.flash(tAbs, 0.12, '#fff', e.flash); }
      if (e.type === 'shake') { const u = (t - e.t0) / e.dur; if (u >= 0 && u <= 1) { const k = e.amp * (1 - u) * (1 - u); const s = Math.floor(t * 60); this.shakeV.add(_v(Math.sin(s * 12.9898) * k, Math.sin(s * 78.233) * k, 0)); } }
      if (e.type === 'flash') { const u = (t - e.t0) / e.dur; if (u >= 0 && u <= 1) { this.flashAmt = Math.max(this.flashAmt, e.amt * (1 - u) * (1 - u)); this.flashColor.copy(e.color); } }
    }
    const tp = this.loop ? t : tAbs; // loops: parts see wrapped time, so frame(t) == frame(t + duration); identical inside the first period
    for (const p of this.parts) p.update(tp, t); for (const f of this.onFrame) f(t, tAbs, this);
    if (this.body) { this.body.u.uTime.value = tp; if (this.keys) this.body.setPose(evalKeys(this.keys, tAbs)); }
  }
  dispose() { this.parts.forEach((p) => p.dispose?.()); this.removeFromParent(); }
}
const _vv = new THREE.Vector3(); const _v = (x, y, z) => _vv.set(x, y, z);

/** Create an effect from a registered id or a definition object. */
export function createFx(def, opts = {}) { if (typeof def === 'string') { const id = def; def = registry.get(id); if (!def) throw new Error('unknown effect ' + id); } return new Fx(def, opts); }
