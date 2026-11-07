// /world/ is the immersive 3D experiment. It only exists while the dev server
// runs (`npm run dev`); production builds skip it entirely.
export default {
  eleventyExcludeFromCollections: true,
  layout: false,
  permalink: process.env.ELEVENTY_RUN_MODE === "build" ? false : "/world/"
};
