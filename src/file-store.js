// Filesystem-backed baseline store for vitest browser environments.
// Reads/writes baselines on disk via @vitest/browser/context custom commands
// (registered Node-side; see ../vitest/commands.js).
//
// Note: vitest serializes command args as JSON, so ArrayBuffers can't cross the
// boundary. We base64-encode bytes in both directions.

import { commands } from '@vitest/browser/context'

async function blobToBase64(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < buf.length; i += chunk) {
    binary += String.fromCharCode.apply(null, buf.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function base64ToBlob(base64, type = 'image/png') {
  const binary = atob(base64)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type })
}

export class FileBaselineStore {
  async get(name) {
    const base64 = await commands.svReadBaseline(name)
    if (!base64) return null
    const blob = base64ToBlob(base64)
    return { displayName: name, name, blob, createdAt: 0, metadata: {} }
  }

  async put(name, blob, _meta = {}) {
    const base64 = await blobToBase64(blob)
    return await commands.svWriteBaseline(name, base64)
  }

  async delete(name) {
    await commands.svDeleteBaseline(name)
  }

  async list() {
    const names = await commands.svListBaselines()
    return names.map(name => ({ displayName: name, name, createdAt: 0 }))
  }

  async clear() {
    const names = await commands.svListBaselines()
    for (const n of names) await this.delete(n)
  }

  async writeArtifact(name, kind, blob) {
    const base64 = await blobToBase64(blob)
    return await commands.svWriteArtifact(name, kind, base64)
  }

  async clearArtifacts() {
    await commands.svClearArtifacts()
  }
}
