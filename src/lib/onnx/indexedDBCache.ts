/* ============================================================
 * IndexedDB 缓存层 — 把下好的 ONNX 模型存到浏览器本地
 * 下次打开同源页面,直接从 IDB 读取,不走网络
 * ============================================================ */

import type { ModelInfo } from './modelRegistry'
import { validateModelBuffer } from './modelBufferValidation'

const DB_NAME = 'gleamory-audio-separator'
const DB_VERSION = 1
const STORE_MODELS = 'models'
const STORE_META = 'model-meta'

/** 打开数据库,首次自动建表 */
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_MODELS)) {
        db.createObjectStore(STORE_MODELS)
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** 检查模型是否已缓存 */
export async function isModelCached(id: string): Promise<boolean> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MODELS, 'readonly')
    const store = tx.objectStore(STORE_MODELS)
    const req = store.getKey(id)
    req.onsuccess = () => resolve(req.result !== undefined)
    req.onerror = () => reject(req.error)
  })
}

/** 读取已缓存的模型 ArrayBuffer */
export async function getCachedModel(id: string): Promise<ArrayBuffer | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_MODELS, 'readonly')
    const store = tx.objectStore(STORE_MODELS)
    const req = store.get(id)
    req.onsuccess = () => resolve((req.result as ArrayBuffer) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function getValidatedCachedModel(model: ModelInfo): Promise<ArrayBuffer | null> {
  const buffer = await getCachedModel(model.id)
  if (!buffer) return null
  try {
    validateModelBuffer(model, buffer)
    return buffer
  } catch {
    await deleteCachedModel(model.id)
    return null
  }
}

export async function isModelCacheUsable(model: ModelInfo): Promise<boolean> {
  return (await getValidatedCachedModel(model)) != null
}

/** 把模型 ArrayBuffer 写入缓存 */
export async function setCachedModel(id: string, buffer: ArrayBuffer): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MODELS, STORE_META], 'readwrite')
    const store = tx.objectStore(STORE_MODELS)
    store.put(buffer, id)
    const metaStore = tx.objectStore(STORE_META)
    metaStore.put({
      id,
      sizeBytes: buffer.byteLength,
      cachedAt: new Date().toISOString(),
    })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** 删除缓存模型 */
export async function deleteCachedModel(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MODELS, STORE_META], 'readwrite')
    tx.objectStore(STORE_MODELS).delete(id)
    tx.objectStore(STORE_META).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** 列出所有已缓存的模型 id + 大小 + 时间 */
export interface CachedModelMeta {
  id: string
  sizeBytes: number
  cachedAt: string
}
export async function listCachedModels(): Promise<CachedModelMeta[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_META, 'readonly')
    const req = tx.objectStore(STORE_META).getAll()
    req.onsuccess = () => resolve((req.result as CachedModelMeta[]) ?? [])
    req.onerror = () => reject(req.error)
  })
}

/** 估算总缓存大小 */
export async function getCacheSizeBytes(): Promise<number> {
  const metas = await listCachedModels()
  return metas.reduce((sum, m) => sum + m.sizeBytes, 0)
}

export async function assertEnoughStorageForModel(model: ModelInfo): Promise<void> {
  const estimate = await navigator.storage?.estimate?.()
  if (!estimate?.quota) return

  const used = estimate.usage ?? await getCacheSizeBytes()
  const projected = used + model.sizeBytes
  // 给 IndexedDB 元数据、浏览器开销和 WASM 缓存留一点余量。
  const reserveBytes = 64 * 1024 * 1024
  if (projected + reserveBytes > estimate.quota) {
    throw new Error(
      `浏览器存储空间不足: 需要约 ${(model.sizeBytes / 1024 / 1024).toFixed(0)} MB, 当前可用约 ${Math.max(0, (estimate.quota - used) / 1024 / 1024).toFixed(0)} MB`,
    )
  }
}

/** 清空全部模型缓存 */
export async function clearAllCache(): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_MODELS, STORE_META], 'readwrite')
    tx.objectStore(STORE_MODELS).clear()
    tx.objectStore(STORE_META).clear()
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * 用 fetch + 流式进度下载模型,带取消支持。
 * 返回的 promise resolve 到 ArrayBuffer;reject 包含 'cancelled' 字样表示取消。
 */
export async function downloadModel(
  model: ModelInfo,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const urls = model.downloadUrls?.length ? model.downloadUrls : [model.downloadUrl]
  const errors: string[] = []

  for (const url of urls) {
    try {
      const buffer = await downloadModelFromUrl(url, model.sizeBytes, onProgress, signal)
      validateModelBuffer(model, buffer)
      return buffer
    } catch (error) {
      if (signal?.aborted) throw error
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  throw new Error(`下载失败,所有来源均不可用: ${errors.join(' | ')}`)
}

async function downloadModelFromUrl(
  url: string,
  expectedSizeBytes: number,
  onProgress?: (loaded: number, total: number) => void,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)

  const total = Number(res.headers.get('content-length') ?? expectedSizeBytes)
  const reader = res.body?.getReader()
  if (!reader) throw new Error('浏览器不支持流式读取')

  const chunks: Uint8Array[] = []
  let loaded = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    loaded += value.byteLength
    onProgress?.(loaded, total)
    if (signal?.aborted) {
      reader.cancel()
      throw new Error('download cancelled')
    }
  }

  // 合并
  const buf = new Uint8Array(loaded)
  let offset = 0
  for (const c of chunks) {
    buf.set(c, offset)
    offset += c.byteLength
  }
  return buf.buffer
}
