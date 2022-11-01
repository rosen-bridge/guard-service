import config from 'config';
import { rosenConfig } from '../../../helpers/RosenConfig';
import ChainsConstants from '../../ChainsConstants';
import * as wasm from 'ergo-lib-wasm-nodejs';

class ErgoConfigs {
  // service configs
  static explorer = {
    url: config.get<string>('ergo.explorer.url'),
    timeout: config.get<number>('ergo.explorer.timeout'), // seconds
  };
  static networkType =
    config.get('ergo.networkType') === 'mainnet'
      ? wasm.NetworkPrefix.Mainnet
      : wasm.NetworkPrefix.Testnet;
  static node = {
    url: config.get<string>('ergo.node.url'),
    timeout: config.get<number>('ergo.node.timeout'), // seconds
  };
  static minimumErg = BigInt(config.get<string>('ergo.minimumErg'));
  static txFee = BigInt(config.get<string>('ergo.txFee'));

  static bridgeFeeRepoAddress: string = config.get?.(
    'reward.bridgeFeeRepoAddress'
  );
  static networkFeeRepoAddress: string = config.get?.(
    'reward.networkFeeRepoAddress'
  );
  static watchersSharePercent = BigInt(
    config.get?.('reward.watchersSharePercent')
  );
  static watchersRSNSharePercent = BigInt(
    config.get?.('reward.watchersRSNSharePercent')
  );

  static requiredConfirmation = config.get<number>('ergo.requiredConfirmation');
  static initialHeight = config.get<number>('ergo.initialHeight');
  static scannerInterval = config.get<number>('ergo.scannerInterval');

  /**
   * returns the ergo-related contract, addresses and tokens in rosen bridge
   */
  static ergoContractConfig = rosenConfig.contractReader(ChainsConstants.ergo);
}

export default ErgoConfigs;
