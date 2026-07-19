import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultConfig } from '@/types/metronome'
import { useMetronome } from './useMetronome'

const createAudioParam = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  setTargetAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
})

function installAudioContextMock() {
  const gains: Array<{
    gain: ReturnType<typeof createAudioParam>
    connect: ReturnType<typeof vi.fn>
    disconnect: ReturnType<typeof vi.fn>
  }> = []
  const close = vi.fn().mockResolvedValue(undefined)

  class MockAudioContext {
    currentTime = 0
    destination = {}
    sampleRate = 48_000
    state: AudioContextState = 'running'
    resume = vi.fn()
    close = close

    createGain() {
      const gain = {
        gain: createAudioParam(),
        connect: vi.fn(),
        disconnect: vi.fn(),
      }
      gains.push(gain)
      return gain
    }

    createOscillator() {
      return {
        type: 'sine',
        frequency: createAudioParam(),
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
    }

    createBuffer(channels: number, length: number) {
      return {
        numberOfChannels: channels,
        length,
        getChannelData: () => new Float32Array(length),
      }
    }

    createBufferSource() {
      return {
        buffer: null,
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }
    }

    createBiquadFilter() {
      return {
        type: 'highpass',
        frequency: createAudioParam(),
        connect: vi.fn(),
      }
    }
  }

  vi.stubGlobal('AudioContext', MockAudioContext)
  return { gains, close }
}

describe('useMetronome volume', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('creates the shared master gain only after user interaction and updates it live', () => {
    const { gains, close } = installAudioContextMock()
    const config = createDefaultConfig()
    const hook = renderHook(
      ({ volume }) => useMetronome({ config, volume }),
      { initialProps: { volume: 0.8 } },
    )

    expect(gains).toHaveLength(0)

    act(() => hook.result.current.playBeatSound('click'))

    const masterGain = gains[0]
    expect(masterGain.gain.setValueAtTime).toHaveBeenCalledWith(0.8, 0)
    expect(masterGain.connect).toHaveBeenCalledOnce()
    expect(gains[1].gain.setValueAtTime).toHaveBeenCalledWith(1, 0)

    hook.rerender({ volume: 0.25 })
    expect(masterGain.gain.cancelScheduledValues).toHaveBeenCalledWith(0)
    expect(masterGain.gain.setTargetAtTime).toHaveBeenCalledWith(0.25, 0, 0.01)

    hook.unmount()
    expect(masterGain.disconnect).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
  })

  it('keeps the main beat and subdivision intensity at a 2:1 ratio', () => {
    vi.useFakeTimers()
    const { gains } = installAudioContextMock()
    const config = createDefaultConfig()
    config.bpm = 300
    config.measures[0].beats[0].subdivisions = 4

    const hook = renderHook(() => useMetronome({ config, volume: 0.8 }))
    act(() => hook.result.current.start())

    // Gain 0 is the shared master. Each synthesized tonal beat adds a beat gain
    // followed by an oscillator envelope gain.
    expect(gains[1].gain.setValueAtTime).toHaveBeenCalledWith(1, 0)
    expect(gains[3].gain.setValueAtTime).toHaveBeenCalledWith(0.5, 0.05)

    act(() => hook.result.current.stop())
    hook.unmount()
  })
})
