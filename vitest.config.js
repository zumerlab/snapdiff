import { defineConfig } from 'vitest/config'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Exercise the installed peer by default, or a pre-release ESM build without
// replacing node_modules or changing the lockfile.
const root = fileURLToPath(new URL('.', import.meta.url))
const snapdomModule = process.env.SNAPDOM_TEST_PATH
  ? resolve(root, process.env.SNAPDOM_TEST_PATH)
  : fileURLToPath(import.meta.resolve('@zumer/snapdom'))
const snapdomUrl = `/@fs/${snapdomModule.replace(/\\/g, '/').replace(/^\//, '')}`
const browser = process.env.BROWSER || 'chromium'
if (!['chromium', 'firefox', 'webkit'].includes(browser)) throw new Error(`Unknown BROWSER: ${browser}`)

export default defineConfig({
  resolve: {
    alias: { '#snapdom-under-test': snapdomModule },
  },
  define: {
    __SNAPDOM_TEST_URL__: JSON.stringify(snapdomUrl),
    __SNAPDOM_EXPECTED_MAJOR__: JSON.stringify(process.env.SNAPDOM_EXPECTED_MAJOR || ''),
  },
  server: {
    fs: { allow: [root, dirname(snapdomModule)] },
  },
  test: {
    include: ['__tests__/**/*.test.js'],
    exclude: ['node_modules', 'dist', 'examples'],
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser }],
      screenshotFailures: false,
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
    },
  },
})
