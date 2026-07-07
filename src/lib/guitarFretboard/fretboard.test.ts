import { describe, expect, it } from 'vitest'
import { generateFretboard, getPositionKey, getPositionsForNote } from './fretboard'
import { getTuningPreset } from './tuning'

describe('guitar fretboard generation', () => {
  it('calculates note names and frequencies for required acceptance positions', () => {
    const fretboard = generateFretboard({ tuning: getTuningPreset('standard'), fretCount: 24, accidental: 'sharp' })

    const lowE = fretboard.positions.find((position) => position.stringNumber === 6 && position.fretNumber === 0)
    const fifthStringC = fretboard.positions.find((position) => position.stringNumber === 5 && position.fretNumber === 3)
    const highE12 = fretboard.positions.find((position) => position.stringNumber === 1 && position.fretNumber === 12)

    expect(fretboard.strings).toHaveLength(6)
    expect(fretboard.frets).toHaveLength(25)
    expect(lowE).toMatchObject({ noteName: 'E', noteWithOctave: 'E2', midiNumber: 40 })
    expect(fifthStringC).toMatchObject({ noteName: 'C', noteWithOctave: 'C3', midiNumber: 48 })
    expect(highE12).toMatchObject({ noteName: 'E', noteWithOctave: 'E5', midiNumber: 76 })
    expect(lowE?.frequency).toBeCloseTo(82.41, 2)
  })

  it('recalculates every position when tuning changes', () => {
    const fretboard = generateFretboard({ tuning: getTuningPreset('drop-d'), fretCount: 24, accidental: 'sharp' })

    expect(fretboard.positions.find((position) => position.stringNumber === 6 && position.fretNumber === 0)).toMatchObject({
      noteName: 'D',
      noteWithOctave: 'D2',
      midiNumber: 38,
    })
    expect(fretboard.positions.find((position) => position.stringNumber === 6 && position.fretNumber === 2)).toMatchObject({
      noteName: 'E',
      noteWithOctave: 'E2',
      midiNumber: 40,
    })
  })

  it('finds all note positions in the selected fret range', () => {
    const fretboard = generateFretboard({ tuning: getTuningPreset('standard'), fretCount: 12, accidental: 'sharp' })
    const cPositions = getPositionsForNote(fretboard, 'C', { minFret: 0, maxFret: 12 })

    expect(cPositions.map(getPositionKey)).toEqual(['6:8', '5:3', '4:10', '3:5', '2:1', '1:8'])
  })
})
