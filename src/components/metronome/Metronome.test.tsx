import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { METRONOME_VOLUME_STORAGE_KEY } from '@/lib/metronomeVolume'
import { Metronome } from './Metronome'

const metronomeControls = vi.hoisted(() => ({
  playBeatSound: vi.fn(),
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
}))

vi.mock('@/hooks/useMetronome', () => ({
  useMetronome: () => ({
    isPlaying: false,
    currentBeat: null,
    currentTickIndex: 0,
    elapsedTime: 0,
    roundCount: 1,
    currentBpm: 120,
    ...metronomeControls,
  }),
}))

describe('Metronome volume control', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('loads the saved volume and exposes an accessible popup', async () => {
    localStorage.setItem(METRONOME_VOLUME_STORAGE_KEY, '0.42')
    render(<Metronome />)

    const trigger = screen.getByRole('button', { name: '音量 42%' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const panel = screen.getByRole('group', { name: '音量控制' })
    const slider = panel.querySelector<HTMLInputElement>('input[type="range"]')
    expect(slider).toHaveAttribute('aria-label', '音量')
    expect(slider).toHaveAttribute('aria-valuenow', '0.42')
    expect(screen.getByText('42%')).toBeInTheDocument()
    await waitFor(() => expect(panel).toHaveStyle({ opacity: '1' }))
  })

  it('supports keyboard volume changes and persists zero as mute', async () => {
    render(<Metronome />)
    fireEvent.click(screen.getByRole('button', { name: '音量 80%' }))

    const panel = screen.getByRole('group', { name: '音量控制' })
    const slider = panel.querySelector<HTMLInputElement>('input[type="range"]')!
    fireEvent.keyDown(slider, { key: 'Home' })

    await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: '音量 0%' })).toBeInTheDocument()
    expect(localStorage.getItem(METRONOME_VOLUME_STORAGE_KEY)).toBe('0')
  })

  it('closes on Escape with focus restored and closes on an outside pointer press', async () => {
    render(<Metronome />)
    const trigger = screen.getByRole('button', { name: '音量 80%' })

    fireEvent.click(trigger)
    const panel = screen.getByRole('group', { name: '音量控制' })
    const slider = panel.querySelector<HTMLInputElement>('input[type="range"]')!
    slider.focus()
    fireEvent.keyDown(slider, { key: 'Escape' })

    await waitFor(() => expect(screen.queryByRole('group', { name: '音量控制' })).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()

    fireEvent.click(trigger)
    fireEvent.pointerDown(document.body)
    await waitFor(() => expect(screen.queryByRole('group', { name: '音量控制' })).not.toBeInTheDocument())
  })
})
