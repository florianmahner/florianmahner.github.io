# Academic Website Template

A minimal, modern academic website template built with [Astro](https://astro.build). Features clean typography, scroll animations, BibTeX support, and a centralized configuration system.

## Features

- **Single config file** - All settings in `src/config.ts`
- **BibTeX support** - Manage publications in standard `.bib` format
- **Dark mode** - Automatic theme switching with manual toggle
- **GSAP animations** - Smooth scroll-triggered animations
- **Fully responsive** - Mobile-first design
- **SEO optimized** - Structured data, sitemap, meta tags
- **Multiple nav styles** - Choose inline, minimal, or floating icon navigation

## Quick Start

```bash
# Clone or use as template
git clone <this-repo> my-website
cd my-website

# Install dependencies
npm install

# Start development server
npm run dev
```

Site available at http://localhost:4321

## Configuration

Edit `src/config.ts` to customize your site:

```typescript
export const config = {
  // Your name
  name: {
    first: "Your",
    middle: "", // optional
    last: "Name",
  },

  // Professional title
  title: "PhD Candidate in ...",

  // Contact & social
  email: "you@example.com",
  social: {
    github: "username",
    scholar: "SCHOLAR_ID", // Google Scholar ID
    linkedin: "username",
    twitter: "", // leave empty to hide
    orcid: "",
  },

  // Theme customization
  theme: {
    accentLight: "#c41e3a", // accent color in light mode
    accentDark: "#ff4d6a",  // accent color in dark mode
    fonts: {
      body: "Source Sans 3",
      heading: "Source Sans 3",
      ui: "Inter",
      mono: "JetBrains Mono",
    },
    contentWidth: "750px",
  },

  // Navigation
  navigation: [
    { id: "about", label: "About", href: "/" },
    { id: "publications", label: "Publications", href: "/publications" },
    // Add more pages...
  ],

  // Navigation style: "inline" | "minimal" | "floating-icon"
  navigationMode: "minimal",

  // Feature toggles
  features: {
    selectedPublications: true, // show on homepage
    education: true,            // show on homepage
    darkMode: true,
    animations: true,
  },
};
```

## Content

### Publications (BibTeX)

Edit `src/content/papers.bib` to add publications:

```bibtex
@article{yourname2024paper,
  title = {Your Paper Title},
  author = {Your Name and Coauthor Name},
  journal = {Journal Name},
  year = {2024},
  % Custom fields for website:
  pdf = {https://link-to-pdf.pdf},
  html = {https://paper-webpage.com},
  preview = {/previews/paper.gif},
  selected = {true},  % show on homepage
  abbr = {JNL}        % abbreviation shown in list
}
```

Copy BibTeX from Google Scholar, DBLP, or export from Zotero. Add the custom fields (`pdf`, `html`, `preview`, `selected`, `abbr`) for website features.

### Education

Edit `src/content/education.json`:

```json
{
  "education": [
    {
      "degree": "PhD",
      "field": "Computer Science",
      "institution": "University Name",
      "institutionUrl": "https://university.edu",
      "startYear": 2020,
      "endYear": 2024,
      "supervisors": [
        { "name": "Prof. Name", "url": "https://professor.com" }
      ],
      "grade": "Excellent",
      "thesis": {
        "title": "Thesis Title",
        "url": "/pdf/thesis.pdf"
      }
    }
  ]
}
```

### Open Source Projects

Edit `src/content/repositories.json`:

```json
{
  "github_user": "yourusername",
  "repositories": [
    {
      "name": "project-name",
      "owner": "yourusername",
      "description": "Short description",
      "url": "https://github.com/yourusername/project-name",
      "language": "Python",
      "stars": 100,
      "forks": 20
    }
  ]
}
```

### Adding New Pages

1. Create a new `.astro` file in `src/pages/`:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { config } from '../config';

const title = `Page Title | ${config.site.title}`;
---

<BaseLayout title={title}>
  <article class="container">
    <h1>Page Title</h1>
    <p>Your content here...</p>
  </article>
</BaseLayout>
```

2. Add to navigation in `src/config.ts`:

```typescript
navigation: [
  // ... existing items
  { id: "newpage", label: "New Page", href: "/newpage" },
],
```

## Project Structure

```
src/
├── config.ts              # All site configuration
├── content/
│   ├── papers.bib         # Publications (BibTeX)
│   ├── education.json     # Academic background
│   ├── repositories.json  # Open source projects
│   └── misc.json          # Tools/resources
├── lib/
│   └── bibtex.ts          # BibTeX parser utility
├── components/
│   ├── ThemeToggle.astro  # Dark mode switch
│   ├── ThemeStyles.astro  # Dynamic CSS from config
│   └── ...
├── layouts/
│   └── BaseLayout.astro   # Main page wrapper
├── pages/
│   ├── index.astro        # Homepage
│   ├── publications.astro
│   ├── open-source.astro
│   └── misc.astro
└── styles/
    ├── global.css         # Global styles
    └── variables.css      # CSS custom properties
```

## Commands

| Command           | Action                                     |
| :---------------- | :----------------------------------------- |
| `npm install`     | Install dependencies                       |
| `npm run dev`     | Start dev server at `localhost:4321`       |
| `npm run build`   | Build production site to `./dist/`         |
| `npm run preview` | Preview production build locally           |

## Customization

### Colors

Change accent colors in `src/config.ts`:

```typescript
theme: {
  accentLight: "#0066cc", // blue accent
  accentDark: "#4da6ff",
}
```

### Fonts

Change fonts in `src/config.ts` (loaded from Google Fonts):

```typescript
fonts: {
  body: "Lora",           // serif body text
  heading: "Playfair Display",
  ui: "Inter",
  mono: "Fira Code",
}
```

### Content Width

Adjust the main content width:

```typescript
theme: {
  contentWidth: "680px", // narrower
  // or "850px" for wider
}
```

### Navigation Style

Choose from three navigation modes:

- `"inline"` - Traditional horizontal nav at top
- `"minimal"` - Compact top bar that hides on scroll
- `"floating-icon"` - Floating hamburger menu (mobile-style)

```typescript
navigationMode: "minimal",
```

## Publication Previews

Create animated GIF previews for papers using [Manim](https://www.manim.community/):

```bash
cd animations
manim -ql --format=gif your_animation.py AnimationClass
# Copy output to public/previews/
```

Reference in BibTeX:
```bibtex
preview = {/previews/your-preview.gif},
```

## Deployment

### GitHub Pages

The template includes a GitHub Actions workflow (`.github/workflows/deploy.yml`).

1. Go to repo Settings > Pages
2. Set Source to "GitHub Actions"
3. Push to `master` branch to trigger deployment

### Other Platforms

Build the site:
```bash
npm run build
```

Deploy the `dist/` folder to any static hosting (Netlify, Vercel, etc.)

## Technologies

- [Astro 5](https://astro.build) - Static site generator
- [GSAP](https://gsap.com) - Scroll animations
- [bibtex-parse](https://www.npmjs.com/package/bibtex-parse) - BibTeX parsing
- Google Fonts - Typography

## License

MIT License - feel free to use this template for your own website.
