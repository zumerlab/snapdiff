import { build } from 'esbuild'
import { readFileSync, rmSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('./package.json', 'utf8'))
const version = pkg.version || '0.0.0'

const banner = {
  js: `/*
* snapDiff
* v${version}
* Author: Juan Martin Muda
* License: MIT
*/`,
}

const common = {
  bundle: true,
  sourcemap: false,
  logLevel: 'info',
  banner,
}

/** Legacy IIFE for direct <script> include. */
async function buildLegacy() {
  await build({
    ...common,
    entryPoints: ['src/index.js'],
    outfile: 'dist/snapdiff.js',
    globalName: 'snapDiff',
    platform: 'neutral',
    minify: true,
    target: ['es2020'],
  })
}

/** ESM bundle for bundlers / CDNs / modern browsers. */
async function buildESM() {
  await build({
    ...common,
    entryPoints: ['src/index.js'],
    outfile: 'dist/snapdiff.mjs',
    format: 'esm',
    minify: true,
    splitting: false,
  })
}

/** Subpath ESM bundles (subset of public exports that are stable & pure). */
async function buildSubpaths() {
  await build({
    ...common,
    entryPoints: {
      'diff': 'src/diff.js',
      'static-report': 'src/static-report.js',
    },
    outdir: 'dist',
    outExtension: { '.js': '.mjs' },
    format: 'esm',
    minify: true,
    splitting: false,
  })
}

async function main() {
  try { rmSync('dist', { recursive: true, force: true }) } catch { /* ok */ }
  await Promise.all([
    buildLegacy(),
    buildESM(),
    buildSubpaths(),
  ])
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})
