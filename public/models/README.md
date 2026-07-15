# 音轨分离模型资源

本目录只保留运行时模型的下载与校验说明。ONNX 权重体积较大，不提交到 Git；实际模型清单、下载顺序和推理参数以 `src/lib/onnx/modelRegistry.ts` 为准。

## 运行时策略

- 浏览器按注册表中的 `downloadUrls` 顺序尝试下载，校验通过后写入 IndexedDB。
- Spleeter 使用固定上游提交，依次尝试 Hugging Face 主站、镜像和可选本地文件。
- HT-Demucs 和 UVR 的远程与本地回退路由注册表管理；开发代理只在 Vite 开发服务器中有效。
- 本地回退文件仅供开发和私有部署，`public/models/**/*.onnx` 和 `public/models/**/*.bin` 已由 `.gitignore` 排除。

## Spleeter 2-stem

来源：[csukuangfj/sherpa-onnx-spleeter-2stems](https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-2stems/tree/7001ba316a615cacddb3f9ef3ec416661a277e26)

固定版本：`7001ba316a615cacddb3f9ef3ec416661a277e26`

| 文件 | 字节数 | SHA-256 |
| --- | ---: | --- |
| `vocals.onnx` | 39,318,336 | `bdc16ab6bf6117ddd4842c19e80e40e2be188fc555295064d424616b0224ac97` |
| `accompaniment.onnx` | 39,318,343 | `671ace17acd3720674a2bc14de32ac6292453dec20d9eb0ba4255d4ad8e3d8c0` |

需要本地回退时，在仓库根目录执行：

```bash
mkdir -p public/models/spleeter
curl -L --fail --retry 3 \
  -o public/models/spleeter/vocals.onnx \
  "https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-2stems/resolve/7001ba316a615cacddb3f9ef3ec416661a277e26/vocals.onnx"
curl -L --fail --retry 3 \
  -o public/models/spleeter/accompaniment.onnx \
  "https://huggingface.co/csukuangfj/sherpa-onnx-spleeter-2stems/resolve/7001ba316a615cacddb3f9ef3ec416661a277e26/accompaniment.onnx"
sha256sum public/models/spleeter/*.onnx
```

如需使用代理，请通过本机 `HTTPS_PROXY` 环境变量配置，不要把个人代理地址写入仓库。

## 校验与维护

- 新增或更换模型时，必须记录固定版本、精确大小、校验值、来源和许可信息。
- 下载内容若是 HTML 错误页、Git LFS pointer、截断文件或明显过小的响应，必须拒绝缓存和推理。
- 调整模型来源后，至少运行 `npm test -- src/lib/onnx/modelRegistry.test.ts`、`npm run lint` 和 `npm run build`。

## 许可说明

Spleeter 模型仓库当前没有提供模型卡或权重许可证，因此本仓库不重新分发这两个权重文件。上游代码项目 [Deezer Spleeter](https://github.com/deezer/spleeter) 采用 MIT 许可，[sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) 采用 Apache-2.0 许可；这些代码许可不应自动视为模型权重许可。
