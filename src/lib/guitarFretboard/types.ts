export type NoteName =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'

export type PitchClass = 'C' | 'C#' | 'D' | 'D#' | 'E' | 'F' | 'F#' | 'G' | 'G#' | 'A' | 'A#' | 'B'
export type AccidentalPreference = 'sharp' | 'flat'
export type FretboardMode = 'all' | 'natural' | 'target' | 'scale' | 'degree' | 'hidden'
export type NoteDisplayDurationMs = 0 | 1000 | 3000 | 5000 | null

export interface StringConfig {
  stringNumber: 1 | 2 | 3 | 4 | 5 | 6
  displayName: string
  openNote: string
  midiNumber: number
}

export interface TuningPreset {
  id: 'standard' | 'drop-d' | 'half-step-down' | 'dadgad' | 'custom'
  name: string
  strings: StringConfig[]
}

export interface FretPosition {
  stringNumber: 1 | 2 | 3 | 4 | 5 | 6
  fretNumber: number
  noteName: PitchClass
  displayNoteName: string
  noteWithOctave: string
  midiNumber: number
  frequency: number
}

export interface FretboardSettings {
  tuning: TuningPreset
  fretCount: number
  accidental: AccidentalPreference
  mode: FretboardMode
  noteDisplayMs: NoteDisplayDurationMs
}

export interface FretboardModel {
  strings: StringConfig[]
  frets: number[]
  positions: FretPosition[]
  settings: Pick<FretboardSettings, 'tuning' | 'fretCount' | 'accidental'>
}

export interface FretRange {
  minFret: number
  maxFret: number
}

export type QuizType = 'find-note' | 'identify-note' | 'octave' | 'interval' | 'scale-degree'
export type IntervalId = 'major-third' | 'perfect-fourth' | 'perfect-fifth' | 'minor-seventh'
export type MajorScaleDegree = 1 | 3 | 5 | 7

export interface QuizQuestion {
  id: string
  type: QuizType
  prompt: string
  scope: FretRange
  expectedAnswers: FretPosition[]
  options?: PitchClass[]
  targetNote?: PitchClass
  referencePositions?: FretPosition[]
  skillTags: string[]
  createdAt: string
}

export interface QuizAnswer {
  questionId: string
  selectedPositions: FretPosition[]
  selectedOption?: string
  isCorrect: boolean
  missedPositions: FretPosition[]
  wrongPositions: FretPosition[]
  responseMs: number
  answeredAt: string
}

export interface PracticeSummary {
  totalQuestions: number
  correctQuestions: number
  accuracy: number
  averageResponseMs: number
  weakNotes: string[]
}

export interface PracticeSession extends PracticeSummary {
  id: string
  startedAt: string
  endedAt: string
  questionPrompt?: string
  responseMs?: number
}

export interface SkillState {
  skillId: string
  attempts: number
  correct: number
  wrong: number
  accuracy: number
  avgResponseMs: number
  lastPracticedAt: string
  strength: number
  dueAt: string
}

export interface StoredFretboardState {
  settings: FretboardSettings
  sessions: PracticeSession[]
  skillStates: Record<string, SkillState>
}

export interface GuitarSample {
  midiNumber: number
  noteName: string
  file: string
}

export interface GuitarSampleManifest {
  sourceName: string
  sourceUrl: string
  licenseSummary: string
  samples: readonly GuitarSample[]
}
