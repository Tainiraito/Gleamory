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
  const thisPopupId = `${measureIndex}-${beatIndex}`
  const isOpen = activePopupId === thisPopupId

  const beatSize = 40
  const dotSize = 16

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    startLongPress()
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    if (longPressTimer.current) {
      cancelLongPress()
      cycleSound()
    }
  }

  const handleMouseLeave = cancelLongPress

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    cancelLongPress()
    if (btnRef.current) {
      onOpenPopup(thisPopupId, btnRef.current, sound)
    }
  }

  const handleSelect = (s: BeatSoundId) => {
    playBeat(s)
    onSoundChange(measureIndex, beatIndex, s)
    onClosePopup()
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
        aria-label={`第 ${beatIndex + 1} 拍 — ${BEAT_SOUND_MAP[sound].label}`}
        className="relative rounded-full flex items-center justify-center transition-all focus:outline-none flex-shrink-0 cursor-pointer"
        style={{
          width: beatSize,
          height: beatSize,
          background: isActive ? color : 'var(--bg-card)',
          border: `0.5px solid ${isActive ? color : 'var(--border-line)'}`,
          boxShadow: isActive ? `0 0 0 3px ${color}33` : 'none',
        }}
      >
        <span
          className="rounded-full"
          style={{
            width: dotSize,
            height: dotSize,
            background: isActive ? '#fff' : color,
            flexShrink: 0,
          }}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="beat-popup"
            data-popup
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
  const [activePreset, setActivePreset] = useState<string | null>(null)
  const measureRefs = useRef<(HTMLDivElement | null)[]>([])

  const { isPlaying, currentBeat, elapsedTime, roundCount, currentBpm, playBeatSound, start, stop, pause, resume } =
    useMetronome({ config, onBeat: undefined, onComplete: undefined })

  const isPausedRef = useRef(false)

  useEffect(() => {
    if (currentBeat && measureRefs.current[currentBeat.measure]) {
      measureRefs.current[currentBeat.measure]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentBeat])

  // ---- Singleton popup state ----
  const [activePopupId, setActivePopupId] = useState<string | null>(null)
  const handleOpenPopup = (_id: string) => setActivePopupId(_id)
  const handleClosePopup = () => setActivePopupId(null)

  useEffect(() => {
    if (!activePopupId) return
    const handler = (e: MouseEvent) => {
      const popup = document.querySelector('[data-popup]')
      if (popup && !popup.contains(e.target as Node)) {
        setActivePopupId(null)
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [activePopupId])

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
    setActivePreset(preset.name)
    setConfig((prev) => {
      const sounds = Array.from({ length: prev.beatsPerMeasure }, (_, i) => ({
        sound: preset.sounds[i % preset.sounds.length],
      }))
      return { ...prev, measures: prev.measures.map((m) => ({ ...m, beats: sounds.map((s) => ({ ...s })) })) }
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
      {/* ======= Card 2: Sound Presets ======= */}
      <div
        className="rounded-xl px-4 py-3 flex justify-center"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs uppercase tracking-widest mr-1" style={{ color: 'var(--text-muted)' }}>音色</span>
          {MEASURE_SOUND_PRESETS.map((preset) => {
            const isPresetActive = activePreset === preset.name
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => applyMeasurePreset(preset)}
                className="h-9 px-2 text-xs rounded transition-all cursor-pointer"
                style={{
                  touchAction: 'manipulation',
                  color: isPresetActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: `0.5px solid ${isPresetActive ? 'var(--accent-amber)' : 'var(--border-line)'}`,
                  background: isPresetActive ? 'var(--accent-glow)' : 'transparent',
                }}
                onMouseEnter={(e) => {
                  if (!isPresetActive) {
                    e.currentTarget.style.background = 'var(--accent-glow)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPresetActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
              >
                {preset.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* ======= Beat Grid (无卡片背景、无边线) ======= */}
      <div className="overflow-x-auto">
        <div className="flex flex-col items-center gap-2 min-w-max">
          {config.measures.map((measure, mi) => {
            const isCurrentMeasure = currentBeat?.measure === mi
            return (
              <div
                key={measure.id}
                ref={(el) => { measureRefs.current[mi] = el }}
                className="flex items-center gap-4 relative pl-4 py-1.5 rounded-lg transition-all"
              >
                {/* Left indicator bar */}
                <motion.div
                  className="absolute left-0 top-0 w-0.5 rounded-full"
                  style={{ background: 'var(--accent-amber)' }}
                  initial={false}
                  animate={{
                    height: isCurrentMeasure ? '100%' : 0,
                    opacity: isCurrentMeasure ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                />

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
                    title="复制"
                    aria-label="复制小节"
                    className="w-8 h-8 rounded flex items-center justify-center transition-all cursor-pointer"
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
                    title="删除"
                    aria-label="删除小节"
                    className="w-8 h-8 rounded flex items-center justify-center transition-all cursor-pointer"
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
      </div>

      {/* ======= Card 1: Beat Count + Mode Tabs + BPM Config ======= */}
      <div
        className="rounded-xl px-4 py-3"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Row 1: Beat count | Mode tabs */}
        <div className="flex items-center justify-center gap-6 mb-3">
          {/* Beat count */}
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>节拍</span>
            <button
              type="button"
              onClick={() => handleBeatsChange(Math.max(MIN_BEATS, config.beatsPerMeasure - 1))}
              disabled={config.beatsPerMeasure <= MIN_BEATS}
              aria-label="减少节拍数"
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
              aria-label="增加节拍数"
              className="w-9 h-9 rounded flex items-center justify-center text-base font-medium transition-all cursor-pointer disabled:opacity-30"
              style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
              onMouseEnter={(e) => { if (config.beatsPerMeasure < MAX_BEATS) { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              +
            </button>
          </div>

          {/* Mode tabs */}
          <div className="flex items-center gap-1">
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
        </div>

        <div className="h-px mb-3" style={{ background: 'var(--border-line)' }} />

        {/* Row 2: BPM / TempoChange Config */}
        {!isTempoChange && (
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleBpmChange(config.bpm - 5)}
                aria-label="降低 BPM"
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
                aria-label="BPM 值"
                className="w-16 h-9 text-center font-mono text-base font-medium rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
              <button
                type="button"
                onClick={() => handleBpmChange(config.bpm + 5)}
                aria-label="提高 BPM"
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
            <div className="flex items-center gap-1">
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
          </div>
        )}

        {isTempoChange && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <span className="font-mono text-lg font-bold" style={{ color: 'var(--accent-amber)' }}>
                {currentBpm}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>BPM</span>
            </div>
            <div className="w-px h-6" style={{ background: 'var(--border-line)' }} />
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>起始</span>
              <input
                type="number" value={config.tempoChange.startBpm} min={MIN_BPM} max={MAX_BPM}
                onChange={(e) => updateTempoChange({ startBpm: Math.max(MIN_BPM, Math.min(MAX_BPM, Number(e.target.value))) })}
                aria-label="起始 BPM"
                className="w-14 h-9 text-center font-mono text-sm rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
            </div>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>→</span>
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>终点</span>
              <input
                type="number" value={config.tempoChange.endBpm} min={MIN_BPM} max={MAX_BPM}
                onChange={(e) => updateTempoChange({ endBpm: Math.max(MIN_BPM, Math.min(MAX_BPM, Number(e.target.value))) })}
                aria-label="终点 BPM"
                className="w-14 h-9 text-center font-mono text-sm rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>每</span>
              <input
                type="number" value={config.tempoChange.beatsPerStep} min={1} max={100}
                onChange={(e) => updateTempoChange({ beatsPerStep: Math.max(1, Math.min(100, Number(e.target.value))) })}
                aria-label="每 N 轮变化"
                className="w-12 h-8 text-center font-mono text-sm rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>轮</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+</span>
              <input
                type="number" value={config.tempoChange.step} min={1} max={100}
                onChange={(e) => updateTempoChange({ step: Math.max(1, Math.min(100, Number(e.target.value))) })}
                aria-label="每次变化 BPM"
                className="w-12 h-8 text-center font-mono text-sm rounded"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)', appearance: 'none' }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>BPM</span>
            </div>
            <button
              type="button"
              onClick={() => updateTempoChange({ direction: config.tempoChange.direction === 'up' ? 'down-up' : 'up' })}
              className="h-8 px-3 text-xs rounded transition-all cursor-pointer"
              style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)', background: 'transparent' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              {config.tempoChange.direction === 'up' ? '↗ 加速' : '↕ 反复'}
            </button>
          </div>
        )}
      </div>
{/* ======= Card 4: Playback ======= */}
      <div
        className="rounded-xl px-4 py-4 flex items-center justify-center gap-5"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Stop */}
        <button
          type="button"
          onClick={handleStop}
          aria-label="停止"
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
        <motion.button
          type="button"
          onClick={handlePlayPause}
          whileTap={{ scale: 0.92 }}
          aria-label={isPlaying ? '暂停' : '播放'}
          className="w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0"
          style={{
            touchAction: 'manipulation',
            background: isPlaying ? 'var(--accent-amber)' : 'var(--accent-glow)',
            border: '0.5px solid var(--accent-amber)',
            boxShadow: isPlaying
              ? '0 4px 14px rgba(196,149,106,0.35)'
              : '0 2px 8px rgba(196,149,106,0.12)',
          }}
          onMouseEnter={(e) => {
            if (!isPlaying) e.currentTarget.style.background = 'var(--accent-subtle)'
          }}
          onMouseLeave={(e) => {
            if (!isPlaying) e.currentTarget.style.background = 'var(--accent-glow)'
          }}
        >
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.svg
                key="pause"
                width="20" height="20" viewBox="0 0 16 16" fill="white"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
              >
                <rect x="3" y="2" width="4" height="12" rx="1" />
                <rect x="9" y="2" width="4" height="12" rx="1" />
              </motion.svg>
            ) : (
              <motion.svg
                key="play"
                width="20" height="20" viewBox="0 0 16 16" fill="var(--accent-amber)"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
              >
                <path d="M4 2.5v11l9-5.5-9-5.5z" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Timer + RND */}
        <div className="flex items-center gap-4 flex-shrink-0">
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
            <span className="text-[0.6rem] uppercase tracking-wider font-mono" style={{ color: 'var(--text-muted)' }}>
              RND
            </span>
            <span className="font-mono text-base font-medium" style={{ color: 'var(--text-primary)' }}>
              {roundCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
