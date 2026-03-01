# Asymmetric Swiss Layout Redesign

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the cluttered neobrutalist card layout with a clean asymmetric Swiss grid for Publications, Open Source, Background, and Education sections — and reorder sections so Background + Education appear before Publications.

**Architecture:** Convert all content sections from bordered card layouts to a 3-column Swiss grid (matching the existing 33%/66% structural grid lines). Publications use a year | title+authors | venue+links grid. Open Source uses a name+stats | description 2-column asymmetric grid. Background uses the same year-range | content pattern. Remove all card borders, box-shadows, and hover-lift effects. Keep the existing Swiss design system (Inter font, black/white + red accent, grid lines, section numbering).

**Tech Stack:** 11ty v3, Nunjucks templates, vanilla CSS, no JS changes needed (existing IntersectionObserver scroll-reveal stays)

---

## Section Reorder

The new section order on the page will be:
1. Hero (unchanged)
2. **01 About** (unchanged)
3. **02 Background** (moved UP from position 03)
4. **03 Selected Publications** (was 02, renumbered)
5. **04 Open Source** (unchanged number)
6. **05 Tools** (unchanged)
7. **06 Contact** (unchanged)

Navigation links update: About → Background → Publications → Code → Contact

---

### Task 1: Reorder sections in index.njk and update section numbers

**Files:**
- Modify: `index.njk`
- Modify: `_includes/base.njk` (nav link order)

**Step 1: Move Background section above Publications in index.njk**

Cut the entire `<!-- 03 Background -->` section block (lines 90-103) and paste it between the About section (ends line 37) and the Publications section (starts line 39). Update section numbers:

```njk
<!-- 01 About -->
<!-- (unchanged) -->

<!-- 02 Background -->
<section class="section" id="background">
  <div class="section-label"><span class="section-number">02</span> Background</div>
  {% for edu in education %}
  <div class="edu-item reveal">
    <div class="edu-year">{{ edu.startYear }}&ndash;{{ edu.endYear }}</div>
    <div class="edu-content">
      <strong>{{ edu.degree }} in {{ edu.field }}</strong>
      <span class="edu-place"><a href="{{ edu.institutionUrl }}" target="_blank" rel="noopener noreferrer">{{ edu.institution }}</a></span>
      {% if edu.grade %}<span class="edu-detail">{{ edu.grade }}</span>{% endif %}
    </div>
  </div>
  {% endfor %}
</section>

<!-- 03 Selected Publications -->
<section class="section" id="publications">
  <div class="section-label"><span class="section-number">03</span> Selected Publications</div>
  <!-- ... rest unchanged ... -->
</section>
```

**Step 2: Update nav links in `_includes/base.njk`**

Reorder the desktop nav links (line 28-31) and mobile nav links (line 51-54) to match new section order:

Desktop nav:
```html
<ul class="nav-links">
  <li><a href="/#about" data-nav="about">About</a></li>
  <li><a href="/#background" data-nav="background">Background</a></li>
  <li><a href="/#publications" data-nav="publications">Publications</a></li>
  <li><a href="/#code" data-nav="code">Code</a></li>
  <li><a href="/#contact" data-nav="contact">Contact</a></li>
</ul>
```

Mobile nav:
```html
<ul class="mobile-nav-links">
  <li><a href="/#about" class="mobile-nav-link">About</a></li>
  <li><a href="/#background" class="mobile-nav-link">Background</a></li>
  <li><a href="/#publications" class="mobile-nav-link">Publications</a></li>
  <li><a href="/#code" class="mobile-nav-link">Code</a></li>
  <li><a href="/#contact" class="mobile-nav-link">Contact</a></li>
</ul>
```

**Step 3: Build and verify**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm run build`
Expected: Build succeeds, `_site/index.html` has Background before Publications.

**Step 4: Commit**

```bash
git add index.njk _includes/base.njk
git commit -m "reorder: move Background before Publications, update nav"
```

---

### Task 2: Replace publication card layout with asymmetric 3-column grid

**Files:**
- Modify: `index.njk` (publications HTML structure)
- Modify: `css/style.css` (replace pub card styles with grid styles)

**Step 1: Replace publication HTML in `index.njk`**

Replace the current `<ul class="pub-list">` structure with a Swiss grid layout. Each publication becomes a row with 3 columns: year | title+authors | venue+links.

Selected publications section:
```njk
<!-- 03 Selected Publications -->
<section class="section" id="publications">
  <div class="section-label"><span class="section-number">03</span> Selected Publications</div>

  {% for pub in publications %}
    {% if pub.selected %}
    <div class="pub-row reveal">
      <div class="pub-col-year">{{ pub.year }}</div>
      <div class="pub-col-main">
        <div class="pub-title"><a href="{{ pub.pdf or pub.html or '#' }}" {% if pub.pdf or pub.html %}target="_blank" rel="noopener noreferrer"{% endif %}>{{ pub.title }}</a></div>
        <div class="pub-authors">{{ pub.authors | highlightAuthor(site.highlightAuthor) | safe }}</div>
      </div>
      <div class="pub-col-meta">
        <div class="pub-venue">{{ pub.venue }}</div>
        <div class="pub-links">
          {% if pub.pdf %}<a href="{{ pub.pdf }}" target="_blank" rel="noopener noreferrer">Paper</a>{% endif %}
          {% if pub.html %}<a href="{{ pub.html }}" target="_blank" rel="noopener noreferrer">Web</a>{% endif %}
          {% if pub.code %}<a href="{{ pub.code }}" target="_blank" rel="noopener noreferrer">Code</a>{% endif %}
        </div>
      </div>
    </div>
    {% endif %}
  {% endfor %}

  <button class="view-all-toggle" id="toggle-publications">View all publications &darr;</button>

  <div id="all-publications" class="expanded-publications" hidden>
    {% for pub in publications %}
      {% if not pub.selected %}
      <div class="pub-row reveal">
        <div class="pub-col-year">{{ pub.year }}</div>
        <div class="pub-col-main">
          <div class="pub-title"><a href="{{ pub.pdf or pub.html or '#' }}" {% if pub.pdf or pub.html %}target="_blank" rel="noopener noreferrer"{% endif %}>{{ pub.title }}</a></div>
          <div class="pub-authors">{{ pub.authors | highlightAuthor(site.highlightAuthor) | safe }}</div>
        </div>
        <div class="pub-col-meta">
          <div class="pub-venue">{{ pub.venue }}</div>
          <div class="pub-links">
            {% if pub.pdf %}<a href="{{ pub.pdf }}" target="_blank" rel="noopener noreferrer">Paper</a>{% endif %}
            {% if pub.html %}<a href="{{ pub.html }}" target="_blank" rel="noopener noreferrer">Web</a>{% endif %}
            {% if pub.code %}<a href="{{ pub.code }}" target="_blank" rel="noopener noreferrer">Code</a>{% endif %}
          </div>
        </div>
      </div>
      {% endif %}
    {% endfor %}
  </div>
</section>
```

**Step 2: Replace publication CSS in `css/style.css`**

Remove the old `.pub-list`, `.pub-item` card styles (with borders, box-shadows, hover-lift). Replace with:

```css
/* Publications — Asymmetric 3-column grid */
.pub-row {
  display: grid;
  grid-template-columns: calc(33.333% - 2rem) calc(33.333%) 1fr;
  gap: 0 2rem;
  padding: 1.5rem 0;
  border-bottom: var(--rule-light);
  align-items: start;
  transition: background 0.2s;
}
.pub-row:first-of-type { border-top: var(--rule-light); }
.pub-row:hover {
  background: var(--grey-light);
  margin: 0 -1.25rem;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.pub-col-year {
  font-weight: 300;
  font-size: 0.8125rem;
  color: var(--grey-mid);
  text-align: right;
  padding-right: 2rem;
  padding-top: 0.15rem;
  font-variant-numeric: tabular-nums;
  border-right: 1px dashed var(--grey-rule);
  align-self: stretch;
}

.pub-col-main {
  padding-right: 2rem;
  border-right: 1px dashed var(--grey-rule);
  align-self: stretch;
}

.pub-title {
  font-weight: 600;
  font-size: 1rem;
  line-height: 1.45;
  letter-spacing: -0.01em;
}
.pub-title a { transition: color 0.2s; }
.pub-row:hover .pub-title a { color: var(--accent); }

.pub-authors {
  font-weight: 300;
  font-size: 0.8125rem;
  color: #555;
  margin-top: 0.35rem;
  line-height: 1.45;
}
.pub-authors .self { font-weight: 600; color: var(--black); }

.pub-col-meta { padding-top: 0.15rem; }

.pub-venue {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--grey-mid);
}

.pub-links {
  display: flex;
  gap: 0.625rem;
  margin-top: 0.5rem;
}
.pub-links a {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--grey-mid);
  text-decoration: none;
  border-bottom: 1px solid var(--grey-rule);
  padding-bottom: 1px;
  transition: color 0.2s, border-color 0.2s;
}
.pub-links a:hover { color: var(--accent); border-color: var(--accent); }

/* Expand toggle */
.view-all-toggle {
  background: none;
  border: none;
  font-family: var(--font);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-mid);
  cursor: pointer;
  border-bottom: 1px solid var(--grey-rule);
  padding: 0 0 2px;
  margin-top: 1.5rem;
  transition: color 0.2s, border-color 0.2s;
}
.view-all-toggle:hover { color: var(--accent); border-color: var(--accent); }

.expanded-publications { margin-top: 0; }
.expanded-publications[hidden] { display: none; }
```

**Step 3: Build and verify**

Run: `npm run build && open _site/index.html`
Expected: Publications display in clean 3-column rows aligned to the Swiss grid lines, no card borders or shadows.

**Step 4: Commit**

```bash
git add index.njk css/style.css
git commit -m "feat: replace pub cards with asymmetric 3-column Swiss grid"
```

---

### Task 3: Replace open source card layout with asymmetric 2-column grid

**Files:**
- Modify: `index.njk` (open source HTML)
- Modify: `css/style.css` (replace repo card styles with grid)

**Step 1: Replace open source HTML in `index.njk`**

Replace the `<div class="repo-grid">` card layout with a 2-column asymmetric grid (name+stats right-aligned in col 1 | description in col 2):

```njk
<!-- 04 Open Source -->
<section class="section" id="code">
  <div class="section-label"><span class="section-number">04</span> Open Source</div>

  {% for repo in repos %}
  <div class="oss-row reveal">
    <div class="oss-col-left">
      <div class="oss-name"><a href="{{ repo.url }}" target="_blank" rel="noopener noreferrer">{{ repo.name }}</a></div>
      <div class="oss-meta">
        {{ repo.language }}
        {% if repo.stars > 0 %} &middot; {{ repo.stars }} stars{% endif %}
        {% if repo.forks > 0 %} &middot; {{ repo.forks }} forks{% endif %}
      </div>
    </div>
    <div class="oss-col-right">
      <div class="oss-desc">{{ repo.description }}</div>
    </div>
  </div>
  {% endfor %}

  <p class="view-all"><a href="https://github.com/{{ site.social.github }}" target="_blank" rel="noopener noreferrer">View all on GitHub &rarr;</a></p>
</section>
```

**Step 2: Replace repo card CSS in `css/style.css`**

Remove the old `.repo-grid`, `.repo-card` card styles. Replace with:

```css
/* Open Source — 2-column asymmetric grid */
.oss-row {
  display: grid;
  grid-template-columns: calc(33.333% - 2rem) 1fr;
  gap: 0 2rem;
  padding: 1.5rem 0;
  border-bottom: var(--rule-light);
  align-items: start;
  transition: background 0.2s;
}
.oss-row:first-of-type { border-top: var(--rule-light); }
.oss-row:hover {
  background: var(--grey-light);
  margin: 0 -1.25rem;
  padding-left: 1.25rem;
  padding-right: 1.25rem;
}

.oss-col-left {
  text-align: right;
  padding-right: 2rem;
  border-right: 1px dashed var(--grey-rule);
  align-self: stretch;
}

.oss-name {
  font-weight: 700;
  font-size: 0.9375rem;
  letter-spacing: -0.01em;
}
.oss-name a { transition: color 0.2s; }
.oss-row:hover .oss-name a { color: var(--accent); }

.oss-meta {
  font-size: 0.6875rem;
  font-weight: 400;
  color: var(--grey-mid);
  margin-top: 0.25rem;
}

.oss-col-right { padding-top: 0.15rem; }

.oss-desc {
  font-size: 0.875rem;
  font-weight: 300;
  color: #555;
  line-height: 1.55;
  max-width: 480px;
}
```

**Step 3: Build and verify**

Run: `npm run build && open _site/index.html`
Expected: Repos display in clean 2-column rows with name right-aligned against the 33% grid line.

**Step 4: Commit**

```bash
git add index.njk css/style.css
git commit -m "feat: replace repo cards with asymmetric 2-column Swiss grid"
```

---

### Task 4: Restyle Background/Education section to match asymmetric grid

**Files:**
- Modify: `css/style.css` (update edu-item styles)

**Step 1: Replace education styles in `css/style.css`**

Remove the old `.edu-item` styles (with border and card-like padding). Replace with grid-aligned rows matching the publication pattern:

```css
/* Background — asymmetric grid */
.edu-item {
  display: grid;
  grid-template-columns: calc(33.333% - 2rem) 1fr;
  gap: 0 2rem;
  padding: 1.25rem 0;
  border-bottom: var(--rule-light);
  align-items: start;
}
.edu-item:first-of-type { border-top: var(--rule-light); }

.edu-year {
  font-weight: 300;
  font-size: 0.8125rem;
  color: var(--grey-mid);
  text-align: right;
  padding-right: 2rem;
  font-variant-numeric: tabular-nums;
  border-right: 1px dashed var(--grey-rule);
  align-self: stretch;
  padding-top: 0.15rem;
}

.edu-content {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.edu-content strong { font-weight: 600; font-size: 0.9375rem; }
.edu-place { font-size: 0.8125rem; color: var(--grey-mid); }
.edu-place a { color: inherit; }
.edu-place a:hover { color: var(--accent); }
.edu-detail { font-size: 0.8rem; color: var(--grey-mid); font-weight: 300; }
```

**Step 2: Build and verify**

Run: `npm run build && open _site/index.html`
Expected: Education rows match the same asymmetric grid as publications and repos.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: restyle education section to match asymmetric grid"
```

---

### Task 5: Mobile responsive adjustments

**Files:**
- Modify: `css/style.css` (update responsive breakpoints)

**Step 1: Update mobile styles for the new grid layouts**

Replace the old responsive overrides for `.pub-item` and `.edu-item` with new ones for `.pub-row`, `.oss-row`, and `.edu-item`:

```css
@media (max-width: 768px) {
  /* ... existing rules stay ... */

  .pub-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
  .pub-col-year {
    text-align: left;
    padding-right: 0;
    border-right: none;
    align-self: auto;
    font-size: 0.75rem;
  }
  .pub-col-main {
    padding-right: 0;
    border-right: none;
    align-self: auto;
  }
  .pub-col-meta { margin-top: 0.35rem; }
  .pub-row:hover {
    margin: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .oss-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
  .oss-col-left {
    text-align: left;
    padding-right: 0;
    border-right: none;
    align-self: auto;
  }
  .oss-row:hover {
    margin: 0;
    padding-left: 0;
    padding-right: 0;
  }

  .edu-item {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
  .edu-year {
    text-align: left;
    padding-right: 0;
    border-right: none;
    align-self: auto;
  }
}
```

**Step 2: Build and verify**

Run: `npm run build && open _site/index.html`
Test: Resize browser window to <768px — all sections should stack to single column.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add responsive styles for asymmetric grid layouts"
```

---

### Task 6: Clean up dead CSS and verify final build

**Files:**
- Modify: `css/style.css` (remove orphaned styles)

**Step 1: Remove dead CSS rules**

Delete these CSS rules that are no longer used:
- `.pub-list` (replaced by `.pub-row`)
- `.pub-item` and `.pub-item:hover` and `.pub-item:last-child` (replaced by `.pub-row`)
- `.pub-body` (no longer exists in HTML)
- `.pub-actions` and `.pub-actions a` and `.pub-actions a:hover` (replaced by `.pub-links`)
- `.pub-desc` (no description shown in grid layout)
- `.repo-grid` (replaced by `.oss-row`)
- `.repo-card` and `.repo-card:hover` (replaced by `.oss-row`)
- `.repo-name` and `.repo-name a:hover` (replaced by `.oss-name`)
- `.repo-desc` (replaced by `.oss-desc`)
- `.repo-stats`, `.repo-stat`, `.repo-stat .num` (replaced by `.oss-meta`)
- `.section-label--sub` (unused)
- Old `.pub-year` (will be replaced by `.pub-col-year`)
- Old responsive `.pub-item` and `.pub-year` overrides in `@media (max-width: 768px)`

**Step 2: Final build and visual check**

Run: `npm run build && npm run dev`
Expected: Dev server starts, all sections render correctly with asymmetric grid, no visual regressions.

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "chore: remove dead CSS from card-based layout"
```

---

## Summary of Changes

| Section | Before | After |
|---------|--------|-------|
| Background | Position 03, bordered rows | Position 02, asymmetric grid, year right-aligned at 33% |
| Publications | Position 02, bordered cards with box-shadow | Position 03, 3-column grid (year \| title+authors \| venue+links) |
| Open Source | Card grid with borders + shadow | 2-column asymmetric grid (name+stats \| description) |
| Education | Bordered rows | Matches publication grid pattern |
| Nav | About, Publications, Code, Contact | About, Background, Publications, Code, Contact |

All sections share the same visual language: right-aligned labels against the 33% dashed grid line, clean row separators, hover highlight, no borders/shadows.
