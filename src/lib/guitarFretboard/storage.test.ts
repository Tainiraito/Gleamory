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
    expect(state.dailyRecords).toEqual({})
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

  it('persists settings and caps newest-first practice sessions', () => {
    const sessions = Array.from({ length: 5005 }, (_, index) => ({
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
      dailyRecords: {},
      skillStates: { 'note:C': { skillId: 'note:C', attempts: 2, correct: 1, wrong: 1, accuracy: 0.5, avgResponseMs: 1500, lastPracticedAt: '2026-07-07T12:00:00.000Z', strength: 0.35, dueAt: '2026-07-08T12:00:00.000Z' } },
    })

    const state = loadFretboardState()

    expect(state.settings.tuning.id).toBe('drop-d')
    expect(state.settings.fretCount).toBe(12)
    expect(state.settings.noteDisplayMs).toBe(3000)
    expect(state.sessions).toHaveLength(5000)
    expect(state.sessions[0]?.id).toBe('session-0')
    expect(state.sessions[state.sessions.length - 1]?.id).toBe('session-4999')
    expect(state.skillStates['note:C']?.wrong).toBe(1)
  })

  it('migrates legacy sessions into local daily records', () => {
    localStorage.setItem(
      'gleamory:guitar-fretboard-trainer:state',
      JSON.stringify({
        settings: { tuning: { id: 'standard' }, fretCount: 24, accidental: 'sharp', mode: 'hidden' },
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
        skillStates: {},
      }),
    )

    const state = loadFretboardState()
    const date = state.sessions[0]?.localDate

    expect(date).toMatch(/^2026-07-0[78]$/)
    expect(state.dailyRecords[date!]).toMatchObject({ totalQuestions: 1, correctQuestions: 1, totalResponseMs: 2000 })
  })

  it('keeps only the newest 400 daily aggregates', () => {
    const dailyRecords = Object.fromEntries(
      Array.from({ length: 405 }, (_, index) => {
        const date = `2026-${String(Math.floor(index / 28) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`
        return [date, { date, totalQuestions: 1, correctQuestions: 1, totalResponseMs: 1000, byQuizType: {} }]
      }),
    )

    saveFretboardState({
      settings: { tuning: getTuningPreset('standard'), fretCount: 24, accidental: 'sharp', mode: 'hidden', noteDisplayMs: null },
      sessions: [],
      dailyRecords,
      skillStates: {},
    })

    expect(Object.keys(loadFretboardState().dailyRecords)).toHaveLength(400)
  })
})
