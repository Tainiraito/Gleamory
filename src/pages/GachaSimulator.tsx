import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

interface Entry {
  name: string
  enabled: boolean
}

interface GachaState {
  entries: Entry[]
  history: string[]   // drawn entry names in order
  cardOrder: number[]  // shuffled entry indices for card positions
  flipped: boolean[]   // which cards are flipped
}

const STORAGE_KEY = 'gacha-simulator-state'

const DEFAULT_ENTRIES = [
  'gbc所有人',
  '尼尔机械纪元-2B',
  '魔禁-神裂火织',
  '刀剑神域-亚丝娜',
  '旋风管家-天王州雅典娜',
  '约会大作战-所有精灵',
  '中二病也要谈恋爱-MoriSummer',
  '恶魔高校-所有女角色',
  '甘城光辉游乐园-千斗五十铃',
  '转生史莱姆-井泽静江',
  '转生史莱姆-朱莱',
  '转生史莱姆-紫苑',
  '兔女郎-樱岛麻衣',
  '辉夜大小姐-辉夜',
  '辉夜大小姐-藤原',
  '辉夜大小姐-早坂爱',
  '罗小黑-师姐',
  'jojo-承太郎',
  'jojo-dio',
  'jojo-空条徐伦',
  'jojo-天气预报',
  '斩服少女-缠流子',
  '轻音少女-所有人',
  '魔女之旅-伊蕾娜',
  '碧蓝之海-千纱',
  'lycoris recoil-两主角',
  '石纪元-杠',
  '石纪元-大葱哥',
  '孤独摇滚-所有人',
  '无职转生-卢迪乌斯',
  '无职转生-洛琪希',
  '无职转生-希露菲',
  '无职转生-艾丽丝',
  '我独自升级-车惠怡',
  '葬送的芙莉莲-芙莉莲',
  '葬送的芙莉莲-肥伦',
  '赛博朋克-露西',
  '擅长捉弄的高木同学-高木',
  '明日酱的水手服-明日小路',
  '明日酱的水手服-木崎江利花',
  '跃动青春-村重结月',
  '胆大党-momo',
  '我心里危险的东西-山田杏奈',
  '薰香花朵凛然绽放-薰子',
  '原神-克洛琳德',
  '原神-仆人',
  '原神-月神',
  '原神-八重神子',
  '崩铁-星',
  '崩铁-流萤',
  '崩铁-八重樱',
  '绝区零-星见雅',
  '绝区零-仪玄',
  '绝区零-叶瞬光',
  '终末地-庄方宜',
  '终末地-洁哥',
  '终末地-42',
  '鸣潮-长离',
  '鸣潮-坎特蕾拉',
  '鸣潮-爱弥斯',
]

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function loadState(): GachaState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const entries = Array.isArray(parsed.entries)
        ? parsed.entries.filter(
            (e: unknown) =>
              e != null &&
              typeof (e as Entry).name === 'string' &&
              typeof (e as Entry).enabled === 'boolean'
          )
        : []
      const history = Array.isArray(parsed.history) ? parsed.history : []
      const cardOrder = Array.isArray(parsed.cardOrder) ? parsed.cardOrder : []
      const flipped = Array.isArray(parsed.flipped) ? parsed.flipped : []
      return { entries, history, cardOrder, flipped }
    }
  } catch {
    /* corrupted */
  }
  // First visit: auto-load default preset
  const preset = DEFAULT_ENTRIES.map((name) => ({ name, enabled: true }))
  return {
    entries: preset,
    history: [],
    cardOrder: shuffleArray(preset.map((_, i) => i)),
    flipped: new Array(preset.length).fill(false),
  }
}

function saveState(state: GachaState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota */
  }
}

const GachaSimulator = () => {
  const [entries, setEntries] = useState<Entry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [cardOrder, setCardOrder] = useState<number[]>([])
  const [flipped, setFlipped] = useState<boolean[]>([])
  const [entryText, setEntryText] = useState('')
  const [dedupEnabled, setDedupEnabled] = useState(true)

  // Restore state on mount
  useEffect(() => {
    const saved = loadState()
    setEntries(saved.entries)
    setHistory(saved.history)
    setCardOrder(saved.cardOrder)
    setFlipped(saved.flipped)
  }, [])

  // Persist
  useEffect(() => {
    if (entries.length > 0) {
      saveState({ entries, history, cardOrder, flipped })
    }
  }, [entries, history, cardOrder, flipped])

  // Rebuild card order when entries change
  const rebuildCards = useCallback((newEntries: Entry[]) => {
    const order = shuffleArray(newEntries.map((_, i) => i))
    setCardOrder(order)
    setFlipped(new Array(newEntries.length).fill(false))
    setHistory([])
  }, [])

  const handleAddEntries = useCallback(() => {
    const lines = entryText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
    if (lines.length === 0) return

    const newEntries: Entry[] = lines.map((name) => ({ name, enabled: true }))

    if (dedupEnabled) {
      const existingNames = new Set(entries.map((e) => e.name))
      const deduped = newEntries.filter((e) => {
        if (existingNames.has(e.name)) return false
        existingNames.add(e.name)
        return true
      })
      if (deduped.length > 0) {
        const merged = [...entries, ...deduped]
        setEntries(merged)
        rebuildCards(merged)
      }
    } else {
      const merged = [...entries, ...newEntries]
      setEntries(merged)
      rebuildCards(merged)
    }

    setEntryText('')
  }, [entryText, entries, dedupEnabled, rebuildCards])

  // Click a card to flip it (draw)
  const handleCardClick = useCallback((cardIdx: number) => {
    if (flipped[cardIdx]) return // already flipped

    const newFlipped = [...flipped]
    newFlipped[cardIdx] = true

    // The drawn entry is at entries[cardOrder[cardIdx]]
    const drawnEntry = entries[cardOrder[cardIdx]].name

    setFlipped(newFlipped)
    setHistory((prev) => [...prev, drawnEntry])
  }, [flipped, entries, cardOrder])

  // Reset all cards (reshuffle)
  const handleReset = useCallback(() => {
    rebuildCards(entries)
  }, [entries, rebuildCards])

  // Reset to default preset
  const handleResetToDefault = useCallback(() => {
    const preset = DEFAULT_ENTRIES.map((name) => ({ name, enabled: true }))
    setEntries(preset)
    const order = shuffleArray(preset.map((_, i) => i))
    setCardOrder(order)
    setFlipped(new Array(preset.length).fill(false))
    setHistory([])
  }, [])

  const flippedCount = flipped.filter(Boolean).length
  const remainingCount = entries.length - flippedCount
  const allFlipped = flippedCount === entries.length && entries.length > 0

  // Get unique drawn names for stats
  const drawnStats = useMemo(() => {
    const stats = new Map<string, number>()
    history.forEach((name) => {
      stats.set(name, (stats.get(name) || 0) + 1)
    })
    return stats
  }, [history])

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Top-left back link */}
      <div className="fixed top-6 sm:top-8 left-6 sm:left-8 z-50">
        <Link
          to="/"
          className="font-display text-[0.6rem] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity duration-300"
          style={{ color: 'var(--text-muted)' }}
        >
          Gleamory
        </Link>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-20 sm:py-24">
        {/* Page Title */}
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-4xl sm:text-5xl tracking-tight text-center mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          翻牌抽卡
        </motion.h1>
        <p className="text-sm text-center mb-10" style={{ color: 'var(--text-muted)' }}>
          翻开一张卡，看看是谁来找你
        </p>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ===== Left Column: Management + Status ===== */}
          <div className="w-full lg:w-80 shrink-0 space-y-4">
            {/* Add entries */}
            <div
              className="p-5"
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-line)',
              }}
            >
              <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
                添加条目
              </h2>
              <textarea
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder={'每行一个条目...'}
                rows={4}
                className="w-full p-3 text-sm resize-y mb-3 placeholder:opacity-40"
                style={{
                  color: 'var(--text-primary)',
                  border: '0.5px solid var(--border-line)',
                  background: 'transparent',
                }}
              />
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex" style={{ border: '0.5px solid var(--border-line)' }}>
                  <button
                    onClick={() => setDedupEnabled(true)}
                    className="px-3 py-1.5 text-xs transition-all duration-200"
                    style={{
                      background: dedupEnabled ? 'rgba(44,42,48,0.04)' : 'transparent',
                      color: dedupEnabled ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    去重
                  </button>
                  <button
                    onClick={() => setDedupEnabled(false)}
                    className="px-3 py-1.5 text-xs transition-all duration-200"
                    style={{
                      borderLeft: '0.5px solid var(--border-line)',
                      background: !dedupEnabled ? 'rgba(44,42,48,0.04)' : 'transparent',
                      color: !dedupEnabled ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    不去重
                  </button>
                </div>
                <button
                  onClick={handleAddEntries}
                  className="px-4 py-1.5 text-xs transition-all duration-200"
                  style={{
                    border: '0.5px solid var(--border-line)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--text-primary)'
                    e.currentTarget.style.color = 'var(--bg-page)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  添加
                </button>
              </div>
            </div>

            {/* Counter */}
            <div
              className="p-5"
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-line)',
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  全部 {entries.length} 张
                </span>
                <span className="text-xs" style={{ color: 'var(--accent-pink)' }}>
                  已翻 {flippedCount} 张
                </span>
              </div>
              <div className="h-1.5 rounded-full" style={{ background: 'var(--border-line)' }}>
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--accent-pink)' }}
                  animate={{ width: entries.length > 0 ? `${(flippedCount / entries.length) * 100}%` : '0%' }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={handleReset}
                  className="text-[0.6rem] transition-colors duration-200 hover:opacity-70"
                  style={{ color: 'rgba(44,42,48,0.3)' }}
                >
                  重新洗牌
                </button>
                <button
                  onClick={handleResetToDefault}
                  className="text-[0.6rem] transition-colors duration-200 hover:opacity-70"
                  style={{ color: 'rgba(44,42,48,0.3)' }}
                >
                  恢复预设
                </button>
              </div>
            </div>

            {/* Remaining entries */}
            <div
              className="p-5"
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-line)',
              }}
            >
              <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
                剩余条目 ({remainingCount})
              </h2>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {entries.map((entry, i) => {
                  const cardIdx = cardOrder.indexOf(i)
                  const isFlipped = cardIdx !== -1 && flipped[cardIdx]
                  if (isFlipped) return null
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span style={{ width: '4px', height: '4px', background: 'var(--border-line)', borderRadius: '50%', display: 'inline-block' }} />
                      <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                        {entry.name}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Drawn results (recent first) */}
            {history.length > 0 && (
              <div
                className="p-5"
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-line)',
                }}
              >
                <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
                  已抽结果
                </h2>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {[...history].reverse().map((name, i) => (
                    <div key={`${name}-${i}`} className="flex items-center gap-2">
                      <span
                        className="text-[0.55rem] shrink-0"
                        style={{ color: 'var(--accent-pink)' }}
                      >
                        #{history.length - i}
                      </span>
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>
                        {name}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="mt-4 pt-3" style={{ borderTop: '0.5px solid var(--border-line)' }}>
                  <h3 className="text-[0.6rem] uppercase tracking-widest mb-2" style={{ color: 'var(--text-muted)' }}>
                    抽卡统计
                  </h3>
                  <div className="space-y-1.5">
                    {Array.from(drawnStats.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, count]) => {
                        const pct = ((count / history.length) * 100).toFixed(1)
                        return (
                          <div key={name} className="flex items-center gap-2">
                            <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                            <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border-line)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{ width: pct + '%', background: 'var(--accent-pink)' }}
                              />
                            </div>
                            <span className="text-[0.6rem] w-14 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>
                              {count} ({pct}%)
                            </span>
                          </div>
                        )
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ===== Right: Card Wall ===== */}
          <div className="flex-1">
            {entries.length === 0 ? (
              <div
                className="flex items-center justify-center py-32"
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-line)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  ✦ 添加条目开始抽卡
                </p>
              </div>
            ) : allFlipped ? (
              <div
                className="flex flex-col items-center justify-center py-32 gap-4"
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-line)',
                }}
              >
                <p className="font-display text-lg" style={{ color: 'var(--text-primary)' }}>
                  全部翻完啦 ✦
                </p>
                <button
                  onClick={handleReset}
                  className="px-6 py-2 text-xs transition-all duration-200"
                  style={{
                    border: '0.5px solid var(--border-line)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--text-primary)'
                    e.currentTarget.style.color = 'var(--bg-page)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  重新洗牌
                </button>
              </div>
            ) : (
              <div
                className="p-6"
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-line)',
                }}
              >
                <div
                  className="grid gap-3"
                  style={{
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                  }}
                >
                  {cardOrder.map((entryIdx, cardIdx) => {
                    const isFlipped = flipped[cardIdx]
                    const entry = entries[entryIdx]
                    return (
                      <motion.button
                        key={cardIdx}
                        onClick={() => handleCardClick(cardIdx)}
                        disabled={allFlipped}
                        style={{
                          perspective: 600,
                          aspectRatio: '2/3',
                          cursor: isFlipped ? 'default' : 'pointer',
                          padding: 0,
                          border: 'none',
                          background: 'transparent',
                        }}
                        whileHover={!isFlipped ? { scale: 1.08, zIndex: 10 } : {}}
                        whileTap={!isFlipped ? { scale: 0.95 } : {}}
                      >
                        <motion.div
                          animate={{ rotateY: isFlipped ? 180 : 0 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          style={{
                            width: '100%',
                            height: '100%',
                            transformStyle: 'preserve-3d',
                            position: 'relative',
                          }}
                        >
                          {/* Card Back */}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backfaceVisibility: 'hidden',
                              background: '#0c0a12',
                              border: '0.5px solid rgba(255,255,255,0.08)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            <span
                              className="font-display text-lg font-bold select-none"
                              style={{ color: 'rgba(247, 131, 172, 0.25)' }}
                            >
                              ?
                            </span>
                          </div>

                          {/* Card Front */}
                          <div
                            style={{
                              position: 'absolute',
                              inset: 0,
                              backfaceVisibility: 'hidden',
                              transform: 'rotateY(180deg)',
                              background: 'var(--bg-elevated)',
                              border: '0.5px solid var(--border-line)',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px',
                            }}
                          >
                            <span
                              className="block font-display text-[0.6rem] font-semibold text-center leading-tight"
                              style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}
                            >
                              {entry.name}
                            </span>
                          </div>
                        </motion.div>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex flex-col items-center gap-3 pt-12 pb-12">
        <div style={{ width: '6px', height: '1px', background: 'var(--border-line)' }} />
        <Link
          to="/"
          className="text-[0.6rem] uppercase tracking-widest transition-opacity duration-300 hover:opacity-70"
          style={{ color: 'var(--text-muted)' }}
        >
          &larr; 返回首页
        </Link>
      </footer>
    </div>
  )
}

export default GachaSimulator
