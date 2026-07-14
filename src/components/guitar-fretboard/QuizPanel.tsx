import type { PitchClass, QuizAnswer, QuizQuestion } from '@/lib/guitarFretboard/types'
import { GlossaryText } from '@/components/ui/GlossaryTerm'
import { calculateQuestionAccuracy } from '@/lib/guitarFretboard/quiz'

interface QuizPanelProps {
  question: QuizQuestion | null
  selectedCount: number
  selectedOption?: PitchClass
  answer: QuizAnswer | null
  onGenerate: () => void
  onSelectOption: (option: PitchClass) => void
  onSubmit: () => void
  onReset: () => void
  onNext: () => void
  onSkip: () => void
}

function formatElapsedTime(elapsedMs: number): string {
  return `${(elapsedMs / 1000).toFixed(1)} 秒`
}

function QuestionMetrics({
  question,
  answer,
}: Pick<QuizPanelProps, 'question' | 'answer'>) {
  const accuracy = question && answer ? Math.round(calculateQuestionAccuracy(question, answer) * 100) : null
  const elapsed = answer ? formatElapsedTime(answer.responseMs) : '--'

  return (
    <div className="fretboard-question-metrics" aria-label="当前题统计">
      <span>用时 {elapsed}</span>
      <span>准确率 {accuracy === null ? '--' : `${accuracy}%`}</span>
    </div>
  )
}

export function QuizPanel({
  question,
  selectedCount,
  selectedOption,
  answer,
  onGenerate,
  onSelectOption,
  onSubmit,
  onReset,
  onNext,
  onSkip,
}: QuizPanelProps) {
  if (!question) {
    return (
      <div className="fretboard-quizbar fretboard-quiz-empty">
        <div>
          <p>当前题目</p>
          <h2>尚未生成题目</h2>
          <small>先在下方选择范围和题型，再生成题目。</small>
          <QuestionMetrics question={null} answer={null} />
        </div>
        <button type="button" className="fretboard-button primary" onClick={onGenerate}>
          生成题目
        </button>
      </div>
    )
  }

  const rangeLabel = `可选范围 ${question.scope.minFret}-${question.scope.maxFret} 品`
  const isIdentifyQuestion = question.type === 'identify-note'
  const correctOption = question.expectedAnswers[0]?.noteName

  return (
    <div className="fretboard-quizbar">
      <div>
        <p>当前题目</p>
        <h2 aria-label={question.prompt}><GlossaryText text={question.prompt} /></h2>
        <small>{rangeLabel}</small>
        <QuestionMetrics question={question} answer={answer} />
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
        {!answer && (
          <>
            <button type="button" className="fretboard-button secondary" onClick={onReset}>
              重置
            </button>
            <button type="button" className="fretboard-button secondary" onClick={onSkip}>
              跳过此题
            </button>
          </>
        )}
        {answer ? (
          <button type="button" className="fretboard-button primary" onClick={onNext}>
            下一题
          </button>
        ) : !isIdentifyQuestion ? (
          <button type="button" className="fretboard-button primary" onClick={onSubmit}>
            提交答案
          </button>
        ) : null}
      </div>
    </div>
  )
}
