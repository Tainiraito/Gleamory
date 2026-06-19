export function formatWorkerError(error: unknown): string {
  if (typeof error === 'number') {
    return `ONNX Runtime/WASM 内存分配失败: 需要约 ${formatMiB(error)}。请关闭其他占用内存的页面或改用更轻量模型。`
  }

  if (error instanceof Error) {
    return error.message
  }

  const message = String(error)
  if (/^\d+$/.test(message)) {
    const bytes = Number(message)
    return `ONNX Runtime/WASM 内存分配失败: 需要约 ${formatMiB(bytes)}。请关闭其他占用内存的页面或改用更轻量模型。`
  }

  return message
}

function formatMiB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
