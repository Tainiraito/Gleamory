# 吉他指板练习题型与主动选题实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在今日练习中接入找音、认音、八度、音程、调内音五类题型，支持随机混合和自选参数，并整理指板地图配置布局与根音状态。

**Architecture:** 题目生成、音乐关系计算和答案判定集中在 `src/lib/guitarFretboard/quiz.ts`，页面只保存草稿配置、已生效配置和题目生命周期。`QuizPanel` 根据题型切换指板答题或音名按钮答题，`Fretboard` 只新增通用的题面参考位置与禁用交互能力。

**Tech Stack:** React、TypeScript、Vite、Vitest、Testing Library、CSS。

## Global Constraints

- 保持纯前端和浏览器本地存储，不增加依赖或后端。
- UI 文案使用中文，业务逻辑放在 `src/lib/guitarFretboard`。
- 不恢复独立“测验”或“记录”Tab。
- 选项较少时使用按钮组，地图配置一组一行。
- 跳过不写入练习统计，只有提交答案才生成 session。
- 保留当前工作树中与本任务重叠的已有改动，不回滚其他文件。

---

### Task 1: 扩展题目模型与题目工厂

**Files:**
- Modify: `src/lib/guitarFretboard/types.ts`
- Modify: `src/lib/guitarFretboard/quiz.ts`
- Test: `src/lib/guitarFretboard/quiz.test.ts`

**Interfaces:**
- Produces: `QuizType = 'find-note' | 'identify-note' | 'octave' | 'interval' | 'scale-degree'`
- Produces: `IntervalId = 'major-third' | 'perfect-fourth' | 'perfect-fifth' | 'minor-seventh'`
- Produces: `MajorScaleDegree = 1 | 3 | 5 | 7`
- Produces: `makeOctaveQuestion(fretboard, source, scope): QuizQuestion`
- Produces: `makeIntervalQuestion(fretboard, root, interval, scope): QuizQuestion`
- Produces: `makeScaleDegreeQuestion(fretboard, keyRoot, degree, scope): QuizQuestion`
- Produces: `makeConfiguredPracticeQuestion(fretboard, options): QuizQuestion`

- [x] **Step 1: 写五类题目生成和判定的失败测试**

```ts
it('generates octave answers excluding the source and requiring 12-semitone differences', () => {
  const source = fretboard.positions.find((position) => position.stringNumber === 5 && position.fretNumber === 3)!
  const question = makeOctaveQuestion(fretboard, source, { minFret: 0, maxFret: 12 })
  expect(question.type).toBe('octave')
  expect(question.referencePositions).toEqual([source])
  expect(question.expectedAnswers).not.toContain(source)
  expect(question.expectedAnswers.every((position) => Math.abs(position.midiNumber - source.midiNumber) % 12 === 0)).toBe(true)
})

it('computes interval and major-scale-degree targets', () => {
  expect(makeIntervalQuestion(fretboard, 'C', 'perfect-fifth', scope).targetNote).toBe('G')
  expect(makeScaleDegreeQuestion(fretboard, 'G', 3, scope).targetNote).toBe('B')
})
```

- [x] **Step 2: 运行测试并确认因新类型和工厂缺失而失败**

Run: `TMPDIR=/tmp npm test -- src/lib/guitarFretboard/quiz.test.ts`

Expected: FAIL，提示新导出不存在或题型联合不包含新增值。

- [x] **Step 3: 实现音乐关系表、题目工厂和通用判定**

```ts
const INTERVALS: Record<IntervalId, { label: string; semitones: number }> = {
  'major-third': { label: '大三度', semitones: 4 },
  'perfect-fourth': { label: '纯四度', semitones: 5 },
  'perfect-fifth': { label: '纯五度', semitones: 7 },
  'minor-seventh': { label: '小七度', semitones: 10 },
}
const MAJOR_SCALE_OFFSETS: Record<MajorScaleDegree, number> = { 1: 0, 3: 4, 5: 7, 7: 11 }
```

为 `QuizQuestion` 增加 `targetNote?: PitchClass` 和 `referencePositions?: FretPosition[]`。除 `identify-note` 使用 `selectedOption` 判定外，其余题型统一比较期望位置与用户选中位置集合。

- [x] **Step 4: 运行题目单元测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/lib/guitarFretboard/quiz.test.ts`

Expected: PASS。

- [x] **Step 5: 提交业务模型增量**

```bash
git add src/lib/guitarFretboard/types.ts src/lib/guitarFretboard/quiz.ts src/lib/guitarFretboard/quiz.test.ts
git commit -m "feat(guitar-fretboard): expand practice question types"
```

### Task 2: 接入随机混合与自选题目

**Files:**
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/components/guitar-fretboard/QuizPanel.tsx`
- Test: `src/pages/GuitarFretboardTrainerPage.test.tsx`

**Interfaces:**
- Consumes: Task 1 的 `makeConfiguredPracticeQuestion` 与五类 `QuizType`
- Produces: 草稿配置 `draftPracticeConfig` 和已生效配置 `activePracticeConfig`
- Produces: `QuizPanel` 的 `selectedOption`、`onSelectOption` 参数

- [x] **Step 1: 写主动选题和认音作答的失败页面测试**

```ts
it('lets users choose a question type and target before generating it', () => {
  fireEvent.click(screen.getByRole('button', { name: '自选题目' }))
  fireEvent.click(screen.getByRole('button', { name: '音程' }))
  fireEvent.click(screen.getByRole('button', { name: '根音 C' }))
  fireEvent.click(screen.getByRole('button', { name: '纯五度' }))
  fireEvent.click(screen.getByRole('button', { name: '生成题目' }))
  expect(screen.getByText(/C 上方纯五度 G/)).toBeInTheDocument()
})

it('answers identify-note questions with note buttons', () => {
  // 进入自选题目，选择认音并生成，选择音名后提交。
  expect(screen.getByRole('group', { name: '音名答案' })).toBeInTheDocument()
})
```

- [x] **Step 2: 运行页面测试并确认新控制不存在**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: FAIL，找不到“自选题目”“音程”或“生成题目”。

- [x] **Step 3: 实现草稿配置、已生效配置和生成题目动作**

```ts
interface PracticeConfig {
  mode: 'random' | 'custom'
  type: QuizType
  rangeId: PracticeRangeId
  targetNote: PitchClass
  stringNumber: 1 | 2 | 3 | 4 | 5 | 6
  interval: IntervalId
  keyRoot: PitchClass
  degree: MajorScaleDegree
}
```

参数按钮只修改 `draftPracticeConfig`。点击“生成题目”复制到 `activePracticeConfig` 并推进题目 nonce；跳过仅推进 nonce；两者都调用统一的题目状态清理函数。

- [x] **Step 4: 根据题型渲染参数和音名答案按钮**

找音显示目标音；认音显示弦；八度显示起点音；音程显示根音和音程；调内音显示调性和音级。`QuizPanel` 仅在 `identify-note` 下显示 12 音答案按钮。

- [x] **Step 5: 运行页面测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

- [x] **Step 6: 提交主动选题增量**

```bash
git add src/pages/GuitarFretboardTrainerPage.tsx src/components/guitar-fretboard/QuizPanel.tsx src/pages/GuitarFretboardTrainerPage.test.tsx
git commit -m "feat(guitar-fretboard): add configurable practice questions"
```

### Task 3: 增加题面参考位置和题型一致的指板交互

**Files:**
- Modify: `src/components/guitar-fretboard/Fretboard.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/styles/globals.css`
- Test: `src/pages/GuitarFretboardTrainerPage.test.tsx`

**Interfaces:**
- Consumes: `QuizQuestion.referencePositions`
- Produces: `Fretboard` 属性 `referenceKeys?: Set<string>`、`selectionDisabled?: boolean`

- [x] **Step 1: 写题面位置标记和认音禁用指板的失败测试**

```ts
expect(referencePosition).toHaveAttribute('data-reference', 'true')
expect(referencePosition).toBeDisabled()
expect(screen.getByRole('group', { name: '音名答案' })).toBeInTheDocument()
```

- [x] **Step 2: 运行测试并确认缺少参考状态**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: FAIL，缺少 `data-reference` 或位置仍可点击。

- [x] **Step 3: 实现通用题面参考标记和禁用逻辑**

`Fretboard` 为参考位置输出 `data-reference="true"`，并使用独立样式描边。认音题设置 `selectionDisabled`，其他题型仍按题目范围启用点击。

- [x] **Step 4: 运行页面测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

- [x] **Step 5: 提交指板交互增量**

```bash
git add src/components/guitar-fretboard/Fretboard.tsx src/pages/GuitarFretboardTrainerPage.tsx src/styles/globals.css src/pages/GuitarFretboardTrainerPage.test.tsx
git commit -m "feat(guitar-fretboard): mark practice reference positions"
```

### Task 4: 整理指板地图配置和根音生效状态

**Files:**
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/styles/globals.css`
- Test: `src/pages/GuitarFretboardTrainerPage.test.tsx`

**Interfaces:**
- Produces: `ButtonGroup.disabled?: boolean` 和 `ButtonGroup.hint?: string`

- [x] **Step 1: 写地图单列配置和根音禁用的失败测试**

```ts
expect(screen.getByRole('group', { name: '音阶/和弦根音' })).toHaveAttribute('data-disabled', 'true')
expect(screen.getByText('选择音阶或和弦后生效')).toBeInTheDocument()
fireEvent.click(screen.getByRole('button', { name: '大调音阶' }))
expect(screen.getByRole('group', { name: '音阶/和弦根音' })).not.toHaveAttribute('data-disabled', 'true')
```

- [x] **Step 2: 运行测试并确认旧文案和状态导致失败**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: FAIL，找不到“音阶/和弦根音”。

- [x] **Step 3: 实现禁用状态、提示和单列布局**

将 `.fretboard-map-selectors` 固定为单列。`pattern === 'all'` 时禁用根音按钮并传入提示；根音高亮保持为空。切换到音阶或和弦后恢复按钮。

- [x] **Step 4: 运行页面测试并确认通过**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: PASS。

- [x] **Step 5: 提交地图控制增量**

```bash
git add src/pages/GuitarFretboardTrainerPage.tsx src/styles/globals.css src/pages/GuitarFretboardTrainerPage.test.tsx
git commit -m "fix(guitar-fretboard): clarify map root controls"
```

### Task 5: 留档、回归测试与浏览器验证

**Files:**
- Modify: `docs/designs/2026-07-07-guitar-fretboard-trainer-design.md`
- Modify: `docs/implementation-plans/2026-07-10-guitar-practice-question-expansion.md`

**Interfaces:**
- Consumes: Tasks 1-4 的最终行为

- [x] **Step 1: 更新实现备忘和后续扩展优先级**

把五类题型、主动选题和地图根音状态移入“当前已落地行为”，从待办中移除已经完成的认音、八度和音程入口；保留限时模式、更多音程、自然小调和细分统计。

- [x] **Step 2: 运行目标测试和全量检查**

```bash
TMPDIR=/tmp npm test -- src/lib/guitarFretboard/quiz.test.ts src/pages/GuitarFretboardTrainerPage.test.tsx
TMPDIR=/tmp npm test
npm run lint
npm run build
git diff --check
```

Expected: 所有测试、lint、build 和 diff 检查通过。

- [ ] **Step 3: 使用应用内浏览器验证目标流程**

目标流程：打开 `http://127.0.0.1:5173/#/guitar-fretboard-trainer`，分别生成五类自选题并验证题面和答题控件，再进入指板地图验证单列配置和根音禁用/启用状态；检查桌面和移动视口、控制台错误与首屏截图。

- [ ] **Step 4: 提交文档和计划完成状态**

```bash
git add docs/designs/2026-07-07-guitar-fretboard-trainer-design.md docs/implementation-plans/2026-07-10-guitar-practice-question-expansion.md
git commit -m "docs(guitar-fretboard): record practice expansion"
```
