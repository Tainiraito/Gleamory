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
    const questionPanel = container.querySelector('.fretboard-question-panel')
    const tabs = container.querySelector('.fretboard-tabs')
    expect(boardPanel).toBeInTheDocument()
    expect(questionPanel).toBeInTheDocument()
    expect(tabs).toBeInTheDocument()
    expect(Boolean(boardPanel!.compareDocumentPosition(questionPanel!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)
    expect(Boolean(questionPanel!.compareDocumentPosition(tabs!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true)

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

    expect(screen.getByRole('heading', { name: '点位置、听音色、切换把位和音阶' })).toBeInTheDocument()
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

  it('removes nonessential practice and settings side panels', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('tab', { name: '记录' })).not.toBeInTheDocument()
    expect(screen.queryByText('实时反馈')).not.toBeInTheDocument()
    expect(screen.queryByText('薄弱区域')).not.toBeInTheDocument()
    expect(screen.queryByText('采样音色')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))
    expect(screen.queryByText('设置说明')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))
    expect(screen.getByText('当前位置详情')).toBeInTheDocument()
    expect(screen.queryByText('采样音色')).not.toBeInTheDocument()
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

    expect(screen.getByText('本题未通过')).toBeInTheDocument()
    expect(screen.getByText(/遗漏 .* 个，误选 .* 个。/)).toBeInTheDocument()
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
    expect(screen.queryByText('薄弱区域')).not.toBeInTheDocument()
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
    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))

    const hiddenFretboard = screen.getByLabelText('吉他指板')
    const hiddenTarget = within(hiddenFretboard).getByRole('button', { name: '5弦 3品 C3' })
    fireEvent.click(hiddenTarget)
    expect(hiddenTarget).toHaveTextContent('')

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '1 秒后淡出' }))
    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))

    const timedFretboard = screen.getByLabelText('吉他指板')
    const timedTarget = within(timedFretboard).getByRole('button', { name: '5弦 3品 C3' })
    fireEvent.click(timedTarget)
    expect(timedTarget).toHaveTextContent('C')

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(timedTarget).toHaveTextContent('')
  })

  it('keeps clicked positions hidden after fading even when the base mode shows all notes', () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '全部音名' }))
    fireEvent.click(screen.getByRole('button', { name: '1 秒后淡出' }))
    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))

    const fretboard = screen.getByLabelText('吉他指板')
    const clickedTarget = within(fretboard).getByRole('button', { name: '5弦 3品 C3' })
    const untouchedTarget = within(fretboard).getByRole('button', { name: '2弦 1品 C4' })
    expect(clickedTarget).toHaveTextContent('C')
    expect(untouchedTarget).toHaveTextContent('C')

    fireEvent.click(clickedTarget)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(clickedTarget).toHaveTextContent('')
    expect(untouchedTarget).toHaveTextContent('C')
  })

  it('hides a clicked position immediately when click labels are disabled', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '全部音名' }))
    fireEvent.click(screen.getByRole('button', { name: '不显示点击音名' }))
    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))

    const target = within(screen.getByLabelText('吉他指板')).getByRole('button', { name: '5弦 3品 C3' })
    expect(target).toHaveTextContent('C')
    fireEvent.click(target)
    expect(target).toHaveTextContent('')
  })

  it('removes explorer selection and its note when the display timer ends', () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '1 秒后淡出' }))
    fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))
    const target = within(screen.getByLabelText('吉他指板')).getByRole('button', { name: '5弦 3品 C3' })

    fireEvent.click(target)
    expect(target).toHaveAttribute('data-state', 'selected')
    act(() => vi.advanceTimersByTime(1000))

    expect(target).toHaveAttribute('data-state', 'idle')
    expect(target).toHaveTextContent('')
  })

  it('never fades selected answers in daily practice', () => {
    vi.useFakeTimers()
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('tab', { name: '设置' }))
    fireEvent.click(screen.getByRole('button', { name: '1 秒后淡出' }))
    fireEvent.click(screen.getByRole('tab', { name: '今日练习' }))
    const target = within(screen.getByLabelText('吉他指板')).getByRole('button', { name: '5弦 3品 C3' })

    fireEvent.click(target)
    act(() => vi.advanceTimersByTime(5000))

    expect(target).toHaveAttribute('data-state', 'selected')
    expect(target).toHaveTextContent('C')
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

    expect(screen.getByText('可选范围 5-12 品')).toBeInTheDocument()
  })

  it('applies custom question parameters immediately', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '自选题目' }))
    fireEvent.click(screen.getByRole('button', { name: '音程' }))
    fireEvent.click(screen.getByRole('button', { name: '根音 C' }))
    fireEvent.click(screen.getByRole('button', { name: '纯五度' }))

    expect(screen.getByRole('heading', { name: '找出 C 上方纯五度 G' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '生成题目' })).not.toBeInTheDocument()
  })

  it('switches from a generated custom type back to the allowed random scope immediately', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '自选题目' }))
    fireEvent.click(screen.getByRole('button', { name: '音程' }))
    expect(screen.getByRole('heading', { name: '找出 C 上方纯五度 G' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '随机混合' }))

    expect(screen.getByText('找出所有 C')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '随机题型' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '找音' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '认音' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('group', { name: '随机音名' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: '随机弦' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: '随机音程' })).not.toBeInTheDocument()
  })

  it('keeps the final selected item in every random scope group', () => {
    render(
      <MemoryRouter>
        <GuitarFretboardTrainerPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: '认音' }))
    const findNote = screen.getByRole('button', { name: '找音' })
    fireEvent.click(findNote)

    expect(findNote).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('至少保留一项')
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

    expect(screen.getByRole('heading', { name: '4 弦 0 品是什么音？' })).toBeInTheDocument()
    const fretboard = screen.getByLabelText('吉他指板')
    const referencePosition = within(fretboard).getByRole('button', { name: '4弦 0品 D3' })
    expect(referencePosition).toHaveAttribute('data-reference', 'true')
    expect(referencePosition).toBeDisabled()
    const answers = screen.getByRole('group', { name: '音名答案' })
    fireEvent.click(within(answers).getByRole('button', { name: 'D' }))

    expect(screen.getByText('本题通过')).toBeInTheDocument()
    expect(screen.getByText('你的答案 D，正确答案 D。')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '提交答案' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '下一题' })).toBeInTheDocument()
  })
})
