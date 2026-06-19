# 音轨分离 — 模型资源

本目录存放本地运行时需要的 ONNX 音轨分离模型 + 必要配置。

## ✅ 当前状态(2026-06-04)

`htdemucs_ft` 的 **4 个 fp16 stem 模型已全部下载就位**(共用 632 MB):

| 文件 | 大小 | 状态 |
|------|------|------|
| `htdemucs_ft_vocals_fp16weights.onnx` | 158 MB | ✅ 已下载 |
| `htdemucs_ft_drums_fp16weights.onnx` | 158 MB | ✅ 已下载 |
| `htdemucs_ft_bass_fp16weights.onnx` | 158 MB | ✅ 已下载 |
| `htdemucs_ft_other_fp16weights.onnx` | 158 MB | ✅ 已下载 |

> ⚠️ 这些文件**已通过 .gitignore 排除**(`public/models/*.onnx`),不进 git。  
> 部署到 GitHub Pages 时需手动上传到生产服务器(详见 `AGENTS.md` 部署流程)。

## 手动下载说明(如果需要重新下/换模型)

### 推荐模型(已采用 fp16 版)

| 优先级 | 模型 | 大小 | 来源 | 用途 |
|------|------|------|------|------|
| 🥇 | `htdemucs_ft_vocals_fp16weights.onnx` | 158 MB | [StemSplitio/htdemucs-ft-onnx](https://huggingface.co/StemSplitio/htdemucs-ft-onnx) | 人声分离(春日影主用例) |
| 🥈 | `htdemucs_ft_drums_fp16weights.onnx` | 158 MB | 同上 | 鼓组分离 |
| 🥉 | `htdemucs_ft_bass_fp16weights.onnx` | 158 MB | 同上 | 贝斯分离 |
| 4 | `htdemucs_ft_other_fp16weights.onnx` | 158 MB | 同上 | 伴奏分离 |

### 下载命令(主人在终端跑)

**方案 A:huggingface-cli(中国大陆推荐用 mirror)**

```bash
# 装工具
pip install -U "huggingface_hub[cli]"

# 设置镜像
export HF_ENDPOINT=https://hf-mirror.com

# 下 4 个 fp16 stem
for stem in vocals drums bass other; do
  huggingface-cli download StemSplitio/htdemucs-ft-onnx \
    "htdemucs_ft_${stem}_fp16weights.onnx" \
    --local-dir /home/lumine/Hermes_Area/Gleamory-audio-separator/public/models/
done
```

**方案 B:直接 curl(直连 hf-mirror.com,实测 12-20MB/s)**

```bash
mkdir -p /home/lumine/Hermes_Area/Gleamory-audio-separator/public/models/
for stem in vocals drums bass other; do
  curl -L -C- -o "/home/lumine/Hermes_Area/Gleamory-audio-separator/public/models/htdemucs_ft_${stem}_fp16weights.onnx" \
    "https://hf-mirror.com/StemSplitio/htdemucs-ft-onnx/resolve/main/htdemucs_ft_${stem}_fp16weights.onnx"
done
```

**方案 C:走代理(如果直连不通)**

```bash
for stem in vocals drums bass other; do
  curl -L -x "http://192.168.31.45:7890" \
    -o "/home/lumine/Hermes_Area/Gleamory-audio-separator/public/models/htdemucs_ft_${stem}_fp16weights.onnx" \
    "https://hf-mirror.com/StemSplitio/htdemucs-ft-onnx/resolve/main/htdemucs_ft_${stem}_fp16weights.onnx"
done
```

### 验证

```bash
# 4 个文件应该都是 ~158MB
ls -lh /home/lumine/Hermes_Area/Gleamory-audio-separator/public/models/

# 校验 ONNX 文件头
head -c 16 /home/lumine/Hermes_Area/Gleamory-audio-separator/public/models/*.onnx | xxd | head -4
# 应该看到 "pytorch" magic
```

## 版权 & 致谢

- 模型来自 [StemSplitio/htdemucs-ft-onnx](https://huggingface.co/StemSplitio/htdemucs-ft-onnx),MIT 许可
- 原始 Meta Demucs 模型 © Meta Platforms, Inc.
- 原始音源(春日影)© Bushiroad / BanG Dream! Project — **本项目仅供个人学习使用,请勿用于商业用途或未经授权的二次分发**
