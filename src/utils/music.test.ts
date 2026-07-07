import { describe, expect, it } from 'vitest'
import { centsOffset, formatNoteNameForDisplay, frequencyFromMidi, midiFromFrequency, noteNameFromMidi } from './music'

describe('music pitch utilities', () => {
  it('converts between A4 frequency and MIDI note', () => {
    expect(frequencyFromMidi(69)).toBeCloseTo(440, 6)
    expect(midiFromFrequency(440)).toBe(69)
    expect(noteNameFromMidi(69)).toBe('A4')
  })

  it('rounds nearby frequencies to the closest MIDI note and reports cent offset', () => {
    expect(midiFromFrequency(445)).toBe(69)
    expect(centsOffset(445, 69)).toBeGreaterThan(0)
    expect(centsOffset(435, 69)).toBeLessThan(0)
  })

  it('formats accidentals and octave numbers for display', () => {
    expect(formatNoteNameForDisplay('C#4')).toBe('C♯₄')
    expect(formatNoteNameForDisplay('Db3')).toBe('D♭₃')
    expect(formatNoteNameForDisplay('A4')).toBe('A₄')
    expect(formatNoteNameForDisplay(null)).toBe('--')
  })
})
