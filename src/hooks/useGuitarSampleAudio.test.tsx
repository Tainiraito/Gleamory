import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGuitarSampleAudio } from './useGuitarSampleAudio'

const createAudioParam = () => ({
  value: 1,
  setValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
})

describe('useGuitarSampleAudio', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('stops active playback and releases Web Audio resources on unmount', async () => {
    const stop = vi.fn()
    const sourceDisconnect = vi.fn()
    const gainDisconnect = vi.fn()
    const close = vi.fn().mockResolvedValue(undefined)
    const decodeAudioData = vi.fn().mockResolvedValue({})

    class MockAudioContext {
      currentTime = 0
      destination = {}
      state: AudioContextState = 'running'
      resume = vi.fn()
      close = close
      decodeAudioData = decodeAudioData
      createBufferSource = () => ({
        buffer: null,
        playbackRate: { value: 1 },
        connect: vi.fn(),
        disconnect: sourceDisconnect,
        start: vi.fn(),
        stop,
        onended: null,
      })
      createGain = () => ({
        gain: createAudioParam(),
        connect: vi.fn(),
        disconnect: gainDisconnect,
      })
    }

    vi.stubGlobal('AudioContext', MockAudioContext)
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sourceName: 'test', sourceUrl: '', licenseSummary: '', samples: [{ midiNumber: 40, noteName: 'E2', file: 'E2.ogg' }] }) })
      .mockResolvedValueOnce({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }))

    const hook = renderHook(() => useGuitarSampleAudio())
    await act(async () => hook.result.current.playPosition({
      stringNumber: 6,
      fretNumber: 0,
      noteName: 'E',
      displayNoteName: 'E',
      noteWithOctave: 'E2',
      midiNumber: 40,
      frequency: 82.41,
    }))
    hook.unmount()

    expect(stop).toHaveBeenCalled()
    expect(sourceDisconnect).toHaveBeenCalled()
    expect(gainDisconnect).toHaveBeenCalled()
    expect(close).toHaveBeenCalledOnce()
  })
})
