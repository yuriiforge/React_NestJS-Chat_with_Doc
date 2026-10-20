import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Same-origin /api in dev, so no CORS setup is needed on the backend.
    proxy: {
      '/api': process.env.API_URL ?? 'http://localhost:3000',
    },
  },
})
