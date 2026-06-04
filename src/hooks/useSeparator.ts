/* ============================================================
 * useSeparator — React hook 暴露给 UI
 * 封装 Worker 通信 + 模型缓存 + 推理进度
 * ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import { MODELS, type ModelInfo, type StemKey } from '@/lib/onnx/modelRegistry'
import type { WorkerRequest, WorkerResponse } from '@/workers/separator.worker'
import { decodeAudioFile, toMono, validateFileSize, validateDuration } from '@/lib/audio/decode'
import { encodeWav, downloadBlob } from '@/lib/audio/encode'

export type SeparatorPhase =
  | 'idle'
  | 'checking-cache'
  | 'downloading-model'
  | 'model-ready'
  | 'decoding'
  | 'separating'
  | 'done'
  | 'error'
  | 'cancelled'

export interface SeparatorState {
  phase: SeparatorPhase
  /** 0..1 */
  progress: number
  /** 当前阶段的子步骤文案 */
  currentStep: string
  /** 错误信息 */
  error: string | null
  /** 已缓存的模型 */
  cachedModels: Set<string>
  /** 4 个 stem 的 AudioBuffer(分离完成后填充) */
  stems: Partial<Record<StemKey, AudioBuffer>> | null
  /** 原始 AudioBuffer(分离前填充) */
  originalBuffer: AudioBuffer | null
  /** 当前文件名(供 WAV 命名) */
  fileName: string | null
}

const INITIAL_STATE: SeparatorState = {
  phase: 'idle',
  progress: 0,
  currentStep: '',
  error: null,
  cachedModels: new Set(),
  stems: null,
  originalBuffer: null,
  fileName: null,
}

export function useSeparator() {
  const [state, setState] = useState<SeparatorState>(INITIAL_STATE)
  const workerRef = useRef<Worker | null>(null)

  /* -------- Worker 初始化 -------- */
  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/separator.worker.ts', import.meta.url),
      { type: 'module' },
    )
    workerRef.current = worker

    worker.addEventListener('message', (e: MessageEvent<WorkerResponse>) => {
      handleWorkerMessage(e.data)
    })

    // 启动时检查所有模型缓存状态
    sendToWorker({ type: 'check-cache', modelIds: MODELS.map((m) => m.id) })

    return () => {
      worker.terminate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendToWorker = useCallback((msg: WorkerRequest) => {
    workerRef.current?.postMessage(msg)
  }, [])

  const handleWorkerMessage = useCallback((msg: WorkerResponse) => {
    switch (msg.type) {
      case 'cache-status': {
        setState((s) => ({
          ...s,
          phase: 'idle',
          cachedModels: new Set(Object.entries(msg.cached).filter(([, v]) => v).map(([k]) => k)),
        }))
        return
      }
      case 'download-progress': {
        setState((s) => ({
          ...s,
          phase: 'downloading-model',
          progress: msg.total > 0 ? msg.loaded / msg.total : 0,
          currentStep: `下载模型 ${msg.modelId} (${(msg.loaded / 1024 / 1024).toFixed(1)} / ${(msg.total / 1024 / 1024).toFixed(1)} MB)`,
        }))
        return
      }
      case 'download-complete': {
        setState((s) => {
          const next = new Set(s.cachedModels)
          next.add(msg.modelId)
          return { ...s, phase: 'model-ready', progress: 1, currentStep: '模型就绪', cachedModels: next }
        })
        return
      }
      case 'separate-progress': {
        const labels: Record<typeof msg.phase, string> = {
          loading: '加载模型',
          inference: 'AI 推理',
          postprocessing: '后期处理',
        }
        setState((s) => ({
          ...s,
          phase: 'separating',
          progress: msg.current / msg.total,
          currentStep: `${labels[msg.phase]} (${msg.current}/${msg.total})`,
        }))
        return
      }
      case 'separate-complete': {
        setState((s) => {
          // 把 Float32 数组包成 AudioBuffer(单声道 44100Hz)
          const stems: Partial<Record<StemKey, AudioBuffer>> = {}
          // ⚠️ 这里要 AudioContext,但我们没存 — 简化为不重建,只保留 Float32Array
          // 实际:用 OfflineAudioContext 重新 wrap,这里先存到 stems 字段外的 ref
          for (const [k, v] of Object.entries(msg.stems)) {
            ;(stems as unknown as Record<string, Float32Array>)[k] = v
          }
          return {
            ...s,
            phase: 'done',
            progress: 1,
            currentStep: '分离完成',
            stems: stems as unknown as Partial<Record<StemKey, AudioBuffer>>,
          }
        })
        return
      }
      case 'error': {
        setState((s) => ({ ...s, phase: 'error', error: msg.message }))
        return
      }
      case 'cancelled': {
        setState((s) => ({ ...s, phase: 'cancelled', currentStep: '已取消' }))
        return
      }
    }
  }, [])

  /* -------- 对外 API -------- */

  const downloadModel = useCallback(
    (model: ModelInfo) => {
      sendToWorker({ type: 'download-model', modelId: model.id })
    },
    [sendToWorker],
  )

  const separate = useCallback(
    async (file: File, modelIds: string[]) => {
      try {
        setState((s) => ({ ...s, phase: 'decoding', currentStep: '解码音频…', error: null }))

        // 1) 校验文件
        validateFileSize(file)

        // 2) 解码
        const audioBuffer = await decodeAudioFile(file)
        validateDuration(audioBuffer)

        // 3) 转单声道 Float32
        const mono = toMono(audioBuffer)
        const sampleRate = audioBuffer.sampleRate

        setState((s) => ({
          ...s,
          originalBuffer: audioBuffer,
          fileName: file.name,
          phase: 'separating',
          currentStep: '开始推理…',
        }))

        // 4) 通知 worker 开始
        sendToWorker({ type: 'separate', audio: mono, sampleRate, modelIds })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setState((s) => ({ ...s, phase: 'error', error: message }))
      }
    },
    [sendToWorker],
  )

  const cancel = useCallback(() => {
    sendToWorker({ type: 'cancel' })
  }, [sendToWorker])

  const reset = useCallback(() => {
    setState({ ...INITIAL_STATE, cachedModels: state.cachedModels })
  }, [state.cachedModels])

  /**
   * 把当前 stem 转成 WAV Blob 触发下载。
   * ⚠️ 当前实现是占位 — 真实情况下 stems 里存的是 AudioBuffer
   *    而 Worker 传回的是 Float32Array,需要重建 AudioBuffer 才能 encodeWav
   */
  const downloadStemWav = useCallback(
    (stem: StemKey, baseName = state.fileName ?? 'audio') => {
      const stems = state.stems as unknown as Record<string, Float32Array> | null
      const data = stems?.[stem]
      if (!data) {
        console.warn(`[useSeparator] stem ${stem} not available`)
        return
      }
      const sampleRate = state.originalBuffer?.sampleRate ?? 44100
      const blob = encodeWav(data, sampleRate)
      const name = baseName.replace(/\.[^.]+$/, '') + `_${stem}.wav`
      downloadBlob(blob, name)
    },
    [state.fileName, state.originalBuffer, state.stems],
  )

  return {
    state,
    models: MODELS,
    downloadModel,
    separate,
    cancel,
    reset,
    downloadStemWav,
  }
}
