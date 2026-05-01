# Subtle Motion Polish — Design

Date: 2026-05-01
Status: Approved, ready for implementation

## Goal

Make `florianmahner.com` feel "fancier" through layered scroll choreography without changing the existing Swiss minimal + brutalist visual language. Removes the persistent left side rail (toggleable for future use). Implementation should be small enough to revert in a single commit.

## Non-goals

- No redesign of layout, typography, color palette, or component structure.
- No new dependencies (no GSAP, Framer Motion, Lenis, etc. — pure CSS + the existing `IntersectionObserver`).
- No structural changes to `index.njk`. Only class additions where staggering is desired.
- No animations for users with `prefers-reduced-motion: reduce` — instant visibility, exactly as today.

## Changes

### 1. Side rail becomes toggleable, default off

Wrap the `<nav class="side-rail">` block in `_includes/base.njk` in `{% if site.sideRail %}…{% endif %}`. Add `"sideRail": false` to `_data/site.json`. The mobile hamburger overlay stays (mobile users still need a way to navigate). Footer links also stay.

If a future redesign wants the rail back, flip the flag.

### 2. Scroll reveal upgrade

Extend the existing `.reveal` class in `css/style.css`. The current rule fades opacity. New rule:

- Initial: `opacity: 0; transform: translateY(8px) scale(0.96);`
- Visible: `opacity: 1; transform: none;`
- Transition: `opacity 500ms cubic-bezier(0.2, 0.7, 0.1, 1), transform 500ms cubic-bezier(0.2, 0.7, 0.1, 1);`

The `.visible` class (added by the existing `IntersectionObserver` in `base.njk`) flips it on. The JS does not change.

### 3. Stagger for grouped children

A new utility class `reveal-stagger`. When a parent has both `reveal` and `reveal-stagger`, its direct children fade/scale in 80ms apart instead of all at once. Pure CSS via `transition-delay` on `:nth-child(n)`.

Apply `reveal-stagger` to:
- Publication list (selected + all)
- Repo / Open Source card list
- Education / Background list

Cap at ~10 children — beyond that the last items feel sluggish, so further children share the final delay.

### 4. Anchor-click smooth scroll

Add `html { scroll-behavior: smooth; }` (gated on `(prefers-reduced-motion: no-preference)` via media query). No JS needed; native is fine for one-page site.

### 5. Card hover refinement

Existing repo and publication cards already lift on hover. Tighten:

- Translate: `translateY(-2px)` (currently varies — unify)
- Add a 1px red bottom-border that slides in from left over 200ms. Implement via a `::after` pseudo-element with `transform-origin: left` and `scaleX(0) → scaleX(1)`.
- Keep the existing 3px offset shadow exactly as-is (it's the brutalist signature).
- Transition duration: `200ms ease-out`.

## Files touched

| File | Change |
|---|---|
| `_data/site.json` | Add `"sideRail": false` |
| `_includes/base.njk` | Wrap side rail block in `{% if site.sideRail %}` |
| `css/style.css` | Extend `.reveal`, add `.reveal-stagger > *`, refine card hover, add `scroll-behavior` rule |
| `index.njk` | Add `reveal-stagger` class to publication, repo, education lists |

No JS changes. The existing `IntersectionObserver` already toggles `.visible` correctly.

## Accessibility

The existing `prefers-reduced-motion` branch in `base.njk` adds `.visible` immediately, bypassing transitions. The new transform-based reveal must also respect it — accomplished by scoping the `transform` properties under `@media (prefers-reduced-motion: no-preference)`. Reduced-motion users see static content with no movement.

## Verification

- Build site, open in browser, scroll through every section. Each should pop in with the new motion.
- Toggle `sideRail: true` in site.json — rail should reappear without other changes.
- DevTools → emulate `prefers-reduced-motion: reduce` — confirm no transforms run, content visible immediately.
- Smoke-test mobile viewport — hamburger overlay still works.

## Rollback

`git revert <sha>` undoes everything in one step. No DB / config / external state involved.
