// Visual regression suite for snapdom demos.
// Drop this file into snapdom/__tests__/. Runs as part of `npm test`.
//
// First run: every demo recorded as a baseline (status "new", test passes).
// Subsequent runs: any pixel mismatch above threshold fails the test.
// Update baselines with `UPDATE_VISUAL=1 npx vitest run __tests__/visual.demos.test.js`
// or by appending `?update` to the vitest browser URL.
//
// The static review report is written to __snapshots__/visual/report.html.

import { defineDemoSuite } from '@zumer/snapdiff/vitest/suite'

defineDemoSuite({
  // import.meta.glob is a Vite primitive — evaluated at module load, returns
  // a map of URL → loader. We only use the keys.
  demos: import.meta.glob('/demos/d*.html'),

  baseDir: '__snapshots__/visual',
  threshold: 0.1,
  failureRatio: 0.001, // tolerate 0.1% drift from font-hinting jitter
  // Try #target first (snapdom convention), fall back to body for demos that
  // don't have it. Override per-demo below for finer-grained captures.
  defaultTarget: ['#target', 'body'],
  defaultWait: 200,
  snapdomUrl: '/dist/snapdom.mjs',
  // dpr: 1 / scale: 1 → baselines portable across headed/headless and retina/non-retina.
  // Use the same explicit DPR locally and in CI when recording sharper baselines.
  // invalidate: true captures CSSOM edits even with snapDOM v3's automatic memoization.
  snapdomOptions: { dpr: 1, scale: 1, embedFonts: true, invalidate: true },
  viewport: { width: 1280, height: 1024 },

  // Per-demo overrides for demos that don't use #target or need a delay.
  // Fill in based on what each demo expects.
  demoOptions: {
    // Examples — adjust to your demos:
    // 'd1':  { target: 'body' },
    // 'd2':  { target: '#target', wait: 1500, snapdomOptions: { embedFonts: true } },
    // 'd31': { target: '.demo-host', setup: async (win) => { win.startAnimation?.(); await new Promise(r => setTimeout(r, 500)) } },
    // 'd50-debug': { skip: true },
  },
})
