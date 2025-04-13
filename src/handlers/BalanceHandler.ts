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

import { ChainAddressTokenBalanceEntity } from '../db/entities/ChainAddressTokenBalanceEntity';
import { ChainNativeToken, SUPPORTED_CHAINS } from '../utils/constants';
import ChainHandler from './ChainHandler';
import { TokenHandler } from './tokenHandler';
import Utils from '../utils/Utils';
import NestedIterator from '../utils/NestedIterator';
import IntervalTimer from '../utils/IntervalTimer';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import GuardsBitcoinConfigs from '../configs/GuardsBitcoinConfigs';
import GuardsDogeConfigs from '../configs/GuardsDogeConfigs';
import GuardsEthereumConfigs from '../configs/GuardsEthereumConfigs';
import GuardsBinanceConfigs from '../configs/GuardsBinanceConfigs';

export type ChainBalanceConfig = {
  tokensPerMinute: number;
  updateBalanceInterval: number;
  updateChainBatchBalancesInterval: number;
  updateBatchBalanceMaxRetries: number;
};

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
      let config: ChainBalanceConfig = {
        tokensPerMinute: 0,
        updateBalanceInterval: 0,
        updateChainBatchBalancesInterval: 0,
        updateBatchBalanceMaxRetries: 0,
      };

      switch (chain) {
        case ERGO_CHAIN:
          config = {
            tokensPerMinute:
              GuardsErgoConfigs.chainNetworkName === NODE_NETWORK
                ? GuardsErgoConfigs.node.tokensPerMinute
                : GuardsErgoConfigs.explorer.tokensPerMinute,
            updateBalanceInterval: GuardsErgoConfigs.updateBalanceInterval,
            updateChainBatchBalancesInterval:
              GuardsErgoConfigs.updateChainBatchBalancesInterval,
            updateBatchBalanceMaxRetries:
              GuardsErgoConfigs.updateBatchBalanceMaxRetries,
          };
          break;
        case CARDANO_CHAIN:
          config = {
            tokensPerMinute:
              GuardsCardanoConfigs.chainNetworkName === KOIOS_NETWORK
                ? GuardsCardanoConfigs.koios.tokensPerMinute
                : GuardsCardanoConfigs.blockfrost.tokensPerMinute,
            updateBalanceInterval: GuardsCardanoConfigs.updateBalanceInterval,
            updateChainBatchBalancesInterval:
              GuardsCardanoConfigs.updateChainBatchBalancesInterval,
            updateBatchBalanceMaxRetries:
              GuardsCardanoConfigs.updateBatchBalanceMaxRetries,
          };
          break;
        case BITCOIN_CHAIN:
          config = {
            tokensPerMinute: GuardsBitcoinConfigs.esplora.tokensPerMinute,
            updateBalanceInterval: GuardsBitcoinConfigs.updateBalanceInterval,
            updateChainBatchBalancesInterval:
              GuardsBitcoinConfigs.updateChainBatchBalancesInterval,
            updateBatchBalanceMaxRetries:
              GuardsBitcoinConfigs.updateBatchBalanceMaxRetries,
          };
          break;
        case DOGE_CHAIN:
          config = {
            tokensPerMinute: GuardsDogeConfigs.esplora.tokensPerMinute,
            updateBalanceInterval: GuardsDogeConfigs.updateBalanceInterval,
            updateChainBatchBalancesInterval:
              GuardsDogeConfigs.updateChainBatchBalancesInterval,
            updateBatchBalanceMaxRetries:
              GuardsDogeConfigs.updateBatchBalanceMaxRetries,
          };
          break;
        case ETHEREUM_CHAIN:
          config = {
            tokensPerMinute: GuardsEthereumConfigs.rpc.tokensPerMinute,
            updateBalanceInterval: GuardsEthereumConfigs.updateBalanceInterval,
            updateChainBatchBalancesInterval:
              GuardsEthereumConfigs.updateChainBatchBalancesInterval,
            updateBatchBalanceMaxRetries:
              GuardsEthereumConfigs.updateBatchBalanceMaxRetries,
          };
          break;
        case BINANCE_CHAIN:
          config = {
            tokensPerMinute: GuardsBinanceConfigs.rpc.tokensPerMinute,
            updateBalanceInterval: GuardsBinanceConfigs.updateBalanceInterval,
            updateChainBatchBalancesInterval:
              GuardsBinanceConfigs.updateChainBatchBalancesInterval,
            updateBatchBalanceMaxRetries:
              GuardsBinanceConfigs.updateBatchBalanceMaxRetries,
          };
          break;
        default:
          throw Error(`Chain [${chain}] is not implemented`);
      }

      this.chainConfigs[chain] = config;

      this.chainTimers[chain] = new IntervalTimer(
        config.updateBalanceInterval * 1000,
        async () => {
          try {
            await this.updateChainBalances(chain);
          } catch (error) {
            // TODO: max retry reached, what to do?
          }
        },
        10_000
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
   * retrieves all ChainAddressTokenBalanceEntity records for native tokens
   * @returns promise of ChainAddressTokenBalanceEntity array
   */
  getBalances = async (): Promise<ChainAddressTokenBalanceEntity[]> => {
    const nativeTokenIds: Set<string> = new Set();

    for (const chain of SUPPORTED_CHAINS) {
      nativeTokenIds.add(ChainNativeToken[chain]);
    }

    const balances = await this.chainAddressTokenBalanceRepository.findBy({
      tokenId: In([...nativeTokenIds]),
    });

    return balances;
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
  protected getChainTokens = (chain: string) => {
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
    const supportedTokenIds = this.getChainTokens(chain);

    // batch the tokens by token per minute config of the chain
    const tokensBatches = Utils.batchArray(
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
    const batchJobInterval =
      this.chainConfigs[chain].updateChainBatchBalancesInterval;

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
    // retry if failed, until max-retry count
    await Utils.retryUntil(
      this.chainConfigs[chain].updateBatchBalanceMaxRetries,
      async () => {
        // get address assets
        const abstractChain = ChainHandler.getInstance().getChain(chain);
        const balance = await abstractChain.getAddressAssets(
          address,
          tokensBatch
        );

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
      }
    );
  };
}

export default BalanceHandler;
