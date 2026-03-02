# Alignment System Plan

## Problem
Content right edges are inconsistent across sections. About text at 640px with a grid offset is "cut off too early." About text at 760px flush left makes body-font lines too long.

## Design: Shared right edge at `--measure-full` (~760px)

All content ends at the same imaginary vertical line: `calc(var(--col-year) + var(--space-xl) + var(--measure))` ≈ 760px from left.

### How each section achieves this:

| Section | Left edge | Body width | Right edge |
|---------|-----------|-----------|------------|
| `.about-text` (lead) | 0 (flush left) | `--measure-full` (760px) | ~760px |
| `.about-detail` (body) | `--col-year + gap` (7.5rem indent) | `--measure` (640px) | ~760px |
| Background (edu) | grid: year at 0 | body at 7.5rem, `1fr` | content-dependent |
| Publications | grid: year at 0 | body at 7.5rem, `--measure` cap | ~760px |
| Open Source | grid: lang at 0 | body at 7.5rem, `--measure` cap | ~760px |
| Tools (chips) | 0 (flush left) | `--measure-full` (760px) | ~760px |

### Why this works:
- Lead paragraph at 760px with lead font (~28px) = ~43 chars/line — readable
- Body detail at 640px with body font (16px) = ~65 chars/line — ideal
- The "step in" from lead to detail creates intentional Swiss typographic hierarchy
- All grid body content naturally aligns (same `--col-year` + `--space-xl` offset)

## Tasks

### Task 1: Clean up broken CSS state
- Remove `.about-grid` (line 101, unused — HTML has no such class)
- Revert `.tools-grid` back to flex layout (currently has grid columns but HTML doesn't have `.tools-list` wrapper)
- Remove `--measure-full` if we inline the calc, or keep it

### Task 2: About section alignment
- `.about-text`: `max-width: var(--measure-full)` — lead spans wider, flush left
- `.about-detail`: add `margin-inline-start: calc(var(--col-year) + var(--space-xl))` + keep `max-width: var(--measure)` — body text steps into grid spine

### Task 3: Tools section alignment
- `.tools-grid`: revert to `display: flex; flex-wrap: wrap; gap: var(--space-md) var(--space-sm); max-width: var(--measure-full)`
- Remove `.tools-list` (unused in HTML)

### Task 4: Mobile responsive
- At 768px: remove `.about-detail` indent (margin-inline-start: 0) since grid columns collapse
- Tools grid stays full-width on mobile (already fine)

### Task 5: Build and verify
- `npm run build`
- Verify right edges align visually
