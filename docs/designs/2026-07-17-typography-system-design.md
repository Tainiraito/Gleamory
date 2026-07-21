# Gleamory 全站三层字体体系设计

> 状态：当前规范
>
> 日期：2026-07-17
>
> 范围：全站基础排版；不改变布局、配色与暖纸视觉语言

## 1. 目标

解决部分 Windows 设备上同一句中文因系统字体、合成字重、缺字回退和过小字号混用而出现的清晰度不一致，同时建立可维护的表达、产品和数据三层字体角色。

本规范参考 [Carbon Typography](https://carbondesignsystem.com/elements/typography/overview/) 的 expressive/productive 分工、[Ant Design 字体规范](https://ant.design/docs/spec/font-cn/) 的界面字阶控制，以及 [W3C 中文排版需求](https://www.w3.org/TR/clreq/) 对复杂汉字小字号可读性的说明。

## 2. 字体角色

| 层级 | Token | 派生字体 | 官方母版 | 字重 | 使用场景 |
| --- | --- | --- | --- | --- | --- |
| 表达 | `font-display` | Gleamory Editorial | Source Han Serif SC 2.001 | 500、600 | 品牌、页面标题、章节标题、诗词 |
| 产品 | `font-sans` | Gleamory UI | Source Han Sans SC 2.005 | 400、500 | 正文、按钮、输入、下拉、提示、中文图表说明 |
| 数据 | `font-mono` | Gleamory Mono | Source Code Pro 2.042 | 400、500 | 数字、时间、坐标、版本、日志、代码 |

`font-kai` 已删除。诗词属于表达文本，使用 Editorial 500，而不是再引入楷体。Emoji、扑克牌符号和特殊装饰字符允许沿 token 尾部的通用 family 回退，不扩展 CJK 字体。

## 3. 字体接口

```css
--font-display: 'Gleamory Editorial', 'Gleamory UI', serif;
--font-sans: 'Gleamory UI', sans-serif;
--font-mono: 'Gleamory Mono', 'Gleamory UI', monospace;
```

- `body`、按钮、输入框、下拉框和文本域继承 `font-sans`。
- SVG 容器显式使用 UI；数字、音名、时间和频率节点单独使用 Mono。
- 全局设置 `font-synthesis: none`，禁止浏览器合成不存在的粗体或斜体。
- 只使用 400、500、600；UI 和 Mono 不请求 600，Editorial 不请求 400。

## 4. 字阶

| 场景 | 字号 / 行高 | 字体 / 字重 |
| --- | --- | --- |
| 短数字、单位图表刻度 | 11px / 16px | Mono 400/500 |
| 日期、版本、辅助信息 | 12px / 18px | UI 或 Mono 400 |
| 按钮、输入、提示、普通工具文字 | 14px / 22px | UI 400/500 |
| 长正文 | 16px / 28px | UI 400 |
| 诗词 | 20–24px / 1.85 | Editorial 500 |
| 区块标题 | 20–24px | Editorial 600 |
| 页面标题 | 32–48px | Editorial 600 |
| 首页品牌 | 48–60px | Editorial 600 |

中文界面文字不得小于 12px，唯一例外是短数字和单位的图表刻度。长中文正文宽度控制在约 `40–48ch`。

## 5. 字距与强调

- 中文正文和标题使用正常字距；负字距仅用于纯拉丁音名或数据。
- 中文小标签字距不超过 `0.08em`；纯拉丁大写标签可按场景放宽。
- 中文不使用斜体。题记感通过次级色、短横线、左侧细线和留白表达。
- 强调优先使用字号、色阶、间距和现有 500/600 字重，不使用 650、700、750。
- Mono 不承载中文标签；同一行同时包含中文说明和数据时拆分嵌套 span。

## 6. 动态字形覆盖

| 文件 | 覆盖 | 场景 |
| --- | --- | --- |
| `GleamoryEditorial-Medium.woff2` | 完整 GB2312 + 当前运行时字符 | 远程诗词、动态编辑内容 |
| `GleamoryEditorial-SemiBold.woff2` | 完整 GB2312 + 当前运行时字符 | 品牌、页面标题与动态章节标题 |
| `GleamoryUI-Regular.woff2` | 完整 GB2312 + 当前运行时字符 | 正文、用户输入、文件名、动态提示 |
| `GleamoryUI-Medium.woff2` | 完整 GB2312 + 当前运行时字符 | 控件、标签、状态与动态强调文字 |
| `GleamoryMono-Regular.woff2` | Latin-1、单位、货币和数学符号 | 数据、日志、代码 |
| `GleamoryMono-Medium.woff2` | 同上 | 强调数据值 |

四份中文字体统一覆盖 GB2312，避免新增常用简体中文时因字重职责不同再次生成字体。动态内容超出 GB2312 时允许按 token 回退，并先通过真实内容确认缺口；不为假设性字符加入完整 CJK 字库。

## 7. 分发与维护

- 六份字体均为 SIL OFL 1.1 派生字体，内部 family 已移除 Reserved Font Name `Source`。
- 可部署许可证位于 `public/licenses/fonts/`，第三方说明见 `THIRD_PARTY_NOTICES.md`。
- `src/assets/fonts/manifest.json` 记录母版版本、固定发布 URL、母版与输出 SHA-256、覆盖码位、场景和体积。
- 完整 OTF/TTF 只用于本地生成，不进入仓库；不增加 npm 运行时字体依赖。
- 新增运行时字符后执行 `npm run check:fonts`。失败时取得 manifest 锁定的六份官方母版，安装临时 FontTools 环境并执行：

```bash
PYTHONPATH=/path/to/fonttools python3 scripts/build-font-assets.py /path/to/official-otf
npm run check:fonts
```

## 8. 验收

- 页面无外部字体请求，源码无 `font-kai`、系统字体主来源、650/700/750、中文斜体和低于 11px 的文字。
- 四份中文字体均覆盖完整 GB2312 与当前运行时字符，Mono 不包含中文。
- 内部 family 为 Gleamory 派生名称，版权、版本、OFL 文本和许可证 URL 完整。
- CJK 单文件不超过 2.2 MB，Mono 不超过 100 KB，总字体资产不超过 7.5 MB。
- Windows Chrome/Edge 在 100%、125%、150% 缩放及 375px、1440px、1920px 视口完成真实设备视觉确认。
