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

  describe('batchArray', () => {
    /**
     * @target Utils.batchArray should return chunked array when the array is evenly divisible by the chunk size
     * @scenario
     * - define a mock array with 6 elements
     * - call Utils.batchArray with the mock array and chunk size 2
     * @expected
     * - Utils.batchArray should have returned an array with 3 sub-arrays
     * - each sub-array should have contained 2 elements
     */
    it('should return chunked array when the array is evenly divisible by the chunk size', () => {
      // arrange
      const mockArray = [1, 2, 3, 4, 5, 6];
      const chunkSize = 2;

      // act
      const result = Utils.batchArray(mockArray, chunkSize);

      // assert
      expect(result.length).toBe(3);
      result.forEach((chunk) => {
        expect(chunk.length).toBe(2);
      });
    });

    /**
     * @target Utils.batchArray should return chunked array with final chunk containing remaining elements when array cannot be evenly divided by the chunk size
     * @scenario
     * - define a mock array with 5 elements
     * - call Utils.batchArray with the mock array and chunk size 2
     * @expected
     * - Utils.batchArray should have returned an array with 3 sub-arrays
     * - the first two sub-arrays should have contained 2 elements each
     * - the final sub-array should have contained 1 element
     */
    it('should return chunked array with final chunk containing remaining elements when array cannot be evenly divided by the chunk size', () => {
      // arrange
      const mockArray = [1, 2, 3, 4, 5];
      const chunkSize = 2;

      // act
      const result = Utils.batchArray(mockArray, chunkSize);

      // assert
      expect(result.length).toBe(3);
      expect(result[0].length).toBe(2);
      expect(result[1].length).toBe(2);
      expect(result[2].length).toBe(1);
    });

    /**
     * @target Utils.batchArray should return a single chunk when the chunk size is equal to the array length
     * @scenario
     * - define a mock array with 4 elements
     * - call Utils.batchArray with the mock array and chunk size 4
     * @expected
     * - Utils.batchArray should have returned an array with 1 sub-array
     * - the sub-array should have been equal to the mock array
     */
    it('should return a single chunk when the chunk size is equal to the array length', () => {
      // arrange
      const mockArray = [10, 20, 30, 40];
      const chunkSize = 4;

      // act
      const result = Utils.batchArray(mockArray, chunkSize);

      // assert
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockArray);
    });

    /**
     * @target Utils.batchArray should return a single chunk when the chunk size is greater than the array length
     * @scenario
     * - define a mock array with 3 elements
     * - call Utils.batchArray with the mock array and chunk size 5
     * @expected
     * - Utils.batchArray should have returned an array with 1 sub-array
     * - the sub-array should have been equal to the mock array
     */
    it('should return a single chunk when the chunk size is greater than the array length', () => {
      // arrange
      const mockArray = [100, 200, 300];
      const chunkSize = 5;

      // act
      const result = Utils.batchArray(mockArray, chunkSize);

      // assert
      expect(result.length).toBe(1);
      expect(result[0]).toEqual(mockArray);
    });

    /**
     * @target Utils.batchArray should return an empty array when provided an empty array
     * @scenario
     * - define a mock array as an empty array
     * - call Utils.batchArray with the empty array and any positive chunk size (e.g., 3)
     * @expected
     * - Utils.batchArray should have returned an empty array
     */
    it('should return an empty array when provided an empty array', () => {
      // arrange
      const mockArray: number[] = [];
      const chunkSize = 3;

      // act
      const result = Utils.batchArray(mockArray, chunkSize);

      // assert
      expect(result).toEqual([]);
    });

    /**
     * @target Utils.batchArray should throw an error when provided a non-positive chunk size
     * @scenario
     * - define a mock array with any number of elements (e.g., 3 elements)
     * - call Utils.batchArray with the mock array and chunk size 0
     * @expected
     * - Utils.batchArray should have thrown error 'batch size must be greater than 0'
     */
    it('should throw an error when provided a non-positive chunk size', () => {
      // arrange
      const mockArray = [1, 2, 3];
      const chunkSize = 0;

      // act & assert
      expect(() => Utils.batchArray(mockArray, chunkSize)).toThrowError(
        'batch size must be greater than 0'
      );
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
