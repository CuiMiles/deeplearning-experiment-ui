import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' 让打包产物可以放在任意目录（本地静态服务器 / 内网 / 直接拷贝）
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { chunkSizeWarningLimit: 1500 },
})
