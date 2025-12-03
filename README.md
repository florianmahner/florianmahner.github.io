# Florian Mahner - Personal Website

Personal academic website built with [Astro](https://astro.build), featuring modern typography and GSAP scroll animations.

**Live site:** https://florianmahner.github.io

## Quick Start

```bash
npm install
npm run dev
```

Site available at http://localhost:4321

## Commands

| Command           | Action                                     |
| :---------------- | :----------------------------------------- |
| `npm install`     | Install dependencies                       |
| `npm run dev`     | Start dev server at `localhost:4321`       |
| `npm run build`   | Build production site to `./dist/`         |
| `npm run preview` | Preview production build locally           |

## Project Structure

```
├── src/
│   ├── components/     # Reusable Astro components
│   ├── layouts/        # Page layouts (BaseLayout)
│   ├── pages/          # Route pages
│   ├── styles/         # CSS (variables, typography, utilities)
│   └── data/           # JSON data files
├── public/
│   ├── previews/       # Publication preview GIFs
│   ├── fonts/          # Custom fonts
│   └── images/         # Static images
├── animations/         # Manim scripts for publication previews
└── astro.config.mjs
```

## Technologies

- **Astro 5** - Static site generator
- **GSAP + ScrollTrigger** - Scroll animations
- **Manim** - Publication preview animations
- **Geist** - Typography (by Vercel)

## Generating Animations

Publication preview GIFs are generated using Manim:

```bash
cd animations
manim -ql --format=gif alignment.py AlignmentAnimation
# Output: media/videos/alignment/480p15/*.gif
# Copy to: public/previews/
```

## Deployment

Automatic via GitHub Actions on push to `master`. Deploys to GitHub Pages.

## License

Content is personal. Code structure may be referenced.
