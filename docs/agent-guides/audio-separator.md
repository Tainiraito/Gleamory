# 音轨分离专项协作指南

本指南适用于 Gleamory 的音轨分离页面、音频算法、ONNX 模型、缓存和 Worker 调度。开始相关改动前，先遵守根级 `AGENTS.md`，再阅读本文件。

## 适用范围与入口

修改前至少检查与任务有关的文件：

| 路径                                    | 职责                                          |
| --------------------------------------- | --------------------------------------------- |
| `src/pages/AudioSeparatorPage.tsx`      | 页面结构、下载区、处理区、日志和结果区        |
| `src/hooks/useSeparator.ts`             | 页面状态、Worker 生命周期、缓存操作和取消逻辑 |
| `src/workers/separator.worker.ts`       | 模型 family 分发、推理流程、进度和日志        |
| `src/workers/workerError.ts`            | Worker 错误结构与可读上下文                   |
| `src/lib/onnx/modelRegistry.ts`         | 模型、下载源、family、质量和输出配置          |
| `src/lib/onnx/indexedDBCache.ts`        | 下载、校验、IndexedDB 缓存和配额检查          |
| `src/lib/onnx/modelBufferValidation.ts` | 模型内容有效性检查                            |
| `src/lib/audio/`                        | 解码、重采样、STFT、推理后处理和 WAV 编码     |
| `src/lib/audio/separationJobs.ts`       | UI 选择到 `jobs` 的转换                       |

产品状态和验收目标以 `docs/requirements.md` 的音轨分离章节为准；模型是否可运行以当前注册表、Worker 分发和测试结果为准。不要把计划中、候选或仅存在类型定义的模型描述为已支持。

## 不可突破的边界

- 用户音频只在浏览器内解码、推理和编码，不上传远端服务。
- 保持纯前端架构，不为模型推理临时增加 Python 后端或桌面端依赖。
- 模型可以从远端下载，但必须明确区分模型资源与用户音频数据。
- 模型校验失败时拒绝缓存和推理；不能为了绕过下载问题放宽校验。
- 不把大型 ONNX 文件提交到仓库。
- 不让候选模型的慢下载或失败阻塞已可用的主线模型。

## 架构与职责边界

音轨分离流程应保持：

```text
页面选择与展示
  → useSeparator 管理状态和 Worker 生命周期
  → buildSeparationJobs 生成 { stem, modelId }[]
  → separator.worker 按 model.family 分发
  → src/lib/audio 与 src/lib/onnx 执行算法、缓存和会话创建
  → Worker 返回结构化进度、日志、结果或错误
```

具体规则：

- 页面只负责 UI 组合和用户操作，不直接实现模型下载、缓存校验或推理算法。
- `useSeparator` 负责跨区状态协调，不把 family 特定算法塞入 Hook。
- Worker 协议以 `jobs: { stem, modelId }[]` 为中心，不恢复为单模型硬编码流程。
- 新模型优先扩展 `modelRegistry.ts` 和对应 engine，由 `model.family` 分发。
- 公共音频算法保持纯函数或可注入会话，便于使用 fake session 和短数组测试。
- 错误必须保留 `modelId`、stem、chunk、输入输出 tensor 等可定位上下文，不能只抛裸数字或通用失败。

## 模型 family

当前注册表定义以下 family：

- `spleeter`：快速模式，保留为轻量兜底。
- `htdemucs`：高质量 waveform 主线。
- `uvr-mdx`：频谱模型候补路线，需模型级预处理和后处理。
- `uvr-mdxc`：候选 family；未完成浏览器兼容验证前不得作为普通可运行模型暴露。

`implemented: true` 只能表示当前浏览器流程确实可以创建 session 并完成目标推理。计划、下载地址存在或 TypeScript 类型已声明都不等于已实现。

### HT-Demucs

HT-Demucs 相关修改必须保持：

- 输入统一为 44100 Hz stereo waveform。
- 单声道输入复制为左右声道。
- 长音频使用 chunk + overlap-add，避免一次性推理导致 OOM。
- 输出统一编码为 stereo WAV。
- 模型输出顺序为 `[drums, bass, other, vocals]`，目标行由注册表的 `targetOutputIndex` 配置。
- 日志包含模型加载、session 创建、chunk 进度和失败上下文。
- 修改 segment、overlap、归一化或输出映射时，必须增加算法级回归测试，不能只在页面手工试听。

### UVR / MDX

UVR/MDX 模型在 UI 中作为普通可选模型暴露前，必须证明：

- 下载内容是真实 ONNX，不是 HTML 错误页、Git LFS pointer 或明显过小文件。
- `onnxruntime-web` 可以创建 session。
- 已确认输入输出 tensor 名、shape 和动态维度行为。
- 已实现匹配模型的 STFT、归一化、裁剪、inverse STFT 和 stem 映射。
- fake session 测试覆盖输入 shape、输出解析和失败路径。
- 浏览器中能够完成一段短音频的端到端推理。

不要根据模型文件名猜测架构，不要把 MDX、MDXC、Roformer 的预后处理混用。

## 下载源与部署差异

开发服务器通过 `vite.config.ts` 提供：

```text
/model-proxy/uvr/<model-file>.onnx
```

该代理只在 Vite 开发服务器存在。GitHub Pages 生产环境没有 Node 中间件，因此：

- 生产下载不能只依赖 `/model-proxy/uvr/`。
- 注册表应为开发和生产提供符合环境的候选下载源。
- 远程源需要考虑 CORS、重定向、Content-Type、Content-Length 和托管稳定性。
- 静态 `/models/...` 只能作为实际部署了对应资源时的来源，不能假设仓库中已有大模型。
- 下载源修复必须同时验证开发模式和生产构建路径，不能只验证 `npm run dev`。

如果远程资源不稳定，优先更换受控或明确支持跨域的托管源，不要降低模型内容校验标准。

## IndexedDB 缓存规则

模型缓存相关改动必须满足：

- 下载完成后先校验内容，再写入 IndexedDB。
- 读取已缓存模型时仍要验证可用性，损坏缓存不能直接传给 ONNX session。
- HTML、Git LFS pointer、过小文件和截断内容视为失败，并清理本次无效数据。
- 下载前检查存储配额；配额不足时给出明确错误，不自动删除用户已有模型。
- 多个模型并发下载时，各自维护进度、AbortController、成功和错误状态。
- 取消单个下载只影响该模型，不得取消其他下载或当前可用模型。
- 删除缓存后，如果模型正被选择，必须同步取消选择并重新计算可处理状态。
- 缓存结构或 key 发生变化时，要考虑旧版本数据和安全迁移，不静默丢失全部缓存。
- 页面卸载时取消不再需要的下载和检查，避免卸载后更新状态。

## 页面与状态规则

音轨分离页面应保持低认知负担，并明确分区：

- 文件上传与基本信息。
- 模型下载、缓存和选择。
- 处理控制与总体进度。
- 可滚动的处理日志。
- 分轨结果、播放预览和 WAV 下载。

交互必须满足：

- 上传区不混入模型下载进度。
- 未下载或校验失败的模型不可选择，也不能开始处理。
- 选择某 stem 的模型表示请求输出该 stem；取消选择表示不输出。
- 单个模型显示独立的下载、取消、重试和删除状态。
- 慢下载不阻塞其他模型管理和已可用主线的测试。
- 处理日志自动滚动到最新内容，但保留用户查看失败上下文的能力。
- 处理失败后保留日志和输入信息，重试必须创建新的有效任务。
- 取消、失败和完成都要停止“处理中”动画并恢复正确按钮状态。
- 结果区除 WAV 下载外，还要支持直接播放预览。
- 删除缓存、取消下载和取消推理必须表现为不同状态，不能共用模糊提示。

## Worker、资源和错误处理

- Worker 消息必须可序列化并保持明确的 discriminated union。
- 大型音频数组传递时评估 Transferable，避免无意义复制；采用后要验证所有权转移后的调用方行为。
- 新任务开始前清理旧任务的进度和结果，但失败日志是否保留应按页面交互规则处理。
- 用户取消与系统失败要使用不同错误路径，取消不应显示为模型故障。
- session、AudioBuffer、临时数组和对象 URL 在不再使用时释放引用。
- OOM、配额不足、下载内容无效、tensor 不匹配和浏览器不支持需要不同的可读错误信息。
- Worker 日志不能包含用户本地文件路径、音频内容或其他隐私数据。

## 专项测试矩阵

| 改动范围                    | 必须覆盖                                                        |
| --------------------------- | --------------------------------------------------------------- |
| chunk、padding、overlap-add | 正常段、尾段、短输入、左右声道和聚合边界                        |
| WAV 编码、重采样、STFT      | shape、采样率、数值边界和往返行为                               |
| 模型注册表                  | family、stem、下载源、实现状态、输出顺序和索引                  |
| Worker 分发                 | 每个已实现 family、未知 family、空 jobs、结构化错误             |
| 缓存与校验                  | 有效模型、HTML、LFS pointer、过小内容、配额不足、取消和损坏缓存 |
| UI 选择与就绪状态           | 下载、选择、删除、并发、取消、失败、重试和完成                  |
| UVR/MDX                     | fake session 的输入 shape、输出解析、预后处理和错误路径         |

优先运行目标测试，例如：

```bash
npm test -- src/lib/onnx/modelRegistry.test.ts
npm test -- src/lib/onnx/modelBufferValidation.test.ts
npm test -- src/lib/audio/htdemucs.test.ts
npm test -- src/lib/audio/uvrMdx.test.ts
```

完成运行时代码改动后还必须执行：

```bash
npm test
npm run lint
npm run build
```

手工验证至少使用一段短音频覆盖：模型下载或缓存命中、模型选择、开始处理、进度与日志、取消或失败恢复、结果播放和 WAV 下载。涉及下载源时还要验证生产构建下不会错误依赖开发代理。

## 变更完成标准

完成音轨分离任务时，最终报告必须说明：

- 修改了哪个层级：页面、Hook、Worker、算法、注册表或缓存。
- 用户音频是否仍完全留在本地。
- 使用了哪些模型和测试输入，是否完成浏览器短音频验证。
- 执行了哪些自动测试、Lint 和构建检查。
- 哪些下载源或模型兼容性仍未验证。
- 是否存在内存、存储配额、CORS、模型托管或浏览器兼容风险。
