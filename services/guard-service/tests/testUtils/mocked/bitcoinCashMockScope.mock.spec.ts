import { describe, expect, it, vi } from 'vitest';

import { preserveBitcoinCashMocks } from './bitcoinCashMockScope.mock';

describe('preserveBitcoinCashMocks', () => {
  /**
   * @target preserveBitcoinCashMocks - preserves setup spy identity, behavior
   * and queued responses
   * @dependencies Existing fixture spy with an implementation and one-shot
   * queue
   * @scenario Replace its behavior inside BCH scope, then restore twice
   * @expected Preserve exact descriptor, identity, queue and baseline behavior
   */
  it('preserves setup spy identity, behavior and queued responses', () => {
    const existing = vi.fn(() => 'baseline').mockReturnValueOnce('queued');
    const target = { call: existing };
    const descriptor = Object.getOwnPropertyDescriptor(target, 'call');
    const restore = preserveBitcoinCashMocks([[target, ['call']]]);
    vi.spyOn(target, 'call').mockReturnValue('bch');
    expect(target.call()).toEqual('bch');
    expect(existing).not.toHaveBeenCalled();
    restore();
    restore();
    expect(Object.getOwnPropertyDescriptor(target, 'call')).toEqual(descriptor);
    expect(target.call).toBe(existing);
    expect(target.call()).toEqual('queued');
    expect(target.call()).toEqual('baseline');
  });

  /**
   * @target preserveBitcoinCashMocks - validates the whole owned target set
   * before replacing any method
   * @dependencies One callable fixture and one invalid own property
   * @scenario Supply both targets in the same capture attempt
   * @expected Reject before replacing any original descriptor or identity
   */
  it('validates the whole owned target set before replacing any method', () => {
    const existing = vi.fn();
    const target = { call: existing, invalid: 1 };
    expect(() =>
      preserveBitcoinCashMocks([[target, ['call', 'invalid']]]),
    ).toThrow('own configurable function');
    expect(target.call).toBe(existing);
    expect(existing).not.toHaveBeenCalled();
  });
});
