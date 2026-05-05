// Loads a demo HTML in a same-origin iframe, injects snapdom, runs capture.

export async function captureFromIframe(iframe, url, opts = {}) {
  const {
    target = ['#target', 'body'],
    wait = 0,
    snapdomUrl = '/dist/snapdom.mjs',
    snapdomOptions = {},
    setup,                  // optional (win, doc) => Promise<void> – runs after load
  } = opts

  // Two-phase navigate: force the previous demo to fully unload before loading
  // the new one. Without this, fast back-to-back navigations can leak content
  // (the iframe was capturing the previous demo for some URLs).
  await navigateIframe(iframe, 'about:blank')
  await navigateIframe(iframe, url)
  // Sanity check — fail loudly if the iframe somehow still points elsewhere.
  const loadedURL = iframe.contentDocument?.URL || ''
  if (!loadedURL.endsWith(url) && !loadedURL.includes(url)) {
    throw new Error(`Iframe loaded "${loadedURL}" but expected "${url}". Aborting capture.`)
  }
  // Let the browser paint at least once before measuring.
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  if (wait) await sleep(wait)
  if (setup) await setup(iframe.contentWindow, iframe.contentDocument)

  await injectSnapdom(iframe, snapdomUrl)

  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  const selectors = Array.isArray(target) ? target : [target]
  let el = null, matched = null
  for (const sel of selectors) {
    el = doc.querySelector(sel)
    if (el) { matched = sel; break }
  }
  if (!el) throw new Error(`No target found in ${url}. Tried: ${selectors.join(', ')}. Add an override in demoOptions["${baseName(url)}"].target.`)

  // Run snapdom inside the iframe so styles/fonts are read from its document.
  const result = await win.__snapDiffSnapdom__(el, snapdomOptions)
  const canvas = await result.toCanvas()
  canvas.dataset && (canvas.dataset.target = matched)
  return canvas
}

function baseName(url) {
  const m = String(url).match(/([^/\\]+?)(?:\.html?)?$/i)
  return m ? m[1] : String(url)
}

function navigateIframe(iframe, url) {
  return new Promise((resolve, reject) => {
    const onLoad = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); reject(new Error(`Failed to load ${url}`)) }
    function cleanup() {
      iframe.removeEventListener('load', onLoad)
      iframe.removeEventListener('error', onError)
    }
    iframe.addEventListener('load', onLoad)
    iframe.addEventListener('error', onError)
    iframe.src = url
  })
}

function injectSnapdom(iframe, snapdomUrl) {
  const win = iframe.contentWindow
  const doc = iframe.contentDocument
  if (win.__snapDiffSnapdom__) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`snapdom inject timeout (${snapdomUrl})`)), 8000)
    const onReady = () => {
      clearTimeout(timer)
      win.removeEventListener('__snapDiffReady__', onReady)
      resolve()
    }
    win.addEventListener('__snapDiffReady__', onReady, { once: true })
    const script = doc.createElement('script')
    script.type = 'module'
    script.textContent = `
      import { snapdom } from ${JSON.stringify(snapdomUrl)}
      window.__snapDiffSnapdom__ = snapdom
      window.dispatchEvent(new Event('__snapDiffReady__'))
    `
    doc.head.appendChild(script)
  })
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }
