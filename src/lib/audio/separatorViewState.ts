import type { SeparatorPhase } from '@/hooks/useSeparator'

export type UploadSurface = 'upload' | 'ready' | 'progress' | 'error'

export function getUploadSurface(phase: SeparatorPhase, hasSelectedFile: boolean): UploadSurface {
  if (phase === 'error' && hasSelectedFile) return 'error'
  if (phase === 'file-selected') return 'ready'
  if (phase === 'idle' || phase === 'cancelled' || phase === 'error' || phase === 'done') {
    return 'upload'
  }
  return 'progress'
}

export function getStemSelectionBadge(selected: boolean): '已选择' | null {
  return selected ? '已选择' : null
}
