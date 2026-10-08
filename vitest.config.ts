import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify('0.0.0-test'),
    // Unit tests use local seeds / offline auth — never hit the live API.
    'import.meta.env.VITE_USE_PLATFORM_API': JSON.stringify('0'),
    'import.meta.env.VITE_ALLOW_OFFLINE_AUTH': JSON.stringify('1'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['src/test/setup.ts'],
  },
})
