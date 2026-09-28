import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const vitest = fileURLToPath(import.meta.resolve('vitest/vitest.mjs'));
const result = spawnSync(process.execPath, [vitest, 'run'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--import tsx']
      .filter(Boolean)
      .join(' '),
  },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
