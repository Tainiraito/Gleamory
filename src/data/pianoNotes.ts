import { frequencyFromMidi } from '@/utils/music'

/** Represents a single piano key's musical data */
export interface PianoNote {
  note: string
  midiNumber: number
  frequency: number
  isBlack: boolean
  octave: number
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const BLACK_SEMITONES = new Set([1, 3, 6, 8, 10])

/** Generate all notes from MIDI 36 (C2) to MIDI 83 (B5), 4 full octaves */
function generateAllNotes(): PianoNote[] {
  const notes: PianoNote[] = []
  for (let midi = 36; midi <= 83; midi++) {
    const semitone = midi % 12
    const octave = Math.floor(midi / 12) - 1
    const noteName = NOTE_NAMES[semitone]
    notes.push({
      note: `${noteName}${octave}`,
      midiNumber: midi,
      frequency: frequencyFromMidi(midi),
      isBlack: BLACK_SEMITONES.has(semitone),
      octave,
    })
  }
  return notes
}

export const ALL_NOTES: PianoNote[] = generateAllNotes()

/** Keyboard key to semitone offset mapping */
export interface KeyMapEntry {
  key: string
  semitoneOffset: number
}

export interface KeyboardPreset {
  label: string
  map: KeyMapEntry[]
}

export const KEYBOARD_PRESETS: Record<string, KeyboardPreset> = {
  'numbers': {
    label: '数字行',
    map: [
      // White keys — number row
      { key: '1', semitoneOffset: 0 },   // C4
      { key: '2', semitoneOffset: 2 },   // D4
      { key: '3', semitoneOffset: 4 },   // E4
      { key: '4', semitoneOffset: 5 },   // F4
      { key: '5', semitoneOffset: 7 },   // G4
      { key: '6', semitoneOffset: 9 },   // A4
      { key: '7', semitoneOffset: 11 },  // B4
      { key: '8', semitoneOffset: 12 },  // C5
      { key: '9', semitoneOffset: 14 },  // D5
      { key: '0', semitoneOffset: 16 },  // E5
      { key: '-', semitoneOffset: 17 },  // F5
      { key: '=', semitoneOffset: 19 },  // G5
      // Black keys — letter row
      { key: 'q', semitoneOffset: 1 },   // C#4
      { key: 'e', semitoneOffset: 3 },   // D#4
      { key: 't', semitoneOffset: 6 },   // F#4
      { key: 'y', semitoneOffset: 8 },   // G#4
      { key: 'u', semitoneOffset: 10 },  // A#4
      { key: 'o', semitoneOffset: 13 },  // C#5
      { key: 'p', semitoneOffset: 15 },  // D#5
      { key: '[', semitoneOffset: 18 },  // F#5
      { key: ']', semitoneOffset: 20 },  // G#5
    ],
  },
  'asdf': {
    label: '经典行',
    map: [
      // White keys — ASDF row (most common web piano layout)
      { key: 'a', semitoneOffset: 0 },   // C4
      { key: 's', semitoneOffset: 2 },   // D4
      { key: 'd', semitoneOffset: 4 },   // E4
      { key: 'f', semitoneOffset: 5 },   // F4
      { key: 'g', semitoneOffset: 7 },   // G4
      { key: 'h', semitoneOffset: 9 },   // A4
      { key: 'j', semitoneOffset: 11 },  // B4
      { key: 'k', semitoneOffset: 12 },  // C5
      { key: 'l', semitoneOffset: 14 },  // D5
      { key: ';', semitoneOffset: 16 },  // E5
      // Black keys — QWERTY top row
      { key: 'w', semitoneOffset: 1 },   // C#4
      { key: 'e', semitoneOffset: 3 },   // D#4
      { key: 't', semitoneOffset: 6 },   // F#4
      { key: 'y', semitoneOffset: 8 },   // G#4
      { key: 'u', semitoneOffset: 10 },  // A#4
      { key: 'o', semitoneOffset: 13 },  // C#5
      { key: 'p', semitoneOffset: 15 },  // D#5
    ],
  },
}

export const DEFAULT_PRESET = 'numbers'

/** Base MIDI for C4 = 60 */
const MIDI_C4 = 60
const MIDI_MIN = 36 // C2
const MIDI_MAX = 83 // B5

export function getMidiFromKey(key: string, octaveOffset: number, presetId: string = DEFAULT_PRESET): number | null {
  const preset = KEYBOARD_PRESETS[presetId]
  if (!preset) return null
  const entry = preset.map.find((k) => k.key === key)
  if (!entry) return null
  const midi = MIDI_C4 + entry.semitoneOffset + octaveOffset * 12
  if (midi < MIDI_MIN || midi > MIDI_MAX) return null
  return midi
}

export function getPlayableNotes(octaveOffset: number, presetId: string = DEFAULT_PRESET): PianoNote[] {
  const preset = KEYBOARD_PRESETS[presetId]
  if (!preset) return []
  const base = MIDI_C4 + octaveOffset * 12
  return preset.map
    .map((k) => {
      const midi = base + k.semitoneOffset
      return ALL_NOTES.find((n) => n.midiNumber === midi) ?? null
    })
    .filter((n): n is PianoNote => n !== null)
}

/** Reverse lookup: given a MIDI number and current octaveOffset, return the keyboard key that plays it (uppercase), or null */
export function getKeyForMidi(midi: number, octaveOffset: number, presetId: string = DEFAULT_PRESET): string | null {
  const preset = KEYBOARD_PRESETS[presetId]
  if (!preset) return null
  const baseMidi = midi - octaveOffset * 12
  const entry = preset.map.find((k) => MIDI_C4 + k.semitoneOffset === baseMidi)
  if (!entry) return null
  const key = entry.key
  // Key name display: map special chars to readable labels
  const displayMap: Record<string, string> = {
    '-': '－', '=': '＝', '[': '[', ']': ']', ';': '；',
  }
  return displayMap[key] ?? key.toUpperCase()
}
