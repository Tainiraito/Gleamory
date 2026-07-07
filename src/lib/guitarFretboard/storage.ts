import type { StoredFretboardState } from './types'
import { getTuningPreset } from './tuning'

const STORAGE_KEY = 'gleamory:guitar-fretboard-trainer:state'
const MAX_SESSIONS = 1000

const defaultState: StoredFretboardState = {
  settings: {
    tuning: getTuningPreset('standard'),
    fretCount: 24,
    accidental: 'sharp',
    mode: 'hidden',
  },
  sessions: [],
  skillStates: {},
}

export function loadFretboardState(): StoredFretboardState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultState

  try {
    const parsed = JSON.parse(raw) as StoredFretboardState
    return {
      settings: {
        tuning: parsed.settings?.tuning ?? defaultState.settings.tuning,
        fretCount: parsed.settings?.fretCount ?? defaultState.settings.fretCount,
        accidental: parsed.settings?.accidental ?? defaultState.settings.accidental,
        mode: parsed.settings?.mode ?? defaultState.settings.mode,
      },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions.slice(-MAX_SESSIONS) : [],
      skillStates: parsed.skillStates ?? {},
    }
  } catch {
    return defaultState
  }
}

export function saveFretboardState(state: StoredFretboardState): void {
  const cappedState: StoredFretboardState = {
    ...state,
    sessions: state.sessions.slice(-MAX_SESSIONS),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cappedState))
}

export function resetFretboardState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
