// Demo host scene (test.html ?host=1, gallery "host scene", S27): uneven ground, 3 pillars, sun + hemi.
// Returns the arguments for stage.attach(). Deterministic (no Math.random).
export function makeHostScene(THREE, stage) {
  const scene = new THREE.Scene();
  const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };
  const geo = new THREE.PlaneGeometry(40, 40, 64, 64); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, (hash(p.getX(i), p.getZ(i)) * 2 - 1) * 0.08);
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#2a2b2f', roughness: 0.9 })); scene.add(ground);
  [[-1.5, -1, 0.8, 2.2], [1.6, -1.4, 0.7, 1.8], [0.3, -2.6, 0.9, 2.8]].forEach(([x, z, w, h]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), new THREE.MeshStandardMaterial({ color: '#4a4d55', roughness: 0.7 }));
    m.position.set(x, h / 2, z); scene.add(m);
  });
  const sun = new THREE.DirectionalLight('#ffffff', 2); sun.position.set(5, 8, 3); scene.add(sun);
  const hemi = new THREE.HemisphereLight('#6f8fd0', '#1b1a22', 0.5); scene.add(hemi);
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400); camera.position.copy(stage.camera.position); camera.lookAt(stage.controls.target);
  return { scene, camera, ground, lights: { sun, hemi } };
}
