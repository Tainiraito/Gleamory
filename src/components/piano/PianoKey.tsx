import type { PianoNote } from '@/data/pianoNotes'

interface PianoKeyProps {
  note: PianoNote
  isPressed: boolean
  onMouseDown: (midi: number) => void
  onMouseUp: (midi: number) => void
  keyHint?: string
  showKeyHints?: boolean
}

const PianoKey: React.FC<PianoKeyProps> = ({ note, isPressed, onMouseDown, onMouseUp, keyHint, showKeyHints }) => {
  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault()
    onMouseDown(note.midiNumber)
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault()
    onMouseUp(note.midiNumber)
  }

  const handlePointerLeave = () => {
    onMouseUp(note.midiNumber)
  }

  if (note.isBlack) {
    return (
      <button
        type="button"
        aria-label={`${note.note}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        style={{
          position: 'absolute',
          zIndex: 10,
          width: 30,
          height: 180,
          left: 0,
          borderRadius: '0 0 4px 4px',
          border: '1px solid rgba(0,0,0,0.15)',
          cursor: 'pointer',
          transition: 'background-color 0.1s ease, transform 0.05s ease',
          background: isPressed ? '#5a5550' : '#3a3530',
          transform: isPressed ? 'translateY(1px)' : 'translateY(0)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          paddingBottom: 4,
        }}
      >
        {showKeyHints && keyHint && (
          <span style={{ fontSize: 10, color: '#d4d0c8', userSelect: 'none', pointerEvents: 'none' }}>
            {keyHint}
          </span>
        )}
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={`${note.note}`}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      style={{
        width: 48,
        height: 288,
        borderRadius: '0 0 6px 6px',
        border: '1px solid rgba(44, 42, 48, 0.12)',
        borderTop: 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: 8,
        transition: 'background-color 0.1s ease, transform 0.05s ease',
        background: isPressed ? '#ede4d8' : '#faf6f0',
        transform: isPressed ? 'translateY(1px)' : 'translateY(0)',
        flexShrink: 0,
      }}
    >
      {showKeyHints && keyHint && (
        <span
          style={{
            fontSize: 10,
            color: '#8a8590',
            userSelect: 'none',
            pointerEvents: 'none',
            lineHeight: 1.4,
          }}
        >
          {keyHint}
        </span>
      )}
      <span
        style={{
          fontSize: showKeyHints ? 9 : 11,
          color: '#8a8590',
          userSelect: 'none',
          pointerEvents: 'none',
          lineHeight: 1.4,
        }}
      >
        {note.note}
      </span>
    </button>
  )
}

export default PianoKey
