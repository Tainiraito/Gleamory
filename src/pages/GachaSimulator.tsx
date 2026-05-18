import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SiteHeader from '@/components/SiteHeader'

interface Entry {
  name: string
  enabled: boolean
}

interface GachaState {
  entries: Entry[]
  history: string[]
  cardOrder: number[]
  flipped: boolean[]
  presetName: string
}

const STORAGE_KEY = 'gacha-simulator-state'

const ANIME_PRESET = [
  'gbc所有人', '尼尔机械纪元-2B', '魔禁-神裂火织', '刀剑神域-亚丝娜',
  '旋风管家-天王州雅典娜', '约会大作战-所有精灵', '中二病也要谈恋爱-MoriSummer',
  '恶魔高校-所有女角色', '甘城光辉游乐园-千斗五十铃', '转生史莱姆-井泽静江',
  '转生史莱姆-朱莱', '转生史莱姆-紫苑', '兔女郎-樱岛麻衣',
  '辉夜大小姐-辉夜', '辉夜大小姐-藤原', '辉夜大小姐-早坂爱', '罗小黑-师姐',
  'jojo-承太郎', 'jojo-dio', 'jojo-空条徐伦', 'jojo-天气预报',
  '斩服少女-缠流子', '轻音少女-所有人', '魔女之旅-伊蕾娜', '碧蓝之海-千纱',
  'lycoris recoil-两主角', '石纪元-杠', '石纪元-大葱哥', '孤独摇滚-所有人',
  '无职转生-卢迪乌斯', '无职转生-洛琪希', '无职转生-希露菲', '无职转生-艾丽丝',
  '我独自升级-车惠怡', '葬送的芙莉莲-芙莉莲', '葬送的芙莉莲-肥伦',
  '赛博朋克-露西', '擅长捉弄的高木同学-高木', '明日酱的水手服-明日小路',
  '明日酱的水手服-木崎江利花', '跃动青春-村重结月', '胆大党-momo',
  '我心里危险的东西-山田杏奈', '薰香花朵凛然绽放-薰子', '原神-克洛琳德',
  '原神-仆人', '原神-月神', '原神-八重神子', '崩铁-星', '崩铁-流萤',
  '崩铁-八重樱', '绝区零-星见雅', '绝区零-仪玄', '绝区零-叶瞬光',
  '终末地-庄方宜', '终末地-洁哥', '终末地-42', '鸣潮-长离',
  '鸣潮-坎特蕾拉', '鸣潮-爱弥斯',
]

const SUITS = ['♠', '♥', '♦', '♣']
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const POKER_PRESET = SUITS.flatMap((s) => RANKS.map((r) => `${s}${r}`)).concat(['🃏Joker', '🃏Joker'])

const MAJOR_ARCANA = [
  '0愚者', 'I魔术师', 'II女祭司', 'III女皇', 'IV皇帝', 'V教皇',
  'VI恋人', 'VII战车', 'VIII力量', 'IX隐士', 'X命运之轮',
  'XI正义', 'XII倒吊人', 'XIII死神', 'XIV节制', 'XV恶魔',
  'XVI高塔', 'XVII星星', 'XVIII月亮', 'XIX太阳', 'XX审判', 'XXI世界',
]
const TAROT_SUITS = ['权杖', '圣杯', '宝剑', '星币']
const TAROT_RANKS = ['Ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', '侍从', '骑士', '皇后', '国王']
const MINOR_ARCANA = TAROT_SUITS.flatMap((s) => TAROT_RANKS.map((r) => `${s}${r}`))
const TAROT_PRESET = [...MAJOR_ARCANA, ...MINOR_ARCANA]

const PRESETS: Record<string, string[]> = {
  '二次元角色': ANIME_PRESET,
  '扑克牌': POKER_PRESET,
  '塔罗牌': TAROT_PRESET,
}
const PRESET_NAMES = Object.keys(PRESETS)

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Probability based on remaining (unflipped) cards only — next-click chance
function remainingProb(name: string, remainingEntries: Entry[], remainingTotal: number) {
  const sameNameCount = remainingEntries.filter((e) => e.name === name).length
  const single = ((1 / remainingTotal) * 100).toFixed(1)
  const grouped = ((sameNameCount / remainingTotal) * 100).toFixed(1)
  return { single, grouped, showBoth: single !== grouped }
}

function loadState(): GachaState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      const entries = Array.isArray(p.entries) ? p.entries.filter((e: unknown) => e != null && typeof (e as Entry).name === 'string') : []
      const history = Array.isArray(p.history) ? p.history : []
      const cardOrder = Array.isArray(p.cardOrder) ? p.cardOrder : []
      const flipped = Array.isArray(p.flipped) ? p.flipped : []
      const presetName = typeof p.presetName === 'string' && PRESET_NAMES.includes(p.presetName) ? p.presetName : '二次元角色'
      if (entries.length > 0) return { entries, history, cardOrder, flipped, presetName }
    }
  } catch { /* ignore */ }
  const defaultName = '二次元角色'
  const names = PRESETS[defaultName]
  const preset = names.map((n) => ({ name: n, enabled: true }))
  return { entries: preset, history: [], cardOrder: shuffle(preset.map((_, i) => i)), flipped: new Array(preset.length).fill(false), presetName: defaultName }
}

function saveState(s: GachaState) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch { /* quota */ }
}

const GachaSimulator = () => {
  const [entries, setEntries] = useState<Entry[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [cardOrder, setCardOrder] = useState<number[]>([])
  const [flipped, setFlipped] = useState<boolean[]>([])
  const [activePreset, setActivePreset] = useState('二次元角色')
  const [entryText, setEntryText] = useState('')
  const [entryMode, setEntryMode] = useState<'append' | 'overwrite'>('append')
  const [dedupEnabled, setDedupEnabled] = useState(true)

  useEffect(() => {
    const saved = loadState()
    setEntries(saved.entries)
    setHistory(saved.history)
    setCardOrder(saved.cardOrder)
    setFlipped(saved.flipped)
    setActivePreset(saved.presetName)
  }, [])

  useEffect(() => {
    if (entries.length > 0) {
      const timer = setTimeout(() => saveState({ entries, history, cardOrder, flipped, presetName: activePreset }), 300)
      return () => clearTimeout(timer)
    }
  }, [entries, history, cardOrder, flipped, activePreset])

  const switchPreset = useCallback((name: string) => {
    if (name === activePreset) return
    const entryNames = PRESETS[name]
    const newEntries = entryNames.map((n) => ({ name: n, enabled: true }))
    setActivePreset(name)
    setEntries(newEntries)
    setCardOrder(shuffle(newEntries.map((_, i) => i)))
    setFlipped(new Array(newEntries.length).fill(false))
    setHistory([])
    setEntryText('')
  }, [activePreset])

  const rebuild = useCallback((newEntries: Entry[]) => {
    setCardOrder(shuffle(newEntries.map((_, i) => i)))
    setFlipped(new Array(newEntries.length).fill(false))
    setHistory([])
  }, [])

  const handleAddEntries = useCallback(() => {
    const lines = entryText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0)
    if (lines.length === 0) return
    const newEntries: Entry[] = lines.map((n) => ({ name: n, enabled: true }))
    if (entryMode === 'overwrite') {
      const seen = new Set<string>()
      const deduped = newEntries.filter((e) => { if (seen.has(e.name)) return false; seen.add(e.name); return true })
      const final = dedupEnabled ? deduped : newEntries
      setEntries(final)
      rebuild(final)
    } else {
      if (dedupEnabled) {
        const existing = new Set(entries.map((e) => e.name))
        const deduped = newEntries.filter((e) => { if (existing.has(e.name)) return false; existing.add(e.name); return true })
        if (deduped.length === 0) return
        const merged = [...entries, ...deduped]
        setEntries(merged)
        rebuild(merged)
      } else {
        const merged = [...entries, ...newEntries]
        setEntries(merged)
        rebuild(merged)
      }
    }
    setEntryText('')
  }, [entryText, entryMode, entries, dedupEnabled, rebuild])

  const handleCardClick = useCallback((cardIdx: number) => {
    if (flipped[cardIdx]) return
    const nf = [...flipped]; nf[cardIdx] = true
    const drawn = entries[cardOrder[cardIdx]].name
    setFlipped(nf)
    setHistory((prev) => [...prev, drawn])
  }, [flipped, entries, cardOrder])

  const handleReset = useCallback(() => {
    // First flip all cards face-down (play cover animation)
    setFlipped(new Array(entries.length).fill(false))
    // After flip animation completes, shuffle and clear history
    const timer = setTimeout(() => {
      setCardOrder(shuffle(entries.map((_, i) => i)))
      setHistory([])
    }, 500)
    return () => clearTimeout(timer)
  }, [entries])
  const handleResetDefault = useCallback(() => {
    const names = PRESETS[activePreset]
    const preset = names.map((n) => ({ name: n, enabled: true }))
    setEntries(preset)
    setCardOrder(shuffle(preset.map((_, i) => i)))
    setFlipped(new Array(preset.length).fill(false))
    setHistory([])
  }, [activePreset])

  const handleRemoveEntry = useCallback((entryIdx: number) => {
    const ne = entries.filter((_, i) => i !== entryIdx)
    setEntries(ne)
    if (ne.length > 0) rebuild(ne)
  }, [entries, rebuild])

  const flippedCount = flipped.filter(Boolean).length
  const totalCards = entries.length
  const remainingCount = totalCards - flippedCount
  const remainingEntries = useMemo(() => {
    return cardOrder
      .map((entryIdx, cardIdx) => ({ entryIdx, cardIdx, entry: entries[entryIdx] }))
      .filter(({ cardIdx }) => !flipped[cardIdx])
      .map(({ entry }) => entry)
  }, [cardOrder, flipped, entries])
  const allFlipped = flippedCount === entries.length && entries.length > 0

  const drawnStats = useMemo(() => {
    const s = new Map<string, number>()
    history.forEach((n) => s.set(n, (s.get(n) || 0) + 1))
    return s
  }, [history])

  // Pre-compute card-face probabilities to avoid O(n²) filter per render
  const cardProbMap = useMemo(() => {
    const total = entries.length
    return entries.map((entry) => {
      const sameNameCount = entries.filter((e) => e.name === entry.name).length
      const single = ((1 / total) * 100).toFixed(1)
      const grouped = ((sameNameCount / total) * 100).toFixed(1)
      return { single, grouped, showBoth: single !== grouped }
    })
  }, [entries])

  // Memoize card grid: only re-render when card data changes, not on unrelated state (entryText, toggles)
  const cardGrid = useMemo(() => {
    return cardOrder.map((entryIdx, cardIdx) => {
      const isFlipped = flipped[cardIdx]
      const entry = entries[entryIdx]
      const { single, grouped, showBoth } = cardProbMap[entryIdx]

      return (
        <motion.button key={cardIdx} onClick={() => handleCardClick(cardIdx)}
          style={{ perspective: 600, aspectRatio: '2/3', cursor: isFlipped ? 'default' : 'pointer', padding: 0, border: 'none', background: 'transparent' }}
          whileHover={!isFlipped ? { scale: 1.08, zIndex: 10 } : {}}
          whileTap={!isFlipped ? { scale: 0.95 } : {}}>
          <motion.div
            animate={{ rotateY: isFlipped ? 180 : 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            style={{ width: '100%', height: '100%', transformStyle: 'preserve-3d', position: 'relative' }}>
            {/* Back — warm paper */}
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', background: '#e2d8c8', border: '0.5px solid rgba(196, 149, 106, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="font-display text-xl font-bold select-none" style={{ color: 'rgba(196, 149, 106, 0.3)' }}>?</span>
            </div>
            {/* Front — warm paper */}
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', background: 'var(--bg-card)', border: '0.5px solid var(--border-line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px' }}>
              <span className="block font-display text-sm font-semibold text-center leading-snug mb-1" style={{ color: 'var(--text-primary)', wordBreak: 'break-word' }}>{entry.name}</span>
              {isFlipped && (
                <span className="text-xs text-center" style={{ color: 'var(--accent-amber)' }}>
                  {single}%{showBoth ? ` (${grouped}%)` : ''}
                </span>
              )}
            </div>
          </motion.div>
        </motion.button>
      )
    })
  }, [cardOrder, entries, flipped, cardProbMap])

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <main className="px-4 sm:px-[15%] py-20 sm:py-24">
        <motion.h1 initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="font-display text-3xl sm:text-4xl tracking-tight text-center mb-2" style={{ color: 'var(--text-primary)' }}>
          翻牌抽卡
        </motion.h1>
        <p className="text-sm text-center mb-8" style={{ color: 'var(--text-muted)' }}>翻开一张卡，看看是谁来找你</p>

        {/* 3-column layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* === Left: Add cards + Remaining === */}
          <div className="w-full lg:w-64 shrink-0 space-y-5">
            {/* Preset switching */}
            <div className="p-5" style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}>
              <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>切换牌组</h2>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_NAMES.map((name) => (
                  <button key={name} onClick={() => switchPreset(name)}
                    className="px-2.5 py-1 text-xs transition-all cursor-pointer rounded-sm"
                    style={{
                      background: activePreset === name ? 'var(--accent-subtle)' : 'transparent',
                      color: activePreset === name ? 'var(--accent-amber)' : 'var(--text-muted)',
                      border: '0.5px solid var(--border-line)',
                    }}>{name}</button>
                ))}
              </div>
            </div>

            <div className="p-5" style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}>
              <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>添加卡牌</h2>
              <textarea value={entryText} onChange={(e) => setEntryText(e.target.value)}
                placeholder={'每行一个条目...'} rows={4}
                className="w-full p-3 text-sm resize-y mb-3 placeholder:opacity-40"
                style={{ color: 'var(--text-primary)', border: '0.5px solid var(--border-line)', background: 'var(--bg-card)' }} />
              <div className="flex mb-2" style={{ border: '0.5px solid var(--border-line)' }}>
                <button onClick={() => setDedupEnabled(true)}
                  className="px-3 py-1.5 text-xs transition-all flex-1 cursor-pointer"
                  style={{ background: dedupEnabled ? 'var(--accent-subtle)' : 'transparent', color: dedupEnabled ? 'var(--accent-amber)' : 'var(--text-muted)' }}>去重</button>
                <button onClick={() => setDedupEnabled(false)}
                  className="px-3 py-1.5 text-xs transition-all flex-1 cursor-pointer"
                  style={{ borderLeft: '0.5px solid var(--border-line)', background: !dedupEnabled ? 'var(--accent-subtle)' : 'transparent', color: !dedupEnabled ? 'var(--accent-amber)' : 'var(--text-muted)' }}>不去重</button>
              </div>
              <div className="flex mb-2" style={{ border: '0.5px solid var(--border-line)' }}>
                <button onClick={() => setEntryMode('append')}
                  className="px-3 py-1.5 text-xs transition-all flex-1 cursor-pointer"
                  style={{ background: entryMode === 'append' ? 'var(--accent-subtle)' : 'transparent', color: entryMode === 'append' ? 'var(--accent-amber)' : 'var(--text-muted)' }}>追加</button>
                <button onClick={() => setEntryMode('overwrite')}
                  className="px-3 py-1.5 text-xs transition-all flex-1 cursor-pointer"
                  style={{ borderLeft: '0.5px solid var(--border-line)', background: entryMode === 'overwrite' ? 'var(--accent-subtle)' : 'transparent', color: entryMode === 'overwrite' ? 'var(--accent-amber)' : 'var(--text-muted)' }}>覆盖</button>
              </div>
              <button onClick={handleAddEntries}
                className="w-full py-2 text-xs transition-all cursor-pointer"
                style={{ border: '0.5px solid var(--border-line)', background: 'transparent', color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-stamp)'; e.currentTarget.style.color = 'var(--bg-page)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                添加卡牌
              </button>
            </div>

            {/* Remaining cards */}
            <div className="p-5" style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}>
              <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
                剩余卡牌 {remainingCount} / {totalCards}
              </h2>
              <div className="max-h-80 overflow-y-auto space-y-0.5">
                {cardOrder
                  .map((entryIdx, cardIdx) => ({ entryIdx, cardIdx, entry: entries[entryIdx] }))
                  .filter(({ cardIdx }) => !flipped[cardIdx])
                  .sort((a, b) => a.entry.name.localeCompare(b.entry.name, 'zh-CN'))
                  .map(({ entryIdx, cardIdx, entry }) => {
                  const { single, grouped, showBoth } = remainingProb(entry.name, remainingEntries, remainingCount)
                  return (
                    <div key={cardIdx} className="flex items-center gap-1 py-0.5 group hover:bg-black/5 rounded px-1 -mx-1 transition-colors">
                      <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-muted)' }}>{entry.name}</span>
                      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{single}%{showBoth ? `(${grouped}%)` : ''}</span>
                      <button onClick={() => handleRemoveEntry(entryIdx)}
                        className="text-[0.6rem] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 px-1 cursor-pointer"
                        style={{ color: 'var(--accent-amber)' }}>×</button>
                    </div>
                  )
                })}
              </div>
              <div className="flex justify-between mt-3 pt-3" style={{ borderTop: '0.5px solid var(--border-line)' }}>
                <button onClick={handleReset} className="text-xs transition-colors hover:opacity-70 cursor-pointer" style={{ color: 'var(--text-muted)' }}>重新洗牌</button>
                <button onClick={handleResetDefault} className="text-xs transition-colors hover:opacity-70 cursor-pointer" style={{ color: 'var(--text-muted)' }}>重置当前</button>
              </div>
            </div>
          </div>

          {/* === Middle: Card Flip Area === */}
          <div className="flex-1 min-w-0">
            {entries.length === 0 ? (
              <div className="flex items-center justify-center py-32" style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>✦ 添加卡牌开始抽卡</p>
              </div>
            ) : (
              <div className="p-4 sm:p-5" style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}>
                {/* All-flipped banner */}
                {allFlipped && (
                  <div className="text-center mb-4 py-3" style={{ background: 'var(--accent-glow)' }}>
                    <p className="font-display text-base mb-2" style={{ color: 'var(--text-primary)' }}>全部翻完啦 ✦</p>
                    <button onClick={handleReset}
                      className="px-4 py-1.5 text-xs transition-all cursor-pointer"
                      style={{ border: '0.5px solid var(--border-line)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--ink-stamp)'; e.currentTarget.style.color = 'var(--bg-page)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                      重新洗牌
                    </button>
                  </div>
                )}

                {/* Progress bar + shuffle button */}
                {!allFlipped && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border-line)' }}>
                      <motion.div className="h-full rounded-full" style={{ background: 'var(--accent-amber)' }}
                        animate={{ width: totalCards > 0 ? `${(flippedCount / totalCards) * 100}%` : '0%' }}
                        transition={{ duration: 0.3 }} />
                    </div>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>{flippedCount}/{totalCards}</span>
                    <button onClick={handleReset}
                      className="text-xs transition-all hover:opacity-70 shrink-0 px-2 py-0.5 cursor-pointer"
                      style={{ border: '0.5px solid var(--border-line)', color: 'var(--text-muted)', cursor: 'pointer' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--accent-glow)'; e.currentTarget.style.color = 'var(--accent-amber)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                      洗牌
                    </button>
                  </div>
                )}

                {/* Card grid — 5 columns max */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))', gap: '0.5rem' }}>
                  {cardGrid}
                </div>
              </div>
            )}
          </div>

          {/* === Right: Drawn Results — hidden on mobile (shown below) === */}
          <div className="hidden lg:block w-full lg:w-64 shrink-0 space-y-5">
            {history.length > 0 ? (
              <div className="p-5" style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}>
                <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>
                  已抽结果 ({history.length})
                </h2>
                <div className="max-h-60 overflow-y-auto space-y-1 mb-4">
                  {[...history].reverse().map((name, i) => (
                    <div key={`h-${name}-${i}`} className="flex items-center gap-1.5">
                      <span className="text-[0.6rem] shrink-0" style={{ color: 'var(--text-muted)' }}>#{history.length - i}</span>
                      <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                    </div>
                  ))}
                </div>
                <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>抽卡统计</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {Array.from(drawnStats.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                    const pct = ((count / history.length) * 100).toFixed(1)
                    return (
                      <div key={`s-${name}`} className="flex items-center gap-2">
                        <span className="text-xs w-14 truncate shrink-0" style={{ color: 'var(--text-primary)' }}>{name}</span>
                        <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--border-line)' }}>
                          <div className="h-full rounded-full" style={{ width: pct + '%', background: 'var(--accent-amber)' }} />
                        </div>
                        <span className="text-[0.6rem] w-14 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{count}({pct}%)</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              entries.length > 0 && (
                <div className="p-5 text-center" style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>✦ 翻开卡牌开始抽卡</p>
                </div>
              )
            )}
          </div>
        </div>
      </main>

      {/* Mobile: Results below (only on small screens) */}
      {history.length > 0 && (
        <div className="lg:hidden px-4 sm:px-6 pb-12">
          <div className="p-5" style={{ background: 'var(--bg-card-warm)', border: '0.5px solid var(--border-line)' }}>
            <h2 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-secondary)' }}>已抽结果 ({history.length})</h2>
            <div className="max-h-48 overflow-y-auto space-y-1 mb-3">
              {[...history].reverse().map((name, i) => (
                <div key={`mh-${name}-${i}`} className="flex items-center gap-1.5">
                  <span className="text-[0.6rem] shrink-0" style={{ color: 'var(--text-muted)' }}>#{history.length - i}</span>
                  <span className="text-xs truncate" style={{ color: 'var(--text-primary)' }}>{name}</span>
                </div>
              ))}
            </div>
            <h3 className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>抽卡统计</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Array.from(drawnStats.entries()).sort((a, b) => b[1] - a[1]).map(([name, count]) => {
                const pct = ((count / history.length) * 100).toFixed(1)
                return (
                  <div key={`ms-${name}`} className="flex items-center gap-2">
                    <span className="text-xs w-14 truncate shrink-0" style={{ color: 'var(--text-primary)' }}>{name}</span>
                    <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--border-line)' }}>
                      <div className="h-full rounded-full" style={{ width: pct + '%', background: 'var(--accent-amber)' }} />
                    </div>
                    <span className="text-[0.6rem] w-14 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>{count}({pct}%)</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <footer className="flex flex-col items-center gap-3 pt-8 pb-12">
        <div style={{ width: '6px', height: '1px', background: 'var(--border-line)' }} />
        <Link to="/" className="text-[0.6rem] uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color: 'var(--text-muted)' }}>&larr; 返回首页</Link>
      </footer>
    </div>
  )
}

export default GachaSimulator
