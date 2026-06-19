/* ============================================================
 * 模型元数据注册表
 * v0.5 — Spleeter 2-stem 加入,HT-Demucs/UVR-MDX 高质量路线适配
 *
 * 优先级:
 *  - Spleeter (vocals + accompaniment): 38MB × 2,当前浏览器内已实现
 *  - htdemucs_ft (vocals/drums/bass/other): 316MB × 4,当前高质量主线
 *  - UVR-MDX: 候补高质量路线,需要模型级预/后处理
 * ============================================================ */

export type StemKey = 'vocals' | 'drums' | 'bass' | 'other'
export type ModelFamily = 'spleeter' | 'htdemucs' | 'uvr-mdx' | 'uvr-mdxc'
export type ModelQuality = 'fast' | 'high'

export interface ModelInfo {
  id: string
  name: string
  englishName: string
  /** 该模型输出哪个 stem */
  outputStem: StemKey | StemKey[]
  /** UI 显示大小 */
  size: string
  /** IndexedDB 配额检查 */
  sizeBytes: number
  /** 模型文件 URL */
  downloadUrl: string
  /** 下载源候选,按顺序尝试 */
  downloadUrls?: string[]
  /** 模型家族/推理流程 */
  family: ModelFamily
  /** 质量层级:fast=当前快速模式,high=高质量模式 */
  quality: ModelQuality
  /** 该 family 是否当前已实现(TODO=false 表示占位) */
  implemented: boolean
  /** 模型要求采样率 */
  sampleRate: 44100
  /** STFT 窗口大小 */
  fftSize: 1024 | 4096
  /** STFT hop */
  hopSize: 256 | 1024
  /** ONNX 输入名 */
  inputName?: string
  /** ONNX 输出名 */
  outputName?: string
  /** waveform 模型分块长度 */
  segmentSamples?: number
  /** 多 stem 输出张量行顺序 */
  outputOrder?: StemKey[]
  /** 当前 specialist 目标输出行 */
  targetOutputIndex?: number
  /** UVR / MDX 频谱模型保留频点 */
  mdxDimF?: number
  /** UVR / MDX 频谱模型时间帧 */
  mdxDimT?: number
}

export interface HighQualityModelPlan {
  id: string
  name: string
  family: Exclude<ModelFamily, 'spleeter'>
  outputStem: StemKey | StemKey[]
  status: 'planned' | 'adapting'
  sourceUrl: string
  notes: string
}

export interface UvrModelSpec {
  architecture: 'mdx' | 'mdxc'
  modelFilename: string
  friendlyName: string
  status: 'candidate' | 'requires-conversion' | 'planned'
  sourceUrl: string
  inputShape: number[]
  stftConfig: {
    fftSize: number
    hopSize: number
    dimF?: number
    dimT?: number
  }
  normalization: 'none' | 'standardize' | 'model-specific'
  outputStems: StemKey[]
  requiresPrePostProcessor: boolean
}

/* ----------- 路径常量 ----------- */

const LOCAL_BASE = '/models'
/** 备选:运行时从 huggingface mirror 拉(用户没预下载时) */
const HF_SPLEETER = 'https://hf-mirror.com/csukuangfj/sherpa-onnx-spleeter-2stems/resolve/main'
const HF_HTDEMUCS = 'https://hf-mirror.com/StemSplitio/htdemucs-ft-onnx/resolve/main'
const HF_HTDEMUCS_UPSTREAM = 'https://huggingface.co/StemSplitio/htdemucs-ft-onnx/resolve/main'
const HF_HTDEMUCS_VOCALS = 'https://hf-mirror.com/StemSplitio/htdemucs-ft-vocals-onnx/resolve/main'
const HF_HTDEMUCS_VOCALS_UPSTREAM = 'https://huggingface.co/StemSplitio/htdemucs-ft-vocals-onnx/resolve/main'
const HF_HTDEMUCS_OTHER = 'https://hf-mirror.com/StemSplitio/htdemucs-ft-other-onnx/resolve/main'
const HF_HTDEMUCS_OTHER_UPSTREAM = 'https://huggingface.co/StemSplitio/htdemucs-ft-other-onnx/resolve/main'
const UVR_MDX_KARA_2_PROXY = '/model-proxy/uvr/UVR_MDXNET_KARA_2.onnx'
const UVR_MDX_KARA_2_GITHUB =
  'https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR_MDXNET_KARA_2.onnx'
const UVR_MDX_KARA_2_LOCAL = `${LOCAL_BASE}/uvr/UVR_MDXNET_KARA_2.onnx`
void HF_SPLEETER

const UVR_MDX_KARA_2_DOWNLOAD_URLS = import.meta.env.DEV
  ? [UVR_MDX_KARA_2_PROXY, UVR_MDX_KARA_2_GITHUB, UVR_MDX_KARA_2_LOCAL]
  : [UVR_MDX_KARA_2_GITHUB, UVR_MDX_KARA_2_LOCAL]

const HTDEMUCS_OUTPUT_ORDER: StemKey[] = ['drums', 'bass', 'other', 'vocals']
const HTDEMUCS_SEGMENT_SAMPLES = 343_980

/* ----------- Spleeter 2-stem(优先) ----------- */

export const MODELS: ModelInfo[] = [
  {
    id: 'spleeter-vocals',
    name: 'Spleeter 人声',
    englishName: 'Spleeter 2-stem vocals',
    outputStem: 'vocals',
    size: '38 MB',
    sizeBytes: 38 * 1024 * 1024,
    downloadUrl: `${LOCAL_BASE}/spleeter/vocals.onnx`,
    family: 'spleeter',
    quality: 'fast',
    implemented: true,
    sampleRate: 44100,
    fftSize: 1024,
    hopSize: 256,
  },
  {
    id: 'spleeter-accompaniment',
    name: 'Spleeter 伴奏',
    englishName: 'Spleeter 2-stem accompaniment',
    outputStem: 'other',
    size: '38 MB',
    sizeBytes: 38 * 1024 * 1024,
    downloadUrl: `${LOCAL_BASE}/spleeter/accompaniment.onnx`,
    family: 'spleeter',
    quality: 'fast',
    implemented: true,
    sampleRate: 44100,
    fftSize: 1024,
    hopSize: 256,
  },
  /* ----------- htdemucs_ft 4-stem 高质量模式 ----------- */
  {
    id: 'htdemucs-ft-vocals',
    name: 'htdemucs 人声',
    englishName: 'htdemucs_ft vocals specialist',
    outputStem: 'vocals',
    size: '316 MB',
    sizeBytes: 316 * 1024 * 1024,
    downloadUrl: `${HF_HTDEMUCS_VOCALS}/htdemucs_ft_vocals.onnx`,
    downloadUrls: [
      `${HF_HTDEMUCS_VOCALS}/htdemucs_ft_vocals.onnx`,
      `${HF_HTDEMUCS_VOCALS_UPSTREAM}/htdemucs_ft_vocals.onnx`,
      `${HF_HTDEMUCS}/htdemucs_ft_vocals.onnx`,
      `${HF_HTDEMUCS_UPSTREAM}/htdemucs_ft_vocals.onnx`,
      `${LOCAL_BASE}/htdemucs/htdemucs_ft_vocals.onnx`,
    ],
    family: 'htdemucs',
    quality: 'high',
    implemented: true,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
    inputName: 'mix',
    outputName: 'stems',
    segmentSamples: HTDEMUCS_SEGMENT_SAMPLES,
    outputOrder: HTDEMUCS_OUTPUT_ORDER,
    targetOutputIndex: 3,
  },
  {
    id: 'htdemucs-ft-drums',
    name: 'htdemucs 鼓',
    englishName: 'htdemucs_ft drums specialist',
    outputStem: 'drums',
    size: '316 MB',
    sizeBytes: 316 * 1024 * 1024,
    downloadUrl: `${HF_HTDEMUCS}/htdemucs_ft_drums.onnx`,
    downloadUrls: [
      `${HF_HTDEMUCS}/htdemucs_ft_drums.onnx`,
      `${HF_HTDEMUCS_UPSTREAM}/htdemucs_ft_drums.onnx`,
      `${LOCAL_BASE}/htdemucs/htdemucs_ft_drums.onnx`,
    ],
    family: 'htdemucs',
    quality: 'high',
    implemented: true,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
    inputName: 'mix',
    outputName: 'stems',
    segmentSamples: HTDEMUCS_SEGMENT_SAMPLES,
    outputOrder: HTDEMUCS_OUTPUT_ORDER,
    targetOutputIndex: 0,
  },
  {
    id: 'htdemucs-ft-bass',
    name: 'htdemucs 贝斯',
    englishName: 'htdemucs_ft bass specialist',
    outputStem: 'bass',
    size: '316 MB',
    sizeBytes: 316 * 1024 * 1024,
    downloadUrl: `${HF_HTDEMUCS}/htdemucs_ft_bass.onnx`,
    downloadUrls: [
      `${HF_HTDEMUCS}/htdemucs_ft_bass.onnx`,
      `${HF_HTDEMUCS_UPSTREAM}/htdemucs_ft_bass.onnx`,
      `${LOCAL_BASE}/htdemucs/htdemucs_ft_bass.onnx`,
    ],
    family: 'htdemucs',
    quality: 'high',
    implemented: true,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
    inputName: 'mix',
    outputName: 'stems',
    segmentSamples: HTDEMUCS_SEGMENT_SAMPLES,
    outputOrder: HTDEMUCS_OUTPUT_ORDER,
    targetOutputIndex: 1,
  },
  {
    id: 'htdemucs-ft-other',
    name: 'htdemucs 伴奏',
    englishName: 'htdemucs_ft other specialist',
    outputStem: 'other',
    size: '316 MB',
    sizeBytes: 316 * 1024 * 1024,
    downloadUrl: `${HF_HTDEMUCS_OTHER}/htdemucs_ft_other.onnx`,
    downloadUrls: [
      `${HF_HTDEMUCS_OTHER}/htdemucs_ft_other.onnx`,
      `${HF_HTDEMUCS_OTHER_UPSTREAM}/htdemucs_ft_other.onnx`,
      `${HF_HTDEMUCS}/htdemucs_ft_other.onnx`,
      `${HF_HTDEMUCS_UPSTREAM}/htdemucs_ft_other.onnx`,
      `${LOCAL_BASE}/htdemucs/htdemucs_ft_other.onnx`,
    ],
    family: 'htdemucs',
    quality: 'high',
    implemented: true,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
    inputName: 'mix',
    outputName: 'stems',
    segmentSamples: HTDEMUCS_SEGMENT_SAMPLES,
    outputOrder: HTDEMUCS_OUTPUT_ORDER,
    targetOutputIndex: 2,
  },
  {
    id: 'uvr-mdx-kara-2',
    name: 'UVR MDX Karaoke 2',
    englishName: 'UVR_MDXNET_KARA_2 vocals/residual',
    outputStem: ['vocals', 'other'],
    size: '50 MB',
    sizeBytes: 52_786_726,
    downloadUrl: UVR_MDX_KARA_2_DOWNLOAD_URLS[0],
    downloadUrls: UVR_MDX_KARA_2_DOWNLOAD_URLS,
    family: 'uvr-mdx',
    quality: 'high',
    implemented: true,
    sampleRate: 44100,
    fftSize: 4096,
    hopSize: 1024,
    mdxDimF: 2048,
    mdxDimT: 256,
  },
]

export const HIGH_QUALITY_MODEL_ROADMAP: HighQualityModelPlan[] = [
  {
    id: 'htdemucs-ft-browser',
    name: 'HT-Demucs FT 高质量 4 分轨',
    family: 'htdemucs',
    outputStem: ['vocals', 'drums', 'bass', 'other'],
    status: 'adapting',
    sourceUrl: 'https://huggingface.co/StemSplitio/htdemucs-ft-onnx',
    notes: 'ONNX 输入为 44.1kHz stereo waveform chunk,需要实现 7.8s 分块、overlap-add 和 specialist 输出行选择。',
  },
  {
    id: 'uvr-mdx-browser',
    name: 'UVR / MDX-Net 人声优先路线',
    family: 'uvr-mdx',
    outputStem: ['vocals', 'other'],
    status: 'planned',
    sourceUrl: 'https://github.com/nomadkaraoke/python-audio-separator',
    notes: '适合人声/伴奏两分轨,但不同 UVR 模型的 STFT 参数、归一化和输出语义不统一,需要单独适配模型配置。',
  },
  {
    id: 'uvr-mdxc-browser',
    name: 'UVR / MDXC Roformer 路线',
    family: 'uvr-mdxc',
    outputStem: ['vocals', 'other'],
    status: 'planned',
    sourceUrl: 'https://github.com/nomadkaraoke/python-audio-separator',
    notes: '质量潜力更高,但常见权重并非统一 ONNX 浏览器格式,需要先验证模型格式、许可证和 onnxruntime-web 算子兼容性。',
  },
]

export const UVR_MODEL_SPECS: UvrModelSpec[] = [
  {
    architecture: 'mdxc',
    modelFilename: 'model_bs_roformer_ep_317_sdr_12.9755.ckpt',
    friendlyName: 'BS-Roformer-Viperx-1297',
    status: 'requires-conversion',
    sourceUrl: 'https://github.com/nomadkaraoke/python-audio-separator',
    inputShape: [1, 2, 256, 256],
    stftConfig: {
      fftSize: 6144,
      hopSize: 1024,
      dimF: 3072,
      dimT: 256,
    },
    normalization: 'model-specific',
    outputStems: ['vocals', 'other'],
    requiresPrePostProcessor: true,
  },
  {
    architecture: 'mdx',
    modelFilename: 'UVR_MDXNET_KARA_2.onnx',
    friendlyName: 'UVR MDX-Net Karaoke 2',
    status: 'candidate',
    sourceUrl: 'https://github.com/nomadkaraoke/python-audio-separator',
    inputShape: [1, 2, 3072, 256],
    stftConfig: {
      fftSize: 6144,
      hopSize: 1024,
      dimF: 3072,
      dimT: 256,
    },
    normalization: 'model-specific',
    outputStems: ['vocals', 'other'],
    requiresPrePostProcessor: true,
  },
]

/* ----------- 工具函数 ----------- */

export function getModelById(id: string): ModelInfo | undefined {
  return MODELS.find((m) => m.id === id)
}

/** 给定一个 stem 键,返回能输出该 stem 的所有已实现模型 */
export function getModelsForStem(stem: StemKey): ModelInfo[] {
  return MODELS.filter(
    (m) =>
      m.implemented &&
      (Array.isArray(m.outputStem) ? m.outputStem.includes(stem) : m.outputStem === stem),
  )
}

/** 给定一个 stem 键,返回该 stem 的「默认推荐模型」(第一个能输出该 stem 的) */
export function getDefaultModelForStem(stem: StemKey): ModelInfo | undefined {
  return getModelsForStem(stem)[0]
}

export const ALL_STEMS: StemKey[] = ['vocals', 'drums', 'bass', 'other']

/** 当前已实现模型的 stem(只暴露给 UI) */
export const AVAILABLE_STEMS: StemKey[] = Array.from(
  new Set(
    MODELS.filter((m) => m.implemented).flatMap((m) =>
      Array.isArray(m.outputStem) ? m.outputStem : [m.outputStem],
    ),
  ),
) as StemKey[]

/** 验证所有已实现模型的 URL 都能在浏览器访问 */
export async function validateModels(): Promise<{ ok: ModelInfo[]; failed: ModelInfo[] }> {
  const results = await Promise.all(
    MODELS.filter((m) => m.implemented).map(async (m) => {
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
