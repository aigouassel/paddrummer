import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    // The domain layer is pure TypeScript, so the default Node
    // environment is correct: no jsdom, no AudioContext, no mocks.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
