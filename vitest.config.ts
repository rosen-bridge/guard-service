import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  test: {
    globals: true,
    reporters: 'verbose',
    setupFiles: [
      './testsV2/setup/mockDialer.ts',
      './testsV2/setup/setupTests.ts',
      './testsV2/setup/mockMultiSig.ts',
      './testsV2/setup/mockChainHandler.ts',
    ],
    coverage: {
      all: true,
      reporter: ['cobertura', 'lcov', 'text', 'text-summary'],
      provider: 'istanbul',
      include: ['src'],
    },
    deps: {
      inline: [
        /ergo-lib-wasm-browser/,
        /@rosen-bridge/,
        /@rosen-chains/,
        /@lodash-es/,
      ],
      registerNodeLoader: true,
    },
    environment: 'node',
    transformMode: {
      web: [/\.([cm]?[jt]sx?|json)$/],
    },
    singleThread: true,
  },
  plugins: [wasm(), topLevelAwait()],
  optimizeDeps: {
    disabled: true,
  },
});
