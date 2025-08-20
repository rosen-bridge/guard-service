import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { KOIOS_NETWORK } from '@rosen-chains/cardano-koios-network';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { DOGE, DOGE_CHAIN } from '@rosen-chains/doge';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import { BINANCE_CHAIN, BNB } from '@rosen-chains/binance';
import { RosenTokens } from '@rosen-bridge/tokens';
import { chunk } from 'lodash-es';

import { DatabaseAction } from '../db/DatabaseAction';
import { ChainAddressBalanceEntity } from '../db/entities/ChainAddressBalanceEntity';
import { ChainNativeToken, SUPPORTED_CHAINS } from '../utils/constants';
import ChainHandler from './ChainHandler';
import { TokenHandler } from './tokenHandler';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import GuardsDogeConfigs from '../configs/GuardsDogeConfigs';
import Configs from '../configs/Configs';
import { AddressBalance } from '../types/api';
import { getTokenData } from '../utils/getTokenData';

class BalanceHandler {
  private static instance?: BalanceHandler;
  protected chainsTokensPerIteration: Record<string, number> = {};
  protected nativeTokenIds: Record<string, string> = {};

  /**
   * creates a BalanceHandler instance
   * @returns BalanceHandler instance
   */
  protected constructor() {
    for (const chain of SUPPORTED_CHAINS) {
      switch (chain) {
        case ERGO_CHAIN:
          this.nativeTokenIds[chain] = ERG;
          this.chainsTokensPerIteration[chain] =
            GuardsErgoConfigs.chainNetworkName === NODE_NETWORK
              ? Configs.balanceHandler.ergo.tokensPerIteration.node
              : Configs.balanceHandler.ergo.tokensPerIteration.explorer;
          break;
        case CARDANO_CHAIN:
          this.nativeTokenIds[chain] = ADA;
          this.chainsTokensPerIteration[chain] =
            GuardsCardanoConfigs.chainNetworkName === KOIOS_NETWORK
              ? Configs.balanceHandler.cardano.tokensPerIteration.koios
              : Configs.balanceHandler.cardano.tokensPerIteration.blockfrost;
          break;
        case BITCOIN_CHAIN:
          this.nativeTokenIds[chain] = BTC;
          this.chainsTokensPerIteration[chain] =
            Configs.balanceHandler.bitcoin.tokensPerIteration.esplora;
          break;
        case DOGE_CHAIN:
          this.nativeTokenIds[chain] = DOGE;
          this.chainsTokensPerIteration[chain] =
            GuardsDogeConfigs.chainNetworkName === 'rpc-blockcypher'
              ? Configs.balanceHandler.doge.tokensPerIteration.blockcypher
              : Configs.balanceHandler.doge.tokensPerIteration.esplora;
          break;
        case ETHEREUM_CHAIN:
          this.nativeTokenIds[chain] = ETH;
          this.chainsTokensPerIteration[chain] =
            Configs.balanceHandler.ethereum.tokensPerIteration.rpc;
          break;
        case BINANCE_CHAIN:
          this.nativeTokenIds[chain] = BNB;
          this.chainsTokensPerIteration[chain] =
            Configs.balanceHandler.binance.tokensPerIteration.rpc;
          break;
        default:
          throw Error(`Chain [${chain}] is not implemented`);
      }
    }
  }

  /**
   * initializes the BalanceHandler singleton
   * @returns promise of void
   */
  static init = () => {
    BalanceHandler.instance = new BalanceHandler();
  };

  /**
   * retrieves the initialized BalanceHandler singleton instance
   * @returns BalanceHandler instance
   */
  static getInstance = () => {
    if (!BalanceHandler.instance)
      throw Error(
        `BalanceHandler should have been initialized before getInstance`
      );
    return BalanceHandler.instance;
  };

  /**
   * retrieves all native token balances of supported chains
   * @returns promise of AddressBalance array
   */
  getNativeTokenBalances = async (): Promise<AddressBalance[]> => {
    const nativeTokenIds: Set<string> = new Set();

    for (const chain of SUPPORTED_CHAINS) {
      nativeTokenIds.add(ChainNativeToken[chain]);
    }

    const balances =
      await DatabaseAction.getInstance().getChainAddressBalanceByTokenIds([
        ...nativeTokenIds,
      ]);

    return balances.map(this.balanceEntityToAddressBalance);
  };

  /**
   * get cold or lock address assets of supported chains
   * @returns promise of AddressBalance array
   */
  getAddressAssets = async (
    address: 'cold' | 'lock'
  ): Promise<AddressBalance[]> => {
    const addresses: string[] = [];

    for (const chain of SUPPORTED_CHAINS) {
      const chainConfig = ChainHandler.getInstance()
        .getChain(chain)
        .getChainConfigs();
      addresses.push(chainConfig.addresses[address]);
    }

    const balances =
      await DatabaseAction.getInstance().getChainAddressBalanceByAddresses(
        addresses
      );

    return balances.map(this.balanceEntityToAddressBalance);
  };

  /**
   * maps a ChainAddressBalanceEntity record to AddressBalance
   * @param balance
   * @returns an AddressBalance object
   */
  protected balanceEntityToAddressBalance = (
    balance: ChainAddressBalanceEntity
  ): AddressBalance => {
    const tokenData = getTokenData(
      balance.chain,
      balance.tokenId,
      balance.chain,
      true
    );

    return {
      address: balance.address,
      chain: balance.chain,
      balance: {
        tokenId: balance.tokenId,
        amount: Number(balance.balance),
        name: tokenData.name!.toUpperCase(),
        decimals: tokenData.decimals,
        isNativeToken: tokenData.isNativeToken,
      },
    };
  };

  /**
   * gets tokens for the given chain using its token map
   * @param chain
   * @returns array of chain's supported token ids
   */
  protected getChainTokenIds = (chain: string) => {
    const rosenTokens: RosenTokens = TokenHandler.getInstance()
      .getTokenMap()
      .getConfig();

    const supportedTokenIds = rosenTokens
      .filter(
        (tokenSet) =>
          Object.keys(tokenSet).includes(chain) &&
          tokenSet[chain].type !== 'native'
      )
      .map((tokenSet) => tokenSet[chain].tokenId);

    return supportedTokenIds;
  };

  /**
   * updates the balances of addresses and tokens for the given chain by executing periodic batch requests
   * @param chain
   * @returns promise of void
   */
  updateChainBalances = async (chain: string) => {
    const chainConfig = ChainHandler.getInstance()
      .getChain(chain)
      .getChainConfigs();

    const supportedTokenIds = this.getChainTokenIds(chain);

    // batch the tokens by token per minute config of the chain
    const tokensBatches = chunk(
      supportedTokenIds,
      this.chainsTokensPerIteration[chain]
    );

    for (const address of [
      chainConfig.addresses.lock,
      chainConfig.addresses.cold,
    ]) {
      for (const tokensBatch of tokensBatches) {
        await this.updateChainBatchBalances(chain, address, tokensBatch);

        await new Promise((r) =>
          setTimeout(
            r,
            Configs.balanceHandler[chain].updateBatchInterval * 1000
          )
        );
      }
      if (supportedTokenIds.length === 0) {
        await this.updateChainBatchBalances(chain, address);
      }
    }
  };

  /**
   * updates balance of a specific address and batch of tokens of the given chain
   * @param chain
   * @param address
   * @param tokensBatch
   * @returns promise of void
   */
  updateChainBatchBalances = async (
    chain: string,
    address: string,
    tokensBatch?: string[]
  ) => {
    // get address assets
    const abstractChain = ChainHandler.getInstance().getChain(chain);
    const balance = await abstractChain.getAddressAssets(address, tokensBatch);

    // upsert batch tokens balances
    await DatabaseAction.getInstance().upsertChainAddressBalances([
      {
        chain,
        address,
        tokenId: this.nativeTokenIds[chain],
        lastUpdate: String(Math.floor(Date.now() / 1000)),
        balance: balance.nativeToken,
      },
      ...balance.tokens.map((token) => ({
        chain,
        address,
        tokenId: token.id,
        lastUpdate: String(Math.floor(Date.now() / 1000)),
        balance: token.value,
      })),
    ]);
  };
}

export default BalanceHandler;
