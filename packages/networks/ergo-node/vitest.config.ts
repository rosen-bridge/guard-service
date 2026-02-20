import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { defineProject, mergeConfig } from 'vitest/config';

import configShared from '../../../vitest.shared';

export default mergeConfig(
  configShared,
  defineProject({
    plugins: [wasm(), topLevelAwait()],
  }),
);
