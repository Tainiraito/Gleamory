import { useState, useCallback, useMemo, useEffect } from 'react'
import SiteHeader from '@/components/SiteHeader'
import { ProjectPageHeader } from '@/components/ProjectPageHeader'
import Piano from '@/components/piano/Piano'
import { ALL_NOTES, getPlayableNotes, KEYBOARD_PRESETS, DEFAULT_PRESET } from '@/data/pianoNotes'
import { usePianoAudio, type SynthTone } from '@/hooks/usePianoAudio'
import useKeyboard from '@/hooks/useKeyboard'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import BackFooter from '@/components/BackFooter'
import { getProjectById } from '@/utils/projectData'

const TONES: { id: SynthTone; label: string }[] = [
  { id: 'piano', label: '钢琴' },
  { id: 'organ', label: '风琴' },
  { id: 'warm', label: '暖音' },
  { id: 'vibes', label: '电颤' },
]

const noteFromMidi = (midi: number) => ALL_NOTES.find((n) => n.midiNumber === midi)

const PianoPage = () => {
  useDocumentTitle('极简钢琴 | Gleamory 微光集')
  const project = getProjectById('web-piano')!
  const { playNote, stopNote, setTone, toggleSustain, sustain, setSustainPedal } = usePianoAudio()
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set())
  const [activeTone, setActiveTone] = useState<SynthTone>('piano')
  const [showKeyHints, setShowKeyHints] = useState(false)
  const [presetId, setPresetId] = useState(DEFAULT_PRESET)

  const handleKeyNoteOn = useCallback(
    (midi: number, freq: number) => {
      playNote(freq)
      setPressedKeys((prev) => new Set(prev).add(midi))
    },
    [playNote],
  )

  const handleKeyNoteOff = useCallback(
    (midi: number, freq: number) => {
      stopNote(freq)
      setPressedKeys((prev) => {
        const next = new Set(prev)
        next.delete(midi)
        return next
      })
    },
    [stopNote],
  )

  const { octaveOffset, setOctaveOffset } = useKeyboard(handleKeyNoteOn, handleKeyNoteOff, presetId)

  // Mouse events for Piano component
  const handleNoteOn = useCallback(
    (midi: number) => {
      const note = noteFromMidi(midi)
      if (!note) return
      playNote(note.frequency)
      setPressedKeys((prev) => new Set(prev).add(midi))
    },
    [playNote],
  )

  const handleNoteOff = useCallback(
    (midi: number) => {
      const note = noteFromMidi(midi)
      if (!note) return
      stopNote(note.frequency)
      setPressedKeys((prev) => {
        const next = new Set(prev)
        next.delete(midi)
        return next
      })
    },
    [stopNote],
  )

  // Current playable octave range display
  const octaveRange = useMemo(() => {
    const notes = getPlayableNotes(octaveOffset, presetId)
    if (notes.length === 0) return '--'
    return `${notes[0].note} - ${notes[notes.length - 1].note}`
  }, [octaveOffset, presetId])

  const handleToneChange = (tone: SynthTone) => {
    setTone(tone)
    setActiveTone(tone)
  }

  // Dynamic key hint labels for current preset
  const { whiteKeysHint, blackKeysHint } = useMemo(() => {
    const preset = KEYBOARD_PRESETS[presetId]
    if (!preset) return { whiteKeysHint: [], blackKeysHint: [] }
    const white: string[] = []
    const black: string[] = []
    const displayMap: Record<string, string> = { '-': '－', '=': '＝', ';': '；', '[': '[', ']': ']' }
    preset.map.forEach((k) => {
      const label = displayMap[k.key] ?? k.key.toUpperCase()
      const isBlackKey = [1, 3, 6, 8, 10, 13, 15, 18, 20].includes(k.semitoneOffset)
      if (isBlackKey) {
        black.push(label)
      } else {
        white.push(label)
      }
    })
    return { whiteKeysHint: white, blackKeysHint: black }
  }, [presetId])

  // Space bar sustain pedal — press to sustain, release to stop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault()
        setSustainPedal(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setSustainPedal(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [setSustainPedal])

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

<main className="px-6 sm:px-[15%] py-20 sm:py-24">
        <ProjectPageHeader
          name={project.name}
          englishName="Mini Piano"
          description={project.description}
          version={project.version.replace(/^v/, '')}
        />

        {/* Tone selector + sustain toggle */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-1">
            {TONES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleToneChange(t.id)}
                className="px-3 py-1 text-sm transition-all cursor-pointer"
                style={{
                  color: activeTone === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: `0.5px solid ${activeTone === t.id ? 'var(--accent-amber)' : 'var(--border-line)'}`,
                  background: activeTone === t.id ? 'var(--accent-glow)' : 'transparent',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleSustain}
            className="px-3 py-1 text-sm transition-all cursor-pointer"
            style={{
              color: sustain ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `0.5px solid ${sustain ? 'var(--accent-amber)' : 'var(--border-line)'}`,
              background: sustain ? 'var(--accent-glow)' : 'transparent',
            }}
          >
            {sustain ? '延音 开' : '延音 关'}
          </button>

          <button
            type="button"
            onClick={() => setShowKeyHints((prev) => !prev)}
            className="px-3 py-1 text-sm transition-all cursor-pointer"
            style={{
              color: showKeyHints ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `0.5px solid ${showKeyHints ? 'var(--accent-amber)' : 'var(--border-line)'}`,
              background: showKeyHints ? 'var(--accent-glow)' : 'transparent',
            }}
          >
            {showKeyHints ? '键位 开' : '键位 关'}
          </button>
        </div>

        {/* Piano */}
        <Piano onNoteOn={handleNoteOn} onNoteOff={handleNoteOff} pressedKeys={pressedKeys} octaveOffset={octaveOffset} showKeyHints={showKeyHints} presetId={presetId} />

        {/* Controls + keyboard hints (below piano) */}
        <div className="mt-8 flex flex-col items-center gap-4">
          {/* Octave controls */}
          <div className="flex items-center gap-4">
            <span className="text-sm font-mono" style={{ color: 'var(--text-muted)' }}>
              {octaveRange}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setOctaveOffset((prev) => Math.max(-2, prev - 1))}
                className="px-3 py-1 text-sm transition-all cursor-pointer hover:opacity-70"
                style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
              >
                &larr; 降八度
              </button>
              <button
                type="button"
                onClick={() => setOctaveOffset((prev) => Math.min(2, prev + 1))}
                className="px-3 py-1 text-sm transition-all cursor-pointer hover:opacity-70"
                style={{ color: 'var(--text-muted)', border: '0.5px solid var(--border-line)' }}
              >
                升八度 &rarr;
              </button>
            </div>
          </div>

          {/* Keyboard hints */}
          <div className="text-center">
            <p className="text-xs leading-loose" style={{ color: 'var(--text-muted)' }}>
              <span className="inline-block mr-2">白键:</span>
              {whiteKeysHint.map((k) => (
                <kbd
                  key={k}
                  className="px-1.5 py-0.5 mx-0.5 rounded-sm font-mono text-[0.6rem]"
                  style={{ background: 'var(--accent-glow)', color: 'var(--text-secondary)' }}
                >
                  {k}
                </kbd>
              ))}
            </p>
            <p className="text-xs leading-loose" style={{ color: 'var(--text-muted)' }}>
              <span className="inline-block mr-2">黑键:</span>
              {blackKeysHint.map((k) => (
                <kbd
                  key={k}
                  className="px-1.5 py-0.5 mx-0.5 rounded-sm font-mono text-[0.6rem]"
                  style={{ background: 'var(--accent-glow)', color: 'var(--text-secondary)' }}
                >
                  {k}
                </kbd>
              ))}
            </p>
            <p className="text-xs leading-loose" style={{ color: 'var(--text-muted)' }}>
              <span className="inline-block mr-2">八度:</span>
              <kbd
                className="px-1.5 py-0.5 mx-0.5 rounded-sm font-mono text-[0.6rem]"
                style={{ background: 'var(--accent-glow)', color: 'var(--text-secondary)' }}
              >
                Z
              </kbd>
              降
              <kbd
                className="px-1.5 py-0.5 mx-0.5 rounded-sm font-mono text-[0.6rem]"
                style={{ background: 'var(--accent-glow)', color: 'var(--text-secondary)' }}
              >
                X
              </kbd>
              升
            </p>
            {/* Keyboard preset selector */}
            <div className="flex items-center gap-1 justify-center">
              {Object.entries(KEYBOARD_PRESETS).map(([id, preset]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPresetId(id)}
                  className="px-2 py-1 text-xs transition-all cursor-pointer"
                  style={{
                    color: presetId === id ? 'var(--text-primary)' : 'var(--text-muted)',
                    border: `0.5px solid ${presetId === id ? 'var(--accent-amber)' : 'var(--border-line)'}`,
                    background: presetId === id ? 'var(--accent-glow)' : 'transparent',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      <BackFooter as="a" />
    </div>
  )
}

export default PianoPage
