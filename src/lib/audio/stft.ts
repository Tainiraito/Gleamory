/* ============================================================
 * STFT / ISTFT — 纯 JavaScript 实现
 * 用于 Spleeter 推理:音频 → 频谱 mask → 音频
 *
 * 参数(对齐 Spleeter 默认):
 *   n_fft       = 1024
 *   hop_length  = 256
 *   win_length  = 1024
 *   window      = hann(periodic)
 *   center      = True(ISTFT 时用)
 *   sample_rate = 44100
 *
 * 输出形状(对齐 ONNX 模型):
 *   STFT  → [freq_bins=512, frames] 复数矩阵
 *   切分  → [num_splits, 512, 1024]  每段 1024 帧(频谱)
 * ============================================================ */

/* ---------- FFT(Cooley-Tukey 迭代,radix-2) ---------- */

/** 原地复数 FFT(假设 n 是 2 的幂) */
function fftInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length
  // 位反转
  let j = 0
  for (let i = 1; i < n; i++) {
    let bit = n >> 1
    for (; j & bit; bit >>= 1) {
      j ^= bit
    }
    j ^= bit
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]]
      ;[im[i], im[j]] = [im[j], im[i]]
    }
  }
  // 蝶形
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1
    const ang = (-2 * Math.PI) / len
    const wRe = Math.cos(ang)
    const wIm = Math.sin(ang)
    for (let i = 0; i < n; i += len) {
      let curRe = 1
      let curIm = 0
      for (let k = 0; k < half; k++) {
        const a = i + k
        const b = i + k + half
        const tRe = curRe * re[b] - curIm * im[b]
        const tIm = curRe * im[b] + curIm * re[b]
        re[b] = re[a] - tRe
        im[b] = im[a] - tIm
        re[a] = re[a] + tRe
        im[a] = im[a] + tIm
        const newRe = curRe * wRe - curIm * wIm
        const newIm = curRe * wIm + curIm * wRe
        curRe = newRe
        curIm = newIm
      }
    }
  }
}

/** 原地复数 IFFT(就是 FFT + 除 n) */
function ifftInPlace(re: Float32Array, im: Float32Array): void {
  const n = re.length
  // 共轭
  for (let i = 0; i < n; i++) im[i] = -im[i]
  fftInPlace(re, im)
  // 再共轭 + 除 n
  for (let i = 0; i < n; i++) {
    re[i] /= n
    im[i] = -im[i] / n
  }
}

/* ---------- Hann 窗(periodic) ---------- */

/** Spleeter 用 periodic Hann(n_fft 长) */
function hannWindow(n: number): Float32Array {
  const w = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n))
  }
  return w
}

/* ---------- STFT(单声道) ---------- */

export interface StftOptions {
  nFft: number
  hopLength: number
  winLength: number
}

export interface StftResult {
  /** 复数频谱 shape = [nFft/2 + 1, num_frames] */
  real: Float32Array // length = (nFft/2+1) * numFrames
  imag: Float32Array
  numFrames: number
  numBins: number
}

export interface SpleeterStftSpec {
  realL: Float32Array
  imagL: Float32Array
  realR: Float32Array
  imagR: Float32Array
  numFrames: number
  numBins: number
  stftOpts: StftOptions
}

export interface MaskAccumulator {
  maskedReL: Float32Array
  maskedImL: Float32Array
  maskedReR: Float32Array
  maskedImR: Float32Array
  overlapCountL: Float32Array
  overlapCountR: Float32Array
}

const SPLEETER_MODEL_BINS = 512
const SPLEETER_FRAMES_PER_SPLIT = 1024
const SPLEETER_SPLIT_HOP = 512

/** STFT: 1D audio → 2D 复数频谱(行 = freq bins, 列 = frames) */
export function stft(audio: Float32Array, opts: StftOptions): StftResult {
  const { nFft, hopLength, winLength: _winLength } = opts
  void _winLength
  const numBins = nFft / 2 + 1
  // center=True: 用 reflect-pad 扩展左右各 nFft/2
  const pad = nFft / 2
  const padded = new Float32Array(audio.length + 2 * pad)
  // 反射填充
  for (let i = 0; i < pad; i++) {
    padded[i] = audio[pad - i]
    padded[padded.length - 1 - i] = audio[audio.length - 1 - i - (pad - 1 - i) - 1 < 0 ? 0 : audio.length - 1 - i - (pad - 1 - i) - 1]
  }
  // 简化:简单边界反射
  for (let i = 0; i < pad; i++) {
    padded[i] = audio[pad - i] ?? 0
  }
  for (let i = 0; i < pad; i++) {
    padded[pad + audio.length + i] = audio[audio.length - 1 - i] ?? 0
  }
  for (let i = 0; i < audio.length; i++) {
    padded[pad + i] = audio[i]
  }
  // 窗(periodic,长度 nFft,中心化在 winLength)
  const window = hannWindow(nFft)

  const numFrames = Math.max(1, Math.floor((padded.length - nFft) / hopLength) + 1)
  const real = new Float32Array(numBins * numFrames)
  const imag = new Float32Array(numBins * numFrames)

  const bufRe = new Float32Array(nFft)
  const bufIm = new Float32Array(nFft)
  for (let f = 0; f < numFrames; f++) {
    const start = f * hopLength
    // 加窗
    for (let i = 0; i < nFft; i++) {
      bufRe[i] = padded[start + i] * window[i]
      bufIm[i] = 0
    }
    // FFT
    fftInPlace(bufRe, bufIm)
    // 取前 numBins
    for (let k = 0; k < numBins; k++) {
      real[k * numFrames + f] = bufRe[k]
      imag[k * numFrames + f] = bufIm[k]
    }
  }
  return { real, imag, numFrames, numBins }
}

/* ---------- ISTFT(单声道) ---------- */

/** ISTFT: 2D 复数频谱 → 1D audio(列优先:real[i*numFrames + f] = bin i, frame f) */
export function istft(
  real: Float32Array,
  imag: Float32Array,
  numFrames: number,
  opts: StftOptions,
  expectedSamples: number,
): Float32Array {
  const { nFft, hopLength } = opts
  const numBins = nFft / 2 + 1
  const window = hannWindow(nFft)

  // 反 pad 后长度
  const paddedLen = (numFrames - 1) * hopLength + nFft
  const outPadded = new Float32Array(paddedLen)
  const weight = new Float32Array(paddedLen) // 累加窗平方(归一化用)

  const bufRe = new Float32Array(nFft)
  const bufIm = new Float32Array(nFft)
  for (let f = 0; f < numFrames; f++) {
    // 还原完整频谱
    for (let k = 0; k < numBins; k++) {
      bufRe[k] = real[k * numFrames + f]
      bufIm[k] = imag[k * numFrames + f]
    }
    // Hermitian 对称补全
    for (let k = numBins; k < nFft; k++) {
      const conj = nFft - k
      bufRe[k] = real[conj * numFrames + f]
      bufIm[k] = -imag[conj * numFrames + f]
    }
    // IFFT
    ifftInPlace(bufRe, bufIm)
    // 加窗 overlap-add
    for (let i = 0; i < nFft; i++) {
      outPadded[f * hopLength + i] += bufRe[i] * window[i]
      weight[f * hopLength + i] += window[i] * window[i]
    }
  }
  // 归一化
  for (let i = 0; i < outPadded.length; i++) {
    outPadded[i] = weight[i] > 1e-8 ? outPadded[i] / weight[i] : 0
  }
  // 去 pad(center=True 时)
  const pad = nFft / 2
  const out = new Float32Array(expectedSamples)
  for (let i = 0; i < expectedSamples; i++) {
    out[i] = outPadded[pad + i] ?? 0
  }
  return out
}

/* ---------- 切分成 split(对齐 ONNX 模型输入) ---------- */

export interface SplitSpec {
  freqBins: number // = 512
  framesPerSplit: number // = 1024
  hopLength: number
}

/** 把 STFT 频谱切成连续 split(overlap 50% 滑动窗口) */
export function stftToSplits(spec: StftResult, splitSpec: SplitSpec): {
  splits: Float32Array
  numSplits: number
} {
  const { numBins, numFrames } = spec
  const { freqBins, framesPerSplit } = splitSpec
  if (numBins < freqBins) {
    throw new Error(`freq bins 不足: STFT ${numBins} vs split ${freqBins}`)
  }
  // hop = framesPerSplit / 2 (50% overlap)
  const splitHop = Math.floor(framesPerSplit / 2)
  const numSplits = Math.max(1, Math.floor((numFrames - framesPerSplit) / splitHop) + 1)
  const splits = new Float32Array(numSplits * freqBins * framesPerSplit)
  for (let s = 0; s < numSplits; s++) {
    const startFrame = s * splitHop
    for (let k = 0; k < freqBins; k++) {
      for (let t = 0; t < framesPerSplit; t++) {
        const srcF = startFrame + t
        if (srcF < numFrames) {
          // 构造时域波形片段:先放原 STFT 实部(暂不处理 mask,等模型推理后再 mask)
          splits[s * freqBins * framesPerSplit + k * framesPerSplit + t] =
            spec.real[k * numFrames + srcF]
        }
      }
    }
  }
  return { splits, numSplits }
}

/** ONNX 输入是 [2, num_splits, 512, 1024]: L/R 通道各自算 STFT,stack 起来 */
export function buildSpleeterInput(
  audioL: Float32Array,
  audioR: Float32Array,
  sampleRate: number,
): {
  tensor: Float32Array
  numSplits: number
  stftSpec: SpleeterStftSpec
} {
  const { numSplits, stftSpec } = buildSpleeterStft(audioL, audioR, sampleRate)
  return {
    tensor: buildSpleeterInputBatch(stftSpec, numSplits, 0, numSplits),
    numSplits,
    stftSpec,
  }
}

export function buildSpleeterStft(
  audioL: Float32Array,
  audioR: Float32Array,
  sampleRate: number,
): {
  numSplits: number
  stftSpec: SpleeterStftSpec
} {
  void sampleRate // 44100 假设在 audio decode 阶段已经做了
  const nFft = 1024
  const hopLength = 256
  const stftOpts: StftOptions = { nFft, hopLength, winLength: nFft }
  const stftL = stft(audioL, stftOpts)
  const stftR = stft(audioR, stftOpts)
  // 形状必须一致
  if (stftL.numFrames !== stftR.numFrames) {
    throw new Error('L/R 帧数不匹配')
  }
  const numFrames = stftL.numFrames
  const numBins = stftL.numBins
  const numSplits = Math.max(1, Math.floor((numFrames - SPLEETER_FRAMES_PER_SPLIT) / SPLEETER_SPLIT_HOP) + 1)
  return {
    numSplits,
    stftSpec: {
      realL: stftL.real,
      imagL: stftL.imag,
      realR: stftR.real,
      imagR: stftR.imag,
      numFrames,
      numBins,
      stftOpts,
    },
  }
}

export function buildSpleeterInputBatch(
  stftSpec: SpleeterStftSpec,
  totalSplits: number,
  batchStart: number,
  batchSplits: number,
): Float32Array {
  const { numFrames } = stftSpec
  const tensor = new Float32Array(2 * batchSplits * SPLEETER_MODEL_BINS * SPLEETER_FRAMES_PER_SPLIT)
  // 把原 STFT 复数打包到 tensor(magnitude,|STFT|)
  // Spleeter 输入其实是带 magnitude+phase 的复数,简化用 magnitude
  for (let ch = 0; ch < 2; ch++) {
    const real = ch === 0 ? stftSpec.realL : stftSpec.realR
    const imag = ch === 0 ? stftSpec.imagL : stftSpec.imagR
    for (let localSplit = 0; localSplit < batchSplits; localSplit++) {
      const globalSplit = batchStart + localSplit
      if (globalSplit >= totalSplits) continue
      const startFrame = globalSplit * SPLEETER_SPLIT_HOP
      for (let k = 0; k < SPLEETER_MODEL_BINS; k++) {
        for (let t = 0; t < SPLEETER_FRAMES_PER_SPLIT; t++) {
          const srcF = startFrame + t
          let val = 0
          if (srcF < numFrames) {
            const re = real[k * numFrames + srcF]
            const im = imag[k * numFrames + srcF]
            val = Math.sqrt(re * re + im * im) // |STFT|
          }
          tensor[
            ch * batchSplits * SPLEETER_MODEL_BINS * SPLEETER_FRAMES_PER_SPLIT +
            localSplit * SPLEETER_MODEL_BINS * SPLEETER_FRAMES_PER_SPLIT +
            k * SPLEETER_FRAMES_PER_SPLIT +
            t
          ] = val
        }
      }
    }
  }
  return tensor
}

export function createMaskAccumulator(stftSpec: SpleeterStftSpec): MaskAccumulator {
  const stftBins = stftSpec.numBins
  const numFrames = stftSpec.numFrames
  return {
    maskedReL: new Float32Array(stftBins * numFrames),
    maskedImL: new Float32Array(stftBins * numFrames),
    maskedReR: new Float32Array(stftBins * numFrames),
    maskedImR: new Float32Array(stftBins * numFrames),
    overlapCountL: new Float32Array(SPLEETER_MODEL_BINS * numFrames),
    overlapCountR: new Float32Array(SPLEETER_MODEL_BINS * numFrames),
  }
}

export function accumulateMaskBatch(
  maskTensor: Float32Array,
  batchStart: number,
  batchSplits: number,
  stftSpec: SpleeterStftSpec,
  accumulator: MaskAccumulator,
  keepVocals: boolean,
): void {
  const numFrames = stftSpec.numFrames
  for (let ch = 0; ch < 2; ch++) {
    const origRe = ch === 0 ? stftSpec.realL : stftSpec.realR
    const origIm = ch === 0 ? stftSpec.imagL : stftSpec.imagR
    const maskedRe = ch === 0 ? accumulator.maskedReL : accumulator.maskedReR
    const maskedIm = ch === 0 ? accumulator.maskedImL : accumulator.maskedImR
    const overlapCount = ch === 0 ? accumulator.overlapCountL : accumulator.overlapCountR
    for (let localSplit = 0; localSplit < batchSplits; localSplit++) {
      const startFrame = (batchStart + localSplit) * SPLEETER_SPLIT_HOP
      for (let k = 0; k < SPLEETER_MODEL_BINS; k++) {
        for (let t = 0; t < SPLEETER_FRAMES_PER_SPLIT; t++) {
          const srcF = startFrame + t
          if (srcF >= numFrames) continue
          const maskIndex =
            ch * batchSplits * SPLEETER_MODEL_BINS * SPLEETER_FRAMES_PER_SPLIT +
            localSplit * SPLEETER_MODEL_BINS * SPLEETER_FRAMES_PER_SPLIT +
            k * SPLEETER_FRAMES_PER_SPLIT +
            t
          let mask = maskTensor[maskIndex]
          if (!keepVocals) mask = 1 - mask
          const re = origRe[k * numFrames + srcF]
          const im = origIm[k * numFrames + srcF]
          const mag = Math.sqrt(re * re + im * im)
          const newMag = mag * mask
          // 保持原 phase
          const ratio = mag > 1e-8 ? newMag / mag : 0
          maskedRe[k * numFrames + srcF] += re * ratio
          maskedIm[k * numFrames + srcF] += im * ratio
          overlapCount[k * numFrames + srcF] += 1
        }
      }
    }
  }
}

export function finalizeMaskAccumulator(
  accumulator: MaskAccumulator,
  stftSpec: SpleeterStftSpec,
  audioLength: number,
): { L: Float32Array; R: Float32Array } {
  const numFrames = stftSpec.numFrames
  // 平均
  for (let k = 0; k < SPLEETER_MODEL_BINS; k++) {
    for (let f = 0; f < numFrames; f++) {
      const i = k * numFrames + f
      if (accumulator.overlapCountL[i] > 0) {
        accumulator.maskedReL[i] /= accumulator.overlapCountL[i]
        accumulator.maskedImL[i] /= accumulator.overlapCountL[i]
      }
      if (accumulator.overlapCountR[i] > 0) {
        accumulator.maskedReR[i] /= accumulator.overlapCountR[i]
        accumulator.maskedImR[i] /= accumulator.overlapCountR[i]
      }
    }
  }
  const audioL = istft(accumulator.maskedReL, accumulator.maskedImL, numFrames, stftSpec.stftOpts, audioLength)
  const audioR = istft(accumulator.maskedReR, accumulator.maskedImR, numFrames, stftSpec.stftOpts, audioLength)
  return { L: audioL, R: audioR }
}

/** 用 mask 重建时域:vocals = mask * |STFT|, 伴奏 = (1 - mask) * |STFT|,ISTFT → audio */
export function applyMaskAndIStft(
  maskTensor: Float32Array,
  numSplits: number,
  stftSpec: SpleeterStftSpec,
  sampleRate: number,
  audioLength: number,
  keepVocals: boolean,
): { L: Float32Array; R: Float32Array } {
  void sampleRate
  const accumulator = createMaskAccumulator(stftSpec)
  accumulateMaskBatch(maskTensor, 0, numSplits, stftSpec, accumulator, keepVocals)
  return finalizeMaskAccumulator(accumulator, stftSpec, audioLength)
}
