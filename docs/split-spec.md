# Split mode — spec (lab, branch `three-lab`)

A redesign of the homepage that leaves the card layout behind: content
scrolls on the left as clean typography that *comes alive* as you read; a
3D stage stays fixed on the right and always shows what you are reading.
Inspired by studio sites like lusion.co (fixed WebGL canvas, text split into
lines/words that reveal and react) — but for a scientist: readable first,
fast, calm.

It lives on its own dev-only page, **`/split/`**, so the real homepage is
untouched. The page only exists under `npm run dev` (production build skips
it — same pattern as `scroll-lab`'s `lab.11tydata.js`:
`permalink: process.env.ELEVENTY_RUN_MODE === "build" ? false : "/split/"`).

## Content — exactly the owner's words

Same data as `index.njk`: `content/about.md` (via `{% mdfile "about" %}`),
`_data/news.json` (all items, newest first, rendered with the `newsText`
filter and `monthName`), `_data/publications.json` (all ten, selected ones
first), `_data/education.json`, the contact icons (`icons.njk`
`socialIcons(site)`), the name `Florian P<span class="accent-dot">.</span>
Mahner`, and the footer. Never paraphrase, shorten or invent copy, labels or
taglines. Labels that already exist on the site may be reused: "news.log",
"Selected publications", "Background", "* equal contribution",
"show older". Author lists use the `highlightAuthor` filter.

## Design language (keep)

Inter + Geist Mono, the six text sizes (`--fs-name`, `--fs-heading`,
`--fs-lead`, `--fs-body`, `--fs-small`, `--fs-mono` — no seventh), the soft
grey `--bg` with the dot grid, violet only for links and the dot, warm dark
mode via the same tokens. Reuse `css/style.css` tokens; put split-only rules
in `css/split.css`. No horizontal rules between sections, no section numbers,
no arrows, no filler text.

## Layout

- **Desktop (≥ 961px):** two columns inside the usual page width. Left
  column ≈ 56%: all content. Right column ≈ 44%: `position: sticky; top: 0;
  height: 100vh` 3D stage (`<div id="split-stage">`), no frame — it floats
  on the page's dot grid (its floor *is* the dot grid in perspective, as in
  `js/scene.js`).
- **Tablet / phone (≤ 960px):** single column. The stage becomes a sticky
  band at the top (`height: 34vh` phones, `40vh` tablet) with a soft fade at
  its bottom edge; the content scrolls beneath it. On phones the band shrinks
  to 22vh once you scroll past the hero (CSS transition on a class).
- **Sections (left column, in order):** hero (name, contact icons, About),
  news.log, Selected publications + the rest, Background, footer. Each
  section root gets `data-chapter="hero|news|pubs|bg|end"`.

## How content appears (the point of this redesign)

All of this is progressive enhancement: without JS (or with reduced motion)
everything is simply visible, static, readable.

1. **Line reveals.** Headings, the name, publication titles and Background
   entries are split into lines (after fonts load; re-split on resize,
   debounced). Each line sits in an `overflow: clip` wrapper and slides up
   from 100% with a slight stagger (60ms/line, 700ms, `cubic-bezier(.2,.7,
   .1,1)`) when it enters the viewport. Once revealed, stays revealed.
2. **Reading highlight.** The About paragraphs are split into words; words
   start at `--quiet` colour and turn `--ink` (links: `--link`) as the
   paragraph scrolls through the reading zone (scroll-scrubbed, not timed:
   word `i` of `n` is lit when the paragraph's progress through the zone
   passes `i/n`). Links stay clickable; the split must keep link elements
   intact (split text nodes inside them).
3. **news.log** is a list, not a card: mono month labels in a left gutter,
   text on the right. Items fade-slide in one after another as the list
   enters. "show older" expands with the same reveal.
4. **Publications** are a typographic index, not cards: each row is
   `venue · year` (mono, `--quiet`) / title (`--fs-body`, bold) / authors
   (`--fs-small`), with PDF/Web/Code as mono text links after the authors.
   Rows are separated by space only. The row nearest the reading line
   (`vh * 0.45`) is **active**: full ink; other rows drop to 55% opacity
   (transition 300ms). Hovering a row (fine pointers) makes it active
   immediately and nudges its title 6px right. "All 10 publications" toggle
   reveals the rest with line reveals. "* equal contribution" stays.
5. **Background** is a vertical timeline list: year range in mono, degree
   bold, institution links below. The year numbers *count* to their value
   (e.g. 2013 rolling up from 2000 over 600ms) when revealed.
6. **Link hover:** text links get a letter-roll on hover (each link's label
   duplicated into two stacked spans; on hover the top copy rolls up and the
   bottom one rolls in, 350ms) — fine pointers only, label stays a single
   accessible name (`aria-hidden` on the duplicate).

## The 3D stage (right column / top band)

Built on `js/scene.js` (copy what's needed into `js/split/stage.js`; don't
import scene.js because it auto-runs): perspective floor with the dot grid
fading into the page, the same ten objects and palettes, soft contact
shadows, NeutralToneMapping, RoomEnvironment light.

Each of the ten publications owns one object (publication order ↔ object
index). The stage reacts to the active chapter and the active row:

- **hero:** objects rest in a loose arc; very slow idle breathing (tiny bob,
  0.6 Hz, 2px) only while the hero is on screen; cursor over the stage
  pushes them (reuse scene.js physics).
- **news:** camera eases lower and closer; objects gather to the back half.
- **pubs:** objects line up in a gentle curve; the **active publication's
  object** glides to the front-centre, scales 1.35 and turns slowly; the
  others step back and dim slightly (lower env intensity on their material
  clones, or a subtle scale-down). Changing the active row moves objects
  with springs (no teleporting).
- **bg:** four objects (one per Background entry) form a short path from
  back-left to front-right (oldest to newest); the camera tracks along it as
  the timeline scrolls; the active entry's object lifts slightly.
- **end:** all objects settle back into the hero arc.
- The camera moves between chapter poses with a critically damped spring
  (no jumps), driven by scroll position *between* chapters (scroll-scrubbed
  blend), not by timers.

Performance: three.js loads after `load` (import map is already in
`_includes/base.njk`; the split layout must include the same import map).
Render only while something moves; stop when settled; nothing renders while
the stage is off screen or the tab is hidden. Pixel ratio ≤ 2 (≤ 1.75 on
phones). One layout read per frame at most. Reduced motion: stage renders
the final pose of each chapter with no animation; text appears without
reveals.

## Files and owners

- `split.njk` + `split.11tydata.js` — the dev-only page (content markup).
- `_includes/split-base.njk` — the page layout (head, fonts, import map,
  `css/style.css` + `css/split.css`, loads `js/split/main.js` as a module).
- `css/split.css` — layout, typography of lists/rows/timeline, reveal
  states, sticky stage, phone band.
- `js/split/text.js` — line splitting + reveals, reading highlight, news
  stagger, year counters, link letter-roll, publication active-row
  detection. Exposes `createText() -> { activeRow(): number | -1,
  chapter(): string, chapterProgress(): {from, to, t} , onChange(cb) }`.
- `js/split/stage.js` — the 3D stage. Exposes `createStage(el, {small,
  calm}) -> { setChapter(from, to, t), setActive(index), render(), wake() }`.
- `js/split/main.js` — wiring between text.js and stage.js, scroll/resize
  listeners, the rAF loop that stops when idle.
