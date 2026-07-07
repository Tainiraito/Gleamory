import { describe, expect, it } from 'vitest'
import { generateFretboard } from './fretboard'
import { judgeQuizAnswer, makeFindNoteQuestion, makeIdentifyNoteQuestion, summarizePractice } from './quiz'
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
})
