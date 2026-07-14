import { describe, expect, it } from 'vitest'
import { generateFretboard } from './fretboard'
import {
  calculateQuestionAccuracy,
  DEFAULT_RANDOM_PRACTICE_SCOPE,
  judgeQuizAnswer,
  makeConfiguredPracticeQuestion,
  makeFindNoteQuestion,
  makeIdentifyNoteQuestion,
  makeIntervalQuestion,
  makeOctaveQuestion,
  makePracticeQuestion,
  makeRandomPracticeQuestion,
  makeScaleDegreeQuestion,
} from './quiz'
import { getTuningPreset } from './tuning'
import type { RandomPracticeScope } from './types'

const fretboard = generateFretboard({ tuning: getTuningPreset('standard'), fretCount: 12, accidental: 'sharp' })
const allRandomScope: RandomPracticeScope = {
  types: ['find-note', 'identify-note', 'octave', 'interval', 'scale-degree'],
  notes: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  strings: [1, 2, 3, 4, 5, 6],
  intervals: ['major-third', 'perfect-fourth', 'perfect-fifth', 'minor-seventh'],
  keyRoots: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
  degrees: [1, 3, 5, 7],
}

describe('guitar fretboard quiz', () => {
  it('generates a find-note question with all expected target positions', () => {
    const question = makeFindNoteQuestion(fretboard, 'C', { minFret: 0, maxFret: 12 })

    expect(question.type).toBe('find-note')
    expect(question.prompt).toBe('找出所有 C')
    expect(question.expectedAnswers.map((position) => `${position.stringNumber}:${position.fretNumber}`)).toEqual([
      '6:8',
      '5:3',
      '4:10',
      '3:5',
      '2:1',
      '1:8',
    ])
    expect(question.skillTags).toContain('note:C')
    expect(question.skillTags).toContain('quiz:find-note')
  })

  it('judges missed and wrong positions separately for multi-position answers', () => {
    const question = makeFindNoteQuestion(fretboard, 'C', { minFret: 0, maxFret: 12 })
    const answer = judgeQuizAnswer(question, [question.expectedAnswers[0]!, question.expectedAnswers[1]!, fretboard.positions[0]!], 1420)

    expect(answer.isCorrect).toBe(false)
    expect(answer.selectedPositions.map((position) => `${position.stringNumber}:${position.fretNumber}`)).toEqual(['6:8', '5:3', '6:0'])
    expect(answer.missedPositions.map((position) => `${position.stringNumber}:${position.fretNumber}`)).toEqual([
      '4:10',
      '3:5',
      '2:1',
      '1:8',
    ])
    expect(answer.wrongPositions.map((position) => `${position.stringNumber}:${position.fretNumber}`)).toEqual(['6:0'])
    expect(answer.responseMs).toBe(1420)
  })

  it('calculates partial accuracy for missed and extra fretboard selections', () => {
    const question = makeFindNoteQuestion(fretboard, 'C', { minFret: 0, maxFret: 12 })
    const fiveCorrect = judgeQuizAnswer(question, question.expectedAnswers.slice(0, 5), 1000)
    const fourCorrectAndOneWrong = judgeQuizAnswer(
      question,
      [...question.expectedAnswers.slice(0, 4), fretboard.positions[0]!],
      1000,
    )
    const empty = judgeQuizAnswer(question, [], 1000)

    expect(calculateQuestionAccuracy(question, fiveCorrect)).toBe(5 / 6)
    expect(calculateQuestionAccuracy(question, fourCorrectAndOneWrong)).toBe(4 / 7)
    expect(calculateQuestionAccuracy(question, empty)).toBe(0)
  })

  it('generates identify-note questions with note options and checks the selected note', () => {
    const position = fretboard.positions.find((candidate) => candidate.stringNumber === 4 && candidate.fretNumber === 7)!
    const question = makeIdentifyNoteQuestion(position)

    expect(question.prompt).toBe('4 弦 7 品是什么音？')
    expect(question.expectedAnswers[0]).toMatchObject({ noteName: 'A', noteWithOctave: 'A3' })
    expect(judgeQuizAnswer(question, [], 920, 'A').isCorrect).toBe(true)
    expect(judgeQuizAnswer(question, [], 920, 'B').isCorrect).toBe(false)
  })

  it('uses binary accuracy for identify-note questions', () => {
    const position = fretboard.positions.find((candidate) => candidate.stringNumber === 4 && candidate.fretNumber === 7)!
    const question = makeIdentifyNoteQuestion(position)

    expect(calculateQuestionAccuracy(question, judgeQuizAnswer(question, [], 920, 'A'))).toBe(1)
    expect(calculateQuestionAccuracy(question, judgeQuizAnswer(question, [], 920, 'B'))).toBe(0)
  })

  it('generates octave answers that exclude the source and same-pitch unisons', () => {
    const source = fretboard.positions.find((position) => position.stringNumber === 5 && position.fretNumber === 3)!
    const question = makeOctaveQuestion(fretboard, source, { minFret: 0, maxFret: 12 })

    expect(question.type).toBe('octave')
    expect(question.prompt).toBe('找出标记 C3 的同音八度')
    expect(question.referencePositions).toEqual([source])
    expect(question.expectedAnswers).not.toContain(source)
    expect(question.expectedAnswers).not.toContainEqual(
      expect.objectContaining({ stringNumber: 6, fretNumber: 8, noteWithOctave: 'C3' }),
    )
    expect(
      question.expectedAnswers.every((position) => {
        const distance = Math.abs(position.midiNumber - source.midiNumber)
        return distance > 0 && distance % 12 === 0
      }),
    ).toBe(true)
    expect(question.skillTags).toContain('quiz:octave')
  })

  it('generates interval questions from the requested root and interval', () => {
    const question = makeIntervalQuestion(fretboard, 'C', 'perfect-fifth', { minFret: 0, maxFret: 12 })

    expect(question.type).toBe('interval')
    expect(question.targetNote).toBe('G')
    expect(question.prompt).toBe('找出 C 上方纯五度 G')
    expect(question.expectedAnswers.every((position) => position.noteName === 'G')).toBe(true)
    expect(question.skillTags).toEqual(expect.arrayContaining(['note:G', 'interval:perfect-fifth', 'quiz:interval']))
  })

  it('generates major scale degree questions from the requested key', () => {
    const question = makeScaleDegreeQuestion(fretboard, 'G', 3, { minFret: 0, maxFret: 12 })

    expect(question.type).toBe('scale-degree')
    expect(question.targetNote).toBe('B')
    expect(question.prompt).toBe('找出 G 大调的 3 级 B')
    expect(question.expectedAnswers.every((position) => position.noteName === 'B')).toBe(true)
    expect(question.skillTags).toEqual(expect.arrayContaining(['note:B', 'key:G', 'degree:3', 'quiz:scale-degree']))
  })

  it('judges octave, interval, and scale-degree answers as fretboard selections', () => {
    const source = fretboard.positions.find((position) => position.stringNumber === 5 && position.fretNumber === 3)!
    const questions = [
      makeOctaveQuestion(fretboard, source, { minFret: 0, maxFret: 12 }),
      makeIntervalQuestion(fretboard, 'C', 'perfect-fifth', { minFret: 0, maxFret: 12 }),
      makeScaleDegreeQuestion(fretboard, 'G', 3, { minFret: 0, maxFret: 12 }),
    ]

    for (const question of questions) {
      expect(judgeQuizAnswer(question, question.expectedAnswers, 1000).isCorrect).toBe(true)
      expect(judgeQuizAnswer(question, question.expectedAnswers.slice(1), 1000).isCorrect).toBe(false)
    }
  })

  it('rotates practice questions through notes while preserving a bounded selectable range', () => {
    const firstQuestion = makePracticeQuestion(fretboard, 0)
    const secondQuestion = makePracticeQuestion(fretboard, 1)

    expect(firstQuestion.prompt).toBe('找出所有 C')
    expect(firstQuestion.scope).toEqual({ minFret: 0, maxFret: 12 })
    expect(firstQuestion.expectedAnswers.every((position) => position.fretNumber <= 12)).toBe(true)
    expect(secondQuestion.prompt).toBe('找出所有 C#')
    expect(secondQuestion.skillTags).toContain('note:C#')
  })

  it('generates random practice questions within the selected difficulty range', () => {
    const question = makeRandomPracticeQuestion(fretboard, {
      range: { minFret: 0, maxFret: 12 },
      random: () => 0.5,
      avoidNote: 'F#',
    })

    expect(question.prompt).not.toBe('找出所有 F#')
    expect(question.scope).toEqual({ minFret: 0, maxFret: 12 })
    expect(question.expectedAnswers.every((position) => position.fretNumber <= 12)).toBe(true)
  })

  it('generates a configured interval question with the selected parameters', () => {
    const question = makeConfiguredPracticeQuestion(fretboard, {
      type: 'interval',
      range: { minFret: 0, maxFret: 12 },
      noteName: 'C',
      interval: 'perfect-fifth',
    })

    expect(question.type).toBe('interval')
    expect(question.prompt).toBe('找出 C 上方纯五度 G')
    expect(question.scope).toEqual({ minFret: 0, maxFret: 12 })
  })

  it('preserves an explicitly selected target note when generating the next custom question', () => {
    const question = makeConfiguredPracticeQuestion(fretboard, {
      type: 'find-note',
      range: { minFret: 0, maxFret: 12 },
      noteName: 'C',
      avoidNote: 'C',
    })

    expect(question.targetNote).toBe('C')
    expect(question.prompt).toBe('找出所有 C')
  })

  it('lets random mixed practice generate all five question types', () => {
    const questions = [0, 0.2, 0.4, 0.6, 0.8].map((typeRoll) => {
      const rolls = [typeRoll, 0]
      return makeConfiguredPracticeQuestion(fretboard, {
        type: 'random',
        range: { minFret: 0, maxFret: 12 },
        randomScope: allRandomScope,
        random: () => rolls.shift() ?? 0,
      })
    })

    expect(questions.map((question) => question.type)).toEqual([
      'find-note',
      'identify-note',
      'octave',
      'interval',
      'scale-degree',
    ])
  })

  it('defaults random practice to basic learned content', () => {
    expect(DEFAULT_RANDOM_PRACTICE_SCOPE.types).toEqual(['find-note', 'identify-note'])
    expect(DEFAULT_RANDOM_PRACTICE_SCOPE.notes).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
    expect(DEFAULT_RANDOM_PRACTICE_SCOPE.intervals).toEqual(['major-third', 'perfect-fourth', 'perfect-fifth'])
    expect(DEFAULT_RANDOM_PRACTICE_SCOPE.keyRoots).toEqual(['C', 'G', 'D', 'F'])
    expect(DEFAULT_RANDOM_PRACTICE_SCOPE.degrees).toEqual([1, 3, 5])
  })

  it('only generates question types and targets from the allowed random scope', () => {
    const randomScope: RandomPracticeScope = {
      types: ['interval'],
      notes: ['C'],
      strings: [4],
      intervals: ['perfect-fifth'],
      keyRoots: ['G'],
      degrees: [3],
    }
    const question = makeConfiguredPracticeQuestion(fretboard, {
      type: 'random',
      range: { minFret: 0, maxFret: 12 },
      randomScope,
      random: () => 0,
    })

    expect(question.type).toBe('interval')
    expect(question.prompt).toBe('找出 C 上方纯五度 G')
  })

  it('does not leave the allowed scope when avoiding the previous random type', () => {
    const randomScope: RandomPracticeScope = {
      types: ['identify-note'],
      notes: ['A'],
      strings: [4],
      intervals: ['major-third'],
      keyRoots: ['C'],
      degrees: [1],
    }
    const question = makeConfiguredPracticeQuestion(fretboard, {
      type: 'random',
      range: { minFret: 0, maxFret: 4 },
      randomScope,
      avoidType: 'identify-note',
      random: () => 0,
    })

    expect(question.type).toBe('identify-note')
    expect(question.expectedAnswers[0]?.stringNumber).toBe(4)
  })

})
