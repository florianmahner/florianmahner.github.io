// A small 3D stage above the name: the page's dot grid tilts into a floor and
// a handful of plain objects rest on it. The cursor (or a finger) nudges them.
// Loaded only when <html data-scene="objects"> or ?scene=objects; renders
// only while something moves, and not at all when the stage is off screen.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const stage = document.getElementById('stage');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dark = matchMedia('(prefers-color-scheme: dark)');
const small = matchMedia('(max-width: 640px)').matches;

// ---- colours from the CSS tokens, so the floor is the page --------------------
function cssColor(name) {
  const probe = document.createElement('i');
  probe.style.color = `var(${name})`;
  document.body.appendChild(probe);
  const m = getComputedStyle(probe).color.match(/[\d.]+/g).map(Number);
  probe.remove();
  return { rgb: m.slice(0, 3).map(v => v / 255), a: m.length > 3 ? m[3] : 1 };
}

// ---- renderer, camera ---------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.75 : 2));
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(26, 2, 0.1, 60);
camera.position.set(0, 5.2, 8.6);
camera.lookAt(0, 0.15, 0);

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const sun = new THREE.DirectionalLight(0xffffff, 1.1);
sun.position.set(-3, 6, 4);
scene.add(sun);

// ---- floor: the dot grid, in perspective, fading into the page ---------------
const floorMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    uBg: { value: new THREE.Vector3() },
    uDot: { value: new THREE.Vector4() },
    uSpacing: { value: 0.2 },
  },
  vertexShader: /* glsl */`
    varying vec3 vW;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vW = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: /* glsl */`
    uniform vec3 uBg; uniform vec4 uDot; uniform float uSpacing;
    varying vec3 vW;
    void main() {
      vec2 g = vW.xz / uSpacing;
      vec2 c = fract(g) - 0.5;
      float d = length(c);
      float w = fwidth(d) * 1.2;
      float r = 0.075;
      float dot = 1.0 - smoothstep(r - w, r + w, d);
      // dots fade out where they get too dense to resolve
      dot *= 1.0 - smoothstep(0.15, 0.45, fwidth(g.y));
      gl_FragColor = vec4(mix(uBg, uDot.rgb, dot * uDot.a), 1.0);
    }`,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), floorMat);
floor.rotation.x = -Math.PI / 2;
floor.renderOrder = -2;
scene.add(floor);

// soft contact shadow texture (one radial gradient, shared)
const shadowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.45, 'rgba(0,0,0,0.22)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
})();

// ---- objects ----------------------------------------------------------------
const palette = {
  light: { clay: 0xf6f5f2, steel: 0xb2c1d9, ink: 0x2a2a2e, grey: 0xc9cbd0, shadow: 0.5 },
  dark: { clay: 0x8f8a82, steel: 0x55607a, ink: 0x1c1b1a, grey: 0x5a5753, shadow: 0.9 },
};
const kinds = [
  { geo: () => new THREE.SphereGeometry(0.42, 48, 32), h: 0.42, r: 0.42, roll: true },
  { geo: () => new RoundedBoxGeometry(0.72, 0.72, 0.72, 4, 0.08), h: 0.36, r: 0.46 },
  { geo: () => new THREE.CylinderGeometry(0.3, 0.3, 0.9, 48), h: 0.45, r: 0.32 },
  { geo: () => new THREE.ConeGeometry(0.4, 0.85, 48), h: 0.425, r: 0.4 },
  { geo: () => new THREE.TorusGeometry(0.34, 0.13, 24, 64), h: 0.13, r: 0.47, flat: true },
  { geo: () => new THREE.CapsuleGeometry(0.2, 0.55, 8, 24), h: 0.2, r: 0.5, lying: true, roll: true },
  { geo: () => new THREE.IcosahedronGeometry(0.4, 0), h: 0.32, r: 0.4 },
  { geo: () => new THREE.SphereGeometry(0.26, 40, 24), h: 0.26, r: 0.26, roll: true },
  { geo: () => new RoundedBoxGeometry(1.0, 0.36, 0.6, 4, 0.06), h: 0.18, r: 0.55 },
  { geo: () => new THREE.CylinderGeometry(0.42, 0.42, 0.22, 48), h: 0.11, r: 0.42 },
];
const tones = ['clay', 'steel', 'clay', 'ink', 'clay', 'grey', 'steel', 'ink', 'clay', 'grey'];

const mats = {};
for (const t of ['clay', 'steel', 'ink', 'grey']) mats[t] = new THREE.MeshPhysicalMaterial({ roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4 });

const bodies = [];
const count = small ? 7 : kinds.length;
const tmpQ = new THREE.Quaternion();
const up = new THREE.Vector3(0, 1, 0);

for (let i = 0; i < count; i++) {
  const k = kinds[i];
  const mesh = new THREE.Mesh(k.geo(), mats[tones[i]]);
  if (k.flat) mesh.geometry.rotateX(Math.PI / 2);
  if (k.lying) mesh.geometry.rotateZ(Math.PI / 2);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = -1;
  scene.add(mesh, shadow);
  mesh.rotation.y = Math.random() * Math.PI;
  bodies.push({ mesh, shadow, k, x: 0, z: 0, y: 0, vx: 0, vz: 0, vy: 0 });
}

// ---- layout: spread the objects across what the camera can see ---------------
let halfW = 4, halfD = 1.4;
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // narrow stages (phones) pull the camera back so the objects stay small
  const back = Math.min(1.9, Math.max(1, 2.4 / camera.aspect));
  camera.position.set(0, 5.2, 8.6).multiplyScalar(back);
  camera.lookAt(0, 0.15, 0);
  camera.updateProjectionMatrix();
  // visible half-width at the floor centre
  const dist = camera.position.length();
  halfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * dist * camera.aspect * 0.86;
  halfD = small ? 1.1 : 1.35;
}

function place() {
  // loose row with jitter, so it reads as objects set down, not a grid
  bodies.forEach((b, i) => {
    const t = (i + 0.5) / bodies.length;
    b.x = (t * 2 - 1) * halfW * 0.92 + (Math.random() - 0.5) * 0.5;
    b.z = (Math.random() - 0.5) * halfD * 1.4;
    b.y = calm ? b.k.h : b.k.h + 2.2 + Math.random() * 1.6;
    b.vx = b.vz = b.vy = 0;
    b.hx = b.x; b.hz = b.z; // home: they drift back here after being pushed
  });
}

// ---- physics (tiny: discs on a plane, gravity for the drop-in) ---------------
const pointer = { x: 0, z: 0, px: 0, pz: 0, on: false, r: 0.55, left: 0, moved: 0 };
const ray = new THREE.Raycaster();
const plane = new THREE.Plane(up, 0);
const hit = new THREE.Vector3();

function step(dt) {
  let energy = 0;
  for (const b of bodies) {
    // drop-in
    if (b.y > b.k.h || b.vy !== 0) {
      b.vy -= 22 * dt; b.y += b.vy * dt;
      if (b.y < b.k.h) { b.y = b.k.h; b.vy = Math.abs(b.vy) > 1.2 ? -b.vy * 0.32 : 0; }
    }
    // pointer pushes
    if (pointer.on && performance.now() - pointer.moved < 250) {
      const dx = b.x - pointer.x, dz = b.z - pointer.z, d = Math.hypot(dx, dz), min = b.k.r + pointer.r;
      if (d < min && d > 1e-4) {
        const nx = dx / d, nz = dz / d, push = (min - d);
        b.x += nx * push; b.z += nz * push;
        const pvx = (pointer.x - pointer.px) / dt, pvz = (pointer.z - pointer.pz) / dt;
        const along = Math.max(0, pvx * nx + pvz * nz);
        b.vx += nx * (along * 0.9 + 1.5); b.vz += nz * (along * 0.9 + 1.5);
      }
    }
    // after a pause, everything slowly finds its way home
    if (performance.now() - Math.max(pointer.left, pointer.moved) > 1800) {
      b.vx += (b.hx - b.x) * 1.4 * dt; b.vz += (b.hz - b.z) * 1.4 * dt;
    }
    const sp0 = Math.hypot(b.vx, b.vz);
    if (sp0 > 6) { b.vx *= 6 / sp0; b.vz *= 6 / sp0; }
    b.x += b.vx * dt; b.z += b.vz * dt;
    const f = Math.exp(-3.2 * dt); b.vx *= f; b.vz *= f;
    // rolling / turning follows the motion
    const sp = Math.hypot(b.vx, b.vz);
    if (sp > 1e-3) {
      if (b.k.roll) {
        const axis = new THREE.Vector3(b.vz, 0, -b.vx).normalize();
        tmpQ.setFromAxisAngle(axis, sp * dt / b.k.h);
        b.mesh.quaternion.premultiply(tmpQ);
      } else {
        tmpQ.setFromAxisAngle(up, sp * dt * 0.6 * (b.vx >= 0 ? 1 : -1));
        b.mesh.quaternion.premultiply(tmpQ);
      }
    }
    energy += sp + Math.abs(b.vy) + Math.max(0, b.y - b.k.h);
  }
  // collisions between objects
  for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
    const a = bodies[i], b = bodies[j];
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), min = a.k.r + b.k.r;
    if (d < min && d > 1e-4 && a.y < a.k.h + 0.3 && b.y < b.k.h + 0.3) {
      const nx = dx / d, nz = dz / d, o = (min - d) / 2;
      a.x -= nx * o; a.z -= nz * o; b.x += nx * o; b.z += nz * o;
      const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
      if (rel < 0) {
        const j2 = -rel * 0.8;
        a.vx -= nx * j2 / 2; a.vz -= nz * j2 / 2; b.vx += nx * j2 / 2; b.vz += nz * j2 / 2;
      }
    }
  }
  // walls last, so a pile against a wall cannot push anything through it
  for (const b of bodies) {
    if (b.x < -halfW) { b.x = -halfW; b.vx = Math.abs(b.vx) * 0.5; }
    if (b.x > halfW) { b.x = halfW; b.vx = -Math.abs(b.vx) * 0.5; }
    if (b.z < -halfD) { b.z = -halfD; b.vz = Math.abs(b.vz) * 0.5; }
    if (b.z > halfD) { b.z = halfD; b.vz = -Math.abs(b.vz) * 0.5; }
    energy += Math.hypot(b.hx - b.x, b.hz - b.z) * 0.05;
  }
  pointer.px = pointer.x; pointer.pz = pointer.z;
  return energy;
}

function sync() {
  const sh = palette[dark.matches ? 'dark' : 'light'].shadow;
  for (const b of bodies) {
    b.mesh.position.set(b.x, b.y, b.z);
    const lift = Math.max(0, b.y - b.k.h);
    const s = b.k.r * 2.7 * (1 + lift * 0.25);
    b.shadow.scale.set(s, s, 1);
    b.shadow.position.set(b.x + 0.05, 0.002, b.z + 0.04);
    b.shadow.material.opacity = sh / (1 + lift * 1.2);
  }
}

// ---- theme --------------------------------------------------------------------
function theme() {
  const bg = cssColor('--bg'), dots = cssColor('--dots');
  floorMat.uniforms.uBg.value.set(...bg.rgb);
  floorMat.uniforms.uDot.value.set(...dots.rgb, dots.a);
  const p = palette[dark.matches ? 'dark' : 'light'];
  for (const t in mats) mats[t].color.set(p[t]);
  scene.environmentIntensity = dark.matches ? 0.35 : 1;
  sun.intensity = dark.matches ? 0.6 : 1.1;
}

// ---- loop: runs only while things move ----------------------------------------
let raf = 0, last = 0, visible = true, idle = 0;
function frame(t) {
  raf = 0;
  const dt = Math.min(0.033, (t - (last || t)) / 1000) || 1 / 60;
  last = t;
  let e = 0;
  for (let s = 0; s < 2; s++) e += step(dt / 2);
  sync();
  renderer.render(scene, camera);
  idle = e < 0.02 ? idle + 1 : 0;
  // keep ticking while the pointer rests, so the drift home can start
  if (performance.now() - Math.max(pointer.left, pointer.moved) < 2000) idle = 0;
  if (idle < 20 && visible) raf = requestAnimationFrame(frame);
  else last = 0;
}
function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }

function toFloor(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  const v = new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(v, camera);
  return ray.ray.intersectPlane(plane, hit);
}
if (!calm) {
  stage.addEventListener('pointermove', ev => {
    if (!toFloor(ev)) return;
    if (!pointer.on) { pointer.px = hit.x; pointer.pz = hit.z; }
    pointer.x = hit.x; pointer.z = hit.z; pointer.on = true; pointer.moved = performance.now(); wake();
  });
  const release = () => { pointer.on = false; pointer.left = performance.now(); wake(); };
  stage.addEventListener('pointerleave', release);
  stage.addEventListener('pointerup', ev => { if (ev.pointerType !== 'mouse') release(); });
}

new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(stage);
addEventListener('resize', () => { resize(); sync(); renderer.render(scene, camera); });
dark.addEventListener('change', () => { theme(); renderer.render(scene, camera); });

resize();
theme();
place();
sync();
renderer.render(scene, camera);
stage.classList.add('ready');
if (!calm) wake();
