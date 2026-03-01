# Section Flow v2 — Proper Implementation

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make sections flow one-at-a-time like mahnerzeichensprache.com — each section occupies the viewport, fades in as a whole when entering, and naturally scrolls away before the next appears.

**Architecture:** The secret is NOT complex scroll-linked JS or jalousie overlaps. mahnerzeichensprache achieves its flow with three simple things: (1) each section has `min-height: 600px` so it fills the viewport, (2) the entire section fades in as a unit via AOS-style `opacity: 0 → 1` transition, (3) generous `margin-bottom` between sections creates breathing room. We replicate this with IntersectionObserver on the sections themselves (not individual rows), removing all the broken scroll-linked JS and negative-margin stacking.

**Tech Stack:** 11ty v3, vanilla CSS, vanilla JS IntersectionObserver

---

## What went wrong before

1. **Jalousie with -3rem overlap** — Too small to create any real covering effect, just made sections visually clash
2. **Scroll-linked rAF opacity/transform on sections** — Janky, fought with CSS transitions, broke layout
3. **Bidirectional reveal on individual rows** — Caused flickering, rows appearing/disappearing independently
4. **Sticky section labels** — Competed for attention, fought with z-index stacking

## What mahnerzeichensprache actually does

```
section {
    min-height: 600px;    /* Each section FILLS the viewport */
    margin-top: 2rem;
    margin-bottom: 4rem;  /* Big gap between sections */
}

/* AOS: entire section starts invisible, fades in as a whole */
[data-aos="fade"] { opacity: 0; transition-property: opacity, transform; }
[data-aos="fade"].aos-animate { opacity: 1; }

/* Inner content slides up 100px */
[data-aos="fade-up"] { transform: translate3d(0, 100px, 0); }
[data-aos="fade-up"].aos-animate { transform: translate3d(0, 0, 0); }

/* AOS.init({ once: false }) — re-triggers when re-entering viewport */
```

No jalousie. No scroll-linked JS. No negative margins. Just tall sections + whole-section fade.

---

### Task 1: Strip all broken scroll effects

**Files:**
- Modify: `css/style.css`
- Modify: `_includes/base.njk`

**Step 1: Remove from css/style.css**

Delete these rules completely:
- The `will-change` / `transition` on `.hero, .section` (scroll-linked flow)
- The staggered reveal delays (`.pub-row.reveal:nth-of-type(...)`, `.oss-row.reveal:nth-of-type(...)`, `.edu-item.reveal:nth-of-type(...)`)

**Step 2: Remove from _includes/base.njk**

Replace the entire "Scroll-linked section flow" JS block (the large IIFE with `requestAnimationFrame`, `onScroll`, the reveal observer, and `reduceMotion` check) with a simple, clean reveal:

```js
// Scroll reveal
(function() {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(function(el) { el.classList.add('visible'); });
    return;
  }
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  els.forEach(function(el) { observer.observe(el); });
})();
```

This is the simple one-shot reveal — element fades in when it enters viewport, stays visible.

**Step 3: Build and verify**

Run: `npm run build && open _site/index.html`
Expected: No scroll-linked effects, no overlapping. Clean static page with simple fade-in.

**Step 4: Commit**

```bash
git add css/style.css _includes/base.njk
git commit -m "fix: strip broken scroll effects, restore simple reveal"
```

---

### Task 2: Add section-level fade-in (the real technique)

**Files:**
- Modify: `index.njk` — add `reveal` class to each `<section>` element itself
- Modify: `css/style.css` — add section fade styles with generous min-height

**Step 1: Wrap section CONTENT in a reveal container**

In `index.njk`, add a `<div class="section-content reveal">` wrapper inside each section (around everything AFTER the section-label). The section-label stays outside so it's always visible immediately, but the content block fades in as a unit.

Hero section — the hero already has reveal on individual elements, keep those.

About section:
```njk
<section class="section" id="about">
  <div class="section-label"><span class="section-number">01</span> About</div>
  <div class="section-content reveal">
    <p class="about-text">
      I study <strong>representation learning</strong> across humans and
      machines&mdash;combining computational modeling with cognitive science
      to understand how both systems <em>see</em> and <em>understand</em>
      the world.
    </p>
  </div>
</section>
```

Background section:
```njk
<section class="section" id="background">
  <div class="section-label"><span class="section-number">02</span> Background</div>
  <div class="section-content reveal">
    {% for edu in education %}
    <div class="edu-item">
      ...
    </div>
    {% endfor %}
  </div>
</section>
```

Publications section:
```njk
<section class="section" id="publications">
  <div class="section-label"><span class="section-number">03</span> Selected Publications</div>
  <div class="section-content reveal">
    {% for pub in publications %}
      {% if pub.selected %}
      <div class="pub-row">
        ...
      </div>
      {% endif %}
    {% endfor %}
    <button class="view-all-toggle" id="toggle-publications">View all publications &darr;</button>
    <div id="all-publications" class="expanded-publications" hidden>
      ...
    </div>
  </div>
</section>
```

Open Source section:
```njk
<section class="section" id="code">
  <div class="section-label"><span class="section-number">04</span> Open Source</div>
  <div class="section-content reveal">
    {% for repo in repos %}
    <div class="oss-row">
      ...
    </div>
    {% endfor %}
    <p class="view-all">...</p>
  </div>
</section>
```

Tools + Configs sections: same pattern.

Remove the `reveal` class from individual `.pub-row`, `.oss-row`, `.edu-item` elements — only the wrapper `.section-content` gets it.

**Step 2: Add section flow CSS**

```css
/* Section flow — generous height + whole-section fade */
.section {
  min-height: 60vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.section-content {
  /* This is the unit that fades in */
}
```

**Step 3: Update the reveal CSS for a slower, more cinematic transition**

```css
.reveal {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 1s cubic-bezier(0.25, 0.1, 0.25, 1),
              transform 1s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

The key differences from before:
- `translateY(40px)` — more noticeable upward slide (was 20px)
- `1s` duration — slower, more cinematic (was 0.8s)
- Applied to `.section-content` as a WHOLE, not individual rows

**Step 4: Build and verify**

Run: `npm run build && open _site/index.html`
Expected: Each section's content block fades in as one unit when scrolling into view. Sections are tall enough that you focus on one at a time.

**Step 5: Commit**

```bash
git add index.njk css/style.css
git commit -m "feat: section-level fade-in with generous min-height"
```

---

### Task 3: Mobile responsive adjustments

**Files:**
- Modify: `css/style.css`

**Step 1: Reduce min-height on mobile**

```css
@media (max-width: 768px) {
  .section {
    min-height: auto;
  }
}
```

On mobile, sections should use natural height — `60vh` min-height would create too much whitespace on small screens.

**Step 2: Build and verify**

Run: `npm run build && open _site/index.html`
Test at mobile widths.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: responsive section flow for mobile"
```

---

## Summary

| Before (broken) | After (correct) |
|-----------------|-----------------|
| -3rem negative margin jalousie | No overlapping — sections in normal flow |
| Scroll-linked rAF opacity/transform | Simple IntersectionObserver one-shot |
| Individual row reveal (flickering) | Whole section-content fades as one unit |
| Rows stagger independently | All content appears together, cohesive |
| No min-height (sections too short) | `min-height: 60vh` — each section fills viewport |
| Complex bidirectional fade in/out | Simple fade-in, stays visible |

The technique is fundamentally simple: tall sections + whole-section fade + generous spacing. No libraries, no complex JS.
