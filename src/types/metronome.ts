import type { BeatSoundId } from '@/data/beatSounds'

export interface Beat {
  sound: BeatSoundId
  subdivisions: number // 1-4, 每拍的细分份数
}

export interface Measure {
  id: string
  beats: Beat[]
}

export type TempoMode = 'normal' | 'tempoChange'
export type TempoDirection = 'up' | 'down-up'

/** 每个节拍的细分份数：1=四分音符, 2=八分音符, 3=三连音, 4=十六分音符 */
export type Subdivision = 1 | 2 | 3 | 4

export const SUBDIVISION_OPTIONS: { value: Subdivision; label: string; note: string }[] = [
  { value: 1, label: '♩', note: '四分音符' },
  { value: 2, label: '♪', note: '八分音符' },
  { value: 3, label: '♩³', note: '三连音' },
  { value: 4, label: '♬', note: '十六分音符' },
]

export const MAX_SUBDIVISIONS = 4

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
    beats: Array.from({ length: beatCount }, () => ({ sound: 'wood' as BeatSoundId, subdivisions: 1 })),
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

/** 计算一个小节的总 tick 数（各拍 subdivisions 之和） */
export function ticksPerMeasure(measure: Measure, beatsPerMeasure: number): number {
  let total = 0
  for (let i = 0; i < beatsPerMeasure && i < measure.beats.length; i++) {
    total += measure.beats[i].subdivisions
  }
  return total
}

/** 计算所有小节的总 tick 数 */
export function totalTicks(measures: Measure[], beatsPerMeasure: number): number {
  return measures.reduce((sum, m) => sum + ticksPerMeasure(m, beatsPerMeasure), 0)
}

/** 根据全局 tick index 找到对应的 measure/beat/tick 信息 */
export function getTickInfo(
  globalTickIndex: number,
  measures: Measure[],
  beatsPerMeasure: number
): { measureIndex: number; beatIndex: number; tickInBeat: number; sound: BeatSoundId } | null {
  let cursor = 0
  for (let mi = 0; mi < measures.length; mi++) {
    const m = measures[mi]
    for (let bi = 0; bi < beatsPerMeasure && bi < m.beats.length; bi++) {
      const beat = m.beats[bi]
      for (let ti = 0; ti < beat.subdivisions; ti++) {
        if (cursor === globalTickIndex) {
          return { measureIndex: mi, beatIndex: bi, tickInBeat: ti, sound: beat.sound }
        }
        cursor++
      }
    }
  }
  return null
}

// Counter for generating unique measure IDs
let _measureIdCounter = 0
export function generateMeasureId(): string {
  return `m-${_measureIdCounter++}`
}

export function resetMeasureIdCounter() {
  _measureIdCounter = 0
}
