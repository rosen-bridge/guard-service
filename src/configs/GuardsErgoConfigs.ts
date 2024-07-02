import config from 'config';
import Configs, {
  getChainNetworkName,
  getConfigIntKeyOrDefault,
} from './Configs';
import { rosenConfig } from './RosenConfig';
import { ERGO_CHAIN, ErgoConfigs } from '@rosen-chains/ergo';
import { NODE_NETWORK } from '@rosen-chains/ergo-node-network';
import { EXPLORER_NETWORK } from '@rosen-chains/ergo-explorer-network';

class GuardsErgoConfigs {
  // service configs
  static chainNetworkName = getChainNetworkName('ergo.chainNetwork', [
    NODE_NETWORK,
    EXPLORER_NETWORK,
  ]);
  static explorer = {
    url: config.get<string>('ergo.explorer.url'),
    timeout: config.get<number>('ergo.explorer.timeout'), // seconds
  };
  static node = {
    url: config.get<string>('ergo.node.url'),
    timeout: config.get<number>('ergo.node.timeout'), // seconds
  };

  // value configs
  static minimumErg = BigInt(config.get<string>('ergo.minBoxValue'));
  static additionalErgOnPayment = BigInt(
    config.get<string>('ergo.additionalErgOnPayment')
  );
  static txFee = BigInt(config.get<string>('ergo.fee'));

  // reward configs
  static bridgeFeeRepoAddress: string = config.get<string>(
    'reward.bridgeFeeRepoAddress'
  );
  static rsnEmissionAddress: string = config.get<string>(
    'reward.RSNEmissionAddress'
  );
  static networkFeeRepoAddress: string = config.get<string>(
    'reward.networkFeeRepoAddress'
  );
  static watchersSharePercent = BigInt(
    getConfigIntKeyOrDefault('reward.watchersSharePercent', 50)
  );
  static watchersRSNSharePercent = BigInt(
    getConfigIntKeyOrDefault('reward.watchersRSNSharePercent', 0)
  );

  // confirmation configs
  static observationConfirmation = getConfigIntKeyOrDefault(
    'ergo.confirmation.observation',
    20
  );
  static eventConfirmation = getConfigIntKeyOrDefault(
    'ergo.confirmation.event',
    20
  );
  static paymentTxConfirmation = getConfigIntKeyOrDefault(
    'ergo.confirmation.payment',
    20
  );
  static coldTxConfirmation = getConfigIntKeyOrDefault(
    'ergo.confirmation.cold',
    20
  );
  static manualTxConfirmation = getConfigIntKeyOrDefault(
    'ergo.confirmation.manual',
    20
  );

  // scanner configs
  static initialHeight = getConfigIntKeyOrDefault('ergo.initialHeight', 925000);
  static scannerInterval = getConfigIntKeyOrDefault(
    'ergo.scannerInterval',
    180
  );

  // the ergo-related contract, addresses and tokens in rosen bridge
  static ergoContractConfig = rosenConfig.contractReader(ERGO_CHAIN);

  // Ergo rosen extractor required configs
  static extractorOptions = {
    lockAddress: this.ergoContractConfig.lockAddress,
    tokens: Configs.tokens(),
  };

  // ErgoChain required configs
  static chainConfigs: ErgoConfigs = {
    fee: this.txFee,
    confirmations: {
      observation: this.observationConfirmation,
      payment: this.paymentTxConfirmation,
      cold: this.coldTxConfirmation,
      manual: this.manualTxConfirmation,
    },
    addresses: {
      lock: this.ergoContractConfig.lockAddress,
      cold: this.ergoContractConfig.coldAddress,
      permit: this.ergoContractConfig.permitAddress,
      fraud: this.ergoContractConfig.fraudAddress,
    },
    rwtId: this.ergoContractConfig.RWTId,
    minBoxValue: this.minimumErg,
    eventTxConfirmation: this.eventConfirmation,
  };
}

export default GuardsErgoConfigs;
