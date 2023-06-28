import { AbstractChain, TransactionTypes } from '@rosen-chains/abstract-chain';
import {
  AbstractCardanoNetwork,
  CARDANO_CHAIN,
  CardanoChain,
} from '@rosen-chains/cardano';
import { AbstractErgoNetwork, ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import CardanoKoiosNetwork from '@rosen-chains/cardano-koios-network';
import ErgoNodeNetwork, { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import ErgoExplorerNetwork, {
  EXPLORER_NETWORK,
} from '@rosen-chains/ergo-explorer-network';
import Configs from '../configs/Configs';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import MinimumFee from '../event/MinimumFee';
import MultiSigHandler from '../guard/multisig/MultiSigHandler';
import { loggerFactory } from '../log/Logger';

const logger = loggerFactory(import.meta.url);

class ChainHandler {
  private static instance: ChainHandler;
  private ergoChain: ErgoChain;
  private cardanoChain: CardanoChain;

  private constructor() {
    this.ergoChain = this.generateErgoChain();
    this.cardanoChain = this.generateCardanoChain();
    logger.info('ChainHandler instantiated');
  }

  /**
   * generates a ChainHandler object if it doesn't exist
   * @returns ChainHandler instance
   */
  public static getInstance = () => {
    if (!ChainHandler.instance) {
      logger.debug("ChainHandler instance didn't exist. Creating a new one");
      ChainHandler.instance = new ChainHandler();
    }
    return ChainHandler.instance;
  };

  /**
   * gets cold storage address for a chain
   * @param chain
   */
  getChainColdAddress = (chain: string): string => {
    switch (chain) {
      case ERGO_CHAIN:
        return GuardsErgoConfigs.coldAddress;
      case CARDANO_CHAIN:
        return GuardsCardanoConfigs.coldAddress;
      default:
        throw Error(`Cannot get cold storage config for chain [${chain}]`);
    }
  };

  /**
   * generates Ergo network and chain objects using configs
   * @returns ErgoChain object
   */
  private generateErgoChain = (): ErgoChain => {
    let network: AbstractErgoNetwork;
    switch (GuardsErgoConfigs.chainNetworkName) {
      case NODE_NETWORK:
        network = new ErgoNodeNetwork({
          nodeBaseUrl: GuardsErgoConfigs.node.url,
          extractorOptions: GuardsErgoConfigs.extractorOptions,
          logger: loggerFactory('NodeNetwork'),
        });
        break;
      case EXPLORER_NETWORK:
        network = new ErgoExplorerNetwork({
          explorerBaseUrl: GuardsErgoConfigs.explorer.url,
          extractorOptions: GuardsErgoConfigs.extractorOptions,
          logger: loggerFactory('ExplorerNetwork'),
        });
        break;
      default:
        throw Error(
          `No case is defined for network [${GuardsErgoConfigs.chainNetworkName}]`
        );
    }
    const multiSigSignFunction = MultiSigHandler.getInstance(
      Configs.guardSecret
    ).sign;
    return new ErgoChain(
      network,
      GuardsErgoConfigs.chainConfigs,
      MinimumFee.bridgeMinimumFee.feeRatioDivisor,
      multiSigSignFunction,
      loggerFactory('ErgoChain')
    );
  };

  /**
   * generates Cardano network and chain objects using configs
   * @returns CardanoChain object
   */
  private generateCardanoChain = (): CardanoChain => {
    let network: AbstractCardanoNetwork;
    switch (GuardsCardanoConfigs.chainNetworkName) {
      case 'koios':
        network = new CardanoKoiosNetwork(
          GuardsCardanoConfigs.koios.url,
          GuardsCardanoConfigs.lockAddress,
          Configs.tokens(),
          loggerFactory('KoiosNetwork')
        );
        break;
      default:
        throw Error(
          `No case is defined for network [${GuardsCardanoConfigs.chainNetworkName}]`
        );
    }
    // TODO: replace this with TSS package sign function
    const tssSignFunction = () => {
      throw Error(`TSS signer is not implemented yet`);
    };
    return new CardanoChain(
      network,
      GuardsCardanoConfigs.chainConfigs,
      Configs.tokenMap,
      MinimumFee.bridgeMinimumFee.feeRatioDivisor,
      tssSignFunction,
      loggerFactory('CardanoChain')
    );
  };

  /**
   * gets chain object by name
   * @param chain chain name
   * @returns chain object
   */
  getChain = (chain: string): AbstractChain => {
    switch (chain) {
      case ERGO_CHAIN:
        return this.ergoChain;
      case CARDANO_CHAIN:
        return this.cardanoChain;
      default:
        throw Error(`Chain [${chain}] is not implemented`);
    }
  };

  /**
   * gets ergo chain object
   * @returns chain object
   */
  getErgoChain = (): ErgoChain => {
    return this.ergoChain;
  };

  /**
   * gets required confirmation for a transaction based on it's chain and type
   * @param chain transaction chain
   * @param type transaction type
   */
  getRequiredConfirmation = (chain: string, type: string): number => {
    switch (chain) {
      case ERGO_CHAIN: {
        switch (type) {
          case TransactionTypes.payment:
          case TransactionTypes.reward:
            return GuardsErgoConfigs.paymentTxConfirmation;
          case TransactionTypes.coldStorage:
            return GuardsErgoConfigs.coldTxConfirmation;
          case TransactionTypes.lock:
            return GuardsErgoConfigs.observationConfirmation;
          default:
            throw Error(
              `Confirmation for type [${type}] is not found on Ergo chain`
            );
        }
      }
      case CARDANO_CHAIN: {
        switch (type) {
          case TransactionTypes.payment:
            return GuardsCardanoConfigs.paymentConfirmation;
          case TransactionTypes.coldStorage:
            return GuardsCardanoConfigs.coldTxConfirmation;
          case TransactionTypes.lock:
            return GuardsCardanoConfigs.observationConfirmation;
          default:
            throw Error(
              `Confirmation for type [${type}] is not found on Cardano chain`
            );
        }
      }
      default:
        throw Error(`Cannot get any config for chain [${chain}]`);
    }
  };
}

export default ChainHandler;
