import { centsOffset, midiFromFrequency, noteNameFromMidi } from '@/utils/music'

export interface PitchDetection {
  frequencyHz: number | null
  midi: number | null
  noteName: string | null
  cents: number | null
  confidence: number
  isVoiced: boolean
}

export interface PitchTrackPoint extends PitchDetection {
  time: number
}

export interface PitchDetectionOptions {
  minFrequencyHz?: number
  maxFrequencyHz?: number
  rmsThreshold?: number
  confidenceThreshold?: number
}

export interface PitchTrackOptions extends PitchDetectionOptions {
  frameSize?: number
  hopSize?: number
}

export interface LivePitchStabilizerState {
  recentFrequencies: number[]
  lastVoiced: PitchDetection | null
  dropoutFrames: number
  smoothedFrequencyHz: number | null
}

export interface LivePitchStabilizerOptions {
  historySize?: number
  holdFrames?: number
  maxUncertainJumpSemitones?: number
  smoothingFactor?: number
  minStartConfidence?: number
  minNoteChangeConfidence?: number
}

const DEFAULT_MIN_FREQUENCY = 65
const DEFAULT_MAX_FREQUENCY = 1200
const DEFAULT_RMS_THRESHOLD = 0.01
const DEFAULT_CONFIDENCE_THRESHOLD = 0.88
const DEFAULT_FRAME_SIZE = 4096
const DEFAULT_HOP_SIZE = 1024

const UNVOICED: PitchDetection = {
  frequencyHz: null,
  midi: null,
  noteName: null,
  cents: null,
  confidence: 0,
  isVoiced: false,
}

export function detectPitch(
  frame: Float32Array,
  sampleRate: number,
  options: PitchDetectionOptions = {},
): PitchDetection {
  if (sampleRate <= 0 || frame.length < 2) return UNVOICED

  const minFrequencyHz = options.minFrequencyHz ?? DEFAULT_MIN_FREQUENCY
  const maxFrequencyHz = options.maxFrequencyHz ?? DEFAULT_MAX_FREQUENCY
  const rmsThreshold = options.rmsThreshold ?? DEFAULT_RMS_THRESHOLD
  const confidenceThreshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD
  const centeredFrame = removeDcOffset(frame)
  const rms = calculateRms(centeredFrame)

  if (rms < rmsThreshold) return UNVOICED

  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequencyHz))
  const maxTau = Math.min(frame.length - 1, Math.ceil(sampleRate / minFrequencyHz))
  if (maxTau <= minTau) return UNVOICED

  const normalizedDifference = calculateCumulativeMeanNormalizedDifference(centeredFrame, maxTau)
  const maxDifference = 1 - confidenceThreshold
  let bestTau = -1

  for (let tau = minTau; tau <= maxTau; tau++) {
    if (normalizedDifference[tau] > maxDifference) continue
    bestTau = tau
    while (bestTau < maxTau && normalizedDifference[bestTau + 1] < normalizedDifference[bestTau]) {
      bestTau += 1
    }
    break
  }

  if (bestTau < minTau) return UNVOICED

  const refinedTau = refineTau(normalizedDifference, bestTau)
  const frequencyHz = sampleRate / refinedTau
  if (frequencyHz < minFrequencyHz || frequencyHz > maxFrequencyHz) return UNVOICED

  const midi = midiFromFrequency(frequencyHz)
  const confidence = clamp(1 - normalizedDifference[bestTau], 0, 1)

  return {
    frequencyHz,
    midi,
    noteName: noteNameFromMidi(midi),
    cents: centsOffset(frequencyHz, midi),
    confidence,
    isVoiced: true,
  }
}

export function analyzePitchTrack(
  samples: Float32Array,
  sampleRate: number,
  options: PitchTrackOptions = {},
): PitchTrackPoint[] {
  const frameSize = options.frameSize ?? DEFAULT_FRAME_SIZE
  const hopSize = options.hopSize ?? DEFAULT_HOP_SIZE
  if (frameSize <= 0 || hopSize <= 0 || sampleRate <= 0 || samples.length < 2) return []

  const effectiveFrameSize = Math.min(Math.floor(frameSize), samples.length)
  const effectiveHopSize = Math.max(1, Math.floor(hopSize))

  const points: PitchTrackPoint[] = []
  for (let offset = 0; offset + effectiveFrameSize <= samples.length; offset += effectiveHopSize) {
    points.push({
      time: offset / sampleRate,
      ...detectPitch(samples.subarray(offset, offset + effectiveFrameSize), sampleRate, options),
    })
  }
  return smoothPitchTrack(points)
}

export function createLivePitchStabilizerState(): LivePitchStabilizerState {
  return {
    recentFrequencies: [],
    lastVoiced: null,
    dropoutFrames: 0,
    smoothedFrequencyHz: null,
  }
}

export function stabilizeLivePitch(
  detection: PitchDetection,
  state: LivePitchStabilizerState,
  options: LivePitchStabilizerOptions = {},
): PitchDetection {
  const historySize = Math.max(1, options.historySize ?? 7)
  const holdFrames = Math.max(0, options.holdFrames ?? 6)
  const maxUncertainJumpSemitones = options.maxUncertainJumpSemitones ?? 12
  const smoothingFactor = clamp(options.smoothingFactor ?? 0.42, 0, 1)
  const minStartConfidence = clamp(options.minStartConfidence ?? 0.88, 0, 1)
  const minNoteChangeConfidence = clamp(options.minNoteChangeConfidence ?? 0.9, 0, 1)

  if (!detection.isVoiced || detection.frequencyHz == null) {
    state.dropoutFrames += 1
    if (state.lastVoiced && state.dropoutFrames <= holdFrames) {
      return {
        ...state.lastVoiced,
        confidence: state.lastVoiced.confidence * Math.pow(0.9, state.dropoutFrames),
      }
    }
    if (state.dropoutFrames > holdFrames) {
      state.recentFrequencies = []
      state.lastVoiced = null
      state.smoothedFrequencyHz = null
    }
    return detection
  }

  const lastVoiced = state.lastVoiced
  const previousFrequency = lastVoiced?.frequencyHz
  if (!lastVoiced && detection.confidence < minStartConfidence) return UNVOICED
  if (lastVoiced && previousFrequency != null) {
    const jumpSemitones = Math.abs(12 * Math.log2(detection.frequencyHz / previousFrequency))
    const requiredConfidence =
      jumpSemitones > maxUncertainJumpSemitones
        ? Math.max(0.92, minNoteChangeConfidence)
        : minNoteChangeConfidence
    if (jumpSemitones > 1.5 && detection.confidence < requiredConfidence) {
      state.dropoutFrames += 1
      if (state.dropoutFrames <= holdFrames) {
        return {
          ...lastVoiced,
          confidence: lastVoiced.confidence * Math.pow(0.9, state.dropoutFrames),
        }
      }
      state.recentFrequencies = []
      state.lastVoiced = null
      state.smoothedFrequencyHz = null
      if (detection.confidence < minStartConfidence) return UNVOICED
    }
  }

  state.dropoutFrames = 0
  state.recentFrequencies.push(detection.frequencyHz)
  state.recentFrequencies = state.recentFrequencies.slice(-historySize)
  const nearbyFrequencies = state.recentFrequencies.filter(
    (frequency) => Math.abs(12 * Math.log2(frequency / detection.frequencyHz!)) <= 1.5,
  )
  const medianFrequency = median(nearbyFrequencies)
  const previousSmoothedFrequency = state.smoothedFrequencyHz
  const shouldSmooth =
    previousSmoothedFrequency != null &&
    Math.abs(12 * Math.log2(medianFrequency / previousSmoothedFrequency)) <= 1.5
  const smoothedFrequency = shouldSmooth
    ? geometricInterpolate(previousSmoothedFrequency, medianFrequency, smoothingFactor)
    : medianFrequency
  const midi = midiFromFrequency(smoothedFrequency)
  const stabilized = {
    ...detection,
    frequencyHz: smoothedFrequency,
    midi,
    noteName: noteNameFromMidi(midi),
    cents: centsOffset(smoothedFrequency, midi),
  }
  state.smoothedFrequencyHz = smoothedFrequency
  state.lastVoiced = stabilized
  return stabilized
}

export function smoothPitchTrack(points: PitchTrackPoint[]): PitchTrackPoint[] {
  const bridged = bridgeShortPitchGaps(points)
  return bridged.map((point, index) => {
    if (!point.isVoiced || point.frequencyHz == null) return point
    const neighbors = bridged
      .slice(Math.max(0, index - 2), Math.min(bridged.length, index + 3))
      .filter((candidate) => candidate.isVoiced && candidate.frequencyHz != null)
      .map((candidate) => candidate.frequencyHz as number)
      .filter((frequency) => Math.abs(12 * Math.log2(frequency / point.frequencyHz!)) <= 1.5)
      .sort((a, b) => a - b)
    if (neighbors.length < 2) return point

    const medianFrequency = median(neighbors)
    const midi = midiFromFrequency(medianFrequency)
    return {
      ...point,
      frequencyHz: medianFrequency,
      midi,
      noteName: noteNameFromMidi(midi),
      cents: centsOffset(medianFrequency, midi),
    }
  })
}

function bridgeShortPitchGaps(points: PitchTrackPoint[], maxGapFrames = 2): PitchTrackPoint[] {
  const bridged = points.map((point) => ({ ...point }))
  let index = 0
  while (index < bridged.length) {
    if (bridged[index].isVoiced) {
      index += 1
      continue
    }

    const gapStart = index
    while (index < bridged.length && !bridged[index].isVoiced) index += 1
    const gapEnd = index - 1
    const previous = bridged[gapStart - 1]
    const next = bridged[index]
    const gapLength = gapEnd - gapStart + 1
    if (
      gapLength > maxGapFrames ||
      !previous?.isVoiced ||
      previous.frequencyHz == null ||
      !next?.isVoiced ||
      next.frequencyHz == null ||
      Math.abs(12 * Math.log2(next.frequencyHz / previous.frequencyHz)) > 2
    ) {
      continue
    }

    for (let gapIndex = 0; gapIndex < gapLength; gapIndex++) {
      const ratio = (gapIndex + 1) / (gapLength + 1)
      const frequencyHz = geometricInterpolate(previous.frequencyHz, next.frequencyHz, ratio)
      const midi = midiFromFrequency(frequencyHz)
      bridged[gapStart + gapIndex] = {
        ...bridged[gapStart + gapIndex],
        frequencyHz,
        midi,
        noteName: noteNameFromMidi(midi),
        cents: centsOffset(frequencyHz, midi),
        confidence: Math.min(previous.confidence, next.confidence) * 0.8,
        isVoiced: true,
      }
    }
  }
  return bridged
}

function removeDcOffset(samples: Float32Array): Float32Array {
  let mean = 0
  for (let i = 0; i < samples.length; i++) mean += samples[i]
  mean /= samples.length
  const centered = new Float32Array(samples.length)
  for (let i = 0; i < samples.length; i++) centered[i] = samples[i] - mean
  return centered
}

function calculateCumulativeMeanNormalizedDifference(
  samples: Float32Array,
  maxTau: number,
): Float64Array {
  const difference = new Float64Array(maxTau + 1)
  const normalized = new Float64Array(maxTau + 1)
  const comparisonLength = samples.length - maxTau
  normalized[0] = 1

  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0
    for (let i = 0; i < comparisonLength; i++) {
      const delta = samples[i] - samples[i + tau]
      sum += delta * delta
    }
    difference[tau] = sum
  }

  let runningSum = 0
  for (let tau = 1; tau <= maxTau; tau++) {
    runningSum += difference[tau]
    normalized[tau] = runningSum === 0 ? 1 : (difference[tau] * tau) / runningSum
  }
  return normalized
}

function calculateRms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

function refineTau(yin: Float32Array | Float64Array, tau: number): number {
  if (tau <= 1 || tau >= yin.length - 1) return tau
  const left = yin[tau - 1]
  const center = yin[tau]
  const right = yin[tau + 1]
  const denominator = left - 2 * center + right
  if (Math.abs(denominator) < Number.EPSILON) return tau
  return tau + (left - right) / (2 * denominator)
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) return (sorted[middle - 1] + sorted[middle]) / 2
  return sorted[middle]
}

function geometricInterpolate(from: number, to: number, ratio: number): number {
  return Math.exp(Math.log(from) * (1 - ratio) + Math.log(to) * ratio)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
