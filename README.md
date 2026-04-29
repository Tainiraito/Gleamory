# Gleamory 微光集

✨ 个人项目展示首页 - 一切的起点

## 📖 项目简介

Gleamory 是一个个人网站首页，作为所有项目的起点和展示平台。后续所有项目都会以卡片形式挂载在这个首页上。

## 🎨 特性

- 🎴 **项目卡片展示** - 以卡片形式展示所有项目
- ⏰ **时间线动态** - 展示项目更新动态
- 📱 **响应式设计** - 适配桌面、平板、手机
- 🎨 **梦幻配色** - 粉白配色，参考爱莉希雅风格
- ✨ **动画效果** - 柔和流畅的交互动画

## 🛠️ 技术栈

- **框架**: Vue 3
- **构建工具**: Vite
- **CSS 框架**: Tailwind CSS
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
│   ├── assets/          # 资源文件
│   ├── components/      # 组件
│   │   ├── ProjectCard.vue    # 项目卡片组件
│   │   ├── ProjectGrid.vue    # 项目网格布局
│   │   └── Timeline.vue       # 时间线组件
│   ├── data/            # 数据文件
│   │   ├── projects.json      # 项目数据
│   │   └── timeline.json      # 时间线数据
│   ├── styles/          # 样式文件
│   ├── App.vue          # 主组件
│   └── main.js          # 入口文件
├── public/              # 静态资源
├── index.html           # HTML 入口
├── package.json         # 项目配置
├── vite.config.js       # Vite 配置
├── tailwind.config.js   # Tailwind 配置
└── README.md            # 项目说明
```

## 📝 数据说明

### 项目数据 (projects.json)

```json
{
  "id": "unique-id",
  "name": "项目名称",
  "description": "项目描述",
  "url": "项目链接",
  "status": "开发中|已上线|已下线",
  "tags": ["标签1", "标签2"],
  "cover": "封面图路径",
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

## 🎨 配色方案

参考崩坏3角色「人之律者·爱莉希雅」的配色：

- **主色**: 粉色系 (`#FFB7C5`)
- **背景**: 米白色 (`#FFFAF0`)
- **点缀**: 浅紫色 (`#E6E6FA`)
- **强调**: 金色 (`#FFD700`)

## 📄 文档

- [需求文档](docs/requirements.md)
- [变更日志](CHANGELOG.md)

## 📜 许可证

MIT License

---

**Gleamory 微光集** ✨ - 用微光点亮每一个项目
