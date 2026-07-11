import { useMemo, useState, type CSSProperties } from 'react'
import type { PracticeDay } from '@/lib/guitarFretboard/types'

interface PracticeHeatmapProps {
  days: PracticeDay[]
  onSelectDate: (date: string) => void
}

function formatResponse(ms: number): string {
  return ms > 0 ? `${(ms / 1000).toFixed(2)} 秒` : '--'
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number)
  return year && month && day ? `${year}年${month}月${day}日` : date
}

function parseLocalDate(date: string): Date | null {
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

export function PracticeHeatmap({ days, onSelectDate }: PracticeHeatmapProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)
  const hoveredDay = days.find((day) => day.date === hoveredDate)
  const startOffset = parseLocalDate(days[0]?.date ?? '')?.getDay() ?? 0
  const weekCount = Math.ceil((startOffset + days.length) / 7)
  const monthLabels = useMemo(() => {
    let previousMonth = -1
    return days.flatMap((day, index) => {
      const date = parseLocalDate(day.date)
      if (!date || date.getMonth() === previousMonth) return []
      previousMonth = date.getMonth()
      return [{ label: `${date.getMonth() + 1}月`, column: Math.floor((startOffset + index) / 7) + 1 }]
    })
  }, [days, startOffset])

  return (
    <section className="practice-heatmap-panel" aria-labelledby="practice-heatmap-title">
      <div className="practice-heatmap-heading">
        <div>
          <p>每日记录</p>
          <h2 id="practice-heatmap-title">最近 365 天练习</h2>
        </div>
        <span>共 {days.reduce((sum, day) => sum + day.totalQuestions, 0)} 题</span>
      </div>
      <div className="practice-heatmap-scroll">
        <div className="practice-heatmap-chart" style={{ '--heatmap-weeks': weekCount } as CSSProperties}>
          <div className="practice-heatmap-months" aria-hidden="true">
            {monthLabels.map((month) => <span key={`${month.column}-${month.label}`} style={{ gridColumn: month.column }}>{month.label}</span>)}
          </div>
          <div className="practice-heatmap-body">
            <div className="practice-heatmap-weekdays" aria-hidden="true"><span>一</span><span>三</span><span>五</span></div>
            <div className="practice-heatmap-grid" aria-label="每日练习热力图">
              {days.map((day, index) => {
                const position = startOffset + index
                return (
                  <button
                    key={day.date}
                    type="button"
                    aria-label={`${day.date}，${day.totalQuestions} 题`}
                    data-level={day.level}
                    style={{ gridColumn: Math.floor(position / 7) + 1, gridRow: (position % 7) + 1 }}
                    onMouseEnter={() => setHoveredDate(day.date)}
                    onMouseLeave={() => setHoveredDate(null)}
                    onFocus={() => setHoveredDate(day.date)}
                    onBlur={() => setHoveredDate(null)}
                    onClick={() => onSelectDate(day.date)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="practice-heatmap-footer">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((level) => <i key={level} data-level={level} />)}
        <span>多</span>
      </div>
      {hoveredDay && (
        <div className="practice-heatmap-tooltip" role="tooltip">
          <strong>{formatDate(hoveredDay.date)}</strong>
          <span>{hoveredDay.totalQuestions} 题</span>
          <span>正确率 {hoveredDay.totalQuestions ? Math.round((hoveredDay.correctQuestions / hoveredDay.totalQuestions) * 100) : 0}%</span>
          <span>平均反应 {formatResponse(hoveredDay.totalQuestions ? hoveredDay.totalResponseMs / hoveredDay.totalQuestions : 0)}</span>
        </div>
      )}
    </section>
  )
}
