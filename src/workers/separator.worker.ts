/* ============================================================
 * Web Worker — 跑音轨分离推理
 * 主线程 → postMessage({type, payload}) → worker 异步处理 → postMessage 结果
 *
 * v0.5 改动:
 *  - Spleeter 2-stem 真正跑 STFT → 切分 → 模型推理 → mask 重建
 *  - vocals.onnx 给人声, accompaniment.onnx 给伴奏
 *  - 支持 demucs 4-stem 占位(留接口,TODO:换算子)
 * ============================================================ */

/// <reference lib="webworker" />

import { createSession, tensor, type SessionHandle } from '../lib/onnx/backend'
import { getModelById, type StemKey } from '../lib/onnx/modelRegistry'
import { isModelCacheUsable, getValidatedCachedModel, downloadModel, setCachedModel, assertEnoughStorageForModel } from '../lib/onnx/indexedDBCache'
import type { SeparationJob } from '../lib/audio/separationJobs'
import { createSeparatedStem, createSilentStem, type SeparatedStems } from '../lib/audio/stemTypes'
import {
  accumulateMaskBatch,
  buildSpleeterInputBatch,
  buildSpleeterStft,
  createMaskAccumulator,
  finalizeMaskAccumulator,
} from '../lib/audio/stft'
import { runHtdemucsStem } from '../lib/audio/htdemucs'
import { runUvrMdxVocals } from '../lib/audio/uvrMdx'
import { createFeeds } from '../lib/onnx/feeds'
import { formatWorkerError } from './workerError'

/* ----------- 消息协议 ----------- */

export type WorkerRequest =
  | { type: 'check-cache'; modelIds: string[] }
  | {
      type: 'download-model'
      modelId: string
    }
  | {
      type: 'cancel-download'
      modelId: string
    }
  | {
      type: 'separate'
      /**
       * stereo 音频:audio[0..n-1] = L, audio[n..2n-1] = R
       * (与主线程 toMono 之后的单声道不同——Spleeter 需要 L/R)
       */
      audioL: Float32Array
      audioR: Float32Array
      sampleRate: number
      /**
       * 每个输出 stem 对应一个明确模型,由 model.family 分发到不同 engine。
       */
      jobs: SeparationJob[]
    }
  | { type: 'cancel' }

export type WorkerResponse =
  | { type: 'cache-status'; cached: Record<string, boolean> }
  | { type: 'download-progress'; modelId: string; loaded: number; total: number }
  | { type: 'download-complete'; modelId: string }
  | { type: 'download-cancelled'; modelId: string }
  | {
      type: 'separate-progress'
      phase: 'preprocess' | 'inference' | 'postprocess'
      current: number
      total: number
      label?: string
    }
  | { type: 'log'; message: string; level?: 'info' | 'warn' | 'error' }
  | {
      type: 'separate-complete'
      stems: SeparatedStems
    }
  | { type: 'error'; message: string }
  | { type: 'cancelled' }

/* ----------- 状态 ----------- */

let currentAbortController: AbortController | null = null
const downloadAbortControllers: Map<string, AbortController> = new Map()
const loadedSessions: Map<string, SessionHandle> = new Map()
const SPLEETER_BATCH_SPLITS = 4

/* ----------- Worker 消息处理 ----------- */

self.addEventListener('message', async (e: MessageEvent<WorkerRequest>) => {
  const msg = e.data
  try {
    if (msg.type === 'check-cache') {
      const cached: Record<string, boolean> = {}
      for (const id of msg.modelIds) {
        const model = getModelById(id)
        cached[id] = model ? await isModelCacheUsable(model) : false
      }
      post({ type: 'cache-status', cached })
      return
    }

    if (msg.type === 'download-model') {
      const model = getModelById(msg.modelId)
      if (!model) throw new Error(`未知模型: ${msg.modelId}`)

      if (await isModelCacheUsable(model)) {
        post({ type: 'download-complete', modelId: model.id })
        return
      }

      const ctrl = new AbortController()
      downloadAbortControllers.set(model.id, ctrl)
      try {
        try {
          const buf = await downloadModel(
            model,
            (loaded, total) => post({ type: 'download-progress', modelId: model.id, loaded, total }),
            ctrl.signal,
          )
          await setCachedModel(model.id, buf)
          post({ type: 'download-complete', modelId: model.id })
        } catch (error) {
          if (ctrl.signal.aborted) {
            post({ type: 'download-cancelled', modelId: model.id })
            return
          }
          throw error
        }
      } finally {
        downloadAbortControllers.delete(model.id)
      }
      return
    }

    if (msg.type === 'cancel-download') {
      const ctrl = downloadAbortControllers.get(msg.modelId)
      ctrl?.abort()
      downloadAbortControllers.delete(msg.modelId)
      post({ type: 'download-cancelled', modelId: msg.modelId })
      return
    }

    if (msg.type === 'separate') {
      await runSeparation(msg.audioL, msg.audioR, msg.sampleRate, msg.jobs)
      return
    }

    if (msg.type === 'cancel') {
      currentAbortController?.abort()
      currentAbortController = null
      for (const ctrl of downloadAbortControllers.values()) ctrl.abort()
      downloadAbortControllers.clear()
      post({ type: 'cancelled' })
      return
    }
  } catch (err) {
    const message = formatWorkerError(err)
    post({ type: 'log', level: 'error', message: `失败: ${message}` })
    post({ type: 'error', message })
  }
})

/* ----------- 实际分离逻辑 ----------- */

async function runSeparation(
  audioL: Float32Array,
  audioR: Float32Array,
  sampleRate: number,
  jobs: SeparationJob[],
): Promise<void> {
  if (jobs.length === 0) {
    throw new Error('至少选择一个分轨')
  }

  const spleeterJobs = jobs.filter((job) => getModelById(job.modelId)?.family === 'spleeter')
  const htdemucsJobs = jobs.filter((job) => getModelById(job.modelId)?.family === 'htdemucs')
  const uvrMdxJobs = jobs.filter((job) => getModelById(job.modelId)?.family === 'uvr-mdx')
  const unsupportedJobs = jobs.filter((job) => {
    const family = getModelById(job.modelId)?.family
    return family !== 'spleeter' && family !== 'htdemucs' && family !== 'uvr-mdx'
  })

  if (unsupportedJobs.length > 0) {
    throw new Error(`当前模型路线暂未实现: ${unsupportedJobs.map((job) => job.modelId).join(', ')}`)
  }

  const audioLength = audioL.length
  const result: SeparatedStems = {}
  for (const { stem } of jobs) {
    result[stem] = createSilentStem(audioLength, sampleRate)
  }

  postLog(`收到音频: ${audioL.length} samples @ ${sampleRate}Hz, jobs=${jobs.map((job) => `${job.stem}:${job.modelId}`).join(', ')}`)

  if (spleeterJobs.length > 0) {
    post({ type: 'separate-progress', phase: 'preprocess', current: 0, total: 1, label: 'STFT 预处理' })
    const { numSplits, stftSpec } = buildSpleeterStft(audioL, audioR, sampleRate)
    postLog(`STFT 完成: frames=${stftSpec.numFrames}, bins=${stftSpec.numBins}, splits=${numSplits}, batch=${SPLEETER_BATCH_SPLITS}`)
    post({ type: 'separate-progress', phase: 'preprocess', current: 1, total: 1, label: `STFT 完成 (${numSplits} splits)` })

    const sessions: Array<{ stemKey: StemKey; session: SessionHandle }> = []

    post({ type: 'separate-progress', phase: 'inference', current: 0, total: spleeterJobs.length, label: '加载 Spleeter 模型' })

    for (let i = 0; i < spleeterJobs.length; i++) {
      const job = spleeterJobs[i]
      const id = job.modelId
      if (loadedSessions.has(id)) {
        sessions.push({ stemKey: job.stem, session: loadedSessions.get(id)! })
        post({ type: 'separate-progress', phase: 'inference', current: i + 1, total: spleeterJobs.length, label: `${id} 已加载` })
        continue
      }

      const model = getModelById(id)
      if (!model) throw new Error(`未知模型: ${id}`)

      let buf = await getValidatedCachedModel(model)
      if (!buf) {
        postLog(`${id} 未命中缓存,开始下载`)
        await assertEnoughStorageForModel(model)
        const ctrl = new AbortController()
        currentAbortController = ctrl
        try {
          buf = await downloadModel(model, (loaded, total) =>
            post({ type: 'download-progress', modelId: id, loaded, total }),
            ctrl.signal,
          )
        } finally {
          currentAbortController = null
        }
        await setCachedModel(id, buf)
      }

      const handle = await createSession(buf, model)
      loadedSessions.set(id, handle)
      sessions.push({ stemKey: job.stem, session: handle })
      post({ type: 'separate-progress', phase: 'inference', current: i + 1, total: spleeterJobs.length, label: `${id} 就绪` })
    }

    // 3) 推理 + 后处理
    for (let i = 0; i < sessions.length; i++) {
      const { stemKey, session } = sessions[i]
      const batchCount = Math.ceil(numSplits / SPLEETER_BATCH_SPLITS)
      postLog(`Spleeter 推理 ${stemKey}: ${numSplits} splits, ${batchCount} batches`)
      post({ type: 'separate-progress', phase: 'inference', current: 0, total: batchCount, label: `Spleeter 推理 ${stemKey} (${numSplits} splits)` })

      const accumulator = createMaskAccumulator(stftSpec)

      for (let batchIndex = 0; batchIndex < batchCount; batchIndex++) {
        const batchStart = batchIndex * SPLEETER_BATCH_SPLITS
        const batchSplits = Math.min(SPLEETER_BATCH_SPLITS, numSplits - batchStart)
        const label = `Spleeter 推理 ${stemKey}: batch ${batchIndex + 1}/${batchCount} (${batchSplits} splits)`
        post({ type: 'separate-progress', phase: 'inference', current: batchIndex, total: batchCount, label })
        postLog(label)

        try {
          const batchInput = buildSpleeterInputBatch(stftSpec, numSplits, batchStart, batchSplits)
          const inputT = new tensor('float32', batchInput, [2, batchSplits, 512, 1024])
          const outputs = await session.session.run(createFeeds(session.session, inputT))
          const out = Object.values(outputs)[0]
          if (!out) throw new Error(`模型 ${session.model.id} 无输出张量`)
          accumulateMaskBatch(out.data as Float32Array, batchStart, batchSplits, stftSpec, accumulator, true)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          const wrapped = new Error(`${label} 失败: ${message}`) as Error & { cause?: unknown }
          wrapped.cause = error
          throw wrapped
        }
      }

      post({ type: 'separate-progress', phase: 'postprocess', current: 0, total: 1, label: `ISTFT 重建 ${stemKey}` })
      postLog(`ISTFT 重建 ${stemKey}`)
      const { L, R } = finalizeMaskAccumulator(accumulator, stftSpec, audioLength)
      result[stemKey] = createSeparatedStem(L, R, sampleRate)
      post({ type: 'separate-progress', phase: 'inference', current: i + 1, total: sessions.length, label: `${stemKey} 完成` })
      postLog(`${stemKey} 完成`)
    }
  }

  for (let i = 0; i < htdemucsJobs.length; i++) {
    const job = htdemucsJobs[i]
    const model = getModelById(job.modelId)
    if (!model) throw new Error(`未知模型: ${job.modelId}`)
    if (!model.implemented) throw new Error(`模型尚未适配浏览器推理: ${model.name}`)

    let handle = loadedSessions.get(model.id)
    if (!handle) {
      let buf = await getValidatedCachedModel(model)
      if (!buf) {
        postLog(`${model.id} 未命中缓存,开始下载`)
        await assertEnoughStorageForModel(model)
        const ctrl = new AbortController()
        currentAbortController = ctrl
        try {
          buf = await downloadModel(model, (loaded, total) =>
            post({ type: 'download-progress', modelId: model.id, loaded, total }),
            ctrl.signal,
          )
        } finally {
          currentAbortController = null
        }
        await setCachedModel(model.id, buf)
      }
      postLog(`加载 HT-Demucs session: ${model.id} (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB)`)
      handle = await createSession(buf, model)
      postLog(`HT-Demucs session 就绪: ${model.id}`)
      loadedSessions.set(model.id, handle)
    }

    const segmentSamples = model.segmentSamples ?? 343_980
    postLog(`HT-Demucs 推理 ${job.stem}: segment=${segmentSamples}, model=${model.id}`)
    const separated = await runHtdemucsStem({
      left: audioL,
      right: audioR,
      stem: job.stem,
      segmentSamples,
      hopSamples: segmentSamples / 2,
      onProgress: (chunkIndex, totalChunks) => {
        post({
          type: 'separate-progress',
          phase: 'inference',
          current: chunkIndex,
          total: totalChunks,
          label: `HT-Demucs ${job.stem}: chunk ${chunkIndex + 1}/${totalChunks}`,
        })
      },
      runChunk: async (input, chunkIndex) => {
        const inputName = model.inputName ?? 'mix'
        const outputName = model.outputName ?? 'stems'
        const inputT = new tensor('float32', input, [1, 2, segmentSamples])
        let outputs: Awaited<ReturnType<typeof handle.session.run>>
        try {
          outputs = await handle!.session.run({ [inputName]: inputT })
        } catch (error) {
          const wrapped = new Error(
            `HT-Demucs ${model.id} chunk ${chunkIndex + 1} 推理失败: ${formatWorkerError(error)}`,
          ) as Error & { cause?: unknown }
          wrapped.cause = error
          throw wrapped
        }
        const output = outputs[outputName] ?? Object.values(outputs)[0]
        if (!output) {
          throw new Error(`模型 ${model.id} chunk ${chunkIndex + 1} 无输出张量: ${outputName}`)
        }
        return output.data as Float32Array
      },
    })
    result[job.stem] = createSeparatedStem(separated.left, separated.right, sampleRate)
    postLog(`HT-Demucs ${job.stem} 完成`)
    post({
      type: 'separate-progress',
      phase: 'inference',
      current: i + 1,
      total: htdemucsJobs.length,
      label: `HT-Demucs ${job.stem} 完成`,
    })
  }

  const uvrModelIds = Array.from(new Set(uvrMdxJobs.map((job) => job.modelId)))
  for (const modelId of uvrModelIds) {
    const model = getModelById(modelId)
    if (!model) throw new Error(`未知模型: ${modelId}`)
    const relatedJobs = uvrMdxJobs.filter((job) => job.modelId === modelId)

    let handle = loadedSessions.get(model.id)
    if (!handle) {
      let buf = await getValidatedCachedModel(model)
      if (!buf) {
        postLog(`${model.id} 未命中缓存,开始下载`)
        await assertEnoughStorageForModel(model)
        const ctrl = new AbortController()
        currentAbortController = ctrl
        try {
          buf = await downloadModel(model, (loaded, total) =>
            post({ type: 'download-progress', modelId: model.id, loaded, total }),
            ctrl.signal,
          )
        } finally {
          currentAbortController = null
        }
        await setCachedModel(model.id, buf)
      }
      postLog(`加载 UVR-MDX session: ${model.id} (${(buf.byteLength / 1024 / 1024).toFixed(1)} MB)`)
      handle = await createSession(buf, model)
      loadedSessions.set(model.id, handle)
      postLog(`UVR-MDX session 就绪: ${model.id}`)
    }

    const fftSize = model.fftSize
    const hopSize = model.hopSize
    const dimF = model.mdxDimF ?? fftSize / 2
    const dimT = model.mdxDimT ?? 256
    postLog(`UVR-MDX 推理: model=${model.id}, fft=${fftSize}, hop=${hopSize}, dim=${dimF}x${dimT}`)
    const vocals = await runUvrMdxVocals({
      left: audioL,
      right: audioR,
      expectedSamples: audioLength,
      fftSize,
      hopSize,
      dimF,
      dimT,
      onProgress: (chunkIndex, totalChunks) => {
        post({
          type: 'separate-progress',
          phase: 'inference',
          current: chunkIndex,
          total: totalChunks,
          label: `UVR-MDX: chunk ${chunkIndex + 1}/${totalChunks}`,
        })
      },
      runChunk: async (input, chunkIndex) => {
        const inputT = new tensor('float32', input, [1, 2, dimF, dimT])
        let outputs: Awaited<ReturnType<typeof handle.session.run>>
        try {
          outputs = await handle!.session.run(createFeeds(handle!.session, inputT))
        } catch (error) {
          const wrapped = new Error(
            `UVR-MDX ${model.id} chunk ${chunkIndex + 1} 推理失败: ${formatWorkerError(error)}`,
          ) as Error & { cause?: unknown }
          wrapped.cause = error
          throw wrapped
        }
        const output = Object.values(outputs)[0]
        if (!output) throw new Error(`UVR-MDX ${model.id} chunk ${chunkIndex + 1} 无输出张量`)
        return output.data as Float32Array
      },
    })

    for (const job of relatedJobs) {
      if (job.stem === 'vocals') {
        result.vocals = createSeparatedStem(vocals.left, vocals.right, sampleRate)
      } else if (job.stem === 'other') {
        const otherL = new Float32Array(audioLength)
        const otherR = new Float32Array(audioLength)
        for (let i = 0; i < audioLength; i++) {
          otherL[i] = audioL[i] - vocals.left[i]
          otherR[i] = audioR[i] - vocals.right[i]
        }
        result.other = createSeparatedStem(otherL, otherR, sampleRate)
      }
    }
    postLog(`UVR-MDX ${model.id} 完成`)
  }

  post({ type: 'separate-complete', stems: result })
}

/* ----------- 工具 ----------- */

function post(msg: WorkerResponse) {
  ;(self as unknown as Worker).postMessage(msg)
}

function postLog(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  post({ type: 'log', level, message })
}
