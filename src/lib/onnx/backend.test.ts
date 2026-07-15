import { describe, expect, it } from 'vitest'
import { getSessionOptions, ort } from './backend'
import type { ModelInfo } from './modelRegistry'

const baseModel: ModelInfo = {
  id: 'spleeter-vocals',
  name: 'Spleeter 人声',
  englishName: 'Spleeter 2-stem vocals',
  outputStem: 'vocals',
  size: '38 MB',
  sizeBytes: 38 * 1024 * 1024,
  downloadUrl: '/models/spleeter/vocals.onnx',
  family: 'spleeter',
  quality: 'fast',
  implemented: true,
  sampleRate: 44100,
  fftSize: 1024,
  hopSize: 256,
}

describe('getSessionOptions', () => {
  it('uses the runtime bundled with the installed onnxruntime-web version', () => {
    expect(ort.env.wasm.wasmPaths).toBeUndefined()
  })

  it('uses low-memory session options for high-quality waveform models', () => {
    const options = getSessionOptions({
      ...baseModel,
      id: 'htdemucs-ft-vocals',
      family: 'htdemucs',
      quality: 'high',
      sizeBytes: 316 * 1024 * 1024,
      fftSize: 4096,
      hopSize: 1024,
    })

    expect(options.graphOptimizationLevel).toBe('disabled')
    expect(options.enableCpuMemArena).toBe(false)
  })

  it('keeps graph optimizations for fast models', () => {
    const options = getSessionOptions(baseModel)

    expect(options.graphOptimizationLevel).toBe('all')
    expect(options.enableCpuMemArena).toBe(true)
  })
})
