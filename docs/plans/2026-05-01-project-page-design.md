# Project Page Template — Design

Date: 2026-05-01
Status: Approved, building first instance for Mahner et al. 2025

## Goal

Standard ML-paper project page (à la nerfies.github.io) at `/projects/<slug>/`. First page showcases *Dimensions underlying the representational alignment of deep neural networks with humans* (Nature Machine Intelligence, 2025). Visual-driven, minimal text, real paper figures. Reuses the homepage's design tokens so a project page looks like an extension of the main site.

## Non-goals

- Not a full reading experience — links to the actual paper for depth.
- No interactive demos, no JS visualizations beyond what already exists.
- No CMS or fancy data pipeline; each project is one markdown file with frontmatter.

## Page anatomy

1. **Back link** — small "← Florian P. Mahner" top-left
2. **Title block** — paper title (fs-title, smaller than homepage hero), authors with `*` markers, venue + year, button row of links (PDF, Nature HTML, arXiv, BibTeX, Code if any)
3. **TL;DR** — 1–2 sentences (fs-heading)
4. **Hero figure** — Figure 1 from the paper (full-width within content-max)
5. **3 short panels**, each = headline + paragraph (≤25 words) + figure:
   - The Question
   - The Approach
   - What We Found
6. **BibTeX** — collapsible `<pre>` block
7. **Footer** — same component as homepage

## Files

| File | Purpose |
|---|---|
| `projects/representational-alignment.md` | Content for the first project (markdown body + frontmatter) |
| `_includes/project.njk` | Layout shared by all future project pages — receives page frontmatter, wraps content in the title block + footer |
| `css/style.css` | Append `.project-*` rules in their own block; no homepage CSS modified |
| `public/projects/representational-alignment/fig*.{jpg,png}` | Paper figures, fetched from the open-access Nature article |
| `eleventy.config.js` | Possibly add `projects/` to template formats (already covered if .md is included) |

## Frontmatter shape

```yaml
---
layout: project.njk
title: "Dimensions underlying the representational alignment of deep neural networks with humans"
authors:
  - { name: "Florian P. Mahner", equal: true, self: true }
  - { name: "Lukas Muttenthaler", equal: true }
  - { name: "Umut Güçlü" }
  - { name: "Martin N. Hebart" }
venue: "Nature Machine Intelligence"
year: 2025
links:
  pdf: "https://www.nature.com/articles/s42256-025-01041-7.pdf"
  html: "https://www.nature.com/articles/s42256-025-01041-7"
  arxiv: "https://arxiv.org/abs/2406.19087"
  bibtex: "..."
permalink: "/projects/representational-alignment/"
---
```

The body of the markdown file uses standard Markdown for the TL;DR + 3 panels. Figure-only blocks use a small `{% figure %}` shortcode (or just plain `<img>` since we're rendering markdown through markdown-it, which will pass HTML through).

## Style notes

- Title in `--fs-title` but with a max clamp of ~5rem (smaller than homepage hero's 7.5rem) — done by adding a class wrapper, not by adding a 5th tier.
- Hero figures sit on `--bg` (off-white), no border, dropshadow.
- Button row: outline style, 2px black border, no offset shadow (different from publication cards — keeps them quieter).
- Body text remains `--fs-body` matching the rest of the site.

## Verification

- Build passes.
- `/projects/representational-alignment/` returns 200 after deploy.
- Page renders correctly on mobile (375px viewport) — figures full width, button row wraps.
- All paper-figure images load; alt text describes each.
- "Back to home" link returns to `/`.

## Future projects

To add a second project: drop another `.md` file in `projects/`, set its `permalink`, push. No template changes needed.
