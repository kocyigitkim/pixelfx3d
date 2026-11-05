import * as THREE from 'three';
const mat = (c, r = 0.8, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
const rocks = (g, n, R, seed, h = 0.3, col = '#5a5850') => { let s = seed; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.3, k = h * (0.6 + r() * 0.8); const m = new THREE.Mesh(new THREE.DodecahedronGeometry(k, 0), mat(new THREE.Color(col).offsetHSL(0, 0, (r() - 0.5) * 0.08), 0.95)); m.position.set(Math.cos(a) * R, k * 0.45, Math.sin(a) * R); m.rotation.set(r() * 3, r() * 3, r() * 3); m.scale.set(1.2, 0.8, 1); g.add(m); } };
const WATERC = [[0, '#e8f6ff', 0.0], [0.12, '#dff0fa', 0.75], [0.6, '#a9d2ea', 0.5], [1, '#7ab4d8', 0]];
const DROP = [[0, '#f4fbff', 0.9], [0.5, '#cfe8f6', 0.8], [1, '#a8d0ea', 0]];
const MIST = [[0, '#ffffff', 0], [0.2, '#eef8ff', 0.28], [1, '#cfe6f2', 0]];
const mist = (fx, o) => fx.emitter({ kind: 'smoke', blend: 'normal', lit: 1, ramp: MIST, ...o });
const rip = (n, per, x0 = 0, z0 = 0, R = 1, amp = 0.05, seed = 1) => { let s = seed; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); return Array.from({ length: n }, (_, i) => { const a = r() * 6.283, d = Math.sqrt(r()) * R; return { t: (i / n) * per, x: x0 + Math.cos(a) * d, z: z0 + Math.sin(a) * d, amp }; }); };

/* foam spiral used by the whirlpool */
const SPIRAL_F = `uniform float uP; varying vec2 vP;
float h3(vec3 p){ return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453); }
float n3(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
void main(){ float r=length(vP); float a=atan(vP.y,vP.x); float rn=r/3.; if(rn>1.) discard;
  float arms=5.; float s=fract(arms*a/6.2831853+log(r+0.15)*2.2+uP*1.0);
  float arm=smoothstep(0.0,0.25,s)*smoothstep(0.75,0.35,s);
  float nz=n3(vec3(cos(a)*3.+r*1.3,sin(a)*3.,r*5.))*0.6+n3(vec3(cos(a)*9.,sin(a)*9.,r*14.))*0.4;
  float f=arm*smoothstep(0.35,0.75,nz+0.25*arm)*smoothstep(0.35,0.7,rn+0.05)*(1.-smoothstep(0.85,1.,rn));
  f+=smoothstep(0.6,0.2,rn)*smoothstep(0.1,0.3,rn)*0.35*nz;
  gl_FragColor=vec4(vec3(0.9,0.96,1.0)*(0.7+0.5*nz),f*0.85); }`;
const spiral = () => { const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uP: { value: 0 } }, vertexShader: 'varying vec2 vP; void main(){ vP=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: SPIRAL_F }); const o = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), m); o.rotation.x = -Math.PI / 2; o.position.y = 0.05; o.renderOrder = 9; return o; };

/* waterfall sheet */
const SHEET_F = `uniform float uP; varying vec2 vUv;
float h1(float x){ return fract(sin(x*127.1)*43758.5453); }
void main(){ float cx=floor(vUv.x*26.); float ph=h1(cx); float cx2=floor(vUv.x*9.); float ph2=h1(cx2+7.);
  float y=vUv.y; float s1=fract(y*3.+uP*3.+ph); float s2=fract(y*2.+uP*2.+ph2*3.);
  float st=smoothstep(0.,.5,s1)*smoothstep(1.,.5,s1); float st2=smoothstep(0.,.4,s2)*smoothstep(1.,.6,s2);
  float edge=smoothstep(0.,.12,vUv.x)*smoothstep(1.,.88,vUv.x); float top=smoothstep(1.,.93,vUv.y);
  float foamB=smoothstep(0.18,0.0,vUv.y);
  vec3 c=mix(vec3(.45,.72,.85),vec3(.95,.98,1.),st*.7+st2*.5); c=mix(c,vec3(1.),foamB);
  float a=(.55+.3*st+.25*st2)*edge*top; gl_FragColor=vec4(c,clamp(a,0.,1.)*.9); }`;

export default [
  { id: 'water/bubbles', name: 'Bubbles', category: 'water', loop: true, duration: 4, stage: { sky: 'day', view: { pos: [1.6, 0.95, 2.0], target: [0, 0.5, 0], fov: 38 } },
    build(fx) {
      const g = new THREE.Group();
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.95, 40, 1, true), new THREE.MeshPhysicalMaterial({ color: '#5ab0d0', transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0, side: THREE.DoubleSide, depthWrite: false })); glass.position.y = 0.475; g.add(glass);
      const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.06, 40), mat('#b9a98a', 0.9)); floor.position.y = 0.03; g.add(floor);
      let s = 3; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
      for (let i = 0; i < 40; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * 0.75, k = 0.025 + r() * 0.045; const p = new THREE.Mesh(new THREE.SphereGeometry(k, 10, 8), mat(new THREE.Color().setHSL(0.08 + r() * 0.05, 0.12 + r() * 0.1, 0.35 + r() * 0.3), 0.7)); p.position.set(Math.cos(a) * d, 0.06 + k * 0.5, Math.sin(a) * d); p.scale.y = 0.7; g.add(p); }
      fx.mesh(g, null, { dur: 99 });
      fx.water({ r: 0.85, y: 0.92, deep: '#0a4a62', shallow: '#3fa6c0', waves: 0.3, ripples: rip(8, 4, 0, 0, 0.25, 0.03, 5), speed: 0.7, decay: 0.9, k: 22 });
      fx.emitter({ count: 22, kind: 'bubble', shape: 'disc', radius: 0.22, dir: [0, 1, 0], spread: 0.05, speed: [0.22, 0.34], life: [2.5, 3.3], size: [0.07, 0.08], sizeVar: 0.5, ramp: [[0, '#dff6ff', 0.0], [0.1, '#dff6ff', 0.85], [0.9, '#ffffff', 0.9], [1, '#ffffff', 0]], turb: [0.03, 1.2], pos: [0, 0.08, 0] });
      fx.emitter({ count: 26, kind: 'bubble', shape: 'disc', radius: 0.6, dir: [0, 1, 0], spread: 0.08, speed: [0.28, 0.4], life: [2.2, 3], size: [0.03, 0.04], sizeVar: 0.6, ramp: [[0, '#dff6ff', 0.0], [0.1, '#dff6ff', 0.75], [0.9, '#ffffff', 0.85], [1, '#ffffff', 0]], turb: [0.03, 1.5], pos: [0, 0.08, 0] });
      fx.emitter({ count: 10, kind: 'drop', shape: 'disc', radius: 0.25, dir: [0, 1, 0], spread: 0.4, speed: [0.4, 0.9], life: [0.4, 0.5], size: [0.015, 0.006], gravity: [0, -6, 0], ramp: DROP, pos: [0, 0.93, 0] });
    } },

  { id: 'water/drip', name: 'Drip', category: 'water', loop: true, duration: 1.6, stage: { sky: 'dusk', view: { pos: [2.4, 1.3, 3.6], target: [0, 1.0, 0], fov: 52 } },
    build(fx) {
      const g = new THREE.Group(); const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.12, 0.2, 14), mat('#4a4640', 0.95)); stone.position.y = 2.2; g.add(stone);
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.12, 10), mat('#5a4a30', 0.4, 0.8)); pipe.position.y = 2.06; g.add(pipe); rocks(g, 9, 1.0, 11, 0.16);
      fx.mesh(g, null, { dur: 99 });
      const dropM = new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), new THREE.MeshPhysicalMaterial({ color: '#cfe8f6', roughness: 0, transmission: 0.9, thickness: 0.05, ior: 1.33, transparent: true, opacity: 0.9 }));
      const TF = 0.55, TL = 1.12, Y0 = 2.0;
      fx.mesh(dropM, (t, pr, f, w, o) => { if (t < TF) { const u = t / TF; o.position.set(0, Y0 + 0.02 - 0.05 * u * u, 0); o.scale.set(0.25 + 0.75 * u, (0.25 + 0.75 * u) * (1 + 0.5 * u * u), 0.25 + 0.75 * u); o.visible = true; } else if (t < TL) { const u = (t - TF) / (TL - TF); o.position.set(0, Y0 - 0.05 - (Y0 - 0.08) * u * u, 0); o.scale.set(0.85, 1.4, 0.85); o.visible = true; } else o.visible = false; }, { dur: 99 });
      fx.water({ r: 0.9, y: 0.02, deep: '#0c2a38', shallow: '#2a6a80', waves: 0.1, ripples: [{ t: TL, x: 0, z: 0, amp: 0.06 }, { t: TL + 0.12, x: 0, z: 0, amp: 0.03 }], speed: 0.9, decay: 1.8, k: 24 });
      fx.emitter({ count: 14, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 0.8, speed: [0.7, 1.5], life: [0.25, 0.4], size: [0.014, 0.006], gravity: [0, -9, 0], delay: TL, emit: 0.001, ramp: DROP, pos: [0, 0.03, 0] });
      fx.emitter({ count: 1, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 0.05, speed: [1.8, 2.1], life: [0.45, 0.5], size: [0.03, 0.02], gravity: [0, -9, 0], delay: TL, emit: 0.001, ramp: DROP, pos: [0, 0.03, 0] });
      fx.ring({ t0: TL, dur: 0.5, r: [0.04, 0.3], width: [0.03, 0.01], normal: 'up', pos: [0, 0.03, 0], intensity: 0.8, ramp: [[0, '#fff'], [1, '#bde']], fade: [0, 0.3] });
      fx.light({ color: '#9ac8ff', intensity: 8, pos: [0.5, 1.2, 0.8], norm: 12 });
    } },

  { id: 'water/fountain', name: 'Fountain', category: 'water', loop: true, duration: 2, stage: { sky: 'day', view: { pos: [3.2, 1.7, 3.8], target: [0, 1.0, 0], fov: 40 } },
    build(fx) {
      const g = new THREE.Group(); const st = mat('#9a948a', 0.85);
      const bowl = new THREE.Mesh(new THREE.LatheGeometry([[0.0, 0.0], [1.3, 0.0], [1.35, 0.1], [1.35, 0.5], [1.22, 0.5], [1.22, 0.14], [0.0, 0.14]].map(([x, y]) => new THREE.Vector2(x, y)), 40), st); bowl.material.side = THREE.DoubleSide; g.add(bowl);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.29, 0.07, 8, 40), st); rim.rotation.x = Math.PI / 2; rim.position.y = 0.52; g.add(rim);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.5, 14), st); col.position.y = 0.4; g.add(col); const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.1, 14), mat('#7a6a40', 0.4, 0.8)); nz.position.y = 0.68; g.add(nz);
      fx.mesh(g, null, { dur: 99 });
      fx.water({ r: 1.22, y: 0.44, deep: '#14586e', shallow: '#4fb0c8', waves: 0.5, ripples: rip(8, 2, 0, 0, 0.9, 0.035, 9), speed: 1.1, decay: 1.6, k: 16 });
      fx.light({ color: '#cfe4ff', intensity: 10, pos: [1, 3, 2], norm: 14 });
      fx.emitter({ count: 120, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 0.05, speed: [6.0, 6.8], life: [1.35, 1.55], size: [0.05, 0.03], gravity: [0, -9.8, 0], ramp: DROP, pos: [0, 0.74, 0] });
      fx.emitter({ count: 110, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 0.28, speed: [4.2, 5.8], life: [1.0, 1.4], size: [0.04, 0.025], gravity: [0, -9.8, 0], ramp: DROP, pos: [0, 0.74, 0] });
      fx.emitter({ count: 30, kind: 'soft', shape: 'disc', radius: 0.35, dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1.5], life: [0.4, 0.7], size: [0.5, 0.2], ramp: [[0, '#fff', 0], [0.3, '#fff', 0.5], [1, '#ddeeff', 0]], intensity: 0.5, floorFade: 0, pos: [0, 0.46, 0] });
      mist(fx, { count: 28, shape: 'disc', radius: 0.7, dir: [0, 1, 0], spread: 0.3, speed: [0.3, 0.8], life: [1.0, 1.6], size: [0.4, 1.2], order: 0, pos: [0, 0.5, 0] });
      fx.emitter({ count: 50, kind: 'drop', shape: 'disc', radius: 0.5, dir: [0, 1, 0], spread: 0.5, speed: [0.8, 1.8], life: [0.25, 0.4], size: [0.02, 0.01], gravity: [0, -9, 0], ramp: DROP, pos: [0, 0.46, 0] });
    } },

  { id: 'water/geyser', name: 'Geyser', category: 'water', loop: false, duration: 5, stage: { sky: 'day', view: { pos: [4.6, 2.4, 6.4], target: [0, 2.3, 0], fov: 46 } },
    build(fx) {
      const g = new THREE.Group(); rocks(g, 12, 1.65, 21, 0.3, '#6a625a'); rocks(g, 8, 2.15, 5, 0.22, '#5a544c');
      fx.mesh(g, null, { dur: 99 });
      fx.water({ r: 1.6, y: 0.04, deep: '#0f4a58', shallow: '#4aa6b0', waves: 0.6, ripples: [...rip(8, 1.6, 0, 0, 0.9, 0.04, 2)], speed: 1.2, decay: 1.3 });
      fx.shake(1.5, 2.2, 0.04);
      fx.light({ color: '#cfe4ff', intensity: 10, pos: [1, 3, 2], norm: 14 });
      fx.emitter({ count: 30, kind: 'bubble', shape: 'disc', radius: 0.9, dir: [0, 1, 0], spread: 0.2, speed: [0.2, 0.5], life: [0.5, 1.0], size: [0.1, 0.12], emit: 1.6, ramp: [[0, '#dff6ff', 0.0], [0.1, '#eaffff', 0.8], [1, '#ffffff', 0]], pos: [0, 0.05, 0] });
      fx.emitter({ count: 20, kind: 'drop', shape: 'disc', radius: 0.5, dir: [0, 1, 0], spread: 0.4, speed: [1, 2.5], life: [0.4, 0.6], size: [0.03, 0.015], gravity: [0, -9, 0], emit: 1.5, delay: 0.5, ramp: DROP, pos: [0, 0.06, 0] });
      mist(fx, { count: 20, shape: 'disc', radius: 0.8, dir: [0, 1, 0], spread: 0.3, speed: [0.3, 0.8], life: [1.2, 2], size: [0.5, 1.4], emit: 1.4, delay: 0.4, pos: [0, 0.2, 0] });
      const T0 = 1.6, T1 = 3.6;
      fx.beam({ pos: [0, 0, 0], height: 5.2, r: [0.4, 0.5], t0: T0, dur: T1 - T0, fade: [0.2, 0.9], noise: 1.5, speed: 3, intensity: 0.5, edge: 1.5, ramp: [[0, '#ffffff'], [0.5, '#cfe8f6'], [1, '#8ab8d8']] });
      fx.emitter({ count: 200, kind: 'drop', shape: 'disc', radius: 0.3, dir: [0, 1, 0], spread: 0.1, speed: [8, 12], life: [1.3, 1.8], size: [0.07, 0.04], gravity: [0, -9.8, 0], delay: T0, emit: T1 - T0, ramp: DROP, drag: 0.1 });
      fx.emitter({ count: 120, kind: 'drop', shape: 'disc', radius: 0.3, dir: [0, 1, 0], spread: 0.35, speed: [5, 9], life: [1.1, 1.7], size: [0.05, 0.03], gravity: [0, -9.8, 0], delay: T0, emit: T1 - T0, ramp: DROP });
      mist(fx, { count: 70, shape: 'disc', radius: 0.5, dir: [0, 1, 0], spread: 0.15, speed: [4, 7], life: [1.0, 1.7], size: [0.7, 2.0], delay: T0, emit: T1 - T0 + 0.2, drag: 0.4, turb: [0.3, 1] });
      mist(fx, { count: 60, shape: 'disc', radius: 1.2, dir: [0, 1, 0], spread: 1.2, speed: [0.5, 2], life: [1.2, 2.2], size: [0.8, 2.2], delay: T0 + 0.1, emit: T1 - T0 + 0.8, pos: [0, 0.3, 0], radial: 0.5 });
      fx.emitter({ count: 60, kind: 'drop', shape: 'ring', radius: 1.4, radiusIn: 0.8, dir: [0, 1, 0], spread: 0.3, speed: [0.5, 1.8], life: [0.3, 0.5], size: [0.03, 0.015], gravity: [0, -9, 0], delay: T0 + 0.5, emit: 2.4, ramp: DROP, pos: [0, 0.05, 0] });
      fx.ring({ t0: T0, dur: 0.9, r: [0.2, 2.2], width: [0.3, 0.08], normal: 'up', pos: [0, 0.06, 0], intensity: 0.7, fill: 0.1, ramp: [[0, '#fff'], [1, '#bde']], fade: [0, 0.6] });
    } },

  { id: 'water/rain-splash', name: 'Rain splash', category: 'water', loop: true, duration: 2.4, stage: { sky: 'storm', view: { pos: [1.8, 1.2, 2.6], target: [0, 0.3, 0], fov: 40 } },
    build(fx) {
      const per = 2.4, rs = rip(8, per, 0, 0, 1.2, 0.05, 17);
      fx.water({ r: 2, y: 0.015, deep: '#1a2a34', shallow: '#3a5a68', waves: 0.2, ripples: rs, speed: 1.0, decay: 1.7, k: 20, sky: '#7a8a98', horizon: '#9aa8b4' });
      fx.light({ color: '#aab8d0', intensity: 10, pos: [1, 3, 1.5], norm: 14 });
      rs.forEach((q) => {
        const tl = (q.t + per - 0.2) % per;
        fx.emitter({ count: 1, kind: 'streak', shape: 'point', dir: [0, -1, 0], spread: 0, speed: [15, 15], life: [0.2, 0.2], size: [0.5, 0.012], stretch: 1, ramp: [[0, '#dbe8f4', 0.7], [1, '#dbe8f4', 0.7]], intensity: 1.1, delay: tl, pos: [q.x, 3, q.z] });
        fx.emitter({ count: 7, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 0.7, speed: [0.8, 1.7], life: [0.2, 0.35], size: [0.012, 0.006], gravity: [0, -9, 0], delay: q.t, ramp: DROP, pos: [q.x, 0.02, q.z] });
        fx.emitter({ count: 1, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 0.1, speed: [1.5, 1.9], life: [0.3, 0.38], size: [0.02, 0.012], gravity: [0, -9, 0], delay: q.t, ramp: DROP, pos: [q.x, 0.02, q.z] });
      });
      fx.emitter({ count: 90, kind: 'streak', shape: 'box', shapeSize: [2, 0, 2], dir: [0.05, -1, 0], spread: 0.03, speed: [12, 15], life: [0.25, 0.3], size: [0.5, 0.01], stretch: 1, ramp: [[0, '#c0d0e0', 0.35], [1, '#c0d0e0', 0.35]], intensity: 0.8, pos: [0, 2.8, 0] });
    } },

  { id: 'water/ripples', name: 'Ripples', category: 'water', loop: true, duration: 2, stage: { sky: 'night', view: { pos: [2.2, 1.4, 3.2], target: [0, 0, 0], fov: 38 } },
    build(fx) {
      fx.water({ r: 3, y: 0.01, deep: '#04121c', shallow: '#0f3a52', waves: 0.2, ripples: [{ t: 0, x: 0, z: 0, amp: 0.07 }, { t: 0.5, x: 0.2, z: 0.1, amp: 0.05 }, { t: 1.0, x: -0.1, z: -0.1, amp: 0.06 }, { t: 1.5, x: 0.1, z: -0.2, amp: 0.045 }, { t: 0.25, x: -0.9, z: 0.5, amp: 0.05 }, { t: 1.25, x: 0.9, z: -0.4, amp: 0.05 }], speed: 0.9, decay: 0.55, k: 18, width: 14 });
      fx.light({ color: '#cfe0ff', intensity: 22, pos: [-1.5, 3, 2.5], norm: 14, range: 12 });
      fx.emitter({ count: 8, kind: 'soft', shape: 'disc', radius: 2.2, dir: [0, 1, 0], speed: 0, life: [2, 2], size: [0.04, 0.04], ramp: [[0, '#cfe6ff', 0], [0.5, '#cfe6ff', 0.7], [1, '#cfe6ff', 0]], intensity: 1.2, pos: [0, 0.03, 0] });
    } },

  { id: 'water/splash', name: 'Splash', category: 'water', loop: false, duration: 2.5, stage: { sky: 'day', view: { pos: [2.6, 1.4, 3.6], target: [0, 0.7, 0], fov: 42 } },
    build(fx) {
      const TI = 0.7, g = new THREE.Group(); rocks(g, 12, 2.1, 7, 0.2);
      fx.mesh(g, null, { dur: 99 });
      fx.water({ r: 2, y: 0.02, deep: '#0f4a62', shallow: '#4aa6c0', waves: 0.3, ripples: [{ t: TI, x: 0, z: 0, amp: 0.1 }, { t: TI + 0.18, x: 0, z: 0, amp: 0.06 }, { t: TI + 0.4, x: 0, z: 0, amp: 0.035 }], speed: 1.5, decay: 1.0, k: 14 });
      const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07, 1), mat('#5a5a58', 0.8));
      fx.mesh(stone, (t, pr, f, w, o) => { const u = Math.min(1, t / TI); o.position.set(0, 2.0 - 1.98 * u * u, 0); o.rotation.set(t * 5, t * 3, 0); o.visible = t < TI + 0.03; }, { dur: 99 });
      fx.light({ color: '#cfe4ff', intensity: 10, pos: [1, 3, 2], norm: 14 });
      fx.ring({ t0: TI, dur: 0.7, r: [0.08, 1.3], width: [0.14, 0.03], normal: 'up', pos: [0, 0.03, 0], intensity: 0.9, ramp: [[0, '#fff'], [1, '#bde']], fade: [0, 0.5] });
      fx.emitter({ count: 90, kind: 'drop', shape: 'ring', radius: 0.14, radiusIn: 0.1, dir: [0, 1, 0], spread: 0.35, radial: 0.8, speed: [2.5, 4.2], life: [0.6, 0.95], size: [0.035, 0.02], gravity: [0, -9.8, 0], delay: TI, ramp: DROP, pos: [0, 0.03, 0] });
      fx.emitter({ count: 24, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 0.1, speed: [4.5, 6.2], life: [0.9, 1.2], size: [0.05, 0.03], gravity: [0, -9.8, 0], delay: TI + 0.04, ramp: DROP, pos: [0, 0.03, 0] });
      fx.emitter({ count: 20, kind: 'soft', shape: 'ring', radius: 0.18, dir: [0, 1, 0], spread: 0.5, radial: 0.8, speed: [0.5, 1.5], life: [0.4, 0.7], size: [0.4, 0.16], ramp: [[0, '#fff', 0], [0.3, '#fff', 0.5], [1, '#cfe6f2', 0]], intensity: 0.5, delay: TI, pos: [0, 0.05, 0] });
      mist(fx, { count: 14, shape: 'ring', radius: 0.2, dir: [0, 1, 0], spread: 0.6, speed: [0.5, 1.5], life: [0.8, 1.2], size: [0.3, 0.7], delay: TI, pos: [0, 0.1, 0] });
    } },

  { id: 'water/water-jet', name: 'Water jet', category: 'water', loop: true, duration: 1, stage: { sky: 'day', view: { pos: [1.6, 1.2, 5.2], target: [1.0, 0.7, 0], fov: 42 } },
    build(fx) {
      const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.35, 14), mat('#a8873a', 0.3, 0.9)); noz.rotation.z = Math.PI / 2 - 0.1; noz.position.set(-0.3, 1.0, 0); fx.mesh(noz, null, { dur: 99 });
      const o = [-0.1, 1.0, 0];
      fx.water({ r: 1.6, y: 0.012, deep: '#27403e', shallow: '#4a8a8c', waves: 0.2, pos: [3.0, 0.012, 0], ripples: rip(8, 1, 0, 0, 0.5, 0.04, 4), speed: 1.4, decay: 1.6 });
      fx.light({ color: '#cfe4ff', intensity: 10, pos: [1, 3, 2], norm: 14 });
      fx.emitter({ count: 220, kind: 'drop', shape: 'point', dir: [1, 0.1, 0], spread: 0.012, speed: [6, 6.2], life: [0.5, 0.52], size: [0.04, 0.03], gravity: [0, -9.8, 0], ramp: DROP, pos: o });
      fx.emitter({ count: 120, kind: 'drop', shape: 'point', dir: [1, 0.1, 0], spread: 0.09, speed: [5, 6.2], life: [0.5, 0.6], size: [0.03, 0.012], gravity: [0, -9.8, 0], ramp: DROP, pos: o });
      mist(fx, { count: 36, shape: 'point', dir: [1, 0.12, 0], spread: 0.18, speed: [4, 6], life: [0.4, 0.6], size: [0.1, 0.5], gravity: [0, -3, 0], pos: [0.6, 1.0, 0] });
      fx.emitter({ count: 50, kind: 'drop', shape: 'disc', radius: 0.15, dir: [0.3, 1, 0], spread: 0.7, speed: [1, 2.5], life: [0.3, 0.5], size: [0.025, 0.01], gravity: [0, -9.8, 0], ramp: DROP, pos: [3.0, 0.02, 0] });
      mist(fx, { count: 20, shape: 'disc', radius: 0.2, dir: [0.4, 1, 0], spread: 0.8, speed: [0.5, 1.5], life: [0.6, 0.9], size: [0.3, 0.9], pos: [3.0, 0.1, 0] });
    } },

  { id: 'water/water-orb', name: 'Water orb', category: 'water', loop: true, duration: 3, stage: { sky: 'day', view: { pos: [1.6, 1.3, 2.6], target: [0, 0.95, 0], fov: 38 } },
    build(fx) {
      fx.light({ color: '#e0eeff', intensity: 16, pos: [1.5, 3, 2], norm: 14 });
      fx.orb({ kind: 'water', r: [0.45, 0.45], intensity: 1.0, power: 2.2, ramp: [[0, '#7fc8ff'], [0.5, '#3a9ad8'], [1, '#eaffff']], pos: [0, 1.25, 0], noise: 1.4, scroll: 0.8, disp: 0.12, pulse: [0.05, 2.094] });
      fx.orb({ kind: 'glass', r: [0.3, 0.3], intensity: 0.5, power: 3, ramp: [[0, '#4aa8e8'], [0.5, '#2a7ac0'], [1, '#bfeaff']], pos: [0, 1.25, 0], noise: 2.4, scroll: 1.2, disp: 0.3, alpha: 0.5 });
      fx.emitter({ count: 14, kind: 'bubble', shape: 'sphere', radius: 0.25, dir: [0, 1, 0], spread: 1, speed: [0.03, 0.12], life: [1.5, 3], size: [0.04, 0.03], sizeVar: 0.7, ramp: [[0, '#fff', 0], [0.3, '#fff', 0.7], [1, '#fff', 0]], turb: [0.08, 1], pos: [0, 1.25, 0] });
      fx.emitter({ count: 4, kind: 'drop', shape: 'disc', radius: 0.03, dir: [0, -1, 0], spread: 0.05, speed: [0.1, 0.3], life: [0.62, 0.7], size: [0.04, 0.035], gravity: [0, -9.8, 0], ramp: DROP, pos: [0, 0.82, 0] });
      fx.emitter({ count: 4, kind: 'drop', shape: 'point', dir: [0, 1, 0], spread: 0.9, speed: [0.5, 1.0], life: [0.25, 0.35], size: [0.012, 0.006], gravity: [0, -9, 0], ramp: DROP, delay: 0.55, pos: [0, 0.02, 0] });
      fx.decal({ kind: 'glow', r: [0.7, 0.7], ramp: [[0, '#000'], [0.5, '#0a4a6a'], [1, '#6ad0ff']], intensity: 0.5, alpha: 0.5, y: 0.006 });
    } },

  { id: 'water/waterfall', name: 'Waterfall', category: 'water', loop: true, duration: 2, stage: { sky: 'day', view: { pos: [3.4, 1.9, 6.0], target: [0, 1.5, -0.4], fov: 44 } },
    build(fx) {
      const g = new THREE.Group(); const rm = mat('#4a4a44', 0.95); const mo = mat('#3a4a30', 1);
      const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 3.4, 0.6), rm); wall.position.set(0, 1.7, -0.95); g.add(wall);
      const lipL = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.2, 0.9), rm); lipL.position.set(-1.7, 1.6, -0.55); g.add(lipL); const lipR = lipL.clone(); lipR.position.x = 1.7; g.add(lipR);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.9), mat('#6a6e70', 0.5)); top.position.set(0, 3.05, -0.55); g.add(top); const moss = new THREE.Mesh(new THREE.BoxGeometry(5, 0.2, 1.0), mo); moss.position.set(0, 3.3, -0.8); g.add(moss);
      rocks(g, 7, 1.9, 13, 0.34, '#5a5850'); fx.mesh(g, null, { dur: 99 });
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.0), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uP: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: SHEET_F }));
      sheet.position.set(0, 1.55, -0.07); fx.mesh(sheet, (t, pr, f, w, o) => { o.material.uniforms.uP.value = -t / 2 * 1.0; }, { dur: 99 });
      fx.water({ r: 2.4, y: 0.02, deep: '#14505e', shallow: '#4aa6b0', waves: 0.8, ripples: rip(8, 2, 0, 0.3, 1.0, 0.05, 31), speed: 1.2, decay: 1.4 });
      fx.light({ color: '#e0eeff', intensity: 12, pos: [1.5, 4, 3], norm: 14 });
      fx.emitter({ count: 120, kind: 'drop', shape: 'box', shapeSize: [0.8, 0, 0.05], dir: [0, -1, 0.1], spread: 0.1, speed: [4, 7], life: [0.55, 0.7], size: [0.04, 0.03], gravity: [0, -9.8, 0], ramp: DROP, pos: [0, 3.0, 0.0] });
      mist(fx, { count: 50, shape: 'box', shapeSize: [0.8, 0, 0.2], dir: [0, 1, 0.5], spread: 0.8, speed: [0.3, 1.2], life: [1, 1.7], size: [0.6, 1.8], pos: [0, 0.3, 0.3] });
      fx.emitter({ count: 50, kind: 'soft', shape: 'box', shapeSize: [0.8, 0, 0.3], dir: [0, 1, 0.6], spread: 0.6, speed: [0.5, 1.5], life: [0.6, 1.0], size: [0.6, 0.25], ramp: [[0, '#fff', 0], [0.3, '#fff', 0.45], [1, '#dfeeff', 0]], intensity: 0.7, pos: [0, 0.1, 0.1] });
      fx.emitter({ count: 70, kind: 'drop', shape: 'box', shapeSize: [0.8, 0, 0.2], dir: [0, 1, 0.8], spread: 0.6, speed: [1.5, 3.5], life: [0.4, 0.7], size: [0.03, 0.015], gravity: [0, -9.8, 0], ramp: DROP, pos: [0, 0.05, 0.2] });
    } },

  { id: 'water/wave-crash', name: 'Wave crash', category: 'water', loop: false, duration: 3.2, stage: { sky: 'day', view: { pos: [1.5, 2.4, 10.5], target: [0, 1.0, 0], fov: 46 } },
    build(fx) {
      const NU = 70, NZ = 26, W = 3.6; const geo = new THREE.BufferGeometry(); const pos = new Float32Array(NU * NZ * 3); const idx = [];
      for (let i = 0; i < NU - 1; i++) for (let j = 0; j < NZ - 1; j++) { const a = i * NZ + j, b = a + 1, c = a + NZ, d = c + 1; idx.push(a, c, b, b, c, d); }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx);
      const wm = new THREE.MeshPhysicalMaterial({ color: '#2a9ab8', roughness: 0.28, metalness: 0, transmission: 0, transparent: true, opacity: 0.82, side: THREE.DoubleSide, clearcoat: 0.15 });
      const wave = new THREE.Mesh(geo, wm); const TC = 1.45;
      const prof = (t) => { // returns {xc,H,curl}
        if (t < TC) { const u = t / TC; return { xc: -5.5 + 5.0 * (u * u * 0.4 + u * 0.6), H: 0.45 + 1.9 * Math.pow(u, 0.9), curl: Math.min(1, u * 1.15) }; }
        const u = (t - TC) / 1.0; return { xc: -0.5 + 1.8 * Math.min(1, u), H: Math.max(0.05, 2.35 * (1 - Math.min(1, u * 1.1)) * (1 - Math.min(1, u * 1.1))), curl: Math.max(0.1, 1 - u * 2) };
      };
      const pts = []; for (let i = 0; i < NU; i++) pts.push([0, 0]);
      fx.mesh(wave, (t, pr, f, w) => { wm.opacity = 0.82 * w;
        const { xc, H, curl } = prof(t), R = H * 0.42, al = curl * Math.PI * 0.92; const N1 = 28, N2 = 24, N3 = NU - N1 - N2;
        for (let i = 0; i < N1; i++) { const f = i / N1; pts[i][0] = xc - 6 * (1 - f) * (1 - f * 0.2) - (1 - f) * 0; pts[i][1] = H * Math.pow(Math.sin(f * Math.PI / 2), 2.2); }
        for (let k = 0; k < N2; k++) { const a = (k / (N2 - 1)) * al, i = N1 + k; pts[i][0] = xc + R * Math.sin(a); pts[i][1] = H - R + R * Math.cos(a); }
        const ex = pts[N1 + N2 - 1][0], ey = pts[N1 + N2 - 1][1];
        for (let k = 0; k < N3; k++) { const f = (k + 1) / N3, i = N1 + N2 + k, e = f * f * (3 - 2 * f); pts[i][0] = ex + (xc + R * 1.2 - ex) * e + 0.15 * R * Math.sin(f * 3.14); pts[i][1] = ey * (1 - e); }
        for (let i = 0; i < NU; i++) for (let j = 0; j < NZ; j++) { const z = (j / (NZ - 1) - 0.5) * 2 * W, tw = 0.12 * Math.sin(z * 2.1 + i * 0.1) * H * (i > N1 ? 1 : 0.3); const o = (i * NZ + j) * 3; pos[o] = pts[i][0] + tw * 0.5; pos[o + 1] = Math.max(0.01, pts[i][1] + tw * 0.3); pos[o + 2] = z; }
        geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
      }, { dur: TC + 0.5, fade: [0, 0.35] });
      fx.water({ r: 7, y: 0.015, deep: '#0f6a82', shallow: '#3ab0c0', waves: 1.2, ripples: [], speed: 1.4, decay: 0.8 });
      const sand = new THREE.Mesh(new THREE.PlaneGeometry(6, 8), mat('#c8b080', 1)); sand.rotation.set(-Math.PI / 2 + 0.06, 0, 0); sand.rotation.order = 'ZXY'; sand.rotation.z = 0; sand.position.set(0, 0, 0);
      const beach = new THREE.Mesh(new THREE.BoxGeometry(6, 0.3, 9), mat('#cbb283', 1)); beach.position.set(5.2, -0.1, 0); beach.rotation.z = 0.07; fx.mesh(beach, null, { dur: 99 });
      fx.light({ color: '#ffeedd', intensity: 14, pos: [2, 4, 5], norm: 14 });
      fx.shake(TC, 0.5, 0.05);
      const fl = (o) => ({ shape: 'line', shapeSize: [0, 0, 3.4], ...o });
      fx.emitter(fl({ count: 60, kind: 'smoke', blend: 'normal', lit: 1, dir: [0.7, 0.4, 0], spread: 0.5, speed: [0.4, 1.6], life: [0.8, 1.4], size: [0.5, 1.2], ramp: [[0, '#eef6f8', 0], [0.2, '#e2eef2', 0.75], [1, '#c0d8e2', 0]], t0: TC - 0.7, delay: TC - 0.7, emit: 0.7, pos: [-0.1, 2.0, 0] }));
      fx.emitter(fl({ count: 110, kind: 'smoke', blend: 'normal', lit: 1, dir: [0.8, 0.3, 0], spread: 0.6, speed: [0.5, 2.8], life: [1.0, 1.8], size: [0.7, 1.9], ramp: [[0, '#e8f4f8', 0], [0.15, '#dcecf2', 0.7], [1, '#b8d4de', 0]], delay: TC, emit: 0.6, drag: 1, pos: [0.4, 0.3, 0], radial: 0 }));
      fx.emitter(fl({ count: 220, kind: 'drop', dir: [0.4, 1, 0], spread: 0.7, speed: [2, 7], life: [0.7, 1.4], size: [0.05, 0.025], gravity: [0, -9.8, 0], ramp: DROP, delay: TC, emit: 0.4, pos: [0.4, 0.2, 0] }));
      fx.emitter(fl({ count: 90, kind: 'smoke', blend: 'normal', lit: 1, dir: [1, 0.05, 0], spread: 0.2, speed: [2.2, 3.6], life: [1.2, 1.6], size: [0.8, 1.6], ramp: [[0, '#eef6f8', 0], [0.2, '#dceaf0', 0.65], [1, '#bcd4de', 0]], delay: TC + 0.3, emit: 0.8, drag: 1.2, pos: [0.8, 0.08, 0] }));
      fx.emitter(fl({ count: 70, kind: 'smoke', blend: 'normal', lit: 1, dir: [0, 1, 0], spread: 0.6, speed: [0.3, 1.2], life: [1.0, 1.8], size: [0.7, 1.6], ramp: [[0, '#fff', 0], [0.2, '#fff', 0.5], [1, '#dff', 0]], delay: TC + 0.9, emit: 1.4, drag: 0.5, pos: [1.6, 0.1, 0] }));
    } },

  { id: 'water/whirlpool', name: 'Whirlpool', category: 'water', loop: true, duration: 3, stage: { sky: 'day', view: { pos: [0, 7.4, 3.2], target: [0, 0, 0], fov: 42 } },
    build(fx) {
      fx.water({ r: 3.2, y: 0.01, deep: '#021420', shallow: '#1b6a8a', vortex: 1.5, waves: 0.8, speed: 1.2 });
      const sp = spiral(); fx.mesh(sp, (t) => { sp.material.uniforms.uP.value = -t / 3; }, { dur: 99 });
      fx.light({ color: '#e0eeff', intensity: 12, pos: [1.5, 4, 3], norm: 14 });
      fx.emitter({ count: 120, kind: 'soft', shape: 'ring', radius: 2.9, radiusIn: 1.2, dir: [0, 0, 0], spread: 0, speed: 0, life: [2.6, 2.9], size: [0.18, 0.06], ramp: [[0, '#fff', 0], [0.2, '#eefaff', 0.55], [0.8, '#cfeaf6', 0.5], [1, '#fff', 0]], intensity: 0.7, swirl: 1.6, radial: -0.4, pos: [0, 0.06, 0], floorFade: 0 });
    } },
];
