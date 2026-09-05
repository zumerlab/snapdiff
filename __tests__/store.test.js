import { describe, it, expect, beforeEach } from 'vitest'
import { BaselineStore, canvasToBlob, blobToCanvas } from '../src/store.js'

function makeCanvas(w, h, color = '#ff0000') {
  const c = document.createElement('canvas')
  c.width = w; c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
  return c
}

async function freshStore() {
  const ns = `test-${Math.random().toString(36).slice(2, 10)}`
  const store = new BaselineStore(ns)
  await store.clear()
  return store
}

describe('BaselineStore', () => {
  let store
  beforeEach(async () => { store = await freshStore() })

  it('returns null when no baseline exists', async () => {
    expect(await store.get('absent')).toBeNull()
  })

  it('stores and retrieves a baseline', async () => {
    const canvas = makeCanvas(10, 10, '#00ff00')
    const blob = await canvasToBlob(canvas)
    await store.put('hero', blob, { width: 10, height: 10 })

    const rec = await store.get('hero')
    expect(rec).not.toBeNull()
    expect(rec.displayName).toBe('hero')
    expect(rec.width).toBe(10)
    expect(rec.height).toBe(10)
    expect(rec.blob).toBeInstanceOf(Blob)
    expect(rec.blob.type).toBe(blob.type)
    expect(new Uint8Array(await rec.blob.arrayBuffer())).toEqual(new Uint8Array(await blob.arrayBuffer()))
    expect(rec).not.toHaveProperty('blobType')
  })

  it('lists every baseline in the namespace', async () => {
    await store.put('a', await canvasToBlob(makeCanvas(5, 5)))
    await store.put('b', await canvasToBlob(makeCanvas(5, 5)))
    await store.put('c', await canvasToBlob(makeCanvas(5, 5)))
    const list = await store.list()
    expect(list.map(r => r.displayName).sort()).toEqual(['a', 'b', 'c'])
  })

  it('deletes a baseline', async () => {
    await store.put('hero', await canvasToBlob(makeCanvas(5, 5)))
    expect(await store.get('hero')).not.toBeNull()
    await store.delete('hero')
    expect(await store.get('hero')).toBeNull()
  })

  it('namespaces baselines independently', async () => {
    const otherStore = new BaselineStore('other-ns-' + Math.random())
    await otherStore.clear()

    await store.put('shared', await canvasToBlob(makeCanvas(5, 5)))
    expect(await otherStore.get('shared')).toBeNull()
    expect(await store.get('shared')).not.toBeNull()

    await otherStore.clear()
  })

  it('round-trips via export/import', async () => {
    await store.put('a', await canvasToBlob(makeCanvas(5, 5, '#ff0000')))
    await store.put('b', await canvasToBlob(makeCanvas(5, 5, '#00ff00')))

    const bundle = await store.export()
    expect(bundle.items.length).toBe(2)

    const dest = await freshStore()
    const result = await dest.import(bundle)
    expect(result.added).toBe(2)
    expect(result.skipped).toBe(0)

    const list = await dest.list()
    expect(list.map(r => r.displayName).sort()).toEqual(['a', 'b'])
  })

  it('skips existing entries on import unless overwrite is set', async () => {
    await store.put('a', await canvasToBlob(makeCanvas(5, 5)))
    const bundle = await store.export()

    const result1 = await store.import(bundle)
    expect(result1.skipped).toBe(1)
    expect(result1.added).toBe(0)

    const result2 = await store.import(bundle, { overwrite: true })
    expect(result2.added).toBe(1)
  })
})

describe('canvas <-> blob round-trip', () => {
  it('preserves pixel data', async () => {
    const original = makeCanvas(8, 8, '#3366cc')
    const blob = await canvasToBlob(original)
    const restored = await blobToCanvas(blob)
    expect(restored.width).toBe(8)
    expect(restored.height).toBe(8)

    const ctx = restored.getContext('2d')
    const px = ctx.getImageData(0, 0, 1, 1).data
    expect(px[0]).toBe(0x33)
    expect(px[1]).toBe(0x66)
    expect(px[2]).toBe(0xcc)
  })
})
