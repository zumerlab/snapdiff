// Test runner. Each test is a function that returns an HTMLElement to capture
// (or a function that does the capturing itself and returns a canvas).
// We orchestrate: snapdom capture → diff vs baseline → record result.

import { BaselineStore, canvasToBlob, blobToCanvas } from './store.js'
import { diffCanvas } from './diff.js'
import { captureCanvas } from './capture.js'

/**
 * @typedef {Object} TestResult
 * @property {string} name
 * @property {'pass'|'fail'|'new'|'error'} status
 * @property {number} [diff] mismatched pixel count
 * @property {number} [ratio] mismatch ratio (0..1)
 * @property {boolean} [dimsMatch]
 * @property {HTMLCanvasElement} [actual]
 * @property {HTMLCanvasElement} [baseline]
 * @property {HTMLCanvasElement} [diffCanvas]
 * @property {Error} [error]
 * @property {number} duration ms
 */

export function createRunner(options = {}) {
  const {
    snapdom,
    namespace = 'default',
    threshold = 0.1,
    failureRatio = 0,
    includeAA = false,
    snapdomOptions = {},
  } = options

  if (!snapdom) throw new Error('createRunner requires { snapdom }')

  const store = options.store ?? new BaselineStore(namespace)
  const tests = []

  function test(name, fn, perTestOptions = {}) {
    if (tests.find(t => t.name === name)) {
      throw new Error(`Duplicate test name: ${name}`)
    }
    tests.push({ name, fn, options: perTestOptions })
  }

  async function captureOne(test) {
    const out = await test.fn()
    if (out instanceof HTMLCanvasElement) return out
    if (out instanceof Element) {
      const merged = { ...snapdomOptions, ...(test.options.snapdom ?? {}) }
      return await captureCanvas(snapdom, out, merged)
    }
    throw new Error(`Test "${test.name}" must return an Element or HTMLCanvasElement`)
  }

  async function runOne(test) {
    const t0 = performance.now()
    try {
      const actual = await captureOne(test)
      const record = await store.get(test.name)
      if (!record) {
        return {
          name: test.name, status: 'new', actual,
          duration: performance.now() - t0,
        }
      }
      const baseline = await blobToCanvas(record.blob)
      const opts = {
        threshold: test.options.threshold ?? threshold,
        includeAA: test.options.includeAA ?? includeAA,
      }
      const result = diffCanvas(baseline, actual, opts)
      const limit = test.options.failureRatio ?? failureRatio
      const failed = !result.dimsMatch || result.ratio > limit
      return {
        name: test.name,
        status: failed ? 'fail' : 'pass',
        diff: result.diff,
        ratio: result.ratio,
        dimsMatch: result.dimsMatch,
        baseline,
        actual,
        diffCanvas: result.canvas,
        duration: performance.now() - t0,
      }
    } catch (err) {
      return {
        name: test.name, status: 'error', error: err,
        duration: performance.now() - t0,
      }
    }
  }

  async function run({ filter, onProgress } = {}) {
    const subset = filter ? tests.filter(t => filter(t.name)) : tests
    const results = []
    for (let i = 0; i < subset.length; i++) {
      const r = await runOne(subset[i])
      results.push(r)
      if (onProgress) onProgress({ index: i, total: subset.length, result: r })
    }
    return results
  }

  async function approve(name, canvas) {
    if (!canvas) {
      const result = await runOne(tests.find(t => t.name === name))
      canvas = result.actual
    }
    if (!canvas) throw new Error(`No actual canvas to approve for "${name}"`)
    const blob = await canvasToBlob(canvas)
    await store.put(name, blob, { width: canvas.width, height: canvas.height })
  }

  async function approveAll(results) {
    const promotable = results.filter(r => r.status === 'new' || r.status === 'fail')
    for (const r of promotable) await approve(r.name, r.actual)
    return promotable.length
  }

  function summary(results) {
    return {
      total: results.length,
      pass: results.filter(r => r.status === 'pass').length,
      fail: results.filter(r => r.status === 'fail').length,
      new: results.filter(r => r.status === 'new').length,
      error: results.filter(r => r.status === 'error').length,
    }
  }

  return { test, run, approve, approveAll, summary, store, tests }
}
