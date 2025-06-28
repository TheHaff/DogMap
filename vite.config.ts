import UnpluginTypia from '@ryoppippi/unplugin-typia/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/coast/',
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['@faker-js/faker'],
  },
  plugins: [tailwindcss(), react(), wasm(), UnpluginTypia()],
  publicDir: 'search-worker/pkg',
  test: {
    environment: 'node',
    globals: true,
    sequence: {
      concurrent: true,
    },
  },
})
