import { describe, expect, it } from 'vitest'
import {
  buildPitchPath,
  chartYFromFrequency,
  clampPitchView,
  followPitchViewport,
  noteTicksForFrequencyRange,
  spaceFrequencyTicks,
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
    expect(
      clampPitchView({ startTime: -5, endTime: 10 }, { minTime: 0, maxTime: 60, minSpan: 2 }),
    ).toEqual({
      startTime: 0,
      endTime: 15,
    })
    expect(
      clampPitchView({ startTime: 55, endTime: 70 }, { minTime: 0, maxTime: 60, minSpan: 2 }),
    ).toEqual({
      startTime: 45,
      endTime: 60,
    })
  })

  it('keeps the live cursor centered after the first viewport fills', () => {
    expect(followPitchViewport({ startTime: 0, endTime: 20 }, 8)).toEqual({
      startTime: 0,
      endTime: 20,
    })
    expect(followPitchViewport({ startTime: 0, endTime: 20 }, 25)).toEqual({
      startTime: 15,
      endTime: 35,
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

  it('uses equal vertical distance for equal octave intervals', () => {
    const y110 = chartYFromFrequency(110, 55, 880, 360, 18, 30)
    const y220 = chartYFromFrequency(220, 55, 880, 360, 18, 30)
    const y440 = chartYFromFrequency(440, 55, 880, 360, 18, 30)

    expect(y110 - y220).toBeCloseTo(y220 - y440, 6)
  })

  it('removes vertical-axis labels that would overlap', () => {
    const ticks = noteTicksForFrequencyRange(65, 1200, 7)
    const spaced = spaceFrequencyTicks(ticks, 65, 1200, 360, 18, 30)

    expect(spaced.length).toBeLessThan(ticks.length)
    for (let index = 1; index < spaced.length; index++) {
      const previousY = chartYFromFrequency(spaced[index - 1].frequencyHz, 65, 1200, 360, 18, 30)
      const currentY = chartYFromFrequency(spaced[index].frequencyHz, 65, 1200, 360, 18, 30)
      expect(Math.abs(currentY - previousY)).toBeGreaterThanOrEqual(28)
    }
  })

  it('does not draw a vertical connector across a large pitch jump', () => {
    const voicedPoint = {
      midi: 57,
      noteName: 'A3',
      cents: 0,
      confidence: 0.96,
      isVoiced: true,
    }
    const path = buildPitchPath(
      [
        { time: 0, frequencyHz: 220, ...voicedPoint },
        { time: 0.04, frequencyHz: 440, ...voicedPoint, midi: 69, noteName: 'A4' },
      ],
      {
        minTime: 0,
        timeSpan: 1,
        minFrequency: 100,
        maxFrequency: 500,
        chartWidth: 960,
        chartHeight: 360,
        plot: { left: 48, right: 10, top: 18, bottom: 30 },
        maxTimeGap: 0.12,
        maxPitchJumpSemitones: 3,
      },
    )

    expect(path.split('M')).toHaveLength(3)
    expect(path).not.toContain(' L ')
  })
})
