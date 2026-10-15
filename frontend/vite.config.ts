import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 4827,
    strictPort: true,
    // Forward API calls to `blackforge serve` so the browser sees one origin.
    proxy: {
      '/api': process.env.BLACKFORGE_API_URL ?? 'http://127.0.0.1:8000',
    },
  },
})
