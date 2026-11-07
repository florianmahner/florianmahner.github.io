# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
npm run dev      # dev server with live reload — http://localhost:8080
npm run build    # production build to _site/
```

## Architecture

Personal academic website. **Eleventy (11ty) v3**, Nunjucks templates, vanilla
CSS, no client-side framework and no build step beyond 11ty.

- `eleventy.config.js` — config, filters, shortcodes, font passthrough
- `js/motion.js` — breathing dot grid and the name intro (see Motion)
- `index.njk` — the whole homepage: hero (name, About, News card),
  Selected publications, Background, footer
- `_includes/base.njk` — homepage layout: head/SEO/JSON-LD, inline JS
  (scroll reveal, News + publications toggles)
- `_includes/pub-row.njk` — `pubRow()` macro; one publication card, used by
  both the selected and the expanded list
- `_includes/icons.njk` — `socialIcons()` macro; icon-only contact links
- `_data/*.json` — all content: `site`, `education`, `publications`, `news`,
  `repos`, `tools`
- `content/about.md` — About prose, injected via `{% mdfile "about" %}`
- `css/style.css` — the entire stylesheet
- `public/` — static assets copied to output root
- Fonts are self-hosted from `@fontsource-variable/inter` and
  `@fontsource-variable/geist-mono` (copied to `/fonts/` at build)

Filters/shortcodes: `highlightAuthor` (wraps each author in
`<span class="author">`, adds `.self` for the site owner), `mdInline`,
`monthName`, `yearOf`, `year`, `mdfile`.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to
**Cloudflare Workers** via wrangler on push to master. `src/index.js` is a
Worker that forces HTTPS and redirects to the canonical host
**florianmahner.com**. Despite the repo name, this is *not* GitHub Pages.

## Design system

Soft grey dot-grid ground, white "window" cards with a black 1.5px border and
a hard steel-blue offset shadow, Inter for text, Geist Mono for small labels
(news.log, show older, dates, venues, PDF/Web links). Light by default; an
automatic deep-warm dark theme follows the reader's system setting (`@media (prefers-color-scheme: dark)` block in
`css/style.css` — every colour is a token, so that block is the whole theme).

### Rules the owner has asked for — keep them

- **Content is the owner's wording.** Never paraphrase About, publications
  or Background; never invent copy, taglines or labels.
- **No horizontal rules between sections**, no section numbers ("01", "02"),
  no arrows (→ ↗ ←), no filler text (domain name, entry counts).
- **Links are violet with no underline**; hover adds a soft violet highlight.
- **Contact links are icons only**, in one row under the name on every
  screen size.
- **All publication cards look the same** — no highlighted/coloured card.
- News is a card titled `news.log` on the right of the hero, not a separate
  page; all items sit in one list that scrolls inside the card (soft fade at
  the bottom), no "show older" button.
- Publications: the selected three show by default; `show more` / `show less`
  opens the rest as a sideways-scrolling row of the same cards (`.pub-more`),
  next to a `Google Scholar` link for the full list. Don't say "All 10".
- The name sits on one line, medium size, above the About/News row.
- Violet is only for links and the dot after the name — never card chrome.
- Dark mode: cards are lighter than the page and the offset shadow darker
  (black), or the 3D window look goes flat. Text is warm off-white, never #fff.

### Tokens (`:root` in `css/style.css`)

- Colour: `--bg` #eeeff1, `--ink` (body) and `--strong` (name, headings,
  lead), `--muted`/`--quiet` greys for secondary text and labels, `--card`,
  `--bar` (card title strips), `--line` (borders), `--shadow-color` (steel
  #b2c1d9 light, #000 dark), `--accent` (the dot), `--link` #6d28d9.
- Type: exactly six sizes — `--fs-name` (hero), `--fs-heading` (section
  headings), `--fs-lead` (first About paragraph), `--fs-body` (body and card
  titles, which are bold), `--fs-small` (authors, news; a smaller value on
  phones), `--fs-mono` (labels). Never add a seventh; hierarchy inside a
  card comes from weight, not size.
- Layout: one 12-column grid (`.grid`, `--gap`). Under the one-line name the
  hero is 8 + 4 columns,
  publication cards span 4, Background cards span 3, so the News card lines
  up with the third publication card. Breakpoints: 1100px (Background 2-up),
  960px (hero stacks, publications 2-up), 640px (selected publications and Background become sideways-swipe rows via
  `.swipe`, which is `display: contents` on larger screens).

### Motion

All motion lives in `js/motion.js`, configured by `background` and `intro` in
`_data/site.json` (rendered as `data-bg` / `data-intro` on `<html>`):

- `background: "breathe"` — a slow wave rolls across the dot grid, drawn on a
  fixed canvas at 30 fps; colours come from `--dots`, so dark mode just works.
  `"none"` keeps the static CSS dots.
- `intro: "hop"` — the name is static; the dot pops in, then hops with
  squash-and-stretch and sends out one ring (`.accent-dot.ring`). `"none"`
  shows it at rest. (A typing reveal of the name was tried and removed.)
- `.reveal` elements rise in via IntersectionObserver (`base.njk`, gated by
  the `.js` class so no-JS readers see everything); cards lift on hover.
- Everything is off under `prefers-reduced-motion`; the grid pauses in hidden
  tabs. `?bg=` and `?intro=` override the defaults.
- Rejected, don't bring back: cursor-driven pulling/swirling grid, graph /
  cluster / attractor backgrounds ("looks like astro stuff"), a dot falling
  from the top.

## Content

- News: add to the **top** of `_data/news.json` (newest first, the file
  order is the display order). `date` is `YYYY-MM`; `text` is inline
  markdown, written as a full first-person sentence ending in "!", e.g.
  "Our paper [Title](url) was accepted to NeurIPS 2026!". All items are in
  the scrolling news.log list.
- Publication: add to `_data/publications.json`; `selected: true` features it
  on the homepage. Keep `venue` short (e.g. "NeurIPS"); a venue containing
  "arXiv" renders as a grey preprint label.
- Education: add to `_data/education.json`. `startLabel` overrides the
  `startYear–endYear` range for open-ended entries ("Oct 2026–present").

## World view (`/world/`)

An immersive alternative to the homepage, linked from the footer ("3D view";
hidden on phones for now) and `noindex`. Files: `world.njk`,
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
