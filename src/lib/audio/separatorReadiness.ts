import { AVAILABLE_STEMS, type StemKey } from '@/lib/onnx/modelRegistry'

type StemSelectionLike = {
  enabled: boolean
  modelId: string | null
}

type StemSelectionsLike = Record<StemKey, StemSelectionLike>

export interface SeparatorReadiness {
  enabledCount: number
  missingModelIds: string[]
  canStart: boolean
}

export function getSeparatorReadiness(
  selections: StemSelectionsLike,
  cachedModels: Set<string>,
): SeparatorReadiness {
  const enabledStems = AVAILABLE_STEMS.filter((stem) => selections[stem].enabled)
  const missingModelIds = enabledStems.flatMap((stem) => {
    const modelId = selections[stem].modelId
    return modelId && !cachedModels.has(modelId) ? [modelId] : []
  })

  return {
    enabledCount: enabledStems.length,
    missingModelIds,
    canStart: enabledStems.length > 0 && missingModelIds.length === 0,
  }
}
