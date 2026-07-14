import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { generateFretboard } from '@/lib/guitarFretboard/fretboard'
import { getTuningPreset } from '@/lib/guitarFretboard/tuning'
import { Fretboard } from './Fretboard'

describe('Fretboard', () => {
  it('renders appearance, physical fret tracks, string metadata, and realistic markers', () => {
    const fretboard = generateFretboard({
      tuning: getTuningPreset('standard'),
      fretCount: 24,
      accidental: 'sharp',
    })
    const { container } = render(
      <Fretboard
        strings={fretboard.strings.map((string) => string.stringNumber)}
        frets={fretboard.frets}
        positions={fretboard.positions}
        selectedKeys={new Set()}
        mode="hidden"
        appearance="ebony"
        onActivatePosition={vi.fn()}
        onClearPosition={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('吉他指板')).toHaveAttribute('data-appearance', 'ebony')
    expect(container.querySelector('[data-string-number="6"] .fretboard-string-line')).toBeInTheDocument()
    expect(container.querySelector('[data-fret-number="0"]')).toBeInTheDocument()
    expect(container.querySelector('[data-fret-number="1"]')).toBeInTheDocument()
    expect(container.querySelectorAll('[data-marker-type="single"]')).toHaveLength(8)
    expect(container.querySelectorAll('[data-marker-type="double"]')).toHaveLength(4)
    expect((container.querySelector('.fretboard-grid') as HTMLElement).style.gridTemplateColumns).toContain('0.65fr')
  })
})
