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
  // A short link (a person's name, a group) must not break across two lines:
  // "Klaus-Robert" at the end of one line and "Müller" on the next reads
  // badly. Links of one or two words are kept together; longer ones wrap.
  const label = tokens[i + 1] && tokens[i + 1].type === "text" ? tokens[i + 1].content.trim() : "";
  if (label && label.split(/\s+/).length <= 2) tokens[i].attrJoin("class", "keep");
  return defaultLinkOpen(tokens, i, opts, env, self);
};

// ---- Content checks -------------------------------------------------------
// Run before every build. A missing field or a malformed date stops the build
// with a message naming the file and entry, instead of producing a page with
// a hole in it.
function checkContent() {
  const read = name => JSON.parse(fs.readFileSync(path.join("_data", `${name}.json`), "utf-8"));
  const problems = [];
  const need = (file, i, entry, fields) => {
    for (const f of fields) {
      if (entry[f] === undefined || entry[f] === null || entry[f] === "") {
        problems.push(`_data/${file}.json, entry ${i + 1}: "${f}" is missing`);
      }
    }
  };

  read("news").forEach((n, i) => {
    need("news", i, n, ["date", "text"]);
    if (n.date && !/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/.test(n.date)) {
      problems.push(`_data/news.json, entry ${i + 1}: date "${n.date}" is not YYYY-MM or YYYY-MM-DD`);
    }
  });

  read("publications").forEach((p, i) => {
    need("publications", i, p, ["title", "authors", "year", "venue"]);
    if (!p.html && !p.pdf) problems.push(`_data/publications.json, entry ${i + 1}: needs "html" or "pdf" to link to`);
    if (p.authors && !Array.isArray(p.authors)) problems.push(`_data/publications.json, entry ${i + 1}: "authors" must be a list`);
    if (p.selected && !p.art) problems.push(`_data/publications.json, entry ${i + 1}: a selected paper needs an "art" drawing`);
    if (p.art && !fs.existsSync(path.join("_includes", "art", `${p.art}.svg`))) {
      problems.push(`_data/publications.json, entry ${i + 1}: no drawing _includes/art/${p.art}.svg`);
    }
  });

  read("education").forEach((e, i) => {
    need("education", i, e, ["degree", "field", "institution", "institutionUrl"]);
    if (!e.startLabel && !(e.startYear && e.endYear)) {
      problems.push(`_data/education.json, entry ${i + 1}: needs "startLabel" or both "startYear" and "endYear"`);
    }
  });

  if (problems.length) throw new Error("Content check failed:\n  " + problems.join("\n  "));
}

export default function(eleventyConfig) {
  eleventyConfig.on("eleventy.before", checkContent);

  // {% inlineCss "css/site.css" %} — the stylesheet's text, for a <style>
  // element. Comments and runs of whitespace are removed; nothing else is
  // rewritten, so what ships is the file as written.
  eleventyConfig.addShortcode("inlineCss", file =>
    fs.readFileSync(file, "utf-8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\s+/g, " ")
      .trim());
  eleventyConfig.addWatchTarget("css/");

  // Not templates
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("CLAUDE.md");
  eleventyConfig.ignores.add(".claude/**");
  eleventyConfig.ignores.add("analytics/**");
  eleventyConfig.ignores.add("content/**");
  eleventyConfig.ignores.add("archive/**"); // kept in the repository, not published

  // Static files: public/ goes to the site root, the one script to /js/.
  // archive/ (the two thesis PDFs) is deliberately not copied.
  // (The stylesheet is inlined into the page, so css/ is not copied.)
  eleventyConfig.addPassthroughCopy({ "public": "/" });
  eleventyConfig.addPassthroughCopy("js");

  // Jost, self-hosted from @fontsource-variable/jost — no third-party font CDN.
  for (const f of ["jost-latin-wght-normal", "jost-latin-ext-wght-normal", "jost-latin-wght-italic"]) {
    eleventyConfig.addPassthroughCopy({
      [`node_modules/@fontsource-variable/jost/files/${f}.woff2`]: `fonts/${f}.woff2`
    });
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
