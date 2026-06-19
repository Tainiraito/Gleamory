import type { StemKey } from '@/lib/onnx/modelRegistry'

export interface SeparatedStem {
  channels: [Float32Array, Float32Array]
  sampleRate: number
}

export type SeparatedStems = Partial<Record<StemKey, SeparatedStem>>

export function createSeparatedStem(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): SeparatedStem {
  return { channels: [left, right], sampleRate }
}

export function createSilentStem(length: number, sampleRate: number): SeparatedStem {
  return createSeparatedStem(new Float32Array(length), new Float32Array(length), sampleRate)
}
