// /world/ — immersive draft. Real 3D objects float in space on a fixed canvas
// behind the page. The cursor moves the camera a little, so the depth reads.
// Each chapter of the page has its own arrangement of the objects; scrolling
// blends from one to the next, and springs make the moves feel physical:
//   about — a loose cloud of objects drifting in depth
//   news  — they gather into a slowly turning ring
//   pubs  — a wheel; the paper you are reading turns to the front
//   bg    — a line into depth that you fly along as you scroll
//   end   — they gather into a small turning cluster
// Text slides in word by word as it arrives.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const root = document.documentElement;
const dark = matchMedia('(prefers-color-scheme: dark)');
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);

// ---- text: split into words, reveal on arrival -----------------------------------
function splitWords(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  let i = 0;
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    for (const part of node.textContent.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); continue; }
      const wd = document.createElement('span');
      wd.className = 'wd';
      const inner = document.createElement('span');
      inner.textContent = part;
      inner.style.setProperty('--d', `${Math.min(i++ * 26, 900)}ms`);
      wd.appendChild(inner);
      frag.appendChild(wd);
    }
    node.replaceWith(frag);
  }
}

function setupText() {
  const about = $$('.w-about p');
  if (about[0]) about[0].setAttribute('data-split', '');
  about.slice(1).forEach((p, i) => { p.setAttribute('data-rise', ''); p.style.setProperty('--d', `${120 + i * 90}ms`); });
  $$('.news-item').forEach((p, i) => p.style.setProperty('--d', `${(i % 6) * 70}ms`));
  $$('.w-pub, .w-edu').forEach(el => {
    for (const c of el.children) if (!c.hasAttribute('data-split')) { c.setAttribute('data-rise', ''); c.style.setProperty('--d', '160ms'); }
  });
  $$('[data-split]').forEach(splitWords);
  const io = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }, { rootMargin: '0px 0px -12% 0px' });
  $$('[data-split], [data-rise]').forEach(el => io.observe(el));
}

if (root.classList.contains('world')) setupText();
if (!root.classList.contains('world')) throw new Error('reduced motion: plain page');

// ---- renderer --------------------------------------------------------------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  throw e; // no WebGL: the page still reads fine, text reveals still work
}
renderer.domElement.id = 'world';
renderer.domElement.setAttribute('aria-hidden', 'true');
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
const key = new THREE.DirectionalLight(0xffffff, 1.2);
key.position.set(-4, 6, 6);
const rim = new THREE.DirectionalLight(0xdbe4f3, 0.9); // a cool back light outlines the shapes
rim.position.set(5, 2, -6);
scene.add(key, rim);

// ---- objects ------------------------------------------------------------------------
const kinds = [
  () => new THREE.SphereGeometry(0.42, 48, 32),
  () => new RoundedBoxGeometry(0.72, 0.72, 0.72, 4, 0.08),
  () => new THREE.CylinderGeometry(0.3, 0.3, 0.9, 48),
  () => new THREE.ConeGeometry(0.4, 0.85, 48),
  () => new THREE.TorusGeometry(0.34, 0.13, 24, 64),
  () => new THREE.CapsuleGeometry(0.2, 0.55, 8, 24),
  () => new THREE.IcosahedronGeometry(0.42, 0),
  () => new THREE.SphereGeometry(0.3, 40, 24),
  () => new RoundedBoxGeometry(0.95, 0.34, 0.6, 4, 0.06),
  () => new THREE.CylinderGeometry(0.42, 0.42, 0.2, 48),
];
const tones = ['clay', 'steel', 'clay', 'ink', 'clay', 'grey', 'steel', 'ink', 'clay', 'grey'];
const palette = {
  light: { clay: 0xf6f5f2, steel: 0xb2c1d9, ink: 0x2a2a2e, grey: 0xc9cbd0 },
  dark: { clay: 0x8f8a82, steel: 0x55607a, ink: 0x2a2826, grey: 0x5a5753 },
};
const mats = {};
for (const t of ['clay', 'steel', 'ink', 'grey']) mats[t] = new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 });
const N = kinds.length;
const objs = kinds.map((make, i) => {
  const mesh = new THREE.Mesh(make(), mats[tones[i]]);
  scene.add(mesh);
  return {
    mesh,
    pos: new THREE.Vector3(0, 0, -30), vel: new THREE.Vector3(),
    scale: 0.001, rot: new THREE.Euler(i * 0.9, i * 1.7, i * 0.4),
    spin: new THREE.Vector3(0.11 + (i % 3) * 0.05, 0.17 + (i % 4) * 0.04, 0.07), // each turns at its own pace
    phase: i * 1.37,
  };
});

// ---- arrangements, in screen terms: nx, ny in -1..1, d = distance from camera ------------
let aspect = 1, small = false;
const v = new THREE.Vector3();
function screenToWorld(nx, ny, d, out) {
  const halfH = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  if (small) { nx *= 0.75; d *= 1.35; } // phones: the text spans the screen, keep objects further back
  return out.set(nx * halfH * aspect, ny * halfH, -d);
}
const cloud = [
  [0.55, 0.5, 9, 1.15], [0.86, 0.12, 12, 1.25], [0.42, -0.4, 8, 0.95], [0.7, -0.62, 11, 1.05], [0.94, 0.66, 15, 1.35],
  [0.32, 0.78, 13, 0.85], [0.6, -0.02, 16, 1.4], [0.9, -0.38, 7.5, 0.8], [0.25, -0.8, 12, 0.9], [0.74, 0.88, 10, 0.75],
];
// each returns [position, scale] for object i at time t (seconds), progress p (0..1 inside the chapter)
const forms = {
  about(i, t, p, out) {
    const c = cloud[i];
    screenToWorld(c[0], c[1] + p * 0.25, c[2], out);
    return c[3];
  },
  news(i, t, p, out) {
    const a = (i / N) * Math.PI * 2 + t * 0.18;
    screenToWorld(0.52, 0.02, 12, out);
    out.x += Math.cos(a) * 2.4; out.y += Math.sin(a) * 1.15; out.z += Math.sin(a) * 1.6;
    return 0.95;
  },
  pubs(i, t, p, out, active) {
    const th = ((i - active) / N) * Math.PI * 2;
    screenToWorld(0.5, 0, 11.5, out);
    const R = 2.9;
    out.y += Math.sin(th) * R;
    out.z += (Math.cos(th) - 1) * R * 1.25;
    out.x += (1 - Math.cos(th)) * 0.9;
    const front = (Math.cos(th) + 1) / 2;
    return 0.75 + front * front * 0.95;
  },
  bg(i, t, p, out) {
    // a line receding into depth; scrolling through Background flies you along it
    const k = i / (N - 1);
    const d = 5 + i * 3.1 - p * 16;
    screenToWorld(0.22 + k * 0.62, -0.42 + k * 0.78, Math.max(d, 0.5), out);
    return d < 3 ? Math.max(0, (d - 0.6) / 2.4) : 1;
  },
  end(i, t, p, out) {
    // a small cluster on a Fibonacci sphere, turning as a whole
    const y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996 + t * 0.25;
    screenToWorld(0, 0.32, 13, out);
    out.x += Math.cos(a) * r * 1.4; out.y += y * 1.4; out.z += Math.sin(a) * r * 1.4;
    return 0.62;
  },
};

// ---- where are we on the page? ---------------------------------------------------------------
const chapters = $$('[data-ch]').map(el => ({ el, name: el.dataset.ch }));
const pubRows = $$('.w-pub'), bgRows = $$('.w-edu');
let vh = innerHeight;
const state = { a: 'about', b: 'about', t: 0, pA: 0, pB: 0, pubActive: 0, rowsLive: false };
function readPage() {
  // one pass of layout reads per frame
  const mid = vh * 0.5;
  const rects = chapters.map(c => c.el.getBoundingClientRect());
  const centers = rects.map(r => r.top + r.height / 2);
  let i = 0;
  while (i < chapters.length - 1 && centers[i + 1] < mid) i++;
  const j = Math.min(i + 1, chapters.length - 1);
  const span = centers[j] - centers[i];
  state.a = chapters[i].name; state.b = chapters[j].name;
  // hold each arrangement while its chapter fills the screen, blend in the gap between
  const raw = span > 0 ? clamp((mid - centers[i]) / span, 0, 1) : 0;
  state.t = smoother(clamp((raw - 0.25) / 0.5, 0, 1));
  const prog = r => clamp((mid - r.top) / Math.max(1, r.height), 0, 1);
  state.pA = prog(rects[i]); state.pB = prog(rects[j]);
  // the row nearest the middle of the screen
  const rowIn = rows => {
    let best = -1, bd = Infinity;
    rows.forEach((r, k) => { const b = r.getBoundingClientRect(); const d = Math.abs(b.top + b.height / 2 - mid); if (d < bd) { bd = d; best = k; } });
    return best;
  };
  const inPubs = state.a === 'pubs' || state.b === 'pubs';
  const inBg = state.a === 'bg' || state.b === 'bg';
  const pr = inPubs ? rowIn(pubRows) : -1, br = inBg ? rowIn(bgRows) : -1;
  if (pr >= 0) state.pubActive = pr;
  const live = (state.a === 'pubs' && state.t < 0.5) || (state.b === 'pubs' && state.t >= 0.5) || (state.a === 'bg' && state.t < 0.5) || (state.b === 'bg' && state.t >= 0.5);
  if (live !== state.rowsLive) { root.classList.toggle('rows-live', live); state.rowsLive = live; }
  pubRows.forEach((r, k) => r.classList.toggle('on', k === pr));
  bgRows.forEach((r, k) => r.classList.toggle('on', k === br));
}

// ---- pointer: the camera leans toward the cursor ------------------------------------------------
const lean = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  lean.tx = (e.clientX / innerWidth) * 2 - 1;
  lean.ty = (e.clientY / innerHeight) * 2 - 1;
}, { passive: true });

// ---- theme / size -------------------------------------------------------------------------------
function theme() {
  const p = palette[dark.matches ? 'dark' : 'light'];
  for (const t in mats) mats[t].color.set(p[t]);
  scene.environmentIntensity = dark.matches ? 0.4 : 1;
  key.intensity = dark.matches ? 0.7 : 1.2;
  rim.intensity = dark.matches ? 0.6 : 0.9;
}
function resize() {
  vh = innerHeight;
  small = innerWidth <= 640;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
}

// ---- loop -----------------------------------------------------------------------------------------
const ta = new THREE.Vector3(), tb = new THREE.Vector3();
let last = 0, t = 0, pubA = 0, scrollV = 0, lastY = scrollY, running = false;
function frame(now) {
  if (!running) return;
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (last || now)) / 1000) || 1 / 60;
  last = now; t += dt;
  readPage();

  // the wheel turns smoothly to the active paper, the short way round
  let diff = state.pubActive - pubA;
  pubA += diff * (1 - Math.exp(-dt * 5));
  scrollV += ((scrollY - lastY) / Math.max(dt, 1e-3) - scrollV) * 0.2; lastY = scrollY;

  lean.x += (lean.tx - lean.x) * (1 - Math.exp(-dt * 3));
  lean.y += (lean.ty - lean.y) * (1 - Math.exp(-dt * 3));
  camera.position.set(lean.x * 0.55, -lean.y * 0.35, 0);
  camera.lookAt(lean.x * 0.15, -lean.y * 0.1, -10);

  const fa = forms[state.a], fb = forms[state.b];
  objs.forEach((o, i) => {
    const sa = fa(i, t, state.pA, ta, pubA);
    const sb = fb(i, t, state.pB, tb, pubA);
    ta.lerp(tb, state.t);
    const sc = sa + (sb - sa) * state.t;
    // gentle float, so nothing is ever perfectly still
    ta.x += Math.sin(t * 0.6 + o.phase) * 0.08;
    ta.y += Math.sin(t * 0.8 + o.phase * 1.3) * 0.1;
    // spring toward the target: a little lag makes the moves feel physical
    const k = 26, c = 2 * Math.sqrt(k) * 0.9;
    o.vel.x += ((ta.x - o.pos.x) * k - o.vel.x * c) * dt;
    o.vel.y += ((ta.y - o.pos.y) * k - o.vel.y * c) * dt;
    o.vel.z += ((ta.z - o.pos.z) * k - o.vel.z * c) * dt;
    o.pos.addScaledVector(o.vel, dt);
    o.scale += (sc - o.scale) * (1 - Math.exp(-dt * 4));
    // turn: own pace, faster for the paper in front, a kick from scrolling
    const boost = (state.a === 'pubs' || state.b === 'pubs') && i === state.pubActive ? 3.2 : 1;
    o.rot.x += o.spin.x * dt * boost + scrollV * 0.00004;
    o.rot.y += o.spin.y * dt * boost;
    o.rot.z += o.spin.z * dt;
    o.mesh.position.copy(o.pos);
    o.mesh.rotation.copy(o.rot);
    o.mesh.scale.setScalar(Math.max(0.001, o.scale));
  });
  renderer.render(scene, camera);
}
function start() { if (running) return; running = true; last = 0; requestAnimationFrame(frame); }
function stop() { running = false; }

addEventListener('resize', resize);
dark.addEventListener('change', theme);
document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

resize();
theme();
readPage();
// objects start far back and small, and arrive as the page opens
objs.forEach((o, i) => { forms.about(i, 0, 0, o.pos); o.pos.z -= 25 + i * 2; });
root.classList.add('world-ready');
start();
