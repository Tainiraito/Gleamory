/* ============================================================
 * useSeparator — React hook 暴露给 UI
 * 封装 Worker 通信 + 模型缓存 + 推理进度
 *
 * v0.2 变化:
 * - 移除了自动开始分离的逻辑,改为用户主动点按钮
 * - 支持「分轨+模型独立选择」(per-stem 选 model)
 * - 暴露「准备就绪」状态,等待用户输入
 * ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MODELS,
  ALL_STEMS,
  type StemKey,
} from '@/lib/onnx/modelRegistry'
import {
  cancelModelDownload,
  finishModelAction,
  startModelDelete,
  startModelDownload,
  updateModelDownload,
  type CacheActionsByModel,
  type CacheActionPhase,
  type CacheActionState,
} from '@/lib/audio/cacheActionState'
import type { WorkerRequest, WorkerResponse } from '@/workers/separator.worker'
import { decodeAudioFile, toStereo, validateFileSize, validateDuration } from '@/lib/audio/decode'
import { encodeWav, downloadBlob } from '@/lib/audio/encode'
import {
  listCachedModels,
  deleteCachedModel,
  assertEnoughStorageForModel,
  type CachedModelMeta,
} from '@/lib/onnx/indexedDBCache'
import { buildSeparationJobs } from '@/lib/audio/separationJobs'
import type { SeparatedStem, SeparatedStems } from '@/lib/audio/stemTypes'
import { resampleLinear } from '@/lib/audio/resample'

export type SeparatorPhase =
  | 'idle'
  | 'checking-cache'
  | 'file-selected' // 文件选了,等用户点开始
  | 'model-ready'
  | 'decoding'
  | 'separating'
  | 'done'
  | 'error'
  | 'cancelled'

export type { CacheActionsByModel, CacheActionPhase, CacheActionState }

export interface ProcessLogEntry {
  time: string
  level: 'info' | 'warn' | 'error'
  message: string
}

export interface SeparatorState {
  phase: SeparatorPhase
  /** 0..1 */
  progress: number
  /** 当前阶段的子步骤文案 */
  currentStep: string
  /** 错误信息 */
  error: string | null
  /** 已缓存的模型 id 集合 */
  cachedModels: Set<string>
  /** 缓存模型元数据列表(用于显示大小/时间) */
  cacheMetas: CachedModelMeta[]
  /** 缓存操作细状态 */
  cacheAction: CacheActionState
  /** 按模型隔离的缓存操作状态,支持多个模型并发下载 */
  cacheActions: CacheActionsByModel
  /** 4 个 stem 的分离结果(完成后填充) */
  stems: SeparatedStems | null
  /** 原始 AudioBuffer(分离前填充) */
  originalBuffer: AudioBuffer | null
  /** 原始采样率(用于 WAV 编码) */
  originalSampleRate: number
  /** 当前文件名(供 WAV 命名) */
  fileName: string | null
  /** 本次处理过程日志,用于失败后排查 */
  logs: ProcessLogEntry[]
}

const INITIAL_STATE: SeparatorState = {
  phase: 'idle',
  progress: 0,
  currentStep: '',
  error: null,
  cachedModels: new Set(),
  cacheMetas: [],
  cacheAction: { phase: 'idle' },
  cacheActions: {},
  stems: null,
  originalBuffer: null,
  originalSampleRate: 44100,
  fileName: null,
  logs: [],
}

export interface StemSelection {
  /** 该 stem 是否要分离(由是否选中模型决定) */
  enabled: boolean
  /** 用哪个模型分离(用户从下拉里选) */
  modelId: string | null
}

export type StemSelections = Record<StemKey, StemSelection>

/** 构造默认选择:默认不输出任何分轨,用户选中已缓存模型后才启用 */
export function buildDefaultSelections(): StemSelections {
  const out = {} as StemSelections
  for (const stem of ALL_STEMS) {
    out[stem] = {
      enabled: false,
      modelId: null,
    }
  }
  return out
}

function appendLog(
  logs: ProcessLogEntry[],
  message: string,
  level: ProcessLogEntry['level'] = 'info',
): ProcessLogEntry[] {
  return [
    ...logs,
    {
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
      level,
      message,
    },
  ].slice(-120)
}

export function useSeparator() {
  const [state, setState] = useState<SeparatorState>(INITIAL_STATE)
  const workerRef = useRef<Worker | null>(null)
  const pendingFileRef = useRef<File | null>(null)
  const pendingSelectionsRef = useRef<StemSelections | null>(null)

  /* -------- Worker 初始化 -------- */
  useEffect(() => {
    const worker = new Worker(new URL('../workers/separator.worker.ts', import.meta.url), {
      type: 'module',
    })
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
    // refreshCacheMetas 通过 ref 间接持有,刻意不加依赖(避免重建回调)
    const refreshMetas = refreshCacheMetasRef.current
    switch (msg.type) {
      case 'cache-status': {
        setState((s) => {
          // 只在 idle/initial 阶段处理 cache-status
          if (s.phase !== 'idle' && s.phase !== 'checking-cache') return s
          return {
            ...s,
            phase: 'idle',
            cachedModels: new Set(
              Object.entries(msg.cached).filter(([, v]) => v).map(([k]) => k),
            ),
          }
        })
        // 异步刷 metas 列表
        void refreshMetas()
        return
      }
      case 'download-progress': {
        setState((s) => ({
          ...s,
          cacheActions: updateModelDownload(s.cacheActions, msg.modelId, msg.loaded, msg.total),
        }))
        return
      }
      case 'download-complete': {
        setState((s) => {
          const next = new Set(s.cachedModels)
          next.add(msg.modelId)
          return {
            ...s,
            cachedModels: next,
            cacheActions: finishModelAction(s.cacheActions, msg.modelId),
          }
        })
        // 异步重读 IDB metas,让「缓存管理」列表/大小/时间立刻出现新条目
        // (Set 同步更新会让卡片徽章变「已缓存」;metas 走 IDB 读取是异步的)
        void refreshMetas()
        return
      }
      case 'download-cancelled': {
        setState((s) => ({
          ...s,
          cacheActions: cancelModelDownload(s.cacheActions, msg.modelId),
        }))
        return
      }
      case 'separate-progress': {
        const labels: Record<typeof msg.phase, string> = {
          preprocess: 'STFT 预处理',
          inference: 'AI 推理',
          postprocess: '后期处理',
        }
        setState((s) => ({
          ...s,
          phase: 'separating',
          progress: msg.total > 0 ? msg.current / msg.total : 0,
          currentStep: msg.label ?? `${labels[msg.phase]} (${msg.current}/${msg.total})`,
          logs: appendLog(s.logs, msg.label ?? `${labels[msg.phase]} (${msg.current}/${msg.total})`),
        }))
        return
      }
      case 'log': {
        setState((s) => ({
          ...s,
          logs: appendLog(s.logs, msg.message, msg.level ?? 'info'),
        }))
        return
      }
      case 'separate-complete': {
        setState((s) => {
          const stems: SeparatedStems = {}
          for (const [k, v] of Object.entries(msg.stems)) {
            stems[k as StemKey] = v as SeparatedStem
          }
          return {
            ...s,
            phase: 'done',
            progress: 1,
            currentStep: '分离完成',
            stems,
          }
        })
        return
      }
      case 'error': {
        setState((s) => ({
          ...s,
          phase: 'error',
          error: msg.message,
          logs: appendLog(s.logs, msg.message, 'error'),
        }))
        return
      }
      case 'cancelled': {
        setState((s) => ({ ...s, phase: 'cancelled', currentStep: '已取消' }))
        return
      }
    }
  }, [])

  /* -------- 对外 API -------- */

  /** 选好文件后调用:校验 + 解码 + 停在「file-selected」等待用户确认 */
  const selectFile = useCallback(
    async (file: File) => {
      try {
        setState((s) => ({
          ...s,
          phase: 'decoding',
          currentStep: '解码音频…',
          error: null,
          progress: 0,
          stems: null,
          logs: appendLog([], `开始读取文件: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`),
        }))

        // 1) 校验文件
        validateFileSize(file)

        // 2) 解码
        const audioBuffer = await decodeAudioFile(file)
        validateDuration(audioBuffer)

        // 缓存文件 + 缓冲
        pendingFileRef.current = file

        setState((s) => ({
          ...s,
          originalBuffer: audioBuffer,
          originalSampleRate: audioBuffer.sampleRate,
          fileName: file.name,
          phase: 'file-selected',
          progress: 0,
          currentStep: '已选择文件,准备就绪',
          logs: appendLog(s.logs, `解码完成: ${(audioBuffer.duration / 60).toFixed(2)} 分钟, ${audioBuffer.sampleRate}Hz`),
        }))
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setState((s) => ({ ...s, phase: 'error', error: message, logs: appendLog(s.logs, message, 'error') }))
      }
    },
    [],
  )

  /** 用户点「开始分离」后调用 */
  const start = useCallback(
    async (selections: StemSelections) => {
      const file = pendingFileRef.current
      if (!file) {
        setState((s) => ({ ...s, phase: 'error', error: '请先选择音频文件' }))
        return
      }

      const jobs = buildSeparationJobs(selections)
      // 收集实际要跑的 modelId(去重)
      const modelIds = Array.from(new Set(jobs.map((job) => job.modelId)))
      if (modelIds.length === 0) {
        setState((s) => ({
          ...s,
          phase: 'error',
          error: '请至少选择一个已缓存模型',
        }))
        return
      }

      const missingModelIds = modelIds.filter((id) => !state.cachedModels.has(id))
      if (missingModelIds.length > 0) {
        setState((s) => ({
          ...s,
          error: `请先下载所选模型：${missingModelIds.join(' / ')}`,
        }))
        return
      }

      pendingSelectionsRef.current = selections

      setState((s) => ({
        ...s,
        phase: 'separating',
        currentStep: '开始推理…',
        error: null,
        progress: 0,
        stems: null,
        logs: appendLog([], '开始分离'),
      }))

      try {
        // 重新解码(因为原始 buffer 可能被释放了)
        const audioBuffer = await decodeAudioFile(file)
        let { L, R } = toStereo(audioBuffer)
        const targetRate = 44100
        if (audioBuffer.sampleRate !== targetRate) {
          L = resampleLinear(L, audioBuffer.sampleRate, targetRate)
          R = resampleLinear(R, audioBuffer.sampleRate, targetRate)
        }
        sendToWorker({
          type: 'separate',
          audioL: L,
          audioR: R,
          sampleRate: targetRate,
          jobs,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        setState((s) => ({ ...s, phase: 'error', error: message, logs: appendLog(s.logs, message, 'error') }))
      }
    },
    [sendToWorker, state.cachedModels],
  )

  const cancel = useCallback(() => {
    sendToWorker({ type: 'cancel' })
  }, [sendToWorker])

  const reset = useCallback(() => {
    pendingFileRef.current = null
    pendingSelectionsRef.current = null
    setState({ ...INITIAL_STATE, cachedModels: state.cachedModels, cacheMetas: state.cacheMetas })
  }, [state.cacheMetas, state.cachedModels])

  const resetToSelectedFile = useCallback(() => {
    setState((s) => ({
      ...s,
      phase: s.fileName ? 'file-selected' : 'idle',
      progress: 0,
      currentStep: s.fileName ? '已选择文件,准备就绪' : '',
      error: null,
      stems: null,
      logs: appendLog(s.logs, '已回到可重试状态'),
    }))
  }, [])

  /** 把 stem 转成 WAV Blob 触发下载 */
  const downloadStemWav = useCallback(
    (stem: StemKey) => {
      const data = state.stems?.[stem]
      if (!data) {
        console.warn(`[useSeparator] stem ${stem} not available`)
        return
      }
      const baseName = state.fileName ?? 'audio'
      const blob = encodeWav(data.channels, data.sampleRate)
      const name = baseName.replace(/\.[^.]+$/, '') + `_${stem}.wav`
      downloadBlob(blob, name)
    },
    [state.fileName, state.stems],
  )

  /* -------- 缓存管理 API -------- */

  /** 重新从 IndexedDB 拉 metas — 是所有缓存变更后的「单一更新入口」 */
  const refreshCacheMetas = useCallback(async () => {
    try {
      const metas = await listCachedModels()
      setState((s) => ({ ...s, cacheMetas: metas }))
    } catch (e) {
      console.warn('[useSeparator] listCachedModels failed', e)
    }
  }, [])

  // 暴露 ref 供 Worker 消息回调内部调用(避免闭包旧值)
  const refreshCacheMetasRef = useRef<() => Promise<void>>(async () => {})
  useEffect(() => {
    refreshCacheMetasRef.current = refreshCacheMetas
  }, [refreshCacheMetas])

  /** 手动把模型缓存到 IndexedDB(从 /models/ 拉) */
  const cacheModel = useCallback(
    async (modelId: string) => {
      const model = MODELS.find((m) => m.id === modelId)
      if (!model) {
        setState((s) => ({ ...s, error: `未知模型: ${modelId}` }))
        return
      }
      try {
        await assertEnoughStorageForModel(model)
      } catch (error) {
        setState((s) => ({
          ...s,
          error: error instanceof Error ? error.message : String(error),
        }))
        return
      }
      setState((s) => ({
        ...s,
        cacheActions: startModelDownload(s.cacheActions, modelId),
      }))
      sendToWorker({ type: 'download-model', modelId })
    },
    [sendToWorker],
  )

  const cancelCacheModel = useCallback(
    (modelId: string) => {
      setState((s) => ({
        ...s,
        cacheActions: cancelModelDownload(s.cacheActions, modelId),
      }))
      sendToWorker({ type: 'cancel-download', modelId })
    },
    [sendToWorker],
  )

  /** 删除某个模型的 IndexedDB 缓存 — 完成后自动刷新 metas,UI 实时同步 */
  const uncacheModel = useCallback(
    async (modelId: string): Promise<boolean> => {
      setState((s) => ({ ...s, cacheActions: startModelDelete(s.cacheActions, modelId) }))
      try {
        await deleteCachedModel(modelId)
        // 立刻更新 Set + metas,UI 全链路同步
        setState((s) => {
          const next = new Set(s.cachedModels)
          next.delete(modelId)
          return { ...s, cachedModels: next, cacheActions: finishModelAction(s.cacheActions, modelId) }
        })
        // 单条删除后,只 metas 需要重查(列表项没了 → 大小/时间)
        await refreshCacheMetas()
        return true
      } catch (e) {
        setState((s) => ({
          ...s,
          cacheActions: finishModelAction(s.cacheActions, modelId),
          error: `删除失败: ${e instanceof Error ? e.message : String(e)}`,
        }))
        return false
      }
    },
    [refreshCacheMetas],
  )

  /** 清空所有模型缓存 — 完成后自动刷新 metas */
  const clearAllCache = useCallback(async () => {
    setState((s) => ({ ...s, cacheAction: { phase: 'clearing' } }))
    try {
      // 在主线程直接清 IDB(避免让 worker 重复实现)
      const { clearAllCache: doClear } = await import('@/lib/onnx/indexedDBCache')
      await doClear()
      setState((s) => ({
        ...s,
        cachedModels: new Set(),
        cacheMetas: [],
        cacheAction: { phase: 'idle' },
        cacheActions: {},
      }))
      // 清空后 metas 自然变空,无需再查(setState 已做)
    } catch (e) {
      setState((s) => ({
        ...s,
        cacheAction: { phase: 'idle' },
        cacheActions: {},
        error: `清空失败: ${e instanceof Error ? e.message : String(e)}`,
      }))
    }
  }, [])

  return {
    state,
    models: MODELS,
    selectFile,
    start,
    cancel,
    reset,
    resetToSelectedFile,
    downloadStemWav,
    cacheModel,
    cancelCacheModel,
    uncacheModel,
    clearAllCache,
    refreshCacheMetas,
  }
}
