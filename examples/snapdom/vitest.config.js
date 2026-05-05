// Drop-in replacement for snapdom/vitest.config.js.
// Adds snapDiff file-system commands to the existing browser config.

import { defineConfig } from 'vitest/config'
import { snapDiffCommands } from '@zumer/snapdiff/vitest'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
      // We don't need vitest's full-page failure screenshots — snapDiff already
      // writes baseline/actual/diff PNGs to __snapshots__/visual/_artifacts/.
      screenshotFailures: false,
      commands: snapDiffCommands({ baseDir: '__snapshots__/visual' }),
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
    },
  },
})
