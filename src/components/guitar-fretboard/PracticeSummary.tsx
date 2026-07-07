import type { PracticeSummary as PracticeSummaryModel, QuizAnswer } from '@/lib/guitarFretboard/types'

interface PracticeSummaryProps {
  summary: PracticeSummaryModel
  answer: QuizAnswer | null
  sampleStatus: string
  sampleMessage: string
}

export function PracticeSummary({ summary, answer, sampleStatus, sampleMessage }: PracticeSummaryProps) {
  return (
    <aside className="fretboard-side">
      <section className="fretboard-panel">
        <h2>今日练习</h2>
        <dl>
          <div>
            <dt>正确率</dt>
            <dd>{Math.round(summary.accuracy * 100)}%</dd>
          </div>
          <div>
            <dt>平均反应</dt>
            <dd>{summary.averageResponseMs > 0 ? `${(summary.averageResponseMs / 1000).toFixed(2)} 秒` : '--'}</dd>
          </div>
          <div>
            <dt>薄弱区域</dt>
            <dd>{summary.weakNotes.length > 0 ? summary.weakNotes.join(' / ') : '暂无'}</dd>
          </div>
        </dl>
      </section>

      <section className="fretboard-panel">
        <h2>实时反馈</h2>
        <div className="fretboard-feedback">
          <span data-kind="correct">
            <strong>正确</strong>
            {answer?.isCorrect ? answer.selectedPositions.length : 0}
          </span>
          <span data-kind="missed">
            <strong>遗漏</strong>
            {answer?.missedPositions.length ?? 0}
          </span>
          <span data-kind="wrong">
            <strong>错误</strong>
            {answer?.wrongPositions.length ?? 0}
          </span>
        </div>
      </section>

      <section className="fretboard-panel">
        <h2>采样音色</h2>
        <p data-status={sampleStatus}>{sampleMessage}</p>
      </section>
    </aside>
  )
}
