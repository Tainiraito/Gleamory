// Beat sound types for the metronome
export type BeatSoundId = 'click' | 'kick' | 'snare' | 'hihat' | 'wood' | 'metal'

export interface BeatSound {
  id: BeatSoundId
  label: string        // Display name in Chinese
  labelEn: string       // English label
  color: string         // Hex color for beat dot highlight
  // Audio parameters for Web Audio API synthesis
  frequency?: number    // Hz, for tonal sounds
  noiseMix?: number     // 0-1, amount of noise for噪声-based sounds
  decay?: number        // Seconds, sound envelope decay time
  type?: OscillatorType // Oscillator type for tonal sounds
}

// All available beat sounds
export const BEAT_SOUNDS: BeatSound[] = [
  {
    id: 'click',
    label: '节拍',
    labelEn: 'Click',
    color: '#c4956a',    // Amber - warm, classic metronome
    frequency: 1000,
    decay: 0.05,
    type: 'sine',
  },
  {
    id: 'kick',
    label: '底鼓',
    labelEn: 'Kick',
    color: '#8b5cf6',    // Purple
    frequency: 60,
    decay: 0.2,
    type: 'sine',
  },
  {
    id: 'snare',
    label: '军鼓',
    labelEn: 'Snare',
    color: '#f97316',    // Orange
    frequency: 200,
    noiseMix: 0.7,
    decay: 0.15,
    type: 'triangle',
  },
  {
    id: 'hihat',
    label: '踩镲',
    labelEn: 'Hi-Hat',
    color: '#22d3ee',    // Cyan
    frequency: 8000,
    noiseMix: 1.0,
    decay: 0.08,
    type: 'square',
  },
  {
    id: 'wood',
    label: '木鱼',
    labelEn: 'Wood',
    color: '#a3e635',    // Lime
    frequency: 400,
    decay: 0.1,
    type: 'triangle',
  },
  {
    id: 'metal',
    label: '铜锣',
    labelEn: 'Metal',
    color: '#fb7185',    // Rose
    frequency: 2000,
    noiseMix: 0.3,
    decay: 0.4,
    type: 'sine',
  },
]

// Lookup map
export const BEAT_SOUND_MAP: Record<BeatSoundId, BeatSound> = Object.fromEntries(
  BEAT_SOUNDS.map((s) => [s.id, s])
) as Record<BeatSoundId, BeatSound>

// Default sound for new beats
export const DEFAULT_SOUND: BeatSoundId = 'click'

// Measure sound presets — for the metronome preset buttons
export interface MeasureSoundPreset {
  name: string
  sounds: BeatSoundId[]
}

export const MEASURE_SOUND_PRESETS: MeasureSoundPreset[] = [
  { name: '节拍器', sounds: ['click', 'click', 'click', 'click'] },
  { name: '木鱼', sounds: ['wood', 'wood', 'wood', 'wood'] },
  { name: '电子鼓', sounds: ['kick', 'snare', 'kick', 'snare'] },
  { name: '动次打次', sounds: ['kick', 'hihat', 'snare', 'hihat'] },
  { name: '808', sounds: ['kick', 'kick', 'snare', 'kick'] },
  { name: '空灵', sounds: ['wood', 'metal', 'wood', 'metal'] },
]