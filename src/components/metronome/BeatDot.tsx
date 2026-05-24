import { useState, useEffect, useRef, useLayoutEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import type { BeatSoundId } from '@/data/beatSounds'
import { BEAT_SOUNDS, BEAT_SOUND_MAP } from '@/data/beatSounds'

interface BeatDotProps {
  sound: BeatSoundId
  isActive: boolean
  onSoundChange: (sound: BeatSoundId) => void
  playBeat?: (sound: BeatSoundId) => void
}

// Sound selector popup — uses fixed positioning anchored to the beat button,
// with boundary detection to prevent overflow off-screen.
function SoundSelector({
  currentSound,
  onSelect,
  onClose,
  anchorRect,
}: {
  currentSound: BeatSoundId
  onSelect: (sound: BeatSoundId) => void
  onClose: () => void
  anchorRect: DOMRect
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  // Measure popup dimensions and compute boundary-safe position
  useLayoutEffect(() => {
    if (!ref.current) return
    const popup = ref.current.getBoundingClientRect()
    const pw = popup.width
    const ph = popup.height

    // Default: below button, horizontally centered
    let top = anchorRect.bottom + 8
    let left = anchorRect.left + anchorRect.width / 2

    // Horizontal boundary: prevent right-edge overflow
    const rightEdge = left + pw / 2
    if (rightEdge > window.innerWidth) {
      left = window.innerWidth - pw - 8
    }
    // Horizontal boundary: prevent left-edge overflow
    const leftEdge = left - pw / 2
    if (leftEdge < 0) {
      left = pw / 2 + 8
    }

    // Vertical boundary: if popup would overflow bottom, flip upward
    if (top + ph > window.innerHeight) {
      top = anchorRect.top - ph - 8
    }

    setPos({ top, left })
  }, [anchorRect])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -4 }}
      transition={{ duration: 0.12 }}
      // Fixed positioning + translateX(-50%) anchors to the beat button center
      className="fixed z-50 min-w-[140px] rounded-md py-1.5 backdrop-blur-sm shadow-lg"
      style={{
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-line)',
        boxShadow: 'var(--shadow-popup)',
      }}
    >
      {BEAT_SOUNDS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s.id)}
          className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-all cursor-pointer"
          style={{
            background: currentSound === s.id ? 'var(--accent-glow)' : 'transparent',
            color: currentSound === s.id ? 'var(--text-primary)' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (currentSound !== s.id) {
              e.currentTarget.style.background = 'var(--accent-glow)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (currentSound !== s.id) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }
          }}
        >
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ background: s.color }}
          />
          <span>{s.label}</span>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
            {s.labelEn}
          </span>
        </button>
      ))}
    </motion.div>
  )
}

export function BeatDot({ sound, isActive, onSoundChange, playBeat }: BeatDotProps) {
  const [showSelector, setShowSelector] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const config = BEAT_SOUND_MAP[sound]
  const prefersReducedMotion = useReducedMotion()

  const openSelector = () => {
    if (buttonRef.current) {
      setAnchorRect(buttonRef.current.getBoundingClientRect())
    }
    setShowSelector(true)
  }

  return (
    <div className="relative">
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={openSelector}
        whileTap={{ scale: 0.95 }}
        className="w-11 h-11 rounded-full flex items-center justify-center transition-shadow cursor-pointer"
        style={{
          background: isActive ? config.color : 'var(--bg-card)',
          border: `0.5px solid ${isActive ? config.color : 'var(--border-line)'}`,
          boxShadow: isActive
            ? `0 0 12px ${config.color}60, 0 0 4px ${config.color}40`
            : 'none',
        }}
        animate={isActive && !prefersReducedMotion ? {
          scale: [1, 1.15, 1],
          transition: { duration: 0.15, ease: 'easeOut' },
        } : { scale: 1 }}
      >
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: isActive ? 'var(--white-alpha-80)' : config.color }}
        />
      </motion.button>

      <AnimatePresence>
        {showSelector && anchorRect && (
          <SoundSelector
            currentSound={sound}
            anchorRect={anchorRect}
            onSelect={(s) => {
              playBeat?.(s)
              onSoundChange(s)
              setShowSelector(false)
            }}
            onClose={() => setShowSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}