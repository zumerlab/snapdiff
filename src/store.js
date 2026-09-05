// IndexedDB-backed baseline store. Each baseline is keyed by test name and
// holds the PNG blob + metadata. Deliberately a thin wrapper — no schema
// migrations beyond the single object store, no transactions queue.

const DB_NAME = 'snapDiff'
const DB_VERSION = 1
const STORE = 'baselines'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'name' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx(db, mode) { return db.transaction(STORE, mode).objectStore(STORE) }

function awaitReq(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// WebKit can reject Blob/File persistence with "Error preparing Blob/File data".
// Store PNG bytes and restore the public Blob on reads. Existing Blob records
// remain readable without a destructive database migration.
function publicRecord(record) {
  if (!record) return null
  if (record.blob instanceof ArrayBuffer) {
    const { blobType, ...rest } = record
    return { ...rest, blob: new Blob([record.blob], { type: blobType || 'image/png' }) }
  }
  return record
}

export class BaselineStore {
  constructor(namespace = 'default') { this.namespace = namespace }

  async _key(name) { return `${this.namespace}::${name}` }

  async put(name, blob, meta = {}) {
    const bytes = await blob.arrayBuffer()
    const db = await openDB()
    const record = {
      name: await this._key(name),
      displayName: name,
      namespace: this.namespace,
      blob: bytes,
      blobType: blob.type,
      width: meta.width,
      height: meta.height,
      createdAt: Date.now(),
      metadata: meta.metadata ?? {},
    }
    try { await awaitReq(tx(db, 'readwrite').put(record)) }
    finally { db.close() }
    return publicRecord(record)
  }

  async get(name) {
    const db = await openDB()
    const rec = await awaitReq(tx(db, 'readonly').get(await this._key(name)))
    db.close()
    return publicRecord(rec)
  }

  async delete(name) {
    const db = await openDB()
    await awaitReq(tx(db, 'readwrite').delete(await this._key(name)))
    db.close()
  }

  async list() {
    const db = await openDB()
    const all = await awaitReq(tx(db, 'readonly').getAll())
    db.close()
    return all.filter(r => r.namespace === this.namespace).map(publicRecord)
  }

  async clear() {
    const all = await this.list()
    for (const r of all) await this.delete(r.displayName)
  }

  async export() {
    const records = await this.list()
    const items = await Promise.all(records.map(async r => ({
      name: r.displayName,
      width: r.width,
      height: r.height,
      createdAt: r.createdAt,
      metadata: r.metadata,
      data: await blobToBase64(r.blob),
    })))
    return { namespace: this.namespace, items, exportedAt: Date.now() }
  }

  async import(bundle, { overwrite = false } = {}) {
    if (!bundle?.items) throw new Error('Invalid bundle')
    let added = 0, skipped = 0
    for (const item of bundle.items) {
      if (!overwrite && await this.get(item.name)) { skipped++; continue }
      const blob = await base64ToBlob(item.data)
      await this.put(item.name, blob, { width: item.width, height: item.height, metadata: item.metadata })
      added++
    }
    return { added, skipped }
  }
}

export async function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('toBlob failed')), type, quality)
  })
}

export async function blobToCanvas(blob) {
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.decoding = 'sync'
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext('2d').drawImage(img, 0, 0)
    return c
  } finally { URL.revokeObjectURL(url) }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(fr.result)
    fr.onerror = () => reject(fr.error)
    fr.readAsDataURL(blob)
  })
}

async function base64ToBlob(dataURL) {
  const res = await fetch(dataURL)
  return res.blob()
}
