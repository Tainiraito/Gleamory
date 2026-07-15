# Gleamory 暖纸墨韵重设计 — Design Spec

> 状态：已实现，作为当前全站视觉语言的历史设计依据。

> 设计方向：暖纸墨韵（Warm Paper & Ink）
> 项目：Gleamory 微光集
> 日期：2026-05-18

---

## 1. 设计哲学

**「一页信纸，一道微光」**

每个项目卡片像一封展开的信，封面图是信中的照片，文字是手写的记录。
粉紫的光只在鼠标经过时悄悄渗出纸缝——呼应「微光集」的名字。

不是「漂亮模板」，而是一封封展开的、有点旧的、带着温度的信。

---

## 2. 5 大签名元素（Signature Elements）

### ① 微光渗漏 · Glimmer Leak ✨
卡片 hover 时，底部溢出柔和的粉紫光晕——像封缄的纸缝里渗出的一线光。
- CSS 实现：`::after` 伪元素 + `box-shadow` + `opacity` 过渡
- 常态：`opacity: 0`
- hover：`opacity: 1`，光晕从底部向上扩散 `translateY(0) → translateY(-4px)`
- 色值：`rgba(247, 131, 172, 0.08)` → `rgba(247, 131, 172, 0.15)`
- **Framer Motion：** 用 `whileHover` 控制，`transition: { duration: 0.4, ease: 'easeOut' }`

### ② 纸角折痕 · Paper Corner Fold 📐
卡片右上角有一个极淡的折痕效果——像纸角被轻轻翻起过。
- 仅用于 featured 卡片
- CSS 实现：`::before` 伪元素，`border-style: solid` 三角
- 颜色：背景色 `#f7f4ef`（与 page 背景同色，造成「透过折痕看到桌面」的错觉）
- 大小：24px × 24px 直角三角形
- corner：top-right
- hover 时折痕不变化（保持幽静感）

### ③ 旧纸纹理 · Aged Paper Grain 🏛️
页面背景有一层几乎不可见的颗粒感纹理。
- CSS 实现：`<svg>` filter + CSS `background-image`，用极小尺寸（如 200×200）的 `feTurbulence` 生成噪点
- 不透明度：`0.015` — 几乎不可见，但让纯色背景「不无聊」
- 所有浏览器兼容：用 base64 内联 SVG
- 只在页面背景生效，不在卡片背景上叠加（卡片纯白）

### ④ 活版句读 · Letterpress Ornaments ❦
章节标题之间用极细的古风排版装饰符号点缀。
- 符号库：`❦ ⸎ ※ ✦ ❧`（仅用这 5 个）
- 色值：`#0c0a12` 紫黑，`opacity: 0.15`
- 位置：大区块标题下方，替代传统的 `border-bottom`
- 大小：`font-size: 12px`，等宽间距
- 符号不承载功能含义，纯装饰

### ⑤ 押印标签 · Stamp Tags 🔲
项目的 tags 和 status 不再是普通圆角标签——而是墨印风格。
- 实现：`border: 1px solid rgba(44,42,48,0.12)` + 细体字 + 约 `-2deg` 随机倾斜
- 背景：透明（只在纸上印刷，没有填充色块）
- 字体：`font-sans`（系统字体），`font-size: 11px`，`letter-spacing: 0.05em`
- hover：不变化（保持「已经印好了」的感觉）
- 多个 tag 之间用 `·` （中间点）分隔，不换行

---

## 3. 首页卡片（ProjectCard + ProjectGrid）

### 通用样式
| 属性 | 值 |
|:----|:----|
| 卡片背景 | `#ffffff` |
| 卡片边框 | `0.5px solid rgba(44,42,48,0.07)` — 极细，像活版压印 |
| 卡片圆角 | `rounded-sm`（维持现有） |
| 卡片阴影 | **无** — 完全依靠线框和内容来定义卡片边界 |
| 卡片过渡 | `transition-all duration-400 ease-out` |

### Featured 变体（第一个项目）
| 属性 | 值 |
|:----|:----|
| Grid 宽度 | 7 col（当前设计不变） |
| 封面图 | 无边融入卡片顶部，占满卡片宽度 |
| 封面高度 | `min-h-[360px]` |
| 封面过渡 | `group-hover:scale-[1.02]` + `duration-700` 慢速缩放 |
| 文字区 padding | `px-8 sm:px-10 py-10 sm:py-12` |
| 项目名 | `font-display`（思源宋体），`text-3xl sm:text-4xl`，`font-weight: 600`，`color: #0c0a12` |
| 描述 | `text-sm leading-relaxed`，`color: #4a4550`，`max-w-xl` |
| 无封面占位 | 高度 `110px`，渐变 `var(--accent-glow) → var(--bg-elevated)` |
| 纸角折痕 | ✅ 启用 |
| 微光渗漏 | ✅ hover 时底部发光 |

### Secondary 变体（第二个项目）
| 属性 | 值 |
|:----|:----|
| Grid 宽度 | 5 col（当前设计不变） |
| 封面图 | 无边融入卡片顶部 |
| 封面区域 | 无白框相片效果，直接 `object-cover` |
| 封面高度 | `aspect-[16/9]` |
| 文字区 padding | `px-6 sm:px-8 py-8 sm:py-10` |
| 项目名 | `font-display`，`text-2xl sm:text-3xl`，`font-weight: 600`，`color: #0c0a12` |
| 无封面占位 | 高度 `70px`，同上渐变 |
| 纸角折痕 | ❌ 不启用（只在 featured 上） |
| 微光渗漏 | ✅ hover 时底部发光 |

### 列表项（其余项目，List 模式）
| 属性 | 值 |
|:----|:----|
| Grid | `grid-cols-1 md:grid-cols-2 gap-8`（当前设计不变） |
| 卡片边框 | 同上 0.5px 线框 |
| 无封面 | 无暖色占位条，无封面时直接不显示图片区域 |
| 文字区 | `py-6 sm:py-8`（稍紧凑） |
| 微光渗漏 | ✅ hover 时底部发光（减弱版，`opacity: 0.06`） |
| 项目名 | `font-display text-xl` |

### 装饰元素布局
- 项目名上方：`❦` 装饰符号，`opacity: 0.12`，字号 `10px`
- 项目名下方：`0.5px` 分隔线，`color: rgba(44,42,48,0.06)`，宽度占文字区域的 40%
- 标签行：押印风格，标签之间用 `·` 分隔

### 空状态/无数据
- 无项目数据时：显示「还未收录任何项目」的温和提示
- 字体：`font-kai`（楷体），`color: var(--text-muted)`，居中
- 上方装饰：`✦` 符号

---

## 4. 抽卡页（GachaSimulator）

### 整体布局
| 属性 | 值 |
|:----|:----|
| 背景 | 同首页 `#f7f4ef` + 旧纸纹理 |
| 页面最大宽度 | `max-w-3xl mx-auto` — 比首页稍窄，像一页手帐 |
| 间距 | 区块之间 `gap-6 sm:gap-8` |
| 区块卡片 | 每个独立功能块（条目管理/抽卡区/结果）各有独立的 0.5px 线框纸片 |

### ⭐ 签名元素：橡皮图章按钮 (Rubber Stamp Button)
抽卡主按钮是整页的视觉焦点，也是 gacha 最有个性的元素：
- 形状：**正方形**（80×80px），而非普通圆形/矩形按钮
- 背景：`#0c0a12` 紫黑（深墨色）
- 文字：`#f7f4ef`（纸色），`font-family: 'Source Han Serif CN'`，大字
- 内容：**「抽」** 单字，竖排居中，`font-size: 28px`，`font-weight: 700`
- 下方小字：`pull` 英文，`font-size: 9px`，`letter-spacing: 0.15em`
- 边框：`0.5px solid #0c0a12`
- 旋转：`-2deg` 微偏，像真的手盖印章
- 悬停：`rotate(0deg)` + `scale(1.05)` + 底部微光渗出
- 点击：`scale(0.95)` 像用力按印章
- shadow：无 box-shadow，只有 `0 1px 2px rgba(44,42,48,0.06)`

### ⭐ 签名元素：抽签纸片 (Paper Slip Draw)
抽出的结果不是表格——而是一张张独立的纸签：
- 每个抽到的条目是一张长方形「纸片」
- 背景：`#ffffff`，0.5px 线框
- 左边有一条 **锯齿撕痕**（CSS `border-image` / clip-path 模拟撕裂边缘）
- 纸片内：条目名称（大号 `font-display`）+ 底部右对齐小字 `第 N 抽`
- 纸片随机微转：`-1deg ~ 1deg`，相互略微错落
- 动画：从顶部滑入 + 轻轻落下，`spring: { stiffness: 300, damping: 25 }`
- 纸片宽度：`180px ~ 220px`（随机），两到三列排列
- 空状态（无结果时）：显示 `✦` +「开始抽卡吧」

### ⭐ 签名元素：抽卡动画
点击「抽」按钮后的流程：
1. 按钮向下弹动 `scale(0.95)` 再回弹
2. 结果区域出现 **纸片飘落** 动画：
   - 每张纸片从 `y: -40, opacity: 0` 开始
   - 按顺序 `delay: index * 0.08` 逐个出现
   - 落地后有微小弹跳 `spring`
3. 全部出现后，纸片轻微抖动 `x: [-1, 1, -1, 0]` 持续 0.3s

### 抽卡区布局
- 左侧：抽卡按钮（橡皮图章，居中）
- 右侧：抽取次数控制（`+` `-` 按钮，纯数字输入）
- 下方：当前模式显示（「唯一模式」/「重复模式」）

### 条目管理区
- Textarea：复古笔记本质感
  - 背景：极淡的横线 `repeating-linear-gradient`，像笔记本横线纸
  - 横线色值：`rgba(44,42,48,0.03)`，间隔 24px
  - 占位符文字：楷体风格
- 追加/覆盖切换：保留现有设计但微调——两按钮拼成 toggle，无背景色块，`0.5px` 线框包围
- 去重勾选框：`accent-color: #0c0a12`（紫黑），不再是粉色

### 结果展示
- **抽取历史**：用「纸签飘落」形式展示，不清除（但可以通过按钮清除）
- 历史条目排序：最新的在上
- 超出屏幕 → 内部滚动容器
- 清除历史按钮：小号文字按钮，`color: rgba(44,42,48,0.3)`，hover 时变深

---

## 5. CSS 变量变更

```css
:root {
  /* 保留不变 */
  --bg-page: #f7f4ef;
  --bg-card: #ffffff;
  --bg-elevated: #faf8f5;
  --accent-pink: #f783ac;
  --accent-glow: rgba(247, 131, 172, 0.1);

  /* 修改 */
  --text-primary: #0c0a12;          /* 紫黑色代替之前的 #2c2a30 */
  --text-secondary: #4a4550;        /* 略深 */
  --text-muted: #7a7580;            /* 略深 */
  --border-line: rgba(44, 42, 48, 0.07);  /* 略明显 */
  --shadow-card: none;               /* 移除阴影 */
  --shadow-card-hover: none;         /* 移除阴影 */

  /* 新增 */
  --ink-stamp: #0c0a12;             /* 墨印色 */
  --paper-grain: url("data:image/svg+xml,...");  /* 旧纸纹理（内联 base64） */
  --card-border: 0.5px solid rgba(44,42,48,0.07);
}
```

---

## 6. 约束条件

### 不可修改的文件
- `src/types/index.ts`
- `src/data/projects.json`
- `src/data/timeline.json`
- `src/assets/fonts/*`
- `public/covers/*`
- `vite.config.ts`（除非确实需要）

### 禁止行为
- ❌ 不改 dark mode（保持单色系）
- ❌ 不引入新 npm 包
- ❌ 不删除 `public/covers/` 下的图
- ❌ 不用粉紫作为背景填充色（仅作 `box-shadow` / `text-shadow` 发光用）
- ❌ 不改原有数据 schema

### 代码风格
- React 19 + TypeScript + Tailwind v4 + Framer Motion v12
- CSS 变量全部走 `globals.css`，不 inline hard-coded hex
- 功能代码不耦合视觉代码（纯逻辑已在 `src/lib/gacha.ts`）

---

## 7. 实现顺序

1. **CSS 变量 + 旧纸纹理** — 更新 `globals.css`
2. **首页卡片重构** — `ProjectCard.tsx` + `ProjectGrid.tsx`
3. **抽卡页重构** — `GachaSimulator.tsx`

每个步骤独立验证 ✅ `npm run build`
