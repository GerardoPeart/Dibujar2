import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Socket.IO usa esta ruta; la proxyamos al backend
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true,
      }
    }
  }
})
