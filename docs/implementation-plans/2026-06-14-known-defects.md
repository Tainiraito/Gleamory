# 已知缺陷优化实施计划

> **执行要求：** 使用 `superpowers:executing-plans` 在当前会话逐项实施。所有行为修复遵循测试驱动开发，完成每项任务后提交一次。

**目标：** 修复已确认的正确性、测试可信度、性能、CI 和文档问题，同时保持现有 UI、公开路由和静态部署架构不变。

**架构：** 保留 React 19、HashRouter、静态 JSON 和 GitHub Pages。将可测试的纯逻辑收敛到 `src/lib` 或 `src/utils`，页面只负责组合 UI；非首页路由改为懒加载，静态资源采用 WOFF2 和 WebP。

**技术栈：** React 19、TypeScript、Vite 6、Vitest、Testing Library、Tailwind CSS 4、ImageMagick、FontTools、GitHub Actions。

---

## 文件变更总览

### 新建

- `src/utils/timeline.ts`：稳定的时间线日期排序。
- `src/utils/timeline.test.ts`：时间线排序回归测试。
- `src/hooks/useDocumentTitle.test.tsx`：网页标题恢复测试。
- `src/hooks/usePianoAudio.test.tsx`：音频上下文卸载清理测试。
- `public/og-cover.jpg`：真实存在的社交分享图。
- `src/assets/fonts/*.woff2`：字体子集化后的 WOFF2 文件。
- `public/covers/*.webp`：优化后的项目封面。

### 修改

- `src/components/Timeline.tsx`：使用日期排序函数。
- `src/hooks/useDocumentTitle.ts`：恢复挂载前标题。
- `src/lib/gacha.ts`：改为当前翻牌 UI 使用的状态和辅助函数。
- `src/lib/gacha.test.ts`：覆盖当前生产状态模型。
- `src/pages/GachaSimulator.tsx`：删除重复逻辑并复用已测试函数。
- `src/hooks/usePianoAudio.ts`：删除空定时器并在卸载时释放资源。
- `src/App.tsx`：懒加载所有非首页路由。
- `src/styles/globals.css`：引用 WOFF2 字体。
- `src/data/projects.json`：引用 WebP 封面。
- `index.html`：引用真实存在的社交分享图。
- `.github/workflows/deploy.yml`：部署前执行测试、Lint 和构建。
- `AGENTS.md`、`README.md`、`docs/requirements.md`、`CHANGELOG.md`：同步实际状态。

### 删除

- 不再被引用的三份 OTF 字体。
- 完成 WebP 替换后不再被引用的 PNG 项目封面。

---

## 任务一：修复标题恢复和时间线排序

**文件：**

- 新建：`src/hooks/useDocumentTitle.test.tsx`
- 新建：`src/utils/timeline.test.ts`
- 新建：`src/utils/timeline.ts`
- 修改：`src/hooks/useDocumentTitle.ts`
- 修改：`src/components/Timeline.tsx`

- [ ] **步骤 1：编写标题恢复失败测试**

```tsx
import { render } from '@testing-library/react'
import { useDocumentTitle } from './useDocumentTitle'

const Probe = () => {
  useDocumentTitle('工具页 | Gleamory 微光集')
  return null
}

it('组件卸载后恢复挂载前的网页标题', () => {
  document.title = 'Gleamory 微光集'
  const view = render(<Probe />)
  expect(document.title).toBe('工具页 | Gleamory 微光集')
  view.unmount()
  expect(document.title).toBe('Gleamory 微光集')
})
```

- [ ] **步骤 2：运行测试并确认失败**

运行：

```bash
npm test -- src/hooks/useDocumentTitle.test.tsx
```

预期：最后一个断言收到空字符串而失败。

- [ ] **步骤 3：实现标题恢复**

在 Effect 执行时保存 `document.title`，清理函数恢复保存值。

- [ ] **步骤 4：编写时间线排序失败测试**

```ts
import { sortUpdatesByDateDesc } from './timeline'

it('按日期降序排列且不修改原数组', () => {
  const input = [
    { id: 'a', projectId: 'x', content: '旧', date: '2026-01-01' },
    { id: 'b', projectId: 'x', content: '新', date: '2026-06-01' },
  ]
  expect(sortUpdatesByDateDesc(input).map((item) => item.id)).toEqual(['b', 'a'])
  expect(input.map((item) => item.id)).toEqual(['a', 'b'])
})

it('无效日期排在最后并保持原始顺序', () => {
  const input = [
    { id: 'a', projectId: 'x', content: '一', date: '-' },
    { id: 'b', projectId: 'x', content: '二', date: 'invalid' },
    { id: 'c', projectId: 'x', content: '三', date: '2026-06-01' },
  ]
  expect(sortUpdatesByDateDesc(input).map((item) => item.id)).toEqual(['c', 'a', 'b'])
})
```

- [ ] **步骤 5：运行测试并确认因函数不存在而失败**

运行：

```bash
npm test -- src/utils/timeline.test.ts
```

- [ ] **步骤 6：实现排序函数并接入组件**

使用带原始索引的稳定排序。有效日期按时间戳降序；无效日期排在有效日期后，并按原始索引排序。`Timeline` 的 `useMemo` 调用该函数。

- [ ] **步骤 7：验证并提交**

```bash
npm test -- src/hooks/useDocumentTitle.test.tsx src/utils/timeline.test.ts
npm run lint
git add src/hooks/useDocumentTitle.ts src/hooks/useDocumentTitle.test.tsx src/utils/timeline.ts src/utils/timeline.test.ts src/components/Timeline.tsx
git commit -m "fix: restore titles and sort timeline by date"
```

---

## 任务二：统一抽卡生产逻辑与测试

**文件：**

- 修改：`src/lib/gacha.ts`
- 修改：`src/lib/gacha.test.ts`
- 修改：`src/pages/GachaSimulator.tsx`

- [ ] **步骤 1：先将测试改为当前生产状态模型**

目标状态：

```ts
export interface GachaState {
  entries: Entry[]
  history: string[]
  cardOrder: number[]
  flipped: boolean[]
  presetName: string
}
```

测试必须覆盖：

- `parseEntryText` 去掉空行和首尾空格；
- `mergeEntryNames` 在追加和覆盖模式下正确处理去重开关；
- `createCardOrder` 返回完整且不重复的索引；
- `loadState(defaultState, validPresetNames)` 只接受字段完整、长度一致且预设名合法的数据；
- 损坏或旧结构数据回退到传入的默认状态；
- `saveState` 写入统一的 `STORAGE_KEY`。

- [ ] **步骤 2：运行测试并确认旧实现失败**

```bash
npm test -- src/lib/gacha.test.ts
```

预期：状态类型、辅助函数和校验行为与新测试不一致。

- [ ] **步骤 3：实现最小纯函数**

保留并复用 Fisher-Yates 洗牌；增加以下 API：

```ts
export function mergeEntryNames(
  currentNames: readonly string[],
  rawText: string,
  mode: 'append' | 'overwrite',
  dedupEnabled: boolean,
): string[]

export function createCardOrder(length: number): number[]
export function loadState(defaultState: GachaState, validPresetNames: readonly string[]): GachaState
export function saveState(state: GachaState): void
```

校验 `entries`、`history`、`cardOrder`、`flipped`、`presetName`，并确认卡牌索引范围有效。

- [ ] **步骤 4：让页面复用辅助函数**

删除页面内重复的 `STORAGE_KEY`、`loadState`、`saveState` 和手写文本去重逻辑。使用 `createCardOrder` 建立牌序；将 `handleCardClick` 纳入 `cardGrid` 的依赖，保持 ESLint 零警告。

- [ ] **步骤 5：验证并提交**

```bash
npm test -- src/lib/gacha.test.ts
npm run lint
git add src/lib/gacha.ts src/lib/gacha.test.ts src/pages/GachaSimulator.tsx
git commit -m "refactor: align gacha tests with production logic"
```

---

## 任务三：修复钢琴音频资源清理

**文件：**

- 新建：`src/hooks/usePianoAudio.test.tsx`
- 修改：`src/hooks/usePianoAudio.ts`

- [ ] **步骤 1：编写卸载清理失败测试**

使用 Testing Library 的 `renderHook`，提供最小 `AudioContext` 测试替身。调用 `playNote` 创建上下文后卸载 Hook，断言：

```ts
expect(close).toHaveBeenCalledOnce()
expect(clearInterval).not.toHaveBeenCalled()
```

- [ ] **步骤 2：运行测试并确认失败**

```bash
npm test -- src/hooks/usePianoAudio.test.tsx
```

预期：当前实现不会关闭上下文，并且会创建无作用的定时器。

- [ ] **步骤 3：实现最小清理逻辑**

- 删除空的 `setInterval` Effect。
- 在卸载 Effect 中调用 `releaseAll`。
- 若音频上下文存在且不是 `closed`，调用 `close()`。
- 清空 `activeNotesRef`。

- [ ] **步骤 4：验证并提交**

```bash
npm test -- src/hooks/usePianoAudio.test.tsx
npm run lint
git add src/hooks/usePianoAudio.ts src/hooks/usePianoAudio.test.tsx
git commit -m "fix: release piano audio resources on unmount"
```

---

## 任务四：路由分包与静态资源优化

**文件：**

- 修改：`src/App.tsx`
- 修改：`src/styles/globals.css`
- 修改：`src/data/projects.json`
- 修改：`index.html`
- 新建：`src/assets/fonts/*.woff2`
- 新建：`public/covers/*.webp`
- 新建：`public/og-cover.jpg`
- 删除：已替换的 OTF 和 PNG 文件

- [ ] **步骤 1：改为路由懒加载**

使用：

```tsx
import { lazy, Suspense } from 'react'

const GachaSimulator = lazy(() => import('@/pages/GachaSimulator'))
const PianoPage = lazy(() => import('@/pages/PianoPage'))
const MetronomePage = lazy(() => import('@/pages/MetronomePage'))
const NeteaseCoverPage = lazy(() => import('@/pages/NeteaseCoverPage'))
const PixivCoverPage = lazy(() => import('@/pages/PixivCoverPage'))
```

用 `Suspense` 包裹 `Routes`，fallback 使用与页面背景一致的轻量加载文字。

- [ ] **步骤 2：建立临时 FontTools 环境并生成字体子集**

从 `src`、`index.html` 和 JSON 数据中收集实际显示字符，保留 ASCII、常用标点和收集到的中文字符。使用临时虚拟环境安装 `fonttools` 与 `brotli`，生成三个 WOFF2 文件：

```bash
python3 -m venv /tmp/gleamory-fonttools
/tmp/gleamory-fonttools/bin/pip install fonttools brotli
/tmp/gleamory-fonttools/bin/pyftsubset INPUT.otf \
  --text-file=/tmp/gleamory-font-chars.txt \
  --flavor=woff2 \
  --layout-features='*' \
  --output-file=OUTPUT.woff2
```

更新 `globals.css` 为 `format('woff2')`，生产构建确认字体可解析后删除 OTF。

- [ ] **步骤 3：生成 WebP 封面和分享图**

使用 ImageMagick：

```bash
convert public/covers/interlude_RinLen_3.png -strip -quality 82 public/covers/interlude_RinLen_3.webp
convert public/covers/荧月.png -strip -quality 82 public/covers/荧月.webp
convert public/covers/interlude_RinLen_3.png -resize '1200x630^' -gravity center -extent 1200x630 -strip -quality 88 public/og-cover.jpg
```

只转换 `projects.json` 实际引用的两张封面。更新 JSON 和 Open Graph/Twitter 元数据，再删除被替换的 PNG；未引用的 PNG 一并删除。

- [ ] **步骤 4：构建并检查产物**

```bash
npm run build
find dist/assets -maxdepth 1 -type f -printf '%f %s\n' | sort
```

预期：

- 每个非首页页面存在独立 JS chunk；
- 不再输出 OTF；
- 输出 WOFF2；
- 总产物显著低于基线 48.11 MiB；
- `dist/og-cover.jpg` 存在。

- [ ] **步骤 5：提交**

```bash
git add src/App.tsx src/styles/globals.css src/data/projects.json src/assets/fonts public/covers public/og-cover.jpg index.html
git commit -m "perf: split routes and optimize static assets"
```

---

## 任务五：强化 CI

**文件：**

- 修改：`.github/workflows/deploy.yml`

- [ ] **步骤 1：在构建前增加质量门禁**

安装依赖后按顺序运行：

```yaml
- name: Test
  run: npm test

- name: Lint
  run: npm run lint

- name: Build
  run: npm run build
```

- [ ] **步骤 2：验证 YAML 内容和本地对应命令**

```bash
npm test
npm run lint
npm run build
```

- [ ] **步骤 3：提交**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: verify tests and lint before deployment"
```

---

## 任务六：同步项目文档

**文件：**

- 修改：`AGENTS.md`
- 修改：`README.md`
- 修改：`docs/requirements.md`
- 修改：`CHANGELOG.md`

- [ ] **步骤 1：更新工程说明**

准确记录：

- React 19、Vite 6、Vitest 4；
- 当前路由和组件名称；
- 测试命令与测试文件；
- 路由懒加载、WOFF2 字体和 WebP 封面；
- CI 顺序为 test、lint、build、deploy。

- [ ] **步骤 2：精简需求文档**

删除 Vue、Element Plus、旧版三张特色卡、默认十条时间线等历史实现描述。保留：

- 产品定位；
- 当前页面和数据结构；
- 非功能约束；
- 更新项目时的操作清单；
- 可验证的验收标准。

- [ ] **步骤 3：清理变更日志**

删除不存在的 Sakana 页面、重复标题和错误路由描述；在 `[Unreleased]` 下记录本分支的正确性、测试、性能、CI 和文档修复。

- [ ] **步骤 4：检查陈旧引用并提交**

```bash
rg -n "Vue|FloatingLogo|No test framework|Vite.*7|Sakana|/sakana|前 3 个项目|默认最近 10 条|无外部 CDN" AGENTS.md README.md docs/requirements.md CHANGELOG.md
git diff --check
git add AGENTS.md README.md docs/requirements.md CHANGELOG.md
git commit -m "docs: align project documentation with implementation"
```

预期：检索只允许出现在明确标记为历史版本的 changelog 内容中。

---

## 任务七：完整验证与浏览器冒烟测试

**文件：** 不新增生产文件；仅在发现问题时回到对应任务修复。

- [ ] **步骤 1：运行完整自动化验证**

```bash
npm test
npm run lint
npm run build
git diff --check main...HEAD
git status --short --branch
```

要求：测试全部通过、Lint 零警告、构建成功、无空白错误。

- [ ] **步骤 2：启动生产预览**

```bash
npm run preview -- --host 0.0.0.0
```

- [ ] **步骤 3：浏览器逐路由检查**

检查：

- `#/`
- `#/gacha-simulator`
- `#/piano`
- `#/metronome`
- `#/netease-cover`
- `#/pixiv-image-extractor`

桌面宽度和移动宽度下确认页面渲染、返回导航、标题、封面、字体、插件截图和主要交互无异常。

- [ ] **步骤 4：检查最终差异**

```bash
git log --oneline main..HEAD
git diff --stat main...HEAD
git status --short --branch
```

工作区必须干净；如验证产生修复，按所属任务补充提交。
