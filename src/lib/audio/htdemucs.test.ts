import { describe, expect, it } from 'vitest'
import {
  HTDEMUCS_OUTPUT_ORDER,
  HTDEMUCS_SEGMENT_SAMPLES,
  buildHtdemucsChunk,
  extractHtdemucsStem,
  getHtdemucsChunkStarts,
  overlapAddHtdemucsChunk,
  runHtdemucsStem,
} from './htdemucs'

describe('htdemucs helpers', () => {
  it('creates at least one padded 7.8s stereo chunk for short audio', () => {
    const left = new Float32Array([0.1, 0.2, 0.3])
    const right = new Float32Array([0.4, 0.5, 0.6])
    const chunk = buildHtdemucsChunk(left, right, 0)

    expect(chunk.length).toBe(2 * HTDEMUCS_SEGMENT_SAMPLES)
    expect(chunk[0]).toBeCloseTo(0.1)
    expect(chunk[1]).toBeCloseTo(0.2)
    expect(chunk[2]).toBeCloseTo(0.3)
    expect(chunk[HTDEMUCS_SEGMENT_SAMPLES]).toBeCloseTo(0.4)
    expect(chunk[HTDEMUCS_SEGMENT_SAMPLES + 1]).toBeCloseTo(0.5)
    expect(chunk[HTDEMUCS_SEGMENT_SAMPLES + 2]).toBeCloseTo(0.6)
    expect(chunk[3]).toBe(0)
  })

  it('uses 50% overlap chunk starts and covers the tail', () => {
    const starts = getHtdemucsChunkStarts(HTDEMUCS_SEGMENT_SAMPLES + 10)

    expect(starts).toEqual([0, HTDEMUCS_SEGMENT_SAMPLES / 2])
  })

  it('extracts vocals and accompaniment rows from htdemucs output', () => {
    const output = new Float32Array(4 * 2 * HTDEMUCS_SEGMENT_SAMPLES)
    const otherIndex = HTDEMUCS_OUTPUT_ORDER.indexOf('other')
    const vocalsIndex = HTDEMUCS_OUTPUT_ORDER.indexOf('vocals')
    output[otherIndex * 2 * HTDEMUCS_SEGMENT_SAMPLES] = 0.25
    output[vocalsIndex * 2 * HTDEMUCS_SEGMENT_SAMPLES] = 0.75

    expect(extractHtdemucsStem(output, 'other').left[0]).toBe(0.25)
    expect(extractHtdemucsStem(output, 'vocals').left[0]).toBe(0.75)
  })

  it('overlap-adds constant chunks without volume jumps', () => {
    const segmentSamples = 16
    const totalLength = segmentSamples + 4
    const starts = getHtdemucsChunkStarts(totalLength, segmentSamples, segmentSamples / 2)
    const accL = new Float32Array(totalLength)
    const accR = new Float32Array(totalLength)
    const weights = new Float32Array(totalLength)
    const chunk = {
      left: new Float32Array(segmentSamples).fill(1),
      right: new Float32Array(segmentSamples).fill(1),
    }

    for (const start of starts) {
      overlapAddHtdemucsChunk(chunk, start, totalLength, accL, accR, weights)
    }

    for (let i = 0; i < totalLength; i++) {
      expect(accL[i] / weights[i]).toBeCloseTo(1, 5)
      expect(accR[i] / weights[i]).toBeCloseTo(1, 5)
    }
  })

  it('runs fake chunk inference and crops the final stereo stem', async () => {
    const length = 24
    const output = await runHtdemucsStem({
      left: new Float32Array(length).fill(0.2),
      right: new Float32Array(length).fill(0.4),
      stem: 'vocals',
      segmentSamples: 16,
      hopSamples: 8,
      runChunk: async (chunk) => {
        const out = new Float32Array(4 * 2 * 16)
        const vocalsOffset = HTDEMUCS_OUTPUT_ORDER.indexOf('vocals') * 2 * 16
        out.set(chunk.slice(0, 16), vocalsOffset)
        out.set(chunk.slice(16, 32), vocalsOffset + 16)
        return out
      },
    })

    expect(output.left).toHaveLength(length)
    expect(output.right).toHaveLength(length)
    expect(output.left[0]).toBeCloseTo(0.2)
    expect(output.right[0]).toBeCloseTo(0.4)
  })
})
