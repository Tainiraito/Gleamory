import { describe, expect, it } from 'vitest'
import type { Update } from '@/types'
import { sortUpdatesByDateDesc } from './timeline'

const createUpdate = (id: string, date: string): Update => ({
  id,
  projectId: 'gleamory',
  content: id,
  date,
})

describe('sortUpdatesByDateDesc', () => {
  it('按日期降序排列且不修改原数组', () => {
    const input = [
      createUpdate('old', '2026-01-01'),
      createUpdate('new', '2026-06-01'),
      createUpdate('middle', '2026-03-01'),
    ]

    expect(sortUpdatesByDateDesc(input).map((item) => item.id)).toEqual([
      'new',
      'middle',
      'old',
    ])
    expect(input.map((item) => item.id)).toEqual(['old', 'new', 'middle'])
  })

  it('无效日期排在最后并保持原始顺序', () => {
    const input = [
      createUpdate('invalid-a', '-'),
      createUpdate('invalid-b', 'invalid'),
      createUpdate('valid', '2026-06-01'),
    ]

    expect(sortUpdatesByDateDesc(input).map((item) => item.id)).toEqual([
      'valid',
      'invalid-a',
      'invalid-b',
    ])
  })
})
