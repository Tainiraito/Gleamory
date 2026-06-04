# 音轨分离 — 模型资源

本目录存放本地运行时需要的 ONNX 音轨分离模型 + 必要配置。

## 手动下载说明

由于模型文件较大(单 stem 80-316MB,4 stem 共 165-660MB)且网络拉取容易超时,本仓库 **不** 把模型文件纳入 git,改为运行时下载或预放置。

### 推荐放置方式:把模型放到 `public/models/`,Vite 直接 serve 出去

放好之后运行时通过 `https://gleamory.lovelysia.top/models/<file>.onnx` 访问,首屏加载更快(因为同域 + 走 CDN cache)。

### 推荐模型(按优先级)

| 优先级 | 模型 | 大小 | 来源 | 用途 |
|------|------|------|------|------|
| 🥇 | `htdemucs_ft_vocals_fp16weights.onnx` | ~165 MB | [StemSplitio/htdemucs-ft-onnx](https://huggingface.co/StemSplitio/htdemucs-ft-onnx) | 人声分离(春日影主用例) |
| 🥈 | `htdemucs_ft_drums_fp16weights.onnx` | ~165 MB | 同上 | 鼓组分离 |
| 🥉 | `htdemucs_ft_bass_fp16weights.onnx` | ~165 MB | 同上 | 贝斯分离 |
| 4 | `htdemucs_ft_other_fp16weights.onnx` | ~165 MB | 同上 | 伴奏分离 |

### 下载命令(主人在终端跑)

**方案 A:huggingface-cli(需登录或用 mirror)**

```bash
# 装 huggingface-cli
pip install -U "huggingface_hub[cli]"

# 设置镜像(中国大陆)
export HF_ENDPOINT=https://hf-mirror.com

# 下载 fp16 版本
huggingface-cli download StemSplitio/htdemucs-ft-onnx \
  htdemucs_ft_vocals_fp16weights.onnx \
  --local-dir /home/user/Hermes_Area/Gleamory-audio-separator/public/models/

# 4 stem 全下
for stem in vocals drums bass other; do
  huggingface-cli download StemSplitio/htdemucs-ft-onnx \
    "htdemucs_ft_${stem}_fp16weights.onnx" \
    --local-dir /home/user/Hermes_Area/Gleamory-audio-separator/public/models/
done
```

**方案 B:直接 curl(不需登录)**

```bash
# 单文件(vocals,fp16,~165MB)
curl -L -o /home/user/Hermes_Area/Gleamory-audio-separator/public/models/htdemucs_ft_vocals_fp16weights.onnx \
  https://hf-mirror.com/StemSplitio/htdemucs-ft-onnx/resolve/main/htdemucs_ft_vocals_fp16weights.onnx
```

### 验证

```bash
# 文件应该约 165MB
ls -lh /home/user/Hermes_Area/Gleamory-audio-separator/public/models/

# git 应该忽略这些
git status  # 不应该看到 models/ 下的 .onnx
```

## 备选:运行时从 HuggingFace 拉

如果主人不想预下载,代码会**在用户首次使用时**从 `hf-mirror.com` 拉取到浏览器 IndexedDB。优点:仓库干净、用户自决;缺点:首次使用要等 1-5 分钟下模型。

## 版权 & 致谢

- 模型来自 [StemSplitio/htdemucs-ft-onnx](https://huggingface.co/StemSplitio/htdemucs-ft-onnx),MIT 许可
- 原始 Meta Demucs 模型 © Meta Platforms, Inc.
- 原始音源(春日影)© Bushiroad / BanG Dream! Project — **本项目仅供个人学习使用,请勿用于商业用途或未经授权的二次分发**
