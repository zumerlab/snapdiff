// Zero-config in-page runner for "drop the script" workflows.
// Discovers [data-snap] elements, captures each via snapdom, diffs against
// IndexedDB baselines, and mounts a corner badge that opens the full reporter
// on demand.
//
// Classic script tag (auto-triggers on load):
//   <script src="snapdiff-auto.js" data-auto data-namespace="my-app"></script>
//   <div data-snap="hero">...</div>
//
// Programmatic from a module:
//   import { bootstrap } from '@zumer/snapdiff/auto'
//   await bootstrap({ namespace: 'my-app' })

import { createRunner } from './runner.js'
import { Reporter } from './reporter.js'

const FAB_STYLE = `
.sd-fab {
  position: fixed; right: 16px; bottom: 16px; z-index: 2147483500;
  background: #161a21; color: #e6e8eb;
  font: 12px/1 ui-sans-serif, system-ui, -apple-system, sans-serif;
  padding: 10px 14px; border-radius: 999px;
  border: 1px solid #2c3445;
  box-shadow: 0 4px 14px rgba(0,0,0,.35);
  cursor: pointer; user-select: none;
  display: flex; align-items: center; gap: 8px;
}
.sd-fab:hover { background: #1c2230; }
.sd-fab .sd-dot { width: 8px; height: 8px; border-radius: 50%; background: #6cd4a3; }
.sd-fab.sd-has-fail .sd-dot { background: #ff6e7a; }
.sd-fab.sd-has-new .sd-dot { background: #f0c419; }
.sd-fab.sd-running .sd-dot { background: #2f6df6; animation: sd-pulse 1s ease-in-out infinite; }
@keyframes sd-pulse { 50% { opacity: .3; } }
`

let fabStyleInjected = false
function injectFabStyle() {
  if (fabStyleInjected) return
  const tag = document.createElement('style')
  tag.textContent = FAB_STYLE
  document.head.appendChild(tag)
  fabStyleInjected = true
}

function readBool(s, dflt) {
  if (s == null || s === '') return dflt
  const v = String(s).toLowerCase()
  return !(v === 'false' || v === '0' || v === 'no')
}

function readConfigFromScript(scriptEl) {
  const d = scriptEl.dataset
  const out = {}
  if (d.namespace) out.namespace = d.namespace
  if (d.selector) out.selector = d.selector
  if (d.threshold != null) out.threshold = parseFloat(d.threshold)
  if (d.failureRatio != null) out.failureRatio = parseFloat(d.failureRatio)
  if ('includeAa' in d) out.includeAA = readBool(d.includeAa, true)
  if (d.snapdomUrl) out.snapdomUrl = d.snapdomUrl
  if ('autoRun' in d) out.autoRun = readBool(d.autoRun, true)
  if ('autoShow' in d) out.autoShow = readBool(d.autoShow, true)
  return out
}

async function loadSnapdom(url) {
  // Dynamic, runtime URL — esbuild leaves this alone (no static analysis).
  const mod = await import(/* @vite-ignore */ url)
  return mod.snapdom ?? mod.default?.snapdom ?? mod.default
}

function discoverTests(runner, selector) {
  const seen = new Set()
  const elements = document.querySelectorAll(selector)
  let count = 0
  for (const el of elements) {
    let name = el.getAttribute('data-snap') || el.id
    if (!name) name = `${el.tagName.toLowerCase()}-${count}`
    if (seen.has(name)) {
      console.warn(`[snapDiff] duplicate test name "${name}" — skipping element`, el)
      continue
    }
    seen.add(name)
    const captured = el
    runner.test(name, () => captured)
    count++
  }
  return count
}

/**
 * Programmatic bootstrap. All options optional; reasonable defaults applied.
 * @param {object} [opts]
 * @param {string} [opts.namespace='snapdiff-auto']
 * @param {string} [opts.selector='[data-snap]']
 * @param {number} [opts.threshold=0.1]
 * @param {number} [opts.failureRatio=0]
 * @param {boolean} [opts.includeAA=false]
 * @param {string} [opts.snapdomUrl='https://esm.sh/@zumer/snapdom@2']
 * @param {object} [opts.snapdomOptions] passed to snapdom for every capture
 * @param {boolean} [opts.autoRun=true]   run on bootstrap
 * @param {boolean} [opts.autoShow=false] mount the reporter even when no failures
 * @param {Function} [opts.snapdom]       skip dynamic import if you already have snapdom
 * @returns {Promise<{runner, fab, reporter: () => Reporter|null, refresh: () => Promise<void>}>}
 */
export async function bootstrap(opts = {}) {
  const {
    namespace = 'snapdiff-auto',
    selector = '[data-snap]',
    threshold = 0.1,
    failureRatio = 0,
    includeAA = false,
    snapdomUrl = 'https://esm.sh/@zumer/snapdom@2',
    snapdomOptions = {},
    autoRun = true,
    autoShow = false,
  } = opts

  let snapdom = opts.snapdom
  if (!snapdom) {
    try {
      snapdom = await loadSnapdom(snapdomUrl)
    } catch (err) {
      console.error(`[snapDiff] failed to load snapdom from ${snapdomUrl}:`, err)
      return null
    }
  }
  if (typeof snapdom !== 'function') {
    console.error('[snapDiff] snapdom is not a function — check the module exports at', snapdomUrl)
    return null
  }

  const runner = createRunner({
    snapdom, namespace, threshold, failureRatio, includeAA, snapdomOptions,
  })
  const count = discoverTests(runner, selector)
  if (count === 0) {
    console.warn(`[snapDiff] no elements matched selector "${selector}" — nothing to test`)
    return { runner, fab: null, reporter: () => null, refresh: async () => {} }
  }

  injectFabStyle()
  const fab = document.createElement('div')
  fab.className = 'sd-fab'
  const dot = document.createElement('span'); dot.className = 'sd-dot'
  const label = document.createElement('span'); label.textContent = 'snapDiff'
  fab.append(dot, label)
  document.body.appendChild(fab)

  const updateFab = (results) => {
    fab.classList.remove('sd-running', 'sd-has-fail', 'sd-has-new')
    if (!results) { label.textContent = 'snapDiff'; return }
    const sum = runner.summary(results)
    if (sum.fail || sum.error) {
      fab.classList.add('sd-has-fail')
      label.textContent = `snapDiff: ${sum.fail + sum.error} fail`
    } else if (sum.new) {
      fab.classList.add('sd-has-new')
      label.textContent = `snapDiff: ${sum.new} recorded`
    } else {
      label.textContent = `snapDiff: ${sum.pass}/${results.length} ✓`
    }
  }

  let reporter = null
  let lastResults = null

  const showReporter = async () => {
    if (reporter?.root) return
    if (!reporter) {
      reporter = new Reporter(runner, {
        // Sync the FAB with whatever the user did inside the reporter
        // (re-runs, approves, deletes, imports) before tearing it down.
        onClose: () => {
          lastResults = reporter.results
          updateFab(lastResults)
          reporter.unmount()
        },
      })
    }
    reporter.mount()
    if (lastResults) reporter.setResults(lastResults)
    else { lastResults = await reporter.runAndShow(); updateFab(lastResults) }
  }
  fab.onclick = showReporter

  if (autoRun) {
    fab.classList.add('sd-running')
    label.textContent = 'snapDiff: running…'
    try {
      const results = await runner.run()
      // Auto-record baselines on first run. Without this, every reload would
      // show "all new" forever — there's no UI gesture to approve initial
      // baselines in zero-JS mode (the dev didn't set up a button).
      for (const r of results) {
        if (r.status === 'new') await runner.approve(r.name, r.actual)
      }
      lastResults = results
      updateFab(results)
      const hasFailures = results.some(r => r.status === 'fail' || r.status === 'error')
      if (hasFailures || autoShow) await showReporter()
    } catch (err) {
      console.error('[snapDiff] auto-run failed:', err)
      fab.classList.remove('sd-running')
      label.textContent = 'snapDiff: error'
    }
  }

  return { runner, fab, reporter: () => reporter, refresh: showReporter }
}

// Locate the script tag that loaded this module. document.currentScript only
// works in classic synchronous script execution — falls back to a query for
// async/defer cases. Returns null in ESM-module contexts (currentScript is
// always null there) — programmatic users call bootstrap() themselves.
function findOwnScript() {
  if (typeof document === 'undefined') return null
  if (document.currentScript?.dataset?.auto != null) return document.currentScript
  const candidates = document.querySelectorAll('script[data-auto]')
  return candidates[candidates.length - 1] ?? null
}

function tryAutoTrigger() {
  if (typeof window === 'undefined') return
  // Guard against double-init when both the IIFE bundle and the ESM source
  // get evaluated on the same page (rare but possible during dev).
  if (window.__snapdiffAutoTriggered) return
  const script = findOwnScript()
  if (!script) return
  window.__snapdiffAutoTriggered = true
  const opts = readConfigFromScript(script)
  const start = () => bootstrap(opts)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true })
  } else {
    start()
  }
}

tryAutoTrigger()
