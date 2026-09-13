import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
//
// Image optimization: Vite handles image assets out of the box.
// - Images imported in JS/JSX are processed (resized, compressed) at build time
// - Static images in the /public/ folder are served as-is (no processing)
// - Supported formats: AVIF, WebP, PNG, JPEG, GIF, SVG
// - Configuration tweak inline: inline assets under 4 KB, emit to assets/ otherwise

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    rollupOptions: {
      output: {
        // Default Vite behavior: generate content-addressed filenames
        // e.g. assets/index-abc123.js — ensures proper browser caching on deployments
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
})
