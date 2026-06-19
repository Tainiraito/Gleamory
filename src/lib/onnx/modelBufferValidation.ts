import type { ModelInfo } from './modelRegistry'

const MIN_SIZE_RATIO = 0.5
const MIN_ONNX_BYTES = 1024 * 1024

export function validateModelBuffer(model: ModelInfo, buffer: ArrayBuffer): void {
  const byteLength = buffer.byteLength
  const minBytes = Math.max(MIN_ONNX_BYTES, Math.floor(model.sizeBytes * MIN_SIZE_RATIO))

  if (byteLength < minBytes) {
    const text = decodePrefix(buffer)
    if (looksLikeHtml(text)) {
      throw new Error(`下载内容不是有效 ONNX: ${model.name} 返回了 HTML/错误页`)
    }
    if (looksLikeGitLfsPointer(text)) {
      throw new Error(`下载内容是 Git LFS 指针,不是实际 ONNX 文件: ${model.name}`)
    }
    throw new Error(
      `模型文件过小: ${model.name} 只有 ${(byteLength / 1024 / 1024).toFixed(2)} MB,预期约 ${(model.sizeBytes / 1024 / 1024).toFixed(0)} MB`,
    )
  }
}

function decodePrefix(buffer: ArrayBuffer): string {
  const prefix = buffer.slice(0, Math.min(buffer.byteLength, 512))
  return new TextDecoder('utf-8', { fatal: false }).decode(prefix).trim().toLowerCase()
}

function looksLikeHtml(text: string): boolean {
  return text.startsWith('<!doctype html') || text.startsWith('<html') || text.includes('<body')
}

function looksLikeGitLfsPointer(text: string): boolean {
  return text.startsWith('version https://git-lfs.github.com/spec/v1')
}
