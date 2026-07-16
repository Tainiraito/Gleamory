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
}

export interface LivePitchStabilizerOptions {
  historySize?: number
  holdFrames?: number
  maxUncertainJumpSemitones?: number
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
  const rms = calculateRms(frame)

  if (rms < rmsThreshold) return UNVOICED

  const minTau = Math.max(2, Math.floor(sampleRate / maxFrequencyHz))
  const maxTau = Math.min(frame.length - 1, Math.ceil(sampleRate / minFrequencyHz))
  if (maxTau <= minTau) return UNVOICED

  const correlations = new Float32Array(maxTau + 1)
  for (let tau = minTau; tau <= maxTau; tau++) {
    let cross = 0
    let leftEnergy = 0
    let rightEnergy = 0
    const limit = frame.length - tau
    for (let i = 0; i < limit; i++) {
      const left = frame[i]
      const right = frame[i + tau]
      cross += left * right
      leftEnergy += left * left
      rightEnergy += right * right
    }
    const denominator = Math.sqrt(leftEnergy * rightEnergy)
    correlations[tau] = denominator === 0 ? 0 : cross / denominator
  }

  let bestTau = -1
  let bestConfidence = 0

  for (let tau = minTau + 1; tau < maxTau; tau++) {
    const confidence = correlations[tau]
    const isLocalPeak = confidence >= correlations[tau - 1] && confidence > correlations[tau + 1]
    if (isLocalPeak && confidence > bestConfidence) {
      bestConfidence = confidence
      bestTau = tau
    }
    if (isLocalPeak && confidence >= confidenceThreshold) {
      bestConfidence = confidence
      bestTau = tau
      break
    }
  }

  if (bestTau < minTau || bestConfidence < confidenceThreshold) return UNVOICED

  const refinedTau = refineTau(correlations, bestTau)
  const frequencyHz = sampleRate / refinedTau
  if (frequencyHz < minFrequencyHz || frequencyHz > maxFrequencyHz) return UNVOICED

  const midi = midiFromFrequency(frequencyHz)
  const confidence = clamp(bestConfidence, 0, 1)

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
  return { recentFrequencies: [], lastVoiced: null, dropoutFrames: 0 }
}

export function stabilizeLivePitch(
  detection: PitchDetection,
  state: LivePitchStabilizerState,
  options: LivePitchStabilizerOptions = {},
): PitchDetection {
  const historySize = Math.max(1, options.historySize ?? 5)
  const holdFrames = Math.max(0, options.holdFrames ?? 2)
  const maxUncertainJumpSemitones = options.maxUncertainJumpSemitones ?? 7

  if (!detection.isVoiced || detection.frequencyHz == null) {
    state.dropoutFrames += 1
    if (state.lastVoiced && state.dropoutFrames <= holdFrames) {
      return {
        ...state.lastVoiced,
        confidence: state.lastVoiced.confidence * Math.pow(0.82, state.dropoutFrames),
      }
    }
    if (state.dropoutFrames > holdFrames) state.recentFrequencies = []
    return detection
  }

  const lastVoiced = state.lastVoiced
  const previousFrequency = lastVoiced?.frequencyHz
  if (previousFrequency != null) {
    const jumpSemitones = Math.abs(12 * Math.log2(detection.frequencyHz / previousFrequency))
    if (lastVoiced && jumpSemitones > maxUncertainJumpSemitones && detection.confidence < 0.97) {
      state.dropoutFrames = 1
      return { ...lastVoiced, confidence: lastVoiced.confidence * 0.82 }
    }
  }

  state.dropoutFrames = 0
  state.recentFrequencies.push(detection.frequencyHz)
  state.recentFrequencies = state.recentFrequencies.slice(-historySize)
  const sorted = [...state.recentFrequencies].sort((a, b) => a - b)
  const medianFrequency = sorted[Math.floor(sorted.length / 2)]
  const midi = midiFromFrequency(medianFrequency)
  const stabilized = {
    ...detection,
    frequencyHz: medianFrequency,
    midi,
    noteName: noteNameFromMidi(midi),
    cents: centsOffset(medianFrequency, midi),
  }
  state.lastVoiced = stabilized
  return stabilized
}

export function smoothPitchTrack(points: PitchTrackPoint[]): PitchTrackPoint[] {
  return points.map((point, index) => {
    if (!point.isVoiced || point.frequencyHz == null) return point
    const neighbors = points
      .slice(Math.max(0, index - 1), Math.min(points.length, index + 2))
      .filter((candidate) => candidate.isVoiced && candidate.frequencyHz != null)
      .map((candidate) => candidate.frequencyHz as number)
      .sort((a, b) => a - b)
    if (neighbors.length < 3) return point

    const medianFrequency = neighbors[1]
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

function calculateRms(samples: Float32Array): number {
  let sum = 0
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i]
  }
  return Math.sqrt(sum / samples.length)
}

function refineTau(yin: Float32Array, tau: number): number {
  if (tau <= 1 || tau >= yin.length - 1) return tau
  const left = yin[tau - 1]
  const center = yin[tau]
  const right = yin[tau + 1]
  const denominator = left - 2 * center + right
  if (Math.abs(denominator) < Number.EPSILON) return tau
  return tau + (left - right) / (2 * denominator)
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}
