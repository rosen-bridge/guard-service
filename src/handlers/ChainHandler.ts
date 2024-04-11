import { AbstractChain } from '@rosen-chains/abstract-chain';
import {
  AbstractCardanoNetwork,
  CARDANO_CHAIN,
  CardanoChain,
} from '@rosen-chains/cardano';
import { AbstractErgoNetwork, ERGO_CHAIN, ErgoChain } from '@rosen-chains/ergo';
import CardanoKoiosNetwork, {
  KOIOS_NETWORK,
} from '@rosen-chains/cardano-koios-network';
import ErgoNodeNetwork, { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import ErgoExplorerNetwork, {
  EXPLORER_NETWORK,
} from '@rosen-chains/ergo-explorer-network';
import Configs from '../configs/Configs';
import GuardsCardanoConfigs from '../configs/GuardsCardanoConfigs';
import GuardsErgoConfigs from '../configs/GuardsErgoConfigs';
import MinimumFee from '../event/MinimumFee';
import MultiSigHandler from '../guard/multisig/MultiSigHandler';
import Tss from '../guard/Tss';
import WinstonLogger from '@rosen-bridge/winston-logger';
import { BLOCKFROST_NETWORK } from '@rosen-chains/cardano-blockfrost-network';
import CardanoBlockFrostNetwork from '@rosen-chains/cardano-blockfrost-network/dist/CardanoBlockFrostNetwork';

const logger = WinstonLogger.getInstance().getLogger(import.meta.url);

class ChainHandler {
  private static instance: ChainHandler;
  private readonly ergoChain: ErgoChain;
  private readonly cardanoChain: CardanoChain;

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
      case NODE_NETWORK:
        network = new ErgoNodeNetwork({
          nodeBaseUrl: GuardsErgoConfigs.node.url,
          logger: WinstonLogger.getInstance().getLogger('NodeNetwork'),
        });
        break;
      case EXPLORER_NETWORK:
        network = new ErgoExplorerNetwork({
          explorerBaseUrl: GuardsErgoConfigs.explorer.url,
          logger: WinstonLogger.getInstance().getLogger('ExplorerNetwork'),
        });
        break;
      default:
        throw Error(
          `No case is defined for network [${GuardsErgoConfigs.chainNetworkName}]`
        );
    }
    const multiSigSignFunction = MultiSigHandler.getInstance().sign;
    return new ErgoChain(
      network,
      GuardsErgoConfigs.chainConfigs,
      MinimumFee.bridgeMinimumFee.feeRatioDivisor,
      Configs.tokens(),
      multiSigSignFunction,
      WinstonLogger.getInstance().getLogger('ErgoChain')
    );
  };

  /**
   * generates Cardano network and chain objects using configs
   * @returns CardanoChain object
   */
  private generateCardanoChain = (): CardanoChain => {
    let network: AbstractCardanoNetwork;
    switch (GuardsCardanoConfigs.chainNetworkName) {
      case KOIOS_NETWORK:
        network = new CardanoKoiosNetwork(
          GuardsCardanoConfigs.koios.url,
          GuardsCardanoConfigs.koios.authToken,
          WinstonLogger.getInstance().getLogger('KoiosNetwork')
        );
        break;
      case BLOCKFROST_NETWORK:
        network = new CardanoBlockFrostNetwork(
          GuardsCardanoConfigs.blockfrost.projectId,
          GuardsCardanoConfigs.blockfrost.url,
          WinstonLogger.getInstance().getLogger('BlockFrostNetwork')
        );
        break;
      default:
        throw Error(
          `No case is defined for network [${GuardsCardanoConfigs.chainNetworkName}]`
        );
    }
    const tssSignFunction = Tss.getInstance().edwardSign;
    return new CardanoChain(
      network,
      GuardsCardanoConfigs.chainConfigs,
      MinimumFee.bridgeMinimumFee.feeRatioDivisor,
      Configs.tokens(),
      tssSignFunction,
      WinstonLogger.getInstance().getLogger('CardanoChain')
    );
  };

  /**
   * gets chain object by name
   * @param chain chain name
   * @returns chain object
   */
  getChain = (chain: string): AbstractChain<any> => {
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
}

export default ChainHandler;
