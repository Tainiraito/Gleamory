# Changelog

本项目遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

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
- 📝 模块标题重命名："妙妙工具" → "拾光集录"，"时间夹缝" → "流光忆庭"
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
