# Mockup A Faithful Rewrite — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the live site pixel-match mockup-a.html — fix typography, spacing, nav layout, and link styles.

**Architecture:** Update CSS custom property values in styles.css, fix nav in BaseLayout.astro, update homepage spacing in index.astro. Keep existing component architecture. DRY — all pages share the same variables.

**Tech Stack:** Astro v5, CSS custom properties, Jost font

---

### Task 1: Fix CSS custom properties in styles.css

**Files:**
- Modify: `src/styles/styles.css`

**Step 1: Replace fluid font sizes with mockup A's fixed values**

Change in `:root`:
```css
/* FROM */
--font-size-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.85rem);
--font-size-sm: clamp(0.875rem, 0.83rem + 0.25vw, 0.95rem);
--font-size-base: clamp(1rem, 0.95rem + 0.3vw, 1.1rem);
--font-size-lg: clamp(1.15rem, 1.05rem + 0.5vw, 1.3rem);
--font-size-xl: clamp(1.3rem, 1.15rem + 0.7vw, 1.55rem);
--font-size-2xl: clamp(1.55rem, 1.35rem + 1vw, 2rem);

/* TO */
--font-size-xs: 0.75rem;
--font-size-sm: 0.88rem;
--font-size-base: 0.95rem;
--font-size-lg: 1.1rem;
--font-size-xl: 1.5rem;
--font-size-2xl: 2rem;
```

**Step 2: Fix text-secondary color**

```css
/* FROM */
--color-text-secondary: #4a4a4a;
/* TO */
--color-text-secondary: #555;
```

Also in dark mode, keep `--color-text-secondary: #a3a3a3` (unchanged).

**Step 3: Remove global letter-spacing from body**

```css
/* FROM */
body {
  letter-spacing: var(--letter-spacing-normal);
}
/* TO */
body {
  letter-spacing: normal;
}
```

**Step 4: Remove animated link underline**

```css
/* FROM */
a {
  background-image: linear-gradient(currentColor, currentColor);
  background-position: 0% 100%;
  background-repeat: no-repeat;
  background-size: 0% 1px;
  transition: background-size var(--transition-fast), color var(--transition-fast);
}
a:hover {
  background-size: 100% 1px;
}

/* TO */
a {
  transition: color var(--transition-fast);
}
a:hover {
  /* just color change, no underline */
}
```

**Step 5: Run build**

Run: `npm run build`
Expected: Clean build, no errors

---

### Task 2: Fix nav to full-width layout in BaseLayout.astro

**Files:**
- Modify: `src/layouts/BaseLayout.astro`

**Step 1: Remove container class from inline nav**

Change the inline nav HTML from:
```html
<nav class="inline-nav-inner container">
```
to:
```html
<nav class="inline-nav-inner">
```

**Step 2: Update inline nav CSS**

```css
/* FROM */
.inline-nav {
  padding: 1.25rem 0;
}
.inline-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* TO */
.inline-nav {
  padding: 1.25rem 2.5rem;
}
.inline-nav-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

**Step 3: Run build**

Run: `npm run build`
Expected: Clean build

---

### Task 3: Fix homepage spacing in index.astro

**Files:**
- Modify: `src/pages/index.astro`

**Step 1: Update all spacing values to match mockup A**

```css
/* Intro */
.intro { margin-bottom: 5rem; }  /* was 3.5rem */

/* Sections */
.section { margin-bottom: 5rem; }  /* was 4rem */

/* Section label */
.section-label { margin-bottom: 1.75rem; }  /* was 1.5rem */

/* Work cards */
.work-card { padding: 1.5rem 0; }  /* was 1.25rem 0 */

/* Work title */
.work-title { margin: 0 0 0.5rem; }  /* was 0 0 0.4rem */

/* Work description */
.work-desc { margin: 0 0 0.75rem; }  /* was 0 0 0.6rem */

/* Work links */
.work-links { gap: 0.75rem; }  /* was 0.5rem */

/* Education grid */
.edu-item {
  grid-template-columns: 100px 1fr;  /* was 95px */
  gap: 1.5rem;  /* was 1.25rem */
  padding: 1rem 0;  /* was 0.65rem 0 */
}
```

**Step 2: Run build**

Run: `npm run build`
Expected: Clean build

---

### Task 4: Visual verification

**Step 1:** Start dev server, open mockup-a.html and localhost side by side
**Step 2:** Compare homepage layout, typography, spacing section by section
**Step 3:** Check publications, open-source, misc pages still look correct
**Step 4:** Toggle dark mode on all pages
**Step 5:** Check mobile viewport (768px and below)
