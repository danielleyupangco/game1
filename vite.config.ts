import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// The artifact build has to end up as one file, so code splitting and the
// lazy route/ExcelJS chunks are collapsed into a single bundle for it.
const singleFile = process.env.ARTIFACT === '1'

export default defineConfig({
  base: './',
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    cssCodeSplit: !singleFile,
    assetsInlineLimit: singleFile ? 100_000_000 : 4096,
    rolldownOptions: singleFile
      ? { output: { inlineDynamicImports: true, entryFileNames: 'app.js', assetFileNames: 'app.[ext]' } }
      : undefined,
  },
})
