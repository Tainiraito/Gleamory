import { describe, expect, it } from 'vitest'
import {
  cancelModelDownload,
  finishModelAction,
  startModelDownload,
  updateModelDownload,
} from './cacheActionState'

describe('model cache action state', () => {
  it('tracks multiple concurrent downloads independently', () => {
    const actions = startModelDownload(
      startModelDownload({}, 'spleeter-vocals'),
      'spleeter-accompaniment',
    )

    const next = updateModelDownload(actions, 'spleeter-vocals', 5, 10)

    expect(next['spleeter-vocals']?.progress).toBe(0.5)
    expect(next['spleeter-accompaniment']?.progress).toBe(0)
  })

  it('finishes one model action without clearing another active download', () => {
    const actions = startModelDownload(
      startModelDownload({}, 'spleeter-vocals'),
      'spleeter-accompaniment',
    )

    const next = finishModelAction(actions, 'spleeter-vocals')

    expect(next['spleeter-vocals']).toBeUndefined()
    expect(next['spleeter-accompaniment']?.phase).toBe('downloading')
  })

  it('cancels one active model download without affecting another', () => {
    const actions = startModelDownload(
      startModelDownload({}, 'uvr-mdx-kara-2'),
      'htdemucs-ft-vocals',
    )

    const next = cancelModelDownload(actions, 'uvr-mdx-kara-2')

    expect(next['uvr-mdx-kara-2']).toBeUndefined()
    expect(next['htdemucs-ft-vocals']?.phase).toBe('downloading')
  })
})
