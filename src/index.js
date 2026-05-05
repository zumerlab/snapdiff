// Public entry point. snapDiff: client-side visual regression on top of snapdom.

export { diffPixels, diffCanvas } from './diff.js'
export { BaselineStore, canvasToBlob, blobToCanvas } from './store.js'
export { createRunner } from './runner.js'
export { Reporter } from './reporter.js'
export { generateStaticReport } from './static-report.js'

import { createRunner } from './runner.js'
import { Reporter } from './reporter.js'

/**
 * One-shot helper: build a runner, mount a reporter, run all tests.
 * @param {object} options
 * @param {Function} options.snapdom required snapdom function
 * @param {(sv: {test: Function}) => void} options.tests definition function
 * @param {string} [options.namespace]
 * @param {number} [options.threshold]
 * @param {number} [options.failureRatio]
 * @param {boolean} [options.includeAA]
 * @param {object}  [options.snapdomOptions]
 * @param {boolean} [options.autoRun=true]
 * @param {boolean} [options.report=true]
 */
export async function snapDiff(options) {
  const runner = createRunner(options)
  options.tests({ test: runner.test })
  const reporter = options.report !== false ? new Reporter(runner) : null
  if (reporter) reporter.mount()
  if (options.autoRun !== false) {
    if (reporter) await reporter.runAndShow()
    else return await runner.run()
  }
  return { runner, reporter }
}

snapDiff.createRunner = createRunner
snapDiff.Reporter = Reporter
