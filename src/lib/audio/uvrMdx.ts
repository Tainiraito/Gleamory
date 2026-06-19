import { istft, stft, type StftOptions, type StftResult } from './stft'

export interface UvrMdxStereo {
  left: Float32Array
  right: Float32Array
}

export interface RunUvrMdxVocalsOptions {
  left: Float32Array
  right: Float32Array
  expectedSamples: number
  fftSize: number
  hopSize: number
  dimF: number
  dimT: number
  runChunk: (input: Float32Array, chunkIndex: number, frameStart: number) => Promise<Float32Array>
  onProgress?: (chunkIndex: number, totalChunks: number, frameStart: number) => void
}

export function getUvrMdxFrameStarts(numFrames: number, dimT: number): number[] {
  if (numFrames <= dimT) return [0]
  const starts: number[] = []
  for (let start = 0; start < numFrames; start += dimT) {
    if (start + dimT >= numFrames) {
      starts.push(Math.max(0, numFrames - dimT))
      break
    }
    starts.push(start)
  }
  return Array.from(new Set(starts))
}

export async function runUvrMdxVocals({
  left,
  right,
  expectedSamples,
  fftSize,
  hopSize,
  dimF,
  dimT,
  runChunk,
  onProgress,
}: RunUvrMdxVocalsOptions): Promise<UvrMdxStereo> {
  if (left.length !== right.length) {
    throw new Error(`UVR-MDX 输入左右声道长度不一致: L=${left.length}, R=${right.length}`)
  }

  const opts: StftOptions = { nFft: fftSize, hopLength: hopSize, winLength: fftSize }
  const stftL = stft(left, opts)
  const stftR = stft(right, opts)
  const starts = getUvrMdxFrameStarts(stftL.numFrames, dimT)
  const accMagL = new Float32Array(stftL.numBins * stftL.numFrames)
  const accMagR = new Float32Array(stftR.numBins * stftR.numFrames)
  const weights = new Float32Array(stftL.numFrames)

  for (let i = 0; i < starts.length; i++) {
    const frameStart = starts[i]
    onProgress?.(i, starts.length, frameStart)
    const input = buildUvrMdxInput(stftL, stftR, frameStart, dimF, dimT)
    const output = await runChunk(input, i, frameStart)
    accumulateUvrMdxMagnitude(output, frameStart, dimF, dimT, stftL.numFrames, accMagL, accMagR, weights)
  }

  const vocalsL = reconstructFromMagnitude(stftL, accMagL, weights, opts, expectedSamples)
  const vocalsR = reconstructFromMagnitude(stftR, accMagR, weights, opts, expectedSamples)
  return { left: vocalsL, right: vocalsR }
}

function buildUvrMdxInput(
  stftL: StftResult,
  stftR: StftResult,
  frameStart: number,
  dimF: number,
  dimT: number,
): Float32Array {
  const input = new Float32Array(2 * dimF * dimT)
  fillMagnitudeChannel(input, 0, stftL, frameStart, dimF, dimT)
  fillMagnitudeChannel(input, 1, stftR, frameStart, dimF, dimT)
  return input
}

function fillMagnitudeChannel(
  input: Float32Array,
  channel: 0 | 1,
  spec: StftResult,
  frameStart: number,
  dimF: number,
  dimT: number,
): void {
  const channelOffset = channel * dimF * dimT
  const freqBins = Math.min(dimF, spec.numBins)
  for (let f = 0; f < freqBins; f++) {
    for (let t = 0; t < dimT; t++) {
      const frame = frameStart + t
      if (frame >= spec.numFrames) continue
      const src = f * spec.numFrames + frame
      input[channelOffset + f * dimT + t] = Math.hypot(spec.real[src], spec.imag[src])
    }
  }
}

function accumulateUvrMdxMagnitude(
  output: Float32Array,
  frameStart: number,
  dimF: number,
  dimT: number,
  numFrames: number,
  accMagL: Float32Array,
  accMagR: Float32Array,
  weights: Float32Array,
): void {
  for (let f = 0; f < dimF; f++) {
    for (let t = 0; t < dimT; t++) {
      const frame = frameStart + t
      if (frame >= numFrames) continue
      const dst = f * numFrames + frame
      accMagL[dst] += output[f * dimT + t]
      accMagR[dst] += output[dimF * dimT + f * dimT + t]
      weights[frame] += f === 0 ? 1 : 0
    }
  }
}

function reconstructFromMagnitude(
  spec: StftResult,
  accMag: Float32Array,
  weights: Float32Array,
  opts: StftOptions,
  expectedSamples: number,
): Float32Array {
  const real = new Float32Array(spec.real.length)
  const imag = new Float32Array(spec.imag.length)
  for (let f = 0; f < spec.numBins; f++) {
    for (let t = 0; t < spec.numFrames; t++) {
      const i = f * spec.numFrames + t
      const sourceMag = Math.hypot(spec.real[i], spec.imag[i])
      const targetMag = weights[t] > 0 ? accMag[i] / weights[t] : 0
      const scale = sourceMag > 1e-8 ? targetMag / sourceMag : 0
      real[i] = spec.real[i] * scale
      imag[i] = spec.imag[i] * scale
    }
  }
  return istft(real, imag, spec.numFrames, opts, expectedSamples)
}
