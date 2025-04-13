class NestedIterator<T extends any[]> implements Iterator<T> {
  private arrays: any[][];

  // an array maintaining the current index for each nested array
  private indices: number[];

  /**
   * construct an iterator over nested arrays
   * @param arrays an array containing each of the arrays to iterate
   */
  constructor(arrays: any[][]) {
    for (let i = 0; i < arrays.length; i++) {
      if (arrays[i].length < 1) {
        throw new Error('NestedIterator arrays should not be empty');
      }
    }

    this.arrays = arrays.slice(0);

    this.indices = Array.from<number>({ length: arrays.length }).fill(0);
    this.indices[this.indices.length - 1] = -1;
  }

  /**
   * checks if there is a next element available
   * @returns boolean
   */
  hasNext(): boolean {
    for (let i = 0; i < this.indices.length; i++) {
      if (this.indices[i] < this.arrays[i].length - 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * helper function to get the current combination from the arrays
   * @returns a tuple containing the current elements
   */
  private getCurrentTuple(): T {
    return this.indices.map((currentIndex, level) => {
      return this.arrays[level][currentIndex];
    }) as T;
  }

  /**
   * advances the indices
   */
  private advanceIndices(): void {
    const indices = this.indices.slice(0);

    for (let i = indices.length - 1; i >= 0; i--) {
      indices[i]++;
      if (indices[i] < this.arrays[i].length) {
        break;
      } else {
        indices[i] = 0;
      }
    }

    this.indices = indices;
  }

  /**
   * advances the nested indices, and then returns the current iteration result
   * @returns iterator result containing a tuple of current elements
   */
  next(): IteratorResult<T> {
    if (!this.hasNext()) {
      return { done: true, value: undefined };
    }

    this.advanceIndices();
    const value = this.getCurrentTuple();

    return { done: false, value };
  }

  /**
   * returns the iterator itself to support iteration protocols (e.g. for...of loops)
   * @returns iterator itself
   */
  [Symbol.iterator](): Iterator<T> {
    return this;
  }
}

export default NestedIterator;
