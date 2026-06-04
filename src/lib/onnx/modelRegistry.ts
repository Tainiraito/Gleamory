/* ============================================================
 * 模型元数据注册表
 * 当前版本只包含已下载的 4 个 htdemucs_ft fp16 stem 模型
 * (Spleeter 和 bag 暂不暴露 UI,等以后扩充)
 * ============================================================ */

export type StemKey = 'vocals' | 'drums' | 'bass' | 'other'

export interface ModelInfo {
  /** 唯一 id,跟 /models 下的文件名对应 */
  id: string
  /** 中文显示名 */
  name: string
  /** 英文/技术名 */
  englishName: string
  /** 该模型输出哪个 stem(单 stem 模型 1 个,bag 模型 4 个) */
  outputStem: StemKey | StemKey[]
  /** 单个 .onnx 文件的预期大小,字符串(UI 显示) */
  size: string
  /** 真实字节大小(IndexedDB 配额检查) */
  sizeBytes: number
  /** 浏览器运行时加载的 URL */
  downloadUrl: string
  /** 模型要求的输入采样率 */
  sampleRate: 44100
  /** STFT 窗口大小 */
  fftSize: 4096
  /** STFT hop */
  hopSize: 1024
}

/* ----------- 路径常量 ----------- */

const LOCAL_BASE = '/models'
/** 备选:运行时从 huggingface mirror 拉(用户没预下载时) */
const HF_BASE = 'https://hf-mirror.com/StemSplitio/htdemucs-ft-onnx/resolve/main'
void HF_BASE

/* ----------- 已下载的 4 个 htdemucs_ft fp16 stem ----------- */

export const MODELS: ModelInfo[] = [
  {
    id: 'htdemucs-ft-vocals',
    name: 'htdemucs 人声',
    englishName: 'htdemucs_ft vocals (fp16)',
    outputStem: 'vocals',
    size: '158 MB',
    sizeBytes: 158 * 1024 * 1024,
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_vocals_fp16weights.onnx`,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
  {
    id: 'htdemucs-ft-drums',
    name: 'htdemucs 鼓',
    englishName: 'htdemucs_ft drums (fp16)',
    outputStem: 'drums',
    size: '158 MB',
    sizeBytes: 158 * 1024 * 1024,
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_drums_fp16weights.onnx`,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
  {
    id: 'htdemucs-ft-bass',
    name: 'htdemucs 贝斯',
    englishName: 'htdemucs_ft bass (fp16)',
    outputStem: 'bass',
    size: '158 MB',
    sizeBytes: 158 * 1024 * 1024,
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_bass_fp16weights.onnx`,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
  {
    id: 'htdemucs-ft-other',
    name: 'htdemucs 伴奏',
    englishName: 'htdemucs_ft other (fp16)',
    outputStem: 'other',
    size: '158 MB',
    sizeBytes: 158 * 1024 * 1024,
    downloadUrl: `${LOCAL_BASE}/htdemucs_ft_other_fp16weights.onnx`,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
  },
]

/* ----------- 工具函数 ----------- */

export function getModelById(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id)
}

/** 给定一个 stem 键,返回能输出该 stem 的所有模型 */
export function getModelsForStem(stem: StemKey): ModelInfo[] {
  return MODELS.filter((m) =>
    Array.isArray(m.outputStem) ? m.outputStem.includes(stem) : m.outputStem === stem,
  )
}

/** 给定一个 stem 键,返回该 stem 的「默认推荐模型」(第一个能输出该 stem 的) */
export function getDefaultModelForStem(stem: StemKey): ModelInfo | undefined {
  return getModelsForStem(stem)[0]
}

/* ----------- 一些 StemKey 的辅助 ----------- */

export const ALL_STEMS: StemKey[] = ['vocals', 'drums', 'bass', 'other']

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
