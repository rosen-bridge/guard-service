import { describe, it } from 'vitest';
import NestedIterator from '../../src/utils/NestedIterator';

describe('NestedIterator', () => {
  /**
   * @target NestedIterator should return all combinations for multiple non-empty nested arrays
   * @scenario
   * - define a mock nested iterator with arrays [[1,2], ['a','b'], [true,false]]
   * - call next on the iterator and store result repeatedly until hasNext returns false
   * - call next one additional time after exhaustion
   * @expected
   * - first call to next should have returned { done: false, value: [1, 'a', true] }
   * - second call to next should have returned { done: false, value: [1, 'a', false] }
   * - third call to next should have returned { done: false, value: [1, 'b', true] }
   * - fourth call to next should have returned { done: false, value: [1, 'b', false] }
   * - fifth call to next should have returned { done: false, value: [2, 'a', true] }
   * - sixth call to next should have returned { done: false, value: [2, 'a', false] }
   * - seventh call to next should have returned { done: false, value: [2, 'b', true] }
   * - eighth call to next should have returned { done: false, value: [2, 'b', false] }
   * - additional call to next should have returned { done: true, value: undefined }
   */
  it('should return all combinations for multiple non-empty nested arrays', () => {
    // arrange
    const nestedIterator = new NestedIterator<[number, string, boolean]>([
      [1, 2],
      ['a', 'b'],
      [true, false],
    ]);
    const results: IteratorResult<[number, string, boolean]>[] = [];

    // act
    while (nestedIterator.hasNext()) {
      results.push(nestedIterator.next());
    }
    // call one additional time after exhaustion
    const extraCall = nestedIterator.next();

    // assert
    expect(results[0]).toEqual({ done: false, value: [1, 'a', true] });
    expect(results[1]).toEqual({ done: false, value: [1, 'a', false] });
    expect(results[2]).toEqual({ done: false, value: [1, 'b', true] });
    expect(results[3]).toEqual({ done: false, value: [1, 'b', false] });
    expect(results[4]).toEqual({ done: false, value: [2, 'a', true] });
    expect(results[5]).toEqual({ done: false, value: [2, 'a', false] });
    expect(results[6]).toEqual({ done: false, value: [2, 'b', true] });
    expect(results[7]).toEqual({ done: false, value: [2, 'b', false] });
    expect(extraCall).toEqual({ done: true, value: undefined });
  });

  /**
   * @target NestedIterator should have iterated correctly when only one nested array is provided
   * @scenario
   * - define a mock nested iterator with arrays [[10,20,30]]
   * - call next on the iterator repeatedly until hasNext returns false
   * - call next one additional time after exhaustion
   * @expected
   * - first call to next should have returned { done: false, value: [10] }
   * - second call to next should have returned { done: false, value: [20] }
   * - third call to next should have returned { done: false, value: [30] }
   * - additional call to next should have returned { done: true, value: undefined }
   */
  it('should have iterated correctly when only one nested array is provided', () => {
    // arrange
    const nestedIterator = new NestedIterator<[number]>([[10, 20, 30]]);
    const results: IteratorResult<[number]>[] = [];

    // act
    while (nestedIterator.hasNext()) {
      results.push(nestedIterator.next());
    }
    const extraCall = nestedIterator.next();

    // assert
    expect(results[0]).toEqual({ done: false, value: [10] });
    expect(results[1]).toEqual({ done: false, value: [20] });
    expect(results[2]).toEqual({ done: false, value: [30] });
    expect(extraCall).toEqual({ done: true, value: undefined });
  });

  /**
   * @target NestedIterator should set hasNext to false when the iteration is exhausted
   * @scenario
   * - define a mock nested iterator with arrays [['x']]
   * - call hasNext before any call to next and store the value
   * - call next on the iterator
   * - call hasNext after the call to next
   * @expected
   * - initial call to hasNext should have returned true
   * - next should have returned { done: false, value: ['x'] }
   * - subsequent call to hasNext should have returned false
   */
  it('should set hasNext to false when the iteration is exhausted', () => {
    // arrange
    const nestedIterator = new NestedIterator<[string]>([['x']]);

    // act
    const initialHasNext = nestedIterator.hasNext();
    const nextVal = nestedIterator.next();
    const afterHasNext = nestedIterator.hasNext();

    // assert
    expect(initialHasNext).toBe(true);
    expect(nextVal).toEqual({ done: false, value: ['x'] });
    expect(afterHasNext).toBe(false);
  });

  /**
   * @target NestedIterator should iterate correctly using the for...of loop over the nested iterator
   * @scenario
   * - define a mock nested iterator with arrays [[1,2], [3,4]]
   * - iterate over the iterator using a for...of loop and collect each value
   * - store the collected results array
   * @expected
   * - the collected results should have been equal to [[1,3], [1,4], [2,3], [2,4]]
   * - the total number of iterations should have been equal to 4
   */
  it('should iterate correctly using the for...of loop over the nested iterator', () => {
    // arrange
    const nestedIterator = new NestedIterator<[number, number]>([
      [1, 2],
      [3, 4],
    ]);
    const collected: [number, number][] = [];

    // act
    for (const value of nestedIterator) {
      collected.push(value);
    }

    // assert
    expect(collected).toEqual([
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
    ]);
    expect(collected.length).toBe(4);
  });
});
