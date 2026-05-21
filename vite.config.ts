import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages project page lives under /gitaxolotl/. CI sets BASE_PATH=/gitaxolotl/
  // when building for that target; everything else (Vercel, local dev) stays at /.
  base: '/gitaxolotl/',
})
