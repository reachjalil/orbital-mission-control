import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  base: '/orbital-mission-control/',
  css: { postcss: { plugins: [tailwindcss()] } },
  build: { outDir: 'docs', emptyOutDir: true },
});
