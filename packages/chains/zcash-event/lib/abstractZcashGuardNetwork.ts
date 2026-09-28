import type { AbstractLogger } from '@rosen-bridge/abstract-logger';
import type { ZcashRpcTransaction } from '@rosen-bridge/rosen-extractor';
import {
  AbstractChainNetwork,
  type BlockInfo,
} from '@rosen-chains/abstract-chain';

import {
  isZcashHash,
  projectZcashTransaction,
  ZcashGuardEvidenceError,
} from './zcashGuardRosenExtractor.js';

export interface ZcashGuardBlock extends BlockInfo {
  transactionCount: number;
  transactionIds: string[];
}

/** Source must supply the configured chain's complete block and transaction responses.
 * This adapter checks response joins, not consensus, canonicality or finality.
 */
export interface ZcashGuardEventSource {
  getBlock: (blockId: string) => Promise<unknown>;
  getTransaction: (transactionId: string, blockId: string) => Promise<unknown>;
}

/** Event read methods for a future full network implementation; payment methods remain abstract. */
export abstract class AbstractZcashGuardNetwork extends AbstractChainNetwork<ZcashRpcTransaction> {
  constructor(
    private readonly source: ZcashGuardEventSource,
    logger?: AbstractLogger,
  ) {
    super(logger);
    if (
      typeof source?.getBlock !== 'function' ||
      typeof source?.getTransaction !== 'function'
    ) {
      throw new ZcashGuardEvidenceError('configuration');
    }
  }

  private readBlock = async (blockId: string): Promise<ZcashGuardBlock> => {
    if (!isZcashHash(blockId)) throw new ZcashGuardEvidenceError('identity');
    let value: unknown;
    try {
      value = await this.source.getBlock(blockId);
    } catch {
      // In particular, do not let an uncertain NotFound become final rejection in AbstractChain.
      throw new ZcashGuardEvidenceError('source');
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ZcashGuardEvidenceError('block');
    }
    const { hash, parentHash, height, transactionCount, transactionIds } =
      value as Record<string, unknown>;
    if (
      !isZcashHash(hash) ||
      hash !== blockId ||
      !isZcashHash(parentHash) ||
      typeof height !== 'number' ||
      !Number.isSafeInteger(height) ||
      height < 0 ||
      Object.is(height, -0) ||
      typeof transactionCount !== 'number' ||
      !Number.isSafeInteger(transactionCount) ||
      transactionCount < 1 ||
      !Array.isArray(transactionIds) ||
      transactionIds.length !== transactionCount
    ) {
      throw new ZcashGuardEvidenceError('block');
    }
    const unique = new Set<string>();
    // Array iteration visits sparse slots as undefined; .every would skip them.
    for (const id of transactionIds) {
      if (!isZcashHash(id) || unique.has(id))
        throw new ZcashGuardEvidenceError('block');
      unique.add(id);
    }
    return {
      hash,
      parentHash,
      height,
      transactionCount,
      transactionIds: [...transactionIds],
    };
  };

  getBlockTransactionIds = async (blockId: string): Promise<string[]> =>
    (await this.readBlock(blockId)).transactionIds;

  getBlockInfo = async (blockId: string): Promise<ZcashGuardBlock> =>
    this.readBlock(blockId);

  getTransaction = async (
    transactionId: string,
    blockId: string,
  ): Promise<ZcashRpcTransaction> => {
    if (!isZcashHash(transactionId) || !isZcashHash(blockId))
      throw new ZcashGuardEvidenceError('identity');
    let value: unknown;
    try {
      value = await this.source.getTransaction(transactionId, blockId);
    } catch {
      throw new ZcashGuardEvidenceError('source');
    }
    const transaction = projectZcashTransaction(value);
    if (
      transaction.txid !== transactionId ||
      transaction.blockhash !== blockId
    ) {
      throw new ZcashGuardEvidenceError('identity');
    }
    return transaction;
  };
}
