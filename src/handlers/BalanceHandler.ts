import { DataSource, In, Repository } from 'typeorm';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import { ERGO_CHAIN } from '@rosen-chains/ergo';
import { KOIOS_NETWORK } from '@rosen-chains/cardano-koios-network';
import { CARDANO_CHAIN } from '@rosen-chains/cardano';
import { BITCOIN_CHAIN } from '@rosen-chains/bitcoin';
import { DOGE_CHAIN } from '@rosen-chains/doge';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import { BINANCE_CHAIN } from '@rosen-chains/binance';
import { RosenTokens } from '@rosen-bridge/tokens';
import { chunk } from 'lodash-es';

import { ChainAddressTokenBalanceEntity } from '../db/entities/ChainAddressTokenBalanceEntity';
import { ChainNativeToken, SUPPORTED_CHAINS } from '../utils/constants';
import ChainHandler from './ChainHandler';
import { TokenHandler } from './tokenHandler';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import Configs from '../configs/Configs';
import { AddressBalance } from '../types/api';
import { getTokenData } from '../utils/getTokenData';

export type ChainBalanceConfig = {
  tokensPerMinute: number;
  updateInterval: number;
  updateBatchInterval: number;
};

class BalanceHandler {
  private static instance?: BalanceHandler;
  readonly chainAddressTokenBalanceRepository: Repository<ChainAddressTokenBalanceEntity>;
  protected chainConfigs: Record<string, ChainBalanceConfig> = {};

  /**
   * creates a BalanceHandler instance by the given DataSource
   * @param dataSource
   * @returns BalanceHandler instance
   */
  protected constructor(dataSource: DataSource) {
    this.chainAddressTokenBalanceRepository = dataSource.getRepository(
      ChainAddressTokenBalanceEntity
    );

    for (const chain of SUPPORTED_CHAINS) {
      let config: ChainBalanceConfig;

      switch (chain) {
        case ERGO_CHAIN:
          config = {
            updateInterval: Configs.balanceHandler['ergo'].updateInterval,
            updateBatchInterval:
              Configs.balanceHandler['ergo'].updateBatchInterval,
            tokensPerMinute:
              GuardsErgoConfigs.chainNetworkName === NODE_NETWORK
                ? Configs.balanceHandler.ergo.tokensPerMinute.node
                : Configs.balanceHandler.ergo.tokensPerMinute.explorer,
          };
          break;
        case CARDANO_CHAIN:
          config = {
            updateInterval: Configs.balanceHandler['cardano'].updateInterval,
            updateBatchInterval:
              Configs.balanceHandler['cardano'].updateBatchInterval,
            tokensPerMinute:
              GuardsCardanoConfigs.chainNetworkName === KOIOS_NETWORK
                ? Configs.balanceHandler.cardano.tokensPerMinute.koios
                : Configs.balanceHandler.cardano.tokensPerMinute.blockfrost,
          };
          break;
        case BITCOIN_CHAIN:
          config = {
            updateInterval: Configs.balanceHandler['bitcoin'].updateInterval,
            updateBatchInterval:
              Configs.balanceHandler['bitcoin'].updateBatchInterval,
            tokensPerMinute:
              Configs.balanceHandler.bitcoin.tokensPerMinute.esplora,
          };
          break;
        case DOGE_CHAIN:
          config = {
            updateInterval: Configs.balanceHandler['doge'].updateInterval,
            updateBatchInterval:
              Configs.balanceHandler['doge'].updateBatchInterval,
            tokensPerMinute:
              Configs.balanceHandler.doge.tokensPerMinute.esplora,
          };
          break;
        case ETHEREUM_CHAIN:
          config = {
            updateInterval: Configs.balanceHandler['ethereum'].updateInterval,
            updateBatchInterval:
              Configs.balanceHandler['ethereum'].updateBatchInterval,
            tokensPerMinute:
              Configs.balanceHandler.ethereum.tokensPerMinute.rpc,
          };
          break;
        case BINANCE_CHAIN:
          config = {
            updateInterval: Configs.balanceHandler['binance'].updateInterval,
            updateBatchInterval:
              Configs.balanceHandler['binance'].updateBatchInterval,
            tokensPerMinute: Configs.balanceHandler.binance.tokensPerMinute.rpc,
          };
          break;
        default:
          throw Error(`Chain [${chain}] is not implemented`);
      }

      this.chainConfigs[chain] = config;
    }
  }

  /**
   * initializes the BalanceHandler singleton by the given DataSource
   * @param dataSource
   * @returns promise of void
   */
  static init = (dataSource: DataSource) => {
    BalanceHandler.instance = new BalanceHandler(dataSource);
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

    const balances = await this.chainAddressTokenBalanceRepository.findBy({
      tokenId: In([...nativeTokenIds]),
    });

    return balances.map(this.balanceEntityToAddressBalance);
  };

  /**
   * get lock address assets of supported chains
   * @returns promise of AddressBalance array
   */
  getLockAddressAssets = async (): Promise<AddressBalance[]> => {
    const lockAddresses: Set<string> = new Set();

    for (const chain of SUPPORTED_CHAINS) {
      const chainConfig = ChainHandler.getInstance()
        .getChain(chain)
        .getChainConfigs();
      lockAddresses.add(chainConfig.addresses.lock);
    }

    const balances = await this.chainAddressTokenBalanceRepository.findBy({
      address: In([...lockAddresses]),
    });

    return balances.map(this.balanceEntityToAddressBalance);
  };

  /**
   * get cold address assets of supported chains
   * @returns promise of AddressBalance array
   */
  getColdAddressAssets = async (): Promise<AddressBalance[]> => {
    const coldAddresses: Set<string> = new Set();

    for (const chain of SUPPORTED_CHAINS) {
      const chainConfig = ChainHandler.getInstance()
        .getChain(chain)
        .getChainConfigs();
      coldAddresses.add(chainConfig.addresses.cold);
    }

    const balances = await this.chainAddressTokenBalanceRepository.findBy({
      address: In([...coldAddresses]),
    });

    return balances.map(this.balanceEntityToAddressBalance);
  };

  /**
   * maps a ChainAddressTokenBalanceEntity record to AddressBalance
   * @param balance
   * @returns an AddressBalance object
   */
  protected balanceEntityToAddressBalance = (
    balance: ChainAddressTokenBalanceEntity
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
      this.chainConfigs[chain].tokensPerMinute
    );

    for (const address of [
      chainConfig.addresses.lock,
      chainConfig.addresses.cold,
    ]) {
      for (const tokensBatch of tokensBatches) {
        await this.updateChainBatchBalances(chain, address, tokensBatch);

        await new Promise((r) =>
          setTimeout(r, this.chainConfigs[chain].updateBatchInterval)
        );
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
    tokensBatch: string[]
  ) => {
    // get address assets
    const abstractChain = ChainHandler.getInstance().getChain(chain);
    const balance = await abstractChain.getAddressAssets(address, tokensBatch);

    // upsert batch tokens balances
    await this.chainAddressTokenBalanceRepository.upsert(
      balance.tokens.map((token) => ({
        chain,
        address,
        tokenId: token.id,
        lastUpdate: Date.now(),
        balance: token.value,
      })),
      ['chain', 'address', 'tokenId']
    );
  };
}

export default BalanceHandler;
