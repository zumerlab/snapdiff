// Node-side custom commands for vitest browser, used by FileBaselineStore.
// Register these in vitest.config.js:
//
//   import { snapDiffCommands } from '@zumer/snapdiff/vitest'
//   export default defineConfig({
//     test: { browser: { commands: snapDiffCommands({ baseDir: '__snapshots__/visual' }) } }
//   })

import { promises as fs } from 'node:fs'
import path from 'node:path'

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

    svClearArtifacts: async (ctx) => {
      const dir = resolveBase(ctx, baseDir)
      const artifacts = path.join(dir, '_artifacts')
      try { await fs.rm(artifacts, { recursive: true, force: true }) } catch { /* ok */ }
    },

    svWriteReport: async (ctx, html) => {
      const dir = resolveBase(ctx, baseDir)
      const p = path.join(dir, 'report.html')
      await fs.mkdir(path.dirname(p), { recursive: true })
      await fs.writeFile(p, html)
      return path.relative(rootOf(ctx), p)
    },
  }
}
