# Subtle Motion Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the florianmahner.com landing page feel more polished by adding scroll choreography (pop-in + stagger) and removing the persistent left side rail, while keeping the Swiss/brutalist visual language untouched.

**Architecture:** Pure CSS extensions to existing `.reveal` class plus a new `.reveal-stagger` utility, gated on `prefers-reduced-motion`. Side rail wrapped in a Nunjucks `{% if site.sideRail %}` flag, defaulting to off. Hover refinements via a `::after` pseudo-element. No new dependencies, no JS changes.

**Tech Stack:** 11ty (Eleventy) v3, Nunjucks templates, vanilla CSS. Deploys via existing GitHub Actions → Cloudflare Workers pipeline on `master` push.

**Reference:** `docs/plans/2026-05-01-subtle-motion-polish-design.md` (full design rationale and non-goals).

---

## Pre-flight

Verify clean working tree and confirm dev server still works as a baseline:

```bash
git status                       # expect: clean
npm run build                    # expect: writes _site/index.html and _site/sitemap.xml
```

If anything fails before changes, stop and resolve.

---

## Task 1: Toggle side rail via site.json flag

Removes the persistent side rail from the rendered page; preserves it as a one-flag-flip option for the future.

**Files:**
- Modify: `_data/site.json` — add `"sideRail": false` after the `"keywords"` line
- Modify: `_includes/base.njk:21` — wrap `<nav class="side-rail">…</nav>` (lines 21–42) in `{% if site.sideRail %}…{% endif %}`

**Step 1 — Edit site.json**

Add a new field. The exact diff:

```diff
   "keywords": "...",
+  "sideRail": false,
   "social": {
```

**Step 2 — Edit base.njk**

The current side-rail block in `_includes/base.njk` starts at line 21:

```nunjucks
<nav class="side-rail" aria-label="Section navigation">
  <a href="/#about" class="side-rail-item" data-nav="about">
    ...
  </a>
  ...
</nav>
```

Wrap the whole `<nav>…</nav>` block (it ends around line 42) in:

```nunjucks
{% if site.sideRail %}
<nav class="side-rail" aria-label="Section navigation">
  ...
</nav>
{% endif %}
```

**Step 3 — Build and visually verify**

```bash
npm run build
grep -c "side-rail" _site/index.html
```
Expected: `0` (no side-rail markup in built output).

Open `_site/index.html` in a browser. Side rail should be gone on desktop. Mobile hamburger and footer links should still work.

**Step 4 — Commit**

```bash
git add _data/site.json _includes/base.njk
git commit -m "Make desktop side rail opt-in via site.sideRail flag (default off)"
```

---

## Task 2: Upgrade `.reveal` with pop-in motion

Add scale + slight translateY + snappier easing to the existing reveal animation. Keeps the same JS (`IntersectionObserver` adding `.visible`), only changes CSS.

**Files:**
- Modify: `css/style.css:482-490` — replace existing `.reveal` and `.reveal.visible` rules

**Step 1 — Edit css/style.css**

Replace the block at lines 482–490:

```css
/* Scroll Reveal */
.reveal {
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

with:

```css
/* Scroll Reveal */
.reveal {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
  transition:
    opacity 500ms cubic-bezier(0.2, 0.7, 0.1, 1),
    transform 500ms cubic-bezier(0.2, 0.7, 0.1, 1);
}
.reveal.visible {
  opacity: 1;
  transform: none;
}
```

The existing `@media (prefers-reduced-motion: reduce)` block at line 535 already overrides `transition-duration` to near-zero, so reduced-motion users still see content instantly. No additional gating needed.

**Step 2 — Build and verify**

```bash
npm run build
```

Open `_site/index.html` in a browser. Scroll slowly. Each `.section-content` block should fade-in with a subtle scale-up — not just opacity. The hero name (`.hero-name.reveal`) should also pop in.

DevTools → Rendering → "Emulate CSS media feature `prefers-reduced-motion`" → `reduce`. Reload. Sections should appear instantly with no transform.

**Step 3 — Commit**

```bash
git add css/style.css
git commit -m "Upgrade .reveal to pop-in (scale + decel easing)"
```

---

## Task 3: Add `.reveal-stagger` utility class

Children of an element with both `.reveal` and `.reveal-stagger` animate in sequence, 80 ms apart.

**Files:**
- Modify: `css/style.css` — append after the existing `.reveal.visible` rule (after Task 2's edit)

**Step 1 — Append the stagger utility**

After the new `.reveal.visible` block, add:

```css
/* Stagger — children of .reveal.reveal-stagger animate in sequence */
.reveal-stagger > * {
  opacity: 0;
  transform: translateY(8px) scale(0.96);
  transition:
    opacity 500ms cubic-bezier(0.2, 0.7, 0.1, 1),
    transform 500ms cubic-bezier(0.2, 0.7, 0.1, 1);
}
.reveal-stagger.visible > * {
  opacity: 1;
  transform: none;
}
.reveal-stagger.visible > *:nth-child(1)  { transition-delay: 0ms; }
.reveal-stagger.visible > *:nth-child(2)  { transition-delay: 80ms; }
.reveal-stagger.visible > *:nth-child(3)  { transition-delay: 160ms; }
.reveal-stagger.visible > *:nth-child(4)  { transition-delay: 240ms; }
.reveal-stagger.visible > *:nth-child(5)  { transition-delay: 320ms; }
.reveal-stagger.visible > *:nth-child(6)  { transition-delay: 400ms; }
.reveal-stagger.visible > *:nth-child(7)  { transition-delay: 480ms; }
.reveal-stagger.visible > *:nth-child(8)  { transition-delay: 560ms; }
.reveal-stagger.visible > *:nth-child(9)  { transition-delay: 640ms; }
.reveal-stagger.visible > *:nth-child(n+10) { transition-delay: 720ms; }
```

**Step 2 — Build (no visible change yet — needs Task 4)**

```bash
npm run build
```

This task adds the utility but doesn't apply it anywhere yet. The build should succeed; visually nothing changes.

**Step 3 — Commit**

```bash
git add css/style.css
git commit -m "Add .reveal-stagger utility for sequenced child reveals"
```

---

## Task 4: Apply `reveal-stagger` to grouped lists

Wire up the new utility on the three sections that have repeating children.

**Files:**
- Modify: `index.njk` — three locations

**Step 1 — Locate the three section-content wrappers**

Run:

```bash
grep -n 'class="section-content reveal"' index.njk
```

Expected output: lines 14, 30, 47, 93, 118 (five `.section-content reveal` blocks).

Determine which contain repeating children:
- Line 14 (about) — single text block, **skip**
- Line 30 (background) — multiple `.edu-item` direct children → stagger
- Line 47 (publications) — multiple `.pub-row` children → stagger
- Line 93 (code / open source) — multiple `.oss-row` children → stagger
- Line 118 (tools) — read the surrounding markup; only stagger if it has multiple direct children

Run to inspect tools section:

```bash
sed -n '115,140p' index.njk
```

If the tools `.section-content` has multiple direct children you want staggered, add `reveal-stagger`. Otherwise leave it.

**Step 2 — Edit index.njk**

For lines 30, 47, 93 (and 118 if applicable), change:

```nunjucks
<div class="section-content reveal">
```

to:

```nunjucks
<div class="section-content reveal reveal-stagger">
```

**Step 3 — Build and verify**

```bash
npm run build
grep -c "reveal reveal-stagger" _site/index.html
```

Expected: `3` (or `4` if tools also got it).

Open in browser. Scroll to publications: cards should appear one by one (~80 ms apart), not all at once. Same for background and code sections.

**Step 4 — Commit**

```bash
git add index.njk
git commit -m "Apply reveal-stagger to background, publications, code lists"
```

---

## Task 5: Smooth anchor-link scroll

Use native `scroll-behavior: smooth` for footer link clicks (and any other in-page anchors).

**Files:**
- Modify: `css/style.css` — find a top-level rule, add `scroll-behavior` to `html`

**Step 1 — Locate where `html` or `:root` styles live**

Run:

```bash
grep -n "^html\|^:root\b" css/style.css | head -5
```

Find the first `html { … }` block (if exists) or the global reset. If there's a clean `html` block, add `scroll-behavior: smooth;` to it. If not, add a new rule near the top of the file (just inside the global section).

**Step 2 — Add the rule, scoped to no-preference users**

Add (near top of stylesheet, in the global / reset area):

```css
@media (prefers-reduced-motion: no-preference) {
  html { scroll-behavior: smooth; }
}
```

This is a separate rule (don't merge it into an existing `html` block) so the media query is explicit and reduced-motion users skip it.

**Step 3 — Build and verify**

```bash
npm run build
```

Open in browser. Scroll to bottom, click the footer "Email" link (no — that's mailto). Instead: open browser dev tools, run in console:

```js
document.querySelector('a[href="/#publications"]') ?? location.hash = '#publications';
```

Or click any in-page anchor (mobile nav has them). Should smooth-scroll, not snap.

**Step 4 — Commit**

```bash
git add css/style.css
git commit -m "Smooth-scroll anchor-link jumps (gated on no-preference)"
```

---

## Task 6: Card hover — red bottom-border accent

Cards already lift on hover. Add a 1 px red bottom-border that slides in from left over 200 ms.

**Files:**
- Modify: `css/style.css` — find the `.pub-row` and `.oss-row` (or `.repo-card` / `.publication-card`) hover rules

**Step 1 — Identify the actual hover selector**

Run:

```bash
grep -n ":hover" css/style.css | grep -iE "pub|oss|repo|card" | head -20
```

Note the exact selectors used for hover lift. The accent may belong on `.pub-row` and `.oss-row` parents, or on `.pub-row a` / `.oss-row a`. Pick the one already styled on hover.

**Step 2 — Add the `::after` accent**

For each hovered card, add:

```css
/* Red border-accent slides in from left on hover */
.pub-row,
.oss-row {
  position: relative;
}

.pub-row::after,
.oss-row::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 1px;
  background: var(--accent);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 200ms ease-out;
  pointer-events: none;
}

.pub-row:hover::after,
.oss-row:hover::after {
  transform: scaleX(1);
}
```

If the existing cards have `position: static` or rely on their layout differently, adjust — verify by opening DevTools after build and inspecting that the `::after` doesn't disrupt grid layout. If it does, scope `position: relative` to just the parent.

Also unify the existing hover lift if it varies — set both to `transform: translateY(-2px)` on hover. Don't change the offset shadow.

**Step 3 — Build and verify**

```bash
npm run build
```

Open in browser. Hover any publication card or repo card — a red bar should slide in from the left along the bottom edge over ~200 ms. The card should also lift 2 px. Existing brutalist offset shadow unchanged.

Hover-out: bar should slide out (or fade — `scaleX(0)` reverses). Confirm no layout shift.

**Step 4 — Commit**

```bash
git add css/style.css
git commit -m "Add red bottom-border accent on card hover (slides from left)"
```

---

## Task 7: Final verification + deploy

End-to-end browser smoke test, then push.

**Step 1 — Full local smoke test**

```bash
npm run build
```

Open `_site/index.html`. Walk through:

1. Scroll from top to bottom slowly. Each section pops in. Lists stagger.
2. Click a section anchor (mobile menu link) — smooth scroll.
3. Hover over a publication card — red bar slides in, card lifts.
4. DevTools → Rendering → emulate `prefers-reduced-motion: reduce` → reload → all motion disabled, content instant.
5. Mobile viewport (DevTools device toolbar) → hamburger menu still opens overlay correctly.
6. Confirm no side rail visible on any viewport.

**Step 2 — Push (triggers GitHub Actions auto-deploy to Cloudflare)**

```bash
git push
```

**Step 3 — Verify deploy**

```bash
sleep 30
gh run list --workflow=deploy.yml --limit 1
```

Expected: latest run `completed success`. If it's still running, wait and re-check.

**Step 4 — Verify live**

```bash
curl -s https://florianmahner.com | grep -c "reveal-stagger"
```

Expected: `≥3`.

Open https://florianmahner.com in a browser. Hard reload (Cmd-Shift-R). Confirm motion behaves the same as local.

---

## Rollback

Any task can be reverted independently with `git revert <sha>`. To roll back the entire feature in one shot:

```bash
git log --oneline | head -10                         # find the pre-Task-1 SHA
git revert --no-commit <pre-Task-1-SHA>..HEAD
git commit -m "Revert subtle motion polish"
git push
```

The deploy auto-runs on push. No external state involved.
