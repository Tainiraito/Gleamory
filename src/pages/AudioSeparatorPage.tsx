/* ============================================================
 * 音轨分离 — v0.4
 *  6 项 UX 优化(主人 2026-06-04 feedback):
 *   1. 缓存管理自动刷新(下载/删除/清空完成 → metas 即时重查)
 *   2. 下载进度条移至「上传音频」section 顶部
 *   3. 下载按钮 + 模型下拉 同行(flex-1 下拉 + shrink-0 按钮)
 *   4. 下拉 <option> 标「✓ 已缓存 / 未缓存」
 *   5. 卡片右上角无 status 角标,只靠按钮文字表达
 *   6. 缓存管理面板 单条删除按钮
 *  Bug 修复:
 *   - StemCard 外层 <motion.button> 改成 <motion.div role="button">,
 *     避免内部按钮嵌套导致的 hydration 错误 + click 失效
 * ============================================================ */

import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CloudUpload,
  FileAudio,
  Download,
  Lock,
  ChevronDown,
  HardDrive,
  Trash2,
  X,
  AlertCircle,
  Sparkles,
  Music,
  Settings2,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import { ProjectPageHeader } from '@/components/ProjectPageHeader'
import BackFooter from '@/components/BackFooter'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import {
  useSeparator,
  buildDefaultSelections,
  type SeparatorPhase,
  type StemSelections,
} from '@/hooks/useSeparator'
import { ALL_STEMS, getModelsForStem, type ModelInfo, type StemKey } from '@/lib/onnx/modelRegistry'

const STEM_META: Record<StemKey, { label: string; accent: string }> = {
  vocals: { label: '人声', accent: '#c4956a' },
  drums: { label: '鼓', accent: '#d68b8b' },
  bass: { label: '贝斯', accent: '#7a9b6e' },
  other: { label: '伴奏', accent: '#8a8590' },
}

const AudioSeparatorPage = () => {
  useDocumentTitle('音轨分离 | Gleamory 微光集')

  const {
    state,
    selectFile,
    start,
    cancel,
    reset,
    downloadStemWav,
    cacheModel,
    uncacheModel,
    clearAllCache,
    refreshCacheMetas,
  } = useSeparator()
  const [selections, setSelections] = useState<StemSelections>(buildDefaultSelections)

  /* -------- 分轨选择 handlers -------- */
  const toggleStem = useCallback((stem: StemKey) => {
    setSelections((prev) => ({
      ...prev,
      [stem]: { ...prev[stem], enabled: !prev[stem].enabled },
    }))
  }, [])

  const setModelForStem = useCallback((stem: StemKey, modelId: string) => {
    setSelections((prev) => ({
      ...prev,
      [stem]: { ...prev[stem], modelId },
    }))
  }, [])

  const enabledCount = ALL_STEMS.filter((s) => selections[s].enabled).length

  /* ---- 当前正在下载的模型(用于下载进度条) ---- */
  const downloadingModelId =
    state.cacheAction.phase === 'downloading' ? state.cacheAction.targetId : null
  const downloadingModelName = downloadingModelId
    ? state.cacheMetas.find((m) => m.id === downloadingModelId)?.id ?? downloadingModelId
    : null

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <main className="px-4 sm:px-[15%] pt-20 sm:pt-24 pb-36 sm:pb-24">
        <ProjectPageHeader
          name="音轨分离"
          englishName="Audio Stem Separator"
          description="浏览器内本地分离歌曲人声/鼓/贝斯/伴奏，数据不离开设备"
          version="0.4.0"
        />

        {/* ① 顶部隐私/资源说明(可展开) */}
        <PrivacyNotice />

        {/* ② 分轨 + 模型选择 */}
        <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="stem-heading">
          <h2
            id="stem-heading"
            className="text-xs uppercase tracking-[0.25em] font-medium mb-4 flex items-center gap-2"
            style={{ color: 'var(--text-muted)' }}
          >
            <Music size={14} strokeWidth={1.5} />
            ① 选择要分离的分轨
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_STEMS.map((stem) => (
              <StemCard
                key={stem}
                meta={STEM_META[stem]}
                selection={selections[stem]}
                availableModels={getModelsForStem(stem)}
                cachedModels={state.cachedModels}
                cacheAction={state.cacheAction}
                onToggle={() => toggleStem(stem)}
                onChangeModel={(id) => setModelForStem(stem, id)}
                onCache={cacheModel}
                onUncache={uncacheModel}
              />
            ))}
          </div>
          <p
            className="text-[0.7rem] mt-3 flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Sparkles size={12} strokeWidth={1.5} />
            已选 {enabledCount} / 4 个分轨 · 点击卡片切换
          </p>
        </section>

        {/* 缓存管理面板(支持单条删除) */}
        <CacheManagerPanel
          cacheMetas={state.cacheMetas}
          cacheAction={state.cacheAction}
          onRefresh={refreshCacheMetas}
          onClearAll={clearAllCache}
          onUncache={uncacheModel}
        />

        {/* ③ 上传区 — 进度条插在顶部 */}
        <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="upload-heading">
          <h2
            id="upload-heading"
            className="text-xs uppercase tracking-[0.25em] font-medium mb-4 flex items-center gap-2"
            style={{ color: 'var(--text-muted)' }}
          >
            <CloudUpload size={14} strokeWidth={1.5} />
            ② 上传音频
          </h2>

          {/* 下载进度条(主 phase 为 downloading-model 时显示) */}
          <AnimatePresence>
            {state.phase === 'downloading-model' && downloadingModelName && (
              <DownloadProgress
                key="dl-progress"
                modelId={downloadingModelName}
                progress={state.progress}
                loadedText={state.currentStep}
              />
            )}
          </AnimatePresence>

          {state.phase === 'idle' || state.phase === 'cancelled' || state.phase === 'error' ? (
            <UploadZone
              error={state.error}
              onFileSelect={selectFile}
              onReset={state.phase === 'error' || state.phase === 'cancelled' ? reset : undefined}
            />
          ) : state.phase === 'file-selected' ? (
            <ReadyPanel
              fileName={state.fileName ?? ''}
              selections={selections}
              enabledCount={enabledCount}
              onStart={() => start(selections)}
              onChangeFile={reset}
            />
          ) : (
            <ProgressPanel
              phase={state.phase}
              progress={state.progress}
              currentStep={state.currentStep}
              onCancel={cancel}
            />
          )}
        </section>

        {/* 完成态(分轨下载) */}
        {state.phase === 'done' &&
          state.stems &&
          (() => {
            const available = ALL_STEMS.filter((s) => state.stems?.[s])
            if (available.length === 0) return null
            return (
              <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="results-heading">
                <h2
                  id="results-heading"
                  className="text-xs uppercase tracking-[0.25em] font-medium mb-4"
                  style={{ color: 'var(--text-muted)' }}
                >
                  ③ 下载分轨
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {available.map((stem) => {
                    const meta = STEM_META[stem]
                    return (
                      <ResultCard
                        key={stem}
                        label={meta.label}
                        accent={meta.accent}
                        available={state.stems?.[stem] != null}
                        onDownload={() => downloadStemWav(stem)}
                      />
                    )
                  })}
                </div>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={reset}
                    className="px-4 py-2 rounded-lg text-xs cursor-pointer transition-all hover:opacity-70"
                    style={{ background: 'transparent', color: 'var(--text-muted)' }}
                  >
                    ← 分离下一首
                  </button>
                </div>
              </section>
            )
          })()}
      </main>

      <BackFooter />
    </div>
  )
}

/* ============================== 顶部隐私/资源说明(可动画展开) ============================== */

const PrivacyNotice = () => {
  const [expanded, setExpanded] = useState(false)
  return (
    <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="privacy-heading">
      <h2 id="privacy-heading" className="sr-only">
        隐私与资源说明
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border-line)',
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer transition-all hover:opacity-80"
          aria-expanded={expanded}
        >
          <Lock size={20} strokeWidth={1.5} style={{ color: 'var(--accent-amber)' }} className="flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              所有处理在你的浏览器内完成 — 数据不离开设备
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              模型缓存在你的设备上,首次使用需要联网下载。
            </p>
          </div>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ color: 'var(--text-muted)' }}
            aria-hidden
          >
            <ChevronDown size={16} strokeWidth={1.5} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="privacy-detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="px-5 pb-5 pt-3 text-xs leading-relaxed border-t"
                style={{ borderColor: 'var(--border-line)', color: 'var(--text-secondary)' }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <DetailItem label="网络流量">
                    首次使用需下载 4 个 ONNX 模型(共 ~632 MB),之后只在浏览器 IndexedDB 读取
                  </DetailItem>
                  <DetailItem label="磁盘占用">
                    浏览器 IndexedDB 缓存约 660 MB(4 模型 + 元数据),关闭浏览器不清空
                  </DetailItem>
                  <DetailItem label="内存占用">
                    推理时 ~500 MB RAM(WebAssembly 堆),4 分钟歌需 ~1.5 GB 临时缓冲
                  </DetailItem>
                  <DetailItem label="CPU 占用">
                    推理时 4 核满载(已开启多线程),4 分钟歌约 30-90 秒,期间页面会卡顿
                  </DetailItem>
                  <DetailItem label="文件大小限制">
                    ≤100 MB · ≤10 分钟(超过会拒绝,避免浏览器 OOM)
                  </DetailItem>
                  <DetailItem label="输出格式">
                    16-bit PCM WAV, 44100Hz 单声道,每分钟约 10 MB
                  </DetailItem>
                  <DetailItem label="精度">
                    接近原始 Meta Demucs htdemucs_ft(fp16 微降,SDR ≈ 8.4 dB 人声)
                  </DetailItem>
                  <DetailItem label="浏览器要求">
                    Chrome/Edge 113+ / Firefox 115+ / Safari 16.4+,需支持 WebAssembly + SharedArrayBuffer
                  </DetailItem>
                </div>

                <p
                  className="mt-4 pt-3 text-[0.7rem]"
                  style={{ color: 'var(--text-muted)', borderTop: '0.5px solid var(--border-line)' }}
                >
                  <strong style={{ color: 'var(--text-secondary)' }}>注意事项:</strong>
                  请勿在分离过程中关闭/刷新页面,会导致 Worker 崩溃需要重新加载。
                  推理期间建议关闭其他占用 CPU 的大程序(IDE、视频等)。
                  商用/公开发布分离结果前请确认你拥有原曲版权。
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

const DetailItem = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <p
      className="text-[0.65rem] uppercase tracking-wider mb-0.5"
      style={{ color: 'var(--accent-amber)' }}
    >
      {label}
    </p>
    <p>{children}</p>
  </div>
)

/* ============================== 分轨选择卡 ============================== */

interface StemCardProps {
  meta: { label: string; accent: string }
  selection: { enabled: boolean; modelId: string | null }
  availableModels: ModelInfo[]
  cachedModels: Set<string>
  cacheAction: { phase: string; targetId?: string }
  onToggle: () => void
  onChangeModel: (id: string) => void
  onCache: (id: string) => void
  onUncache: (id: string) => void
}

const StemCard = ({
  meta,
  selection,
  availableModels,
  cachedModels,
  cacheAction,
  onToggle,
  onChangeModel,
  onCache,
  onUncache,
}: StemCardProps) => {
  const currentModel = availableModels.find((m) => m.id === selection.modelId)
  const isCached = currentModel ? cachedModels.has(currentModel.id) : false

  const isCachingThis = cacheAction.phase === 'downloading' && cacheAction.targetId === currentModel?.id
  const isDeletingThis = cacheAction.phase === 'deleting' && cacheAction.targetId === currentModel?.id

  /* ---- 关键修复:外层用 div + role=button,内层用 button 即可,无 HTML 嵌套错误 ---- */
  return (
    <motion.div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onToggle()
        }
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      aria-pressed={selection.enabled}
      aria-label={`${meta.label} 分轨 ${selection.enabled ? '已选' : '未选'}`}
      className="text-left rounded-xl p-3 cursor-pointer w-full focus:outline-none"
      style={{
        background: selection.enabled ? 'var(--bg-card)' : 'transparent',
        border: selection.enabled
          ? `1.5px solid ${meta.accent}`
          : '0.5px dashed var(--border-line)',
        opacity: selection.enabled ? 1 : 0.55,
        boxShadow: selection.enabled
          ? `0 4px 16px -8px ${meta.accent}55, 0 1px 3px var(--shadow-color, rgba(0,0,0,0.04))`
          : 'none',
      }}
    >
      {/* 顶行:色块 + 标签(去掉原「待缓存/已缓存」角标) */}
      <div className="flex items-center gap-2 mb-2.5">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: meta.accent }}
          aria-hidden
        />
        <span
          className="text-sm font-semibold flex-1"
          style={{ color: 'var(--text-primary)' }}
        >
          {meta.label}
        </span>
        {isCached && (
          <span
            className="text-[0.6rem] flex items-center gap-0.5"
            style={{ color: 'var(--accent-amber)' }}
            title="模型已缓存在 IndexedDB"
            aria-label="已缓存"
          >
            <CheckCircle2 size={11} strokeWidth={2} />
          </span>
        )}
      </div>

      {/* 第 3 项改动:下拉 + 缓存按钮同行 — flex 布局 */}
      <div
        className="flex items-stretch gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* 模型下拉(优化 #4:选项标缓存状态) */}
        <div className="relative flex-1 min-w-0">
          <select
            value={selection.modelId ?? ''}
            onChange={(e) => onChangeModel(e.target.value)}
            disabled={!selection.enabled}
            className="w-full pl-2.5 pr-7 py-1.5 rounded-lg text-xs appearance-none cursor-pointer disabled:cursor-not-allowed transition-all"
            style={{
              background: 'var(--bg-page)',
              color: 'var(--text-primary)',
              border: '0.5px solid var(--border-line)',
              outline: 'none',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-amber)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-line)'
            }}
            onFocus={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-amber)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 3px var(--accent-glow)'
            }}
            onBlur={(e) => {
              ;(e.currentTarget as HTMLElement).style.borderColor = 'var(--border-line)'
              ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
            }}
            aria-label={`${meta.label}使用的模型`}
          >
            {availableModels.map((m) => {
              const cached = cachedModels.has(m.id)
              return (
                <option key={m.id} value={m.id}>
                  {m.name} · {m.size} · {cached ? '✓ 已缓存' : '未缓存'}
                </option>
              )
            })}
          </select>
          <ChevronDown
            size={14}
            strokeWidth={1.5}
            className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          />
        </div>

        {/* 缓存操作按钮 */}
        {currentModel && (
          isCached ? (
            <button
              type="button"
              onClick={() => onUncache(currentModel.id)}
              disabled={isDeletingThis}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.65rem] cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 shrink-0"
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                border: '0.5px solid var(--border-line)',
              }}
              aria-label={`删除 ${currentModel.name} 缓存`}
            >
              {isDeletingThis && <Loader2 size={11} strokeWidth={1.5} className="animate-spin" />}
              {!isDeletingThis && <Trash2 size={11} strokeWidth={1.5} />}
              <span className="whitespace-nowrap">清缓存</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onCache(currentModel.id)}
              disabled={isCachingThis}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.65rem] cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 shrink-0"
              style={{
                background: 'var(--accent-glow)',
                color: 'var(--accent-amber)',
                border: '0.5px solid var(--accent-amber)',
              }}
              aria-label={`下载 ${currentModel.name} 到缓存`}
            >
              {isCachingThis && <Loader2 size={11} strokeWidth={1.5} className="animate-spin" />}
              {!isCachingThis && <Download size={11} strokeWidth={1.5} />}
              <span className="whitespace-nowrap">{isCachingThis ? '下载中' : '下载'}</span>
            </button>
          )
        )}
      </div>
    </motion.div>
  )
}

/* ============================== 缓存管理面板(支持单条删除) ============================== */

interface CacheManagerPanelProps {
  cacheMetas: { id: string; sizeBytes: number; cachedAt: string }[]
  cacheAction: { phase: string; targetId?: string }
  onRefresh: () => void
  onClearAll: () => void
  onUncache: (id: string) => void
}

const CacheManagerPanel = ({
  cacheMetas,
  cacheAction,
  onRefresh,
  onClearAll,
  onUncache,
}: CacheManagerPanelProps) => {
  const [expanded, setExpanded] = useState(false)
  const totalSize = cacheMetas.reduce((sum, m) => sum + m.sizeBytes, 0)
  const isClearing = cacheAction.phase === 'clearing'

  return (
    <section className="mt-6 max-w-3xl mx-auto" aria-labelledby="cache-heading">
      <h2 id="cache-heading" className="sr-only">
        缓存管理
      </h2>
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '0.5px solid var(--border-line)',
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-all hover:opacity-80"
          aria-expanded={expanded}
        >
          <HardDrive
            size={16}
            strokeWidth={1.5}
            style={{ color: 'var(--accent-amber)' }}
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p
              className="text-xs font-semibold flex items-center gap-1.5"
              style={{ color: 'var(--text-primary)' }}
            >
              <Settings2 size={11} strokeWidth={1.5} className="inline" />
              缓存管理
            </p>
            <p className="text-[0.7rem] mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {cacheMetas.length > 0
                ? `已缓存 ${cacheMetas.length} 个模型 · ${(totalSize / 1024 / 1024).toFixed(0)} MB`
                : '尚未缓存任何模型'}
            </p>
          </div>
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ color: 'var(--text-muted)' }}
            aria-hidden
          >
            <ChevronDown size={14} strokeWidth={1.5} />
          </motion.span>
        </button>

        <AnimatePresence initial={false}>
          {expanded && (
            <motion.div
              key="cache-detail"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="px-4 pb-4 pt-2 border-t text-xs"
                style={{ borderColor: 'var(--border-line)' }}
              >
                {cacheMetas.length === 0 ? (
                  <p
                    className="py-3 text-center text-[0.7rem]"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    还没下载任何模型到 IndexedDB
                  </p>
                ) : (
                  <ul className="space-y-1.5 mt-1">
                    {cacheMetas.map((m) => {
                      const isDeleting = cacheAction.phase === 'deleting' && cacheAction.targetId === m.id
                      return (
                        <li
                          key={m.id}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded"
                          style={{ background: 'var(--bg-page)' }}
                        >
                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[0.7rem] truncate"
                              style={{ color: 'var(--text-primary)' }}
                              title={m.id}
                            >
                              {m.id}
                            </p>
                            <p
                              className="text-[0.6rem] font-mono"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              {(m.sizeBytes / 1024 / 1024).toFixed(0)} MB ·{' '}
                              {new Date(m.cachedAt).toLocaleString('zh-CN', {
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          {/* 第 6 项改动:单条删除按钮 */}
                          <button
                            type="button"
                            onClick={() => onUncache(m.id)}
                            disabled={isDeleting}
                            className="flex items-center gap-1 px-2 py-1 rounded text-[0.6rem] cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 shrink-0"
                            style={{
                              background: 'transparent',
                              color: 'var(--text-muted)',
                              border: '0.5px solid var(--border-line)',
                            }}
                            aria-label={`删除 ${m.id} 缓存`}
                            title="删除此模型"
                          >
                            {isDeleting && <Loader2 size={10} strokeWidth={1.5} className="animate-spin" />}
                            {!isDeleting && <Trash2 size={10} strokeWidth={1.5} />}
                            <span>删除</span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={onRefresh}
                    className="text-[0.65rem] cursor-pointer transition-all hover:opacity-70"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    刷新列表
                  </button>
                  {cacheMetas.length > 0 && (
                    <button
                      type="button"
                      onClick={onClearAll}
                      disabled={isClearing}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[0.65rem] cursor-pointer transition-all hover:opacity-80 disabled:opacity-50"
                      style={{
                        background: 'var(--danger-bg, rgba(220, 80, 80, 0.1))',
                        color: 'var(--danger-red, #c84444)',
                        border: '0.5px solid var(--danger-red, #c84444)',
                      }}
                    >
                      {isClearing && <Loader2 size={11} strokeWidth={1.5} className="animate-spin" />}
                      {!isClearing && <Trash2 size={11} strokeWidth={1.5} />}
                      {isClearing
                        ? '清空中…'
                        : `清空所有 (${(totalSize / 1024 / 1024).toFixed(0)} MB)`}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

/* ============================== 下载进度条(优化 #2) ============================== */

interface DownloadProgressProps {
  modelId: string
  progress: number
  loadedText: string
}

const DownloadProgress = ({ modelId, progress, loadedText }: DownloadProgressProps) => {
  const pct = Math.round(progress * 100)
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="mb-4 rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border-line)',
      }}
      role="status"
      aria-live="polite"
    >
      <div className="p-4 flex items-center gap-3">
        <Loader2
          size={18}
          strokeWidth={1.8}
          className="animate-spin shrink-0"
          style={{ color: 'var(--accent-amber)' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              下载模型 {modelId}
            </p>
            <p className="text-xs font-mono shrink-0" style={{ color: 'var(--accent-amber)' }}>
              {pct}%
            </p>
          </div>
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: 'var(--bg-page)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--accent-amber)' }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[0.65rem] mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>
            {loadedText}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

/* ============================== 上传 / 准备就绪 / 进度 ============================== */

const UploadZone = ({
  error,
  onFileSelect,
  onReset,
}: {
  error: string | null
  onFileSelect: (f: File) => void
  onReset?: () => void
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFileSelect(f)
  }

  return (
    <div>
      <motion.label
        htmlFor="audio-file-input"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="flex flex-col items-center gap-3 p-10 rounded-xl cursor-pointer block"
        style={{ background: 'var(--bg-card)', border: '1.5px dashed var(--border-line)' }}
      >
        <CloudUpload
          size={40}
          strokeWidth={1.5}
          style={{ color: 'var(--accent-amber)' }}
        />
        <div className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
            点击或拖拽音频文件到此处
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            支持 mp3 / wav / flac / m4a / ogg · ≤10 分钟 · ≤100MB
          </p>
        </div>
        <input
          id="audio-file-input"
          type="file"
          accept="audio/*"
          onChange={handleChange}
          className="hidden"
          aria-label="选择音频文件"
        />
      </motion.label>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 rounded-lg flex items-center justify-between gap-3"
          style={{
            background: 'var(--danger-bg, rgba(220, 80, 80, 0.08))',
            border: '0.5px solid var(--danger-red, #c84444)',
          }}
        >
          <div className="flex items-center gap-2 flex-1">
            <AlertCircle
              size={14}
              strokeWidth={1.5}
              style={{ color: 'var(--danger-red, #c84444)' }}
              className="flex-shrink-0"
            />
            <p className="text-xs" style={{ color: 'var(--danger-red, #c84444)' }}>
              {error}
            </p>
          </div>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-xs px-2.5 py-1 rounded cursor-pointer transition-all hover:opacity-70"
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
            >
              重试
            </button>
          )}
        </motion.div>
      )}
    </div>
  )
}

const ReadyPanel = ({
  fileName,
  selections,
  enabledCount,
  onStart,
  onChangeFile,
}: {
  fileName: string
  selections: StemSelections
  enabledCount: number
  onStart: () => void
  onChangeFile: () => void
}) => {
  const enabledStems = ALL_STEMS.filter((s) => selections[s].enabled)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-4 p-8 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'var(--accent-glow)' }}
      >
        <FileAudio size={28} strokeWidth={1.5} style={{ color: 'var(--accent-amber)' }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {fileName}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          将分离 {enabledCount} 个分轨:{enabledStems.map((s) => STEM_META[s].label).join(' / ')}
        </p>
      </div>
      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={onStart}
          disabled={enabledCount === 0}
          whileHover={{ scale: enabledCount === 0 ? 1 : 1.03 }}
          whileTap={{ scale: enabledCount === 0 ? 1 : 0.97 }}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent-amber)', color: '#fff' }}
        >
          <Sparkles size={14} strokeWidth={2} />
          开始分离
        </motion.button>
        <motion.button
          type="button"
          onClick={onChangeFile}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-70"
          style={{ background: 'transparent', color: 'var(--text-muted)' }}
        >
          <X size={14} strokeWidth={1.5} />
          换个文件
        </motion.button>
      </div>
      {enabledCount === 0 && (
        <p className="text-xs" style={{ color: 'var(--danger-red, #c84444)' }}>
          请至少勾选一个分轨(点击上方分轨卡片)
        </p>
      )}
    </motion.div>
  )
}

const ProgressPanel = ({
  phase,
  progress,
  currentStep,
  onCancel,
}: {
  phase: SeparatorPhase
  progress: number
  currentStep: string
  onCancel: () => void
}) => {
  const labels: Partial<Record<SeparatorPhase, string>> = {
    'downloading-model': '下载模型',
    'model-ready': '准备就绪',
    decoding: '解码音频',
    separating: 'AI 分离中',
  }
  const label = labels[phase] ?? '处理中'
  const pct = Math.round(progress * 100)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-3 p-6 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
    >
      <div className="flex items-center gap-2 w-full">
        <Loader2
          size={16}
          strokeWidth={1.8}
          className="animate-spin shrink-0"
          style={{ color: 'var(--accent-amber)' }}
        />
        <p className="text-sm font-medium flex-1" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        <p className="text-xs font-mono" style={{ color: 'var(--accent-amber)' }}>
          {pct}%
        </p>
      </div>
      <div
        className="h-1.5 w-full rounded-full overflow-hidden"
        style={{ background: 'var(--bg-page)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent-amber)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.2 }}
        />
      </div>
      <p className="text-xs self-start" style={{ color: 'var(--text-muted)' }}>
        {currentStep}
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="text-[0.7rem] mt-1 px-3 py-1 rounded cursor-pointer transition-all hover:opacity-70"
        style={{ background: 'transparent', color: 'var(--text-muted)' }}
      >
        取消
      </button>
    </motion.div>
  )
}

const ResultCard = ({
  label,
  accent,
  available,
  onDownload,
}: {
  label: string
  accent: string
  available: boolean
  onDownload: () => void
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    className="flex items-center gap-3 p-3 rounded-xl"
    style={{
      background: 'var(--bg-card)',
      border: `1.5px solid ${available ? accent : 'var(--border-line)'}`,
      opacity: available ? 1 : 0.4,
    }}
  >
    <span
      className="w-3 h-3 rounded-full shrink-0"
      style={{ background: accent }}
      aria-hidden
    />
    <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
      {label}
    </span>
    <button
      type="button"
      onClick={onDownload}
      disabled={!available}
      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.7rem] cursor-pointer transition-all hover:opacity-80 disabled:cursor-not-allowed"
      style={{
        background: 'var(--accent-glow)',
        color: 'var(--accent-amber)',
        border: '0.5px solid var(--accent-amber)',
      }}
    >
      <Download size={12} strokeWidth={1.5} />
      WAV
    </button>
  </motion.div>
)

export default AudioSeparatorPage
