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
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';

import { ChainAddressTokenBalanceEntity } from '../db/entities/ChainAddressTokenBalanceEntity';
import { ChainNativeToken, SUPPORTED_CHAINS } from '../utils/constants';
import ChainHandler from './ChainHandler';
import { TokenHandler } from './tokenHandler';
import Utils from '../utils/Utils';
import NestedIterator from '../utils/NestedIterator';
import IntervalTimer from '../utils/IntervalTimer';
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

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class BalanceHandler {
  private static instance?: BalanceHandler;
  readonly chainAddressTokenBalanceRepository: Repository<ChainAddressTokenBalanceEntity>;
  chainTimers: Record<string, IntervalTimer> = {};
  chainBatchTimers: Record<string, IntervalTimer> = {};
  chainConfigs: Record<string, ChainBalanceConfig> = {};

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
            ...this.getChainIntervalConfig('ergo'),
            tokensPerMinute:
              GuardsErgoConfigs.chainNetworkName === NODE_NETWORK
                ? Configs.balanceHandler.ergo.tokensPerMinute!.node
                : Configs.balanceHandler.ergo.tokensPerMinute!.explorer,
          };
          break;
        case CARDANO_CHAIN:
          config = {
            ...this.getChainIntervalConfig('cardano'),
            tokensPerMinute:
              GuardsCardanoConfigs.chainNetworkName === KOIOS_NETWORK
                ? Configs.balanceHandler.cardano.tokensPerMinute!.koios
                : Configs.balanceHandler.cardano.tokensPerMinute!.blockfrost,
          };
          break;
        case BITCOIN_CHAIN:
          config = {
            ...this.getChainIntervalConfig('bitcoin'),
            tokensPerMinute:
              Configs.balanceHandler.bitcoin.tokensPerMinute!.esplora,
          };
          break;
        case DOGE_CHAIN:
          config = {
            ...this.getChainIntervalConfig('doge'),
            tokensPerMinute:
              Configs.balanceHandler.doge.tokensPerMinute!.esplora,
          };
          break;
        case ETHEREUM_CHAIN:
          config = {
            ...this.getChainIntervalConfig('ethereum'),
            tokensPerMinute:
              Configs.balanceHandler.ethereum.tokensPerMinute!.rpc,
          };
          break;
        case BINANCE_CHAIN:
          config = {
            ...this.getChainIntervalConfig('binance'),
            tokensPerMinute:
              Configs.balanceHandler.binance.tokensPerMinute!.rpc,
          };
          break;
        default:
          throw Error(`Chain [${chain}] is not implemented`);
      }

      this.chainConfigs[chain] = config;

      this.chainTimers[chain] = new IntervalTimer(
        config.updateInterval * 1000,
        async () => {
          try {
            await this.updateChainBalances(chain);
          } catch (error) {
            logger.error(
              `An error occurred while updating balances of chain ${chain}: ${error}`
            );
            if (error.stack) logger.error(error.stack);
          }
        }
      );

      this.chainTimers[chain].start();
    }
  }

  /**
   * initializes the BalanceHandler singleton by the given DataSource
   * @param dataSource
   * @returns promise of void
   */
  static init = async (dataSource: DataSource) => {
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
   * gets interval configs of a chain
   * @param chain
   * @returns an object containing updateInterval and updateBatchInterval
   */
  protected getChainIntervalConfig = (
    chain: string
  ): { updateInterval: number; updateBatchInterval: number } => {
    return {
      updateInterval:
        Configs.balanceHandler[chain].updateInterval ??
        Configs.balanceHandler.default.updateInterval!,
      updateBatchInterval:
        Configs.balanceHandler[chain].updateBatchInterval ??
        Configs.balanceHandler.default.updateBatchInterval!,
    };
  };

  /**
   * gets addresses for the given chain using its configuration
   * @param chain
   * @returns array of chain's addresses
   */
  protected getChainAddresses = (chain: string): string[] => {
    const chainConfig = ChainHandler.getInstance()
      .getChain(chain)
      .getChainConfigs();

    return [chainConfig.addresses.lock, chainConfig.addresses.cold];
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
   * creates a nested iterator of chain addresses and batched tokens by the given chain configuration
   * @param chain
   * @returns NestedIterator<(string | string[])[]>
   */
  protected getChainJobs = (
    chain: string
  ): NestedIterator<(string | string[])[]> => {
    // get addresses and tokens of the chain
    const addresses = this.getChainAddresses(chain);
    const supportedTokenIds = this.getChainTokenIds(chain);

    // batch the tokens by token per minute config of the chain
    const tokensBatches = chunk(
      supportedTokenIds,
      this.chainConfigs[chain].tokensPerMinute
    );

    // create a nested iterator of chain's addresses and its batched tokens
    return new NestedIterator([addresses, tokensBatches]);
  };

  /**
   * updates the balances of addresses and tokens for the given chain by executing periodic batch requests
   * @param chain
   * @returns promise of void
   */
  updateChainBalances = async (chain: string) => {
    // iterator of chain addresses and batched tokens
    const addressTokenBatches: NestedIterator<(string | string[])[]> =
      this.getChainJobs(chain);

    // interval
    const batchJobInterval = this.chainConfigs[chain].updateBatchInterval;

    const job = (value: (string | string[])[]) =>
      this.updateChainBatchBalances(
        chain,
        value[0] as string,
        value[1] as string[]
      );

    Utils.runIntervalIterator(addressTokenBatches, batchJobInterval, 2, job);
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
