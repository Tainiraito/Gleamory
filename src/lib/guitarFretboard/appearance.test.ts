import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FRETBOARD_APPEARANCE,
  FRETBOARD_APPEARANCE_PRESETS,
  getFretGridLayout,
} from './appearance'

describe('fretboard appearance', () => {
  it('exposes four fixed presets with rosewood as the default', () => {
    expect(DEFAULT_FRETBOARD_APPEARANCE).toBe('rosewood')
    expect(FRETBOARD_APPEARANCE_PRESETS.map((preset) => preset.id)).toEqual([
      'rosewood',
      'maple',
      'ebony',
      'practice',
    ])
  })

  it('uses equal-temperament fret widths after the open-string cell', () => {
    const layout = getFretGridLayout(Array.from({ length: 25 }, (_, fret) => fret))
    const tracks = layout.gridTemplateColumns
      .split(' ')
      .slice(1)
      .map((track) => Number.parseFloat(track))

    expect(tracks[0]).toBeCloseTo(0.65)
    expect(tracks[1]).toBeCloseTo(1)
    expect(tracks[13]).toBeCloseTo(0.5, 3)
    expect(tracks[24]).toBeCloseTo(2 ** (-23 / 12), 3)
    expect(tracks.slice(1).every((width, index, widths) => index === 0 || width < widths[index - 1]!)).toBe(true)
  })

  it('only creates tracks for requested frets', () => {
    expect(getFretGridLayout([0, 1, 2, 3]).gridTemplateColumns.split(' ')).toHaveLength(5)
  })
})
