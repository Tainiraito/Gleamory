import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GlossaryTerm, GlossaryText } from './GlossaryTerm'

describe('GlossaryTerm', () => {
  it('opens from keyboard focus and closes with Escape', () => {
    render(<GlossaryTerm termId="interval" />)

    const trigger = screen.getByText('音程')
    fireEvent.focus(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('两个音之间的音高距离')

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('renders related terms as nested glossary entries', () => {
    render(<GlossaryTerm termId="interval" />)

    fireEvent.mouseEnter(screen.getByText('音程'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.focus(screen.getByText('纯五度'))
    expect(screen.getAllByRole('tooltip')).toHaveLength(2)
  })

  it('automatically annotates glossary terms in text', () => {
    render(<GlossaryText text="找出 C 上方纯五度" />)

    expect(screen.getByText('纯五度')).toHaveClass('glossary-term')
  })
})
