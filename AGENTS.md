# AGENTS.md - Gleamory

本文件用于指导 Codex 和其他 LLM 在本项目中工作。除非用户另有明确要求，所有分析、回复、文档和说明都使用中文。

## 项目定位

Gleamory 是一个个人微光工具站，当前重点包含浏览器本地运行的小工具，其中 `audio-source-separator` 是音频分离功能。项目是纯前端 React 单页应用，目标是在浏览器内完成处理，尽量不引入后端服务。

核心原则：

- 用户音频文件不得上传到远端服务。
- 音频分离优先保持“浏览器本地推理、模型本地缓存”。
- 不为了短期功能引入 Python 后端或桌面端依赖，除非用户明确改变产品方向。
- UI 文案使用中文，代码标识符使用英文。
- 优先做小而可验证的改动，避免 unrelated refactor。
- 该功能后续要合并回 Gleamory 主项目，通过普通工具卡片进入，交互形态应与 Gleamory 其他卡片项目保持一致。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | React |
| 语言 | TypeScript |
| 构建 | Vite |
| 样式 | Tailwind CSS |
| 测试 | Vitest |
| 音频推理 | onnxruntime-web |
| 存储 | IndexedDB 模型缓存 |

## 常用命令

```bash
npm install --legacy-peer-deps
npm run dev
npm test
npm run lint
npm run build
```

本地验证默认地址：

```text
http://localhost:5173/#/audio-separator
```

## 代码结构重点

音频分离相关模块主要位于：

- `src/pages/AudioSeparatorPage.tsx`：音频分离页面和交互状态。
- `src/workers/separator.worker.ts`：音频分离 worker、模型分发和日志。
- `src/lib/onnx/modelRegistry.ts`：模型注册表、下载源、family/quality/输出 stem 配置。
- `src/lib/onnx/indexedDBCache.ts`：模型下载、缓存、校验和存储配额。
- `src/lib/audio/`：音频重采样、编码、分块、推理后处理。

新增音频模型时，优先扩展 registry 和 engine，不要把模型逻辑硬编码在页面组件里。

## 音频分离规则

### 模型 family

当前模型路线：

- `spleeter`：快速模式，质量一般，保留为轻量兜底。
- `htdemucs`：高质量模式，已实测效果较好，是当前主线。
- `uvr-mdx`：候补路线，用于适配 UVR / MDX-Net ONNX 模型。
- `uvr-mdxc`：候补路线，暂不默认暴露为可运行模型，除非完成浏览器 ONNX 兼容验证。

worker 协议应以 `jobs: { stem, modelId }[]` 为中心，由 `model.family` 分发到对应 engine。

### HT-Demucs

HT-Demucs 是当前高质量主线。实现要求：

- 输入统一为 44100Hz stereo。
- 单声道输入复制成左右声道。
- 推理使用 chunk + overlap-add，避免长音频 OOM。
- 输出统一为 stereo WAV。
- 日志必须包含模型加载、session 创建、chunk 进度和失败上下文。
- 错误信息要包含 `modelId`、chunk index、输入输出 tensor name，不能只抛裸数字。

如果新增 drums/bass：

- 使用同一套 `htdemucs` engine。
- 配置正确的 `targetOutputIndex`。
- 输出行顺序固定为 `[drums, bass, other, vocals]`。

### UVR / MDX

UVR / MDX 候补模型必须先满足以下条件，才能在 UI 中作为可选模型暴露：

- 模型文件是真实 ONNX，不是 HTML 错误页或 Git LFS pointer。
- `onnxruntime-web` 能创建 session。
- 已确认输入输出 tensor 名和 shape。
- 已实现必要的 STFT / normalization / inverse STFT 后处理。
- 在浏览器中能完成一段短音频推理。

GitHub release 直链在浏览器 `fetch` 下可能受 CORS 或重定向影响。开发环境中优先使用 Vite 同源代理，例如：

```text
/model-proxy/uvr/<model-file>.onnx
```

不要因为下载失败就放宽模型校验。下载内容如果是 HTML、过小文件或 Git LFS pointer，应视为失败并清理缓存。

UVR 候补模型来自 GitHub Release 时下载可能较慢。UI 必须允许取消下载，且不能让慢下载阻塞 HT-Demucs 主线测试。若 UVR 路线效果确认值得保留，再考虑迁移到更稳定的模型托管源。

## IndexedDB 模型缓存

模型缓存相关改动必须遵守：

- 下载完成后校验模型内容。
- 已缓存模型在使用前仍要校验可用性。
- 删除缓存后，如果该模型正被选中，应取消选中。
- 同时下载多个模型时，各模型进度必须互相独立。
- 下载中的单个模型必须允许取消，取消只影响该模型，不影响其他并发下载。
- 存储配额不足时给出明确错误，不自动删除用户已有模型。

## UI / UX 规则

音频分离页面应保持清晰、低认知负担：

- 下载进度、处理进度、处理日志应分区展示。
- 处理日志自动滚动到最新输出。
- 上传音频区域不显示模型下载进度。
- 未下载模型不可选中，不可开始处理。
- 选中某个 stem 的模型即表示输出该 stem；取消选中即不输出。
- 处理失败后必须保留可读日志，重试按钮必须重新触发处理。
- 处理完成后进度不应继续显示“处理中”或转圈。
- 结果区除了下载 WAV，还应支持直接播放预览。

## 编码规范

- 使用 TypeScript 明确类型，避免 `any`。
- 页面组件只处理 UI 状态和交互，业务逻辑优先放入 `src/lib/` 或 worker。
- 复杂音频算法要有单元测试或 mock 推理测试。
- 不要把大模型文件提交进仓库。
- 不要用字符串拼接解析复杂结构，优先使用结构化 API。
- 注释只解释不明显的约束、算法或兼容性原因。

## 新增项目 / 详情页流程

所有项目卡片和详情页的数据（名称、描述、版本号、状态）以 `src/data/projects.json` 为唯一数据源。详情页通过 `src/utils/projectData.ts` 的 `getProjectById(id)` 自动读取，**不要在页面组件中硬编码版本号或项目名称**。

### 添加新项目的步骤

1. **`src/data/projects.json`** — 添加项目条目（id, name, description, status, tags, version, updatedAt）
2. **`src/data/timeline.json`** — 添加上线动态条目
3. **`src/pages/XxxPage.tsx`** — 新建详情页，使用 `getProjectById('xxx')` 获取数据：
   ```tsx
   import { getProjectById } from '@/utils/projectData'
   const project = getProjectById('xxx')!
   // 传给 ProjectPageHeader：name, description, version 自动从数据源读取
   ```
4. **`src/App.tsx`** — 添加 lazy import + Route
5. **`CHANGELOG.md`** — 记录变更

### 版本号管理

- 唯一修改点：`src/data/projects.json` 中的 `version` 字段
- 详情页通过 `getProjectById` 自动同步，无需手动改页面
- `ProjectPageHeader` 会自动加 `v` 前缀显示（如 `⟐ v1.1.0`），传入时去掉 `v`

### 组件复用

- 详情页头部：`ProjectPageHeader`（name, englishName, description, version, children）
- 页面底部：`BackFooter`
- 页面标题：`useDocumentTitle('页面名 | Gleamory 微光集')`
- 站点头部：`SiteHeader`

## 测试要求

涉及音频分离逻辑时，优先补充以下测试：

- chunk 切分和尾段 padding。
- overlap-add 聚合。
- stereo WAV 编码。
- worker family dispatch。
- 模型缓存校验。
- UVR / MDX fake session 推理流程。

完成改动后尽量运行：

```bash
npm test
npm run lint
npm run build
```

如果因为本地环境限制无法运行，最终回复必须明确说明未验证项。

## Git 和协作

- 不要回滚用户或其他 LLM 的改动，除非用户明确要求。
- 修改前先理解现有实现，保持改动聚焦。
- 如果工作树已有无关变更，忽略即可，不要清理。
- 提交或开 PR 前说明改动范围、验证结果和剩余风险。

## 当前产品判断

截至当前阶段：

- HT-Demucs 高质量模式已由用户实测认为效果不错，应作为主要完成方向。
- UVR / MDX 是候补增强路线，优先目标是“可下载、可创建 session、可短音频推理”，再谈效果优化。
- Spleeter 保留为快速模式，不再作为质量优化主线。
- “适配中”“候选模型”“路线调研”等开发信息应写进项目文档，不放在用户界面中；界面只展示当前可下载、可选择、可尝试的模型。
