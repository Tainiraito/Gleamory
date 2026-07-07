import type { FretPosition, QuizAnswer } from '@/lib/guitarFretboard/types'
import { getPositionKey } from '@/lib/guitarFretboard/fretboard'

interface FretboardProps {
  strings: number[]
  frets: number[]
  positions: FretPosition[]
  selectedKeys: Set<string>
  answer?: QuizAnswer | null
  mode: 'all' | 'natural' | 'target' | 'scale' | 'degree' | 'hidden'
  targetNote?: string
  onTogglePosition: (position: FretPosition) => void
}

const MARKER_FRETS = new Set([3, 5, 7, 9, 12, 15, 17, 19, 21, 24])

function stateForPosition(position: FretPosition, selectedKeys: Set<string>, answer?: QuizAnswer | null): 'selected' | 'correct' | 'wrong' | 'missed' | 'idle' {
  const key = getPositionKey(position)
  if (answer?.wrongPositions.some((candidate) => getPositionKey(candidate) === key)) return 'wrong'
  if (answer?.missedPositions.some((candidate) => getPositionKey(candidate) === key)) return 'missed'
  if (answer?.selectedPositions.some((candidate) => getPositionKey(candidate) === key) && answer.isCorrect) return 'correct'
  if (selectedKeys.has(key)) return 'selected'
  return 'idle'
}

export function Fretboard({ strings, frets, positions, selectedKeys, answer, mode, targetNote, onTogglePosition }: FretboardProps) {
  const displayStrings = [...strings].sort((a, b) => a - b)

  return (
    <div className="fretboard-frame" aria-label="吉他指板">
      <div className="fretboard-scroll">
        <div className="fretboard-grid" style={{ gridTemplateColumns: `2.5rem repeat(${frets.length}, minmax(2.4rem, 1fr))` }}>
          <div />
          {frets.map((fret) => (
            <div key={fret} className="fretboard-fret-label">
              {MARKER_FRETS.has(fret) || fret === 0 ? fret : ''}
            </div>
          ))}

          {displayStrings.map((stringNumber) => (
            <div key={stringNumber} className="contents">
              <div className="fretboard-string-label">{positions.find((position) => position.stringNumber === stringNumber && position.fretNumber === 0)?.noteName}</div>
              {frets.map((fretNumber) => {
                const position = positions.find((candidate) => candidate.stringNumber === stringNumber && candidate.fretNumber === fretNumber)
                if (!position) return <div key={`${stringNumber}:${fretNumber}`} />

                const positionState = stateForPosition(position, selectedKeys, answer)
                const isNatural = !position.noteName.includes('#')
                const isTarget = targetNote ? position.noteName === targetNote : false
                const showNote = mode === 'all' || (mode === 'natural' && isNatural) || (mode === 'target' && isTarget)

                return (
                  <button
                    key={getPositionKey(position)}
                    type="button"
                    className="fretboard-position"
                    data-state={positionState}
                    data-muted={mode === 'target' && !isTarget ? 'true' : undefined}
                    onClick={() => onTogglePosition(position)}
                    aria-label={`${position.stringNumber}弦 ${position.fretNumber}品 ${position.noteWithOctave}`}
                  >
                    <span className="fretboard-string-line" />
                    <span className="fretboard-dot">{showNote || positionState !== 'idle' ? position.displayNoteName : ''}</span>
                    {MARKER_FRETS.has(fretNumber) && <span className="fretboard-marker" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
