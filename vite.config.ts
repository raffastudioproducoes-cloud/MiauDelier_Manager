import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import packageJson from './package.json'

const BASE_PATH = '/MiauDelier_Manager/'

export default defineConfig({
  base: BASE_PATH,
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'MiauDelier Manager',
        short_name: 'MiauDelier',
        description: 'Gestão de produção, custos e financeiro para ateliê de resina epóxi.',
        theme_color: '#2F5D5A',
        background_color: '#FAF6EF',
        display: 'standalone',
        start_url: '.',
        lang: 'pt-BR',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png'
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
})
