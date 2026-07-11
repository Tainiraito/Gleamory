import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PracticeStats } from './PracticeStats'

describe('PracticeStats', () => {
  it('renders three clickable daily metrics', () => {
    const onOpen = vi.fn()
    render(
      <PracticeStats
        summary={{ totalQuestions: 8, correctQuestions: 6, accuracy: 0.75, averageResponseMs: 2500, weakNotes: [] }}
        onOpen={onOpen}
      />,
    )

    expect(screen.getByRole('button', { name: '已完成 8 题' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '正确率 75%' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '平均反应 2.50 秒' }))
    expect(onOpen).toHaveBeenCalledOnce()
  })
})
