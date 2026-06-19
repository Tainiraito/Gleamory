import { describe, expect, it } from 'vitest'
import { removeModelFromSelections, toggleCachedModelSelection } from './separatorSelection'

describe('separator model selection', () => {
  const baseSelections = {
    vocals: { enabled: false, modelId: null },
    drums: { enabled: false, modelId: null },
    bass: { enabled: false, modelId: null },
    other: { enabled: false, modelId: null },
  }

  it('selects a cached model and marks that stem enabled', () => {
    const next = toggleCachedModelSelection(baseSelections, 'vocals', 'spleeter-vocals', new Set(['spleeter-vocals']))

    expect(next.vocals).toEqual({ enabled: true, modelId: 'spleeter-vocals' })
  })

  it('does not select an uncached model', () => {
    const next = toggleCachedModelSelection(baseSelections, 'vocals', 'spleeter-vocals', new Set())

    expect(next.vocals).toEqual({ enabled: false, modelId: null })
  })

  it('clicking the selected cached model clears that stem', () => {
    const selected = {
      ...baseSelections,
      vocals: { enabled: true, modelId: 'spleeter-vocals' },
    }
    const next = toggleCachedModelSelection(selected, 'vocals', 'spleeter-vocals', new Set(['spleeter-vocals']))

    expect(next.vocals).toEqual({ enabled: false, modelId: null })
  })

  it('clears a stem when its selected model cache is deleted', () => {
    const selected = {
      ...baseSelections,
      other: { enabled: true, modelId: 'spleeter-accompaniment' },
    }
    const next = removeModelFromSelections(selected, 'spleeter-accompaniment')

    expect(next.other).toEqual({ enabled: false, modelId: null })
  })
})
