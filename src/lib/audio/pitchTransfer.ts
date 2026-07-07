export type PitchSource = 'microphone' | 'display-audio' | 'upload' | 'separator-result'

export interface PitchTransferMetadata {
  fileName: string
  source: PitchSource
}

export interface PitchTransferPayload {
  blob: Blob
  metadata: PitchTransferMetadata
}

const transfers = new Map<string, PitchTransferPayload>()

export function createPitchTransfer(blob: Blob, metadata: PitchTransferMetadata): string {
  const id = crypto.randomUUID()
  transfers.set(id, { blob, metadata })
  return id
}

export function consumePitchTransfer(id: string): PitchTransferPayload | null {
  const payload = transfers.get(id) ?? null
  transfers.delete(id)
  return payload
}
