import { describe, expect, it } from 'vitest'
import { analyzePitchTrack, detectPitch } from './pitch'

function sineWave(frequency: number, sampleRate: number, durationSeconds: number, amplitude = 0.8): Float32Array {
  const length = Math.round(sampleRate * durationSeconds)
  const samples = new Float32Array(length)
  for (let i = 0; i < length; i++) {
    samples[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate)
  }
  return samples
}

describe('detectPitch', () => {
  it('detects A4 from a clean mono frame', () => {
    const sampleRate = 44_100
    const frame = sineWave(440, sampleRate, 0.08)

    const result = detectPitch(frame, sampleRate)

    expect(result.isVoiced).toBe(true)
    expect(result.frequencyHz).toBeCloseTo(440, 0)
    expect(result.midi).toBe(69)
    expect(result.noteName).toBe('A4')
    expect(result.confidence).toBeGreaterThan(0.8)
  })

  it('rejects silence as unvoiced audio', () => {
    const result = detectPitch(new Float32Array(4096), 44_100)

    expect(result.isVoiced).toBe(false)
    expect(result.frequencyHz).toBeNull()
    expect(result.noteName).toBeNull()
    expect(result.confidence).toBe(0)
  })
})

describe('analyzePitchTrack', () => {
  it('generates timestamped pitch frames for uploaded audio', () => {
    const sampleRate = 44_100
    const samples = sineWave(261.63, sampleRate, 0.5)

    const track = analyzePitchTrack(samples, sampleRate, {
      frameSize: 2048,
      hopSize: 1024,
    })

    expect(track.length).toBeGreaterThan(10)
    expect(track[0]?.time).toBe(0)
    expect(track[1]?.time).toBeCloseTo(1024 / sampleRate, 6)
    expect(track.filter((point) => point.isVoiced).length).toBeGreaterThan(8)
    expect(track.find((point) => point.isVoiced)?.noteName).toBe('C4')
  })
})
