// Node-side custom commands for vitest browser, used by FileBaselineStore.
// Register these in vitest.config.js:
//
//   import { snapDiffCommands } from '@zumer/snapdiff/vitest'
//   export default defineConfig({
//     test: { browser: { commands: snapDiffCommands({ baseDir: '__snapshots__/visual' }) } }
//   })

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { generateStaticReport, mergeResults } from '../src/static-report.js'

// Run-scoped state, keyed by resolved baseline directory. A demo suite can be
// split across several test files so vitest runs its demos in parallel, and
// each file then calls in separately — but clearing the artifacts and writing
// the report belong to the RUN, not to whichever file got there first. This
// lives at module scope because a config may build a fresh command set per call.
const clearedArtifacts = new Map()
const reportResults = new Map()

function rootOf(ctx) {
  return ctx?.project?.config?.root
    ?? ctx?.testPath
    ?? process.cwd()
}

function resolveBase(ctx, baseDir) {
  if (path.isAbsolute(baseDir)) return baseDir
  const root = rootOf(ctx)
  // ctx.testPath is a file; project.config.root is a dir. Choose dir.
  const rootDir = root && root.endsWith('.js') ? path.dirname(root) : root
  return path.resolve(rootDir, baseDir)
}

function safeName(name) {
  if (!/^[\w.\-/]+$/.test(name)) throw new Error(`Invalid baseline name: ${name}`)
  return name
}

export function snapDiffCommands({ baseDir = '__snapshots__/visual' } = {}) {
  return {
    svReadBaseline: async (ctx, name) => {
      const dir = resolveBase(ctx, baseDir)
      const p = path.join(dir, `${safeName(name)}.png`)
      try {
        const buf = await fs.readFile(p)
        return buf.toString('base64')
      } catch (e) {
        if (e.code === 'ENOENT') return null
        throw e
      }
    },

    svWriteBaseline: async (ctx, name, base64) => {
      const dir = resolveBase(ctx, baseDir)
      const p = path.join(dir, `${safeName(name)}.png`)
      await fs.mkdir(path.dirname(p), { recursive: true })
      await fs.writeFile(p, Buffer.from(base64, 'base64'))
      return path.relative(rootOf(ctx), p)
    },

    svDeleteBaseline: async (ctx, name) => {
      const dir = resolveBase(ctx, baseDir)
      await fs.rm(path.join(dir, `${safeName(name)}.png`), { force: true })
    },

    svListBaselines: async (ctx) => {
      const dir = resolveBase(ctx, baseDir)
      try {
        const files = await fs.readdir(dir)
        return files.filter(f => f.endsWith('.png')).map(f => f.replace(/\.png$/, ''))
      } catch (e) {
        if (e.code === 'ENOENT') return []
        throw e
      }
    },

    svWriteArtifact: async (ctx, name, kind, base64) => {
      const dir = resolveBase(ctx, baseDir)
      const p = path.join(dir, '_artifacts', `${safeName(name)}.${safeName(kind)}.png`)
      await fs.mkdir(path.dirname(p), { recursive: true })
      await fs.writeFile(p, Buffer.from(base64, 'base64'))
      return path.relative(rootOf(ctx), p)
    },

    // `once` clears at most one time per run: a suite spread over several test
    // files clears in every beforeAll, and the second file would otherwise
    // delete the artifacts the first one just wrote. An explicit
    // store.clearArtifacts() has no `once` and always clears.
    svClearArtifacts: async (ctx, options) => {
      const dir = resolveBase(ctx, baseDir)
      const clear = () => fs.rm(path.join(dir, '_artifacts'), { recursive: true, force: true })
        .catch(() => { /* ok */ })
      if (!options?.once) {
        reportResults.delete(dir)
        return clear()
      }
      let pending = clearedArtifacts.get(dir)
      if (!pending) {
        pending = clear()
        clearedArtifacts.set(dir, pending)
      }
      await pending
    },

    // A string is a report rendered by a caller that already owns the whole run.
    // A payload is one file's slice of it, so accumulate before rendering: node
    // is the only side that sees every file.
    svWriteReport: async (ctx, report) => {
      const dir = resolveBase(ctx, baseDir)
      const p = path.join(dir, 'report.html')
      await fs.mkdir(path.dirname(p), { recursive: true })
      let html = report
      if (typeof report !== 'string') {
        const results = mergeResults(reportResults.get(dir), report?.results)
        reportResults.set(dir, results)
        html = generateStaticReport({ ...report, results })
      }
      await fs.writeFile(p, html)
      return path.relative(rootOf(ctx), p)
    },
  }
}
