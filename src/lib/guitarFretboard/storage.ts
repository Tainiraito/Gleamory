import type {
  AccidentalPreference,
  FretboardAppearanceId,
  FretboardMode,
  NoteDisplayDurationMs,
  StoredFretboardState,
  StringConfig,
  TuningPreset,
} from './types'
import { DEFAULT_FRETBOARD_APPEARANCE, FRETBOARD_APPEARANCE_IDS } from './appearance'
import { getTuningPreset } from './tuning'

const STORAGE_KEY = 'gleamory:guitar-fretboard-trainer:state'
const TUNING_IDS = new Set<TuningPreset['id']>(['standard', 'drop-d', 'half-step-down', 'dadgad', 'custom'])
const FRETBOARD_MODES = new Set<FretboardMode>(['all', 'natural', 'target', 'scale', 'degree', 'hidden'])

const defaultState: StoredFretboardState = {
  settings: {
    tuning: getTuningPreset('standard'),
    fretCount: 24,
    accidental: 'sharp',
    mode: 'hidden',
    noteDisplayMs: null,
    appearance: DEFAULT_FRETBOARD_APPEARANCE,
  },
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isStringConfig(value: unknown): value is StringConfig {
  if (!isRecord(value)) return false
  return (
    typeof value.stringNumber === 'number' &&
    typeof value.displayName === 'string' &&
    typeof value.openNote === 'string' &&
    typeof value.midiNumber === 'number'
  )
}

function isCompleteTuningPreset(value: unknown): value is TuningPreset {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string' || !TUNING_IDS.has(value.id as TuningPreset['id'])) {
    return false
  }
  return Array.isArray(value.strings) && value.strings.length === 6 && value.strings.every(isStringConfig)
}

function normalizeTuning(value: unknown): TuningPreset {
  if (isCompleteTuningPreset(value)) {
    return {
      id: value.id,
      name: value.name,
      strings: value.strings.map((string) => ({ ...string })),
    }
  }

  if (isRecord(value) && typeof value.id === 'string' && value.id !== 'custom') {
    try {
      return getTuningPreset(value.id as TuningPreset['id'])
    } catch {
      return defaultState.settings.tuning
    }
  }

  return defaultState.settings.tuning
}

function normalizeFretCount(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return defaultState.settings.fretCount
  return Math.min(24, Math.max(0, Math.trunc(value)))
}

function normalizeAccidental(value: unknown): AccidentalPreference {
  return value === 'flat' || value === 'sharp' ? value : defaultState.settings.accidental
}

function normalizeMode(value: unknown): FretboardMode {
  return typeof value === 'string' && FRETBOARD_MODES.has(value as FretboardMode) ? (value as FretboardMode) : defaultState.settings.mode
}

function normalizeNoteDisplayMs(value: unknown): NoteDisplayDurationMs {
  return value === null || value === 0 || value === 1000 || value === 3000 || value === 5000 ? value : defaultState.settings.noteDisplayMs
}

function normalizeAppearance(value: unknown): FretboardAppearanceId {
  return typeof value === 'string' && FRETBOARD_APPEARANCE_IDS.has(value as FretboardAppearanceId)
    ? value as FretboardAppearanceId
    : DEFAULT_FRETBOARD_APPEARANCE
}

export function loadFretboardState(): StoredFretboardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return defaultState

    const settings = isRecord(parsed.settings) ? parsed.settings : {}

    return {
      settings: {
        tuning: normalizeTuning(settings.tuning),
        fretCount: normalizeFretCount(settings.fretCount),
        accidental: normalizeAccidental(settings.accidental),
        mode: normalizeMode(settings.mode),
        noteDisplayMs: normalizeNoteDisplayMs(settings.noteDisplayMs),
        appearance: normalizeAppearance(settings.appearance),
      },
    }
  } catch {
    return defaultState
  }
}

export function saveFretboardState(state: StoredFretboardState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: state.settings }))
    return true
  } catch {
    return false
  }
}

export function resetFretboardState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
