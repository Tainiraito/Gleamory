import type { FretboardAppearanceId } from './types'

export interface FretboardAppearancePreset {
  id: FretboardAppearanceId
  name: string
  description: string
  preview: {
    board: string
    fret: string
    woundString: string
    plainString: string
  }
}

export const DEFAULT_FRETBOARD_APPEARANCE: FretboardAppearanceId = 'rosewood'

export const FRETBOARD_APPEARANCE_PRESETS = [
  {
    id: 'rosewood',
    name: '玫瑰木经典',
    description: '暖深木色，经典镍银质感',
    preview: { board: '#4a2d20', fret: '#d8c7a9', woundString: '#c7a56d', plainString: '#e7e3d8' },
  },
  {
    id: 'maple',
    name: '枫木明亮',
    description: '浅色木纹，边界清晰',
    preview: { board: '#c99558', fret: '#e4e7e5', woundString: '#c8b58e', plainString: '#f1f2ed' },
  },
  {
    id: 'ebony',
    name: '乌木舞台',
    description: '近黑乌木，冷银高光',
    preview: { board: '#171719', fret: '#cad1d4', woundString: '#aeb7bc', plainString: '#eef3f4' },
  },
  {
    id: 'practice',
    name: '高对比练习',
    description: '弱纹理，强化弦与品丝',
    preview: { board: '#303438', fret: '#ffffff', woundString: '#f0bf68', plainString: '#ffffff' },
  },
] as const satisfies readonly FretboardAppearancePreset[]

export const FRETBOARD_APPEARANCE_IDS = new Set<FretboardAppearanceId>(
  FRETBOARD_APPEARANCE_PRESETS.map((preset) => preset.id),
)

const OPEN_STRING_WEIGHT = 0.65
const FRET_SCALE_REM = 6.2
const LABEL_WIDTH_REM = 2.5
const MIN_GRID_WIDTH_REM = 28

function getFretWeight(fret: number): number {
  return fret === 0 ? OPEN_STRING_WEIGHT : 2 ** (-(fret - 1) / 12)
}

function formatTrack(weight: number): string {
  return `${Number(weight.toFixed(4))}fr`
}

export function getFretGridLayout(frets: number[]): { gridTemplateColumns: string; minWidth: string } {
  const weights = frets.map(getFretWeight)
  const minWidthRem = Math.max(
    MIN_GRID_WIDTH_REM,
    LABEL_WIDTH_REM + weights.reduce((total, weight) => total + weight, 0) * FRET_SCALE_REM,
  )

  return {
    gridTemplateColumns: [`${LABEL_WIDTH_REM}rem`, ...weights.map(formatTrack)].join(' '),
    minWidth: `${Number(minWidthRem.toFixed(2))}rem`,
  }
}
