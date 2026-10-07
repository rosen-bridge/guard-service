import { HealthStatusLevel } from '@rosen-bridge/health-check';
import { LogLevelHealthCheck } from '@rosen-bridge/log-level-check';

import Configs from '../../src/configs/configs';

describe('Configs', () => {
  describe('logDuration', () => {
    /**
     * @target the log health check window should equal the configured
     * `healthCheck.logs.duration` (600 seconds by default), not 1000 times
     * that value
     * @dependencies
     * - Configs
     * - LogLevelHealthCheck
     * @scenario
     * - read Configs.logDuration
     * - construct a LogLevelHealthCheck with it, as getHealthCheck does
     * - check the resulting time window
     * @expected
     * - Configs.logDuration should be 600 (seconds)
     * - the health check time window should be 600 * 1000 milliseconds
     */
    it('should pass the configured duration to LogLevelHealthCheck in seconds', () => {
      expect(Configs.logDuration).to.equal(600);

      const warnLogCheck = new LogLevelHealthCheck(
        HealthStatusLevel.UNSTABLE,
        Configs.warnLogAllowedCount,
        Configs.logDuration,
        'warn',
      );
      const timeWindow = (warnLogCheck as unknown as { timeWindow: number })
        .timeWindow;
      expect(timeWindow).to.equal(600 * 1000);
    });
  });
});
