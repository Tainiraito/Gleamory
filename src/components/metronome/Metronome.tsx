import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMetronome } from '@/hooks/useMetronome'
import {
  createDefaultConfig,
  generateMeasureId,
  MIN_BPM,
  MAX_BPM,
  MIN_BEATS,
  MAX_BEATS,
  type MetronomeConfig,
  type TempoMode,
  type TempoChangeConfig,
} from '@/types/metronome'
import type { BeatSoundId } from '@/data/beatSounds'
import { BEAT_SOUND_MAP, BEAT_SOUNDS, MEASURE_SOUND_PRESETS, type MeasureSoundPreset } from '@/data/beatSounds'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ---- BeatButton ----
interface BeatButtonProps {
  sound: BeatSoundId
  isActive: boolean
  color: string
  measureIndex: number
  beatIndex: number
  onSoundChange: (mi: number, bi: number, sound: BeatSoundId) => void
  playBeat: (sound: BeatSoundId) => void
  // Singleton popup management
  activePopupId: string | null
  onOpenPopup: (id: string, btn: HTMLButtonElement, curSound: BeatSoundId) => void
  onClosePopup: () => void
}

function BeatButton({
  sound, isActive, color, measureIndex, beatIndex,
  onSoundChange, playBeat,
  activePopupId, onOpenPopup, onClosePopup,
}: BeatButtonProps) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thisPopupId = `${measureIndex}-${beatIndex}`
  const isOpen = activePopupId === thisPopupId

  // ---- Cycle sound on short click ----
  const cycleSound = () => {
    const currentIdx = BEAT_SOUNDS.findIndex((s) => s.id === sound)
    const nextIdx = (currentIdx + 1) % BEAT_SOUNDS.length
    const nextSound = BEAT_SOUNDS[nextIdx].id
    playBeat(nextSound)
    onSoundChange(measureIndex, beatIndex, nextSound)
  }

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  const startLongPress = () => {
    cancelLongPress()
    longPressTimer.current = setTimeout(() => {
      longPressTimer.current = null
      if (btnRef.current) {
        onOpenPopup(thisPopupId, btnRef.current, sound)
      }
    }, 400)
  }

  const handleMouseDown = () => startLongPress()

  const handleMouseUp = () => {
    // If timer is still running (< 400ms) → short click → cycle
    if (longPressTimer.current) {
      cancelLongPress()
      cycleSound()
    }
    // If timer already fired, long press already handled popup
  }

  const handleMouseLeave = cancelLongPress

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    cancelLongPress()
    if (btnRef.current) {
      onOpenPopup(thisPopupId, btnRef.current, sound)
    }
  }

  // ---- Popup handlers ----
  const handleSelect = (s: BeatSoundId) => {
    playBeat(s)
    onSoundChange(measureIndex, beatIndex, s)
    onClosePopup()
  }

  const handlePopupMouseEnter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current)
  }
  const handlePopupMouseLeave = () => {
    closeTimer.current = setTimeout(onClosePopup, 120)
  }

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={handleContextMenu}
        className="relative w-10 h-10 rounded-full flex items-center justify-center transition-all focus:outline-none flex-shrink-0"
        style={{
          background: isActive ? color : 'var(--bg-card-warm)',
          border: `0.5px solid ${isActive ? color : 'var(--border-line)'}`,
          boxShadow: isActive ? `0 0 0 3px ${color}33` : 'none',
        }}
      >
        <span
          className="w-3 h-3 rounded-full"
          style={{ background: isActive ? '#fff' : color, flexShrink: 0 }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="beat-popup"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="fixed z-[999] rounded-xl py-1.5 min-w-[140px] shadow-lg"
            style={{
              top: (btnRef.current?.getBoundingClientRect().bottom ?? 0) + window.scrollY + 4,
              left: ((btnRef.current?.getBoundingClientRect().left ?? 0) + window.scrollX) + ((btnRef.current?.offsetWidth ?? 0) / 2),
              transform: 'translateX(-50%)',
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-line)',
            }}
            onMouseEnter={handlePopupMouseEnter}
            onMouseLeave={handlePopupMouseLeave}
          >
            {BEAT_SOUNDS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleSelect(s.id)}
                className="w-full px-3 py-1.5 text-left text-sm flex items-center gap-2 transition-colors cursor-pointer"
                style={{
                  color: sound === s.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: sound === s.id ? 'var(--accent-glow)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (sound !== s.id) {
                    e.currentTarget.style.background = 'var(--bg-card-warm)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (sound !== s.id) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
              >
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: BEAT_SOUND_MAP[s.id].color }} />
                {s.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ---- Main component ----
export function Metronome() {
  const [config, setConfig] = useState<MetronomeConfig>(createDefaultConfig())

  const { isPlaying, currentBeat, elapsedTime, roundCount, currentBpm, playBeatSound, start, stop, pause, resume } =
    useMetronome({ config, onBeat: undefined, onComplete: undefined })

  const isPausedRef = useRef(false)

  // ---- Singleton popup state ----
  const [activePopupId, setActivePopupId] = useState<string | null>(null)
  const handleOpenPopup = (_id: string) => setActivePopupId(_id)
  const handleClosePopup = () => setActivePopupId(null)

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

  const handleConfigChange = (patch: Partial<MetronomeConfig>) => {
    setConfig((prev) => ({ ...prev, ...patch }))
  }

  const handleBeatsChange = (newBeatCount: number) => {
    setConfig((prev) => {
      const measures = prev.measures.map((m) => {
        const beats = [...m.beats]
        if (newBeatCount > beats.length) {
          while (beats.length < newBeatCount) beats.push({ sound: 'wood' })
        } else {
          beats.length = newBeatCount
        }
        return { ...m, beats }
      })
      return { ...prev, beatsPerMeasure: newBeatCount, measures }
    })
  }

  const handleSoundChange = (mi: number, bi: number, sound: BeatSoundId) => {
    setConfig((prev) => {
      const measures = prev.measures.map((m, mi_) => {
        if (mi_ !== mi) return m
        return { ...m, beats: m.beats.map((b, bi_) => (bi_ !== bi ? b : { ...b, sound })) }
      })
      return { ...prev, measures }
    })
  }

  const applyMeasurePreset = (preset: MeasureSoundPreset) => {
    setConfig((prev) => {
      const sounds = Array.from({ length: prev.beatsPerMeasure }, (_, i) => ({
        sound: preset.sounds[i % preset.sounds.length],
      }))
      return { ...prev, measures: prev.measures.map((m) => ({ ...m, beats: sounds.map((s) => ({ ...s })) })) }
    })
  }

  const addMeasure = () => {
    setConfig((prev) => {
      const lastMeasure = prev.measures[prev.measures.length - 1]
      const newBeats = lastMeasure
        ? lastMeasure.beats.map((b) => ({ ...b }))
        : Array.from({ length: prev.beatsPerMeasure }, () => ({ sound: 'wood' as BeatSoundId }))
      return { ...prev, measures: [...prev.measures, { id: generateMeasureId(), beats: newBeats }] }
    })
  }

  const duplicateMeasure = (measureIndex: number) => {
    setConfig((prev) => {
      const measures = [...prev.measures]
      const source = measures[measureIndex]
      if (!source) return prev
      measures.splice(measureIndex + 1, 0, { id: generateMeasureId(), beats: source.beats.map((b) => ({ ...b })) })
      return { ...prev, measures }
    })
  }

  const deleteMeasure = (measureIndex: number) => {
    setConfig((prev) => {
      if (prev.measures.length <= 1) return prev
      return { ...prev, measures: prev.measures.filter((_, i) => i !== measureIndex) }
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

  const handleBpmChange = (newBpm: number) => {
    setConfig((prev) => ({ ...prev, bpm: Math.max(MIN_BPM, Math.min(MAX_BPM, newBpm)) }))
  }

  const BPM_PRESETS = [30, 60, 90, 120, 180]
  const isTempoChange = config.tempoMode === 'tempoChange'

  const updateTempoChange = (patch: Partial<TempoChangeConfig>) => {
    setConfig((prev) => ({ ...prev, tempoChange: { ...prev.tempoChange, ...patch } }))
  }

  return (
    <div className="space-y-3">
      {/* ======= Top: Beat Count + Sound Presets + Timer/Round ======= */}
      <div
        className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-3"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Beat count */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>节拍</span>
          <button
            type="button"
            onClick={() => handleBeatsChange(Math.max(MIN_BEATS, config.beatsPerMeasure - 1))}
            disabled={config.beatsPerMeasure <= MIN_BEATS}
            className="w-9 h-9 rounded flex items-center justify-center text-base font-medium transition-all cursor-pointer disabled:opacity-30"
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
            className="w-9 h-9 rounded flex items-center justify-center text-base font-medium transition-all cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
            onMouseEnter={(e) => { if (config.beatsPerMeasure < MAX_BEATS) { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            +
          </button>
        </div>

        <div className="w-px h-8 flex-shrink-0" style={{ background: 'var(--border-line)' }} />

        {/* Sound presets */}
        <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
          <span className="text-xs uppercase tracking-widest mr-1" style={{ color: 'var(--text-muted)' }}>音色</span>
          {MEASURE_SOUND_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyMeasurePreset(preset)}
              className="h-9 px-2 text-xs rounded transition-all cursor-pointer"
              style={{ touchAction: 'manipulation', color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {preset.name}
            </button>
          ))}
        </div>

        {/* Timer + Round */}
        <div className="ml-auto flex items-center gap-3 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-muted)' }}>
              <circle cx="8" cy="8" r="7" />
              <path d="M8 4v4l3 2" strokeLinecap="round" />
            </svg>
            <span className="font-mono text-base font-medium" style={{ color: 'var(--accent-amber)' }}>
              {formatTime(elapsedTime)}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>RND</span>
            <span className="font-mono text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              {roundCount}
            </span>
          </div>
        </div>
      </div>

      {/* ======= Beat Grid ======= */}
      <div
        className="rounded-xl px-4 py-4 overflow-x-auto"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        <div className="flex flex-col items-center gap-3 min-w-max">
          {config.measures.map((measure, mi) => {
            const isCurrentMeasure = currentBeat?.measure === mi
            return (
              <div key={measure.id} className="flex items-center gap-2">
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  {isCurrentMeasure && (
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: 'var(--accent-amber)' }}
                      animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                      transition={{ repeat: Infinity, duration: 0.8 }}
                    />
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {measure.beats.slice(0, config.beatsPerMeasure).map((beat, beatIdx) => {
                    const isActive = isCurrentMeasure && currentBeat?.beat === beatIdx
                    const beatConfig = BEAT_SOUND_MAP[beat.sound]
                    return (
                      <BeatButton
                        key={beatIdx}
                        sound={beat.sound}
                        isActive={isActive}
                        color={beatConfig.color}
                        measureIndex={mi}
                        beatIndex={beatIdx}
                        onSoundChange={handleSoundChange}
                        playBeat={playBeatSound}
                        activePopupId={activePopupId}
                        onOpenPopup={handleOpenPopup}
                        onClosePopup={handleClosePopup}
                      />
                    )
                  })}
                </div>

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
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={addMeasure}
          className="mt-4 w-full py-2 text-sm rounded transition-all cursor-pointer"
          style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          + 添加小节
        </button>
      </div>

      {/* ======= Bottom Row 1: Mode Tabs + BPM / TempoChange Config ======= */}
      <div
        className="rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-2"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Mode tabs */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {(['normal', 'tempoChange'] as TempoMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleConfigChange({ tempoMode: mode })}
              className="h-9 px-4 text-sm rounded transition-all cursor-pointer"
              style={{
                touchAction: 'manipulation',
                color: config.tempoMode === mode ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `0.5px solid ${config.tempoMode === mode ? 'var(--accent-amber)' : 'var(--border-line)'}`,
                background: config.tempoMode === mode ? 'var(--accent-glow)' : 'transparent',
              }}
            >
              {mode === 'normal' ? '普通' : '变速'}
            </button>
          ))}
        </div>

        <div className="w-px h-9 flex-shrink-0" style={{ background: 'var(--border-line)' }} />

        {/* Normal mode: BPM */}
        {!isTempoChange && (
          <>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleBpmChange(config.bpm - 5)}
                className="w-9 h-9 rounded flex items-center justify-center transition-all cursor-pointer"
                style={{ touchAction: 'manipulation', color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M3 8h10M3 8l4-4M3 8l4 4" />
                </svg>
              </button>
              <input
                type="number"
                min={MIN_BPM}
                max={MAX_BPM}
                value={config.bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                className="w-16 h-9 text-center font-mono text-base font-medium rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
              <button
                type="button"
                onClick={() => handleBpmChange(config.bpm + 5)}
                className="w-9 h-9 rounded flex items-center justify-center transition-all cursor-pointer"
                style={{ touchAction: 'manipulation', color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M13 8H3M13 8l-4-4M13 8l-4 4" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              {BPM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleBpmChange(preset)}
                  className="h-9 px-2 text-sm rounded transition-all cursor-pointer"
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
          </>
        )}

        {/* Tempo change mode: config inline */}
        {isTempoChange && (
          <>
            <div className="flex items-center gap-1">
              <span className="font-mono text-lg font-bold" style={{ color: 'var(--accent-amber)' }}>
                {currentBpm}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>BPM</span>
            </div>

            <div className="w-px h-8 flex-shrink-0" style={{ background: 'var(--border-line)' }} />

            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>起始</span>
              <input
                type="number" value={config.tempoChange.startBpm} min={MIN_BPM} max={MAX_BPM}
                onChange={(e) => updateTempoChange({ startBpm: Math.max(MIN_BPM, Math.min(MAX_BPM, Number(e.target.value))) })}
                className="w-14 h-9 text-center font-mono text-sm rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>→</span>
              <input
                type="number" value={config.tempoChange.endBpm} min={MIN_BPM} max={MAX_BPM}
                onChange={(e) => updateTempoChange({ endBpm: Math.max(MIN_BPM, Math.min(MAX_BPM, Number(e.target.value))) })}
                className="w-14 h-9 text-center font-mono text-sm rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>每</span>
              <input
                type="number" value={config.tempoChange.beatsPerStep} min={1} max={100}
                onChange={(e) => updateTempoChange({ beatsPerStep: Math.max(1, Math.min(100, Number(e.target.value))) })}
                className="w-12 h-9 text-center font-mono text-sm rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>轮</span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+</span>
              <input
                type="number" value={config.tempoChange.step} min={1} max={100}
                onChange={(e) => updateTempoChange({ step: Math.max(1, Math.min(100, Number(e.target.value))) })}
                className="w-12 h-9 text-center font-mono text-sm rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>BPM</span>
            </div>

            <button
              type="button"
              onClick={() => updateTempoChange({ direction: config.tempoChange.direction === 'up' ? 'down-up' : 'up' })}
              className="h-9 px-3 text-sm rounded transition-all cursor-pointer"
              style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {config.tempoChange.direction === 'up' ? '↗ 加速' : '↕ 反复'}
            </button>
          </>
        )}
      </div>

      {/* ======= Bottom Row 2: Playback (centered) ======= */}
      <div
        className="rounded-xl px-4 py-4 flex items-center justify-center gap-6"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Stop */}
        <button
          type="button"
          onClick={handleStop}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
          style={{ touchAction: 'manipulation', color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor">
            <rect x="2" y="2" width="12" height="12" rx="1.5" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          type="button"
          onClick={handlePlayPause}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
          style={{
            touchAction: 'manipulation',
            background: isPlaying ? 'var(--accent-amber)' : 'var(--bg-card-warm)',
            border: `0.5px solid ${isPlaying ? 'var(--accent-amber)' : 'var(--border-line)'}`,
            boxShadow: isPlaying ? 'var(--shadow-accent-md)' : 'none',
          }}
          onMouseEnter={(e) => { if (!isPlaying) e.currentTarget.style.background = 'var(--accent-glow)' }}
          onMouseLeave={(e) => { if (!isPlaying) e.currentTarget.style.background = 'var(--bg-card-warm)' }}
        >
          {isPlaying ? (
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2.5v11l9-5.5-9-5.5z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
