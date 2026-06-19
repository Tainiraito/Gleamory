import { describe, expect, it } from 'vitest'
import { applyMaskAndIStft, buildSpleeterInput, buildSpleeterInputBatch } from './stft'

describe('Spleeter STFT postprocess', () => {
  it('reconstructs finite stereo audio from a full channel-aware mask', () => {
    const length = 4096
    const left = new Float32Array(length)
    const right = new Float32Array(length)

    for (let i = 0; i < length; i++) {
      left[i] = Math.sin((2 * Math.PI * 440 * i) / 44100) * 0.2
      right[i] = Math.sin((2 * Math.PI * 660 * i) / 44100) * 0.2
    }

    const { numSplits, stftSpec } = buildSpleeterInput(left, right, 44100)
    const mask = new Float32Array(2 * numSplits * 512 * 1024).fill(1)
    const output = applyMaskAndIStft(mask, numSplits, stftSpec, 44100, length, true)

    expect([...output.L, ...output.R].every(Number.isFinite)).toBe(true)
  })

  it('builds split batches that match the same region in the full input tensor', () => {
    const length = 430_000
    const left = new Float32Array(length)
    const right = new Float32Array(length)

    for (let i = 0; i < length; i++) {
      left[i] = Math.sin((2 * Math.PI * 220 * i) / 44100) * 0.1
      right[i] = Math.sin((2 * Math.PI * 330 * i) / 44100) * 0.1
    }

    const { tensor, numSplits, stftSpec } = buildSpleeterInput(left, right, 44100)
    expect(numSplits).toBeGreaterThan(1)

    const batchStart = 1
    const batchSplits = Math.min(2, numSplits - batchStart)
    const batch = buildSpleeterInputBatch(stftSpec, numSplits, batchStart, batchSplits)
    const splitSize = 512 * 1024

    for (let ch = 0; ch < 2; ch++) {
      const fullChannelOffset = ch * numSplits * splitSize
      const batchChannelOffset = ch * batchSplits * splitSize
      for (let i = 0; i < batchSplits * splitSize; i += 8191) {
        expect(batch[batchChannelOffset + i]).toBeCloseTo(
          tensor[fullChannelOffset + batchStart * splitSize + i],
          6,
        )
      }
    }
  })
})
