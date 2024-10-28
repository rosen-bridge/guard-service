import { AbstractChain } from '@rosen-chains/abstract-chain';
import {
  AbstractCardanoNetwork,
  CARDANO_CHAIN,
  CardanoChain,
} from '@rosen-chains/cardano';
import {
  AbstractBitcoinNetwork,
  BITCOIN_CHAIN,
  BitcoinChain,
} from '@rosen-chains/bitcoin';
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
import MultiSigHandler from '../guard/multisig/MultiSigHandler';
import Tss from '../guard/Tss';
import { DefaultLoggerFactory } from '@rosen-bridge/abstract-logger';
import { BLOCKFROST_NETWORK } from '@rosen-chains/cardano-blockfrost-network';
import CardanoBlockFrostNetwork from '@rosen-chains/cardano-blockfrost-network';
import BitcoinEsploraNetwork from '@rosen-chains/bitcoin-esplora';
import GuardsBitcoinConfigs from '../configs/GuardsBitcoinConfigs';
import { EthereumChain } from '@rosen-chains/ethereum';
import { AbstractEvmNetwork } from '@rosen-chains/evm';
import GuardsEthereumConfigs from '../configs/GuardsEthereumConfigs';
import EvmRpcNetwork from '@rosen-chains/evm-rpc';
import { dataSource } from '../db/dataSource';
import { ETHEREUM_CHAIN } from '@rosen-chains/ethereum';
import { BinanceChain } from '@rosen-chains/binance';
import GuardsBinanceConfigs from '../configs/GuardsBinanceConfigs';
import { BINANCE_CHAIN } from '@rosen-chains/binance';

const logger = DefaultLoggerFactory.getInstance().getLogger(import.meta.url);

class ChainHandler {
  private static instance: ChainHandler;
  private readonly ergoChain: ErgoChain;
  private readonly cardanoChain: CardanoChain;
  private readonly bitcoinChain: BitcoinChain;
  private readonly ethereumChain: EthereumChain;
  private readonly binanceChain: BinanceChain;

  private constructor() {
    this.ergoChain = this.generateErgoChain();
    this.cardanoChain = this.generateCardanoChain();
    this.bitcoinChain = this.generateBitcoinChain();
    this.ethereumChain = this.generateEthereumChain();
    this.binanceChain = this.generateBinanceChain();
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
          logger: DefaultLoggerFactory.getInstance().getLogger('NodeNetwork'),
        });
        break;
      case EXPLORER_NETWORK:
        network = new ErgoExplorerNetwork({
          explorerBaseUrl: GuardsErgoConfigs.explorer.url,
          logger:
            DefaultLoggerFactory.getInstance().getLogger('ExplorerNetwork'),
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
      Configs.tokens(),
      multiSigSignFunction,
      DefaultLoggerFactory.getInstance().getLogger('ErgoChain')
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
          DefaultLoggerFactory.getInstance().getLogger('KoiosNetwork')
        );
        break;
      case BLOCKFROST_NETWORK:
        network = new CardanoBlockFrostNetwork(
          GuardsCardanoConfigs.blockfrost.projectId,
          GuardsCardanoConfigs.blockfrost.url,
          DefaultLoggerFactory.getInstance().getLogger('BlockFrostNetwork')
        );
        break;
      default:
        throw Error(
          `No case is defined for network [${GuardsCardanoConfigs.chainNetworkName}]`
        );
    }
    const chainCode = GuardsCardanoConfigs.tssChainCode;
    const edwardSign = Tss.getInstance().edwardSign;
    const tssSignFunctionWrapper = async (
      txHash: Uint8Array
    ): Promise<string> => {
      const res = await edwardSign(
        Buffer.from(txHash).toString('hex'),
        chainCode
      );
      return res.signature;
    };
    return new CardanoChain(
      network,
      GuardsCardanoConfigs.chainConfigs,
      Configs.tokens(),
      tssSignFunctionWrapper,
      DefaultLoggerFactory.getInstance().getLogger('CardanoChain')
    );
  };

  /**
   * generates Bitcoin network and chain objects using configs
   * @returns BitcoinChain object
   */
  private generateBitcoinChain = (): BitcoinChain => {
    let network: AbstractBitcoinNetwork;
    switch (GuardsBitcoinConfigs.chainNetworkName) {
      case 'esplora':
        network = new BitcoinEsploraNetwork(
          GuardsBitcoinConfigs.esplora.url,
          DefaultLoggerFactory.getInstance().getLogger('EsploraNetwork')
        );
        break;
      default:
        throw Error(
          `No case is defined for network [${GuardsBitcoinConfigs.chainNetworkName}]`
        );
    }
    const chainCode = GuardsBitcoinConfigs.tssChainCode;
    const derivationPath = GuardsBitcoinConfigs.derivationPath;
    const curveSign = Tss.getInstance().curveSign;
    const tssSignFunctionWrapper = async (
      txHash: Uint8Array
    ): Promise<{
      signature: string;
      signatureRecovery: string;
    }> => {
      const res = await curveSign(
        Buffer.from(txHash).toString('hex'),
        chainCode,
        derivationPath
      );
      return {
        signature: res.signature,
        signatureRecovery: res.signatureRecovery!,
      };
    };
    return new BitcoinChain(
      network,
      GuardsBitcoinConfigs.chainConfigs,
      Configs.tokens(),
      tssSignFunctionWrapper,
      DefaultLoggerFactory.getInstance().getLogger('BitcoinChain')
    );
  };

  /**
   * generates Ethereum network and chain objects using configs
   * @returns EthereumChain object
   */
  private generateEthereumChain = (): EthereumChain => {
    let network: AbstractEvmNetwork;
    switch (GuardsEthereumConfigs.chainNetworkName) {
      case 'rpc':
        network = new EvmRpcNetwork(
          ETHEREUM_CHAIN,
          GuardsEthereumConfigs.rpc.url,
          dataSource,
          GuardsEthereumConfigs.ethereumContractConfig.lockAddress,
          GuardsEthereumConfigs.rpc.authToken,
          DefaultLoggerFactory.getInstance().getLogger('EthereumRpcNetwork')
        );
        break;
      default:
        throw Error(
          `No case is defined for network [${GuardsEthereumConfigs.chainNetworkName}]`
        );
    }
    const chainCode = GuardsEthereumConfigs.tssChainCode;
    const derivationPath = GuardsEthereumConfigs.derivationPath;
    const curveSign = Tss.getInstance().curveSign;
    const tssSignFunctionWrapper = async (
      txHash: Uint8Array
    ): Promise<{
      signature: string;
      signatureRecovery: string;
    }> => {
      const res = await curveSign(
        Buffer.from(txHash).toString('hex'),
        chainCode,
        derivationPath
      );
      return {
        signature: res.signature,
        signatureRecovery: res.signatureRecovery!,
      };
    };
    // get all supported tokens on Ethereum
    const supportedTokens = Configs.tokens()
      .tokens.filter(
        (tokenSet) =>
          Object.keys(tokenSet).includes(ETHEREUM_CHAIN) &&
          tokenSet[ETHEREUM_CHAIN].metaData.type !== 'native'
      )
      .map(
        (tokenSet) =>
          tokenSet[ETHEREUM_CHAIN][Configs.tokenMap.getIdKey(ETHEREUM_CHAIN)]
      );
    return new EthereumChain(
      network,
      GuardsEthereumConfigs.chainConfigs,
      Configs.tokens(),
      supportedTokens,
      tssSignFunctionWrapper,
      DefaultLoggerFactory.getInstance().getLogger('EthereumChain')
    );
  };

  /**
   * generates Binance network and chain objects using configs
   * @returns BinanceChain object
   */
  private generateBinanceChain = (): BinanceChain => {
    let network: AbstractEvmNetwork;
    switch (GuardsBinanceConfigs.chainNetworkName) {
      case 'rpc':
        network = new EvmRpcNetwork(
          BINANCE_CHAIN,
          GuardsBinanceConfigs.rpc.url,
          dataSource,
          GuardsBinanceConfigs.binanceContractConfig.lockAddress,
          GuardsBinanceConfigs.rpc.authToken,
          DefaultLoggerFactory.getInstance().getLogger('BinanceRpcNetwork')
        );
        break;
      default:
        throw Error(
          `No case is defined for network [${GuardsBinanceConfigs.chainNetworkName}]`
        );
    }
    const chainCode = GuardsBinanceConfigs.tssChainCode;
    const derivationPath = GuardsBinanceConfigs.derivationPath;
    const curveSign = Tss.getInstance().curveSign;
    const tssSignFunctionWrapper = async (
      txHash: Uint8Array
    ): Promise<{
      signature: string;
      signatureRecovery: string;
    }> => {
      const res = await curveSign(
        Buffer.from(txHash).toString('hex'),
        chainCode,
        derivationPath
      );
      return {
        signature: res.signature,
        signatureRecovery: res.signatureRecovery!,
      };
    };
    // get all supported tokens on Binance
    const supportedTokens = Configs.tokens()
      .tokens.filter(
        (tokenSet) =>
          Object.keys(tokenSet).includes(BINANCE_CHAIN) &&
          tokenSet[BINANCE_CHAIN].metaData.type !== 'native'
      )
      .map(
        (tokenSet) =>
          tokenSet[BINANCE_CHAIN][Configs.tokenMap.getIdKey(BINANCE_CHAIN)]
      );
    return new BinanceChain(
      network,
      GuardsBinanceConfigs.chainConfigs,
      Configs.tokens(),
      supportedTokens,
      tssSignFunctionWrapper,
      DefaultLoggerFactory.getInstance().getLogger('BinanceChain')
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
      case BITCOIN_CHAIN:
        return this.bitcoinChain;
      case ETHEREUM_CHAIN:
        return this.ethereumChain;
      case BINANCE_CHAIN:
        return this.binanceChain;
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
