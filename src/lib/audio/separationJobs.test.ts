import { describe, expect, it } from 'vitest'
import { buildSeparationJobs } from './separationJobs'

describe('buildSeparationJobs', () => {
  it('returns enabled stems with their selected model ids', () => {
    const jobs = buildSeparationJobs({
      vocals: { enabled: true, modelId: 'htdemucs-ft-vocals' },
      other: { enabled: true, modelId: 'htdemucs-ft-other' },
      drums: { enabled: false, modelId: 'htdemucs-ft-drums' },
      bass: { enabled: true, modelId: null },
    })

    expect(jobs).toEqual([
      { stem: 'vocals', modelId: 'htdemucs-ft-vocals' },
      { stem: 'other', modelId: 'htdemucs-ft-other' },
    ])
  })
})
