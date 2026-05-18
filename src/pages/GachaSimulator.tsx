import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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

const accentText: React.CSSProperties = {
  color: '#fff',
}

const dangerBtnStyle: React.CSSProperties = {
  color: 'var(--accent-pink)',
  opacity: 0.4,
}

const pinkSpan: React.CSSProperties = {
  color: 'var(--accent-pink)',
}

const textMuted: React.CSSProperties = {
  color: 'var(--text-muted)',
}

const textPrimary: React.CSSProperties = {
  color: 'var(--text-primary)',
}

const borderStyle: React.CSSProperties = {
  borderColor: 'var(--border-line)',
}

const cardBg: React.CSSProperties = {
  background: 'var(--bg-card)',
  boxShadow: 'var(--shadow-card)',
}

const activePill: React.CSSProperties = {
  background: 'var(--accent-pink)',
  ...accentText,
}

const buttonBase: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-line)',
  color: 'var(--text-secondary)',
}

const buttonActive: React.CSSProperties = {
  background: 'var(--accent-pink)',
  border: '1px solid var(--accent-pink)',
  ...accentText,
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-line)',
  color: 'var(--text-primary)',
}

const lineThrough: React.CSSProperties = {
  textDecoration: 'line-through',
  color: 'var(--text-muted)',
}

const sectionLabel: React.CSSProperties = {
  color: 'var(--text-secondary)',
}

const GachaSimulator = () => {
  const [entries, setEntries] = useState<Entry[]>([])
  const [mode, setMode] = useState<'unique' | 'repeat'>('unique')
  const [history, setHistory] = useState<HistoryRound[]>([])
  const [entryText, setEntryText] = useState('')
  const [entryMode, setEntryMode] = useState<'append' | 'overwrite'>('append')
  const [dedupEnabled, setDedupEnabled] = useState(true)
  const [drawCount, setDrawCount] = useState(1)
  const [poolExhausted, setPoolExhausted] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

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

  // Clamp drawCount when enabled count changes
  useEffect(() => {
    if (drawCount > enabledCount && enabledCount > 0) {
      setDrawCount(enabledCount)
    }
    if (enabledCount === 0 && entries.length > 0) {
      setPoolExhausted(true)
    } else if (enabledCount > 0) {
      setPoolExhausted(false)
    }
  }, [enabledCount, entries.length, drawCount])

  const handleAddEntries = useCallback(() => {
    const lines = entryText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)

    if (lines.length === 0) return

    const newEntries: Entry[] = lines.map((name) => ({ name, enabled: true }))

    if (entryMode === 'overwrite') {
      // Deduplicate by name within new entries
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
      // Append
      if (dedupEnabled) {
        // Append: merge, skip names that already exist
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
        // Append without dedup
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

  const handleRemoveOne = useCallback((name: string) => {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.name === name)
      if (idx === -1) return prev
      const next = [...prev]
      next.splice(idx, 1)
      return next
    })
    const fpIdx = fullPoolRef.current.findIndex((e) => e.name === name)
    if (fpIdx !== -1) {
      fullPoolRef.current = fullPoolRef.current.filter((_, i) => i !== fpIdx)
    }
    setHistory([])
    setPoolExhausted(false)
  }, [])

  const handleRemoveAll = useCallback((name: string) => {
    setEntries((prev) => prev.filter((e) => e.name !== name))
    fullPoolRef.current = fullPoolRef.current.filter((e) => e.name !== name)
    setHistory([])
    setPoolExhausted(false)
  }, [])

  const handleModeSwitch = useCallback((newMode: 'unique' | 'repeat') => {
    if (newMode !== mode) {
      setMode(newMode)
      setHistory([])
      setPoolExhausted(false)
      setEntries(fullPoolRef.current)
    }
  }, [mode])

  const handleDraw = useCallback(() => {
    if (enabledCount === 0) return
    const count = Math.min(drawCount, enabledCount)

    let drawn: string[]
    if (mode === 'unique') {
      const uniqueNames = getUniqueNames(enabledEntries)
      const shuffled = fisherYatesShuffle(uniqueNames)
      drawn = shuffled.slice(0, count)
      // Remove only ONE instance per drawn name
      setEntries((prev) => {
        const removed = new Set<string>()
        return prev.filter((e) => {
          if (drawn.includes(e.name) && !removed.has(e.name)) {
            removed.add(e.name)
            return false
          }
          return true
        })
      })
      // Check if pool will be exhausted after this draw
      if (enabledCount - count <= 0) {
        setPoolExhausted(true)
      }
    } else {
      drawn = Array.from({ length: count }, () => {
        return enabledEntries[Math.floor(Math.random() * enabledEntries.length)].name
      })
    }

    setHistory((prev) => [...prev, { round: prev.length + 1, results: drawn }])
  }, [enabledCount, drawCount, mode, enabledEntries])

  const handleClearHistory = useCallback(() => {
    setHistory([])
    setPoolExhausted(false)
  }, [])

  // Compute per-entry draw statistics
  const entryStats = new Map<string, { count: number; percentage: string }>()
  let totalDraws = 0
  history.forEach((round) => {
    round.results.forEach((name) => {
      totalDraws++
      const existing = entryStats.get(name)
      if (existing) {
        existing.count++
      } else {
        entryStats.set(name, { count: 1, percentage: '' })
      }
    })
  })
  entryStats.forEach((stat) => {
    stat.percentage = totalDraws > 0 ? ((stat.count / totalDraws) * 100).toFixed(1) + '%' : '0%'
  })

  const maxDraw = Math.max(1, enabledCount)
  const uniqueNames = useMemo(() => getUniqueNames(entries), [entries])
  const uniqueCount = uniqueNames.length

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      {/* Top-left back link (same style as FloatingLogo) */}
      <div className="fixed top-6 sm:top-8 left-6 sm:left-8 z-50">
        <Link
          to="/"
          className="font-display text-[0.6rem] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity duration-300"
          style={{ color: 'var(--text-muted)' }}
        >
          Gleamory
        </Link>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-20 sm:py-24">
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
        <p
          className="text-sm text-center mb-10"
          style={{ color: 'var(--text-muted)' }}
        >
          玄不改非，氪不改命
        </p>

        {/* Tabs */}
        <div className="flex justify-center gap-8 mb-12 border-b" style={borderStyle}>
          {['简单抽取', '原神抽卡', '更多'].map((label, i) => {
            const isActive = activeTab === i
            return (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={`relative pb-2 text-sm transition-colors ${
                  isActive ? 'font-semibold' : ''
                }`}
                style={
                  isActive
                    ? pinkSpan
                    : textMuted
                }
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
          <div className="space-y-6">
            {/* ===== Entry Management ===== */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="rounded-xl p-5"
              style={cardBg}
            >
              <h2
                className="text-xs uppercase tracking-widest mb-4"
                style={sectionLabel}
              >
                条目管理
              </h2>

              {/* Textarea */}
              <textarea
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder={'每行一个条目...\n例如：\n角色A\n角色B\n道具C'}
                rows={5}
                className="w-full rounded-md p-3 text-sm resize-y mb-3 placeholder:opacity-40"
                style={inputStyle}
              />

              {/* Append/Overwrite toggle + Add button */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex rounded-md overflow-hidden" style={borderStyle}>
                  <button
                    onClick={() => setEntryMode('append')}
                    className="px-3 py-1.5 text-xs transition-colors"
                    style={entryMode === 'append' ? activePill : buttonBase}
                  >
                    追加
                  </button>
                  <button
                    onClick={() => setEntryMode('overwrite')}
                    className="px-3 py-1.5 text-xs transition-colors"
                    style={entryMode === 'overwrite' ? activePill : buttonBase}
                  >
                    覆盖
                  </button>
                </div>
                <button
                  onClick={handleAddEntries}
                  className="px-4 py-1.5 text-xs rounded-md transition-opacity hover:opacity-80"
                  style={buttonActive}
                >
                  添加条目
                </button>
                <label className="flex items-center gap-1.5 ml-auto text-xs" style={{ color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={dedupEnabled}
                    onChange={(e) => setDedupEnabled(e.target.checked)}
                    className="w-3 h-3 rounded"
                    style={{ accentColor: 'var(--accent-pink)' }}
                  />
                  去重
                </label>
              </div>
            </motion.div>

            {/* ===== Entry List ===== */}
            {entries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="rounded-xl p-5"
                style={cardBg}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs" style={sectionLabel}>
                    共 {entries.length} 条 · {uniqueCount} 个不同条目
                  </span>
                </div>

                {/* Table header */}
                <div className="grid grid-cols-[1fr_64px_100px_auto] gap-2 items-center py-2 px-2 mb-1 text-xs" style={textMuted}>
                  <span>条目</span>
                  <span className="text-center">数量</span>
                  <span className="text-center">概率</span>
                  <span>操作</span>
                </div>

                {/* Table rows */}
                <div className="max-h-64 overflow-y-auto">
                  {uniqueNames.map((name) => {
                    const groupEntries = entries.filter((e) => e.name === name)
                    const count = groupEntries.length
                    const someEnabled = groupEntries.some((e) => e.enabled)
                    const entryProb = uniqueCount > 0 ? ((1 / uniqueCount) * 100).toFixed(1) : '0'
                    return (
                      <div
                        key={name}
                        className="grid grid-cols-[1fr_64px_100px_auto] gap-2 items-center py-2 px-2 rounded text-sm"
                        style={{ borderBottom: '1px solid var(--border-line)' }}
                      >
                        <span
                          className="truncate"
                          style={someEnabled ? textPrimary : lineThrough}
                        >
                          {name}
                        </span>
                        <span className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                          × {count}
                        </span>
                        <span className="text-center text-xs" style={textMuted}>
                          1/{uniqueCount} · {entryProb}%
                        </span>
                        <div className="flex items-center gap-1">
                          {count > 1 ? (
                            <>
                              <button
                                onClick={() => handleRemoveOne(name)}
                                className="text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
                                style={{ color: 'var(--text-muted)', border: '1px solid var(--border-line)' }}
                              >
                                移除一条
                              </button>
                              <button
                                onClick={() => handleRemoveAll(name)}
                                className="text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-70"
                                style={dangerBtnStyle}
                              >
                                移除全部
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleRemoveOne(name)}
                              className="text-xs px-2 py-0.5 rounded transition-opacity hover:opacity-70"
                              style={dangerBtnStyle}
                            >
                              移除
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )}

            {/* Empty state: no entries */}
            {entries.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="rounded-xl p-10 text-center"
                style={cardBg}
              >
                <p className="text-sm" style={textMuted}>
                  暂无条目，请在上方添加
                </p>
              </motion.div>
            )}

            {/* ===== Draw Controls ===== */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="rounded-xl p-5"
              style={cardBg}
            >
              <h2
                className="text-xs uppercase tracking-widest mb-4"
                style={sectionLabel}
              >
                抽取控制
              </h2>

              {poolExhausted ? (
                <div
                  className="rounded-md p-4 text-center mb-3"
                  style={{ background: 'var(--accent-glow)' }}
                >
                  <p className="text-sm" style={pinkSpan}>
                    {mode === 'unique'
                      ? '奖池已耗尽！请添加新条目继续抽取'
                      : '所有条目已禁用，请启用或添加新条目'}
                  </p>
                </div>
              ) : (
                <>
                  {/* N input */}
                  <div className="flex items-center gap-3 mb-4">
                    <label className="text-xs" style={sectionLabel}>
                      抽取数量
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={maxDraw}
                      value={drawCount}
                      onChange={(e) => {
                        if (e.target.value === '') {
                          setDrawCount(1)
                          return
                        }
                        const v = parseInt(e.target.value, 10)
                        if (!isNaN(v) && v >= 1) {
                          setDrawCount(Math.min(v, maxDraw))
                        }
                      }}
                      className="w-20 rounded-md px-3 py-1.5 text-sm text-center"
                      style={inputStyle}
                    />
                    <span className="text-xs" style={textMuted}>
                      / {maxDraw}
                    </span>
                  </div>

                  {/* Mode toggle */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex rounded-md overflow-hidden" style={borderStyle}>
                      <button
                        onClick={() => handleModeSwitch('unique')}
                        className="px-3 py-1.5 text-xs transition-colors"
                        style={mode === 'unique' ? activePill : buttonBase}
                      >
                        不重复
                      </button>
                      <button
                        onClick={() => handleModeSwitch('repeat')}
                        className="px-3 py-1.5 text-xs transition-colors"
                        style={mode === 'repeat' ? activePill : buttonBase}
                      >
                        可重复
                      </button>
                    </div>
                    <span className="text-xs" style={textMuted}>
                      {mode === 'unique'
                        ? '抽中即移出奖池'
                        : '每次独立抽取'}
                    </span>
                  </div>

                  {/* Draw button */}
                  <motion.button
                    onClick={handleDraw}
                    disabled={enabledCount === 0}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-4 rounded-xl text-base font-semibold tracking-widest transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{
                      background: 'var(--accent-pink)',
                      color: '#fff',
                      boxShadow: '0 0 30px var(--accent-glow), 0 0 60px var(--accent-glow)',
                    }}
                  >
                    抽 取
                  </motion.button>

                  {/* Clear history */}
                  {history.length > 0 && (
                    <button
                      onClick={handleClearHistory}
                      className="mt-3 text-xs transition-opacity hover:opacity-70"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      清除抽取记录
                    </button>
                  )}
                </>
              )}
            </motion.div>

            {/* ===== Results ===== */}
            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="rounded-xl p-5"
                style={cardBg}
              >
                <h2
                  className="text-xs uppercase tracking-widest mb-4"
                  style={sectionLabel}
                >
                  抽取结果
                </h2>

                <div className="space-y-4">
                  <AnimatePresence>
                    {history.map((round) => (
                      <motion.div
                        key={round.round}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className="p-3 rounded-md"
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-line)',
                        }}
                      >
                        <div
                          className="text-[0.65rem] uppercase tracking-widest mb-2"
                          style={textMuted}
                        >
                          第 {round.round} 轮
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {round.results.map((name, i) => (
                            <motion.span
                              key={i}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.06, duration: 0.3 }}
                              className="inline-block px-2.5 py-1 rounded text-sm"
                              style={{
                                background: 'var(--accent-glow)',
                                color: 'var(--accent-pink)',
                              }}
                            >
                              {name}
                            </motion.span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Empty state: no draws yet */}
            {history.length === 0 && entries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="rounded-xl p-10 text-center"
                style={cardBg}
              >
                <p className="text-sm" style={textMuted}>
                  尚未抽取，点击「抽取」按钮开始
                </p>
              </motion.div>
            )}

            {/* Pool exhausted message when no entries but had draws */}
            {history.length > 0 && entries.length === 0 && mode === 'unique' && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="rounded-xl p-5 text-center"
                style={{ ...cardBg, border: '1px solid var(--accent-glow)' }}
              >
                <p className="text-sm" style={pinkSpan}>
                  奖池已完全耗尽，所有条目均已被抽取
                </p>
              </motion.div>
            )}

            {/* ===== Stats ===== */}
            {totalDraws > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="rounded-xl p-5"
                style={cardBg}
              >
                <h2
                  className="text-xs uppercase tracking-widest mb-4"
                  style={sectionLabel}
                >
                  统计摘要
                </h2>
                <p className="text-xs mb-4" style={textMuted}>
                  共抽取 {totalDraws} 次，{history.length} 轮
                </p>
                <div className="space-y-2.5">
                  {Array.from(entryStats.entries())
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([name, stat]) => (
                      <div
                        key={name}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-24 truncate flex-shrink-0" style={textPrimary}>
                          {name}
                        </span>
                        <div
                          className="flex-1 h-2 rounded-full"
                          style={{ background: 'var(--border-line)' }}
                        >
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: stat.percentage }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full"
                            style={{ background: 'var(--accent-pink)' }}
                          />
                        </div>
                        <span className="flex-shrink-0 text-xs w-20 text-right" style={textMuted}>
                          {stat.count} 次 ({stat.percentage})
                        </span>
                      </div>
                    ))}
                </div>
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
