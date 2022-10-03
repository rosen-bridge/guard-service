import config from 'config';
import { rosenConfig } from '../../../helpers/RosenConfig';
import ChainsConstants from '../../ChainsConstants';

class ErgoConfigs {
  // service configs
  static explorer = {
    url: config.get<string>('ergo.explorer.url'),
    timeout: config.get<number>('ergo.explorer.timeout'), // seconds
  };
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
    config.get<number>('reward.watchersSharePercent')
  );
  static watchersRSNSharePercent = BigInt(
    config.get<number>('reward.watchersRSNSharePercent')
  );

  static minimumErgBridgeFee = BigInt(
      config.get<string>('reward.minimumErgBridgeFee')
  );
  static minimumTokenBridgeFee = BigInt(
      config.get<string>('reward.minimumTokenBridgeFee')
  );
  static minimumErgNetworkFee = BigInt(
      config.get<string>('reward.minimumErgBridgeFee')
  );
  static minimumTokenNetworkFee = BigInt(
      config.get<string>('reward.minimumTokenBridgeFee')
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
