import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    setupFiles: ['./setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['src/**/*.{test,spec}.{ts,tsx}'],
          exclude: ['src/**/*.browser.test.{ts,tsx}'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          browser: {
            enabled: true,
            name: 'chromium',
            provider: 'playwright',
            headless: true,
          },
          include: ['src/**/*.browser.test.{ts,tsx}'],
          setupFiles: ['./setupBrowserTests.ts'],
        },
      },
    ],
  },
})
