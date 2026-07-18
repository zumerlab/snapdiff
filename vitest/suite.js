// vitest browser suite that loops a set of demo HTML files, captures each via
// snapdom in an iframe, diffs against a filesystem baseline, and writes a
// static report.html at the end.

import { test, beforeAll, afterAll } from 'vitest'
import { commands } from '@vitest/browser/context'
import { diffCanvas } from '../src/diff.js'
import { FileBaselineStore, } from '../src/file-store.js'
import { canvasToBlob, blobToCanvas } from '../src/store.js'
import { generateStaticReport } from '../src/static-report.js'
import { captureFromIframe } from './iframe-capture.js'

/**
 * @param {object} options
 * @param {Record<string, () => any> | string[]} options.demos result of import.meta.glob('/demos/*.html') or array of URLs
 * @param {string} [options.baseDir='__snapshots__/visual'] passed only to the report (must match the path used in commands config)
 * @param {number} [options.threshold=0.1]
 * @param {number} [options.failureRatio=0]
 * @param {string} [options.defaultTarget='#target']
 * @param {number} [options.defaultWait=0]
 * @param {string} [options.snapdomUrl='/dist/snapdom.mjs']
 * @param {object} [options.snapdomOptions]
 * @param {Record<string, object>} [options.demoOptions] per-demo overrides keyed by base name
 * @param {(name: string) => boolean} [options.skip] skip predicate
 * @param {boolean} [options.updateBaselines] when true, treat any mismatch as a baseline update (no failure)
 * @param {string} [options.title='snapDiff']
 * @param {{width:number,height:number}} [options.viewport]
 */
// The report is written inside the (possibly runtime-routed) baseDir, next to
// _artifacts/ and the baselines — reference both relative to the report itself
// instead of the static baseDir option, which commands may override per project.
const reportRel = (p) => String(p).replace(/\\/g, '/').split('/').slice(-2).join('/')

export function defineDemoSuite(options) {
  const {
    demos,
    baseDir = '__snapshots__/visual',
    threshold = 0.1,
    failureRatio = 0,
    defaultTarget = ['#target', 'body'],
    defaultWait = 0,
    snapdomUrl = '/dist/snapdom.mjs',
    // Pin dpr/scale by default so baselines are portable across machines and
    // headed/headless runs. Override per-demo or globally if you want sharper
    // captures, but use the SAME value when recording and verifying.
    snapdomOptions = { dpr: 1, scale: 1, embedFonts: true },
    demoOptions = {},
    skip,
    updateBaselines = readUpdateFlag(),
    title = 'snapDiff',
    viewport = { width: 1280, height: 1024 },
  } = options

  // Normalize target into an array with a body fallback unless the user
  // explicitly opted out by passing strictTarget: true (per-demo or globally).
  function withFallback(target, strict) {
    const arr = Array.isArray(target) ? target.slice() : [target]
    if (!strict && !arr.includes('body')) arr.push('body')
    return arr
  }

  const urls = Array.isArray(demos) ? demos : Object.keys(demos)
  const store = new FileBaselineStore()
  const results = []
  let iframe

  beforeAll(async () => {
    await commands.svClearArtifacts()
    iframe = document.createElement('iframe')
    // In-viewport but invisible: WebKit suspends timers and rAF inside iframes
    // positioned outside the viewport, which hangs any capture that awaits them.
    iframe.style.cssText = `position:fixed;left:0;top:0;opacity:0.01;pointer-events:none;border:0;width:${viewport.width}px;height:${viewport.height}px`
    document.body.appendChild(iframe)
  })

  afterAll(async () => {
    iframe?.remove()
    const html = generateStaticReport({ title, results, baseDir })
    const reportPath = await commands.svWriteReport(html)

    console.log(`\n[snapDiff] report → ${reportPath}\n`)
  })

  for (const url of urls) {
    const name = baseName(url)
    const perDemo = demoOptions[name] ?? {}
    const captureOpts = {
      target: withFallback(perDemo.target ?? defaultTarget, perDemo.strictTarget ?? options.strictTarget),
      wait: perDemo.wait ?? defaultWait,
      snapdomUrl: perDemo.snapdomUrl ?? snapdomUrl,
      snapdomOptions: { ...snapdomOptions, ...(perDemo.snapdomOptions || {}) },
      setup: perDemo.setup,
    }
    const localThreshold = perDemo.threshold ?? threshold
    const localRatio = perDemo.failureRatio ?? failureRatio

    test(name, async (ctx) => {
      if (skip?.(name) || perDemo.skip) {
        ctx.skip?.()
        return
      }

      let actual
      try {
        actual = await captureFromIframe(iframe, url, captureOpts)
      } catch (err) {
        results.push({ name, status: 'error', error: err.message || String(err) })
        throw err
      }

      const baselineRec = await store.get(name)
      const actualBlob = await canvasToBlob(actual)
      const actualPath = await store.writeArtifact(name, 'actual', actualBlob)

      if (!baselineRec) {
        await store.put(name, actualBlob)
        results.push({
          name, status: 'new',
          paths: { baseline: name + '.png', actual: reportRel(actualPath) },
        })
        return
      }

      const baseline = await blobToCanvas(baselineRec.blob)
      const diffResult = diffCanvas(baseline, actual, { threshold: localThreshold })
      const failed = !diffResult.dimsMatch || diffResult.ratio > localRatio

      if (!failed) {
        results.push({
          name, status: 'pass',
          ratio: diffResult.ratio, diff: diffResult.diff,
          dimsMatch: diffResult.dimsMatch,
          paths: { baseline: name + '.png', actual: reportRel(actualPath) },
        })
        return
      }

      const diffPath = await store.writeArtifact(name, 'diff', await canvasToBlob(diffResult.canvas))

      if (updateBaselines) {
        await store.put(name, actualBlob)
        results.push({
          name, status: 'new',
          ratio: diffResult.ratio, diff: diffResult.diff,
          dimsMatch: diffResult.dimsMatch,
          paths: { baseline: name + '.png', actual: reportRel(actualPath), diff: reportRel(diffPath) },
        })
        return
      }

      results.push({
        name, status: 'fail',
        ratio: diffResult.ratio, diff: diffResult.diff,
        dimsMatch: diffResult.dimsMatch,
        paths: { baseline: name + '.png', actual: reportRel(actualPath), diff: reportRel(diffPath) },
      })

      if (!diffResult.dimsMatch) {
        throw new Error(
          `Dimension mismatch in ${name}: baseline ${baseline.width}x${baseline.height} ` +
          `vs actual ${actual.width}x${actual.height}.\n` +
          '  Likely cause: DPR / scale differs between when baseline was recorded and now ' +
          '(headed vs headless, retina vs non-retina, etc).\n' +
          '  Fix: pin snapdomOptions.dpr (already defaults to 1) and re-record with UPDATE_VISUAL=1.\n' +
          `  diff: ${diffPath}`
        )
      }
      const pct = (diffResult.ratio * 100).toFixed(2)
      throw new Error(`Visual regression in ${name}: ${pct}% mismatch (${diffResult.diff} px)\n  diff: ${diffPath}`)
    })
  }
}

function baseName(url) {
  const m = String(url).match(/([^/\\]+?)(?:\.html?)?$/i)
  return m ? m[1] : String(url)
}


function readUpdateFlag() {
  try {
    if (typeof process !== 'undefined' && process?.env?.UPDATE_VISUAL) {
      const v = process.env.UPDATE_VISUAL.toLowerCase()
      return v === '1' || v === 'true' || v === 'yes'
    }
  } catch { /* ignore */ }
  try {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location?.search || '')
      if (params.has('update')) return true
    }
  } catch { /* ignore */ }
  return false
}
