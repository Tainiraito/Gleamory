import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getUniqueNames, fisherYatesShuffle } from '@/lib/gacha'

interface Entry {
  name: string
  enabled: boolean
}

interface HistoryRound {
  round: number
  results: string[]
}

interface GachaState {
  entries: Entry[]
  mode: 'unique' | 'repeat'
  history: HistoryRound[]
  poolExhausted: boolean
  dedupEnabled: boolean
}

const STORAGE_KEY = 'gacha-simulator-state'
const GRID_COLS = 4
const GRID_ROWS = 3
const TOTAL_CARDS = GRID_COLS * GRID_ROWS

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
      return {
        entries,
        mode: parsed.mode === 'unique' || parsed.mode === 'repeat' ? parsed.mode : 'unique',
        history: Array.isArray(parsed.history) ? parsed.history : [],
        poolExhausted: typeof parsed.poolExhausted === 'boolean' ? parsed.poolExhausted : false,
        dedupEnabled: typeof parsed.dedupEnabled === 'boolean' ? parsed.dedupEnabled : true,
      }
    }
  } catch {
    /* corrupted data, reset */
  }
  return { entries: [], mode: 'unique', history: [], poolExhausted: false, dedupEnabled: true }
}

function saveState(state: GachaState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota exceeded, silently ignore */
  }
}

const GachaSimulator = () => {
  const [entries, setEntries] = useState<Entry[]>([])
  const [mode, setMode] = useState<'unique' | 'repeat'>('unique')
  const [history, setHistory] = useState<HistoryRound[]>([])
  const [entryText, setEntryText] = useState('')
  const [entryMode, setEntryMode] = useState<'append' | 'overwrite'>('append')
  const [dedupEnabled, setDedupEnabled] = useState(true)
  const [poolExhausted, setPoolExhausted] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  // Card flip state
  const [flippedIdx, setFlippedIdx] = useState<number | null>(null)
  const [currentRound, setCurrentRound] = useState<number>(0)
  const [lastDrawnName, setLastDrawnName] = useState<string | null>(null)
  const [lastDrawnProb, setLastDrawnProb] = useState<string>('')

  // Ref that always mirrors latest entries (used for name lookup in callbacks)
  const entriesRef = useRef(entries)
  entriesRef.current = entries

  // Snapshot of the "full pool" before unique-mode draws remove entries
  const fullPoolRef = useRef<Entry[]>([])
  const updateFullPoolRef = useCallback((e: Entry[]) => {
    fullPoolRef.current = e
  }, [])

  const enabledEntries = useMemo(() => entries.filter((e) => e.enabled), [entries])
  const enabledCount = enabledEntries.length

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const saved = loadState()
    setEntries(saved.entries)
    setMode(saved.mode)
    setHistory(saved.history)
    setPoolExhausted(saved.poolExhausted)
    fullPoolRef.current = saved.entries
  }, [])

  // Persist state to sessionStorage on change
  useEffect(() => {
    saveState({ entries, mode, history, poolExhausted, dedupEnabled })
  }, [entries, mode, history, poolExhausted, dedupEnabled])

  const handleAddEntries = useCallback(() => {
    const lines = entryText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length === 0) return
    setFlippedIdx(null)

    const newEntries: Entry[] = lines.map((name) => ({ name, enabled: true }))

    if (entryMode === 'overwrite') {
      const seen = new Set<string>()
      const deduped = newEntries.filter((e) => {
        if (seen.has(e.name)) return false
        seen.add(e.name)
        return true
      })
      setEntries(dedupEnabled ? deduped : newEntries)
      updateFullPoolRef(dedupEnabled ? deduped : newEntries)
      setHistory([])
      setPoolExhausted(false)
    } else {
      if (dedupEnabled) {
        const existingNames = new Set(entries.map((e) => e.name))
        const deduped = newEntries.filter((e) => {
          if (existingNames.has(e.name)) return false
          existingNames.add(e.name)
          return true
        })
        if (deduped.length > 0) {
          setEntries((prev) => {
            const merged = [...prev, ...deduped]
            updateFullPoolRef(merged)
            return merged
          })
          setPoolExhausted(false)
        }
      } else {
        setEntries((prev) => {
          const merged = [...prev, ...newEntries]
          updateFullPoolRef(merged)
          return merged
        })
        setPoolExhausted(false)
      }
    }

    setEntryText('')
  }, [entryText, entryMode, entries, dedupEnabled])

  const handleModeSwitch = useCallback((newMode: 'unique' | 'repeat') => {
    if (newMode !== mode) {
      setMode(newMode)
      setHistory([])
      setPoolExhausted(false)
      setEntries(fullPoolRef.current)
      setFlippedIdx(null)
      // nop
    }
  }, [mode])

  // Single draw: draw one entry randomly
  const handleDraw = useCallback(() => {
    if (enabledCount === 0) return

    let drawn: string
    if (mode === 'unique') {
      const uniqueNames = getUniqueNames(enabledEntries)
      const shuffled = fisherYatesShuffle(uniqueNames)
      drawn = shuffled[0]
      // Remove only ONE instance
      setEntries((prev) => {
        const removed = new Set<string>()
        return prev.filter((e) => {
          if (e.name === drawn && !removed.has(e.name)) {
            removed.add(e.name)
            return false
          }
          return true
        })
      })
      if (enabledCount - 1 <= 0) {
        setPoolExhausted(true)
      }
    } else {
      drawn = enabledEntries[Math.floor(Math.random() * enabledEntries.length)].name
    }

    // Calculate probability based on count/total
    const countOfDrawn = enabledEntries.filter((e) => e.name === drawn).length
    const prob = ((countOfDrawn / enabledCount) * 100).toFixed(1)

    setLastDrawnName(drawn)
    setLastDrawnProb(prob)
  }, [enabledCount, mode, enabledEntries])

  // Handle card click
  const onCardClick = useCallback((idx: number) => {
    if (flippedIdx !== null) return // already flipped this round
    if (enabledCount === 0) return
    setFlippedIdx(idx)
    handleDraw()
  }, [flippedIdx, enabledCount, handleDraw])

  // Handle "draw again"
  const handleNextDraw = useCallback(() => {
    if (flippedIdx !== null && lastDrawnName) {
      // Record this draw before resetting
      const newRound = currentRound + 1
      setCurrentRound(newRound)
      setHistory((prev) => [...prev, { round: newRound, results: [lastDrawnName] }])
    }
    setFlippedIdx(null)
    setLastDrawnName(null)
  }, [flippedIdx, lastDrawnName, currentRound])

  const handleClearHistory = useCallback(() => {
    setHistory([])
    setPoolExhausted(false)
    setCurrentRound(0)
  }, [])

  // Compute per-entry draw statistics
  const entryStats = useMemo(() => {
    const stats = new Map<string, { count: number; percentage: string }>()
    let total = 0
    history.forEach((round) => {
      round.results.forEach((name) => {
        total++
        const existing = stats.get(name)
        if (existing) {
          existing.count++
        } else {
          stats.set(name, { count: 1, percentage: '' })
        }
      })
    })
    stats.forEach((stat) => {
      stat.percentage = total > 0 ? ((stat.count / total) * 100).toFixed(1) + '%' : '0%'
    })
    return { stats, total }
  }, [history])

  const uniqueNames = useMemo(() => getUniqueNames(entries), [entries])
  const uniqueCount = uniqueNames.length

  // Card grid indices
  const cardIndices = Array.from({ length: TOTAL_CARDS }, (_, i) => i)

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

      <main className="max-w-4xl mx-auto px-6 py-20 sm:py-24">
        {/* Page Title */}
        <motion.h1
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="font-display text-4xl sm:text-5xl tracking-tight text-center mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          抽卡模拟
        </motion.h1>
        <p className="text-sm text-center mb-10" style={{ color: 'var(--text-muted)' }}>
          玄不改非，氪不改命
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-8 mb-12 border-b" style={{ borderColor: 'var(--border-line)' }}>
          {['简单抽取', '原神抽卡', '更多'].map((label, i) => {
            const isActive = activeTab === i
            return (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={`relative pb-2 text-sm transition-colors ${isActive ? 'font-semibold' : ''}`}
                style={{ color: isActive ? 'var(--accent-pink)' : 'var(--text-muted)' }}
              >
                {label}
                {isActive && (
                  <motion.div
                    layoutId="active-tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: 'var(--accent-pink)' }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {activeTab !== 0 ? (
          <div className="flex items-center justify-center py-32">
            <span className="font-display text-2xl" style={{ color: 'var(--text-muted)' }}>
              开发中...
            </span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ===== Block 1: Entry Management ===== */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="p-6"
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-line)',
              }}
            >
              <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>
                条目管理
              </h2>

              <textarea
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder={'每行一个条目...\n例如：\n角色A\n角色B\n道具C'}
                rows={4}
                className="w-full p-3 text-sm resize-y mb-3 placeholder:opacity-40"
                style={{
                  color: 'var(--text-primary)',
                  border: '0.5px solid var(--border-line)',
                  background: 'transparent',
                }}
              />

              {/* Buttons row: [去重 group] [追加/覆盖 group] [添加条目] */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Dedup toggle group */}
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

                {/* Append/Overwrite toggle group */}
                <div className="flex" style={{ border: '0.5px solid var(--border-line)' }}>
                  <button
                    onClick={() => setEntryMode('append')}
                    className="px-3 py-1.5 text-xs transition-all duration-200"
                    style={{
                      background: entryMode === 'append' ? 'rgba(44,42,48,0.04)' : 'transparent',
                      color: entryMode === 'append' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    追加
                  </button>
                  <button
                    onClick={() => setEntryMode('overwrite')}
                    className="px-3 py-1.5 text-xs transition-all duration-200"
                    style={{
                      borderLeft: '0.5px solid var(--border-line)',
                      background: entryMode === 'overwrite' ? 'rgba(44,42,48,0.04)' : 'transparent',
                      color: entryMode === 'overwrite' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                  >
                    覆盖
                  </button>
                </div>

                {/* Add entries button */}
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
                  添加条目
                </button>
              </div>

              {/* Entry count + mode indicator */}
              {entries.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '0.5px solid var(--border-line)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    共 {entries.length} 条 · {uniqueCount} 个不同条目
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="flex" style={{ border: '0.5px solid var(--border-line)' }}>
                      <button
                        onClick={() => handleModeSwitch('unique')}
                        className="px-2.5 py-1 text-[0.6rem] transition-all duration-200"
                        style={{
                          background: mode === 'unique' ? 'rgba(44,42,48,0.04)' : 'transparent',
                          color: mode === 'unique' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        不重复
                      </button>
                      <button
                        onClick={() => handleModeSwitch('repeat')}
                        className="px-2.5 py-1 text-[0.6rem] transition-all duration-200"
                        style={{
                          borderLeft: '0.5px solid var(--border-line)',
                          background: mode === 'repeat' ? 'rgba(44,42,48,0.04)' : 'transparent',
                          color: mode === 'repeat' ? 'var(--text-primary)' : 'var(--text-secondary)',
                        }}
                      >
                        可重复
                      </button>
                    </div>
                    <span className="text-[0.6rem]" style={{ color: 'var(--text-muted)' }}>
                      {mode === 'unique' ? '抽中即移出' : '独立抽取'}
                    </span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* ===== Block 2: Card Flip Area ===== */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="p-6"
              style={{
                background: 'var(--bg-card)',
                border: '0.5px solid var(--border-line)',
              }}
            >
              <h2 className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--text-secondary)' }}>
                翻牌抽卡
              </h2>

              {entries.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    ✦ 请先添加条目
                  </p>
                </div>
              ) : poolExhausted ? (
                <div className="py-16 text-center">
                  <p className="text-sm" style={{ color: 'var(--accent-pink)' }}>
                    奖池已耗尽！添加新条目继续
                  </p>
                </div>
              ) : (
                <>
                  {/* Card grid */}
                  <div
                    className="grid gap-4 mb-6"
                    style={{
                      gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
                    }}
                  >
                    {cardIndices.map((idx) => {
                      const isFlipped = flippedIdx === idx
                      return (
                        <motion.button
                          key={idx}
                          onClick={() => onCardClick(idx)}
                          disabled={flippedIdx !== null && flippedIdx !== idx}
                          style={{
                            perspective: 800,
                            aspectRatio: '3/4',
                            cursor: flippedIdx === null && enabledCount > 0 ? 'pointer' : 'default',
                            padding: 0,
                            border: 'none',
                            background: 'transparent',
                          }}
                          whileHover={flippedIdx === null ? { scale: 1.05 } : {}}
                          whileTap={flippedIdx === null ? { scale: 0.95 } : {}}
                        >
                          <motion.div
                            animate={{ rotateY: isFlipped ? 180 : 0 }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            style={{
                              width: '100%',
                              height: '100%',
                              transformStyle: 'preserve-3d',
                              position: 'relative',
                            }}
                          >
                            {/* Card Back (face-down) */}
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                backfaceVisibility: 'hidden',
                                background: '#0c0a12',
                                border: '0.5px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                overflow: 'hidden',
                              }}
                            >
                              <div className="flex flex-col items-center gap-2 select-none">
                                <span
                                  className="font-display text-lg font-bold"
                                  style={{ color: 'rgba(247, 131, 172, 0.3)' }}
                                >
                                  ?
                                </span>
                                <span
                                  className="text-[6px] uppercase tracking-[0.2em]"
                                  style={{ color: 'rgba(255,255,255,0.15)' }}
                                >
                                  gleamory
                                </span>
                              </div>
                            </div>

                            {/* Card Front (revealed) */}
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
                                padding: '8px',
                              }}
                            >
                              {isFlipped && lastDrawnName && (
                                <>
                                  <span
                                    className="block font-display text-sm font-semibold text-center leading-tight mb-1"
                                    style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}
                                  >
                                    {lastDrawnName}
                                  </span>
                                  <span
                                    className="text-[0.55rem]"
                                    style={{ color: 'var(--accent-pink)' }}
                                  >
                                    {lastDrawnProb}%
                                  </span>
                                </>
                              )}
                            </div>
                          </motion.div>
                        </motion.button>
                      )
                    })}
                  </div>

                  {/* Action buttons below cards */}
                  <div className="flex justify-center gap-4">
                    {flippedIdx === null ? (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        点击任意卡牌翻开
                      </span>
                    ) : (
                      <button
                        onClick={handleNextDraw}
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
                        翻下一张
                      </button>
                    )}
                  </div>
                </>
              )}
            </motion.div>

            {/* ===== Block 3: Statistics ===== */}
            {entryStats.total > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="p-6"
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-line)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-secondary)' }}>
                    统计摘要
                  </h2>
                  <button
                    onClick={handleClearHistory}
                    className="text-[0.6rem] transition-colors duration-200 hover:opacity-70"
                    style={{ color: 'rgba(44,42,48,0.3)' }}
                  >
                    清除记录
                  </button>
                </div>
                <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                  共抽取 {entryStats.total} 次
                </p>
                <div className="space-y-2.5">
                  {Array.from(entryStats.stats.entries())
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([name, stat]) => (
                      <div key={name} className="flex items-center gap-3 text-sm">
                        <span className="w-24 truncate flex-shrink-0" style={{ color: 'var(--text-primary)' }}>
                          {name}
                        </span>
                        <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--border-line)' }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: stat.percentage }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: 'var(--accent-pink)' }}
                          />
                        </div>
                        <span className="flex-shrink-0 text-xs w-20 text-right" style={{ color: 'var(--text-muted)' }}>
                          {stat.count} 次 ({stat.percentage})
                        </span>
                      </div>
                    ))}
                </div>
              </motion.div>
            )}

            {/* Empty state: no draws yet */}
            {entryStats.total === 0 && entries.length > 0 && flippedIdx === null && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="p-10 text-center"
                style={{
                  background: 'var(--bg-card)',
                  border: '0.5px solid var(--border-line)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  ✦ 翻开卡牌开始抽取
                </p>
              </motion.div>
            )}
          </div>
        )}
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
