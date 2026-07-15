# 吉他指板外观预设与拟真结构实施计划

> **执行状态：** 已完成并通过用户视觉验收（2026-07-14）。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为吉他指板增加四套可持久化外观预设，并实现递减品距、独立弦径、缠弦/钢弦、琴枕、品丝和真实品位标记。

**Architecture:** 新建 `appearance.ts` 保存固定预设元数据与十二平均律品距纯函数；`Fretboard` 只接收外观标识并输出结构数据属性，所有材质通过根节点 CSS 变量绘制；设置组件使用带预览的直接选择按钮，本地存储对旧数据回退默认外观。现有音位按钮、音频、判题和状态优先级保持不变。

**Tech Stack:** React 19、TypeScript 5.7、CSS 自定义属性、Vitest 4、Testing Library、Vite 6、浏览器 `localStorage`

## Global Constraints

- 继续在 `feature/guitar-fretboard-trainer` 分支和当前工作树内开发，不回退已有未提交修改。
- 不新增生产依赖，不引入 Canvas、SVG、WebGL、远程纹理或外部图片。
- 四套预设固定为 `rosewood`、`maple`、`ebony`、`practice`，默认 `rosewood`。
- 1 至 24 品使用十二平均律宽度权重，0 品使用固定权重 `0.65`。
- 现有左键选择/重复播放、右键取消、范围禁用、答案反馈和音名显示规则不得改变。
- 视觉语义层必须高于木纹、品丝和琴弦装饰层。
- 设置选项继续直接展示，不使用下拉框。
- 后续可扩展内容保留在设计文档，不在本轮加入自定义编辑器。

---

### Task 1: 外观模型与真实品距纯函数

**Files:**
- Create: `src/lib/guitarFretboard/appearance.ts`
- Create: `src/lib/guitarFretboard/appearance.test.ts`
- Modify: `src/lib/guitarFretboard/types.ts`

**Interfaces:**
- Produces: `FretboardAppearanceId`
- Produces: `FRETBOARD_APPEARANCE_PRESETS`
- Produces: `FRETBOARD_APPEARANCE_IDS`
- Produces: `DEFAULT_FRETBOARD_APPEARANCE`
- Produces: `getFretGridLayout(frets: number[]): { gridTemplateColumns: string; minWidth: string }`
- Consumed by: 存储层、`Fretboard`、外观设置组件

- [x] **Step 1: 写外观预设与品距失败测试**

创建 `appearance.test.ts`，覆盖固定标识、默认值和几何结果：

```ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_FRETBOARD_APPEARANCE,
  FRETBOARD_APPEARANCE_PRESETS,
  getFretGridLayout,
} from './appearance'

describe('fretboard appearance', () => {
  it('exposes four fixed presets with rosewood as the default', () => {
    expect(DEFAULT_FRETBOARD_APPEARANCE).toBe('rosewood')
    expect(FRETBOARD_APPEARANCE_PRESETS.map((preset) => preset.id)).toEqual([
      'rosewood', 'maple', 'ebony', 'practice',
    ])
  })

  it('uses equal-temperament fret widths after the open-string cell', () => {
    const layout = getFretGridLayout(Array.from({ length: 25 }, (_, fret) => fret))
    const tracks = layout.gridTemplateColumns.split(' ').slice(1).map((track) => Number.parseFloat(track))
    expect(tracks[0]).toBeCloseTo(0.65)
    expect(tracks[1]).toBeCloseTo(1)
    expect(tracks[13]).toBeCloseTo(0.5, 3)
    expect(tracks[24]).toBeCloseTo(2 ** (-23 / 12), 3)
    expect(tracks.slice(1).every((width, index, widths) => index === 0 || width < widths[index - 1]!)).toBe(true)
  })

  it('only creates tracks for requested frets', () => {
    expect(getFretGridLayout([0, 1, 2, 3]).gridTemplateColumns.split(' ')).toHaveLength(5)
  })
})
```

- [x] **Step 2: 运行测试并确认正确失败**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard/appearance.test.ts`

Expected: FAIL，提示 `./appearance` 不存在。

- [x] **Step 3: 添加类型、预设元数据与几何实现**

在 `types.ts` 增加：

```ts
export type FretboardAppearanceId = 'rosewood' | 'maple' | 'ebony' | 'practice'
```

在 `appearance.ts` 定义：

```ts
export interface FretboardAppearancePreset {
  id: FretboardAppearanceId
  name: string
  description: string
  preview: {
    board: string
    fret: string
    woundString: string
    plainString: string
  }
}

export const DEFAULT_FRETBOARD_APPEARANCE: FretboardAppearanceId = 'rosewood'

export const FRETBOARD_APPEARANCE_PRESETS = [
  {
    id: 'rosewood',
    name: '玫瑰木经典',
    description: '暖深木色，经典镍银质感',
    preview: { board: '#4a2d20', fret: '#d8c7a9', woundString: '#c7a56d', plainString: '#e7e3d8' },
  },
  {
    id: 'maple',
    name: '枫木明亮',
    description: '浅色木纹，边界清晰',
    preview: { board: '#c99558', fret: '#e4e7e5', woundString: '#c8b58e', plainString: '#f1f2ed' },
  },
  {
    id: 'ebony',
    name: '乌木舞台',
    description: '近黑乌木，冷银高光',
    preview: { board: '#171719', fret: '#cad1d4', woundString: '#aeb7bc', plainString: '#eef3f4' },
  },
  {
    id: 'practice',
    name: '高对比练习',
    description: '弱纹理，强化弦与品丝',
    preview: { board: '#303438', fret: '#ffffff', woundString: '#f0bf68', plainString: '#ffffff' },
  },
] as const satisfies readonly FretboardAppearancePreset[]

export const FRETBOARD_APPEARANCE_IDS = new Set<FretboardAppearanceId>(
  FRETBOARD_APPEARANCE_PRESETS.map((preset) => preset.id),
)
```

`getFretGridLayout` 使用 `fret === 0 ? 0.65 : 2 ** (-(fret - 1) / 12)`；首列固定 `2.5rem`，其余列先四舍五入到四位小数，再去掉末尾零并输出 `fr`。最小宽度使用 `2.5 + sum(weights) * 6.2` rem，最低不小于 `28rem`。

- [x] **Step 4: 验证纯函数测试通过**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard/appearance.test.ts`

Expected: PASS。

### Task 2: 设置类型与旧存储兼容

**Files:**
- Modify: `src/lib/guitarFretboard/types.ts`
- Modify: `src/lib/guitarFretboard/storage.ts`
- Modify: `src/lib/guitarFretboard/storage.test.ts`

**Interfaces:**
- Consumes: `FretboardAppearanceId`、`DEFAULT_FRETBOARD_APPEARANCE`
- Produces: `FretboardSettings.appearance`
- Produces: 旧数据和非法值回退 `rosewood` 的加载结果

- [x] **Step 1: 先扩展存储测试**

在 `storage.test.ts` 增加断言：

```ts
expect(loadFretboardState().settings.appearance).toBe('rosewood')
```

并增加合法和非法数据用例：

```ts
const validSettings = {
  tuning: { id: 'standard' },
  fretCount: 24,
  accidental: 'sharp',
  mode: 'hidden',
  noteDisplayMs: null,
}

localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: { ...validSettings, appearance: 'ebony' } }))
expect(loadFretboardState().settings.appearance).toBe('ebony')

localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: { ...validSettings, appearance: 'neon' } }))
expect(loadFretboardState().settings.appearance).toBe('rosewood')
```

更新所有显式构造 `FretboardSettings` 的测试对象，加入 `appearance: 'rosewood'`。

- [x] **Step 2: 运行存储测试并确认失败原因**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard/storage.test.ts`

Expected: FAIL，加载结果尚无 `appearance`。

- [x] **Step 3: 实现设置字段和归一化**

在 `FretboardSettings` 增加 `appearance`。`storage.ts` 增加合法标识集合和：

```ts
function normalizeAppearance(value: unknown): FretboardAppearanceId {
  return typeof value === 'string' && FRETBOARD_APPEARANCE_IDS.has(value as FretboardAppearanceId)
    ? value as FretboardAppearanceId
    : DEFAULT_FRETBOARD_APPEARANCE
}
```

默认状态和加载结果都写入规范化后的 `appearance`；保留现有存储键和其他字段。

- [x] **Step 4: 运行存储及指板模型测试**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard/storage.test.ts src/lib/guitarFretboard/fretboard.test.ts`

Expected: PASS。

### Task 3: 指板几何、弦号属性和真实品位标记

**Files:**
- Create: `src/components/guitar-fretboard/Fretboard.test.tsx`
- Modify: `src/components/guitar-fretboard/Fretboard.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`

**Interfaces:**
- Consumes: `appearance: FretboardAppearanceId`、`getFretGridLayout`
- Produces: `data-appearance`、`data-string-number`、`data-fret-number`
- Produces: 8 个单点和 4 个双点标记节点（24 品指板）

- [x] **Step 1: 写指板结构失败测试**

创建组件测试，使用标准调弦生成 24 品模型并渲染 `Fretboard`。断言：

```ts
expect(screen.getByLabelText('吉他指板')).toHaveAttribute('data-appearance', 'ebony')
expect(container.querySelector('[data-string-number="6"] .fretboard-string-line')).toBeInTheDocument()
expect(container.querySelector('[data-fret-number="0"]')).toBeInTheDocument()
expect(container.querySelector('[data-fret-number="1"]')).toBeInTheDocument()
expect(container.querySelectorAll('[data-marker-type="single"]')).toHaveLength(8)
expect(container.querySelectorAll('[data-marker-type="double"]')).toHaveLength(4)
expect((container.querySelector('.fretboard-grid') as HTMLElement).style.gridTemplateColumns).toContain('0.65fr')
```

- [x] **Step 2: 运行组件测试并确认失败**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/components/guitar-fretboard/Fretboard.test.tsx`

Expected: FAIL，当前组件没有外观属性、结构属性和正确标记数量。

- [x] **Step 3: 扩展 Fretboard 属性和网格**

`FretboardProps` 增加 `appearance`。根节点增加 `data-appearance={appearance}`。调用 `getFretGridLayout(frets)`，同时设置 `gridTemplateColumns` 和 `minWidth`。

每个音位按钮增加：

```tsx
data-string-number={stringNumber}
data-fret-number={fretNumber}
```

页面 `renderFretboard` 的所有路径统一传入 `settings.appearance`，不能只覆盖某一个 Tab。

- [x] **Step 4: 收敛品位标记 DOM**

单点品位只在 3 弦行尾渲染一个 `data-marker-type="single"`；12、24 品分别在 2 弦和 4 弦行尾渲染两个 `data-marker-type="double"`。所有标记添加 `aria-hidden="true"`，其余弦不渲染标记。

- [x] **Step 5: 验证组件和页面测试**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/components/guitar-fretboard/Fretboard.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

### Task 4: 四套外观设置按钮与持久化集成

**Files:**
- Create: `src/components/guitar-fretboard/FretboardAppearanceSettings.tsx`
- Create: `src/components/guitar-fretboard/FretboardAppearanceSettings.test.tsx`
- Modify: `src/components/guitar-fretboard/TuningSettings.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.test.tsx`

**Interfaces:**
- Consumes: `FRETBOARD_APPEARANCE_PRESETS`
- Produces: `FretboardAppearanceSettings({ value, onChange })`
- Produces: 切换后立即更新顶部指板并保存设置

- [x] **Step 1: 写设置组件失败测试**

断言四个预设按钮全部可见、没有 `combobox`、当前值具有 `aria-pressed="true"`，点击“乌木舞台”调用 `onChange('ebony')`。每个按钮必须包含 `aria-hidden` 的迷你预览。

- [x] **Step 2: 写页面集成失败测试**

在页面测试中进入“设置”，断言默认指板为 `rosewood`；点击“乌木舞台”后根节点变为 `ebony`，本地存储包含 `appearance: 'ebony'`。先在设置指板选中一个位置，再切换预设，断言该位置仍为 `data-state="selected"`。

- [x] **Step 3: 运行目标测试并确认失败**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/components/guitar-fretboard/FretboardAppearanceSettings.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: FAIL，当前不存在外观设置和页面回调。

- [x] **Step 4: 实现预览按钮组件**

组件结构固定为：

```tsx
import type { CSSProperties } from 'react'

<div className="fretboard-appearance-settings" role="group" aria-label="指板外观">
  {FRETBOARD_APPEARANCE_PRESETS.map((preset) => (
    <button type="button" aria-pressed={value === preset.id} onClick={() => onChange(preset.id)}>
      <span
        className="fretboard-appearance-preview"
        data-appearance={preset.id}
        style={{
          '--preview-board': preset.preview.board,
          '--preview-fret': preset.preview.fret,
          '--preview-wound-string': preset.preview.woundString,
          '--preview-plain-string': preset.preview.plainString,
        } as CSSProperties}
        aria-hidden="true"
      >
        <i className="fretboard-appearance-preview-fret" />
        <i className="fretboard-appearance-preview-string wound" />
        <i className="fretboard-appearance-preview-string plain" />
      </span>
      <strong>{preset.name}</strong>
      <small>{preset.description}</small>
    </button>
  ))}
</div>
```

预览只展示材质和结构，不复制完整可交互指板。

- [x] **Step 5: 集成设置并避免额外清理状态**

`TuningSettings` 增加 `appearance` 与 `onAppearanceChange`，把外观设置放在调弦预设之后。

页面使用独立回调：

```ts
const handleAppearanceChange = (appearance: FretboardAppearanceId) => {
  const nextSettings = { ...settings, appearance }
  setSettings(nextSettings)
  persistSettings(nextSettings)
}
```

不得调用会清空选中位置和题目的通用 `updateSettings`。Tab 切换仍按既有生命周期处理。

- [x] **Step 6: 验证设置和页面测试通过**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/components/guitar-fretboard/FretboardAppearanceSettings.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

### Task 5: 四套材质、弦径、琴枕和响应式预览

**Files:**
- Modify: `src/styles/globals.css`
- Modify: `src/components/guitar-fretboard/Fretboard.test.tsx`
- Modify: `src/components/guitar-fretboard/FretboardAppearanceSettings.test.tsx`

**Interfaces:**
- Consumes: `data-appearance`、`data-string-number`、`data-fret-number`、`data-marker-type`
- Produces: 四套可区分材质和稳定的视觉层级

- [x] **Step 1: 添加样式结构回归断言**

组件测试继续约束所有结构数据属性存在，避免 CSS 选择器在后续重构中静默失效。样式本身通过构建和浏览器检查验证，不在 JSDOM 中断言像素。

- [x] **Step 2: 定义预设 CSS 变量**

为四个根选择器分别定义以下变量：

```css
--fretboard-base;
--fretboard-grain-dark;
--fretboard-grain-light;
--fret-wire-dark;
--fret-wire-light;
--nut-color;
--marker-color;
--wound-string-dark;
--wound-string-light;
--plain-string-dark;
--plain-string-light;
--fretboard-label-color;
```

木纹只使用低对比多层线性渐变。`practice` 预设关闭大部分纹理并提高结构对比度。

- [x] **Step 3: 实现弦径与弦材质**

根据 `data-string-number` 设置 `--string-width`：6 至 1 弦依次为 `3.4px`、`3px`、`2.6px`、`2px`、`1.5px`、`1.1px`。4 至 6 弦使用缠弦渐变，1 至 3 弦使用钢弦高光渐变。

- [x] **Step 4: 实现品丝、琴枕和标记层级**

普通音位左边界使用暗边加金属高光；`data-fret-number="0"` 不画普通品丝；`data-fret-number="1"` 左边界绘制约 4px 琴枕。单点和双点标记使用预设变量，并放在琴弦下、木纹上。现有范围框和答案圆点提高 `z-index`，保持语义优先。

- [x] **Step 5: 实现预览和响应式布局**

外观按钮桌面四列、普通宽度两列、窄屏单列；预览条固定高度，内部绘制两种弦色和一条品丝。按钮文本可换行但高度稳定，不创建卡片嵌套。

- [x] **Step 6: 运行指板相关测试、Lint 和构建**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard src/components/guitar-fretboard src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm run lint`

Expected: exit 0。

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm run build`

Expected: exit 0；允许仓库既有 ONNX 动静态导入提示，不得新增错误。

### Task 6: 文档同步与完整验收

**Files:**
- Modify: `docs/designs/2026-07-07-guitar-fretboard-trainer-design.md`
- Modify: `docs/designs/2026-07-07-guitar-fretboard-trainer-roadmap.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: 已实现的外观预设和拟真结构
- Produces: 当前能力、延期范围和发布说明一致

- [x] **Step 1: 同步主设计和路线图**

在主设计追加本轮四套预设、真实品距、弦径、品丝与标记规则，并引用 `2026-07-14-guitar-fretboard-appearance-presets-design.md`。路线图将固定预设标记为已实现，自定义编辑器、弦组和多弦琴保留为延期项。

- [x] **Step 2: 更新 CHANGELOG**

在 `Unreleased / Added` 记录四套指板外观预设；在 `Changed` 记录真实递减品距、六弦独立粗细、琴枕/品丝和真实品位标记。

- [x] **Step 3: 运行完整质量门槛**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test`

Expected: 全量 PASS。

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm run lint`

Expected: exit 0。

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm run build`

Expected: exit 0，除既有 ONNX 提示外无新增警告。

Run: `git diff --check`

Expected: exit 0。

- [x] **Step 4: 浏览器视觉验收**

打开 `http://127.0.0.1:5173/#/guitar-fretboard-trainer`，分别在桌面和移动宽度检查四套预设、品距递减、六弦粗细、琴枕、单/双标记、范围框和音名反馈。逐项验证左键、重复播放、右键、设置持久化和横向滚动。

- [x] **Step 5: 报告环境限制**

若应用内浏览器仍因 WSL `sandboxCwd` 元数据无法初始化，禁止声称已完成截图级验收；保留自动测试、构建和 HTTP 状态证据，并明确交由用户进行最终视觉测试。
