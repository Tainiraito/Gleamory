import { useCallback, useRef, useState, useEffect } from 'react'

export type SynthTone = 'piano' | 'organ' | 'warm' | 'vibes'

interface ActiveNote {
  nodes: OscillatorNode[]
  gain: GainNode
}

interface UsePianoAudioReturn {
  playNote: (frequency: number) => void
  stopNote: (frequency: number) => void
  setTone: (tone: SynthTone) => void
  currentTone: SynthTone
  sustain: boolean
  toggleSustain: () => void
  setSustainPedal: (pressed: boolean) => void
  releaseAll: () => void
}

export const usePianoAudio = (): UsePianoAudioReturn => {
  const ctxRef = useRef<AudioContext | null>(null)
  const activeNotesRef = useRef<Map<number, ActiveNote>>(new Map())
  const toneRef = useRef<SynthTone>('piano')
  const [currentTone, setCurrentTone] = useState<SynthTone>('piano')
  const [sustainToggle, setSustainToggle] = useState(false)
  const pedalRef = useRef(false) // space bar pedal (latch-free)

  /** Effective sustain: toggle XOR pedal */
  const [sustain, setSustain] = useState(false)

  // Recompute effective sustain when either toggle or pedal changes
  const updateEffectiveSustain = useCallback(() => {
    const effective = sustainToggle !== pedalRef.current
    setSustain(effective)
  }, [sustainToggle])

  useEffect(() => {
    updateEffectiveSustain()
  }, [sustainToggle, updateEffectiveSustain])

  const getContext = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  /** Create oscillator bank for a given frequency and tone type */
  const createOscillators = (ctx: AudioContext, frequency: number, tone: SynthTone, isSustain: boolean) => {
    const gain = ctx.createGain()
    const now = ctx.currentTime
    const oscs: OscillatorNode[] = []
    let totalDuration = 0.8 // default fallback

    switch (tone) {
      case 'piano': {
        const osc1 = ctx.createOscillator()
        osc1.type = 'triangle'
        osc1.frequency.setValueAtTime(frequency, now)

        const osc2 = ctx.createOscillator()
        osc2.type = 'sine'
        osc2.frequency.setValueAtTime(frequency * 2, now)
        osc2.detune.value = 3

        osc1.connect(gain)
        osc2.connect(gain)
        oscs.push(osc1, osc2)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.6, now + 0.003)
        gain.gain.exponentialRampToValueAtTime(0.15, now + 0.08)
        if (isSustain) {
          gain.gain.exponentialRampToValueAtTime(0.001, now + 3.0)
          totalDuration = 3.2
        } else {
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8)
          totalDuration = 1.0
        }
        break
      }
      case 'organ': {
        const harmonics = [1, 2, 3, 4, 6]
        const levels = [0.4, 0.25, 0.15, 0.1, 0.05]
        harmonics.forEach((h, i) => {
          const osc = ctx.createOscillator()
          osc.type = 'sawtooth'
          osc.frequency.setValueAtTime(frequency * h, now)
          osc.detune.value = 2
          const subGain = ctx.createGain()
          subGain.gain.value = levels[i]
          osc.connect(subGain)
          subGain.connect(gain)
          oscs.push(osc)
        })
        if (isSustain) {
          gain.gain.setValueAtTime(0.35, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 4.0)
          totalDuration = 4.2
        } else {
          gain.gain.setValueAtTime(0.35, now)
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.0)
          totalDuration = 1.2
        }
        break
      }
      case 'warm': {
        for (let i = -1; i <= 1; i++) {
          const osc = ctx.createOscillator()
          osc.type = i === 0 ? 'triangle' : 'sine'
          osc.frequency.setValueAtTime(frequency, now)
          osc.detune.value = i * 8
          const subGain = ctx.createGain()
          subGain.gain.value = i === 0 ? 0.5 : 0.15
          osc.connect(subGain)
          subGain.connect(gain)
          oscs.push(osc)
        }
        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.35, now + 0.05)
        if (isSustain) {
          gain.gain.exponentialRampToValueAtTime(0.001, now + 3.5)
          totalDuration = 3.7
        } else {
          gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2)
          totalDuration = 1.4
        }
        break
      }
      case 'vibes': {
        const osc1 = ctx.createOscillator()
        osc1.type = 'sine'
        osc1.frequency.setValueAtTime(frequency, now)

        const osc2 = ctx.createOscillator()
        osc2.type = 'triangle'
        osc2.frequency.setValueAtTime(frequency * 4.01, now)
        osc2.detune.value = 5
        const subGain = ctx.createGain()
        subGain.gain.value = 0.15

        osc2.connect(subGain)
        osc1.connect(gain)
        subGain.connect(gain)
        oscs.push(osc1, osc2)

        gain.gain.setValueAtTime(0, now)
        gain.gain.linearRampToValueAtTime(0.5, now + 0.002)
        if (isSustain) {
          gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5)
          totalDuration = 2.7
        } else {
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5)
          totalDuration = 0.7
        }
        break
      }
    }

    return { oscs, gain, totalDuration }
  }

  const playNote = useCallback(
    (frequency: number): void => {
      const ctx = getContext()
      const activeNotes = activeNotesRef.current

      // Always allow retrigger: if same frequency is already playing,
      // force-stop the old one first, then play a new one
      if (activeNotes.has(frequency)) {
        const existing = activeNotes.get(frequency)
        if (existing) {
          const now = ctx.currentTime
          existing.gain.gain.cancelScheduledValues(now)
          existing.gain.gain.setValueAtTime(existing.gain.gain.value, now)
          existing.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)
          existing.nodes.forEach((osc) => {
            try { osc.stop(now + 0.05) } catch { /* already has scheduled stop */ }
          })
        }
        activeNotes.delete(frequency)
      }

      const tone = toneRef.current
      const needSustain = sustainToggle !== pedalRef.current
      const { oscs, gain, totalDuration } = createOscillators(ctx, frequency, tone, needSustain)

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = tone === 'piano' ? 4000 : 5000

      gain.connect(filter)
      filter.connect(ctx.destination)

      oscs.forEach((osc) => osc.start(ctx.currentTime))

      // Schedule oscillator stop after ADSR decay completes (so browser releases audio indicator)
      const stopTime = ctx.currentTime + totalDuration
      oscs.forEach((osc) => osc.stop(stopTime))

      activeNotes.set(frequency, { nodes: oscs, gain })
    },
    [getContext, sustainToggle],
  )

  const stopNote = useCallback(
    (frequency: number): void => {
      const activeNotes = activeNotesRef.current
      const note = activeNotes.get(frequency)
      if (!note) return
      // Just clean up the map entry — the ADSR envelope handles the audio fade
      activeNotes.delete(frequency)
    },
    [],
  )

  const releaseAll = useCallback(() => {
    const activeNotes = activeNotesRef.current
    const ctx = ctxRef.current
    if (!ctx) {
      activeNotes.clear()
      return
    }
    const now = ctx.currentTime
    activeNotes.forEach((note) => {
      note.gain.gain.cancelScheduledValues(now)
      note.gain.gain.setValueAtTime(note.gain.gain.value, now)
      note.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)
      note.nodes.forEach((osc) => {
        try { osc.stop(now + 0.3) } catch { /* already has scheduled stop */ }
      })
    })
    activeNotes.clear()
  }, [])

  useEffect(() => {
    const activeNotes = activeNotesRef.current

    return () => {
      releaseAll()

      const ctx = ctxRef.current
      if (ctx && ctx.state !== 'closed') {
        void ctx.close()
      }
      ctxRef.current = null
      activeNotes.clear()
    }
  }, [releaseAll])

  return {
    playNote,
    stopNote,
    setTone: (tone: SynthTone) => { toneRef.current = tone; setCurrentTone(tone) },
    currentTone,
    sustain,
    toggleSustain: () => setSustainToggle((prev) => !prev),
    setSustainPedal: (pressed: boolean) => {
      pedalRef.current = pressed
      updateEffectiveSustain()
    },
    releaseAll,
  }
}
