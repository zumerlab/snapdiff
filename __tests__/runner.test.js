import { describe, it, expect, vi } from 'vitest'
import { createRunner } from '../src/runner.js'

function mockCapture() {
  const toCanvas = vi.fn(async () => document.createElement('canvas'))
  const snapdom = vi.fn(async () => ({ toCanvas }))
  return { snapdom, toCanvas }
}

describe('runner capture options', () => {
  it('keeps portable defaults when global and per-test options are partial', async () => {
    const { snapdom } = mockCapture()
    const globalOptions = { backgroundColor: '#fff', dpr: undefined }
    const testOptions = { width: 100 }
    const runner = createRunner({
      snapdom, store: { get: async () => null }, snapdomOptions: globalOptions,
    })
    const el = document.createElement('div')
    runner.test('card', () => el, { snapdom: testOptions })

    expect((await runner.run())[0].status).toBe('new')
    expect(snapdom).toHaveBeenCalledWith(el, {
      dpr: 1, scale: 1, embedFonts: true, invalidate: true,
      backgroundColor: '#fff', width: 100,
    })
    expect(globalOptions).toEqual({ backgroundColor: '#fff', dpr: undefined })
    expect(testOptions).toEqual({ width: 100 })
  })

  it('respects explicit options and per-test overrides, including opt-outs', async () => {
    const { snapdom } = mockCapture()
    const runner = createRunner({
      snapdom, store: { get: async () => null },
      snapdomOptions: { dpr: 2, scale: 2, embedFonts: true, invalidate: true },
    })
    const el = document.createElement('div')
    runner.test('card', () => el, {
      snapdom: { scale: 3, embedFonts: false, invalidate: false },
    })

    await runner.run()
    expect(snapdom).toHaveBeenCalledWith(el, {
      dpr: 2, scale: 3, embedFonts: false, invalidate: false,
    })
  })

  it('reports exporter errors without recording or hiding them', async () => {
    const { snapdom, toCanvas } = mockCapture()
    const error = new Error('[snapdom] toCanvas needs a render artifact')
    toCanvas.mockRejectedValue(error)
    const store = { get: vi.fn(), put: vi.fn() }
    const runner = createRunner({ snapdom, store })
    runner.test('clone-only plugin', () => document.createElement('div'))

    const [result] = await runner.run()
    expect(result).toMatchObject({ status: 'error', error })
    expect(store.get).not.toHaveBeenCalled()
    expect(store.put).not.toHaveBeenCalled()
  })
})
