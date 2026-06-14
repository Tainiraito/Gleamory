# AGENTS.md - Gleamory 微光集

## 项目定位

Gleamory 是个人微产品入口站，由品牌首页、站内小工具和浏览器插件说明页组成。它是纯静态 React 单页应用，部署到 GitHub Pages。

- UI 文案使用中文。
- 代码标识符使用英文。
- 数据以静态 JSON 为主。
- 保持轻量，不引入后端或全局状态库，除非需求明确要求。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 框架 | React 19 |
| 语言 | TypeScript 5.7，strict |
| 构建 | Vite 6 |
| 路由 | React Router 7，HashRouter |
| 样式 | Tailwind CSS 4 |
| 动画 | Framer Motion 12 |
| 测试 | Vitest 4、Testing Library |
| 规范 | ESLint 10、Prettier 3 |
| 部署 | GitHub Pages、GitHub Actions、Node.js 20 |

## 常用命令

```bash
npm install --legacy-peer-deps
npm run dev
npm test
npm run lint
npm run build
npm run preview
```

GitHub Actions 使用 `npm ci --legacy-peer-deps`，并按 test、lint、build、deploy 顺序执行。

## 架构

```text
src/
├── App.tsx                     路由和首页组合
├── components/                共享组件
│   ├── metronome/             节拍器 UI
│   └── piano/                 钢琴键盘 UI
├── data/                      静态项目与工具配置
├── hooks/                     浏览器生命周期与音频 Hook
├── lib/                       可独立测试的业务逻辑
├── pages/                     路由页面
├── styles/globals.css         Tailwind、主题变量和字体
├── tests/setup.ts             Vitest 设置
└── utils/                     纯工具函数
```

首页及共享外壳位于主入口包。以下非首页路由使用 `React.lazy`：

| 路由 | 页面 |
| --- | --- |
| `/gacha-simulator` | `GachaSimulator.tsx` |
| `/piano` | `PianoPage.tsx` |
| `/metronome` | `MetronomePage.tsx` |
| `/netease-cover` | `NeteaseCoverPage.tsx` |
| `/pixiv-image-extractor` | `PixivCoverPage.tsx` |

插件页通过 `PluginDetailPage.tsx` 配置化复用。

## 数据来源

### `src/data/projects.json`

```ts
interface Project {
  id: string
  name: string
  description: string
  url: string
  status: '开发中' | '已发布' | '已下线' | '在线'
  tags: string[]
  cover?: string
  placeholderGradient?: string
  version?: string
  updatedAt?: string
}
```

### `src/data/timeline.json`

```ts
interface Update {
  id: string
  projectId: string
  content: string
  date: string
}
```

时间线在运行时按日期降序排列，不依赖 JSON 写入顺序。

## 资源规则

- 项目封面放在 `public/covers/`，优先使用 WebP。
- 社交分享图为 `public/og-cover.jpg`。
- 思源宋体存放在 `src/assets/fonts/`，使用子集化 WOFF2。
- 插件截图放在 `public/assets/screenshots/`。
- 不重新加入大体积 OTF 或未压缩项目封面。

## 编码约定

- 使用 React 函数组件和具名 Props `interface`。
- 使用 `@/` 路径别名。
- 业务逻辑优先提取为纯函数并测试，页面不重复实现。
- 不使用 `any`；外部或存储数据先以 `unknown` 校验。
- 注释只解释非显然的约束或意图。
- 遵循现有无分号、单引号、100 字符行宽格式。
- 修改浏览器事件、定时器或 Web Audio 时必须提供清理逻辑。
- 新路由默认使用懒加载，不扩大首页入口包。

## 测试约定

当前测试文件：

- `src/lib/gacha.test.ts`
- `src/utils/timeline.test.ts`
- `src/hooks/useDocumentTitle.test.tsx`
- `src/hooks/usePianoAudio.test.tsx`

行为修复遵循：

1. 添加能复现问题的失败测试。
2. 确认失败原因正确。
3. 编写最小修复。
4. 运行聚焦测试。
5. 运行完整 test、lint、build。

配置、文档和机械资源转换可以不添加单元测试，但必须通过对应构建或产物检查。

## 新增项目或页面

1. 新增页面和 Hash 路由。
2. 非首页页面使用 `React.lazy`。
3. 更新 `src/data/projects.json`。
4. 更新 `src/data/timeline.json`。
5. 更新 `CHANGELOG.md`。
6. 为纯业务行为添加测试。
7. 运行 `npm test`、`npm run lint`、`npm run build`。

## 部署

推送到 `main` 后触发 `.github/workflows/deploy.yml`：

1. 安装依赖；
2. 运行测试；
3. 运行 ESLint；
4. 生产构建；
5. 上传 `dist/`；
6. 部署 GitHub Pages。
