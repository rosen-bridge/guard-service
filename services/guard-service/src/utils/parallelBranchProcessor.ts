import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * a tree processor that handles multiple branches in parallel,
 * with sequential processing within each branch
 */
export class ParallelBranchProcessor<T> {
  private jobFn: (payload: T) => Promise<void>;
  private tree: Map<string, T[]> = new Map();
  private treePromises: Map<string, Promise<void>> = new Map();

  /**
   * @param jobFn - async function that processes a node
   */
  constructor(jobFn: (payload: T) => Promise<void>) {
    this.jobFn = jobFn;
  }

  /**
   * adds a node to a branch. if the branch doesn't exist, it will be created
   * if no node is being processed for this branch, it starts immediately
   * otherwise, the node is added to the branch for later processing
   *
   * @param branchId - Unique identifier for the branch
   * @param node - The data to be processed
   */
  public addNode = (branchId: string, node: T): void => {
    const branch = this.tree.get(branchId)!;

    // if no process is running (its branch doesn't exist), start immediately
    if (!branch) {
      this.tree.set(branchId, [node]);
      this.processBranch(branchId);
    } else {
      // queue the node for later processing
      branch.push(node);
    }
  };

  /**
   * processes all nodes of a single branch
   *
   * @param branchId - unique identifier for the branch
   */
  private processBranch = async (branchId: string) => {
    const branch = this.tree.get(branchId);
    if (!branch) {
      return;
    }

    // store the continuation
    const { promise, resolve } = Promise.withResolvers<void>();
    this.treePromises.set(branchId, promise);

    // process all branch nodes in a while loop
    while (branch.length > 0) {
      const nextNode = branch.shift()!;

      try {
        await this.jobFn(nextNode);
      } catch (error) {
        logger.error(`Error processing node in branch ${branchId}:`, error);
      }
    }

    // branch is empty, clean up
    this.tree.delete(branchId);
    resolve();
    this.treePromises.delete(branchId);
  };

  /**
   * waits for all branches to complete processing
   */
  public waitForCompletion = async (): Promise<void> => {
    if (this.tree.size === 0) return;
    await Promise.all(this.treePromises.values());
  };

  /**
   * stops all future processes by clearing the tree
   * does not cancel the running promises
   */
  public stop = (): void => {
    for (const branchId of this.tree.keys()) {
      const branch = this.tree.get(branchId)!;
      while (branch.length) branch.pop();
    }
  };

  /**
   * returns the tree property
   */
  public getTree = (): Map<string, T[]> => {
    return this.tree;
  };
}
