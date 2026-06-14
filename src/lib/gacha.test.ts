import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  STORAGE_KEY,
  createCardOrder,
  loadState,
  mergeEntryNames,
  parseEntryText,
  saveState,
  type GachaState,
} from './gacha'

const defaultState: GachaState = {
  entries: [
    { name: 'A', enabled: true },
    { name: 'B', enabled: true },
  ],
  history: [],
  cardOrder: [0, 1],
  flipped: [false, false],
  presetName: '二次元角色',
}

describe('parseEntryText', () => {
  it('去掉空行和首尾空格', () => {
    expect(parseEntryText(' A \n\nB\n  C  ')).toEqual(['A', 'B', 'C'])
  })
})

describe('mergeEntryNames', () => {
  it('追加并去除当前牌组和输入中的重复项', () => {
    expect(mergeEntryNames(['A'], 'A\nB\nB', 'append', true)).toEqual(['A', 'B'])
  })

  it('关闭去重时保留追加输入中的重复项', () => {
    expect(mergeEntryNames(['A'], 'A\nB\nB', 'append', false)).toEqual([
      'A',
      'A',
      'B',
      'B',
    ])
  })

  it('覆盖模式只使用新输入并遵循去重设置', () => {
    expect(mergeEntryNames(['旧'], 'A\nB\nB', 'overwrite', true)).toEqual(['A', 'B'])
    expect(mergeEntryNames(['旧'], 'A\nB\nB', 'overwrite', false)).toEqual([
      'A',
      'B',
      'B',
    ])
  })
})

describe('createCardOrder', () => {
  it('返回完整且不重复的卡牌索引', () => {
    const order = createCardOrder(8)

    expect(order).toHaveLength(8)
    expect([...order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
  })

  it('空牌组返回空数组', () => {
    expect(createCardOrder(0)).toEqual([])
  })
})

describe('sessionStorage persistence', () => {
  const storage = new Map<string, string>()

  beforeEach(() => {
    storage.clear()
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
    })
  })

  it('读取字段完整且与预设兼容的状态', () => {
    const saved: GachaState = {
      entries: [
        { name: 'B', enabled: true },
        { name: 'A', enabled: true },
      ],
      history: ['A'],
      cardOrder: [1, 0],
      flipped: [true, false],
      presetName: '扑克牌',
    }
    storage.set(STORAGE_KEY, JSON.stringify(saved))

    expect(loadState(defaultState, ['二次元角色', '扑克牌'])).toEqual(saved)
  })

  it.each([
    ['损坏 JSON', 'not-json'],
    [
      '旧状态结构',
      JSON.stringify({
        entries: defaultState.entries,
        mode: 'unique',
        history: [{ round: 1, results: ['A'] }],
      }),
    ],
    [
      '牌序长度不一致',
      JSON.stringify({ ...defaultState, cardOrder: [0] }),
    ],
    [
      '牌序包含重复索引',
      JSON.stringify({ ...defaultState, cardOrder: [0, 0] }),
    ],
    [
      '翻牌状态长度不一致',
      JSON.stringify({ ...defaultState, flipped: [false] }),
    ],
    [
      '未知预设',
      JSON.stringify({ ...defaultState, presetName: '未知' }),
    ],
  ])('%s 时回退到默认状态', (_label, raw) => {
    storage.set(STORAGE_KEY, raw)

    expect(loadState(defaultState, ['二次元角色', '扑克牌'])).toEqual(defaultState)
  })

  it('保存当前生产状态结构', () => {
    saveState(defaultState)

    expect(sessionStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(defaultState),
    )
  })

  it('存储写入失败时不向外抛错', () => {
    vi.mocked(sessionStorage.setItem).mockImplementationOnce(() => {
      throw new Error('quota')
    })

    expect(() => saveState(defaultState)).not.toThrow()
  })
})
