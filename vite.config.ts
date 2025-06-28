import UnpluginTypia from '@ryoppippi/unplugin-typia/vite'
import wasm from 'vite-plugin-wasm'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  base: '/coast/',
  build: {
    target: 'esnext',
  },
  plugins: [wasm(), UnpluginTypia()],
  publicDir: 'search-worker/pkg',
  test: {
    browser: {
      enabled: true,
      headless: true,
      // at least one instance is required
      instances: [{ browser: 'chromium' }],
      provider: 'playwright', // or 'webdriverio'
    },
    globals: true,
    sequence: {
      concurrent: true,
    },
  },
})
