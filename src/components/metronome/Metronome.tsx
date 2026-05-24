import { useState, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMetronome } from '@/hooks/useMetronome'
import {
  createDefaultConfig,
  createMeasure,
  generateMeasureId,
  type MetronomeConfig,
  MIN_BPM,
  MAX_BPM,
  MIN_BEATS,
  MAX_BEATS,
} from '@/types/metronome'
import type { BeatSoundId } from '@/data/beatSounds'
import { BEAT_SOUND_MAP } from '@/data/beatSounds'

export function Metronome() {
  const [config, setConfig] = useState<MetronomeConfig>(createDefaultConfig())

  const { isPlaying, currentBeat, playBeatSound, start, stop, pause, resume } = useMetronome({
    bpm: config.bpm,
    beatsPerMeasure: config.beatsPerMeasure,
    measures: config.measures,
    loop: config.loop,
    onBeat: undefined,
    onComplete: undefined,
  })

  const isPausedRef = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  // BPM change
  const handleBpmChange = (newBpm: number) => {
    const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, newBpm))
    setConfig((prev) => ({ ...prev, bpm: clamped }))
  }

  // Global beat count — syncs all measures
  const handleBeatsChange = (newBeatCount: number) => {
    setConfig((prev) => {
      const measures = prev.measures.map((m) => {
        const beats = [...m.beats]
        if (newBeatCount > beats.length) {
          while (beats.length < newBeatCount) {
            beats.push({ sound: 'click' })
          }
        } else {
          beats.length = newBeatCount
        }
        return { ...m, beats }
      })
      return { ...prev, beatsPerMeasure: newBeatCount, measures }
    })
  }

  // Beat sound change
  const handleBeatChange = (measureIndex: number, beatIndex: number, sound: BeatSoundId) => {
    setConfig((prev) => {
      const measures = prev.measures.map((m, mi) => {
        if (mi !== measureIndex) return m
        return {
          ...m,
          beats: m.beats.map((b, bi) => {
            if (bi !== beatIndex) return b
            return { ...b, sound }
          }),
        }
      })
      return { ...prev, measures }
    })
  }

  const addMeasure = () => {
    setConfig((prev) => ({
      ...prev,
      measures: [...prev.measures, createMeasure(generateMeasureId(), prev.beatsPerMeasure)],
    }))
  }

  const duplicateMeasure = (measureIndex: number) => {
    setConfig((prev) => {
      const measures = [...prev.measures]
      const source = measures[measureIndex]
      if (!source) return prev
      const copy: typeof source = {
        id: generateMeasureId(),
        beats: source.beats.map((b) => ({ ...b })),
      }
      measures.splice(measureIndex + 1, 0, copy)
      return { ...prev, measures }
    })
  }

  const deleteMeasure = (measureIndex: number) => {
    setConfig((prev) => {
      if (prev.measures.length <= 1) return prev
      const measures = prev.measures.filter((_, i) => i !== measureIndex)
      return { ...prev, measures }
    })
  }

  const handlePlayPause = () => {
    if (isPlaying) {
      pause()
      isPausedRef.current = true
    } else if (isPausedRef.current) {
      resume()
      isPausedRef.current = false
    } else {
      start()
    }
  }

  const handleStop = () => {
    stop()
    isPausedRef.current = false
  }

  const BPM_PRESETS = [30, 60, 90, 120, 180]

  return (
    <div className="space-y-5">
      {/* ======= Playback Controls — single row ======= */}
      <div
        className="rounded-xl px-5 py-4 flex flex-wrap items-center gap-4 sm:gap-5"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Play/Pause */}
        <button
          type="button"
          onClick={handlePlayPause}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 min-h-[44px]"
          style={{
            touchAction: 'manipulation',
            background: isPlaying ? 'var(--accent-amber)' : 'var(--bg-card-warm)',
            border: `0.5px solid ${isPlaying ? 'var(--accent-amber)' : 'var(--border-line)'}`,
            boxShadow: isPlaying ? 'var(--shadow-accent-md)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isPlaying) e.currentTarget.style.background = 'var(--accent-glow)'
          }}
          onMouseLeave={(e) => {
            if (!isPlaying) e.currentTarget.style.background = 'var(--bg-card-warm)'
          }}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l9-5.5-9-5.5z" />
            </svg>
          )}
        </button>

        {/* Stop */}
        <button
          type="button"
          onClick={handleStop}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 min-h-[44px]"
          style={{
            touchAction: 'manipulation',
            color: 'var(--text-muted)',
            border: '0.5px solid var(--border-line)',
            background: 'transparent',
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
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
            <rect x="1" y="1" width="10" height="10" rx="1.5" />
          </svg>
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 flex-shrink-0" style={{ background: 'var(--border-line)' }} />

        {/* BPM — flat single row */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleBpmChange(config.bpm - 5)}
            className="w-8 h-8 rounded flex items-center justify-center text-sm transition-all cursor-pointer min-h-[44px]"
            style={{ touchAction: 'manipulation', color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            −
          </button>
          <input
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={config.bpm}
            onChange={(e) => handleBpmChange(Number(e.target.value))}
            className="w-14 h-8 text-center font-mono text-base font-medium rounded appearance-none cursor-pointer"
            style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)' }}
          />
          <button
            type="button"
            onClick={() => handleBpmChange(config.bpm + 5)}
            className="w-8 h-8 rounded flex items-center justify-center text-sm transition-all cursor-pointer min-h-[44px]"
            style={{ touchAction: 'manipulation', color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            +
          </button>
        </div>

        {/* BPM presets — flat row */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {BPM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleBpmChange(preset)}
              className="px-2 py-1 text-xs rounded transition-all cursor-pointer min-h-[44px]"
              style={{
                touchAction: 'manipulation',
                color: config.bpm === preset ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `0.5px solid ${config.bpm === preset ? 'var(--accent-amber)' : 'var(--border-line)'}`,
                background: config.bpm === preset ? 'var(--accent-glow)' : 'transparent',
              }}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* BPM slider */}
        <div className="relative h-1 rounded-full flex-shrink-0" style={{ background: 'var(--border-line)', minWidth: '80px' }}>
          <input
            type="range"
            min={MIN_BPM}
            max={MAX_BPM}
            value={config.bpm}
            onChange={(e) => handleBpmChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full appearance-none cursor-pointer opacity-0"
          />
          <div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{
              width: `${((config.bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%`,
              background: 'var(--accent-amber)',
            }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              left: `${((config.bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%`,
              transform: 'translate(-50%, -50%)',
              background: 'var(--accent-amber)',
              boxShadow: 'var(--shadow-accent-sm)',
            }}
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 flex-shrink-0" style={{ background: 'var(--border-line)' }} />

        {/* Loop toggle */}
        <button
          type="button"
          onClick={() => setConfig((prev) => ({ ...prev, loop: !prev.loop }))}
          className="px-3 py-1.5 text-sm rounded transition-all cursor-pointer min-h-[44px]"
          style={{
            touchAction: 'manipulation',
            color: config.loop ? 'var(--text-primary)' : 'var(--text-muted)',
            border: `0.5px solid ${config.loop ? 'var(--accent-amber)' : 'var(--border-line)'}`,
            background: config.loop ? 'var(--accent-glow)' : 'transparent',
          }}
        >
          {config.loop ? '循环' : '单次'}
        </button>

        {/* Beat count ± */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[0.6rem] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            节拍
          </span>
          <button
            type="button"
            onClick={() => handleBeatsChange(Math.max(MIN_BEATS, config.beatsPerMeasure - 1))}
            disabled={config.beatsPerMeasure <= MIN_BEATS}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
            onMouseEnter={(e) => { if (config.beatsPerMeasure > MIN_BEATS) { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            −
          </button>
          <span className="w-6 text-center font-mono text-base font-medium select-none" style={{ color: 'var(--text-primary)' }}>
            {config.beatsPerMeasure}
          </span>
          <button
            type="button"
            onClick={() => handleBeatsChange(Math.min(MAX_BEATS, config.beatsPerMeasure + 1))}
            disabled={config.beatsPerMeasure >= MAX_BEATS}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
            onMouseEnter={(e) => { if (config.beatsPerMeasure < MAX_BEATS) { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            +
          </button>
        </div>
      </div>

      {/* ======= Beat Grid — one compact panel ======= */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Column header row — beat numbers 1-8 */}
        <div className="flex items-center mb-2 gap-2">
          <div className="w-5 flex-shrink-0" />
          <div className="flex gap-2">
            {Array.from({ length: MAX_BEATS }, (_, i) => (
              <div
                key={i}
                className="w-8 h-5 flex items-center justify-center flex-shrink-0"
              >
                <span
                  className="text-[0.55rem] font-mono"
                  style={{ color: 'var(--text-muted)', opacity: i < config.beatsPerMeasure ? 1 : 0.3 }}
                >
                  {i + 1}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Measure rows */}
        <div className="space-y-1">
          {config.measures.map((measure, mi) => {
            const isCurrentMeasure = currentBeat?.measure === mi
            return (
              <motion.div
                key={measure.id}
                className="flex items-center gap-2"
                initial={prefersReducedMotion ? undefined : { opacity: 0 }}
                animate={prefersReducedMotion ? undefined : { opacity: 1 }}
                transition={prefersReducedMotion ? undefined : { duration: 0.15 }}
              >
                {/* Row playing indicator dot */}
                <div className="w-5 flex-shrink-0 flex items-center justify-center">
                  {isCurrentMeasure && (
                    prefersReducedMotion ? (
                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--accent-amber)' }} />
                    ) : (
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: 'var(--accent-amber)' }}
                        animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                      />
                    )
                  )}
                </div>

                {/* Beat dots for this measure */}
                <div className="flex gap-2">
                  {Array.from({ length: MAX_BEATS }, (_, beatIdx) => {
                    const beat = measure.beats[beatIdx]
                    if (!beat) {
                      return (
                        <div key={beatIdx} className="w-8 h-8 flex-shrink-0" />
                      )
                    }
                    const isActive = isCurrentMeasure && currentBeat?.beat === beatIdx
                    const beatConfig = BEAT_SOUND_MAP[beat.sound]
                    return (
                      <BeatButton
                        key={beatIdx}
                        sound={beat.sound}
                        isActive={isActive}
                        color={beatConfig.color}
                        onSoundChange={(s) => handleBeatChange(mi, beatIdx, s)}
                        playBeat={playBeatSound}
                      />
                    )
                  })}
                </div>

                {/* Inline copy / delete buttons */}
                <div className="flex items-center gap-1 ml-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => duplicateMeasure(mi)}
                    className="px-1.5 py-0.5 text-[0.55rem] rounded transition-all cursor-pointer"
                    style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    复制
                  </button>
                  {config.measures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteMeasure(mi)}
                      className="px-1.5 py-0.5 text-[0.55rem] rounded transition-all cursor-pointer"
                      style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger-red)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      删除
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Add measure row */}
        <button
          type="button"
          onClick={addMeasure}
          className="mt-2 w-full py-1.5 text-xs rounded transition-all cursor-pointer"
          style={{
            color: 'var(--text-muted)',
            border: '0.5px solid var(--border-line)',
            background: 'transparent',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          + 添加小节
        </button>
      </div>
    </div>
  )
}

// Inline beat button — no separate component file needed
function BeatButton({
  sound,
  isActive,
  color,
  onSoundChange,
  playBeat,
}: {
  sound: BeatSoundId
  isActive: boolean
  color: string
  onSoundChange: (s: BeatSoundId) => void
  playBeat?: (s: BeatSoundId) => void
}) {
  const [showSelector, setShowSelector] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const openSelector = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (buttonRef.current) {
      setAnchorRect(buttonRef.current.getBoundingClientRect())
    }
    setShowSelector(true)
  }

  return (
    <div className="relative flex-shrink-0">
      <motion.button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          openSelector(e)
        }}
        whileTap={{ scale: 0.95 }}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer"
        style={{
          background: isActive ? color : 'var(--bg-card)',
          border: `0.5px solid ${isActive ? color : 'var(--border-line)'}`,
          boxShadow: isActive ? `0 0 8px ${color}50` : 'none',
          touchAction: 'manipulation',
        }}
        animate={isActive && !prefersReducedMotion ? { scale: [1, 1.12, 1], transition: { duration: 0.12 } } : { scale: 1 }}
      >
        <span
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: isActive ? 'rgba(255,255,255,0.8)' : color }}
        />
      </motion.button>

      <AnimatePresence>
        {showSelector && anchorRect && (
          <BeatSoundPopup
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

// Inline sound selector popup
import { useLayoutEffect, useEffect as ReactUseEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BEAT_SOUNDS } from '@/data/beatSounds'

function BeatSoundPopup({
  currentSound,
  anchorRect,
  onSelect,
  onClose,
}: {
  currentSound: BeatSoundId
  anchorRect: DOMRect
  onSelect: (s: BeatSoundId) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!ref.current) return
    const popup = ref.current.getBoundingClientRect()
    const pw = popup.width
    const ph = popup.height

    let top = anchorRect.bottom + 6
    let left = anchorRect.left + anchorRect.width / 2

    const rightEdge = left + pw / 2
    if (rightEdge > window.innerWidth) left = window.innerWidth - pw - 8
    const leftEdge = left - pw / 2
    if (leftEdge < 0) left = pw / 2 + 8
    if (top + ph > window.innerHeight) top = anchorRect.top - ph - 6

    setPos({ top, left })
  }, [anchorRect])

  ReactUseEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.9, y: -2 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -2 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 min-w-[130px] rounded-md py-1.5 backdrop-blur-sm shadow-lg"
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
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.color }} />
          <span>{s.label}</span>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{s.labelEn}</span>
        </button>
      ))}
    </motion.div>
  )
}