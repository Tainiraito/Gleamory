import { useCallback, useState } from 'react'
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

/* =====================================================================
 * 音轨分离 — 浏览器内本地 4-stem 音轨分离
 *
 * v0.2 流程:
 *  ① 顶部隐私/资源说明(常驻)
 *  ② 选分轨 + 选每个分轨的模型
 *  ③ 上传音频(选完停在「file-selected」态)
 *  ④ 用户点「开始分离」按钮 → 推理
 *  ⑤ 试听 + 下载
 * ===================================================================== */

const STEM_META: Record<StemKey, { label: string; accent: string }> = {
  vocals: { label: '人声', accent: '#c4956a' },
  drums: { label: '鼓', accent: '#d68b8b' },
  bass: { label: '贝斯', accent: '#7a9b6e' },
  other: { label: '伴奏', accent: '#8a8590' },
}

const AudioSeparatorPage = () => {
  useDocumentTitle('音轨分离 | Gleamory 微光集')

  const { state, selectFile, start, cancel, reset, downloadStemWav } = useSeparator()
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

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <main className="px-4 sm:px-[15%] pt-20 sm:pt-24 pb-36 sm:pb-24">
        <ProjectPageHeader
          name="音轨分离"
          englishName="Audio Stem Separator"
          description="浏览器内本地分离歌曲人声/鼓/贝斯/伴奏，数据不离开设备"
          version="0.2.0"
        />

        {/* ① 顶部隐私/资源说明(常驻,详细) */}
        <PrivacyNotice />

        {/* ② 分轨 + 模型选择 */}
        <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="stem-heading">
          <h2
            id="stem-heading"
            className="text-xs uppercase tracking-[0.25em] font-medium mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            ① 选择要分离的分轨
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ALL_STEMS.map((stem) => (
              <StemCard
                key={stem}
                stem={stem}
                meta={STEM_META[stem]}
                selection={selections[stem]}
                availableModels={getModelsForStem(stem)}
                cachedModels={state.cachedModels}
                onToggle={() => toggleStem(stem)}
                onChangeModel={(id) => setModelForStem(stem, id)}
              />
            ))}
          </div>
        </section>

        {/* ③ 上传区 */}
        <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="upload-heading">
          <h2
            id="upload-heading"
            className="text-xs uppercase tracking-[0.25em] font-medium mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            ② 上传音频
          </h2>

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
              onReset={reset}
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

        {/* ④ 结果区 */}
        {state.phase === 'done' && state.stems !== null && (() => {
          const stems = state.stems
          return (
          <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="result-heading">
            <h2
              id="result-heading"
              className="text-xs uppercase tracking-[0.25em] font-medium mb-4"
              style={{ color: 'var(--text-muted)' }}
            >
              ③ 试听 & 下载
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ALL_STEMS.map((stem) => {
                const meta = STEM_META[stem]
                const available = Boolean(stems[stem])
                return (
                  <StemResultCard
                    key={stem}
                    label={meta.label}
                    accent={meta.accent}
                    available={available}
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

/* ============================== 顶部隐私/资源说明 ============================== */

const PrivacyNotice = () => {
  const [expanded, setExpanded] = useState(false)
  return (
    <section
      className="mt-10 max-w-3xl mx-auto"
      aria-labelledby="privacy-heading"
    >
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
        {/* header(常驻) */}
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center gap-3 px-5 py-4 text-left cursor-pointer transition-all hover:opacity-80"
          aria-expanded={expanded}
        >
          <LockIcon />
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              所有处理在你的浏览器内完成 — 数据不离开设备
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              模型缓存在你的设备上,首次使用需要联网下载。
            </p>
          </div>
          <span
            className="text-xs transition-transform"
            style={{
              color: 'var(--text-muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
            aria-hidden
          >
            ▼
          </span>
        </button>

        {/* 展开详情 */}
        {expanded && (
          <div
            className="px-5 pb-5 pt-1 text-xs leading-relaxed border-t"
            style={{ borderColor: 'var(--border-line)' }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mt-3">
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
        )}
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
    <p style={{ color: 'var(--text-secondary)' }}>{children}</p>
  </div>
)

/* ============================== 分轨选择卡 ============================== */

const StemCard = ({
  // stem 仅在 React key 阶段使用,组件本身用 meta.label
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  stem: _stem,
  meta,
  selection,
  availableModels,
  cachedModels,
  onToggle,
  onChangeModel,
}: {
  stem: StemKey
  meta: { label: string; accent: string }
  selection: { enabled: boolean; modelId: string | null }
  availableModels: ModelInfo[]
  cachedModels: Set<string>
  onToggle: () => void
  onChangeModel: (id: string) => void
}) => {
  // 优先看 IndexedDB 缓存,其次看 public/models/ 文件存在
  // ⚠️ 这里用「已知已下载」作为真相源,因为 IndexedDB 缓存是浏览器运行时
  //    public/models/ 下的文件已经在主人机器上;但 worker 会按需缓存到 IDB
  const currentModel = availableModels.find((m) => m.id === selection.modelId)
  const isCached = currentModel ? cachedModels.has(currentModel.id) : false
  const isLocal = currentModel?.id.startsWith('htdemucs-ft-') // 已下到 public/models/ 的 4 个 fp16

  const statusText = !currentModel
    ? ''
    : isCached
      ? '● 已缓存'
      : isLocal
        ? '◐ 待缓存' // 文件在,但 worker 还没存到 IndexedDB
        : '○ 未下载'
  const statusColor = isCached
    ? 'var(--accent-amber)'
    : isLocal
      ? 'var(--text-secondary)'
      : 'var(--text-muted)'

  return (
    <div
      className="rounded-xl p-3 transition-all"
      style={{
        background: 'var(--bg-card)',
        border: selection.enabled
          ? `1px solid ${meta.accent}`
          : '0.5px solid var(--border-line)',
        opacity: selection.enabled ? 1 : 0.55,
      }}
    >
      {/* 顶行:checkbox + 色块 + 标签 */}
      <label className="flex items-center gap-2 cursor-pointer mb-2">
        <input
          type="checkbox"
          checked={selection.enabled}
          onChange={onToggle}
          className="cursor-pointer"
          aria-label={`启用 ${meta.label} 分轨`}
        />
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: meta.accent }}
          aria-hidden
        />
        <span
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {meta.label}
        </span>
        <span
          className="ml-auto text-[0.6rem] font-mono"
          style={{ color: statusColor }}
        >
          {statusText}
        </span>
      </label>

      {/* 模型下拉 */}
      <select
        value={selection.modelId ?? ''}
        onChange={(e) => onChangeModel(e.target.value)}
        disabled={!selection.enabled}
        className="w-full px-2.5 py-1.5 rounded-lg text-xs cursor-pointer disabled:cursor-not-allowed"
        style={{
          background: 'var(--bg-page)',
          color: 'var(--text-primary)',
          border: '0.5px solid var(--border-line)',
        }}
        aria-label={`${meta.label}使用的模型`}
      >
        {availableModels.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} · {m.size}
          </option>
        ))}
      </select>
    </div>
  )
}

// Use unused param at runtime to satisfy both ESLint and tsc
const _useStemKey: (s: StemKey) => StemKey = (s) => s
void _useStemKey

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
      <label
        htmlFor="audio-file-input"
        className="flex flex-col items-center gap-3 p-10 rounded-xl cursor-pointer transition-all hover:opacity-80"
        style={{ background: 'var(--bg-card)', border: '1.5px dashed var(--border-line)' }}
      >
        <UploadCloudIcon />
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
      </label>
      {error && (
        <div
          className="mt-3 p-3 rounded-lg flex items-center justify-between gap-3"
          style={{ background: 'var(--danger-bg)', border: '0.5px solid var(--danger-red)' }}
        >
          <p className="text-xs flex-1" style={{ color: 'var(--danger-red)' }}>
            {error}
          </p>
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
        </div>
      )}
    </div>
  )
}

const ReadyPanel = ({
  fileName,
  selections,
  enabledCount,
  onStart,
  onReset,
  onChangeFile,
}: {
  fileName: string
  selections: StemSelections
  enabledCount: number
  onStart: () => void
  onReset: () => void
  onChangeFile: () => void
}) => {
  const enabledStems = ALL_STEMS.filter((s) => selections[s].enabled)
  return (
    <div
      className="flex flex-col items-center gap-4 p-8 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
    >
      <FileIcon />
      <div className="text-center">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {fileName}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          将分离 {enabledCount} 个分轨:{enabledStems.map((s) => STEM_META[s].label).join(' / ')}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onStart}
          disabled={enabledCount === 0}
          className="px-6 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--accent-amber)', color: '#fff' }}
        >
          开始分离
        </button>
        <button
          type="button"
          onClick={onChangeFile}
          className="px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all hover:opacity-70"
          style={{ background: 'transparent', color: 'var(--text-muted)' }}
        >
          换个文件
        </button>
      </div>
      {enabledCount === 0 && (
        <p className="text-xs" style={{ color: 'var(--danger-red)' }}>
          请至少勾选一个分轨
        </p>
      )}
      {/* 防止 lint 报 unused */}
      {void onReset}
    </div>
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
    decoding: '解码音频',
    separating: 'AI 推理',
  }
  const label = labels[phase] ?? '处理中'

  return (
    <div
      className="flex flex-col items-center gap-3 p-8 rounded-xl"
      style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
      role="status"
      aria-live="polite"
    >
      <p className="text-sm" style={{ color: 'var(--text-primary)' }}>
        {label}
      </p>
      <div
        className="w-full max-w-md h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--accent-glow)' }}
      >
        <div
          className="h-full transition-all"
          style={{
            width: `${Math.round(progress * 100)}%`,
            background: 'var(--accent-amber)',
          }}
        />
      </div>
      <p className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        {currentStep || `${Math.round(progress * 100)}%`}
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="mt-1 px-4 py-1.5 rounded-lg text-xs cursor-pointer transition-all hover:opacity-70"
        style={{ background: 'transparent', color: 'var(--text-muted)' }}
      >
        取消
      </button>
    </div>
  )
}

const StemResultCard = ({
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
  <div
    className="flex items-center justify-between p-4 rounded-xl"
    style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
  >
    <div className="flex items-center gap-3">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: accent }} aria-hidden />
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {label}
      </span>
      {!available && (
        <span
          className="text-[0.6rem] uppercase tracking-wider"
          style={{ color: 'var(--text-muted)' }}
        >
          (未选)
        </span>
      )}
    </div>
    <button
      type="button"
      onClick={onDownload}
      disabled={!available}
      className="px-3 h-8 rounded-full flex items-center gap-1.5 cursor-pointer transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
      style={{ background: 'transparent', border: '1px solid var(--border-line)' }}
      aria-label={`下载 ${label} WAV`}
    >
      <DownloadIcon />
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        WAV
      </span>
    </button>
  </div>
)

/* ============================== 图标 ============================== */

const UploadCloudIcon = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--accent-amber)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const FileIcon = () => (
  <svg
    width="32"
    height="32"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--accent-amber)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
)

const DownloadIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--text-muted)"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const LockIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--accent-amber)"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className="flex-shrink-0"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default AudioSeparatorPage
