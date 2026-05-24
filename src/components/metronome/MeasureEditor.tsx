import { motion, useReducedMotion } from 'framer-motion'
import type { Measure } from '@/types/metronome'
import type { BeatSoundId } from '@/data/beatSounds'
import { BeatDot } from './BeatDot'

interface MeasureEditorProps {
  measure: Measure
  measureIndex: number
  isCurrentMeasure: boolean
  currentBeatInMeasure: number | null
  onBeatChange: (measureIndex: number, beatIndex: number, sound: BeatSoundId) => void
  onDuplicate: (measureIndex: number) => void
  onDelete: (measureIndex: number) => void
  canDelete: boolean
  playBeatSound?: (sound: BeatSoundId) => void
}

export function MeasureEditor({
  measure,
  measureIndex,
  isCurrentMeasure,
  currentBeatInMeasure,
  onBeatChange,
  onDuplicate,
  onDelete,
  canDelete,
  playBeatSound,
}: MeasureEditorProps) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <div
      className="rounded-xl px-4 py-5"
      style={{
        background: isCurrentMeasure ? 'var(--bg-card-warm)' : 'var(--bg-card)',
        border: `0.5px solid ${isCurrentMeasure ? 'var(--accent-amber)' : 'var(--border-line)'}`,
        transition: 'border-color 0.2s, background 0.2s',
      }}
    >
      {/* Measure header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="text-[0.6rem] uppercase tracking-widest font-medium"
            style={{ color: 'var(--text-muted)' }}
          >
            小节 {measureIndex + 1}
          </span>
          {isCurrentMeasure && (
            prefersReducedMotion ? (
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-amber)' }} />
            ) : (
              <motion.span
                layoutId={`playing-indicator-${measureIndex}`}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: 'var(--accent-amber)' }}
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ repeat: Infinity, duration: 0.8 }}
              />
            )
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Duplicate */}
          <button
            type="button"
            onClick={() => onDuplicate(measureIndex)}
            className="text-[0.6rem] px-1.5 py-0.5 rounded transition-all cursor-pointer"
            style={{
              color: 'var(--text-muted)',
              border: '0.5px solid var(--border-line)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-glow)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            复制
          </button>

          {/* Delete */}
          {canDelete && (
            <button
              type="button"
              onClick={() => onDelete(measureIndex)}
              className="text-[0.6rem] px-1.5 py-0.5 rounded transition-all cursor-pointer"
              style={{
                color: 'var(--text-muted)',
                border: '0.5px solid var(--border-line)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--danger-bg)'
                e.currentTarget.style.color = 'var(--danger-red)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              删除
            </button>
          )}
        </div>
      </div>

      {/* Beat dots — horizontal scroll if overflow, using CSS grid for matrix alignment */}
      <div className="overflow-x-auto pb-2">
        <div
          className="grid grid-flow-col auto-cols-[minmax(44px,auto)] gap-2 min-w-max items-center"
        >
          {measure.beats.map((beat, beatIdx) => (
            <BeatDot
              key={beatIdx}
              sound={beat.sound}
              isActive={isCurrentMeasure && currentBeatInMeasure === beatIdx}
              onSoundChange={(s) => onBeatChange(measureIndex, beatIdx, s)}
              playBeat={playBeatSound}
            />
          ))}
        </div>
      </div>
    </div>
  )
}