import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const target = process.env.VITE_BACKEND_URL || "http://localhost:3000";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss(),],
  server:{ 
    proxy:{ 
      "/api": {
        target,
        changeOrigin: true,
        secure: false,
        timeout: 30000,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      }  // proxy all requests starting with /api to the backend server
    }
  }
})
