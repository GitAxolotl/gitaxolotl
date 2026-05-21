import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages project page lives under /gitaxolotl/. CI sets BASE_PATH=/gitaxolotl/
  // when building for that target; everything else (Vercel, local dev) stays at /.
  base: process.env.BASE_PATH ?? '/',
})
