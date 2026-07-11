import type {
  DailyPracticeRecord,
  DailyQuizTypeStats,
  PracticeDay,
  PracticeSession,
  PracticeSummary,
  QuizType,
} from './types'

function padDatePart(value: number): string {
  return String(value).padStart(2, '0')
}

export function getLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`
}

export function getSessionDate(session: PracticeSession): string {
  if (session.localDate) return session.localDate
  const endedAt = new Date(session.endedAt)
  return Number.isNaN(endedAt.getTime()) ? '' : getLocalDateKey(endedAt)
}

export function getPracticeLevel(totalQuestions: number): 0 | 1 | 2 | 3 | 4 {
  if (totalQuestions <= 0) return 0
  if (totalQuestions <= 4) return 1
  if (totalQuestions <= 9) return 2
  if (totalQuestions <= 19) return 3
  return 4
}

function emptyStats(): DailyQuizTypeStats {
  return { totalQuestions: 0, correctQuestions: 0, totalResponseMs: 0 }
}

function addSession(stats: DailyQuizTypeStats, session: PracticeSession): void {
  stats.totalQuestions += session.totalQuestions
  stats.correctQuestions += session.correctQuestions
  stats.totalResponseMs += (session.responseMs ?? session.averageResponseMs) * session.totalQuestions
}

export function buildDailyRecords(sessions: PracticeSession[]): Record<string, DailyPracticeRecord> {
  const records: Record<string, DailyPracticeRecord> = {}

  sessions.forEach((session) => {
    const date = getSessionDate(session)
    if (!date) return
    const record = records[date] ?? { date, ...emptyStats(), byQuizType: {} }
    addSession(record, session)
    if (session.quizType) {
      const typeStats = record.byQuizType[session.quizType] ?? emptyStats()
      addSession(typeStats, session)
      record.byQuizType[session.quizType] = typeStats
    }
    records[date] = record
  })

  return records
}

export function summarizeSessionsForDate(
  sessions: PracticeSession[],
  date: string,
  quizType?: QuizType,
): PracticeSummary {
  const matching = sessions.filter(
    (session) => getSessionDate(session) === date && (!quizType || session.quizType === quizType),
  )
  const totalQuestions = matching.reduce((sum, session) => sum + session.totalQuestions, 0)
  const correctQuestions = matching.reduce((sum, session) => sum + session.correctQuestions, 0)
  const totalResponseMs = matching.reduce(
    (sum, session) => sum + (session.responseMs ?? session.averageResponseMs) * session.totalQuestions,
    0,
  )

  return {
    totalQuestions,
    correctQuestions,
    accuracy: totalQuestions === 0 ? 0 : correctQuestions / totalQuestions,
    averageResponseMs: totalQuestions === 0 ? 0 : Math.round(totalResponseMs / totalQuestions),
    weakNotes: [...new Set(matching.flatMap((session) => session.weakNotes))],
  }
}

export function getRecentPracticeDays(
  records: Record<string, DailyPracticeRecord>,
  today: Date,
  days: number,
): PracticeDay[] {
  return Array.from({ length: Math.max(0, days) }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    date.setDate(date.getDate() - (days - index - 1))
    const key = getLocalDateKey(date)
    const record = records[key] ?? { date: key, ...emptyStats(), byQuizType: {} }
    return { ...record, level: getPracticeLevel(record.totalQuestions) }
  })
}
