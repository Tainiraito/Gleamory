# Changelog

本项目遵循[语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Fixed

- 路由页面卸载时恢复之前的网页标题。
- 时间线按实际日期降序排列，无效日期稳定排在最后。
- 钢琴页面卸载时释放活动音符并关闭 Web Audio 上下文。
- 修复抽卡卡牌网格的 React Hook 依赖警告。
- 补充实际存在的 Open Graph 和 Twitter 分享图。

### Changed

- 抽卡页面改为复用 `src/lib/gacha.ts` 中经过测试的文本处理、洗牌和持久化逻辑。
- 抽卡测试改为覆盖当前生产状态结构，不再验证已废弃模型。
- 非首页路由使用 `React.lazy` 独立分包。
- 思源宋体从完整 OTF 改为子集化 WOFF2。
- 项目封面从 PNG 改为压缩 WebP，并清理未引用资源。
- README、工程说明和需求文档同步为当前 React 架构。

### CI

- GitHub Pages 部署前依次执行测试、ESLint 和生产构建。

## [3.0.0] - 2026-05-18

### Changed

- 从 Vue 3 迁移到 React 19 和 TypeScript。
- 从 Tailwind CSS 3 迁移到 Tailwind CSS 4 CSS-first 配置。
- 使用 Framer Motion 统一页面动画。
- 首页重构为暖纸杂志布局，增加实时日历和每日诗句。
- 保留 GitHub Pages 自动部署和自定义域名。

### Added

- 翻牌抽卡、极简钢琴和节拍器。
- 网易云封面提取与 Pixiv 插画下载插件说明页。
- 共享 SiteHeader、项目页标题、返回页脚和插件详情模板。

更早版本的详细演进记录保留在 Git 提交历史中。
