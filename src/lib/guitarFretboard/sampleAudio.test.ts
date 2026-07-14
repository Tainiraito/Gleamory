import { describe, expect, it } from 'vitest'
import { buildSampleUrl, findNearestSample, getPlaybackRate, hasRequiredSamples } from './sampleAudio'

const manifest = {
  sourceName: 'University of Iowa Musical Instrument Samples - Guitar',
  sourceUrl: 'https://theremin.music.uiowa.edu/MISguitar.html',
  licenseSummary: 'Free to use in any projects with no restrictions, per source page.',
  samples: [
    { midiNumber: 40, noteName: 'E2', file: 'midi-40.ogg' },
    { midiNumber: 45, noteName: 'A2', file: 'midi-45.ogg' },
    { midiNumber: 52, noteName: 'E3', file: 'midi-52.ogg' },
  ],
} as const

describe('guitar sample audio helpers', () => {
  it('chooses the nearest available sample for a target midi note', () => {
    expect(findNearestSample(manifest, 43)).toMatchObject({ midiNumber: 45, file: 'midi-45.ogg' })
    expect(findNearestSample(manifest, 39)).toMatchObject({ midiNumber: 40, file: 'midi-40.ogg' })
  })

  it('calculates playback rate from semitone distance', () => {
    expect(getPlaybackRate(45, 45)).toBeCloseTo(1, 6)
    expect(getPlaybackRate(47, 45)).toBeCloseTo(Math.pow(2, 2 / 12), 6)
  })

  it('builds public sample urls and validates coverage', () => {
    expect(buildSampleUrl('/audio/guitar-samples/acoustic', manifest.samples[0])).toBe('/audio/guitar-samples/acoustic/midi-40.ogg')
    expect(hasRequiredSamples(manifest, 40, 52)).toBe(true)
    expect(hasRequiredSamples(manifest, 38, 88)).toBe(false)
  })
})
