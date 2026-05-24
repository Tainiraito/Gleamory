import type { BeatSoundId } from '@/data/beatSounds'

export interface Beat {
  sound: BeatSoundId
}

export interface Measure {
  id: string
  beats: Beat[]
}

export type TempoMode = 'normal' | 'tempoChange'
export type TempoDirection = 'up' | 'down-up'

export interface TempoChangeConfig {
  startBpm: number
  endBpm: number
  beatsPerStep: number // 每多少轮改变一次速度
  step: number         // 每次改变多少 BPM
  direction: TempoDirection
}

export interface MetronomeConfig {
  bpm: number
  beatsPerMeasure: number
  measures: Measure[]
  tempoMode: TempoMode
  tempoChange: TempoChangeConfig
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
    tempoMode: 'normal',
    tempoChange: {
      startBpm: DEFAULT_BPM,
      endBpm: 180,
      beatsPerStep: 10,
      step: 10,
      direction: 'up',
    },
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
