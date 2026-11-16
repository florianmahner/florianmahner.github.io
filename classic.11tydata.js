// /classic/ — the live site's look (dot grid, window cards, Inter and Geist
// Mono, the name with its violet dot) carrying the ideas from the redesign:
// a drawing on every publication card, two-column news, journal papers only
// under "show more", Background as one table. Dev server only; production
// builds skip it.
export default {
  layout: "classic-base.njk",
  eleventyExcludeFromCollections: true,
  permalink: process.env.ELEVENTY_RUN_MODE === "build" ? false : "/classic/"
};
