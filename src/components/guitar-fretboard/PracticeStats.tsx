import type { PracticeSummary } from '@/lib/guitarFretboard/types'

interface PracticeStatsProps {
  summary: PracticeSummary
  onOpen: () => void
}

function formatResponseTime(ms: number): string {
  return ms > 0 ? `${(ms / 1000).toFixed(2)} 秒` : '--'
}

export function PracticeStats({ summary, onOpen }: PracticeStatsProps) {
  const metrics = [
    `已完成 ${summary.totalQuestions} 题`,
    `正确率 ${Math.round(summary.accuracy * 100)}%`,
    `平均反应 ${formatResponseTime(summary.averageResponseMs)}`,
  ]

  return (
    <div className="practice-stats" role="group" aria-label="今日练习统计">
      {metrics.map((metric) => (
        <button key={metric} type="button" onClick={onOpen}>{metric}</button>
      ))}
    </div>
  )
}
