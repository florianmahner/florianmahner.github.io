/**
 * Site Configuration
 * Edit this file to customize your website
 */

export const config = {
  // Personal Information
  name: {
    first: "Florian",
    middle: "P",
    last: "Mahner",
  },

  // Professional title/tagline
  title: "PhD Candidate in Machine Learning",

  // Contact & Social Links (leave empty string to hide)
  email: "florian.mahner@gmail.com",
  social: {
    github: "florianmahner",
    scholar: "YOUR_SCHOLAR_ID", // Google Scholar ID
    linkedin: "florianmahner",
    twitter: "", // leave empty to hide
    orcid: "", // ORCID ID
    researchgate: "",
  },

  // Site metadata
  site: {
    url: "https://florianmahner.github.io",
    title: "Florian Mahner", // Browser tab title
    description: "Personal academic website of Florian Mahner - Research in computational neuroscience and machine learning",
    language: "en",
  },

  // Navigation - pages to show in nav bar
  // Order matters! First item is leftmost
  navigation: [
    { id: "about", label: "About", href: "/" },
    { id: "publications", label: "Publications", href: "/publications" },
    { id: "open-source", label: "Open Source", href: "/open-source" },
    { id: "misc", label: "Misc", href: "/misc" },
    // Add more pages here:
    // { id: "blog", label: "Blog", href: "/blog" },
    // { id: "cv", label: "CV", href: "/cv" },
  ],

  // Navigation style: "inline" | "floating-icon" | "minimal"
  navigationMode: "floating-icon" as const,

  // Theme customization
  theme: {
    // Accent color (used for links, highlights)
    // Use any valid CSS color
    accentLight: "#c41e3a", // Color in light mode
    accentDark: "#ff4d6a",  // Color in dark mode

    // Font families (loaded from Google Fonts)
    // Using Crimson Pro throughout for cohesive editorial feel
    fonts: {
      // Main text font
      body: "Crimson Pro",
      // Headings font
      heading: "Crimson Pro",
      // UI elements (nav, buttons) - same for consistency
      ui: "Crimson Pro",
      // Code/monospace
      mono: "JetBrains Mono",
    },

    // Content width (max-width of main content)
    contentWidth: "750px",
  },

  // Feature toggles - enable/disable sections
  features: {
    // Show selected publications on homepage
    selectedPublications: true,
    // Show academic background on homepage
    education: true,
    // Enable dark mode toggle
    darkMode: true,
    // Enable scroll animations
    animations: true,
  },

  // Footer links (in addition to social)
  footer: {
    // Show copyright with current year
    copyright: true,
    // Additional links
    links: [
      { label: "Email", href: "mailto:florian.mahner@gmail.com" },
    ],
  },
};

// Type export for use in components
export type SiteConfig = typeof config;
