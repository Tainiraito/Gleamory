import type { GuitarSample, GuitarSampleManifest } from './types'

export function findNearestSample(manifest: GuitarSampleManifest, targetMidi: number): GuitarSample | null {
  if (manifest.samples.length === 0) return null

  return manifest.samples.reduce((nearest, sample) => {
    const currentDistance = Math.abs(sample.midiNumber - targetMidi)
    const nearestDistance = Math.abs(nearest.midiNumber - targetMidi)
    return currentDistance < nearestDistance ? sample : nearest
  }, manifest.samples[0]!)
}

export function getPlaybackRate(targetMidi: number, sampleMidi: number): number {
  return Math.pow(2, (targetMidi - sampleMidi) / 12)
}

export function buildSampleUrl(basePath: string, sample: Pick<GuitarSample, 'file'>): string {
  return `${basePath.replace(/\/$/, '')}/${sample.file}`
}

export function hasRequiredSamples(manifest: GuitarSampleManifest, minMidi: number, maxMidi: number): boolean {
  if (manifest.samples.length === 0) return false

  const midiNumbers = manifest.samples.map((sample) => sample.midiNumber)
  return Math.min(...midiNumbers) <= minMidi && Math.max(...midiNumbers) >= maxMidi
}
