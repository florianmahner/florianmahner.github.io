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

// years tick up to their value, ending exactly on the real text
function countUp(el) {
  const final = el.textContent;
  if (!/\d{4}/.test(final)) return;
  el.setAttribute('aria-label', final);
  const t0 = performance.now(), dur = 1100;
  const tick = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    let n = 0;
    el.textContent = final.replace(/\d{4}/g, m => String(Math.round(+m - (1 - e) * (18 + 6 * n++))));
    if (k < 1) requestAnimationFrame(tick); else el.textContent = final;
  };
  requestAnimationFrame(tick);
}

// contact icons lean toward the cursor
function magnetic() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.icon-link').forEach(a => {
    a.addEventListener('pointermove', e => {
      const r = a.getBoundingClientRect();
      a.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.35}px, ${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    a.addEventListener('pointerleave', () => { a.style.transform = ''; });
  });
}

const scrubs = [];
// words that share a vertical position form a line
function groupLines(sc) {
  sc.lines = [];
  let top = null;
  for (const w of sc.words) {
    const t = w.offsetTop;
    if (top === null || Math.abs(t - top) > 4) { sc.lines.push([]); top = t; }
    sc.lines[sc.lines.length - 1].push(w);
  }
  sc.lines.forEach((line, li) => line.forEach(w => w.style.setProperty('--d', '0ms')));
}
addEventListener('resize', () => { for (const sc of scrubs) { sc.lines = null; sc.lit = -1; } });
function scrubText() {
  for (const sc of scrubs) {
    const r = sc.el.getBoundingClientRect();
    // lighting starts as it comes up the screen and is complete once it sits
    // centred, so the first paragraph is fully lit on arrival
    const start = vh * 0.95, done = vh / 2 - r.height / 2;
    const k = clamp((start - r.top) / Math.max(1, start - done), 0, 1);
    // whole lines arrive, never half-faded words
    if (!sc.lines) groupLines(sc);
    const n = Math.ceil(k * sc.lines.length - 0.001);
    if (n === sc.lit) continue;
    sc.lines.forEach((line, li) => { const on = li < n; for (const w of line) w.classList.toggle('lit', on); });
    sc.lit = n;
  }
}

// news.log letters, revealed by the laptop scene as you scroll
const log = { chars: [], shown: -1, list: null, caret: null };
function setupLog() {
  const list = document.querySelector('.w-news .news-list');
  if (!list) return;
  log.list = list;
  const walker = document.createTreeWalker(list, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.textContent.trim()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const frag = document.createDocumentFragment();
    for (const ch of node.textContent.replace(/[ \t\n\r]+/g, ' ')) { // keep the thin space before "!"
      const c = document.createElement('span'); c.className = 'tc on'; c.textContent = ch;
      frag.appendChild(c); log.chars.push(c);
    }
    node.replaceWith(frag);
  }
  list.setAttribute('aria-label', list.textContent); // screen readers get the whole log
  log.caret = document.createElement('span'); log.caret.className = 'caret'; log.caret.setAttribute('aria-hidden', 'true');
}
function showLog(k) {
  const n = Math.round(clamp(k, 0, 1) * log.chars.length);
  if (n === log.shown) return;
  const lo = Math.min(n, Math.max(0, log.shown)), hi = Math.max(n, log.shown < 0 ? log.chars.length : log.shown);
  for (let i = lo; i < hi; i++) log.chars[i].classList.toggle('on', i < n);
  log.shown = n;
  if (n > 0) log.chars[n - 1].after(log.caret); else log.list.prepend(log.caret);
  const col = log.list.closest('.w-col-news');
  if (col) {
    const fx = clamp(log.caret.offsetLeft / Math.max(1, log.list.clientWidth), 0, 1);
    col.style.setProperty('--carr', ((0.5 - fx) * 34).toFixed(1) + 'px');
    if (log.keys && log.keys.length && n > 0) {
      const key = log.keys[(n * 7) % log.keys.length];
      key.classList.add('hit'); setTimeout(() => key.classList.remove('hit'), 90);
    }
  }
  // like a terminal, the newest typed line stays in view
  const last = log.chars[Math.max(0, n - 1)];
  // the file reads from the top (newest first), so only the printer view follows the caret
  if (last && !log.list.closest('.w-col-news')) { const lp = last.closest('p'); if (lp) log.list.scrollTop = Math.max(0, lp.offsetTop + lp.offsetHeight - log.list.clientHeight); }
}

function invite(p) {
  const mail = document.querySelector('.w-top a[href^="mailto:"]');
  // wrap the words "reach out" (they are split into word spans by now)
  const words = [...p.querySelectorAll('.wd')];
  const i = words.findIndex((w, k) => w.textContent === 'reach' && words[k + 1] && words[k + 1].textContent.startsWith('out'));
  if (mail && i >= 0) {
    const a = document.createElement('a');
    a.href = mail.getAttribute('href');
    words[i].before(a);
    a.append(words[i], words[i].nextSibling, words[i + 1]);
    // keep the full stop outside the link
    const last = words[i + 1].querySelector('span');
    if (last && last.textContent.endsWith('.')) {
      last.textContent = last.textContent.slice(0, -1);
      a.after(document.createTextNode('.'));
    }
  }
}

// a typewriter drawn like the site's windows: white fill, black outline,
// steel offset shadow. The page (news.log) is fed through its roller.
function typewriter() {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 360 150'); svg.setAttribute('class', 'w-type'); svg.setAttribute('aria-hidden', 'true');
  const keys = [];
  for (const [y, n] of [[74, 10], [95, 9], [116, 8]])
    for (let k = 0; k < n; k++) keys.push('<circle class="tw-key" cx="' + (180 + (k - (n - 1) / 2) * 25) + '" cy="' + y + '" r="6.5"/>');
  svg.innerHTML =
    '<path class="tw-shadow" d="M46 41H326L352 143Q354 149 348 149H24Q18 149 20 143Z"/>' +
    '<path class="tw-fill" d="M42 37H322L348 139Q350 145 344 145H20Q14 145 16 139Z"/>' +
    '<rect class="tw-fill" x="150" y="37" width="60" height="13" rx="3"/>' +
    keys.join('') +
    '<rect class="tw-key tw-space" x="112" y="128" width="136" height="8" rx="4"/>' +
    '<g class="w-carriage">' +
      '<rect class="tw-shadow" x="24" y="14" width="316" height="22" rx="11"/>' +
      '<rect class="tw-fill" x="20" y="10" width="316" height="22" rx="11"/>' +
      '<circle class="tw-fill" cx="11" cy="21" r="9"/><circle class="tw-fill" cx="345" cy="21" r="9"/>' +
      '<path class="tw-line" d="M20 15L4 4"/>' +
    '</g>';
  log.keys = [...svg.querySelectorAll('.tw-key')];
  return svg;
}

function setupText() {
  const about = $$('.w-about p');
  // two screens: the opening paragraph alone, then the research paragraphs
  // side by side, the invitation closing the second column
  const host = about[0] && about[0].parentElement;
  if (host) {
    const one = document.createElement('div'); one.className = 'w-step';
    const two = document.createElement('div'); two.className = 'w-step w-step-two';
    const colA = document.createElement('div'), colB = document.createElement('div'), colC = document.createElement('div');
    colA.className = colB.className = 'w-col'; colC.className = 'w-col w-col-news';
    host.prepend(one); one.after(two); two.append(colA, colB, colC);
    // research | central theme + invitation | news.log on the right
    about.forEach((p, k) => (k === 0 ? one : k === 1 ? colA : colB).appendChild(p));
    const win = document.querySelector('.w-news'), sec = document.querySelector('.ch-news');
    if (win) colC.appendChild(win);
    if (sec) sec.remove();
  }
  about.forEach(p => {
    p.setAttribute('data-scrub', '');
    splitWords(p);
    scrubs.push({ el: p, words: [...p.querySelectorAll('.wd')], lit: -1 });
  });
  const lastP = about[about.length - 1];
  if (lastP && /reach out/.test(lastP.textContent)) invite(lastP);
  $$('.news-item').forEach((p, i) => p.style.setProperty('--d', `${(i % 6) * 70}ms`));
  $$('.w-pub, .w-edu').forEach(el => {
    for (const c of el.children) if (!c.hasAttribute('data-split')) { c.setAttribute('data-rise', ''); c.style.setProperty('--d', '160ms'); }
  });
  $$('.block-heading').forEach(h => h.setAttribute('data-chars', ''));
  $$('[data-split]').forEach(splitWords);
  // headings go one step further: every letter rolls in on its own
  $$('[data-chars] .wd > span').forEach(w => {
    const txt = w.textContent; w.textContent = '';
    for (const ch of txt) { const c = document.createElement('span'); c.className = 'chr'; c.textContent = ch; w.appendChild(c); }
  });
  $$('[data-chars]').forEach(h => h.querySelectorAll('.chr').forEach((c, i) => c.style.setProperty('--d', `${i * 32}ms`)));
  const io = new IntersectionObserver(entries => {
    // things arriving together are staggered, so they flow in rather than pop
    let k = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      if (el.hasAttribute('data-stream')) el.style.setProperty('--d', `${300 + k++ * 90}ms`);
      el.classList.add('in');
      io.unobserve(el);
      if (el.classList.contains('edu-years')) countUp(el);
    }
  }, { rootMargin: '0px 0px -10% 0px' });
  $$('[data-split], [data-rise], [data-stream], .w-edus').forEach(el => io.observe(el));
  magnetic();
  setupLog();
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

// ---- a small printer for news.log ----------------------------------------------------------
// Simple, soft shapes in the objects' clay: a body, a paper roll, a slot, a
// button. As you scroll it prints the log onto a strip that rises out of the
// slot and curls back a little at the top.
const printer = new THREE.Group();
const body = new THREE.MeshPhysicalMaterial({ roughness: 0.45, clearcoat: 0.35, clearcoatRoughness: 0.4 });
const darkPart = new THREE.MeshStandardMaterial({ color: 0x1d1d20, roughness: 0.5 });
const pr = { W: 2.7, H: 0.78, D: 1.55 };
const prBody = new THREE.Mesh(new RoundedBoxGeometry(pr.W, pr.H, pr.D, 6, 0.16), body);
prBody.position.y = pr.H / 2;
const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, pr.W - 0.3, 40).rotateZ(Math.PI / 2), body);
roll.position.set(0, pr.H - 0.05, -pr.D / 2 + 0.36);
const slot = new THREE.Mesh(new RoundedBoxGeometry(2.25, 0.03, 0.07, 2, 0.01), darkPart);
slot.position.set(0, pr.H + 0.005, 0.05);
const button = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.04, 28), darkPart);
button.position.set(pr.W / 2 - 0.35, pr.H + 0.01, pr.D / 2 - 0.3);
const led = new THREE.Mesh(new THREE.CircleGeometry(0.035, 20), new THREE.MeshBasicMaterial({ color: 0x2a2a2e }));
led.rotation.x = -Math.PI / 2; led.position.set(pr.W / 2 - 0.6, pr.H + 0.003, pr.D / 2 - 0.3);
const prShadow = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(0,0,0,.32)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(pr.W * 1.6, pr.D * 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = -0.01; return m;
})();
// the paper: a strip whose height and curl we reshape every frame
const PSEG = 32, paperW = 2.05;
const paperGeo = new THREE.PlaneGeometry(paperW, 1, 1, PSEG);
const paperMat = new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide });
const strip = new THREE.Mesh(paperGeo, paperMat);
strip.position.set(0, pr.H + 0.01, 0.05);
let paperH = 0.001;
function shapePaper(h) {
  const pos = paperGeo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const v = Math.floor(i / 2) / PSEG; // 0 at the top row, 1 at the slot
    const y = (1 - v) * h;
    pos.setY(i, y);
    pos.setZ(i, -0.22 * Math.pow(y / Math.max(h, 1e-3), 2) * Math.min(h, 2.2)); // curls back near the top
  }
  pos.needsUpdate = true;
  paperGeo.computeVertexNormals();
}
printer.add(prShadow, prBody, roll, slot, button, led, strip);
printer.rotation.x = 0.24; // tipped toward you a little
printer.visible = false;
scene.add(printer);
const paperCorners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
const cw = new THREE.Vector3();

// ---- arrangements, in screen terms: nx, ny in -1..1, d = distance from camera ------------
let aspect = 1, small = false;
const v = new THREE.Vector3();
function screenToWorld(nx, ny, d, out) {
  if (small) d *= 1.35; // phones: keep objects further back (smaller), same screen position
  const halfH = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  return out.set(nx * halfH * aspect, ny * halfH, -d);
}
const cloud = [
  [0.55, 0.5, 9, 1.15], [0.86, 0.12, 12, 1.25], [0.42, -0.4, 8, 0.95], [0.7, -0.62, 11, 1.05], [0.94, 0.66, 15, 1.35],
  [0.32, 0.78, 13, 0.85], [0.6, -0.02, 16, 1.4], [0.9, -0.38, 7.5, 0.8], [0.25, -0.8, 12, 0.9], [0.74, 0.88, 10, 0.75],
];
// each returns [position, scale] for object i at time t (seconds), progress p (0..1 inside the chapter)
// an element's on-screen box, as a centre and half-size at depth d
const box = { cx: 0, cy: 0, hw: 0.3, hh: 0.3 };
function anchorAt(r, d, out) {
  const nx = ((r.left + r.width / 2) / innerWidth) * 2 - 1, ny = -(((r.top + r.height / 2) / vh) * 2 - 1);
  screenToWorld(nx, ny, d, out);
  const halfH = d * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (small ? 1.35 : 1);
  return { hw: (r.width / innerWidth) * halfH * aspect, hh: (r.height / vh) * halfH };
}
// one arrangement per selected paper (offsets from the title's centre);
// any later paper falls back to a ring
const pa = new THREE.Vector3(), pb = new THREE.Vector3();
const PAPER_SCENES = [
  // two groups either side of the title, mirror images turning into line
  (i, t, s, o) => {
    const side = i < N / 2 ? -1 : 1, k = i % (N / 2), a = (k / (N / 2)) * Math.PI * 2 + t * 0.35 * side;
    const r = 0.95;
    o.set(side * (s.hw + 1.9) + Math.cos(a) * r * 0.8, Math.sin(a) * r, Math.sin(a + 0.6) * r * 0.9);
    return 0.72;
  },
  // all of them in one shared, tight sphere, turning as one
  (i, t, s, o) => {
    const y = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996 + t * 0.3;
    o.set(s.hw + 2.0 + Math.cos(a) * rr * 1.15, y * 1.15, Math.sin(a) * rr * 1.15);
    return 0.62;
  },
  // lined up along three axes from one corner, like dimensions
  (i, t, s, o) => {
    const axis = i % 3, step = Math.floor(i / 3) + 1, d = step * 0.78;
    const ox = -(s.hw + 2.6), oy = -1.1;
    const tilt = Math.sin(t * 0.3) * 0.15;
    if (axis === 0) o.set(ox + d, oy, 0);
    else if (axis === 1) o.set(ox, oy + d, 0);
    else o.set(ox - d * 0.45, oy - d * 0.25 + tilt, d * 0.9);
    return 0.62;
  },
];
function paperScene(j, i, t, s, o) {
  if (PAPER_SCENES[j]) return PAPER_SCENES[j](i, t, s, o);
  const th = (i / N) * Math.PI * 2 + t * 0.2;
  o.set(Math.cos(th) * (s.hw + 1.4), Math.sin(th) * (s.hh + 1.4), Math.sin(th) * 0.8);
  return 0.7;
}
// where a screen point (px) lands at a given depth, through the real camera
const _ndc = new THREE.Vector2(), _ray = new THREE.Raycaster();
function pointAtScreen(px, py, d, out) {
  _ndc.set((px / innerWidth) * 2 - 1, -(py / innerHeight) * 2 + 1);
  _ray.setFromCamera(_ndc, camera);
  const dir = _ray.ray.direction;
  return out.copy(dir).multiplyScalar(d / Math.max(0.2, -dir.z)).add(_ray.ray.origin);
}
const markerOn = [];
const forms = {
  about(i, t, p, out) {
    // first screen: a loose cloud in the open space right of the text;
    // second screen (text spans wider): a calm column along the right edge
    const c = cloud[i];
    const k = smoother(clamp((p - 0.3) / 0.35, 0, 1));
    // wide screens: the open space right of the text; tall narrow screens:
    // spread across the free bands above and below the text instead
    const narrow = aspect < 0.9;
    const ax = narrow ? -0.8 + ((i * 0.618) % 1) * 1.6 : 0.62 + (c[0] - 0.25) * 0.5;
    const ay = narrow ? (i % 2 ? 0.42 + ((i * 0.37) % 1) * 0.42 : -0.42 - ((i * 0.53) % 1) * 0.46) : c[1];
    // second screen: loose groups in the free space above and below the text,
    // at different depths, never one straight line
    const top = i % 3 === 0;
    const bx = -0.9 + ((i * 0.618) % 1) * 1.8;
    const by = top ? 0.7 + ((i * 0.37) % 1) * 0.12 : -0.62 - ((i * 0.53) % 1) * 0.28;
    const bd = 10 + ((i * 0.71) % 1) * 8;
    const sc = narrow ? c[3] * 0.58 : c[3]; // smaller on tall narrow screens
    const rows = rects.newsRows;
    markerOn[i] = false;
    if (rows && rows.length && k > 0) {
      // every object joins one column in front of the news: one per item,
      // the rest continue the column below the list, a little smaller
      const D = 9.5;
      const halfH = D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const pxPerWorld = vh / (2 * halfH);
      const first = rows[0], last = rows[rows.length - 1];
      const extra = i - rows.length;
      const mx = first.left + 22;
      const my = extra < 0 ? rows[i].top + 12 : last.bottom + 40 + extra * 46;
      const a = new THREE.Vector3(), m = new THREE.Vector3();
      screenToWorld(ax, ay, c[2], a);
      pointAtScreen(mx, my, D, m); // exact, whatever the camera is doing
      out.lerpVectors(a, m, k);
      markerOn[i] = k > 0.5;
      const markerScale = (extra < 0 ? 34 : 26) / pxPerWorld / 0.85;
      return sc + (markerScale - sc) * k;
    }
    screenToWorld(ax + (bx - ax) * k, ay + (by - ay) * k, c[2] + (bd - c[2]) * k, out);
    return sc + ((narrow ? 0.5 : 0.75) - sc) * k;
  },
  news(i, t, p, out) {
    // they dance around the news.log window: an orbit just outside its edges,
    // each with its own little bounce, passing behind it in depth
    const s = anchorAt(rects.screen || rects.news || EMPTY, 9, out);
    const a = (i / N) * Math.PI * 2 + t * 0.32;
    const bob = Math.sin(t * 2.2 + i * 1.9) * 0.18;
    out.x += Math.cos(a) * (s.hw + 1.1);
    out.y += Math.sin(a) * (s.hh + 0.7) + bob;
    out.z += Math.sin(a + 1.2) * 1.4;
    return 0.8 + 0.15 * Math.sin(t * 1.7 + i);
  },
  pubs(i, t, p, out, active) {
    // every selected paper has its own scene; between papers the two blend
    const s = anchorAt(rects.row || EMPTY, 11.5, out);
    const cx = out.x, cy = out.y, cz = out.z;
    const j0 = Math.floor(active), j1 = Math.min(j0 + 1, PAPER_SCENES.length), f = smoother(active - j0);
    const A = paperScene(j0, i, t, s, pa), B = paperScene(j1, i, t, s, pb);
    pa.lerp(pb, f);
    out.set(cx + pa.x, cy + pa.y, cz + pa.z);
    // the paper's own object is a little larger, wherever it stands
    const own = clamp(1 - Math.abs(i - active), 0, 1);
    return (A + (B - A) * f) * (1 + own * 0.45);
  },
  bg(i, t, p, out) {
    // two loose columns at the sides, clear of the centred list; they drift
    // slowly upward as you read down through the steps
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    const nx = side * (0.8 + ((i * 0.37) % 1) * 0.12);
    const ny = 0.7 - row * 0.36 + p * 0.3 + Math.sin(t * 0.5 + i) * 0.03;
    screenToWorld(nx, ny, 11 + ((i * 0.61) % 1) * 6, out);
    return 0.7;
  },
  end(i, t, p, out) {
    // a small cluster above the contact links, turning as a whole
    const y = 1 - (i + 0.5) / N * 2, r = Math.sqrt(1 - y * y), a = i * 2.39996 + t * 0.25;
    anchorAt(rects.end || EMPTY, 13, out);
    out.y += 2.1;
    out.x += Math.cos(a) * r * 1.4; out.y += y * 1.4; out.z += Math.sin(a) * r * 1.4;
    return 0.62;
  },
};

// ---- where are we on the page? ---------------------------------------------------------------
const chapters = $$('[data-ch]').map(el => ({ el, name: el.dataset.ch }));
const visiblePubs = () => $$('.w-pubs .w-pub').filter(r => !r.closest('[hidden]'));
let pubRows = visiblePubs();
const bgRows = $$('.w-edu');
let vh = innerHeight;
const hs = document.querySelector('.w-hscroll'), track = document.querySelector('.w-track');
const ns = document.querySelector('.w-nscroll'), npin = document.querySelector('.w-npin');
const newsWin = document.querySelector('.w-news');
let newsP = 0;
let lastTx = 0, txCur = 0, txVel = 0;
const trackPapers = track ? [...track.children].map(el => ({ el, title: el.querySelector('.pub-title'), rest: [...el.querySelectorAll('.pub-venue, .pub-authors, .w-links')] })) : [];
const EMPTY = { left: innerWidth * 0.6, top: innerHeight * 0.4, width: 10, height: 10 };
const rects = {};
const newsItems = [...document.querySelectorAll('.w-col-news .news-item')];
const newsCard = document.querySelector('.w-news'), endEl = document.querySelector('.ch-end .name-links');
const state = { a: 'about', b: 'about', t: 0, pA: 0, pB: 0, pubActive: 0, rowsLive: false };
function readPage() {
  // one pass of layout reads per frame
  const mid = vh * 0.5;
  const rectsCh = chapters.map(c => c.el.getBoundingClientRect());
  if (newsCard) rects.news = newsCard.getBoundingClientRect();
  if (endEl) rects.end = endEl.getBoundingClientRect();
  // chapters leave like pages: sink back and soften as their bottom passes up
  chapters.forEach((c, k) => {
    const r = rectsCh[k];
    const leave = k === chapters.length - 1 ? 0 : smoother(clamp((vh * 0.55 - r.bottom) / (vh * 0.5), 0, 1));
    if (Math.abs((c.leave || 0) - leave) > 0.003) { c.el.style.setProperty('--leave', leave.toFixed(3)); c.leave = leave; }
  });
  const centers = rectsCh.map(r => r.top + r.height / 2);
  let i = 0;
  while (i < chapters.length - 1 && centers[i + 1] < mid) i++;
  const j = Math.min(i + 1, chapters.length - 1);
  const span = centers[j] - centers[i];
  state.a = chapters[i].name; state.b = chapters[j].name;
  // hold each arrangement while its chapter fills the screen, blend in the gap between
  const raw = span > 0 ? clamp((mid - centers[i]) / span, 0, 1) : 0;
  state.t = smoother(clamp((raw - 0.25) / 0.5, 0, 1));
  const prog = r => clamp((mid - r.top) / Math.max(1, r.height), 0, 1);
  state.pA = prog(rectsCh[i]); state.pB = prog(rectsCh[j]);
  // the row nearest the middle of the screen
  scrubText();
  rects.newsRows = newsItems.length ? newsItems.filter(el => !el.closest('[hidden]')).map(el => el.getBoundingClientRect()) : null;
  if (newsWin && newsWin.closest('.w-step-two')) {
    const r = newsWin.getBoundingClientRect();
    // news.log stays hidden until its screen arrives, then rises in and types
    const col = newsWin.closest('.w-col-news');
    const arrive = clamp((vh * 0.85 - r.top) / (vh * 0.3), 0, 1);
    if (col) { col.style.opacity = smoother(arrive).toFixed(3); col.style.transform = `translateY(${((1 - smoother(arrive)) * 40).toFixed(1)}px)`; }
    showLog(clamp((vh * 0.75 - r.top) / (vh * 0.5), 0, 1));
  }
  if (ns) {
    const r = ns.getBoundingClientRect();
    newsP = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    rects.npin = npin.getBoundingClientRect();
  }
  if (hs) {
    // vertical scroll through the pinned section slides the track sideways
    const r = hs.getBoundingClientRect();
    const k = clamp(-r.top / Math.max(1, r.height - vh), 0, 1);
    // scrolling only chooses WHICH paper; the slide itself is animated (frame)
    state.pubIdx = clamp(Math.round(k * (track.children.length - 1)), 0, track.children.length - 1);
    state.pinned = r.top <= 1 && r.bottom >= vh - 1;
  }
  const rowIn = rows => {
    let best = -1, bd = Infinity;
    rows.forEach((r, k) => {
      const b = r.getBoundingClientRect();
      const d = Math.hypot(b.left + b.width / 2 - innerWidth / 2, b.top + b.height / 2 - mid);
      if (d < bd) { bd = d; best = k; }
    });
    return best;
  };
  const inPubs = state.a === 'pubs' || state.b === 'pubs';
  const inBg = state.a === 'bg' || state.b === 'bg';
  const pr = inPubs ? rowIn(pubRows) : -1, br = inBg ? rowIn(bgRows) : -1;
  if (pr >= 0) { state.pubActive = +pubRows[pr].dataset.pub; rects.row = (pubRows[pr].querySelector('.pub-title') || pubRows[pr]).getBoundingClientRect(); }
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
  pointerOn = true;
  // the news.log sheet leans a little toward the cursor
  if (newsWin) { newsWin.style.setProperty('--ry', `${(-9 + lean.tx * 6).toFixed(2)}deg`); newsWin.style.setProperty('--rx', `${(4 - lean.ty * 4).toFixed(2)}deg`); }
}, { passive: true });
document.addEventListener('pointerleave', () => { pointerOn = false; });

// ---- objects you can click: each one is a paper ---------------------------------------------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let hovered = -1;
// only empty page space counts, so text and links keep working normally
const onEmpty = el => !el.closest('a, button, input, .w-news, .w-file, .w-paper');
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(objs.map(o => o.mesh), false)[0];
  return hit ? objs.findIndex(o => o.mesh === hit.object) : -1;
}
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  const i = onEmpty(e.target) ? pick(e) : -1;
  if (i !== hovered) { hovered = i; root.classList.toggle('obj-hover', i >= 0); }
}, { passive: true });
const paper = document.getElementById('w-paper'), leader = document.querySelector('.w-leader');
let pinned = -1;
function openPaper(i, x, y) {
  const src = document.querySelector(`.w-pubs .w-pub[data-pub="${i}"]`);
  if (!src || !paper) return;
  const body = paper.querySelector('.w-paper-body');
  body.replaceChildren(src.cloneNode(true));
  const art = body.firstElementChild;
  art.removeAttribute('data-row'); art.classList.remove('on');
  // the clone carries split words; show them all at once
  art.querySelectorAll('[data-split], [data-rise]').forEach(el => el.classList.add('in'));
  paper.querySelector('.w-paper-venue').textContent = src.querySelector('.pub-venue')?.textContent || '';
  paper.hidden = false;
  // the note sits beside the object, on whichever side has room
  pv.copy(objs[i].pos).project(camera);
  const ox = (pv.x * 0.5 + 0.5) * innerWidth, oy = (-pv.y * 0.5 + 0.5) * innerHeight;
  const w = paper.offsetWidth, h = paper.offsetHeight;
  const right = ox < innerWidth * 0.55;
  const left = clamp(right ? ox + 90 : ox - 90 - w, 16, innerWidth - w - 16);
  const top = clamp(oy - h * 0.35, 70, innerHeight - h - 16);
  Object.assign(paper.style, { left: `${left}px`, top: `${top}px` });
  // leader line from the object to the note's edge
  const ex = right ? left : left + w, ey = top + 28;
  leader.style.setProperty('--lx', `${ox}px`); leader.style.setProperty('--ly', `${oy}px`);
  leader.style.setProperty('--la', `${Math.atan2(ey - oy, ex - ox)}rad`);
  leader.style.width = `${Math.hypot(ex - ox, ey - oy)}px`;
  paper.classList.remove('open'); leader.classList.remove('open'); void paper.offsetWidth;
  leader.classList.add('open'); paper.classList.add('open');
  pinned = i;
  objs[i].rot.y += 2.5; // a happy spin for the one you picked
  paper.querySelector('.w-paper-close').focus({ preventScroll: true });
}
function closePaper() {
  if (!paper || paper.hidden) return;
  paper.classList.remove('open'); leader.classList.remove('open'); pinned = -1;
  setTimeout(() => { if (!paper.classList.contains('open')) paper.hidden = true; }, 700);
}
const grab = { i: -1, d: 10, x: 0, y: 0, moved: 0, wx: 0, wy: 0, wz: 0, last: 0 };
let justDragged = false;
function pointerToDepth(e, d, out) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  return out.copy(ray.ray.direction).multiplyScalar(d / Math.max(0.2, -ray.ray.direction.z)).add(ray.ray.origin);
}
addEventListener('pointerdown', e => {
  if (e.button !== 0 || !onEmpty(e.target)) return;
  const i = pick(e);
  if (i < 0) return;
  grab.i = i; grab.d = Math.max(3, -objs[i].pos.z); grab.x = e.clientX; grab.y = e.clientY; grab.moved = 0;
  objs[i].held = new THREE.Vector3().copy(objs[i].pos);
  root.classList.add('obj-grab');
  e.preventDefault();
});
addEventListener('pointermove', e => {
  if (grab.i < 0) return;
  grab.moved = Math.max(grab.moved, Math.hypot(e.clientX - grab.x, e.clientY - grab.y));
  pointerToDepth(e, grab.d, objs[grab.i].held);
}, { passive: true });
addEventListener('pointerup', () => {
  if (grab.i < 0) return;
  const o = objs[grab.i];
  justDragged = grab.moved > 6;
  o.held = null; o.free = 1.6; // seconds of free flight before the spring takes over again
  grab.i = -1; root.classList.remove('obj-grab');
});
addEventListener('click', e => {
  if (justDragged) { justDragged = false; return; }
  if (paper && !paper.hidden && !e.target.closest('.w-paper')) { closePaper(); return; }
  if (!onEmpty(e.target)) return;
  const i = pick(e);
  if (i >= 0) openPaper(i, e.clientX, e.clientY);
});
paper?.querySelector('.w-paper-close').addEventListener('click', closePaper);
addEventListener('keydown', e => { if (e.key === 'Escape') closePaper(); });

// news "show older" / "show less"
const newsMore = document.querySelector('.news-more'), newsOlder = document.getElementById('news-older');
if (newsMore && newsOlder) newsMore.addEventListener('click', () => {
  const open = newsOlder.hidden;
  newsOlder.hidden = !open;
  newsMore.setAttribute('aria-expanded', String(open));
  newsMore.textContent = open ? 'show less' : 'show older';
});

// "All N publications" opens the rest of the list in place
const toggle = document.getElementById('toggle-publications'), more = document.getElementById('all-publications');
if (toggle && more) {
  const label = toggle.textContent;
  toggle.addEventListener('click', () => {
    const open = more.hidden;
    more.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Show selected only' : label;
    if (open) more.querySelectorAll('[data-split], [data-rise]').forEach(el => el.classList.add('in'));
    pubRows = visiblePubs();
  });
}

// ---- smooth scrolling: the wheel sets a target, the page eases to it ------------------------
const se = document.scrollingElement || document.documentElement;
const glide = { target: se.scrollTop, on: false, last: 0 };
const maxScroll = () => se.scrollHeight - innerHeight;
function glideTo(y) {
  glide.target = clamp(y, 0, maxScroll());
  if (!glide.on) { glide.on = true; glide.last = 0; requestAnimationFrame(glideStep); }
}
function glideStep(now) {
  const dt = Math.min(0.05, (now - (glide.last || now)) / 1000) || 1 / 60; glide.last = now;
  const cur = se.scrollTop;
  const next = cur + (glide.target - cur) * (1 - Math.exp(-dt * 9));
  if (Math.abs(glide.target - next) < 0.6) { se.scrollTop = glide.target; glide.on = false; armSnap(); return; }
  se.scrollTop = next;
  requestAnimationFrame(glideStep);
}
addEventListener('wheel', e => {
  if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.target.closest('.w-paper')) return;
  // inside news.log: let the log scroll natively until it hits its end
  const box = e.target.closest('.news-list');
  if (box && box.scrollHeight > box.clientHeight + 1) {
    const atTop = box.scrollTop <= 0, atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 1;
    if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atEnd)) return;
  }
  e.preventDefault();
  if (!glide.on) glide.target = se.scrollTop;
  glideTo(glide.target + e.deltaY * (e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1));
}, { passive: false });
// scrollbar, keys, touch: keep the target in step so the wheel never fights them
addEventListener('scroll', () => { if (!glide.on) { glide.target = se.scrollTop; armSnap(); } }, { passive: true });

// in the sideways paper scene, come to rest with a paper exactly centred
let snapTimer = 0;
function armSnap() {
  clearTimeout(snapTimer);
  snapTimer = setTimeout(() => {
    if (glide.on) return;
    const y0 = se.scrollTop, stops = [];
    // each About paragraph centred on screen
    for (const st of document.querySelectorAll('.w-step')) {
      const r = st.getBoundingClientRect();
      stops.push(y0 + r.top + r.height / 2 - vh / 2);
    }
    // each paper in the sideways scene
    if (hs) {
      const r = hs.getBoundingClientRect(), span = r.height - vh, n = track.children.length;
      for (let j = 0; j < n && span > 0; j++) stops.push(y0 + r.top + (n > 1 ? (j / (n - 1)) * span : 0));
    }
    let best = null, bd = Infinity;
    for (const y of stops) { const d = Math.abs(y - y0); if (d < bd) { bd = d; best = y; } }
    // only when we stopped close to one; elsewhere scrolling stays free
    if (best !== null && bd > 2 && bd < vh * 0.42) glideTo(best);
  }, 130);
}

// ---- theme / size -------------------------------------------------------------------------------
function theme() {
  const p = palette[dark.matches ? 'dark' : 'light'];
  for (const t in mats) mats[t].color.set(p[t]);
  body.color.set(p.clay);
  paperMat.color.set(getComputedStyle(root).getPropertyValue('--card').trim() || '#ffffff');
  scene.environmentIntensity = dark.matches ? 0.4 : 1;
  key.intensity = dark.matches ? 0.7 : 1.2;
  rim.intensity = dark.matches ? 0.6 : 0.9;
}
let tanHalf = Math.tan(THREE.MathUtils.degToRad(17.5));
function resize() {
  vh = innerHeight;
  small = innerWidth <= 640;
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  aspect = innerWidth / innerHeight;
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}

// ---- loop -----------------------------------------------------------------------------------------
const ta = new THREE.Vector3(), tb = new THREE.Vector3();
const pv = new THREE.Vector3();
let lastSkew = 0, pointerOn = false;
let last = 0, t = 0, pubA = 0, scrollV = 0, lastY = scrollY, running = false;
function frame(now) {
  if (!running) return;
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (last || now)) / 1000) || 1 / 60;
  last = now; t += dt;
  readPage();

  // the wheel turns smoothly to the active paper, the short way round
  // slide the track to the chosen paper with a soft spring; it always lands centred
  if (track) {
    // a critically damped spring: starts gently, glides, settles without a bump
    const target = -(state.pubIdx || 0) * innerWidth;
    const kS = 38, kD = 2 * Math.sqrt(kS);
    txVel += ((target - txCur) * kS - txVel * kD) * dt;
    txCur += txVel * dt;
    if (Math.abs(target - txCur) < 0.2 && Math.abs(txVel) < 2) { txCur = target; txVel = 0; }
    if (Math.abs(txCur - lastTx) > 0.1) { track.style.setProperty('--tx', `${txCur.toFixed(1)}px`); lastTx = txCur; }
    // each paper eases in layers: title and authors travel at different speeds,
    // and fade and settle by how far they are from the centre
    const pos = -txCur / innerWidth;
    for (let k = 0; k < trackPapers.length; k++) {
      const d = k - pos, a = Math.abs(d);
      if (a > 1.6) continue;
      const P = trackPapers[k];
      P.el.style.opacity = (1 - Math.min(1, a) * 0.85).toFixed(3);
      if (P.title) P.title.style.transform = `translate3d(${(d * -70).toFixed(1)}px,0,0)`;
      if (P.rest) for (const r of P.rest) r.style.transform = `translate3d(${(d * -150).toFixed(1)}px,0,0)`;
    }
  }
  const slidePos = -txCur / innerWidth; // 0..n-1, continuous while sliding
  let diff = (state.pinned ? slidePos : state.pubActive) - pubA;
  pubA += diff * (1 - Math.exp(-dt * 5));
  scrollV += ((scrollY - lastY) / Math.max(dt, 1e-3) - scrollV) * 0.2; lastY = scrollY;

  lean.x += (lean.tx - lean.x) * (1 - Math.exp(-dt * 3));
  lean.y += (lean.ty - lean.y) * (1 - Math.exp(-dt * 3));
  camera.position.set(lean.x * 0.55, -lean.y * 0.35, 0);
  camera.lookAt(lean.x * 0.15, -lean.y * 0.1, -10);
  camera.updateMatrixWorld();

  // text bends a touch with scroll speed
  const skew = clamp(scrollV * -0.0009, -2.2, 2.2);
  if (Math.abs(skew - lastSkew) > 0.01) { root.style.setProperty('--skew', `${skew.toFixed(2)}deg`); lastSkew = skew; }
  const speed = Math.min(Math.abs(scrollV), 4000);

  const fa = forms[state.a], fb = forms[state.b];
  objs.forEach((o, i) => {
    const sa = fa(i, t, state.pA, ta, pubA);
    const sb = fb(i, t, state.pB, tb, pubA);
    ta.lerp(tb, state.t);
    const sc = sa + (sb - sa) * state.t;
    // fast scrolling scatters them a little; they gather again when you stop
    ta.x *= 1 + speed * 0.00006; ta.y *= 1 + speed * 0.00004;
    // the cursor pushes objects aside (measured on screen, applied in depth)
    if (pointerOn && grab.i < 0) {
      pv.copy(o.pos).project(camera);
      const dx = (pv.x - lean.tx) * aspect, dy = pv.y + lean.ty, d = Math.hypot(dx, dy);
      const R = 0.16 + (o.scale * 0.9) / Math.max(1, -o.pos.z) * 2.2; // bigger on screen, wider reach
      if (d < R && d > 1e-4) {
        // only a gentle lean away; real moving is grab-and-drag
        const f = (1 - d / R) ** 2 * 0.45 * (-o.pos.z / 10);
        ta.x += (dx / d) * f; ta.y += (dy / d) * f;
        o.rot.y += f * dt * 1.5;
      }
    }
    // gentle float, so nothing is ever perfectly still
    ta.x += Math.sin(t * 0.6 + o.phase) * 0.08;
    ta.y += Math.sin(t * 0.8 + o.phase * 1.3) * 0.1;
    // keep every object fully on screen, whatever the window size
    // (markers follow their news item, even when it scrolls off)
    if (!markerOn[i]) {
      const zc = Math.max(1, camera.position.z - ta.z);
      const hh = zc * tanHalf, hw = hh * aspect, rr = 0.8 * Math.max(sc, 0.3) + 0.15;
      ta.x = clamp(ta.x, -hw + rr, hw - rr);
      ta.y = clamp(ta.y, -hh + rr + 0.15, hh - rr - 0.35); // room for the header
    }
    // spring toward the target: a little lag makes the moves feel physical
    if (o.held) {
      // in the hand: follow it closely; velocity is what you throw with
      const nx = o.pos.x + (o.held.x - o.pos.x) * (1 - Math.exp(-dt * 22));
      const ny = o.pos.y + (o.held.y - o.pos.y) * (1 - Math.exp(-dt * 22));
      o.vel.set((nx - o.pos.x) / dt, (ny - o.pos.y) / dt, 0);
      o.pos.x = nx; o.pos.y = ny;
      o.rot.x += o.vel.y * dt * 0.4; o.rot.y += o.vel.x * dt * 0.4;
    } else {
      // thrown: fly free with a little drag, the spring fades back in
      const free = o.free > 0 ? (o.free -= dt, clamp(o.free / 1.6, 0, 1)) : 0;
      const k = 26 * (1 - free * 0.97), c = 2 * Math.sqrt(26) * 0.9 * (1 - free * 0.85);
      o.vel.x += ((ta.x - o.pos.x) * k - o.vel.x * c) * dt;
      o.vel.y += ((ta.y - o.pos.y) * k - o.vel.y * c) * dt;
      o.vel.z += ((ta.z - o.pos.z) * k - o.vel.z * c) * dt;
      if (free > 0) { o.rot.x += o.vel.y * dt * 0.3; o.rot.y += o.vel.x * dt * 0.3; }
      o.pos.addScaledVector(o.vel, dt);
    }
    o.scale += (sc * (i === hovered ? 1.18 : 1) - o.scale) * (1 - Math.exp(-dt * (i === hovered ? 9 : 4)));
    // turn: own pace, faster for the paper in front, a kick from scrolling
    const boost = (state.a === 'pubs' || state.b === 'pubs') && i === state.pubActive ? 3.2 : 1;
    o.rot.x += o.spin.x * dt * boost + scrollV * 0.00004;
    o.rot.y += o.spin.y * dt * boost;
    o.rot.z += o.spin.z * dt;
    o.mesh.position.copy(o.pos);
    o.mesh.rotation.copy(o.rot);
    o.mesh.scale.setScalar(Math.max(0.001, o.scale));
  });
  placePrinter(dt);
  renderer.render(scene, camera);
}

let lapW = 0, contentPx = 0, feedPx = 0, newsPs = 0;
const newsBar = document.querySelector('.w-news .card-bar');
function placePrinter(dt) {
  if (!ns) { printer.visible = false; return; } // news.log lives on the About screen now
  const w = (state.a === 'news' ? 1 - state.t : 0) + (state.b === 'news' ? state.t : 0);
  lapW += (w - lapW) * (1 - Math.exp(-dt * 5));
  printer.visible = lapW > 0.01 && !!rects.npin;
  if (!printer.visible) { if (newsWin) newsWin.style.opacity = '0'; rects.screen = null; return; }
  anchorAt(rects.npin, small ? 10.5 : 8.6, printer.position);
  printer.position.y -= small ? 2.4 : 2.05;
  printer.position.z -= (1 - lapW) * 6; // it arrives from the back
  printer.rotation.y = lean.x * 0.1 + Math.sin(t * 0.35) * 0.03;
  // scroll prints: letters appear, the strip grows to fit what is printed
  // typing follows the scroll through a soft ease, so it never jumps per wheel tick
  newsPs += (newsP - newsPs) * (1 - Math.exp(-dt * 7));
  showLog((newsPs - 0.1) / 0.72);
  printer.updateMatrixWorld(true);
  if (newsWin) {
    const dist = camera.position.distanceTo(printer.position);
    const worldPerPx = (2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / vh;
    // the paper feeds out continuously toward the height of what is printed;
    // text rides on it, so new lines emerge from the slot instead of popping
    // height of what is printed so far (not the window's own height)
    contentPx = (newsBar ? newsBar.offsetHeight : 0) + (log.list ? log.list.offsetHeight : 0) + 12;
    const maxH = small ? 3.4 : 3.1;
    const want = log.shown > 0 ? Math.min(maxH, (contentPx + 14) * worldPerPx) : 0.001;
    paperH += (want - paperH) * (1 - Math.exp(-dt * 4.5));
    feedPx += (Math.max(0, contentPx + 14 - maxH / worldPerPx) - feedPx) * (1 - Math.exp(-dt * 4.5));
    newsWin.style.setProperty('--feed', `${feedPx.toFixed(1)}px`);
  }
  shapePaper(paperH);
  // fit the HTML onto the strip as the camera sees it (the flat lower part)
  const hw = paperW / 2;
  paperCorners[0].set(-hw, 0, 0); paperCorners[1].set(hw, 0, 0);
  paperCorners[2].set(-hw, paperH, 0); paperCorners[3].set(hw, paperH, 0);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const c of paperCorners) {
    cw.copy(c).applyMatrix4(strip.matrixWorld).project(camera);
    const x = (cw.x * 0.5 + 0.5) * innerWidth, y = (-cw.y * 0.5 + 0.5) * vh;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  rects.screen = { left: x0, top: y0, width: x1 - x0, height: Math.max(40, y1 - y0) };
  if (!newsWin) return;
  const pn = rects.npin, ww = x1 - x0;
  Object.assign(newsWin.style, {
    width: `${ww.toFixed(1)}px`, height: `${Math.max(0, y1 - y0).toFixed(1)}px`,
    transform: `translate(${(x0 - pn.left).toFixed(1)}px, ${(y0 - pn.top).toFixed(1)}px)`,
    opacity: String(Math.min(1, lapW * 1.3)),
  });
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
