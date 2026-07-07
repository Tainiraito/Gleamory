import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import GuitarFretboardTrainerPage from './GuitarFretboardTrainerPage'

describe('GuitarFretboardTrainerPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  })

  it('renders the trainer shell and opens settings independently', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '指板音训练' })).toBeInTheDocument()
    expect(screen.getByText('今日训练计划')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始 5 分钟练习' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))

    expect(screen.getByLabelText('调弦预设')).toHaveValue('standard')
    expect(screen.getByLabelText('显示模式')).toHaveValue('hidden')
  })

  it('shows a read-only map explorer without quiz submit controls', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))

    expect(screen.getByText('点位置、听音色、认清同音分布')).toBeInTheDocument()
    expect(screen.getByText('当前位置详情')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交答案' })).not.toBeInTheDocument()
  })

  it('keeps the quiz workflow in the quiz tab', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '测验' }))

    expect(screen.getByText('测验模式')).toBeInTheDocument()
    expect(screen.getByText('找出所有 C')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交答案' })).toBeInTheDocument()
  })

  it('shows practice records without quiz submit controls', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '记录' }))

    expect(screen.getByText('练习记录')).toBeInTheDocument()
    expect(screen.getByText('最近练习')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交答案' })).not.toBeInTheDocument()
  })

  it('lets users select target notes and submit a find-note answer', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    const fretboard = screen.getByLabelText('吉他指板')
    fireEvent.click(within(fretboard).getByRole('button', { name: '5弦 3品 C3' }))
    fireEvent.click(within(fretboard).getByRole('button', { name: '2弦 1品 C4' }))
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))

    expect(screen.getByText('实时反馈')).toBeInTheDocument()
    expect(screen.getByText('遗漏')).toBeInTheDocument()
    expect(screen.getByText('薄弱区域')).toBeInTheDocument()
  })
})
