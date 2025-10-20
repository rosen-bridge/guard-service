import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: [
      './tests/setup/setupTests.ts',
      './tests/setup/mockChainHandler.ts',
    ],
    coverage: {
      all: true,
      reporter: ['cobertura', 'lcov', 'text', 'text-summary'],
      provider: 'istanbul',
      include: ['src'],
    },
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  plugins: [wasm(), topLevelAwait()],
});
