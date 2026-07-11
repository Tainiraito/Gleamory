import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

describe('App routes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})))
  })

  it('renders the guitar fretboard trainer from its hash route', async () => {
    window.location.hash = '/guitar-fretboard-trainer'

    render(<App />)

    expect(await screen.findByRole('heading', { name: '指板音训练' }, { timeout: 3000 })).toBeInTheDocument()
  })
})
