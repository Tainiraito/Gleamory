import { getPositionKey, getPositionsForNote } from './fretboard'
import type {
  FretPosition,
  FretRange,
  FretboardModel,
  IntervalId,
  MajorScaleDegree,
  PitchClass,
  QuizAnswer,
  QuizQuestion,
  QuizType,
  RandomPracticeScope,
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

const QUESTION_TYPES: QuizType[] = ['find-note', 'identify-note', 'octave', 'interval', 'scale-degree']

export const DEFAULT_RANDOM_PRACTICE_SCOPE: RandomPracticeScope = {
  types: ['find-note', 'identify-note'],
  notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
  strings: [1, 2, 3, 4, 5, 6],
  intervals: ['major-third', 'perfect-fourth', 'perfect-fifth'],
  keyRoots: ['C', 'G', 'D', 'F'],
  degrees: [1, 3, 5],
}

interface RandomPracticeQuestionOptions {
  range: FretRange
  random?: () => number
  avoidNote?: PitchClass
}

export interface ConfiguredPracticeQuestionOptions {
  type: QuizType | 'random'
  range: FretRange
  noteName?: PitchClass
  stringNumber?: FretPosition['stringNumber']
  interval?: IntervalId
  keyRoot?: PitchClass
  degree?: MajorScaleDegree
  randomScope?: RandomPracticeScope
  random?: () => number
  avoidType?: QuizType
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

function pickRandom<T>(items: T[], random: () => number): T {
  const index = Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)))
  return items[index]!
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

export function makeConfiguredPracticeQuestion(
  fretboard: FretboardModel,
  {
    type,
    range,
    noteName = 'C',
    stringNumber = 6,
    interval = 'perfect-fifth',
    keyRoot = 'C',
    degree = 1,
    randomScope = DEFAULT_RANDOM_PRACTICE_SCOPE,
    random = Math.random,
    avoidType,
    avoidNote,
  }: ConfiguredPracticeQuestionOptions,
): QuizQuestion {
  const scope = getScopedRange(fretboard, range)
  const isRandom = type === 'random'
  const allowedTypes = isRandom ? randomScope.types : QUESTION_TYPES
  let questionType = isRandom ? pickRandom(allowedTypes, random) : type
  if (isRandom && avoidType && questionType === avoidType && allowedTypes.length > 1) {
    questionType = allowedTypes[(allowedTypes.indexOf(questionType) + 1) % allowedTypes.length]!
  }

  if (questionType === 'find-note') {
    const initialNote = isRandom ? pickRandom(randomScope.notes, random) : noteName
    const targetNote =
      isRandom && avoidNote && initialNote === avoidNote && randomScope.notes.length > 1
        ? randomScope.notes[(randomScope.notes.indexOf(initialNote) + 1) % randomScope.notes.length]!
        : initialNote
    return makeFindNoteQuestion(fretboard, targetNote, scope)
  }

  if (questionType === 'identify-note') {
    const candidates = fretboard.positions.filter(
      (position) =>
        (isRandom ? randomScope.strings.includes(position.stringNumber) : position.stringNumber === stringNumber) &&
        position.fretNumber >= scope.minFret &&
        position.fretNumber <= scope.maxFret,
    )
    return makeIdentifyNoteQuestion(pickRandom(candidates, random), scope)
  }

  if (questionType === 'octave') {
    const candidates = fretboard.positions.filter((position) => {
      if (
        (isRandom ? !randomScope.notes.includes(position.noteName) : position.noteName !== noteName) ||
        position.fretNumber < scope.minFret ||
        position.fretNumber > scope.maxFret
      ) {
        return false
      }
      return fretboard.positions.some((candidate) => {
        if (candidate.fretNumber < scope.minFret || candidate.fretNumber > scope.maxFret) return false
        const distance = Math.abs(candidate.midiNumber - position.midiNumber)
        return distance > 0 && distance % 12 === 0
      })
    })
    return makeOctaveQuestion(fretboard, pickRandom(candidates, random), scope)
  }

  if (questionType === 'interval') {
    const root = isRandom ? pickRandom(randomScope.notes, random) : noteName
    const selectedInterval = isRandom ? pickRandom(randomScope.intervals, random) : interval
    return makeIntervalQuestion(fretboard, root, selectedInterval, scope)
  }

  const selectedKey = isRandom ? pickRandom(randomScope.keyRoots, random) : keyRoot
  const selectedDegree = isRandom ? pickRandom(randomScope.degrees, random) : degree
  return makeScaleDegreeQuestion(fretboard, selectedKey, selectedDegree, scope)
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

export function calculateQuestionAccuracy(question: QuizQuestion, answer: QuizAnswer): number {
  if (question.type === 'identify-note') return answer.isCorrect ? 1 : 0

  const correctSelected = Math.max(0, question.expectedAnswers.length - answer.missedPositions.length)
  const unionSize = question.expectedAnswers.length + answer.wrongPositions.length
  return unionSize === 0 ? 0 : Math.min(1, correctSelected / unionSize)
}
