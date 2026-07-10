import { describe, expect, it } from 'vitest'
import { createCustomTuning, getTuningPreset, transposeString, transposeTuning, TUNING_PRESETS } from './tuning'

describe('guitar fretboard tunings', () => {
  it('defines standard six-string tuning from low E to high E', () => {
    const standard = getTuningPreset('standard')

    expect(standard.name).toBe('Standard EADGBE')
    expect(standard.strings.map((string) => string.stringNumber)).toEqual([6, 5, 4, 3, 2, 1])
    expect(standard.strings.map((string) => string.openNote)).toEqual(['E2', 'A2', 'D3', 'G3', 'B3', 'E4'])
    expect(standard.strings.map((string) => string.midiNumber)).toEqual([40, 45, 50, 55, 59, 64])
  })

  it('provides the required alternate tuning presets', () => {
    expect(TUNING_PRESETS.map((preset) => preset.id)).toEqual(['standard', 'drop-d', 'half-step-down', 'dadgad'])
    expect(getTuningPreset('drop-d').strings[0]?.openNote).toBe('D2')
    expect(getTuningPreset('half-step-down').strings.map((string) => string.openNote)).toEqual([
      'Eb2',
      'Ab2',
      'Db3',
      'Gb3',
      'Bb3',
      'Eb4',
    ])
    expect(getTuningPreset('dadgad').strings.map((string) => string.openNote)).toEqual(['D2', 'A2', 'D3', 'G3', 'A3', 'D4'])
  })

  it('creates a custom tuning while preserving six-string order', () => {
    const custom = createCustomTuning('Open G', ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'])

    expect(custom.id).toBe('custom')
    expect(custom.name).toBe('Open G')
    expect(custom.strings.map((string) => `${string.displayName}:${string.openNote}:${string.midiNumber}`)).toEqual([
      '6弦:D2:38',
      '5弦:G2:43',
      '4弦:D3:50',
      '3弦:G3:55',
      '2弦:B3:59',
      '1弦:D4:62',
    ])
  })

  it('transposes the whole tuning for quick map exploration', () => {
    const transposed = transposeTuning(getTuningPreset('standard'), -1)

    expect(transposed.id).toBe('half-step-down')
    expect(transposed.name).toBe('Half Step Down')
    expect(transposed.strings.map((string) => string.openNote)).toEqual(['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4'])
    expect(transposed.strings.map((string) => string.midiNumber)).toEqual([39, 44, 49, 54, 58, 63])
  })

  it('transposes a single string without changing the other strings', () => {
    const transposed = transposeString(getTuningPreset('standard'), 6, -2)

    expect(transposed.id).toBe('drop-d')
    expect(transposed.name).toBe('Drop D')
    expect(transposed.strings.map((string) => string.openNote)).toEqual(['D2', 'A2', 'D3', 'G3', 'B3', 'E4'])
    expect(transposed.strings.map((string) => string.midiNumber)).toEqual([38, 45, 50, 55, 59, 64])
  })

  it('keeps repeated quick-tuning labels bounded instead of appending every operation', () => {
    const once = transposeString(getTuningPreset('standard'), 6, 1)
    const twice = transposeString(once, 6, 1)
    const repeatedWholeStep = transposeTuning(transposeTuning(twice, -1), 1)

    expect(twice.name).not.toContain('6弦+1 6弦+1')
    expect(repeatedWholeStep.name).not.toContain('+1 -1 +1')
    expect(repeatedWholeStep.name.length).toBeLessThan(32)
  })
})
