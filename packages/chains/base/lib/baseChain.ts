import { AbstractLogger } from '@rosen-bridge/abstract-logger';
import { TokenMap } from '@rosen-bridge/tokens';
import {
  ConfirmationStatus,
  TransactionType,
} from '@rosen-chains/abstract-chain';
import {
  EvmChain,
  EvmConfigs,
  EvmChainSignMediator,
  AbstractEvmNetwork,
} from '@rosen-chains/evm';

import { ETH, BASE_CHAIN, BASE_CHAIN_ID } from './constants';

class BaseChain extends EvmChain {
  CHAIN = BASE_CHAIN;
  NATIVE_TOKEN_ID = ETH;
  CHAIN_ID = BASE_CHAIN_ID;

  constructor(
    network: AbstractEvmNetwork,
    configs: EvmConfigs,
    tokens: TokenMap,
    signMediator: EvmChainSignMediator,
    logger?: AbstractLogger,
  ) {
    super(network, configs, tokens, signMediator, BASE_CHAIN, ETH, 2, logger);
  }

  /**
   * extracts confirmation status for a transaction
   * @param transactionId the transaction id
   * @param transactionType type of the transaction
   * @returns the transaction confirmation status
   */
  override getTxConfirmationStatus = async (
    transactionId: string,
    transactionType: TransactionType,
  ): Promise<ConfirmationStatus> => {
    const requiredConfirmation =
      this.getTxRequiredConfirmation(transactionType);
    const confirmation = await this.network.getTxConfirmation(transactionId);
    const lastBlockHeight = await this.network.getHeight();
    const finalizedBlockHeight = await this.network.getFinalizedBlockHeight();
    if (
      confirmation >= requiredConfirmation &&
      confirmation >= lastBlockHeight - finalizedBlockHeight
    )
      return ConfirmationStatus.ConfirmedEnough;
    else if (confirmation === -1) return ConfirmationStatus.NotFound;
    else return ConfirmationStatus.NotConfirmedEnough;
  };
}

export default BaseChain;
