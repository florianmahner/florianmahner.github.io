import fs from "node:fs";
import path from "node:path";
import MarkdownIt from "markdown-it";

const md = new MarkdownIt({ html: true, linkify: true, typographer: true });

// Open every external link in a new tab with rel=noopener noreferrer.
const defaultLinkOpen = md.renderer.rules.link_open || function(tokens, i, opts, _env, self) {
  return self.renderToken(tokens, i, opts);
};
md.renderer.rules.link_open = function(tokens, i, opts, env, self) {
  const href = tokens[i].attrGet("href") || "";
  if (/^https?:\/\//.test(href)) {
    tokens[i].attrJoin("target", "_blank");
    tokens[i].attrJoin("rel", "noopener noreferrer");
  }
  return defaultLinkOpen(tokens, i, opts, env, self);
};

export default function(eleventyConfig) {
  // Ignore non-template files
  eleventyConfig.ignores.add("docs/**");
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("CLAUDE.md");
  eleventyConfig.ignores.add(".claude/**");
  eleventyConfig.ignores.add("analytics/**");
  eleventyConfig.ignores.add("content/**");

  // Passthrough copy static assets to root
  eleventyConfig.addPassthroughCopy({ "public": "/" });
  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");

  // Self-hosted variable fonts from @fontsource-variable/* — no third-party
  // font CDN. Inter carries wght + opsz; Geist Mono carries wght.
  const fonts = {
    inter: ["inter-latin-opsz-normal", "inter-latin-ext-opsz-normal"],
    "geist-mono": ["geist-mono-latin-wght-normal", "geist-mono-latin-ext-wght-normal"]
  };
  for (const [pkg, files] of Object.entries(fonts)) {
    for (const f of files) {
      eleventyConfig.addPassthroughCopy({
        [`node_modules/@fontsource-variable/${pkg}/files/${f}.woff2`]: `fonts/${f}.woff2`
      });
    }
  }

  // Highlight author name in author list. Each name is wrapped in its own
  // span so a name never breaks mid-way across two lines — lines wrap
  // between authors instead.
  eleventyConfig.addFilter("highlightAuthor", function(authors, name) {
    if (!authors || !Array.isArray(authors)) return '';
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return authors.map(a => {
      const cls = a.includes(name) ? 'author self' : 'author';
      return '<span class="' + cls + '">' + esc(a) + '</span>';
    }).join(', ');
  });

  // Inline markdown (links, emphasis) for one-line strings such as news items.
  eleventyConfig.addFilter("mdInline", str => str ? md.renderInline(str) : "");

  // News dates are "YYYY-MM" (or "YYYY-MM-DD").
  const MONTHS = ["January","February","March","April","May","June","July",
                  "August","September","October","November","December"];
  eleventyConfig.addFilter("monthName", d => MONTHS[+String(d).split("-")[1] - 1] || "");
  eleventyConfig.addFilter("yearOf", d => String(d).slice(0, 4));

  // Current year shortcode
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // {% mdfile "about" %} — read content/about.md and render to HTML.
  // Edit content/<name>.md in markdown; auto-rebuild on save.
  eleventyConfig.addShortcode("mdfile", function(name, excludeLeadFromSnippet = false) {
    const filePath = path.join("content", `${name}.md`);
    const raw = fs.readFileSync(filePath, "utf-8");
    const html = md.render(raw);
    if (!excludeLeadFromSnippet) return html;
    return html.replace("<p>", "<p><span data-nosnippet>").replace("</p>", "</span></p>");
  });
  eleventyConfig.addWatchTarget("content/");

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
