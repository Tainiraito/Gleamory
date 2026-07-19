# 第三方字体声明

Gleamory 将以下开源字体的子集作为本地静态资源分发，不在运行时连接外部字体服务。

| 派生字体 | 官方母版 | 版本 | 许可证 | 用途 |
| --- | --- | --- | --- | --- |
| Gleamory Editorial | Adobe Source Han Serif SC | 2.001 | SIL OFL 1.1 | 品牌、标题、诗词 |
| Gleamory UI | Adobe Source Han Sans SC | 2.005 | SIL OFL 1.1 | 正文、控件、提示 |
| Gleamory Mono | Adobe Source Code Pro | 2.042 | SIL OFL 1.1 | 数字、时间、坐标、日志、代码 |

这些文件是为 Gleamory 生成的修改版本。由于官方字体保留 `Source` 字体名称，派生字体的内部 family 已改为 `Gleamory Editorial`、`Gleamory UI` 和 `Gleamory Mono`。版权、版本、许可证及许可证 URL 仍保留在字体元数据中。

- [思源宋体与思源黑体许可证](/licenses/fonts/source-han-fonts-OFL-1.1.txt)
- [Source Code Pro 许可证](/licenses/fonts/source-code-pro-OFL-1.1.txt)
- 母版 URL、母版 SHA-256、子集覆盖、生成命令和最终文件 SHA-256 见 [`src/assets/fonts/manifest.json`](src/assets/fonts/manifest.json)。

字体文件及其修改版本继续遵循 SIL Open Font License 1.1；项目其余代码的许可证不因字体嵌入而改变。
