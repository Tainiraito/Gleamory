export function resampleLinear(
  samples: Float32Array,
  sourceRate: number,
  targetRate: number,
): Float32Array {
  if (sourceRate === targetRate) return samples.slice()
  if (sourceRate <= 0 || targetRate <= 0) {
    throw new Error(`无效采样率: ${sourceRate} -> ${targetRate}`)
  }

  const outputLength = Math.max(1, Math.round((samples.length * targetRate) / sourceRate))
  const output = new Float32Array(outputLength)
  const ratio = sourceRate / targetRate

  for (let i = 0; i < outputLength; i++) {
    const src = i * ratio
    const lo = Math.floor(src)
    const hi = Math.min(samples.length - 1, lo + 1)
    const t = src - lo
    output[i] = (samples[lo] ?? 0) * (1 - t) + (samples[hi] ?? 0) * t
  }

  return output
}
