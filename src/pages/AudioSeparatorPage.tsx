import { useCallback } from 'react'
import SiteHeader from '@/components/SiteHeader'
import { ProjectPageHeader } from '@/components/ProjectPageHeader'
import BackFooter from '@/components/BackFooter'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { useSeparator, type SeparatorPhase } from '@/hooks/useSeparator'
import { MODELS, type ModelInfo, type StemKey } from '@/lib/onnx/modelRegistry'

/* =====================================================================
 * 音轨分离 — 浏览器内本地 4-stem 音轨分离
 *
 * 当前阶段:UI + 状态机 + 模型层 + Worker 框架
 * - 模型推理本身(Worker 里)是占位实现(待 T5 STFT/ISTFT 接入)
 * - 模型权重文件待主人手动放到 public/models/(详见 public/models/README.md)
 * ===================================================================== */

const STEMS: Array<{ key: StemKey; label: string; accent: string }> = [
  { key: 'vocals', label: '人声', accent: '#c4956a' },
  { key: 'drums', label: '鼓', accent: '#d68b8b' },
  { key: 'bass', label: '贝斯', accent: '#7a9b6e' },
  { key: 'other', label: '伴奏', accent: '#8a8590' },
]

const AudioSeparatorPage = () => {
  useDocumentTitle('音轨分离 | Gleamory 微光集')

  const { state, downloadModel, separate, cancel, reset, downloadStemWav } = useSeparator()

  /* -------- UI handlers -------- */
  const handleFileSelect = useCallback(
    (file: File) => {
      // 默认下载并使用均衡档人声模型(后续让用户多选)
      const recommendedId = 'htdemucs-vocals'
      // 先确保模型已缓存,再开始分离
      if (!state.cachedModels.has(recommendedId)) {
        downloadModel(MODELS.find((m) => m.id === recommendedId)!)
      }
      // 直接开始分离(Worker 会按需下载)
      separate(file, [recommendedId])
    },
    [state.cachedModels, downloadModel, separate],
  )

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg-page)' }}>
      <SiteHeader />

      <main className="px-4 sm:px-[15%] pt-20 sm:pt-24 pb-36 sm:pb-24">
        <ProjectPageHeader
          name="音轨分离"
          englishName="Audio Stem Separator"
          description="浏览器内本地分离歌曲人声/鼓/贝斯/伴奏，数据不离开设备"
          version="0.1.0"
        />

        {/* ① 模型选择区 */}
        <section className="mt-12 max-w-3xl mx-auto" aria-labelledby="model-heading">
          <h2
            id="model-heading"
            className="text-xs uppercase tracking-[0.25em] font-medium mb-4"
            style={{ color: 'var(--text-muted)' }}
          >
            ① 选择模型
          </h2>
          <div className="flex flex-wrap gap-3 justify-center">
            {MODELS.map((model) => {
              const cached = state.cachedModels.has(model.id)
              return <ModelCard key={model.id} model={model} cached={cached} />
            })}
          </div>
        </section>

        {/* ② 上传区 / 进度区 */}
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
              onFileSelect={handleFileSelect}
              onReset={state.phase === 'error' || state.phase === 'cancelled' ? reset : undefined}
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

        {/* ③ 结果区 */}
        {state.phase === 'done' && state.stems && (
          <section className="mt-10 max-w-3xl mx-auto" aria-labelledby="result-heading">
            <h2
              id="result-heading"
              className="text-xs uppercase tracking-[0.25em] font-medium mb-4"
              style={{ color: 'var(--text-muted)' }}
            >
              ③ 试听 & 下载
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STEMS.map((stem) => (
                <StemCard
                  key={stem.key}
                  stem={stem}
                  available={Boolean((state.stems as unknown as Record<string, unknown>)[stem.key])}
                  onDownload={() => downloadStemWav(stem.key)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ④ 隐私 banner */}
        <section className="mt-12 max-w-3xl mx-auto" aria-labelledby="privacy-heading">
          <h2 id="privacy-heading" className="sr-only">
            隐私说明
          </h2>
          <div
            className="flex items-start gap-3 px-5 py-4 rounded-xl"
            style={{
              background: 'var(--bg-card)',
              border: '0.5px solid var(--border-line)',
            }}
          >
            <LockIcon />
            <div className="flex-1 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              <p className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                所有处理在你的浏览器内完成
              </p>
              <p>
                音频不会上传到任何服务器。模型缓存在你的设备上,首次使用需要联网下载。
              </p>
            </div>
          </div>
        </section>
      </main>

      <BackFooter />
    </div>
  )
}

/* ============================== 子组件 ============================== */

const ModelCard = ({ model, cached }: { model: ModelInfo; cached: boolean }) => (
  <div
    className="relative flex flex-col items-start gap-1.5 px-4 py-3 rounded-xl"
    style={{
      minWidth: '200px',
      background: 'var(--bg-card)',
      border: model.recommended ? '1px solid var(--accent-amber)' : '0.5px solid var(--border-line)',
      boxShadow: model.recommended ? 'var(--shadow-accent-sm)' : 'none',
    }}
  >
    {model.recommended && (
      <span
        className="absolute -top-2 right-3 text-[0.6rem] font-mono px-1.5 py-0.5 rounded"
        style={{ background: 'var(--accent-amber)', color: '#fff', letterSpacing: '0.1em' }}
      >
        RECOMMENDED
      </span>
    )}
    <div className="flex items-baseline gap-2">
      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        {model.name}
      </span>
      <span className="text-[0.65rem] font-mono" style={{ color: 'var(--text-muted)' }}>
        {model.size}
      </span>
    </div>
    <span className="text-[0.7rem]" style={{ color: 'var(--text-muted)' }}>
      {model.description}
    </span>
    <span
      className="mt-1 text-[0.65rem] font-mono"
      style={{ color: cached ? 'var(--accent-amber)' : 'var(--text-muted)' }}
    >
      {cached ? '● 已缓存' : '○ 未下载'}
    </span>
  </div>
)

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
    'model-ready': '准备就绪',
    'checking-cache': '检查缓存',
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
          style={{ width: `${Math.round(progress * 100)}%`, background: 'var(--accent-amber)' }}
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

const StemCard = ({
  stem,
  available,
  onDownload,
}: {
  stem: { key: StemKey; label: string; accent: string }
  available: boolean
  onDownload: () => void
}) => (
  <div
    className="flex items-center justify-between p-4 rounded-xl"
    style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-line)' }}
  >
    <div className="flex items-center gap-3">
      <span className="w-2.5 h-2.5 rounded-full" style={{ background: stem.accent }} aria-hidden />
      <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
        {stem.label}
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
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDownload}
        disabled={!available}
        className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: 'transparent', border: '1px solid var(--border-line)' }}
        aria-label={`下载 ${stem.label} WAV`}
      >
        <DownloadIcon />
      </button>
    </div>
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
    className="flex-shrink-0 mt-0.5"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default AudioSeparatorPage
