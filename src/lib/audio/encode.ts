/* ============================================================
 * WAV 编码 — Float32 → 16-bit PCM WAV Blob
 * 不依赖 ffmpeg.wasm,纯 JS,文件 ~10MB/分钟
 * ============================================================ */

export type WavSamples = Float32Array | [Float32Array, Float32Array]

/**
 * 编码 Float32Array(单声道) 或 [L,R](立体声) 到 16-bit PCM WAV Blob。
 */
export function encodeWav(samples: WavSamples, sampleRate: number = 44100): Blob {
  const isStereo = Array.isArray(samples)
  const numChannels = isStereo ? 2 : 1
  const left = isStereo ? samples[0] : samples
  const right = isStereo ? samples[1] : null
  if (right && right.length !== left.length) {
    throw new Error(`左右声道长度不一致: L=${left.length}, R=${right.length}`)
  }
  const bitsPerSample = 16
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8
  const blockAlign = (numChannels * bitsPerSample) / 8
  const dataSize = left.length * numChannels * 2 // 16-bit = 2 bytes
  const bufferSize = 44 + dataSize

  const arrayBuffer = new ArrayBuffer(bufferSize)
  const view = new DataView(arrayBuffer)

  /* RIFF header */
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true) // file size - 8
  writeString(view, 8, 'WAVE')

  /* fmt chunk */
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // chunk size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, numChannels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)

  /* data chunk */
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  /* PCM samples */
  let offset = 44
  for (let i = 0; i < left.length; i++) {
    offset = writePcm16(view, offset, left[i])
    if (right) offset = writePcm16(view, offset, right[i])
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function writePcm16(view: DataView, offset: number, sample: number): number {
  let s = Math.max(-1, Math.min(1, sample))
  // float [-1, 1] → int16 [-32768, 32767]
  s = s < 0 ? s * 0x8000 : s * 0x7fff
  view.setInt16(offset, s, true)
  return offset + 2
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

/** 触发浏览器下载 Blob */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 延迟释放,确保下载触发
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
