import { defineConfig } from 'vite';

export default defineConfig({
  base: '/orbital-mission-control/',
  build: { outDir: 'docs', emptyOutDir: true },
});
