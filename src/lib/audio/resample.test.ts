import { describe, expect, it } from 'vitest'
import { resampleLinear } from './resample'

describe('resampleLinear', () => {
  it('keeps samples unchanged when source and target rates match', () => {
    const input = new Float32Array([0, 0.5, 1])

    expect(Array.from(resampleLinear(input, 44100, 44100))).toEqual([0, 0.5, 1])
  })

  it('changes length according to sample-rate ratio', () => {
    const output = resampleLinear(new Float32Array([0, 1, 0, -1]), 4, 2)

    expect(output).toHaveLength(2)
    expect(output[0]).toBeCloseTo(0)
    expect(output[1]).toBeCloseTo(0)
  })
})
