import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePianoAudio } from './usePianoAudio'

const createAudioParam = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  linearRampToValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn(),
})

describe('usePianoAudio', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('卸载时关闭音频上下文且不创建空转定时器', () => {
    const close = vi.fn().mockResolvedValue(undefined)
    const setIntervalSpy = vi.spyOn(window, 'setInterval')

    class MockAudioContext {
      currentTime = 0
      destination = {}
      state: AudioContextState = 'running'

      createGain() {
        return {
          gain: createAudioParam(),
          connect: vi.fn(),
        }
      }

      createOscillator() {
        return {
          type: 'sine',
          frequency: createAudioParam(),
          detune: { value: 0 },
          connect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
        }
      }

      createBiquadFilter() {
        return {
          type: 'lowpass',
          frequency: { value: 0 },
          connect: vi.fn(),
        }
      }

      resume = vi.fn()
      close = close
    }

    vi.stubGlobal('AudioContext', MockAudioContext)

    const hook = renderHook(() => usePianoAudio())
    act(() => hook.result.current.playNote(440))
    hook.unmount()

    expect(close).toHaveBeenCalledOnce()
    expect(setIntervalSpy).not.toHaveBeenCalled()
  })
})
