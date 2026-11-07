// Flow mode renderer: a fixed, transparent, full-viewport canvas in front of
// the page with the small 3D objects from js/scene.js. Knows nothing about the
// DOM layout or motion; the director tells it where each object is via set()
// and main.js decides when to render(). All coordinates are viewport CSS px,
// origin top-left, y down.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Same objects, palettes and tones as js/scene.js, so both labs read as one set.
// Geometry is in "units"; one unit becomes stage.size px on screen.
const kinds = [
  { geo: () => new THREE.SphereGeometry(0.42, 48, 32) },
  { geo: () => new RoundedBoxGeometry(0.72, 0.72, 0.72, 4, 0.08) },
  { geo: () => new THREE.CylinderGeometry(0.3, 0.3, 0.9, 48) },
  { geo: () => new THREE.ConeGeometry(0.4, 0.85, 48) },
  { geo: () => new THREE.TorusGeometry(0.34, 0.13, 24, 64), flat: true },
  { geo: () => new THREE.CapsuleGeometry(0.2, 0.55, 8, 24), lying: true },
  { geo: () => new THREE.IcosahedronGeometry(0.4, 0) },
  { geo: () => new THREE.SphereGeometry(0.26, 40, 24) },
  { geo: () => new RoundedBoxGeometry(1.0, 0.36, 0.6, 4, 0.06) },
  { geo: () => new THREE.CylinderGeometry(0.42, 0.42, 0.22, 48) },
];
const tones = ['clay', 'steel', 'clay', 'ink', 'clay', 'grey', 'steel', 'ink', 'clay', 'grey'];
const palette = {
  light: { clay: 0xf6f5f2, steel: 0xb2c1d9, ink: 0x2a2a2e, grey: 0xc9cbd0 },
  dark: { clay: 0x8f8a82, steel: 0x55607a, ink: 0x1c1b1a, grey: 0x5a5753 },
};

// Head-on orthographic view would show a cube as a flat square. A shared
// forward tilt (as if seen from slightly above) plus a fixed per-object yaw
// shows the tops and two sides, so every object reads as a solid.
const TILT = 0.42;
const yaw = [0.3, 0.62, 0.2, 0.5, 0, 0.35, 0.4, 0, 0.55, 0];
const SHADOW_OFFSET = 4;   // px, like the cards' hard offset shadow
const SHADOW_Z = -2000;    // every shadow sits behind every object
const Z_STEP = 80;         // > an object's depth in px, so neighbours never interpenetrate

const dark = matchMedia('(prefers-color-scheme: dark)');

// Read a CSS colour token through a probe element, so var() chains and the
// dark-mode block resolve exactly as the page sees them.
let probe = null;
function cssColor(name) {
  if (!probe) {
    probe = document.createElement('i');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;visibility:hidden';
    document.body.appendChild(probe);
  }
  probe.style.color = `var(${name})`;
  const m = (getComputedStyle(probe).color.match(/[\d.]+/g) || [0, 0, 0]).map(Number);
  return m.slice(0, 3).map(v => v / 255);
}

export function createStage({ small = false } = {}) {
  const count = small ? 8 : kinds.length;
  const size = small ? 34 : 46;

  // ---- renderer, camera, light (as js/scene.js) --------------------------------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const canvas = renderer.domElement;
  canvas.id = 'flow-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const scene = new THREE.Scene();
  // World y is up, so a CSS point (x, y) maps to world (x, -y). Flipping the
  // camera instead would mirror triangle winding and break face culling.
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, 1, 8000);
  camera.position.set(0, 0, 4000);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(-3, 6, 4); // only the direction matters
  scene.add(sun);

  const mats = {};
  for (const t of ['clay', 'steel', 'ink', 'grey']) {
    mats[t] = new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });
  }
  // Flat, unlit, untonemapped: the silhouette must match the cards' shadow colour exactly.
  const shadowMat = new THREE.MeshBasicMaterial({ toneMapped: false });

  // ---- objects -----------------------------------------------------------------
  // Each object is root (contact point, scale/squash) > body (rotation, raised
  // so its lowest point sits on the root) > mesh. Scaling the root therefore
  // squashes and stretches about the bottom contact point. The shadow is a
  // twin hierarchy sharing the geometry and transforms, drawn far behind.
  const qTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(TILT, 0, 0));
  const qSpin = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const rot = new THREE.Matrix4();

  const objs = [];
  for (let i = 0; i < count; i++) {
    const k = kinds[i];
    const geo = k.geo();
    if (k.flat) geo.rotateX(Math.PI / 2);
    if (k.lying) geo.rotateZ(Math.PI / 2);

    const root = new THREE.Group();
    const body = new THREE.Group();
    body.add(new THREE.Mesh(geo, mats[tones[i]]));
    root.add(body);
    root.position.z = i * Z_STEP;

    const sRoot = new THREE.Group();
    const sBody = new THREE.Group();
    sBody.add(new THREE.Mesh(geo, shadowMat));
    sRoot.add(sBody);
    sRoot.position.z = SHADOW_Z + i * Z_STEP;

    scene.add(sRoot, root);
    // Until the director places them, keep everything off screen.
    root.visible = sRoot.visible = false;
    objs.push({ root, body, sRoot, sBody, pos: geo.attributes.position.array, yaw: yaw[i], rkey: null });
  }

  // Lowest world-y of the rotated geometry (in units), recomputed only when the
  // rotation changes. Exact over every vertex so cubes and the icosahedron sit
  // flush on the line while they turn; ~20k multiply-adds, negligible.
  function orient(o, rx, ry, rz) {
    const key = `${rx},${ry},${rz}`;
    if (key === o.rkey) return;
    o.rkey = key;
    euler.set(rx, o.yaw + ry, rz);
    qSpin.setFromEuler(euler);
    o.body.quaternion.multiplyQuaternions(qTilt, qSpin);
    rot.makeRotationFromQuaternion(o.body.quaternion);
    const e = rot.elements, p = o.pos;
    let min = Infinity;
    for (let j = 0; j < p.length; j += 3) {
      const y = e[1] * p[j] + e[5] * p[j + 1] + e[9] * p[j + 2];
      if (y < min) min = y;
    }
    o.body.position.y = -min;
    o.sBody.quaternion.copy(o.body.quaternion);
    o.sBody.position.y = -min;
  }

  function set(i, { x, y, scale = 1, lift = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1 }) {
    const o = objs[i];
    if (!o) return;
    orient(o, rx, ry, rz);
    const s = size * scale;
    o.root.position.x = x;
    o.root.position.y = -(y - lift);
    o.root.scale.set(s * sx, s * sy, s * sx);
    // Like a lifted card: the object rises, the shadow stays on the ground and
    // falls further away to the right, so the offset grows with lift.
    const off = SHADOW_OFFSET + Math.max(0, lift);
    o.sRoot.position.x = x + off;
    o.sRoot.position.y = -(y - lift + off);
    o.sRoot.scale.copy(o.root.scale);
    o.root.visible = o.sRoot.visible = true;
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    // updateStyle=true: a fixed canvas is a replaced element, so inset:0 alone
    // would not size it; the inline px size keeps 1 world unit = 1 CSS px.
    renderer.setSize(w, h, true);
    camera.left = 0; camera.right = w;
    camera.top = 0; camera.bottom = -h;
    camera.updateProjectionMatrix();
  }

  function theme() {
    const isDark = dark.matches;
    const p = palette[isDark ? 'dark' : 'light'];
    for (const t in mats) mats[t].color.set(p[t]);
    shadowMat.color.setRGB(...cssColor('--shadow-color'), THREE.SRGBColorSpace);
    scene.environmentIntensity = isDark ? 0.35 : 1;
    sun.intensity = isDark ? 0.6 : 1.1;
  }

  function render() { renderer.render(scene, camera); }

  resize();
  theme();

  return { canvas, count, size, set, render, resize, theme };
}
