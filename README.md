# florianmahner.com

Personal academic website of Florian P. Mahner. One page, built with
[Eleventy](https://www.11ty.dev/) from a few data files, plain CSS and
almost no JavaScript.

```bash
npm install
npm run dev      # http://localhost:8080, reloads on save
npm run build    # production build in _site/
```

## Where things are

| What | Where |
|---|---|
| About text | `content/about.md` |
| News, publications, background, profile links | `_data/*.json` |
| Page structure | `index.njk`, `_includes/` |
| Publication drawings | `_includes/art/*.svg` |
| Styles (colours are tokens at the top) | `css/site.css` |
| Static files (favicon, PDFs) | `public/` |

The build checks the data files and stops with a clear message if an entry
is missing a field or has a malformed date.

## Deployment

A push to `master` builds the site and deploys it to Cloudflare Workers
(`.github/workflows/deploy.yml`, `src/index.js`, `wrangler.jsonc`).

`CLAUDE.md` holds the design rules and the decisions behind them.
