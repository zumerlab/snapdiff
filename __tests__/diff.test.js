import { describe, it, expect } from 'vitest'
import { diffPixels, diffCanvas } from '../src/diff.js'

function makePixels(w, h, fn) {
  const buf = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4
    const [r, g, b, a] = fn(x, y)
    buf[i] = r; buf[i + 1] = g; buf[i + 2] = b; buf[i + 3] = a
  }
  return buf
}

function fill(w, h, color) { return makePixels(w, h, () => color) }

describe('diffPixels', () => {
  it('returns 0 mismatches when buffers are identical', () => {
    const a = fill(20, 20, [255, 0, 0, 255])
    const b = fill(20, 20, [255, 0, 0, 255])
    const result = diffPixels(a, b, null, 20, 20)
    expect(result).toEqual({ diff: 0, total: 400, ratio: 0 })
  })

  it('flags every pixel when buffers are inverted', () => {
    const a = fill(10, 10, [255, 255, 255, 255])
    const b = fill(10, 10, [0, 0, 0, 255])
    const result = diffPixels(a, b, null, 10, 10)
    expect(result.diff).toBe(100)
    expect(result.ratio).toBe(1)
  })

  it('suppresses sub-threshold differences', () => {
    const a = fill(10, 10, [128, 128, 128, 255])
    const b = fill(10, 10, [129, 128, 128, 255])
    const result = diffPixels(a, b, null, 10, 10, { threshold: 0.1 })
    expect(result.diff).toBe(0)
  })

  it('counts only the changed region', () => {
    const a = fill(40, 40, [255, 255, 255, 255])
    const b = makePixels(40, 40, (x, y) => (
      x >= 10 && x < 30 && y >= 10 && y < 30
        ? [255, 0, 0, 255]
        : [255, 255, 255, 255]
    ))
    const result = diffPixels(a, b, null, 40, 40)
    // 20x20 = 400 changed pixels.
    expect(result.diff).toBe(400)
    expect(result.ratio).toBeCloseTo(0.25, 5)
  })

  it('writes a diff buffer when out is provided', () => {
    const a = fill(4, 4, [0, 0, 0, 255])
    const b = fill(4, 4, [255, 255, 255, 255])
    const out = new Uint8ClampedArray(4 * 4 * 4)
    diffPixels(a, b, out, 4, 4)
    // Every pixel becomes red (diffColor default).
    for (let i = 0; i < out.length; i += 4) {
      expect(out[i]).toBe(255)
      expect(out[i + 1]).toBe(0)
      expect(out[i + 2]).toBe(0)
      expect(out[i + 3]).toBe(255)
    }
  })

  it('treats lowered threshold as stricter', () => {
    const a = fill(10, 10, [100, 100, 100, 255])
    const b = fill(10, 10, [110, 110, 110, 255])
    const lenient = diffPixels(a, b, null, 10, 10, { threshold: 0.5 })
    const strict = diffPixels(a, b, null, 10, 10, { threshold: 0.01 })
    expect(strict.diff).toBeGreaterThan(lenient.diff)
  })

  it('throws when buffers have different lengths', () => {
    const a = fill(10, 10, [0, 0, 0, 255])
    const b = fill(8, 8, [0, 0, 0, 255])
    expect(() => diffPixels(a, b, null, 10, 10)).toThrow(/same dimensions/i)
  })
})

describe('diffCanvas', () => {
  function canvasOf(w, h, color) {
    const c = document.createElement('canvas')
    c.width = w; c.height = h
    const ctx = c.getContext('2d')
    ctx.fillStyle = color
    ctx.fillRect(0, 0, w, h)
    return c
  }

  it('returns identical-shaped result canvas with stats', () => {
    const a = canvasOf(40, 30, '#ffffff')
    const b = canvasOf(40, 30, '#ffffff')
    const result = diffCanvas(a, b)
    expect(result.width).toBe(40)
    expect(result.height).toBe(30)
    expect(result.dimsMatch).toBe(true)
    expect(result.diff).toBe(0)
    expect(result.canvas).toBeInstanceOf(HTMLCanvasElement)
  })

  it('flags dimension mismatch and letterboxes to the larger size', () => {
    const a = canvasOf(40, 30, '#ffffff')
    const b = canvasOf(50, 40, '#ffffff')
    const result = diffCanvas(a, b)
    expect(result.dimsMatch).toBe(false)
    expect(result.width).toBe(50)
    expect(result.height).toBe(40)
  })

  it('detects a real visual difference', () => {
    const a = canvasOf(30, 30, '#ffffff')
    const b = canvasOf(30, 30, '#000000')
    const result = diffCanvas(a, b)
    expect(result.ratio).toBe(1)
  })
})
