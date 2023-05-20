import { AbstractChain } from '@rosen-chains/abstract-chain';
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

class ChainHandler {
  /**
   * generates Ergo network and chain objects using configs
   * @returns ErgoChain object
   */
  private static generateErgoChain = (): ErgoChain => {
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
  private static generateCardanoChain = (): CardanoChain => {
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

  static ergoChain = this.generateErgoChain();
  static cardanoChain = this.generateCardanoChain();

  /**
   * gets chain object by name
   * @param chain chain name
   * @returns chain object
   */
  static getChain = (chain: string): AbstractChain => {
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
  static getErgoChain = (): ErgoChain => {
    return this.ergoChain;
  };
}

export default ChainHandler;
