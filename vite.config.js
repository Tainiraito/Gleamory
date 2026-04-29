import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    watch: {
      usePolling: true,   // 启用轮询，兼容 WSL 文件监听
      interval: 500       // 每 500ms 检查一次变化
    }
  }
})
