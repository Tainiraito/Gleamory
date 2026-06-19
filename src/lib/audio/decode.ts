/* ============================================================
 * 音频解码 — File → AudioBuffer
 * 用浏览器原生 Web Audio API,无需 ffmpeg
 * ============================================================ */

let _ctx: AudioContext | null = null

/** 懒加载 AudioContext(浏览器要求 user gesture 后才能 resume) */
export function getAudioContext(): AudioContext {
  if (!_ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    _ctx = new Ctor()
  }
  return _ctx
}

/**
 * 把上传的音频文件解码为 AudioBuffer。
 * 支持浏览器原生能解的格式(mp3 / wav / flac / m4a / ogg / opus / webm)。
 */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = getAudioContext()
  const arrayBuffer = await file.arrayBuffer()
  // decodeAudioData 会转移 arrayBuffer 的所有权(变成 0-length),调用方别再用
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
  return audioBuffer
}

/** 把 AudioBuffer 转成单声道 Float32Array(平均 L/R) */
export function toMono(audioBuffer: AudioBuffer): Float32Array {
  const channels = audioBuffer.numberOfChannels
  const length = audioBuffer.length
  if (channels === 1) {
    return audioBuffer.getChannelData(0).slice()
  }
  const left = audioBuffer.getChannelData(0)
  const right = audioBuffer.getChannelData(1)
  const mono = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    mono[i] = (left[i] + right[i]) * 0.5
  }
  return mono
}

/**
 * 把 AudioBuffer 转成立体声 L/R 通道(mono → 双声道复制)
 * Spleeter 需要立体声输入([2, num_splits, 512, 1024])
 */
export function toStereo(audioBuffer: AudioBuffer): { L: Float32Array; R: Float32Array } {
  if (audioBuffer.numberOfChannels === 1) {
    const m = audioBuffer.getChannelData(0)
    return { L: m.slice(), R: m.slice() }
  }
  return {
    L: audioBuffer.getChannelData(0).slice(),
    R: audioBuffer.getChannelData(1).slice(),
  }
}

/** 文件大小限制(默认 100MB),超过抛错 */
export function validateFileSize(file: File, maxMB = 100): void {
  const sizeMB = file.size / 1024 / 1024
  if (sizeMB > maxMB) {
    throw new Error(`文件太大 (${sizeMB.toFixed(1)} MB),超过 ${maxMB} MB 限制。请用更短的片段。`)
  }
}

/** 音频时长限制(默认 10 分钟) */
export function validateDuration(audioBuffer: AudioBuffer, maxMinutes = 10): void {
  const minutes = audioBuffer.duration / 60
  if (minutes > maxMinutes) {
    throw new Error(`音频太长 (${minutes.toFixed(1)} 分钟),超过 ${maxMinutes} 分钟限制。请用更短的片段。`)
  }
}
