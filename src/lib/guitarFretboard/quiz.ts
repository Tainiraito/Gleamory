import { getPositionKey, getPositionsForNote } from './fretboard'
import type { FretPosition, FretRange, FretboardModel, PitchClass, PracticeSummary, QuizAnswer, QuizQuestion } from './types'

const NOTE_OPTIONS: PitchClass[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

function createQuestionId(type: string, seed: string): string {
  return `${type}:${seed}:${Date.now()}`
}

export function makeFindNoteQuestion(fretboard: FretboardModel, noteName: PitchClass, scope: FretRange): QuizQuestion {
  return {
    id: createQuestionId('find-note', `${noteName}:${scope.minFret}-${scope.maxFret}`),
    type: 'find-note',
    prompt: `找出所有 ${noteName}`,
    scope,
    expectedAnswers: getPositionsForNote(fretboard, noteName, scope),
    skillTags: [`note:${noteName}`, `fretRange:${scope.minFret}-${scope.maxFret}`, 'quiz:find-note'],
    createdAt: new Date().toISOString(),
  }
}

export function makeIdentifyNoteQuestion(position: FretPosition): QuizQuestion {
  return {
    id: createQuestionId('identify-note', getPositionKey(position)),
    type: 'identify-note',
    prompt: `${position.stringNumber} 弦 ${position.fretNumber} 品是什么音？`,
    scope: { minFret: position.fretNumber, maxFret: position.fretNumber },
    expectedAnswers: [position],
    options: NOTE_OPTIONS,
    skillTags: [`note:${position.noteName}`, `string:${position.stringNumber}`, `position:${getPositionKey(position)}`, 'quiz:identify-note'],
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

  const missedPositions = question.type === 'find-note' ? question.expectedAnswers.filter((position) => !selectedKeys.has(getPositionKey(position))) : []
  const wrongPositions = question.type === 'find-note' ? selectedPositions.filter((position) => !expectedKeys.has(getPositionKey(position))) : []
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
