# 吉他指板单题计时与准确率实施计划

> **执行状态：** 已完成（2026-07-14）。最终实现按用户后续确认取消作答中动态计时文本，改为后台记录时间并仅在答题结束后展示冻结用时。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 删除每日练习历史链路，将今日练习改成显式生成题目并只展示当前题用时和准确率。

**Architecture:** 页面以 `QuizQuestion | null` 表达未生成、作答中和已完成状态；`quiz.ts` 提供可独立测试的单题准确率函数；页面使用生成时间戳在后台计时，答题后以 `responseMs` 冻结并展示结果，不在作答中高频刷新文本。存储层仅保留设置，旧历史字段在读取时忽略。

**Tech Stack:** React 19、TypeScript 5.7、Vitest 4、Testing Library、Vite 6、浏览器 `localStorage`

## Global Constraints

- 不引入新依赖，不增加后端或云端存储。
- 页面初始没有题目；只有生成题目后才开始计时并允许作答。
- 当前题准确率不跨题、不跨 Tab、不跨页面刷新累计。
- 多选准确率使用答案集合与选择集合的交并比。
- 自动消失设置仍只影响指板地图和设置，不影响练习答案。
- 保留工作树中与本任务无关的已有改动，不回退或覆盖。

---

### Task 1: 单题准确率规则

**Files:**
- Modify: `src/lib/guitarFretboard/quiz.ts`
- Modify: `src/lib/guitarFretboard/quiz.test.ts`
- Modify: `src/lib/guitarFretboard/types.ts`

**Interfaces:**
- Consumes: `QuizQuestion`、`QuizAnswer`
- Produces: `calculateQuestionAccuracy(question: QuizQuestion, answer: QuizAnswer): number`

- [x] **Step 1: 写失败测试**

在 `quiz.test.ts` 添加单选正确/错误、多选漏选、多选错选和空答案测试。关键断言：标准答案 5 个且选对 4 个时为 `0.8`；选对 4 个又错选 1 个时为 `4 / 6`。

- [x] **Step 2: 验证测试正确失败**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard/quiz.test.ts`  
Expected: FAIL，提示 `calculateQuestionAccuracy` 尚未导出。

- [x] **Step 3: 实现最小纯函数并删除历史汇总函数**

在 `quiz.ts` 中按题型计算：

```ts
export function calculateQuestionAccuracy(question: QuizQuestion, answer: QuizAnswer): number {
  if (question.type === 'identify-note') return answer.isCorrect ? 1 : 0
  const correctSelected = Math.max(0, question.expectedAnswers.length - answer.missedPositions.length)
  const unionSize = question.expectedAnswers.length + answer.wrongPositions.length
  return unionSize === 0 ? 0 : Math.min(1, correctSelected / unionSize)
}
```

删除仅服务历史记录的 `summarizePractice`、`summarizePracticeSessions` 及对应测试；从 `types.ts` 删除 `PracticeSummary`、`PracticeSession`、每日记录和技能历史类型。

- [x] **Step 4: 验证目标测试通过**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard/quiz.test.ts`  
Expected: PASS。

### Task 2: 精简本地存储

**Files:**
- Modify: `src/lib/guitarFretboard/storage.ts`
- Modify: `src/lib/guitarFretboard/storage.test.ts`
- Modify: `src/lib/guitarFretboard/types.ts`
- Delete: `src/lib/guitarFretboard/practiceHistory.ts`
- Delete: `src/lib/guitarFretboard/practiceHistory.test.ts`

**Interfaces:**
- Consumes: `FretboardSettings`
- Produces: `StoredFretboardState = { settings: FretboardSettings }`

- [x] **Step 1: 改写存储测试并验证失败**

测试要求空存储只返回设置；保存结果的 JSON 只有 `settings`；包含 `sessions`、`dailyRecords` 和 `skillStates` 的旧数据只迁移设置。

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard/storage.test.ts`  
Expected: FAIL，当前结果仍包含并写入历史字段。

- [x] **Step 2: 删除历史归一化和裁剪逻辑**

将 `loadFretboardState` 限定为读取 `parsed.settings`，将 `saveFretboardState` 直接序列化 `{ settings: state.settings }`。保留调弦、品数、升降号、显示模式和音名显示时长的原有兼容归一化。

- [x] **Step 3: 删除每日聚合模块并验证存储测试**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard/storage.test.ts`  
Expected: PASS。

### Task 3: 无题状态、单题计时和准确率界面

**Files:**
- Modify: `src/components/guitar-fretboard/QuizPanel.tsx`
- Modify: `src/components/guitar-fretboard/QuizPanel.test.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.test.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: `calculateQuestionAccuracy`、`QuizQuestion | null`、`QuizAnswer | null`、`questionStartedAt: number | null`
- Produces: 初始“生成题目”空状态、作答中静默计时、完成后冻结用时与准确率

- [x] **Step 1: 为初始无题和生成行为写页面失败测试**

断言初始没有题干和提交按钮，显示“尚未生成题目”“生成题目”，指板不能选择；点击生成后出现题干、`用时 --` 和 `准确率 --`。

- [x] **Step 2: 为计时冻结和部分准确率写失败测试**

使用受控时间验证作答中始终显示 `用时 --`，重置选择后起始时间不改变，提交后一次性显示冻结用时；构造固定找音题选择验证部分准确率。认音题继续验证点击选项即提交。

- [x] **Step 3: 验证页面与组件测试正确失败**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/components/guitar-fretboard/QuizPanel.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx`  
Expected: FAIL，当前页面会自动生成题目且没有单题指标。

- [x] **Step 4: 将题目状态改为显式生成**

页面使用 `useState<QuizQuestion | null>(null)`；`generateQuestion` 读取当前配置和指板创建题目、清空选择、记录 `Date.now()`。配置变化回到无题状态；下一题和跳过调用同一生成入口。未生成时练习指板使用 `selectionDisabled`，不传题目范围和目标音。

- [x] **Step 5: 在 QuizPanel 内实现局部计时展示**

`QuizPanel` 接受可空题目。无题时渲染空状态；有题且未作答时显示 `用时 --`，答案存在后使用 `answer.responseMs` 展示冻结用时。页面只在判题时根据 `questionStartedAt` 计算反应时间，不创建驱动文本刷新的定时器。准确率使用纯函数计算并显示整数百分比。

- [x] **Step 6: 修正重置、提交和设置持久化**

重置只清空选择；提交只设置当前 `answer`，不创建 session、不写历史；设置更新调用 `saveFretboardState({ settings })`。

- [x] **Step 7: 验证目标测试通过**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/components/guitar-fretboard/QuizPanel.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx`  
Expected: PASS。

### Task 4: 删除每日记录界面和样式

**Files:**
- Delete: `src/components/guitar-fretboard/PracticeStats.tsx`
- Delete: `src/components/guitar-fretboard/PracticeStats.test.tsx`
- Delete: `src/components/guitar-fretboard/PracticeHeatmap.tsx`
- Delete: `src/components/guitar-fretboard/PracticeHeatmap.test.tsx`
- Delete: `src/components/guitar-fretboard/PracticeDetailDialog.tsx`
- Delete: `src/components/guitar-fretboard/PracticeDetailDialog.test.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: 无
- Produces: 只包含出题配置的今日练习面板

- [x] **Step 1: 删除组件引用和文件**

从页面删除 `PracticeStats`、`PracticeHeatmap`、`PracticeDetailDialog` 的导入、props、状态和渲染；从 CSS 删除 `.practice-stats`、`.practice-heatmap-*`、`.practice-dialog-*` 专用规则。

- [x] **Step 2: 添加不存在性回归断言**

页面测试断言不存在“已完成”、`每日练习热力图`、题型详情弹窗入口和每日记录相关文本。

- [x] **Step 3: 运行指板模块测试**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test -- src/lib/guitarFretboard src/components/guitar-fretboard src/pages/GuitarFretboardTrainerPage.test.tsx`  
Expected: PASS。

### Task 5: 文档一致性与完整验证

**Files:**
- Modify: `docs/designs/2026-07-07-guitar-fretboard-trainer-design.md`
- Modify: `docs/designs/2026-07-07-guitar-fretboard-trainer-roadmap.md`
- Modify: `docs/designs/2026-07-11-guitar-fretboard-daily-history-and-glossary-design.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: 已完成实现
- Produces: 不把已删除每日记录继续描述为当前能力的文档和发布说明

- [x] **Step 1: 标记旧每日记录设计已被替代**

在旧设计开头注明 2026-07-14 起每日记录部分由单题统计设计替代；主设计和路线图把每日记录、热力图移到“已撤回/不再计划”，保留历史决策背景但不再作为当前验收项。

- [x] **Step 2: 更新 CHANGELOG**

在 `Unreleased` 记录：今日练习改为手动生成单题、增加单题计时与部分准确率、移除每日记录与历史持久化。

- [x] **Step 3: 运行完整质量门槛**

Run: `TMPDIR=/tmp TMP=/tmp TEMP=/tmp npm test`  
Expected: 全量 PASS。

Run: `npm run lint`  
Expected: exit 0。

Run: `npm run build`  
Expected: exit 0；允许仓库既有的静态/动态导入提示，但不得新增错误。

Run: `git diff --check`  
Expected: exit 0。

- [x] **Step 4: 浏览器手工验证**

打开 `http://127.0.0.1:5173/#/guitar-fretboard-trainer`，验证初始无题、生成开始计时、重置不重计时、提交冻结、下一题重置、每日记录完全消失以及窄屏不溢出。
