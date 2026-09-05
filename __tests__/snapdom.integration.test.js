/* global __SNAPDOM_TEST_URL__ */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { snapdom } from '#snapdom-under-test'
import { bootstrap } from '../src/auto.js'
import { createRunner } from '../src/runner.js'
import { BaselineStore } from '../src/store.js'
import { captureFromIframe } from '../vitest/iframe-capture.js'

const nodes = []
const stores = []
const bootstraps = []
const v3 = Number.parseInt(snapdom.version, 10) >= 3
const fixtureUrl = '/__tests__/fixtures/snapdom-capture.html'

function append(node, parent = document.body) {
  parent.appendChild(node)
  nodes.push(node)
  return node
}

function target(color = 'rgb(27, 107, 196)') {
  const el = document.createElement('div')
  el.style.cssText = `width:96px;height:48px;background:${color}`
  return append(el)
}

function store() {
  const result = new BaselineStore(`snapdom-integration-${crypto.randomUUID()}`)
  stores.push(result)
  return result
}

function runner(options = {}) {
  return createRunner({ snapdom, store: store(), ...options })
}

function pixel(canvas) {
  return [...canvas.getContext('2d').getImageData(8, 8, 1, 1).data]
}

function iframe() {
  const frame = document.createElement('iframe')
  frame.style.cssText = 'width:1280px;height:1024px;border:0;position:absolute;left:-10000px'
  return append(frame)
}

async function auto(options = {}) {
  const baselineStore = store()
  const result = await bootstrap({
    namespace: baselineStore.namespace,
    selector: '[data-snap-integration]',
    snapdomOptions: { backgroundColor: '#ffffff' },
    ...options,
  })
  expect(result).not.toBeNull()
  bootstraps.push(result)
  return result
}

afterEach(async () => {
  for (const app of bootstraps.splice(0)) {
    app.reporter()?.unmount()
    app.fab?.remove()
  }
  for (const node of nodes.splice(0)) node.remove()
  await Promise.all(stores.splice(0).map(s => s.clear()))
  vi.unstubAllGlobals()
})

describe(`real snapDOM ${snapdom.version ?? '2.x'} integration`, () => {
  it('records, compares and detects inline style changes with portable partial options', async () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const el = target()
    const suite = runner({ snapdomOptions: { backgroundColor: '#ffffff' } })
    suite.test('card', () => el)

    const [first] = await suite.run()
    expect(first.status, first.error?.message).toBe('new')
    expect([first.actual.width, first.actual.height]).toEqual([96, 48])
    expect(pixel(first.actual)).toEqual([27, 107, 196, 255])
    await suite.approve('card', first.actual)
    const [unchanged] = await suite.run()
    expect(unchanged.status, unchanged.error?.message).toBe('pass')
    expect(unchanged.diff).toBe(0)

    el.style.backgroundColor = 'rgb(220, 40, 60)'
    const [changed] = await suite.run()
    expect(changed.status, changed.error?.message).toBe('fail')
    expect(changed.dimsMatch).toBe(true)
    expect(changed.ratio).toBeGreaterThan(0.9)
  })

  it.skipIf(!v3)('detects CSSOM edits that do not emit DOM mutations', async () => {
    const style = append(document.createElement('style'), document.head)
    style.textContent = '.snapdom-cssom-target { background-color: rgb(27, 107, 196) }'
    const el = target()
    el.style.removeProperty('background')
    el.className = 'snapdom-cssom-target'
    const suite = runner()
    suite.test('stylesheet', () => el)
    const [first] = await suite.run()
    expect(first.status, first.error?.message).toBe('new')
    await suite.approve('stylesheet', first.actual)
    expect((await suite.run())[0].status).toBe('pass')

    // insertRule is invisible to MutationObserver and V3's automatic burst cache.
    style.sheet.insertRule('.snapdom-cssom-target { background-color: rgb(220, 40, 60) }', 1)
    const [changed] = await suite.run()
    expect(changed.status, changed.error?.message).toBe('fail')
    expect(pixel(changed.actual)).toEqual([220, 40, 60, 255])
  })

  it('preserves per-test scale overrides alongside the default DPR', async () => {
    vi.stubGlobal('devicePixelRatio', 2)
    const el = target()
    const suite = runner({ snapdomOptions: { backgroundColor: '#ffffff' } })
    suite.test('scaled', () => el, { snapdom: { scale: 2 } })
    const [result] = await suite.run()
    expect(result.status, result.error?.message).toBe('new')
    expect([result.actual.width, result.actual.height]).toEqual([192, 96])
  })

  it.skipIf(!v3)('honors V3 width sizing when scale is also supplied', async () => {
    const el = target()
    const suite = runner({ snapdomOptions: { width: 40, scale: 2 } })
    suite.test('width', () => el)
    const [result] = await suite.run()
    expect(result.status, result.error?.message).toBe('new')
    expect([result.actual.width, result.actual.height]).toEqual([40, 20])
  })

  it('retains independent result pixels when a reusable canvas was supplied', async () => {
    const reusable = document.createElement('canvas')
    reusable.width = 96
    reusable.height = 48
    const red = target('rgb(220, 40, 60)')
    const blue = target()
    const suite = runner({ snapdomOptions: { canvas: reusable } })
    suite.test('red', () => red)
    suite.test('blue', () => blue)
    const [first, second] = await suite.run()
    expect(first.status, first.error?.message).toBe('new')
    expect(second.status, second.error?.message).toBe('new')
    expect(first.actual).not.toBe(second.actual)
    expect(first.actual).not.toBe(reusable)
    expect(second.actual).not.toBe(reusable)
    expect(pixel(first.actual)).toEqual([220, 40, 60, 255])
    expect(pixel(second.actual)).toEqual([27, 107, 196, 255])
  })

  it('captures inside the iframe document and preserves its responsive viewport', async () => {
    const frame = iframe()
    const canvas = await captureFromIframe(frame, fixtureUrl, {
      snapdomUrl: __SNAPDOM_TEST_URL__,
      snapdomOptions: { backgroundColor: '#ffffff' },
      setup: (win) => Object.defineProperty(win, 'devicePixelRatio', { value: 2, configurable: true }),
    })
    expect([canvas.width, canvas.height]).toEqual([120, 48])
    expect(canvas.dataset.target).toBe('#target')
    expect(pixel(canvas)).toEqual([27, 107, 196, 255])
  }, 15000)

  it('reloads iframe captures before applying a new setup', async () => {
    const frame = iframe()
    const options = { snapdomUrl: __SNAPDOM_TEST_URL__ }
    const before = await captureFromIframe(frame, fixtureUrl, options)
    // Consume the canvas while its owning iframe document is still alive,
    // just as the demo suite writes artifacts before moving to the next page.
    expect(pixel(before)).toEqual([27, 107, 196, 255])
    const after = await captureFromIframe(frame, fixtureUrl, {
      ...options,
      setup: (_win, doc) => { doc.querySelector('#target').style.backgroundColor = 'rgb(220, 40, 60)' },
    })
    expect(pixel(after)).toEqual([220, 40, 60, 255])
  }, 15000)

  it.each(['supplied', 'dynamic'])('bootstraps and compares with the %s real module', async (source) => {
    vi.stubGlobal('devicePixelRatio', 2)
    const el = target()
    el.setAttribute('data-snap', 'auto-card')
    el.setAttribute('data-snap-integration', '')
    const app = await auto(source === 'supplied' ? { snapdom } : { snapdomUrl: __SNAPDOM_TEST_URL__ })
    const [unchanged] = await app.runner.run()
    expect(unchanged.status, unchanged.error?.message).toBe('pass')
    expect([unchanged.actual.width, unchanged.actual.height]).toEqual([96, 48])
    el.style.backgroundColor = 'rgb(220, 40, 60)'
    const [changed] = await app.runner.run()
    expect(changed.status, changed.error?.message).toBe('fail')
  })
})
