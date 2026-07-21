import type { PitchTrackPoint } from './pitch'

export interface PitchViewport {
  startTime: number
  endTime: number
}

export interface PitchTimelineBounds {
  minTime: number
  maxTime: number
  minSpan: number
}

export interface ChartPlotBounds {
  left: number
  right: number
}

export interface SvgRenderBox {
  rectLeft: number
  rectWidth: number
  rectHeight: number
  viewBoxWidth: number
  viewBoxHeight: number
}

export interface PitchFrequencyTick {
  frequencyHz: number
  noteName: string
}

export interface PitchPathOptions {
  minTime: number
  timeSpan: number
  minFrequency: number
  maxFrequency: number
  chartWidth: number
  chartHeight: number
  plot: ChartPlotBounds & { top: number; bottom: number }
  maxTimeGap?: number
  maxPitchJumpSemitones?: number
}

export function chartYFromFrequency(
  frequencyHz: number,
  minFrequency: number,
  maxFrequency: number,
  chartHeight: number,
  plotTop: number,
  plotBottom: number,
): number {
  const safeMin = Math.max(Number.EPSILON, minFrequency)
  const safeMax = Math.max(safeMin + Number.EPSILON, maxFrequency)
  const clampedFrequency = Math.min(safeMax, Math.max(safeMin, frequencyHz))
  const pitchSpan = Math.log2(safeMax / safeMin)
  const ratio = pitchSpan === 0 ? 0 : Math.log2(clampedFrequency / safeMin) / pitchSpan
  return chartHeight - plotBottom - ratio * (chartHeight - plotTop - plotBottom)
}

export function buildPitchPath(points: PitchTrackPoint[], options: PitchPathOptions): string {
  const maxTimeGap = options.maxTimeGap ?? Number.POSITIVE_INFINITY
  const maxPitchJumpSemitones = options.maxPitchJumpSemitones ?? Number.POSITIVE_INFINITY
  let path = ''
  let drawing = false
  let previousPoint: PitchTrackPoint | null = null

  for (const point of points) {
    if (!point.isVoiced || point.frequencyHz == null) {
      continue
    }
    const pitchJumpSemitones =
      previousPoint?.frequencyHz != null
        ? Math.abs(12 * Math.log2(point.frequencyHz / previousPoint.frequencyHz))
        : 0
    const timeGap = previousPoint ? point.time - previousPoint.time : 0
    if (pitchJumpSemitones > maxPitchJumpSemitones || timeGap > maxTimeGap) drawing = false

    const x =
      options.plot.left +
      ((point.time - options.minTime) / options.timeSpan) *
        (options.chartWidth - options.plot.left - options.plot.right)
    const y = chartYFromFrequency(
      point.frequencyHz,
      options.minFrequency,
      options.maxFrequency,
      options.chartHeight,
      options.plot.top,
      options.plot.bottom,
    )
    path += drawing ? ` L ${x.toFixed(1)} ${y.toFixed(1)}` : ` M ${x.toFixed(1)} ${y.toFixed(1)}`
    drawing = true
    previousPoint = point
  }
  return path.trim()
}

export function spaceFrequencyTicks(
  ticks: PitchFrequencyTick[],
  minFrequency: number,
  maxFrequency: number,
  chartHeight: number,
  plotTop: number,
  plotBottom: number,
  minSpacing = 28,
): PitchFrequencyTick[] {
  let previousY: number | null = null
  return ticks.filter((tick) => {
    const y = chartYFromFrequency(
      tick.frequencyHz,
      minFrequency,
      maxFrequency,
      chartHeight,
      plotTop,
      plotBottom,
    )
    if (previousY != null && Math.abs(y - previousY) < minSpacing) return false
    previousY = y
    return true
  })
}

export function clampPitchView(
  viewport: PitchViewport,
  bounds: PitchTimelineBounds,
): PitchViewport {
  const totalSpan = Math.max(bounds.minSpan, bounds.maxTime - bounds.minTime)
  const requestedSpan = Math.max(bounds.minSpan, viewport.endTime - viewport.startTime)
  const span = Math.min(requestedSpan, totalSpan)
  let startTime = viewport.startTime
  let endTime = startTime + span

  if (startTime < bounds.minTime) {
    startTime = bounds.minTime
    endTime = startTime + span
  }
  if (endTime > bounds.maxTime) {
    endTime = bounds.maxTime
    startTime = endTime - span
  }

  return {
    startTime: Number(startTime.toFixed(6)),
    endTime: Number(endTime.toFixed(6)),
  }
}

export function zoomPitchView(
  viewport: PitchViewport,
  scale: number,
  anchorTime: number,
  bounds: PitchTimelineBounds,
): PitchViewport {
  const currentSpan = Math.max(bounds.minSpan, viewport.endTime - viewport.startTime)
  const nextSpan = Math.max(bounds.minSpan, currentSpan * scale)
  const anchorRatio = currentSpan === 0 ? 0.5 : (anchorTime - viewport.startTime) / currentSpan
  const startTime = anchorTime - nextSpan * anchorRatio
  return clampPitchView({ startTime, endTime: startTime + nextSpan }, bounds)
}

export function panPitchView(
  viewport: PitchViewport,
  deltaTime: number,
  bounds: PitchTimelineBounds,
): PitchViewport {
  return clampPitchView(
    {
      startTime: viewport.startTime + deltaTime,
      endTime: viewport.endTime + deltaTime,
    },
    bounds,
  )
}

export function followPitchViewport(
  viewport: PitchViewport,
  cursorTime: number,
  minSpan = 12,
): PitchViewport {
  const span = Math.max(minSpan, viewport.endTime - viewport.startTime)
  const startTime = Math.max(0, cursorTime - span / 2)
  return {
    startTime: Number(startTime.toFixed(6)),
    endTime: Number((startTime + span).toFixed(6)),
  }
}

export function timeFromChartX(
  clientX: number,
  plot: ChartPlotBounds,
  chartWidth: number,
  viewport: PitchViewport,
): number {
  const drawableWidth = Math.max(1, chartWidth - plot.left - plot.right)
  const x = Math.min(drawableWidth, Math.max(0, clientX - plot.left))
  const ratio = x / drawableWidth
  return viewport.startTime + ratio * (viewport.endTime - viewport.startTime)
}

export function svgXFromClientX(clientX: number, box: SvgRenderBox): number {
  const rectAspect = box.rectWidth / Math.max(1, box.rectHeight)
  const viewBoxAspect = box.viewBoxWidth / Math.max(1, box.viewBoxHeight)
  const renderedWidth = rectAspect > viewBoxAspect ? box.rectHeight * viewBoxAspect : box.rectWidth
  const insetX = Math.max(0, (box.rectWidth - renderedWidth) / 2)
  const xInRenderedSvg = clientX - box.rectLeft - insetX
  const clampedX = Math.min(renderedWidth, Math.max(0, xInRenderedSvg))
  return (clampedX / Math.max(1, renderedWidth)) * box.viewBoxWidth
}

export function noteTicksForFrequencyRange(
  minFrequency: number,
  maxFrequency: number,
  maxTicks = 6,
): PitchFrequencyTick[] {
  if (
    !Number.isFinite(minFrequency) ||
    !Number.isFinite(maxFrequency) ||
    minFrequency <= 0 ||
    maxFrequency <= 0
  ) {
    return []
  }
  const minMidi = Math.ceil(69 + 12 * Math.log2(minFrequency / 440))
  const maxMidi = Math.floor(69 + 12 * Math.log2(maxFrequency / 440))
  if (maxMidi < minMidi) return []

  const count = maxMidi - minMidi + 1
  const step = Math.max(1, Math.ceil(count / Math.max(1, maxTicks)))
  const ticks: PitchFrequencyTick[] = []
  for (let midi = minMidi; midi <= maxMidi; midi += step) {
    ticks.push({
      frequencyHz: 440 * Math.pow(2, (midi - 69) / 12),
      noteName: displayNoteNameFromMidi(midi),
    })
  }
  if (
    ticks.length === 0 ||
    ticks[ticks.length - 1].frequencyHz < 440 * Math.pow(2, (maxMidi - 69) / 12)
  ) {
    ticks.push({
      frequencyHz: 440 * Math.pow(2, (maxMidi - 69) / 12),
      noteName: displayNoteNameFromMidi(maxMidi),
    })
  }
  return ticks
}

function displayNoteNameFromMidi(midi: number): string {
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B']
  const note = names[((midi % 12) + 12) % 12]
  const octave = Math.floor(midi / 12) - 1
  return `${note}${toSubscript(octave)}`
}

function toSubscript(value: number): string {
  const map: Record<string, string> = {
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
  return `${value}`
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
}
