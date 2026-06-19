export type CacheActionPhase = 'idle' | 'downloading' | 'deleting' | 'clearing'

export interface CacheActionState {
  phase: CacheActionPhase
  targetId?: string
  progress?: number
  currentStep?: string
}

export type CacheActionsByModel = Partial<Record<string, CacheActionState>>

export function startModelDownload(actions: CacheActionsByModel, modelId: string): CacheActionsByModel {
  return {
    ...actions,
    [modelId]: { phase: 'downloading', targetId: modelId, progress: 0, currentStep: '准备下载' },
  }
}

export function updateModelDownload(
  actions: CacheActionsByModel,
  modelId: string,
  loaded: number,
  total: number,
): CacheActionsByModel {
  const progress = total > 0 ? loaded / total : 0
  return {
    ...actions,
    [modelId]: {
      phase: 'downloading',
      targetId: modelId,
      progress,
      currentStep: `下载中 ${(loaded / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024).toFixed(1)} MB`,
    },
  }
}

export function startModelDelete(actions: CacheActionsByModel, modelId: string): CacheActionsByModel {
  return {
    ...actions,
    [modelId]: { phase: 'deleting', targetId: modelId },
  }
}

export function finishModelAction(actions: CacheActionsByModel, modelId: string): CacheActionsByModel {
  const next = { ...actions }
  delete next[modelId]
  return next
}

export function cancelModelDownload(actions: CacheActionsByModel, modelId: string): CacheActionsByModel {
  return finishModelAction(actions, modelId)
}
