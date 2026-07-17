import { describe, expect, it } from 'vitest'
import { consumePitchTransfer, createPitchTransfer } from './pitchTransfer'

describe('pitch transfer registry', () => {
  it('passes an audio blob once through an in-memory transfer id', () => {
    const blob = new Blob(['wav'], { type: 'audio/wav' })
    const id = createPitchTransfer(blob, {
      fileName: 'vocals.wav',
      source: 'separator-result',
    })

    const firstRead = consumePitchTransfer(id)
    const secondRead = consumePitchTransfer(id)

    expect(firstRead?.blob).toBe(blob)
    expect(firstRead?.metadata.fileName).toBe('vocals.wav')
    expect(firstRead?.metadata.source).toBe('separator-result')
    expect(secondRead).toBeNull()
  })
})
