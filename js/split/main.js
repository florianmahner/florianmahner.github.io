// Split mode wiring (docs/split-spec.md): text.js knows where the reader is,
// stage.js shows it. This file owns the listeners and the one rAF loop.
//
// The page is readable without any of this. Failure is graceful in layers:
// if text.js fails, everything is simply shown; if WebGL or three.js fails,
// the stage is hidden and the page becomes one plain column (.split-flat).
// Both modules are imported dynamically so one failing never takes down the other.

const root = document.documentElement;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 640px)').matches;
const stageEl = document.getElementById('split-stage');
const pubsEl = document.querySelector('[data-chapter="pubs"]');

// Line splitting measures text, so wait for the real fonts first.
if (document.fonts && document.fonts.ready) {
  try { await document.fonts.ready; } catch { /* measure with what we have */ }
}

// ---- text ---------------------------------------------------------------------
let text = null;
try {
  const { createText } = await import('./text.js');
  text = createText();
  root.classList.add('split-live');
} catch (err) {
  console.warn('[split] text effects off:', err);
  root.classList.remove('split-motion');   // drop the reveal start states: show everything
}

// ---- stage --------------------------------------------------------------------
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();   // free the probe context
    return true;
  } catch { return false; }
}

let stage = null;
if (stageEl && hasWebGL()) {
  try {
    // Imported here, not at the top, so a slow or failed three.js download
    // never holds up the text.
    const { createStage } = await import('./stage.js');
    // `request` is an optional extra: the stage can call it when something of
    // its own starts moving (e.g. the cursor pushing objects), to restart the loop.
    stage = createStage(stageEl, { small, calm, request: () => kick() });
  } catch (err) {
    console.warn('[split] 3D stage off:', err);
    stage = null;
  }
}
if (!stage) root.classList.add('split-flat');

// ---- the loop -----------------------------------------------------------------
// Runs only while something changes: scroll/resize/text changes kick it, and
// it keeps going while the stage reports motion (render() === true) plus a
// short grace period after the last input, then stops.
const GRACE = 160;   // ms; text.js may settle its state a frame after the scroll
let raf = 0;
let lastInput = 0;
let onScreen = true;
let last = { from: '', to: '', t: -1, active: -2, chapter: '' };

function kick() {
  lastInput = performance.now();
  if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
}

function frame(now) {
  raf = 0;
  if (document.hidden) return;

  if (text) {
    const chapter = text.chapter();
    if (chapter !== last.chapter) {
      last.chapter = chapter;
      root.dataset.chapter = chapter;
      root.classList.toggle('split-past-hero', chapter !== 'hero');   // shrinks the phone band
    }
    const active = text.activeRow();
    if (active !== last.active) {
      last.active = active;
      markActive(active);
      stage?.setActive(active);
    }
    const p = text.chapterProgress();
    if (stage && (p.from !== last.from || p.to !== last.to || p.t !== last.t)) {
      last.from = p.from; last.to = p.to; last.t = p.t;
      stage.setChapter(p.from, p.to, p.t);
    }
  }

  const moving = stage && onScreen ? stage.render() === true : false;
  if (moving || now - lastInput < GRACE) raf = requestAnimationFrame(frame);
}

// The active publication row is styled here, so the CSS (split.css) and the
// stage always agree on which row it is.
let activeEl = null;
function markActive(index) {
  activeEl?.classList.remove('is-active');
  activeEl = index >= 0 ? document.querySelector(`.pub-row[data-pub="${index}"]`) : null;
  activeEl?.classList.add('is-active');
  pubsEl?.classList.toggle('has-active', !!activeEl);
}

// ---- listeners ----------------------------------------------------------------
addEventListener('scroll', kick, { passive: true });
let resizeTimer = 0;
addEventListener('resize', () => {
  kick();
  // A size change settles after the drag; wake the stage once it has.
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => { stage?.wake(); kick(); }, 150);
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) { stage?.wake(); kick(); }
});
// Expanding "show older" / "All N publications" moves everything below it.
document.addEventListener('split:expand', () => { stage?.wake(); kick(); });
text?.onChange?.(kick);

if (stage) {
  // Nothing renders while the stage is off screen. It is sticky, so this is a
  // safety net (zoomed or very short windows); resume when it comes back.
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen) { stage.wake(); kick(); }
  }).observe(stageEl);
  // The phone band changes height after the hero; let the stage refit.
  stageEl.addEventListener('transitionend', e => {
    if (e.target === stageEl && e.propertyName === 'height') { stage.wake(); kick(); }
  });
  stageEl.addEventListener('pointermove', kick, { passive: true });
  stageEl.addEventListener('pointerdown', kick, { passive: true });
}

kick();
