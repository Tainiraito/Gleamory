import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fisherYatesShuffle,
  deduplicateByName,
  parseEntryText,
  getEntryProbability,
  drawUnique,
  drawRepeat,
  computeModeSwitch,
  loadState,
  saveState,
  STORAGE_KEY,
  type Entry,
  type GachaState,
} from './gacha'

// ==================== fisherYatesShuffle ====================
describe('fisherYatesShuffle', () => {
  it('preserves all elements (same length, same items)', () => {
    const original = [1, 2, 3, 4, 5]
    const shuffled = fisherYatesShuffle(original)
    expect(shuffled).toHaveLength(original.length)
    expect(shuffled.sort()).toEqual([...original].sort())
  })

  it('does not mutate the original array', () => {
    const original = [1, 2, 3, 4, 5]
    const copy = [...original]
    fisherYatesShuffle(original)
    expect(original).toEqual(copy)
  })

  it('handles empty array', () => {
    expect(fisherYatesShuffle([])).toEqual([])
  })

  it('handles single-element array', () => {
    expect(fisherYatesShuffle([42])).toEqual([42])
  })

  it('produces different orders over many runs (probabilistic)', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8]
    const results = new Set<string>()
    for (let i = 0; i < 100; i++) {
      results.add(fisherYatesShuffle(arr).join(','))
    }
    // With 8! = 40320 permutations, 100 runs should produce > 1 unique order
    expect(results.size).toBeGreaterThan(1)
  })

  it('works with string arrays', () => {
    const original = ['a', 'b', 'c', 'd']
    const shuffled = fisherYatesShuffle(original)
    expect(shuffled.sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('works with object arrays', () => {
    const original = [{ id: 1 }, { id: 2 }, { id: 3 }]
    const shuffled = fisherYatesShuffle(original)
    expect(shuffled).toHaveLength(3)
    const ids = shuffled.map((o) => o.id).sort()
    expect(ids).toEqual([1, 2, 3])
  })
})

// ==================== deduplicateByName ====================
describe('deduplicateByName', () => {
  it('removes duplicate names, keeping first occurrence', () => {
    const names = ['a', 'b', 'a', 'c', 'b']
    expect(deduplicateByName(names)).toEqual(['a', 'b', 'c'])
  })

  it('case sensitivity: "abc" and "ABC" are different entries', () => {
    const names = ['abc', 'ABC', 'abc']
    expect(deduplicateByName(names)).toEqual(['abc', 'ABC'])
  })

  it('empty strings are preserved (not filtered here — that is parseEntryText)', () => {
    // deduplicateByName is a generic deduper; it keeps empty strings
    const names = ['', 'a', '', 'b']
    expect(deduplicateByName(names)).toEqual(['', 'a', 'b'])
  })

  it('returns empty array for empty input', () => {
    expect(deduplicateByName([])).toEqual([])
  })

  it('returns same array when no duplicates', () => {
    const names = ['a', 'b', 'c']
    expect(deduplicateByName(names)).toEqual(['a', 'b', 'c'])
  })

  it('handles single-element array', () => {
    expect(deduplicateByName(['only'])).toEqual(['only'])
  })
})

// ==================== parseEntryText ====================
describe('parseEntryText', () => {
  it('splits by newline and trims whitespace', () => {
    expect(parseEntryText('  a  \n b \n  c  ')).toEqual(['a', 'b', 'c'])
  })

  it('filters out empty lines', () => {
    expect(parseEntryText('a\n\nb\n\n\nc')).toEqual(['a', 'b', 'c'])
  })

  it('filters out whitespace-only lines', () => {
    expect(parseEntryText('a\n   \nb')).toEqual(['a', 'b'])
  })

  it('returns empty array for empty string', () => {
    expect(parseEntryText('')).toEqual([])
  })

  it('returns empty array for whitespace-only string', () => {
    expect(parseEntryText('  \n  \n  ')).toEqual([])
  })

  it('handles single line', () => {
    expect(parseEntryText('single')).toEqual(['single'])
  })

  it('handles Windows-style line endings (\\r\\n)', () => {
    expect(parseEntryText('a\r\nb\r\nc')).toEqual(['a', 'b', 'c'])
  })
})

// ==================== getEntryProbability ====================
describe('getEntryProbability', () => {
  it('returns 1/N for N enabled entries', () => {
    expect(getEntryProbability(4)).toBe(0.25)
    expect(getEntryProbability(2)).toBe(0.5)
    expect(getEntryProbability(1)).toBe(1)
  })

  it('returns 0 for 0 enabled entries', () => {
    expect(getEntryProbability(0)).toBe(0)
  })

  it('returns 0 for negative count (defensive)', () => {
    expect(getEntryProbability(-1)).toBe(0)
  })

  it('returns correct value for large N', () => {
    expect(getEntryProbability(100)).toBe(0.01)
  })
})

// ==================== drawUnique ====================
describe('drawUnique', () => {
  const pool: Entry[] = [
    { name: 'A', enabled: true },
    { name: 'B', enabled: true },
    { name: 'C', enabled: true },
    { name: 'D', enabled: true },
  ]

  it('draws exactly count items', () => {
    const drawn = drawUnique(pool, 2)
    expect(drawn).toHaveLength(2)
  })

  it('drawn items are from the pool', () => {
    const drawn = drawUnique(pool, 3)
    const poolNames = pool.map((e) => e.name)
    drawn.forEach((name) => {
      expect(poolNames).toContain(name)
    })
  })

  it('drawn items have no duplicates within a single draw', () => {
    const drawn = drawUnique(pool, 3)
    expect(new Set(drawn).size).toBe(drawn.length)
  })

  it('cannot draw more than pool size', () => {
    const drawn = drawUnique(pool, 10)
    expect(drawn).toHaveLength(pool.length)
  })

  it('returns empty array when pool is empty', () => {
    expect(drawUnique([], 3)).toEqual([])
  })

  it('returns empty array when count is 0', () => {
    expect(drawUnique(pool, 0)).toEqual([])
  })

  it('drawing all items returns all names in shuffled order', () => {
    const drawn = drawUnique(pool, pool.length)
    expect(drawn.sort()).toEqual(['A', 'B', 'C', 'D'])
  })
})

// ==================== drawRepeat ====================
describe('drawRepeat', () => {
  const pool: Entry[] = [
    { name: 'A', enabled: true },
    { name: 'B', enabled: true },
    { name: 'C', enabled: true },
  ]

  it('draws exactly count items', () => {
    const drawn = drawRepeat(pool, 5)
    expect(drawn).toHaveLength(5)
  })

  it('drawn items are from the pool', () => {
    const drawn = drawRepeat(pool, 10)
    const poolNames = pool.map((e) => e.name)
    drawn.forEach((name) => {
      expect(poolNames).toContain(name)
    })
  })

  it('same item can be drawn multiple times', () => {
    // Run multiple draws and check that duplicates can appear
    let hasDuplicate = false
    for (let i = 0; i < 100; i++) {
      const drawn = drawRepeat(pool, 5)
      if (new Set(drawn).size < drawn.length) {
        hasDuplicate = true
        break
      }
    }
    expect(hasDuplicate).toBe(true)
  })

  it('returns empty array when pool is empty', () => {
    expect(drawRepeat([], 3)).toEqual([])
  })

  it('returns empty array when count is 0', () => {
    expect(drawRepeat(pool, 0)).toEqual([])
  })
})

// ==================== computeModeSwitch ====================
describe('computeModeSwitch', () => {
  const fullPool: Entry[] = [
    { name: 'A', enabled: true },
    { name: 'B', enabled: false },
  ]

  it('returns new mode and restored pool when switching modes', () => {
    const result = computeModeSwitch('unique', 'repeat', fullPool)
    expect(result).not.toBeNull()
    expect(result!.mode).toBe('repeat')
    expect(result!.entries).toEqual(fullPool)
  })

  it('returns null when mode does not change', () => {
    expect(computeModeSwitch('unique', 'unique', fullPool)).toBeNull()
    expect(computeModeSwitch('repeat', 'repeat', fullPool)).toBeNull()
  })

  it('switching from repeat to unique restores full pool', () => {
    const result = computeModeSwitch('repeat', 'unique', fullPool)
    expect(result).not.toBeNull()
    expect(result!.mode).toBe('unique')
    expect(result!.entries).toEqual(fullPool)
  })

  it('returns a copy of pool, not the same reference', () => {
    const result = computeModeSwitch('unique', 'repeat', fullPool)
    expect(result!.entries).not.toBe(fullPool)
  })

  it('switch back and forth preserves pool', () => {
    const r1 = computeModeSwitch('unique', 'repeat', fullPool)!
    const r2 = computeModeSwitch('repeat', 'unique', r1.entries)!
    expect(r2.mode).toBe('unique')
    expect(r2.entries).toEqual(fullPool)
  })
})

// ==================== loadState / saveState ====================
describe('sessionStorage persistence', () => {
  const mockStorage = new Map<string, string>()

  beforeEach(() => {
    mockStorage.clear()
    vi.stubGlobal(
      'sessionStorage',
      {
        getItem: vi.fn((key: string) => mockStorage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage.set(key, value)
        }),
        removeItem: vi.fn((key: string) => {
          mockStorage.delete(key)
        }),
      }
    )
  })

  it('saveState writes to sessionStorage', () => {
    const state: GachaState = {
      entries: [{ name: 'X', enabled: true }],
      mode: 'unique',
      history: [{ round: 1, results: ['X'] }],
      poolExhausted: false,
    }
    saveState(state)
    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(state)
    )
  })

  it('loadState returns default state when sessionStorage is empty', () => {
    const state = loadState()
    expect(state).toEqual({
      entries: [],
      mode: 'unique',
      history: [],
      poolExhausted: false,
    })
  })

  it('loadState reads saved state correctly', () => {
    const saved: GachaState = {
      entries: [
        { name: 'A', enabled: true },
        { name: 'B', enabled: false },
      ],
      mode: 'repeat',
      history: [{ round: 1, results: ['A'] }],
      poolExhausted: true,
    }
    mockStorage.set(STORAGE_KEY, JSON.stringify(saved))
    const loaded = loadState()
    expect(loaded.entries).toEqual(saved.entries)
    expect(loaded.mode).toBe('repeat')
    expect(loaded.history).toEqual(saved.history)
    expect(loaded.poolExhausted).toBe(true)
  })

  it('loadState filters invalid entry objects', () => {
    mockStorage.set(
      STORAGE_KEY,
      JSON.stringify({
        entries: [
          { name: 'A', enabled: true },
          null,
          { name: 123, enabled: true }, // name not a string
          { name: 'B' }, // missing enabled
          { name: 'C', enabled: 'yes' }, // enabled not boolean
        ],
        mode: 'unique',
        history: [],
        poolExhausted: false,
      })
    )
    const loaded = loadState()
    expect(loaded.entries).toHaveLength(1)
    expect(loaded.entries[0].name).toBe('A')
  })

  it('loadState defaults to unique mode for invalid mode value', () => {
    mockStorage.set(
      STORAGE_KEY,
      JSON.stringify({ entries: [], mode: 'invalid', history: [], poolExhausted: false })
    )
    expect(loadState().mode).toBe('unique')
  })

  it('loadState handles corrupt JSON gracefully', () => {
    mockStorage.set(STORAGE_KEY, 'not-valid-json{{{')
    const state = loadState()
    expect(state.entries).toEqual([])
    expect(state.mode).toBe('unique')
  })

  it('loadState defaults missing poolExhausted field', () => {
    mockStorage.set(
      STORAGE_KEY,
      JSON.stringify({ entries: [], mode: 'unique', history: [] })
    )
    expect(loadState().poolExhausted).toBe(false)
  })

  it('saveState silently ignores quota errors', () => {
    vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('quota')
    })
    // Should not throw
    expect(() =>
      saveState({ entries: [], mode: 'unique', history: [], poolExhausted: false })
    ).not.toThrow()
  })
})
