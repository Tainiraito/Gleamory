import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Timeline from './Timeline'
import type { Update } from '@/types'

const updates: Update[] = Array.from({ length: 7 }, (_, index) => ({
  id: `update-${index + 1}`,
  projectId: 'gleamory',
  date: `2026-07-${String(17 - index).padStart(2, '0')}`,
  content: `更新记录 ${index + 1}`,
}))

describe('Timeline', () => {
  it('默认展示五条，并以可收起区域展开额外记录', async () => {
    render(<Timeline updates={updates} />)

    expect(screen.getByText('更新记录 5')).toBeInTheDocument()
    expect(screen.queryByText('更新记录 6')).not.toBeInTheDocument()

    const toggle = screen.getByRole('button', { name: /展开全部 7 条/ })
    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('更新记录 6')).toBeInTheDocument()
    expect(screen.getByText('更新记录 7')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /收起记录/ }))

    await waitFor(() => {
      expect(screen.queryByText('更新记录 6')).not.toBeInTheDocument()
    })
  })
})
