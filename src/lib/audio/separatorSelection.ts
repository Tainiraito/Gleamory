import type { StemKey } from '@/lib/onnx/modelRegistry'
import type { StemSelections } from '@/hooks/useSeparator'

export function toggleCachedModelSelection(
  selections: StemSelections,
  stem: StemKey,
  modelId: string,
  cachedModels: Set<string>,
): StemSelections {
  if (!cachedModels.has(modelId)) return selections

  const current = selections[stem]
  const shouldClear = current.enabled && current.modelId === modelId

  return {
    ...selections,
    [stem]: shouldClear
      ? { enabled: false, modelId: null }
      : { enabled: true, modelId },
  }
}

export function removeModelFromSelections(
  selections: StemSelections,
  modelId: string,
): StemSelections {
  let changed = false
  const next = { ...selections }

  for (const [stem, selection] of Object.entries(selections) as Array<[StemKey, StemSelections[StemKey]]>) {
    if (selection.modelId === modelId) {
      next[stem] = { enabled: false, modelId: null }
      changed = true
    }
  }

  return changed ? next : selections
}
