// /layout-ideas/ compares arrangements for the second About screen. Dev server only.
export default {
  eleventyExcludeFromCollections: true,
  layout: false,
  permalink: process.env.ELEVENTY_RUN_MODE === "build" ? false : "/layout-ideas/"
};
