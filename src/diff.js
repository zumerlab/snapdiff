// Perceptual pixel diff with anti-aliasing detection.
// Algorithm based on Yiq color delta (Kotsarenko & Ramos 2010), as popularized
// by mapbox/pixelmatch. Reimplemented from scratch, no runtime dependency.

const MAX_YIQ = 35215 // 0.5053*255^2 + 0.299*255^2 + 0.1957*255^2

function rgb2y(r, g, b) { return r * 0.29889531 + g * 0.58662247 + b * 0.11448223 }
function rgb2i(r, g, b) { return r * 0.59597799 - g * 0.27417610 - b * 0.32180189 }
function rgb2q(r, g, b) { return r * 0.21147017 - g * 0.52261711 + b * 0.31114694 }

function colorDelta(a, b, ai, bi, yOnly) {
  let r1 = a[ai], g1 = a[ai + 1], b1 = a[ai + 2], a1 = a[ai + 3]
  let r2 = b[bi], g2 = b[bi + 1], b2 = b[bi + 2], a2 = b[bi + 3]
  if (a1 === a2 && r1 === r2 && g1 === g2 && b1 === b2) return 0
  if (a1 < 255) { a1 /= 255; r1 = blend(r1, a1); g1 = blend(g1, a1); b1 = blend(b1, a1) }
  if (a2 < 255) { a2 /= 255; r2 = blend(r2, a2); g2 = blend(g2, a2); b2 = blend(b2, a2) }
  const y1 = rgb2y(r1, g1, b1), y2 = rgb2y(r2, g2, b2), dy = y1 - y2
  if (yOnly) return dy
  const di = rgb2i(r1, g1, b1) - rgb2i(r2, g2, b2)
  const dq = rgb2q(r1, g1, b1) - rgb2q(r2, g2, b2)
  const delta = 0.5053 * dy * dy + 0.299 * di * di + 0.1957 * dq * dq
  return y1 > y2 ? -delta : delta
}

function blend(c, a) { return 255 + (c - 255) * a }

// Heuristic from pixelmatch: a pixel is likely AA if at least 3 of its 8 siblings
// share its color, AND it has a sibling with max color contrast that is not in a
// long line. We accept the simplified two-pass form.
function antialiased(img, x1, y1, w, h, img2) {
  const x0 = Math.max(x1 - 1, 0)
  const y0 = Math.max(y1 - 1, 0)
  const x2 = Math.min(x1 + 1, w - 1)
  const y2 = Math.min(y1 + 1, h - 1)
  const pos = (y1 * w + x1) * 4
  let zeroes = (x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2) ? 1 : 0
  let min = 0, max = 0, minX = 0, minY = 0, maxX = 0, maxY = 0
  for (let x = x0; x <= x2; x++) for (let y = y0; y <= y2; y++) {
    if (x === x1 && y === y1) continue
    const delta = colorDelta(img, img, pos, (y * w + x) * 4, true)
    if (delta === 0) { if (++zeroes > 2) return false }
    else if (delta < min) { min = delta; minX = x; minY = y }
    else if (delta > max) { max = delta; maxX = x; maxY = y }
  }
  if (min === 0 || max === 0) return false
  return (
    (hasManySiblings(img, minX, minY, w, h) && hasManySiblings(img2, minX, minY, w, h)) ||
    (hasManySiblings(img, maxX, maxY, w, h) && hasManySiblings(img2, maxX, maxY, w, h))
  )
}

function hasManySiblings(img, x1, y1, w, h) {
  const x0 = Math.max(x1 - 1, 0)
  const y0 = Math.max(y1 - 1, 0)
  const x2 = Math.min(x1 + 1, w - 1)
  const y2 = Math.min(y1 + 1, h - 1)
  const pos = (y1 * w + x1) * 4
  let zeroes = (x1 === x0 || x1 === x2 || y1 === y0 || y1 === y2) ? 1 : 0
  for (let x = x0; x <= x2; x++) for (let y = y0; y <= y2; y++) {
    if (x === x1 && y === y1) continue
    const p2 = (y * w + x) * 4
    if (img[pos] === img[p2] && img[pos + 1] === img[p2 + 1] &&
        img[pos + 2] === img[p2 + 2] && img[pos + 3] === img[p2 + 3]) {
      if (++zeroes > 2) return true
    }
  }
  return false
}

function drawPixel(out, pos, r, g, b) {
  out[pos] = r; out[pos + 1] = g; out[pos + 2] = b; out[pos + 3] = 255
}

function drawGrayPixel(img, i, alpha, out) {
  const r = img[i], g = img[i + 1], b = img[i + 2]
  const v = blend(rgb2y(r, g, b), alpha * img[i + 3] / 255)
  drawPixel(out, i, v, v, v)
}

/**
 * Compare two RGBA pixel buffers.
 * @param {Uint8ClampedArray|Uint8Array} a baseline pixels
 * @param {Uint8ClampedArray|Uint8Array} b actual pixels
 * @param {Uint8ClampedArray|Uint8Array|null} out diff output buffer (RGBA), or null to skip rendering
 * @param {number} w width in px
 * @param {number} h height in px
 * @param {object} opts
 * @returns {{diff:number,total:number,ratio:number}} number of mismatched pixels & ratio (0..1)
 */
export function diffPixels(a, b, out, w, h, opts = {}) {
  if (a.length !== b.length) throw new Error('Image data must have the same dimensions')
  const threshold = opts.threshold ?? 0.1
  const includeAA = !!opts.includeAA
  const alpha = opts.alpha ?? 0.1
  const aaColor = opts.aaColor ?? [255, 255, 0]
  const diffColor = opts.diffColor ?? [255, 0, 0]
  const diffMask = !!opts.diffMask
  const maxDelta = MAX_YIQ * threshold * threshold
  const total = w * h
  let mismatches = 0

  // fast path: identical buffers
  if (a.length === b.length) {
    let identical = true
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { identical = false; break }
    if (identical) {
      if (out && !diffMask) for (let i = 0; i < total * 4; i += 4) drawGrayPixel(a, i, alpha, out)
      return { diff: 0, total, ratio: 0 }
    }
  }

  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const pos = (y * w + x) * 4
    const delta = colorDelta(a, b, pos, pos, false)
    if (Math.abs(delta) > maxDelta) {
      if (!includeAA && (antialiased(a, x, y, w, h, b) || antialiased(b, x, y, w, h, a))) {
        if (out && !diffMask) drawPixel(out, pos, aaColor[0], aaColor[1], aaColor[2])
      } else {
        if (out) drawPixel(out, pos, diffColor[0], diffColor[1], diffColor[2])
        mismatches++
      }
    } else if (out && !diffMask) {
      drawGrayPixel(a, pos, alpha, out)
    }
  }
  return { diff: mismatches, total, ratio: mismatches / total }
}

/**
 * Diff two HTMLCanvasElements and return a result canvas + stats.
 * Canvases must have identical dimensions; if they don't we letterbox the
 * smaller one onto the larger and report dimension mismatch in the result.
 */
export function diffCanvas(baseline, actual, opts = {}) {
  const w = Math.max(baseline.width, actual.width)
  const h = Math.max(baseline.height, actual.height)
  const dimsMatch = baseline.width === actual.width && baseline.height === actual.height
  const aBuf = readPixels(baseline, w, h)
  const bBuf = readPixels(actual, w, h)
  const out = document.createElement('canvas')
  out.width = w; out.height = h
  const outCtx = out.getContext('2d')
  const outImg = outCtx.createImageData(w, h)
  const stats = diffPixels(aBuf, bBuf, outImg.data, w, h, opts)
  outCtx.putImageData(outImg, 0, 0)
  return {
    ...stats,
    width: w,
    height: h,
    dimsMatch,
    canvas: out,
  }
}

function readPixels(canvas, w, h) {
  if (canvas.width === w && canvas.height === h) {
    return canvas.getContext('2d').getImageData(0, 0, w, h).data
  }
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.drawImage(canvas, 0, 0)
  return ctx.getImageData(0, 0, w, h).data
}
