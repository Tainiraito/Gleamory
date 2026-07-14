import { frequencyFromMidi } from '@/utils/music'
import type { AccidentalPreference, FretboardModel, FretPosition, FretRange, PitchClass, TuningPreset } from './types'

const SHARP_NAMES: PitchClass[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

interface GenerateFretboardOptions {
  tuning: TuningPreset
  fretCount: number
  accidental: AccidentalPreference
}

function octaveFromMidi(midiNumber: number): number {
  return Math.floor(midiNumber / 12) - 1
}

export function noteNameFromMidi(midiNumber: number): PitchClass {
  return SHARP_NAMES[((midiNumber % 12) + 12) % 12]
}

export function displayNoteNameFromMidi(midiNumber: number, accidental: AccidentalPreference): string {
  const names = accidental === 'flat' ? FLAT_NAMES : SHARP_NAMES
  return names[((midiNumber % 12) + 12) % 12]
}

export function generateFretboard({ tuning, fretCount, accidental }: GenerateFretboardOptions): FretboardModel {
  const frets = Array.from({ length: fretCount + 1 }, (_, fretNumber) => fretNumber)
  const positions = tuning.strings.flatMap((string) =>
    frets.map((fretNumber): FretPosition => {
      const midiNumber = string.midiNumber + fretNumber
      const noteName = noteNameFromMidi(midiNumber)
      const displayNoteName = displayNoteNameFromMidi(midiNumber, accidental)

      return {
        stringNumber: string.stringNumber,
        fretNumber,
        noteName,
        displayNoteName,
        noteWithOctave: `${displayNoteName}${octaveFromMidi(midiNumber)}`,
        midiNumber,
        frequency: frequencyFromMidi(midiNumber),
      }
    }),
  )

  return {
    strings: tuning.strings,
    frets,
    positions,
    settings: { tuning, fretCount, accidental },
  }
}

export function getPositionKey(position: Pick<FretPosition, 'stringNumber' | 'fretNumber'>): string {
  return `${position.stringNumber}:${position.fretNumber}`
}

export function getPositionsForNote(fretboard: FretboardModel, noteName: PitchClass, range: FretRange): FretPosition[] {
  return fretboard.positions.filter(
    (position) => position.noteName === noteName && position.fretNumber >= range.minFret && position.fretNumber <= range.maxFret,
  )
}
