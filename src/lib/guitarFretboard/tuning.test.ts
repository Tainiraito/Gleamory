import { describe, expect, it } from 'vitest'
import { createCustomTuning, getTuningPreset, TUNING_PRESETS } from './tuning'

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
})
