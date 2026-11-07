// Flow mode input: where the pointer is and how fast it moves, plus
// "hop" requests when a card is hovered (mouse) or tapped (touch).
// Only event coordinates and DOM ancestry are used — never layout reads —
// so this never forces a reflow; the director does the el -> slot mapping.

const CARDS = '.pub-card, .edu-card';
const STILL_MS = 200;      // pointer counts as "moving" for this long after an event
const TAP_SLOP = 10;       // px a finger may drift and still count as a tap
const TAP_MS = 500;        // longer presses are not taps
const OFF = -1e5;          // parked far away so nothing is nudged by a stale pointer

export function createInput(onWake = () => {}) {
  const pointer = { x: OFF, y: OFF, vx: 0, vy: 0, moving: false };
  const input = { pointer, hop: null, dispose };

  // Hover hops only make sense where a real hover exists (mouse, trackpad).
  const fine = matchMedia('(hover: hover) and (pointer: fine)');

  let lastT = 0;
  let stillTimer = 0;
  let tap = null;          // { el, x, y, t, id } for a touch that might become a tap

  const opts = { passive: true };
  const capture = { passive: true, capture: true };

  // ---- pointer position and velocity ------------------------------------

  function track(ev) {
    const t = ev.timeStamp || performance.now();
    if (pointer.moving && lastT) {
      // Velocity in px/s from successive events, lightly smoothed so one
      // jittery event doesn't fling the objects.
      const dt = Math.max(1, t - lastT) / 1000;
      const k = 0.5;
      pointer.vx += k * ((ev.clientX - pointer.x) / dt - pointer.vx);
      pointer.vy += k * ((ev.clientY - pointer.y) / dt - pointer.vy);
    } else {
      // First event after a rest (or ever): no previous point, so no velocity.
      pointer.vx = 0; pointer.vy = 0;
    }
    pointer.x = ev.clientX;
    pointer.y = ev.clientY;
    lastT = t;
    pointer.moving = true;

    // Drop `moving` once the pointer rests, and wake the loop again so the
    // director can let nudged objects spring home.
    clearTimeout(stillTimer);
    stillTimer = setTimeout(rest, STILL_MS);
  }

  function rest() {
    pointer.moving = false;
    pointer.vx = 0; pointer.vy = 0;
    onWake();
  }

  // A finger lifted or the mouse left the window: there is no cursor any more.
  function park() {
    clearTimeout(stillTimer);
    pointer.x = OFF; pointer.y = OFF;
    pointer.vx = 0; pointer.vy = 0;
    pointer.moving = false;
    lastT = 0;
    onWake();
  }

  function onMove(ev) {
    track(ev);
    // A touch that wanders is a scroll or drag, not a tap.
    if (tap && ev.pointerId === tap.id &&
        Math.hypot(ev.clientX - tap.x, ev.clientY - tap.y) > TAP_SLOP) tap = null;
    onWake();
  }

  function onDown(ev) {
    track(ev);
    if (ev.pointerType !== 'mouse') {
      const el = ev.target instanceof Element ? ev.target.closest(CARDS) : null;
      tap = el ? { el, x: ev.clientX, y: ev.clientY, t: ev.timeStamp, id: ev.pointerId } : null;
    }
    onWake();
  }

  function onUp(ev) {
    if (ev.pointerType === 'mouse') return;
    // Taps are decided on release: pointerdown alone also starts every scroll.
    if (tap && ev.pointerId === tap.id && ev.timeStamp - tap.t < TAP_MS) request(tap.el);
    tap = null;
    park();
  }

  function onCancel(ev) {
    // The browser took the gesture over (usually a scroll): not a tap.
    if (tap && ev.pointerId === tap.id) tap = null;
    if (ev.pointerType !== 'mouse') park();
  }

  function onOut(ev) {
    // relatedTarget null means the mouse left the document entirely.
    if (ev.pointerType === 'mouse' && !ev.relatedTarget) park();
  }

  // ---- card hover (delegated pointerenter) ------------------------------

  function onOver(ev) {
    if (ev.pointerType !== 'mouse' || !fine.matches) return;
    const el = ev.target instanceof Element ? ev.target.closest(CARDS) : null;
    if (!el) return;
    // pointerover bubbles from every child; only the crossing into the card
    // from outside counts, which is what pointerenter would have reported.
    const from = ev.relatedTarget;
    if (from instanceof Node && el.contains(from)) return;
    request(el);
  }

  function request(el) {
    input.hop = { el };
    onWake();
  }

  window.addEventListener('pointermove', onMove, opts);
  window.addEventListener('pointerdown', onDown, opts);
  window.addEventListener('pointerup', onUp, opts);
  window.addEventListener('pointercancel', onCancel, opts);
  window.addEventListener('pointerout', onOut, opts);
  document.addEventListener('pointerover', onOver, capture);

  function dispose() {
    clearTimeout(stillTimer);
    window.removeEventListener('pointermove', onMove, opts);
    window.removeEventListener('pointerdown', onDown, opts);
    window.removeEventListener('pointerup', onUp, opts);
    window.removeEventListener('pointercancel', onCancel, opts);
    window.removeEventListener('pointerout', onOut, opts);
    document.removeEventListener('pointerover', onOver, capture);
  }

  return input;
}
