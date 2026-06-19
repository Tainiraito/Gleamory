# Gleamory 微光集

个人微产品入口站，用统一的暖纸杂志风格展示项目，并承载可直接使用的小工具与浏览器插件说明页。

在线地址：[gleamory.lovelysia.top](https://gleamory.lovelysia.top)

## 当前内容

### 首页

- 项目卡片目录
- 实时月历
- 每日诗句，远程接口失败时使用本地诗词库
- 按日期排序的项目更新时间线

### 站内工具

- `#/gacha-simulator`：翻牌抽卡
- `#/piano`：Web Audio 极简钢琴
- `#/metronome`：支持小节编辑和变速模式的节拍器
- `#/audio-separator`：浏览器本地音轨分离，支持 HT-Demucs 高质量四分轨

### 插件说明页

- `#/netease-cover`：网易云封面提取
- `#/pixiv-image-extractor`：Pixiv 插画下载

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 前端 | React 19、TypeScript |
| 构建 | Vite 6 |
| 路由 | React Router 7、HashRouter |
| 样式 | Tailwind CSS 4、CSS 自定义属性 |
| 动画 | Framer Motion 12 |
| 测试 | Vitest 4、Testing Library |
| 部署 | GitHub Pages、GitHub Actions |

非首页路由使用 `React.lazy` 分包。思源宋体采用本地子集化 WOFF2，项目封面采用 WebP。

## 本地开发

```bash
npm install --legacy-peer-deps
npm run dev
```

质量检查：

```bash
npm test
npm run lint
npm run build
```

预览生产构建：

```bash
npm run preview
```

## 数据维护

项目卡片位于 `src/data/projects.json`，更新时间线位于 `src/data/timeline.json`。

新增或发布项目时同步更新：

1. `src/data/projects.json`
2. `src/data/timeline.json`
3. `CHANGELOG.md`
4. 对应路由或外部链接

提交前必须运行测试、Lint 和生产构建。

## 目录

```text
src/
├── components/       首页与共享组件
├── data/             项目、时间线、诗词及音乐配置
├── hooks/            标题、键盘和 Web Audio 生命周期
├── lib/              可独立测试的业务逻辑
├── pages/            工具页与插件详情页
├── styles/           全局主题与字体
├── tests/            Vitest 全局测试设置
└── utils/            通用纯函数
```

更详细的工程约束见 `AGENTS.md`，当前需求与验收规则见 `docs/requirements.md`。
