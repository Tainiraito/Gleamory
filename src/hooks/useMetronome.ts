import { useRef, useCallback, useEffect, useState } from 'react'
import type { BeatSoundId } from '@/data/beatSounds'
import { BEAT_SOUND_MAP } from '@/data/beatSounds'
import type { Measure, MetronomeConfig, TempoChangeConfig } from '@/types/metronome'

interface UseMetronomeOptions {
  config: MetronomeConfig
  onBeat?: (measureIndex: number, beatIndex: number) => void
  onComplete?: () => void
}

interface UseMetronomeReturn {
  isPlaying: boolean
  currentBeat: { measure: number; beat: number } | null
  elapsedTime: number
  roundCount: number
  currentBpm: number
  playBeatSound: (sound: BeatSoundId) => void
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
}

function synthesizeBeat(audioCtx: AudioContext, sound: BeatSoundId, time: number): void {
  const config = BEAT_SOUND_MAP[sound]
  if (!config) return

  const { frequency = 440, noiseMix = 0, decay = 0.1, type = 'sine' } = config

  const masterGain = audioCtx.createGain()
  masterGain.gain.setValueAtTime(0.8, time)
  masterGain.connect(audioCtx.destination)

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

// ---- Helper: compute the tempo change BPM for a given round ----
function computeTempoBpm(
  round: number,
  currentBpm: number,
  tc: TempoChangeConfig,
  directionRef: React.MutableRefObject<1 | -1>
): number {
  if (tc.beatsPerStep <= 0 || tc.step <= 0) return currentBpm

  const isStepRound = (round - 1) % tc.beatsPerStep === 0 && round > 1
  if (!isStepRound) return currentBpm

  const dir = directionRef.current
  if (dir === 1) {
    // Accelerating
    const next = currentBpm + tc.step
    if (next >= tc.endBpm) {
      if (tc.direction === 'down-up') {
        directionRef.current = -1
      }
      return tc.endBpm // 先到达终点，下次再减速
    }
    return next
  } else {
    // Decelerating
    const next = currentBpm - tc.step
    if (next <= tc.startBpm) {
      if (tc.direction === 'down-up') {
        directionRef.current = 1
      }
      return tc.startBpm // 先到达起点，下次再加速
    }
    return next
  }
}

export function useMetronome({
  config,
  onBeat,
  onComplete,
}: UseMetronomeOptions): UseMetronomeReturn {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<number | null>(null)
  const nextBeatTimeRef = useRef<number>(0)
  const measureIndexRef = useRef<number>(0)
  const beatIndexRef = useRef<number>(0)
  const isPlayingRef = useRef<boolean>(false)

  const tempoChangeRef = useRef<TempoChangeConfig>(config.tempoChange)
  const currentBpmRef = useRef<number>(config.bpm)
  const roundCountRef = useRef<number>(1)
  const tempoChangeDirectionRef = useRef<1 | -1>(1)

  const onBeatRef = useRef(onBeat)
  const onCompleteRef = useRef(onComplete)
  const configRef = useRef(config)

  const tickRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const pausedElapsedRef = useRef<number>(0)

  useEffect(() => { onBeatRef.current = onBeat }, [onBeat])
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])
  useEffect(() => {
    configRef.current = config
    if (!isPlayingRef.current) {
      currentBpmRef.current = config.bpm
    }
  }, [config])

  useEffect(() => {
    tempoChangeRef.current = config.tempoChange
    if (!isPlayingRef.current) {
      currentBpmRef.current = config.tempoChange.startBpm
    }
  }, [config.tempoChange])

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState<{ measure: number; beat: number } | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [roundCount, setRoundCount] = useState(1)
  const [currentBpmDisplay, setCurrentBpmDisplay] = useState(config.bpm)

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

  const startElapsedTicker = useCallback(() => {
    startTimeRef.current = Date.now() - pausedElapsedRef.current
    if (tickRef.current !== null) clearInterval(tickRef.current)
    tickRef.current = window.setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 500)
  }, [])

  const stopElapsedTicker = useCallback(() => {
    if (tickRef.current !== null) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
    pausedElapsedRef.current = Date.now() - startTimeRef.current
  }, [])

  const playBeat = useCallback((sound: BeatSoundId) => {
    const ctx = ensureAudioContext()
    synthesizeBeat(ctx, sound, ctx.currentTime)
  }, [ensureAudioContext])

  const scheduleNextBeat = useCallback(() => {
    if (!isPlayingRef.current) return

    const ctx = audioCtxRef.current
    if (!ctx) return

    const currentMeasures = configRef.current.measures
    const currentBpm = currentBpmRef.current
    const beatDuration = 60 / currentBpm

    const lookAhead = 0.1
    while (nextBeatTimeRef.current < ctx.currentTime + lookAhead) {
      const globalIndex =
        measureIndexRef.current * configRef.current.beatsPerMeasure + beatIndexRef.current
      const beatInfo = getBeatAtGlobalIndex(globalIndex, currentMeasures, configRef.current.beatsPerMeasure)

      if (beatInfo) {
        synthesizeBeat(ctx, beatInfo.sound, nextBeatTimeRef.current)

        const delay = (nextBeatTimeRef.current - ctx.currentTime) * 1000
        const mi = measureIndexRef.current
        const bi = beatIndexRef.current
        setTimeout(() => {
          setCurrentBeat({ measure: mi, beat: bi })
          onBeatRef.current?.(mi, bi)
        }, Math.max(0, delay))
      }

      beatIndexRef.current++
      if (beatIndexRef.current >= configRef.current.beatsPerMeasure) {
        beatIndexRef.current = 0
        measureIndexRef.current++

        if (measureIndexRef.current >= currentMeasures.length) {
          measureIndexRef.current = 0
          roundCountRef.current++
          setRoundCount(roundCountRef.current)

          if (configRef.current.tempoMode === 'tempoChange') {
            const newBpm = computeTempoBpm(
              roundCountRef.current,
              currentBpmRef.current,
              tempoChangeRef.current,
              tempoChangeDirectionRef
            )
            currentBpmRef.current = newBpm
            setCurrentBpmDisplay(newBpm)
          }
        }
      }

      nextBeatTimeRef.current += beatDuration
    }

    timerRef.current = window.setTimeout(scheduleNextBeat, 25)
  }, [])

  const start = useCallback(() => {
    const ctx = ensureAudioContext()

    measureIndexRef.current = 0
    beatIndexRef.current = 0
    roundCountRef.current = 1
    tempoChangeDirectionRef.current = 1
    currentBpmRef.current = configRef.current.tempoMode === 'tempoChange'
      ? configRef.current.tempoChange.startBpm
      : configRef.current.bpm
    setCurrentBpmDisplay(currentBpmRef.current)
    setRoundCount(1)
    setCurrentBeat(null)

    nextBeatTimeRef.current = ctx.currentTime + 0.05

    isPlayingRef.current = true
    setIsPlaying(true)
    startElapsedTicker()

    const firstBeat = getBeatAtGlobalIndex(0, configRef.current.measures, configRef.current.beatsPerMeasure)
    if (firstBeat) {
      synthesizeBeat(ctx, firstBeat.sound, ctx.currentTime)
      setCurrentBeat({ measure: 0, beat: 0 })
      onBeatRef.current?.(0, 0)
      nextBeatTimeRef.current = ctx.currentTime + 60 / currentBpmRef.current
      beatIndexRef.current = 1
    }

    scheduleNextBeat()
  }, [ensureAudioContext, scheduleNextBeat, startElapsedTicker])

  const stop = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    setCurrentBeat(null)
    stopElapsedTicker()
    pausedElapsedRef.current = 0
    setElapsedTime(0)
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    measureIndexRef.current = 0
    beatIndexRef.current = 0
    roundCountRef.current = 1
    setRoundCount(1)
  }, [stopElapsedTicker])

  const pause = useCallback(() => {
    isPlayingRef.current = false
    setIsPlaying(false)
    stopElapsedTicker()
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [stopElapsedTicker])

  const resume = useCallback(() => {
    const ctx = ensureAudioContext()
    isPlayingRef.current = true
    setIsPlaying(true)
    nextBeatTimeRef.current = ctx.currentTime + 0.05
    startElapsedTicker()
    scheduleNextBeat()
  }, [ensureAudioContext, scheduleNextBeat, startElapsedTicker])

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
      if (tickRef.current !== null) clearInterval(tickRef.current)
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  return {
    isPlaying,
    currentBeat,
    elapsedTime,
    roundCount,
    currentBpm: currentBpmDisplay,
    playBeatSound: playBeat,
    start,
    stop,
    pause,
    resume,
  }
}

function getBeatAtGlobalIndex(
  globalIndex: number,
  measures: Measure[],
  beatsPerMeasure: number
): { sound: BeatSoundId } | null {
  let cursor = 0
  for (let mi = 0; mi < measures.length; mi++) {
    const m = measures[mi]
    for (let bi = 0; bi < beatsPerMeasure; bi++) {
      if (cursor === globalIndex) {
        return { sound: m.beats[bi]?.sound ?? 'wood' }
      }
      cursor++
    }
  }
  return null
}
