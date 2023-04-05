import { defineConfig } from 'vitest/config';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: [
      './testsV2/setup/mockDialer.ts',
      './testsV2/setup/setupTests.ts',
    ],
    coverage: {
      all: true,
      reporter: ['cobertura', 'text', 'text-summary'],
    },
    deps: {
      inline: [/ergo-lib-wasm-browser/, /@rosen-bridge/, /@lodash-es/],
    },
    environment: 'node',
    transformMode: {
      web: [/\.([cm]?[jt]sx?|json)$/],
    },
  },
  plugins: [wasm(), topLevelAwait()],
  optimizeDeps: {
    disabled: true,
  },
});
