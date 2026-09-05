// Shared capture policy for the in-page runner and the iframe suite.
// Keep these defaults even when a caller supplies only some snapdom options.
const defaults = { dpr: 1, scale: 1, embedFonts: true, invalidate: true }

export async function captureCanvas(snapdom, element, options = {}) {
  const merged = { ...options }
  for (const [key, value] of Object.entries(defaults)) merged[key] ??= value

  // V3 memoizes repeat captures. Invalidate by default so CSSOM edits (which
  // MutationObserver cannot see) are included in every visual comparison.
  const result = await snapdom(element, merged)

  // V3 can reuse options.canvas. Each result must own its bitmap or a later
  // capture could overwrite an earlier actual image before review/approval.
  return await result.toCanvas({ canvas: null })
}
