import { describe, expect, it } from 'vitest'
import type { PracticeSession } from './types'
import {
  buildDailyRecords,
  getLocalDateKey,
  getPracticeLevel,
  getRecentPracticeDays,
  summarizeSessionsForDate,
} from './practiceHistory'

function makeSession(overrides: Partial<PracticeSession> = {}): PracticeSession {
  return {
    id: 'session-1',
    startedAt: '2026-07-11T02:00:00.000Z',
    endedAt: '2026-07-11T02:00:02.000Z',
    localDate: '2026-07-11',
    quizType: 'find-note',
    isCorrect: true,
    totalQuestions: 1,
    correctQuestions: 1,
    accuracy: 1,
    averageResponseMs: 2000,
    responseMs: 2000,
    weakNotes: [],
    ...overrides,
  }
}

describe('practice history', () => {
  it('formats calendar keys with local date parts', () => {
    expect(getLocalDateKey(new Date(2026, 6, 11, 23, 30))).toBe('2026-07-11')
  })

  it('assigns stable heatmap levels from question counts', () => {
    expect([0, 1, 4, 5, 9, 10, 19, 20].map(getPracticeLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4])
  })

  it('summarizes a local day and optional quiz type', () => {
    const sessions = [
      makeSession(),
      makeSession({ id: 'session-2', quizType: 'interval', isCorrect: false, correctQuestions: 0, accuracy: 0, averageResponseMs: 4000, responseMs: 4000 }),
      makeSession({ id: 'session-3', quizType: 'interval', averageResponseMs: 6000, responseMs: 6000 }),
      makeSession({ id: 'session-4', localDate: '2026-07-10' }),
    ]

    expect(summarizeSessionsForDate(sessions, '2026-07-11')).toMatchObject({
      totalQuestions: 3,
      correctQuestions: 2,
      accuracy: 2 / 3,
      averageResponseMs: 4000,
    })
    expect(summarizeSessionsForDate(sessions, '2026-07-11', 'interval')).toMatchObject({
      totalQuestions: 2,
      correctQuestions: 1,
      accuracy: 0.5,
      averageResponseMs: 5000,
    })
  })

  it('builds daily and per-type aggregates', () => {
    const records = buildDailyRecords([
      makeSession(),
      makeSession({ id: 'session-2', quizType: 'interval', isCorrect: false, correctQuestions: 0, accuracy: 0, averageResponseMs: 3000, responseMs: 3000 }),
    ])

    expect(records['2026-07-11']).toMatchObject({ totalQuestions: 2, correctQuestions: 1, totalResponseMs: 5000 })
    expect(records['2026-07-11']?.byQuizType.interval).toMatchObject({ totalQuestions: 1, correctQuestions: 0, totalResponseMs: 3000 })
  })

  it('returns a continuous recent-day series ending today', () => {
    const days = getRecentPracticeDays({}, new Date(2026, 6, 11, 12), 365)

    expect(days).toHaveLength(365)
    expect(days[0]?.date).toBe('2025-07-12')
    expect(days[days.length - 1]?.date).toBe('2026-07-11')
    expect(days.every((day) => day.level === 0)).toBe(true)
  })
})
