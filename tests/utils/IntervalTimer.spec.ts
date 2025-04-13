import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import IntervalTimer from '../../src/utils/IntervalTimer';

describe('IntervalTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /**
   * @target IntervalTimer should call callback when interval has passed and callback is not running
   * @scenario
   * - set system time to a mock value
   * - define a mock callback that resolves immediately
   * - create an IntervalTimer instance
   * - start the timer
   * - simulate passage of time until next tick
   * @expected
   * - callback should have been called once
   * - callbackRunning should have been set to false after callback resolution
   */
  it('should call callback when interval has passed and callback is not running', async () => {
    // arrange
    vi.setSystemTime(10_000);

    const mockCallback = vi.fn().mockResolvedValue(undefined);

    const timerInstance = new IntervalTimer(5000, mockCallback, 1000);

    // act
    await timerInstance.start();
    mockCallback.mockClear(); // clear the initial call on start

    await vi.advanceTimersByTimeAsync(5_000);

    // assert
    expect(mockCallback).toHaveBeenCalledOnce();
    expect(timerInstance.callbackRunning).toBe(false);

    timerInstance.stop();
  });

  /**
   * @target IntervalTimer should not call callback when interval has not passed
   * @scenario
   * - set system time to a mock value
   * - define a mock callback that resolves immediately
   * - create an IntervalTimer instance
   * - start the timer
   * - simulate passage of time until next tick
   * @expected
   * - callback should not have been called
   * - callbackRunning should have been false
   */
  it('should not call callback when interval has not passed', async () => {
    // arrange
    vi.setSystemTime(10_000);

    const mockCallback = vi.fn().mockResolvedValue(undefined);

    const timerInstance = new IntervalTimer(5000, mockCallback, 1000);

    // act
    await timerInstance.start();
    mockCallback.mockClear(); // clear the initial call on start

    await vi.advanceTimersByTimeAsync(3000);

    // assert
    expect(mockCallback).not.toHaveBeenCalled();
    expect(timerInstance.callbackRunning).toBe(false);

    timerInstance.stop();
  });

  /**
   * @target IntervalTimer should prevent overlapping callback execution when callback is already running
   * @scenario
   * - set system time to a mock value
   * - define a mock callback that returns a promise to be resolved later
   * - create an IntervalTimer instance
   * - start the timer
   * - simulate passage of time until interval's next tick
   * - simulate passage of time until interval's next tick while the callback promise is still pending
   * @expected
   * - callback should have been called only once
   * - callbackRunning should have been false after resolving the callback
   */
  it('should prevent overlapping callback execution when callback is already running', async () => {
    // arrange
    vi.setSystemTime(10_000);

    let resolveCallback: () => void;
    const callbackPromise = new Promise<void>((resolve) => {
      resolveCallback = resolve;
    });
    const mockCallback = vi.fn().mockReturnValue(callbackPromise);

    const timerInstance = new IntervalTimer(5000, mockCallback, 1000);

    // act
    timerInstance.start();
    mockCallback.mockClear();

    vi.setSystemTime(16_000);
    await vi.advanceTimersByTimeAsync(1_000);

    vi.setSystemTime(22_000);
    await vi.advanceTimersByTimeAsync(1_000);

    // assert
    expect(timerInstance.callbackRunning).toBe(true);

    resolveCallback!();
    await callbackPromise;
    await vi.advanceTimersByTimeAsync(1_000);

    expect(mockCallback).toHaveBeenCalledOnce();
    expect(timerInstance.callbackRunning).toBe(false);

    timerInstance.stop();
  });

  /**
   * @target IntervalTimer should stop the timer when stop is called and prevent further callback invocations
   * @scenario
   * - define a mock callback that resolves immediately
   * - spy on clearInterval
   * - create an IntervalTimer instance
   * - start the timer
   * - call stop on the timer
   * - simulate passage of time until next tick
   * @expected
   * - clearInterval should have been called once
   * - callback should not have been called after stop is invoked
   */
  it('should stop the timer when stop is called and prevent further callback invocations', async () => {
    // arrange
    const mockCallback = vi.fn().mockResolvedValue(undefined);

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

    const timerInstance = new IntervalTimer(3000, mockCallback, 1000);

    // act
    await timerInstance.start();
    mockCallback.mockClear();

    timerInstance.stop();
    await vi.advanceTimersByTimeAsync(4000); // 1000 + 3000 + 1000 margin

    // assert
    expect(clearIntervalSpy).toHaveBeenCalledOnce();
    expect(mockCallback).not.toHaveBeenCalled();
  });
});
