# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
npm run dev      # Start development server with live reload
npm run build    # Build for production (outputs to _site/)
```

## Architecture

This is a personal academic website built with **11ty (Eleventy) v3**. The site uses static site generation with Nunjucks templates, vanilla CSS, and no client-side frameworks.

### Design System

**Swiss International Typographic Style + Neobrutalist Cards**
- Inter font at extreme weight range (300–900)
- Black/white palette with vivid red accent (#E63946)
- Visible grid lines at 33%/66% column positions
- Section numbers and uppercase labels
- Publication and repo cards: 2px solid black borders, 3px offset shadow, hover lift effect
- No dark mode — pure black on white

### Key Configuration

- `eleventy.config.js` — 11ty configuration: passthrough copy, custom filters, ignore rules, template formats
- `_data/` — Global data files (JSON) consumed by all templates
- `_includes/` — Shared Nunjucks layouts
- `css/style.css` — Single unified stylesheet with all design tokens and component styles
- `public/` — Static assets (favicon, PDFs, preview images, robots.txt) copied to output root

### Content Structure

Content is managed through JSON files in `_data/`:
- `site.json` — Site metadata (name, title, email, social links, affiliations, highlightAuthor)
- `publications.json` — Publication entries with metadata (title, authors, year, links, selected flag)
- `repos.json` — GitHub repositories for open source section
- `education.json` — Academic background entries
- `tools.json` — Tools and configurations

### Layout System

- `_includes/base.njk` — Main layout with sticky nav, mobile hamburger menu, footer, and inline JS for scroll reveals + active nav tracking
- Uses IntersectionObserver for animations (no external animation library)

### Pages

- `index.njk` — Single-page homepage with all sections: Hero, About, Publications, Background, Open Source, Tools, Contact

### Custom Filters

- `highlightAuthor` — Wraps matching author name in `<span class="self">` for bold styling in publication cards

### Adding Content

To add a publication: add an entry to `_data/publications.json` with title, authors array, year, and optional links (pdf, html, code). Set `selected: true` to feature it on the homepage.

To add a project page: create a new `.md` or `.njk` file at the root. 11ty will process it using the Nunjucks template engine.

### Deployment

GitHub Actions workflow (`.github/workflows/deploy.yml`) builds with `npm run build` and deploys `_site/` to GitHub Pages on push to master.

## Skills

Project-level skills are available in `.claude/skills/` for use when redesigning or improving the site:

- **frontend-design** — Core skill for creating distinctive, production-grade UI
- **canvas-design** — For creating visual assets as PDF/PNG
- **webapp-testing** — For testing the site with Playwright (dev server runs on port 4321)

### Design References

Reference mockups stored in `docs/plans/mockups/`:
- `mockup-brutalist.html` — Neobrutalist design reference
- `mockup-swiss.html` — Swiss minimal design reference (primary inspiration)
