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
  eleventyConfig.ignores.add("content/**");

  // Passthrough copy static assets to root
  eleventyConfig.addPassthroughCopy({ "public": "/" });
  eleventyConfig.addPassthroughCopy("css");

  // Highlight author name in author list
  eleventyConfig.addFilter("highlightAuthor", function(authors, name) {
    if (!authors || !Array.isArray(authors)) return '';
    const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    return authors.map(a =>
      a.includes(name)
        ? '<span class="self">' + esc(a) + '</span>'
        : esc(a)
    ).join(', ');
  });

  // Current year shortcode
  eleventyConfig.addShortcode("year", () => `${new Date().getFullYear()}`);

  // {% mdfile "about" %} — read content/about.md and render to HTML.
  // Edit content/<name>.md in markdown; auto-rebuild on save.
  eleventyConfig.addShortcode("mdfile", function(name) {
    const filePath = path.join("content", `${name}.md`);
    const raw = fs.readFileSync(filePath, "utf-8");
    return md.render(raw);
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
