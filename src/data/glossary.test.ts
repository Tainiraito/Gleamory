import { describe, expect, it } from 'vitest'
import { tokenizeGlossaryText } from './glossary'

describe('tokenizeGlossaryText', () => {
  it('keeps plain text and marks the longest matching glossary term', () => {
    expect(tokenizeGlossaryText('找出 C 上方纯五度')).toEqual([
      { type: 'text', value: '找出 C 上方' },
      { type: 'term', value: '纯五度', termId: 'perfect-fifth' },
    ])
  })

  it('recognizes several terms without losing punctuation', () => {
    expect(tokenizeGlossaryText('根音、音程和音级')).toEqual([
      { type: 'term', value: '根音', termId: 'root-note' },
      { type: 'text', value: '、' },
      { type: 'term', value: '音程', termId: 'interval' },
      { type: 'text', value: '和' },
      { type: 'term', value: '音级', termId: 'scale-degree' },
    ])
  })
})
