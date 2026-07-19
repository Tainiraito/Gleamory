export const DEFAULT_METRONOME_VOLUME = 0.8
export const METRONOME_VOLUME_STORAGE_KEY = 'gleamory:metronome:volume'

export function normalizeMetronomeVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_METRONOME_VOLUME
  return Math.min(1, Math.max(0, value))
}

export function loadMetronomeVolume(): number {
  try {
    const raw = localStorage.getItem(METRONOME_VOLUME_STORAGE_KEY)
    if (raw === null || raw.trim() === '') return DEFAULT_METRONOME_VOLUME

    const parsed = Number(raw)
    return Number.isFinite(parsed)
      ? normalizeMetronomeVolume(parsed)
      : DEFAULT_METRONOME_VOLUME
  } catch {
    return DEFAULT_METRONOME_VOLUME
  }
}

export function saveMetronomeVolume(volume: number): boolean {
  try {
    localStorage.setItem(
      METRONOME_VOLUME_STORAGE_KEY,
      String(normalizeMetronomeVolume(volume)),
    )
    return true
  } catch {
    return false
  }
}
