import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import GuitarFretboardTrainerPage from './GuitarFretboardTrainerPage'

describe('GuitarFretboardTrainerPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
    vi.spyOn(Math, 'random').mockReturnValue(0)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders the trainer shell with one top fretboard and without redundant tabs or status toolbar', () => {
    const { container } = render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: '指板音训练' })).toBeInTheDocument()
    expect(screen.getByText('今日训练计划')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '今日练习' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '指板地图' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '设置' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '测验' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '记录' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '开始 5 分钟练习' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '自由查看指板' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '打开设置' })).not.toBeInTheDocument()
    expect(container.querySelector('.fretboard-toolbar')).not.toBeInTheDocument()
    expect(screen.queryByText('第 1 题')).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('吉他指板')).toHaveLength(1)

    const boardPanel = container.querySelector('.fretboard-board-panel')
    const tabs = container.querySelector('.fretboard-tabs')
    expect(boardPanel).toBeInTheDocument()
    expect(tabs).toBeInTheDocument()
    expect(Boolean(boardPanel!.compareDocumentPosition(tabs!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))

    expect(screen.queryByRole('combobox', { name: '调弦预设' })).not.toBeInTheDocument()
    expect(screen.getAllByLabelText('吉他指板')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Standard EADGBE' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '隐藏答案' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '持续显示，右键取消' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a read-only map explorer without quiz submit controls', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))

    expect(screen.getByText('点位置、听音色、切换把位和音阶')).toBeInTheDocument()
    expect(screen.getByText('当前位置详情')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交答案' })).not.toBeInTheDocument()
  })

  it('keeps the quiz workflow in daily practice without a duplicate quiz tab', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('tab', { name: '测验' })).not.toBeInTheDocument()
    expect(screen.getByText(/^找出所有 /)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '提交答案' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '跳过此题' })).toBeInTheDocument()
  })

  it('removes the records tab while keeping summary metrics in the side panel', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('tab', { name: '记录' })).not.toBeInTheDocument()
    expect(screen.getByText('实时反馈')).toBeInTheDocument()
    expect(screen.getByText('薄弱区域')).toBeInTheDocument()
  })

  it('lets users select target notes and submit a find-note answer', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    expect(screen.getAllByLabelText('吉他指板')).toHaveLength(1)
    const fretboard = screen.getByLabelText('吉他指板')
    fireEvent.click(within(fretboard).getByRole('button', { name: '5弦 3品 C3' }))
    fireEvent.click(within(fretboard).getByRole('button', { name: '2弦 1品 C4' }))
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))

    expect(screen.getByText('实时反馈')).toBeInTheDocument()
    expect(screen.getByText('遗漏')).toBeInTheDocument()
    expect(screen.getByText('薄弱区域')).toBeInTheDocument()
  })

  it('disables positions outside the current quiz range and keeps the range visually marked', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    const fretboard = screen.getByLabelText('吉他指板')
    const inside = within(fretboard).getByRole('button', { name: '5弦 3品 C3' })
    const outside = within(fretboard).getByRole('button', { name: '6弦 13品 F3' })

    expect(screen.getByText('可选范围 0-12 品')).toBeInTheDocument()
    expect(inside).not.toBeDisabled()
    expect(inside).toHaveAttribute('data-in-scope', 'true')
    expect(outside).toBeDisabled()
    expect(outside).toHaveAttribute('data-in-scope', 'false')

    fireEvent.click(outside)
    expect(screen.getByText('已选 0')).toBeInTheDocument()
  })

  it('left-clicks selected notes to replay and right-clicks to cancel selection', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    const fretboard = screen.getByLabelText('吉他指板')
    const target = within(fretboard).getByRole('button', { name: '5弦 3品 C3' })

    fireEvent.click(target)
    expect(screen.getByText('已选 1')).toBeInTheDocument()

    fireEvent.click(target)
    expect(screen.getByText('已选 1')).toBeInTheDocument()

    fireEvent.contextMenu(target)
    expect(screen.getByText('已选 0')).toBeInTheDocument()
  })

  it('shows submission feedback and advances to the next practice question', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    const fretboard = screen.getByLabelText('吉他指板')
    fireEvent.click(within(fretboard).getByRole('button', { name: '6弦 0品 E2' }))
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))

    expect(screen.getByText('本题未通过')).toBeInTheDocument()
    expect(screen.getByText('遗漏 6 个，误选 1 个。')).toBeInTheDocument()
    expect(screen.getByText('薄弱区域')).toBeInTheDocument()
    expect(screen.getAllByText('C').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: '下一题' }))

    expect(screen.queryByText('找出所有 C')).not.toBeInTheDocument()
    expect(screen.getByText(/已选 0|已选择 --/)).toBeInTheDocument()
  })

  it('shows quick tuning controls and button-group map overlays for positions, scales, chords, and selected notes', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))

    expect(screen.getByText('快速调弦')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '整体降半音' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '6弦升半音' })).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: '显示内容' })).not.toBeInTheDocument()
    const rootGroup = screen.getByRole('group', { name: '音阶/和弦根音' })
    expect(rootGroup).toHaveAttribute('data-disabled', 'true')
    expect(screen.getByText('选择音阶或和弦后生效')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '根音 C' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '全部音' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '全部把位' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '大调音阶' }))
    expect(rootGroup).not.toHaveAttribute('data-disabled', 'true')
    expect(screen.getByRole('button', { name: '根音 C' })).not.toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '开放把位 0-4 品' }))

    const fretboard = screen.getByLabelText('吉他指板')
    expect(within(fretboard).getByRole('button', { name: '5弦 3品 C3' })).toHaveAttribute('data-root', 'true')
    expect(within(fretboard).getByRole('button', { name: '6弦 1品 F2' })).toHaveAttribute('data-highlight', 'true')

    fireEvent.click(screen.getByRole('button', { name: '大三和弦' }))
    expect(screen.getByRole('button', { name: '大三和弦' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: '全部音' }))
    fireEvent.click(screen.getByRole('button', { name: '显示 C' }))
    fireEvent.click(screen.getByRole('button', { name: '显示 E' }))
    expect(within(fretboard).getByRole('button', { name: '5弦 3品 C3' })).toHaveAttribute('data-highlight', 'true')
    expect(within(fretboard).getByRole('button', { name: '6弦 0品 E2' })).toHaveAttribute('data-highlight', 'true')
    expect(within(fretboard).getByRole('button', { name: '6弦 1品 F2' })).not.toHaveAttribute('data-highlight', 'true')

    fireEvent.click(screen.getByRole('button', { name: '整体降半音' }))
    expect(screen.getAllByText('Half Step Down').length).toBeGreaterThan(0)
  })

  it('clears map selections and revealed note names when switching into practice', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))
    const mapFretboard = screen.getByLabelText('吉他指板')
    fireEvent.click(within(mapFretboard).getByRole('button', { name: '5弦 3品 C3' }))
    expect(within(mapFretboard).getByRole('button', { name: '5弦 3品 C3' })).toHaveAttribute('data-state', 'selected')

    fireEvent.click(screen.getByRole('tab', { name: '今日练习' }))

    const practiceFretboard = screen.getByLabelText('吉他指板')
    expect(screen.getByText('已选 0')).toBeInTheDocument()
    expect(within(practiceFretboard).getByRole('button', { name: '5弦 3品 C3' })).toHaveAttribute('data-state', 'idle')
  })

  it('honors hidden and timed note-name display settings after a click', () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '不显示点击音名' }))
    fireEvent.click(screen.getByRole('tab', { name: '今日练习' }))

    const hiddenFretboard = screen.getByLabelText('吉他指板')
    const hiddenTarget = within(hiddenFretboard).getByRole('button', { name: '5弦 3品 C3' })
    fireEvent.click(hiddenTarget)
    expect(hiddenTarget).toHaveTextContent('')

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '1 秒后淡出' }))
    fireEvent.click(screen.getByRole('tab', { name: '今日练习' }))

    const timedFretboard = screen.getByLabelText('吉他指板')
    const timedTarget = within(timedFretboard).getByRole('button', { name: '5弦 3品 C3' })
    fireEvent.click(timedTarget)
    expect(timedTarget).toHaveTextContent('C')

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(timedTarget).toHaveTextContent('')
  })

  it('lets users skip the current question and manually choose another practice range', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('找出所有 C')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '跳过此题' }))
    expect(screen.queryByText('找出所有 C')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '中把位 5-12 品' }))
    fireEvent.click(screen.getByRole('button', { name: '生成题目' }))

    expect(screen.getByText('可选范围 5-12 品')).toBeInTheDocument()
  })

  it('lets users configure an interval question before explicitly generating it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    const initialPrompt = screen.getByText(/^找出所有 /).textContent
    fireEvent.click(screen.getByRole('button', { name: '自选题目' }))
    fireEvent.click(screen.getByRole('button', { name: '音程' }))
    fireEvent.click(screen.getByRole('button', { name: '根音 C' }))
    fireEvent.click(screen.getByRole('button', { name: '纯五度' }))

    expect(screen.getByText(initialPrompt!)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '生成题目' }))

    expect(screen.getByText('找出 C 上方纯五度 G')).toBeInTheDocument()
  })

  it('answers a configured identify-note question with note buttons', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '自选题目' }))
    fireEvent.click(screen.getByRole('button', { name: '认音' }))
    fireEvent.click(screen.getByRole('button', { name: '4 弦' }))
    fireEvent.click(screen.getByRole('button', { name: '生成题目' }))

    expect(screen.getByText('4 弦 0 品是什么音？')).toBeInTheDocument()
    const fretboard = screen.getByLabelText('吉他指板')
    const referencePosition = within(fretboard).getByRole('button', { name: '4弦 0品 D3' })
    expect(referencePosition).toHaveAttribute('data-reference', 'true')
    expect(referencePosition).toBeDisabled()
    const answers = screen.getByRole('group', { name: '音名答案' })
    fireEvent.click(within(answers).getByRole('button', { name: 'D' }))
    fireEvent.click(screen.getByRole('button', { name: '提交答案' }))

    expect(screen.getByText('本题通过')).toBeInTheDocument()
    expect(screen.getByText('你的答案 D，正确答案 D。')).toBeInTheDocument()
  })
})
