# 吉他指板练习体验修正实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让随机练习只覆盖用户已学内容，修复随机模式和音名显示缺陷，优化题目对照布局，并增加可复用、可嵌套的术语解释系统。

**Architecture:** 随机允许范围作为纯业务数据传入 `quiz.ts`，页面只维护一份立即生效的练习配置。音名隐藏使用明确的 `suppressedKeys`，不再依赖显示模式互相覆盖。术语词典和文本分词位于 `src/data/glossary.ts`，通用浮层组件使用 React Portal，不新增第三方依赖。

**Tech Stack:** React、TypeScript、React DOM Portal、Vite、Vitest、Testing Library、CSS。

## Global Constraints

- 保持纯前端和浏览器本地存储，不增加后端或生产依赖。
- UI 文案使用中文，业务逻辑放在 `src/lib` 或结构化数据文件中。
- 随机范围中的每个必需集合至少保留一个选项。
- 配置变化立即生成新题，不再维护隐藏的草稿配置和已生效配置。
- 术语解释支持鼠标、键盘、触屏和最多三层嵌套，并防止循环引用。
- 不恢复练习记录 Tab，也不在练习或设置右侧展示统计说明面板。

---

### Task 1: 随机学习范围业务模型

**Files:**
- Modify: `src/lib/guitarFretboard/types.ts`
- Modify: `src/lib/guitarFretboard/quiz.ts`
- Test: `src/lib/guitarFretboard/quiz.test.ts`

**Interfaces:**
- Produces: `RandomPracticeScope`
- Produces: `DEFAULT_RANDOM_PRACTICE_SCOPE`
- Consumes: `makeConfiguredPracticeQuestion(fretboard, { type: 'random', randomScope })`

- [x] **Step 1: 写随机范围失败测试**

```ts
it('only generates question types and targets from the allowed random scope', () => {
  const scope: RandomPracticeScope = {
    types: ['interval'],
    notes: ['C'],
    strings: [4],
    intervals: ['perfect-fifth'],
    keyRoots: ['G'],
    degrees: [3],
  }
  const question = makeConfiguredPracticeQuestion(fretboard, {
    type: 'random',
    range: { minFret: 0, maxFret: 12 },
    randomScope: scope,
    random: () => 0,
  })
  expect(question.type).toBe('interval')
  expect(question.prompt).toBe('找出 C 上方纯五度 G')
})
```

- [x] **Step 2: 运行测试并确认因 `RandomPracticeScope` 缺失而失败**

Run: `TMPDIR=/tmp npm test -- src/lib/guitarFretboard/quiz.test.ts`

Expected: FAIL，提示类型或 `randomScope` 不存在。

- [x] **Step 3: 实现允许集合抽样**

```ts
export interface RandomPracticeScope {
  types: QuizType[]
  notes: PitchClass[]
  strings: FretPosition['stringNumber'][]
  intervals: IntervalId[]
  keyRoots: PitchClass[]
  degrees: MajorScaleDegree[]
}

export const DEFAULT_RANDOM_PRACTICE_SCOPE: RandomPracticeScope = {
  types: ['find-note', 'identify-note'],
  notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
  strings: [1, 2, 3, 4, 5, 6],
  intervals: ['major-third', 'perfect-fourth', 'perfect-fifth'],
  keyRoots: ['C', 'G', 'D', 'F'],
  degrees: [1, 3, 5],
}
```

`makeConfiguredPracticeQuestion` 在随机模式下直接从上述集合抽取题型和参数。防连续重复只能在允许集合仍有其他候选时换到另一个候选，不能跳出用户范围。

- [x] **Step 4: 运行业务测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/lib/guitarFretboard/quiz.test.ts`

Expected: PASS。

- [x] **Step 5: 提交随机范围业务模型**

```bash
git add src/lib/guitarFretboard/types.ts src/lib/guitarFretboard/quiz.ts src/lib/guitarFretboard/quiz.test.ts
git commit -m "feat(guitar-fretboard): constrain random practice scope"
```

### Task 2: 随机范围界面与配置状态修复

**Files:**
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.test.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: `RandomPracticeScope` 和 `DEFAULT_RANDOM_PRACTICE_SCOPE`
- Produces: 单一 `practiceConfig` 状态
- Produces: `MultiButtonGroup<T>`，禁止取消最后一个选项

- [x] **Step 1: 写随机配置和模式切换失败测试**

```ts
it('switches from a custom type to the selected random scope immediately', () => {
  fireEvent.click(screen.getByRole('button', { name: '自选题目' }))
  fireEvent.click(screen.getByRole('button', { name: '音程' }))
  fireEvent.click(screen.getByRole('button', { name: '随机混合' }))
  expect(screen.getByRole('button', { name: '找音' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByText(/^找出所有 /)).toBeInTheDocument()
})
```

再覆盖题型、音名、弦、音程、调性和音级按钮只在相关题型被选中时显示，以及最后一项不能取消。

- [x] **Step 2: 运行页面测试并确认旧双状态导致失败**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: FAIL，随机范围按钮不存在或切换后仍显示旧自选题型。

- [x] **Step 3: 将草稿/生效双状态合并为单一配置**

```ts
interface PracticeConfig {
  mode: 'random' | 'custom'
  type: QuizType
  rangeId: PracticeRangeId
  randomScope: RandomPracticeScope
  targetNote: PitchClass
  stringNumber: FretPosition['stringNumber']
  interval: IntervalId
  keyRoot: PitchClass
  degree: MajorScaleDegree
}
```

所有配置按钮通过一个 `applyPracticeConfig(nextConfig)` 更新状态、清空当前答题状态、推进题目 nonce 并重新计时。删除“生成题目”按钮。

- [x] **Step 4: 实现随机多选按钮组和条件配置**

随机模式依次显示随机题型、练习范围，以及当前题型集合需要的音名、弦、音程、调性和音级范围。按钮使用 `aria-pressed`，最后一项点击时保留原集合并显示就地提示。

- [x] **Step 5: 运行页面测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

- [x] **Step 6: 提交随机配置界面**

```bash
git add src/pages/GuitarFretboardTrainerPage.tsx src/pages/GuitarFretboardTrainerPage.test.tsx src/styles/globals.css
git commit -m "fix(guitar-fretboard): apply practice scope immediately"
```

### Task 3: 认音即时判题、题目面板和侧栏精简

**Files:**
- Modify: `src/components/guitar-fretboard/QuizPanel.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.test.tsx`
- Modify: `src/styles/globals.css`
- Delete: `src/components/guitar-fretboard/PracticeSummary.tsx`

**Interfaces:**
- Produces: `QuizPanel.onSelectOption(option)` 直接完成认音题判定
- Produces: `.fretboard-question-panel` 全宽居中题目区域

- [x] **Step 1: 写即时判题、DOM 顺序和侧栏失败测试**

```ts
fireEvent.click(within(screen.getByRole('group', { name: '音名答案' })).getByRole('button', { name: 'D' }))
expect(screen.getByText('本题通过')).toBeInTheDocument()
expect(screen.queryByRole('button', { name: '提交答案' })).not.toBeInTheDocument()
expect(questionPanel.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
expect(screen.queryByText('薄弱区域')).not.toBeInTheDocument()
```

- [x] **Step 2: 运行页面测试并确认旧布局和提交动作导致失败**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: FAIL，认音题尚未即时判定或题目仍位于 Tab 内容中。

- [x] **Step 3: 提取统一提交函数并让认音选择直接调用**

```ts
const submitAnswer = (option?: PitchClass) => {
  const nextAnswer = judgeQuizAnswer(currentQuestion, selectedPositions, elapsedMs, option)
  // 写入 session、反馈和本地存储
}
```

`QuizPanel` 的认音按钮调用页面传入的即时判题回调；指板题仍保留“提交答案”。

- [x] **Step 4: 移动题目面板并删除无用侧栏内容**

DOM 顺序调整为指板、题目面板、Tab、Tab 内容。今日练习和设置使用单列；地图仅保留当前位置详情。删除 `PracticeSummary`、`SettingsSide` 和两个采样状态区。

- [x] **Step 5: 运行页面测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

- [x] **Step 6: 提交判题和布局改动**

```bash
git add src/components/guitar-fretboard/QuizPanel.tsx src/pages/GuitarFretboardTrainerPage.tsx src/pages/GuitarFretboardTrainerPage.test.tsx src/styles/globals.css
git rm src/components/guitar-fretboard/PracticeSummary.tsx
git commit -m "refactor(guitar-fretboard): focus practice around the question"
```

### Task 4: 音名显式隐藏优先级

**Files:**
- Modify: `src/components/guitar-fretboard/Fretboard.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.test.tsx`

**Interfaces:**
- Produces: `Fretboard.suppressedKeys?: Set<string>`
- Produces: 页面状态 `suppressedKeys`

- [x] **Step 1: 写基础显示模式下仍需淡出的失败测试**

```ts
fireEvent.click(screen.getByRole('button', { name: '全部音名' }))
fireEvent.click(screen.getByRole('button', { name: '1 秒后淡出' }))
fireEvent.click(target)
act(() => vi.advanceTimersByTime(1000))
expect(target).toHaveTextContent('')
```

再覆盖“不显示点击音名”与提交反馈不会强制恢复已点击位置的文字。

- [x] **Step 2: 运行页面测试并确认基础显示绕过时长设置**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: FAIL，定时结束后 `mode === 'all'` 仍显示音名。

- [x] **Step 3: 实现显式隐藏集合**

点击时先移除该 key 的显式隐藏；不显示模式立即加入 `suppressedKeys`，定时模式在结束时加入。`Fretboard` 最终显示表达式首先检查 `!suppressedKeys.has(key)`，再计算点击、基础和答案显示来源。

- [x] **Step 4: 运行页面测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

- [x] **Step 5: 提交音名显示修复**

```bash
git add src/components/guitar-fretboard/Fretboard.tsx src/pages/GuitarFretboardTrainerPage.tsx src/pages/GuitarFretboardTrainerPage.test.tsx
git commit -m "fix(guitar-fretboard): honor clicked note visibility"
```

### Task 5: 通用可嵌套术语解释

**Files:**
- Create: `src/data/glossary.ts`
- Create: `src/data/glossary.test.ts`
- Create: `src/components/ui/GlossaryTerm.tsx`
- Create: `src/components/ui/GlossaryTerm.test.tsx`
- Modify: `src/components/guitar-fretboard/QuizPanel.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Produces: `GlossaryEntry`
- Produces: `tokenizeGlossaryText(text): GlossaryToken[]`
- Produces: `<GlossaryTerm termId depth path />`
- Produces: `<GlossaryText text />`

- [x] **Step 1: 写最长词匹配和循环保护失败测试**

```ts
expect(tokenizeGlossaryText('找出 C 上方纯五度')).toEqual([
  { type: 'text', value: '找出 C 上方' },
  { type: 'term', value: '纯五度', termId: 'perfect-fifth' },
])
```

组件测试覆盖 hover、focus、Escape、相关词条嵌套，以及深度三之后退化为普通文本。

- [x] **Step 2: 运行术语测试并确认文件和导出缺失**

Run: `TMPDIR=/tmp npm test -- src/data/glossary.test.ts src/components/ui/GlossaryTerm.test.tsx`

Expected: FAIL，术语模块不存在。

- [x] **Step 3: 实现结构化词典和最长词优先分词**

```ts
export interface GlossaryEntry {
  id: string
  label: string
  aliases: string[]
  summary: string
  example: string
  relatedTerms: string[]
}

export type GlossaryToken =
  | { type: 'text'; value: string }
  | { type: 'term'; value: string; termId: string }
```

词典包含设计文档列出的 16 个首批词条。分词仅匹配明确注册的 label 和 aliases，按字符串长度降序，避免“音程”抢先匹配“大三度”等更具体概念。

- [x] **Step 4: 使用 React Portal 实现浮层和嵌套**

触发器使用虚线下划线；浮层基于 `getBoundingClientRect()` 使用 fixed 定位并限制在视口内。相关词条传递 `depth + 1` 和新的访问路径；深度达到 3 或路径重复时渲染普通文本。

- [x] **Step 5: 将题干和关键配置文案接入术语组件**

`QuizPanel` 题干使用 `GlossaryText`。页面中的指板、把位、调弦、根音、音程、音级和升降号等关键标签使用显式 `GlossaryTerm`，不进行全局 DOM 替换。

- [x] **Step 6: 运行术语与页面测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/data/glossary.test.ts src/components/ui/GlossaryTerm.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

- [x] **Step 7: 提交术语系统**

```bash
git add src/data/glossary.ts src/data/glossary.test.ts src/components/ui/GlossaryTerm.tsx src/components/ui/GlossaryTerm.test.tsx src/components/guitar-fretboard/QuizPanel.tsx src/pages/GuitarFretboardTrainerPage.tsx src/styles/globals.css
git commit -m "feat: add reusable nested glossary terms"
```

### Task 6: 留档与最终验证

**Files:**
- Modify: `docs/designs/2026-07-07-guitar-fretboard-trainer-design.md`
- Modify: `docs/implementation-plans/2026-07-11-guitar-practice-experience-refinement.md`

- [x] **Step 1: 将已完成内容移入实现备忘**

更新 22.1 当前行为和 22.2 后续优先级，保留限时练习、学习进度预设、更多词条和跨页面术语接入作为后续扩展。

- [x] **Step 2: 运行全量自动化验证**

```bash
TMPDIR=/tmp npm test
npm run lint
npm run build
git diff --check
```

Expected: 所有命令退出码为 0；构建若仍出现既有 ONNX 动静态导入提示，在最终结果中单独说明。

- [ ] **Step 3: 验证实际页面交互**

目标流程：打开 `http://127.0.0.1:5173/#/guitar-fretboard-trainer`，限制随机范围并连续出题，验证自选切回随机；完成认音即时判题；检查题目面板位置、侧栏删减、音名淡出，以及术语悬停、键盘和嵌套浮层。检查桌面和移动视口、控制台错误与截图。

当前阻塞：应用内浏览器在 WSL 工作区初始化时拒绝 `sandboxCwd` 的 `file:///home/...` 元数据，尚未进入页面自动化。开发服务和目标路由已通过 HTTP 200 可达性检查；视觉与真实点击验收仍需在浏览器控制层恢复后补做。

- [x] **Step 4: 提交文档和计划状态**

```bash
git add docs/designs/2026-07-07-guitar-fretboard-trainer-design.md docs/implementation-plans/2026-07-11-guitar-practice-experience-refinement.md
git commit -m "docs(guitar-fretboard): record practice experience refinements"
```
