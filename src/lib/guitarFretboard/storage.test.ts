import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadFretboardState, saveFretboardState } from './storage'
import { getTuningPreset } from './tuning'

describe('guitar fretboard local storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-07T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('returns default settings when storage is empty', () => {
    const state = loadFretboardState()

    expect(state.settings.tuning.id).toBe('standard')
    expect(state.settings.fretCount).toBe(24)
    expect(state.settings.noteDisplayMs).toBeNull()
    expect(state.settings.appearance).toBe('rosewood')
    expect(Object.keys(state)).toEqual(['settings'])
  })

  it('falls back to defaults when local storage cannot be read', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })

    expect(loadFretboardState().settings.tuning.id).toBe('standard')
  })

  it('reports a failed write instead of throwing when local storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota exceeded', 'QuotaExceededError')
    })

    expect(saveFretboardState({
      settings: {
        tuning: getTuningPreset('standard'),
        fretCount: 24,
        accidental: 'sharp',
        mode: 'hidden',
        noteDisplayMs: null,
        appearance: 'rosewood',
      },
    })).toBe(false)
  })

  it('falls back to a complete preset when stored tuning data is incomplete', () => {
    localStorage.setItem(
      'gleamory:guitar-fretboard-trainer:state',
      JSON.stringify({
        settings: {
          tuning: { id: 'standard', name: 'Standard EADGBE' },
          fretCount: 24,
          accidental: 'sharp',
          mode: 'hidden',
        },
        sessions: [],
        skillStates: {},
      }),
    )

    const state = loadFretboardState()

    expect(state.settings.tuning.id).toBe('standard')
    expect(state.settings.tuning.strings).toHaveLength(6)
    expect(state.settings.tuning.strings[0]?.openNote).toBe('E2')
    expect(state.settings.noteDisplayMs).toBeNull()
    expect(state.settings.appearance).toBe('rosewood')
  })

  it('persists only settings without practice history', () => {
    saveFretboardState({
      settings: {
        tuning: getTuningPreset('drop-d'),
        fretCount: 12,
        accidental: 'flat',
        mode: 'hidden',
        noteDisplayMs: 3000,
        appearance: 'ebony',
      },
    })

    const state = loadFretboardState()
    const stored = JSON.parse(localStorage.getItem('gleamory:guitar-fretboard-trainer:state')!)

    expect(state.settings.tuning.id).toBe('drop-d')
    expect(state.settings.fretCount).toBe(12)
    expect(state.settings.noteDisplayMs).toBe(3000)
    expect(state.settings.appearance).toBe('ebony')
    expect(Object.keys(stored)).toEqual(['settings'])
  })

  it('loads settings from legacy state without exposing practice history', () => {
    localStorage.setItem(
      'gleamory:guitar-fretboard-trainer:state',
      JSON.stringify({
        settings: { tuning: { id: 'drop-d' }, fretCount: 12, accidental: 'flat', mode: 'hidden', noteDisplayMs: 1000 },
        sessions: [{
          id: 'legacy',
          startedAt: '2026-07-07T12:00:00.000Z',
          endedAt: '2026-07-07T12:00:02.000Z',
          totalQuestions: 1,
          correctQuestions: 1,
          accuracy: 1,
          averageResponseMs: 2000,
          weakNotes: [],
        }],
        dailyRecords: { '2026-07-07': { totalQuestions: 1 } },
        skillStates: { 'note:C': { attempts: 1 } },
      }),
    )

    const state = loadFretboardState()

    expect(state.settings).toMatchObject({ fretCount: 12, accidental: 'flat', noteDisplayMs: 1000 })
    expect(state.settings.tuning.id).toBe('drop-d')
    expect(Object.keys(state)).toEqual(['settings'])
  })

  it('falls back to rosewood when the stored appearance is unknown', () => {
    localStorage.setItem(
      'gleamory:guitar-fretboard-trainer:state',
      JSON.stringify({
        settings: {
          tuning: { id: 'standard' },
          fretCount: 24,
          accidental: 'sharp',
          mode: 'hidden',
          noteDisplayMs: null,
          appearance: 'neon',
        },
      }),
    )

    expect(loadFretboardState().settings.appearance).toBe('rosewood')
  })
})
