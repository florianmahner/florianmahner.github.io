// Director: decides which object sits on which slot and moves it there.
//
// Every frame main.js hands us a fresh layout (viewport px) and the input
// state; we advance the physics by dt and call stage.set() for each object.
// Rendering is main.js's job. update() returns false once nothing moves, so
// the loop can stop.
//
// Movement vocabulary (same character as the name dot's hop() in motion.js):
//   - within a group: a critically damped spring per object, so objects ride
//     along with scrolling cards with a slight physical lag;
//   - between groups: a staggered ballistic hop with crouch, stretch and a
//     landing squash, aimed at the slot's *current* position every frame;
//   - focus: lift + scale + a slow turn that stops after a few idle seconds;
//   - pointer: a wobbly push away from a moving cursor; hover/tap: a small
//     in-place hop with a quarter turn.
//
import { slotForElement } from './anchors.js';

const TAU = Math.PI * 2;
const QUARTER = Math.PI / 2;

// Springs. ω = sqrt(stiffness) for unit mass; critical damping = no overshoot.
const W_FOLLOW = Math.sqrt(170);  // slot tracking
const W_FOCUS = 12;               // lift / scale easing
const W_TURN = 6;                 // ry settling to a quarter pose
const W_NUDGE = 15, Z_NUDGE = 0.32; // underdamped: the cursor push wobbles back

// Group-change hop.
const STAGGER = 0.04;             // s between objects
const CROUCH = 0.08;              // s of take-off squash
const PEAK_MAX = 160, PEAK_K = 0.35, PEAK_MIN = 10;
const LAND_SQUASH = 0.2;          // sy 0.8 on touchdown

// Hover/tap hop.
const BOUNCE_CROUCH = 0.07, BOUNCE_FLY = 0.3, BOUNCE_H = 12;

// Focus.
const FOCUS_LIFT = 6, FOCUS_SCALE = 1.18, FOCUS_SPIN = 0.6; // rad/s
const IDLE_STOP = 4;              // s without input before the turn stops

// Cursor.
const NUDGE_R = 70, NUDGE_MAX = 22;

const EPS = 0.05;                 // px / unit thresholds for "settled"

export function createDirector(stage, { calm = false } = {}) {
  const n = stage.count;
  const objs = Array.from({ length: n }, makeObject);
  let group = null;    // active group the objects are assigned to
  let started = false; // first frame snaps instead of hopping in from (0, 0)
  let idle = 0;        // seconds since the last scroll / pointer input
  let lastTargets = null;

  function update(dt, layout, input) {
    if (!layout || !layout.groups) return false;
    // Seconds expected; tolerate ms. Clamp so a background tab doesn't
    // fire one huge step on return.
    if (dt > 1) dt /= 1000;
    dt = Math.min(Math.max(dt || 0, 0), 1 / 20);

    const size = stage.size;
    const cache = {};
    const targets = (g) => cache[g] || (cache[g] = targetList(layout, g, n, size));
    const active = layout.groups[layout.active] ? layout.active : group || firstGroup(layout);

    if (calm) return place(layout, active, targets);

    // ---- activity: scroll shows up as targets moving under us -------------
    const now = targets(active);
    let moved = false;
    if (lastTargets) {
      for (let k = 0; k < now.length && !moved; k++) {
        const a = now[k], b = lastTargets[k];
        if (!b || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 0.5) moved = true;
      }
    }
    lastTargets = now.map(p => ({ x: p.x, y: p.y }));
    const p = input && input.pointer;
    if (moved || (p && p.moving) || (input && input.hop) || active !== group) idle = 0;
    else idle += dt;

    // ---- assignment --------------------------------------------------------
    if (!started) {
      started = true;
      group = active;
      objs.forEach((o, i) => {
        const t = now[i];
        o.follow = { group, k: i };
        o.key = t.key;
        o.x = t.x; o.y = t.y;
      });
    } else if (active !== group) {
      group = active;
      objs.forEach((o, i) => startHop(o, i, { group, k: i }, i * STAGGER, layout, targets));
    } else {
      // Same group, but the slot list changed under object i (e.g. the
      // expanded publications list opened): hop rather than slide across.
      objs.forEach((o, i) => {
        if (o.hop) return;
        if (o.key !== now[i].key) {
          o.key = now[i].key;
          startHop(o, i, { group, k: i }, 0, layout, targets, true);
        }
      });
    }

    // ---- hover / tap hop -----------------------------------------------
    if (input && input.hop) {
      const slot = resolveSlot(input.hop.el, layout);
      input.hop = null; // consumed
      if (slot && slot.group === group && slot.index < n) {
        const o = objs[slot.index]; // slots fill first, so slot k is object k
        if (!o.hop && !o.bounce) {
          o.bounce = { t: 0 };
          o.ryT += QUARTER;
        }
      }
    }

    // ---- focus -----------------------------------------------------------
    const f = layout.focus;
    const focused = f && f.group === group && f.index < n ? f.index : -1;

    // ---- step every object ---------------------------------------------
    let busy = false;
    for (let i = 0; i < n; i++) {
      const o = objs[i];
      const s = stepObject(o, i === focused, dt, p, size, targets);
      busy = busy || s;
      stage.set(i, o.out);
    }
    return busy;
  }

  // Calm mode: objects sit exactly on their slots, no animation at all.
  function place(layout, active, targets) {
    const list = targets(active);
    group = active;
    for (let i = 0; i < n; i++) {
      const t = list[i];
      stage.set(i, { x: t.x, y: t.y, scale: 1, lift: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1 });
    }
    return false;
  }

  // Begin (or redirect) a hop of object o to `dest` after `delay` seconds.
  function startHop(o, i, dest, delay, layout, targets, fromHere = false) {
    o.bounce = null; // a group hop overrides a hover hop
    const h = o.hop;
    if (h && h.phase === 'fly') {
      // Already airborne: re-aim from where it is now, no second crouch.
      o.hop = flight(o, dest, { x: o.bx, y: o.by }, null, targets);
      return;
    }
    if (h) {
      // Still waiting or crouching: just change where it is going.
      h.dest = dest;
      return;
    }
    if (!fromHere && dest.group === o.follow.group && dest.k === o.follow.k) return;
    o.hop = { phase: 'wait', t: -delay, dest, hold: fromHere };
  }

  // Build the flight state. `from` is either fixed or tracks the old slot
  // (old slot position + the offset at take-off), so a hop that starts while
  // the page scrolls leaves from where the object actually is.
  function flight(o, dest, fixed, follow, targets) {
    const from = fixed || { x: o.x, y: o.y };
    const off = follow ? { x: o.x - targetOf(targets, follow).x, y: o.y - targetOf(targets, follow).y } : null;
    const to = targetOf(targets, dest);
    const d = Math.hypot(to.x - from.x, to.y - from.y);
    return {
      phase: 'fly', t: 0, dest, follow, off, fixed: follow ? null : from,
      dur: clamp(0.45 + d / 2000, 0.45, 0.7),
      peak: Math.max(PEAK_MIN, Math.min(PEAK_MAX, PEAK_K * d)),
    };
  }

  function stepObject(o, isFocus, dt, pointer, size, targets) {
    let busy = false;
    let sx = 1, sy = 1, lean = 0, bounceY = 0;
    const h = o.hop;

    // -- base position: spring to the followed slot, or fly ---------------
    if (h && h.phase === 'fly') {
      h.t += dt;
      const u = Math.min(1, h.t / h.dur);
      const to = targetOf(targets, h.dest); // current position: slots scroll
      let from = h.fixed;
      if (!from) { const ft = targetOf(targets, h.follow); from = { x: ft.x + h.off.x, y: ft.y + h.off.y }; }
      // Linear in x and y plus a parabola in y: a ballistic arc whose ends
      // ride along with the page.
      const nx = from.x + (to.x - from.x) * u;
      const ny = from.y + (to.y - from.y) * u - h.peak * 4 * u * (1 - u);
      const vx = dt > 0 ? (nx - o.bx) / dt : 0, vy = dt > 0 ? (ny - o.by) / dt : 0;
      o.x = o.bx = nx; o.y = o.by = ny;
      // Stretch along the motion and lean into it, like the name's dot.
      const st = Math.min(0.2, Math.hypot(vx, vy) / 6000);
      sx = 1 - st * 0.55; sy = 1 + st;
      lean = clamp(-vx / 3000, -0.35, 0.35);
      if (u >= 1) {
        o.hop = null;
        o.follow = h.dest;
        o.key = to.key;
        o.vx = o.vy = 0;
        o.sq = LAND_SQUASH;
      }
      busy = true;
    } else {
      if (h) {
        h.t += dt;
        if (h.phase === 'wait' && h.t >= 0) { h.phase = 'crouch'; h.t = 0; }
        if (h.phase === 'crouch') {
          const c = Math.min(1, h.t / CROUCH);
          sx = 1 + 0.2 * c; sy = 1 - 0.25 * c;
          if (h.t >= CROUCH) {
            o.hop = flight(o, h.dest, h.hold ? { x: o.x, y: o.y } : null, h.hold ? null : o.follow, targets);
            o.hop.t = 0;
          }
        }
        busy = true;
      }
      // Waiting objects keep tracking their old slot; a hold hop (slot list
      // changed under it) stays put instead, since its old slot is gone.
      if (!(h && h.hold)) {
        const t = targetOf(targets, o.follow);
        [o.x, o.vx] = critical(o.x, o.vx, t.x, W_FOLLOW, dt);
        [o.y, o.vy] = critical(o.y, o.vy, t.y, W_FOLLOW, dt);
        if (Math.abs(o.x - t.x) > EPS || Math.abs(o.y - t.y) > EPS || Math.abs(o.vx) > EPS || Math.abs(o.vy) > EPS) busy = true;
        else { o.x = t.x; o.y = t.y; o.vx = o.vy = 0; }
      }
      o.bx = o.x; o.by = o.y;
    }

    // -- landing squash ------------------------------------------------------
    if (o.sq > 0.003) {
      o.sq *= Math.exp(-dt * 16);
      sx *= 1 + o.sq * 0.85; sy *= 1 - o.sq;
      busy = true;
    } else o.sq = 0;

    // -- hover / tap hop in place ---------------------------------------------
    if (o.bounce) {
      const b = o.bounce;
      b.t += dt;
      if (b.t < BOUNCE_CROUCH) {
        const c = b.t / BOUNCE_CROUCH;
        sx *= 1 + 0.1 * c; sy *= 1 - 0.12 * c;
      } else {
        const u = (b.t - BOUNCE_CROUCH) / BOUNCE_FLY;
        if (u >= 1) { o.bounce = null; o.sq = Math.max(o.sq, 0.14); }
        else {
          bounceY = BOUNCE_H * 4 * u * (1 - u);
          const st = 0.12 * Math.abs(1 - 2 * u); // fastest at take-off and touchdown
          sx *= 1 - st * 0.55; sy *= 1 + st;
        }
      }
      busy = true;
    }

    // -- cursor push: target offset away from a moving pointer --------------
    let tox = 0, toy = 0;
    if (pointer && pointer.moving) {
      const cx = o.bx + o.ox, cy = o.by + o.oy - size / 2 - o.lift; // object centre
      const dx = cx - pointer.x, dy = cy - pointer.y, d = Math.hypot(dx, dy);
      if (d < NUDGE_R) {
        const k = Math.min(NUDGE_MAX, (NUDGE_R - d) * 0.45) / (d || 1);
        tox = d ? dx * k : 0; toy = d ? dy * k : -NUDGE_MAX;
      }
    }
    [o.ox, o.ovx] = damped(o.ox, o.ovx, tox, W_NUDGE, Z_NUDGE, dt);
    [o.oy, o.ovy] = damped(o.oy, o.ovy, toy, W_NUDGE, Z_NUDGE, dt);
    if (Math.abs(o.ox) + Math.abs(o.oy) > EPS || Math.abs(o.ovx) + Math.abs(o.ovy) > EPS || tox || toy) busy = true;
    else o.ox = o.oy = o.ovx = o.ovy = 0;

    // -- focus: lift, scale and a slow turn -------------------------------
    const lit = isFocus && !o.hop;
    [o.lift, o.vl] = critical(o.lift, o.vl, lit ? FOCUS_LIFT : 0, W_FOCUS, dt);
    [o.scale, o.vs] = critical(o.scale, o.vs, lit ? FOCUS_SCALE : 1, W_FOCUS, dt);
    if (Math.abs(o.lift - (lit ? FOCUS_LIFT : 0)) > 0.01 || Math.abs(o.vl) > 0.01 ||
        Math.abs(o.scale - (lit ? FOCUS_SCALE : 1)) > 0.0005 || Math.abs(o.vs) > 0.0005) busy = true;

    if (lit && idle < IDLE_STOP && !o.bounce) {
      // Turn freely while the reader is active; the spring is bypassed.
      o.ry += FOCUS_SPIN * dt; o.ryT = o.ry; o.vry = FOCUS_SPIN;
      o.spinning = true;
      busy = true;
    } else {
      if (o.spinning) {
        // Stop on the next quarter pose ahead, so it never turns backwards
        // and every shape comes to rest in a clean orientation.
        o.ryT = Math.ceil(o.ry / QUARTER - 1e-3) * QUARTER;
        o.spinning = false;
      }
      [o.ry, o.vry] = critical(o.ry, o.vry, o.ryT, W_TURN, dt);
      if (Math.abs(o.ry - o.ryT) > 1e-3 || Math.abs(o.vry) > 1e-3) busy = true;
      else {
        // Settled: snap and keep the numbers small.
        const wrap = Math.floor(o.ryT / TAU) * TAU;
        o.ry = o.ryT = o.ryT - wrap; o.vry = 0;
      }
    }

    // -- output ----------------------------------------------------------------
    // A pushed object tilts a little against the push: reads as a wobble.
    const rz = lean + clamp(-o.ox * 0.012, -0.3, 0.3);
    const out = o.out;
    out.x = o.bx + o.ox;
    out.y = o.by + o.oy - bounceY;
    out.scale = o.scale; out.lift = o.lift;
    out.rx = 0; out.ry = o.ry; out.rz = rz;
    out.sx = sx; out.sy = sy;
    return busy;
  }

  return { update };
}

// ---- helpers ----------------------------------------------------------------

function makeObject() {
  return {
    x: 0, y: 0, vx: 0, vy: 0, // spring-driven base position
    bx: 0, by: 0,             // base position actually shown (spring or flight)
    follow: { group: null, k: 0 }, key: '',
    hop: null, bounce: null, sq: 0,
    ox: 0, oy: 0, ovx: 0, ovy: 0,
    lift: 0, vl: 0, scale: 1, vs: 0,
    ry: 0, vry: 0, ryT: 0, spinning: false,
    out: { x: 0, y: 0, scale: 1, lift: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1 },
  };
}

// The positions a group offers, in fill order: card slots, then spares on the
// heading line, then (if still short) a continuation sideways from the last
// one, so objects never stack invisibly. `key` identifies the place, so we
// notice when the list shifts under an object.
function targetList(layout, g, n, size) {
  const grp = layout.groups[g] || { slots: [], spare: [] };
  const slots = grp.slots || [], spare = grp.spare || [];
  const list = [];
  slots.forEach((s, k) => list.push({ x: s.x, y: s.y, key: g + ':s' + k }));
  spare.forEach((s, k) => list.push({ x: s.x, y: s.y, key: g + ':p' + k }));
  const step = size * 1.35;
  const last = list.length ? list[list.length - 1]
    : { x: (layout.vw || innerWidth) - step, y: (layout.vh || innerHeight) + size * 2 }; // nothing at all: park just below the fold
  const vw = layout.vw || innerWidth;
  for (let j = 1; list.length < n; j++) {
    // Continue the row rightward; if that runs off screen, go left instead.
    let x = last.x + j * step;
    if (x > vw - size * 0.6) x = last.x - j * step;
    list.push({ x, y: last.y, key: g + ':x' + j });
  }
  return list;
}

function targetOf(targets, ref) {
  return targets(ref.group)[ref.k];
}

function firstGroup(layout) {
  return ['hero', 'pubs', 'bg', 'footer'].find(g => layout.groups[g]) || Object.keys(layout.groups)[0];
}

// Map a hovered/tapped card to { group, index } (null if it has no slot).
function resolveSlot(el, layout) {
  return el ? slotForElement(layout, el) : null;
}

// Exact step of a critically damped spring (no overshoot), so the motion is
// the same at 30, 60 or 120 fps.
function critical(x, v, target, w, dt) {
  const d = x - target;
  const e = Math.exp(-w * dt);
  const c = v + w * d;
  return [target + (d + c * dt) * e, (v - w * c * dt) * e];
}

// Underdamped spring (wobbles back), integrated in small fixed substeps so it
// stays stable and framerate independent.
function damped(x, v, target, w, zeta, dt) {
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    v += (-w * w * (x - target) - 2 * zeta * w * v) * h;
    x += v * h;
  }
  return [x, v];
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
