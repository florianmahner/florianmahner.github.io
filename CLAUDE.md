# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
npm run dev      # dev server with live reload — http://localhost:8080
npm run build    # production build to _site/
```

## Architecture

Personal academic website, one page. **Eleventy (11ty) v3**, Nunjucks
templates, plain CSS, no client-side framework. Kept on purpose: Astro and a
hand-written build script were both considered and turned down (Eleventy's
live reload is wanted, nothing heavier is needed).

- `eleventy.config.js` — config, content checks, filters, shortcodes, fonts
- `index.njk` — the whole homepage: hero, About + News, publications row,
  Background bands, footer
- `_includes/base.njk` — layout: head, SEO, JSON-LD; the stylesheet is
  inlined here with `{% inlineCss "css/site.css" %}`
- `_includes/pub-card.njk` — `pubCard()` macro; one publication card
- `_includes/art/*.svg` — the drawings on the selected papers' cards,
  coloured only through palette classes (`f-ink`, `s-mid`, `bg-hot`)
- `css/site.css` — the entire homepage stylesheet
- `js/site.js` — the only script: `show more` / `show less`
- `_data/*.json` — all content: `site`, `education`, `publications`, `news`
  (`repos`, `tools` are not rendered)
- `content/about.md` — About prose, injected via `{% mdfile "about" %}`
- `public/` — static assets copied to output root
- Jost is self-hosted from `@fontsource-variable/jost` (copied to `/fonts/`)

Filters/shortcodes: `highlightAuthor` (wraps each author in
`<span class="author">`, adds `.self` for the site owner), `mdInline`,
`monthName`, `yearOf`, `year`, `mdfile`, `inlineCss`.

**Content checks:** `checkContent()` in `eleventy.config.js` runs before every
build and fails it, naming file and entry, on a missing field, a malformed
news date, or a publication `art` with no matching drawing.

**Old files still in the repo:** `css/style.css`, `js/motion.js`,
`_includes/pub-row.njk`, `_includes/icons.njk`, Inter and Geist Mono belong to
the previous design and are used only by the dev-only lab pages (`/world/`,
`/split/`, `/news-ideas/`, `/layout-ideas/`). The homepage uses none of them.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to
**Cloudflare Workers** via wrangler on push to master. `src/index.js` is a
Worker that forces HTTPS and redirects to the canonical host
**florianmahner.com** and adds security headers (CSP and others) to every
response. Despite the repo name, this is *not* GitHub Pages.

## Design system

Source of truth: the design canvas, board "21 Aktuell"
(https://claude.ai/artifact/XzaFbjy84MkqdN2ygXgaSn). The layout is agreed;
**the colours are not final** (the pink palette is liked on phones, undecided
on desktop; board 23 is a lavender/yellow/black alternative). Do not
restructure the layout; work on individual elements and colour.

Full-bleed colour bands, no cards or borders: a red hero with dot field,
stripe and ring and the two-line name; About beside a dark News panel;
publications as one sideways row of graphic-tile cards on pink; Background as
alternating bands; a red footer. One typeface, Jost.

### Rules the owner has asked for — keep them

- **Content is the owner's wording.** Never paraphrase About, publications
  or Background; never invent copy, taglines or labels.
- **No horizontal rules between sections**, no section numbers ("01", "02"),
  no arrows (→ ↗ ←), no filler text (domain name, entry counts).
- Header (canvas board "flacher Streifen, mehr Platz unter dem Namen", chosen
  2026-11-16): from 640px up a flat red strip with the profile links as words
  in the top left, the name on one line at the bottom left, and a medium ring
  on the right (ring = 1.7 × name size; do not make it smaller). Phones keep
  board 21's header (two lines, large ring). Type on red and on wine stays
  light. Kajet's red and two-column links were tried and rejected.
- The header before that, written down in case it is wanted back ("A2, Ring
  etwas kleiner"): in the 640px block of `css/site.css`, `.hero` had
  `--fs-name: clamp(calc(2.5 * var(--r)), 7.4cqi, calc(7.5 * var(--r)))`,
  `--ring: calc(2.6 * var(--fs-name))`, `min-height: calc(1.3 * var(--ring))`,
  `justify-content: center`, and no `padding-bottom` override. Everything
  else in the header was the same.
- Links in running text: plain underlines were never wanted. Coloured text
  (red or wine, rosa inside News) is under trial in the colour panel.
- `js/playground.js` is a dev-only colour panel (palette, link style, single
  colours); it is not in the production build.
- News entries are two columns (canvas board "zwei Spalten"): the month,
  shortened to three letters and in rosa, on the left; the text on the right.
  Year headings stay.
- News is a panel titled `News`; all items sit in one list that scrolls
  inside the panel (soft fade at the edges), no "show older" button.
- Publications: only the three papers marked `selected` are shown (decided
  2026-11-16; a longer row with the other journal papers and a `show more`
  button were both tried and dropped). Three across on a desktop, a sideways
  row on a phone, a `Google Scholar` link underneath. Each card is one link
  to the paper's web page; every drawing has a coloured ground.
- Phone header is board 21's, exactly: tall red field, large ring running
  off the right edge with a vertical split, turning on scroll. A version
  with the whole ring inside the screen was tried and dropped (2026-11-16).
  From 640px up, ring, stripe and dots are one group placed from `--ring`.
- Change only what is asked; no extra "improvements" alongside a fix.

### How the CSS is written (`css/site.css`)

Follows Chrome's Modern Web Guidance
(https://github.com/GoogleChrome/modern-web-guidance); consult the matching
guide before adding a UI pattern.

- Cascade layers, in order: `fonts, tokens, base, layout, components, motion`.
  Native nesting. No global `*` reset, no inline styles.
- **Tokens, two tiers.** Palette: `--paper`, `--ink`, `--mid`, `--hot`,
  `--hot-text`, `--band`. Roles (`--hero-bg`, `--news-accent`, `--pubs-bg`,
  …) point at the palette. A hex value appears only in the palette block (and
  once in `base.njk` as `theme-color`). Recolouring means editing the palette
  or re-pointing roles, nothing else.
- **Type: exactly six sizes** — `--fs-name`, `--fs-heading` (all three section
  headings, same size), `--fs-year`, `--fs-lead`, `--fs-body`, `--fs-small`.
  Never add a seventh; hierarchy inside a size comes from weight.
- **Sizes** are multiples of `--r`, a unit that grows slightly with the page
  width; `--pad` is the side gutter, `--section` the space above a section.
  The body is the size container; widths use `cqi`, and the one layout switch
  is `@container (min-width: 900px)`.
- **Motion** lives in the `motion` layer and is opt-in: scroll-driven
  animations behind `@supports`, spatial movement only inside
  `prefers-reduced-motion: no-preference`. The ring turns as the hero scrolls
  away; the bar under the publications row follows the row; the News list
  fades at its edges; a card's tile lifts on hover. No JavaScript animation.
- **No dark mode, by decision (2026-11-16).** Six rounds of dark variants
  were drawn (canvas "Florian Mahner: Farben", rows "Dunkles Design" to
  "Dunkel auf neutralem Grund") and none was liked: on a wine ground every
  coloured text reads badly and the red header clashes. The site is light
  for everyone, like the owner's reference kajetjournal.com. Don't add one
  unless asked.
- `html` has `overscroll-behavior-y: none` and the header's red as its
  background, so scrolling past the ends never shows a white strip.
- **Browser support:** newly available features are allowed when
  feature-detected and the page still reads fine without them.
- Rejected earlier, don't bring back: cursor-driven grids, graph / cluster /
  attractor backgrounds, a typing reveal of the name.

## Content

- News: add to the **top** of `_data/news.json` (newest first, the file
  order is the display order). `date` is `YYYY-MM`; `text` is inline
  markdown, written as a full first-person sentence ending in "!", e.g.
  "Our paper [Title](url) was accepted to NeurIPS 2026!". All items are in
  the scrolling News list.
- `show more` lists journal papers only: mark a conference paper with
  `"conference": true` and it stays off the page (Google Scholar has it).
  Every paper shown needs a drawing (`art`) that depicts what it is about.
- Publication: add to `_data/publications.json`; `selected: true` features it
  on the homepage. The card links to `html` (or `pdf`). `art` names a drawing
  in `_includes/art/`; without it the card gets a year tile.
- Education: add to `_data/education.json`. `startLabel` overrides the
  `startYear–endYear` range for open-ended entries ("Oct 2026–present").

## Classic view (`/classic/`)

**Parked on 2026-11-16: the owner decided to stick with the red design, but
asked to keep "the blue idea".** It is saved here and on the canvas
"Florian Mahner: Modern" (https://claude.ai/artifact/XhbUj1x4NezSK5dJnpQXgQ;
rows "Stand" and "Ohne Schwarz": steel-blue, pale-blue and soft-violet
fields, drawings in dark blue). The versions with black fields were
rejected.

Dev-only comparison page (not built for production): the previous live
design (dot grid, window cards, Inter and Geist Mono, name with violet dot,
icon links) carrying the redesign's ideas, to see whether the two can be
combined. Files: `classic.njk`, `classic.11tydata.js`,
`_includes/classic-base.njk`, `_includes/classic-pub.njk`, `css/classic.css`
(loaded after `css/style.css`). What it adds to the old look: a drawing as
the top pane of every publication card (in ink, paper and two steel blues;
violet stays for links and the dot), two-column news inside `news.log`,
journal papers only under `show more` as a second row of cards, and
Background as one window with a row per position.

## World view (`/world/`)

A local-only experiment from the previous design (not built for production,
not linked from the homepage). Files: `world.njk`,
`world.11tydata.js`, `css/world.css`, `js/world/app.js`.

Built on open-source libraries, self-hosted under `/vendor/` (copied from
`node_modules` by `eleventy.config.js`, mapped by the import map in
`world.njk`): three.js, GSAP (ScrollTrigger, SplitText; free incl. plugins)
and Lenis. Don't hand-roll scroll code again; extend these.

- One loop: GSAP's ticker. A prioritized read step does the few layout reads
  first, then GSAP writes, then the 3D update/render. No per-frame
  `getBoundingClientRect` loops; rows are measured on ScrollTrigger refresh.
- Desktop (`gsap.matchMedia`, min-width 761px): Lenis smooth wheel scroll;
  page 2 of About is pinned with two states (research alone → news.log in),
  switched by a timed animation at the middle of the hold; the paper scene is
  pinned and scrolling picks the paper, which glides in (never half-way).
- Phones: real pages via native CSS scroll-snap (`[data-page]`), no Lenis;
  each page change re-deals the objects in the top part of the screen with a
  dip into depth; the page's text tilts in. Lighter material/geometry, lower
  pixel ratio, no antialiasing.
- Arrangement changes are timed glides (`W.blend`), not scroll-scrubbed.
  Chapter triggers are created after the pins (pin spacing) — keep that order.
- Tween `W` with `overwrite: 'auto'`, never `true` (it kills the other
  property tweens on `W`).
- Motion follows activity: lively while scrolling/changing, almost still while
  reading. Reduced motion gets a plain page; boot failure shows text after 3 s.
- Dev-only experiment pages (not built): `/split/`, `/news-ideas/`,
  `/layout-ideas/`; `?scene=objects` / `?scene=flow` on the homepage are lab
  modes that do nothing unless asked for.

## Gotchas

- Author names are wrapped per-name and `white-space: nowrap`, so a line
  breaks between authors and never inside one.
- `_data/education.json` carries a `supervisors` field that nothing renders.
- `_data/tools.json` and `_data/repos.json` are not rendered anywhere.
