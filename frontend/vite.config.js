import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file from the project root
  const env = loadEnv(mode, path.resolve(process.cwd(), '..'), '')
  
  return {
    plugins: [react()],
    server: {
      port: parseInt(env.PORT) || 5173,
      proxy: {
        '/detect': {
          target: env.AI_SERVICE_URL || 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  }
})