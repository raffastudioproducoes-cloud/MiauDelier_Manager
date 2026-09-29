import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify('test-version'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      reportsDirectory: 'coverage',
    },
    exclude: [...configDefaults.exclude, '**/.worktrees/**'],
  },
  resolve: {
    alias: { '@': '/src' },
  },
})
