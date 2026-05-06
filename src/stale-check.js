// Node-only utility: scans a baseline directory and a source directory,
// reports which baselines are older than their matching source files.
// Pure filesystem — no server, no browser. Match is by base name:
// `<source-dir>/<name>.html`  ↔  `<baseline-dir>/<name>.png`.

import { promises as fs } from 'node:fs'
import path from 'node:path'

/**
 * @typedef {Object} StaleEntry
 * @property {string} name
 * @property {number} sourceMtime    ms since epoch
 * @property {number} baselineMtime  ms since epoch
 * @property {number} ageMs          how much newer the source is than the baseline
 */

/**
 * Compare baseline mtimes against source mtimes by base name.
 *
 * @param {object} [opts]
 * @param {string} [opts.baselineDir='__snapshots__/visual']
 * @param {string} [opts.sourceDir='demo/components']
 * @param {string} [opts.sourceExt='.html']
 * @returns {Promise<{ stale: StaleEntry[], orphans: string[], unrecorded: string[] }>}
 *   stale:      sources newer than their matching baseline (the actionable case)
 *   orphans:    baselines with no matching source (renamed / removed source files)
 *   unrecorded: sources with no matching baseline (never been tested yet)
 */
export async function checkStaleness({
  baselineDir = '__snapshots__/visual',
  sourceDir = 'demo/components',
  sourceExt = '.html',
} = {}) {
  const baselines = await readMtimes(baselineDir, '.png')
  const sources = await readMtimes(sourceDir, sourceExt)

  const stale = []
  const unrecorded = []
  for (const [name, srcMtime] of Object.entries(sources)) {
    const baseMtime = baselines[name]
    if (baseMtime == null) {
      unrecorded.push(name)
      continue
    }
    if (srcMtime > baseMtime) {
      stale.push({
        name,
        sourceMtime: srcMtime,
        baselineMtime: baseMtime,
        ageMs: srcMtime - baseMtime,
      })
    }
  }

  const orphans = Object.keys(baselines).filter(n => sources[n] == null)

  // Most-stale-first so the CLI prints the worst offenders at the top.
  stale.sort((a, b) => b.ageMs - a.ageMs)
  unrecorded.sort()
  orphans.sort()

  return { stale, orphans, unrecorded }
}

async function readMtimes(dir, ext) {
  const out = {}
  let entries
  try {
    entries = await fs.readdir(dir)
  } catch (e) {
    if (e.code === 'ENOENT') return out
    throw e
  }
  const lowerExt = ext.toLowerCase()
  for (const f of entries) {
    if (!f.toLowerCase().endsWith(lowerExt)) continue
    const full = path.join(dir, f)
    let stat
    try { stat = await fs.stat(full) } catch { continue }
    if (!stat.isFile()) continue
    out[f.slice(0, -ext.length)] = stat.mtimeMs
  }
  return out
}
