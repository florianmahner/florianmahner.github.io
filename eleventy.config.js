export default function(eleventyConfig) {
  // Ignore non-template files
  eleventyConfig.ignores.add("docs/**");
  eleventyConfig.ignores.add("README.md");
  eleventyConfig.ignores.add("CLAUDE.md");
  eleventyConfig.ignores.add(".claude/**");

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
