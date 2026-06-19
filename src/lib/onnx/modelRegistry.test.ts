import { describe, expect, it } from 'vitest'

import { getModelById, getModelsForStem, type StemKey } from './modelRegistry'

describe('modelRegistry', () => {
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
