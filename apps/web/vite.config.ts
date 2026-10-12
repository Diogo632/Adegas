import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // A tela do assistente (MCP + Gemini) é um pedaço maior, mas só baixa quando alguém abre.
  build: { chunkSizeWarningLimit: 800 },
})
