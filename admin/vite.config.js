import { defineConfig, searchForWorkspaceRoot } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { port: 5174, strictPort: true,
  fs: { allow: [searchForWorkspaceRoot(fileURLToPath(new URL('.', import.meta.url))), fileURLToPath(new URL('../backend/src/config/content-categories.js', import.meta.url))] },
} })
