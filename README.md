# snapDiff

**Visual regression testing that runs entirely in the browser.** Powered by [snapDOM](https://github.com/zumerlab/snapdom).

```html
<script src="https://unpkg.com/@zumer/snapdiff/dist/snapdiff-auto.js" data-auto></script>

<div data-snap="hero">...</div>
<div data-snap="pricing">...</div>
```

That's it. One script tag, zero user JavaScript. snapDiff finds the `[data-snap]` elements, captures each one, diffs against an IndexedDB baseline, and drops a badge in the corner with the result. Click it for the full split / slider / diff reporter.

No headless browser, no Puppeteer, no Playwright (\*), no Jest, no `pixelmatch`. Snap, diff, review — all in the page.

> (\*) Optional vitest + Playwright integration is available for CI gates. Most projects don't need it. See [Going to CI](#going-to-ci-optional).

If you want JS control instead of `data-snap` attrs:

```js
import { snapdom } from '@zumer/snapdom'
import { createRunner, Reporter } from '@zumer/snapdiff'

const runner = createRunner({ snapdom })
runner.test('hero', () => document.querySelector('.hero'))

new Reporter(runner).mount()
await runner.run()
```

---

## Why does this exist?

Visual regression testing — the practice of catching unintended UI changes by comparing screenshots over time — has historically been **expensive to set up**:

| Traditional stack         | What it does                                  |
| ------------------------- | --------------------------------------------- |
| Puppeteer / Playwright    | Spins up a headless Chromium binary           |
| `page.screenshot()`       | Renders the page to PNG                       |
| `pixelmatch`              | Pixel-diffs PNGs and outputs a diff image     |
| Jest / Mocha              | Test orchestration, snapshot management       |
| Storybook test runner     | (Optional) ties it to a component catalog     |
| A separate review tool    | Lets humans approve diffs                     |

Six moving parts. Two binaries. CI image bloat. Slow startup. Snapshots that drift between machines because of font rendering, DPI, or scrollbar widths.

**snapDOM solved one of those problems already**: it captures any DOM element to an image, in the browser, with near-native fidelity. It does what `page.screenshot()` does, but client-side and in milliseconds.

That removes the *need* for the headless browser. And once capture is in the page, **so is the diff**, **so are the baselines**, **so is the review UI**.

snapDiff is the rest of the toolkit on top of snapDOM. It's small (under 30 KB minified), framework-free, and turns visual regression from "schedule a sprint" into "drop a `<script>`".

## What's in the box

- **Auto-discover bundle** (`snapdiff-auto.js`) — drop one `<script>` tag, mark elements with `data-snap`, get a corner badge with results. Zero user JS.
- **Pixel-diff engine** with the YIQ perceptual delta and anti-aliasing detection. Same algorithm as `pixelmatch`, reimplemented from scratch with no runtime dependencies.
- **Storage**: IndexedDB by default (zero setup), or filesystem (via vitest commands) when you want baselines on disk and CI integration.
- **Test runner** with a familiar `test(name, fn)` API. Returns either an `Element` for snapDOM to capture, or a `Canvas` you built yourself.
- **In-page reporter** with three view modes (split / slider / diff overlay), one-click *Approve as new baseline*, baseline export/import to JSON.
- **`snapdiff-stale` CLI** — pure-Node `fs.stat` check that flags baselines older than their source files. No browser, no Playwright; works as a pre-commit hook or standalone hygiene check.
- **Static report generator** for offline / CI review (a self-contained HTML you can open with `file://`).
- **Vitest integration** for projects that already test in the browser — adds a `test()` per demo HTML, baselines on disk, full report on every run.

## Who is this for?

Most frontend projects don't have visual regression testing. Not because they don't need it — because the cost of adopting Percy, Chromatic, or Playwright + pixelmatch + a runner is high enough that they default to *eyeball it during dev* and find out about regressions through bug reports.

snapDiff is built for that majority:

- **Side projects and OSS libs** — especially UI libraries where the demos *are* the spec.
- **Designer-developers** iterating on prototypes and component playgrounds.
- **Small teams** without QA or a frontend infra owner.
- **Marketing sites and landing pages** where regressions are easy to ship and embarrassing to find.
- **Storybook users** who tried Chromatic and decided the bill wasn't worth it.

The shape that fits all of these: open your demo page in the dev server, see what changed since last time, click *Approve* or fix the bug. No CI, no headless binary, no hosted service. Your existing static server (Vite, webpack-dev-server, `npx serve`, anything) is the runner.

Be honest about the tradeoffs:

- **Baselines live in IndexedDB** by default. Sharing across devs is one-click export/import to JSON.
- **No PR gate.** Nothing fails a merge automatically — the dev has to open the page.
- **Requires a habit.** If nobody runs it, regressions ship.

For most projects in the list above, those tradeoffs are acceptable — because the real alternative is *nothing*, not Percy. Dev-time-only is 80% of the value at 5% of the cost. If you outgrow it (large team, regulated UI, mandatory gating), there's a vitest + Playwright path further down — same engine, same reporter, baselines on disk, CI integration. **Most projects never need it.**

## Scope

snapDiff captures what snapDOM captures. The capture surface keeps growing — for the up-to-date list of supported features and known gaps, see [snapDOM](https://github.com/zumerlab/snapdom).

The line worth knowing: snapDOM renders the **DOM** to an image, not the **browser window**. For most apps — sites, dashboards, design systems, component libraries — the two are visually equivalent and snapDiff is the right fit. For testing that hinges on output outside the DOM's reach, a browser-level screenshot tool like Playwright (or a hosted service like Percy / Chromatic) is the right call. snapDiff doesn't try to replace those.

## 30-second tour

```sh
git clone https://github.com/zumerlab/snapdiff
cd snapdiff
npm install
npm run demo
```

Open `http://localhost:3000/demo/`. Click *Run tests* (records baselines), then *Toggle mutation* (introduces visual drift), then *Run tests* again. The overlay shows you the diffs in three modes.

## Install

```sh
npm install --save-dev @zumer/snapdiff @zumer/snapdom
```

`@zumer/snapdom` is a peer dependency — snapDiff is the runner around snapDOM, not a fork of it.

## API at a glance

### Drop-the-script (zero JS)

The simplest possible usage. Add the script tag, mark elements with `data-snap`, refresh the page.

```html
<script
  src="https://unpkg.com/@zumer/snapdiff/dist/snapdiff-auto.js"
  data-auto
  data-namespace="my-app">
</script>

<div data-snap="hero">...</div>
<div data-snap="pricing">...</div>
```

On first load, snapDiff records each element as a baseline silently. On every reload after, it diffs and shows a small badge in the bottom-right with the result. Click the badge to open the full reporter (split / slider / diff modes, approve, export/import, delete baselines).

snapdom is loaded dynamically from the esm.sh CDN — to self-host or pin a version, set `data-snapdom-url` to a local path.

Configurable via `data-*` attrs on the script tag:

| attr | default | meaning |
|---|---|---|
| `data-namespace` | `snapdiff-auto` | scopes baselines per project in IndexedDB |
| `data-selector` | `[data-snap]` | CSS selector for elements to test |
| `data-threshold` | `0.1` | per-pixel YIQ delta |
| `data-failure-ratio` | `0` | mismatch ratio that flips a test to fail |
| `data-snapdom-url` | esm.sh latest | where to load snapdom from |
| `data-auto-show` | `false` | open the reporter on every run, not just on failure |
| `data-auto-run` | `true` | run on page load (set `false` and click the badge to run on demand) |

### In-page (with JS control)

```js
import { snapdom } from '@zumer/snapdom'
import { createRunner, Reporter } from '@zumer/snapdiff'

const runner = createRunner({
  snapdom,
  namespace: 'my-app',          // scopes baselines per project
  threshold: 0.1,               // YIQ perceptual threshold (0..1)
  failureRatio: 0,              // mismatch ratio that fails a test
  snapdomOptions: {             // passed to snapdom for every capture
    dpr: 1,                     // pin DPR so baselines are portable
    scale: 1,
    embedFonts: true,
  },
})

runner.test('homepage hero', () => document.querySelector('.hero'))
runner.test('pricing table', () => document.querySelector('.pricing'))

const reporter = new Reporter(runner)
reporter.mount()
await reporter.runAndShow()
```

The first run records each fixture as a *new* baseline (test passes). Every run after that diffs against the baseline. Failures are highlighted; click *Approve as new baseline* to update.

### Vitest integration (when you need CI gates)

Most projects don't need this — the in-page mode above is the whole product. Reach for the vitest path only when you need a PR to fail automatically on regression: large team, regulated UI, mandatory automation. Same engine and reporter, just bolted onto a real test runner.

For projects that already test in the browser via `vitest --browser`, snapDiff plugs in as a single test file that loops over a folder of demo HTML pages.

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
    'login':  { target: '#login-form' },
    'modal':  { wait: 500 },
  },
})
```

Each demo becomes a vitest test. Baselines land at `__snapshots__/visual/<name>.png` (commit them). On every run, a self-contained `report.html` is regenerated with side-by-side / slider / diff views.

Update baselines: `UPDATE_VISUAL=1 npx vitest run`.

## Determinism (this is the part everyone gets wrong)

Visual baselines must be reproducible across machines, browsers, headed/headless, retina/non-retina, and CI. snapDiff ships safe defaults, but you should know why they matter:

| option          | snapDiff default | why                                                                |
| --------------- | ------------------ | ------------------------------------------------------------------ |
| `dpr`           | `1`                | otherwise capture is `devicePixelRatio`-scaled — 2x on retina, 1x in headless |
| `scale`         | `1`                | same as DPR — affects output canvas dimensions                     |
| `embedFonts`    | `true`             | otherwise font availability across machines changes layout         |
| viewport        | `1280x1024`        | element bounds depend on it                                         |

If you change any of these between recording and verifying, every test fails with `dims differ`. snapDiff catches this case and tells you exactly what to do.

## Threshold cheat sheet

The `threshold` is the per-pixel YIQ perceptual delta. Below it, the pixel is considered visually unchanged. Sensible defaults:

- `0.05` — strict. Catches subtle gradient and shadow shifts.
- `0.1` — default. Tolerates antialiasing flicker, catches real changes.
- `0.2` — lenient. Useful when text rendering varies across machines.

The `failureRatio` is how much overall mismatch is allowed before a test fails. Default `0` (any mismatch fails). Increase to `0.001` (0.1%) if you have noisy fixtures.

## Catching stale baselines (`snapdiff-stale`)

Threshold tolerance is a feature *and* a footgun: it lets antialiasing jitter pass, but it also lets *real* changes pass when they happen to land below the threshold. Over weeks of editing, baselines silently drift out of sync with the source files they were recorded from.

`snapdiff-stale` is a tiny Node CLI that catches that — pure `fs.stat`, no browser, no Playwright, no headless anything. It compares mtimes between baseline PNGs and source HTML files and reports drift.

```sh
npx snapdiff-stale
# [snapDiff] 3 baseline(s) older than source:
#   c01-button   source +2.4d newer
#   c05-progress source +0.1d newer
#   c10-callout  source +5.0d newer
#   Re-record with: UPDATE_VISUAL=1 npm test
#
# Re-record stale baselines now? [y/N]
```

It reports three categories:

- **Stale** — source modified after the baseline (the actionable case; offers to re-record)
- **Unrecorded** — source has no matching baseline yet (never been tested)
- **Orphan** — baseline has no matching source (renamed or deleted)

Defaults to `__snapshots__/visual/*.png` ↔ `demo/components/*.html`, matching by base name. Override:

```sh
npx snapdiff-stale --baseline path/to/baselines --source path/to/sources --ext .vue
```

Flags:

| flag | meaning |
|---|---|
| `--unattended` | no prompts; just print and exit |
| `--strict` | exit 1 if anything is stale (for CI gates) |
| `--quiet` | no output when everything is up to date |

Or use it as a library:

```js
import { checkStaleness } from '@zumer/snapdiff/stale'

const { stale, orphans, unrecorded } = await checkStaleness({
  baselineDir: '__snapshots__/visual',
  sourceDir: 'demo/components',
})
```

Wire it as a `pretest` hook for a soft warning, or as a CI step with `--strict` for a hard gate. Or run it manually whenever you remember.

## Going to CI (optional)

You probably don't need this. If your VR review is "a human opens the demo page during dev and looks", the in-page mode is the whole product — stop here.

If you do need automation, two paths:

**1. Vitest + Playwright (full integration)**
The vitest suite runs your demos in real Chromium and writes baselines / artifacts to disk. CI just runs `npm test`. This is the path the snapDOM project itself uses.

**2. Pure browser, then ship the report**
Run snapDiff in any browser (headed CI agent, Saucelabs, BrowserStack), call `runner.run()`, send the result + a generated `report.html` as the build artifact. Reviewers open it directly — no infrastructure needed.

A standalone CLI is on the roadmap but optional; it would only be a thin wrapper around (1).

## Architecture

```
            ┌───────────────────┐
            │      snapdom      │   captures DOM → SVG → Canvas
            └─────────┬─────────┘
                      │
                      ▼
            ┌───────────────────┐
            │ snapDiff.runner │   orchestrates: capture → diff → record
            └─────────┬─────────┘
              ┌───────┴────────┐
              ▼                ▼
    ┌─────────────────┐  ┌─────────────────┐
    │ snapDiff.diff │  │  BaselineStore  │   IndexedDB or filesystem
    └─────────────────┘  └─────────────────┘
              │
              ▼
    ┌─────────────────┐
    │    Reporter     │   in-page UI: split / slider / diff
    └─────────────────┘
```

The diff engine, the store, and the reporter are independent — you can use any of them on their own. For example, `import { diffPixels } from '@zumer/snapdiff/diff'` works in Node + `node-canvas` if you just need pixel-diff without snapDOM.

## API reference

### `createRunner(options)` → runner

| option            | default     | meaning                                                       |
| ----------------- | ----------- | ------------------------------------------------------------- |
| `snapdom`         | required    | the snapdom function                                          |
| `store`           | IndexedDB   | custom store (e.g. `FileBaselineStore`)                       |
| `namespace`       | `'default'` | scopes baselines per project in IndexedDB                     |
| `threshold`       | `0.1`       | YIQ delta threshold per pixel                                 |
| `failureRatio`    | `0`         | mismatch ratio above which a test fails                       |
| `includeAA`       | `false`     | if true, anti-aliased pixels count as mismatches              |
| `snapdomOptions`  | `{}`        | options passed to `snapdom(el, options)` for every test       |

Returned methods: `test(name, fn, opts?)`, `run({ filter?, onProgress? })`, `approve(name, canvas?)`, `approveAll(results)`, `summary(results)`, `store`.

### `Reporter(runner, opts?)` → ui

`reporter.mount(target?)`, `reporter.unmount()`, `reporter.runAndShow(filter?)`, `reporter.setResults(results)`.

### `diffPixels(a, b, out|null, w, h, opts?)` → `{ diff, total, ratio }`

Pure function over RGBA `Uint8ClampedArray` buffers. `diffCanvas(baseline, actual, opts?)` is the canvas-aware wrapper.

### `BaselineStore(namespace?)`

`put(name, blob, meta)`, `get(name)`, `delete(name)`, `list()`, `clear()`, `export()`, `import(bundle, { overwrite })`.

### `defineDemoSuite(options)` (vitest browser)

| option            | default                   | meaning                                                |
| ----------------- | ------------------------- | ------------------------------------------------------ |
| `demos`           | required                  | `import.meta.glob('/demos/*.html')` or array of URLs   |
| `baseDir`         | `'__snapshots__/visual'`  | where baselines + report go (must match commands)      |
| `defaultTarget`   | `['#target', 'body']`     | selectors tried in order; `body` always appended       |
| `defaultWait`     | `0`                       | ms to wait after iframe load before capture            |
| `snapdomUrl`      | `'/dist/snapdom.mjs'`     | URL to snapdom inside each iframe                      |
| `snapdomOptions`  | `{ dpr: 1, scale: 1, embedFonts: true }` | passed to snapdom for every demo |
| `demoOptions`     | `{}`                      | per-demo overrides keyed by file basename              |
| `viewport`        | `{ width: 1280, height: 1024 }` | iframe dimensions                            |

Per-demo override fields: `target`, `wait`, `snapdomOptions`, `setup(win, doc)`, `threshold`, `failureRatio`, `skip`, `strictTarget`.

## About

snapDiff is a project of [Zumerlab](https://github.com/zumerlab) — same authors as snapDOM.

It started as in-house tooling. snapDOM ships a gallery of 50+ visual demos that exercise the full capture surface — CSS, fonts, gradients, filters, transforms, web components — and unit tests can't catch the regressions that matter there: "does this still *look* right" isn't a function-return question. The existing VR stacks (Puppeteer + pixelmatch + Jest + a separate review tool) were heavy enough that nobody on the team set them up. snapDiff is what we built instead, and it's been guarding snapDOM on every commit since.

If it can verify snapDOM's renderings, it can verify yours.

## License

MIT — Juan Martin Muda
