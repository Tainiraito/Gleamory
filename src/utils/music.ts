/**
 * Music utility functions (MIDI, frequency, etc.)
 */

/**
 * Convert a MIDI note number to its frequency in Hz.
 * A440: MIDI 69 = 440 Hz, each semitone = 2^(1/12) ratio.
 */
export function frequencyFromMidi(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const SUBSCRIPT_CHARACTERS: Record<string, string> = {
  '-': '₋',
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
}

export function midiFromFrequency(frequency: number): number {
  return Math.round(69 + 12 * Math.log2(frequency / 440))
}

export function noteNameFromMidi(midi: number): string {
  const roundedMidi = Math.round(midi)
  const noteIndex = ((roundedMidi % 12) + 12) % 12
  const octave = Math.floor(roundedMidi / 12) - 1
  return `${NOTE_NAMES[noteIndex]}${octave}`
}

export function centsOffset(frequency: number, midi: number): number {
  return 1200 * Math.log2(frequency / frequencyFromMidi(midi))
}

export function formatNoteNameForDisplay(noteName: string | null): string {
  if (noteName == null) return '--'

  return noteName
    .replace('#', '♯')
    .replace('b', '♭')
    .replace(/-?\d+$/, (octave) =>
      [...octave].map((character) => SUBSCRIPT_CHARACTERS[character] ?? character).join(''),
    )
}
