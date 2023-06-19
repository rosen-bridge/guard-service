import { AbstractChain, TransactionTypes } from '@rosen-chains/abstract-chain';
import {
  AbstractCardanoNetwork,
  CARDANO_CHAIN,
  CardanoChain,
} from '@rosen-chains/cardano';
import { AbstractErgoNetwork, ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import CardanoKoiosNetwork from '@rosen-chains/cardano-koios-network';
import ErgoNodeNetwork from '@rosen-chains/ergo-node-network';
import ErgoExplorerNetwork from '@rosen-chains/ergo-explorer-network';
import Configs from '../helpers/Configs';
import { guardConfig } from '../helpers/GuardConfig';
import GuardsCardanoConfigs from '../helpers/GuardsCardanoConfigs';
import GuardsErgoConfigs from '../helpers/GuardsErgoConfigs';
import MinimumFee from '../event/MinimumFee';
import MultiSigHandler from '../guard/multisig/MultiSig';
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
   * generates Ergo network and chain objects using configs
   * @returns ErgoChain object
   */
  private generateErgoChain = (): ErgoChain => {
    let network: AbstractErgoNetwork;
    switch (GuardsErgoConfigs.chainNetworkName) {
      case 'node':
        network = new ErgoNodeNetwork({
          nodeBaseUrl: GuardsErgoConfigs.node.url,
          extractorOptions: GuardsErgoConfigs.extractorOptions,
          logger: loggerFactory('NodeNetwork'),
        });
        break;
      case 'explorer':
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
      guardConfig.publicKeys,
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
      case ERGO_CHAIN:
        if (
          type === TransactionTypes.payment ||
          type === TransactionTypes.reward
        )
          return GuardsErgoConfigs.paymentTxConfirmation;
        else if (type === TransactionTypes.coldStorage)
          return GuardsErgoConfigs.coldTxConfirmation;
        else if (type === TransactionTypes.lock)
          return GuardsErgoConfigs.observationConfirmation;
        else
          throw Error(
            `Confirmation for type [${type}] is not found on Ergo chain`
          );
      case CARDANO_CHAIN:
        if (type === TransactionTypes.payment)
          return GuardsCardanoConfigs.paymentConfirmation;
        else if (type === TransactionTypes.coldStorage)
          return GuardsCardanoConfigs.coldTxConfirmation;
        else if (type === TransactionTypes.lock)
          return GuardsCardanoConfigs.observationConfirmation;
        else
          throw Error(
            `Confirmation for type [${type}] is not found on Cardano chain`
          );
      default:
        throw Error(`Cannot get any config for chain [${chain}]`);
    }
  };
}

export default ChainHandler;
