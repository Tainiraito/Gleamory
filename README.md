# Gleamory 微光集

✨ 个人项目展示首页 — 杂志风格，素笺呈现

## 📖 项目简介

**Gleamory**（微光集）是一个个人品牌首页，采用杂志风格编辑式布局，以素笺（暖白纸色）风格展示所有项目。每个项目以卡片形式呈现，搭配日历、每日诗句和时间线动态，作为个人创作的统一入口。

在线地址：[gleamory.lovelysia.top](https://gleamory.lovelysia.top)

## 🎨 特性

- 📰 **杂志式布局** — 7/5 列网格分割 + 清单式排列，告别网格大盘
- 🖼️ **特色卡片** — 封面大图 + 白色衬边，杂志感满满
- 📅 **实时日历** — 展示当前月份日历，今日高亮
- 📝 **每日诗句** — API 获取今日诗词，失败时用本地诗词库兜底
- ⏰ **时间线动态** — 默认 5 条，可展开查看全部
- 🌸 **素笺风格** — 暖米色背景 + 粉色点缀，干净优雅
- 🔤 **思源宋体 + 霞鹜文楷** — 文化感与手写感并存
- ✨ **滚动动画** — Framer Motion 驱动，柔和交错进入

## 🛠️ 技术栈

| 类别       | 技术                              |
| ---------- | --------------------------------- |
| **框架**   | React 19                          |
| **语言**   | TypeScript (strict)               |
| **构建**   | Vite + `@vitejs/plugin-react`     |
| **样式**   | Tailwind CSS v4 (`@tailwindcss/vite`) |
| **动画**   | Framer Motion v12                 |
| **代码规范** | ESLint + Prettier               |
| **字体**   | Source Han Serif CN（本地 OTF）    |
|           | LXGW WenKai（Google Fonts）       |
| **部署**   | GitHub Pages（Actions 自动构建）   |
| **域名**   | `gleamory.lovelysia.top`（Cloudflare） |

## 🚀 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build       # 类型检查 + 生产构建
npm run preview     # 预览生产构建

# 代码质量
npm run lint        # ESLint 代码检查
npm run format      # Prettier 自动格式化
```

## 📁 项目结构

```
Gleamory/
├── src/
│   ├── assets/
│   │   └── fonts/          # Source Han Serif CN 字体文件
│   ├── components/
│   │   ├── FloatingLogo.tsx # 固定左上角品牌名
│   │   ├── ProjectGrid.tsx  # 杂志式项目网格
│   │   ├── ProjectCard.tsx  # 项目卡片（特色/次要两种）
│   │   ├── CalendarCard.tsx # 实时日历组件
│   │   ├── PoemCard.tsx     # 每日诗句组件
│   │   ├── Timeline.tsx     # 时间线组件
│   │   └── Footer.tsx       # 页脚
│   ├── data/
│   │   ├── projects.json    # 项目数据
│   │   ├── timeline.json    # 时间线数据
│   │   └── poems.json       # 诗词后备数据
│   ├── styles/
│   │   └── globals.css      # Tailwind v4 主题 + CSS 变量
│   ├── types/
│   │   └── index.ts         # TypeScript 类型定义
│   ├── App.tsx              # 根布局组件
│   └── main.tsx             # 入口文件
├── public/
│   └── covers/              # 项目封面图（静态资源）
├── index.html               # HTML 入口
├── package.json             # 项目配置
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
├── AGENTS.md                # AI agent 规范文档
├── CHANGELOG.md             # 变更日志
└── docs/
    └── requirements.md      # 需求文档
```

## 📝 数据说明

### 项目数据 (`src/data/projects.json`)

```json
{
  "id": "unique-id",
  "name": "项目名称",
  "description": "项目描述",
  "url": "https://example.com",
  "status": "开发中|已上线|已下线",
  "tags": ["标签1", "标签2"],
  "cover": "/covers/xxx.png",
  "version": "v1.0.0",
  "updatedAt": "2026-04-29"
}
```

### 时间线数据 (`src/data/timeline.json`)

```json
{
  "id": "unique-id",
  "projectId": "关联项目ID",
  "content": "更新内容",
  "date": "2026-04-29"
}
```

## 🎨 设计系统

| 色值 | 用途 |
| :-- | :-- |
| `#f7f4ef` | 页面背景（暖米色） |
| `#ffffff` | 卡片背景 |
| `#2c2a30` | 主要文字 |
| `#6b6570` | 次要文字 |
| `#f783ac` | 粉色点缀 / 今日高亮 |
| `rgba(247,131,172,0.1)` | 粉色微光 |

所有设计标记（色值、字体、阴影）均通过 `globals.css` 中的 CSS 自定义属性定义。

## 📄 文档

- [AGENTS.md](AGENTS.md) — AI Agent 开发规范
- [CHANGELOG.md](CHANGELOG.md) — 变更日志
- [docs/requirements.md](docs/requirements.md) — 需求文档

## 📜 许可证

MIT License

---

**Gleamory 微光集** ✨ — 用微光点亮每一个项目
