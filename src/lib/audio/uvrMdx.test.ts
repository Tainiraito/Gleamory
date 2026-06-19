import { describe, expect, it } from 'vitest'
import { getUvrMdxFrameStarts, runUvrMdxVocals } from './uvrMdx'

describe('uvr mdx helpers', () => {
  it('covers the tail frame when splitting spectrogram frames', () => {
    expect(getUvrMdxFrameStarts(10, 4)).toEqual([0, 4, 6])
  })

  it('runs fake magnitude inference and returns cropped stereo vocals', async () => {
    const length = 64
    const output = await runUvrMdxVocals({
      left: new Float32Array(length).fill(0.2),
      right: new Float32Array(length).fill(0.2),
      expectedSamples: length,
      fftSize: 16,
      hopSize: 4,
      dimF: 9,
      dimT: 4,
      runChunk: async (input) => input,
    })

    expect(output.left).toHaveLength(length)
    expect(output.right).toHaveLength(length)
    expect(Number.isFinite(output.left[0])).toBe(true)
    expect(Number.isFinite(output.right[0])).toBe(true)
  })
})
