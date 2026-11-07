// /world/ — the immersive view of the homepage.
//
// Built on proven open-source parts rather than hand-rolled scroll code:
//   - Lenis: smooth wheel scrolling on desktop; phones keep native touch scroll
//   - GSAP ScrollTrigger: pinned sections, the sideways paper scene, snapping,
//     separate desktop/phone setups (gsap.matchMedia), positions measured once
//     per refresh instead of every frame
//   - GSAP SplitText: line/letter reveals that re-split on resize
//   - three.js: the floating objects, drawn on one fixed canvas
// Everything runs on GSAP's single ticker: one read pass (layout), then tweens,
// then the 3D update and render.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const dark = matchMedia('(prefers-color-scheme: dark)');
const PHONE = '(max-width: 760px)';
const isPhone = () => matchMedia(PHONE).matches;

// ============================================================================
// Shared state, written by ScrollTrigger callbacks and read by the 3D loop.
// ============================================================================
const W = {
  chapter: 'about',     // which arrangement the objects are in
  blend: 1,             // 0 → 1 while moving from the previous arrangement
  newsReveal: 0,        // desktop: research alone (0) → news.log in (1)
  pubPos: 0,            // continuous paper position in the sideways scene
  bgP: 0,               // progress through Background
  page: 0,              // phones: index of the page in front
  phone: isPhone(),
  activity: 0,          // 0 still … 1 scrolling / transitioning
};

// ============================================================================
// Text: the "reach out" link, line/letter reveals, years counting up
// ============================================================================
function linkPhrase(scope, phrase, href) {
  // wrap a phrase that sits in a single text node in a link (keeps the words)
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const n = walker.currentNode, i = n.textContent.indexOf(phrase);
    if (i < 0) continue;
    const range = document.createRange();
    range.setStart(n, i); range.setEnd(n, i + phrase.length);
    const a = document.createElement('a'); a.href = href;
    range.surroundContents(a);
    return;
  }
}
const mail = $('.w-top a[href^="mailto:"]');
if (mail) linkPhrase($('.pg-research') || document.body, 'reach out', mail.getAttribute('href'));

function countUp(el) {
  const final = el.textContent;
  if (!/\d{4}/.test(final)) return;
  el.setAttribute('aria-label', final);
  const o = { k: 0 };
  gsap.to(o, {
    k: 1, duration: 1.1, ease: 'power3.out',
    onUpdate: () => { let n = 0; el.textContent = final.replace(/\d{4}/g, m => String(Math.round(+m - (1 - o.k) * (18 + 6 * n++)))); },
    onComplete: () => { el.textContent = final; },
  });
}

if (!root.classList.contains('world')) {
  // reduced motion (or the boot timed out): the plain page stays as it is
  throw new Error('world: plain page');
}

// ============================================================================
// Renderer, scene, objects
// ============================================================================
const PHONE_AT_LOAD = W.phone;
const renderer = new THREE.WebGLRenderer({
  antialias: !PHONE_AT_LOAD, alpha: true,
  powerPreference: PHONE_AT_LOAD ? 'default' : 'high-performance',
});
renderer.domElement.id = 'world';
renderer.domElement.setAttribute('aria-hidden', 'true');
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
const keyLight = new THREE.DirectionalLight(0xffffff, 1.2); keyLight.position.set(-4, 6, 6);
const rimLight = new THREE.DirectionalLight(0xdbe4f3, 0.9); rimLight.position.set(5, 2, -6);
scene.add(keyLight, rimLight);

// phones get lighter geometry and a cheaper material; the look stays the same
const seg = PHONE_AT_LOAD ? 0.6 : 1;
const S = n => Math.max(8, Math.round(n * seg));
const kinds = [
  () => new THREE.SphereGeometry(0.42, S(48), S(32)),
  () => new RoundedBoxGeometry(0.72, 0.72, 0.72, PHONE_AT_LOAD ? 2 : 4, 0.08),
  () => new THREE.CylinderGeometry(0.3, 0.3, 0.9, S(48)),
  () => new THREE.ConeGeometry(0.4, 0.85, S(48)),
  () => new THREE.TorusGeometry(0.34, 0.13, S(24), S(64)),
  () => new THREE.CapsuleGeometry(0.2, 0.55, 6, S(24)),
  () => new THREE.IcosahedronGeometry(0.42, 0),
  () => new THREE.SphereGeometry(0.3, S(40), S(24)),
  () => new RoundedBoxGeometry(0.95, 0.34, 0.6, PHONE_AT_LOAD ? 2 : 4, 0.06),
  () => new THREE.CylinderGeometry(0.42, 0.42, 0.2, S(48)),
];
const tones = ['clay', 'steel', 'clay', 'ink', 'clay', 'grey', 'steel', 'ink', 'clay', 'grey'];
const palette = {
  light: { clay: 0xf6f5f2, steel: 0xb2c1d9, ink: 0x2a2a2e, grey: 0xc9cbd0 },
  dark: { clay: 0x8f8a82, steel: 0x55607a, ink: 0x2a2826, grey: 0x5a5753 },
};
const mats = {};
for (const t of ['clay', 'steel', 'ink', 'grey']) {
  mats[t] = PHONE_AT_LOAD
    ? new THREE.MeshStandardMaterial({ roughness: 0.48 })
    : new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.35 });
}
const N = kinds.length;
const objs = kinds.map((make, i) => {
  const mesh = new THREE.Mesh(make(), mats[tones[i]]);
  scene.add(mesh);
  return {
    mesh, i,
    pos: new THREE.Vector3(0, 0, -40), vel: new THREE.Vector3(),
    from: new THREE.Vector3(), fromScale: 0.001,
    scale: 0.001, rot: new THREE.Euler(i * 0.9, i * 1.7, i * 0.4),
    spin: new THREE.Vector3(0.05 + (i % 3) * 0.025, 0.08 + (i % 4) * 0.02, 0.03),
    phase: i * 1.37, held: null, free: 0,
  };
});

function theme() {
  const p = palette[dark.matches ? 'dark' : 'light'];
  for (const t in mats) mats[t].color.set(p[t]);
  scene.environmentIntensity = dark.matches ? 0.4 : 1;
  keyLight.intensity = dark.matches ? 0.7 : 1.2;
  rimLight.intensity = dark.matches ? 0.6 : 0.9;
}

let vw = innerWidth, vh = innerHeight, aspect = vw / vh, tanHalf = Math.tan(THREE.MathUtils.degToRad(17.5));
function resize() {
  vw = innerWidth; vh = innerHeight; aspect = vw / vh;
  W.phone = isPhone();
  renderer.setPixelRatio(Math.min(devicePixelRatio, W.phone ? 1.5 : 2));
  renderer.setSize(vw, vh, false);
  camera.aspect = aspect; camera.updateProjectionMatrix();
  tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}

// where a screen point (px) lands at a given distance, through the real camera
const _ndc = new THREE.Vector2(), _ray = new THREE.Raycaster();
function pointAtScreen(px, py, d, out) {
  _ndc.set((px / vw) * 2 - 1, -(py / vh) * 2 + 1);
  _ray.setFromCamera(_ndc, camera);
  const dir = _ray.ray.direction;
  return out.copy(dir).multiplyScalar(d / Math.max(0.2, -dir.z)).add(_ray.ray.origin);
}
// size in px → object scale at distance d (objects are ~0.85 units across)
const pxToScale = (px, d) => (px / (vh / (2 * d * tanHalf))) / 0.85;

// ============================================================================
// Arrangements. Each returns [target position, scale] for object i.
// ============================================================================
// opening page: each object its own spot in the open space right of the text
const OPEN = [
  [0.56, 0.62, 11, 0.8], [0.84, 0.5, 13, 0.85], [0.62, 0.22, 12, 0.75], [0.9, 0.08, 15, 0.9],
  [0.52, -0.14, 10, 0.7], [0.8, -0.3, 11, 0.8], [0.6, -0.55, 13, 0.85], [0.9, -0.66, 12, 0.75],
  [0.72, 0.82, 16, 0.7], [0.7, -0.84, 15, 0.7],
];
const screenPoint = (nx, ny, d, out) => pointAtScreen((nx * 0.5 + 0.5) * vw, (-ny * 0.5 + 0.5) * vh, d, out);

// layout reads, taken once per frame before anything is written
const R = { newsList: null, rowOff: [], newsBox: null, title: null, endIcons: null };

const _a = new THREE.Vector3(), _b = new THREE.Vector3();
const markerOn = [];
const FORMS = {
  about(i, t, out) {
    const g = OPEN[i];
    screenPoint(g[0], g[1], g[2], _a);
    let sc = g[3];
    // desktop: as news.log comes in, the objects line up in front of the
    // visible items; the rest wait far back below the window
    const k = W.phone ? 0 : W.newsReveal;
    markerOn[i] = false;
    if (k > 0 && R.newsBox && R.rowOff.length) {
      const box = R.newsBox, D = 9.5;
      const off = R.rowOff[i];
      const y = off !== undefined ? box.top + off - R.newsList.scrollTop + 12 : -1;
      if (off !== undefined && y > box.top + 6 && y < box.bottom - 10) {
        pointAtScreen(box.left + 22, y, D, _b);
        sc = lerp(sc, pxToScale(34, D), k);
        markerOn[i] = k > 0.5;
      } else {
        const far = 30 + (i % 3) * 6;
        const mx = box.left + box.width * 0.55 + Math.sin(t * 0.35 + i * 1.7) * 80 + ((i * 37) % 60) - 30;
        pointAtScreen(mx, box.bottom + 46 + Math.cos(t * 0.28 + i * 1.3) * 16, far, _b);
        sc = lerp(sc, pxToScale(22, D) * (far / D), k);
        markerOn[i] = k > 0.5;
      }
      out.lerpVectors(_a, _b, k);
      return sc;
    }
    out.copy(_a);
    return sc;
  },
  pubs(i, t, out) {
    // each selected paper has its own scene around its title; between papers
    // the two scenes blend with the sideways slide
    const tr = R.title || { left: vw * 0.25, top: vh * 0.4, width: vw * 0.5, height: 120 };
    const D = 11.5;
    pointAtScreen(tr.left + tr.width / 2, tr.top + tr.height / 2, D, out);
    const halfH = D * tanHalf;
    const s = { hw: (tr.width / vw) * halfH * aspect, hh: (tr.height / vh) * halfH };
    const p = W.pubPos, j0 = Math.floor(p), f = smoother(p - j0);
    const A = paperScene(j0, i, t, s, _a), B = paperScene(j0 + 1, i, t, s, _b);
    _a.lerp(_b, f);
    out.add(_a);
    const own = clamp(1 - Math.abs(i - p), 0, 1);
    return (A + (B - A) * f) * (1 + own * 0.45);
  },
  bg(i, t, out) {
    // two loose columns at the sides, clear of the centred list
    const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
    const nx = side * (0.8 + ((i * 0.37) % 1) * 0.12);
    const ny = 0.7 - row * 0.36 + W.bgP * 0.3 + Math.sin(t * 0.5 + i) * 0.03;
    screenPoint(nx, ny, 11 + ((i * 0.61) % 1) * 6, out);
    return 0.7;
  },
  end(i, t, out) {
    const r = R.endIcons || { left: vw / 2 - 100, top: vh * 0.7, width: 200, height: 40 };
    const y = 1 - (i + 0.5) / N * 2, rr = Math.sqrt(1 - y * y), a = i * 2.39996 + t * 0.25;
    pointAtScreen(r.left + r.width / 2, r.top - 210, 13, out);
    out.x += Math.cos(a) * rr * 1.4; out.y += y * 1.4; out.z += Math.sin(a) * rr * 1.4;
    return 0.62;
  },
};
const PAPER_SCENES = [
  // two groups either side of the title, mirror images turning into line
  (i, t, s, o) => {
    const side = i < N / 2 ? -1 : 1, k = i % (N / 2), a = (k / (N / 2)) * Math.PI * 2 + t * 0.35 * side;
    o.set(side * (s.hw + 1.9) + Math.cos(a) * 0.76, Math.sin(a) * 0.95, Math.sin(a + 0.6) * 0.86);
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
    const axis = i % 3, d = (Math.floor(i / 3) + 1) * 0.78, ox = -(s.hw + 2.6), oy = -1.1;
    if (axis === 0) o.set(ox - d, oy, 0);
    else if (axis === 1) o.set(ox, oy + d, 0);
    else o.set(ox - d * 0.45, oy - d * 0.25 + Math.sin(t * 0.3) * 0.15, d * 0.9);
    return 0.62;
  },
];
function paperScene(j, i, t, s, o) {
  if (PAPER_SCENES[j]) return PAPER_SCENES[j](i, t, s, o);
  const th = (i / N) * Math.PI * 2 + t * 0.2;
  o.set(Math.cos(th) * (s.hw + 1.4), Math.sin(th) * (s.hh + 1.4), Math.sin(th) * 0.8);
  return 0.7;
}

// phones: the top part of every page belongs to the objects; each page deals
// them into a fresh arrangement; on a paper page its own object is large
const orders = {};
function order(key) {
  if (orders[key]) return orders[key];
  const idx = [...Array(N).keys()];
  let seed = key * 9301 + 49297;
  for (let k = idx.length - 1; k > 0; k--) { seed = (seed * 9301 + 49297) % 233280; const j = Math.floor((seed / 233280) * (k + 1)); [idx[k], idx[j]] = [idx[j], idx[k]]; }
  return (orders[key] = idx);
}
function phoneForm(i, t, out) {
  const page = pages[W.page];
  const hero = page && page.pub !== undefined && i === page.pub;
  const top = 108, bandH = Math.max(140, vh * 0.38 - top);
  const slot = order(W.page).indexOf(i);
  let sx, sy, px;
  if (hero) { sx = vw / 2; sy = top + bandH * 0.52; px = 96; }
  else {
    const col = slot % 5, row = Math.floor(slot / 5);
    const fx = row ? [0.16, 0.36, 0.56, 0.76, 0.94][col] : [0.06, 0.26, 0.46, 0.66, 0.86][col];
    sx = 18 + fx * (vw - 36);
    sy = top + bandH * (row ? 0.82 : 0.2) + Math.sin(t * 0.6 + i) * 3;
    px = (34 + ((i * 7 + W.page * 3) % 4) * 7) * (page && page.pub !== undefined ? 0.75 : 1);
  }
  const D = 9.5 + (hero ? 0 : slot % 3);
  pointAtScreen(sx, sy, D, out);
  return pxToScale(px, D);
}

// ============================================================================
// Moving between arrangements: a designed, timed glide (not scroll-dragged).
// The objects leave from where they are, arc back a little into depth, and
// settle into the new arrangement.
// ============================================================================
let blendTween = null;
function setChapter(name) {
  if (W.chapter === name) return;
  W.chapter = name;
  startBlend(1.2);
}
function startBlend(duration) {
  for (const o of objs) { o.from.copy(o.pos); o.fromScale = o.scale; }
  W.blend = 0;
  if (blendTween) blendTween.kill();
  blendTween = gsap.to(W, { blend: 1, duration, ease: 'power3.inOut', onUpdate: wake });
}

// ============================================================================
// Pointer: camera lean, hover, grab and throw, click → paper note
// ============================================================================
const lean = { x: 0, y: 0, tx: 0, ty: 0 };
let pointerOn = false, hovered = -1;
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const onEmpty = el => !el.closest('a, button, input, .w-news, .w-paper');
function pick(e) {
  ndc.set((e.clientX / vw) * 2 - 1, -(e.clientY / vh) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(objs.map(o => o.mesh), false)[0];
  return hit ? objs.findIndex(o => o.mesh === hit.object) : -1;
}
const grab = { i: -1, d: 10, x: 0, y: 0, moved: 0 };
let justDragged = false;
addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  lean.tx = (e.clientX / vw) * 2 - 1; lean.ty = (e.clientY / vh) * 2 - 1; pointerOn = true;
  if (grab.i >= 0) {
    grab.moved = Math.max(grab.moved, Math.hypot(e.clientX - grab.x, e.clientY - grab.y));
    ndc.set((e.clientX / vw) * 2 - 1, -(e.clientY / vh) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    objs[grab.i].held.copy(ray.ray.direction).multiplyScalar(grab.d / Math.max(0.2, -ray.ray.direction.z)).add(ray.ray.origin);
  } else {
    const i = onEmpty(e.target) ? pick(e) : -1;
    if (i !== hovered) { hovered = i; root.classList.toggle('obj-hover', i >= 0); }
  }
  wake();
}, { passive: true });
document.addEventListener('pointerleave', () => { pointerOn = false; });
addEventListener('pointerdown', e => {
  if (e.button !== 0 || e.pointerType !== 'mouse' || !onEmpty(e.target)) return;
  const i = pick(e);
  if (i < 0) return;
  Object.assign(grab, { i, d: Math.max(3, -objs[i].pos.z), x: e.clientX, y: e.clientY, moved: 0 });
  objs[i].held = objs[i].pos.clone();
  root.classList.add('obj-grab');
  e.preventDefault();
});
addEventListener('pointerup', () => {
  if (grab.i < 0) return;
  const o = objs[grab.i];
  justDragged = grab.moved > 6;
  o.held = null; o.free = 1.6;
  grab.i = -1; root.classList.remove('obj-grab');
});

const paper = $('#w-paper'), leader = $('.w-leader');
const pv = new THREE.Vector3();
function openPaper(i) {
  const src = $(`.w-pub[data-pub="${i}"]`);
  if (!src || !paper) return;
  const clone = src.cloneNode(true);
  clone.removeAttribute('data-page');
  clone.querySelectorAll('[style]').forEach(el => el.removeAttribute('style'));
  clone.removeAttribute('style');
  paper.querySelector('.w-paper-body').replaceChildren(clone);
  paper.querySelector('.w-paper-venue').textContent = src.querySelector('.pub-venue')?.textContent || '';
  paper.hidden = false;
  pv.copy(objs[i].pos).project(camera);
  const ox = (pv.x * 0.5 + 0.5) * vw, oy = (-pv.y * 0.5 + 0.5) * vh;
  const w = paper.offsetWidth, h = paper.offsetHeight, right = ox < vw * 0.55;
  const left = clamp(right ? ox + 90 : ox - 90 - w, 16, vw - w - 16);
  const top = clamp(oy - h * 0.35, 90, vh - h - 16);
  Object.assign(paper.style, { left: `${left}px`, top: `${top}px` });
  const ex = right ? left : left + w, ey = top + 28;
  leader.style.setProperty('--lx', `${ox}px`); leader.style.setProperty('--ly', `${oy}px`);
  leader.style.setProperty('--la', `${Math.atan2(ey - oy, ex - ox)}rad`);
  leader.style.width = `${Math.hypot(ex - ox, ey - oy)}px`;
  paper.classList.remove('open'); leader.classList.remove('open'); void paper.offsetWidth;
  leader.classList.add('open'); paper.classList.add('open');
  objs[i].rot.y += 2.5;
}
function closePaper() {
  if (!paper || paper.hidden) return;
  paper.classList.remove('open'); leader.classList.remove('open');
  setTimeout(() => { if (!paper.classList.contains('open')) paper.hidden = true; }, 700);
}
addEventListener('click', e => {
  if (justDragged) { justDragged = false; return; }
  if (paper && !paper.hidden && !e.target.closest('.w-paper')) { closePaper(); return; }
  if (W.phone || !onEmpty(e.target)) return;
  const i = pick(e);
  if (i >= 0) openPaper(i);
});
paper?.querySelector('.w-paper-close').addEventListener('click', closePaper);
addEventListener('keydown', e => { if (e.key === 'Escape') closePaper(); });

// "show more" opens the remaining papers under the scene
const toggle = $('#toggle-publications'), more = $('#all-publications');
if (toggle && more) toggle.addEventListener('click', () => {
  const open = more.hidden;
  more.hidden = !open;
  toggle.setAttribute('aria-expanded', String(open));
  toggle.textContent = open ? 'show less' : 'show more';
  ScrollTrigger.refresh();
});

// contact icons lean toward the cursor
if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
  $$('.icon-link').forEach(a => {
    const x = gsap.quickTo(a, 'x', { duration: 0.35, ease: 'power3.out' }), y = gsap.quickTo(a, 'y', { duration: 0.35, ease: 'power3.out' });
    a.addEventListener('pointermove', e => { const r = a.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.35); y((e.clientY - r.top - r.height / 2) * 0.35); });
    a.addEventListener('pointerleave', () => { x(0); y(0); });
  });
}

// ============================================================================
// Scroll: Lenis (desktop) + ScrollTrigger, set up per screen size
// ============================================================================
let lenis = null;
const pages = []; // phones: [{ el, pub? }]
const mm = gsap.matchMedia();

// text reveals shared by both layouts
function revealLines(el, opts = {}) {
  return SplitText.create(el, {
    type: 'lines', mask: 'lines', autoSplit: true, linesClass: 'w-line',
    onSplit: self => gsap.from(self.lines, {
      yPercent: 105, duration: opts.duration || 1, ease: 'expo.out', stagger: opts.stagger ?? 0.07, delay: opts.delay || 0,
      scrollTrigger: opts.now ? undefined : { trigger: el, start: opts.start || 'top 88%', once: true },
    }),
  });
}
function revealChars(el) {
  return SplitText.create(el, {
    type: 'chars', mask: 'chars',
    onSplit: self => gsap.from(self.chars, {
      yPercent: 110, rotate: 6, duration: 0.9, ease: 'expo.out', stagger: 0.025,
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    }),
  });
}

mm.add({ desktop: '(min-width: 761px)', phone: PHONE }, ctx => {
  const { desktop } = ctx.conditions;
  W.phone = !desktop;
  const splits = [];

  // ---- text reveals --------------------------------------------------------------
  const lead = $('.w-lead');
  if (lead) splits.push(revealLines(lead, { now: true, delay: 0.25, stagger: 0.08, duration: 1.2 }));
  $$('.w-sub').forEach(el => splits.push(revealLines(el, { start: desktop ? 'top 95%' : 'top 85%' })));
  $$('[data-chars]').forEach(el => splits.push(revealChars(el)));
  gsap.utils.toArray('.w-edu').forEach((row, k) => {
    gsap.from(row.children, {
      y: 22, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay: k * 0.06,
      scrollTrigger: { trigger: row, start: 'top 90%', once: true, onEnter: () => countUp(row.querySelector('.edu-years')) },
    });
  });

  const track = $('.w-track'), papers = $$('.w-track .w-pub');
  const n = papers.length;

  if (desktop) {
    // ---- smooth wheel scrolling --------------------------------------------------------
    lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 0.9, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    const raf = time => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    // ---- page 2 held, two states: research alone → news.log in. Crossing the
    // middle of the hold switches state with a timed animation (never half-way)
    const research = $('.pg-research'), news = $('.w-col-news'), col = $('.w-research');
    gsap.set(news, { autoAlpha: 0, x: 80 });
    let newsOn = false;
    const showNews = on => {
      if (on === newsOn) return;
      newsOn = on;
      gsap.to(col, { x: on ? -24 : 0, opacity: on ? 0.65 : 1, duration: 1, ease: 'power3.inOut', overwrite: true });
      gsap.to(news, { autoAlpha: on ? 1 : 0, x: on ? 0 : 80, duration: 1, ease: 'power3.inOut', overwrite: true });
      gsap.to(W, { newsReveal: on ? 1 : 0, duration: 1.1, ease: 'power3.inOut', overwrite: 'auto', onUpdate: wake });
      if (on) gsap.fromTo('.w-news .news-list > *', { y: 16, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: 'expo.out', stagger: 0.04, delay: 0.25, overwrite: true });
    };
    ScrollTrigger.create({
      trigger: research, start: 'top top', end: '+=90%', pin: true,
      onUpdate: s => showNews(s.progress > 0.4),
      onLeave: () => showNews(true), onLeaveBack: () => showNews(false),
    });

    // ---- the sideways paper scene, held: scrolling chooses WHICH paper; the
    // slide to it is a timed glide, so a paper always lands centred
    const layers = papers.map(el => ({ el, title: el.querySelector('.pub-title'), rest: $$('.pub-venue, .pub-authors, .w-links', el) }));
    function layerPapers() {
      // each paper comes in layers: title and authors travel at different speeds
      gsap.set(track, { x: -W.pubPos * vw });
      for (let k = 0; k < layers.length; k++) {
        const d = k - W.pubPos, a = Math.abs(d), L = layers[k];
        L.el.style.opacity = (1 - Math.min(1, a) * 0.85).toFixed(3);
        L.title.style.transform = `translate3d(${(d * -70).toFixed(1)}px,0,0)`;
        for (const r of L.rest) r.style.transform = `translate3d(${(d * -150).toFixed(1)}px,0,0)`;
      }
    }
    let pubIdx = 0;
    const goPaper = k => {
      if (k === pubIdx) return;
      pubIdx = k;
      gsap.to(W, { pubPos: k, duration: 1.1, ease: 'power3.inOut', overwrite: 'auto', onUpdate: () => { layerPapers(); wake(); } });
    };
    if (n > 1) {
      ScrollTrigger.create({
        trigger: '.w-hpin', start: 'top top', end: () => '+=' + (n - 1) * vh * 0.8, pin: true, invalidateOnRefresh: true,
        onUpdate: s => goPaper(clamp(Math.round(s.progress * (n - 1)), 0, n - 1)),
        onRefresh: () => layerPapers(),
      });
    }
    layerPapers();
    papers.forEach(p => splits.push(revealLines(p.querySelector('.pub-title'), { start: 'top 85%', stagger: 0.06 })));

    // Background: the step in the middle is the one you are on
    $$('.w-edu').forEach(row => ScrollTrigger.create({ trigger: row, start: 'top 55%', end: 'bottom 45%', toggleClass: 'on' }));
    ScrollTrigger.create({ trigger: '.ch-bg', start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: root, className: 'rows-live' } });
  } else {
    // ---- phones: real pages, the phone's own snapping, one idea per page ---------------------
    root.classList.add('pages');
    // the papers heading belongs to the first paper page
    const heading = $('#publications-heading');
    if (heading && papers[0]) papers[0].prepend(heading);
    pages.length = 0;
    $$('[data-page]').forEach(el => pages.push({ el, pub: el.dataset.pub !== undefined ? +el.dataset.pub : undefined }));
    pages.forEach((p, k) => {
      const inner = p.el;
      ScrollTrigger.create({
        trigger: inner, start: 'top 60%', end: 'bottom 40%',
        onToggle: self => {
          if (!self.isActive || W.page === k) return;
          W.page = k;
          startBlend(1.0);
          // the page tilts up out of the depth and settles flat
          gsap.fromTo(inner, { rotateX: 12, y: 36, autoAlpha: 0.2, transformPerspective: 900, transformOrigin: '50% 100%' },
            { rotateX: 0, y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', overwrite: true, clearProps: 'transform' });
        },
      });
    });
    papers.forEach(p => splits.push(revealLines(p.querySelector('.pub-title'), { start: 'top 80%' })));
    gsap.from('.w-news .news-list > *', {
      y: 14, autoAlpha: 0, duration: 0.6, ease: 'expo.out', stagger: 0.04,
      scrollTrigger: { trigger: '.w-col-news', start: 'top 70%', once: true },
    });
  }

  // ---- which arrangement the objects are in --------------------------------------------
  const chapters = [['about', '.ch-about'], ['pubs', '.ch-pubs'], ['bg', '.ch-bg'], ['end', '.ch-end']];
  for (const [name, sel] of chapters) {
    ScrollTrigger.create({
      trigger: sel, start: 'top 55%', end: 'bottom 45%',
      onToggle: self => { if (self.isActive) setChapter(name); },
    });
  }
  ScrollTrigger.create({ trigger: '.ch-bg', start: 'top bottom', end: 'bottom top', onUpdate: s => { W.bgP = s.progress; } });

  ScrollTrigger.sort();

  return () => {
    // leaving this layout (window resized across the breakpoint)
    splits.forEach(s => s.revert());
    if (lenis) { lenis.destroy(); lenis = null; }
    root.classList.remove('pages', 'rows-live');
    const heading = $('#publications-heading'), hpin = $('.w-hpin');
    if (heading && hpin && heading.parentElement !== hpin) hpin.prepend(heading);
    gsap.set('.w-track .w-pub, .w-track .w-pub *', { clearProps: 'transform,opacity' });
  };
});

// ============================================================================
// The loop: one ticker for everything. Reads first (before GSAP writes), then
// the 3D update and render.
// ============================================================================
const newsList = $('.w-news .news-list'), newsItems = $$('.w-news .news-item');
const endIcons = $('.ch-end .name-links');
function measureRows() {
  // item offsets inside the news list, measured on refresh (not every frame)
  if (!newsList) return;
  const base = newsList.getBoundingClientRect().top - newsList.scrollTop;
  R.rowOff = newsItems.map(el => el.getBoundingClientRect().top - base);
}
ScrollTrigger.addEventListener('refreshInit', () => { R.rowOff = []; });
ScrollTrigger.addEventListener('refresh', measureRows);

let t = 0, ts = 0, last = 0, lastY = 0, scrollV = 0, idleFrames = 0;
function readStep() {
  // the only layout reads per frame, all before any styles are written
  if (W.phone) { R.newsBox = null; return; }
  if (W.chapter === 'about' && W.newsReveal > 0 && newsList) { R.newsList = newsList; R.newsBox = newsList.getBoundingClientRect(); }
  else R.newsBox = null;
  if (W.chapter === 'pubs') {
    const k = clamp(Math.round(W.pubPos), 0, 99);
    const title = $(`.w-track .w-pub[data-pub="${k}"] .pub-title`);
    if (title) { const r = title.getBoundingClientRect(); R.title = { left: (vw - r.width) / 2, top: r.top, width: r.width, height: r.height }; }
  }
  if (W.chapter === 'end' && endIcons) R.endIcons = endIcons.getBoundingClientRect();
}
let awake = 0;
function wake() { awake = 90; }

const ta = new THREE.Vector3(), tb = new THREE.Vector3();
function tick(time, deltaMs) {
  const dt = Math.min(0.05, deltaMs / 1000) || 1 / 60;
  t += dt;
  const y = lenis ? lenis.scroll : scrollY;
  scrollV += ((y - lastY) / dt - scrollV) * 0.2; lastY = y;

  // motion follows what you do: lively while scrolling or changing, almost
  // still while reading
  const doing = clamp(Math.abs(scrollV) / 1200 + (W.blend < 1 ? 1 : 0), 0, 1);
  W.activity += (doing - W.activity) * (1 - Math.exp(-dt * (doing > W.activity ? 8 : 1.2)));
  const rate = 0.12 + 0.88 * W.activity;
  ts += dt * rate;

  lean.x += (lean.tx - lean.x) * (1 - Math.exp(-dt * 3));
  lean.y += (lean.ty - lean.y) * (1 - Math.exp(-dt * 3));
  camera.position.set(lean.x * 0.3, -lean.y * 0.2, 0);
  camera.lookAt(lean.x * 0.15, -lean.y * 0.1, -10);
  camera.updateMatrixWorld();

  const form = W.phone ? phoneForm : FORMS[W.chapter];
  const bl = smoother(W.blend);
  let moving = 0;
  for (const o of objs) {
    const i = o.i;
    let sc = form(i, ts, ta);
    // leaving the old arrangement: an arc back into depth, then forward
    if (W.blend < 1) {
      tb.lerpVectors(o.from, ta, bl);
      tb.z -= Math.sin(bl * Math.PI) * (W.phone ? 5 : 2.5);
      ta.copy(tb);
      sc = lerp(o.fromScale, sc, bl);
    }
    // gentle float
    ta.x += Math.sin(t * 0.4 + o.phase) * 0.04;
    ta.y += Math.sin(t * 0.5 + o.phase * 1.3) * 0.05;
    // the cursor makes nearby objects lean away a little
    if (pointerOn && grab.i < 0 && !W.phone) {
      pv.copy(o.pos).project(camera);
      const dx = (pv.x - lean.tx) * aspect, dy = pv.y + lean.ty, d = Math.hypot(dx, dy);
      const Rr = 0.16 + (o.scale * 0.9) / Math.max(1, -o.pos.z) * 2.2;
      if (d < Rr && d > 1e-4) { const f = (1 - d / Rr) ** 2 * 0.45 * (-o.pos.z / 10); ta.x += (dx / d) * f; ta.y += (dy / d) * f; }
    }
    // keep everything on screen (markers follow their news item)
    if (!markerOn[i] && !W.phone) {
      const zc = Math.max(1, camera.position.z - ta.z), hh = zc * tanHalf, hw = hh * aspect, rr = 0.8 * Math.max(sc, 0.3) + 0.15;
      ta.x = clamp(ta.x, -hw + rr, hw - rr); ta.y = clamp(ta.y, -hh + rr + 0.15, hh - rr - 0.35);
    }
    if (o.held) {
      const nx = lerp(o.pos.x, o.held.x, 1 - Math.exp(-dt * 22)), ny = lerp(o.pos.y, o.held.y, 1 - Math.exp(-dt * 22));
      o.vel.set((nx - o.pos.x) / dt, (ny - o.pos.y) / dt, 0);
      o.pos.x = nx; o.pos.y = ny;
      o.rot.x += o.vel.y * dt * 0.4; o.rot.y += o.vel.x * dt * 0.4;
    } else {
      // a critically damped spring toward the target: weight without wobble
      const free = o.free > 0 ? (o.free -= dt, clamp(o.free / 1.6, 0, 1)) : 0;
      const k = 26 * (1 - free * 0.97), c = 2 * Math.sqrt(26) * 0.9 * (1 - free * 0.85);
      o.vel.x += ((ta.x - o.pos.x) * k - o.vel.x * c) * dt;
      o.vel.y += ((ta.y - o.pos.y) * k - o.vel.y * c) * dt;
      o.vel.z += ((ta.z - o.pos.z) * k - o.vel.z * c) * dt;
      o.pos.addScaledVector(o.vel, dt);
    }
    o.scale += (sc * (i === hovered ? 1.18 : 1) - o.scale) * (1 - Math.exp(-dt * (i === hovered ? 9 : 4)));
    const boost = W.chapter === 'pubs' && i === Math.round(W.pubPos) ? 1.6 : 1;
    o.rot.x += o.spin.x * dt * boost * rate; o.rot.y += o.spin.y * dt * boost * rate; o.rot.z += o.spin.z * dt * rate;
    o.mesh.position.copy(o.pos); o.mesh.rotation.copy(o.rot); o.mesh.scale.setScalar(Math.max(0.001, o.scale));
    moving += o.vel.lengthSq();
  }

  // drawing is the expensive part: skip frames when nothing visible changes
  // much (still render ~20 fps for the slow float), full rate otherwise
  const busy = moving > 1e-4 || W.activity > 0.05 || awake > 0;
  awake = Math.max(0, awake - 1);
  idleFrames = busy ? 0 : idleFrames + 1;
  if (busy || idleFrames % 3 === 0) renderer.render(scene, camera);
}

// ============================================================================
// Start
// ============================================================================
addEventListener('resize', () => { resize(); wake(); });
dark.addEventListener('change', () => { theme(); wake(); });
resize();
theme();
// objects start far back and arrive as the page opens
objs.forEach((o, i) => { FORMS.about(i, 0, o.pos); o.pos.z -= 25 + i * 2; o.from.copy(o.pos); });
gsap.ticker.add(readStep, false, true); // prioritized: runs before GSAP writes
gsap.ticker.add(tick);
if (location.hostname === 'localhost') window.__W = { W, objs };
root.classList.add('world-ready');
root.classList.remove('world-boot');
document.fonts.ready.then(() => ScrollTrigger.refresh());
