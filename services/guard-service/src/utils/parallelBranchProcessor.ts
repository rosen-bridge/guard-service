import { DefaultLogger } from '@rosen-bridge/abstract-logger';

const logger = DefaultLogger.getInstance().child(import.meta.url);

/**
 * a tree processor that handles multiple branches in parallel,
 * with sequential processing within each branch
 */
class ParallelBranchProcessor<T> {
  private tree: Map<string, T[]> = new Map();
  private jobFn: (payload: T) => Promise<void>;

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
  public addNode(branchId: string, node: T): void {
    const branch = this.tree.get(branchId)!;

    // if no process is running (its branch doesn't exist), start immediately
    if (!branch) {
      this.tree.set(branchId, [node]);
      this.processBranch(branchId);
    } else {
      // queue the item for later processing
      branch.push(node);
    }
  }

  /**
   * processes all nodes of a single branch
   *
   * @param branchId - unique identifier for the branch
   */
  private async processBranch(branchId: string): Promise<void> {
    const branch = this.tree.get(branchId);
    if (!branch) {
      return;
    }

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
  }

  /**
   * waits for all branches to complete processing
   *
   * @param interval - interval ms to check the tree size
   */
  public async waitForCompletion(interval: number = 50): Promise<void> {
    if (this.tree.size === 0) return;

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.tree.size === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, interval);
    });
  }

  /**
   * stops all future processes by clearing the tree
   * does not cancel the running promises
   */
  public stop(): void {
    for (const key of this.tree.keys()) {
      const branch = this.tree.get(key)!;
      while (branch.length) branch.pop();
    }
  }

  /**
   * returns the tree property
   */
  public getTree(): Map<string, T[]> {
    return this.tree;
  }
}

export default ParallelBranchProcessor;
