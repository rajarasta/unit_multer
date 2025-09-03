import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@al/theme': path.resolve(__dirname, 'src/theme/compat.js'),
      '@al/theme-css': path.resolve(__dirname, 'src/theme/theme.css')
    }
  },
  plugins: [react()],
  optimizeDeps: { include: ['pdfjs-dist'] },
  server: {
    proxy: {
      "/api": "http://localhost:3001", // prosljeđuje API pozive backendu
    },
  },
})




