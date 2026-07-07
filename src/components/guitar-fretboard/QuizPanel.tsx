import type { QuizQuestion } from '@/lib/guitarFretboard/types'

interface QuizPanelProps {
  question: QuizQuestion
  selectedCount: number
  onSubmit: () => void
  onReset: () => void
}

export function QuizPanel({ question, selectedCount, onSubmit, onReset }: QuizPanelProps) {
  return (
    <div className="fretboard-quizbar">
      <div>
        <p>当前题目</p>
        <h2>{question.prompt}</h2>
      </div>
      <div className="fretboard-quiz-actions">
        <span>已选 {selectedCount}</span>
        <button type="button" className="fretboard-button secondary" onClick={onReset}>
          重置
        </button>
        <button type="button" className="fretboard-button primary" onClick={onSubmit}>
          提交答案
        </button>
      </div>
    </div>
  )
}
