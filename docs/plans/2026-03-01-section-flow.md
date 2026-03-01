# Section Flow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make sections flow into each other as the user scrolls — each section slides over the previous one (jalousie/venetian-blind effect), with smooth fade-in/out transitions, inspired by mahnerzeichensprache.com.

**Architecture:** Each section gets an increasing z-index and a small negative margin-top so it physically overlaps and covers the section above. Combined with a scroll-linked IntersectionObserver that fades content in on enter AND out on leave (replacing the current one-shot reveal). Sections get their own background color so the overlap creates a clean "sliding panel" effect. No external libraries — pure CSS + vanilla JS.

**Tech Stack:** 11ty v3, vanilla CSS, vanilla JS IntersectionObserver

---

### Task 1: Add section stacking with negative margins and z-index

**Files:**
- Modify: `css/style.css`

**Step 1: Add stacking styles to sections**

Each `.section` gets an increasing z-index (via CSS counter or nth-child) and a negative margin-top so it overlaps the previous section. A subtle top shadow creates depth.

Add after the existing `.section` rule:

```css
/* Section stacking — jalousie effect */
.section {
  position: relative;
  background: var(--white);
}

/* Each section overlaps the previous by sliding over it */
.section + .section {
  margin-top: -3rem;
  padding-top: calc(5rem + 3rem); /* original padding + overlap compensation */
  box-shadow: 0 -20px 40px rgba(0, 0, 0, 0.04);
}

/* Stacking order — later sections sit on top */
.hero      { z-index: 1; position: relative; background: var(--white); }
#about     { z-index: 2; }
#background { z-index: 3; }
#publications { z-index: 4; }
#code      { z-index: 5; }
#tools     { z-index: 6; }
.footer    { z-index: 7; position: relative; background: var(--white); }
```

**Step 2: Build and verify**

Run: `npm run build && open _site/index.html`
Expected: Sections visually overlap — scrolling down reveals each section sliding over the previous one.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add section stacking with negative margins (jalousie effect)"
```

---

### Task 2: Upgrade scroll reveal to fade in AND out

**Files:**
- Modify: `_includes/base.njk` (JS section)
- Modify: `css/style.css` (reveal classes)

**Step 1: Update the IntersectionObserver in base.njk**

Replace the current one-shot reveal observer with a bidirectional one. Elements fade in when entering viewport, fade out when leaving (scrolling past). Use a generous rootMargin so transitions feel smooth.

Replace the existing scroll reveal JS block:

```js
// Scroll reveal — bidirectional (fade in + fade out)
(function() {
  var els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(function(el) { el.classList.add('visible'); });
    return;
  }
  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      } else {
        entry.target.classList.remove('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -5% 0px' });
  els.forEach(function(el) { observer.observe(el); });
})();
```

**Step 2: Update reveal CSS for slower, smoother transitions**

```css
/* Scroll Reveal — bidirectional */
.reveal {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.8s cubic-bezier(0.25, 0.1, 0.25, 1),
              transform 0.8s cubic-bezier(0.25, 0.1, 0.25, 1);
}
.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}
```

**Step 3: Add staggered delays for rows within sections**

So publication rows and repo rows don't all appear at once — they cascade in with slight delays:

```css
/* Staggered reveal for rows */
.pub-row.reveal:nth-of-type(2) { transition-delay: 0.08s; }
.pub-row.reveal:nth-of-type(3) { transition-delay: 0.16s; }
.pub-row.reveal:nth-of-type(4) { transition-delay: 0.24s; }
.oss-row.reveal:nth-of-type(2) { transition-delay: 0.08s; }
.oss-row.reveal:nth-of-type(3) { transition-delay: 0.08s; }
.oss-row.reveal:nth-of-type(4) { transition-delay: 0.16s; }
.edu-item.reveal:nth-of-type(2) { transition-delay: 0.08s; }
.edu-item.reveal:nth-of-type(3) { transition-delay: 0.16s; }
```

**Step 4: Build and verify**

Run: `npm run build && npm run dev`
Expected: Elements fade in when scrolling down, fade out when scrolling back up. Rows stagger in.

**Step 5: Commit**

```bash
git add _includes/base.njk css/style.css
git commit -m "feat: upgrade scroll reveal to bidirectional with stagger"
```

---

### Task 3: Add section label parallax-like sticky effect

**Files:**
- Modify: `css/style.css`

**Step 1: Make section labels slightly sticky**

The section labels (e.g., "02 Background", "03 Selected Publications") stick briefly at the top of their section as content scrolls past, creating a subtle parallax-like feel:

```css
.section-label {
  position: sticky;
  top: 4.5rem; /* just below the nav */
  z-index: 1;
  background: var(--white);
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}
```

**Step 2: Build and verify**

Run: `npm run build && npm run dev`
Expected: Section labels stick at the top while the section content scrolls beneath them.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add sticky section labels for parallax-like flow"
```

---

### Task 4: Fine-tune hero and footer transitions

**Files:**
- Modify: `css/style.css`
- Modify: `index.njk` (add reveal class to hero content)

**Step 1: Hero fades out as About slides over it**

The hero content should gently fade as the user scrolls and the About section covers it. Add a reveal class to hero content in index.njk:

```njk
<section class="hero" id="top">
  <h1 class="hero-name reveal">Florian P<span class="accent-dot">.</span><br>Mahner</h1>
  <div class="hero-role reveal">{{ site.title }}</div>
  <hr class="hero-rule reveal">
</section>
```

**Step 2: Footer slides up over the last section**

```css
.footer {
  margin-top: -2rem;
  padding-top: calc(2rem + 2rem);
  box-shadow: 0 -20px 40px rgba(0, 0, 0, 0.04);
}
```

**Step 3: Build and verify**

Run: `npm run build && npm run dev`
Expected: Scrolling down — hero name fades out as About slides over. Footer slides up cleanly.

**Step 4: Commit**

```bash
git add index.njk css/style.css
git commit -m "feat: hero fade-out and footer slide-up transitions"
```

---

### Task 5: Responsive adjustments for section flow

**Files:**
- Modify: `css/style.css`

**Step 1: Reduce overlap on mobile**

On small screens, reduce negative margins and shadows since the stacking effect is less impactful:

```css
@media (max-width: 768px) {
  .section + .section {
    margin-top: -1.5rem;
    padding-top: calc(2.5rem + 1.5rem);
    box-shadow: 0 -10px 20px rgba(0, 0, 0, 0.03);
  }
  .footer {
    margin-top: -1rem;
    padding-top: calc(2rem + 1rem);
  }
  .section-label {
    position: relative;
    top: auto;
  }
}
```

**Step 2: Respect prefers-reduced-motion**

The existing `prefers-reduced-motion` rule already kills transitions/animations. Verify it works with the new styles.

**Step 3: Build and verify**

Run: `npm run build && npm run dev`
Test: Resize to mobile — reduced overlap, no sticky labels.

**Step 4: Commit**

```bash
git add css/style.css
git commit -m "feat: responsive adjustments for section flow"
```

---

## Summary

| Technique | Inspiration | Implementation |
|-----------|-------------|---------------|
| Jalousie stacking | `margin-top: -400px` + z-index | `margin-top: -3rem` + incremental z-index per section |
| Bidirectional reveal | AOS `once: false` | IntersectionObserver that adds/removes `.visible` |
| Slow transitions | `data-aos-duration="800-2000"` | `transition: 0.8s cubic-bezier(...)` |
| Staggered rows | AOS `data-aos-delay` | `transition-delay` on nth-of-type |
| Sticky labels | Sticky headers from Swiss typography | `position: sticky` on `.section-label` |
| Top shadow | Visual depth on overlap | `box-shadow: 0 -20px 40px rgba(0,0,0,0.04)` |

No external libraries. Pure CSS + vanilla JS. Keeps existing Swiss design system intact.
