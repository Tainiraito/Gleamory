import { describe, expect, it } from 'vitest'
import { getStemSelectionBadge, getUploadSurface } from './separatorViewState'

describe('audio separator view state', () => {
  it('returns to the upload surface after processing completes', () => {
    expect(getUploadSurface('done', true)).toBe('upload')
  })

  it('keeps selected-file errors on the retry surface', () => {
    expect(getUploadSurface('error', true)).toBe('error')
  })

  it('does not show a badge for unselected stems', () => {
    expect(getStemSelectionBadge(false)).toBeNull()
  })

  it('shows only the selected badge when a stem is selected', () => {
    expect(getStemSelectionBadge(true)).toBe('已选择')
  })
})
