import { describe, expect, it } from 'vitest'
import { getSeparatorReadiness } from './separatorReadiness'

describe('getSeparatorReadiness', () => {
  const selections = {
    vocals: { enabled: true, modelId: 'spleeter-vocals' },
    drums: { enabled: false, modelId: null },
    bass: { enabled: false, modelId: null },
    other: { enabled: true, modelId: 'spleeter-accompaniment' },
  }

  it('blocks separation when an enabled model is not cached', () => {
    const readiness = getSeparatorReadiness(selections, new Set(['spleeter-vocals']))

    expect(readiness.canStart).toBe(false)
    expect(readiness.missingModelIds).toEqual(['spleeter-accompaniment'])
  })

  it('allows separation when every enabled model is cached', () => {
    const readiness = getSeparatorReadiness(
      selections,
      new Set(['spleeter-vocals', 'spleeter-accompaniment']),
    )

    expect(readiness.canStart).toBe(true)
    expect(readiness.missingModelIds).toEqual([])
  })
})
