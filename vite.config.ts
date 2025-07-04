import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  base: "/Word-Game/",
  plugins: [react()],
    build: {
    outDir: './build'
  },
  server: {
    watch: {
      usePolling: true
    }
  }
})
