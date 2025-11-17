import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  ignoreDependencies: ['typeorm/*', 'pg'],
  ignoreBinaries: ['typeorm'],
};

export default config;
