import type {
  ZcashRpcRosenExtractorOptions,
  ZcashRpcTransaction,
} from '@rosen-bridge/rosen-extractor';
import {
  AbstractChain,
  type BlockInfo,
  type ChainConfigs,
} from '@rosen-chains/abstract-chain';

import {
  AbstractZcashGuardNetwork,
  type ZcashGuardBlock,
} from './abstractZcashGuardNetwork.js';
import {
  serializeZcashTransaction,
  ZcashGuardEvidenceError,
  ZcashGuardRosenExtractor,
} from './zcashGuardRosenExtractor.js';

/** Guard event foundations. Full payment, signing and reserve checks are separate consumers. */
export abstract class AbstractZcashEventChain extends AbstractChain<ZcashRpcTransaction> {
  readonly CHAIN = 'zcash';
  readonly NATIVE_TOKEN_ID = 'zec';
  protected extractor: ZcashGuardRosenExtractor;

  constructor(
    network: AbstractZcashGuardNetwork,
    configs: ChainConfigs,
    options: ZcashRpcRosenExtractorOptions,
  ) {
    if (
      !(network instanceof AbstractZcashGuardNetwork) ||
      configs.addresses.lock !== options.lockAddress
    ) {
      throw new ZcashGuardEvidenceError('configuration');
    }
    super(network, configs, options.tokens, options.logger);
    this.extractor = new ZcashGuardRosenExtractor(options);
  }

  protected serializeTx = serializeZcashTransaction;

  override verifyLockTransactionExtraConditions = async (
    transaction: ZcashRpcTransaction,
    block: BlockInfo,
  ): Promise<boolean> => {
    const transactionIds = (block as Partial<ZcashGuardBlock>).transactionIds;
    if (
      transaction.blockhash !== block.hash ||
      transaction.height !== block.height ||
      !Array.isArray(transactionIds) ||
      !transactionIds.includes(transaction.txid)
    ) {
      throw new ZcashGuardEvidenceError('identity');
    }
    return true;
  };
}
