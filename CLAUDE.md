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
- `js/site.js` — the only script: where the publications row scrolls
  sideways (narrow windows), a mouse wheel over it moves the row
- `_data/*.json` — all content: `site`, `education`, `publications`, `news`
- `content/about.md` — About prose, injected via `{% mdfile "about" %}`
- `public/` — copied to the site root: favicon, robots.txt and `vimrc`
- `archive/theses/` — the bachelor and master thesis PDFs, kept in the
  repository but **not published** (owner's decision, 2026-11-16). To put
  them online again, move them back to `public/pdf/`.
- `analytics/` — a separate reporting tool (`npm run analytics`), not part
  of the site
- Jost is self-hosted from `@fontsource-variable/jost` (copied to `/fonts/`)

Filters/shortcodes: `highlightAuthor` (wraps each author in
`<span class="author">`, adds `.self` for the site owner), `mdInline`,
`monthName`, `yearOf`, `year`, `mdfile`, `inlineCss`.

**Content checks:** `checkContent()` in `eleventy.config.js` runs before every
build and fails it, naming file and entry, on a missing field, a malformed
news date, or a publication `art` with no matching drawing.

**Kept deliberately small (cleanup of 2026-11-16).** Everything that was not
part of the live homepage was removed: the lab pages (`/world/`, `/split/`,
`/news-ideas/`, `/layout-ideas/`), the parked blue variant (`/classic/`), the
previous design's stylesheet, scripts and fonts, the dev colour panel, the
`docs/` folder and 21 MB of unused preview GIFs. All of it is still in git at
the tag `before-cleanup`; the lab scroll experiments are also on the local
branch `scroll-lab`. Don't add experiment pages to this repository again;
use the design canvas.

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
- Links in running text are coloured text without underline (red; rosa
  inside News), underlined only under the pointer.
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
- **Motion** lives in the `motion` layer and is opt-in: spatial movement only
  inside `prefers-reduced-motion: no-preference`, scroll-driven effects
  behind `@supports`. Phones: the ring turns as the header scrolls away.
  Desktop: the ring turns once when the page opens. The News list fades at
  its edges; a card's drawing lifts on hover. No JavaScript animation.
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
- Only papers with `selected: true` appear on the page; the rest are left
  to Google Scholar. `"conference": true` marks conference papers (kept as
  data, not shown). Every paper shown needs a drawing (`art`) that depicts
  what it is about.
- Publication: add to `_data/publications.json`; `selected: true` features it
  on the homepage. The card links to `html` (or `pdf`). `art` names a drawing
  in `_includes/art/`.
- Education: add to `_data/education.json`. `startLabel` overrides the
  `startYear–endYear` range for open-ended entries ("Oct 2026–present").

## Gotchas

- Author names are wrapped per-name and `white-space: nowrap`, so a line
  breaks between authors and never inside one.
- `_data/education.json` carries a `supervisors` field that nothing renders.
