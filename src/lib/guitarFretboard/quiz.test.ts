import { describe, expect, it } from 'vitest'
import { generateFretboard } from './fretboard'
import {
  judgeQuizAnswer,
  makeFindNoteQuestion,
  makeIdentifyNoteQuestion,
  makeIntervalQuestion,
  makeOctaveQuestion,
  makePracticeQuestion,
  makeRandomPracticeQuestion,
  makeScaleDegreeQuestion,
  summarizePractice,
  summarizePracticeSessions,
} from './quiz'
import { getTuningPreset } from './tuning'

const fretboard = generateFretboard({ tuning: getTuningPreset('standard'), fretCount: 12, accidental: 'sharp' })

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

  it('generates identify-note questions with note options and checks the selected note', () => {
    const position = fretboard.positions.find((candidate) => candidate.stringNumber === 4 && candidate.fretNumber === 7)!
    const question = makeIdentifyNoteQuestion(position)

    expect(question.prompt).toBe('4 弦 7 品是什么音？')
    expect(question.expectedAnswers[0]).toMatchObject({ noteName: 'A', noteWithOctave: 'A3' })
    expect(judgeQuizAnswer(question, [], 920, 'A').isCorrect).toBe(true)
    expect(judgeQuizAnswer(question, [], 920, 'B').isCorrect).toBe(false)
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

  it('summarizes practice results into accuracy and weak areas', () => {
    const question = makeFindNoteQuestion(fretboard, 'C', { minFret: 0, maxFret: 12 })
    const perfect = judgeQuizAnswer(question, question.expectedAnswers, 1000)
    const miss = judgeQuizAnswer(question, [question.expectedAnswers[0]!], 2000)
    const summary = summarizePractice([
      { question, answer: perfect },
      { question, answer: miss },
    ])

    expect(summary.totalQuestions).toBe(2)
    expect(summary.correctQuestions).toBe(1)
    expect(summary.accuracy).toBe(0.5)
    expect(summary.averageResponseMs).toBe(1500)
    expect(summary.weakNotes).toEqual(['C'])
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

  it('summarizes saved practice sessions with weighted accuracy, response time, and weak areas', () => {
    const summary = summarizePracticeSessions([
      {
        id: 'session-1',
        startedAt: '2026-07-07T12:00:00.000Z',
        endedAt: '2026-07-07T12:00:02.000Z',
        totalQuestions: 1,
        correctQuestions: 0,
        accuracy: 0,
        averageResponseMs: 2000,
        weakNotes: ['C'],
      },
      {
        id: 'session-2',
        startedAt: '2026-07-07T12:00:03.000Z',
        endedAt: '2026-07-07T12:00:09.000Z',
        totalQuestions: 3,
        correctQuestions: 2,
        accuracy: 2 / 3,
        averageResponseMs: 1000,
        weakNotes: ['C#', 'C'],
      },
    ])

    expect(summary.totalQuestions).toBe(4)
    expect(summary.correctQuestions).toBe(2)
    expect(summary.accuracy).toBe(0.5)
    expect(summary.averageResponseMs).toBe(1250)
    expect(summary.weakNotes).toEqual(['C', 'C#'])
  })
})
