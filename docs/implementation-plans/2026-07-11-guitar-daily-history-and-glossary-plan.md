# 吉他指板每日记录与术语交互实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复非答题场景的圆点淡出，扩展可延迟打开且不限层级的乐理词条，并实现按本地自然日统计的题型详情和最近 365 天练习热力图。

**Architecture:** 练习历史算法集中到纯函数模块 `practiceHistory.ts`，存储层负责旧 session 归一化与每日聚合迁移。页面只维护当前选中日期和弹窗状态，统计按钮、详情弹窗和热力图各自独立。术语组件继续使用 React Portal，不增加第三方依赖。

**Tech Stack:** React 19、TypeScript、React DOM Portal、Vite、Vitest、Testing Library、CSS、localStorage。

## Global Constraints

- 保持纯前端和浏览器本地存储，不增加后端或生产依赖。
- 日期边界使用浏览器本地时间，不使用 `toISOString().slice(0, 10)` 作为本地日期。
- 最近 365 天热力图保留至少 400 天聚合数据，逐题明细最多保留 5000 条。
- 今日练习答题不受点击音名淡出设置影响。
- 地图和设置试听的定时模式同时清除音名、圆点和选中状态。
- 术语悬停等待 500ms；键盘和点击立即打开；仅用访问路径防止循环，不限制嵌套深度。
- 不恢复独立记录 Tab。

---

### Task 1: 每日练习历史业务模型与存储迁移

**Files:**
- Create: `src/lib/guitarFretboard/practiceHistory.ts`
- Create: `src/lib/guitarFretboard/practiceHistory.test.ts`
- Modify: `src/lib/guitarFretboard/types.ts`
- Modify: `src/lib/guitarFretboard/storage.ts`
- Modify: `src/lib/guitarFretboard/storage.test.ts`

**Interfaces:**
- Produces: `getLocalDateKey(date: Date): string`
- Produces: `buildDailyRecords(sessions: PracticeSession[]): Record<string, DailyPracticeRecord>`
- Produces: `summarizeSessionsForDate(sessions, date, quizType?): PracticeSummary`
- Produces: `getRecentPracticeDays(records, today, days): PracticeDay[]`
- Produces: `getPracticeLevel(totalQuestions): 0 | 1 | 2 | 3 | 4`

- [ ] **Step 1: 写本地日期、题型汇总和热力等级失败测试**

```ts
expect(getLocalDateKey(new Date(2026, 6, 11, 23, 30))).toBe('2026-07-11')
expect(getPracticeLevel(0)).toBe(0)
expect(getPracticeLevel(4)).toBe(1)
expect(getPracticeLevel(20)).toBe(4)
expect(summarizeSessionsForDate(sessions, '2026-07-11', 'interval').totalQuestions).toBe(2)
```

- [ ] **Step 2: 运行测试确认模块缺失**

Run: `TMPDIR=/tmp npm test -- src/lib/guitarFretboard/practiceHistory.test.ts`

Expected: FAIL，无法解析 `practiceHistory`。

- [ ] **Step 3: 扩展 session 和每日聚合类型**

```ts
export interface DailyQuizTypeStats {
  totalQuestions: number
  correctQuestions: number
  totalResponseMs: number
}

export interface DailyPracticeRecord extends DailyQuizTypeStats {
  date: string
  byQuizType: Partial<Record<QuizType, DailyQuizTypeStats>>
}

export interface PracticeDay extends DailyPracticeRecord {
  level: 0 | 1 | 2 | 3 | 4
}
```

`PracticeSession` 增加可选 `localDate`、`quizType`、`isCorrect`，兼容旧数据。

- [ ] **Step 4: 实现纯函数业务模型**

使用 `date.getFullYear()`、`getMonth() + 1`、`getDate()` 生成本地日期。汇总时以 `session.localDate ?? getLocalDateKey(new Date(session.endedAt))` 归档；题型筛选只匹配明确的 `quizType`。

- [ ] **Step 5: 写存储迁移失败测试**

覆盖旧 state 没有 `dailyRecords`、session 没有 `localDate/quizType/isCorrect`、超过 400 天聚合和超过 5000 条明细的裁剪。

- [ ] **Step 6: 实现加载归一化和保存容量限制**

`StoredFretboardState` 增加 `dailyRecords`。旧 state 加载后调用 `buildDailyRecords(normalizedSessions)`；新 state 对合法聚合字段逐项归一化。session 统一按最新在前排列并使用 `slice(0, 5000)`，每日聚合按日期降序只保留最近 400 个日期键。

- [ ] **Step 7: 运行模型和存储测试**

Run: `TMPDIR=/tmp npm test -- src/lib/guitarFretboard/practiceHistory.test.ts src/lib/guitarFretboard/storage.test.ts`

Expected: PASS。

- [ ] **Step 8: 提交每日历史模型**

```bash
git add src/lib/guitarFretboard/practiceHistory.ts src/lib/guitarFretboard/practiceHistory.test.ts src/lib/guitarFretboard/types.ts src/lib/guitarFretboard/storage.ts src/lib/guitarFretboard/storage.test.ts
git commit -m "feat(guitar-fretboard): add daily practice history model"
```

### Task 2: 非答题场景选中圆点淡出

**Files:**
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.test.tsx`

**Interfaces:**
- Consumes: 当前 Tab 和 `settings.noteDisplayMs`
- Produces: 地图/设置的计时清除选择行为，练习模式无淡出计时

- [ ] **Step 1: 写场景差异失败测试**

```ts
fireEvent.click(screen.getByRole('tab', { name: '指板地图' }))
fireEvent.click(target)
act(() => vi.advanceTimersByTime(1000))
expect(target).not.toHaveAttribute('data-selected', 'true')

fireEvent.click(screen.getByRole('tab', { name: '今日练习' }))
fireEvent.click(practiceTarget)
act(() => vi.advanceTimersByTime(1000))
expect(practiceTarget).toHaveAttribute('data-selected', 'true')
expect(practiceTarget).toHaveTextContent('C')
```

- [ ] **Step 2: 运行页面测试确认地图圆点仍残留或练习音名被隐藏**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 将显示计时限定到地图和设置**

`revealPosition(position, context)` 在 `context === 'practice'` 时不建立计时器、不加入 `suppressedKeys`。地图/设置定时器到期时同时从 `selectedPositions`、`revealedKeys` 和 `fadingKeys` 删除对应 key；不显示模式不写入选择。

- [ ] **Step 4: 运行页面测试并提交**

Run: `TMPDIR=/tmp npm test -- src/pages/GuitarFretboardTrainerPage.test.tsx`

```bash
git add src/pages/GuitarFretboardTrainerPage.tsx src/pages/GuitarFretboardTrainerPage.test.tsx
git commit -m "fix(guitar-fretboard): scope note fading to explorer"
```

### Task 3: 音阶和弦词条与 500ms 圆环触发

**Files:**
- Modify: `src/data/glossary.ts`
- Modify: `src/data/glossary.test.ts`
- Modify: `src/components/ui/GlossaryTerm.tsx`
- Modify: `src/components/ui/GlossaryTerm.test.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Produces: 七个新增词条
- Produces: `.glossary-hover-progress` 500ms 圆环
- Produces: `<GlossaryText text interactive={false} />` 按钮内仅悬停模式
- Produces: 无固定深度、路径循环保护的相关词条

- [ ] **Step 1: 写词条内容和延迟交互失败测试**

使用 fake timers 验证 499ms 无 tooltip、进度环存在，500ms 后 tooltip 出现；鼠标离开取消；focus/click 立即打开；构造四层相关词条仍能继续打开，路径重复时退化为文本。

- [ ] **Step 2: 运行词条测试确认当前立即打开且三层截断**

Run: `TMPDIR=/tmp npm test -- src/data/glossary.test.ts src/components/ui/GlossaryTerm.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 增加七个结构化词条**

新增 `scale`、`chord`、`natural-minor-scale`、`minor-pentatonic-scale`、`major-triad`、`minor-triad`、`dominant-seventh-chord`，每项包含通俗解释、例子和相关词条。

- [ ] **Step 4: 重构术语打开状态机**

鼠标进入启动 500ms `openTimerRef` 并设置 `isHoverPending`；离开清除。focus、click、Enter、Space 调用 `openImmediately()`。删除 `MAX_NESTING_DEPTH` 和 `depth`，只在 `path.includes(termId)` 时退化文本。

- [ ] **Step 5: 增加圆环并接入地图选项文本**

圆环使用 `conic-gradient` 的 CSS 动画，固定 16px，不改变文本布局。地图模式按钮标签用 `GlossaryText interactive={false}` 渲染：术语仍可悬停解释，但不在按钮内部创建第二个可聚焦控件；按钮原有可访问名称和点击切换行为保持不变。

- [ ] **Step 6: 运行词条和页面测试并提交**

Run: `TMPDIR=/tmp npm test -- src/data/glossary.test.ts src/components/ui/GlossaryTerm.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx`

```bash
git add src/data/glossary.ts src/data/glossary.test.ts src/components/ui/GlossaryTerm.tsx src/components/ui/GlossaryTerm.test.tsx src/pages/GuitarFretboardTrainerPage.tsx src/styles/globals.css
git commit -m "feat(guitar-fretboard): expand delayed glossary"
```

### Task 4: 今日统计按钮与题型详情弹窗

**Files:**
- Create: `src/components/guitar-fretboard/PracticeStats.tsx`
- Create: `src/components/guitar-fretboard/PracticeStats.test.tsx`
- Create: `src/components/guitar-fretboard/PracticeDetailDialog.tsx`
- Create: `src/components/guitar-fretboard/PracticeDetailDialog.test.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: `PracticeSession[]`、本地日期、`summarizeSessionsForDate`
- Produces: `<PracticeStats summary onOpen />`
- Produces: `<PracticeDetailDialog date sessions onClose />`

- [ ] **Step 1: 写统计按钮和弹窗失败测试**

覆盖三个指标均为按钮、点击打开 dialog、Escape/遮罩关闭、题型筛选、空状态和逐题明细。

- [ ] **Step 2: 运行组件测试确认文件缺失**

Run: `TMPDIR=/tmp npm test -- src/components/guitar-fretboard/PracticeStats.test.tsx src/components/guitar-fretboard/PracticeDetailDialog.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 实现统计按钮和统一弹窗**

弹窗筛选值为 `'all' | QuizType`，使用现有按钮组视觉语言；题型文案统一映射为找音、认音、八度、音程、调内音。逐题记录按 `endedAt` 倒序。

- [ ] **Step 4: 页面提交时写入新字段和每日聚合**

`sessionFromResult` 写入 `localDate`、`quizType`、`isCorrect`；页面状态新增 `dailyRecords`，保存设置和提交答案时都传递该字段。`latestSummary` 替换为当天汇总。

- [ ] **Step 5: 运行组件、页面和存储测试并提交**

Run: `TMPDIR=/tmp npm test -- src/components/guitar-fretboard/PracticeStats.test.tsx src/components/guitar-fretboard/PracticeDetailDialog.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx src/lib/guitarFretboard/storage.test.ts`

```bash
git add src/components/guitar-fretboard/PracticeStats.tsx src/components/guitar-fretboard/PracticeStats.test.tsx src/components/guitar-fretboard/PracticeDetailDialog.tsx src/components/guitar-fretboard/PracticeDetailDialog.test.tsx src/pages/GuitarFretboardTrainerPage.tsx src/styles/globals.css
git commit -m "feat(guitar-fretboard): add daily practice detail dialog"
```

### Task 5: 最近 365 天练习热力图

**Files:**
- Create: `src/components/guitar-fretboard/PracticeHeatmap.tsx`
- Create: `src/components/guitar-fretboard/PracticeHeatmap.test.tsx`
- Modify: `src/pages/GuitarFretboardTrainerPage.tsx`
- Modify: `src/styles/globals.css`

**Interfaces:**
- Consumes: `PracticeDay[]`
- Produces: `<PracticeHeatmap days onSelectDate />`

- [ ] **Step 1: 写 365 天、等级、悬停和点击失败测试**

验证 365 个日期按钮、首尾日期、`data-level`、悬停提示中的题量/正确率/平均时间，以及点击回传日期。

- [ ] **Step 2: 运行组件测试确认文件缺失**

Run: `TMPDIR=/tmp npm test -- src/components/guitar-fretboard/PracticeHeatmap.test.tsx`

Expected: FAIL。

- [ ] **Step 3: 实现周网格和日期提示**

将日期按周日到周六放入 53 列网格，月标签定位到当月第一周。日期按钮固定 11px，容器在移动端横向滚动。提示层显示本地格式日期和综合统计。

- [ ] **Step 4: 接入今日练习并复用详情弹窗**

页面通过 `getRecentPracticeDays(dailyRecords, new Date(), 365)` 生成数据；点击日期设置 `detailDate` 并打开 `PracticeDetailDialog`。

- [ ] **Step 5: 运行热力图和页面测试并提交**

Run: `TMPDIR=/tmp npm test -- src/components/guitar-fretboard/PracticeHeatmap.test.tsx src/pages/GuitarFretboardTrainerPage.test.tsx`

```bash
git add src/components/guitar-fretboard/PracticeHeatmap.tsx src/components/guitar-fretboard/PracticeHeatmap.test.tsx src/pages/GuitarFretboardTrainerPage.tsx src/styles/globals.css
git commit -m "feat(guitar-fretboard): add yearly practice heatmap"
```

### Task 6: 留档与最终验证

**Files:**
- Modify: `docs/designs/2026-07-07-guitar-fretboard-trainer-design.md`
- Modify: `docs/implementation-plans/2026-07-11-guitar-daily-history-and-glossary-plan.md`

- [ ] **Step 1: 更新长期设计备忘**

记录本地日期、每日聚合、5000 条明细、400 天记录、热力等级、术语延迟和练习/浏览淡出差异；保留数据导出、跨设备同步和更长历史作为后续扩展。

- [ ] **Step 2: 运行全量验证**

```bash
TMPDIR=/tmp npm test
npm run lint
npm run build
git diff --check
```

Expected: 全部退出码为 0；ONNX 动静态导入提示若仍存在，作为既有非阻塞警告记录。

- [ ] **Step 3: 实际页面验收**

在 `http://127.0.0.1:5173/#/guitar-fretboard-trainer` 验证地图圆点淡出、练习答案不淡出、500ms 圆环、无限词条嵌套、今日统计弹窗和 365 天热力图；检查桌面和移动视口及控制台。

- [ ] **Step 4: 提交文档状态**

```bash
git add docs/designs/2026-07-07-guitar-fretboard-trainer-design.md docs/implementation-plans/2026-07-11-guitar-daily-history-and-glossary-plan.md
git commit -m "docs(guitar-fretboard): record daily practice history"
```
