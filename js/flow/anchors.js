// Where the flow objects can sit (docs/flow-spec.md, "js/flow/anchors.js").
// readLayout() reads the DOM once — rects only, never a write — and returns
// every slot in viewport CSS px, so the director never touches the DOM.
// A slot {x, y} is an object's bottom-centre contact point.

const GROUPS = ['hero', 'pubs', 'bg', 'footer'];
const CARD = '.pub-card, .edu-card';
const FOCUS_LINE = 0.45;     // fraction of vh that decides section and focus
const CARD_AT = 0.72;        // perch along the card top, clear of PDF/Web icons
const SPARE_GAP = 28;        // heading text -> first spare
const FOOTER_GAP = 24;       // footer text -> first object
const NAME_GAP = 48;         // name text -> hero cluster
const SPACING = 1.35;        // row spacing, in object sizes
const MIN_SPACING = 1.05;    // rows squeeze to this before wrapping
const MAX_SPARE = 10;

// Templates that predate the data-flow attributes still get a layout.
const FALLBACK = {
  hero: '.name-row, .grid.hero',
  pubs: 'section[aria-labelledby="publications-heading"]',
  bg: 'section[aria-labelledby="background-heading"]',
  footer: '.footer',
};

// Hand-placed hero cluster (desktop): u is the fraction across the cluster
// width, row is the baseline (-1 above the name's, 0 on it, 1 below, beside
// the contact icons), dy a small fixed vertical jitter in object sizes. Rows
// interleave so any prefix of the table (fewer objects) still looks spread.
const HERO_TABLE = [
  { u: 0.02, row: 0, dy: 0 },
  { u: 0.20, row: -1, dy: 0.05 },
  { u: 0.14, row: 1, dy: 0 },
  { u: 0.36, row: 0, dy: -0.04 },
  { u: 0.52, row: -1, dy: 0 },
  { u: 0.47, row: 1, dy: 0.06 },
  { u: 0.66, row: 0, dy: 0.03 },
  { u: 0.84, row: -1, dy: -0.05 },
  { u: 0.80, row: 1, dy: 0 },
  { u: 0.98, row: 0, dy: 0 },
];
const ROW_STEP = { '-1': -1.2, 0: 0, 1: 1.15 };   // baseline offsets, in sizes
const CLUSTER_W = 11;      // cluster never wider than this many sizes
const CLUSTER_MIN_W = 6;   // narrower free space -> row above the name instead

const smallQuery = matchMedia('(max-width: 640px)');

// ---- text lines -----------------------------------------------------------------

// Descent of a font below its baseline. A Range rect spans the font's content
// area, so baseline = rect.bottom - descent. Cached per font once webfonts
// are in, since the fallback font's metrics would be wrong forever.
const descents = new Map();
let measureCtx = null;
function descentOf(style) {
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
  if (descents.has(font)) return descents.get(font);
  const px = parseFloat(style.fontSize) || 16;
  let d = px * 0.24;   // Inter's descender, if canvas can't tell us
  try {
    measureCtx ||= document.createElement('canvas').getContext('2d');
    measureCtx.font = font;
    const m = measureCtx.measureText('x');
    if (m.fontBoundingBoxDescent > 0) d = m.fontBoundingBoxDescent;
  } catch (e) { /* keep the estimate */ }
  if (document.fonts?.status === 'loaded') descents.set(font, d);
  return d;
}

// The last line of an element's text: {left, right, top, bottom, baseline},
// plus textTop, the top of its first line.
// Only text nodes count, so inline-blocks (the name's dot) can't skew the
// baseline; the right edge is the text's, not the (full-width) element's.
const range = document.createRange();
function textLine(el) {
  if (!el) return null;
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let rects = [];
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (!n.data.trim()) continue;
    range.selectNodeContents(n);
    for (const r of range.getClientRects()) if (r.width > 0 && r.height > 0) rects.push(r);
  }
  if (!rects.length) return null;
  const textTop = Math.min(...rects.map(r => r.top));   // first line, for rows above
  const bottom = Math.max(...rects.map(r => r.bottom));
  rects = rects.filter(r => r.bottom > bottom - r.height * 0.5);   // last line only
  return {
    left: Math.min(...rects.map(r => r.left)),
    right: Math.max(...rects.map(r => r.right)),
    top: Math.min(...rects.map(r => r.top)),
    bottom,
    textTop,
    baseline: bottom - descentOf(getComputedStyle(el)),
  };
}

// ---- rows -----------------------------------------------------------------------

// n points on a line from x0 (first contact point), spaced size*SPACING,
// squeezed down to MIN_SPACING to stay left of `right`. Whatever still
// doesn't fit goes to `wrap` (another row) instead of off screen.
function row(n, x0, y, right, size, wrap) {
  const out = [];
  if (n <= 0) return out;
  const room = right - size / 2 - x0;
  let sp = size * SPACING;
  if (n > 1 && room / (n - 1) < sp) sp = Math.max(size * MIN_SPACING, room / (n - 1));
  const fit = room < 0 ? 0 : Math.min(n, Math.floor(room / sp + 1e-6) + 1);
  for (let i = 0; i < fit; i++) out.push({ x: x0 + i * sp, y });
  if (fit < n && wrap) out.push(...wrap(n - fit));
  return out;
}

// ---- groups ---------------------------------------------------------------------

function union(rects) {
  if (!rects.length) return null;
  return {
    left: Math.min(...rects.map(r => r.left)),
    right: Math.max(...rects.map(r => r.right)),
    top: Math.min(...rects.map(r => r.top)),
    bottom: Math.max(...rects.map(r => r.bottom)),
  };
}

function sectionEls(name) {
  const els = document.querySelectorAll(`[data-flow="${name}"]`);
  return els.length ? [...els] : [...document.querySelectorAll(FALLBACK[name])];
}

// Cards that are actually rendered: the expanded list is [hidden] until
// toggled (display: none -> no client rects), and zero-size boxes can't hold
// anything. Swipe-row cards keep their (possibly off-screen) x on purpose.
function cardSlots(els) {
  const slots = [];
  for (const sec of els) for (const el of sec.querySelectorAll(CARD)) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    slots.push({ x: r.left + CARD_AT * r.width, y: r.top, el, rect: r });
  }
  return slots;
}

// A perched object at its largest (focus: scale 1.18, lift 6px), in sizes:
// how far it reaches up from its contact point and out from its centre.
const REACH_UP = 1.32;
const REACH_SIDE = 0.7;
const CLEAR = 1.3;           // heading-line spot <-> perched object, centre to centre

// Like row(), but skips the columns in `avoid` (x of perched objects that rise
// into this line), so nothing on the heading line overlaps an object on a card.
function rowAvoiding(n, x0, y, right, size, avoid, wrap) {
  if (n <= 0) return [];
  let pts = [];
  for (const k of [SPACING, MIN_SPACING]) {
    const sp = size * k;
    pts = [];
    for (let x = x0; x <= right - size / 2 + 1e-6 && pts.length < n; x += sp) {
      const hit = avoid.find(a => Math.abs(x - a) < size * CLEAR);
      if (hit !== undefined) { x = hit + size * CLEAR - sp; continue; }   // next spot just past it
      pts.push({ x, y });
    }
    if (pts.length >= n) break;
  }
  if (pts.length < n && wrap) pts.push(...wrap(n - pts.length));
  return pts;
}

// Cards sit close under their heading, so content has to win twice:
// a perch that would cover the heading text moves onto the heading line, and
// spares on that line step around objects perched on the cards below. Spares
// rest on the heading's baseline right of its text; overflow wraps to a row
// standing on top of the heading text.
function headingSlots(els, slots, need, right, size) {
  const h = els.map(e => e.querySelector('h2')).find(Boolean);
  const line = textLine(h);
  if (!line) return [];
  const blocked = [], avoid = [];
  for (const s of slots) {
    const top = s.y - size * REACH_UP;
    const overText = top < line.bottom && s.y > line.top &&
      s.x + size * REACH_SIDE > line.left && s.x - size * REACH_SIDE < line.right;
    if (overText) blocked.push(s);
    else if (top < line.baseline && s.y > line.baseline - size * REACH_UP) avoid.push(s.x);
  }
  const above = k => row(k, line.left + size / 2, line.textTop, right, size, null);
  const pts = rowAvoiding(blocked.length + need, line.right + SPARE_GAP + size / 2,
    line.baseline, right, size, avoid, above);
  // Moved perches keep their card (el) for focus and hover; they take the
  // first spots on the line, in page order, so assignment stays stable.
  blocked.forEach((s, i) => { if (pts[i]) { s.x = pts[i].x; s.y = pts[i].y; } });
  return pts.slice(blocked.length);
}

function heroSlots(els, box, n, size, small) {
  const name = textLine(els.map(e => e.querySelector('h1')).find(Boolean) || document.getElementById('name'));
  if (!name || !box) return [];
  // Phones (and any screen too narrow for the cluster): a row standing on the
  // name's content-area top, in the space the template reserves above it.
  const rowAbove = () => row(n, name.left + size / 2, name.textTop, box.right, size,
    k => row(k, name.left + size / 2, name.textTop - size * 1.2, box.right, size, null));
  if (small) return rowAbove();

  const free = box.right - (name.right + NAME_GAP);
  if (free < size * CLUSTER_MIN_W) return rowAbove();
  // Right-aligned with the content edge, so the cluster sits over the News
  // card instead of floating in the middle of a wide screen.
  const w = Math.min(free, size * CLUSTER_W);
  const left = box.right - w;
  return HERO_TABLE.slice(0, n).map(p => ({
    x: left + size / 2 + p.u * (w - size),
    y: name.baseline + (ROW_STEP[p.row] + p.dy) * size,
  }));
}

function footerSlots(els, box, n, size) {
  const line = textLine(els.map(e => e.querySelector('p')).find(Boolean) || els[0]);
  if (!line || !box) return [];
  // Narrow screens: what doesn't fit beside the text lines up above it.
  const above = k => row(k, line.left + size / 2, line.textTop - 4, box.right, size, null);
  return row(n, line.right + FOOTER_GAP + size / 2, line.baseline, box.right, size, above);
}

// ---- layout ---------------------------------------------------------------------

/**
 * Read where every object can sit right now. Options default to what the
 * stage uses (spec: 10 objects of 46px, or 8 of 34px at <= 640px).
 */
export function readLayout({ count, size } = {}) {
  const small = smallQuery.matches;
  count ??= small ? 8 : 10;
  size ??= small ? 34 : 46;
  const vw = document.documentElement.clientWidth || innerWidth;
  const vh = innerHeight;
  const focusY = vh * FOCUS_LINE;

  const groups = {};
  const boxes = {};
  for (const g of GROUPS) {
    const els = sectionEls(g);
    const box = union(els.map(e => e.getBoundingClientRect()).filter(r => r.width || r.height));
    boxes[g] = box;
    if (g === 'hero') groups[g] = { slots: heroSlots(els, box, count, size, small), spare: [] };
    else if (g === 'footer') groups[g] = { slots: footerSlots(els, box, count, size), spare: [] };
    else {
      const slots = cardSlots(els);
      const right = box ? box.right : vw;
      const need = Math.min(MAX_SPARE, Math.max(0, count - slots.length));
      groups[g] = { slots, spare: headingSlots(els, slots, need, right, size) };
    }
  }

  // The footer is one short line at the very end, so the focus line can never
  // reach it; once the page is scrolled to its end, it takes over instead.
  const se = document.scrollingElement || document.documentElement;
  const atEnd = se.scrollTop + vh >= se.scrollHeight - 2;
  const fb = boxes.footer;
  const active = atEnd && fb && fb.bottom <= vh + 1 ? 'footer' : activeGroup(boxes, focusY);
  const focus = focusIn(groups, active, focusY, vw, vh);

  // rects were only needed for focus; slots expose {x, y, el} per the spec
  for (const g of ['pubs', 'bg']) for (const s of groups[g].slots) delete s.rect;
  return { active, groups, focus, vw, vh };
}

// The section whose box contains the focus line; else the nearest one.
function activeGroup(boxes, y) {
  let best = 'hero', bestD = Infinity;
  for (const g of GROUPS) {
    const b = boxes[g];
    if (!b) continue;
    const d = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0;
    if (d < bestD) { best = g; bestD = d; }
  }
  return best;
}

// The on-screen card nearest the focus line. Cards in one row tie on y, so
// the one nearer the horizontal centre wins (on phones: the swiped-to card).
function focusIn(groups, active, y, vw, vh) {
  const slots = groups[active]?.slots;
  if (!slots?.length || !slots[0].rect) return null;
  let index = -1, best = Infinity;
  slots.forEach((s, i) => {
    const r = s.rect;
    if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return;
    const dy = Math.abs((r.top + r.bottom) / 2 - y);
    const dx = Math.abs((r.left + r.right) / 2 - vw / 2);
    const score = dy + dx * 1e-3;
    if (score < best) { best = score; index = i; }
  });
  return index < 0 ? null : { group: active, index };
}

/**
 * The card slot an element belongs to (for hover/tap hops): any element inside
 * a card resolves to that card's slot. null if it isn't a slotted card.
 */
export function slotForElement(layout, el) {
  const card = el?.closest?.(CARD);
  if (!card || !layout) return null;
  for (const group of ['pubs', 'bg']) {
    const index = layout.groups[group].slots.findIndex(s => s.el === card);
    if (index >= 0) return { group, index };
  }
  return null;
}
