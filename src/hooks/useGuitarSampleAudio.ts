import { useCallback, useRef, useState } from 'react'
import { buildSampleUrl, findNearestSample, getPlaybackRate } from '@/lib/guitarFretboard/sampleAudio'
import type { FretPosition, GuitarSampleManifest } from '@/lib/guitarFretboard/types'

const SAMPLE_BASE_PATH = '/audio/guitar-samples/acoustic'

interface UseGuitarSampleAudioReturn {
  status: 'idle' | 'ready' | 'missing' | 'error'
  message: string
  playPosition: (position: FretPosition) => Promise<void>
}

export function useGuitarSampleAudio(): UseGuitarSampleAudioReturn {
  const audioContextRef = useRef<AudioContext | null>(null)
  const manifestRef = useRef<GuitarSampleManifest | null>(null)
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map())
  const activeGainRef = useRef<GainNode | null>(null)
  const [status, setStatus] = useState<UseGuitarSampleAudioReturn['status']>('idle')
  const [message, setMessage] = useState('吉他采样音色将在首次点击时加载')

  const getAudioContext = useCallback((): AudioContext => {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextCtor()
    }
    if (audioContextRef.current.state === 'suspended') {
      void audioContextRef.current.resume()
    }
    return audioContextRef.current
  }, [])

  const loadManifest = useCallback(async (): Promise<GuitarSampleManifest> => {
    if (manifestRef.current) return manifestRef.current

    const response = await fetch(`${SAMPLE_BASE_PATH}/manifest.json`)
    if (!response.ok) {
      setStatus('missing')
      setMessage('采样包未安装')
      throw new Error('采样包未安装')
    }

    const manifest = (await response.json()) as GuitarSampleManifest
    manifestRef.current = manifest
    setStatus('ready')
    setMessage(manifest.sourceName)
    return manifest
  }, [])

  const loadBuffer = useCallback(
    async (url: string): Promise<AudioBuffer> => {
      const cached = bufferCacheRef.current.get(url)
      if (cached) return cached

      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`采样文件加载失败: ${url}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const decoded = await getAudioContext().decodeAudioData(arrayBuffer.slice(0))
      bufferCacheRef.current.set(url, decoded)
      return decoded
    },
    [getAudioContext],
  )

  const playPosition = useCallback(
    async (position: FretPosition): Promise<void> => {
      try {
        const manifest = await loadManifest()
        const sample = findNearestSample(manifest, position.midiNumber)
        if (!sample) {
          setStatus('missing')
          setMessage('采样包未安装')
          return
        }

        const ctx = getAudioContext()
        const buffer = await loadBuffer(buildSampleUrl(SAMPLE_BASE_PATH, sample))
        const source = ctx.createBufferSource()
        const gain = ctx.createGain()
        const now = ctx.currentTime

        if (activeGainRef.current) {
          activeGainRef.current.gain.cancelScheduledValues(now)
          activeGainRef.current.gain.setValueAtTime(activeGainRef.current.gain.value, now)
          activeGainRef.current.gain.exponentialRampToValueAtTime(0.001, now + 0.04)
        }

        gain.gain.setValueAtTime(0.0001, now)
        gain.gain.exponentialRampToValueAtTime(0.9, now + 0.012)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.35)
        activeGainRef.current = gain

        source.buffer = buffer
        source.playbackRate.value = getPlaybackRate(position.midiNumber, sample.midiNumber)
        source.connect(gain)
        gain.connect(ctx.destination)
        source.start(now)
        source.stop(now + 1.45)
      } catch (error) {
        setStatus('error')
        setMessage(error instanceof Error ? error.message : '吉他采样播放失败')
      }
    },
    [getAudioContext, loadBuffer, loadManifest],
  )

  return { status, message, playPosition }
}
