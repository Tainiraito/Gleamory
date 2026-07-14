import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FretboardAppearanceSettings } from './FretboardAppearanceSettings'

describe('FretboardAppearanceSettings', () => {
  it('shows four direct preview buttons and reports the selected preset', () => {
    const onChange = vi.fn()
    const { container } = render(<FretboardAppearanceSettings value="rosewood" onChange={onChange} />)

    const group = screen.getByRole('group', { name: '指板外观' })
    expect(within(group).getAllByRole('button')).toHaveLength(4)
    expect(screen.queryByRole('combobox', { name: '指板外观' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /玫瑰木经典/ })).toHaveAttribute('aria-pressed', 'true')
    expect(container.querySelectorAll('.fretboard-appearance-preview[aria-hidden="true"]')).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: /乌木舞台/ }))
    expect(onChange).toHaveBeenCalledWith('ebony')
  })
})
