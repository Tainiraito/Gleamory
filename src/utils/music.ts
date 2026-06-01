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