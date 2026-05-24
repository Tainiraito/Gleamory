import type { BeatSoundId } from '@/data/beatSounds'

export interface Beat {
  sound: BeatSoundId
}

export interface Measure {
  id: string
  beats: Beat[]
}

export interface MetronomeConfig {
  bpm: number
  beatsPerMeasure: number // shared across all measures
  measures: Measure[]
  loop: boolean
}

export const MIN_BPM = 30
export const MAX_BPM = 300
export const MIN_BEATS = 1
export const MAX_BEATS = 8
export const DEFAULT_BPM = 120
export const DEFAULT_BEATS = 4

export function createMeasure(id: string, beatCount: number): Measure {
  return {
    id,
    beats: Array.from({ length: beatCount }, () => ({ sound: 'wood' as BeatSoundId })),
  }
}

export function createDefaultConfig(): MetronomeConfig {
  return {
    bpm: DEFAULT_BPM,
    beatsPerMeasure: DEFAULT_BEATS,
    measures: [createMeasure(generateMeasureId(), DEFAULT_BEATS)],
    loop: true,
  }
}

// Counter for generating unique measure IDs
let _measureIdCounter = 0
export function generateMeasureId(): string {
  return `m-${_measureIdCounter++}`
}

export function resetMeasureIdCounter() {
  _measureIdCounter = 0
}