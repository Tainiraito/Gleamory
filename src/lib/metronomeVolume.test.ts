import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_METRONOME_VOLUME,
  METRONOME_VOLUME_STORAGE_KEY,
  loadMetronomeVolume,
  normalizeMetronomeVolume,
  saveMetronomeVolume,
} from './metronomeVolume'

describe('metronome volume persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the default for missing, empty, or invalid values', () => {
    expect(loadMetronomeVolume()).toBe(DEFAULT_METRONOME_VOLUME)

    localStorage.setItem(METRONOME_VOLUME_STORAGE_KEY, ' ')
    expect(loadMetronomeVolume()).toBe(DEFAULT_METRONOME_VOLUME)

    localStorage.setItem(METRONOME_VOLUME_STORAGE_KEY, 'not-a-number')
    expect(loadMetronomeVolume()).toBe(DEFAULT_METRONOME_VOLUME)
  })

  it('loads finite values and clamps them to the supported range', () => {
    localStorage.setItem(METRONOME_VOLUME_STORAGE_KEY, '0.42')
    expect(loadMetronomeVolume()).toBe(0.42)

    localStorage.setItem(METRONOME_VOLUME_STORAGE_KEY, '-2')
    expect(loadMetronomeVolume()).toBe(0)

    localStorage.setItem(METRONOME_VOLUME_STORAGE_KEY, '4')
    expect(loadMetronomeVolume()).toBe(1)
  })

  it('normalizes non-finite runtime values to the default', () => {
    expect(normalizeMetronomeVolume(Number.NaN)).toBe(DEFAULT_METRONOME_VOLUME)
    expect(normalizeMetronomeVolume(Number.POSITIVE_INFINITY)).toBe(DEFAULT_METRONOME_VOLUME)
  })

  it('saves a normalized scalar value', () => {
    expect(saveMetronomeVolume(0.63)).toBe(true)
    expect(localStorage.getItem(METRONOME_VOLUME_STORAGE_KEY)).toBe('0.63')

    expect(saveMetronomeVolume(2)).toBe(true)
    expect(localStorage.getItem(METRONOME_VOLUME_STORAGE_KEY)).toBe('1')
  })

  it('falls back without breaking when storage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('blocked')
      }),
      setItem: vi.fn(() => {
        throw new Error('blocked')
      }),
    })

    expect(loadMetronomeVolume()).toBe(DEFAULT_METRONOME_VOLUME)
    expect(saveMetronomeVolume(0.5)).toBe(false)
  })
})
