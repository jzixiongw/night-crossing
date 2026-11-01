import { defineConfig } from 'vite';

// The game paints 1600x900 of procedural Canvas2D every frame; there is no asset
// pipeline to speak of. Fonts live in public/ so fonts.css can keep its relative
// url() references intact.
export default defineConfig({
  server: { port: 8000, open: true },
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    sourcemap: true,
  },
});
