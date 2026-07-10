import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadFretboardState, saveFretboardState } from './storage'
import { getTuningPreset } from './tuning'

describe('guitar fretboard local storage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-07T12:00:00.000Z'))
  })

  it('returns default settings when storage is empty', () => {
    const state = loadFretboardState()

    expect(state.settings.tuning.id).toBe('standard')
    expect(state.settings.fretCount).toBe(24)
    expect(state.settings.noteDisplayMs).toBeNull()
    expect(state.sessions).toEqual([])
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
  })

  it('persists settings and caps saved practice sessions', () => {
    const sessions = Array.from({ length: 1005 }, (_, index) => ({
      id: `session-${index}`,
      startedAt: '2026-07-07T12:00:00.000Z',
      endedAt: '2026-07-07T12:05:00.000Z',
      totalQuestions: 1,
      correctQuestions: index % 2,
      accuracy: index % 2,
      averageResponseMs: 1000 + index,
      weakNotes: index % 2 ? [] : ['C'],
    }))

    saveFretboardState({
      settings: { tuning: getTuningPreset('drop-d'), fretCount: 12, accidental: 'flat', mode: 'hidden', noteDisplayMs: 3000 },
      sessions,
      skillStates: { 'note:C': { skillId: 'note:C', attempts: 2, correct: 1, wrong: 1, accuracy: 0.5, avgResponseMs: 1500, lastPracticedAt: '2026-07-07T12:00:00.000Z', strength: 0.35, dueAt: '2026-07-08T12:00:00.000Z' } },
    })

    const state = loadFretboardState()

    expect(state.settings.tuning.id).toBe('drop-d')
    expect(state.settings.fretCount).toBe(12)
    expect(state.settings.noteDisplayMs).toBe(3000)
    expect(state.sessions).toHaveLength(1000)
    expect(state.sessions[0]?.id).toBe('session-5')
    expect(state.skillStates['note:C']?.wrong).toBe(1)
  })
})
