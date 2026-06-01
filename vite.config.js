import react from '@vitejs/plugin-react'
import path from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  preview: {
    port: parseInt(process.env.PORT) || 4173,
    host: true,
  },
  server: {
    port: parseInt(process.env.PORT) || 5173,
    host: true,
  },
});