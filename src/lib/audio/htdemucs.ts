import type { StemKey } from '@/lib/onnx/modelRegistry'

export const HTDEMUCS_SEGMENT_SAMPLES = 343_980
export const HTDEMUCS_HOP_SAMPLES = HTDEMUCS_SEGMENT_SAMPLES / 2
export const HTDEMUCS_OUTPUT_ORDER: StemKey[] = ['drums', 'bass', 'other', 'vocals']

export interface HtdemucsStereoChunk {
  left: Float32Array
  right: Float32Array
}

export interface RunHtdemucsStemOptions {
  left: Float32Array
  right: Float32Array
  stem: StemKey
  runChunk: (input: Float32Array, chunkIndex: number, chunkStart: number) => Promise<Float32Array>
  segmentSamples?: number
  hopSamples?: number
  onProgress?: (chunkIndex: number, totalChunks: number, chunkStart: number) => void
}

export function getHtdemucsChunkStarts(
  audioLength: number,
  segmentSamples = HTDEMUCS_SEGMENT_SAMPLES,
  hopSamples = HTDEMUCS_HOP_SAMPLES,
): number[] {
  if (audioLength <= segmentSamples) return [0]

  const starts: number[] = []
  for (let start = 0; start < audioLength; start += hopSamples) {
    starts.push(start)
    if (start + segmentSamples >= audioLength) break
  }
  return starts
}

export function buildHtdemucsChunk(
  left: Float32Array,
  right: Float32Array,
  start: number,
  segmentSamples = HTDEMUCS_SEGMENT_SAMPLES,
): Float32Array {
  const chunk = new Float32Array(2 * segmentSamples)
  for (let i = 0; i < segmentSamples; i++) {
    chunk[i] = clampAudioSample(left[start + i] ?? 0)
    chunk[segmentSamples + i] = clampAudioSample(right[start + i] ?? 0)
  }
  return chunk
}

export function extractHtdemucsStem(
  output: Float32Array,
  stem: StemKey,
  segmentSamples = HTDEMUCS_SEGMENT_SAMPLES,
): HtdemucsStereoChunk {
  const stemIndex = HTDEMUCS_OUTPUT_ORDER.indexOf(stem)
  if (stemIndex < 0) throw new Error(`HT-Demucs 不支持输出分轨: ${stem}`)

  const stemOffset = stemIndex * 2 * segmentSamples
  return {
    left: output.slice(stemOffset, stemOffset + segmentSamples),
    right: output.slice(stemOffset + segmentSamples, stemOffset + 2 * segmentSamples),
  }
}

export function overlapAddHtdemucsChunk(
  chunk: HtdemucsStereoChunk,
  start: number,
  totalLength: number,
  accL: Float32Array,
  accR: Float32Array,
  weights: Float32Array,
): void {
  const segmentSamples = chunk.left.length
  for (let i = 0; i < segmentSamples; i++) {
    const dst = start + i
    if (dst >= totalLength) break
    const weight = getOverlapWeight(i, segmentSamples, start, dst, totalLength)
    accL[dst] += chunk.left[i] * weight
    accR[dst] += chunk.right[i] * weight
    weights[dst] += weight
  }
}

export function finalizeOverlapAdd(
  accL: Float32Array,
  accR: Float32Array,
  weights: Float32Array,
): HtdemucsStereoChunk {
  const left = new Float32Array(accL.length)
  const right = new Float32Array(accR.length)
  for (let i = 0; i < accL.length; i++) {
    const weight = weights[i] || 1
    left[i] = accL[i] / weight
    right[i] = accR[i] / weight
  }
  return { left, right }
}

export async function runHtdemucsStem({
  left,
  right,
  stem,
  runChunk,
  segmentSamples = HTDEMUCS_SEGMENT_SAMPLES,
  hopSamples = HTDEMUCS_HOP_SAMPLES,
  onProgress,
}: RunHtdemucsStemOptions): Promise<HtdemucsStereoChunk> {
  const totalLength = left.length
  if (right.length !== totalLength) {
    throw new Error(`HT-Demucs 输入左右声道长度不一致: L=${left.length}, R=${right.length}`)
  }

  const starts = getHtdemucsChunkStarts(totalLength, segmentSamples, hopSamples)
  const accL = new Float32Array(totalLength)
  const accR = new Float32Array(totalLength)
  const weights = new Float32Array(totalLength)

  for (let i = 0; i < starts.length; i++) {
    const start = starts[i]
    onProgress?.(i, starts.length, start)
    const input = buildHtdemucsChunk(left, right, start, segmentSamples)
    const output = await runChunk(input, i, start)
    const stemChunk = extractHtdemucsStem(output, stem, segmentSamples)
    overlapAddHtdemucsChunk(stemChunk, start, totalLength, accL, accR, weights)
  }

  return finalizeOverlapAdd(accL, accR, weights)
}

function getOverlapWeight(
  index: number,
  segmentSamples: number,
  chunkStart: number,
  dst: number,
  totalLength: number,
): number {
  const fade = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, segmentSamples - 1))
  if (chunkStart === 0 && index < segmentSamples / 2) return 1
  if (dst >= totalLength - segmentSamples / 2) return 1
  return Math.max(fade, 1e-4)
}

function clampAudioSample(sample: number): number {
  return Math.max(-1, Math.min(1, sample))
}
