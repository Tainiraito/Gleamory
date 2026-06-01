# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- ✨ **UI/UX 锐评改进** — 12 项全量修复（来源：ui-ux-pro-max 锐评）
  - 状态颜色差异化：`statusStyle.ts` 为 4 种状态（在线/开发中/已上线/已下线）提供语义化颜色
  - 安装流程提示：下载按钮下方新增 3 步 chip（下载 ZIP → 安装扩展 → 访问 pixiv.net）
  - 步骤列表可扫描性：`StepList` 支持 hover 高亮、含链接步骤的徽章颜色更深
  - Lightbox 可访问性：主图加 `role="button"` + `tabIndex` + Enter/Space 快捷键，关闭后焦点回到主图
  - `InlineStep` 安全组件：替代 `dangerouslySetInnerHTML`，支持裸 URL / `<link>` / `<code>` token 自动识别
  - `CoverPlaceholder` 渐变占位组件：4 种主题渐变 + 项目首字大字
  - 卡片顶部色条：list 模式无 cover 卡片加 4px 状态色条，hover 变 6px
  - 卡片 hover 微动效：box-shadow 增强 + 边框变色
  - og/twitter meta 补全：og:url、og:image、twitter:card=summary_large_image
  - 下载按钮文案优化："立即下载" → "下载 v1.2 插件"
  - 列表卡片底部元数据（version/updatedAt）移至仅 featured 卡片，弱化列表噪音

- 🎵 **节拍器** — `Metronome.tsx` + `useMetronome.ts`（`/metronome` 路由）
  - Web Audio API 合成 6 种音色（click/kick/snare/hihat/wood/metal）
  - 每拍独立音色选择：左键单击循环切换 / 长按或右键弹出面板
  - 小节管理：添加/复制/删除，新增小节自动复制末尾配置
  - 每小节 1~8 拍可调，全局同步
  - BPM 范围 30~300，预设 30/60/90/120/180
  - **变速模式**：起始BPM→终止BPM，每N轮增加X BPM，支持 ↗加速 / ↕反复
  - 播放计时器 + 轮数计数（RND）
  - 单例弹出面板 + 点击外部关闭
  - 6 种小节音色预设一键切换
  - 紧凑响应式布局，移动端适配
- 🎹 **极简钢琴** — `PianoPage.tsx`（`/piano` 路由）
  - C2~B5 共 48 键，白键 flex + 黑键 absolute 定位
  - Web Audio API 合成音色，4 种音色可切换（钢琴/风琴/暖音/电颤）
  - 每个音色独立 ADSR 包络 + 振荡器组合
  - 键盘映射双预设（数字行 / 经典行），键位提示随预设动态更新
  - 延音模式（toggle + 空格键踏板），三种方式切换
  - Z/X 八度升降，触屏点按适配
- 🐟 **Sakana~** — `SakanaPage.tsx`（`/sakana` 路由）
  - 2D 弹簧物理模拟：弹簧顶部固定于桌面底部，底部连接亚克力立牌
  - 鼠标/触控拖拽立牌，松手后按胡克定律 + 阻尼振动摆动
  - 立牌自然下垂时保持水平立直（角速度微阻尼归零）
- 🎵 **网易云封面提取** — `NeteaseCoverPage.tsx`（`/netease-cover` 路由）
  - 网易云音乐 Chrome 扩展插件详情页，使用 `PluginDetailPage` 通用模板
  - 特性网格 / 截图灯箱 / 使用说明 / 下载区四区块布局
  - 暗色主题，无缝贴合网易云音乐网页版风格
  - 自动命名下载为「歌手 - 歌名.jpg」
- 🎨 **Pixiv 封面提取** — `PixivCoverPage.tsx`（`/pixiv-cover` 路由）
  - Pixiv 作品页 Chrome 扩展插件详情页，复用 `PluginDetailPage` 模板
  - 强调色 `#0096fa`（Pixiv 蓝）
  - 4 项特性：一键提取 / 原图下载 / 作者信息 / 批量保存
  - 适配 Chrome 88+（Manifest V3），需登录 Pixiv 账号
  - 版本 v1.2（来源：`/mnt/f/Downloads/Hermes_Area/pixiv-image-extractor/manifest.json`）
- 🐟 **Sakana~** — `SakanaPage.tsx`（`/sakana` 路由）
### Changed

- ⚡ **卡片 hover 动效提速** — `0.6s` → `0.12s`，上浮幅度 `-2px` → `-3px`
- 🔄 **Timeline 降序排列** — 最新更新排在最前面
- 🎛 **节拍器 UI 重构** — 卡片分层/合并/拍点视觉优化
  - 节拍选择 + 模式切换 + BPM 设置合并为统一卡片
  - 拍点圆点 3px → 16px，颜色一目了然
  - 拍点网格去除卡片背景边框，内嵌按钮改用 bg-card 与页面区分
  - 播放按钮常显 amber 底 + press 动画 + 图标过渡
  - 音色预设添加 active 态显示
  - 标题装饰线对称化 `─── • ───`，组件全居中

- ✨ **翻牌抽卡页面** — `GachaSimulator.tsx`（`/gacha` 路由）
  - 三栏布局：管理面板 | 翻牌区（auto-fill minmax 88px~1fr）| 已抽结果+统计
  - 卡牌翻面动画（Framer Motion 3D rotateY）
  - 同名条目概率计算、去重/追加/覆盖添加模式
  - 剩余概率基于未翻卡牌动态计算
  - 重新洗牌动画：先盖回→延迟500ms打乱
  - sessionStorage 持久化（300ms 防抖）
-  - 60+ 预设角色条目
- 🃏 **三组牌组预设切换** — 左侧面板一键切换
  - 二次元角色（原预设，60 张）
  - 扑克牌（54 张：♠♥♦♣ 各 13 + 🃏Joker×2）
  - 塔罗牌（78 张：22 张大牌 + 56 张小牌）
  - 扫雷（50 张：💣-1∼💣-5 + 安全×45）
  - sessionStorage 记录当前预设，刷新不丢失
- 🧭 **SiteHeader 组件** — 统一全宽吸顶导航栏
  - 所有页面共用，取代旧 FloatingLogo 小片徽标
  - 暖纸背景 + 底部分割线，保持视觉统一

### Changed

- 🎨 **配色统一为「琥珀 + 暖纸 + 墨黑」**
  - `/gacha` 页面：全部粉色替换为琥珀（`--accent-amber: #c4956a`）
  - 卡背由黑渐变改为暖纸色 `#e2d8c8`
  - 黑色仅作 ink-stamp 按钮悬停和文字点缀
  - 首页变量 `--accent-pink` 保留为琥珀别名保证兼容
- 📐 **内容容器加宽** — 两侧 `px-[15%]`，内容占视宽 70%
- 📱 移动端已抽结果不再重复显示（`hidden lg:block`）
- ⚡ 概率预计算 `useMemo`、卡牌 grid 提取为 memo
- 🔤 全局字阶规范化：移除 `text-[0.55rem]`，统一 Tailwind 系统
- 👆 所有交互按钮统一 `cursor: pointer`（10 个按钮）
- 🃏 扑克牌红♥♦花色自动显示为琥珀色，与黑♠♣区分
- 🗑️ 移除 Claude Code 规划产物（`docs/superpowers/` 加入 .gitignore）

---

## [3.0.0] - 2026-05-18

### 重大变更 — 全面重构

- 🚀 **框架迁移：Vue 3 → React 19**
  - 全部组件重写为 React 函数组件（TypeScript）
  - 入口从 `src/main.ts` (Vue) 迁移至 `src/main.tsx` (React)
  - 使用 `@vitejs/plugin-react` 替代 `@vitejs/plugin-vue`

- 🎨 **样式重构：Tailwind v3 → Tailwind v4 + CSS 主题**
  - Tailwind v4 CSS-first 配置，`@theme inline` 替代 `tailwind.config.js`
  - 全新「素笺」设计系统：暖米纸色背景 `#f7f4ef` + 白色卡片
  - 所有设计标记统一为 CSS 自定义属性（`--bg-page`, `--text-primary`, `--accent-pink` 等）

- ✨ **动画引擎：自定义 CSS → Framer Motion**
  - 引入 Framer Motion v12 驱动所有动画
  - 项目卡片：滚动渐入 + hover 上浮 + 阴影过渡
  - 时间线：交错动画，从左淡入

### 新功能

- 📰 **杂志布局** — `ProjectGrid.tsx`
  - 7/5 列网格分割（前 2 个项目高低搭配）
  - 后续项目以垂直清单排列，告别网格大盘

- 📅 **实时日历组件** — `CalendarCard.tsx`
  - 基于 JS Date 动态渲染当前月份
  - 上月/下月日期间淡化，今日粉色圆圈高亮

- 📝 **每日诗句组件** — `PoemCard.tsx`
  - 首次加载从 `v1.jinrishici.com` API 获取
  - API 失败时从本地 `poems.json`（31 首）回退
  - 霞鹜文楷字体展示，优雅手写感

- 🏷️ **浮动品牌标识** — `FloatingLogo.tsx`
  - 固定左上角「Gleamory」文字，hover 淡化

### 架构变更

- 🔧 **构建工具链更新**
  - `@tailwindcss/vite` 插件替代 PostCSS + autoprefixer
  - `env.d.ts` (Vue 类型声明) 移除 → `vite-env.d.ts` (Vite 通用类型声明)
  - `tsc -b` 类型检查替代 `vue-tsc`
  - ESLint 扁平配置更新为 `react-hooks` + `react-refresh`

- 🗑️ **移除已废弃文件**
  - `tailwind.config.js`（Tailwind v4 CSS-first）
  - `postcss.config.js`（已由 `@tailwindcss/vite` 接管）
  - `env.d.ts`（Vue 专用，React 项目无需）
  - `postcss` / `autoprefixer` 依赖

### 页面功能

- ✨ 滚动渐入动画（Framer Motion `whileInView`）
- 🔤 **霞鹜文楷** — 诗句区域专有字体（Google Fonts）
- 🎨 自定义 favicon（粉紫渐变星形微光图标）
- 🌐 保留 GitHub Pages 部署 + 自定义域名 `gleamory.lovelysia.top`

---

## [2.0.0] (Unreleased)

### Added

- ✨ 导航栏背景自适应（IntersectionObserver + 白色 overlay 方案）
  - 内容区顶部 sentinel 检测滚动位置
  - 白色 overlay opacity 0→0.72 平滑过渡（500ms）
  - 保留毛玻璃质感，提升粉紫色文字对比度
- ✨ 空状态/加载/错误占位组件（EmptyState.vue）
- 📱 移动端 ElDrawer 抽屉菜单导航

### Changed

- 🎨 全局 focus-visible 焦点样式统一
- 🎨 卡片 hover 力度优化（-4px → -2px）
- 🎨 GitHub 链接颜色改为粉色主题色
- 🎨 渐变文字添加 color: transparent 后备
- 🔧 back-to-top hover transform 冲突修复
- 🟦 **JavaScript → TypeScript 迁移**
  - 所有 `.vue` 组件添加 `<script setup lang="ts">`
  - 新增 `src/types/index.ts` 类型定义（Project, Update, ProjectsData, UpdatesData）
  - Props 改为编译期类型推导（`defineProps<{...}>()`）
  - Vite 配置迁移至 TypeScript（`vite.config.ts`）
  - 入口文件迁移至 TypeScript（`src/main.ts`）
  - `vue-tsc --noEmit` 类型检查集成到构建流程

### Added (Tooling)

- 🛠️ TypeScript 6.0 + @vue/tsconfig
- 🛠️ vue-tsc ^3.2.8 类型检查
- 🛠️ ESLint 扁平配置（typescript-eslint + eslint-plugin-vue）
- 🛠️ Prettier 格式化（无分号、单引号、printWidth 100）
- 🛠️ `npm run typecheck` / `lint` / `format` 脚本
- 🛠️ `unplugin-element-plus` 自动导入 Element Plus 样式
- 🛠️ SEO 元标签（Open Graph + Twitter Card）

### Infrastructure

- 🚀 部署至 GitHub Pages（GitHub Actions 自动构建）
- 🌐 绑定自定义域名 `gleamory.lovelysia.top`
- 🔒 Cloudflare DNS 代理（自动 HTTPS + CDN）

---

## [1.3.0] - 2026-04-29

### Changed

- 🧹 清理 main.css 死代码（383 行 → 209 行）
  - 移除未使用的 Hero 区域样式（hero-banner、hero-title、hero-subtitle）
  - 移除重复定义的 featured-card、timeline 动画（已移入组件 scoped style）
  - 移除未使用的 .flex-col-min-h、.card-cover-placeholder、.tag-item、.status-badge
- 🐛 修复 font-weight 选择器范围过大导致 Element Plus 组件字重异常
- 🐛 修复 featured 卡片状态徽章与动态 statusClass 样式冲突
- 📝 Timeline.vue 补充 :css="showAll" 注释说明
- 📝 修复 Timeline.vue 缺失的 @keyframes timelineSlideIn 定义
- 📝 ProjectCard.vue 移除无定义的 .status-badge 类引用

---

## [1.2.0] - 2026-04-29

### Added

- 📦 新增 Element Plus UI 库（时间线组件）
- 🔤 新增思源宋体 Source Han Serif CN 本地字体（Medium/SemiBold/Bold 三个字重）
- 📁 新增 public/covers/ 目录用于项目封面图
- 🎴 ProjectCard 新增 featured 特色卡片布局（前 3 个项目大卡片展示）
- ✨ 卡片 hover 光效装饰（粉紫渐变 blur 光斑）
- 🏷️ 标签渐变背景 + 边框样式
- 📅 卡片日期 SVG 日历图标
- ⬆️ 返回顶部按钮

### Changed

- 🎨 品牌色升级：主粉 #FFB7C5 → #F783AC，新增主紫 #B490E4
- 📐 布局重构：Hero 大横幅 → 粘性导航栏 + 分区布局
- 📝 模块标题重命名：「妙妙工具」→「拾光集录」，「时间夹缝」→「流光忆庭」
- 🔤 字体从 Google Fonts Noto Sans SC 切换为本地思源宋体
- 🎨 背景从米白 #FFFAF0 改为纯白
- 📐 卡片圆角统一为 12px，标签圆角统一为 8px
- 🎨 分区标题改为粉紫渐变文字
- 🏷️ 状态徽章改为渐变底色 + 边框样式
- ⏰ 时间线收起时禁用过渡动画，展开更流畅
- 📊 时间线条目动画延迟从 0.1s 优化为 0.02s

---

## [1.1.0] - 2026-04-29

### Added

- ✨ 卡片 hover 上浮 + 粉色阴影效果
- 📱 响应式布局（1/2/3 列自适应）
- ⏰ 时间线条目载入动画
- 🔄 滚动渐入动画（IntersectionObserver）

### Changed

- 📝 更新文档同步

---

## [1.0.0] - 2026-04-29

### Added

- ✨ 项目初始化
- 🎨 Vue 3 + Vite 项目框架搭建
- 🎴 项目卡片组件 (ProjectCard.vue)
- ⏰ 时间线组件 (Timeline.vue)
- 📱 响应式布局
- 🎨 粉白配色方案（初始版本）
- 📝 示例数据 (projects.json, timeline.json)
- 📄 README.md 文档
- 📄 CHANGELOG.md 变更日志
- 📄 需求文档 (docs/requirements.md)
- 📄 AGENTS.md 项目规范

---

_记录每次重要变更_
