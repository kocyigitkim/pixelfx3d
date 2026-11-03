// Stage: renderer + scene (sky, ground, lights) + HDR bloom + final screen pass (flash, vignette, screen-space transitions).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { NOISE } from './glsl.js';
import { createFx, Fx } from './fx.js';
import { makeRng } from './rng.js';

const SKY_V = `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_Position.z=gl_Position.w*.9999; }`;
const SKY_F = `${NOISE}
uniform vec3 uTop, uHor, uBot; uniform float uStars; varying vec3 vD;
void main(){ float y=vD.y; vec3 c=y>0.?mix(uHor,uTop,pow(clamp(y,0.,1.),.55)):mix(uHor,uBot,pow(clamp(-y,0.,1.),.5));
  if(uStars>0.&&y>.02){ vec3 q=vD*140.; vec3 i=floor(q); float h=hash13(i); vec3 fq=fract(q)-.5; float st=step(.9965,h)*smoothstep(.02,.3,y)*smoothstep(.12,.0,length(fq-(hash33(i)-.5)*.5)); float tw=.6+.4*sin(h*80.); c+=vec3(.8,.9,1.)*st*tw*uStars*(.4+h); c+=vec3(.05,.07,.12)*fbm3(vD*3.+vec3(4.))*uStars*smoothstep(0.,.5,y); }
  gl_FragColor=vec4(c,1.); }`;
const SKIES = {
  night: { top: '#050b1a', hor: '#1a2540', bot: '#06080f', stars: 1, fog: '#0b1220', fogD: 0.012, amb: 0.35, moon: 0.45 },
  dusk: { top: '#1b2a52', hor: '#a9644e', bot: '#14121a', stars: 0.4, fog: '#3a2c3c', fogD: 0.014, amb: 0.5, moon: 0.7 },
  day: { top: '#4f8fd6', hor: '#cfe3f1', bot: '#7a8591', stars: 0, fog: '#a9c3d6', fogD: 0.008, amb: 1.1, moon: 1.8 },
  dark: { top: '#020306', hor: '#07090f', bot: '#020204', stars: 0, fog: '#05070b', fogD: 0.02, amb: 0.18, moon: 0.2 },
  void: { top: '#000', hor: '#030308', bot: '#000', stars: 0, fog: '#000', fogD: 0.0, amb: 0.1, moon: 0.1 },
  storm: { top: '#0b1018', hor: '#2c3846', bot: '#0b0e13', stars: 0, fog: '#1b242e', fogD: 0.02, amb: 0.4, moon: 0.4 },
};
const QUALITY = { low: { pr: 0.75, count: 0.5, samples: 0 }, medium: { pr: 1, count: 0.75, samples: 2 }, high: { pr: 1.5, count: 1, samples: 4 } };
const TONE = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, neutral: THREE.NeutralToneMapping, none: THREE.NoToneMapping };

const MAIN_OPAQUE = 'vec3 c=texture2D(tDiffuse,vUv).rgb; if(uOn>.5) c=trans(vUv,c,uP,uTime,uAspect); c=mix(c,uFlashCol,clamp(uFlash,0.,1.)); vec2 q=vUv-.5; c*=1.-uVig*dot(q,q)*1.6; gl_FragColor=vec4(c,1.);';
// transparent: keep scene alpha; glow adds coverage = its brightness, so rgb <= a (valid premultiplied). No vignette (would darken edges).
const MAIN_ALPHA = 'vec4 s=texture2D(tDiffuse,vUv); vec3 c=s.rgb; if(uOn>.5) c=trans(vUv,c,uP,uTime,uAspect); c=clamp(c,0.,1.); float a=clamp(max(s.a,max(c.r,max(c.g,c.b))),0.,1.); c=mix(c,uFlashCol*a,clamp(uFlash,0.,1.)); gl_FragColor=vec4(c,a);';
function finalShader(fn, tr) {
  return { uniforms: { tDiffuse: { value: null }, uFlash: { value: 0 }, uFlashCol: { value: new THREE.Color(1, 1, 1) }, uP: { value: 0 }, uTime: { value: 0 }, uAspect: { value: 1 }, uVig: { value: 0.35 }, uOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `${NOISE}
uniform sampler2D tDiffuse; uniform float uFlash,uP,uTime,uAspect,uVig,uOn; uniform vec3 uFlashCol; varying vec2 vUv;
${fn || 'vec3 trans(vec2 uv, vec3 c, float p, float t, float a){ return c; }'}
void main(){ ${tr ? MAIN_ALPHA : MAIN_OPAQUE} }` };
}

// transparent mode: additive materials must add light, not coverage (dark fringes / opaque quads otherwise). RGB unchanged.
function fixAlpha(root) {
  root.traverse((o) => { for (const m of [].concat(o.material || [])) {
    if (m.blending === THREE.AdditiveBlending) Object.assign(m, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
    else if (m.blending === THREE.CustomBlending && m.blendDst === THREE.OneFactor) Object.assign(m, { blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor });
  } });
}

export class Stage {
  constructor(container, o = {}) {
    this.container = container; this.opts = o; this.transparent = !!o.transparent; const q = QUALITY[o.quality]; this.quality = q ? o.quality : 'high';
    this.bloomScale = o.bloomScale ?? 0.8; this.flashMax = o.flashMax ?? 0.6; // global anti-overbright (bloom is ~strength^2, so 0.8 -> 0.64x energy)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!o.preserve, alpha: this.transparent, premultipliedAlpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, o.maxPixelRatio ?? 1.5, q ? q.pr : Infinity)); this.renderer.toneMapping = TONE[o.toneMapping] ?? THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = o.exposure ?? 1.0;
    container.appendChild(this.renderer.domElement); this.canvas = this.renderer.domElement;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400); this.camera.position.set(4.6, 2.3, 5.4);
    this.controls = new OrbitControls(this.camera, this.canvas); this.controls.target.set(0, 1.0, 0); this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI * 0.52; this.controls.minDistance = 1.2; this.controls.maxDistance = 40;
    const pm = new THREE.PMREMGenerator(this.renderer); this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; this.scene.environmentIntensity = 0.35;
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(200, 32, 16), new THREE.ShaderMaterial({ vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, uniforms: { uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uBot: { value: new THREE.Color() }, uStars: { value: 1 } } }));
    this.sky.renderOrder = -10; this.scene.add(this.sky);
    if (this.transparent) { this.sky.visible = false; this.renderer.setClearColor(0x000000, 0); this.renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)]; } // after PMREM on purpose; y<0 hidden like the ground would
    this.hemi = new THREE.HemisphereLight('#6f8fd0', '#1b1a22', 0.5); this.scene.add(this.hemi); this.moon = new THREE.DirectionalLight('#9db8ff', 0.5); this.moon.position.set(-4, 8, 3); this.scene.add(this.moon);
    this.makeGround(); this.setSky(o.sky || 'night');
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: q ? q.samples : 4 }); this.composer = new EffectComposer(this.renderer, rt); this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), o.bloom ?? 0.45, 0.5, 1.0); this.composer.addPass(this.bloom); this.composer.addPass(new OutputPass());
    if (this.transparent) Object.assign(this.bloom.blendMaterial, { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.SrcAlphaFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }); // same RGB as AdditiveBlending, keeps scene alpha
    this.finalPass = new ShaderPass(finalShader(null, this.transparent)); this.composer.addPass(this.finalPass); this.fx = null; this.clock = new THREE.Clock(); this.running = false; this.replayDelay = 1.2; this._rest = 0;
    this.resize(); this._ro = new ResizeObserver(() => this.resize()); this._ro.observe(container);
  }
  makeGround() { const rnd = makeRng(7);
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'); x.fillStyle = '#34363c'; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 9000; i++) { const v = 40 + rnd() * 40; x.fillStyle = `rgba(${v},${v},${v + 6},${rnd() * 0.25})`; x.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3); }
    x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; for (let i = 0; i <= 512; i += 128) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 512); x.moveTo(0, i); x.lineTo(512, i); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 16); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, metalness: 0.05, color: '#aab' })); this.ground.rotation.x = -Math.PI / 2; this.scene.add(this.ground);
  }
  setSky(name = 'night') {
    const s = SKIES[name] || SKIES.night; const u = this.sky.material.uniforms; u.uTop.value.set(s.top); u.uHor.value.set(s.hor); u.uBot.value.set(s.bot); u.uStars.value = s.stars;
    this.scene.fog = s.fogD && !this.transparent ? new THREE.FogExp2(s.fog, s.fogD) : null; this.hemi.intensity = s.amb; this.moon.intensity = s.moon; this.skyName = name;
  }
  resize() { const w = this.container.clientWidth || 800, h = this.container.clientHeight || 450; this.renderer.setSize(w, h, false); this.composer.setSize(w, h); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.bloom.resolution.set(w, h); this.finalPass.uniforms.uAspect.value = w / h; }
  /** Play an effect (id | definition | Fx). Replaces the current one. */
  play(def, opts = {}) {
    if (this.fx) { this.fx.dispose(); this.fx = null; }
    const q = QUALITY[this.opts.quality]; const fx = def instanceof Fx ? def : createFx(def, q ? { countScale: q.count, ...opts } : opts); this.fx = fx; this.scene.add(fx); const st = fx.def.stage || {};
    this.setSky(st.sky || 'night'); this.ground.visible = !this.transparent && st.ground !== false; this.bloom.strength = (st.bloom ?? this.opts.bloom ?? 0.45) * this.bloomScale; this.bloom.threshold = st.threshold ?? this.opts.threshold ?? 1.0; this.bloom.radius = st.radius ?? this.opts.radius ?? 0.5; this.renderer.toneMappingExposure = st.exposure ?? this.opts.exposure ?? 1;
    const v = st.view || {}; this.camera.fov = v.fov ?? 40; this.camera.updateProjectionMatrix(); this.camera.position.set(...(v.pos || [4.6, 2.3, 5.4])); this.controls.target.set(...(v.target || [0, 1.0, 0])); this.controls.update();
    this.hemi.intensity *= st.ambient ?? 1; if (this.transparent) fixAlpha(fx); this.setupScreen(fx); this._rest = 0; return fx;
  }
  setupScreen(fx) {
    const sc = fx.def.screen; const idx = this.composer.passes.indexOf(this.finalPass); this.finalPass = new ShaderPass(finalShader(sc ? sc.glsl : null, this.transparent)); this.composer.passes[idx] = this.finalPass; this.finalPass.uniforms.uAspect.value = this.camera.aspect; this.finalPass.uniforms.uOn.value = sc ? 1 : 0; this.finalPass.renderToScreen = true;
  }
  /** advance and render one frame */
  frame(dt) {
    const fx = this.fx; const fp = this.finalPass.uniforms;
    if (fx) {
      fx.camQuat.copy(this.camera.quaternion); fx.update(dt);
      if (fx.done) { this._rest += dt; if (this._rest > this.replayDelay && this.autoReplay !== false) { fx.reset(); this._rest = 0; } }
      fp.uFlash.value = Math.min(this.flashMax, fx.flashAmt); fp.uFlashCol.value.copy(fx.flashColor); fp.uTime.value = fx.time;
      if (fx.def.screen) fp.uP.value = Math.min(1, Math.max(0, fx.time / fx.duration));
    }
    this.controls.update(); const base = this.camera.position.clone(); if (fx) this.camera.position.add(fx.shakeV); this.composer.render(dt); this.camera.position.copy(base);
  }
  start() { if (this.running) return; this.running = true; this.clock.start(); const loop = () => { if (!this.running) return; requestAnimationFrame(loop); this.frame(Math.min(0.05, this.clock.getDelta())); }; loop(); }
  stop() { this.running = false; }
  /** deterministic seek (for tests / screenshots) */
  seek(t, step = 1 / 30) { const fx = this.fx; fx.reset(); const start = -(fx.lead || 0); let n = Math.max(0, Math.round((t - start) / step)); for (let i = 0; i < n; i++) { fx.camQuat.copy(this.camera.quaternion); fx.update(step); } this.frame(0); }
  dispose() { this.stop(); this._ro.disconnect(); this.renderer.dispose(); this.canvas.remove(); }
}
