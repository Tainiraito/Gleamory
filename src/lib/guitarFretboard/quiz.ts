import { getPositionKey, getPositionsForNote } from './fretboard'
import type {
  FretPosition,
  FretRange,
  FretboardModel,
  IntervalId,
  MajorScaleDegree,
  PitchClass,
  PracticeSession,
  PracticeSummary,
  QuizAnswer,
  QuizQuestion,
} from './types'

const NOTE_OPTIONS: PitchClass[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const PRACTICE_RANGES: FretRange[] = [
  { minFret: 0, maxFret: 12 },
  { minFret: 5, maxFret: 17 },
  { minFret: 12, maxFret: 24 },
]

export const INTERVAL_OPTIONS: Array<{ value: IntervalId; label: string; semitones: number }> = [
  { value: 'major-third', label: '大三度', semitones: 4 },
  { value: 'perfect-fourth', label: '纯四度', semitones: 5 },
  { value: 'perfect-fifth', label: '纯五度', semitones: 7 },
  { value: 'minor-seventh', label: '小七度', semitones: 10 },
]

export const MAJOR_SCALE_DEGREE_OPTIONS: Array<{ value: MajorScaleDegree; label: string; semitones: number }> = [
  { value: 1, label: '1 级', semitones: 0 },
  { value: 3, label: '3 级', semitones: 4 },
  { value: 5, label: '5 级', semitones: 7 },
  { value: 7, label: '7 级', semitones: 11 },
]

interface RandomPracticeQuestionOptions {
  range: FretRange
  random?: () => number
  avoidNote?: PitchClass
}

function createQuestionId(type: string, seed: string): string {
  return `${type}:${seed}:${Date.now()}`
}

function getScopedRange(fretboard: FretboardModel, range: FretRange): FretRange {
  return {
    minFret: Math.min(range.minFret, fretboard.settings.fretCount),
    maxFret: Math.min(range.maxFret, fretboard.settings.fretCount),
  }
}

function getPitchClassAtOffset(root: PitchClass, semitones: number): PitchClass {
  const rootIndex = NOTE_OPTIONS.indexOf(root)
  return NOTE_OPTIONS[(rootIndex + semitones) % NOTE_OPTIONS.length]!
}

export function makeFindNoteQuestion(fretboard: FretboardModel, noteName: PitchClass, scope: FretRange): QuizQuestion {
  return {
    id: createQuestionId('find-note', `${noteName}:${scope.minFret}-${scope.maxFret}`),
    type: 'find-note',
    prompt: `找出所有 ${noteName}`,
    scope,
    expectedAnswers: getPositionsForNote(fretboard, noteName, scope),
    targetNote: noteName,
    skillTags: [`note:${noteName}`, `fretRange:${scope.minFret}-${scope.maxFret}`, 'quiz:find-note'],
    createdAt: new Date().toISOString(),
  }
}

export function makePracticeQuestion(fretboard: FretboardModel, questionIndex: number): QuizQuestion {
  const noteName = NOTE_OPTIONS[((questionIndex % NOTE_OPTIONS.length) + NOTE_OPTIONS.length) % NOTE_OPTIONS.length]
  const baseRange = PRACTICE_RANGES[Math.floor(questionIndex / NOTE_OPTIONS.length) % PRACTICE_RANGES.length]!
  const scope = {
    minFret: Math.min(baseRange.minFret, fretboard.settings.fretCount),
    maxFret: Math.min(baseRange.maxFret, fretboard.settings.fretCount),
  }

  return makeFindNoteQuestion(fretboard, noteName, scope)
}

export function makeRandomPracticeQuestion(
  fretboard: FretboardModel,
  { range, random = Math.random, avoidNote }: RandomPracticeQuestionOptions,
): QuizQuestion {
  const rawIndex = Math.min(NOTE_OPTIONS.length - 1, Math.max(0, Math.floor(random() * NOTE_OPTIONS.length)))
  const initialNote = NOTE_OPTIONS[rawIndex]!
  const noteName = avoidNote && initialNote === avoidNote ? NOTE_OPTIONS[(rawIndex + 1) % NOTE_OPTIONS.length]! : initialNote
  const scope = getScopedRange(fretboard, range)

  return makeFindNoteQuestion(fretboard, noteName, scope)
}

export function makeIdentifyNoteQuestion(
  position: FretPosition,
  scope: FretRange = { minFret: position.fretNumber, maxFret: position.fretNumber },
): QuizQuestion {
  return {
    id: createQuestionId('identify-note', getPositionKey(position)),
    type: 'identify-note',
    prompt: `${position.stringNumber} 弦 ${position.fretNumber} 品是什么音？`,
    scope,
    expectedAnswers: [position],
    options: NOTE_OPTIONS,
    targetNote: position.noteName,
    referencePositions: [position],
    skillTags: [`note:${position.noteName}`, `string:${position.stringNumber}`, `position:${getPositionKey(position)}`, 'quiz:identify-note'],
    createdAt: new Date().toISOString(),
  }
}

export function makeOctaveQuestion(fretboard: FretboardModel, source: FretPosition, scope: FretRange): QuizQuestion {
  const expectedAnswers = fretboard.positions.filter((position) => {
    if (position.fretNumber < scope.minFret || position.fretNumber > scope.maxFret) return false
    const distance = Math.abs(position.midiNumber - source.midiNumber)
    return distance > 0 && distance % 12 === 0
  })

  return {
    id: createQuestionId('octave', `${getPositionKey(source)}:${scope.minFret}-${scope.maxFret}`),
    type: 'octave',
    prompt: `找出标记 ${source.noteWithOctave} 的同音八度`,
    scope,
    expectedAnswers,
    targetNote: source.noteName,
    referencePositions: [source],
    skillTags: [
      `note:${source.noteName}`,
      `string:${source.stringNumber}`,
      `position:${getPositionKey(source)}`,
      `fretRange:${scope.minFret}-${scope.maxFret}`,
      'quiz:octave',
    ],
    createdAt: new Date().toISOString(),
  }
}

export function makeIntervalQuestion(
  fretboard: FretboardModel,
  root: PitchClass,
  interval: IntervalId,
  scope: FretRange,
): QuizQuestion {
  const intervalOption = INTERVAL_OPTIONS.find((option) => option.value === interval) ?? INTERVAL_OPTIONS[0]!
  const targetNote = getPitchClassAtOffset(root, intervalOption.semitones)

  return {
    id: createQuestionId('interval', `${root}:${interval}:${scope.minFret}-${scope.maxFret}`),
    type: 'interval',
    prompt: `找出 ${root} 上方${intervalOption.label} ${targetNote}`,
    scope,
    expectedAnswers: getPositionsForNote(fretboard, targetNote, scope),
    targetNote,
    skillTags: [
      `note:${targetNote}`,
      `root:${root}`,
      `interval:${interval}`,
      `fretRange:${scope.minFret}-${scope.maxFret}`,
      'quiz:interval',
    ],
    createdAt: new Date().toISOString(),
  }
}

export function makeScaleDegreeQuestion(
  fretboard: FretboardModel,
  keyRoot: PitchClass,
  degree: MajorScaleDegree,
  scope: FretRange,
): QuizQuestion {
  const degreeOption = MAJOR_SCALE_DEGREE_OPTIONS.find((option) => option.value === degree) ?? MAJOR_SCALE_DEGREE_OPTIONS[0]!
  const targetNote = getPitchClassAtOffset(keyRoot, degreeOption.semitones)

  return {
    id: createQuestionId('scale-degree', `${keyRoot}:${degree}:${scope.minFret}-${scope.maxFret}`),
    type: 'scale-degree',
    prompt: `找出 ${keyRoot} 大调的 ${degree} 级 ${targetNote}`,
    scope,
    expectedAnswers: getPositionsForNote(fretboard, targetNote, scope),
    targetNote,
    skillTags: [
      `note:${targetNote}`,
      `key:${keyRoot}`,
      `degree:${degree}`,
      `fretRange:${scope.minFret}-${scope.maxFret}`,
      'quiz:scale-degree',
    ],
    createdAt: new Date().toISOString(),
  }
}

export function judgeQuizAnswer(
  question: QuizQuestion,
  selectedPositions: FretPosition[],
  responseMs: number,
  selectedOption?: string,
): QuizAnswer {
  const expectedKeys = new Set(question.expectedAnswers.map(getPositionKey))
  const selectedKeys = new Set(selectedPositions.map(getPositionKey))

  const isFretboardQuestion = question.type !== 'identify-note'
  const missedPositions = isFretboardQuestion
    ? question.expectedAnswers.filter((position) => !selectedKeys.has(getPositionKey(position)))
    : []
  const wrongPositions = isFretboardQuestion
    ? selectedPositions.filter((position) => !expectedKeys.has(getPositionKey(position)))
    : []
  const isCorrect =
    question.type === 'identify-note'
      ? selectedOption === question.expectedAnswers[0]?.noteName
      : missedPositions.length === 0 && wrongPositions.length === 0 && selectedPositions.length === question.expectedAnswers.length

  return {
    questionId: question.id,
    selectedPositions,
    selectedOption,
    isCorrect,
    missedPositions,
    wrongPositions,
    responseMs,
    answeredAt: new Date().toISOString(),
  }
}

export function summarizePractice(results: Array<{ question: QuizQuestion; answer: QuizAnswer }>): PracticeSummary {
  const totalQuestions = results.length
  const correctQuestions = results.filter((result) => result.answer.isCorrect).length
  const averageResponseMs =
    totalQuestions === 0 ? 0 : Math.round(results.reduce((sum, result) => sum + result.answer.responseMs, 0) / totalQuestions)
  const weakNotes = [
    ...new Set(
      results
        .filter((result) => !result.answer.isCorrect)
        .flatMap((result) => result.question.skillTags)
        .filter((tag) => tag.startsWith('note:'))
        .map((tag) => tag.replace('note:', '')),
    ),
  ]

  return {
    totalQuestions,
    correctQuestions,
    accuracy: totalQuestions === 0 ? 0 : correctQuestions / totalQuestions,
    averageResponseMs,
    weakNotes,
  }
}

export function summarizePracticeSessions(sessions: PracticeSession[]): PracticeSummary {
  const totalQuestions = sessions.reduce((sum, session) => sum + session.totalQuestions, 0)
  const correctQuestions = sessions.reduce((sum, session) => sum + session.correctQuestions, 0)
  const totalResponseMs = sessions.reduce((sum, session) => sum + session.averageResponseMs * session.totalQuestions, 0)
  const weakNotes = [...new Set(sessions.flatMap((session) => session.weakNotes))]

  return {
    totalQuestions,
    correctQuestions,
    accuracy: totalQuestions === 0 ? 0 : correctQuestions / totalQuestions,
    averageResponseMs: totalQuestions === 0 ? 0 : Math.round(totalResponseMs / totalQuestions),
    weakNotes,
  }
}
