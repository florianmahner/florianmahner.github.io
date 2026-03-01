# Swiss + Brutalist Cards Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite florianmahner.github.io from Astro 5 to 11ty (Eleventy) with a Swiss Minimal + Brutalist Cards design (Inter, black/white/red, visible grid lines, offset-shadow cards).

**Architecture:** Replace Astro with 11ty v3 for lightweight static site generation. Use Nunjucks templates for shared layouts. Content stored in JSON data files (`_data/`). Single CSS file. No client-side framework, no build-time compilation beyond 11ty. IntersectionObserver for scroll reveals.

**Tech Stack:** 11ty v3 (ESM), Nunjucks templates, Inter font via Google Fonts, pure CSS, vanilla JS (IntersectionObserver)

**Reference mockup:** `docs/plans/mockups/mockup-swiss.html` (original Swiss base) and `/Users/florianmahner/Documents/Projects/mockups/swiss-v1.html` (chosen variant with brutalist cards)

---

## New project structure

```
florianmahner.github.io/
├── eleventy.config.js          # 11ty configuration (ESM)
├── package.json                # Only dependency: @11ty/eleventy
├── _includes/
│   └── base.njk                # Shared layout (nav, footer, head, CSS, JS)
├── _data/
│   ├── site.json               # Site metadata (name, title, description, social links)
│   ├── publications.json       # All publications (converted from papers.bib)
│   ├── repos.json              # GitHub repositories
│   ├── education.json          # Academic background
│   └── tools.json              # Tools + configs
├── css/
│   └── style.css               # Complete Swiss + brutalist stylesheet
├── index.njk                   # Homepage template
├── public/                     # Static assets (passthrough copy)
│   ├── favicon.jpg
│   ├── pdf/                    # Thesis PDFs
│   ├── previews/               # Preview GIFs (kept for future use)
│   ├── robots.txt
│   └── vimrc
├── docs/plans/                 # Design docs (not deployed)
└── .gitignore                  # _site/, node_modules/
```

Output: `_site/` (11ty default)

---

## Content to migrate

### Publications (from papers.bib → publications.json)

8 papers, sorted newest first. Each entry:
```json
{
  "id": "mahner2025dimensions",
  "title": "Dimensions underlying the representational alignment of deep neural networks with humans",
  "authors": ["Florian P. Mahner", "Lukas Muttenthaler", "Umut Güçlü", "Martin N. Hebart"],
  "year": 2025,
  "venue": "Nature Machine Intelligence",
  "pdf": "https://www.nature.com/articles/s42256-025-01041-7.pdf",
  "html": "https://www.nature.com/articles/s42256-025-01041-7",
  "code": null,
  "selected": true,
  "description": "We identify interpretable dimensions that explain when and why deep neural network representations align with human perception."
}
```

Selected papers (shown prominently): mahner2025dimensions, roth2025ten, kaniuth2025high

### Repositories (from repositories.json)

4 repos: thingsvision (174 stars), tomlparse (22), object-dimensions (12), torch-multipletests (4)

### Education (from education.json)

3 entries: PhD (2021–25), MSc (2018–21), BSc (2013–17)

### Tools (from misc.json)

10 tools: Cursor, Overleaf, Arc, MathPix, Raycast, Warp, Notion, Paperpile, Obsidian, Affinity

### Site metadata

- Name: Florian P. Mahner
- Title: PhD Candidate in Machine Learning
- Email: florian.mahner@gmail.com
- Affiliations: Max Planck Research Group Vision and Computational Cognition, Neural Coding Lab (Radboud)
- Social: GitHub (florianmahner), LinkedIn (florianmahner)
- Tagline: I study *representation learning* across humans and machines

---

## Tasks

### Task 1: Scaffold 11ty project

**Files:**
- Create: `package.json`
- Create: `eleventy.config.js`
- Create: `.gitignore` (update)

**Step 1: Create package.json**

```json
{
  "name": "florianmahner-website",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "npx @11ty/eleventy --serve",
    "build": "npx @11ty/eleventy"
  },
  "devDependencies": {
    "@11ty/eleventy": "^3.0.0"
  }
}
```

**Step 2: Create eleventy.config.js**

```js
export default function(eleventyConfig) {
  // Passthrough copy static assets
  eleventyConfig.addPassthroughCopy("public");
  eleventyConfig.addPassthroughCopy("css");

  // Custom filter: highlight author name in author list
  eleventyConfig.addFilter("highlightAuthor", function(authors, name) {
    return authors.map(a =>
      a.includes(name)
        ? `<span class="self">${a}</span>`
        : a
    ).join(', ');
  });

  return {
    dir: {
      input: ".",
      includes: "_includes",
      data: "_data",
      output: "_site"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};

export const config = {
  dir: {
    input: ".",
    includes: "_includes",
    data: "_data",
    output: "_site"
  }
};
```

**Step 3: Update .gitignore**

Add `_site/` and `node_modules/` (remove Astro-specific entries like `dist/`).

**Step 4: Install and verify**

```bash
npm install
npx @11ty/eleventy --help
```

**Step 5: Commit**

```bash
git add package.json eleventy.config.js .gitignore
git commit -m "scaffold: init 11ty project"
```

---

### Task 2: Create data files

**Files:**
- Create: `_data/site.json`
- Create: `_data/publications.json`
- Create: `_data/repos.json`
- Create: `_data/education.json`
- Create: `_data/tools.json`

**Step 1: Create `_data/site.json`**

```json
{
  "name": { "first": "Florian", "middle": "P.", "last": "Mahner" },
  "fullName": "Florian P. Mahner",
  "title": "PhD Candidate in Machine Learning",
  "email": "florian.mahner@gmail.com",
  "url": "https://florianmahner.github.io",
  "description": "Personal academic website of Florian Mahner",
  "social": {
    "github": "florianmahner",
    "scholar": "",
    "linkedin": "florianmahner"
  },
  "affiliations": [
    {
      "name": "Max Planck Research Group Vision and Computational Cognition",
      "role": "PhD Candidate",
      "url": "https://hebartlab.com/"
    },
    {
      "name": "Neural Coding Lab, Radboud University",
      "role": "Guest Researcher",
      "url": "https://neuralcod.ing/"
    }
  ],
  "highlightAuthor": "Mahner"
}
```

**Step 2: Create `_data/publications.json`**

Convert all 8 entries from `papers.bib` to JSON. Each entry has: id, title, authors (array of "First Last" strings), year, venue, pdf, html, code, selected (boolean), description (for selected papers only).

Full content — all 8 publications from the current papers.bib:

1. mahner2025dimensions — Nature Machine Intelligence 2025, selected
2. roth2025ten — Communications Psychology 2025, selected
3. kaniuth2025high — eLife 2025, selected
4. stoinski2025quantifying — CCN 2025
5. mahner2023dimensions — CCN 2023
6. mahner2022learning — CCN 2022
7. janssen2020reliance — Scientific Reports 2020
8. tanisaro2017quasi — ICMLC 2017

**Step 3: Create `_data/repos.json`**

Array of 4 repos from current repositories.json, each with: name, description, url, language, stars, forks.

**Step 4: Create `_data/education.json`**

Array of 3 entries from current education.json, each with: degree, field, institution, institutionUrl, startYear, endYear, grade, supervisors.

**Step 5: Create `_data/tools.json`**

Object with `tools` array (10 items) and `configs` array (1 item: vimrc).

**Step 6: Commit**

```bash
git add _data/
git commit -m "data: add all content as JSON data files"
```

---

### Task 3: Create CSS stylesheet

**Files:**
- Create: `css/style.css`

**Step 1: Write the complete stylesheet**

Port the CSS directly from `mockups/swiss-v1.html` (lines 10–113) as the foundation. Then extend with:

1. **All base styles from mockup** — variables, reset, page grid, nav, hero, sections, about, pub cards, repo cards, contact, footer, responsive, reveal animation
2. **Education section** — grid layout matching pub-item width (4.5rem year + 1fr), with thinner 1px border instead of 2px
3. **Tools section** — flex wrap, each tool as an inline link with uppercase label + grey description
4. **Config section** — simple list item with download icon
5. **Mobile nav** — hamburger button (hidden on desktop, shown at 768px), overlay, slide-out panel from right (280px / 85vw), close button, link list, escape key dismiss
6. **Expand/collapse** — `.view-all-toggle` button styled in accent color, `.expanded-publications[hidden]` display none
7. **View all link** — "View all on GitHub →" style
8. **Print styles** — hide nav, mobile elements, black text on white
9. **Reduced motion** — disable all transitions/animations

The CSS must be self-contained (no preprocessor). Reference `mockups/swiss-v1.html` for exact values.

**Step 2: Commit**

```bash
git add css/style.css
git commit -m "styles: Swiss + brutalist card design system"
```

---

### Task 4: Create base layout template

**Files:**
- Create: `_includes/base.njk`

**Step 1: Write the Nunjucks layout**

The layout wraps all pages with shared `<head>`, nav, footer, and JS. Structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ title or site.fullName }}</title>
  <meta name="description" content="{{ description or site.description }}">
  <!-- OG + Twitter meta tags using site data -->
  <link rel="icon" type="image/jpeg" href="/public/favicon.jpg">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
<div class="page">
  <header>
    <nav class="nav">
      <a href="/" class="nav-logo">FPM</a>
      <ul class="nav-links">
        <li><a href="/#about">About</a></li>
        <li><a href="/#publications">Publications</a></li>
        <li><a href="/#code">Code</a></li>
        <li><a href="/#contact">Contact</a></li>
      </ul>
    </nav>
  </header>

  <!-- Mobile nav: hamburger toggle, overlay, slide-out panel -->
  <button class="mobile-nav-toggle" aria-label="Open menu">
    <svg><!-- hamburger icon --></svg>
  </button>
  <div class="mobile-nav-overlay"></div>
  <div class="mobile-nav-panel">
    <button class="mobile-nav-close" aria-label="Close menu">
      <svg><!-- close icon --></svg>
    </button>
    <ul class="mobile-nav-links">
      <li><a href="/#about">About</a></li>
      <li><a href="/#publications">Publications</a></li>
      <li><a href="/#code">Code</a></li>
      <li><a href="/#contact">Contact</a></li>
    </ul>
  </div>

  {{ content | safe }}

  <footer class="footer">
    <div class="footer-left">&copy; 2026 {{ site.fullName }}</div>
    <div class="footer-right">
      <a href="mailto:{{ site.email }}">Email</a>
      <a href="https://github.com/{{ site.social.github }}">GitHub</a>
      {% if site.social.linkedin %}
      <a href="https://www.linkedin.com/in/{{ site.social.linkedin }}">LinkedIn</a>
      {% endif %}
    </div>
  </footer>
</div>

<script>
  // Mobile nav toggle
  // IntersectionObserver for .reveal scroll animations
  // IntersectionObserver for active nav link tracking
  // Expand/collapse toggle for publications
</script>
</body>
</html>
```

Key details:
- `{{ content | safe }}` renders page content
- All `site.*` variables come from `_data/site.json` automatically
- Nav links are hardcoded (simple, no config indirection)
- Footer links built from site data
- JS is inline at bottom (no external files needed)

**Step 2: Commit**

```bash
git add _includes/base.njk
git commit -m "layout: base template with Swiss nav, footer, mobile nav"
```

---

### Task 5: Create homepage template

**Files:**
- Create: `index.njk`

**Step 1: Write the Nunjucks homepage**

Frontmatter:
```yaml
---
layout: base.njk
title: Florian P. Mahner
---
```

Then all homepage sections as Nunjucks HTML:

**Hero:**
```html
<section class="hero" id="top">
  <h1 class="hero-name">Florian P<span class="accent-dot">.</span><br>Mahner</h1>
  <dl class="hero-meta">
    <dt>Role</dt><dd>PhD Candidate · Machine Learning</dd>
    <dt>Location</dt><dd>Frankfurt, DE</dd>
    <dt>Focus</dt><dd>Representation · Perception · Alignment</dd>
  </dl>
  <hr class="hero-rule">
</section>
```

**About (01):**
- About text with `<strong>` and `<em>` for key terms
- Affiliations from `site.affiliations` data via Nunjucks loop

**Publications (02) — BRUTALIST CARDS:**
```html
<section class="section" id="publications">
  <div class="section-label"><span class="section-number">02</span> Selected Publications</div>
  <ul class="pub-list">
    {% for pub in publications %}
      {% if pub.selected %}
      <li class="pub-item reveal">
        <div class="pub-year">{{ pub.year }}</div>
        <div class="pub-body">
          <div class="pub-title">
            <a href="{{ pub.pdf or pub.html or '#' }}">{{ pub.title }}</a>
          </div>
          <div class="pub-venue">{{ pub.venue }}</div>
          <div class="pub-authors">{{ pub.authors | highlightAuthor(site.highlightAuthor) | safe }}</div>
          <div class="pub-actions">
            {% if pub.pdf %}<a href="{{ pub.pdf }}" target="_blank" rel="noopener noreferrer">Paper</a>{% endif %}
            {% if pub.html %}<a href="{{ pub.html }}" target="_blank" rel="noopener noreferrer">Web</a>{% endif %}
            {% if pub.code %}<a href="{{ pub.code }}" target="_blank" rel="noopener noreferrer">Code</a>{% endif %}
          </div>
        </div>
      </li>
      {% endif %}
    {% endfor %}
  </ul>

  <button class="view-all-toggle" id="toggle-publications">View all publications ↓</button>

  <div id="all-publications" class="expanded-publications" hidden>
    {% set currentYear = 0 %}
    {% for pub in publications %}
      {% if not pub.selected %}
        {% if pub.year != currentYear %}
          {% set currentYear = pub.year %}
          <div class="section-label--sub">{{ pub.year }}</div>
        {% endif %}
        <div class="pub-item reveal">
          <div class="pub-year">{{ pub.year }}</div>
          <div class="pub-body">
            <div class="pub-title">
              <a href="{{ pub.pdf or pub.html or '#' }}">{{ pub.title }}</a>
            </div>
            <div class="pub-venue">{{ pub.venue }}</div>
            <div class="pub-authors">{{ pub.authors | highlightAuthor(site.highlightAuthor) | safe }}</div>
            <div class="pub-actions">
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

**Education (03):**
- Loop over `education` data
- Each entry: year range + degree/field/institution
- Thinner bordered cards (1px)

**Open Source (04) — BRUTALIST CARDS:**
```html
<section class="section" id="code">
  <div class="section-label"><span class="section-number">04</span> Open Source</div>
  <div class="repo-grid">
    {% for repo in repos %}
    <div class="repo-card reveal">
      <div class="repo-name"><a href="{{ repo.url }}" target="_blank" rel="noopener noreferrer">{{ repo.name }}</a></div>
      <div class="repo-desc">{{ repo.description }}</div>
      <div class="repo-stats">
        {% if repo.stars > 0 %}<span class="repo-stat"><span class="num">{{ repo.stars }}</span> Stars</span>{% endif %}
        {% if repo.language %}<span class="repo-stat">{{ repo.language }}</span>{% endif %}
      </div>
    </div>
    {% endfor %}
  </div>
  <p class="view-all"><a href="https://github.com/{{ site.social.github }}" target="_blank" rel="noopener noreferrer">View all on GitHub →</a></p>
</section>
```

**Tools (05):**
- Loop over `tools.tools`, render as inline links

**Contact (06):**
- Email, GitHub, Scholar, LinkedIn items with red left border

**Step 2: Verify build and dev server**

```bash
npm run build
npm run dev
```

Open http://localhost:8080 and verify all sections render with real content.

**Step 3: Commit**

```bash
git add index.njk
git commit -m "homepage: all sections with real content, brutalist cards"
```

---

### Task 6: Remove old Astro files

**Files:**
- Delete: `src/` (entire directory — layouts, pages, components, scripts, styles, lib, content)
- Delete: `config.yaml`
- Delete: `astro.config.mjs`
- Delete: `animations/` (Python GIF generation scripts)
- Delete: `scripts/` (build scripts for preview generation)
- Delete: `tsconfig.json` (if exists)
- Keep: `public/` (static assets — move contents to project root level for 11ty passthrough)
- Keep: `docs/plans/` (design reference)
- Keep: `.github/` (if exists, for deployment workflows)

**Step 1: Move public assets**

```bash
# Move public/ contents so 11ty passthrough serves them
# public/favicon.jpg → public/favicon.jpg (stays, passthrough copies it)
# public/pdf/ → public/pdf/
# public/robots.txt → public/robots.txt
# public/vimrc → public/vimrc
```

The `eleventy.config.js` already has `addPassthroughCopy("public")`, so files in `public/` will be copied to `_site/public/`. Update any references in templates to use `/public/` prefix, OR configure passthrough to flatten:

```js
eleventyConfig.addPassthroughCopy({ "public": "/" });
```

This copies `public/favicon.jpg` → `_site/favicon.jpg` (root-level, matching current URLs).

**Step 2: Delete old Astro files**

```bash
rm -rf src/ config.yaml astro.config.mjs animations/ scripts/
rm -f tsconfig.json src/settings.json
```

**Step 3: Remove old lock files and node_modules**

```bash
rm -rf node_modules/ package-lock.json
npm install
```

**Step 4: Verify clean build**

```bash
npm run build
```

Expected: `_site/` contains `index.html`, `css/style.css`, and all public assets. No errors.

**Step 5: Commit**

```bash
git add -A
git commit -m "cleanup: remove Astro, keep 11ty + static assets"
```

---

### Task 7: Visual QA and code review

**Step 1: Run dev server and visually compare**

```bash
npm run dev
```

Open http://localhost:8080 alongside `mockups/swiss-v1.html`.

Checklist:
- [ ] Nav: sticky, "FPM" logo, uppercase links, active red underline
- [ ] Hero: huge name with red period, meta grid, red accent bar
- [ ] About: large light text, bold keywords, red emphasized words, affiliation blocks
- [ ] Grid lines: two vertical lines at 33% and 66% visible behind content
- [ ] Publications: brutalist cards (2px black border, 3px offset shadow, hover lift)
- [ ] Publication actions: bordered buttons that invert on hover
- [ ] Expand/collapse: "View all publications" toggle works, shows remaining 5 papers
- [ ] Education: bordered rows with year + degree info
- [ ] Repos: brutalist cards matching pub style, all 4 repos visible
- [ ] Tools: inline links
- [ ] Contact: red left-border items with real links
- [ ] Footer: copyright left, social links right
- [ ] Mobile (375px): hamburger menu, no grid lines, single-column
- [ ] All external links open in new tab
- [ ] Author name "Mahner" highlighted in publication author lists

**Step 2: Fix discrepancies**

Adjust CSS/HTML as needed.

**Step 3: Final build + commit**

```bash
npm run build
git add -A
git commit -m "polish: visual QA, final Swiss + brutalist redesign"
```

---

## Summary

| What | Before (Astro) | After (11ty) |
|------|----------------|--------------|
| Framework | Astro 5 + GSAP + bibtex-parse + js-yaml | 11ty v3 only |
| Dependencies | 7 (astro, gsap, bibtex-parse, js-yaml, sitemap, canvas, gif-encoder) | 1 (@11ty/eleventy) |
| Template | Astro components (.astro) | Nunjucks (.njk) |
| Content | BibTeX + JSON + YAML config | JSON data files only |
| Styling | Jost, teal, dark mode, 1022-line CSS | Inter, black/white/red, ~200-line CSS |
| Features removed | Dark mode, GSAP animations, canvas thumbnails, visual strip | — |
| Build output | dist/ | _site/ |
| Adding pages | Create .astro file + import layout | Create .md or .njk file + `layout: base.njk` frontmatter |
