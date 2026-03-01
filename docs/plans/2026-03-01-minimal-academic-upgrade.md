# Minimal Academic Site Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade florianmahner.github.io with refined publication system, YAML config, and cleaned-up codebase — keeping the same 4 pages and minimal architecture.

**Architecture:** Replace TypeScript config with simple YAML. Inline the publication improvements (abbreviation badges, configurable author highlighting, richer link types, venue·year format) directly into the existing page files. Remove runtime theme switching (SettingsPanel, typography-presets.ts). Merge 4 CSS files into one. Lock in one font/color scheme.

**Tech Stack:** Astro 5, GSAP, bibtex-parse (already installed), js-yaml (new dep)

---

## Task 1: Add js-yaml dependency and create config.yaml

**Files:**
- Create: `config.yaml`
- Create: `src/lib/config.ts` (tiny YAML loader, replaces old config.ts)
- Modify: `package.json` (add js-yaml)
- Delete: `src/config.ts`

**Step 1: Install js-yaml**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm install js-yaml && npm install -D @types/js-yaml`

**Step 2: Create config.yaml at project root**

```yaml
# Site Configuration
name:
  first: Florian
  middle: P
  last: Mahner

title: PhD Candidate in Machine Learning

email: florian.mahner@gmail.com

social:
  github: florianmahner
  scholar: ""
  linkedin: florianmahner
  twitter: ""
  orcid: ""
  researchgate: ""

site:
  url: https://florianmahner.github.io
  title: Florian Mahner
  description: Personal academic website of Florian Mahner - Research in computational neuroscience and machine learning
  language: en

navigation:
  mode: sidebar
  items:
    - id: about
      label: About
      href: /
    - id: publications
      label: Publications
      href: /publications
    - id: open-source
      label: Open Source
      href: /open-source
    - id: misc
      label: Misc
      href: /misc

theme:
  accent:
    light: "#c41e3a"
    dark: "#ff4d6a"
  fonts:
    body: Crimson Pro
    heading: Crimson Pro
    ui: Crimson Pro
    mono: JetBrains Mono

publications:
  style: default
  showPreviews: true
  groupByYear: true
  highlightAuthor: Mahner

features:
  selected_publications: true
  education: true
  dark_mode: true
  animations: true

footer:
  copyright: true
  links:
    - label: Email
      href: mailto:florian.mahner@gmail.com
```

**Step 3: Create src/lib/config.ts (YAML loader)**

```typescript
import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

const configPath = path.join(process.cwd(), 'config.yaml');
const raw = yaml.load(fs.readFileSync(configPath, 'utf-8')) as Record<string, any>;

export const config = {
  name: raw.name as { first: string; middle: string; last: string },
  title: raw.title as string,
  email: raw.email as string,
  social: raw.social as Record<string, string>,
  site: raw.site as { url: string; title: string; description: string; language: string },
  navigation: raw.navigation as { mode: string; items: { id: string; label: string; href: string }[] },
  theme: raw.theme as { accent: { light: string; dark: string }; fonts: { body: string; heading: string; ui: string; mono: string } },
  publications: raw.publications as { style: string; showPreviews: boolean; groupByYear: boolean; highlightAuthor: string },
  features: raw.features as Record<string, boolean>,
  footer: raw.footer as { copyright: boolean; links: { label: string; href: string }[] },
};

export type SiteConfig = typeof config;
```

**Step 4: Delete src/config.ts**

Run: `rm /Users/florianmahner/Documents/Projects/florianmahner.github.io/src/config.ts`

**Step 5: Update all imports across the codebase**

Every file that imports from `'../config'` must change to `'../lib/config'`. Files:
- `src/pages/index.astro`: `import { config } from '../lib/config';`
- `src/pages/publications.astro`: `import { config } from '../lib/config';`
- `src/pages/open-source.astro`: `import { config } from '../lib/config';`
- `src/pages/misc.astro`: `import { config } from '../lib/config';`
- `src/layouts/BaseLayout.astro`: `import { config } from '../lib/config';`
- `src/components/StructuredData.astro`: check if it imports config, update path

Additionally, update property access patterns:
- `config.navigationMode` → `config.navigation.mode`
- `config.navigation` (the array) → `config.navigation.items`
- `config.features.selectedPublications` → `config.features.selected_publications`
- `config.theme.accentLight` → `config.theme.accent.light`
- `config.theme.accentDark` → `config.theme.accent.dark`

**Step 6: Verify build**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm run build`
Expected: Build succeeds with no errors

**Step 7: Commit**

```bash
git add config.yaml src/lib/config.ts package.json package-lock.json src/pages/ src/layouts/ src/components/
git commit -m "feat: switch from TypeScript to YAML config system"
```

---

## Task 2: Remove SettingsPanel, typography-presets, and runtime theme switching

**Files:**
- Delete: `src/components/SettingsPanel.astro`
- Delete: `src/lib/typography-presets.ts`
- Modify: `src/layouts/BaseLayout.astro` (remove SettingsPanel import and usage, remove localStorage typography JS)
- Modify: `src/components/ThemeStyles.astro` (simplify to just load one font set from config)

**Step 1: Delete files**

Run:
```bash
rm /Users/florianmahner/Documents/Projects/florianmahner.github.io/src/components/SettingsPanel.astro
rm /Users/florianmahner/Documents/Projects/florianmahner.github.io/src/lib/typography-presets.ts
```

**Step 2: Simplify ThemeStyles.astro**

Replace entire file with:

```astro
---
/**
 * Theme Styles - loads fonts from config
 */
import { config } from '../lib/config';

const fonts = config.theme.fonts;
const uniqueFonts = [...new Set(Object.values(fonts))];
const fontParams = uniqueFonts.map(f => `family=${f.replace(/ /g, '+')}:wght@300;400;500;600;700`);
const fontsUrl = `https://fonts.googleapis.com/css2?${fontParams.join('&')}&display=swap`;
---

<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href={fontsUrl} rel="stylesheet" />

<style define:vars={{
  fontBody: fonts.body,
  fontHeading: fonts.heading,
  fontUi: fonts.ui,
  fontMono: fonts.mono,
  accentLight: config.theme.accent.light,
  accentDark: config.theme.accent.dark,
}}>
  :root {
    --font-body: var(--fontBody), Georgia, serif;
    --font-heading: var(--fontHeading), Georgia, serif;
    --font-ui: var(--fontUi), system-ui, sans-serif;
    --font-mono: var(--fontMono), 'SF Mono', monospace;
    --color-accent-light: var(--accentLight);
    --color-accent-dark: var(--accentDark);
  }
</style>
```

**Step 3: Clean up BaseLayout.astro**

- Remove: `import SettingsPanel from '../components/SettingsPanel.astro';`
- Remove: `<SettingsPanel />` near bottom of body
- Remove: The entire `<script is:inline>` block in `<head>` that restores typography/nav from localStorage (lines ~73-124). Replace with just light/dark theme detection:

```html
<script is:inline>
  (function() {
    const theme = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

- Remove: The nav-mode localStorage restoration logic from the `<script>` section (the floating nav code can stay since it's nav behavior, not settings)

**Step 4: Verify build**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove settings panel and runtime theme switching"
```

---

## Task 3: Merge CSS files into one stylesheet

**Files:**
- Create: `src/styles/styles.css` (merged from variables.css + colors.css + typography.css + global.css)
- Delete: `src/styles/variables.css`, `src/styles/colors.css`, `src/styles/typography.css`
- Modify: `src/styles/global.css` → rename to `src/styles/styles.css`
- Modify: `src/layouts/BaseLayout.astro` (update import)

**Step 1: Create merged styles.css**

Concatenate the 4 files in order: variables.css + colors.css + typography.css + global.css (minus the import statements at top of global.css). The global.css currently imports the other 3, so we just inline them. Remove the `@import` lines from global.css and prepend the contents of the 3 imported files.

Also clean up:
- Remove the comment in variables.css about "DO NOT hardcode fonts here - they will conflict with presets!" (presets are gone)
- Remove the sidenote styles from global.css (unused — no sidenotes on the site)
- Remove unused utility classes (shimmer, pulse, hover-glow, icon-rotate-hover, arrow-slide — not used anywhere)
- Keep: paper-card system, hover-item, view-all, layout utilities, CSS reset, animation utilities, responsive styles, print styles

**Step 2: Update BaseLayout.astro import**

Change: `import '../styles/global.css';` → `import '../styles/styles.css';`

**Step 3: Delete old files**

Run:
```bash
rm /Users/florianmahner/Documents/Projects/florianmahner.github.io/src/styles/variables.css
rm /Users/florianmahner/Documents/Projects/florianmahner.github.io/src/styles/colors.css
rm /Users/florianmahner/Documents/Projects/florianmahner.github.io/src/styles/typography.css
rm /Users/florianmahner/Documents/Projects/florianmahner.github.io/src/styles/global.css
```

**Step 4: Verify build + dev server**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm run build`
Expected: Build succeeds, site looks identical

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: merge CSS files into single stylesheet"
```

---

## Task 4: Upgrade publications page with academic template improvements

This is the big one. Bring the refined publication rendering from the academic template into the existing pages — but inline, not as separate component files.

**Files:**
- Modify: `src/pages/publications.astro` (add abbreviation badges, venue·year format, code links, configurable author highlighting)
- Modify: `src/pages/index.astro` (same improvements for selected publications section)
- Modify: `src/styles/styles.css` (add `.paper-abbr` and `.paper-sep` styles, update `.paper-link` to use smaller icons)

**Step 1: Update publications.astro**

Key changes to the publication card rendering:
1. Add `config.publications.highlightAuthor` for author highlighting (replace hardcoded `'Mahner'`)
2. Add venue · year · abbreviation badge format in meta row
3. Add code link support (alongside PDF and Web)
4. Use smaller icons (12px instead of 14px) for link buttons
5. Add `loading="lazy" decoding="async"` to preview images

Replace the paper card template in publications.astro:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { loadPublications, groupByYear } from '../lib/bibtex';
import { config } from '../lib/config';
import path from 'node:path';

const title = `Publications | ${config.site.title}`;
const highlightAuthor = config.publications.highlightAuthor;

const contentDir = path.join(process.cwd(), 'src', 'content');
const publications = loadPublications(contentDir);
const pubsByYear = groupByYear(publications);
const years = Object.keys(pubsByYear).sort((a, b) => Number(b) - Number(a));
---

<BaseLayout title={title} description={`Academic publications by ${config.name.first} ${config.name.last}`}>
  <article class="publications-page">
    <div class="container">
      {years.map(year => (
        <section class="year-section" data-animate="fade-up">
          <h2 class="year-label">{year}</h2>
          <div class="publications-list" data-animate="stagger">
            {pubsByYear[Number(year)].map(pub => (
              <article class:list={['paper-card', { 'paper-card--with-preview': pub.preview }]}>
                {pub.preview && (
                  <div class="paper-preview">
                    <img src={pub.preview} alt={pub.title} loading="lazy" decoding="async" class="preview-light" />
                    <img src={pub.preview.replace('-light.gif', '-dark.gif')} alt={pub.title} loading="lazy" decoding="async" class="preview-dark" />
                  </div>
                )}
                <div class="paper-content">
                  <div class="paper-meta">
                    {(pub.journal || pub.booktitle) && <span class="paper-venue">{pub.journal || pub.booktitle}</span>}
                    {(pub.journal || pub.booktitle) && <span class="paper-sep">&middot;</span>}
                    <span class="paper-year">{pub.year}</span>
                    {pub.abbr && <span class="paper-abbr">{pub.abbr}</span>}
                  </div>
                  <h3 class="paper-title">
                    {pub.pdf ? (
                      <a href={pub.pdf} target="_blank" rel="noopener noreferrer">{pub.title}</a>
                    ) : pub.html ? (
                      <a href={pub.html} target="_blank" rel="noopener noreferrer">{pub.title}</a>
                    ) : (
                      pub.title
                    )}
                  </h3>
                  <p class="paper-authors">
                    {pub.authors.map((author, i) => (
                      <>
                        <span class:list={{ 'highlight-author': highlightAuthor && author.includes(highlightAuthor) }}>
                          {author}
                        </span>
                        {i < pub.authors.length - 1 && ', '}
                      </>
                    ))}
                  </p>
                  <div class="paper-links">
                    {pub.pdf && (
                      <a href={pub.pdf} class="paper-link" target="_blank" rel="noopener noreferrer">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" /></svg>
                        PDF
                      </a>
                    )}
                    {pub.html && (
                      <a href={pub.html} class="paper-link" target="_blank" rel="noopener noreferrer">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z" /></svg>
                        Web
                      </a>
                    )}
                    {pub.code && (
                      <a href={pub.code} class="paper-link" target="_blank" rel="noopener noreferrer">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
                        Code
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  </article>
</BaseLayout>
```

Keep the existing `<style>` section — it's clean.

**Step 2: Update index.astro selected publications**

Same changes for the selected papers section on the homepage:
- Use `config.publications.highlightAuthor` for highlighting
- Add venue · year · abbr format
- Add code link
- Smaller icons (12px)
- Add `decoding="async"`

Update the frontmatter:
```astro
const highlightAuthor = config.publications.highlightAuthor;
```

And update the card template in the selected papers section to match publications.astro (but keeping the `--with-preview-lg` variant).

**Step 3: Add paper-abbr and paper-sep styles to styles.css**

Add to the Paper/Publication Card System section:

```css
.paper-sep {
  color: var(--color-text-muted);
  opacity: 0.5;
}

.paper-abbr {
  display: inline-block;
  padding: 1px 6px;
  background: var(--color-accent);
  color: white;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  line-height: 1.4;
}
```

**Step 4: Verify build + visually check**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm run build && npm run preview`
Expected: Build succeeds. Publications show venue · year · abbreviation badges. Author names are highlighted. Code links appear when present.

**Step 5: Commit**

```bash
git add src/pages/publications.astro src/pages/index.astro src/styles/styles.css
git commit -m "feat: upgrade publications with abbreviation badges, configurable highlighting, and code links"
```

---

## Task 5: Create papers.bib from existing publications.json

**Files:**
- Create: `src/content/papers.bib` (convert from publications.json)
- Keep: `src/content/publications.json` (as fallback, bibtex.ts prefers .bib)

**Step 1: Create papers.bib**

Convert the 8 publications from publications.json to BibTeX format:

```bibtex
@article{mahner2025dimensions,
  title = {Dimensions underlying the representational alignment of deep neural networks with humans},
  author = {Mahner, Florian P. and Muttenthaler, Lukas and Güçlü, Umut and Hebart, Martin N.},
  journal = {Nature Machine Intelligence},
  year = {2025},
  volume = {7},
  pages = {848-859},
  pdf = {https://www.nature.com/articles/s42256-025-01041-7.pdf},
  html = {https://www.nature.com/articles/s42256-025-01041-7},
  preview = {/previews/transformers-light.gif},
  selected = {true},
}

@article{roth2025ten,
  title = {Ten principles for reliable, efficient, and adaptable coding in psychology and cognitive neuroscience},
  author = {Roth, Johannes and Duan, Yunyan and Mahner, Florian P. and Kaniuth, Philipp and Wallis, Thomas SA and Hebart, Martin N.},
  journal = {Communications Psychology},
  year = {2025},
  volume = {3},
  pages = {62},
  html = {https://www.nature.com/articles/s44271-025-00216-1},
  pdf = {https://www.nature.com/articles/s44271-025-00216-1.pdf},
  preview = {/previews/shannon-light.gif},
}

@article{kaniuth2025high,
  title = {A high-throughput approach for the efficient prediction of perceived similarity of natural objects},
  author = {Kaniuth, Philipp and Mahner, Florian P. and Perkuhn, Jonas and Hebart, Martin N.},
  journal = {eLife},
  year = {2025},
  volume = {14},
  html = {https://elifesciences.org/reviewed-preprints/105394},
  pdf = {https://elifesciences.org/reviewed-preprints/105394.pdf},
  preview = {/previews/dna-light.gif},
}

@inproceedings{stoinski2025quantifying,
  title = {Quantifying the role of perceived curvature in the processing of natural object images},
  author = {Stoinski, Laura M. and García Cerdas, Diego and Mahner, Florian P. and Yousefi, Parsa and Hebart, Martin N.},
  booktitle = {Conference on Cognitive Computational Neuroscience},
  year = {2025},
  preview = {/previews/vision-light.gif},
  pdf = {https://2025.ccneuro.org/abstract_pdf/Stoinski_2025_Quantifying_Role_Perceived_Curvature_Processing_.pdf},
}

@inproceedings{mahner2023dimensions,
  title = {Dimensions that matter: Interpretable object dimensions in humans and deep neural networks},
  author = {Mahner, Florian P. and Muttenthaler, Lukas and Güçlü, Umut and Hebart, Martin N.},
  booktitle = {Conference on Cognitive Computational Neuroscience},
  year = {2023},
  abbr = {CCN},
  preview = {/previews/relativity-light.gif},
  pdf = {https://repository.ubn.ru.nl/bitstream/handle/2066/297725/297725.pdf?sequence=1},
}

@inproceedings{mahner2022learning,
  title = {Learning cortical magnification with brain-optimized convolutional neural networks},
  author = {Mahner, Florian P. and Seeliger, Katja and Güçlü, Umut and Hebart, Martin N.},
  booktitle = {Conference on Cognitive Computational Neuroscience},
  year = {2022},
  abbr = {CCN},
  preview = {/previews/turing-light.gif},
  pdf = {https://repository.ubn.ru.nl/bitstream/handle/2066/302838/302838.pdf?sequence=1},
}

@article{janssen2020reliance,
  title = {Reliance on model-based and model-free control in obesity},
  author = {Janssen, Lieneke K. and Mahner, Florian P. and Schlagenhauf, Florian and Deserno, Lorenz and Horstmann, Annette},
  journal = {Scientific Reports},
  year = {2020},
  volume = {10},
  pages = {22433},
  abbr = {SciRep},
  html = {https://www.nature.com/articles/s41598-020-79407-6},
  pdf = {https://www.nature.com/articles/s41598-020-79407-6.pdf},
  preview = {/previews/prospect-light.gif},
}

@inproceedings{tanisaro2017quasi,
  title = {Quasi view-independent human motion recognition in subspaces},
  author = {Tanisaro, Pattreeya and Mahner, Florian P. and Heidemann, Gunther},
  booktitle = {Proceedings of the 9th International Conference on Machine Learning and Computing},
  year = {2017},
  pages = {278-283},
  abbr = {ICMLC},
  html = {https://dl.acm.org/doi/abs/10.1145/3055635.3056577},
  pdf = {https://www.researchgate.net/profile/Pattreeya-Tanisaro/publication/317200656},
  preview = {/previews/page1999pagerank-light.gif},
}
```

**Step 2: Verify BibTeX is loaded**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm run build`
Expected: Build succeeds. The bibtex.ts `loadPublications()` should now find `papers.bib` and use it.

**Step 3: Commit**

```bash
git add src/content/papers.bib
git commit -m "feat: add papers.bib as primary publication source"
```

---

## Task 6: Update CLAUDE.md and clean up

**Files:**
- Modify: `CLAUDE.md` (update to reflect new config system, removed files)
- Delete: `src/components/Sidenote.astro` (if exists, unused)

**Step 1: Update CLAUDE.md**

Key changes:
- Config is now `config.yaml` at project root, loaded by `src/lib/config.ts`
- Publications use `src/content/papers.bib` (BibTeX) as primary source, JSON as fallback
- No more SettingsPanel or typography-presets
- Styles are in single `src/styles/styles.css`
- Features section uses snake_case keys (`selected_publications`, not `selectedPublications`)

**Step 2: Final build verification**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm run build`
Expected: Clean build, no warnings

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for new config and structure"
```

---

## Task 7: Visual verification with dev server

**Step 1: Start dev server**

Run: `cd /Users/florianmahner/Documents/Projects/florianmahner.github.io && npm run dev`

**Step 2: Check all 4 pages**

- `/` — About page: bio, research interests, selected publications with abbreviation badges, education timeline
- `/publications` — Full list grouped by year, author highlighting, venue·year·abbr format, preview GIFs
- `/open-source` — Repo cards (should be unchanged)
- `/misc` — Tools and configs (should be unchanged)

**Step 3: Check dark mode toggle works**

**Step 4: Check mobile responsiveness (resize browser to <768px)**

**Step 5: Fix any visual issues found**
