import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const BASE_PATH = '/MiauDelier_Manager/'

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MiauDelier Manager',
        short_name: 'MiauDelier',
        description: 'Gestão de produção, custos e financeiro para ateliê de resina epóxi.',
        theme_color: '#2F5D5A',
        background_color: '#FAF6EF',
        display: 'standalone',
        lang: 'pt-BR',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
})
