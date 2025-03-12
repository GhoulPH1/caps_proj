import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const target = process.env.VITE_BACKEND_URL || "http://localhost:3000";
// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{ 
    proxy:{ 
      "/api": {
        target,
        changeOrigin: true,
        secure: false,
      }  // proxy all requests starting with /api to the backend server
    }
  }
})
