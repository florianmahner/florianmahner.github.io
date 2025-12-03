/**
 * Astro Content Collections Configuration
 * Defines schemas for content-based collections (markdown files)
 *
 * Note: JSON data files (publications.json, repositories.json, etc.)
 * are imported directly in pages, not through content collections.
 * This avoids unnecessary complexity while still providing type safety
 * through TypeScript interfaces in the respective parsers.
 */

import { defineCollection, z } from 'astro:content';

// Blog posts (markdown files in src/content/posts/)
const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date(),
    updated: z.date().optional(),
    draft: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    image: z.string().optional(),
  }),
});

// Custom pages (markdown files in src/content/pages/)
const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    showInNav: z.boolean().optional(),
    navOrder: z.number().optional(),
    navLabel: z.string().optional(),
  }),
});

export const collections = {
  posts,
  pages,
};
