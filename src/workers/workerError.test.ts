import { describe, expect, it } from 'vitest'
import { formatWorkerError } from './workerError'

describe('formatWorkerError', () => {
  it('turns numeric wasm allocation failures into readable messages', () => {
    expect(formatWorkerError(482225176)).toContain('ONNX Runtime/WASM 内存分配失败')
    expect(formatWorkerError(482225176)).toContain('459.9 MB')
  })

  it('keeps normal Error messages', () => {
    expect(formatWorkerError(new Error('failed'))).toBe('failed')
  })
})
