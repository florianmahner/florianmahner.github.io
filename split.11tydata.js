// /split/ is the split-mode redesign lab (docs/split-spec.md). Like /lab/, it
// only exists while the dev server runs; production builds skip it.
export default {
  layout: "split-base.njk",
  eleventyExcludeFromCollections: true,
  permalink: process.env.ELEVENTY_RUN_MODE === "build" ? false : "/split/"
};
