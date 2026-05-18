import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

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
}

const STORAGE_KEY = 'gacha-simulator-state'

function loadState(): GachaState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        entries: parsed.entries || [],
        mode: parsed.mode || 'unique',
        history: parsed.history || [],
      }
    }
  } catch {
    /* corrupted data, reset */
  }
  return { entries: [], mode: 'unique', history: [] }
}

function saveState(state: GachaState) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* quota exceeded, silently ignore */
  }
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
  color: '#fff',
}

const buttonBase: React.CSSProperties = {
  background: 'var(--bg-elevated)',
  border: '1px solid var(--border-line)',
  color: 'var(--text-secondary)',
}

const buttonActive: React.CSSProperties = {
  background: 'var(--accent-pink)',
  border: '1px solid var(--accent-pink)',
  color: '#fff',
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
  const [drawCount, setDrawCount] = useState(1)
  const [poolExhausted, setPoolExhausted] = useState(false)
  const [activeTab, setActiveTab] = useState(0)

  const enabledEntries = entries.filter((e) => e.enabled)
  const enabledCount = enabledEntries.length
  const disabledCount = entries.length - enabledCount

  // Restore state from sessionStorage on mount
  useEffect(() => {
    const saved = loadState()
    setEntries(saved.entries)
    setMode(saved.mode)
    setHistory(saved.history)
    if (saved.mode === 'unique' && saved.entries.length > 0 && saved.entries.every((e) => !e.enabled)) {
      setPoolExhausted(true)
    }
  }, [])

  // Persist state to sessionStorage on change
  useEffect(() => {
    saveState({ entries, mode, history })
  }, [entries, mode, history])

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
      setEntries(deduped)
      setHistory([])
      setPoolExhausted(false)
    } else {
      // Append: merge, skip names that already exist
      const existingNames = new Set(entries.map((e) => e.name))
      const deduped = newEntries.filter((e) => {
        if (existingNames.has(e.name)) return false
        existingNames.add(e.name)
        return true
      })
      if (deduped.length > 0) {
        setEntries((prev) => [...prev, ...deduped])
        setPoolExhausted(false)
      }
    }

    setEntryText('')
  }, [entryText, entryMode, entries])

  const handleToggleEntry = useCallback((index: number) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, enabled: !e.enabled } : e))
    )
    // Toggling doesn't clear history per spec
  }, [])

  const handleRemoveEntry = useCallback((index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index))
    setHistory([]) // Remove entry clears all draw history
    setPoolExhausted(false)
  }, [])

  const handleModeSwitch = useCallback((newMode: 'unique' | 'repeat') => {
    if (newMode !== mode) {
      setMode(newMode)
      setHistory([])
      setPoolExhausted(false)
    }
  }, [mode])

  const handleDraw = useCallback(() => {
    if (enabledCount === 0) return
    const count = Math.min(drawCount, enabledCount)

    let drawn: string[]
    if (mode === 'unique') {
      const shuffled = [...enabledEntries].sort(() => Math.random() - 0.5)
      drawn = shuffled.slice(0, count).map((e) => e.name)
      // Remove drawn entries from pool
      const drawnSet = new Set(drawn)
      setEntries((prev) => prev.filter((e) => !drawnSet.has(e.name)))
      // Check if pool will be exhausted after this draw
      if (enabledCount - count <= 0) {
        setPoolExhausted(true)
      }
    } else {
      drawn = Array.from({ length: count }, () => {
        return enabledEntries[Math.floor(Math.random() * enabledEntries.length)].name
      })
    }

    const round = history.length + 1
    setHistory((prev) => [...prev, { round, results: drawn }])
  }, [enabledCount, drawCount, mode, enabledEntries, history.length])

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
        <h1
          className="font-display text-3xl sm:text-4xl text-center mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          抽卡模拟器
        </h1>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* LEFT COLUMN */}
            <div>
              {/* ===== Entry Management ===== */}
        <div
          className="rounded-lg p-5 mb-6"
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
          </div>
        </div>

        {/* Entry List + Stats */}
        {entries.length > 0 && (
          <div
            className="rounded-lg p-5 mb-6"
            style={cardBg}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs" style={sectionLabel}>
                共 {entries.length} 条
                {disabledCount > 0 && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    {' '}| 已禁用 {disabledCount} 条
                  </span>
                )}
              </span>
              <span className="text-xs" style={textMuted}>
                当前概率: 1/{enabledCount > 0 ? enabledCount : '—'} × {(enabledCount > 0 ? (1 / enabledCount * 100).toFixed(2) : 0)}%
              </span>
            </div>

            {/* Entry list */}
            <ul className="space-y-1 max-h-64 overflow-y-auto">
              <AnimatePresence>
                {entries.map((entry, i) => (
                  <motion.li
                    key={`${entry.name}-${i}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between py-1.5 px-2 rounded text-sm"
                    style={{
                      borderBottom: '1px solid var(--border-line)',
                    }}
                  >
                    <span
                      className="flex-1 truncate"
                      style={entry.enabled ? textPrimary : lineThrough}
                    >
                      {entry.name}
                    </span>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {/* Enable/disable toggle */}
                      <button
                        onClick={() => handleToggleEntry(i)}
                        className="text-[0.65rem] px-2 py-0.5 rounded transition-colors"
                        style={
                          entry.enabled
                            ? { ...buttonBase, opacity: 0.8 }
                            : { ...buttonBase, opacity: 0.35 }
                        }
                        title={entry.enabled ? '禁用' : '启用'}
                      >
                        {entry.enabled ? '启用' : '禁用'}
                      </button>
                      {/* Remove button */}
                      <button
                        onClick={() => handleRemoveEntry(i)}
                        className="text-sm w-5 h-5 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
                        style={dangerBtnStyle}
                        title="移除"
                      >
                        ×
                      </button>
                    </div>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        )}

        {/* Empty state: no entries */}
        {entries.length === 0 && (
          <div
            className="rounded-lg p-10 mb-6 text-center"
            style={cardBg}
          >
            <p className="text-sm" style={textMuted}>
              暂无条目，请在上方添加
            </p>
          </div>
        )}

            </div>

            {/* RIGHT COLUMN */}
            <div>
              {/* ===== Draw Controls ===== */}
        <div
          className="rounded-lg p-5 mb-6"
          style={cardBg}
        >
          <h2
            className="text-xs uppercase tracking-widest mb-4"
            style={sectionLabel}
          >
            抽取控制
          </h2>

          {poolExhausted && mode === 'unique' ? (
            <div
              className="rounded-md p-4 text-center mb-3"
              style={{ background: 'var(--accent-glow)' }}
            >
              <p className="text-sm" style={pinkSpan}>
                奖池已耗尽！请添加新条目继续抽取
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
              <button
                onClick={handleDraw}
                disabled={enabledCount === 0}
                className="w-full py-2.5 rounded-md text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
                style={buttonActive}
              >
                抽 取
              </button>

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
        </div>

        {/* ===== Results ===== */}
        {history.length > 0 && (
          <div
            className="rounded-lg p-5 mb-6"
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
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
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
                      {round.results.map((name, j) => (
                        <span
                          key={j}
                          className="inline-block px-2.5 py-1 rounded text-sm"
                          style={{
                            background: 'var(--accent-glow)',
                            color: 'var(--accent-pink)',
                          }}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Summary statistics */}
            {totalDraws > 0 && (
              <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--border-line)' }}>
                <div
                  className="text-[0.65rem] uppercase tracking-widest mb-3"
                  style={sectionLabel}
                >
                  统计摘要
                </div>
                <p className="text-xs mb-3" style={textMuted}>
                  共抽取 {totalDraws} 次，{history.length} 轮
                </p>
                <div className="space-y-1.5">
                  {Array.from(entryStats.entries())
                    .sort((a, b) => b[1].count - a[1].count)
                    .map(([name, stat]) => (
                      <div
                        key={name}
                        className="flex items-center justify-between text-sm py-1 px-2 rounded"
                      >
                        <span style={textPrimary}>{name}</span>
                        <span style={textMuted}>
                          {stat.count} 次 ({stat.percentage})
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state: no draws yet */}
        {history.length === 0 && entries.length > 0 && (
          <div
            className="rounded-lg p-10 mb-6 text-center"
            style={cardBg}
          >
            <p className="text-sm" style={textMuted}>
              尚未抽取，点击「抽取」按钮开始
            </p>
          </div>
        )}

        {/* Pool exhausted message when no entries but had draws */}
        {history.length > 0 && entries.length === 0 && mode === 'unique' && (
          <div
            className="rounded-lg p-5 mb-6 text-center"
            style={{ ...cardBg, border: '1px solid var(--accent-glow)' }}
          >
            <p className="text-sm" style={pinkSpan}>
              奖池已完全耗尽，所有条目均已被抽取
            </p>
          </div>
        )}

            </div>
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
