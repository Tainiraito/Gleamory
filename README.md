# Gleamory 微光集

个人微产品入口站，用统一的暖纸杂志风格展示项目，并承载可直接使用的小工具与浏览器插件说明页。

在线地址：[gleamory.lovelysia.top](https://gleamory.lovelysia.top)

## 当前内容

### 首页

- 仅展示站点标题与简介的三图主视觉轮播，跨满内容容器并将唯一一组控制放在图片外
- 以“卷一、卷二、卷三”区分“弦歌有声、丹青拾光、浮生半日”的单列项目目录
- 与项目目录共用开放式排版语言的实时月历和每日诗笺，诗词接口失败时使用本地诗词库
- 只记录项目上线、核心能力大改和重大版本的里程碑时间线
- 超宽屏将统一排版的月历、每日诗笺和“流光忆庭”收纳为右侧栏，整套内容限制在居中的 90rem 内；普通桌面与移动端自动恢复下方布局

### 站内工具

- `#/gacha-simulator`：翻牌抽卡
- `#/piano`：Web Audio 极简钢琴
- `#/metronome`：支持小节编辑、独立细分、变速模式和本地音量记忆的节拍器
- `#/pitch-detector`：浏览器本地音高检测，支持空格开始/暂停实时采集或上传回放、手动选择麦克风、双手柄时间轴、稳定连续曲线、电脑音频、上传文件、录音回放、钢琴参照音和分轨结果分析
- `#/guitar-fretboard-trainer`：通过五类可配置测验、单题计时与准确率、音阶/和弦地图、吉他采样音色和四套拟真指板外观熟悉全指板音名
- `#/audio-separator`：浏览器本地音轨分离，支持 HT-Demucs 高质量四分轨

### 插件说明页

- `#/netease-cover`：网易云封面提取
- `#/pixiv-image-extractor`：Pixiv 插画下载

## 技术栈

| 类别 | 技术                           |
| ---- | ------------------------------ |
| 前端 | React 19、TypeScript           |
| 构建 | Vite 6                         |
| 路由 | React Router 7、HashRouter     |
| 样式 | Tailwind CSS 4、CSS 自定义属性 |
| 动画 | Framer Motion 12               |
| 测试 | Vitest 4、Testing Library      |
| 部署 | GitHub Pages、GitHub Actions   |

非首页路由使用 `React.lazy` 分包。字体采用本地三层体系：思源宋体负责品牌、标题与诗词，思源黑体负责正文、控件与提示，Source Code Pro 负责数字、时间、坐标、日志和代码。六份派生 WOFF2 均在仓库内分发，不请求外部字体服务；四份中文字重统一覆盖完整 GB2312，字体许可证与来源见 [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md)。项目封面采用 WebP。

## 本地开发

```bash
npm ci --legacy-peer-deps
npm run dev
```

质量检查：

```bash
npm test
npm run lint
npm run check:fonts
npm run build
```

新增运行时可见字符后，`npm run check:fonts` 会要求同步字体子集与 manifest。字体母版、版本、SHA-256 和生成命令记录在 `src/assets/fonts/manifest.json`；完整 OTF/TTF 不进入仓库。

预览生产构建：

```bash
npm run preview
```

## 数据维护

项目元数据位于 `src/data/projects.json`，更新时间线位于 `src/data/timeline.json`。

新增或发布项目时同步更新：

1. `src/data/projects.json`
2. `src/data/timeline.json`
3. `README.md` 与 `CHANGELOG.md`
4. `docs/requirements.md`
5. 当前设计状态与对应实施计划
6. 对应路由或外部链接

提交前必须完成跨文件一致性检查，并运行测试、Lint 和生产构建。详细闭环与 `.gitignore` 管理边界见 `AGENTS.md`。

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
