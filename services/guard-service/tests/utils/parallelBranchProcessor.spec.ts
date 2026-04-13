import ParallelBranchProcessor from '../../src/utils/parallelBranchProcessor';

describe('ParallelBranchProcessor', () => {
  beforeEach(() => {
    // mock the timers to ensure consistent processing times
    vi.useFakeTimers();
  });

  afterEach(() => {
    // clear the timer mock
    vi.useRealTimers();
  });

  describe('addNode', () => {
    /**
     * @target ParallelBranchProcessor.addNode should start processing immediately when
     *  branch does not exist
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 10ms
     * - define a mock ParallelBranchProcessor using the job function
     * - add a node to the processor
     * - check the tree and branch size
     * - check the mock job function
     * @expected
     * - tree should have contained 1 empty branch
     * - job function should have been called once with value of the node
     */
    it('should start processing immediately when branch does not exist', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act
      processor.addNode('branch-1', 42);

      // assert
      expect(processor.getTree().size).toBe(1);
      expect(processor.getTree().get('branch-1')?.length).toBe(0);
      expect(mockJobFn).toHaveBeenCalledTimes(1);
      expect(mockJobFn).toHaveBeenCalledWith(42);
    });

    /**
     * @target ParallelBranchProcessor.addNode should process nodes sequentially
     *  within a branch
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 5ms
     * - define a mock ParallelBranchProcessor using the job function
     * - add 3 nodes to the processor with matching branch ids
     * - check the tree and branch size
     * - wait for the processing to finish
     * - check the mock job function
     * @expected
     * - tree should have contained 1 branch with 2 nodes queued in it
     * - job function should have been called 3 times with value of the nodes in
     *   the same order they were added
     */
    it('should process nodes sequentially within a branch', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act and assert
      processor.addNode('branch-1', 10);
      processor.addNode('branch-1', 20);
      processor.addNode('branch-1', 30);
      expect(processor.getTree().size).toBe(1);
      expect(processor.getTree().get('branch-1')?.length).toBe(2);
      await vi.advanceTimersByTimeAsync(15);

      expect(mockJobFn).toHaveBeenCalledTimes(3);
      expect(mockJobFn).toHaveBeenNthCalledWith(1, 10);
      expect(mockJobFn).toHaveBeenNthCalledWith(2, 20);
      expect(mockJobFn).toHaveBeenNthCalledWith(3, 30);
    });

    /**
     * @target ParallelBranchProcessor.addNode should process multiple branches in parallel
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 10ms
     * - define a mock ParallelBranchProcessor using the job function
     * - add 6 nodes for 3 branches (2 each) to the processor
     * - wait for the processing to finish
     * - check the mock job function
     * @expected
     * - job function should have been called 6 times with value of the nodes in
     *   the same order they were added for each of the branches
     */
    it('should process multiple branches in parallel', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act
      processor.addNode('branch-1', 'b1-1');
      processor.addNode('branch-1', 'b1-2');
      processor.addNode('branch-2', 'b2-1');
      processor.addNode('branch-2', 'b2-2');
      processor.addNode('branch-3', 'b3-1');
      processor.addNode('branch-3', 'b3-2');
      await vi.advanceTimersByTimeAsync(20);

      // assert
      expect(mockJobFn).toHaveBeenCalledTimes(6);
      expect(mockJobFn).toHaveBeenNthCalledWith(1, 'b1-1');
      expect(mockJobFn).toHaveBeenNthCalledWith(2, 'b2-1');
      expect(mockJobFn).toHaveBeenNthCalledWith(3, 'b3-1');
      expect(mockJobFn).toHaveBeenNthCalledWith(4, 'b1-2');
      expect(mockJobFn).toHaveBeenNthCalledWith(5, 'b2-2');
      expect(mockJobFn).toHaveBeenNthCalledWith(6, 'b3-2');
    });

    /**
     * @target ParallelBranchProcessor.addNode should clean up a branch after all its nodes are processed
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 10ms
     * - define a mock ParallelBranchProcessor using the job function
     * - add 3 nodes for 2 branches to the processor
     * - wait for the processing to finish
     * - check the size of tree
     * @expected
     * - tree should have been empty
     */
    it('should clean up a branch after all its nodes are processed', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act
      processor.addNode('branch-1', 10);
      processor.addNode('branch-1', 20);
      processor.addNode('branch-2', 11);
      await vi.advanceTimersByTimeAsync(20);

      // assert
      expect(processor.getTree().size).toBe(0);
    });

    /**
     * @target ParallelBranchProcessor.addNode should handle errors in job function and continue processing
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 5ms or throws if the node value equals 20
     * - define a mock ParallelBranchProcessor using the job function
     * - add 3 nodes to the processor
     * - wait for the processing to finish
     * - check the mock job function
     * @expected
     * - job function should have been called 3 times with value of the nodes in
     *   the same order they were added
     */
    it('should handle errors in job function and continue processing', async () => {
      // arrange
      const mockJobFn = vi.fn().mockImplementation((node: number) => {
        if (node === 20) {
          return Promise.reject(new Error('Processing failed'));
        }
        return new Promise((resolve) => setTimeout(resolve, 5));
      });
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act
      processor.addNode('branch-1', 10);
      processor.addNode('branch-1', 20);
      processor.addNode('branch-1', 30);
      await vi.advanceTimersByTimeAsync(15);

      // assert
      expect(mockJobFn).toHaveBeenCalledTimes(3);
      expect(mockJobFn).toHaveBeenNthCalledWith(1, 10);
      expect(mockJobFn).toHaveBeenNthCalledWith(2, 20);
      expect(mockJobFn).toHaveBeenNthCalledWith(3, 30);
    });

    /**
     * @target ParallelBranchProcessor.addNode should handle many sequential nodes
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 5ms
     * - define a mock ParallelBranchProcessor using the job function
     * - add 20 nodes for 1 branch to the processor in a for loop
     * - on each iteration
     *   - check the mock job function call times
     *   - check the tree and branch size
     * - wait for the processing to finish
     * - check the mock job function
     * @expected
     * - on each iteration
     *   - mock job function should have been called once
     *   - tree should have contained one branch
     *   - each branch should have contained i - 1 queued nodes
     * - job function should have been called 20 times in total with value of the nodes in
     *   the same order they were added
     */
    it('should handle many sequential nodes', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act and assert
      for (let i = 1; i <= 20; i++) {
        processor.addNode('branch-1', i);
        expect(mockJobFn).toHaveBeenCalledOnce(); // nodes are processed sequentially
        expect(processor.getTree().size).toBe(1); // contains only 1 branch
        expect(processor.getTree().get('branch-1')!.length).toBe(i - 1); // 1 node is processing and other will be queued
      }
      await vi.advanceTimersByTimeAsync(100);

      expect(mockJobFn).toHaveBeenCalledTimes(20);
      for (let i = 1; i <= 20; i++) {
        expect(mockJobFn).toHaveBeenNthCalledWith(i, i);
      }
    });

    /**
     * @target ParallelBranchProcessor.addNode should handle many parallel branches
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 5ms
     * - define a mock ParallelBranchProcessor using the job function
     * - add 20 branches with 1 node each to the processor
     * - check the tree and branch size
     * - wait for the processing to finish
     * - check the tree and branch size
     * - check the mock job function
     * @expected
     * - tree should have contained 20 empty branches
     * - after the processing tree should have been empty
     * - job function should have been called 20 times
     */
    it('should handle many parallel branches', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act and assert
      for (let i = 1; i <= 20; i++) {
        processor.addNode(`branch-${i}`, i);
      }
      expect(processor.getTree().size).toBe(20);
      for (let i = 1; i <= 20; i++) {
        expect(processor.getTree().get(`branch-${i}`)?.length).toBe(0);
      }

      await vi.advanceTimersByTimeAsync(5);

      expect(processor.getTree().size).toBe(0);
      expect(mockJobFn).toHaveBeenCalledTimes(20);
    });

    /**
     * @target ParallelBranchProcessor.addNode should handle underflow of node additions
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 5ms
     * - define a mock ParallelBranchProcessor using the job function
     * - for 10 times add 2 nodes for 2 branches (1 each) on 10ms intervals
     * - for 10 times with 10ms delay
     *   - check the mock job function
     *   - check the tree and branch size
     * - check the mock job function
     * - check the tree and branch size
     * @expected
     * - on each iteration
     *   - mock job function should have been called i * 2 times
     *   - tree should have contained 2 empty branches
     *   - when the processing of the iteration is done tree should have been empty
     * - after the iteration
     *   - tree should have been empty
     *   - job function should have been called 20 times
     */
    it('should handle underflow of node additions', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act and assert
      let count = 1;
      processor.addNode(`branch-1`, count);
      processor.addNode(`branch-2`, count);
      const interval = setInterval(() => {
        count += 1;
        if (count > 10) {
          clearInterval(interval);
          return;
        }
        processor.addNode(`branch-1`, count);
        processor.addNode(`branch-2`, count);
      }, 10);

      for (let i = 1; i <= 10; i++) {
        expect(mockJobFn).toHaveBeenCalledTimes(i * 2);
        expect(processor.getTree().size).toBe(2);
        expect(processor.getTree().get('branch-1')?.length).toBe(0);
        expect(processor.getTree().get('branch-2')?.length).toBe(0);

        await vi.advanceTimersByTimeAsync(5);
        expect(processor.getTree().size).toBe(0);
        await vi.advanceTimersByTimeAsync(5);
      }

      expect(mockJobFn).toHaveBeenCalledTimes(20);
      expect(processor.getTree().size).toBe(0);
    });

    /**
     * @target ParallelBranchProcessor.addNode should handle equal flow of node additions
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 5ms
     * - define a mock ParallelBranchProcessor using the job function
     * - for 10 times add 2 nodes for 2 branches (1 each) on 5ms intervals
     * - for 10 times with 5ms delay
     *   - check the mock job function
     *   - check the tree and branch size
     * - check the mock job function
     * - check the tree and branch size
     * @expected
     * - on each iteration
     *   - mock job function should have been called i * 2 times
     *   - tree should have contained 2 empty branches
     * - after the iteration
     *   - tree should have been empty
     *   - job function should have been called 20 times
     */
    it('should handle equal flow of node additions', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act and assert
      let count = 1;
      processor.addNode(`branch-1`, count);
      processor.addNode(`branch-2`, count);
      const interval = setInterval(() => {
        count += 1;
        if (count > 10) {
          clearInterval(interval);
          return;
        }
        processor.addNode(`branch-1`, count);
        processor.addNode(`branch-2`, count);
      }, 5);

      for (let i = 1; i <= 10; i++) {
        expect(mockJobFn).toHaveBeenCalledTimes(i * 2);
        expect(processor.getTree().size).toBe(2);
        expect(processor.getTree().get('branch-1')?.length).toBe(0);
        expect(processor.getTree().get('branch-2')?.length).toBe(0);
        await vi.advanceTimersByTimeAsync(5);
      }

      expect(mockJobFn).toHaveBeenCalledTimes(20);
      expect(processor.getTree().size).toBe(0);
    });

    /**
     * @target ParallelBranchProcessor.addNode should handle overflow of node additions
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 4ms
     * - define a mock ParallelBranchProcessor using the job function
     * - for 10 times add 2 nodes for 2 branches (1 each) on 2ms intervals
     * - for 20 times with 2ms delay
     *   - check the mock job function
     *   - check the tree and branch size
     * - check the mock job function
     * - check the tree and branch size
     * @expected
     * - on each iteration
     *   - if i is even, the mock job function should have been called (i / 2) * 2 times
     *   - tree should have contained 2 branches with incrementing nodes until i == 10
     *   - nodes of each branch should decrease when i > 10
     * - after the iteration
     *   - tree should have been empty
     *   - job function should have been called 20 times
     */
    it('should handle overflow of node additions', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 4)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act and assert
      let count = 1;
      processor.addNode(`branch-1`, count);
      processor.addNode(`branch-2`, count);
      const interval = setInterval(() => {
        count += 1;
        if (count > 10) {
          clearInterval(interval);
          return;
        }
        processor.addNode(`branch-1`, count);
        processor.addNode(`branch-2`, count);
      }, 2);

      let queuedNodes = 0;
      for (let i = 1; i <= 20; i++) {
        if (i <= 10) {
          if (i % 2 === 0) queuedNodes += 1;
        } else if (i % 2 !== 0) queuedNodes -= 1;

        if (i % 2 === 0) expect(mockJobFn).toHaveBeenCalledTimes((i / 2) * 2);

        expect(processor.getTree().size).toBe(2);
        expect(processor.getTree().get('branch-1')?.length).toBe(queuedNodes);
        expect(processor.getTree().get('branch-2')?.length).toBe(queuedNodes);

        await vi.advanceTimersByTimeAsync(2);
      }

      expect(mockJobFn).toHaveBeenCalledTimes(20);
      expect(processor.getTree().size).toBe(0);
    });
  });

  describe('waitForCompletion', () => {
    /**
     * @target ParallelBranchProcessor.waitForCompletion should resolve immediately when no branches are active
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 10ms
     * - define a mock ParallelBranchProcessor using the job function
     * - store the start time
     * - call waitForCompletion
     * - check the duration
     * @expected
     * - duration should have been 0
     */
    it('should resolve immediately when no branches are active', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act
      const start = Date.now();
      await processor.waitForCompletion();
      const duration = Date.now() - start;

      // assert
      expect(duration).toBe(0);
    });

    /**
     * @target ParallelBranchProcessor.waitForCompletion should wait until all branches are completed
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 5ms
     * - define a mock ParallelBranchProcessor using the job function
     * - store the start time
     * - add 3 nodes for 2 branches to the processor
     * - check the size of tree and branches
     * - call waitForCompletion with 3ms intervals
     * - check the duration
     * - check the size of tree
     * - check the mock job function
     * @expected
     * - before waitForCompletion tree size should have been 2 with 1 node queued in a branch
     * - duration should have been 12ms
     * - after waitForCompletion tree size should have been 0
     * - mock job function should have been called 3 times matching the insertion order
     */
    it('should wait until all branches are completed', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 5)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act
      const start = Date.now();
      processor.addNode('branch-1', 10);
      processor.addNode('branch-2', 11);
      processor.addNode('branch-1', 20);
      const completionPromise = processor.waitForCompletion(3);

      // assert
      expect(processor.getTree().size).toBe(2);
      expect(processor.getTree().get('branch-1')?.length).toBe(1);
      expect(processor.getTree().get('branch-2')?.length).toBe(0);

      await vi.advanceTimersByTimeAsync(12);

      await completionPromise;

      const duration = Date.now() - start;
      expect(duration).toBe(12);

      expect(processor.getTree().size).toBe(0);
      expect(mockJobFn).toHaveBeenCalledTimes(3);
      expect(mockJobFn).toHaveBeenNthCalledWith(1, 10);
      expect(mockJobFn).toHaveBeenNthCalledWith(2, 11);
      expect(mockJobFn).toHaveBeenNthCalledWith(3, 20);
    });

    /**
     * @target ParallelBranchProcessor.waitForCompletion should handle multiple waitForCompletion calls
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 10ms
     * - define a mock ParallelBranchProcessor using the job function
     * - spy on waitForCompletion
     * - add a node to the processor
     * - call waitForCompletion 3 times with intervals 5ms, 25ms, 50ms
     * - advance the timers by 45ms
     * - check the waitForCompletion spies
     * - advance the timers by 5ms
     * - check the waitForCompletion spies
     * - check the mock job function
     * - check the tree size
     * @expected
     * - after 45ms 2 of the spies should have resolved
     * - after 50ms all 3 spies should have resolved
     * - mock job function should have been called once
     * - tree should have been empty
     */
    it('should handle multiple waitForCompletion calls', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);
      const waitSpy = vi.spyOn(processor, 'waitForCompletion');

      // act and assert
      processor.addNode('branch-1', 1);

      const promise1 = processor.waitForCompletion(5);
      const promise2 = processor.waitForCompletion(25);
      const promise3 = processor.waitForCompletion(50);

      await vi.advanceTimersByTimeAsync(45);
      expect(waitSpy).toHaveResolvedTimes(2);

      await vi.advanceTimersByTimeAsync(5);
      expect(waitSpy).toHaveResolvedTimes(3);

      await Promise.all([promise1, promise2, promise3]);

      expect(mockJobFn).toHaveBeenCalledTimes(1);
      expect(processor.getTree().size).toBe(0);
    });
  });

  describe('stop', () => {
    /**
     * @target ParallelBranchProcessor.stop should clear only the pending nodes
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 10ms
     * - define a mock ParallelBranchProcessor using the job function
     * - add 3 nodes for 1 branch and 1 node for another branch to the processor
     * - check tree and branch size
     * - check mock job function
     * - call stop
     * - check tree and branch size
     * - wait for the processing to finish
     * - check tree size
     * - check the mock job function
     * @expected
     * - before the stop call
     *   - tree should have contained 2 branches with 2 nodes queued in one of the branches
     *   - job function should have been called 2 times with the first node of each branch
     * - after the stop call
     *   - tree should have contained 2 empty branches
     *   - job function should have been called 2 times with the first node of each branch
     * - after the process finishes
     *   - tree should have been empty
     *   - job function should have been called 2 times with the first node of each branch
     */
    it('should clear only the pending nodes', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act and assert
      processor.addNode('branch-1', 10);
      processor.addNode('branch-1', 20);
      processor.addNode('branch-1', 30);
      processor.addNode('branch-2', 11);

      expect(processor.getTree().size).toBe(2);
      expect(processor.getTree().get('branch-1')?.length).toBe(2);
      expect(processor.getTree().get('branch-2')?.length).toBe(0);

      expect(mockJobFn).toHaveBeenCalledTimes(2);
      expect(mockJobFn).toHaveBeenNthCalledWith(1, 10);
      expect(mockJobFn).toHaveBeenNthCalledWith(2, 11);

      processor.stop(); // stop the pending nodes

      expect(processor.getTree().size).toBe(2);
      expect(processor.getTree().get('branch-1')?.length).toBe(0);
      expect(processor.getTree().get('branch-2')?.length).toBe(0);

      await vi.advanceTimersByTimeAsync(20);

      expect(processor.getTree().size).toBe(0);
      expect(mockJobFn).toHaveBeenCalledTimes(2);
      expect(mockJobFn).toHaveBeenNthCalledWith(1, 10);
      expect(mockJobFn).toHaveBeenNthCalledWith(2, 11);
    });

    /**
     * @target ParallelBranchProcessor.stop should allow adding new nodes after stop
     * @dependencies
     * @scenario
     * - define a mock job function that resolves after 10ms
     * - define a mock ParallelBranchProcessor using the job function
     * - add 2 nodes for a branch to the processor
     * - call stop
     * - add 2 nodes for 2 branches (one each) to the processor
     * - wait for the processing to finish
     * - check the mock job function
     * @expected
     * - job function should have been called 3 times with value of the first node before stop
     *   and the 2 nodes after stop
     */
    it('should allow adding new nodes after stop', async () => {
      // arrange
      const mockJobFn = vi
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 10)),
        );
      const processor = new ParallelBranchProcessor(mockJobFn);

      // act
      processor.addNode('branch-1', 10);
      processor.addNode('branch-1', 20);
      processor.stop();
      processor.addNode('branch-1', 30);
      processor.addNode('branch-2', 11);

      await vi.advanceTimersByTimeAsync(20);

      // assert
      expect(mockJobFn).toHaveBeenCalledTimes(3);
      expect(mockJobFn).toHaveBeenNthCalledWith(1, 10);
      expect(mockJobFn).toHaveBeenNthCalledWith(2, 11);
      expect(mockJobFn).toHaveBeenNthCalledWith(3, 30);
    });
  });
});
