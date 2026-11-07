// /news-ideas/ compares four directions for the news pane. Dev server only.
export default {
  eleventyExcludeFromCollections: true,
  layout: false,
  permalink: process.env.ELEVENTY_RUN_MODE === "build" ? false : "/news-ideas/"
};
