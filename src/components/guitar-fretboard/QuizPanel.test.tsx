import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { generateFretboard } from '@/lib/guitarFretboard/fretboard'
import { judgeQuizAnswer, makeFindNoteQuestion } from '@/lib/guitarFretboard/quiz'
import { getTuningPreset } from '@/lib/guitarFretboard/tuning'
import { QuizPanel } from './QuizPanel'

const fretboard = generateFretboard({ tuning: getTuningPreset('standard'), fretCount: 12, accidental: 'sharp' })
const question = makeFindNoteQuestion(fretboard, 'C', { minFret: 0, maxFret: 12 })
const handlers = {
  onGenerate: () => {},
  onSelectOption: () => {},
  onSubmit: () => {},
  onReset: () => {},
  onNext: () => {},
  onSkip: () => {},
}

describe('QuizPanel', () => {
  afterEach(() => vi.useRealTimers())

  it('shows a generate action before a question exists', () => {
    render(
      <QuizPanel
        question={null}
        selectedCount={0}
        answer={null}
        {...handlers}
      />,
    )

    expect(screen.getByText('尚未生成题目')).toBeInTheDocument()
    expect(screen.getByText('用时 --')).toBeInTheDocument()
    expect(screen.getByText('准确率 --')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '生成题目' })).toBeInTheDocument()
  })

  it('keeps elapsed time hidden while answering and shows it after submission', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-14T12:00:00.000Z'))
    const { rerender } = render(
      <QuizPanel
        question={question}
        selectedCount={0}
        answer={null}
        {...handlers}
      />,
    )

    expect(screen.getByText('用时 --')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1200))
    expect(screen.getByText('用时 --')).toBeInTheDocument()

    const answer = judgeQuizAnswer(question, question.expectedAnswers.slice(0, 5), 1200)
    rerender(
      <QuizPanel
        question={question}
        selectedCount={5}
        answer={answer}
        {...handlers}
      />,
    )

    expect(screen.getByText('准确率 83%')).toBeInTheDocument()
    expect(screen.getByText('用时 1.2 秒')).toBeInTheDocument()
  })
})
