// In-page reporter UI. Renders results as a fixed overlay with three view modes
// (split, slider, diff) and per-test approve buttons. Pure DOM, no framework.

const STYLE = `
.sv-root, .sv-root * { box-sizing: border-box; }
.sv-root {
  position: fixed; inset: 0; z-index: 2147483600;
  background: #0e1116; color: #e6e8eb;
  font: 13px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  display: grid; grid-template-rows: auto 1fr; overflow: hidden;
}
.sv-bar {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; background: #161a21;
  border-bottom: 1px solid #232832;
}
.sv-bar h1 { margin: 0; font-size: 13px; font-weight: 600; letter-spacing: .02em; }
.sv-bar .sv-spacer { flex: 1; }
.sv-bar button {
  background: #1c2230; color: #e6e8eb; border: 1px solid #2c3445;
  padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: pointer;
}
.sv-bar button:hover { background: #232b3d; }
.sv-bar button.sv-primary { background: #2f6df6; border-color: #2f6df6; color: white; }
.sv-bar button.sv-primary:hover { background: #4a82f8; }
.sv-bar button.sv-danger { color: #ff6e7a; border-color: #4a2730; }

.sv-stats { display: flex; gap: 8px; font-size: 12px; }
.sv-pill {
  padding: 2px 8px; border-radius: 999px; font-weight: 600;
  background: #1c2230; border: 1px solid #2c3445;
}
.sv-pill.pass { color: #6cd4a3; border-color: #244437; }
.sv-pill.fail { color: #ff6e7a; border-color: #4a2730; }
.sv-pill.new  { color: #f0c419; border-color: #4a4225; }
.sv-pill.error{ color: #ff8a3d; border-color: #4a3122; }

.sv-body { display: grid; grid-template-columns: 280px 1fr; overflow: hidden; }
.sv-list { overflow-y: auto; border-right: 1px solid #232832; background: #0b0e13; }
.sv-item {
  padding: 10px 14px; border-bottom: 1px solid #161a21; cursor: pointer;
  display: flex; align-items: center; gap: 10px;
}
.sv-item:hover { background: #131822; }
.sv-item.sv-selected { background: #19233a; }
.sv-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; }
.sv-dot.pass { background: #6cd4a3; }
.sv-dot.fail { background: #ff6e7a; }
.sv-dot.new  { background: #f0c419; }
.sv-dot.error{ background: #ff8a3d; }
.sv-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sv-ratio { font-variant-numeric: tabular-nums; opacity: .65; font-size: 11px; }

.sv-detail { display: flex; flex-direction: column; overflow: hidden; }
.sv-detail-bar {
  display: flex; gap: 6px; padding: 10px 14px;
  background: #11151c; border-bottom: 1px solid #232832; align-items: center;
}
.sv-mode { display: flex; background: #0b0e13; border: 1px solid #2c3445; border-radius: 6px; overflow: hidden; }
.sv-mode button { background: transparent; border: 0; border-radius: 0; padding: 6px 10px; }
.sv-mode button.sv-active { background: #2f6df6; color: white; }
.sv-detail-bar .sv-spacer { flex: 1; }

.sv-stage {
  flex: 1; overflow: auto; padding: 18px;
  background:
    linear-gradient(45deg, #161a21 25%, transparent 25%) 0 0/16px 16px,
    linear-gradient(-45deg, #161a21 25%, transparent 25%) 0 8px/16px 16px,
    linear-gradient(45deg, transparent 75%, #161a21 75%) 8px -8px/16px 16px,
    linear-gradient(-45deg, transparent 75%, #161a21 75%) -8px 0/16px 16px,
    #0e1116;
  display: flex; align-items: flex-start; justify-content: center;
}
.sv-canvases { display: flex; gap: 12px; align-items: flex-start; }
.sv-canvas-wrap { display: flex; flex-direction: column; gap: 6px; }
.sv-canvas-wrap span { font-size: 11px; opacity: .7; text-align: center; }
.sv-canvas-wrap canvas, .sv-canvas-wrap img {
  display: block; max-width: 100%; box-shadow: 0 6px 20px rgba(0,0,0,.4);
  background: white;
}
.sv-slider {
  position: relative; display: inline-block; user-select: none;
  box-shadow: 0 6px 20px rgba(0,0,0,.4); background: white;
}
.sv-slider .sv-layer {
  position: absolute; top: 0; left: 0; height: 100%;
  overflow: hidden;
}
.sv-slider .sv-handle {
  position: absolute; top: 0; bottom: 0; width: 2px; background: #2f6df6;
  cursor: ew-resize;
}
.sv-slider .sv-handle::after {
  content: ''; position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 24px; height: 24px; background: #2f6df6; border-radius: 50%;
  box-shadow: 0 2px 8px rgba(0,0,0,.5);
}
.sv-empty { padding: 24px; opacity: .6; }
.sv-error { padding: 16px; background: #2a1418; color: #ffb1b8; border-radius: 8px; white-space: pre-wrap; }

.sv-meta { font-size: 11px; opacity: .65; padding: 8px 14px; border-top: 1px solid #232832; }
`

let styleInjected = false
function injectStyle() {
  if (styleInjected) return
  const tag = document.createElement('style')
  tag.textContent = STYLE
  document.head.appendChild(tag)
  styleInjected = true
}

export class Reporter {
  constructor(runner, opts = {}) {
    this.runner = runner
    this.results = []
    this.selected = null
    this.mode = opts.mode ?? 'split' // split | slider | diff
    this.root = null
    this.onClose = opts.onClose
  }

  mount(target = document.body) {
    injectStyle()
    if (this.root) this.unmount()
    this.root = document.createElement('div')
    this.root.className = 'sv-root'
    target.appendChild(this.root)
    this._render()
    return this
  }

  unmount() { this.root?.remove(); this.root = null }

  setResults(results) {
    this.results = results
    if (!this.selected || !results.find(r => r.name === this.selected)) {
      const fail = results.find(r => r.status === 'fail' || r.status === 'new' || r.status === 'error')
      this.selected = (fail ?? results[0])?.name ?? null
    }
    this._render()
  }

  async _rerunSingle(r, before) {
    await before()
    const fresh = await this.runner.run({ filter: name => name === r.name })
    const idx = this.results.findIndex(x => x.name === r.name)
    if (idx >= 0 && fresh[0]) this.results[idx] = fresh[0]
    this._render()
  }

  async runAndShow(filter) {
    this._renderEmpty('Running tests…')
    const results = await this.runner.run({
      filter,
      onProgress: ({ index, total, result }) => {
        this._renderEmpty(`Running ${index + 1}/${total} — ${result.name} (${result.status})`)
      },
    })
    this.setResults(results)
    return results
  }

  _renderEmpty(msg) {
    if (!this.root) return
    this.root.innerHTML = `
      <div class="sv-bar"><h1>snapDiff</h1><div class="sv-spacer"></div></div>
      <div class="sv-empty">${escapeHtml(msg)}</div>`
  }

  _render() {
    if (!this.root) return
    const r = this.results
    const sum = this.runner.summary(r)
    this.root.innerHTML = ''
    this.root.appendChild(this._renderBar(sum))
    const body = el('div', 'sv-body')
    body.appendChild(this._renderList())
    body.appendChild(this._renderDetail())
    this.root.appendChild(body)
  }

  _renderBar(sum) {
    const bar = el('div', 'sv-bar')
    const title = el('h1'); title.textContent = 'snapDiff'
    bar.appendChild(title)
    const stats = el('div', 'sv-stats')
    for (const k of ['pass', 'fail', 'new', 'error']) {
      if (sum[k] === 0) continue
      const pill = el('span', `sv-pill ${k}`)
      pill.textContent = `${sum[k]} ${k}`
      stats.appendChild(pill)
    }
    bar.appendChild(stats)
    bar.appendChild(el('div', 'sv-spacer'))

    const rerun = el('button'); rerun.textContent = 'Re-run all'
    rerun.onclick = () => this.runAndShow()
    bar.appendChild(rerun)

    const approveAll = el('button', 'sv-primary'); approveAll.textContent = 'Approve all changes'
    approveAll.onclick = async () => {
      const n = await this.runner.approveAll(this.results)
      if (n) await this.runAndShow()
    }
    bar.appendChild(approveAll)

    const exp = el('button'); exp.textContent = 'Export'
    exp.onclick = async () => {
      const bundle = await this.runner.store.export()
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `snapdiff-${this.runner.store.namespace}.json`
      a.click()
      URL.revokeObjectURL(a.href)
    }
    bar.appendChild(exp)

    const imp = el('button'); imp.textContent = 'Import'
    imp.onclick = () => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'application/json,.json'
      input.onchange = async () => {
        const file = input.files?.[0]
        if (!file) return
        try {
          const bundle = JSON.parse(await file.text())
          const { added, skipped } = await this.runner.store.import(bundle, { overwrite: true })
          console.log(`[snapDiff] imported ${added} baseline(s), skipped ${skipped}`)
          await this.runAndShow()
        } catch (err) {
          alert(`Import failed: ${err.message}`)
        }
      }
      input.click()
    }
    bar.appendChild(imp)

    if (this.onClose) {
      const close = el('button'); close.textContent = '✕'
      close.onclick = () => { this.unmount(); this.onClose() }
      bar.appendChild(close)
    }
    return bar
  }

  _renderList() {
    const list = el('div', 'sv-list')
    if (!this.results.length) {
      const empty = el('div', 'sv-empty')
      empty.textContent = 'No results yet.'
      list.appendChild(empty)
      return list
    }
    for (const r of this.results) {
      const row = el('div', 'sv-item' + (r.name === this.selected ? ' sv-selected' : ''))
      row.appendChild(el('div', `sv-dot ${r.status}`))
      const name = el('div', 'sv-name'); name.textContent = r.name
      row.appendChild(name)
      const ratio = el('div', 'sv-ratio')
      if (r.status === 'fail' || r.status === 'pass') ratio.textContent = formatRatio(r.ratio)
      else if (r.status === 'new') ratio.textContent = 'new'
      else if (r.status === 'error') ratio.textContent = 'err'
      row.appendChild(ratio)
      row.onclick = () => { this.selected = r.name; this._render() }
      list.appendChild(row)
    }
    return list
  }

  _renderDetail() {
    const wrap = el('div', 'sv-detail')
    const r = this.results.find(x => x.name === this.selected)
    if (!r) {
      wrap.appendChild(el('div', 'sv-empty')).textContent = 'Select a test to view details.'
      return wrap
    }
    wrap.appendChild(this._renderDetailBar(r))
    const stage = el('div', 'sv-stage')
    if (r.status === 'error') {
      const e = el('div', 'sv-error')
      e.textContent = r.error?.stack || String(r.error)
      stage.appendChild(e)
    } else if (r.status === 'new') {
      stage.appendChild(this._wrapCanvas(r.actual, 'actual (no baseline)'))
    } else if (this.mode === 'split') {
      const row = el('div', 'sv-canvases')
      row.appendChild(this._wrapCanvas(r.baseline, 'baseline'))
      row.appendChild(this._wrapCanvas(r.actual, 'actual'))
      row.appendChild(this._wrapCanvas(r.diffCanvas, 'diff'))
      stage.appendChild(row)
    } else if (this.mode === 'slider') {
      stage.appendChild(this._renderSlider(r))
    } else if (this.mode === 'diff') {
      stage.appendChild(this._wrapCanvas(r.diffCanvas, 'diff'))
    }
    wrap.appendChild(stage)
    wrap.appendChild(this._renderMeta(r))
    return wrap
  }

  _renderDetailBar(r) {
    const bar = el('div', 'sv-detail-bar')
    const mode = el('div', 'sv-mode')
    for (const m of ['split', 'slider', 'diff']) {
      const b = el('button', this.mode === m ? 'sv-active' : '')
      b.textContent = m
      b.onclick = () => { this.mode = m; this._render() }
      mode.appendChild(b)
    }
    bar.appendChild(mode)
    bar.appendChild(el('div', 'sv-spacer'))

    if (r.status === 'fail' || r.status === 'new') {
      const approve = el('button', 'sv-primary')
      approve.textContent = r.status === 'new' ? 'Save baseline' : 'Approve as new baseline'
      approve.onclick = () => this._rerunSingle(r, () => this.runner.approve(r.name, r.actual))
      bar.appendChild(approve)
    }
    if (r.status !== 'new') {
      const reset = el('button', 'sv-danger')
      reset.textContent = 'Delete baseline'
      reset.onclick = () => this._rerunSingle(r, () => this.runner.store.delete(r.name))
      bar.appendChild(reset)
    }
    return bar
  }

  _wrapCanvas(canvas, label) {
    const w = el('div', 'sv-canvas-wrap')
    const c = document.createElement('canvas')
    c.width = canvas.width; c.height = canvas.height
    c.getContext('2d').drawImage(canvas, 0, 0)
    w.appendChild(c)
    const span = el('span'); span.textContent = label
    w.appendChild(span)
    return w
  }

  _renderSlider(r) {
    const w = Math.max(r.baseline.width, r.actual.width)
    const h = Math.max(r.baseline.height, r.actual.height)
    const slider = el('div', 'sv-slider')
    slider.style.width = w + 'px'
    slider.style.height = h + 'px'
    const baseImg = cloneCanvasToImg(r.baseline)
    baseImg.style.display = 'block'
    slider.appendChild(baseImg)
    const layer = el('div', 'sv-layer')
    layer.style.width = '50%'
    const actualImg = cloneCanvasToImg(r.actual)
    actualImg.style.width = w + 'px'
    actualImg.style.height = h + 'px'
    layer.appendChild(actualImg)
    slider.appendChild(layer)
    const handle = el('div', 'sv-handle')
    handle.style.left = '50%'
    slider.appendChild(handle)
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
    return slider
  }

  _renderMeta(r) {
    const meta = el('div', 'sv-meta')
    const parts = [`status: ${r.status}`, `duration: ${r.duration.toFixed(0)}ms`]
    if (r.ratio != null) parts.push(`mismatch: ${formatRatio(r.ratio)} (${r.diff} px)`)
    if (r.dimsMatch === false) parts.push('dims differ')
    meta.textContent = parts.join('  ·  ')
    return meta
  }
}

function el(tag, cls) {
  const n = document.createElement(tag)
  if (cls) n.className = cls
  return n
}

function escapeHtml(s) { return String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) }

function formatRatio(r) {
  if (r === 0) return '0%'
  if (r < 0.0001) return '<0.01%'
  return (r * 100).toFixed(2) + '%'
}

function cloneCanvasToImg(canvas) {
  const img = new Image()
  img.src = canvas.toDataURL()
  return img
}
