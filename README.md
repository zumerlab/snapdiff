<p align="center">
  <a href="https://github.com/zumerlab/snapdiff">
    <img src="https://raw.githubusercontent.com/zumerlab/snapdiff/main/docs/assets/snapdiff.jpg" width="80%">
  </a>
</p>

# SnapDIFF

**Visual regression testing that runs in the browser.** Powered by [snapDOM](https://github.com/zumerlab/snapdom).

snapDiff captures DOM elements with snapDOM, compares them to saved baselines, and shows what changed. The basic workflow does not need Puppeteer, Playwright, Jest, or `pixelmatch`: capture, diff, storage, and review all happen in the page.

> The CI workflow below uses Vitest browser mode with Playwright as the provider.

---

## Ways to use it

```
1. Pure browser
  └── <script src="snapdiff-auto.js" data-auto>
      • baselines in IndexedDB
      • useful when opening the page manually is enough

2. Staleness check
  └── snapdiff-stale --baseline DIR --source DIR
      • compares file mtimes
      • no rendering, good for cheap CI warnings

3. Vitest browser suite
  └── defineDemoSuite()
      • disk baselines
      • fails tests when visuals drift
```

You can stop at the first workflow if that is all your project needs. The goal is to make visual checks cheap enough that they actually get used, then leave a path to stricter CI when a project needs it.

---

## Install

```sh
npm install --save-dev @zumer/snapdiff
```

`@zumer/snapdom` is declared as a peer dependency and auto-installs with npm 7+, pnpm and yarn 2+. On older tooling, add it explicitly:

```sh
npm install --save-dev @zumer/snapdiff @zumer/snapdom
```

The script-tag workflow can also be used from a CDN without installing the package. snapDOM is loaded at runtime unless you pass your own URL.

---

## Pure browser

Drop a script tag, mark elements with `data-snap`, refresh the page.

```html
<script src="https://unpkg.com/@zumer/snapdiff/dist/snapdiff-auto.js" data-auto></script>

<div data-snap="hero">...</div>
<div data-snap="pricing">...</div>
```

The first load records baselines in IndexedDB. Later loads compare against those baselines and show a small badge in the bottom-right corner. Open it to review split / slider / diff views, approve changes, export/import baselines, or delete old ones.

snapDOM is loaded dynamically from the esm.sh CDN by default. To self-host it or pin a version, set `data-snapdom-url`.

### Configuration via `data-*` attrs

| attr | default | meaning |
|---|---|---|
| `data-namespace` | `snapdiff-auto` | scopes baselines per project in IndexedDB |
| `data-selector` | `[data-snap]` | CSS selector for testable elements |
| `data-threshold` | `0.1` | per-pixel YIQ delta |
| `data-failure-ratio` | `0` | mismatch ratio that flips a test to fail |
| `data-include-aa` | `false` | count anti-aliased pixels as mismatches |
| `data-snapdom-url` | esm.sh latest | where to load snapdom from |
| `data-auto-run` | `true` | run on page load (set `false` for click-to-run) |
| `data-auto-show` | `false` | open the reporter on every run, not just on failure |

### With JS control instead of `data-snap`

```js
import { snapdom } from '@zumer/snapdom'
import { createRunner, Reporter } from '@zumer/snapdiff'

const runner = createRunner({
  snapdom,
  namespace: 'my-app',
  threshold: 0.1,
  failureRatio: 0,
  snapdomOptions: { dpr: 1, scale: 1, embedFonts: true },
})

runner.test('homepage hero', () => document.querySelector('.hero'))
runner.test('pricing', () => document.querySelector('.pricing'))

const reporter = new Reporter(runner)
reporter.mount()
await reporter.runAndShow()
```

Runner methods: `test(name, fn, opts?)`, `run({ filter?, onProgress? })`, `approve(name, canvas?)`, `approveAll(results)`, `summary(results)`, `store`.

### Demos

```sh
git clone https://github.com/zumerlab/snapdiff && cd snapdiff
npm install
npm run demo
```

Open `http://localhost:3000/docs/` — a hub with three live examples:

- **Mutation toggle** — explicit `runner.test()` calls, button to introduce visual drift
- **Auto-discover** — zero-JS, just `<script data-auto>` + `data-snap` attrs
- **Components folder** — reads `./components/` and runs each HTML in a hidden iframe

### Tradeoffs

- **Baselines are local** because IndexedDB belongs to one browser/profile. Use export/import when you want to share them.
- **It does not block PRs**. Someone has to open the page and look at the reporter.
- **It depends on routine**. If nobody runs it, it will not catch regressions.

For small projects, prototypes, docs, and component demos, that tradeoff is often acceptable. The comparison is not always Percy or Chromatic; a lot of the time the comparison is no visual regression testing at all.

---

## Staleness check (`snapdiff-stale`)

`snapdiff-stale` is a small Node utility that flags baselines older than their source files. It does not render anything. It is meant to catch the simple case where a demo changed but its baseline was never re-recorded.

```sh
npx snapdiff-stale
```

```
[snapDiff] 3 baseline(s) older than source:
  c01-button   source +2.4d newer
  c05-progress source +0.1d newer
  c10-callout  source +5.0d newer
  Re-record with: UPDATE_VISUAL=1 npm test

Re-record stale baselines now? [y/N]
```

Defaults to `__snapshots__/visual/*.png` ↔ `docs/components/*.html`, matching by base name. Reports three categories:

- **Stale** — source modified after baseline (the actionable case; CLI offers to re-record)
- **Unrecorded** — source has no baseline yet (never been tested)
- **Orphan** — baseline has no source (renamed or deleted)

Only **stale** entries count toward the `--strict` exit code. Unrecorded and orphaned files are reported, but they usually need a human decision.

### Flags

| flag | meaning |
|---|---|
| `--baseline <dir>` | baseline directory (default `__snapshots__/visual`) |
| `--source <dir>` | source directory (default `docs/components`) |
| `--ext <.ext>` | source file extension (default `.html`) |
| `--unattended` | no prompts; just print and exit |
| `--strict` | exit 1 if anything is stale (CI gate) |
| `--quiet` | no output when up to date |

### As a library

```js
import { checkStaleness } from '@zumer/snapdiff/stale'

const { stale, orphans, unrecorded } = await checkStaleness({
  baselineDir: '__snapshots__/visual',
  sourceDir: 'docs/components',
  sourceExt: '.html',
})
```

Use it as a `pretest` warning, or run it in CI with `--strict` if stale baselines should fail the job.

---

## Vitest browser suite

For projects that need visual regressions to fail tests, snapDiff includes a Vitest browser helper. It uses the same diff engine, stores baselines on disk, and writes a static `report.html` after each run.

```js
// vitest.config.js
import { defineConfig } from 'vitest/config'
import { snapDiffCommands } from '@zumer/snapdiff/vitest'

export default defineConfig({
  test: {
    browser: {
      enabled: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
      screenshotFailures: false,
      commands: snapDiffCommands({ baseDir: '__snapshots__/visual' }),
    },
  },
})
```

```js
// __tests__/visual.demos.test.js
import { defineDemoSuite } from '@zumer/snapdiff/vitest/suite'

defineDemoSuite({
  demos: import.meta.glob('/demos/*.html'),
  defaultTarget: ['#target', 'body'],
  snapdomOptions: { dpr: 1, scale: 1, embedFonts: true },
  demoOptions: {
    'login': { target: '#login-form' },
    'modal': { wait: 500 },
  },
})
```

Each demo becomes a Vitest test. Baselines land at `__snapshots__/visual/<name>.png`; commit them with your project. On every run, a self-contained `report.html` is regenerated.

On the first run, missing baselines are recorded and reported as `new`. Commit those files before relying on the suite as a PR gate.

Update baselines with `UPDATE_VISUAL=1 npx vitest run`.

### `defineDemoSuite(options)`

| option | default | meaning |
|---|---|---|
| `demos` | required | `import.meta.glob('/demos/*.html')` or array of URLs |
| `baseDir` | `'__snapshots__/visual'` | where baselines + report go (must match commands config) |
| `defaultTarget` | `['#target', 'body']` | selectors tried in order; `body` always appended |
| `defaultWait` | `0` | ms to wait after iframe load before capture |
| `snapdomUrl` | `'/dist/snapdom.mjs'` | URL to snapdom inside each iframe |
| `snapdomOptions` | `{ dpr: 1, scale: 1, embedFonts: true }` | passed to snapdom for every demo |
| `demoOptions` | `{}` | per-demo overrides keyed by file basename |
| `viewport` | `{ width: 1280, height: 1024 }` | iframe dimensions |

Per-demo override fields: `target`, `wait`, `snapdomOptions`, `setup(win, doc)`, `threshold`, `failureRatio`, `skip`, `strictTarget`.

---

## Determinism (applies to every tier)

Visual baselines are only useful if they are reproducible. snapDiff defaults to portable captures:

| option | default | why |
|---|---|---|
| `dpr` | `1` | otherwise capture is `devicePixelRatio`-scaled — 2× retina vs 1× headless → all tests fail with `dims differ` |
| `scale` | `1` | same as DPR — affects output canvas dimensions |
| `embedFonts` | `true` | otherwise font availability across machines changes layout |
| viewport | `1280×1024` | element bounds depend on it |

If you change these between recording and verifying, tests can fail with `dims differ`. snapDiff reports that case explicitly because DPR/scale mismatches are a common source of noisy visual tests.

## Threshold cheat sheet

The `threshold` is the per-pixel YIQ perceptual delta. Below it, the pixel is considered visually unchanged.

- `0.05` — strict. Catches subtle gradient and shadow shifts.
- `0.1` — default. Tolerates small antialiasing drift while still catching visible changes.
- `0.2` — lenient. Useful when text rendering varies across machines.

The `failureRatio` is how much overall mismatch is allowed before a test fails. Default `0` (any mismatch fails). Increase to `0.001` (0.1%) if you have noisy fixtures.

## Scope

snapDiff captures what snapDOM captures. See [snapDOM](https://github.com/zumerlab/snapdom) for the current capture behavior and known gaps.

The important distinction: snapDOM renders the **DOM** to an image, not the full **browser window**. For sites, dashboards, design systems, and component libraries, that is often the surface you care about. For native widgets, browser chrome, OS-level rendering, or anything outside the DOM capture surface, use a browser screenshot tool such as Playwright or a hosted review service.

## Architecture

```
            ┌───────────────────┐
            │      snapdom      │   captures DOM → SVG → Canvas
            └─────────┬─────────┘
                      │
                      ▼
            ┌───────────────────┐
            │ snapDiff.runner   │   capture → diff → record
            └─────────┬─────────┘
              ┌───────┴────────┐
              ▼                ▼
    ┌─────────────────┐  ┌─────────────────┐
    │ snapDiff.diff   │  │  BaselineStore  │   IndexedDB or filesystem
    └─────────────────┘  └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │    Reporter     │   in-page UI: split / slider / diff
    └─────────────────┘
```

Diff engine, store, and reporter are separate modules. `import { diffPixels } from '@zumer/snapdiff/diff'` works in Node + `node-canvas` if you only need pixel diffing.

## Subpath imports

| path | what |
|---|---|
| `@zumer/snapdiff` | top-level: `createRunner`, `Reporter`, `diffPixels`, `BaselineStore`, etc. |
| `@zumer/snapdiff/auto` | programmatic `bootstrap(opts)` for the auto bundle |
| `@zumer/snapdiff/stale` | `checkStaleness()` — Node-only |
| `@zumer/snapdiff/diff` | pure `diffPixels(a, b, out|null, w, h, opts?)` / `diffCanvas` |
| `@zumer/snapdiff/store` | `BaselineStore` (IndexedDB) |
| `@zumer/snapdiff/file-store` | `FileBaselineStore` (vitest only) |
| `@zumer/snapdiff/static-report` | `generateStaticReport({ title, results, baseDir })` |
| `@zumer/snapdiff/vitest` | `snapDiffCommands` (Node-side, for `vitest.config.js`) |
| `@zumer/snapdiff/vitest/suite` | `defineDemoSuite` (browser-side spec) |

CLI: `snapdiff-stale` (installed as a `bin`, runnable via `npx`).

## About

snapDiff is a project of [Zumerlab](https://github.com/zumerlab) — same authors as snapDOM.

It started as internal tooling for snapDOM. That project has a gallery of visual demos covering CSS, fonts, gradients, filters, transforms, and web components. Unit tests are useful there, but they do not answer the question "does this still look right?"

snapDiff was built to keep that visual surface under test without adding a large screenshot stack. It is small on purpose: capture with snapDOM, diff pixels, store baselines, review changes.

## License

MIT — Juan Martin Muda
