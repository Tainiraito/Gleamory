import type {
  AccidentalPreference,
  DailyPracticeRecord,
  FretboardMode,
  NoteDisplayDurationMs,
  PracticeSession,
  QuizType,
  StoredFretboardState,
  StringConfig,
  TuningPreset,
} from './types'
import { buildDailyRecords, getSessionDate } from './practiceHistory'
import { getTuningPreset } from './tuning'

const STORAGE_KEY = 'gleamory:guitar-fretboard-trainer:state'
const MAX_SESSIONS = 5000
const MAX_DAILY_RECORDS = 400
const TUNING_IDS = new Set<TuningPreset['id']>(['standard', 'drop-d', 'half-step-down', 'dadgad', 'custom'])
const FRETBOARD_MODES = new Set<FretboardMode>(['all', 'natural', 'target', 'scale', 'degree', 'hidden'])
const QUIZ_TYPES = new Set<QuizType>(['find-note', 'identify-note', 'octave', 'interval', 'scale-degree'])

const defaultState: StoredFretboardState = {
  settings: {
    tuning: getTuningPreset('standard'),
    fretCount: 24,
    accidental: 'sharp',
    mode: 'hidden',
    noteDisplayMs: null,
  },
  sessions: [],
  dailyRecords: {},
  skillStates: {},
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

function inferQuizType(prompt: unknown): QuizType | undefined {
  if (typeof prompt !== 'string') return undefined
  if (prompt.includes('是什么音')) return 'identify-note'
  if (prompt.includes('同音八度')) return 'octave'
  if (prompt.includes('上方')) return 'interval'
  if (prompt.includes('大调的')) return 'scale-degree'
  if (prompt.includes('找出所有')) return 'find-note'
  return undefined
}

function normalizeSession(value: unknown): PracticeSession | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.startedAt !== 'string' || typeof value.endedAt !== 'string') return null
  const totalQuestions = typeof value.totalQuestions === 'number' ? value.totalQuestions : 1
  const correctQuestions = typeof value.correctQuestions === 'number' ? value.correctQuestions : 0
  const averageResponseMs = typeof value.averageResponseMs === 'number' ? value.averageResponseMs : 0
  const quizType = typeof value.quizType === 'string' && QUIZ_TYPES.has(value.quizType as QuizType)
    ? value.quizType as QuizType
    : inferQuizType(value.questionPrompt)
  const session: PracticeSession = {
    id: value.id,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    localDate: typeof value.localDate === 'string' ? value.localDate : undefined,
    quizType,
    isCorrect: typeof value.isCorrect === 'boolean' ? value.isCorrect : correctQuestions === totalQuestions,
    questionPrompt: typeof value.questionPrompt === 'string' ? value.questionPrompt : undefined,
    responseMs: typeof value.responseMs === 'number' ? value.responseMs : averageResponseMs,
    totalQuestions,
    correctQuestions,
    accuracy: totalQuestions === 0 ? 0 : correctQuestions / totalQuestions,
    averageResponseMs,
    weakNotes: Array.isArray(value.weakNotes) ? value.weakNotes.filter((note): note is string => typeof note === 'string') : [],
  }
  session.localDate = getSessionDate(session)
  return session
}

function normalizeDailyRecord(date: string, value: unknown): DailyPracticeRecord | null {
  if (!isRecord(value)) return null
  const totalQuestions = typeof value.totalQuestions === 'number' ? value.totalQuestions : 0
  const correctQuestions = typeof value.correctQuestions === 'number' ? value.correctQuestions : 0
  const totalResponseMs = typeof value.totalResponseMs === 'number' ? value.totalResponseMs : 0
  const byQuizType: DailyPracticeRecord['byQuizType'] = {}
  if (isRecord(value.byQuizType)) {
    Object.entries(value.byQuizType).forEach(([type, stats]) => {
      if (!QUIZ_TYPES.has(type as QuizType) || !isRecord(stats)) return
      byQuizType[type as QuizType] = {
        totalQuestions: typeof stats.totalQuestions === 'number' ? stats.totalQuestions : 0,
        correctQuestions: typeof stats.correctQuestions === 'number' ? stats.correctQuestions : 0,
        totalResponseMs: typeof stats.totalResponseMs === 'number' ? stats.totalResponseMs : 0,
      }
    })
  }
  return { date, totalQuestions, correctQuestions, totalResponseMs, byQuizType }
}

function capDailyRecords(records: Record<string, DailyPracticeRecord>): Record<string, DailyPracticeRecord> {
  return Object.fromEntries(Object.entries(records).sort(([a], [b]) => b.localeCompare(a)).slice(0, MAX_DAILY_RECORDS))
}

export function loadFretboardState(): StoredFretboardState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultState

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return defaultState

    const settings = isRecord(parsed.settings) ? parsed.settings : {}

    const sessions = Array.isArray(parsed.sessions)
      ? parsed.sessions.map(normalizeSession).filter((session): session is PracticeSession => session !== null).slice(0, MAX_SESSIONS)
      : []
    const storedDailyRecords = isRecord(parsed.dailyRecords)
      ? Object.fromEntries(
          Object.entries(parsed.dailyRecords)
            .map(([date, value]) => [date, normalizeDailyRecord(date, value)] as const)
            .filter((entry): entry is readonly [string, DailyPracticeRecord] => entry[1] !== null),
        )
      : {}

    return {
      settings: {
        tuning: normalizeTuning(settings.tuning),
        fretCount: normalizeFretCount(settings.fretCount),
        accidental: normalizeAccidental(settings.accidental),
        mode: normalizeMode(settings.mode),
        noteDisplayMs: normalizeNoteDisplayMs(settings.noteDisplayMs),
      },
      sessions,
      dailyRecords: capDailyRecords(Object.keys(storedDailyRecords).length > 0 ? storedDailyRecords : buildDailyRecords(sessions)),
      skillStates: isRecord(parsed.skillStates) ? (parsed.skillStates as StoredFretboardState['skillStates']) : {},
    }
  } catch {
    return defaultState
  }
}

export function saveFretboardState(state: StoredFretboardState): void {
  const cappedState: StoredFretboardState = {
    ...state,
    sessions: state.sessions.slice(0, MAX_SESSIONS),
    dailyRecords: capDailyRecords(state.dailyRecords),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cappedState))
}

export function resetFretboardState(): void {
  localStorage.removeItem(STORAGE_KEY)
}
