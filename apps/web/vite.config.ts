import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

/**
 * Where the app will be served from.
 *
 * GitHub Pages puts a project site under `/<repo>/`, not at the root, and a
 * build made for `/` loads none of its assets there. CI passes the path it is
 * deploying to; everything else — `yarn dev`, `yarn preview`, a local build —
 * gets `/` and is unaffected.
 *
 * The trailing slash is added rather than required, because the value comes
 * from `actions/configure-pages`, which reports `/paddrummer` without one.
 */
// Declared here rather than by adding @types/node: this config is the only
// place in the app that touches a Node global, and pulling Node's types into
// the app's scope would make `process` look available to browser code too.
declare const process: { env: Record<string, string | undefined> }

const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base: base.endsWith('/') ? base : `${base}/`,
  plugins: [react()],
  test: {
    // The domain layer is pure TypeScript, so the default Node
    // environment is correct: no jsdom, no AudioContext, no mocks.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
