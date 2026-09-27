import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
  resolve: {
    alias: { '@': '/src' },
  },
})
