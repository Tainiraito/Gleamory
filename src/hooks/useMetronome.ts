import { useRef, useCallback, useEffect, useState } from 'react'
import type { BeatSoundId } from '@/data/beatSounds'
import { BEAT_SOUND_MAP } from '@/data/beatSounds'
import type { MetronomeConfig, TempoChangeConfig } from '@/types/metronome'
import { totalTicks, getTickInfo } from '@/types/metronome'
import { normalizeMetronomeVolume } from '@/lib/metronomeVolume'

interface UseMetronomeOptions {
  config: MetronomeConfig
  volume: number
  onBeat?: (measureIndex: number, beatIndex: number) => void
  onComplete?: () => void
}

interface UseMetronomeReturn {
  isPlaying: boolean
  currentBeat: { measure: number; beat: number } | null
  currentTickIndex: number // 当前 tick 在 beat 内的索引 (0 = 主拍, 1+ = 细分)
  elapsedTime: number
  roundCount: number
  currentBpm: number
  playBeatSound: (sound: BeatSoundId) => void
  start: () => void
  stop: () => void
  pause: () => void
  resume: () => void
}

function synthesizeBeat(
  audioCtx: AudioContext,
  output: AudioNode,
  sound: BeatSoundId,
  time: number,
  intensity = 1,
): void {
  const config = BEAT_SOUND_MAP[sound]
  if (!config) return

  const { frequency = 440, noiseMix = 0, decay = 0.1, type = 'sine' } = config

  const beatGain = audioCtx.createGain()
  beatGain.gain.setValueAtTime(intensity, time)
  beatGain.connect(output)

  if (noiseMix < 1) {
    const osc = audioCtx.createOscillator()
    const oscGain = audioCtx.createGain()
    osc.type = type as OscillatorType
    osc.frequency.setValueAtTime(frequency, time)
    oscGain.gain.setValueAtTime(1 - noiseMix, time)
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + decay)
    osc.connect(oscGain)
    oscGain.connect(beatGain)
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
    noiseGain.connect(beatGain)
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
  volume,
  onBeat,
  onComplete,
}: UseMetronomeOptions): UseMetronomeReturn {
  const audioCtxRef = useRef<AudioContext | null>(null)
  const masterGainRef = useRef<GainNode | null>(null)
  const volumeRef = useRef(normalizeMetronomeVolume(volume))
  const timerRef = useRef<number | null>(null)
  const nextBeatTimeRef = useRef<number>(0)
  const globalTickRef = useRef<number>(0)
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
    const nextVolume = normalizeMetronomeVolume(volume)
    volumeRef.current = nextVolume

    const audioCtx = audioCtxRef.current
    const masterGain = masterGainRef.current
    if (!audioCtx || !masterGain) return

    masterGain.gain.cancelScheduledValues(audioCtx.currentTime)
    masterGain.gain.setTargetAtTime(nextVolume, audioCtx.currentTime, 0.01)
  }, [volume])
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

  // Live update BPM when switching modes during playback
  useEffect(() => {
    if (!isPlayingRef.current) return
    currentBpmRef.current = config.tempoMode === 'tempoChange'
      ? config.tempoChange.startBpm
      : config.bpm
    setCurrentBpmDisplay(currentBpmRef.current)
  }, [config.tempoMode, config.bpm, config.tempoChange.startBpm])

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentBeat, setCurrentBeat] = useState<{ measure: number; beat: number } | null>(null)
  const [currentTickIndex, setCurrentTickIndex] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [roundCount, setRoundCount] = useState(1)
  const [currentBpmDisplay, setCurrentBpmDisplay] = useState(config.bpm)

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      )()

      const masterGain = audioCtxRef.current.createGain()
      masterGain.gain.setValueAtTime(volumeRef.current, audioCtxRef.current.currentTime)
      masterGain.connect(audioCtxRef.current.destination)
      masterGainRef.current = masterGain
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
    const masterGain = masterGainRef.current
    if (!masterGain) return
    synthesizeBeat(ctx, masterGain, sound, ctx.currentTime)
  }, [ensureAudioContext])

  const scheduleNextBeat = useCallback(() => {
    if (!isPlayingRef.current) return

    const ctx = audioCtxRef.current
    if (!ctx) return

    const cfg = configRef.current
    const total = totalTicks(cfg.measures, cfg.beatsPerMeasure)

    const lookAhead = 0.1
    while (nextBeatTimeRef.current < ctx.currentTime + lookAhead) {
      const info = getTickInfo(globalTickRef.current, cfg.measures, cfg.beatsPerMeasure)

      if (info) {
        const masterGain = masterGainRef.current
        if (!masterGain) return

        // 主拍与细分拍保留 2:1 的响度关系，再统一经过用户音量控制。
        const intensity = info.tickInBeat === 0 ? 1 : 0.5
        synthesizeBeat(ctx, masterGain, info.sound, nextBeatTimeRef.current, intensity)

        const delay = (nextBeatTimeRef.current - ctx.currentTime) * 1000
        const mi = info.measureIndex
        const bi = info.beatIndex
        const ti = info.tickInBeat
        setTimeout(() => {
          setCurrentBeat({ measure: mi, beat: bi })
          setCurrentTickIndex(ti)
          onBeatRef.current?.(mi, bi)
        }, Math.max(0, delay))

        // Compute interval for THIS tick (determines when the NEXT tick fires)
        const beat = cfg.measures[info.measureIndex]?.beats[info.beatIndex]
        const subs = beat?.subdivisions ?? 1
        const tickDuration = 60 / (currentBpmRef.current * subs)
        nextBeatTimeRef.current += tickDuration
      }

      globalTickRef.current++

      // Check if we've completed a full round
      if (globalTickRef.current >= total) {
        globalTickRef.current = 0
        roundCountRef.current++
        setRoundCount(roundCountRef.current)

        if (cfg.tempoMode === 'tempoChange') {
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

    timerRef.current = window.setTimeout(scheduleNextBeat, 25)
  }, [])

  const start = useCallback(() => {
    const ctx = ensureAudioContext()

    globalTickRef.current = 0
    roundCountRef.current = 1
    tempoChangeDirectionRef.current = 1
    currentBpmRef.current = configRef.current.tempoMode === 'tempoChange'
      ? configRef.current.tempoChange.startBpm
      : configRef.current.bpm
    setCurrentBpmDisplay(currentBpmRef.current)
    setRoundCount(1)
    setCurrentBeat(null)
    setCurrentTickIndex(0)

    isPlayingRef.current = true
    setIsPlaying(true)
    startElapsedTicker()

    // Play first tick immediately
    const firstInfo = getTickInfo(0, configRef.current.measures, configRef.current.beatsPerMeasure)
    const masterGain = masterGainRef.current
    if (firstInfo && masterGain) {
      synthesizeBeat(ctx, masterGain, firstInfo.sound, ctx.currentTime)
      setCurrentBeat({ measure: firstInfo.measureIndex, beat: firstInfo.beatIndex })
      onBeatRef.current?.(firstInfo.measureIndex, firstInfo.beatIndex)

      // Compute interval for next tick
      globalTickRef.current = 1
      const cfg = configRef.current
      const nextInfo = getTickInfo(1, cfg.measures, cfg.beatsPerMeasure)
      let tickDuration = 60 / currentBpmRef.current
      if (nextInfo) {
        const beat = cfg.measures[nextInfo.measureIndex]?.beats[nextInfo.beatIndex]
        const subs = beat?.subdivisions ?? 1
        tickDuration = 60 / (currentBpmRef.current * subs)
      }
      nextBeatTimeRef.current = ctx.currentTime + tickDuration
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
    globalTickRef.current = 0
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
      masterGainRef.current?.disconnect()
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  return {
    isPlaying,
    currentBeat,
    currentTickIndex,
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
