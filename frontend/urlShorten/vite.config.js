import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // proxy /api calls to the backend during local dev
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
