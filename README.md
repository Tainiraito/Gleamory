# Gleamory 微光集

✨ 个人项目展示首页 - 一切的起点

## 📖 项目简介

Gleamory 是一个个人网站首页，作为所有项目的起点和展示平台。后续所有项目都会以卡片形式挂载在这个首页上。

## 🎨 特性

- 🎴 **项目卡片展示** - 前 3 个项目以特色大卡片展示，其余以网格排列
- ⏰ **时间线动态** - 展示项目更新动态，默认显示 10 条，可展开全部
- 📱 **响应式设计** - 适配桌面、平板、手机
- 🎨 **品牌配色** - 粉紫渐变品牌色贯穿全站
- ✨ **微光特效** - 渐变文字、发光标题、卡片 hover 光效、滚动渐入动画
- 🔤 **思源宋体** - 本地加载 Source Han Serif CN，优雅文化感

## 🛠️ 技术栈

- **框架**: Vue 3
- **UI 库**: Element Plus
- **构建工具**: Vite
- **CSS 框架**: Tailwind CSS
- **字体**: Source Han Serif CN（本地 OTF，3 个字重）
- **数据存储**: JSON 文件

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

## 📁 项目结构

```
Gleamory/
├── src/
│   ├── assets/
│   │   └── fonts/          # Source Han Serif CN 字体文件
│   ├── components/
│   │   ├── ProjectCard.vue # 项目卡片（特色 + 普通两种布局）
│   │   ├── ProjectGrid.vue # 项目网格布局（前 3 特色，其余网格）
│   │   └── Timeline.vue    # 时间线组件（Element Plus）
│   ├── data/
│   │   ├── projects.json   # 项目数据
│   │   └── timeline.json   # 时间线数据
│   ├── styles/
│   │   └── main.css        # 字体声明 + CSS 变量 + 工具类
│   ├── App.vue             # 主组件（粘性导航栏 + 分区布局）
│   └── main.js             # 入口文件
├── public/
│   └── covers/             # 项目封面图（静态资源）
├── index.html              # HTML 入口
├── package.json            # 项目配置
├── vite.config.js          # Vite 配置
├── tailwind.config.js      # Tailwind 配置
├── postcss.config.js       # PostCSS 配置
├── README.md               # 项目说明
├── CHANGELOG.md            # 变更日志
└── docs/
    └── requirements.md     # 需求文档
```

## 📝 数据说明

### 项目数据 (projects.json)

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

### 时间线数据 (timeline.json)

```json
{
  "id": "unique-id",
  "projectId": "关联项目ID",
  "content": "更新内容",
  "date": "2026-04-29"
}
```

## 🎨 品牌色

| 色值 | 用途 |
|:---|:---|
| `#F783AC` | 主粉色（标题渐变、圆点、边框） |
| `#B490E4` | 主紫色（渐变、标签、hover 交互） |
| `#E05A8A` | 深粉色（hover 加深） |
| `#2D2D2D` | 主要文字 |
| `#5A5A5A` | 正文文字 |
| `#9A9A9A` | 辅助文字 |

## 📄 文档

- [需求文档](docs/requirements.md)
- [变更日志](CHANGELOG.md)

## 📜 许可证

MIT License

---

**Gleamory 微光集** ✨ - 用微光点亮每一个项目
