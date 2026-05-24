import { useRef, useCallback, useEffect, useState } from 'react'
import type { BeatSoundId } from '@/data/beatSounds'
import { BEAT_SOUND_MAP } from '@/data/beatSounds'
import type { Measure } from '@/types/metronome'

interface UseMetronomeOptions {
  bpm: number
  beatsPerMeasure: number
  measures: Measure[]
  loop: boolean
  onBeat?: (measureIndex: number, beatIndex: number) => void
  onComplete?: () => void
}

interface UseMetronomeReturn {
  isPlaying: boolean
  currentBeat: { measure: number; beat: number } | null
  playBeatSound: (sound: BeatSoundId) => void
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
}

// Synthesize a beat sound using Web Audio API
function synthesizeBeat(audioCtx: AudioContext, sound: BeatSoundId, time: number): void {
  const config = BEAT_SOUND_MAP[sound]
  if (!config) return

  const { frequency = 440, noiseMix = 0, decay = 0.1, type = 'sine' } = config

  // Master gain for this beat
  const masterGain = audioCtx.createGain()
  masterGain.gain.setValueAtTime(0.8, time)
  masterGain.connect(audioCtx.destination)

  // Tonal component (oscillator)
  if (noiseMix < 1) {
    const osc = audioCtx.createOscillator()
    const oscGain = audioCtx.createGain()
    osc.type = type as OscillatorType
    osc.frequency.setValueAtTime(frequency, time)
    oscGain.gain.setValueAtTime(1 - noiseMix, time)
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + decay)
    osc.connect(oscGain)
    oscGain.connect(masterGain)
    osc.start(time)
    osc.stop(time + decay)
  }

  // Noise component
  if (noiseMix > 0) {
    const bufferSize = audioCtx.sampleRate * decay
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const noise = audioCtx.createBufferSource()
    noise.buffer = buffer

    const noiseFilter = audioCtx.createBiquadFilter()
    noiseFilter.type = 'highpass'
    noiseFilter.frequency.setValueAtTime(frequency, time)

    const noiseGain = audioCtx.createGain()
    noiseGain.gain.setValueAtTime(noiseMix, time)
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + decay)

    noise.connect(noiseFilter)
    noiseFilter.connect(noiseGain)
    noiseGain.connect(masterGain)
    noise.start(time)
    noise.stop(time + decay)
  }
}

export function useMetronome({
  bpm,
  beatsPerMeasure,
  measures,
  loop,
  onBeat,
  onComplete,
}: UseMetronomeOptions): UseMetronomeReturn {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextBeatTimeRef = useRef<number>(0)
  const measureIndexRef = useRef<number>(0)
  const beatIndexRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)
  const bpmRef = useRef<number>(bpm)
  const beatsPerMeasureRef = useRef<number>(beatsPerMeasure)
  const onBeatRef = useRef(onBeat)
  const onCompleteRef = useRef(onComplete)
  const measuresRef = useRef(measures)

  // Config ref for live access in scheduling loop — updated every render via useEffect
  const configRef = useRef({ measures, loop, bpm, beatsPerMeasure })

  // ---- Sync refs with latest props ----
  useEffect(() => { bpmRef.current = bpm }, [bpm])
  useEffect(() => {
    beatsPerMeasureRef.current = beatsPerMeasure
    // Clamp current beat index when beatsPerMeasure decreases while playing
    if (isPlayingRef.current && beatIndexRef.current >= beatsPerMeasure) {
      beatIndexRef.current = Math.max(0, beatsPerMeasure - 1)
    }
  }, [beatsPerMeasure])
  useEffect(() => { onBeatRef.current = onBeat }, [onBeat])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => {
    configRef.current = { measures, loop, bpm, beatsPerMeasure }
  }, [measures, loop, bpm, beatsPerMeasure])

  // ---- Track measures changes (add/delete) to adjust playback position ----
  useEffect(() => {
    const oldMeasures = measuresRef.current
    const newMeasures = measures

    if (isPlayingRef.current) {
      if (newMeasures.length < oldMeasures.length) {
        // Measures were deleted — find which one
        const newIds = new Set(newMeasures.map((m) => m.id))
        for (let i = 0; i < oldMeasures.length; i++) {
          if (!newIds.has(oldMeasures[i].id)) {
            // Measure at index `i` was deleted
            if (i < measureIndexRef.current) {
              // Deleted before current position — shift back
              measureIndexRef.current--
            } else if (i === measureIndexRef.current) {
              // Deleted current measure — jump to clamped position
              measureIndexRef.current = Math.min(
                measureIndexRef.current,
                newMeasures.length - 1
              )
            }
            // If deleted after current position, no change needed
            break
          }
        }
      }
      // For additions: no explicit handling needed since configRef
      // makes the scheduling loop see the new measures array.
      // When advancing past the end of old measures, the increased
      // measures.length naturally prevents unnecessary loop/stop.
    }

    measuresRef.current = newMeasures
  }, [measures])

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState<{ measure: number; beat: number } | null>(null)

  // Ensure audio context exists (handle iOS autoplay policy)
  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume()
    }
    return audioCtxRef.current
  }, [])

  // Play a single beat sound immediately
  const playBeat = useCallback((sound: BeatSoundId) => {
    const ctx = ensureAudioContext()
    synthesizeBeat(ctx, sound, ctx.currentTime)
  }, [ensureAudioContext])

  // Schedule the next beat using AudioContext time for precision
  // Reads all config from refs so changes take effect instantly
  const scheduleNextBeat = useCallback(() => {
    if (!isPlayingRef.current) return

    const ctx = audioCtxRef.current
    if (!ctx) return

    const { measures: currentMeasures, loop: shouldLoop } = configRef.current
    const beatDuration = 60 / bpmRef.current // seconds per beat

    // Schedule all beats that fall within the next 100ms window
    const lookAhead = 0.1 // seconds
    while (nextBeatTimeRef.current < ctx.currentTime + lookAhead) {
      const globalIndex =
        measureIndexRef.current * beatsPerMeasureRef.current + beatIndexRef.current
      const beatInfo = getBeatAtGlobalIndex(globalIndex, currentMeasures)

      if (beatInfo) {
        synthesizeBeat(ctx, beatInfo.sound, nextBeatTimeRef.current)

        // Update UI at the right time
        const delay = (nextBeatTimeRef.current - ctx.currentTime) * 1000
        const mi = measureIndexRef.current
        const bi = beatIndexRef.current
        setTimeout(() => {
          setCurrentBeat({ measure: mi, beat: bi })
          onBeatRef.current?.(mi, bi)
        }, Math.max(0, delay))
      }

      // Advance beat index
      beatIndexRef.current++
      if (beatIndexRef.current >= beatsPerMeasureRef.current) {
        beatIndexRef.current = 0
        measureIndexRef.current++
        if (measureIndexRef.current >= currentMeasures.length) {
          if (shouldLoop) {
            measureIndexRef.current = 0
          } else {
            isPlayingRef.current = false
            setIsPlaying(false)
            setCurrentBeat(null)
            onCompleteRef.current?.()
            return
          }
        }
      }

      nextBeatTimeRef.current += beatDuration
    }

    // Schedule next scheduler run
    timerRef.current = window.setTimeout(scheduleNextBeat, 25)
  }, []) // No deps — all values read from refs at runtime

  // Start playback
  const start = useCallback(() => {
    const ctx = ensureAudioContext()

    // Reset position
    measureIndexRef.current = 0
    beatIndexRef.current = 0
    nextBeatTimeRef.current = ctx.currentTime + 0.05 // Small delay to start

    isPlayingRef.current = true
    setIsPlaying(true)
    setCurrentBeat(null)

    // Play first beat immediately
    const firstBeat = getBeatAtGlobalIndex(0, configRef.current.measures)
    if (firstBeat) {
      synthesizeBeat(ctx, firstBeat.sound, ctx.currentTime)
      setCurrentBeat({ measure: 0, beat: 0 })
      onBeatRef.current?.(0, 0)
      nextBeatTimeRef.current = ctx.currentTime + 60 / bpmRef.current
      beatIndexRef.current = 1
    }

    scheduleNextBeat()
  }, [ensureAudioContext, scheduleNextBeat])

  // Stop and reset
  const stop = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setCurrentBeat(null)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    measureIndexRef.current = 0
    beatIndexRef.current = 0
  }, [])

  // Pause
  const pause = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Resume from paused position
  const resume = useCallback(() => {
    const ctx = ensureAudioContext()
    isPlayingRef.current = true
    setIsPlaying(true)
    nextBeatTimeRef.current = ctx.currentTime + 0.05
    scheduleNextBeat()
  }, [ensureAudioContext, scheduleNextBeat])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current)
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
      }
    }
  }, [])

  return { isPlaying, currentBeat, playBeatSound: playBeat, start, stop, pause, resume }
}

// Helper to look up beat sound by global index (into all measures flattened)
function getBeatAtGlobalIndex(globalIndex: number, measures: Measure[]): { sound: BeatSoundId } | null {
  let cursor = 0
  for (let mi = 0; mi < measures.length; mi++) {
    const m = measures[mi]
    for (let bi = 0; bi < m.beats.length; bi++) {
      if (cursor === globalIndex) {
        return { sound: m.beats[bi].sound }
      }
      cursor++
    }
    // If measure has fewer beats than beatsPerMeasure, skip the rest
    // (This handles the case where measures were synced to a new beatsPerMeasure)
  }
  return null
}
