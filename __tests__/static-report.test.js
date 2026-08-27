import { describe, it, expect } from 'vitest'
import { generateStaticReport, mergeResults } from '../src/static-report.js'

describe('generateStaticReport', () => {
  it('produces a complete HTML document', () => {
    const html = generateStaticReport({ title: 'Test', results: [] })
    expect(html).toMatch(/^<!doctype html>/i)
    expect(html).toContain('<title>Test</title>')
    expect(html).toContain('No results.')
  })

  it('renders one card per result', () => {
    const results = [
      { name: 'a', status: 'pass', ratio: 0, diff: 0, dimsMatch: true },
      { name: 'b', status: 'fail', ratio: 0.1, diff: 10, dimsMatch: true },
      { name: 'c', status: 'new' },
    ]
    const html = generateStaticReport({ results })
    expect((html.match(/class="card"/g) || []).length).toBe(3)
    expect(html).toContain('data-name="a"')
    expect(html).toContain('data-name="b"')
    expect(html).toContain('data-name="c"')
  })

  it('strips baseDir prefix from artifact paths', () => {
    const baseDir = '__snapshots__/visual'
    const results = [{
      name: 'hero',
      status: 'fail',
      ratio: 0.05,
      diff: 50,
      dimsMatch: true,
      paths: {
        baseline: '__snapshots__/visual/hero.png',
        actual: '__snapshots__/visual/_artifacts/hero.actual.png',
        diff: '__snapshots__/visual/_artifacts/hero.diff.png',
      },
    }]
    const html = generateStaticReport({ results, baseDir })
    expect(html).toContain('src="hero.png"')
    expect(html).toContain('src="_artifacts/hero.actual.png"')
    expect(html).toContain('src="_artifacts/hero.diff.png"')
    // The full path should NOT appear as src.
    expect(html).not.toMatch(/src="__snapshots__\/visual\//)
  })

  it('escapes HTML in test names', () => {
    const html = generateStaticReport({
      results: [{ name: '<img src=x onerror=alert(1)>', status: 'pass', ratio: 0, diff: 0 }],
    })
    expect(html).not.toContain('<img src=x onerror')
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('shows summary pills only for non-zero counts', () => {
    const results = [
      { name: 'a', status: 'pass', ratio: 0, diff: 0 },
      { name: 'b', status: 'pass', ratio: 0, diff: 0 },
    ]
    const html = generateStaticReport({ results })
    expect(html).toContain('2 pass')
    expect(html).not.toContain('0 fail')
    expect(html).not.toContain('0 error')
  })

  it('renders error stack for error results', () => {
    const results = [{ name: 'flake', status: 'error', error: 'snapdom inject timeout' }]
    const html = generateStaticReport({ results })
    expect(html).toContain('class="error"')
    expect(html).toContain('snapdom inject timeout')
  })
})

describe('mergeResults', () => {
  it('accumulates the slices reported by separate files, ordered by name', () => {
    const merged = mergeResults(
      [{ name: 'd3', status: 'pass' }, { name: 'd1', status: 'pass' }],
      [{ name: 'd2', status: 'fail' }],
    )
    expect(merged.map(r => r.name)).toEqual(['d1', 'd2', 'd3'])
  })

  it('lets a later result replace an earlier one for the same name', () => {
    const merged = mergeResults(
      [{ name: 'hero', status: 'fail' }],
      [{ name: 'hero', status: 'pass' }],
    )
    expect(merged).toEqual([{ name: 'hero', status: 'pass' }])
  })

  it('starts from nothing and ignores entries without a name', () => {
    expect(mergeResults()).toEqual([])
    expect(mergeResults(undefined, [{ status: 'pass' }, null])).toEqual([])
  })
})
