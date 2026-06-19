import { ALL_STEMS, type StemKey } from '@/lib/onnx/modelRegistry'

export interface SeparationJob {
  stem: StemKey
  modelId: string
}

type StemSelectionLike = {
  enabled: boolean
  modelId: string | null
}

type StemSelectionsLike = Record<StemKey, StemSelectionLike>

export function buildSeparationJobs(selections: StemSelectionsLike): SeparationJob[] {
  return ALL_STEMS.flatMap((stem) => {
    const selection = selections[stem]
    return selection.enabled && selection.modelId ? [{ stem, modelId: selection.modelId }] : []
  })
}
