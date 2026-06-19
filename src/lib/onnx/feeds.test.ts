import { describe, expect, it } from 'vitest'
import { createFeeds } from './feeds'

describe('createFeeds', () => {
  it('uses the first ONNX session input name', () => {
    const tensor = { data: new Float32Array([1]) }
    const feeds = createFeeds({ inputNames: ['x'] }, tensor)

    expect(feeds).toEqual({ x: tensor })
  })

  it('falls back to the Spleeter input name when session metadata is unavailable', () => {
    const tensor = { data: new Float32Array([1]) }
    const feeds = createFeeds({}, tensor)

    expect(feeds).toEqual({ x: tensor })
  })
})
