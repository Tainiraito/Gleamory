import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { PracticeDay } from '@/lib/guitarFretboard/types'
import { PracticeHeatmap } from './PracticeHeatmap'

const days: PracticeDay[] = Array.from({ length: 365 }, (_, index) => ({
  date: index === 364 ? '2026-07-11' : `day-${index}`,
  totalQuestions: index === 364 ? 8 : 0,
  correctQuestions: index === 364 ? 6 : 0,
  totalResponseMs: index === 364 ? 20000 : 0,
  byQuizType: {},
  level: index === 364 ? 2 : 0,
}))

describe('PracticeHeatmap', () => {
  it('renders 365 fixed date cells with level, hover summary, and selection', () => {
    const onSelectDate = vi.fn()
    render(<PracticeHeatmap days={days} onSelectDate={onSelectDate} />)

    expect(screen.getAllByRole('button')).toHaveLength(365)
    const today = screen.getByRole('button', { name: '2026-07-11，8 题' })
    expect(today).toHaveAttribute('data-level', '2')

    fireEvent.mouseEnter(today)
    expect(screen.getByRole('tooltip')).toHaveTextContent('正确率 75%')
    expect(screen.getByRole('tooltip')).toHaveTextContent('平均反应 2.50 秒')

    fireEvent.click(today)
    expect(onSelectDate).toHaveBeenCalledWith('2026-07-11')
  })
})
