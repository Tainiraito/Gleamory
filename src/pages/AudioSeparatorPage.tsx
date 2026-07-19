/* ============================================================
 * 音轨分离 — v0.5
 *  v0.4 → v0.5 改动:
 *  - Spleeter 2-stem 真正推理(stereo STFT → 模型 → mask ISTFT)
 *  - htdemucs_ft 4-stem 占位保留在 registry(等换算子)
 *  - UI 只显示有 implemented 模型的 stem(2 个)
 *  v0.4 6 项 UX 优化保留
 * ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CloudUpload,
  FileAudio,
  Download,
  Lock,
  ChevronDown,
  Trash2,
  X,
  AlertCircle,
  Sparkles,
  Music,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import SiteHeader from '@/components/SiteHeader'
import { PageMain } from '@/components/PageContainer'
import { ProjectPageHeader } from '@/components/ProjectPageHeader'
import BackFooter from '@/components/BackFooter'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getProjectById } from '@/utils/projectData'
import {
  useSeparator,
  buildDefaultSelections,
  type CacheActionsByModel,
  type CacheActionState,
  type ProcessLogEntry,
  type SeparatorPhase,
  type StemSelections,
} from '@/hooks/useSeparator'
import { encodeWav } from '@/lib/audio/encode'
import { createPitchTransfer } from '@/lib/audio/pitchTransfer'
import {
  AVAILABLE_STEMS,
  getModelById,
  getModelsForStem,
  type ModelInfo,
  type StemKey,
} from '@/lib/onnx/modelRegistry'
import { getSeparatorReadiness } from '@/lib/audio/separatorReadiness'
import { removeModelFromSelections, toggleCachedModelSelection } from '@/lib/audio/separatorSelection'
import { getStemSelectionBadge, getUploadSurface } from '@/lib/audio/separatorViewState'

const STEM_META: Record<StemKey, { label: string; accent: string }> = {
  vocals: { label: '人声', accent: '#c4956a' },
  drums: { label: '鼓', accent: '#d68b8b' },
  bass: { label: '贝斯', accent: '#7a9b6e' },
  other: { label: '伴奏', accent: '#8a8590' },
}

const AudioSeparatorPage = () => {
  useDocumentTitle('音轨分离 | Gleamory 微光集')
  const project = getProjectById('audio-separator')!
  const navigate = useNavigate()

  const {
    state,
    selectFile,
    start,
    cancel,
    reset,
    resetToSelectedFile,
    downloadStemWav,
    cacheModel,
    cancelCacheModel,
    uncacheModel,
  } = useSeparator()
  const [selections, setSelections] = useState<StemSelections>(buildDefaultSelections)
  const [previewUrls, setPreviewUrls] = useState<Partial<Record<StemKey, string>>>({})

  const setModelForStem = useCallback((stem: StemKey, modelId: string) => {
    setSelections((prev) => toggleCachedModelSelection(prev, stem, modelId, state.cachedModels))
  }, [state.cachedModels])

  const handleUncacheModel = useCallback(
    async (modelId: string) => {
      const deleted = await uncacheModel(modelId)
      if (deleted) {
        setSelections((prev) => removeModelFromSelections(prev, modelId))
      }
    },
    [uncacheModel],
  )

  const readiness = getSeparatorReadiness(selections, state.cachedModels)
  const { enabledCount } = readiness
  const missingModelNames = readiness.missingModelIds.map((id) => getModelById(id)?.name ?? id)
  const uploadSurface = getUploadSurface(state.phase, Boolean(state.fileName))

  useEffect(() => {
    if (state.phase !== 'done' || !state.stems) {
      setPreviewUrls({})
      return
    }

    const urls: Partial<Record<StemKey, string>> = {}
    const createdUrls: string[] = []
    for (const stem of AVAILABLE_STEMS) {
      const data = state.stems[stem]
      if (!data) continue
      const url = URL.createObjectURL(encodeWav(data.channels, data.sampleRate))
      urls[stem] = url
      createdUrls.push(url)
    }
    setPreviewUrls(urls)

    return () => {
      for (const url of createdUrls) URL.revokeObjectURL(url)
    }
  }, [state.phase, state.stems])

  const analyzeStemPitch = useCallback(
    (stem: StemKey) => {
      const data = state.stems?.[stem]
      if (!data) return
      const baseName = (state.fileName ?? 'audio').replace(/\.[^.]+$/, '')
      const transferId = createPitchTransfer(encodeWav(data.channels, data.sampleRate), {
        fileName: `${baseName}_${stem}.wav`,
        source: 'separator-result',
      })
      navigate(`/pitch-detector?transfer=${encodeURIComponent(transferId)}`)
    },
    [navigate, state.fileName, state.stems],
  )

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <PageMain className="pt-20 pb-36 sm:pt-24 sm:pb-24">
        <ProjectPageHeader
          name={project.name}
          englishName="Audio Stem Separator"
          description={project.description}
          version={project.version.replace(/^v/, '')}
        />

        {/* ① 顶部隐私/资源说明(可展开) */}
        <PrivacyNotice />

        {/* ② 分轨 + 模型选择 */}
        <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="stem-heading">
          <SectionHeading
            id="stem-heading"
            icon={<Music size={15} strokeWidth={1.8} />}
            title="① 选择要分离的分轨"
            description="先选择输出类型，再下载或复用对应模型缓存。"
          />
          <div className="space-y-3">
            {AVAILABLE_STEMS.map((stem) => (
              <StemModelList
                stem={stem}
                key={stem}
                meta={STEM_META[stem]}
                selection={selections[stem]}
                availableModels={getModelsForStem(stem)}
                cachedModels={state.cachedModels}
                cacheActions={state.cacheActions}
                onSelectModel={(id) => setModelForStem(stem, id)}
                onCache={cacheModel}
                onCancelCache={cancelCacheModel}
                onUncache={handleUncacheModel}
              />
            ))}
          </div>
          <p
            className="text-[0.7rem] mt-3 flex items-center gap-1.5"
            style={{ color: 'var(--text-muted)' }}
          >
            <Sparkles size={12} strokeWidth={1.5} />
            已选 {enabledCount} / {AVAILABLE_STEMS.length} 个分轨 · 点击模型行选择
          </p>
        </section>

        {/* ③ 上传区 */}
        <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="upload-heading">
          <SectionHeading
            id="upload-heading"
            icon={<CloudUpload size={15} strokeWidth={1.8} />}
            title="② 上传音频"
          />

          {uploadSurface === 'error' ? (
            <ProcessingErrorPanel
              fileName={state.fileName ?? ''}
              error={state.error}
              canRetry={readiness.canStart}
              onRetry={() => start(selections)}
              onChangeFile={reset}
              onBack={resetToSelectedFile}
            />
          ) : uploadSurface === 'upload' ? (
            <UploadZone
              error={state.error}
              onFileSelect={selectFile}
              onReset={state.phase === 'error' || state.phase === 'cancelled' ? reset : undefined}
            />
          ) : uploadSurface === 'ready' ? (
            <ReadyPanel
              fileName={state.fileName ?? ''}
              selections={selections}
              enabledCount={enabledCount}
              canStart={readiness.canStart}
              missingModelNames={missingModelNames}
              error={state.error}
              onStart={() => {
                if (readiness.canStart) start(selections)
              }}
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

        {state.logs.length > 0 && state.phase !== 'idle' && (
          <section className="mt-8 max-w-3xl mx-auto" aria-labelledby="process-log-heading">
            <SectionHeading
              id="process-log-heading"
              icon={<FileAudio size={15} strokeWidth={1.8} />}
              title="处理日志"
              description="本次音频读取、推理和错误信息会集中显示在这里。开始新的处理后会覆盖上一轮日志。"
            />
            <ProcessLogPanel logs={state.logs} />
          </section>
        )}

        {/* 完成态(分轨下载) */}
        {state.phase === 'done' &&
          state.stems &&
          (() => {
            const available = AVAILABLE_STEMS.filter((s) => state.stems?.[s])
            if (available.length === 0) return null
            return (
              <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="results-heading">
                <h2
                  id="results-heading"
                  className="text-sm font-semibold tracking-wide mb-4"
                  style={{ color: 'var(--text-primary)' }}
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
                        previewUrl={previewUrls[stem]}
                        onDownload={() => downloadStemWav(stem)}
                        onAnalyzePitch={() => analyzeStemPitch(stem)}
                      />
                    )
                  })}
                </div>
              </section>
            )
          })()}
      </PageMain>

      <BackFooter />
    </div>
  )
}

const SectionHeading = ({
  id,
  icon,
  title,
  description,
}: {
  id: string
  icon: React.ReactNode
  title: string
  description?: string
}) => (
  <div className="mb-4">
    <h2
      id={id}
      className="flex items-center gap-2 text-sm font-semibold tracking-wide"
      style={{ color: 'var(--text-primary)' }}
    >
      <span style={{ color: 'var(--accent-amber)' }}>{icon}</span>
      {title}
    </h2>
    {description && (
      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
    )}
  </div>
)

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
                    首次使用需下载 2 个 ONNX 模型(共 ~76 MB),之后只在浏览器 IndexedDB 读取
                  </DetailItem>
                  <DetailItem label="磁盘占用">
                    浏览器 IndexedDB 缓存约 80 MB(2 模型 + 元数据),关闭浏览器不清空
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
                    快速模式适合轻量预览，高质量模式使用 HT-Demucs 四分轨，处理更慢但分离效果更好
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
      className="mb-0.5 text-xs uppercase tracking-[0.08em]"
      style={{ color: 'var(--accent-amber)' }}
    >
      {label}
    </p>
    <p>{children}</p>
  </div>
)

/* ============================== 分轨 / 模型列表 ============================== */

interface StemModelListProps {
  stem: StemKey
  meta: { label: string; accent: string }
  selection: { enabled: boolean; modelId: string | null }
  availableModels: ModelInfo[]
  cachedModels: Set<string>
  cacheActions: CacheActionsByModel
  onSelectModel: (id: string) => void
  onCache: (id: string) => void
  onCancelCache: (id: string) => void
  onUncache: (id: string) => void
}

const StemModelList = ({
  stem,
  meta,
  selection,
  availableModels,
  cachedModels,
  cacheActions,
  onSelectModel,
  onCache,
  onCancelCache,
  onUncache,
}: StemModelListProps) => {
  const [expanded, setExpanded] = useState(false)
  const selectionBadge = getStemSelectionBadge(selection.enabled)
  const selectedModelName = selection.modelId ? getModelById(selection.modelId)?.name : null
  const hasActiveCacheAction = availableModels.some((model) => {
    const action = cacheActions[model.id]
    return action?.phase === 'downloading' || action?.phase === 'deleting'
  })
  const showBody = expanded || hasActiveCacheAction

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--bg-card)',
        border: selection.enabled ? `1.5px solid ${meta.accent}` : '0.5px solid var(--border-line)',
        boxShadow: selection.enabled
          ? `0 12px 30px -20px ${meta.accent}AA`
          : '0 8px 22px rgba(44, 42, 48, 0.035)',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-all hover:opacity-85"
        aria-expanded={showBody}
      >
        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: meta.accent }} aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {meta.label}
          </p>
          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
            {selectedModelName ? `当前模型：${selectedModelName}` : `${availableModels.length} 个可用模型，展开后选择`}
          </p>
        </div>
        {selectionBadge && (
          <span
            className="px-3 py-1.5 rounded-full text-[0.7rem] font-medium"
            style={{
              background: meta.accent,
              color: '#fff',
              border: `1px solid ${meta.accent}`,
            }}
          >
            {selectionBadge}
          </span>
        )}
        <motion.span
          animate={{ rotate: showBody ? 180 : 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ color: 'var(--text-muted)' }}
          aria-hidden
        >
          <ChevronDown size={16} strokeWidth={1.6} />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {showBody && (
          <motion.div
            key={`${stem}-model-body`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: 'easeInOut' }}
            style={{ overflow: 'hidden', borderTop: '0.5px solid var(--border-line)' }}
          >
            <div className="p-2.5 space-y-2">
              {(['fast', 'high'] as const).map((quality) => {
                const models = availableModels.filter((model) => model.quality === quality)
                if (models.length === 0) return null
                return (
                  <div key={`${stem}-${quality}`} className="space-y-2">
                    <p
                      className="px-1 text-xs font-medium uppercase tracking-[0.08em]"
                      style={{ color: quality === 'high' ? meta.accent : 'var(--text-muted)' }}
                    >
                      {quality === 'high' ? '高质量模式' : '快速模式'}
                    </p>
                    {models.map((model) => (
                      <ModelRow
                        key={`${stem}-${model.id}`}
                        model={model}
                        accent={meta.accent}
                        selected={selection.modelId === model.id}
                        cached={cachedModels.has(model.id)}
                        cacheAction={cacheActions[model.id] ?? { phase: 'idle' }}
                        onSelect={() => onSelectModel(model.id)}
                        onCache={() => onCache(model.id)}
                        onCancelCache={() => onCancelCache(model.id)}
                        onUncache={() => onUncache(model.id)}
                      />
                    ))}
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

interface ModelRowProps {
  model: ModelInfo
  accent: string
  selected: boolean
  cached: boolean
  cacheAction: CacheActionState
  onSelect: () => void
  onCache: () => void
  onCancelCache: () => void
  onUncache: () => void
}

const ModelRow = ({
  model,
  accent,
  selected,
  cached,
  cacheAction,
  onSelect,
  onCache,
  onCancelCache,
  onUncache,
}: ModelRowProps) => {
  const isCachingThis = cacheAction.phase === 'downloading' && cacheAction.targetId === model.id
  const isDeletingThis = cacheAction.phase === 'deleting' && cacheAction.targetId === model.id
  const progress = Math.round((cacheAction.progress ?? 0) * 100)
  const canSelect = cached && !isDeletingThis

  return (
    <div
      className="rounded-xl p-3 transition-all"
      style={{
        background: selected ? 'rgba(var(--accent-amber-rgb), 0.10)' : 'rgba(255,255,255,0.45)',
        border: selected ? `1px solid ${accent}` : '0.5px solid var(--border-line)',
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={onSelect}
          disabled={!canSelect}
          className="flex-1 min-w-0 text-left cursor-pointer disabled:cursor-not-allowed"
          aria-pressed={selected}
          aria-label={`选择模型 ${model.name}`}
        >
          <span className="flex items-start gap-2">
            <span
              className="mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0"
              style={{
                border: selected ? `1px solid ${accent}` : '1px solid var(--border-line)',
                background: selected ? accent : 'transparent',
                opacity: canSelect ? 1 : 0.45,
              }}
              aria-hidden
            >
              {selected && <CheckCircle2 size={12} strokeWidth={2.2} style={{ color: '#fff' }} />}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                {model.name}
              </span>
              <span className="block text-[0.7rem] mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {model.englishName} · {model.size} · {cached ? '已缓存，点击选择/取消' : '未缓存，下载后才能选择'}
              </span>
            </span>
          </span>
        </button>

        {cached ? (
          <button
            type="button"
            onClick={onUncache}
            disabled={isDeletingThis}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[0.72rem] cursor-pointer transition-all hover:opacity-80 disabled:opacity-50 shrink-0"
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '0.5px solid var(--border-line)',
            }}
            aria-label={`删除 ${model.name} 缓存`}
          >
            {isDeletingThis ? <Loader2 size={12} strokeWidth={1.6} className="animate-spin" /> : <Trash2 size={12} strokeWidth={1.6} />}
            删除缓存
          </button>
        ) : (
          <button
            type="button"
            onClick={isCachingThis ? onCancelCache : onCache}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[0.72rem] font-medium cursor-pointer transition-all hover:opacity-80 disabled:opacity-60 shrink-0"
            style={{
              background: isCachingThis ? 'rgba(255, 255, 255, 0.55)' : 'var(--accent-glow)',
              color: isCachingThis ? 'var(--text-secondary)' : 'var(--accent-amber)',
              border: isCachingThis
                ? '0.5px solid var(--border-line)'
                : '0.5px solid rgba(var(--accent-amber-rgb), 0.42)',
            }}
            aria-label={isCachingThis ? `取消下载 ${model.name}` : `下载 ${model.name} 到缓存`}
          >
            {isCachingThis ? <Loader2 size={12} strokeWidth={1.6} className="animate-spin" /> : <Download size={12} strokeWidth={1.6} />}
            {isCachingThis ? '取消下载' : '下载模型'}
          </button>
        )}
      </div>

      {isCachingThis && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-page)' }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--accent-amber)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
          <p className="mt-1.5 text-xs leading-[1.125rem]" style={{ color: 'var(--text-muted)' }}>
            {cacheAction.currentStep ?? `下载中 ${progress}%`}
          </p>
        </div>
      )}
    </div>
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
        className="flex flex-col items-center gap-4 p-8 sm:p-10 rounded-2xl cursor-pointer block text-center"
        style={{
          background: 'linear-gradient(180deg, var(--bg-card) 0%, rgba(255,255,255,0.42) 100%)',
          border: '1.5px dashed rgba(var(--accent-amber-rgb), 0.42)',
          boxShadow: '0 12px 34px rgba(44, 42, 48, 0.06)',
        }}
      >
        <span
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{
            background: 'var(--accent-glow)',
            border: '1px solid rgba(var(--accent-amber-rgb), 0.24)',
          }}
          aria-hidden
        >
          <CloudUpload
            size={34}
            strokeWidth={1.8}
            style={{ color: 'var(--accent-amber)' }}
          />
        </span>
        <div>
          <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            点击或拖拽音频文件到此处
          </p>
          <p className="text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            支持 mp3 / wav / flac / m4a / ogg · ≤10 分钟 · ≤100MB
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            文件只在本机浏览器中解码，不会上传到服务器。
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
  canStart,
  missingModelNames,
  error,
  onStart,
  onChangeFile,
}: {
  fileName: string
  selections: StemSelections
  enabledCount: number
  canStart: boolean
  missingModelNames: string[]
  error: string | null
  onStart: () => void
  onChangeFile: () => void
}) => {
  const enabledStems = AVAILABLE_STEMS.filter((s) => selections[s].enabled)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-4 p-8 rounded-2xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-line)',
        boxShadow: '0 10px 28px rgba(44, 42, 48, 0.05)',
      }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: 'var(--accent-glow)' }}
      >
        <FileAudio size={28} strokeWidth={1.5} style={{ color: 'var(--accent-amber)' }} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          {fileName}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          将分离 {enabledCount} 个分轨:{enabledStems.map((s) => STEM_META[s].label).join(' / ')}
        </p>
      </div>
      <div className="flex gap-3">
        <motion.button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          whileHover={{ scale: canStart ? 1.03 : 1 }}
          whileTap={{ scale: canStart ? 0.97 : 1 }}
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
          请至少选择一个已缓存模型
        </p>
      )}
      {enabledCount > 0 && missingModelNames.length > 0 && (
        <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--danger-red, #c84444)' }}>
          请先下载模型：{missingModelNames.join(' / ')}
        </p>
      )}
      {error && missingModelNames.length === 0 && (
        <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--danger-red, #c84444)' }}>
          {error}
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
      className="flex flex-col items-center gap-3 p-6 rounded-2xl"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-line)',
        boxShadow: '0 10px 28px rgba(44, 42, 48, 0.05)',
      }}
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
      <p className="text-sm self-start leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
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

const ProcessingErrorPanel = ({
  fileName,
  error,
  canRetry,
  onRetry,
  onChangeFile,
  onBack,
}: {
  fileName: string
  error: string | null
  canRetry: boolean
  onRetry: () => void
  onChangeFile: () => void
  onBack: () => void
}) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="p-5 rounded-2xl"
    style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--danger-red, #c84444)',
      boxShadow: '0 10px 28px rgba(44, 42, 48, 0.05)',
    }}
  >
    <div className="flex items-start gap-3">
      <AlertCircle
        size={18}
        strokeWidth={1.8}
        style={{ color: 'var(--danger-red, #c84444)' }}
        className="shrink-0 mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          处理失败：{fileName}
        </p>
        <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--danger-red, #c84444)' }}>
          {error ?? '未知错误'}
        </p>
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onRetry}
        disabled={!canRetry}
        className="px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:opacity-80 disabled:opacity-45 disabled:cursor-not-allowed"
        style={{ background: 'var(--accent-amber)', color: '#fff' }}
      >
        重试处理
      </button>
      <button
        type="button"
        onClick={onBack}
        className="px-4 py-2 rounded-lg text-xs cursor-pointer transition-all hover:opacity-80"
        style={{ background: 'var(--accent-glow)', color: 'var(--accent-amber)' }}
      >
        回到准备状态
      </button>
      <button
        type="button"
        onClick={onChangeFile}
        className="px-4 py-2 rounded-lg text-xs cursor-pointer transition-all hover:opacity-70"
        style={{ background: 'transparent', color: 'var(--text-muted)' }}
      >
        换个文件
      </button>
    </div>

  </motion.div>
)

const ProcessLogPanel = ({
  logs,
  compact = false,
}: {
  logs: ProcessLogEntry[]
  compact?: boolean
}) => {
  const listRef = useRef<HTMLOListElement | null>(null)

  useEffect(() => {
    const list = listRef.current
    if (!list) return
    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' })
  }, [logs.length])

  if (logs.length === 0) return null
  const visibleLogs = compact ? logs.slice(-8) : logs

  return (
    <div
      className="w-full mt-4 rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.42)',
        border: '0.5px solid var(--border-line)',
      }}
    >
      <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border-line)' }}>
        <p className="text-[0.7rem] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          处理日志{compact ? '（最近 8 条）' : ''}
        </p>
      </div>
      <ol ref={listRef} className="max-h-56 overflow-auto px-3 py-2 space-y-1">
        {visibleLogs.map((log, index) => (
          <li
            key={`${log.time}-${index}-${log.message}`}
            className="grid grid-cols-[4.5rem_3rem_1fr] gap-2 rounded-lg px-2 py-1 text-xs leading-[1.125rem] transition-colors"
            style={{
              color: log.level === 'error' ? 'var(--danger-red, #c84444)' : 'var(--text-muted)',
              background:
                index === visibleLogs.length - 1
                  ? 'rgba(var(--accent-amber-rgb), 0.08)'
                  : 'transparent',
            }}
          >
            <span className="font-mono">{log.time}</span>
            <span>{log.level}</span>
            <span style={{ color: log.level === 'error' ? 'var(--danger-red, #c84444)' : 'var(--text-secondary)' }}>
              {log.message}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

const ResultCard = ({
  label,
  accent,
  available,
  previewUrl,
  onDownload,
  onAnalyzePitch,
}: {
  label: string
  accent: string
  available: boolean
  previewUrl?: string
  onDownload: () => void
  onAnalyzePitch: () => void
}) => (
  <motion.div
    whileHover={{ y: -2 }}
    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    className="p-4 rounded-xl"
    style={{
      background: 'var(--bg-card)',
      border: `1.5px solid ${available ? accent : 'var(--border-line)'}`,
      opacity: available ? 1 : 0.4,
    }}
  >
    <div className="flex items-center gap-3">
      <span
        className="w-3 h-3 rounded-full shrink-0"
        style={{ background: accent }}
        aria-hidden
      />
      <span className="text-sm font-semibold flex-1" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onAnalyzePitch}
          disabled={!available}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[0.7rem] cursor-pointer transition-all hover:opacity-80 disabled:cursor-not-allowed"
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '0.5px solid var(--border-line)',
          }}
        >
          <Music size={12} strokeWidth={1.5} />
          检测音高
        </button>
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
          下载 WAV
        </button>
      </div>
    </div>
    {previewUrl && (
      <audio
        className="mt-3 w-full h-9"
        controls
        preload="metadata"
        src={previewUrl}
        aria-label={`播放${label}分轨预览`}
      />
    )}
  </motion.div>
)

export default AudioSeparatorPage
