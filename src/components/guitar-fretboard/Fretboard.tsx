import type { FretPosition, FretRange, FretboardMode, QuizAnswer } from '@/lib/guitarFretboard/types'
import { getPositionKey } from '@/lib/guitarFretboard/fretboard'

interface FretboardProps {
  strings: number[]
  frets: number[]
  positions: FretPosition[]
  selectedKeys: Set<string>
  revealedKeys?: Set<string>
  fadingKeys?: Set<string>
  suppressedKeys?: Set<string>
  highlightedKeys?: Set<string>
  rootKeys?: Set<string>
  referenceKeys?: Set<string>
  answer?: QuizAnswer | null
  mode: FretboardMode
  targetNote?: string
  displayRange?: FretRange
  disableOutsideRange?: boolean
  selectionDisabled?: boolean
  onActivatePosition: (position: FretPosition) => void
  onClearPosition: (position: FretPosition) => void
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

export function Fretboard({
  strings,
  frets,
  positions,
  selectedKeys,
  revealedKeys,
  fadingKeys,
  suppressedKeys,
  highlightedKeys,
  rootKeys,
  referenceKeys,
  answer,
  mode,
  targetNote,
  displayRange,
  disableOutsideRange = false,
  selectionDisabled = false,
  onActivatePosition,
  onClearPosition,
}: FretboardProps) {
  const displayStrings = [...strings].sort((a, b) => a - b)
  const firstString = displayStrings[0]
  const lastString = displayStrings[displayStrings.length - 1]
  const positionsByKey = new Map(positions.map((position) => [getPositionKey(position), position]))

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
                const position = positionsByKey.get(`${stringNumber}:${fretNumber}`)
                if (!position) return <div key={`${stringNumber}:${fretNumber}`} />

                const key = getPositionKey(position)
                const positionState = stateForPosition(position, selectedKeys, answer)
                const isNatural = !position.noteName.includes('#')
                const isTarget = targetNote ? position.noteName === targetNote : false
                const isInRange = displayRange ? fretNumber >= displayRange.minFret && fretNumber <= displayRange.maxFret : true
                const isDisabled = selectionDisabled || (disableOutsideRange && !isInRange)
                const isHighlighted = highlightedKeys?.has(key) ?? false
                const isRoot = rootKeys?.has(key) ?? false
                const isReference = referenceKeys?.has(key) ?? false
                const isSuppressed = suppressedKeys?.has(key) ?? false
                const answerRevealsNote = Boolean(answer && positionState !== 'idle')
                const showNote =
                  !isSuppressed &&
                  (mode === 'all' ||
                    (mode === 'natural' && isNatural) ||
                    (mode === 'target' && isTarget) ||
                    (revealedKeys?.has(key) ?? false) ||
                    isHighlighted ||
                    answerRevealsNote)

                return (
                  <button
                    key={key}
                    type="button"
                    className="fretboard-position"
                    disabled={isDisabled}
                    data-state={positionState}
                    data-muted={mode === 'target' && !isTarget ? 'true' : undefined}
                    data-in-scope={displayRange ? String(isInRange) : undefined}
                    data-scope-top={displayRange && isInRange && stringNumber === firstString ? 'true' : undefined}
                    data-scope-bottom={displayRange && isInRange && stringNumber === lastString ? 'true' : undefined}
                    data-scope-left={displayRange && isInRange && fretNumber === displayRange.minFret ? 'true' : undefined}
                    data-scope-right={displayRange && isInRange && fretNumber === displayRange.maxFret ? 'true' : undefined}
                    data-highlight={isHighlighted ? 'true' : undefined}
                    data-root={isRoot ? 'true' : undefined}
                    data-reference={isReference ? 'true' : undefined}
                    data-fading={fadingKeys?.has(key) ? 'true' : undefined}
                    data-suppressed={isSuppressed ? 'true' : undefined}
                    onClick={() => {
                      if (!isDisabled) onActivatePosition(position)
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      onClearPosition(position)
                    }}
                    aria-label={`${position.stringNumber}弦 ${position.fretNumber}品 ${position.noteWithOctave}`}
                  >
                    <span className="fretboard-string-line" />
                    <span className="fretboard-dot">{showNote ? position.displayNoteName : ''}</span>
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
