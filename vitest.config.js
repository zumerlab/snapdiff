import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.js'],
    exclude: ['node_modules', 'dist', 'examples'],
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
      screenshotFailures: false,
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
    },
  },
})
