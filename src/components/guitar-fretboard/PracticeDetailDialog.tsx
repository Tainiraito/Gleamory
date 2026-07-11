import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { getSessionDate, summarizeSessionsForDate } from '@/lib/guitarFretboard/practiceHistory'
import type { PracticeSession, QuizType } from '@/lib/guitarFretboard/types'

interface PracticeDetailDialogProps {
  date: string
  sessions: PracticeSession[]
  onClose: () => void
}

type DetailFilter = 'all' | QuizType

const quizTypeOptions: Array<{ value: DetailFilter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'find-note', label: '找音' },
  { value: 'identify-note', label: '认音' },
  { value: 'octave', label: '八度' },
  { value: 'interval', label: '音程' },
  { value: 'scale-degree', label: '调内音' },
]

const quizTypeLabels = Object.fromEntries(quizTypeOptions.map((option) => [option.value, option.label])) as Record<DetailFilter, string>

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return year && month && day ? `${year}年${month}月${day}日` : date
}

function formatTime(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '--:--' : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function formatResponse(ms: number): string {
  return ms > 0 ? `${(ms / 1000).toFixed(2)} 秒` : '--'
}

export function PracticeDetailDialog({ date, sessions, onClose }: PracticeDetailDialogProps) {
  const [filter, setFilter] = useState<DetailFilter>('all')
  const daySessions = useMemo(
    () => sessions.filter((session) => getSessionDate(session) === date),
    [date, sessions],
  )
  const filteredSessions = useMemo(
    () => daySessions.filter((session) => filter === 'all' || session.quizType === filter),
    [daySessions, filter],
  )
  const summary = summarizeSessionsForDate(sessions, date, filter === 'all' ? undefined : filter)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return createPortal(
    <div className="practice-dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="practice-dialog" role="dialog" aria-modal="true" aria-labelledby="practice-dialog-title">
        <header>
          <div>
            <p>练习详情</p>
            <h2 id="practice-dialog-title">{formatDate(date)}练习详情</h2>
          </div>
          <button type="button" className="fretboard-icon-button" aria-label="关闭练习详情" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <div className="practice-dialog-summary">
          <span>共 {summary.totalQuestions} 题</span>
          <span>正确率 {Math.round(summary.accuracy * 100)}%</span>
          <span>平均反应 {formatResponse(summary.averageResponseMs)}</span>
        </div>

        <div className="practice-dialog-filters" role="group" aria-label="题型筛选">
          {quizTypeOptions.map((option) => (
            <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)}>
              {option.label}
            </button>
          ))}
        </div>

        {filter === 'all' && daySessions.length > 0 && (
          <div className="practice-type-breakdown" aria-label="题型统计">
            {quizTypeOptions.slice(1).map((option) => {
              const typeSummary = summarizeSessionsForDate(sessions, date, option.value as QuizType)
              return (
                <div key={option.value}>
                  <strong>{option.label}</strong>
                  <span>{typeSummary.totalQuestions} 题</span>
                  <span>{Math.round(typeSummary.accuracy * 100)}%</span>
                  <span>{formatResponse(typeSummary.averageResponseMs)}</span>
                </div>
              )
            })}
          </div>
        )}

        {filteredSessions.length === 0 ? (
          <p className="practice-dialog-empty">当天还没有练习记录</p>
        ) : (
          <div className="practice-session-list">
            {[...filteredSessions].sort((a, b) => b.endedAt.localeCompare(a.endedAt)).map((session) => (
              <article key={session.id}>
                <time>{formatTime(session.endedAt)}</time>
                <span>{session.quizType ? quizTypeLabels[session.quizType] : '未分类'}</span>
                <strong>{session.questionPrompt ?? '练习题'}</strong>
                <em data-correct={session.correctQuestions === session.totalQuestions ? 'true' : 'false'}>
                  {session.correctQuestions === session.totalQuestions ? '正确' : '错误'}
                </em>
                <small>{formatResponse(session.responseMs ?? session.averageResponseMs)}</small>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>,
    document.body,
  )
}
