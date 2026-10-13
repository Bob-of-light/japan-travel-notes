import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 專案倉庫的部署路徑。
// 本機開發與測試時 server 會自動處理這個前綴，兩邊都能正常運作。
const BASE = '/japan-travel-notes/'

export default defineConfig({
  base: BASE,
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})