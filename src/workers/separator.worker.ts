/* ============================================================
 * Web Worker — 跑音轨分离推理
 * 主线程 → postMessage({type, payload}) → worker 异步处理 → postMessage 结果
 * ============================================================ */

/// <reference lib="webworker" />

import { createSession, tensor, type SessionHandle } from '../lib/onnx/backend'
import { getModelById, type StemKey } from '../lib/onnx/modelRegistry'
import { isModelCached, getCachedModel, downloadModel, setCachedModel } from '../lib/onnx/indexedDBCache'

/* ----------- 消息协议 ----------- */

export type WorkerRequest =
  | { type: 'check-cache'; modelIds: string[] }
  | {
      type: 'download-model'
      modelId: string
    }
  | {
      type: 'separate'
      /** 多个 44100Hz Float32 PCM 通道,交错 = [L, R, L, R, ...] */
      audio: Float32Array
      sampleRate: number
      modelIds: string[]
    }
  | { type: 'cancel' }

export type WorkerResponse =
  | { type: 'cache-status'; cached: Record<string, boolean> }
  | { type: 'download-progress'; modelId: string; loaded: number; total: number }
  | { type: 'download-complete'; modelId: string }
  | {
      type: 'separate-progress'
      phase: 'loading' | 'inference' | 'postprocessing'
      current: number
      total: number
    }
  | {
      type: 'separate-complete'
      stems: Record<StemKey, Float32Array>
    }
  | { type: 'error'; message: string }
  | { type: 'cancelled' }

/* ----------- 状态 ----------- */

let currentAbortController: AbortController | null = null
const loadedSessions: Map<string, SessionHandle> = new Map()

/* ----------- Worker 消息处理 ----------- */

self.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  try {
    if (msg.type === 'check-cache') {
      const cached: Record<string, boolean> = {}
      for (const id of msg.modelIds) {
        cached[id] = await isModelCached(id)
      }
      post({ type: 'cache-status', cached })
      return
    }

    if (msg.type === 'download-model') {
      const model = getModelById(msg.modelId)
      if (!model) throw new Error(`未知模型: ${msg.modelId}`)

      // 已缓存就跳过
      if (await isModelCached(model.id)) {
        post({ type: 'download-complete', modelId: model.id })
        return
      }

      // 下载
      currentAbortController = new AbortController()
      const buf = await downloadModel(
        model,
        (loaded, total) => post({ type: 'download-progress', modelId: model.id, loaded, total }),
        currentAbortController.signal,
      )
      await setCachedModel(model.id, buf)
      currentAbortController = null
      post({ type: 'download-complete', modelId: model.id })
      return
    }

    if (msg.type === 'separate') {
      await runSeparation(msg.audio, msg.sampleRate, msg.modelIds)
      return
    }

    if (msg.type === 'cancel') {
      currentAbortController?.abort()
      currentAbortController = null
      post({ type: 'cancelled' })
      return
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    post({ type: 'error', message })
  }
})

/* ----------- 实际分离逻辑 ----------- */

async function runSeparation(
  audio: Float32Array,
  _sampleRate: number,
  modelIds: string[],
): Promise<void> {
  post({ type: 'separate-progress', phase: 'loading', current: 0, total: modelIds.length })

  // 1) 加载所有需要的 session(从 IndexedDB)
  const sessions: Array<{ stem: StemKey; session: SessionHandle }> = []
  for (let i = 0; i < modelIds.length; i++) {
    const id = modelIds[i]
    if (loadedSessions.has(id)) {
      const handle = loadedSessions.get(id)!
      const stem = handle.model.outputStems[0]
      sessions.push({ stem, session: handle })
      post({ type: 'separate-progress', phase: 'loading', current: i + 1, total: modelIds.length })
      continue
    }

    const model = getModelById(id)
    if (!model) throw new Error(`未知模型: ${id}`)

    let buf = await getCachedModel(id)
    if (!buf) {
      // 缓存没命中,边下边建 session
      const ctrl = new AbortController()
      currentAbortController = ctrl
      buf = await downloadModel(model, (loaded, total) =>
        post({ type: 'download-progress', modelId: id, loaded, total }),
        ctrl.signal,
      )
      await setCachedModel(id, buf)
    }

    const handle = await createSession(buf, model)
    loadedSessions.set(id, handle)
    sessions.push({ stem: model.outputStems[0], session: handle })
    post({ type: 'separate-progress', phase: 'loading', current: i + 1, total: modelIds.length })
  }

  // 2) 准备输入张量
  post({ type: 'separate-progress', phase: 'inference', current: 0, total: sessions.length })

  // ⚠️ 这里需要根据模型的真实输入/输出规格实现 STFT + 张量化
  // 当前是占位实现,实际接入要按 demucs-ft 的 spec 做。
  // 简化为:把 audio 转成 shape=[1, 2, samples] 的 float32 tensor

  const stems: Record<string, Float32Array> = {}
  for (let i = 0; i < sessions.length; i++) {
    const { stem, session } = sessions[i]
    // 构造输入张量(占位,实际要 STFT 后做 complex spectrum)
    const inputTensor = new tensor(new Float32Array(audio), [1, audio.length])

    // 跑推理
    const outputs = await session.session.run({ input: inputTensor })
    // 取第一个输出张量(占位,实际要按模型 output name 取)
    const firstOutput = Object.values(outputs)[0]
    if (firstOutput) {
      stems[stem] = firstOutput.data as Float32Array
    } else {
      throw new Error(`模型 ${session.model.id} 没有输出张量`)
    }
    post({ type: 'separate-progress', phase: 'inference', current: i + 1, total: sessions.length })
  }

  // 3) 后处理 — ISTFT + 重叠相加
  post({ type: 'separate-progress', phase: 'postprocessing', current: 0, total: 1 })
  // ⚠️ 占位:真实实现要 STFT 逆变换 + overlap-add
  // 当前直接用模型的输出当作时域信号
  post({ type: 'separate-progress', phase: 'postprocessing', current: 1, total: 1 })

  // 4) 全部 4 stem 都齐了(假设用户选了所有 stem)
  // ⚠️ 占位:如果用户没选某 stem,用静音填充
  const fullStems: Record<StemKey, Float32Array> = {
    vocals: stems.vocals || new Float32Array(audio.length),
    drums: stems.drums || new Float32Array(audio.length),
    bass: stems.bass || new Float32Array(audio.length),
    other: stems.other || new Float32Array(audio.length),
  }

  post({ type: 'separate-complete', stems: fullStems })
}

/* ----------- 工具 ----------- */

function post(msg: WorkerResponse) {
  ;(self as unknown as Worker).postMessage(msg)
}
