import { ALL_NOTES, getKeyForMidi } from '@/data/pianoNotes'
import PianoKey from './PianoKey'

interface PianoProps {
  onNoteOn: (midi: number) => void
  onNoteOff: (midi: number) => void
  pressedKeys: Set<number>
  octaveOffset?: number
  showKeyHints?: boolean
  presetId?: string
}

const WHITE_KEY_WIDTH = 48
const BLACK_KEY_WIDTH = 30
const BLACK_KEY_HEIGHT = 180

const Piano: React.FC<PianoProps> = ({ onNoteOn, onNoteOff, pressedKeys, octaveOffset = 0, showKeyHints = false, presetId }) => {
  const whiteNotes = ALL_NOTES.filter((n) => !n.isBlack)
  const blackNotes = ALL_NOTES.filter((n) => n.isBlack)

  const totalWidth = whiteNotes.length * WHITE_KEY_WIDTH

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'hidden',
        padding: '16px 0',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: totalWidth,
          margin: '0 auto',
          minWidth: totalWidth,
        }}
      >
        {/* White keys */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
          }}
        >
          {whiteNotes.map((note) => (
            <PianoKey
              key={note.midiNumber}
              note={note}
              isPressed={pressedKeys.has(note.midiNumber)}
              onMouseDown={onNoteOn}
              onMouseUp={onNoteOff}
              keyHint={getKeyForMidi(note.midiNumber, octaveOffset, presetId) ?? undefined}
              showKeyHints={showKeyHints}
            />
          ))}
        </div>

        {/* Black keys */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 0,
          }}
        >
          {blackNotes.map((note) => {
            const whiteCountBefore = whiteNotes.filter(
              (wn) => wn.midiNumber < note.midiNumber,
            ).length
            const left = whiteCountBefore * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2

            return (
              <div
                key={note.midiNumber}
                style={{
                  position: 'absolute',
                  left,
                  top: 0,
                  width: BLACK_KEY_WIDTH,
                  height: BLACK_KEY_HEIGHT,
                }}
              >
                <PianoKey
                  note={note}
                  isPressed={pressedKeys.has(note.midiNumber)}
                  onMouseDown={onNoteOn}
                  onMouseUp={onNoteOff}
                  keyHint={getKeyForMidi(note.midiNumber, octaveOffset, presetId) ?? undefined}
                  showKeyHints={showKeyHints}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Piano
