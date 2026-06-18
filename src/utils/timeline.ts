import type { Update } from '@/types'

export function sortUpdatesByDateDesc(updates: readonly Update[]): Update[] {
  return updates
    .map((update, index) => ({
      update,
      index,
      timestamp: Date.parse(update.date),
    }))
    .sort((a, b) => {
      const aValid = Number.isFinite(a.timestamp)
      const bValid = Number.isFinite(b.timestamp)

      if (aValid && bValid) {
        return b.timestamp - a.timestamp || a.index - b.index
      }
      if (aValid) return -1
      if (bValid) return 1
      return a.index - b.index
    })
    .map(({ update }) => update)
}
