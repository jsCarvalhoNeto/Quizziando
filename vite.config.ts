import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Honra a porta atribuída via variável de ambiente PORT (usada pelo harness de preview)
    port: process.env.PORT ? Number(process.env.PORT) : undefined
  },
  build: {
    target: 'es2015'
  },
  optimizeDeps: {
    exclude: ['sql.js']
  },
  assetsInclude: ['**/*.wasm']
})
