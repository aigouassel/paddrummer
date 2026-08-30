import { defineConfig } from 'vitest/config'

/**
 * One run over every workspace, so `yarn test` still means what it meant
 * before the split. Each project brings its own config: the domain packages
 * run in Node with no DOM, and the app's comes from its Vite config, so a
 * package is tested the same way whether it is reached from here or from
 * `yarn workspace @paddrummer/<name> test`.
 */
export default defineConfig({
  test: { projects: ['packages/*', 'apps/web'] },
})
