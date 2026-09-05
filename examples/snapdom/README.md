# Wiring snapDiff into snapdom

This folder holds the two files you copy into `snapdom/`. Both target the existing layout (vitest browser + Playwright + chromium).

## 1. Install snapDiff as a dev dep

From inside `snapdom/`:

```sh
npm i -D file:../../snapDiff
```

(Or publish snapDiff and `npm i -D @zumer/snapdiff`.)

## 2. Replace `snapdom/vitest.config.js`

Copy `vitest.config.js` from this folder. The only change vs your current config is the `commands` line.

> Note: the config imports from `@zumer/snapdiff/vitest` (Node-only entry, just commands). The spec file separately imports from `@zumer/snapdiff/vitest/suite` (browser-only). Keeping these split avoids Node trying to resolve browser-side deps like `vitest` from inside `snapDiff/`.

## 3. Drop in the spec

Copy `__tests__/visual.demos.test.js` into `snapdom/__tests__/`.

The spec loads `/dist/snapdom.mjs`, so compile the snapDOM checkout before running it. This also lets you test an unpublished v3 build without a CDN release. snapDiff retains `dpr: 1`, `scale: 1`, and `embedFonts: true`; `invalidate: true` forces a fresh capture even after CSSOM edits that v3 memoization cannot observe. Per-demo overrides keep the remaining defaults.

When upgrading an existing suite to v3, run against its current baselines and review `report.html` before setting `UPDATE_VISUAL=1`. Rendering can change across major versions. See the [v3 migration notes](../../README.md#preparing-for-snapdom-v3) for custom capture options.

## 4. First run: record baselines

```sh
npx vitest run __tests__/visual.demos.test.js
```

Every demo is captured into `__snapshots__/visual/<name>.png` and the test passes (status: new). Inspect the report:

```sh
open __snapshots__/visual/report.html
```

If the captured baselines look right, commit them:

```sh
git add __snapshots__/visual
git commit -m "Add visual baselines for demos"
```

## 5. Subsequent runs

Run alongside the unit suite — `npm test` already covers it because the spec lives in `__tests__/`. A regression fails the test with a clear message:

```
Visual regression in d12: 1.34% mismatch (8821 px)
  diff: __snapshots__/visual/_artifacts/d12.diff.png
```

Open `__snapshots__/visual/report.html` to review side-by-side / slider / diff.

## 6. Updating baselines

When a change is intentional:

```sh
UPDATE_VISUAL=1 npx vitest run __tests__/visual.demos.test.js
```

This rewrites the matching baseline PNGs. Commit them.

## 7. Per-demo overrides

About half of snapdom's demos don't use `#target`. Fill in the `demoOptions` map in the spec — the keys are the file basenames (without `.html`):

```js
demoOptions: {
  'd1': { target: 'body' },
  'd2': { target: '#target', wait: 2000, snapdomOptions: { embedFonts: true } },
  'd31': { target: '.demo-host' },
  'd50-debug': { skip: true },          // skip flaky/debug-only demos
  'labs5': {
    setup: async (win, doc) => {
      doc.querySelector('#play')?.click()
      await new Promise(r => setTimeout(r, 800))
    },
  },
}
```

Available per-demo options:

| field            | meaning                                                                |
| ---------------- | ---------------------------------------------------------------------- |
| `target`         | CSS selector for element to capture (default: `#target`)               |
| `wait`           | ms to wait after iframe load before capture                             |
| `snapdomOptions` | options merged into the global `snapdomOptions` for this demo           |
| `setup`          | `async (win, doc) => void` — runs after load, before capture            |
| `threshold`      | YIQ threshold override                                                  |
| `failureRatio`   | mismatch-ratio threshold for failure                                    |
| `skip`           | skip this demo                                                          |

## 8. .gitignore

The `_artifacts/` subfolder is regenerated each run — add to `.gitignore`:

```
__snapshots__/visual/_artifacts/
__snapshots__/visual/report.html
```

The PNG baselines (`__snapshots__/visual/*.png`) **should** be committed.

## 9. CI

CI just runs `npm test` as before. If a baseline is missing on CI (developer forgot to commit), the test passes as `new` — to make CI fail in that case, change `defineDemoSuite` to also require baselines:

```js
import { test } from 'vitest'
test.beforeAll(() => {
  if (process.env.CI === 'true') {
    // …or add a custom check here
  }
})
```

(snapDiff could grow a `requireBaselines: true` flag if needed; ask.)
