# Flow mode — spec (lab, branch `three-lab`)

A one-page scroll experience built on the 3D objects from `js/scene.js`.
Opt-in only: `?scene=flow` (or `site.json` `"scene": "flow"`). Without it the
homepage is byte-for-byte the current site. `?scene=objects` (the band above
the name, `js/scene.js`) must keep working unchanged.

## The idea

Ten small 3D objects (sphere, rounded cube, cylinder, cone, torus, capsule,
icosahedron, small sphere, slab, disc — same as `js/scene.js`) live in the
page plane, drawn on a fixed, transparent, full-viewport canvas *in front of*
the content with `pointer-events: none`. They are rendered head-on with an
orthographic camera in CSS pixels, each with a slight fixed 3D tilt so they
read as solid objects, and each casts the site's signature hard offset shadow
(a flat silhouette in `--shadow-color`, offset 4px right / 4px down, exactly
like the cards).

As you scroll, the objects travel with the content and **bring different
things into focus**:

- **Hero:** they rest in a loose, hand-placed-looking cluster in the empty
  space to the right of the name (desktop) / in a short row above the name
  (phone, ≤640px).
- **Selected publications / all publications:** one object perches on the top
  border of each visible publication card (bottom of the object touches the
  card's top border line, at ~72% of the card width, clear of the PDF/Web
  icons which sit inside the card at top-right). Objects that don't get a card
  rest on the section heading's baseline, in a row to the right of the heading
  text.
- **Background:** same, one per Background card; spares rest on the heading
  line.
- **Footer:** all objects gather in a neat row on the footer line.
- **Focus:** within the active section, the card closest to the viewport
  centre is "in focus": its object lifts a little (6px), scales to 1.18 and
  turns slowly; the other objects sit still at scale 1.
- **Moving between sections:** when the active section changes, objects
  **hop** to their new places — staggered by ~40ms each, an arc (peak height
  proportional to distance, capped), squash on take-off and landing, the
  same squash-and-stretch character as the name's dot intro in
  `js/motion.js` (`hop()`). Within a section they follow their card with a
  critically damped spring, so they feel attached but physical.
- **Cursor:** objects near the moving cursor (radius ~70px) are nudged away
  and wobble back; hovering a card makes its object do a small hop + quarter
  turn. Touch: tapping a card does the same hop.

Content always wins: objects never sit on text. Nothing is required to read
the page; no-JS, reduced motion, and failed WebGL all show the normal site.

## Constraints

- Fast: three.js loads after `load`, only in flow mode (import map already in
  `_includes/base.njk`, three@0.170.0 from jsdelivr). No new dependencies, no
  GSAP. Render only while something moves (springs unsettled, scrolling,
  pointer moving); stop the loop when settled. Never read layout more than
  once per frame. Pixel ratio ≤ 2.
- `prefers-reduced-motion: reduce`: no hops/springs; objects are placed
  directly at their slots and re-placed on scroll (no animation).
- Dark mode: follow `prefers-color-scheme` live; colours come from CSS tokens
  (`--shadow-color`, `--card`, `--ink`, etc.). Same palettes as
  `js/scene.js` (`palette.light` / `palette.dark`).
- Phones: horizontal swipe rows (`.swipe`) must work — objects on cards in a
  swipe row follow the horizontal scroll (scroll events don't bubble: listen
  with `{capture: true, passive: true}` on `document`). Objects are ~34px
  on phones, ~46px on desktop.
- Plain ES modules, no build step, no TypeScript. Style: small functions,
  short comments that say *why*.

## Files and interfaces (each file has exactly one owner)

All coordinates are **viewport CSS pixels**, origin top-left, y down.

### `js/flow/stage.js` — renderer and objects

```js
export function createStage({ small }) // -> stage
stage.canvas             // the <canvas>, already appended to document.body
stage.count              // number of objects (10 desktop, 8 when small)
stage.size               // object size in px (46 desktop, 34 small)
stage.set(i, { x, y, scale = 1, lift = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1 })
  // place object i so its bottom-centre contact point is at (x, y);
  // lift raises it by `lift` px and pushes its shadow further away;
  // rx/ry/rz extra rotation (radians) on top of its fixed tilt;
  // sx/sy squash-and-stretch about the contact point (sy<1 squashed)
stage.render()           // draw one frame
stage.resize()           // viewport changed
stage.theme()            // re-read CSS colour tokens (dark mode change)
```

Orthographic camera spanning the viewport in px; objects modelled at unit
size and scaled to `stage.size`. Lighting: `RoomEnvironment` PMREM +
one directional light, `NeutralToneMapping`, `MeshPhysicalMaterial` as in
`js/scene.js`. Shadow: a second mesh per object with a flat unlit material in
`--shadow-color`, offset (+4, +4)px (+ lift), drawn behind its object.

### `js/flow/anchors.js` — where things can sit (reads the DOM)

```js
export function readLayout() // -> layout
layout = {
  active: 'hero' | 'pubs' | 'bg' | 'footer',  // section owning the viewport centre
  groups: {
    hero:   { slots: [{x, y}], spare: [] },
    pubs:   { slots: [{x, y, el}], spare: [{x, y}] },
    bg:     { slots: [{x, y, el}], spare: [{x, y}] },
    footer: { slots: [{x, y}], spare: [] },
  },
  focus: { group, index } | null,   // slot index in that group's slots
  vw, vh,
}
```

- Sections are found by `data-flow` attributes on the DOM (owner of the
  templates adds them): `data-flow="hero"` on the name row container,
  `data-flow="pubs"` on the Selected publications `<section>`,
  `data-flow="bg"` on the Background `<section>`, `data-flow="footer"` on the
  footer. `data-flow="hero"` also goes on the hero grid (About + News), so
  a group can span several elements: use the union of their rects. Cards are `.pub-card` (only those rendered/visible — the expanded
  list is `hidden` until toggled; skip hidden ones and ones with zero size)
  and `.edu-card`. Section headings are the `h2` inside each section.
- Slots for cards: `x = rect.left + 0.72 * rect.width`, `y = rect.top`.
- Spare slots: on the heading's text baseline (use a Range over the heading
  text to get the text's right edge), starting 28px right of the text,
  spaced `size * 1.35`, at most 10.
- Hero slots: desktop — 10 hand-tuned positions in the free area right of the
  name text (between the name's right edge + 48px and the page's right
  content edge), on 2–3 loose baselines aligned to the name's baseline;
  phone — a row above the name (the template owner reserves ~4.5rem of space
  there in flow mode). Positions must be deterministic (no Math.random per
  frame; a fixed table or seeded jitter).
- Footer slots: a row starting 24px right of the footer text, on its
  baseline.
- `active`: the `data-flow` section whose rect contains `vh * 0.45`; if none,
  the nearest one. `focus`: the visible card in the active group whose centre
  is nearest `vh * 0.45`.

### `js/flow/director.js` — who goes where, and how they move

```js
export function createDirector(stage, { calm }) // -> director
director.update(dt, layout, input) // -> true while anything still moves
```

- Assignment: objects `0..n-1` fill the active group's `slots` in order,
  then its `spare` slots; if still short, remaining objects go to the
  group's last spare/slot position offset sideways (never stack invisibly).
  Assignment is stable: an object keeps its slot index while the active
  group doesn't change.
- Within a group: critically damped spring per object (x, y) toward its slot
  (stiffness ~170, ω-based, framerate independent), so they track scrolling
  with a slight physical lag.
- Group change: each object starts a hop to its new slot after
  `i * 40ms`: ballistic arc in screen space (peak = min(160, 0.35 * distance)
  px), duration 0.45–0.7s by distance, squash (sy 0.75, sx 1.2) for 80ms
  before take-off, stretch in flight along velocity, squash on landing
  (sy 0.8) then settle. While hopping, the target keeps updating (the slot
  moves with scroll), so the landing point is the slot's *current* position.
- Focus: focused object eases to `lift 6, scale 1.18` and rotates `ry` slowly
  (0.6 rad/s); others ease back to `lift 0, scale 1`. Focus rotation alone
  must not keep the loop running forever: stop rotating after ~4s of no
  scroll/pointer input.
- Cursor (`input.pointer`): objects within 70px of a moving pointer get an
  offset away from it (decays with a spring); `input.hop` (a slot `{group,
  index}` requested by hover/tap) triggers a small in-place hop + quarter
  turn of that slot's object.
- `calm`: no springs, no hops — `update` sets every object exactly at its
  slot and returns false.

### `js/flow/interact.js` — pointer and card hover/tap

```js
export function createInput(onWake) // -> input
input.pointer  // { x, y, vx, vy, moving } in viewport px; moving false after 200ms still
input.hop      // null or { el } — the card element hovered/tapped; director maps el→slot and clears it
```

Pointer events on `window` (`pointermove`, `pointerdown`), card hover via
`pointerenter` delegated through `pointerover` on `.pub-card, .edu-card`.
Calls `onWake()` whenever something happens so the loop restarts. Hover hops
only for fine pointers; taps for touch.

### `js/flow/main.js` — wiring (owner: integration)

Creates stage, input, director; one rAF loop that runs while
`director.update()` returns true or for 300ms after the last scroll /
pointer / resize event, then stops. Wakes on `scroll` (capture, passive, on
document), `resize`, pointer, dark-mode change, and when the expanded
publications list toggles. Adds `.flow-ready` to `<html>` once the first
frame is drawn so CSS can fade the canvas in.

### Templates and CSS (owner: integration)

- `_includes/base.njk`: the existing loader loads `/js/scene.js` for
  `objects`; make it load `/js/flow/main.js` (module) for `flow`.
- `index.njk`: add the `data-flow` attributes listed above. Don't change any
  wording or structure otherwise.
- `css/style.css`: `[data-scene="flow"]` rules — the canvas is
  `position: fixed; inset: 0; pointer-events: none; z-index: 5;` and fades in
  on `.flow-ready`; `#stage` stays hidden in flow mode; phones reserve the row
  above the name. Respect the six text sizes rule (no new font sizes).
