import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { defineConfig, mergeConfig } from 'vitest/config';

import configShared from '../../vitest.shared';

const projectSpecific = defineConfig({
  test: {
    setupFiles: [
      './tests/setup/setupTests.ts',
      './tests/setup/mockChainHandler.ts',
    ],
    coverage: {
      reporter: ['cobertura', 'lcov', 'text', 'text-summary'],
      include: ['src'],
    },
  },
  plugins: [wasm(), topLevelAwait()],
});

export default mergeConfig(configShared, projectSpecific);
