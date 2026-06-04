/* ============================================================
 * ONNX Runtime 封装
 * - 设置 WASM 路径指向 /ort-wasm/
 * - 提供"创建 session"的工厂方法
 * - 保持简洁,实际推理逻辑在 Web Worker 里
 * ============================================================ */

import * as ort from 'onnxruntime-web'
import type { ModelInfo } from './modelRegistry'

/* 设置 WASM 路径(Vite 会把 public/ort-wasm/ 整目录复制到 dist) */
ort.env.wasm.wasmPaths = '/ort-wasm/'

/* 启用 SIMD + 多线程(需要 COOP/COEP,coi-serviceworker 保证) */
ort.env.wasm.simd = true
ort.env.wasm.numThreads = typeof navigator !== 'undefined' ? Math.min(navigator.hardwareConcurrency ?? 2, 4) : 2

/* log 级别 */
ort.env.logLevel = 'warning'

export interface SessionHandle {
  /** ONNX Runtime session,可以直接 .run() */
  session: ort.InferenceSession
  /** 模型元信息 */
  model: ModelInfo
  /** 释放资源 */
  release: () => void
}

/**
 * 从 ArrayBuffer 创建 ONNX session。
 * 这是个**同步**操作(onnxruntime-web 在 worker 里 init 很快)。
 */
export async function createSession(buffer: ArrayBuffer, model: ModelInfo): Promise<SessionHandle> {
  const session = await ort.InferenceSession.create(buffer, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all',
    enableCpuMemArena: true,
  })

  return {
    session,
    model,
    release: () => session.release(),
  }
}

/* ----------- 类型助手 ----------- */

/** ONNX Runtime 通用张量 */
export type OrtTensor = ort.Tensor
export const tensor = ort.Tensor

/* ----------- 默认导出(方便 worker 直接 import) ----------- */

export { ort }
export type { ModelInfo } from './modelRegistry'
