import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // `--mode demo` bundles the whole app into ONE self-contained index.html
  // (inlined JS/CSS) that can be shared and opened directly from disk.
  plugins: [react(), tailwindcss(), ...(mode === 'demo' ? [viteSingleFile()] : [])],
  base: mode === 'demo' ? './' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
}))
