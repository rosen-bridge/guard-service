import Utils from '../../src/utils/Utils';
import * as testData from './testData';

describe('Utils', () => {
  describe('convertMnemonicToSecretKey', () => {
    /**
     * @target Utils.convertMnemonicToSecretKey should return correct secret key
     * in hex string format from mnemonic
     * @dependencies
     * @scenario
     * - mock mnemonic and corresponding secret key
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be expected secret
     */
    it('should return correct secret key in hex string format from mnemonic', () => {
      const mnemonic =
        'route like two trophy tank excite cigar hockey sketch pencil curious memory tissue admit december';
      const secret =
        'ab866ee1a6663ac3027e353c4bddc0c2b44bcd2439df4acca3596613f3c9bf41';

      const result = Utils.convertMnemonicToSecretKey(mnemonic);

      expect(result).toEqual(secret);
    });
  });

  describe('commitmentFromEvent', () => {
    /**
     * @target Utils.commitmentFromEvent should return commitment successfully
     * @dependencies
     * @scenario
     * - mock event and corresponding commit hash
     * - run test
     * - verify returned value
     * @expected
     * - returned value should be expected hash
     */
    it('should return commitment successfully', () => {
      const result = Utils.commitmentFromEvent(
        testData.mockedEventForCommitment,
        testData.WID
      );

      expect(result).toEqual(testData.expectedCommitment);
    });
  });

  describe('retryUntil', () => {
    /**
     * @target Utils.retryUntil should successfully complete when action resolves immediately
     * @scenario
     * - define a mock action function that resolves immediately
     * - call Utils.retryUntil with maxTries set to 3 and the mock action
     * @expected
     * - action should have been called once
     */
    it('should successfully complete when action resolves immediately', async () => {
      // arrange
      const action = vi.fn().mockResolvedValue(undefined);

      // act
      await Utils.retryUntil(3, action);

      // assert
      expect(action).toHaveBeenCalledOnce();
    });

    /**
     * @target Utils.retryUntil should retry and eventually succeed when action fails initially then resolves before max retry is reached
     * @scenario
     * - define a mock function to reject on the first call and resolve on the second call
     * - spy on setTimeout
     * - call Utils.retryUntil with maxTries set to 3 and the mock action
     * - fast-forward timers to simulate waiting period
     * @expected
     * - action should have been called twice
     * - setTimeout should have been called once
     */
    it('should retry and eventually succeed when action fails initially then resolves before max retry is reached', async () => {
      // arrange
      vi.useFakeTimers();

      const action = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined);
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // act
      const promise = Utils.retryUntil(3, action, 100);
      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      // assert
      expect(action).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledOnce();

      vi.useRealTimers();
    });

    /**
     * @target Utils.retryUntil should throw error when action fails on every attempt
     * @scenario
     * - define a mock action function that always rejects
     * - spy on setTimeout
     * - call Utils.retryUntil with maxTries set to 3, and the mock action
     * - fast-forward timers to simulate waiting period
     * @expected
     * - Utils.retryUntil should have thrown error 'max retry reached'
     * - action should have been called three times
     * - setTimeout should have been called twice
     */
    it('should throw error when action fails on every attempt', async () => {
      // arrange
      vi.useFakeTimers();

      const action = vi.fn().mockRejectedValue(new Error('fail'));
      const setTimeoutSpy = vi
        .spyOn(global, 'setTimeout')
        .mockImplementation((cb) => cb() as any);

      // act and assert
      await expect(async () => {
        const promise = Utils.retryUntil(3, action, 100);
        vi.advanceTimersByTime(1000);
        await promise;
      }).rejects.toThrow('max retry reached');

      expect(action).toHaveBeenCalledTimes(3);
      expect(setTimeoutSpy).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    /**
     * @target Utils.retryUntil should use at least one retry when maxTries is less than 1
     * @scenario
     * - define a mock action function that always rejects
     * - spy on setTimeout
     * - call Utils.retryUntil with maxTries set to 0 and the mock action
     * @expected
     * - Utils.retryUntil should have thrown error 'max retry reached'
     * - action should have been called once
     * - setTimeout should not have been called
     */
    it('should use at least one retry when maxTries is less than 1', async () => {
      // arrange
      vi.useFakeTimers();

      const action = vi.fn().mockRejectedValue(new Error('fail'));
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // act and assert
      await expect(async () => {
        const promise = Utils.retryUntil(0, action, 100);
        vi.advanceTimersByTime(1000);
        await promise;
      }).rejects.toThrow('max retry reached');

      expect(action).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    /**
     * @target Utils.retryUntil should wait retryTimeoutMs duration between retries when action fails initially
     * @scenario
     * - define a mock action function that rejects on the first call and resolves on the second call
     * - spy on setTimeout
     * - call Utils.retryUntil with maxTries set to 2, retryTimeoutMs set to 100 and the mock action
     * @expected
     * - action should have been called twice
     * - setTimeout should have been called once with the custom delay value 100
     */
    it('should wait retryTimeoutMs duration between retries when action fails initially', async () => {
      // arrange
      vi.useFakeTimers();

      const action = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail'))
        .mockResolvedValueOnce(undefined);

      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');

      // act
      const promise = Utils.retryUntil(2, action, 100);
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      // assert
      expect(action).toHaveBeenCalledTimes(2);
      expect(setTimeoutSpy).toHaveBeenCalledOnce();
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 100);

      vi.useRealTimers();
    });
  });

  describe('runIntervalIterator', () => {
    /**
     * @target Utils.runIntervalIterator should resolve immediately when iterator has no items
     * @scenario
     * - define a mock iterator with hasNext returning false
     * - define a mock action function
     * - call Utils.runIntervalIterator
     * @expected
     * - the promise should have been resolved
     * - iterator.hasNext should have been called once
     * - action should not have been called
     */
    it('should resolve immediately when iterator has no items', async () => {
      // arrange
      const mockIterator = {
        hasNext: vi.fn(() => false),
        next: vi.fn(),
      } as any;

      const mockAction = vi.fn();

      // act
      const promise = Utils.runIntervalIterator(
        mockIterator,
        3 / 1000,
        1 / 1000,
        mockAction
      );

      // assert
      await expect(promise).resolves.toBeUndefined();
      expect(mockIterator.hasNext).toHaveBeenCalledTimes(1);
      expect(mockAction).not.toHaveBeenCalled();
    });

    /**
     * @target Utils.runIntervalIterator should call action for each item until the iterator is exhausted
     * @scenario
     * - define a mock iterator with 2 values
     * - define a mock action function
     * - call Utils.runIntervalIterator
     * @expected
     * - the promise should have been resolved
     * - iterator.hasNext should have been called multiple times corresponding to each iteration
     * - iterator.next should have been called for each available item
     * - action should have been called for each returned value in order
     */
    it('should call action for each item until the iterator is exhausted', async () => {
      // arrange
      const mockIterator = {
        hasNext: vi
          .fn()
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false),
        next: vi
          .fn()
          .mockReturnValueOnce({ value: 'value1' })
          .mockReturnValueOnce({ value: 'value2' }),
      } as any;

      const mockAction = vi.fn().mockResolvedValue(undefined);

      // act
      const promise = Utils.runIntervalIterator(
        mockIterator,
        3 / 1000,
        1 / 1000,
        mockAction
      );

      // assert
      await expect(promise).resolves.toBeUndefined();
      expect(mockIterator.hasNext).toHaveBeenCalledTimes(3);
      expect(mockIterator.next).toHaveBeenCalledTimes(2);
      expect(mockAction).toHaveBeenCalledTimes(2);
      expect(mockAction).toHaveBeenCalledWith('value1');
      expect(mockAction).toHaveBeenCalledWith('value2');
    });

    /**
     * @target Utils.runIntervalIterator should reject when action throws an error
     * @scenario
     * - define a mock iterator with an item
     * - define a mock action function to throw an error when called
     * - call Utils.runIntervalIterator
     * @expected
     * - the promise should have been rejected with the error thrown by action
     * - iterator.hasNext should have been called once
     * - iterator.next should have been called once
     * - action should have been called once with the mock value
     */
    it('should reject when action throws an error', async () => {
      // arrange
      const mockIterator = {
        hasNext: vi.fn(() => true),
        next: vi.fn(() => ({ value: 'mockValue' })),
      } as any;

      const mockAction = vi.fn().mockRejectedValue(new Error('mockError'));

      // act
      const promise = Utils.runIntervalIterator(
        mockIterator,
        3 / 1000,
        1 / 1000,
        mockAction
      );

      // assert
      await expect(promise).rejects.toThrow('mockError');
      expect(mockIterator.hasNext).toHaveBeenCalledTimes(1);
      expect(mockIterator.next).toHaveBeenCalledTimes(1);
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(mockAction).toHaveBeenCalledWith('mockValue');
    });
  });
});
