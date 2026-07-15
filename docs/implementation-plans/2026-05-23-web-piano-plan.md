# Web Piano 网页钢琴 — 实现计划

> **执行状态：** 已完成并归档。本文保留历史实现步骤，不代表当前 Git、测试或发布流程；冲突时以根目录 `AGENTS.md` 为准。

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**目标:** 在 Gleamory 中新增一个交互式网页钢琴页面，支持鼠标点击和键盘弹奏，4个八度（C2-B5），Web Audio API 合成音色。

**架构:** 纯前端 SPA 页面，作为 Gleamory 的 `/piano` 路由，沿用现有暖色调纸质风主题。音频通过 Web Audio API 合成三角波 + ADSR 包络模拟钢琴音色。

**技术栈:** React 19 + TypeScript + Tailwind CSS v4 + Framer Motion + Web Audio API

**参考:** GachaSimulator 的页面结构（独立路由 + SiteHeader + 返回链接布局）

---

## 前置检查：项目状态

在开始前确认：

```bash
cat package.json | grep -E '"react|"vite|"framer|"tailwind|"typescript"'
npm run build   # 确认当前项目可构建
```

> 如果 build 失败，先排查修复再开始。

---

## 任务列表

---

### Task 1: 创建音符频率表和键盘布局数据

**目标:** 定义 C2 到 B5 共 48 键的完整数据，包括频率、音名、白键/黑键分类。

**文件:**
- 创建: `src/data/pianoNotes.ts`

**说明:**
- 使用 12-TET 平均律公式计算频率：`freq = 440 * 2^((n-69)/12)`，其中 A4 (n=69) = 440Hz
- 定义所有音符的数据结构，每个条目包含：
  - `note`: 音名字符串，如 `"C4"`, `"D#4"`
  - `midiNumber`: MIDI 编号（C2=36, B5=83）
  - `frequency`: 计算出的频率
  - `isBlack`: 是否为黑键
  - `octave`: 所属八度

**数据结构:**

```ts
export interface NoteData {
  note: string       // 显示名，如 "C4", "A#3"
  midiNumber: number // MIDI 编号
  frequency: number  // 频率 Hz
  isBlack: boolean   // 是否是黑键
  octave: number     // 所属八度
}

export const NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
export const NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
```

**黑键索引**（每八度内）：[1, 3, 6, 8, 10]（基于 NOTE_NAMES 索引）

**关键代码：**

```ts
function frequencyFromMidi(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12)
}

// C2 = MIDI 36, B5 = MIDI 83 → 48 个音符
const MIDI_START = 36  // C2
const MIDI_END = 83    // B5

export const ALL_NOTES: NoteData[] = []
for (let midi = MIDI_START; midi <= MIDI_END; midi++) {
  const octave = Math.floor(midi / 12) - 1
  const semitone = midi % 12
  const noteName = NOTE_NAMES_SHARP[semitone]
  ALL_NOTES.push({
    note: `${noteName}${octave}`,
    midiNumber: midi,
    frequency: frequencyFromMidi(midi),
    isBlack: [1, 3, 6, 8, 10].includes(semitone),
    octave,
  })
}
```

**验证：**
- C4 的频率应为 ~261.63Hz
- A4（MIDI 69）的频率应为 440Hz
- 白键 28 个，黑键 20 个，共 48 个

---

### Task 2: 创建键盘按键映射数据

**目标:** 定义物理键盘按键到音符的映射，包括八度切换。

**文件:**
- 修改: `src/data/pianoNotes.ts`（追加键盘映射数据）

**映射规则（以中央八度 C4-B4 为基准）：**

| 键盘 | 音符 | 键盘 | 音符 |
|------|------|------|------|
| `A` | C4 | `W` | C#4 |
| `S` | D4 | `E` | D#4 |
| `D` | E4 | — | — |
| `F` | F4 | `T` | F#4 |
| `G` | G4 | `Y` | G#4 |
| `H` | A4 | `U` | A#4 |
| `J` | B4 | — | — |
| `K` | C5 | `O` | C#5 |
| `L` | D5 | `P` | D#5 |
| `;` | E5 | — | — |

**八度切换：** `Z` 降八度，`X` 升八度

```ts
export interface KeyMap {
  key: string       // 键盘按键（小写）
  semitoneOffset: number // 相对 C4 的半音偏移
  isBlack: boolean
}

export const KEYBOARD_MAP: KeyMap[] = [
  { key: 'a', semitoneOffset: 0, isBlack: false },
  { key: 'w', semitoneOffset: 1, isBlack: true },
  { key: 's', semitoneOffset: 2, isBlack: false },
  // ... 完整映射
]
```

---

### Task 3: 实现 Web Audio API 音频合成 Hook

**目标:** 创建 `usePianoAudio` hook，封装 Web Audio API 的钢琴音色合成逻辑。

**文件:**
- 创建: `src/hooks/usePianoAudio.ts`

**音频合成策略：**

```
主振荡器 (triangle, 基频) ─┐
                           ├→ GainNode (ADSR 包络) → BiquadFilter → destination
副振荡器 (triangle, detune+5¢) ─┘
```

**ADSR 参数：**
- Attack: 5ms（快起音，模拟琴锤击弦）
- Decay: 200ms
- Sustain: 0.35
- Release: 600ms

**Hook 接口：**

```ts
interface UsePianoAudioReturn {
  playNote: (frequency: number) => void
  stopNote: (frequency: number) => void
  setVolume: (volume: number) => void
  isPlaying: (frequency: number) => boolean
}
```

**关键实现：**

```ts
import { useCallback, useRef } from 'react'

const usePianoAudio = () => {
  const ctxRef = useRef<AudioContext | null>(null)
  const activeNotes = useRef<Map<number, { osc: OscillatorNode; gain: GainNode }>>(new Map())

  const getContext = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  const playNote = useCallback((frequency: number) => {
    if (activeNotes.current.has(frequency)) return
    const ctx = getContext()

    // 主振荡器
    const osc1 = ctx.createOscillator()
    osc1.type = 'triangle'
    osc1.frequency.value = frequency

    // 副振荡器（增加厚度）
    const osc2 = ctx.createOscillator()
    osc2.type = 'triangle'
    osc2.frequency.value = frequency
    osc2.detune.value = 5

    // 增益包络
    const gain = ctx.createGain()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.5, now + 0.005)    // Attack 5ms
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.2) // Decay 200ms
    gain.gain.setValueAtTime(0.15, now + 0.2)

    // 低通滤波器（模拟钢琴的自然高频衰减）
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 2000 + (frequency * 0.5)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(filter)
    filter.connect(ctx.destination)

    osc1.start(now)
    osc2.start(now)

    activeNotes.current.set(frequency, { osc: osc1, gain })
  }, [getContext])

  const stopNote = useCallback((frequency: number) => {
    const note = activeNotes.current.get(frequency)
    if (!note) return
    const now = note.gain.context.currentTime
    note.gain.gain.cancelScheduledValues(now)
    note.gain.gain.setValueAtTime(note.gain.gain.value, now)
    note.gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6) // Release
    note.osc.stop(now + 0.6)
    activeNotes.current.delete(frequency)
  }, [])

  return { playNote, stopNote }
}

export default usePianoAudio
```

**注意事项：**
- AudioContext 需要用户交互后才能创建（首次点击琴键时创建）
- 同一个频率的 note 同时只能有一个在响
- 调用 `stopNote` 后要触发 release 包络再切断

---

### Task 4: 实现键盘绑定 Hook

**目标:** 创建 `useKeyboard` hook，监听物理键盘按键并映射到音符。

**文件:**
- 创建: `src/hooks/useKeyboard.ts`

**Hook 接口：**

```ts
interface UseKeyboardReturn {
  octaveOffset: number
  setOctaveOffset: (offset: number) => void
  activeKeys: Set<string>
}

const useKeyboard = (
  onNoteOn: (note: string, frequency: number) => void,
  onNoteOff: (note: string, frequency: number) => void
): UseKeyboardReturn
```

**逻辑：**
- `keydown` 事件：根据 `KEYBOARD_MAP` 查找对应音符，用当前 `octaveOffset` 计算实际 MIDI 编号
- `keyup` 事件：停止对应音符
- 八度切换键不触发音符（单独处理）
- `activeKeys` 记录当前按下的键，防止重复触发
- 组件卸载时清理事件监听

**边界情况：**
- 超出 C2-B5 范围的按鍵忽略
- 同时按住多个键都支持
- 窗口失去焦点时释放所有音符

---

### Task 5: 创建 PianoKey 琴键组件

**目标:** 单个琴键组件，处理视觉状态（按下/释放）和鼠标/触屏交互。

**文件:**
- 创建: `src/components/piano/PianoKey.tsx`

**Props：**

```ts
interface PianoKeyProps {
  note: NoteData
  isPressed: boolean
  onMouseDown: () => void
  onMouseUp: () => void
  onTouchStart: () => void
  onTouchEnd: () => void
}
```

**样式（暖色调主题适配）：**
- 白键：`bg-[#faf6f0]` 边框 `border-[#d4cfc5]`
- 黑键：`bg-[#3a3530]`
- 白键按下：背景变 `#ede4d8`
- 黑键按下：背景变 `#5a5550`
- 白键上显示音名（小字，灰色）
- 圆角：白键底部圆角，黑键顶部小圆角

**尺寸（基准 48 键，水平滚动）：**
- 白键宽高比例：约 1:6（宽 48px，高 288px，按容器调整）
- 黑键宽高比例：约 1:3.5（宽 30px，高 180px）
- 黑键绝对定位在白键之间

---

### Task 6: 创建 Piano 钢琴组件

**目标:** 完整的钢琴键盘布局，渲染所有白键和黑键，处理交互聚合。

**文件:**
- 创建: `src/components/piano/Piano.tsx`

**布局逻辑：**
1. 先计算所有白键的位置（从左到右均匀排列）
2. 黑键插入在白键之间的缝隙上方（绝对定位）
3. 黑键的左右偏移量根据其在八度内的位置计算

**黑键偏移算法（每八度内，白键索引从 0 开始）：**
- C# (白键 0-1之间): 偏移 = 白键宽 × 0.75
- D# (白键 1-2之间): 偏移 = 白键宽 × 1.75
- F# (白键 3-4之间): 偏移 = 白键宽 × 3.75
- G# (白键 4-5之间): 偏移 = 白键宽 × 4.75
- A# (白键 5-6之间): 偏移 = 白键宽 × 5.75

**Props：**

```ts
interface PianoProps {
  onNoteOn: (note: string, frequency: number) => void
  onNoteOff: (note: string, frequency: number) => void
  octaveOffset: number
  pressedKeys: Set<number>  // MIDI 编号集合
}
```

**响应式：**
- 容器 `overflow-x-auto`，水平可滚动
- 在小屏幕上用 scale 缩放
- 键盘全局居中

---

### Task 7: 创建 PianoPage 页面组件

**目标:** 完整的钢琴页面，整合所有子组件和 hooks。

**文件:**
- 创建: `src/pages/PianoPage.tsx`

**页面结构：**
```
┌─────────────────────────────────────────┐
│ [SiteHeader — Gleamory 返回首页]         │
│                                         │
│  ← 返回 (Link to /)                     │
│  网页钢琴 Web Piano                      │
│  描述文字                               │
│                                         │
│  [Octave: C2 - B5]  [← 八度 ↓ ↑ 八度 →] │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │  [白键][黑][白键][黑][白键]...     │  │
│  │  [48个键水平排列, 可滚动]          │  │
│  └───────────────────────────────────┘  │
│                                         │
│  键盘提示: A S D F...                    │
└─────────────────────────────────────────┘
```

**布局参考 GachaSimulator：**
- 顶部 `SiteHeader`（固定在顶部）
- 主区域 padding 与首页一致 `px-6 sm:px-[15%]`
- 标题字体用 `font-display`
- 颜色用 CSS 变量 `var(--text-primary)`, `var(--text-muted)` 等

**集成逻辑：**

```tsx
const PianoPage = () => {
  const { playNote, stopNote } = usePianoAudio()
  const { octaveOffset, setOctaveOffset, activeKeys } = useKeyboard(
    playNote,
    stopNote
  )
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set())

  // 处理按键按下/释放
  const handleNoteOn = useCallback((midi: number) => {
    setPressedKeys(prev => new Set(prev).add(midi))
    const note = ALL_NOTES.find(n => n.midiNumber === midi)
    if (note) playNote(note.frequency)
  }, [playNote])

  const handleNoteOff = useCallback((midi: number) => {
    setPressedKeys(prev => {
      const next = new Set(prev)
      next.delete(midi)
      return next
    })
    const note = ALL_NOTES.find(n => n.midiNumber === midi)
    if (note) stopNote(note.frequency)
  }, [stopNote])

  // ...渲染
}
```

---

### Task 8: 添加路由和页面链接

**目标:** 在 App.tsx 中注册 `/piano` 路由。

**文件:**
- 修改: `src/App.tsx`

```tsx
// 在文件顶部添加导入
import PianoPage from '@/pages/PianoPage'

// 在 <Routes> 内添加路由
<Route path="/piano" element={<PianoPage />} />
```

---

### Task 9: 添加项目卡片和时间线条目

**目标:** 在 `projects.json` 中注册钢琴项目，在 `timeline.json` 中添加初始动态。

**文件:**
- 修改: `src/data/projects.json`
- 修改: `src/data/timeline.json`

**projects.json 新增条目：**

```json
{
  "id": "web-piano",
  "name": "网页钢琴",
  "description": "点击琴键或敲击键盘，用四个八度的合成音色弹奏你的旋律",
  "url": "#/piano",
  "status": "在线",
  "tags": ["小工具", "音乐"],
  "cover": "",
  "version": "v1.0.0",
  "updatedAt": "2026-05-23"
}
```

**timeline.json 新增条目：**

```json
{
  "id": "15",
  "projectId": "web-piano",
  "content": "网页钢琴 v1.0 上线 — C2 到 B5 四个八度，Web Audio API 合成音色",
  "date": "2026-05-23"
}
```

> timeline 的 id 需要检查现有最大 id 后再自增。

---

### Task 10: 代码审查

**目标:** 对所有新增和修改的文件进行代码审查，确保符合项目规范。

**文件:**
- 审查: (所有新增/修改的文件)

**审查清单：**
- [ ] TypeScript 类型正确，无 `any` 滥用
- [ ] Tailwind CSS 类名使用正确，无拼写错误
- [ ] 未引入未使用的依赖（React, framer-motion 等）
- [ ] Hook 的闭包陷阱：所有回调正确使用 `useCallback`/`useRef`
- [ ] AudioContext 在用户交互后才创建（避免浏览器自动播放策略）
- [ ] 键盘事件在组件卸载时正确清理
- [ ] 与现有 Gleamory 主题的 CSS 变量一致（无硬编码色值偏离主题）
- [ ] 代码格式化符合 `.prettierrc`（无分号、单引号、printWidth 100）
- [ ] 移动端触屏事件和鼠标事件不冲突（`onTouchStart` + `onMouseDown` 同时绑定时的重复触发问题）

**修复策略：**
- 审查发现的问题逐个修复
- 修复后重新 `npm run build` 确认无编译错误

---

### Task 11: 功能测试验证

**目标:** 在浏览器中手动验证所有功能。

**启动预览：**

```bash
npm run preview
```

**测试用例清单：**

| # | 测试项 | 操作 | 预期 | 状态 |
|---|--------|------|------|------|
| 1 | 页面渲染 | 访问 `/#/piano` | 48个琴键显示完整，无布局错位 | ❓ |
| 2 | 鼠标点击白键 | 点击 C4 白键 | 发声，键按下动画，键面显示"C4" | ❓ |
| 3 | 鼠标点击黑键 | 点击 C#4 黑键 | 发声，键按下动画 | ❓ |
| 4 | 和弦 | 同时点击 C4 + E4 + G4 | 三个音同时发声 | ❓ |
| 5 | 键盘弹奏 | 按键盘 A 键 | C4 发声，松键后声音衰减 | ❓ |
| 6 | 键盘黑键 | 按 W 键 | C#4 发声 | ❓ |
| 7 | 八度切换 | 按 Z 键降八度，再按 A 键 | C3 发声（比之前低一个八度） | ❓ |
| 8 | 八度切换 | 按 X 键升八度，再按 A 键 | C5 发声 | ❓ |
| 9 | 八度越界 | 一直按 Z 降到 C2 以下 | 不发声（无对应音符） | ❓ |
| 10 | 八度越界 | 一直按 X 升到 B5 以上 | 不发声 | ❓ |
| 11 | 连按快速切换 | 快速连按 A S D F | 每个音独立响应，无卡顿 | ❓ |
| 12 | 返回首页 | 点击页面上方 Gleamory 链接 | 回到首页，钢琴卡片可见 | ❓ |
| 13 | 首页卡片跳转 | 点击钢琴卡片 | 跳转到 `/#/piano` | ❓ |
| 14 | 移动端触屏 | 在触屏设备上点击琴键 | 发声，同鼠标行为 | ❓ |
| 15 | 响应式布局 | 缩窄浏览器窗口 | 钢琴水平可滚动，不挤压变形 | ❓ |

**修复策略：**
- 测试发现的问题逐个标记修复
- 修复后重新构建并重新测试
- 全部通过后所有测试项标记为 ✅

---

## 后置：提交流程

### 提交

全部任务完成后，提交到 Git：

```bash
git status --short
# 按根目录 AGENTS.md 核对并逐个暂存本计划涉及的文件
git commit -m "feat: add web piano page with 4-octave synth"
git push
```

### 验证线上

等待 GitHub Actions 部署完成，访问：
- https://gleamory.lovelysia.top/#/piano
- 检查首页钢琴卡片是否存在

---

## 执行顺序

```
Task 1 (pianoNotes.ts) ──────────┐
                                  ├──> Task 5 (PianoKey) ──┐
Task 2 (keyboard map, in same) ──┘                          │
                                                             ├──> Task 6 (Piano) ──> Task 7 (PianoPage) ──> Task 8 (Route)
Task 3 (usePianoAudio hook) ──────────────────┐              │
                                              ├──> Task 6 ───┘
Task 4 (useKeyboard hook) ────────────────────┘

Task 9 (project/timeline data) ──> Task 10 (Code Review) ──> Task 11 (Testing) ──> git commit & push
```

1–4 可并行（数据 + hooks），5–6 依赖 1–4，7–8 依赖 6，9–10 兜底。
