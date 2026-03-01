# Mockup A Faithful Redesign — Design Document

## Goal

Redesign florianmahner.github.io to match the Mockup A ("Editorial Flow") aesthetic exactly. All 4 pages use a centered 720px single-column layout with a fixed frosted-glass top nav bar. The homepage opens with a research statement, not a name/hero. No interactive visualization for now. Typography and spacing must match mockup A precisely.

## Global Layout

- **720px** max-width container, centered
- **Fixed top nav**: frosted glass (`backdrop-filter: blur(12px)`), border-bottom
  - Left: "Florian P. Mahner" (0.95rem, weight 500, letter-spacing 0.02em)
  - Right: About, Publications, Open Source, Misc (0.88rem, muted) + theme toggle
  - Padding: 1.25rem horizontal
  - Active link: text color (not accent)
- **Content top padding**: 8rem (clears fixed nav + breathing room)
- **Footer**: copyright left, social links right, 0.8rem muted text

## Homepage (index.astro)

Sections top to bottom:

1. **Intro** — tagline (1.5rem, weight 300, max-width 600px), key terms in accent color + weight 400. Affiliations (0.9rem, muted). Social pills (0.8rem, bordered, hover → teal).
2. **Selected Work** — uppercase section label (0.75rem, weight 500, letter-spacing 0.1em, border-bottom). 3 paper cards: venue (0.8rem teal) + year (0.8rem muted), title (1.1rem, weight 400), description (0.88rem, secondary), topic tags (0.72rem pills), Paper/Web links.
3. **Research** — same label. Prose (0.95rem, secondary, line-height 1.7). Key terms: normal weight + primary color, not italic.
4. **Background** — same label. Grid: year (95px, 0.85rem muted, shortened "2021 – 25") + degree (0.95rem, weight 500) + institution + grade.

No FlowField component. No preview images on homepage.

## Publications Page

- Year headings as existing year-label style (font-size-lg, muted, medium weight)
- Paper cards with preview images, venue/year/abbr metadata, author highlighting, PDF/Web/Code links
- Top padding fixed to clear nav

## Open Source Page

- 2-column card grid (existing)
- Top padding fixed to clear nav

## Misc Page

- Tools grid + configs section (existing)
- Top padding fixed to clear nav

## Typography Reference (mockup A exact values)

| Element | Size | Weight | Color |
|---------|------|--------|-------|
| Nav name | 0.95rem | 500 | text |
| Nav links | 0.88rem | 400 | muted (#888) |
| Tagline | 1.5rem | 300 | text |
| Tagline accent | 1.5rem | 400 | accent |
| Affiliations | 0.9rem | 400 | muted |
| Social pills | 0.8rem | 400 | secondary (#555) |
| Section label | 0.75rem | 500 | muted, uppercase, 0.1em spacing |
| Work venue | 0.8rem | 500 | accent |
| Work year | 0.8rem | 400 | muted |
| Work title | 1.1rem | 400 | text |
| Work description | 0.88rem | 400 | secondary |
| Topic tags | 0.72rem | 400 | muted, pill border |
| Work links | 0.8rem | 400 | accent |
| Prose body | 0.95rem | 400 | secondary |
| Edu year | 0.85rem | 400 | muted |
| Edu degree | 0.95rem | 500 | text |
| Footer text | 0.8rem | 400 | muted |

## Colors

Unchanged from current config.yaml:
- Light accent: #0f766e, Dark accent: #5eead4
- Light bg: #fafaf9, Dark bg: #171717
- Muted text: #888 (mockup A) — currently #737373, update to match

## What Changes

1. Remove FlowField.astro component and its import from homepage
2. Fix content top padding on all pages (add padding-top to clear fixed nav)
3. Match exact font sizes/weights from mockup A table above
4. Update muted text color to #888 (from #737373)
5. Ensure "Florian P. Mahner" (with period) used everywhere
6. Dark mode nav backdrop uses dark bg with same blur
