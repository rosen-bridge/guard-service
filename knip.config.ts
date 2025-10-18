import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignoreDependencies: ['typeorm/*'],
  ignoreBinaries: ['typeorm'],
};

export default config;
