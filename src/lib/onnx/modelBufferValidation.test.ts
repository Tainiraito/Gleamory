import { describe, expect, it } from 'vitest'
import { validateModelBuffer } from './modelBufferValidation'
import type { ModelInfo } from './modelRegistry'

const model: ModelInfo = {
  id: 'htdemucs-ft-vocals',
  name: 'htdemucs 人声',
  englishName: 'htdemucs_ft vocals specialist',
  outputStem: 'vocals',
  size: '316 MB',
  sizeBytes: 316 * 1024 * 1024,
  downloadUrl: '/models/missing.onnx',
  family: 'htdemucs',
  quality: 'high',
  implemented: true,
  sampleRate: 44100,
  fftSize: 4096,
  hopSize: 1024,
}

describe('validateModelBuffer', () => {
  it('rejects tiny html responses saved as model files', () => {
    const html = new TextEncoder().encode('<!doctype html><html>not an onnx model</html>').buffer

    expect(() => validateModelBuffer(model, html)).toThrow(/模型文件过小|不是有效 ONNX/)
  })

  it('rejects git lfs pointer files', () => {
    const pointer = new TextEncoder().encode('version https://git-lfs.github.com/spec/v1\n').buffer

    expect(() => validateModelBuffer(model, pointer)).toThrow(/Git LFS/)
  })
})
