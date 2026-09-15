// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// Static-first: every page is prerendered. Only the map and timeline islands
// under src/islands/ ship JavaScript, and only when they scroll into view.
export default defineConfig({
  output: 'static',
  site: 'https://sabyasachi-swain.github.io/kalinga-atlas',
  base: '/kalinga-atlas',
  integrations: [react()],
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      // Keep the D3 + React bundle separate so content pages never pay for it.
      rollupOptions: {
        output: {
          manualChunks: {
            d3: ['d3-geo', 'd3-scale', 'd3-selection', 'd3-transition', 'd3-zoom', 'topojson-client'],
          },
        },
      },
    },
  },
});
