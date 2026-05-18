export interface Entry {
  name: string
  enabled: boolean
}

export interface HistoryRound {
  round: number
  results: string[]
}

export interface GachaState {
  entries: Entry[]
  mode: 'unique' | 'repeat'
  history: HistoryRound[]
  poolExhausted: boolean
}

export const STORAGE_KEY = 'gacha-simulator-state'

/** Fisher-Yates (Knuth) shuffle — returns a new shuffled array, does not mutate original */
export function fisherYatesShuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Deduplicate strings by value (case-sensitive). Keeps first occurrence. */
export function deduplicateByName(names: string[]): string[] {
  const seen = new Set<string>()
  return names.filter((name) => {
    if (seen.has(name)) return false
    seen.add(name)
    return true
  })
}

/** Parse raw text into trimmed, non-empty lines */
export function parseEntryText(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
}

/** Probability for each enabled entry given N enabled entries */
export function getEntryProbability(enabledCount: number): number {
  return enabledCount > 0 ? 1 / enabledCount : 0
}

/** Draw `count` items without replacement from the pool using Fisher-Yates shuffle */
export function drawUnique<T extends { name: string }>(
  pool: readonly T[],
  count: number
): string[] {
  const safe = Math.min(count, pool.length)
  if (safe <= 0) return []
  const shuffled = fisherYatesShuffle(pool)
  return shuffled.slice(0, safe).map((e) => e.name)
}

/** Draw `count` items with replacement — each draw is independent */
export function drawRepeat<T extends { name: string }>(
  pool: readonly T[],
  count: number
): string[] {
  if (pool.length === 0) return []
  return Array.from({ length: count }, () => {
    return pool[Math.floor(Math.random() * pool.length)].name
  })
}

/** Compute state after a mode switch. Returns null if mode didn't change. */
export function computeModeSwitch(
  currentMode: 'unique' | 'repeat',
  newMode: 'unique' | 'repeat',
  fullPool: Entry[]
): { mode: 'unique' | 'repeat'; entries: Entry[] } | null {
  if (newMode === currentMode) return null
  return { mode: newMode, entries: [...fullPool] }
}

export function loadState(): GachaState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const entries: Entry[] = Array.isArray(parsed.entries)
        ? parsed.entries.filter(
            (e: unknown) =>
              e != null &&
              typeof (e as Entry).name === 'string' &&
              typeof (e as Entry).enabled === 'boolean'
          )
        : []
      return {
        entries,
        mode: parsed.mode === 'unique' || parsed.mode === 'repeat' ? parsed.mode : 'unique',
        history: Array.isArray(parsed.history) ? parsed.history : [],
        poolExhausted: typeof parsed.poolExhausted === 'boolean' ? parsed.poolExhausted : false,
      }
    }
  } catch {
    /* corrupted data, reset */
  }
  return { entries: [], mode: 'unique', history: [], poolExhausted: false }
}

export function saveState(state: GachaState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota exceeded, silently ignore */
  }
}
