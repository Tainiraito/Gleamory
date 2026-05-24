import { useState, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMetronome } from '@/hooks/useMetronome'
import { createDefaultConfig, createMeasure, generateMeasureId, type MetronomeConfig, MIN_BPM, MAX_BPM, MIN_BEATS, MAX_BEATS } from '@/types/metronome'
import type { BeatSoundId } from '@/data/beatSounds'
import { MeasureEditor } from './MeasureEditor'

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

  // Distinguish pause from stop for correct play/resume behavior
  const isPausedRef = useRef(false)
  const prefersReducedMotion = useReducedMotion()

  // BPM change via slider/input
  const handleBpmChange = (newBpm: number) => {
    const clamped = Math.min(MAX_BPM, Math.max(MIN_BPM, newBpm))
    setConfig((prev) => ({ ...prev, bpm: clamped }))
  }

  // Global beat count change — syncs all measures
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

  // Add new measure (inherits current beatsPerMeasure)
  const addMeasure = () => {
    setConfig((prev) => ({
      ...prev,
      measures: [...prev.measures, createMeasure(generateMeasureId(), prev.beatsPerMeasure)],
    }))
  }

  // Duplicate measure
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

  // Delete measure
  const deleteMeasure = (measureIndex: number) => {
    setConfig((prev) => {
      if (prev.measures.length <= 1) return prev
      const measures = prev.measures.filter((_, i) => i !== measureIndex)
      return { ...prev, measures }
    })
  }

  // Play/Pause toggle
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

  // Stop button resets everything
  const handleStop = () => {
    stop()
    isPausedRef.current = false
  }

  const BPM_PRESETS = [30, 60, 90, 120, 180]

  return (
    <div className="space-y-6">
      {/* ======= Playback Controls ======= */}
      <div
        className="rounded-xl px-6 py-5 flex flex-col sm:flex-row items-center gap-5"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        {/* Play/Pause button */}
        <button
          type="button"
          onClick={handlePlayPause}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer flex-shrink-0 min-h-[44px]"
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

        {/* Stop button */}
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
        <div className="hidden sm:block w-px h-8" style={{ background: 'var(--border-line)' }} />

        {/* BPM Control */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[0.6rem] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              BPM
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleBpmChange(config.bpm - 5)}
                className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all cursor-pointer min-h-[44px]"
                style={{
                  touchAction: 'manipulation',
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
                −
              </button>
              <input
                type="number"
                min={MIN_BPM}
                max={MAX_BPM}
                value={config.bpm}
                onChange={(e) => handleBpmChange(Number(e.target.value))}
                className="w-14 h-7 text-center font-mono text-base font-medium rounded appearance-none cursor-pointer"
                style={{
                  color: 'var(--text-primary)',
                  border: '0.5px solid var(--border-line)',
                  background: 'var(--bg-card)',
                }}
              />
              <button
                type="button"
                onClick={() => handleBpmChange(config.bpm + 5)}
                className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all cursor-pointer min-h-[44px]"
                style={{
                  touchAction: 'manipulation',
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
                +
              </button>
            </div>
          </div>

          {/* BPM presets */}
          <div className="flex items-center gap-1 flex-wrap">
            {BPM_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleBpmChange(preset)}
                className="px-2 py-0.5 text-[0.6rem] rounded transition-all cursor-pointer min-h-[44px]"
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

          {/* BPM slider — with visible track */}
          <div className="relative h-1 rounded-full" style={{ background: 'var(--border-line)' }}>
            <input
              type="range"
              min={MIN_BPM}
              max={MAX_BPM}
              value={config.bpm}
              onChange={(e) => handleBpmChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-full appearance-none cursor-pointer opacity-0"
            />
            {/* Visual fill */}
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{
                width: `${((config.bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%`,
                background: 'var(--accent-amber)',
              }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
              style={{
                left: `${((config.bpm - MIN_BPM) / (MAX_BPM - MIN_BPM)) * 100}%`,
                transform: `translate(-50%, -50%)`,
                background: 'var(--accent-amber)',
                boxShadow: 'var(--shadow-accent-sm)',
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-px h-8" style={{ background: 'var(--border-line)' }} />

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
      </div>

      {/* ======= Beat Count Controls (global) ======= */}
      <div
        className="rounded-xl px-5 py-3 flex items-center justify-between"
        style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      >
        <span className="text-[0.6rem] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          每小节节拍
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleBeatsChange(Math.max(MIN_BEATS, config.beatsPerMeasure - 1))}
            disabled={config.beatsPerMeasure <= MIN_BEATS}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
            onMouseEnter={(e) => {
              if (config.beatsPerMeasure > MIN_BEATS) {
                e.currentTarget.style.background = 'var(--accent-glow)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            −
          </button>
          <span
            className="w-8 text-center font-mono text-base font-medium select-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {config.beatsPerMeasure}
          </span>
          <button
            type="button"
            onClick={() => handleBeatsChange(Math.min(MAX_BEATS, config.beatsPerMeasure + 1))}
            disabled={config.beatsPerMeasure >= MAX_BEATS}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all cursor-pointer disabled:opacity-30"
            style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
            onMouseEnter={(e) => {
              if (config.beatsPerMeasure < MAX_BEATS) {
                e.currentTarget.style.background = 'var(--accent-glow)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* ======= Measure Editors (matrix grid) ======= */}
      <div className="space-y-4">
        {config.measures.map((measure, mi) => (
          <motion.div
            key={measure.id}
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 8 }}
            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.2 }}
          >
            <MeasureEditor
              measure={measure}
              measureIndex={mi}
              isCurrentMeasure={currentBeat?.measure === mi}
              currentBeatInMeasure={currentBeat?.measure === mi ? currentBeat.beat : null}
              onBeatChange={handleBeatChange}
              onDuplicate={duplicateMeasure}
              onDelete={deleteMeasure}
              canDelete={config.measures.length > 1}
              playBeatSound={playBeatSound}
            />
          </motion.div>
        ))}
      </div>

      {/* ======= Add Measure Button ======= */}
      <button
        type="button"
        onClick={addMeasure}
        className="w-full py-2.5 rounded-xl text-sm transition-all cursor-pointer"
        style={{
          color: 'var(--text-muted)',
          border: '0.5px solid var(--accent-amber)',
          background: 'transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--accent-glow)'
          e.currentTarget.style.color = 'var(--text-primary)'
          e.currentTarget.style.borderColor = 'var(--accent-amber)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-muted)'
          e.currentTarget.style.borderColor = 'var(--accent-amber)'
        }}
      >
        + 添加小节
      </button>
    </div>
  )
}