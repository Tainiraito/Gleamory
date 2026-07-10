import type { PitchClass, QuizAnswer, QuizQuestion } from '@/lib/guitarFretboard/types'

interface QuizPanelProps {
  question: QuizQuestion
  selectedCount: number
  selectedOption?: PitchClass
  answer: QuizAnswer | null
  onSelectOption: (option: PitchClass) => void
  onSubmit: () => void
  onReset: () => void
  onNext: () => void
  onSkip: () => void
}

export function QuizPanel({
  question,
  selectedCount,
  selectedOption,
  answer,
  onSelectOption,
  onSubmit,
  onReset,
  onNext,
  onSkip,
}: QuizPanelProps) {
  const rangeLabel = `可选范围 ${question.scope.minFret}-${question.scope.maxFret} 品`
  const isIdentifyQuestion = question.type === 'identify-note'
  const correctOption = question.expectedAnswers[0]?.noteName

  return (
    <div className="fretboard-quizbar">
      <div>
        <p>当前题目</p>
        <h2>{question.prompt}</h2>
        <small>{rangeLabel}</small>
        {answer && (
          <div className="fretboard-answer-guidance">
            <strong>{answer.isCorrect ? '本题通过' : '本题未通过'}</strong>
            {isIdentifyQuestion ? (
              <span>你的答案 {answer.selectedOption ?? '未选择'}，正确答案 {correctOption}。</span>
            ) : (
              <span>
                遗漏 {answer.missedPositions.length} 个，误选 {answer.wrongPositions.length} 个。
              </span>
            )}
          </div>
        )}
      </div>
      {isIdentifyQuestion && (
        <div className="fretboard-answer-options" role="group" aria-label="音名答案">
          {question.options?.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={selectedOption === option}
              disabled={Boolean(answer)}
              onClick={() => onSelectOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}
      <div className="fretboard-quiz-actions">
        <span>{isIdentifyQuestion ? `已选择 ${selectedOption ?? '--'}` : `已选 ${selectedCount}`}</span>
        <button type="button" className="fretboard-button secondary" onClick={onReset}>
          重置
        </button>
        {!answer && (
          <button type="button" className="fretboard-button secondary" onClick={onSkip}>
            跳过此题
          </button>
        )}
        {answer ? (
          <button type="button" className="fretboard-button primary" onClick={onNext}>
            下一题
          </button>
        ) : (
          <button type="button" className="fretboard-button primary" onClick={onSubmit}>
            提交答案
          </button>
        )}
      </div>
    </div>
  )
}
