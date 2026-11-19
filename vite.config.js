import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base allows seamless hosting on both GitHub Pages (/phraser-bond/) and custom domains (https://phraser.bond)
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    // Preserve any files populated by scripts/sync-repos.mjs in dist/
    emptyOutDir: false,
  },
  server: {
    port: 3000,
    open: false,
  },
});
