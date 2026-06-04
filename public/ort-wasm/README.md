# ort-wasm 占位

本目录存放 onnxruntime-web 的 WASM 文件,已通过 `public/ort-wasm/` 直连 serve。

**当前状态**:
- ✅ 已下载 `ort-wasm-simd-threaded.wasm` (~11 MB)
- ✅ 已下载 `ort-wasm-simd-threaded.jsep.wasm` (~14 MB)
- ✅ 已下载 `ort-wasm-simd-threaded.mjs` (~25 KB)
- 📦 `onnxruntime-web@1.20.1` 已通过 npm 安装(`node_modules/onnxruntime-web/`)

**使用方式**:在 `src/lib/onnx/backend.ts` 中设置 `ort.env.wasm.wasmPaths = '/ort-wasm/'` 即可。

**为什么不全用 npm 包**:
Vite 默认不会把 `node_modules/onnxruntime-web/dist/*.wasm` 复制到 dist 输出目录,需要额外的 vite-plugin-wasm 或手动复制。手放在 `public/ort-wasm/` 是最稳的方案。
