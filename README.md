# snapDiff

**Visual regression testing that runs entirely in the browser.** Powered by [snapDOM](https://github.com/zumerlab/snapdom).

snapDiff captures DOM elements with snapDOM, diffs them against baselines, shows you what changed. No headless browser, no Puppeteer, no Playwright (\*), no Jest, no `pixelmatch` — same algorithms, in the page.

> (\*) Tier 3 below *optionally* uses Playwright for CI gates.

---

## Three ways to use it

```
Tier 1 — Pure browser (zero JS)
  └── <script src="snapdiff-auto.js" data-auto>
      • IndexedDB · zero install · zero Node
      • Open the page, see diffs, click Approve

Tier 2 — Cheap Node CLI (no headless browser)
  └── snapdiff-stale --baseline DIR --source DIR
      • Pure fs.stat · no rendering
      • Hygiene & auditing · CI-friendly exit codes

Tier 3 — Playwright + vitest (CI gates)
  └── defineDemoSuite()
      • Disk baselines · PR-blocking failures
      • Cross-browser real · CI-ready
```

Each tier is a **complete product for a real audience**, not a stepping stone toward the next. An OSS frontend dev can stay in Tier 1 forever and be fine. A small team adds Tier 2 for a CI warning that doesn't block. A regulated team picks Tier 3.

---

## Install

```sh
npm install --save-dev @zumer/snapdiff @zumer/snapdom
```

`@zumer/snapdom` is a peer dependency. Tier 1 via script tag also works without `npm install` — point at unpkg directly.

---

## Tier 1 — Pure browser (zero JS)

Drop a script tag, mark elements with `data-snap`, refresh the page.

```html
<script src="https://unpkg.com/@zumer/snapdiff/dist/snapdiff-auto.js" data-auto></script>

<div data-snap="hero">...</div>
<div data-snap="pricing">...</div>
```

First load records baselines silently in IndexedDB. Every reload after diffs and shows a badge in the bottom-right. Click it for the full reporter (split / slider / diff modes, approve, export/import, delete baselines).

snapdom is loaded dynamically from the esm.sh CDN. To self-host or pin a version, set `data-snapdom-url`.

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

Open `http://localhost:3000/demo/` — a hub with three live examples:

- **Mutation toggle** — explicit `runner.test()` calls, button to introduce visual drift
- **Auto-discover** — zero-JS, just `<script data-auto>` + `data-snap` attrs
- **Components folder** — reads `./components/` and runs each HTML in a hidden iframe

### Tradeoffs

- **Baselines per-machine** (IndexedDB). Sharing across devs is one-click export/import to JSON via the reporter toolbar.
- **No PR gate** — nothing fails a merge automatically; the dev has to open the page.
- **Requires a habit** — if nobody runs it, regressions ship.

For most small projects these are acceptable. The real alternative for that audience is *nothing*, not Percy/Chromatic. Tier 1 is 80% of the value at 5% of the cost.

---

## Tier 2 — Cheap Node CLI (`snapdiff-stale`)

A tiny `fs.stat` utility that flags baselines older than their source files. Pure Node — no browser, no Playwright. Catches the case where the threshold silently tolerated a real change because the dev forgot to re-record.

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

Defaults to `__snapshots__/visual/*.png` ↔ `demo/components/*.html`, matching by base name. Reports three categories:

- **Stale** — source modified after baseline (the actionable case; CLI offers to re-record)
- **Unrecorded** — source has no baseline yet (never been tested)
- **Orphan** — baseline has no source (renamed or deleted)

Only **stale** counts toward `--strict` exit code — the other two need human decisions.

### Flags

| flag | meaning |
|---|---|
| `--baseline <dir>` | baseline directory (default `__snapshots__/visual`) |
| `--source <dir>` | source directory (default `demo/components`) |
| `--ext <.ext>` | source file extension (default `.html`) |
| `--unattended` | no prompts; just print and exit |
| `--strict` | exit 1 if anything is stale (CI gate) |
| `--quiet` | no output when up to date |

### As a library

```js
import { checkStaleness } from '@zumer/snapdiff/stale'

const { stale, orphans, unrecorded } = await checkStaleness({
  baselineDir: '__snapshots__/visual',
  sourceDir: 'demo/components',
  sourceExt: '.html',
})
```

Wire it as a `pretest` hook for a soft warning, or as a CI step with `--strict` for a hard gate.

---

## Tier 3 — Playwright + vitest (CI gates)

For projects that need a PR to fail when visuals regress. Same engine, same reporter as Tier 1, plus disk-backed baselines and full vitest integration.

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

Each demo becomes a vitest test. Baselines land at `__snapshots__/visual/<name>.png` (commit them). On every run, a self-contained `report.html` is regenerated.

Update baselines: `UPDATE_VISUAL=1 npx vitest run`.

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

Visual baselines must be reproducible across machines, browsers, headed/headless, retina/non-retina, and CI. snapDiff defaults are chosen for portability:

| option | default | why |
|---|---|---|
| `dpr` | `1` | otherwise capture is `devicePixelRatio`-scaled — 2× retina vs 1× headless → all tests fail with `dims differ` |
| `scale` | `1` | same as DPR — affects output canvas dimensions |
| `embedFonts` | `true` | otherwise font availability across machines changes layout |
| viewport | `1280×1024` | element bounds depend on it |

Change any of these between recording and verifying and every test fails with `dims differ`. snapDiff catches this and tells you exactly what to do.

## Threshold cheat sheet

The `threshold` is the per-pixel YIQ perceptual delta. Below it, the pixel is considered visually unchanged.

- `0.05` — strict. Catches subtle gradient and shadow shifts.
- `0.1` — default. Tolerates antialiasing flicker, catches real changes.
- `0.2` — lenient. Useful when text rendering varies across machines.

The `failureRatio` is how much overall mismatch is allowed before a test fails. Default `0` (any mismatch fails). Increase to `0.001` (0.1%) if you have noisy fixtures.

## Scope

snapDiff captures what snapDOM captures. The capture surface keeps growing — see [snapDOM](https://github.com/zumerlab/snapdom) for the up-to-date list of supported features and known gaps.

The line worth knowing: snapDOM renders the **DOM** to an image, not the **browser window**. For most apps — sites, dashboards, design systems, component libraries — the two are visually equivalent and snapDiff is a good fit. For testing that hinges on output outside the DOM's reach (native widgets, OS-level chrome), a browser-level screenshot tool like Playwright (or a hosted service like Percy / Chromatic) is the right call. snapDiff doesn't try to replace those.

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

Diff engine, store, and reporter are independent. `import { diffPixels } from '@zumer/snapdiff/diff'` works in Node + `node-canvas` if you just need pixel-diff without snapDOM.

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

It started as in-house tooling. snapDOM ships a gallery of 50+ visual demos that exercise the full capture surface — CSS, fonts, gradients, filters, transforms, web components — and unit tests can't catch the regressions that matter there: "does this still *look* right" isn't a function-return question. The existing VR stacks (Puppeteer + pixelmatch + Jest + a separate review tool) were heavy enough that nobody on the team set them up. snapDiff is what we built instead, and it's been guarding snapDOM on every commit since.

If it can verify snapDOM's renderings, it can verify yours.

## License

MIT — Juan Martin Muda
