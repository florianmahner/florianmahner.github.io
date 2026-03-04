# Side-Rail Index Navigation

## Problem
Current navbar is a generic horizontal link row that doesn't match the site's Swiss/neobrutalist design language. It feels invisible and bolted-on rather than structural.

## Solution
A vertical side-rail nav fixed to the left edge (desktop) that becomes part of the grid architecture. On mobile, it transforms into a fixed bottom bar with section numbers.

## Desktop (> 768px)

- `position: fixed` on the left side, vertically centered
- Sits alongside the `.page` container's left border, becoming part of the grid
- ~60px wide, transparent background
- 4 stacked nav items with generous vertical spacing

### Nav item anatomy
- Section number: `--fw-black` (900), ~13px, formatted as `01` `02` `03` `04`
- Section label: `--fs-micro`, uppercase, `letter-spacing: 0.1em`, horizontal
- Default: `--grey-mid`
- Hover: color to `--black`, number to `--accent`
- Active: 3px `--accent` left bar, label `--black`, number `--accent`
- Weight shift via `font-variation-settings`

## Mobile (< 768px)

- Fixed bottom bar, full width, ~52px tall
- `background: --white`, `border-top: var(--rule)`
- 4 items with `justify-content: space-around`
- Shows section numbers only (`1` `2` `3` `4`) in `--fw-bold`
- Active: `--accent` color + 2px red top-border indicator
- Tap scrolls to section

## Removals
- Hamburger button, slide-in panel, overlay — all removed
- Mobile nav JS (open/close/overlay) — removed
- `.nav-links` horizontal row — removed

## Layout adjustments
- Desktop: `.page` gets slight `margin-left` for side rail clearance
- Mobile: `padding-bottom` on body to prevent footer overlap with bottom bar

## Interaction
- Reuses existing IntersectionObserver for active section tracking
- Smooth scroll via existing `scroll-behavior: smooth`
- JS simplifies significantly
