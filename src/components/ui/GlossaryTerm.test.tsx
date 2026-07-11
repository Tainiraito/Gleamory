import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GlossaryTerm, GlossaryText } from './GlossaryTerm'

describe('GlossaryTerm', () => {
  afterEach(() => vi.useRealTimers())

  it('opens from keyboard focus and closes with Escape', () => {
    render(<GlossaryTerm termId="interval" />)

    const trigger = screen.getByText('音程')
    fireEvent.focus(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('两个音之间的音高距离')

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('waits 500ms on hover and shows a progress ring while pending', () => {
    vi.useFakeTimers()
    render(<GlossaryTerm termId="interval" />)

    fireEvent.mouseEnter(screen.getByText('音程'))
    expect(screen.getByTestId('glossary-hover-progress')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(499))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(1))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    expect(screen.queryByTestId('glossary-hover-progress')).not.toBeInTheDocument()
  })

  it('cancels a pending hover when the pointer leaves', () => {
    vi.useFakeTimers()
    render(<GlossaryTerm termId="interval" />)

    const trigger = screen.getByText('音程')
    fireEvent.mouseEnter(trigger)
    fireEvent.mouseLeave(trigger)
    act(() => vi.advanceTimersByTime(500))

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.queryByTestId('glossary-hover-progress')).not.toBeInTheDocument()
  })

  it('allows related terms to continue beyond three nesting levels', () => {
    render(<GlossaryTerm termId="interval" />)

    fireEvent.focus(screen.getByText('音程'))
    const firstTooltips = screen.getAllByRole('tooltip')
    const first = firstTooltips[firstTooltips.length - 1]!
    fireEvent.focus(within(first).getByText('纯五度'))
    const secondTooltips = screen.getAllByRole('tooltip')
    const second = secondTooltips[secondTooltips.length - 1]!
    fireEvent.focus(within(second).getByText('根音'))
    const thirdTooltips = screen.getAllByRole('tooltip')
    const third = thirdTooltips[thirdTooltips.length - 1]!
    fireEvent.focus(within(third).getByText('大调'))
    const fourthTooltips = screen.getAllByRole('tooltip')
    const fourth = fourthTooltips[fourthTooltips.length - 1]!
    fireEvent.focus(within(fourth).getByText('音阶'))

    expect(screen.getAllByRole('tooltip')).toHaveLength(5)
  })

  it('automatically annotates glossary terms in text', () => {
    render(<GlossaryText text="找出 C 上方纯五度" />)

    expect(screen.getByText('纯五度')).toHaveClass('glossary-term')
  })
})
