import { describe, expect, it } from 'vitest';

import { HealthStatusLevel } from '@rosen-bridge/health-check';

import { ZcashNodeHealthCheckParam } from '../../src/guard/zcashHealthCheck';

describe('ZcashNodeHealthCheckParam', () => {
  it('starts broken and becomes healthy after a valid node height', async () => {
    const check = new ZcashNodeHealthCheckParam(
      async () => ({ height: 10 }),
      30,
    );

    expect(check.getHealthStatus()).toBe(HealthStatusLevel.BROKEN);
    await check.update();
    expect(check.getHealthStatus()).toBe(HealthStatusLevel.HEALTHY);
  });

  it('becomes unstable when the tip does not progress through the configured interval', async () => {
    let time = 1_000;
    const check = new ZcashNodeHealthCheckParam(
      async () => ({ height: 10 }),
      30,
      () => time,
    );

    await check.update();
    time += 30_000;
    await check.update();

    expect(check.getHealthStatus()).toBe(HealthStatusLevel.UNSTABLE);
  });

  it('becomes broken after a successful check when RPC reading fails', async () => {
    let fail = false;
    const check = new ZcashNodeHealthCheckParam(async () => {
      if (fail) throw Error('private RPC details');
      return { height: 10 };
    }, 30);

    await check.update();
    fail = true;
    await check.update();

    expect(check.getHealthStatus()).toBe(HealthStatusLevel.BROKEN);
    expect(check.getDetails()).not.toContain('private RPC details');
  });

  it('resets a lower recovered height without reporting a sync failure', async () => {
    let height = 10;
    let time = 1_000;
    const check = new ZcashNodeHealthCheckParam(
      async () => ({ height }),
      30,
      () => time,
    );

    await check.update();
    height = 9;
    time += 31_000;
    await check.update();

    expect(check.getHealthStatus()).toBe(HealthStatusLevel.HEALTHY);
  });

  it('does not preserve a healthy result across a backwards clock', async () => {
    let time = 1_000;
    const check = new ZcashNodeHealthCheckParam(
      async () => ({ height: 10 }),
      30,
      () => time,
    );

    await check.update();
    time = 999;
    await check.update();

    expect(check.getHealthStatus()).toBe(HealthStatusLevel.UNSTABLE);
  });

  it('rejects a non-positive progress interval', () => {
    expect(
      () => new ZcashNodeHealthCheckParam(async () => ({ height: 1 }), 0),
    ).toThrow('maximumNoProgressSeconds');
  });
});
