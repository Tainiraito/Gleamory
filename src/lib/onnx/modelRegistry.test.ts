import { describe, expect, it } from 'vitest'

import { getModelById, getModelsForStem, type StemKey } from './modelRegistry'

describe('modelRegistry', () => {
  it('Spleeter 使用固定版本远程模型并保留可选本地回退', () => {
    const revision = '7001ba316a615cacddb3f9ef3ec416661a277e26'
    const upstream = `https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-2stems/resolve/${revision}`
    const mirror = `https://hf-mirror.com/csukuangfj/sherpa-onnx-spleeter-2stems/resolve/${revision}`
    const expected = [
      ['spleeter-vocals', 'vocals.onnx', 39_318_336],
      ['spleeter-accompaniment', 'accompaniment.onnx', 39_318_343],
    ] as const

    for (const [modelId, filename, sizeBytes] of expected) {
      const model = getModelById(modelId)

      expect(model?.downloadUrl).toBe(`${upstream}/${filename}`)
      expect(model?.downloadUrls).toEqual([
        `${upstream}/${filename}`,
        `${mirror}/${filename}`,
        `/models/spleeter/${filename}`,
      ])
      expect(model?.sizeBytes).toBe(sizeBytes)
    }
  })

  it('暴露 HT-Demucs 四分轨高质量模型', () => {
    const expected: Array<[StemKey, string]> = [
      ['drums', 'htdemucs-ft-drums'],
      ['bass', 'htdemucs-ft-bass'],
      ['other', 'htdemucs-ft-other'],
      ['vocals', 'htdemucs-ft-vocals'],
    ]

    for (const [stem, modelId] of expected) {
      const models = getModelsForStem(stem)
      expect(models.some((model) => model.id === modelId && model.implemented)).toBe(true)
    }
  })

  it('UVR-MDX 候补模型优先使用同源代理下载', () => {
    const model = getModelById('uvr-mdx-kara-2')

    expect(model?.downloadUrl).toBe('/model-proxy/uvr/UVR_MDXNET_KARA_2.onnx')
    expect(model?.downloadUrls?.[0]).toBe('/model-proxy/uvr/UVR_MDXNET_KARA_2.onnx')
  })
})
