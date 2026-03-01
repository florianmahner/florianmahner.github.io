# One-Pager Redesign

## Summary

Convert the 4-page site into a single-page scrolling site. All content lives in `index.astro`. Nav uses anchor links with smooth scroll. Publications use a unified card system with auto-generated mini canvases. Selected work (top 3) shows by default; remaining papers expand inline.

## Page Structure

```
<nav>  About | Publications | Open Source | Misc  (#anchors)

<main>
  section#about        Intro + affiliations + social pills
  div.visual-strip     Hero embedding canvas
  section#publications Selected Work (3 cards) + expandable rest
  section#research     Research prose
  section#background   Education grid
  section#open-source  Repo cards grid
  section#misc         Tools chips + Configs

<footer>
```

## Unified Card System

One card pattern for all papers (replaces both work-card and paper-card):

- Layout: `grid: 100px 1fr` (canvas left, content right)
- Separator: `border-bottom: 1px solid var(--border)`
- Meta: venue in accent, 0.8rem, weight 500
- Title: 1.1rem, weight 400, line-height 1.4
- Authors: 0.88rem, muted, highlighted author weight 500
- Links: 0.8rem accent text, "Paper · Code" with dot separators

## Mini Generative Canvases

Each paper gets a `<canvas data-seed="hash">` (~100x70px):

- 2-3 dot clusters per canvas, seeded by title string hash
- Same teal palette as hero visual strip
- Dark-mode aware
- Deterministic (same title = same pattern)
- Generated client-side in one shared script block

## Navigation

- `config.yaml` items become `#about`, `#publications`, `#open-source`, `#misc`
- IntersectionObserver tracks visible section, updates `.active` on nav links
- `scroll-behavior: smooth` (already in CSS)
- Mobile hamburger nav unchanged, just anchor links

## Expand/Collapse

- "View all publications" button below selected 3
- Toggles hidden section with smooth height animation
- Button text: "View all publications ↓" / "Show less ↑"

## Files

| Action  | File                        | Notes                                    |
|---------|-----------------------------|------------------------------------------|
| Rewrite | src/pages/index.astro       | All content, single page                 |
| Update  | src/styles/styles.css       | Unify cards, remove paper-card divergence |
| Update  | src/layouts/BaseLayout.astro| IntersectionObserver for nav active state |
| Update  | config.yaml                 | Nav items → #anchors                     |
| Delete  | src/pages/publications.astro|                                          |
| Delete  | src/pages/open-source.astro |                                          |
| Delete  | src/pages/misc.astro        |                                          |
