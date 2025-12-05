#!/usr/bin/env node
/**
 * Generate preview GIFs for all publications
 * Creates both light and dark variants for each paper ID
 */

import { generateFallbackGIF } from './generate-fallback.mjs';

// Publication IDs from publications.json
const paperIds = [
  'mahner2025dimensions',
  'roth2025ten',
  'kaniuth2025high',
  'stoinski2025quantifying',
  'mahner2023dimensions',
  'mahner2022learning',
  'janssen2020reliance',
  'tanisaro2017quasi'
];

async function main() {
  console.log(`Generating preview GIFs for ${paperIds.length} publications...\n`);

  for (const paperId of paperIds) {
    await generateFallbackGIF(paperId, 'light');
    await generateFallbackGIF(paperId, 'dark');
    console.log('');
  }

  console.log(`\nDone! Generated ${paperIds.length * 2} GIFs (light + dark for each paper)`);
}

main().catch(console.error);
