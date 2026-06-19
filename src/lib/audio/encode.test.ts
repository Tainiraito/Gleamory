import { describe, expect, it } from 'vitest'
import { encodeWav } from './encode'

async function blobToView(blob: Blob): Promise<DataView> {
  return new DataView(await blob.arrayBuffer())
}

describe('encodeWav', () => {
  it('encodes stereo samples as 2-channel PCM WAV', async () => {
    const blob = encodeWav([new Float32Array([0.5, -0.5]), new Float32Array([-0.25, 0.25])], 44100)
    const view = await blobToView(blob)

    expect(view.getUint16(22, true)).toBe(2)
    expect(view.getUint32(24, true)).toBe(44100)
    expect(view.getUint16(32, true)).toBe(4)
    expect(view.getUint32(40, true)).toBe(8)
    expect(view.getInt16(44, true)).toBeGreaterThan(0)
    expect(view.getInt16(46, true)).toBeLessThan(0)
  })
})
