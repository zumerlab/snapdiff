// Self-contained static report. Reads PNG artifacts from disk via relative
// paths so it can be opened directly with file:// or any static server.

const STYLE = `
  :root { color-scheme: dark; }
  body { margin: 0; background: #0e1116; color: #e6e8eb; font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, sans-serif; }
  header { display: flex; align-items: center; gap: 12px; padding: 12px 18px; border-bottom: 1px solid #232832; background: #161a21; position: sticky; top: 0; z-index: 10; }
  header h1 { margin: 0; font-size: 14px; letter-spacing: .02em; }
  header .meta { opacity: .6; font-size: 11px; }
  header .spacer { flex: 1; }
  header input[type="search"] { background: #0b0e13; border: 1px solid #2c3445; color: #e6e8eb; padding: 6px 10px; border-radius: 6px; min-width: 220px; }
  .pill { padding: 2px 8px; border-radius: 999px; font-weight: 600; font-size: 12px; background: #1c2230; border: 1px solid #2c3445; }
  .pill.pass { color: #6cd4a3; border-color: #244437; }
  .pill.fail { color: #ff6e7a; border-color: #4a2730; }
  .pill.new  { color: #f0c419; border-color: #4a4225; }
  .pill.error{ color: #ff8a3d; border-color: #4a3122; }
  .filter button { background: transparent; border: 1px solid #2c3445; color: inherit; padding: 4px 10px; border-radius: 6px; font: inherit; cursor: pointer; }
  .filter button.active { background: #2f6df6; border-color: #2f6df6; color: white; }
  main { padding: 18px; display: grid; gap: 18px; grid-template-columns: minmax(0, 1fr); max-width: 1400px; margin: 0 auto; }
  .card { background: #161a21; border: 1px solid #232832; border-radius: 10px; overflow: hidden; }
  .card.hidden { display: none; }
  .card header { background: transparent; border: 0; padding: 14px 18px; cursor: pointer; }
  .card header h2 { font-size: 14px; margin: 0; flex: 1; }
  .card .body { display: none; padding: 0 18px 18px; }
  .card.open .body { display: block; }
  .card .meta { font-size: 11px; opacity: .65; }
  .modes { display: flex; gap: 4px; margin-bottom: 12px; }
  .modes button { background: #0b0e13; border: 1px solid #2c3445; color: inherit; padding: 4px 10px; border-radius: 6px; font: inherit; cursor: pointer; }
  .modes button.active { background: #2f6df6; border-color: #2f6df6; color: white; }
  .stage { background:
    linear-gradient(45deg, #161a21 25%, transparent 25%) 0 0/16px 16px,
    linear-gradient(-45deg, #161a21 25%, transparent 25%) 0 8px/16px 16px,
    linear-gradient(45deg, transparent 75%, #161a21 75%) 8px -8px/16px 16px,
    linear-gradient(-45deg, transparent 75%, #161a21 75%) -8px 0/16px 16px,
    #0b0e13;
    padding: 16px; border-radius: 8px; overflow: auto; }
  .row { display: flex; gap: 14px; align-items: flex-start; flex-wrap: wrap; }
  .row > figure { margin: 0; display: flex; flex-direction: column; gap: 6px; }
  .row figcaption { font-size: 11px; opacity: .65; text-align: center; }
  .row img { display: block; max-width: 100%; box-shadow: 0 6px 20px rgba(0,0,0,.4); background: white; }
  .slider { position: relative; display: inline-block; user-select: none; box-shadow: 0 6px 20px rgba(0,0,0,.4); background: white; }
  .slider .layer { position: absolute; top: 0; left: 0; height: 100%; overflow: hidden; }
  .slider .handle { position: absolute; top: 0; bottom: 0; width: 2px; background: #2f6df6; cursor: ew-resize; }
  .slider .handle::after { content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; background: #2f6df6; border-radius: 50%; box-shadow: 0 2px 8px rgba(0,0,0,.5); }
  pre.error { background: #2a1418; color: #ffb1b8; padding: 12px; border-radius: 8px; white-space: pre-wrap; font-size: 12px; }
`

const SCRIPT = `
  document.querySelectorAll('.card').forEach(card => {
    const head = card.querySelector('header')
    head.addEventListener('click', () => card.classList.toggle('open'))
    card.querySelectorAll('.modes button').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation()
        const mode = btn.dataset.mode
        card.querySelectorAll('.modes button').forEach(b => b.classList.toggle('active', b === btn))
        card.querySelectorAll('[data-view]').forEach(v => v.style.display = v.dataset.view === mode ? '' : 'none')
        if (mode === 'slider') initSlider(card)
      })
    })
  })

  function initSlider(card) {
    const slider = card.querySelector('.slider')
    if (!slider || slider.dataset.init) return
    slider.dataset.init = '1'
    const layer = slider.querySelector('.layer')
    const handle = slider.querySelector('.handle')
    let dragging = false
    const move = e => {
      if (!dragging && e.type !== 'click') return
      const rect = slider.getBoundingClientRect()
      const x = Math.min(Math.max(0, (e.clientX ?? e.touches?.[0]?.clientX) - rect.left), rect.width)
      const pct = (x / rect.width) * 100
      layer.style.width = pct + '%'
      handle.style.left = pct + '%'
    }
    handle.addEventListener('mousedown', () => dragging = true)
    window.addEventListener('mouseup', () => dragging = false)
    window.addEventListener('mousemove', move)
    slider.addEventListener('click', move)
  }

  const search = document.getElementById('search')
  const buttons = document.querySelectorAll('.filter button')
  let activeStatus = 'all'
  function applyFilter() {
    const q = search.value.toLowerCase()
    document.querySelectorAll('.card').forEach(c => {
      const matchStatus = activeStatus === 'all' || c.dataset.status === activeStatus
      const matchQuery = !q || c.dataset.name.toLowerCase().includes(q)
      c.classList.toggle('hidden', !(matchStatus && matchQuery))
    })
  }
  search.addEventListener('input', applyFilter)
  buttons.forEach(b => b.addEventListener('click', () => {
    buttons.forEach(x => x.classList.toggle('active', x === b))
    activeStatus = b.dataset.status
    applyFilter()
  }))

  document.querySelectorAll('.card[data-status="fail"], .card[data-status="error"]').forEach(c => c.classList.add('open'))
`

export function generateStaticReport({ title = 'snapDiff report', results = [], generatedAt = Date.now(), baseDir = '.' } = {}) {
  const sum = summarize(results)
  const cards = results.map(r => renderCard(r, baseDir)).join('\n')
  const date = new Date(generatedAt).toISOString().replace('T', ' ').slice(0, 19)
  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${esc(title)}</title>
<style>${STYLE}</style></head>
<body>
<header>
  <h1>${esc(title)}</h1>
  <span class="meta">${date} · ${results.length} tests</span>
  <span class="spacer"></span>
  ${pill('pass', sum.pass)}
  ${pill('fail', sum.fail)}
  ${pill('new', sum.new)}
  ${pill('error', sum.error)}
  <span class="filter" style="display:flex;gap:4px">
    <button data-status="all" class="active">all</button>
    <button data-status="fail">fail</button>
    <button data-status="new">new</button>
    <button data-status="pass">pass</button>
  </span>
  <input id="search" type="search" placeholder="Filter by name…" />
</header>
<main>${cards || '<p style="opacity:.6;padding:32px">No results.</p>'}</main>
<script>${SCRIPT}</script>
</body></html>`
}

/**
 * Merge result lists by name, last write wins, ordered by name.
 *
 * A demo suite can be split across several test files so vitest runs its demos
 * in parallel, and each file then reports only the demos it ran. The report has
 * to cover the whole run, so results accumulate instead of replacing each other.
 * Sorting by name restores the order a single file would have produced.
 */
export function mergeResults(previous = [], incoming = []) {
  const byName = new Map()
  for (const result of [...previous, ...incoming]) {
    if (result && typeof result.name === 'string') byName.set(result.name, result)
  }
  return [...byName.values()].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
}

function summarize(results) {
  return {
    pass: results.filter(r => r.status === 'pass').length,
    fail: results.filter(r => r.status === 'fail').length,
    new:  results.filter(r => r.status === 'new').length,
    error:results.filter(r => r.status === 'error').length,
  }
}

function pill(status, n) { return n ? `<span class="pill ${status}">${n} ${status}</span>` : '' }

function renderCard(r, baseDir) {
  const ratio = r.ratio != null ? `${(r.ratio * 100).toFixed(2)}% (${r.diff} px)` : ''
  const baseline = r.paths?.baseline ? rel(r.paths.baseline, baseDir) : ''
  const actual = r.paths?.actual ? rel(r.paths.actual, baseDir) : ''
  const diff = r.paths?.diff ? rel(r.paths.diff, baseDir) : ''
  const dimsWarn = r.dimsMatch === false ? ' · <strong>dimensions differ</strong>' : ''
  return `
<section class="card" data-status="${r.status}" data-name="${esc(r.name)}">
  <header>
    <span class="pill ${r.status}">${r.status}</span>
    <h2>${esc(r.name)}</h2>
    <span class="meta">${ratio}${dimsWarn}</span>
  </header>
  <div class="body">
    ${r.error ? `<pre class="error">${esc(r.error)}</pre>` : ''}
    <div class="modes">
      <button data-mode="split" class="active">split</button>
      ${baseline && actual ? '<button data-mode="slider">slider</button>' : ''}
      ${diff ? '<button data-mode="diff">diff only</button>' : ''}
    </div>
    <div class="stage">
      <div class="row" data-view="split">
        ${baseline ? fig('baseline', baseline) : ''}
        ${actual ? fig('actual', actual) : ''}
        ${diff ? fig('diff', diff) : ''}
      </div>
      ${baseline && actual ? `<div data-view="slider" style="display:none">
        ${slider(baseline, actual)}
      </div>` : ''}
      ${diff ? `<div data-view="diff" style="display:none"><img src="${diff}" alt="diff" /></div>` : ''}
    </div>
  </div>
</section>`
}

function fig(label, src) {
  return `<figure><img src="${src}" alt="${label}" /><figcaption>${label}</figcaption></figure>`
}

function slider(baseline, actual) {
  return `<div class="slider">
    <img src="${baseline}" alt="baseline" />
    <div class="layer" style="width:50%"><img src="${actual}" alt="actual" /></div>
    <div class="handle" style="left:50%"></div>
  </div>`
}

function rel(p, baseDir) {
  const norm = String(p).replace(/\\/g, '/')
  const b = String(baseDir).replace(/\\/g, '/').replace(/\/$/, '')
  if (b && norm.startsWith(b + '/')) return norm.slice(b.length + 1)
  return norm
}

function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])) }
