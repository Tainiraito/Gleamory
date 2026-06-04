/* ============================================================
 * IndexedDB 缓存层 — 把下好的 ONNX 模型存到浏览器本地
 * 下次打开同源页面,直接从 IDB 读取,不走网络
 * ============================================================ */

import type { ModelInfo } from './modelRegistry'

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
  const res = await fetch(model.downloadUrl, { signal })
  if (!res.ok) throw new Error(`下载失败: HTTP ${res.status} ${res.statusText}`)

  const total = Number(res.headers.get('content-length') ?? model.sizeBytes)
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
