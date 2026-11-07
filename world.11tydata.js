// /world/ is the immersive 3D view of the homepage. It is published but not
// linked from the homepage, and carries noindex so search engines skip it.
export default {
  eleventyExcludeFromCollections: true,
  layout: false,
  permalink: "/world/"
};
