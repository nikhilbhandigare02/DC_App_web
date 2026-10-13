import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080,
    // Fail instead of silently moving to another port if 8080 is taken.
    strictPort: true,
  },
  preview: {
    port: 8080,
    strictPort: true,
  },
})
