import { useState, useRef, useEffect } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useMetronome } from '@/hooks/useMetronome'
import {
  createDefaultConfig,
  generateMeasureId,
  type MetronomeConfig,
  MIN_BPM,
  MAX_BPM,
  MIN_BEATS,
  MAX_BEATS,
} from '@/types/metronome'
import type { BeatSoundId } from '@/data/beatSounds'
import { BEAT_SOUND_MAP, BEAT_SOUNDS, MEASURE_SOUND_PRESETS, type MeasureSoundPreset } from '@/data/beatSounds'

// ---------- Metronome component ----------
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

  // Space bar: play / pause
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.code === 'Space') {
        e.preventDefault()
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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isPlaying, pause, resume, start])

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
            beats.push({ sound: 'wood' })
          }
        } else {
          beats.length = newBeatCount
        }
        return { ...m, beats }
      })
      return { ...prev, beatsPerMeasure: newBeatCount, measures }
    })
  }

  // Beat sound change — cycle through sounds on click, long-press opens panel
  const handleBeatClick = (measureIndex: number, beatIndex: number) => {
    const currentSound = config.measures[measureIndex]?.beats[beatIndex]?.sound
    const currentIdx = BEAT_SOUNDS.findIndex((s) => s.id === currentSound)
    const nextIdx = (currentIdx + 1) % BEAT_SOUNDS.length
    const nextSound = BEAT_SOUNDS[nextIdx].id
    playBeatSound(nextSound)
    setConfig((prev) => {
      const measures = prev.measures.map((m, mi) => {
        if (mi !== measureIndex) return m
        return {
          ...m,
          beats: m.beats.map((b, bi) => {
            if (bi !== beatIndex) return b
            return { ...b, sound: nextSound }
          }),
        }
      })
      return { ...prev, measures }
    })
  }

  // Long-press timer for beat button
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleBeatMouseDown = (measureIndex: number, beatIndex: number) => {
    longPressTimerRef.current = setTimeout(() => {
      // Long press — open selector instead
      const btn = document.querySelector(`[data-beat="${measureIndex}-${beatIndex}"]`) as HTMLButtonElement | null
      if (btn) {
        btn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
      }
    }, 400)
  }
  const handleBeatMouseUp = (measureIndex: number, beatIndex: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
      // Short press — cycle sound
      handleBeatClick(measureIndex, beatIndex)
    }
  }
  const handleBeatMouseLeave = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  // Apply measure sound preset to all measures
  const applyMeasurePreset = (preset: MeasureSoundPreset) => {
    setConfig((prev) => {
      const sounds = Array.from({ length: prev.beatsPerMeasure }, (_, i) => ({
        sound: preset.sounds[i % preset.sounds.length],
      }))
      return {
        ...prev,
        measures: prev.measures.map((m) => ({ ...m, beats: sounds.map((s) => ({ ...s })) })),
      }
    })
  }

  const addMeasure = () => {
    setConfig((prev) => {
      const lastMeasure = prev.measures[prev.measures.length - 1]
      const newBeats = lastMeasure
        ? lastMeasure.beats.map((b) => ({ ...b }))
        : Array.from({ length: prev.beatsPerMeasure }, () => ({ sound: 'wood' as BeatSoundId }))
      return {
        ...prev,
        measures: [...prev.measures, { id: generateMeasureId(), beats: newBeats }],
      }
    })
  }

  const duplicateMeasure = (measureIndex: number) => {
    setConfig((prev) => {
      const measures = [...prev.measures]
      const source = measures[measureIndex]
      if (!source) return prev
      const copy: typeof source = { id: generateMeasureId(), beats: source.beats.map((b) => ({ ...b })) }
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
    <div className="space-y-4">
      {/* ======= Top row: Loop + Beats ======= */}
      <div
        className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Loop toggle */}
        <button
          type="button"
          onClick={() => setConfig((prev) => ({ ...prev, loop: !prev.loop }))}
          className="h-10 px-4 text-sm rounded transition-all cursor-pointer flex-shrink-0"
          style={{
            touchAction: 'manipulation',
            color: config.loop ? 'var(--text-primary)' : 'var(--text-muted)',
            border: `0.5px solid ${config.loop ? 'var(--accent-amber)' : 'var(--border-line)'}`,
            background: config.loop ? 'var(--accent-glow)' : 'transparent',
          }}
        >
          {config.loop ? '循环' : '单次'}
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 flex-shrink-0" style={{ background: 'var(--border-line)' }} />

        {/* Beat count ± */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>节拍</span>
          <button
            type="button"
            onClick={() => handleBeatsChange(Math.max(MIN_BEATS, config.beatsPerMeasure - 1))}
            disabled={config.beatsPerMeasure <= MIN_BEATS}
            className="w-10 h-10 rounded flex items-center justify-center text-base font-medium transition-all cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
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
            className="w-10 h-10 rounded flex items-center justify-center text-base font-medium transition-all cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
            onMouseEnter={(e) => { if (config.beatsPerMeasure < MAX_BEATS) { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            +
          </button>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8 flex-shrink-0" style={{ background: 'var(--border-line)' }} />

        {/* Measure sound presets */}
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
          <span className="text-xs uppercase tracking-widest mr-1" style={{ color: 'var(--text-muted)' }}>音色</span>
          {MEASURE_SOUND_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyMeasurePreset(preset)}
              className="h-10 px-3 text-sm rounded transition-all cursor-pointer"
              style={{
                touchAction: 'manipulation',
                color: 'var(--text-muted)',
                border: '0.5px solid var(--border-line)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* ======= Beat Grid — centered, no column header ======= */}
      <div
        className="rounded-xl px-4 py-4"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Measure rows — centered grid */}
        <div className="flex flex-col items-center gap-3">
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
                {/* Row playing indicator */}
                <div className="w-4 flex-shrink-0 flex items-center justify-center">
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

                {/* Beat dots — responsive size on small screens */}
                <div className="flex items-center gap-2">
                  {measure.beats.slice(0, config.beatsPerMeasure).map((beat, beatIdx) => {
                    const isActive = isCurrentMeasure && currentBeat?.beat === beatIdx
                    const beatConfig = BEAT_SOUND_MAP[beat.sound]
                    return (
                      <BeatButton
                        key={beatIdx}
                        dataBeat={`${mi}-${beatIdx}`}
                        sound={beat.sound}
                        isActive={isActive}
                        color={beatConfig.color}
                        measureIndex={mi}
                        beatIndex={beatIdx}
                        onMouseDown={handleBeatMouseDown}
                        onMouseUp={handleBeatMouseUp}
                        onMouseLeave={handleBeatMouseLeave}
                        playBeat={playBeatSound}
                      />
                    )
                  })}
                </div>

                {/* Copy / Delete — icon buttons, right side */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => duplicateMeasure(mi)}
                    className="w-8 h-8 rounded flex items-center justify-center transition-all cursor-pointer"
                    title="复制"
                    style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="5" y="5" width="9" height="9" rx="1.5" />
                      <path d="M3 11V3a1.5 1.5 0 0 1 1.5-1.5h7A1.5 1.5 0 0 1 13 3v1.5" />
                    </svg>
                  </button>
                  {config.measures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => deleteMeasure(mi)}
                      className="w-8 h-8 rounded flex items-center justify-center transition-all cursor-pointer"
                      title="删除"
                      style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-bg)'; e.currentTarget.style.color = 'var(--danger-red)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Add measure */}
        <button
          type="button"
          onClick={addMeasure}
          className="mt-4 w-full py-2 text-sm rounded transition-all cursor-pointer"
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

      {/* ======= Bottom: Playback + BPM Controls ======= */}
      <div
        className="rounded-xl px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Play/Pause — h-12 (48px) primary */}
        <button
          type="button"
          onClick={handlePlayPause}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
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

        {/* Stop — h-10 (40px) */}
        <button
          type="button"
          onClick={handleStop}
          className="w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
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
        <div className="hidden sm:block w-px h-9 flex-shrink-0" style={{ background: 'var(--border-line)' }} />

        {/* BPM — all h-10 (40px) for uniformity */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => handleBpmChange(config.bpm - 5)}
            className="w-10 h-10 rounded flex items-center justify-center text-base font-medium transition-all cursor-pointer"
            style={{ touchAction: 'manipulation', color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 8h10M3 8l4-4M3 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
          </button>
          <input
            type="number"
            min={MIN_BPM}
            max={MAX_BPM}
            value={config.bpm}
            onChange={(e) => handleBpmChange(Number(e.target.value))}
            className="w-16 h-10 text-center font-mono text-base font-medium rounded appearance-none cursor-pointer"
            style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none', WebkitAppearance: 'none' }}
          />
          <button
            type="button"
            onClick={() => handleBpmChange(config.bpm + 5)}
            className="w-10 h-10 rounded flex items-center justify-center text-base font-medium transition-all cursor-pointer"
            style={{ touchAction: 'manipulation', color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M13 8H3M13 8l-4-4M13 8l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
          </button>
        </div>

        {/* BPM presets — all h-10 (40px) */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {BPM_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handleBpmChange(preset)}
              className="h-10 px-3 text-sm rounded transition-all cursor-pointer"
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
      </div>
    </div>
  )
}

// ---------- Inline beat button ----------
function BeatButton({
  dataBeat,
  sound,
  isActive,
  color,
  measureIndex,
  beatIndex,
  onMouseDown,
  onMouseUp,
  onMouseLeave,
  onContextMenu,
  playBeat,
}: {
  dataBeat: string
  sound: BeatSoundId
  isActive: boolean
  color: string
  measureIndex: number
  beatIndex: number
  onMouseDown: (mi: number, bi: number) => void
  onMouseUp: (mi: number, bi: number) => void
  onMouseLeave: () => void
  onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void
  playBeat?: (s: BeatSoundId) => void
}) {
  const [showSelector, setShowSelector] = useState(false)
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const openSelector = (rect: DOMRect) => {
    setAnchorRect(rect)
    setShowSelector(true)
  }

  // Expose openSelector via onContextMenu trigger
  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onContextMenu) {
      onContextMenu(e)
    }
    if (!e.defaultPrevented && buttonRef.current) {
      openSelector(buttonRef.current.getBoundingClientRect())
    }
  }

  return (
    <div className="relative flex-shrink-0">
      <motion.button
        ref={buttonRef}
        type="button"
        data-beat={dataBeat}
        onMouseDown={() => onMouseDown(measureIndex, beatIndex)}
        onMouseUp={() => onMouseUp(measureIndex, beatIndex)}
        onMouseLeave={onMouseLeave}
        onContextMenu={handleContextMenu}
        whileTap={{ scale: 0.95 }}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all cursor-pointer"
        style={{
          background: isActive ? color : 'var(--bg-card)',
          border: `0.5px solid ${isActive ? color : 'var(--border-line)'}`,
          boxShadow: isActive ? `0 0 8px ${color}50` : 'none',
          touchAction: 'manipulation',
        }}
        animate={isActive && !prefersReducedMotion ? { scale: [1, 1.12, 1], transition: { duration: 0.12 } } : { scale: 1 }}
      >
        <span className="w-3 h-3 rounded-full" style={{ background: isActive ? 'rgba(255,255,255,0.8)' : color }} />
      </motion.button>

      <AnimatePresence>
        {showSelector && anchorRect && (
          <BeatSoundPopup
            currentSound={sound}
            anchorRect={anchorRect}
            onSelect={(s) => {
              playBeat?.(s)
              setShowSelector(false)
            }}
            onClose={() => setShowSelector(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ---------- Sound selector popup ----------
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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
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
  })

  useEffect(() => {
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
      className="fixed z-50 min-w-[140px] rounded-md py-2 backdrop-blur-sm"
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
          className="w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-all cursor-pointer"
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
          <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
          <span>{s.label}</span>
          <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>{s.labelEn}</span>
        </button>
      ))}
    </motion.div>
  )
}