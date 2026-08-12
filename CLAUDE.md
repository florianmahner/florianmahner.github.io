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

- `eleventy.config.js` — config, filters, shortcodes, ignore rules
- `index.njk` — the whole homepage: Hero, About, Academic Background,
  Selected Publications, Tools
- `_includes/base.njk` — layout: nav, footer, inline JS (scroll reveal via
  IntersectionObserver, active-section tracking)
- `_includes/pub-row.njk` — `pubRow()` macro; single source for a publication
  entry, used by both the selected and the expanded list
- `_data/*.json` — all content: `site`, `education`, `publications`, `repos`,
  `tools`
- `content/about.md` — About prose, injected via `{% mdfile "about" %}`
- `css/style.css` — the entire stylesheet
- `public/` — static assets copied to output root

Filters/shortcodes: `highlightAuthor` (wraps each author in
`<span class="author">`, adds `.self` for the site owner), `year`, `mdfile`.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to
**Cloudflare Workers** via wrangler on push to master. `src/index.js` is a
Worker that forces HTTPS and redirects to the canonical host
**florianmahner.com**. Despite the repo name, this is *not* GitHub Pages.

## Design system

Swiss-minimal: black text on a warm off-white ground, thin rules, a visible
column grid, uppercase section labels.

### Typography — read this before touching any type

The site uses **TNA**, a variable font with custom axes:
`wght` 0–100 and `srff` 0–100 (0 = Arial-like, 100 = Times-like).

**CSS `font-weight` does nothing here.** Weight comes only from
`font-variation-settings`. The `--fw-*` tokens still exist but are inert —
do not reach for them, and do not add new ones. To change weight, use a
`--vf-*` token.

Everything in the page body is **one size and one weight**:
`--fs-body` at `--vf-body` (`wght` 0). Hierarchy comes from *spacing*, not
from size, weight, or colour. The deliberate exceptions are, in full:

| Exception | What |
|---|---|
| `--fs-entry` + `--vf-body-medium` | `.pub-title`, `.edu-head` — entry headers; the only list content above body size (22.5px vs 21.25px) |
| `--vf-body-medium` (`wght` 40) | `.pub-authors .self`, `.about-content strong` — inline emphasis, weight only; a size step would break the line they sit in |
| `--fs-heading` | the first About paragraph only |
| `--vf-heading-bold` (`srff` 10) | uppercase UI labels; a genuinely different letterform |

The accent is for links and hover states only. Body text set in `--accent`
measures 3.73:1 on `--bg` — below the 4.5:1 minimum — so paper titles and
other running text stay black.

Adding a new size or weight anywhere else will look wrong. Two hard-won
lessons: identical-size text reads as *larger* when its column is narrower,
and as *heavier* when it is darker — so before changing a font-size, check
column width and colour first.

### Colour

All body text is pure `#000`; text colour is never declared, it inherits.
There are no grey text tokens — `--grey-rule` is for hairlines only, never
type. The accent (`--accent`, purple) is used for links and hover states.

### Layout

- `--page-w: 75rem` — container, in `rem` so it scales with the type
- `html { font-size: 125% }` — the whole scale; every other value is `rem`,
  so this one number resizes the site. Percentage, not `px`, so a reader's
  own font-size preference is preserved.
- `--content-max` bounds **every** text block. About, Background and
  Publications must share it — no per-section column widths, no indents.
  A narrower column changes how the type reads.
- Academic Background and Publications are flat blocks, left-aligned, with
  no year column. Years are inline (`2022–2026 | PhD …`) or in the footer
  metadata line.

## Content

- Publication: add to `_data/publications.json`; `selected: true` features it
  on the homepage. Keep `venue` short — long names wrap the footer onto a
  second line; abbreviate (e.g. "Proceedings of ICMLC").
- Education: add to `_data/education.json`. `startLabel` overrides the
  `startYear–endYear` range for open-ended entries ("From Oct 2026").
- Project page: add a `.md` or `.njk` file at the root.

## Gotchas

- The floating section number is hidden on desktop by a single
  `.nav-floater { display: none }` rule; delete it to restore. The same
  element **is** the mobile hamburger below 768px — do not remove the markup.
- Author names are wrapped per-name and `white-space: nowrap`, so a line
  breaks between authors and never inside one.
- `_data/education.json` carries a `supervisors` field that nothing renders.
