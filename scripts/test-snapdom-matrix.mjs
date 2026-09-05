// Real v2/v3 captures on each engine, sequentially to avoid browser contention.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const v3 = process.env.SNAPDOM_TEST_PATH
if (!v3) throw new Error('Set SNAPDOM_TEST_PATH to a compiled SnapDOM v3 dist/snapdom.mjs')
const versions = [
  ['2', process.env.SNAPDOM_V2_TEST_PATH || fileURLToPath(import.meta.resolve('@zumer/snapdom'))],
  ['3', v3],
]
for (const [, path] of versions) {
  if (!existsSync(resolve(root, path))) throw new Error(`SnapDOM build not found: ${path}`)
}
const browsers = process.env.BROWSER ? [process.env.BROWSER] : ['chromium', 'firefox', 'webkit']
for (const [major, path] of versions) {
  for (const browser of browsers) {
    console.log(`\nSnapDOM ${major} / ${browser}: ${path}`)
    const result = spawnSync(process.execPath, [
      resolve(root, 'node_modules/vitest/vitest.mjs'), 'run',
      '__tests__/snapdom.integration.test.js', '--browser.headless', '--reporter=verbose',
    ], {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, BROWSER: browser, SNAPDOM_TEST_PATH: resolve(root, path), SNAPDOM_EXPECTED_MAJOR: major },
    })
    if (result.error) throw result.error
    if (result.status !== 0) process.exit(result.status || 1)
  }
}
