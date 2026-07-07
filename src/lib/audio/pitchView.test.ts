import { describe, expect, it } from 'vitest'
import {
  clampPitchView,
  noteTicksForFrequencyRange,
  svgXFromClientX,
  timeFromChartX,
  zoomPitchView,
  type PitchViewport,
} from './pitchView'

describe('pitch view utilities', () => {
  const viewport: PitchViewport = { startTime: 10, endTime: 30 }

  it('converts chart x position to a time inside the visible window', () => {
    expect(timeFromChartX(50, { left: 50, right: 10 }, 500, viewport)).toBeCloseTo(10)
    expect(timeFromChartX(490, { left: 50, right: 10 }, 500, viewport)).toBeCloseTo(30)
    expect(timeFromChartX(270, { left: 50, right: 10 }, 500, viewport)).toBeCloseTo(20)
  })

  it('zooms around an anchor without exceeding the total timeline', () => {
    const zoomed = zoomPitchView(viewport, 0.5, 20, { minTime: 0, maxTime: 60, minSpan: 2 })
    expect(zoomed.startTime).toBeCloseTo(15)
    expect(zoomed.endTime).toBeCloseTo(25)
  })

  it('clamps panned windows to timeline bounds', () => {
    expect(clampPitchView({ startTime: -5, endTime: 10 }, { minTime: 0, maxTime: 60, minSpan: 2 })).toEqual({
      startTime: 0,
      endTime: 15,
    })
    expect(clampPitchView({ startTime: 55, endTime: 70 }, { minTime: 0, maxTime: 60, minSpan: 2 })).toEqual({
      startTime: 45,
      endTime: 60,
    })
  })

  it('maps client x through actual rendered svg content when the svg is letterboxed', () => {
    const svgX = svgXFromClientX(350, {
      rectLeft: 100,
      rectWidth: 500,
      rectHeight: 500,
      viewBoxWidth: 1000,
      viewBoxHeight: 400,
    })
    expect(svgX).toBeCloseTo(500)
  })

  it('builds frequency ticks with musical note names', () => {
    const ticks = noteTicksForFrequencyRange(220, 880, 4)
    expect(ticks[0]).toMatchObject({ noteName: 'A₃' })
    expect(ticks[ticks.length - 1]).toMatchObject({ noteName: 'A₅' })
  })
})
