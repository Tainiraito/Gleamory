import { useCallback, useEffect, useRef, useState } from 'react'
import { getMidiFromKey, KEYBOARD_PRESETS, DEFAULT_PRESET } from '@/data/pianoNotes'
import { frequencyFromMidi } from '@/utils/music'

const MIN_OCTAVE_OFFSET = -2
const MAX_OCTAVE_OFFSET = 2
const MIDI_MIN = 36 // C2
const MIDI_MAX = 83 // B5

interface UseKeyboardReturn {
  octaveOffset: number
  setOctaveOffset: React.Dispatch<React.SetStateAction<number>>
  activeMidis: Set<number>
}

const useKeyboard = (
  onNoteOn: (midi: number, frequency: number) => void,
  onNoteOff: (midi: number, frequency: number) => void,
  presetId: string = DEFAULT_PRESET,
): UseKeyboardReturn => {
  const presetRef = useRef(presetId)
  useEffect(() => { presetRef.current = presetId }, [presetId])

  const [octaveOffset, setOctaveOffset] = useState(0)
  const octaveOffsetRef = useRef(octaveOffset)
  const activeMidisRef = useRef<Set<number>>(new Set())
  const [activeMidis, setActiveMidis] = useState<Set<number>>(new Set())

  const onNoteOnRef = useRef(onNoteOn)
  const onNoteOffRef = useRef(onNoteOff)

  useEffect(() => {
    onNoteOnRef.current = onNoteOn
    onNoteOffRef.current = onNoteOff
  })

  useEffect(() => {
    octaveOffsetRef.current = octaveOffset
  }, [octaveOffset])

  const releaseAll = useCallback(() => {
    activeMidisRef.current.forEach((midi) => {
      onNoteOffRef.current(midi, frequencyFromMidi(midi))
    })
    activeMidisRef.current.clear()
    setActiveMidis(new Set())
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      // Octave switching (no note triggered)
      if (key === 'z') {
        setOctaveOffset((prev) => Math.max(MIN_OCTAVE_OFFSET, prev - 1))
        return
      }
      if (key === 'x') {
        setOctaveOffset((prev) => Math.min(MAX_OCTAVE_OFFSET, prev + 1))
        return
      }

      // Build playable key set from current preset
      const preset = KEYBOARD_PRESETS[presetRef.current]
      if (!preset) return
      const playableKeys = new Set(preset.map.map((k) => k.key))

      if (!playableKeys.has(key)) return

      const midi = getMidiFromKey(key, octaveOffsetRef.current, presetRef.current)
      if (midi == null || midi < MIDI_MIN || midi > MIDI_MAX) return

      // Prevent duplicate triggers for held keys
      if (activeMidisRef.current.has(midi)) return

      activeMidisRef.current.add(midi)
      setActiveMidis(new Set(activeMidisRef.current))

      onNoteOnRef.current(midi, frequencyFromMidi(midi))
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()

      const preset = KEYBOARD_PRESETS[presetRef.current]
      if (!preset) return
      const playableKeys = new Set(preset.map.map((k) => k.key))

      if (!playableKeys.has(key)) return

      const midi = getMidiFromKey(key, octaveOffsetRef.current, presetRef.current)
      if (midi == null || midi < MIDI_MIN || midi > MIDI_MAX) return

      activeMidisRef.current.delete(midi)
      setActiveMidis(new Set(activeMidisRef.current))

      onNoteOffRef.current(midi, frequencyFromMidi(midi))
    }

    const handleBlur = () => {
      releaseAll()
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', handleBlur)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', handleBlur)
      releaseAll()
    }
  }, [releaseAll])

  return {
    octaveOffset,
    setOctaveOffset,
    activeMidis,
  }
}

export default useKeyboard
