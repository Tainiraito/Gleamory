export interface Entry {
  name: string
  enabled: boolean
}

export interface GachaState {
  entries: Entry[]
  history: string[]
  cardOrder: number[]
  flipped: boolean[]
  presetName: string
}

export type EntryMode = 'append' | 'overwrite'

export const STORAGE_KEY = 'gacha-simulator-state'

export function fisherYatesShuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items]

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }

  return shuffled
}

export function parseEntryText(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}

export function mergeEntryNames(
  currentNames: readonly string[],
  rawText: string,
  mode: EntryMode,
  dedupEnabled: boolean,
): string[] {
  const parsedNames = parseEntryText(rawText)
  const combined = mode === 'append' ? [...currentNames, ...parsedNames] : parsedNames

  if (!dedupEnabled) return combined

  return [...new Set(combined)]
}

export function createCardOrder(length: number): number[] {
  return fisherYatesShuffle(Array.from({ length }, (_, index) => index))
}

function isEntry(value: unknown): value is Entry {
  if (!value || typeof value !== 'object') return false

  const entry = value as Partial<Entry>
  return (
    typeof entry.name === 'string' &&
    entry.name.trim().length > 0 &&
    typeof entry.enabled === 'boolean'
  )
}

function isValidCardOrder(value: unknown, entryCount: number): value is number[] {
  if (!Array.isArray(value) || value.length !== entryCount) return false
  if (!value.every((index) => Number.isInteger(index) && index >= 0 && index < entryCount)) {
    return false
  }

  return new Set(value).size === entryCount
}

function isGachaState(
  value: unknown,
  validPresetNames: readonly string[],
): value is GachaState {
  if (!value || typeof value !== 'object') return false

  const state = value as Partial<GachaState>
  if (!Array.isArray(state.entries) || state.entries.length === 0) return false

  return (
    state.entries.every(isEntry) &&
    Array.isArray(state.history) &&
    state.history.every((item) => typeof item === 'string') &&
    isValidCardOrder(state.cardOrder, state.entries.length) &&
    Array.isArray(state.flipped) &&
    state.flipped.length === state.entries.length &&
    state.flipped.every((item) => typeof item === 'boolean') &&
    typeof state.presetName === 'string' &&
    validPresetNames.includes(state.presetName)
  )
}

export function loadState(
  defaultState: GachaState,
  validPresetNames: readonly string[],
): GachaState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState

    const parsed: unknown = JSON.parse(raw)
    return isGachaState(parsed, validPresetNames) ? parsed : defaultState
  } catch {
    return defaultState
  }
}

export function saveState(state: GachaState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage may be unavailable or full; the simulator remains usable in memory.
  }
}
