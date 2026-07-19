import { chunk } from 'lodash-es';

import { RosenTokens } from '@rosen-bridge/tokens';
import { BINANCE_CHAIN, BNB } from '@rosen-chains/binance';
import { BITCOIN_CHAIN, BTC } from '@rosen-chains/bitcoin';
import { BITCOIN_RUNES_CHAIN } from '@rosen-chains/bitcoin-runes';
import { ADA, CARDANO_CHAIN } from '@rosen-chains/cardano';
import { KOIOS_NETWORK } from '@rosen-chains/cardano-koios-network';
import { DOGE, DOGE_CHAIN } from '@rosen-chains/doge';
import { ERG, ERGO_CHAIN } from '@rosen-chains/ergo';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import { ETH, ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import { FIRO, FIRO_CHAIN } from '@rosen-chains/firo';

import Configs from '../configs/configs';
import GuardsCardanoConfigs from '../configs/guardsCardanoConfigs';
import GuardsDogeConfigs from '../configs/guardsDogeConfigs';
import GuardsErgoConfigs from '../configs/guardsErgoConfigs';
import { DatabaseAction } from '../db/databaseAction';
import { AddressEntity } from '../db/entities/addressEntity';
import { ChainAddressBalanceEntity } from '../db/entities/chainAddressBalanceEntity';
import { SupportedChain } from '../types/config';
import { ChainConfigKey, SUPPORTED_CHAINS } from '../utils/constants';
import ChainHandler from './chainHandler';
import { TokenHandler } from './tokenHandler';

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
        case FIRO_CHAIN:
          this.nativeTokenIds[chain] = FIRO;
          this.chainsTokensPerIteration[chain] =
            Configs.balanceHandler.firo.tokensPerIteration.rpc;
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
        case BITCOIN_RUNES_CHAIN:
          this.nativeTokenIds[chain] = BTC;
          this.chainsTokensPerIteration[chain] =
            Configs.balanceHandler.bitcoinRunes.tokensPerIteration.rpc;
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
        `BalanceHandler should have been initialized before getInstance`,
      );
    return BalanceHandler.instance;
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
          tokenSet[chain].type !== 'native',
      )
      .map((tokenSet) => tokenSet[chain].tokenId);

    return supportedTokenIds;
  };

  /**
   * updates the balances of addresses and tokens for the given chain by executing periodic batch requests
   * @param chain
   * @returns promise of void
   */
  updateChainBalances = async (chain: SupportedChain) => {
    const supportedTokenIds = this.getChainTokenIds(chain);

    const allTokenIds = [...supportedTokenIds, this.nativeTokenIds[chain]];

    const savedBalances =
      await DatabaseAction.getInstance().getChainAddressBalances(allTokenIds);
    const balancesMap: Map<string, ChainAddressBalanceEntity> = new Map();
    savedBalances.forEach((balance) =>
      balancesMap.set(`${balance.addressId}-${balance.tokenId}`, balance),
    );

    // batch the tokens by token per minute config of the chain
    const tokensBatches = chunk(
      supportedTokenIds,
      this.chainsTokensPerIteration[chain],
    );

    const chainAddresses =
      await DatabaseAction.getInstance().getAddresses(chain);

    for (const addressEntity of chainAddresses.items) {
      for (const tokensBatch of tokensBatches) {
        const balances = await this.updateChainBatchBalances(
          addressEntity,
          tokensBatch,
        );
        balances.forEach((balance) =>
          balancesMap.delete(`${balance.addressId}-${balance.tokenId}`),
        );

        await new Promise((r) =>
          setTimeout(
            r,
            Configs.balanceHandler[ChainConfigKey[chain]].updateBatchInterval *
              1000,
          ),
        );
      }
      if (supportedTokenIds.length === 0) {
        const balances = await this.updateChainBatchBalances(addressEntity);
        balances.forEach((balance) =>
          balancesMap.delete(`${balance.addressId}-${balance.tokenId}`),
        );
      }
    }

    // remove outdated balance entities from database
    await DatabaseAction.getInstance().removeChainAddressBalances([
      ...balancesMap.values(),
    ]);
  };

  /**
   * updates balance of a specific address and batch of tokens of the given chain
   * @param address
   * @param tokensBatch
   * @returns promise of ChainAddressBalanceEntity array
   */
  updateChainBatchBalances = async (
    address: AddressEntity,
    tokensBatch?: string[],
  ) => {
    // get address assets
    const abstractChain = ChainHandler.getInstance().getChain(address.chain);
    const addressAssets = await abstractChain.getAddressAssets(
      address.address,
      tokensBatch,
    );

    const lastUpdate = String(Math.floor(Date.now() / 1000));

    const balances: ChainAddressBalanceEntity[] = [
      {
        addressId: address.id,
        address: address,
        tokenId: this.nativeTokenIds[address.chain],
        lastUpdate,
        balance: addressAssets.nativeToken,
      },
      ...addressAssets.tokens.map((token) => ({
        addressId: address.id,
        address: address,
        tokenId: token.id,
        lastUpdate,
        balance: token.value,
      })),
    ];

    // upsert batch tokens balances
    await DatabaseAction.getInstance().upsertChainAddressBalances(balances);

    return balances;
  };
}

export default BalanceHandler;
