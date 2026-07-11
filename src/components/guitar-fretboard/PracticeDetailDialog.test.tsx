import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PracticeSession } from '@/lib/guitarFretboard/types'
import { PracticeDetailDialog } from './PracticeDetailDialog'

const sessions: PracticeSession[] = [
  {
    id: 'interval', startedAt: '2026-07-11T02:00:00.000Z', endedAt: '2026-07-11T02:00:03.000Z', localDate: '2026-07-11',
    quizType: 'interval', isCorrect: false, questionPrompt: '找出 C 上方纯五度 G', responseMs: 3000,
    totalQuestions: 1, correctQuestions: 0, accuracy: 0, averageResponseMs: 3000, weakNotes: ['G'],
  },
  {
    id: 'find', startedAt: '2026-07-11T01:00:00.000Z', endedAt: '2026-07-11T01:00:02.000Z', localDate: '2026-07-11',
    quizType: 'find-note', isCorrect: true, questionPrompt: '找出所有 C', responseMs: 2000,
    totalQuestions: 1, correctQuestions: 1, accuracy: 1, averageResponseMs: 2000, weakNotes: [],
  },
]

describe('PracticeDetailDialog', () => {
  it('shows a date summary, filters by quiz type, and closes with Escape', () => {
    const onClose = vi.fn()
    render(<PracticeDetailDialog date="2026-07-11" sessions={sessions} onClose={onClose} />)

    const dialog = screen.getByRole('dialog', { name: '2026年7月11日练习详情' })
    expect(within(dialog).getByText('共 2 题')).toBeInTheDocument()
    expect(within(dialog).getByText('找出所有 C')).toBeInTheDocument()
    expect(within(dialog).getByText('找出 C 上方纯五度 G')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: '音程' }))
    expect(within(dialog).queryByText('找出所有 C')).not.toBeInTheDocument()
    expect(within(dialog).getByText('正确率 0%')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows an empty state for a day without sessions', () => {
    render(<PracticeDetailDialog date="2026-07-10" sessions={sessions} onClose={() => {}} />)
    expect(screen.getByText('当天还没有练习记录')).toBeInTheDocument()
  })
})
