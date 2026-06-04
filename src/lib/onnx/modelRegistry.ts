/* ============================================================
 * 模型元数据注册表
 * 列出所有支持的 ONNX 模型 + 下载 URL + 描述
 * 主人手动下好后放 public/models/ 下;浏览器从同域 URL 拉
 * ============================================================ */

export type StemKey = 'vocals' | 'drums' | 'bass' | 'other'
export type ModelTier = 'lite' | 'balanced' | 'pro'

export interface ModelInfo {
  /** 唯一 id,跟 projects.json / 缓存 key / URL 路径一致 */
  id: string
  /** 中文显示名(详情页 UI 渲染) */
  name: string
  /** 英文/技术名 */
  englishName: string
  /** 档案 tier,驱动 UI 推荐徽章 */
  tier: ModelTier
  /** 描述,详情页 tooltip / 卡片副标题 */
  description: string
  /** 单个 .onnx 文件的预期大小(字符串,UI 显示) */
  size: string
  /** 真实文件大小,字节(用于 IndexedDB 配额检查) */
  sizeBytes: number
  /** SHA-256 校验,保证缓存完整性 */
  sha256: string
  /**
   * 浏览器运行时加载的 URL。
   * 同域(放 public/models/)最快;跨域也可以但要 CORS 允许。
   */
  downloadUrl: string
  /** 哪些 stem 该模型能输出 */
  outputStems: StemKey[]
  /** 推荐:用于详情页"RECOMMENDED"徽章 */
  recommended?: boolean
  /** 精度估计(SDR vocals,越大越好) */
  estimatedSdrDb: number
  /** CPU 4 分钟歌预计耗时(秒,基于 Ryzen 9 5950X 基准) */
  estimatedCpuSeconds: number
  /** 模型要求的输入采样率 */
  sampleRate: 44100
  /** STFT 窗口大小 */
  fftSize: 4096
  /** STFT hop */
  hopSize: 1024
}

/* ----------- 路径常量(避免字符串硬编码) ----------- */

const LOCAL_BASE = '/models'
/** 备选:运行时从 huggingface mirror 拉(用户没预下载时) */
const HF_BASE = 'https://hf-mirror.com/StemSplitio/htdemucs-ft-onnx/resolve/main'
void HF_BASE // 当前用本地预下载;保留作 fallback 备查

/* ----------- 完整的模型列表 ----------- */

export const MODELS: ModelInfo[] = [
  {
    id: 'spleeter-4stems',
    name: 'Spleeter 4-stem',
    englishName: 'Spleeter 4-stems',
    tier: 'lite',
    description: '轻量档 · 跑得快 · 入门首选',
    size: '~80 MB',
    sizeBytes: 80 * 1024 * 1024,
    sha256: 'TODO-主人下载后填',
    // Spleeter 没有官方 ONNX 导出;此处用占位 URL,实际接入需要换模型或自己转
    downloadUrl: `${LOCAL_BASE}/spleeter-4stems.onnx`,
    outputStems: ['vocals', 'drums', 'bass', 'other'],
    estimatedSdrDb: 6.2,
    estimatedCpuSeconds: 18,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
  {
    id: 'htdemucs-vocals',
    name: 'htdemucs 人声 stem',
    englishName: 'htdemucs vocals (fp16)',
    tier: 'balanced',
    description: '均衡档 · 精度高 · 只下人声 ~165MB',
    size: '~165 MB',
    sizeBytes: 165 * 1024 * 1024,
    sha256: 'TODO-主人下载后填',
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_vocals_fp16weights.onnx`,
    outputStems: ['vocals'],
    estimatedSdrDb: 8.4,
    estimatedCpuSeconds: 30,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
    recommended: true,
  },
  {
    id: 'htdemucs-drums',
    name: 'htdemucs 鼓 stem',
    englishName: 'htdemucs drums (fp16)',
    tier: 'balanced',
    description: '均衡档 · 只下鼓 ~165MB',
    size: '~165 MB',
    sizeBytes: 165 * 1024 * 1024,
    sha256: 'TODO-主人下载后填',
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_drums_fp16weights.onnx`,
    outputStems: ['drums'],
    estimatedSdrDb: 8.0,
    estimatedCpuSeconds: 30,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
  {
    id: 'htdemucs-bass',
    name: 'htdemucs 贝斯 stem',
    englishName: 'htdemucs bass (fp16)',
    tier: 'balanced',
    description: '均衡档 · 只下贝斯 ~165MB',
    size: '~165 MB',
    sizeBytes: 165 * 1024 * 1024,
    sha256: 'TODO-主人下载后填',
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_bass_fp16weights.onnx`,
    outputStems: ['bass'],
    estimatedSdrDb: 7.8,
    estimatedCpuSeconds: 30,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
  {
    id: 'htdemucs-other',
    name: 'htdemucs 伴奏 stem',
    englishName: 'htdemucs other (fp16)',
    tier: 'balanced',
    description: '均衡档 · 只下伴奏 ~165MB',
    size: '~165 MB',
    sizeBytes: 165 * 1024 * 1024,
    sha256: 'TODO-主人下载后填',
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_other_fp16weights.onnx`,
    outputStems: ['other'],
    estimatedSdrDb: 7.5,
    estimatedCpuSeconds: 30,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
  {
    id: 'htdemucs-ft-bag',
    name: 'htdemucs_ft 完整 bag',
    englishName: 'htdemucs_ft full bag (fp16)',
    tier: 'pro',
    description: '高质档 · 4 stem 一次输出 · 慢但 SOTA',
    size: '~660 MB',
    sizeBytes: 660 * 1024 * 1024,
    sha256: 'TODO-主人下载后填',
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_bag_fp16weights.onnx`,
    outputStems: ['vocals', 'drums', 'bass', 'other'],
    estimatedSdrDb: 9.2,
    estimatedCpuSeconds: 120,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
]

/* ----------- 工具函数 ----------- */

export function getModelById(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id)
}

/**
 * 主人选了一组模型(可能选了多个均衡档 stem),把它们合成
 * 完整的 4 stem 输出计划。
 *
 * 例:用户选 [htdemucs-vocals, htdemucs-drums]
 *  → 返回 ['vocals', 'drums'] stems
 */
export function getSelectedStems(selectedModelIds: string[]): StemKey[] {
  const stems = new Set<StemKey>()
  for (const id of selectedModelIds) {
    const m = getModelById(id)
    if (m) m.outputStems.forEach((s) => stems.add(s))
  }
  return Array.from(stems)
}

/** 验证所有模型的 URL 都能在浏览器访问(CORS preflight) */
export async function validateModels(): Promise<{ ok: ModelInfo[]; failed: ModelInfo[] }> {
  const results = await Promise.all(
    MODELS.map(async (m) => {
      try {
        const res = await fetch(m.downloadUrl, { method: 'HEAD' })
        return { model: m, ok: res.ok }
      } catch {
        return { model: m, ok: false }
      }
    }),
  )
  return {
    ok: results.filter((r) => r.ok).map((r) => r.model),
    failed: results.filter((r) => !r.ok).map((r) => r.model),
  }
}
