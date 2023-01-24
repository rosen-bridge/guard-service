import config from 'config';
import { rosenConfig } from '../../../helpers/RosenConfig';
import ChainsConstants from '../../ChainsConstants';
import * as wasm from 'ergo-lib-wasm-nodejs';
import { getConfigIntKeyOrDefault } from '../../../helpers/Configs';

class ErgoConfigs {
  // service configs
  static explorer = {
    url: config.get<string>('ergo.explorer.url'),
    timeout: getConfigIntKeyOrDefault('ergo.explorer.timeout', 8), // seconds
  };
  static networkType =
    config.get('ergo.networkType') === 'mainnet'
      ? wasm.NetworkPrefix.Mainnet
      : wasm.NetworkPrefix.Testnet;
  static node = {
    url: config.get<string>('ergo.node.url'),
    timeout: getConfigIntKeyOrDefault('ergo.node.timeout', 8), // seconds
  };
  static minimumErg = BigInt(config.get<string>('ergo.minBoxValue'));
  static txFee = BigInt(config.get<string>('ergo.fee'));

  static bridgeFeeRepoAddress: string = config.get?.(
    'reward.bridgeFeeRepoAddress'
  );
  static networkFeeRepoAddress: string = config.get?.(
    'reward.networkFeeRepoAddress'
  );
  static watchersSharePercent = BigInt(
    getConfigIntKeyOrDefault('reward.watchersSharePercent', 50)
  );
  static watchersRSNSharePercent = BigInt(
    getConfigIntKeyOrDefault('reward.watchersRSNSharePercent', 0)
  );

  static observationConfirmation = getConfigIntKeyOrDefault(
    'ergo.observationConfirmation',
    20
  );
  static eventConfirmation = getConfigIntKeyOrDefault(
    'ergo.eventConfirmation',
    20
  );
  static distributionConfirmation = getConfigIntKeyOrDefault(
    'ergo.distributionConfirmation',
    20
  );
  static initialHeight = getConfigIntKeyOrDefault('ergo.initialHeight', 10000);
  static scannerInterval = getConfigIntKeyOrDefault('ergo.scannerInterval', 30);

  /**
   * returns the ergo-related contract, addresses and tokens in rosen bridge
   */
  static ergoContractConfig = rosenConfig.contractReader(ChainsConstants.ergo);
  static coldAddress: string = config.get<string>('ergo.coldStorageAddress');
}

export default ErgoConfigs;
