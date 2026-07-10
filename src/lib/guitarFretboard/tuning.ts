import type { StringConfig, TuningPreset } from './types'

const NOTE_TO_INDEX: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
}

const STRING_NUMBERS = [6, 5, 4, 3, 2, 1] as const
const FLAT_NOTE_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const

export function midiFromNoteName(noteWithOctave: string): number {
  const match = /^([A-G](?:#|b)?)(-?\d+)$/.exec(noteWithOctave)
  if (!match) {
    throw new Error(`无效音名: ${noteWithOctave}`)
  }

  const [, noteName, octaveText] = match
  const noteIndex = NOTE_TO_INDEX[noteName]
  if (noteIndex === undefined) {
    throw new Error(`不支持的音名: ${noteName}`)
  }

  return (Number(octaveText) + 1) * 12 + noteIndex
}

function noteNameFromMidi(midiNumber: number): string {
  const noteName = FLAT_NOTE_NAMES[((midiNumber % 12) + 12) % 12]
  const octave = Math.floor(midiNumber / 12) - 1
  return `${noteName}${octave}`
}

function stripOctave(noteWithOctave: string): string {
  return noteWithOctave.replace(/-?\d+$/, '')
}

function makeStrings(openNotes: string[]): StringConfig[] {
  if (openNotes.length !== 6) {
    throw new Error('吉他调弦必须包含 6 根弦')
  }

  return openNotes.map((openNote, index) => ({
    stringNumber: STRING_NUMBERS[index],
    displayName: `${STRING_NUMBERS[index]}弦`,
    openNote,
    midiNumber: midiFromNoteName(openNote),
  }))
}

export const TUNING_PRESETS: TuningPreset[] = [
  {
    id: 'standard',
    name: 'Standard EADGBE',
    strings: makeStrings(['E2', 'A2', 'D3', 'G3', 'B3', 'E4']),
  },
  {
    id: 'drop-d',
    name: 'Drop D',
    strings: makeStrings(['D2', 'A2', 'D3', 'G3', 'B3', 'E4']),
  },
  {
    id: 'half-step-down',
    name: 'Half Step Down',
    strings: makeStrings(['Eb2', 'Ab2', 'Db3', 'Gb3', 'Bb3', 'Eb4']),
  },
  {
    id: 'dadgad',
    name: 'DADGAD',
    strings: makeStrings(['D2', 'A2', 'D3', 'G3', 'A3', 'D4']),
  },
]

export function getTuningPreset(id: TuningPreset['id']): TuningPreset {
  const preset = TUNING_PRESETS.find((candidate) => candidate.id === id)
  if (!preset) {
    throw new Error(`未知调弦预设: ${id}`)
  }

  return {
    ...preset,
    strings: preset.strings.map((string) => ({ ...string })),
  }
}

export function createCustomTuning(name: string, openNotes: string[]): TuningPreset {
  return {
    id: 'custom',
    name,
    strings: makeStrings(openNotes),
  }
}

function createTuningFromOpenNotes(openNotes: string[]): TuningPreset {
  const matchingPreset = TUNING_PRESETS.find((preset) => preset.strings.map((string) => string.openNote).join('|') === openNotes.join('|'))
  if (matchingPreset) return getTuningPreset(matchingPreset.id)
  return createCustomTuning(`Custom ${openNotes.map(stripOctave).join(' ')}`, openNotes)
}

export function transposeTuning(tuning: TuningPreset, semitones: number): TuningPreset {
  return createTuningFromOpenNotes(tuning.strings.map((string) => noteNameFromMidi(string.midiNumber + semitones)))
}

export function transposeString(tuning: TuningPreset, stringNumber: StringConfig['stringNumber'], semitones: number): TuningPreset {
  return createTuningFromOpenNotes(tuning.strings.map((string) => noteNameFromMidi(string.midiNumber + (string.stringNumber === stringNumber ? semitones : 0))))
}
