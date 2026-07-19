# Gleamory 全站三层字体体系实施计划

> 状态：代码实施完成，等待真实设备视觉验收
>
> 日期：2026-07-17
>
> 分支：`feat/source-han-typography`

## 1. 字体资产

- [x] 锁定 Source Han Serif 2.001、Source Han Sans 2.005、Source Code Pro 2.042 官方发布母版和 SHA-256。
- [x] 生成 Editorial、UI、Mono 共六份本地 WOFF2，不提交完整 OTF/TTF。
- [x] 动态 Editorial 500 与 UI 400 覆盖完整 GB2312，固定字重覆盖当前运行时字符。
- [x] 派生字体内部名称改为 Gleamory family，保留版权、版本、OFL 与许可证 URL。
- [x] 新增可部署许可证、`THIRD_PARTY_NOTICES.md` 和字体 manifest。
- [x] 字体资产总计 3,888,100 bytes，全部满足单文件与总量预算。

## 2. 样式迁移

- [x] 恢复 `font-display`、`font-sans`、`font-mono` 的三层语义并删除 `font-kai`。
- [x] body、原生控件与 SVG 中文使用 UI；诗词使用 Editorial；数字、时间和坐标使用 Mono。
- [x] 设置 `font-synthesis: none`，移除 650/700/750 和中文合成斜体。
- [x] 低于 11px 的文字清零；中文界面文字提升到至少 12px。
- [x] 动态诗词和抽卡自定义条目使用具备 GB2312 覆盖的动态字重。
- [x] 中文标签收紧到不超过 `0.08em`，中文标题移除负字距。

## 3. 维护门禁

- [x] 新增 `scripts/build-font-assets.py`，记录唯一生成入口。
- [x] 新增 `npm run check:fonts`，检查运行时字符、字体哈希、单文件及总量预算和静态禁用项。
- [x] PR CI 与 Pages 构建在测试后执行字体检查。
- [x] 同步 README、AGENTS、需求、当前设计、暖纸设计、CHANGELOG 和第三方说明。
- [x] 不更新 `src/data/timeline.json`（“流光忆庭”）。

## 4. 验证

- [x] 运行 172 项既有测试。
- [x] 运行字体覆盖、命名、许可证、哈希和体积检查。
- [x] 运行 ESLint、生产构建与 `git diff --check`。
- [ ] 检查首页、抽卡、节拍器、音高检测、音轨分离、指板训练和插件说明页。
- [ ] 在 Windows Chrome/Edge 的 100%、125%、150% 缩放与 375px、1440px、1920px 视口完成真实设备视觉验收。

最后一项必须由能够访问 WSL 开发服务的用户浏览器确认；构建通过不能代替视觉验收。
