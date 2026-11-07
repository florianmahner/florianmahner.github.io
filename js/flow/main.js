// Flow mode wiring (?scene=flow, see docs/flow-spec.md): the stage draws the
// objects, anchors reads where they can sit, the director moves them there,
// interact feeds it the pointer. One rAF loop that runs only while something
// moves, and for a short grace period after any scroll / pointer / resize.
import { createStage } from './stage.js';
import { readLayout } from './anchors.js';
import { createDirector } from './director.js';
import { createInput } from './interact.js';

const GRACE_MS = 300;        // keep ticking this long after the last event
const TRANSITION_MS = 800;   // longest CSS transition on the page (.reveal) + slack

// Bail out before loading anything heavy: without WebGL the page simply stays
// the normal site.
function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'));
    // Hand the probe context back; browsers cap how many can be live.
    if (gl) gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !!gl;
  } catch (e) {
    return false;
  }
}

function start() {
  const root = document.documentElement;
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dark = matchMedia('(prefers-color-scheme: dark)');
  // Decided once: object count/size are fixed for the life of the stage.
  const small = matchMedia('(max-width: 640px)').matches;

  let stage;
  try {
    stage = createStage({ small });
  } catch (e) {
    return;   // WebGL context failed after all: leave the normal site alone
  }
  // A stable hook for the CSS (fixed, in front, click-through, fades in).
  stage.canvas.classList.add('flow-canvas');

  const director = createDirector(stage, { calm });

  let raf = 0, last = 0, quietUntil = 0, drawn = false;

  function frame(t) {
    raf = 0;
    // Clamp dt so a stalled tab doesn't fling the springs.
    const dt = Math.min(0.05, (t - (last || t)) / 1000) || 1 / 60;
    last = t;
    // The single layout read of this frame; everything else works off it.
    const layout = readLayout({ count: stage.count, size: stage.size });
    const moving = director.update(dt, layout, input);
    stage.render();
    if (!drawn) { drawn = true; root.classList.add('flow-ready'); }
    if (moving || performance.now() < quietUntil) raf = requestAnimationFrame(frame);
    else last = 0;   // next wake starts with a fresh dt
  }

  function keepAwake(ms) {
    quietUntil = Math.max(quietUntil, performance.now() + ms);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function wake() { keepAwake(GRACE_MS); }

  const input = createInput(wake);

  // Scroll doesn't bubble: capture on document also catches the sideways
  // .swipe rows on phones.
  document.addEventListener('scroll', wake, { capture: true, passive: true });
  addEventListener('resize', () => { stage.resize(); wake(); });
  dark.addEventListener('change', () => { stage.theme(); wake(); });

  // Layout can change without a scroll: "All publications" / "show older"
  // toggles, late font swaps. Observing the page's size catches all of them.
  const page = document.querySelector('.page') || document.body;
  if ('ResizeObserver' in window) new ResizeObserver(wake).observe(page);
  // Cards rise in (.reveal, 0.7s) and lift on hover with CSS transitions;
  // their rects move, so keep following them until the transition is done.
  document.addEventListener('transitionrun', () => keepAwake(TRANSITION_MS), { passive: true });
  document.addEventListener('transitionend', wake, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(wake);

  stage.resize();
  stage.theme();
  wake();
}

if (hasWebGL()) start();
