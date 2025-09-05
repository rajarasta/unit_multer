import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.js'],
  },
  resolve: {
    alias: {
      '@al/theme': path.resolve(__dirname, 'src/theme/compat.js'),
      '@al/theme-css': path.resolve(__dirname, 'src/theme/theme.css'),
      'pdfjs-dist': path.resolve(__dirname, 'tests/__mocks__/pdfjs-dist.js'),
      '../../../services/BackendService': path.resolve(__dirname, 'tests/__mocks__/services/BackendService.js')
    }
  }
})