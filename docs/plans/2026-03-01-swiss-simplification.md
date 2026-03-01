# Swiss Simplification — Back to Editorial Basics

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Strip overengineered grid styling back to the original Swiss editorial aesthetic — let the vertical page lines at 33%/66% do the structural work, remove internal dashed borders and excessive horizontal rules, simplify hover effects and reveal animation.

**Architecture:** The page-level vertical lines at 33.333% and 66.666% ARE the grid. Content aligns to these lines (years/labels right-aligned before the 33% line, main content after it). No internal column borders needed — the page lines create the visual structure. Minimal horizontal rules — only between sections and a subtle one on the first row group. Publication layout simplified from 3-column to 2-column (year + body). Reveal animation toned back to subtle 12px/0.5s.

**Tech Stack:** 11ty v3, vanilla CSS, vanilla JS

---

### Task 1: Simplify CSS — remove overengineered grid styling

**Files:**
- Modify: `css/style.css`

**Step 1: Replace publication grid with simple 2-column layout**

Remove the current 3-column `.pub-row` grid with all its dashed column borders and hover margin shifts. Replace with a clean 2-column layout aligned to the 33% vertical line:

```css
/* Publications */
.pub-row {
  display: grid;
  grid-template-columns: calc(33.333% - 2rem) 1fr;
  gap: 0 2rem;
  padding: 1.25rem 0;
  border-top: var(--rule-light);
  align-items: baseline;
}

.pub-col-year {
  font-weight: 300;
  font-size: 0.8125rem;
  color: var(--grey-mid);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pub-col-main {}

.pub-title {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.4;
  letter-spacing: -0.01em;
}
.pub-title a { transition: color 0.15s; }
.pub-title a:hover { color: var(--accent); }

.pub-venue {
  font-weight: 800;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-top: 0.35rem;
}

.pub-authors {
  font-weight: 300;
  font-size: 0.8125rem;
  color: var(--grey-mid);
  margin-top: 0.2rem;
  line-height: 1.45;
}
.pub-authors .self { font-weight: 600; color: var(--black); }

.pub-links {
  display: flex;
  gap: 0.625rem;
  margin-top: 0.4rem;
}
.pub-links a {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--grey-mid);
  transition: color 0.15s;
}
.pub-links a:hover { color: var(--accent); }
```

Delete entirely:
- `.pub-row:first-of-type` border-top rule (already using border-top on each row)
- `.pub-row:hover` block (hover margin shifts)
- `.pub-col-meta` and its children (venue and links move INTO `.pub-col-main`)
- Dashed `border-right` on `.pub-col-year` and `.pub-col-main`
- `padding-right`, `padding-top`, `align-self: stretch` on columns

**Step 2: Simplify open source to same 2-column pattern**

```css
/* Open Source */
.oss-row {
  display: grid;
  grid-template-columns: calc(33.333% - 2rem) 1fr;
  gap: 0 2rem;
  padding: 1.25rem 0;
  border-top: var(--rule-light);
  align-items: baseline;
}

.oss-col-left {
  text-align: right;
}

.oss-name {
  font-weight: 700;
  font-size: 0.9375rem;
  letter-spacing: -0.01em;
}
.oss-name a { transition: color 0.15s; }
.oss-name a:hover { color: var(--accent); }

.oss-meta {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--grey-mid);
  margin-top: 0.2rem;
}

.oss-col-right {}

.oss-desc {
  font-size: 0.875rem;
  font-weight: 300;
  color: #555;
  line-height: 1.55;
  max-width: 480px;
}
```

Delete entirely:
- `.oss-row:first-of-type` border-top rule
- `.oss-row:hover` block
- Dashed `border-right`, `padding-right`, `align-self: stretch` on `.oss-col-left`
- `padding-top` on `.oss-col-right`

**Step 3: Simplify education to same 2-column pattern**

```css
/* Background */
.edu-item {
  display: grid;
  grid-template-columns: calc(33.333% - 2rem) 1fr;
  gap: 0 2rem;
  padding: 1rem 0;
  border-top: var(--rule-light);
  align-items: baseline;
}

.edu-year {
  font-weight: 300;
  font-size: 0.8125rem;
  color: var(--grey-mid);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.edu-content { display: flex; flex-direction: column; gap: 0.15rem; }
.edu-content strong { font-weight: 600; font-size: 0.9375rem; }
.edu-place { font-size: 0.8125rem; color: var(--grey-mid); }
.edu-place a { color: inherit; }
.edu-place a:hover { color: var(--accent); }
.edu-detail { font-size: 0.8rem; color: var(--grey-mid); font-weight: 300; }
```

Delete: `.edu-item:first-of-type` rule, dashed `border-right`, `padding-right`, `align-self: stretch`, `padding-top` on `.edu-year`.

**Step 4: Simplify reveal animation**

Replace current cinematic 40px/1s with subtle:

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

**Step 5: Build and verify**

Run: `npm run build && open _site/index.html`
Expected: Clean Swiss editorial look — vertical grid lines create the structure, content aligns to the 33% line, minimal horizontal rules, no dashed borders.

**Step 6: Commit**

```bash
git add css/style.css
git commit -m "refactor: simplify back to Swiss editorial styling"
```

---

### Task 2: Update index.njk templates for 2-column publication layout

**Files:**
- Modify: `index.njk`

**Step 1: Merge pub-col-meta into pub-col-main**

Since we're dropping the 3rd column, venue and links need to go inside `.pub-col-main`. Replace each `pub-row` template (both selected and expanded) so the structure is:

```njk
<div class="pub-row">
  <div class="pub-col-year">{{ pub.year }}</div>
  <div class="pub-col-main">
    <div class="pub-title"><a href="...">{{ pub.title }}</a></div>
    <div class="pub-venue">{{ pub.venue }}</div>
    <div class="pub-authors">{{ pub.authors | highlightAuthor(...) | safe }}</div>
    <div class="pub-links">
      {% if pub.pdf %}<a href="{{ pub.pdf }}" ...>Paper</a>{% endif %}
      {% if pub.html %}<a href="{{ pub.html }}" ...>Web</a>{% endif %}
      {% if pub.code %}<a href="{{ pub.code }}" ...>Code</a>{% endif %}
    </div>
  </div>
</div>
```

Remove `<div class="pub-col-meta">` wrapper entirely — venue and links now sit directly inside `.pub-col-main`.

**Step 2: Build and verify**

Run: `npm run build && open _site/index.html`
Expected: Publications show as clean 2-column: year (right-aligned at 33% line) | title + venue + authors + links.

**Step 3: Commit**

```bash
git add index.njk
git commit -m "refactor: simplify publication template to 2-column layout"
```

---

### Task 3: Update responsive styles for simplified layout

**Files:**
- Modify: `css/style.css`

**Step 1: Clean up mobile overrides**

Many of the current mobile overrides were for the 3-column grid and dashed borders. Simplify:

```css
@media (max-width: 768px) {
  .page::before, .page::after { display: none; }
  .hero { padding: 3rem 0 2rem; }
  .section { padding: 2rem 0 2.5rem; }

  .pub-row,
  .oss-row,
  .edu-item {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
  .pub-col-year,
  .oss-col-left,
  .edu-year {
    text-align: left;
  }

  .nav { gap: 1rem; }
  .nav-links { display: none; }
  .mobile-nav-toggle, .mobile-nav-overlay, .mobile-nav-panel { display: flex; }
  .footer { flex-direction: column; align-items: flex-start; }
  .footer-right a { margin-left: 0; margin-right: 1.5rem; }
}
```

This replaces all the current mobile overrides for pub/oss/edu which referenced deleted properties (dashed borders, hover margins, etc.).

**Step 2: Build and verify**

Run: `npm run build && open _site/index.html`
Test at mobile widths — single column, no broken references to removed styles.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "refactor: clean up responsive styles for simplified layout"
```

---

## Summary

| Before (overengineered) | After (Swiss editorial) |
|------------------------|------------------------|
| 3-column pub grid with dashed column borders | 2-column: year + body, no internal borders |
| Hover margin shifts on rows | Simple color hover on links |
| Dashed `border-right` on every column | Page-level vertical lines at 33%/66% do the work |
| `border-bottom` + `border-top` on every row | Just `border-top` between items |
| 40px / 1s cinematic reveal | 12px / 0.5s subtle reveal |
| `align-self: stretch` / `padding-top` fine-tuning | `align-items: baseline` — clean alignment |

The vertical page lines at 33% and 66% create the grid structure. Content aligns to them. No internal borders needed. Swiss editorial = let the grid breathe.
