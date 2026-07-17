import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Slider } from './slider'

describe('Slider', () => {
  it('uses the shared visible track, range, and thumb styles', () => {
    const { container } = render(<Slider aria-label="音量" min={0} max={100} value={[90]} />)
    const track = container.querySelector('[data-slot="slider-track"]')

    expect(track).toHaveAttribute('data-orientation', 'horizontal')
    expect(track).toHaveClass('bg-[var(--control-track)]', 'data-[orientation=horizontal]:h-1.5')
    expect(container.querySelector('[data-slot="slider-range"]')).toHaveClass(
      'bg-[var(--control-track-active)]',
    )
    expect(container.querySelector('[data-slot="slider-thumb"]')).toHaveClass(
      'size-4',
      'border-[var(--control-track-active)]',
      'bg-[var(--control-thumb)]',
    )
  })
})
